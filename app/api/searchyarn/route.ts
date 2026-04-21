// /app/api/packaging/search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// --- Normalize text: trim, remove spaces, uppercase by default ---
function normalizeText(v: unknown, toUpper = true): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, "");
  return toUpper ? cleaned.toUpperCase() : cleaned;
}

// --- Normalize Product ID: trim, remove spaces, uppercase ---
function normalizeProductID(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, "").toUpperCase();
}

// --- Validate product type: letters, numbers, dash, underscore, dot, slash, brackets ---
function isValidProductType(v: string) {
  return /^[A-Z0-9\-_.\/()\[\]{}]+$/.test(v);
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

interface SearchBody {
  startDate: string;
  endDate: string;
  productType: string;
  machine: string;
  denier: string | number;
}

export async function POST(req: Request) {
  try {
    const body: Partial<SearchBody> = await req.json();

    const startDate = String(body.startDate ?? "").trim();
    const endDate = String(body.endDate ?? "").trim();
    const productTypeInput = String(body.productType ?? "").trim();
    const machineInput = String(body.machine ?? "").trim();

    let denier: number | undefined;

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

    const productTypeNorm = normalizeText(productTypeInput);
    if (!productTypeNorm || !isValidProductType(productTypeNorm)) {
      return NextResponse.json(
        {
          message:
            "Product Type must contain letters, numbers, dash, underscore, dot or slash.",
        },
        { status: 400 }
      );
    }

    if (!machineInput) {
      return NextResponse.json(
        { message: "Machine is required." },
        { status: 400 }
      );
    }

    const machineNorm = normalizeText(machineInput, false);
    if (!machineNorm) {
      return NextResponse.json(
        { message: "Machine is required." },
        { status: 400 }
      );
    }

    if (body.denier !== undefined && body.denier !== "") {
      const parsed = Number(body.denier);
      if (Number.isNaN(parsed)) {
        return NextResponse.json(
          { message: "Denier must be a valid number." },
          { status: 400 }
        );
      }
      denier = parsed;
    }

    // --- UTC date range ---
    const [sy, sm, sd] = startDate.split("-");
    const [ey, em, ed] = endDate.split("-");

    const start = makeUtcDate(sy, sm, sd, 0, 0, 0);
    const end = makeUtcDate(ey, em, ed, 23, 59, 59);

    // --- Prisma query ---
    const results = await prisma.yarn.findMany({
      where: {
        productType: productTypeNorm,
        machine: machineNorm,
        ...(denier !== undefined ? { denier } : {}),
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [
        { date: "desc" },
        { productID: "asc" },
      ],
    });

    // --- Format date for frontend ---
    const formattedResults = results.map((r) => ({
      ...r,
      testDate: (() => {
        const d = new Date(r.date);
        return isNaN(d.getTime())
          ? ""
          : d.toISOString().split("T")[0].replace(/-/g, "/");
      })(),
    }));

    return NextResponse.json({ ok: true, data: formattedResults });
  } catch (err) {
    console.error("[/api/yarn/search] error:", err);
    const message = (err as Error)?.message ?? "Failed to search yarn entries.";
    return NextResponse.json({ message }, { status: 500 });
  }
}