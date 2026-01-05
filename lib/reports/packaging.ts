import { prisma } from "@/lib/prisma";

/** Inputs for Packaging report generation */
export type PackagingReportInput = {
  startDate: string;
  endDate: string;

  /** REQUIRED */
  productType: string;

  /** REQUIRED */
  construction: string;

  /** REQUIRED */
  denier: number;

  /** OPTIONAL */
  color?: string;
};


/** Generic triple for a numeric statistic */
export type StatTriple = {
  min: number | null;
  max: number | null;
  mean: number | null;
  stdDev: number | null;
};

/** Metrics for ONE product type in Packaging */
export type PackagingProductMetrics = {
  /** Product TYPE for this group */
  productType: string | null;

  /** Number of Packaging rows for this product type */
  count: number;

  grammage: StatTriple;
  tensileMD: StatTriple;
  tensileCD: StatTriple;
  elongationMD: StatTriple;
  elongationCD: StatTriple;
  tubingTensile: StatTriple;
  tubingElongation: StatTriple;
  tubingPeelPeak: StatTriple;
  tubingPeelAvg: StatTriple;
};

export type PackagingReport = {
  range: { startDate: string; endDate: string };

  filters: {
    productType: string;
    construction: string;
    denier: number;
    color?: string;
  };

  metricsByProduct: PackagingProductMetrics[];
  totalCount: number;
};


/** DB row shape */
type PackagingRow = {
  productType: string | null;
  grammage: number | null;
  tensileMD: number | null;
  tensileCD: number | null;
  elongationMD: number | null;
  elongationCD: number | null;
  tubingTensile: number | null;
  tubingElongation: number | null;
  tubingPeelPeak: number | null;
  tubingPeelAvg: number | null;
};

/** Normalize product type */
function normalizeProductType(v: string) {
  return v.replace(/\s+/g, "").toLowerCase();
}

/** Start-of-day UTC */
function startOfDayUTC(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0));
}

/** Next-day start UTC (exclusive end) */
function nextDayStartUTC(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + 1, 0, 0, 0, 0));
}

/** Compute statistics */
function computeStat(values: (number | null)[]): StatTriple {
  const cleaned = values.filter((v): v is number => v !== null);

  if (cleaned.length === 0) {
    return { min: null, max: null, mean: null, stdDev: null };
  }

  const min = Math.min(...cleaned);
  const max = Math.max(...cleaned);
  const mean = cleaned.reduce((a, b) => a + b, 0) / cleaned.length;

  let stdDev = 0;
  if (cleaned.length > 1) {
    const variance =
      cleaned.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
      (cleaned.length - 1);
    stdDev = Math.sqrt(variance);
  }

  const r3 = (n: number) => Math.round(n * 1000) / 1000;

  return {
    min: r3(min),
    max: r3(max),
    mean: r3(mean),
    stdDev: r3(stdDev),
  };
}

/**
 * MAIN Packaging report
 */
export async function getPackagingReport(
  input: PackagingReportInput
): Promise<PackagingReport> {
  const {
    startDate,
    endDate,
    productType,
    construction,
    denier,
    color,
  } = input;

  // ---- VALIDATION ----
  if (!productType) throw new Error("Product Type is required");
  if (!construction) throw new Error("Construction is required");
  if (denier === undefined || denier === null || isNaN(denier)) {
    throw new Error("Denier is required and must be a number");
  }

  const start = startOfDayUTC(startDate);
  const endExclusive = nextDayStartUTC(endDate);

  // ---- WHERE CLAUSE ----
  const where: any = {
    testDate: {
      gte: start,
      lt: endExclusive,
    },
    productType: productType.trim(),
    construction: construction.trim(),
    denier: Number(denier),
  };

  if (color && color.trim() !== "") {
    where.color = color.trim().toUpperCase();
  }

  // ---- FETCH ----
  const rows: PackagingRow[] = await prisma.packaging.findMany({
    where,
    select: {
      productType: true,
      grammage: true,
      tensileMD: true,
      tensileCD: true,
      elongationMD: true,
      elongationCD: true,
      tubingTensile: true,
      tubingElongation: true,
      tubingPeelPeak: true,
      tubingPeelAvg: true,
    },
  });

  const totalCount = rows.length;

  // ---- GROUP BY PRODUCT TYPE ----
  const groups = new Map<string | null, PackagingRow[]>();
  for (const row of rows) {
    const key = row.productType ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const metricsByProduct: PackagingProductMetrics[] = [];

  for (const [productTypeKey, groupRows] of groups.entries()) {
metricsByProduct.push({
  productType: productTypeKey,
  count: groupRows.length,
  grammage: computeStat(groupRows.map(r => r.grammage)),
  tensileMD: computeStat(groupRows.map(r => r.tensileMD)),
  tensileCD: computeStat(groupRows.map(r => r.tensileCD)),
  elongationMD: computeStat(groupRows.map(r => r.elongationMD)),
  elongationCD: computeStat(groupRows.map(r => r.elongationCD)),
  tubingTensile: computeStat(groupRows.map(r => r.tubingTensile)),
  tubingElongation: computeStat(groupRows.map(r => r.tubingElongation)),
  tubingPeelPeak: computeStat(groupRows.map(r => r.tubingPeelPeak)),
  tubingPeelAvg: computeStat(groupRows.map(r => r.tubingPeelAvg)),
});

  }

  metricsByProduct.sort((a, b) =>
    (a.productType ?? "").localeCompare(b.productType ?? "")
  );

  return {
    range: { startDate, endDate },
    filters: {
      productType,
      construction,
      denier,
      ...(color ? { color: color.toUpperCase() } : {}),
    },
    metricsByProduct,
    totalCount,
  };
}
