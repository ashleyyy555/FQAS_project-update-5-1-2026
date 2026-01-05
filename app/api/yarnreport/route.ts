// /app/api/packaging-report/route.ts
import { NextResponse } from "next/server";
import { getYarnReport, YarnReportInput } from "@/lib/reports/yarn";

export const runtime = "nodejs";

// normalize product type: remove spaces + lowercase
function normalizeProductType(v: string) {
  return v.replace(/\s+/g, "").toUpperCase();
}

export async function POST(req: Request) {
  try {
    // Flexible body type
    const body = (await req.json()) as Record<string, any>;

    if (!body.startDate || !body.endDate) {
      return NextResponse.json({ error: "Missing startDate or endDate" }, { status: 400 });
    }

    if (!body.productType?.trim()) {
      return NextResponse.json({ error: "ProductType is required" }, { status: 400 });
    }

    // Normalize product type safely
    const normalized = normalizeProductType(body.productType);
    body.productType = normalized;

    // Remove legacy field
    delete body.product;

    const report = await getYarnReport(body as YarnReportInput);
    return NextResponse.json(report);
  } catch (err: any) {
    console.error("Yarn report API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
