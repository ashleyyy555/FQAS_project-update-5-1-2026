"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

/* ----------------- Helpers ----------------- */

// productID: trim, remove spaces, UPPERCASE
function normalizeProductID(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, "").toUpperCase();
}

// productType / construction: trim, remove spaces, UPPERCASE   ✅ CHANGED
function normalizeNoSpaceUpper(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, "").toUpperCase();
}

// color: trim, keep spaces, UPPERCASE
function normalizeColor(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.toUpperCase();
}

// additionalFeatures / notes: trim, keep spaces
function normalizeTrimKeepSpaces(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  return raw === "" ? null : raw;
}

// Validate YYYY-MM-DD date string
function isValidDateStr(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

/* ----------------- Zod Schemas ----------------- */

const EditableValue = z.union([z.string(), z.number(), z.boolean(), z.null(), z.date()]);

const FetchSchema = z.object({
  id: z.string().min(1),
});

const UpdateSchema = z.object({
  id: z.string().min(1),
  data: z.object({}).catchall(EditableValue),
});

const DeleteSchema = FetchSchema;

/* ----------------- Float columns ----------------- */

const PACKAGING_FLOAT_COLS = new Set<string>([
  "denier",
  "grammage",
  "tensileMD",
  "tensileCD",
  "elongationMD",
  "elongationCD",
  "tubingTensile",
  "tubingElongation",
  "tubingPeelPeak",
  "tubingPeelAvg",
]);

/* ----------------- Server Actions ----------------- */

export async function fetchPackagingById(input: unknown) {
  const parsed = FetchSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid parameters." };

  const { id } = parsed.data;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) return { error: "Invalid id." };

  const row = await prisma.packaging.findUnique({ where: { id: idNum } });
  if (!row) return { error: "Record not found." };

  return { data: row };
}

export async function updatePackaging(input: unknown) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid update payload." };

  const { id, data } = parsed.data;

  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) return { error: "Invalid id." };

  const cleaned: Record<string, any> = { ...data };

  // Strip non-editable / server-managed fields
  delete cleaned.id;
  delete cleaned.createdAt;
  delete cleaned.updatedAt;

  // Normalize "" → null
  for (const [k, v] of Object.entries(cleaned)) {
    if (v === "") cleaned[k] = null;
  }

  // 1) productType: remove spaces + UPPERCASE ✅ CHANGED
  if ("productType" in cleaned) {
    const norm = normalizeNoSpaceUpper(cleaned.productType);
    if (!norm) return { error: "Product Type must contain at least one character." };
    cleaned.productType = norm;
  }

  // 2) construction: remove spaces + UPPERCASE ✅ CHANGED
  if ("construction" in cleaned) {
    const norm = normalizeNoSpaceUpper(cleaned.construction);
    if (!norm) return { error: "Construction must contain at least one character." };
    cleaned.construction = norm;
  }

  // 3) color: keep spaces + uppercase
  if ("color" in cleaned) {
    cleaned.color = normalizeColor(cleaned.color);
  }

  // 4) productID: remove spaces + uppercase
  if ("productID" in cleaned) {
    const norm = normalizeProductID(cleaned.productID);
    if (!norm) return { error: "Product ID must contain at least one character." };
    cleaned.productID = norm;
  }

  // additionalFeatures: trim (keep spaces)
  if ("additionalFeatures" in cleaned) {
    cleaned.additionalFeatures = normalizeTrimKeepSpaces(cleaned.additionalFeatures);
  }

  // --- Handle testDate (as YYYY-MM-DD string) ---
  if ("testDate" in cleaned && cleaned.testDate != null) {
    const raw = String(cleaned.testDate).trim();
    let d: Date | null = null;

    if (isValidDateStr(raw)) d = new Date(`${raw}T00:00:00Z`);
    else {
      const tmp = new Date(raw);
      if (!Number.isNaN(tmp.getTime())) d = tmp;
    }

    if (!d || Number.isNaN(d.getTime())) {
      return { error: "Invalid testDate. Use YYYY-MM-DD or a valid date string." };
    }
    cleaned.testDate = d;
  }

  // --- Coerce Float columns ---
  for (const col of PACKAGING_FLOAT_COLS) {
    if (col in cleaned) {
      const v = cleaned[col];
      if (v == null || v === "") cleaned[col] = null;
      else if (typeof v === "number") cleaned[col] = Number.isFinite(v) ? v : null;
      else {
        const n = Number(String(v).trim());
        cleaned[col] = Number.isFinite(n) ? n : null;
      }
    }
  }

  // notes: trim (keep spaces)
  if ("notes" in cleaned) {
    cleaned.notes = normalizeTrimKeepSpaces(cleaned.notes);
  }

  try {
    const updated = await prisma.packaging.update({
      where: { id: idNum },
      data: cleaned,
    });
    return { data: updated };
  } catch (e) {
    console.error("Packaging update failed", e);
    return { error: "Update failed. Please check that numeric fields contain valid values." };
  }
}

export async function deletePackaging(input: unknown) {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid delete payload." };

  const { id } = parsed.data;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) return { error: "Invalid id." };

  try {
    await prisma.packaging.delete({ where: { id: idNum } });
    return { ok: true };
  } catch (e) {
    console.error("Packaging delete failed", e);
    return { error: "Delete failed. It may not exist or be referenced elsewhere." };
  }
}
