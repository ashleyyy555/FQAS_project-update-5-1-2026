// lib/reports/lamination.ts
import { prisma } from "@/lib/prisma";

/** Which lamination table to query */
export type LaminationTable =
  | "bubbleFoamBubble"
  | "bubbleFoil"
  | "filmFoilAlumFGlass"
  | "leno"
  | "ms2095"
  | "nonWoven"
  | "paperFoil"
  | "radiantBarrier"
  | "ultraFoil"
  | "wrapper";

/** Inputs for Lamination report generation */
export type LaminationReportInput = {
  /** Inclusive "YYYY-MM-DD" */
  startDate: string;
  /** Inclusive "YYYY-MM-DD" */
  endDate: string;
  /** Optional range code filter (e.g. "BFB") */
  range?: string;
  /** Optional product filter (normalized string) */
  product?: string;
};

/** Generic bundle for a numeric statistic */
export type StatTriple = {
  /** Minimum value in range (null if no data) */
  min: number | null;
  /** Maximum value in range (null if no data) */
  max: number | null;
  /** Mean (average) value in range (null if no data) */
  mean: number | null;
  /** Standard deviation (sample, Excel STDEV.S) */
  stdDev: number | null;
};

export type ProductMetrics = {
  product: string | null;
  count: number;
  tensileUnit: string | null;
} & Omit<LaminationMetrics, "count">;


/** Main metrics returned for Lamination (all numeric columns) */
export type LaminationMetrics = {
  /** Number of Lamination rows considered (after filter) */
  count: number;

  grammage: StatTriple;
  tensileMD: StatTriple;
  tensileCD: StatTriple;
  elongationMD: StatTriple;
  elongationCD: StatTriple;
  tongueTearMD: StatTriple;
  tongueTearCD: StatTriple;
  nailShankMD: StatTriple;
  nailShankCD: StatTriple;
  tearStrengthMD: StatTriple;
  tearStrengthCD: StatTriple;
  bondStrengthMD: StatTriple;
  bondStrengthCD: StatTriple;
  bondStrength2MD: StatTriple;
  bondStrength2CD: StatTriple;
  adhesiveMD: StatTriple;
  adhesiveCD: StatTriple;
  adhesive2MD: StatTriple;
  adhesive2CD: StatTriple;
  tearResistanceMD: StatTriple;
  tearResistanceCD: StatTriple;
  initialTearMD: StatTriple;
  initialTearCD: StatTriple;
  staplerTestMD: StatTriple;
  staplerTestCD: StatTriple;
  emissivityAlum1: StatTriple;
  emissivityAlum2: StatTriple;
  emissivityMPET: StatTriple;
  emissivityMCPP: StatTriple;
  sewingMD: StatTriple;
  sewingCD: StatTriple;
  thickness: StatTriple;
  wVTR: StatTriple;
  bS476i1: StatTriple;
  bS476i2: StatTriple;
  bS476i3: StatTriple;
  bs476I: StatTriple;
  tearPropagationMD: StatTriple;
  tearPropagationCD: StatTriple;
};

export type LaminationReport = {
  table: LaminationTable;
  range: { startDate: string; endDate: string };
  /** Filters actually used */
  filters: {
    range?: string;
    product?: string;
    tensileUnit?: string;
  };
  /** Aggregated metrics across the selected range and filters */
  metricsByProduct: ProductMetrics[];
};

