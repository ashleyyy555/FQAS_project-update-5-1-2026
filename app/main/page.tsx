"use client";

import React, { useState, useRef } from "react";
import ExcelJS from "exceljs";
import { FaCalendarAlt } from "react-icons/fa";

type StatTriple = {
  min: number | null;
  mean: number | null;
  max: number | null;
  stdDev: number | null;
};

type ProductMetrics = {
  productType: string | null;
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

type PackagingReport = {
  metricsByProduct: ProductMetrics[];
  range: { startDate: string; endDate: string };
  totalCount: number;
  filters: { productType: string; construction: string; denier: number; color?: string };
};

// ----------------- Helpers -----------------
const getISODate = (d: Date) => d.toISOString().split("T")[0];
const getDefaultDates = () => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 7);
  return { defaultStart: getISODate(sevenDaysAgo), defaultEnd: getISODate(today) };
};

// Normalize product string: trimmed, lowercase, no spaces
const normalizeProductType = (v: string) => v.trim().replace(/\s+/g, "").toLowerCase();

// Fetch API with stricter validation
const fetchPackagingReport = async (
  startDate: string,
  endDate: string,
  productType: string,
  construction: string,
  denier: number,
  color?: string
) => {
  const body = {
    startDate,
    endDate,
    productType,
    construction: construction.trim().toUpperCase(),
    denier,
    color: color?.trim() || undefined,
  };

  const res = await fetch("/api/packagingreport", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch report");
  }

  return res.json() as Promise<PackagingReport>;
};



