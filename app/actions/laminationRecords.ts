// app/actions/laminationRecords.ts
"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { laminationFields } from "@/lib/inspectionFields";

// Values we accept in the "data" object
const EditableValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.date()]);

// Infer numeric/date keys from laminationFields config
const NUMERIC_KEYS = new Set(
  laminationFields.filter((f) => f.type === "number").map((f) => f.key)
);

const DATE_KEYS = new Set<string>([
  ...laminationFields.filter((f) => f.type === "date").map((f) => f.key),
  "testDate",
]);

// calculated fields should never be edited
const READONLY_KEYS = new Set<string>([
  "tearPropagationMD",
  "tearPropagationCD",
  "bs476I",
]);

/**
 * product:
 * - trim
 * - remove ALL spaces
 * - convert to ALL CAPITAL LETTERS
 */
function normalizeProduct(raw: unknown): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, "").toUpperCase();
}

/**
 * productID:
 * - trim
 * - remove ALL spaces
 * - convert to ALL CAPITAL LETTERS
 */
function normalizeProductID(raw: unknown): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, "").toUpperCase();
}

// ---------------------------------------------------------------------------
// Prisma model delegate names for lamination categories
// IMPORTANT: these must match Prisma Client delegate keys (prisma.<delegate>)
// ---------------------------------------------------------------------------
type LaminationModelName =
  | "laminationBubbleFoamBubble"
  | "laminationBubbleFoil"
  | "laminationFilmFoilAlumFGlass"
  | "laminationLeno"
  | "laminationMs2095"
  | "laminationNonWoven"
  | "laminationPaperFoil"
  | "laminationRadiantBarrier"
  | "laminationUltraFoil"
  | "laminationWrapper";

const CATEGORY_MODEL_MAP: Record<string, LaminationModelName> = {
  "Bubble Foam Bubble": "laminationBubbleFoamBubble",
  "Bubble Foil": "laminationBubbleFoil",
  "Film Foil & Adhesive+F.Glass": "laminationFilmFoilAlumFGlass",
  "Leno": "laminationLeno",
  "MS 2095": "laminationMs2095",
  "Non Woven": "laminationNonWoven",
  "Paper Foil": "laminationPaperFoil",
  "Radiant Barrier": "laminationRadiantBarrier",
  "Ultra Foil": "laminationUltraFoil",
  "Wrapper": "laminationWrapper",
};

function getModelNameForCategory(category: string): LaminationModelName | null {
  return CATEGORY_MODEL_MAP[category] ?? null;
}

// --- Zod schemas ---
const IdSchema = z.union([z.string(), z.number()]);
const CategorySchema = z.string().min(1, "Category is required.");

const FetchSchema = z.object({
  id: IdSchema,
  category: CategorySchema,
});

const UpdateSchema = z.object({
  id: IdSchema,
  category: CategorySchema, // OLD category/table
  newCategory: z.string().optional(), // NEW category/table (optional)
  data: z.object({}).catchall(EditableValue),
});

const DeleteSchema = FetchSchema;

// Helper: normalize id (Prisma lamination ids are Int)
function normalizeId(idRaw: string | number) {
  if (typeof idRaw === "number") return idRaw;
  const n = Number(idRaw);
  if (!Number.isFinite(n)) return null;
  return n;
}

// ---------------------------------------------------------------------------
// Shared cleaning/coercion for update payload
// ---------------------------------------------------------------------------
function cleanAndCoerceUpdateData(data: Record<string, any>) {
  const cleaned: Record<string, any> = { ...data };

  // strip server-managed fields
  delete cleaned.id;
  delete cleaned.createdAt;
  delete cleaned.updatedAt;

  // IMPORTANT: don't let client modify category via "data"
  delete cleaned.category;

  // never allow client to update calculated fields
  for (const k of READONLY_KEYS) delete cleaned[k];

  // normalize "" → null
  for (const [k, v] of Object.entries(cleaned)) {
    if (v === "") cleaned[k] = null;
  }

  // Apply product rules (ALL CAPS)
  if ("product" in cleaned) {
    const p = normalizeProduct(cleaned.product);
    if (!p) return { error: "Product must contain at least one character." as const };
    cleaned.product = p;
  }

  // Apply productID rules (ALL CAPS)
  if ("productID" in cleaned) {
    const pid = normalizeProductID(cleaned.productID);
    if (!pid) return { error: "Product ID must contain at least one character." as const };
    cleaned.productID = pid;
  }

  // Coerce date fields
  for (const key of DATE_KEYS) {
    if (cleaned[key]) {
      const d = new Date(cleaned[key] as any);
      if (isNaN(d.getTime())) return { error: `Invalid date for ${key}.` as const };
      cleaned[key] = d;
    }
  }

  // Coerce numeric fields
  for (const key of NUMERIC_KEYS) {
    if (key in cleaned) {
      const v = cleaned[key];
      if (v == null || v === "") cleaned[key] = null;
      else if (typeof v === "number") cleaned[key] = Number.isFinite(v) ? v : null;
      else {
        const n = Number(String(v).trim());
        cleaned[key] = Number.isFinite(n) ? n : null;
      }
    }
  }

  return { cleaned };
}

