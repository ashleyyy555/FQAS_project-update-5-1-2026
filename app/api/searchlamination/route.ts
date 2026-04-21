// /app/api/searchLamination/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isValidDateStr(dateStr: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// Normalize product (remove spaces + lowercase)
function normalizeProduct(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/\s+/g, "").toLowerCase();
}

const CATEGORY_TABLE_MAP: Record<string, string> = {
  "Bubble Foam Bubble": "LaminationBubbleFoamBubble",
  "Bubble Foil": "LaminationBubbleFoil",
  "Film Foil & Adhesive+F.Glass": "LaminationFilmFoilAlumFGlass",
  "Leno": "LaminationLeno",
  "MS 2095": "LaminationMs2095",
  "Non Woven": "LaminationNonWoven",
  "Paper Foil": "LaminationPaperFoil",
  "Radiant Barrier": "LaminationRadiantBarrier",
  "Ultra Foil": "LaminationUltraFoil",
  "Wrapper": "LaminationWrapper",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { startDate, endDate, category, range, product } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: "Both startDate and endDate are required." },
        { status: 400 }
      );
    }

    if (!isValidDateStr(startDate) || !isValidDateStr(endDate)) {
      return NextResponse.json(
        { message: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { message: "Category is required." },
        { status: 400 }
      );
    }

    if (!product) {
      return NextResponse.json(
        { message: "Product is required." },
        { status: 400 }
      );
    }

    const modelName = CATEGORY_TABLE_MAP[category];
    if (!modelName) {
      return NextResponse.json(
        { message: "Invalid category." },
        { status: 400 }
      );
    }

    const model: any = (prisma as any)[modelName];
    if (!model?.findMany) {
      return NextResponse.json(
        { message: "Database model not found." },
        { status: 500 }
      );
    }

    const normalizedProduct = normalizeProduct(product);

    const where: any = {
      category,
      date: {
        gte: new Date(`${startDate}T00:00:00Z`),
        lte: new Date(`${endDate}T23:59:59Z`),
      },
      product: {
        equals: normalizedProduct,
        mode: "insensitive",
      },
    };

    if (range) {
      where.range = range;
    }

    const results = await model.findMany({
      where,
      orderBy: [
        { date: "desc" },
        { productID: "desc" },
      ],
    });

    return NextResponse.json({ data: results });
  } catch (err: any) {
    console.error("Search API error:", err);
    return NextResponse.json(
      { message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}