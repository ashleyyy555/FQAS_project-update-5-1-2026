"use client";

import React, { useState, useRef } from "react";
import ExcelJS from "exceljs";
import { FaCalendarAlt } from "react-icons/fa";

import {
  fetchPackagingById,
  updatePackaging,
  deletePackaging,
} from "@/app/actions/packagingRecords";

const baseInputStyle =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";

// --- Table headers ---
const HEADERS = [
  { key: "productID", label: "Product ID" },
  { key: "testDate", label: "Date" },
  { key: "productType", label: "Product Type" },
  { key: "construction", label: "Construction" },
  { key: "denier", label: "Denier" },
  { key: "color", label: "Color" },
  { key: "additionalFeatures", label: "Additional Features" },
  { key: "grammage", label: "Grammage" },
  { key: "tensileMD", label: "Tensile MD" },
  { key: "tensileCD", label: "Tensile CD" },
  { key: "elongationMD", label: "Elongation MD" },
  { key: "elongationCD", label: "Elongation CD" },
  { key: "tubingTensile", label: "Tubing Tensile" },
  { key: "tubingElongation", label: "Tubing Elongation" },
  { key: "tubingPeelPeak", label: "Tubing Peel Peak" },
  { key: "tubingPeelAvg", label: "Tubing Peel Avg" },
  { key: "notes", label: "Notes" },
  { key: "actions", label: "Actions" },
] as const;

const NUMERIC_KEYS = new Set<string>([
  "denier",
  "grammage",
  "tensileMD",
  "tensileCD",
  "elongationMD",
  "elongationCD",
  "tubingTensile",
  "tubingElongation",
  "tubingPeelPeak",
  "tubingPeelAvg",
]);

const getCurrentDate = () => new Date().toISOString().split("T")[0];

