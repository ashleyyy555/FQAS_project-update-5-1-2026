// /app/api/packaging/search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// --- Normalize text: trim, remove spaces, uppercase ---
function normalizeText(v: unknown, toUpper = true): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, "");
  return toUpper ? cleaned.toUpperCase() : cleaned.toUpperCase();
}

// --- Normalize Product ID: trim, remove spaces, uppercase ---
function normalizeProductID(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, "").toUpperCase();
}

// --- Validate YYYY-MM-DD ---
function isValidDateStr(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// --- UTC-safe Date constructor ---
function makeUtcDate(
  y: string,
  m: string,
  d: string,
  hh: number,
  mm: number,
  ss: number
) {
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), hh, mm, ss));
}

// --- Format Date -> YYYY-MM-DD using UTC parts ---
function formatDateOnlyUTC(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

interface SearchBody {
  startDate: string;
  endDate: string;
  productType: string;
  construction: string;
  denier: string | number;
  color?: string;
}

export async function POST(req: Request) {
  try {
    const body: Partial<SearchBody> = await req.json();

    const startDate = String(body.startDate ?? "").trim();
    const endDate = String(body.endDate ?? "").trim();
    const productTypeInput = String(body.productType ?? "").trim();
    const constructionInput = String(body.construction ?? "").trim();
    const denierInput = body.denier != null ? String(body.denier).trim() : "";
    const colorInput = body.color?.trim();

    // --- Validation ---
    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: "Both startDate and endDate are required." },
        { status: 400 }
      );
    }

    if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) {
      return NextResponse.json(
        { message: "Dates must be in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    if (!productTypeInput) {
      return NextResponse.json(
        { message: "Product Type is required." },
        { status: 400 }
      );
    }

    if (!constructionInput) {
      return NextResponse.json(
        { message: "Construction is required." },
        { status: 400 }
      );
    }

    if (!denierInput) {
      return NextResponse.json(
        { message: "Denier is required." },
        { status: 400 }
      );
    }

    const productTypeNorm = normalizeText(productTypeInput)!;
    const constructionNorm = normalizeText(constructionInput, false)!;
    const denier = Number(denierInput);

    if (Number.isNaN(denier)) {
      return NextResponse.json(
        { message: "Denier must be a valid number." },
        { status: 400 }
      );
    }

    const colorNorm = colorInput ? normalizeText(colorInput, false)! : undefined;

    // --- UTC date range ---
    const [sy, sm, sd] = startDate.split("-");
    const [ey, em, ed] = endDate.split("-");

    const start = makeUtcDate(sy, sm, sd, 0, 0, 0);
    const end = makeUtcDate(ey, em, ed, 23, 59, 59);

    // --- Prisma query ---
    const results = await prisma.packaging.findMany({
      where: {
        productType: productTypeNorm,
        construction: constructionNorm,
        denier,
        ...(colorNorm ? { color: colorNorm } : {}),
        testDate: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { productID: "asc" },
    });

    // --- Format testDate safely for frontend ---
    const formattedResults = results.map((r) => ({
      ...r,
      testDate: formatDateOnlyUTC(r.testDate),
    }));

    return NextResponse.json({ ok: true, data: formattedResults });
  } catch (err) {
    console.error("[/api/packaging/search] error:", err);
    const message =
      (err as Error)?.message ?? "Failed to search packaging entries.";
    return NextResponse.json({ message }, { status: 500 });
  }
}