function MetricTable({
  data,
  field,
  label,
}: {
  data: ProductMetrics[];
  field: keyof ProductMetrics;
  label: string;
}) {
  // Filter out rows where all stats are null
  const filteredData = data.filter((row) => {
    const stats = row[field] as StatTriple | undefined;
    return stats && (stats.min != null || stats.mean != null || stats.max != null || stats.stdDev != null);
  });

  if (filteredData.length === 0) return null; // don't render table if no data

  return (
    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-100">
      <div className="px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200">
        {label}
      </div>

      <table className="min-w-full table-fixed divide-y divide-gray-200">
        <colgroup>
          <col className="w-1/3"/>
          <col className="w-1/6"/>
          <col className="w-1/6"/>
          <col className="w-1/6"/>
          <col className="w-1/6"/>
        </colgroup>

        <thead className="bg-blue-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300">Product</th>
            <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">Min</th>
            <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">Mean</th>
            <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">Max</th>
            <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">Std Dev</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {filteredData.map((row, i) => {
            const stats = row[field] as StatTriple;
            return (
              <tr key={i} className="hover:bg-blue-50/50">
                <td className="px-6 py-4 whitespace-nowrap font-semibold border-r border-gray-300">{row.productType ?? "N/A"}</td>
                <td className="px-6 py-4 text-right">{stats.min != null ? stats.min.toLocaleString() : "-"}</td>
                <td className="px-6 py-4 text-right">{stats.mean != null ? stats.mean.toLocaleString() : "-"}</td>
                <td className="px-6 py-4 text-right">{stats.max != null ? stats.max.toLocaleString() : "-"}</td>
                <td className="px-6 py-4 text-right">{stats.stdDev != null ? stats.stdDev.toLocaleString() : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


// Dashboard
export default function PackagingDashboard() {
  const { defaultStart, defaultEnd } = getDefaultDates();

  const productRef = useRef<HTMLInputElement>(null);
const constructionRef = useRef<HTMLInputElement>(null);
const denierRef = useRef<HTMLInputElement>(null);
const colorRef = useRef<HTMLInputElement>(null);
const searchBtnRef = useRef<HTMLButtonElement>(null);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [product, setProduct] = useState("");
  const [construction, setConstruction] = useState("");
  const [denier, setDenier] = useState<number | "">("");
  const [color, setColor] = useState("");
  const [report, setReport] = useState<PackagingReport | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

const handleSearch = async () => {
  const trimmedProduct = product.trim();
  const trimmedConstruction = construction.trim();

  if (!trimmedProduct) {
    setMessage("Product Type is mandatory.");
    return;
  }

  if (!trimmedConstruction) {
    setMessage("Construction is mandatory.");
    return;
  }

  if (!denier) {
    setMessage("Denier is mandatory.");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    setMessage("Start Date cannot be after End Date.");
    return;
  }

  try {
    setIsLoading(true);
    setMessage("Fetching data...");

    // Normalize before sending
    const normalizedProduct = trimmedProduct.replace(/\s+/g, "").toLowerCase();
    const normalizedConstruction = trimmedConstruction.replace(/\s+/g, "").toLowerCase();

    const data = await fetchPackagingReport(startDate, endDate, normalizedProduct, normalizedConstruction, denier, color);

    setReport(data);
    setMessage(`Data loaded for product type "${data.filters.productType}"`);
  } catch (err: any) {
    console.error(err);
    setMessage(`Error fetching data: ${err.message}`);
  } finally {
    setIsLoading(false);
    setTimeout(() => setMessage(""), 4000);
  }
};



  const handleExport = async () => {
    if (!report) {
      setMessage("No data to export.");
      return;
    }
  
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Packaging Summary");
    
      // --- Title row ---
      const title = `Packaging Summary (${report.range.startDate} to ${report.range.endDate})`;
      const titleRow = ws.addRow([title]);
      ws.mergeCells(1, 1, 1, 5);
      titleRow.font = { bold: true, size: 14 };
      titleRow.alignment = { horizontal: "center" };
    
      // --- Filter / info rows ---
      const filterText = report.filters.productType
        ? `Product filter: ${report.filters.productType}`
        : "Product filter: (all products)";
      const countText = `Total records: ${report.totalCount}`;
      const filterRow = ws.addRow([filterText]);
      const countRow = ws.addRow([countText]);
      filterRow.font = { italic: true, size: 11 };
      countRow.font = { italic: true, size: 11 };
      ws.addRow([]); // blank row
    
      // --- Helper to write one metric section ---
      const writeMetricSection = (label: string, field: keyof ProductMetrics) => {
        // SECTION HEADER (single row, no merge)
        const sectionRow = ws.addRow([label, "", "", "", ""]);
        for (let col = 1; col <= 5; col++) {
          const cell = sectionRow.getCell(col);
          cell.font = { bold: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0F2FE" }, // light blue
          };
          cell.alignment = { horizontal: "center" };
          cell.border = {
            top: { style: "thin" },
            left: { style: col === 1 ? "thin" : undefined },
            right: { style: col === 5 ? "thin" : undefined },
            bottom: { style: "thin" },
          };
        }
      
        // COLUMN HEADERS
        const headerRow = ws.addRow(["Product", "Min", "Mean", "Max", "Std Dev"]);
        headerRow.eachCell((cell, colNumber) => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: "center" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFC0CB" }, // pink
          };
          cell.border = {
            top: { style: "thin" },
            left: { style: colNumber === 1 ? "thin" : undefined },
            right: { style: colNumber === 5 ? "thin" : undefined },
            bottom: { style: "thin" },
          };
        });
      
        // DATA ROWS
        report.metricsByProduct.forEach((r) => {
          const s = r[field] as StatTriple;
          const row = ws.addRow([
            r.productType ?? "N/A",
            s.min,
            s.mean,
            s.max,
            s.stdDev,
          ]);
        
          row.eachCell((cell, colNumber) => {
            cell.alignment = { horizontal: colNumber === 1 ? "left" : "right" };
            cell.border = {
              top: { style: "thin" },
              left: { style: colNumber === 1 ? "thin" : undefined },
              right: { style: colNumber === 5 ? "thin" : undefined },
              bottom: { style: "thin" },
            };
          });
        });
      };
    
      // ---- LAYOUT: Grammage, then Tensile MD+CD, then Elongation MD+CD ----
    
      // 1) Grammage
      writeMetricSection("Grammage (g/m2)", "grammage");
    
      // Two blank rows between Grammage and Tensile group
      ws.addRow([]);
      ws.addRow([]);
    
      // 2) Tensile MD & CD (NO blank row between them)
      writeMetricSection("Tensile MD (N/50mm)", "tensileMD");
      writeMetricSection("Tensile CD (N/50mm)", "tensileCD");
    
      // Two blank rows between Tensile group and Elongation group
      ws.addRow([]);
      ws.addRow([]);
    
      // 3) Elongation MD & CD (NO blank row between them)
      writeMetricSection("Elongation MD (%)", "elongationMD");
      writeMetricSection("Elongation CD (%)", "elongationCD");

            // Two blank rows between Tensile group and Elongation group
      ws.addRow([]);
      ws.addRow([]);
    
      // 3) Elongation MD & CD (NO blank row between them)
      writeMetricSection("Tubing Tensile (kgf/50mm)", "tubingTensile");

            // Two blank rows between Tensile group and Elongation group
      ws.addRow([]);
      ws.addRow([]);
    
      // 3) Elongation MD & CD (NO blank row between them)
      writeMetricSection("Tubing Elongation (%)", "tubingElongation");

      ws.addRow([]);
      ws.addRow([]);
    
      // 3) Elongation MD & CD (NO blank row between them)
      writeMetricSection("Tubing Peel Peak (kgf/6 lines)", "tubingPeelPeak");
      writeMetricSection("Tubing Peel Average (kgf/6 lines)", "tubingPeelAvg");
    
      // --- Auto-fit column widths ---
      (ws.columns as ExcelJS.Column[]).forEach((col) => {
        let maxLength = 0;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value;
          const text =
            typeof cellValue === "string"
              ? cellValue
              : cellValue === null || cellValue === undefined
              ? ""
              : String(cellValue);
          maxLength = Math.max(maxLength, text.length);
        });
        col.width = Math.min(Math.max(maxLength + 2, 10), 26);
      });
    
      // --- Borders for data region (from row 4 onwards) ---
      const lastRowNumber = ws.lastRow?.number ?? 0;
      for (let r = 4; r <= lastRowNumber; r++) {
        const row = ws.getRow(r);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
          };
        });
      }
    
      // --- Generate & download file ---
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
    
      a.href = url;
      a.download = `Packaging_${report.filters.productType || "all"}_${report.range.startDate}_to_${report.range.endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setMessage(`Error exporting Excel: ${err.message ?? err}`);
    }
  };



  return (
    <div className="p-4 md:p-8">
      <h1 className="text-4xl font-extrabold mb-6 border-b pb-4">Packaging Dashboard</h1>

<div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-100 mb-6 space-y-4">
  {/* Row 1: Start Date, End Date, Product */}
  <div className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">
    <div className="w-full md:w-1/3">
      <label className="text-sm font-semibold text-gray-700">Start Date</label>
      <div className="relative">
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="p-2 border border-gray-300 rounded-lg w-full"
      />
      <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
    </div>

    <div className="w-full md:w-1/3">
      <label className="text-sm font-semibold text-gray-700">End Date</label>
      <div className="relative">
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="p-2 border border-gray-300 rounded-lg w-full"
      />
      <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
</div>

    <div className="w-full md:w-1/3">
      <label className="text-sm font-semibold text-gray-700">Product (mandatory)</label>
      <input
      ref={productRef}
        type="text"
        value={product}
        onChange={(e) => setProduct(e.target.value)}
        placeholder="Exact product name"
        className="p-2 border border-gray-300 rounded-lg w-full"
          onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      constructionRef.current?.focus();
    }
  }}
      />
    </div>
  </div>

  {/* Row 2: Construction, Denier, Color */}
  <div className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">
    <div className="w-full md:w-1/3">
      <label className="text-sm font-semibold text-gray-700">Construction (mandatory)</label>
      <input
      ref={constructionRef}
        type="text"
        value={construction}
        onChange={(e) => setConstruction(e.target.value)}
        placeholder="Construction type"
        className="p-2 border border-gray-300 rounded-lg w-full"
          onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      denierRef.current?.focus();
    }
  }}
      />
    </div>

    <div className="w-full md:w-1/3">
      <label className="text-sm font-semibold text-gray-700">Denier (mandatory)</label>
      <input
      ref={denierRef}
        type="number"
        value={denier}
        onChange={(e) => setDenier(Number(e.target.value))}
        placeholder="Denier"
        className="p-2 border border-gray-300 rounded-lg w-full"
          onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      colorRef.current?.focus();
    }
  }}
      />
    </div>

    <div className="w-full md:w-1/3">
      <label className="text-sm font-semibold text-gray-700">Color (optional)</label>
      <input
      ref={colorRef}
        type="text"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        placeholder="Color"
        className="p-2 border border-gray-300 rounded-lg w-full"
          onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchBtnRef.current?.focus();
    }
  }}
      />
    </div>
  </div>

  {/* Row 3: Buttons, right aligned */}
  <div className="flex justify-end space-x-3">
<button
  ref={searchBtnRef}
  onClick={handleSearch}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }}
  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
>
  Search
</button>

    <button
      onClick={handleExport}
      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
    >
      Export
    </button>
  </div>

  {message && <div className="mt-2 p-3 bg-blue-100 text-blue-700 rounded-lg">{message}</div>}
</div>

{report ? (
  report.metricsByProduct.some((r) => {
    return Object.keys(r).some((key) => {
      const k = key as keyof ProductMetrics;
      const value = r[k];
      return value && typeof value === "object" && Object.values(value as StatTriple).some(v => v != null);
    });
  }) ? (
    <div className="space-y-8">
      <MetricTable data={report.metricsByProduct} field="grammage" label="Grammage (g/m2)" />
      <MetricTable data={report.metricsByProduct} field="tensileMD" label="Tensile MD (N/50mm)" />
      <MetricTable data={report.metricsByProduct} field="tensileCD" label="Tensile CD (N/50mm)" />
      <MetricTable data={report.metricsByProduct} field="elongationMD" label="Elongation MD (%)" />
      <MetricTable data={report.metricsByProduct} field="elongationCD" label="Elongation CD (%)" />
      <MetricTable data={report.metricsByProduct} field="tubingTensile" label="Tubing Tensile (kgf/50mm)" />
      <MetricTable data={report.metricsByProduct} field="tubingElongation" label="Tubing Elongation (%)" />
      <MetricTable data={report.metricsByProduct} field="tubingPeelPeak" label="Tubing Peel Peak (kgf/6 lines)" />
      <MetricTable data={report.metricsByProduct} field="tubingPeelAvg" label="Tubing Peel Average (kgf/6 lines)" />
    </div>
  ) : (
    <div className="text-center text-gray-500 mt-6 font-semibold">
      No results within search parameters.
    </div>
  )
) : null}

    </div>
  );
}