/** Shape of each row returned from lamination tables (numeric columns only) */
type LaminationRow = {
  product: string| null,
  grammage: number | null,
  tensileUnit?: string | null,
  tensileMD: number | null,
  tensileCD: number | null,
  elongationMD: number | null,
  elongationCD: number | null,
  tongueTearMD: number | null,
  tongueTearCD: number | null,
  nailShankMD: number | null,
  nailShankCD: number | null,
  tearStrengthMD: number | null,
  tearStrengthCD: number | null,
  bondStrengthMD: number | null,
  bondStrengthCD: number | null,
  bondStrength2MD: number | null,
  bondStrength2CD: number | null,
  adhesiveMD: number | null,
  adhesiveCD: number | null,
  adhesive2MD: number | null,
  adhesive2CD: number | null,
  tearResistanceMD: number | null,
  tearResistanceCD: number | null,
  initialTearMD: number | null,
  initialTearCD: number | null,
  staplerTestMD: number | null,
  staplerTestCD: number | null,
  emissivityAlum1: number | null,
  emissivityAlum2: number | null,
  emissivityMPET: number | null,
  emissivityMCPP: number | null,
  sewingMD: number | null,
  sewingCD: number | null,
  thickness: number | null,
  wVTR: number | null,
  bS476i1: number | null,
  bS476i2: number | null,
  bS476i3: number | null,
  bs476I: number | null,
  tearPropagationMD: number | null,
  tearPropagationCD: number | null,
};

/** Start-of-day UTC for "YYYY-MM-DD" */
function startOfDayUTC(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const year = y ?? 1970;
  const monthIndex = (m ?? 1) - 1; // JS months are 0-based
  const day = d ?? 1;
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
}

/** Next-day start UTC (for exclusive upper bound, so endDate is fully included) */
function nextDayStartUTC(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const year = y ?? 1970;
  const monthIndex = (m ?? 1) - 1;
  const day = (d ?? 1) + 1;
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
}

/**
 * Compute:
 * 1. min = smallest value
 * 2. max = largest value
 * 3. mean = (sum of all values) / (number of values)
 * 4. stdDev = sample standard deviation (Excel STDEV.S, divide by n-1)
 * All rounded to 3 decimal places.
 */
function computeStat(values: (number | null)[]): StatTriple {
  const cleaned = values.filter((v): v is number => v !== null);

  if (cleaned.length === 0) {
    return { min: null, max: null, mean: null, stdDev: null };
  }

  const minRaw = Math.min(...cleaned);
  const maxRaw = Math.max(...cleaned);
  const sum = cleaned.reduce((acc, v) => acc + v, 0);
  const count = cleaned.length;
  const meanRaw = sum / count;

  let stdDevRaw: number;

  if (count > 1) {
    // Sample variance: divide by (n - 1)
    const variance =
      cleaned.reduce((acc, v) => {
        const diff = v - meanRaw;
        return acc + diff * diff;
      }, 0) / (count - 1);
    stdDevRaw = Math.sqrt(variance);
  } else {
    // For a single value, STDEV.S is undefined (#DIV/0 in Excel).
    // Here we return 0 for stability; change to null if you prefer.
    stdDevRaw = 0;
  }

  const to3 = (n: number) => Math.round(n * 1000) / 1000;

  return {
    min: to3(minRaw),
    max: to3(maxRaw),
    mean: to3(meanRaw),
    stdDev: to3(stdDevRaw),
  };
}

/** Map LaminationTable → correct Prisma delegate */
function getLaminationDelegate(table: LaminationTable): any {
  switch (table) {
    case "bubbleFoamBubble":
      return prisma.laminationBubbleFoamBubble;
    case "bubbleFoil":
      return prisma.laminationBubbleFoil;
    case "filmFoilAlumFGlass":
      return prisma.laminationFilmFoilAlumFGlass;
    case "leno":
      return prisma.laminationLeno;
    case "ms2095":
      return prisma.laminationMs2095;
    case "nonWoven":
      return prisma.laminationNonWoven;
    case "paperFoil":
      return prisma.laminationPaperFoil;
    case "radiantBarrier":
      return prisma.laminationRadiantBarrier;
    case "ultraFoil":
      return prisma.laminationUltraFoil;
    case "wrapper":
      return prisma.laminationWrapper;
    default:
      throw new Error(`Unknown lamination table: ${table}`);
  }
}

/**
 * Main report generator for Lamination.
 *
 * For a given lamination table in [startDate, endDate] (inclusive),
 * optionally filtered by `range` and `product`, it computes:
 * 1. Minimum value in each numeric column
 * 2. Maximum value in each numeric column
 * 3. Average value (mean) in each numeric column
 * 4. Standard deviation (sample, STDEV.S) in each numeric column
 * */
