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
  product: string | null;
  count: number;
  [key: string]: StatTriple | string | number | null; // allows any additional metrics
};

type LaminationReport = {
  metricsByProduct: ProductMetrics[];
  range: { startDate: string; endDate: string };
  filters: { category: string; range: string; product: string };
  tensileUnit?: string;
};

const getISODate = (d: Date) => d.toISOString().split("T")[0];
const getDefaultDates = () => {
  const today = new Date();
  return { defaultStart: getISODate(today), defaultEnd: getISODate(today) };
};

const categoryRanges: Record<string, string[]> = {
  "Bubble Foam Bubble": ["BFB"],
  "Bubble Foil": ["Bubble Foil"],
  "Film Foil & Alum+F.Glass": ["AL+F.Glass", "Film Foil"],
  "Leno": ["Leno1"],
  "MS 2095": ["MS2095"],
  "Non Woven": ["Non Woven"],
  "Paper Foil": ["Paper Foil"],
  "Radiant Barrier": ["FR1", "FR2", "NFR1", "NFR2"],
  "Ultra Foil": ["Ultra Foil"],
  "Wrapper": ["Wrapper"],
};

// Simple label for metric sections
const formatMetricName = (key: string) =>
  key.charAt(0).toUpperCase() + key.slice(1);

export default function LaminationDashboard() {
  const { defaultStart, defaultEnd } = getDefaultDates();

const productRef = useRef<HTMLInputElement>(null);
const searchBtnRef = useRef<HTMLButtonElement>(null);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [category, setCategory] = useState("");
  const [range, setRange] = useState("");
  const [product, setProduct] = useState("");

  const [report, setReport] = useState<LaminationReport | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const normalizeProduct = (v: string) =>
    v.trim().replace(/\s+/g, "").toUpperCase();

  const categoryToTable = (cat: string) => {
    switch (cat) {
      case "Bubble Foam Bubble":
        return "bubbleFoamBubble";
      case "Bubble Foil":
        return "bubbleFoil";
      case "Film Foil & Alum+F.Glass":
        return "filmFoilAlumFGlass";
      case "Leno":
        return "leno";
      case "MS 2095":
        return "ms2095";
      case "Non Woven":
        return "nonWoven";
      case "Paper Foil":
        return "paperFoil";
      case "Radiant Barrier":
        return "radiantBarrier";
      case "Ultra Foil":
        return "ultraFoil";
      case "Wrapper":
        return "wrapper";
      default:
        return "";
    }
  };


  const handleFetchReport = async () => {
    if (!product.trim()) {
      setMessage("Product is required.");
      return;
    }
    if (!category) {
      setMessage("Category is required.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setMessage("Start Date cannot be after End Date.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("Fetching report...");
      setReport(null);

      const normalizedProduct = normalizeProduct(product);

      const body = {
        table: categoryToTable(category),
        startDate,
        endDate,
        range,
        product: normalizedProduct,
      };

      const res = await fetch("/api/laminationreport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch report");
      setReport(data);
      setMessage(`Data loaded for product "${product.trim()}"`);
    } catch (err: any) {
      console.error(err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const metricUnits: Record<string, string> = {
    grammage: "g/m²",
    elongationMD: "%",
    elongationCD: "%",
    tongueTearMD: "N",
    tongueTearCD: "N",
    nailShankMD: "N",
    nailShankCD: "N",
    tearStrengthMD: "kgf",
    tearStrengthCD: "kgf",
    bondStrengthMD: "N/50mm",
    bondStrengthCD: "N/50mm",
    bondStrength2MD: "N/50mm",
    bondStrength2CD: "N/50mm",
    adhesiveMD: "N/25.4mm",
    adhesiveCD: "N/25.4mm",
    adhesive2MD: "N/25.4mm",
    adhesive2CD: "N/25.4mm",
    tearResistanceMD: "N",
    tearResistanceCD: "N",
    staplerTestMD: "N",
    staplerTestCD: "N",
    emissivityAlum1: "Index",
    emissivityAlum2: "Index",
    emissivityMPET: "Index",
    sewingMD: "%",
    sewingCD: "%",
    thickness: "mm",
    wVTR: "g/m2/day",
    tearPropagationMD: "N/mm",
    tearPropagationCD: "N/mm"
  
};

  // export styled like Packaging export
  const handleExport = async () => {
    if (!report || report.metricsByProduct.length === 0) {
      setMessage("No data to export.");
      return;
    }
 
   try {
     const wb = new ExcelJS.Workbook();
     const ws = wb.addWorksheet("Lamination Summary");
 
     const COLS = 5;
 
     // --- Title row ---
     const title = `Lamination Summary (${report.range.startDate} to ${report.range.endDate})`;
     const titleRow = ws.addRow([title]);
     ws.mergeCells(titleRow.number, 1, titleRow.number, COLS);
     titleRow.font = { bold: true, size: 14 };
     titleRow.alignment = { horizontal: "center" };
 
     // --- Compute total records from product counts ---
     const totalCount = report.metricsByProduct.reduce(
       (sum, p) => sum + (p.count ?? 0),
       0
     );
 
     // --- Filter / info rows ---
     const effectiveCategory = category || report.filters.category || "-";
     const effectiveRange = range || report.filters.range || "-";
     const effectiveProduct = product || report.filters.product || "";
 
     const categoryText = `Category: ${effectiveCategory}`;
     const rangeText = `Range: ${effectiveRange}`;
     const productAndCountText = effectiveProduct
       ? `Product filter: ${effectiveProduct} | Total records: ${totalCount}`
       : `Product filter: (all products) | Total records: ${totalCount}`;
 
     const catRow = ws.addRow([categoryText]);
     const rgRow = ws.addRow([rangeText]);
     const prodRow = ws.addRow([productAndCountText]);
     [catRow, rgRow, prodRow].forEach((row) => {
       row.font = { italic: true, size: 11 };
     });
 
     ws.addRow([]); // blank row after filters
 
     // --- Helper: check if metric has any data ---
     const metricHasData = (field: keyof ProductMetrics) => {
       return report.metricsByProduct.some((p) => {
         const s = p[field] as unknown as StatTriple | undefined;
         return (
           s &&
           (s.min !== null ||
             s.mean !== null ||
             s.max !== null ||
             s.stdDev !== null)
         );
       });
     };
 
     // --- Helper: apply FULL grid border (vertical + horizontal) ---
     const applyFullBorder = (cell: ExcelJS.Cell) => {
       cell.border = {
         top: { style: "thin" },
         left: { style: "thin" },
         bottom: { style: "thin" },
         right: { style: "thin" },
       };
     };
 
     // --- Helper: write one metric section (FULL vertical borders) ---
     const writeMetricSection = (label: string, field: keyof ProductMetrics) => {
       if (!metricHasData(field)) return;
 
       const tensileUnit = report.metricsByProduct[0]?.tensileUnit ?? "";
       const unit =
         field === "tensileMD" || field === "tensileCD"
           ? tensileUnit
           : metricUnits[field as string] ?? "";
 
       // SECTION HEADER (with unit)
       const sectionRow = ws.addRow([
         unit ? `${label} (${unit})` : label,
         "",
         "",
         "",
         "",
       ]);
       for (let col = 1; col <= COLS; col++) {
         const cell = sectionRow.getCell(col);
         cell.font = { bold: true };
         cell.fill = {
           type: "pattern",
           pattern: "solid",
           fgColor: { argb: "FFE0F2FE" }, // light blue
         };
         cell.alignment = { horizontal: "center" };
         applyFullBorder(cell);
       }
 
       // COLUMN HEADERS
       const headerRow = ws.addRow(["Product", "Min", "Mean", "Max", "Std Dev"]);
       headerRow.eachCell((cell) => {
         cell.font = { bold: true };
         cell.alignment = { horizontal: "center" };
         cell.fill = {
           type: "pattern",
           pattern: "solid",
           fgColor: { argb: "FFFFC0CB" }, // pink
         };
         applyFullBorder(cell);
       });
 
       // DATA ROWS
       report.metricsByProduct.forEach((p) => {
         const s = p[field] as unknown as StatTriple | undefined;
 
         const row = ws.addRow([
           p.product ?? "N/A",
           s?.min ?? null,
           s?.mean ?? null,
           s?.max ?? null,
           s?.stdDev ?? null,
         ]);
 
         row.eachCell((cell, colNumber) => {
           cell.alignment = { horizontal: colNumber === 1 ? "left" : "right" };
           applyFullBorder(cell);
         });
       });
     };
 
     // --- Build dynamic list of fields (keep MD/CD pairing) ---
     const firstProduct = report.metricsByProduct[0];
     const rawFields = Object.keys(firstProduct).filter(
       (k) => k !== "product" && k !== "count" && k !== "tensileUnit"
     ) as (keyof ProductMetrics)[];
 
     const visited = new Set<string>();
     const groups: { fields: (keyof ProductMetrics)[] }[] = [];
 
     for (const f of rawFields) {
       if (visited.has(String(f))) continue;
 
       const name = String(f);
 
       // pair MD with CD if exists
       if (name.endsWith("MD")) {
         const base = name.slice(0, -2);
         const cd = (base + "CD") as keyof ProductMetrics;
 
         if (rawFields.includes(cd)) {
           visited.add(name);
           visited.add(String(cd));
           groups.push({ fields: [f, cd] });
           continue;
         }
       }
 
       visited.add(name);
       groups.push({ fields: [f] });
     }
 
     // ✅ KEY FIX: only output groups that have data (prevents blank gaps)
     const groupsWithData = groups.filter((g) =>
       g.fields.some((field) => metricHasData(field))
     );
 
     groupsWithData.forEach((g, idx) => {
       g.fields.forEach((field) => {
         if (!metricHasData(field)) return; // allow MD without CD (or vice versa)
         const label = formatMetricName(String(field));
         writeMetricSection(label, field);
       });
 
       // keep your spacing style, but only between printed groups
       if (idx !== groupsWithData.length - 1) {
         ws.addRow([]);
         ws.addRow([]);
       }
     });
 
     // --- Auto-fit column widths (shorter) ---
     (ws.columns as ExcelJS.Column[]).forEach((col) => {
       let maxLength = 8;
       col.eachCell({ includeEmpty: true }, (cell) => {
         const v = cell.value;
         const text =
           typeof v === "string"
             ? v
             : v === null || v === undefined
             ? ""
             : String(v);
         maxLength = Math.max(maxLength, text.length + 1);
       });
       col.width = Math.min(Math.max(maxLength, 8), 25);
     });
 
     // --- Generate & download file ---
     const buffer = await wb.xlsx.writeBuffer();
     const blob = new Blob([buffer], {
       type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
     });
 
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = `Lamination_${report.filters.product || "all"}_${
       report.range.startDate
     }_to_${report.range.endDate}.xlsx`;
     a.click();
     URL.revokeObjectURL(url);
   } catch (err: any) {
     console.error(err);
     setMessage(`Error exporting Excel: ${err.message ?? err}`);
   }
 };



  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-4xl font-extrabold mb-6 border-b pb-4">
        Lamination Dashboard
      </h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-100 space-y-4">
        <div className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Start Date
            </label>
            <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
            <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              End Date
            </label>
            <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
            <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg appearance-none"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setRange("");
              }}
            >
              <option value="">Select Category</option>
              {Object.keys(categoryRanges).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Type
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg appearance-none"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              disabled={!category}
            >
              <option value="">Select Type</option>
              {category &&
                categoryRanges[category].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 items-end mt-4">
          <div className="w-full md:w-3/4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Product
            </label>
            <input
            ref={productRef}
              type="text"
              placeholder="Exact product name"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
                onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent newline
      searchBtnRef.current?.focus();
    }
  }}
            />
          </div>
          <div className="flex w-full md:w-1/4 space-x-2">
  
  <button
  ref={searchBtnRef}
  onClick={handleFetchReport}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFetchReport();
    }
  }}
  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
