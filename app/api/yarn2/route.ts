import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Coerce helper: string/number/empty → number | null */
function toNumOrNull(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalize text:
 * - trim
 * - remove ALL spaces
 * - convert to ALL CAPITAL LETTERS
 */
function normalizeNoSpaceUpper(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Trim only. Empty -> null */
function toTrimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/**
 * Tenacity = (tensile ÷ denier) x 1000
 * - return null if missing inputs or denier == 0
 * - round to 3 decimal places
 */
function calcTenacity(tensile: number | null, denier: number | null): number | null {
  if (tensile == null || denier == null) return null;
  if (denier === 0) return null;
  const value = (tensile / denier) * 1000;
  return Number(value.toFixed(3));
}

/** Date-only parse: "YYYY-MM-DD" -> Date at UTC midnight */
function toDateOnlyOrThrow(v: unknown): Date {
  const s = String(v ?? "").trim();
  if (!s) throw new Error("Missing 'date' field.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error("Invalid date format (expected YYYY-MM-DD).");
  }
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date value.");
  return d;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Required
    const date = toDateOnlyOrThrow(body?.date);
    const productType = normalizeNoSpaceUpper(body?.productType);
    if (!productType) {
      return NextResponse.json(
        { message: "Please make sure Product Type is provided." },
        { status: 400 }
      );
    }

    // Optional text fields
    const productID = normalizeNoSpaceUpper(body?.productID);
    const machine = normalizeNoSpaceUpper(body?.machine);
    const side = normalizeNoSpaceUpper(body?.side);
    const time = normalizeNoSpaceUpper(body?.time);

    // ✅ NEW: material (same normalization rule as you wanted)
    const material = normalizeNoSpaceUpper(body?.material);

    // Numeric fields
    const widthMm = toNumOrNull(body?.width); // UI sends "width"
    const denier = toNumOrNull(body?.denier);
    const tensile = toNumOrNull(body?.tensile);
    const elongation = toNumOrNull(body?.elongation);

    // Tenacity
    const tenacity = calcTenacity(tensile, denier);

    if (tensile != null && (denier == null || denier === 0)) {
      return NextResponse.json(
        {
          message:
            "Denier must be provided and cannot be 0 when Tensile is entered (Tenacity = Tensile ÷ Denier × 1000).",
        },
        { status: 400 }
      );
    }

    // Notes
    const notes = toTrimOrNull(body?.notes);

    // Require at least one measurement or notes
    const hasAnyMeasurement =
      widthMm != null ||
      denier != null ||
      tensile != null ||
      elongation != null ||
      tenacity != null;

    if (!hasAnyMeasurement && !notes) {
      return NextResponse.json(
        {
          message:
            "At least one measurement or notes must be provided (width/denier/tensile/elongation/notes).",
        },
        { status: 400 }
      );
    }

    // ✅ IMPORTANT: save into yarn2 table/model
    const saved = await prisma.yarn2.create({
      data: {
        date,
        productType,
        productID,
        material,
        widthMm,
        side,
        time,
        denier,
        machine,
        tensile,
        elongation,
        tenacity,
        notes,
      },
      select: {
        id: true,
        date: true,
        productType: true,
        productID: true,
        material: true,
        side: true,
        time: true,
        denier: true,
        tensile: true,
        tenacity: true,
      },
    });

    return NextResponse.json({ ok: true, table: "Yarn2", data: saved }, { status: 201 });
  } catch (err) {
    console.error("[/api/yarn2] POST error:", err);
    const message = (err as Error)?.message ?? "Failed to process yarn2 entry.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
