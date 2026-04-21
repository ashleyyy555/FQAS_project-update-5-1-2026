import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// --- Normalize: trim, remove ALL spaces, UPPERCASE ---
function normalizeNoSpaceUpper(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, "").toUpperCase();
}

// --- Validate product type: after normalization allow A-Z 0-9 and some symbols ---
function isValidProductTypeNormalized(v: string) {
  return /^[A-Z0-9\-_.\/()\[\]{}]+$/.test(v);
}

// --- Validate YYYY-MM-DD ---
function isValidDateStr(d: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// --- UTC-safe Date constructor ---
function makeUtcDate(y: string, m: string, d: string, hh: number, mm: number, ss: number) {
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), hh, mm, ss));
}

interface SearchBody {
  startDate: string;
  endDate: string;
  productType: string;
  machine: string;
  denier?: string | number;
}

export async function POST(req: Request) {
  try {
    const body: Partial<SearchBody> = await req.json();

    const startDate = String(body.startDate ?? "").trim();
    const endDate = String(body.endDate ?? "").trim();
    const productTypeInput = String(body.productType ?? "").trim();
    const machineInput = String(body.machine ?? "").trim();

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

    const productTypeNorm = normalizeNoSpaceUpper(productTypeInput);
    if (!productTypeNorm) {
      return NextResponse.json({ message: "Product Type is required." }, { status: 400 });
    }
    if (!isValidProductTypeNormalized(productTypeNorm)) {
      return NextResponse.json(
        { message: "Product Type contains invalid characters." },
        { status: 400 }
      );
    }

    const machineNorm = normalizeNoSpaceUpper(machineInput);
    if (!machineNorm) {
      return NextResponse.json({ message: "Machine is required." }, { status: 400 });
    }

    // --- Optional denier ---
    let denier: number | undefined;
    if (body.denier !== undefined && String(body.denier).trim() !== "") {
      const parsed = Number(body.denier);
      if (!Number.isFinite(parsed)) {
        return NextResponse.json({ message: "Denier must be a valid number." }, { status: 400 });
      }
      denier = parsed;
    }

    // --- UTC date range ---
    const [sy, sm, sd] = startDate.split("-");
    const [ey, em, ed] = endDate.split("-");
    const start = makeUtcDate(sy, sm, sd, 0, 0, 0);
    const end = makeUtcDate(ey, em, ed, 23, 59, 59);

    // ✅ IMPORTANT: query yarn2, not yarn
    const results = await prisma.yarn2.findMany({
      where: {
        productType: productTypeNorm,
        machine: machineNorm,
        ...(denier !== undefined ? { denier } : {}),
        date: { gte: start, lte: end },
      },
      orderBy: [
        { date: "desc" },
        { productID: "asc" },
      ],
    });

    // Return raw rows — frontend already formats date
    return NextResponse.json({ ok: true, data: results });
  } catch (err) {
    console.error("[/api/searchyarn2] error:", err);
    const message = (err as Error)?.message ?? "Failed to search yarn2 entries.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