// Small helper for UI rendering
const toDisplayDate = (v: any) => {
  if (!v) return "";

  if (v instanceof Date) {
    return v.toISOString().split("T")[0];
  }

  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

// Helper for <input type="date" />
const toInputDate = (v: any) => {
  if (!v) return "";

  if (v instanceof Date) {
    return v.toISOString().split("T")[0];
  }

  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

export default function SearchPage() {
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());

  const productRef = useRef<HTMLInputElement>(null);
  const constructionRef = useRef<HTMLInputElement>(null);
  const denierRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  const [productType, setProductType] = useState("");
  const [construction, setConstruction] = useState("");
  const [denier, setDenier] = useState("");
  const [color, setColor] = useState("");

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    testDate: "",
    productID: "",
    productType: "",
    construction: "",
    denier: "",
    color: "",
    additionalFeatures: "",
    grammage: "",
    tensileMD: "",
    tensileCD: "",
    elongationMD: "",
    elongationCD: "",
    tubingTensile: "",
    tubingElongation: "",
    tubingPeelPeak: "",
    tubingPeelAvg: "",
    notes: "",
  });

  const disableActions = isSearching || isExporting || isMutating;

  const [rangeEnabled, setRangeEnabled] = useState({
    grammage: false,
    tensileMD: false,
    tensileCD: false,
    elongationMD: false,
    elongationCD: false,
    tubingTensile: false,
    tubingElongation: false,
    tubingPeelPeak: false,
    tubingPeelAvg: false,
  });

  const [ranges, setRanges] = useState({
    grammageMin: "",
    grammageMax: "",
    tensileMDMin: "",
    tensileMDMax: "",
    tensileCDMin: "",
    tensileCDMax: "",
    elongationMDMin: "",
    elongationMDMax: "",
    elongationCDMin: "",
    elongationCDMax: "",
    tubingTensileMin: "",
    tubingElongationMin: "",
    tubingPeelPeakMin: "",
    tubingPeelAvgMin: "",
    tubingTensileMax: "",
    tubingElongationMax: "",
    tubingPeelPeakMax: "",
    tubingPeelAvgMax: "",
  });

  const toggleRange = (key: keyof typeof rangeEnabled) => {
    setRangeEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateRange = (key: keyof typeof ranges, value: string) => {
    setRanges((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = async () => {
    if (!productType) return setErrorMessage("Please enter a product type to search for.");
    if (!construction) return setErrorMessage("Please enter the construction.");
    if (!denier) return setErrorMessage("Please enter the denier.");

    setIsSearching(true);
    setErrorMessage("");
    setSearchResults([]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          productType,
          construction: construction.trim().toUpperCase(),
          denier,
          color: color ? color.trim().toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) setErrorMessage(data.message || "Search failed.");
      else setSearchResults(data.data || []);
    } catch (err: any) {
      console.error("Search error:", err);
      setErrorMessage(err?.message || "Network error occurred.");
    } finally {
      setIsSearching(false);
    }
  };

  // --- Export to Excel (enhanced + ALL centered + export raw data analysis highlighting) ---
  const handleExport = async () => {
    if (searchResults.length === 0) return;

    setIsExporting(true);
    setErrorMessage("");

    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Packaging Data");

      const headersNoActions = HEADERS.filter((h) => h.key !== "actions");
      const colCount = headersNoActions.length;

      // ✅ Fix TS red squiggles for border style
      const thin = "thin" as ExcelJS.BorderStyle;

      const THIN_BORDER: Partial<ExcelJS.Borders> = {
        top: { style: thin },
        left: { style: thin },
        bottom: { style: thin },
        right: { style: thin },
      };

      // ✅ Out-of-range style (match UI red text + light red bg)
      const OUT_OF_RANGE_FONT: Partial<ExcelJS.Font> = {
        color: { argb: "FFB91C1C" },
        bold: true,
      };

      const OUT_OF_RANGE_FILL: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFEBEE" },
      };

      // 1) Title row
      const title = `Packaging Summary (${startDate} to ${endDate})`;
      ws.addRow([title]);
      ws.mergeCells(1, 1, 1, colCount);

      const titleCell = ws.getCell(1, 1);
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 24;

      // Spacer row
      ws.addRow([]);

      // 2) Header row
      const headerRow = ws.addRow(headersNoActions.map((h) => h.label));
      headerRow.font = { bold: true };
      headerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      // ✅ ensure header border applies to all header cells
      for (let c = 1; c <= colCount; c++) {
        const cell = headerRow.getCell(c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5E7EB" },
        };
        cell.border = THIN_BORDER;
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.font = { bold: true };
      }

      // 3) Data rows
      searchResults.forEach((row) => {
        const values = headersNoActions.map((h) => {
          const key = h.key as string;
          const value = row[key];

          // Date
          if (key === "testDate" && value) return toDisplayDate(value);

          // Numeric
          if (NUMERIC_KEYS.has(key)) {
            if (value == null || value === "") return null;
            const n = Number(value);
            return Number.isFinite(n) ? n : null;
          }

          return value ?? "";
        });

        const excelRow = ws.addRow(values);

        // ✅ IMPORTANT: style ALL cells (even empty ones), so borders never miss
        for (let c = 1; c <= colCount; c++) {
          const cell = excelRow.getCell(c);
          const key = headersNoActions[c - 1]?.key as string;

          // Borders
          cell.border = THIN_BORDER;

          // Center
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Formats
          if (key === "testDate") {
            // treat as TEXT to avoid timezone shifting
            cell.numFmt = "@";
          }

          if (NUMERIC_KEYS.has(key)) {
            cell.numFmt = "0.00";
          }

          // ✅ Apply raw data analysis highlight
          if (NUMERIC_KEYS.has(key)) {
            const enabled = !!(rangeEnabled as any)[key];
            const min = (ranges as any)[`${key}Min`];
            const max = (ranges as any)[`${key}Max`];

            if (isOutOfRange(row[key], enabled, min, max)) {
              cell.font = { ...(cell.font ?? {}), ...OUT_OF_RANGE_FONT };
              cell.fill = OUT_OF_RANGE_FILL;
            }
          }
        }
      });

      // 4) Auto-fit columns
      ws.columns.forEach((col: any) => {
        let maxLength = 8;

        col.eachCell({ includeEmpty: true }, (cell: any) => {
          const v = cell.value;
          const text =
            v instanceof Date ? "yyyy-mm-dd" : v == null ? "" : String(v);
          maxLength = Math.max(maxLength, text.length + 1);
        });

        col.width = Math.min(Math.max(maxLength, 8), 18);
      });

      // Export
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `packaging_${startDate}_to_${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export error:", err);
      setErrorMessage(err?.message || "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleEdit = async (row: any) => {
    if (!row?.id) return;
    setIsMutating(true);
    setErrorMessage("");

    try {
      const fetched = await fetchPackagingById({ id: String(row.id) });
      if (fetched.error || !fetched.data) {
        setErrorMessage(fetched.error || "Failed to load data.");
        return;
      }

      const current = fetched.data;
      const dateForInput = toInputDate(current.testDate);

      setEditingRow(current);
      setEditForm({
        testDate: dateForInput,
        productID: current.productID ?? "",
        productType: current.productType ?? "",
        construction: current.construction ?? "",
        denier: current.denier != null ? String(current.denier) : "",
        color: current.color ?? "",
        additionalFeatures: current.additionalFeatures ?? "",
        grammage: current.grammage != null ? String(current.grammage) : "",
        tensileMD: current.tensileMD != null ? String(current.tensileMD) : "",
        tensileCD: current.tensileCD != null ? String(current.tensileCD) : "",
        elongationMD: current.elongationMD != null ? String(current.elongationMD) : "",
        elongationCD: current.elongationCD != null ? String(current.elongationCD) : "",
        tubingTensile: current.tubingTensile != null ? String(current.tubingTensile) : "",
        tubingElongation: current.tubingElongation != null ? String(current.tubingElongation) : "",
        tubingPeelPeak: current.tubingPeelPeak != null ? String(current.tubingPeelPeak) : "",
        tubingPeelAvg: current.tubingPeelAvg != null ? String(current.tubingPeelAvg) : "",
        notes: current.notes ?? "",
      });
    } catch (err: any) {
      console.error("Edit load error:", err);
      setErrorMessage(err?.message || "Edit failed.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditChange = (field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditCancel = () => setEditingRow(null);

  const handleEditSave = async () => {
    if (!editingRow?.id) return;
    setIsMutating(true);
    setErrorMessage("");

    try {
      const updatedRes = (await updatePackaging({
        id: String(editingRow.id),
        data: editForm,
      })) as any;

      if (updatedRes.error) {
        setErrorMessage(updatedRes.error);
        return;
      }

      const updatedRow = updatedRes.data;
      setSearchResults((prev) =>
        prev.map((r) => (r.id === updatedRow.id ? { ...r, ...updatedRow } : r))
      );
      setEditingRow(null);
    } catch (err: any) {
      console.error("Edit save error:", err);
      setErrorMessage(err?.message || "Edit failed.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async (row: any) => {
    if (!row?.id) return;
    if (!window.confirm("Are you sure you want to delete this row?")) return;

    setIsMutating(true);
    setErrorMessage("");

    try {
      const res = await deletePackaging({ id: String(row.id) });
      if (res.error) {
        setErrorMessage(res.error);
        return;
      }
      setSearchResults((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err: any) {
      console.error("Delete error:", err);
      setErrorMessage(err?.message || "Delete failed.");
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-extrabold text-gray-900">Packaging Search</h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow border space-y-4">
        <h2 className="text-lg font-semibold text-indigo-600">Filter Options</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date</label>
            <div className="relative">
              <input
                type="date"
                className={baseInputStyle}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">End Date</label>
            <div className="relative">
              <input
                type="date"
                className={baseInputStyle}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Product Type</label>
            <input
              ref={productRef}
              type="text"
              className={baseInputStyle}
              placeholder="Enter product type"
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  constructionRef.current?.focus();
                }
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Construction</label>
            <input
              ref={constructionRef}
              type="text"
              className={baseInputStyle}
              placeholder="Enter construction"
              value={construction}
              onChange={(e) => setConstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  denierRef.current?.focus();
                }
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Denier</label>
            <input
              ref={denierRef}
              type="number"
              className={baseInputStyle}
              placeholder="Enter denier"
              value={denier}
              onChange={(e) => setDenier(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  colorRef.current?.focus();
                }
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Color (Optional)</label>
            <input
              ref={colorRef}
              type="text"
              className={baseInputStyle}
              placeholder="Enter color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  searchBtnRef.current?.focus();
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border space-y-4">
          <h3 className="text-sm font-semibold text-indigo-700">Ranges</h3>

          {/* Grammage */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={rangeEnabled.grammage}
                onChange={() => toggleRange("grammage")}
              />
              Grammage
            </label>

            {rangeEnabled.grammage && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={baseInputStyle}
                  value={ranges.grammageMin}
                  onChange={(e) => updateRange("grammageMin", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={baseInputStyle}
                  value={ranges.grammageMax}
                  onChange={(e) => updateRange("grammageMax", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Tensile MD */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={rangeEnabled.tensileMD}
                onChange={() => toggleRange("tensileMD")}
              />
              Tensile MD
            </label>

            {rangeEnabled.tensileMD && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={baseInputStyle}
                  value={ranges.tensileMDMin}
                  onChange={(e) => updateRange("tensileMDMin", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={baseInputStyle}
                  value={ranges.tensileMDMax}
                  onChange={(e) => updateRange("tensileMDMax", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Tensile CD */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={rangeEnabled.tensileCD}
                onChange={() => toggleRange("tensileCD")}
              />
              Tensile CD
            </label>

            {rangeEnabled.tensileCD && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={baseInputStyle}
                  value={ranges.tensileCDMin}
                  onChange={(e) => updateRange("tensileCDMin", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={baseInputStyle}
                  value={ranges.tensileCDMax}
                  onChange={(e) => updateRange("tensileCDMax", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Elongation MD */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={rangeEnabled.elongationMD}
                onChange={() => toggleRange("elongationMD")}
              />
              Elongation MD
            </label>

            {rangeEnabled.elongationMD && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={baseInputStyle}
                  value={ranges.elongationMDMin}
                  onChange={(e) => updateRange("elongationMDMin", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={baseInputStyle}
                  value={ranges.elongationMDMax}
                  onChange={(e) => updateRange("elongationMDMax", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Elongation CD */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={rangeEnabled.elongationCD}
                onChange={() => toggleRange("elongationCD")}
              />
              Elongation CD
            </label>

            {rangeEnabled.elongationCD && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={baseInputStyle}
                  value={ranges.elongationCDMin}
                  onChange={(e) => updateRange("elongationCDMin", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={baseInputStyle}
                  value={ranges.elongationCDMax}
                  onChange={(e) => updateRange("elongationCDMax", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Tubing Tensile */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={rangeEnabled.tubingTensile}
                onChange={() => toggleRange("tubingTensile")}
              />
              Tubing Tensile
            </label>

            {rangeEnabled.tubingTensile && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={baseInputStyle}
                  value={ranges.tubingTensileMin}
                  onChange={(e) => updateRange("tubingTensileMin", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={baseInputStyle}
                  value={ranges.tubingTensileMax}
                  onChange={(e) => updateRange("tubingTensileMax", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Tubing Elongation */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={rangeEnabled.tubingElongation}
                onChange={() => toggleRange("tubingElongation")}
              />
              Tubing Elongation
            </label>

            {rangeEnabled.tubingElongation && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={baseInputStyle}
                  value={ranges.tubingElongationMin}
                  onChange={(e) => updateRange("tubingElongationMin", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={baseInputStyle}
                  value={ranges.tubingElongationMax}
                  onChange={(e) => updateRange("tubingElongationMax", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Tubing Peel Peak */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={rangeEnabled.tubingPeelPeak}
                onChange={() => toggleRange("tubingPeelPeak")}
              />
              Tubing Peel Peak
            </label>

            {rangeEnabled.tubingPeelPeak && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={baseInputStyle}
                  value={ranges.tubingPeelPeakMin}
                  onChange={(e) => updateRange("tubingPeelPeakMin", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={baseInputStyle}
                  value={ranges.tubingPeelPeakMax}
                  onChange={(e) => updateRange("tubingPeelPeakMax", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Tubing Peel Average */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={rangeEnabled.tubingPeelAvg}
                onChange={() => toggleRange("tubingPeelAvg")}
              />
              Tubing Peel Average
            </label>

            {rangeEnabled.tubingPeelAvg && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={baseInputStyle}
                  value={ranges.tubingPeelAvgMin}
                  onChange={(e) => updateRange("tubingPeelAvgMin", e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={baseInputStyle}
                  value={ranges.tubingPeelAvgMax}
                  onChange={(e) => updateRange("tubingPeelAvgMax", e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            ref={searchBtnRef}
            onClick={handleSearch}
            disabled={disableActions}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
          >
            {isSearching ? "Searching..." : "Search"}
          </button>

          <button
            onClick={handleExport}
            disabled={disableActions || searchResults.length === 0}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isExporting ? "Exporting..." : "Export Excel"}
          </button>
        </div>

        {errorMessage && (
          <div className="p-2 bg-red-100 text-red-700 rounded">{errorMessage}</div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Search Results</h2>

        {isSearching ? (
          <div className="text-center text-indigo-600 py-4">Loading results...</div>
        ) : searchResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {HEADERS.map((h) => (
                    <th
                      key={h.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {HEADERS.map((h) =>
                      h.key !== "actions" ? (
                        <td
                          key={h.key}
                          className={`px-6 py-4 text-sm ${
                            (h.key === "grammage" &&
                              isOutOfRange(
                                row.grammage,
                                rangeEnabled.grammage,
                                ranges.grammageMin,
                                ranges.grammageMax
                              )) ||
                            (h.key === "tensileMD" &&
                              isOutOfRange(
                                row.tensileMD,
                                rangeEnabled.tensileMD,
                                ranges.tensileMDMin,
                                ranges.tensileMDMax
                              )) ||
                            (h.key === "tensileCD" &&
                              isOutOfRange(
                                row.tensileCD,
                                rangeEnabled.tensileCD,
                                ranges.tensileCDMin,
                                ranges.tensileCDMax
                              )) ||
                            (h.key === "elongationMD" &&
                              isOutOfRange(
                                row.elongationMD,
                                rangeEnabled.elongationMD,
                                ranges.elongationMDMin,
                                ranges.elongationMDMax
                              )) ||
                            (h.key === "elongationCD" &&
                              isOutOfRange(
                                row.elongationCD,
                                rangeEnabled.elongationCD,
                                ranges.elongationCDMin,
                                ranges.elongationCDMax
                              )) ||
                            (h.key === "tubingTensile" &&
                              isOutOfRange(
                                row.tubingTensile,
                                rangeEnabled.tubingTensile,
                                ranges.tubingTensileMin,
                                ranges.tubingTensileMax
                              )) ||
                            (h.key === "tubingElongation" &&
                              isOutOfRange(
                                row.tubingElongation,
                                rangeEnabled.tubingElongation,
                                ranges.tubingElongationMin,
                                ranges.tubingElongationMax
                              )) ||
                            (h.key === "tubingPeelPeak" &&
                              isOutOfRange(
                                row.tubingPeelPeak,
                                rangeEnabled.tubingPeelPeak,
                                ranges.tubingPeelPeakMin,
                                ranges.tubingPeelPeakMax
                              )) ||
                            (h.key === "tubingPeelAvg" &&
                              isOutOfRange(
                                row.tubingPeelAvg,
                                rangeEnabled.tubingPeelAvg,
                                ranges.tubingPeelAvgMin,
                                ranges.tubingPeelAvgMax
                              ))
                              ? "text-red-600 font-semibold bg-red-50"
                              : "text-gray-700"
                          }`}
                        >
                          {h.key === "testDate" ? toDisplayDate(row[h.key]) : row[h.key] ?? ""}
                        </td>
                      ) : (
                        <td key="actions" className="px-6 py-4 text-sm text-gray-700">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(row)}
                              disabled={disableActions}
                              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              disabled={disableActions}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
            No results found.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-3xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Packaging (ID: {editingRow.id})</h3>
              <button
                onClick={handleEditCancel}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Date">
                <input
                  type="date"
                  className={baseInputStyle}
                  value={editForm.testDate}
                  onChange={(e) => handleEditChange("testDate", e.target.value)}
                />
              </Field>

              <Field label="Product ID">
                <input
                  type="text"
                  className={baseInputStyle}
                  value={editForm.productID}
                  onChange={(e) => handleEditChange("productID", e.target.value)}
                />
              </Field>

              <Field label="Product Type">
                <input
                  type="text"
                  className={baseInputStyle}
                  value={editForm.productType}
                  onChange={(e) => handleEditChange("productType", e.target.value)}
                />
              </Field>

              <Field label="Construction">
                <input
                  type="text"
                  className={baseInputStyle}
                  value={editForm.construction}
                  onChange={(e) => handleEditChange("construction", e.target.value)}
                />
              </Field>

              <Field label="Denier">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.denier}
                  onChange={(e) => handleEditChange("denier", e.target.value)}
                />
              </Field>

              <Field label="Color">
                <input
                  type="text"
                  className={baseInputStyle}
                  value={editForm.color}
                  onChange={(e) => handleEditChange("color", e.target.value)}
                />
              </Field>

              <Field label="Additional Features" full>
                <input
                  type="text"
                  className={baseInputStyle}
                  value={editForm.additionalFeatures}
                  onChange={(e) => handleEditChange("additionalFeatures", e.target.value)}
                />
              </Field>

              <Field label="Grammage">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.grammage}
                  onChange={(e) => handleEditChange("grammage", e.target.value)}
                />
              </Field>

              <Field label="Tensile MD">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.tensileMD}
                  onChange={(e) => handleEditChange("tensileMD", e.target.value)}
                />
              </Field>

              <Field label="Tensile CD">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.tensileCD}
                  onChange={(e) => handleEditChange("tensileCD", e.target.value)}
                />
              </Field>

              <Field label="Elongation MD">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.elongationMD}
                  onChange={(e) => handleEditChange("elongationMD", e.target.value)}
                />
              </Field>

              <Field label="Elongation CD">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.elongationCD}
                  onChange={(e) => handleEditChange("elongationCD", e.target.value)}
                />
              </Field>

              <Field label="Tubing Tensile">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.tubingTensile}
                  onChange={(e) => handleEditChange("tubingTensile", e.target.value)}
                />
              </Field>

              <Field label="Tubing Elongation">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.tubingElongation}
                  onChange={(e) => handleEditChange("tubingElongation", e.target.value)}
                />
              </Field>

              <Field label="Tubing Peel Peak">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.tubingPeelPeak}
                  onChange={(e) => handleEditChange("tubingPeelPeak", e.target.value)}
                />
              </Field>

              <Field label="Tubing Peel Avg">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.tubingPeelAvg}
                  onChange={(e) => handleEditChange("tubingPeelAvg", e.target.value)}
                />
              </Field>

              <Field label="Notes" full>
                <textarea
                  className={baseInputStyle}
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => handleEditChange("notes", e.target.value)}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleEditCancel}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={isMutating}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isMutating ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isOutOfRange(
  value: any,
  enabled: boolean,
  min?: string,
  max?: string
) {
  if (!enabled) return false;
  if (value == null || value === "") return false;

  const num = Number(value);
  if (!Number.isFinite(num)) return false;

  if (min !== "" && num < Number(min)) return true;
  if (max !== "" && num > Number(max)) return true;

  return false;
}

/** Small UI wrapper so your form stays neat */
function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      {children}
    </div>
  );
}