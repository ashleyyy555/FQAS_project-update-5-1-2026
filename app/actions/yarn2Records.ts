"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

/* ----------------- Helpers ----------------- */

// remove spaces + UPPERCASE (good for productType, machine, side, time, productID, material)
function normalizeNoSpaceUpper(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, "").toUpperCase();
}

// notes: trim, keep spaces
function normalizeTrimKeepSpaces(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  return raw === "" ? null : raw;
}

// Validate YYYY-MM-DD date string
function isValidDateStr(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// Date parsing: accept YYYY-MM-DD OR a valid date string
function parseDateOrThrow(v: unknown): Date {
  const raw = String(v ?? "").trim();
  if (!raw) throw new Error("Missing Date.");
  let d: Date | null = null;

  if (isValidDateStr(raw)) d = new Date(`${raw}T00:00:00Z`);
  else {
    const tmp = new Date(raw);
    if (!Number.isNaN(tmp.getTime())) d = tmp;
  }

  if (!d || Number.isNaN(d.getTime())) {
    throw new Error("Invalid Date. Use YYYY-MM-DD or a valid date string.");
  }
  return d;
}

// Tenacity = (tensile/denier) * 1000
function calcTenacity(tensile: number | null, denier: number | null): number | null {
  if (tensile == null || denier == null) return null;
  if (denier === 0) return null;
  const value = (tensile / denier) * 1000;
  return Number(value.toFixed(3));
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
/**
 * IMPORTANT:
 * - Prisma field is widthMm (NOT width)
 * - tenacity is derived and NOT user-editable, so DO NOT include here
 */
const YARN2_FLOAT_COLS = new Set<string>(["denier", "widthMm", "tensile", "elongation"]);

/* ----------------- Server Actions (YARN2) ----------------- */

export async function fetchYarn2ById(input: unknown) {
  const parsed = FetchSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid parameters." };

  const { id } = parsed.data;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) return { error: "Invalid id." };

  // ✅ IMPORTANT: yarn2
  const row = await prisma.yarn2.findUnique({ where: { id: idNum } });
  if (!row) return { error: "Record not found." };

  return { data: row };
}

export async function updateYarn2(input: unknown) {
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

  // ✅ Tenacity is derived — user must not edit it
  delete cleaned.tenacity;

  // Normalize "" → null
  for (const [k, v] of Object.entries(cleaned)) {
    if (v === "") cleaned[k] = null;
  }

  // 1) productType: remove spaces + UPPERCASE
  if ("productType" in cleaned) {
    const norm = normalizeNoSpaceUpper(cleaned.productType);
    if (!norm) return { error: "Product Type must contain at least one character." };
    cleaned.productType = norm;
  }

  // 2) machine: remove spaces + UPPERCASE (allow empty -> null)
  if ("machine" in cleaned) {
    cleaned.machine = normalizeNoSpaceUpper(cleaned.machine);
  }

  // 3) side: remove spaces + UPPERCASE (allow empty -> null)
  if ("side" in cleaned) {
    cleaned.side = normalizeNoSpaceUpper(cleaned.side);
  }

  // 4) time: remove spaces + UPPERCASE (allow empty -> null)
  if ("time" in cleaned) {
    cleaned.time = normalizeNoSpaceUpper(cleaned.time);
  }

  // 5) productID: OPTIONAL now (allow empty -> null)
  if ("productID" in cleaned) {
    cleaned.productID = normalizeNoSpaceUpper(cleaned.productID); // null if empty
  }

  // 6) material: remove spaces + UPPERCASE (allow empty -> null)
  if ("material" in cleaned) {
    cleaned.material = normalizeNoSpaceUpper(cleaned.material); // null if empty
  }

  // --- Handle date ---
  if ("date" in cleaned && cleaned.date != null) {
    try {
      cleaned.date = parseDateOrThrow(cleaned.date);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }

  // --- Coerce Float columns ---
  for (const col of YARN2_FLOAT_COLS) {
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

  // ✅ Recompute tenacity when tensile and/or denier changes
  const shouldRecalcTenacity = "tensile" in cleaned || "denier" in cleaned;

  if (shouldRecalcTenacity) {
    // latest tensile/denier values:
    let tensileVal: number | null = null;
    let denierVal: number | null = null;

    if ("tensile" in cleaned) tensileVal = cleaned.tensile == null ? null : Number(cleaned.tensile);
    if ("denier" in cleaned) denierVal = cleaned.denier == null ? null : Number(cleaned.denier);

    // If one missing in payload, fetch current from yarn2
    if (!("tensile" in cleaned) || !("denier" in cleaned)) {
      const current = await prisma.yarn2.findUnique({
        where: { id: idNum },
        select: { tensile: true, denier: true },
      });
      if (!current) return { error: "Record not found." };
      if (!("tensile" in cleaned)) tensileVal = current.tensile as any;
      if (!("denier" in cleaned)) denierVal = current.denier as any;
    }

    cleaned.tenacity = calcTenacity(
      tensileVal == null ? null : Number(tensileVal),
      denierVal == null ? null : Number(denierVal)
    );
  }

  try {
    // ✅ IMPORTANT: yarn2
    const updated = await prisma.yarn2.update({
      where: { id: idNum },
      data: cleaned,
    });
    return { data: updated };
  } catch (e) {
    console.error("Yarn2 update failed", e);
    return { error: "Update failed. Please check that numeric fields contain valid values." };
  }
}

export async function deleteYarn2(input: unknown) {
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid delete payload." };

  const { id } = parsed.data;
  const idNum = Number(id);
  if (!Number.isInteger(idNum) || idNum <= 0) return { error: "Invalid id." };

  try {
    // ✅ IMPORTANT: yarn2
    await prisma.yarn2.delete({ where: { id: idNum } });
    return { ok: true };
  } catch (e) {
    console.error("Yarn2 delete failed", e);
    return { error: "Delete failed. It may not exist or be referenced elsewhere." };
  }
}