// ---------------------------------------------------------------------------
// Fetch by id + category
// ---------------------------------------------------------------------------
export async function fetchLaminationById(input: unknown) {
  const parsed = FetchSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid parameters." };

  const { id: idRaw, category } = parsed.data;
  const id = normalizeId(idRaw);
  if (id == null) return { error: "Invalid id." };

  const modelName = getModelNameForCategory(category);
  if (!modelName) return { error: `Unknown category "${category}" for lamination.` };

  try {
    const row = await (prisma[modelName] as any).findUnique({ where: { id } });
    if (!row) return { error: "Record not found." };
    return { data: row };
  } catch (e) {
    console.error("[lamination] fetchLaminationById failed", e);
    return { error: "Failed to fetch record." };
  }
}

// ---------------------------------------------------------------------------
// Update by id + category (supports optional move via newCategory)
// NOTE: With PrismaPg adapter, DO NOT use interactive transactions.
// Use batch transactions only.
// ---------------------------------------------------------------------------
export async function updateLamination(input: unknown) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid update payload." };

  const { id: idRaw, category: oldCategory, newCategory, data } = parsed.data;
  const id = normalizeId(idRaw);
  if (id == null) return { error: "Invalid id." };

  const fromModel = getModelNameForCategory(oldCategory);
  if (!fromModel) return { error: `Unknown category "${oldCategory}" for lamination.` };

  const targetCategory = String(newCategory ?? oldCategory).trim();
  const toModel = getModelNameForCategory(targetCategory);
  if (!toModel) return { error: `Unknown newCategory "${targetCategory}" for lamination.` };

  const coerceRes = cleanAndCoerceUpdateData(data);
  if ("error" in coerceRes) return { error: coerceRes.error };
  const cleaned = coerceRes.cleaned;

  // Same category → normal update in same table
  if (targetCategory === oldCategory) {
    try {
      const updated = await (prisma[fromModel] as any).update({
        where: { id },
        data: cleaned,
      });
      return { data: updated };
    } catch (e) {
      console.error("[lamination] updateLamination failed", e);
      return { error: "Update failed. Please check your values." };
    }
  }

  // Different category → move record across tables (NEW id)
  try {
    // 1) Read outside tx
    const existing = await (prisma[fromModel] as any).findUnique({ where: { id } });
    if (!existing) return { error: "Record not found in source category." };

    // 2) Build create payload
    const createData: Record<string, any> = { ...existing, ...cleaned };

    delete createData.id;
    delete createData.createdAt;
    delete createData.updatedAt;

    for (const k of READONLY_KEYS) delete createData[k];

    // Force correct category string in target table
    createData.category = targetCategory;

    // 3) Batch transaction (adapter-safe)
    // TS FIX: cast to any to avoid dynamic delegate typing issues
    const ops = [
      (prisma[toModel] as any).create({ data: createData }),
      (prisma[fromModel] as any).delete({ where: { id } }),
    ] as any[];

    const [newRow] = await (prisma as any).$transaction(ops, {
      maxWait: 10_000,
      timeout: 30_000,
    });

    return {
      data: newRow,
      movedFrom: { id, category: oldCategory },
    };
  } catch (e: any) {
    console.error("[lamination] move/update failed", e);
    return { error: e?.message ?? "Move failed. Please check your values." };
  }
}

// ---------------------------------------------------------------------------
// Delete by id + category
// ---------------------------------------------------------------------------
export async function deleteLamination(input: unknown) {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid delete payload." };

  const { id: idRaw, category } = parsed.data;
  const id = normalizeId(idRaw);
  if (id == null) return { error: "Invalid id." };

  const modelName = getModelNameForCategory(category);
  if (!modelName) return { error: `Unknown category "${category}" for lamination.` };

  try {
    await (prisma[modelName] as any).delete({ where: { id } });
    return { ok: true };
  } catch (e) {
    console.error("[lamination] deleteLamination failed", e);
    return { error: "Delete failed. It may not exist or be referenced elsewhere." };
  }
}
