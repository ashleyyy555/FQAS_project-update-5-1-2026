import { getLaminationReport } from "@/lib/reports/lamination";

export async function POST(req: Request) {
  const body = await req.json();

  const {
    table,        // derived from category
    startDate,
    endDate,
    range,
    product,
    category,     // frontend-only
  } = body;

  if (!table) {
    return Response.json(
      { error: "Invalid category" },
      { status: 400 }
    );
  }

  const report = await getLaminationReport(table, {
    startDate,
    endDate,
    range,
    product,
  });

  return Response.json({
    ...report,
    filters: {
      category,   // 👈 injected here
      range,
      product,
    },
  });
}