>
  Search
</button>
            <button
              onClick={handleExport}
              className="w-1/2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              disabled={!report}
            >
              Export
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded-lg">
            {message}
          </div>
        )}
      </div>

      {/* Report rendering */}
      {report && report.metricsByProduct.length > 0 && (
        <div className="space-y-6">
{Object.keys(report.metricsByProduct[0])
.filter((k) => k !== "product" && k !== "count" && k !== "tensileUnit")
  .map((field) => {
    const metricKey = field as keyof ProductMetrics;

    const hasData = report.metricsByProduct.some((p) => {
      const s = p[metricKey] as unknown as StatTriple | undefined;
      return (
        s &&
        (s.min !== null || s.mean !== null || s.max !== null || s.stdDev !== null)
      );
    });

    if (!hasData) return null;

const unit = metricKey === "tensileMD" || metricKey === "tensileCD"
  ? report.metricsByProduct[0].tensileUnit
  : metricUnits[metricKey] ?? "";

const label = formatMetricName(field) + (unit ? ` (${unit})` : "");



    return (
      <div
        key={field}
        className="overflow-x-auto shadow-md rounded-lg border border-gray-100"
      >
        <div className="px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200">
          {label}
        </div>
        <table className="min-w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase border-r border-gray-300 w-1/5">
                Product
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase w-1/5">
                Min
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase w-1/5">
                Mean
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase w-1/5">
                Max
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase w-1/5">
                SD
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {report.metricsByProduct.map((p, idx) => {
              const stats = p[metricKey] as unknown as StatTriple;
              return (
                <tr key={p.product || idx} className="hover:bg-blue-50/50">
                  <td className="px-6 py-4 font-semibold border-r border-gray-300 w-1/5">
                    {p.product}
                  </td>
                  <td className="px-6 py-4 text-right w-1/5">{stats?.min ?? "-"}</td>
                  <td className="px-6 py-4 text-right w-1/5">{stats?.mean ?? "-"}</td>
                  <td className="px-6 py-4 text-right w-1/5">{stats?.max ?? "-"}</td>
                  <td className="px-6 py-4 text-right w-1/5">{stats?.stdDev ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  })}
        </div>
      )}

      {/* Show "No results found" ONLY when report exists but contains no data */}
      {report && report.metricsByProduct.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          No results found.
        </div>
      )}
    </div>
  );
}
