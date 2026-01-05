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
function normalizeText(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, "").toUpperCase();
}

/**
 * Normalize Product ID:
 * - trim
 * - remove ALL spaces
 * - convert to ALL CAPITAL LETTERS
 */
function normalizeProductID(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, "").toUpperCase();
}

/**
 * Normalize color:
 * - trim
 * - convert to ALL CAPITAL LETTERS
 * - keep spaces (e.g. "Light Blue" -> "LIGHT BLUE")
 */
function normalizeColor(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.toUpperCase();
}

/** API entry point */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // -----------------------------
    // Required fields
    // -----------------------------
    const dateRaw = String(body?.date ?? "").trim();
    const productTypeNorm = normalizeText(body?.productType);
    const productID = normalizeProductID(body?.productID); // Prisma: String (NOT nullable)
    const color = normalizeColor(body?.color);

    if (!dateRaw) {
      return NextResponse.json(
        { message: "Missing or invalid 'date' field." },
        { status: 400 }
      );
    }

    if (!productTypeNorm) {
      return NextResponse.json(
        { message: "Missing or invalid 'productType' field." },
        { status: 400 }
      );
    }

    if (!productID) {
      return NextResponse.json(
        { message: "Missing or invalid 'productID' field." },
        { status: 400 }
      );
    }

    // Store as date-only (DateTime field is fine)
    const testDate = new Date(`${dateRaw}T00:00:00Z`);
    if (Number.isNaN(testDate.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format (expected YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    // -----------------------------
    // Normalized optional text fields
    // -----------------------------
    const constructionNorm = normalizeText(body?.construction);

    // -----------------------------
    // Numeric fields
    // -----------------------------
    // NOTE: your payload key looks like a typo: dinier vs denier
    const denier = toNumOrNull(body?.dinier);

    const grammage = toNumOrNull(body?.grammage);
    const tensileMD = toNumOrNull(body?.tensileMD);
    const tensileCD = toNumOrNull(body?.tensileCD);
    const elongationMD = toNumOrNull(body?.elongationMD);
    const elongationCD = toNumOrNull(body?.elongationCD);

    const tubingTensile = toNumOrNull(body?.tubingTensile);
    const tubingElongation = toNumOrNull(body?.tubingElongation);
    const tubingPeelPeak = toNumOrNull(body?.tubingPeelPeak);
    const tubingPeelAvg = toNumOrNull(body?.tubingPeelAvg);

    // -----------------------------
    // Free text fields (trim only)
    // -----------------------------
    const additionalFeatures =
      body?.additionalFeatures != null && String(body.additionalFeatures).trim() !== ""
        ? String(body.additionalFeatures).trim()
        : null;

    const notes =
      body?.notes != null && String(body.notes).trim() !== ""
        ? String(body.notes).trim()
        : null;

    // Optional: ensure at least one measurement is present
    if (
      grammage == null &&
      tensileMD == null &&
      tensileCD == null &&
      elongationMD == null &&
      elongationCD == null &&
      tubingTensile == null &&
      tubingElongation == null &&
      tubingPeelPeak == null &&
      tubingPeelAvg == null
    ) {
      return NextResponse.json(
        {
          message:
            "At least one measurement must be provided (grammage/tensile/elongation/tubing fields).",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // Insert into DB
    // -----------------------------
    const saved = await prisma.packaging.create({
      data: {
        testDate,
        productType: productTypeNorm, // ALL CAPS + spaces removed
        productID,                    // ALL CAPS + spaces removed

        construction: constructionNorm,
        denier,
        color,                         // ALL CAPS (spaces kept)
        additionalFeatures,

        grammage,
        tensileMD,
        tensileCD,
        elongationMD,
        elongationCD,

        tubingTensile,
        tubingElongation,
        tubingPeelPeak,
        tubingPeelAvg,

        notes,
      },
      select: {
        id: true,
        testDate: true,
        productType: true,
        productID: true,
      },
    });

    return NextResponse.json(
      { ok: true, table: "Packaging", data: saved },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/packaging] POST error:", err);
    const message =
      (err as Error)?.message ?? "Failed to process packaging entry.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
