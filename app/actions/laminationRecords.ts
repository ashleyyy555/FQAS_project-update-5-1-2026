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

// driver fields for calculated columns
const CALC_DRIVER_KEYS = new Set<string>([
  "tearStrengthMD",
  "tearStrengthCD",
  "thickness",
  "bS476i1",
  "bS476i2",
  "bS476i3",
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

// ------------------------------
// Calculations (shared)
// ------------------------------
function calcTearPropagation(tearStrength: number | null, thickness: number | null): number | null {
  if (tearStrength == null || thickness == null) return null;
  if (thickness === 0) return null;

  const value = (tearStrength * 10) / thickness;
  return Number(value.toFixed(3));

}

function calcBs476I(
  bS476i1: number | null,
  bS476i2: number | null,
  bS476i3: number | null
): number | null {
  if (bS476i1 == null && bS476i2 == null && bS476i3 == null) return null;

  const value = (bS476i1 ?? 0) + (bS476i2 ?? 0) + (bS476i3 ?? 0);
  return Number(value.toFixed(3));
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
// Helper: recompute derived columns when drivers change
// (same idea as your Yarn tenacity recompute)
// ---------------------------------------------------------------------------
async function maybeRecomputeCalculatedFields(args: {
  modelName: LaminationModelName;
  id: number;
  cleaned: Record<string, any>;
}) {
  const { modelName, id, cleaned } = args;

  const shouldRecalc = Array.from(CALC_DRIVER_KEYS).some((k) => k in cleaned);
  if (!shouldRecalc) return;

  // Values we will use for calculation
  let thicknessVal: number | null = null;
  let tearStrengthMDVal: number | null = null;
  let tearStrengthCDVal: number | null = null;
  let b1: number | null = null;
  let b2: number | null = null;
  let b3: number | null = null;

  // Take from payload if present
  if ("thickness" in cleaned) thicknessVal = cleaned.thickness;
  if ("tearStrengthMD" in cleaned) tearStrengthMDVal = cleaned.tearStrengthMD;
  if ("tearStrengthCD" in cleaned) tearStrengthCDVal = cleaned.tearStrengthCD;

  if ("bS476i1" in cleaned) b1 = cleaned.bS476i1;
  if ("bS476i2" in cleaned) b2 = cleaned.bS476i2;
  if ("bS476i3" in cleaned) b3 = cleaned.bS476i3;

  // If any needed value not present, fetch once from DB
  const needsDb =
    !("thickness" in cleaned) ||
    !("tearStrengthMD" in cleaned) ||
    !("tearStrengthCD" in cleaned) ||
    !("bS476i1" in cleaned) ||
    !("bS476i2" in cleaned) ||
    !("bS476i3" in cleaned);

  if (needsDb) {
    const current = await (prisma[modelName] as any).findUnique({
      where: { id },
      select: {
        thickness: true,
        tearStrengthMD: true,
        tearStrengthCD: true,
        bS476i1: true,
        bS476i2: true,
        bS476i3: true,
      },
    });

    if (!current) throw new Error("Record not found.");

    if (!("thickness" in cleaned)) thicknessVal = current.thickness ?? null;
    if (!("tearStrengthMD" in cleaned)) tearStrengthMDVal = current.tearStrengthMD ?? null;
    if (!("tearStrengthCD" in cleaned)) tearStrengthCDVal = current.tearStrengthCD ?? null;

    if (!("bS476i1" in cleaned)) b1 = current.bS476i1 ?? null;
    if (!("bS476i2" in cleaned)) b2 = current.bS476i2 ?? null;
    if (!("bS476i3" in cleaned)) b3 = current.bS476i3 ?? null;
  }

  // Recompute & attach to cleaned
  cleaned.tearPropagationMD = calcTearPropagation(tearStrengthMDVal, thicknessVal);
  cleaned.tearPropagationCD = calcTearPropagation(tearStrengthCDVal, thicknessVal);
  cleaned.bs476I = calcBs476I(b1, b2, b3);
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

  // ✅ Same category → update in same table
  if (targetCategory === oldCategory) {
    try {
      // ✅ recompute derived columns if needed (like tenacity)
      await maybeRecomputeCalculatedFields({ modelName: fromModel, id, cleaned });

      const updated = await (prisma[fromModel] as any).update({
        where: { id },
        data: cleaned,
      });
      return { data: updated };
    } catch (e: any) {
      console.error("[lamination] updateLamination failed", e);
      return { error: e?.message ?? "Update failed. Please check your values." };
    }
  }

  // ✅ Different category → move record across tables (NEW id)
  try {
    // 1) Read outside tx
    const existing = await (prisma[fromModel] as any).findUnique({ where: { id } });
    if (!existing) return { error: "Record not found in source category." };

    // 2) Build create payload
    const createData: Record<string, any> = { ...existing, ...cleaned };

    delete createData.id;
    delete createData.createdAt;
    delete createData.updatedAt;

    // never allow client to set calculated fields directly
    for (const k of READONLY_KEYS) delete createData[k];

    // Force correct category string in target table
    createData.category = targetCategory;

    // ✅ recompute derived fields for the row we are about to create
    // (use values inside createData; if missing, fall back to existing already merged)
    createData.tearPropagationMD = calcTearPropagation(
      createData.tearStrengthMD ?? null,
      createData.thickness ?? null
    );
    createData.tearPropagationCD = calcTearPropagation(
      createData.tearStrengthCD ?? null,
      createData.thickness ?? null
    );
    createData.bs476I = calcBs476I(
      createData.bS476i1 ?? null,
      createData.bS476i2 ?? null,
      createData.bS476i3 ?? null
    );

    // 3) Batch transaction (adapter-safe)
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
