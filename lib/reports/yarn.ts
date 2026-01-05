// lib/reports/yarn.ts
import { prisma } from "@/lib/prisma";

/** Inputs for Yarn report generation */
export type YarnReportInput = {
  /** Inclusive "YYYY-MM-DD" */
  startDate: string;
  /** Inclusive "YYYY-MM-DD" */
  endDate: string;

  /** Optional productType filter (raw input; will be normalized) */
  productType?: string;

  /** Optional machine filter (raw input; will be normalized) */
  machine?: string;

  /** Optional denier filter */
  denier?: number;
};

/** Generic bundle for a numeric statistic */
export type StatTriple = {
  min: number | null;
  max: number | null;
  mean: number | null;
  stdDev: number | null;
};

export type YarnMetrics = {
  count: number;

  widthMm: StatTriple;
  denier: StatTriple;
  tensile: StatTriple;
  elongation: StatTriple;
  tenacity: StatTriple;
};

export type YarnProductMetrics = {
  productType: string | null;
  count: number;
} & Omit<YarnMetrics, "count">;

export type YarnReport = {
  range: { startDate: string; endDate: string };
  filters: {
    productType?: string;
    machine?: string;
    denier?: number;
  };
  metricsByProduct: YarnProductMetrics[];
  totalCount: number;
};

/** Shape of each row returned from Yarn (numeric columns only) */
type YarnRowRaw = {
  productType: string | null;
  machine: string | null;

  widthMm: any | null;   // Prisma Decimal in runtime
  denier: any | null;    // Prisma Decimal in runtime
  tensile: any | null;   // Prisma Decimal in runtime
  elongation: any | null;// Prisma Decimal in runtime
  tenacity: any | null;  // Prisma Decimal in runtime
};

/** Start-of-day UTC for "YYYY-MM-DD" */
function startOfDayUTC(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const year = y ?? 1970;
  const monthIndex = (m ?? 1) - 1;
  const day = d ?? 1;
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
}

/** Next-day start UTC (exclusive upper bound) */
function nextDayStartUTC(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const year = y ?? 1970;
  const monthIndex = (m ?? 1) - 1;
  const day = (d ?? 1) + 1;
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
}

/** Normalize like your /api/yarn backend: remove spaces + uppercase */
function normalizeNoSpaceUpper(v: string) {
  return v.replace(/\s+/g, "").toUpperCase();
}

/** Prisma Decimal -> number (without importing Prisma type) */
function decToNum(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v?.toNumber === "function") return v.toNumber(); // Prisma.Decimal
  return Number(v);
}

/**
 * Compute min/max/mean/stdDev (sample, Excel STDEV.S), rounded to 3 dp.
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
    const variance =
      cleaned.reduce((acc, v) => {
        const diff = v - meanRaw;
        return acc + diff * diff;
      }, 0) / (count - 1);
    stdDevRaw = Math.sqrt(variance);
  } else {
    stdDevRaw = 0; // same choice as your lamination
  }

  const to3 = (n: number) => Math.round(n * 1000) / 1000;

  return {
    min: to3(minRaw),
    max: to3(maxRaw),
    mean: to3(meanRaw),
    stdDev: to3(stdDevRaw),
  };
}

/**
 * Main report generator for Yarn.
 * Computes stats for:
 * widthMm, denier, tensile, elongation, tenacity
 * grouped by productType.
 */
export async function getYarnReport(input: YarnReportInput): Promise<YarnReport> {
  const { startDate, endDate, productType, machine, denier } = input;

  const start = startOfDayUTC(startDate);
  const endExclusive = nextDayStartUTC(endDate);

  const where: any = {
    date: { gte: start, lt: endExclusive },
  };

  // Match your backend normalization rules
  if (productType?.trim()) where.productType = normalizeNoSpaceUpper(productType.trim());
  if (machine?.trim()) where.machine = normalizeNoSpaceUpper(machine.trim());
  if (denier !== undefined && denier !== null && !Number.isNaN(Number(denier))) {
    where.denier = Number(denier);
  }

  // Fetch rows
  const rawRows: YarnRowRaw[] = await prisma.yarn.findMany({
    where,
    select: {
      productType: true,
      machine: true,
      widthMm: true,
      denier: true,
      tensile: true,
      elongation: true,
      tenacity: true,
    },
  });

  // Convert decimals to numbers for math
  const rows = rawRows.map((r) => ({
    productType: r.productType ?? null,
    machine: r.machine ?? null,
    widthMm: decToNum(r.widthMm),
    denier: decToNum(r.denier),
    tensile: decToNum(r.tensile),
    elongation: decToNum(r.elongation),
    tenacity: decToNum(r.tenacity),
  }));

  const totalCount = rows.length;

  // Group rows by productType
  const rowsByProduct = rows.reduce((acc, row) => {
    const key = row.productType ?? "N/A";
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {} as Record<string, typeof rows>);

  // List of all metrics keys (like your lamination file)
  const metricKeys = ["widthMm", "denier", "tensile", "elongation", "tenacity"] as const;

  // Compute metrics for each productType
  const metricsByProduct: YarnProductMetrics[] = Object.entries(rowsByProduct).map(
    ([productTypeKey, productRows]) => {
      const metrics: any = { productType: productTypeKey === "N/A" ? null : productTypeKey, count: productRows.length };

      for (const key of metricKeys) {
        metrics[key] = computeStat(productRows.map((r) => r[key]));
      }

      return metrics as YarnProductMetrics;
    }
  );

  metricsByProduct.sort((a, b) =>
    (a.productType ?? "").localeCompare(b.productType ?? "")
  );

  return {
    range: { startDate, endDate },
    filters: {
      productType: productType?.trim() || undefined,
      machine: machine?.trim() || undefined,
      ...(denier !== undefined && denier !== null ? { denier: Number(denier) } : {}),
    },
    metricsByProduct,
    totalCount,
  };
}

/** Convenience helper for a single day (YYYY-MM-DD). */
export async function getYarnReportForDay(
  date: string,
  extraFilters?: { productType?: string; machine?: string; denier?: number }
) {
  return getYarnReport({
    startDate: date,
    endDate: date,
    ...extraFilters,
  });
}