export async function getLaminationReport(
  table: LaminationTable,
  input: LaminationReportInput
): Promise<LaminationReport> {
  const { startDate, endDate, range, product } = input;

  const start = startOfDayUTC(startDate);
  const endExclusive = nextDayStartUTC(endDate);

  const where: any = {
    date: { gte: start, lt: endExclusive },
  };

  if (range?.trim()) where.range = range.trim();
  if (product?.trim()) where.product = product.trim();

  const delegate = getLaminationDelegate(table);

  // Fetch all rows in range / filters
  const rows: LaminationRow[] = await delegate.findMany({
    where,
    select: {
      product: true,
      grammage: true,
      tensileUnit: true,
      tensileMD: true,
      tensileCD: true,
      elongationMD: true,
      elongationCD: true,
      tongueTearMD: true,
      tongueTearCD: true,
      nailShankMD: true,
      nailShankCD: true,
      tearStrengthMD: true,
      tearStrengthCD: true,
      bondStrengthMD: true,
      bondStrengthCD: true,
      bondStrength2MD: true,
      bondStrength2CD: true,
      adhesiveMD: true,
      adhesiveCD: true,
      adhesive2MD: true,
      adhesive2CD: true,
      tearResistanceMD: true,
      tearResistanceCD: true,
      initialTearMD: true,
      initialTearCD: true,
      staplerTestMD: true,
      staplerTestCD: true,
      emissivityAlum1: true,
      emissivityAlum2: true,
      emissivityMPET: true,
      emissivityMCPP: true,
      sewingMD: true,
      sewingCD: true,
      thickness: true,
      wVTR: true,
      bS476i1: true,
      bS476i2: true,
      bS476i3: true,
      bs476I: true,
      tearPropagationMD: true,
      tearPropagationCD: true,
    },
  });

  // Group rows by product
  const rowsByProduct = rows.reduce((acc, row) => {
    const key = row.product ?? "N/A";
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {} as Record<string, LaminationRow[]>);

  // List of all metrics keys
  const metricKeys = [
    "grammage","tensileMD","tensileCD","elongationMD","elongationCD",
    "tongueTearMD","tongueTearCD","nailShankMD","nailShankCD",
    "tearStrengthMD","tearStrengthCD","bondStrengthMD","bondStrengthCD",
    "bondStrength2MD","bondStrength2CD","adhesiveMD","adhesiveCD",
    "adhesive2MD","adhesive2CD","tearResistanceMD","tearResistanceCD","initialTearMD", "initialTearCD",
    "staplerTestMD","staplerTestCD","emissivityAlum1","emissivityAlum2",
    "emissivityMPET","emissivityMCPP","sewingMD","sewingCD","thickness","wVTR",
    "bS476i1","bS476i2","bS476i3","bs476I","tearPropagationMD","tearPropagationCD"
  ] as const;

  // Compute metrics for each product
const metricsByProduct: ProductMetrics[] = Object.entries(rowsByProduct).map(
  ([product, productRows]) => {
    const metrics: any = { product, count: productRows.length };

    for (const key of metricKeys) {
      metrics[key] = computeStat(productRows.map((r) => r[key]));
    }

    // Grab tensileUnit from first row
    metrics.tensileUnit = productRows[0].tensileUnit ?? "N/50mm";

    return metrics as ProductMetrics & { tensileUnit?: string };
  }
);


  return {
    table,
    range: { startDate, endDate },
    filters: {
      range: range?.trim() || undefined,
      product: product?.trim() || undefined,
    },
    metricsByProduct,
  };
}

/** Convenience helper for a single day (YYYY-MM-DD). */
export async function getLaminationReportForDay(
  table: LaminationTable,
  date: string,
  extraFilters?: { range?: string; product?: string }
) {
  return getLaminationReport(table, {
    startDate: date,
    endDate: date,
    ...extraFilters,
  });
}
