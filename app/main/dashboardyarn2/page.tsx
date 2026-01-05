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

type YarnMetrics = {
  productType: string | null;
  count: number;
  widthMm: StatTriple;
  tensile: StatTriple;
  elongation: StatTriple;
  tenacity: StatTriple;
};

type YarnReport = {
  metricsByProduct: YarnMetrics[];
  range: { startDate: string; endDate: string };
  totalCount: number;
  filters: { productType?: string; machine?: string; denier?: number };
};

// ----------------- Helpers -----------------
const getISODate = (d: Date) => d.toISOString().split("T")[0];
const getDefaultDates = () => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 7);
  return { defaultStart: getISODate(sevenDaysAgo), defaultEnd: getISODate(today) };
};

// normalize same as backend storing: remove spaces + uppercase
const normalizeNoSpaceUpper = (v: string) => v.trim().replace(/\s+/g, "").toUpperCase();

const fetchYarnReport = async (
  startDate: string,
  endDate: string,
  productType: string,
  machine: string,
  denier?: number
) => {
  const body = { startDate, endDate, productType, machine, denier };

  const res = await fetch("/api/yarnreport2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json.error || json.message || "Failed to fetch report");
  }

  return json as YarnReport;
};

function MetricTable({
  data,
  field,
  label,
}: {
  data: YarnMetrics[];
  field: keyof Pick<YarnMetrics, "widthMm" | "tensile" | "elongation" | "tenacity">;
  label: string;
}) {
  const filteredData = data.filter((row) => {
    const stats = row[field] as StatTriple | undefined;
    return (
      stats &&
      (stats.min != null || stats.mean != null || stats.max != null || stats.stdDev != null)
    );
  });

  if (filteredData.length === 0) return null;

  return (
    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-100">
      <div className="px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200">
        {label}
      </div>

      <table className="min-w-full table-fixed divide-y divide-gray-200">
        <colgroup>
          <col className="w-1/3" />
          <col className="w-1/6" />
          <col className="w-1/6" />
          <col className="w-1/6" />
          <col className="w-1/6" />
        </colgroup>

        <thead className="bg-blue-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-gray-300">
              Product
            </th>
            <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">
              Min
            </th>
            <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">
              Mean
            </th>
            <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">
              Max
            </th>
            <th className="px-6 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider">
              Std Dev
            </th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {filteredData.map((row, i) => {
            const stats = row[field] as StatTriple;
            return (
              <tr key={i} className="hover:bg-blue-50/50">
                <td className="px-6 py-4 whitespace-nowrap font-semibold border-r border-gray-300">
                  {row.productType ?? "N/A"}
                </td>
                <td className="px-6 py-4 text-right">
                  {stats.min != null ? stats.min.toLocaleString() : "-"}
                </td>
                <td className="px-6 py-4 text-right">
                  {stats.mean != null ? stats.mean.toLocaleString() : "-"}
                </td>
                <td className="px-6 py-4 text-right">
                  {stats.max != null ? stats.max.toLocaleString() : "-"}
                </td>
                <td className="px-6 py-4 text-right">
                  {stats.stdDev != null ? stats.stdDev.toLocaleString() : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function YarnDashboard() {
  const { defaultStart, defaultEnd } = getDefaultDates();

  const productTypeRef = useRef<HTMLInputElement>(null);
  const machineRef = useRef<HTMLInputElement>(null);
  const denierRef = useRef<HTMLInputElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [productType, setProductType] = useState("");
  const [machine, setMachine] = useState("");
  const [denier, setDenier] = useState<number | "">("");
  const [report, setReport] = useState<YarnReport | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    const trimmedProductType = productType.trim();
    const trimmedMachine = machine.trim();

    if (!trimmedProductType) {
      setMessage("Product Type is mandatory.");
      return;
    }

    if (!trimmedMachine) {
      setMessage("Machine is mandatory.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setMessage("Start Date cannot be after End Date.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("Fetching data...");
      setReport(null);

      const normalizedProductType = normalizeNoSpaceUpper(trimmedProductType);
      const normalizedMachine = normalizeNoSpaceUpper(trimmedMachine);

      const data = await fetchYarnReport(
        startDate,
        endDate,
        normalizedProductType,
        normalizedMachine,
        denier === "" ? undefined : denier
      );

      setReport(data);
      setMessage(
        `Data loaded for product type "${data.filters.productType ?? normalizedProductType}"`
      );
    } catch (err: any) {
      console.error(err);
      setMessage(`Error fetching data: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  // --------- Export (styled like Lamination export) ----------
  const handleExport = async () => {
    if (!report || report.metricsByProduct.length === 0) {
      setMessage("No data to export.");
      return;
    }

    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Yarn Summary");

      const COLS = 5;

      // --- Title row ---
      const title = `Yarn Summary (${report.range.startDate} to ${report.range.endDate})`;
      const titleRow = ws.addRow([title]);
      ws.mergeCells(titleRow.number, 1, titleRow.number, COLS);
      titleRow.font = { bold: true, size: 14 };
      titleRow.alignment = { horizontal: "center" };

      // --- Total records ---
      const totalCount =
        typeof report.totalCount === "number"
          ? report.totalCount
          : report.metricsByProduct.reduce((sum, p) => sum + (p.count ?? 0), 0);

      // --- Filter / info rows ---
      const effectiveProductType = report.filters.productType ?? "(not provided)";
      const effectiveMachine = report.filters.machine ?? "(not provided)";
      const effectiveDenier =
        report.filters.denier !== undefined && report.filters.denier !== null
          ? String(report.filters.denier)
          : "-";

      const productRow = ws.addRow([`Product Type: ${effectiveProductType}`]);
      const machineRow = ws.addRow([`Machine: ${effectiveMachine}`]);
      const denierRow = ws.addRow([`Denier: ${effectiveDenier}`]);
      const countRow = ws.addRow([`Total records: ${totalCount}`]);

      [productRow, machineRow, denierRow, countRow].forEach((r) => {
        r.font = { italic: true, size: 11 };
      });

      ws.addRow([]); // blank row after filters

      const metricUnits: Record<string, string> = {
        widthMm: "mm",
        tensile: "N/50mm",
        elongation: "%",
        tenacity: "kgf/denier",
      };

      const metricHasData = (field: keyof YarnMetrics) => {
        return report.metricsByProduct.some((p) => {
          const s = p[field] as unknown as StatTriple | undefined;
          return (
            s &&
            (s.min !== null || s.mean !== null || s.max !== null || s.stdDev !== null)
          );
        });
      };

      const applyFullBorder = (cell: ExcelJS.Cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      };

      const writeMetricSection = (
        label: string,
        field: keyof Pick<YarnMetrics, "widthMm" | "tensile" | "elongation" | "tenacity">
      ) => {
        if (!metricHasData(field as any)) return;

        const unit = metricUnits[String(field)] ?? "";

        // SECTION HEADER
        const sectionRow = ws.addRow([unit ? `${label} (${unit})` : label, "", "", "", ""]);
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
            p.productType ?? "N/A",
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

      const orderedFields: Array<{
        label: string;
        field: keyof Pick<YarnMetrics, "widthMm" | "tensile" | "elongation" | "tenacity">;
      }> = [
        { label: "Width", field: "widthMm" },
        { label: "Tensile", field: "tensile" },
        { label: "Elongation", field: "elongation" },
        { label: "Tenacity", field: "tenacity" },
      ];

      const fieldsWithData = orderedFields.filter((x) => metricHasData(x.field as any));

      fieldsWithData.forEach((x, idx) => {
        writeMetricSection(x.label, x.field);

        if (idx !== fieldsWithData.length - 1) {
          ws.addRow([]);
          ws.addRow([]);
        }
      });

      // --- Auto-fit column widths ---
      (ws.columns as ExcelJS.Column[]).forEach((col) => {
        let maxLength = 8;
        col.eachCell({ includeEmpty: true }, (cell) => {
          const v = cell.value;
          const text =
            typeof v === "string" ? v : v == null ? "" : String(v);
          maxLength = Math.max(maxLength, text.length + 1);
        });
        col.width = Math.min(Math.max(maxLength, 8), 28);
      });

      // --- Generate & download file ---
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const safePT = (report.filters.productType || "all").replace(/[^\w-]+/g, "_");
      const safeM = (report.filters.machine || "all").replace(/[^\w-]+/g, "_");

      a.download = `Yarn_${safePT}_${safeM}_${report.range.startDate}_to_${report.range.endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setMessage(`Error exporting Excel: ${err.message ?? err}`);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-4xl font-extrabold mb-6 border-b pb-4">Yarn Dashboard</h1>

      <div className="bg-white p-6 rounded-xl shadow-xl border border-indigo-100 mb-6 space-y-4">
        {/* Row 1 */}
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
            <label className="text-sm font-semibold text-gray-700">Product Type (mandatory)</label>
            <input
              ref={productTypeRef}
              type="text"
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              placeholder="Exact product type"
              className="p-2 border border-gray-300 rounded-lg w-full"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  machineRef.current?.focus();
                }
              }}
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">
          <div className="w-full md:w-1/3">
            <label className="text-sm font-semibold text-gray-700">Machine (mandatory)</label>
            <input
              ref={machineRef}
              type="text"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              placeholder="Machine"
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
            <label className="text-sm font-semibold text-gray-700">Denier (optional)</label>
            <input
              ref={denierRef}
              type="number"
              value={denier}
              onChange={(e) => {
                const v = e.target.value;
                setDenier(v === "" ? "" : Number(v));
              }}
              placeholder="Denier"
              className="p-2 border border-gray-300 rounded-lg w-full"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  searchBtnRef.current?.focus();
                }
              }}
            />
          </div>

          <div className="w-full md:w-1/3" />
        </div>

        {/* Row 3 buttons */}
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
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? "Searching..." : "Search"}
          </button>

          <button
            onClick={handleExport}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            disabled={!report || report.metricsByProduct.length === 0}
          >
            Export
          </button>
        </div>

        {message && (
          <div className="mt-2 p-3 bg-blue-100 text-blue-700 rounded-lg">{message}</div>
        )}
      </div>

      {report ? (
        report.metricsByProduct.some((r) =>
          ["widthMm", "tensile", "elongation", "tenacity"].some((k) => {
            const s = (r as any)[k] as StatTriple | undefined;
            return s && Object.values(s).some((v) => v != null);
          })
        ) ? (
          <div className="space-y-8">
            <MetricTable data={report.metricsByProduct} field="widthMm" label="Width (mm)" />
            <MetricTable data={report.metricsByProduct} field="tensile" label="Tensile (N/50mm)" />
            <MetricTable data={report.metricsByProduct} field="elongation" label="Elongation (%)" />
            <MetricTable data={report.metricsByProduct} field="tenacity" label="Tenacity (kgf/denier)" />
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
