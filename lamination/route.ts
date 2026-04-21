import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Keep it Node runtime
export const runtime = "nodejs";

const ALLOWED_CATEGORIES = new Set([
  "Bubble Foam Bubble",
  "Bubble Foil",
  "Film Foil & Adhesive+F.Glass",
  "Leno",
  "MS 2095",
  "Non Woven",
  "Paper Foil",
  "Radiant Barrier",
  "Ultra Foil",
  "Wrapper",
]);

/** Coerce helper: string/number/empty → number | null */
function toNumOrNull(v: unknown) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Coerce helper: string/empty → string | null */
function toStrOrNull(v: unknown) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/**
 * product:
 * - trim
 * - remove ALL spaces
 * - convert to ALL CAPITAL LETTERS
 */
function normalizeProduct(raw: string) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\s+/g, "").toUpperCase();
}

/**
 * productID:
 * - trim
 * - remove ALL spaces
 * - convert to ALL CAPITAL LETTERS
 */
function normalizeProductID(raw: string) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\s+/g, "").toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const dateRaw = String(body?.date ?? "").trim(); // "YYYY-MM-DD"
    const category = String(body?.category ?? "").trim();
    const range = toStrOrNull(body?.range); // UI sends "" or string

    const productRaw = String(body?.product ?? "");
    const productIDRaw = String(body?.productID ?? "");

    // Store normalized product/productID as ALL CAPS (spaces removed)
    const product = normalizeProduct(productRaw);
    const productID = normalizeProductID(productIDRaw);

    // Basic validation (matches your UI)
    if (!dateRaw || !category || !productRaw.trim() || !productID) {
      return NextResponse.json(
        { message: "Missing 'date', 'category', 'product', or 'productID'." },
        { status: 400 }
      );
    }

    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json(
        { message: "Invalid 'category' value." },
        { status: 400 }
      );
    }

    // Date parsing: keep as UTC date
    const date = new Date(`${dateRaw}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { message: "Invalid date format (expected YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    // --- numeric fields (matching your latest UI payload keys) ---
    const grammage = toNumOrNull(body?.grammage);

    const tensileMD = toNumOrNull(body?.tensileMD);
    const tensileCD = toNumOrNull(body?.tensileCD);
    const tensileUnit = toStrOrNull(body?.tensileUnit);

    const elongationMD = toNumOrNull(body?.elongationMD);
    const elongationCD = toNumOrNull(body?.elongationCD);

    const tongueTearMD = toNumOrNull(body?.tongueTearMD);
    const tongueTearCD = toNumOrNull(body?.tongueTearCD);

    const nailShankMD = toNumOrNull(body?.nailShankMD);
    const nailShankCD = toNumOrNull(body?.nailShankCD);

    const tearStrengthMD = toNumOrNull(body?.tearStrengthMD);
    const tearStrengthCD = toNumOrNull(body?.tearStrengthCD);

    const bondStrengthMD = toNumOrNull(body?.bondStrengthMD);
    const bondStrengthCD = toNumOrNull(body?.bondStrengthCD);

    const bondStrength2MD = toNumOrNull(body?.bondStrength2MD);
    const bondStrength2CD = toNumOrNull(body?.bondStrength2CD);

    const adhesiveMD = toNumOrNull(body?.adhesiveMD);
    const adhesiveCD = toNumOrNull(body?.adhesiveCD);

    const adhesive2MD = toNumOrNull(body?.adhesive2MD);
    const adhesive2CD = toNumOrNull(body?.adhesive2CD);

    const tearResistanceMD = toNumOrNull(body?.tearResistanceMD);
    const tearResistanceCD = toNumOrNull(body?.tearResistanceCD);

    const initialTearMD = toNumOrNull(body?.initialTearMD);
    const initialTearCD = toNumOrNull(body?.initialTearCD);

    const staplerTestMD = toNumOrNull(body?.staplerTestMD);
    const staplerTestCD = toNumOrNull(body?.staplerTestCD);

    const emissivityAlum1 = toNumOrNull(body?.emissivityAlum1);
    const emissivityAlum2 = toNumOrNull(body?.emissivityAlum2);
    const emissivityMPET = toNumOrNull(body?.emissivityMPET);
    const emissivityMCPP = toNumOrNull(body?.emissivityMCPP);

    const sewingMD = toNumOrNull(body?.sewingMD);
    const sewingCD = toNumOrNull(body?.sewingCD);

    const thickness = toNumOrNull(body?.thickness);
    const wVTR = toNumOrNull(body?.wVTR);

    const bS476i1 = toNumOrNull(body?.bS476i1);
    const bS476i2 = toNumOrNull(body?.bS476i2);
    const bS476i3 = toNumOrNull(body?.bS476i3);

    const notes = toStrOrNull(body?.notes);

    // ============================
    // CALCULATED FIELDS
    // ============================

    // 1) Tear Propagation = tearStrength * 10 / thickness
    const round3 = (n: number) => Number(n.toFixed(3));

    // 1) Tear Propagation = tearStrength * 10 / thickness  (rounded 3dp)
    const tearPropagationMD =
      tearStrengthMD != null && thickness != null && thickness !== 0
        ? round3((tearStrengthMD * 10) / thickness)
        : null;
      
    const tearPropagationCD =
      tearStrengthCD != null && thickness != null && thickness !== 0
        ? round3((tearStrengthCD * 10) / thickness)
        : null;
      
    // 2) I = bS476i1 + bS476i2 + bS476i3  (rounded 3dp)
    const bs476I =
      bS476i1 == null && bS476i2 == null && bS476i3 == null
        ? null
        : round3((bS476i1 ?? 0) + (bS476i2 ?? 0) + (bS476i3 ?? 0));


    // Build shared payload (MUST match your Prisma models exactly)
    const payload = {
      date,
      category,
      range,
      product, // ALL CAPS + spaces removed
      productID, // ALL CAPS + spaces removed

      grammage,

      tensileMD,
      tensileCD,
      tensileUnit,

      elongationMD,
      elongationCD,

      tongueTearMD,
      tongueTearCD,

      nailShankMD,
      nailShankCD,

      tearStrengthMD,
      tearStrengthCD,

      bondStrengthMD,
      bondStrengthCD,

      bondStrength2MD,
      bondStrength2CD,

      adhesiveMD,
      adhesiveCD,

      adhesive2MD,
      adhesive2CD,

      tearResistanceMD,
      tearResistanceCD,

      initialTearMD,
      initialTearCD,

      staplerTestMD,
      staplerTestCD,

      emissivityAlum1,
      emissivityAlum2,
      emissivityMPET,
      emissivityMCPP,

      sewingMD,
      sewingCD,

      thickness,
      wVTR,

      bS476i1,
      bS476i2,
      bS476i3,

      // calculated columns
      tearPropagationMD,
      tearPropagationCD,
      bs476I,

      notes,
    };

    // Route to correct table based on category
    let saved;
    switch (category) {
      case "Bubble Foam Bubble":
        saved = await prisma.laminationBubbleFoamBubble.create({ data: payload });
        break;
      case "Bubble Foil":
        saved = await prisma.laminationBubbleFoil.create({ data: payload });
        break;
      case "Film Foil & Adhesive+F.Glass":
        saved = await prisma.laminationFilmFoilAlumFGlass.create({ data: payload });
        break;
      case "Leno":
        saved = await prisma.laminationLeno.create({ data: payload });
        break;
      case "MS 2095":
        saved = await prisma.laminationMs2095.create({ data: payload });
        break;
      case "Non Woven":
        saved = await prisma.laminationNonWoven.create({ data: payload });
        break;
      case "Paper Foil":
        saved = await prisma.laminationPaperFoil.create({ data: payload });
        break;
      case "Radiant Barrier":
        saved = await prisma.laminationRadiantBarrier.create({ data: payload });
        break;
      case "Ultra Foil":
        saved = await prisma.laminationUltraFoil.create({ data: payload });
        break;
      case "Wrapper":
        saved = await prisma.laminationWrapper.create({ data: payload });
        break;
      default:
        return NextResponse.json({ message: "Unhandled category." }, { status: 400 });
    }

    return NextResponse.json(
      { ok: true, category, product, productID, data: saved },
      { status: 201 }
    );
  } catch (err) {
    console.error("[/api/lamination] POST error:", err);
    const message = (err as Error)?.message ?? "Failed to process lamination entry.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
