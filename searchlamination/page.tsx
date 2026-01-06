"use client";

import React, { useMemo, useState, useRef } from "react";
import ExcelJS from "exceljs";
import { FaCalendarAlt } from "react-icons/fa";
import { laminationFields } from "@/lib/inspectionFields";

import {
  fetchLaminationById,
  updateLamination,
  deleteLamination,
} from "@/app/actions/laminationRecords";

const baseInputStyle =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";

const baseDropdownStyle =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 appearance-none";

const getCurrentDate = () => new Date().toISOString().split("T")[0];

// Update result may include movedFrom when category changed
type LaminationUpdateResult =
  | { error: string }
  | { data: any; movedFrom?: { id: number; category: string } };

const READONLY_EDIT_KEYS = new Set([
  "tearPropagationMD",
  "tearPropagationCD",
  "bs476I",
]);

export default function SearchPage() {
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());

  const productRef = useRef<HTMLInputElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  const [category, setCategory] = useState("");
  const [range, setRange] = useState("");
  const [product, setProduct] = useState("");

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMutating, setIsMutating] = useState(false);

  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const categoryRanges: Record<string, string[]> = {
    "Bubble Foam Bubble": ["BFB"],
    "Bubble Foil": ["Bubble Foil"],
    "Film Foil & Adhesive+F.Glass": ["AL+F.Glass", "Film Foil"],
    "Leno": ["Leno1"],
    "MS 2095": ["MS2095"],
    "Non Woven": ["Non Woven"],
    "Paper Foil": ["Paper Foil"],
    "Radiant Barrier": ["FR1", "FR2", "NFR1", "NFR2"],
    "Ultra Foil": ["Ultra Foil"],
    "Wrapper": ["Wrapper"],
  };

  // Dynamic headers based on actual data in results
  const dynamicHeaders = useMemo(() => {
    return laminationFields
      .filter((field) => {
        return searchResults.some((row) => {
          const val = row[field.key];
          if (val === null || val === undefined) return false;
          if (typeof val === "string" && val.trim() === "") return false;
          return true;
        });
      })
      .map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
      }));
  }, [searchResults]);

  const disableActions = isSearching || isExporting || isMutating;

  const [rangeEnabled, setRangeEnabled] = useState<Record<string, boolean>>({});
  const [ranges, setRanges] = useState<Record<string, string>>({});

  const toggleRange = (key: string) => {
  setRangeEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
};

const updateRange = (key: string, value: string) => {
  setRanges((prev) => ({ ...prev, [key]: value }));
};

const isOutOfRange = (
  value: any,
  enabled?: boolean,
  min?: string,
  max?: string
) => {
  if (!enabled) return false;
  if (value == null || value === "") return false;

  const num = Number(value);
  if (!Number.isFinite(num)) return false;

  if (min !== "" && min != null && num < Number(min)) return true;
  if (max !== "" && max != null && num > Number(max)) return true;

  return false;
};

  // --- Search ---
  const handleSearch = async () => {
    setIsSearching(true);
    setErrorMessage("");
    setSearchResults([]);

    try {
      const normalizedProduct = product.replace(/\s+/g, "").trim();

      const res = await fetch("/api/searchlamination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          category,
          range,
          product: normalizedProduct,
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

  // --- Export to Excel (Lamination, ALL centered) ---
  const handleExport = async () => {
    if (searchResults.length === 0) return;

    setIsExporting(true);
    setErrorMessage("");

    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Lamination Data");

      const colCount = dynamicHeaders.length;
      const titleText = `Lamination Results (${startDate} to ${endDate})`;

      /* -------------------- 1) Title row -------------------- */
      ws.addRow([titleText]);
      ws.mergeCells(1, 1, 1, colCount);

      const titleCell = ws.getCell(1, 1);
      titleCell.font = { size: 14, bold: true };
      titleCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5F0FF" },
      };
      ws.getRow(1).height = 24;

      /* -------------------- Spacer row -------------------- */
      ws.addRow([]);

      /* -------------------- 2) Header row -------------------- */
      const headerRow = ws.addRow(dynamicHeaders.map((h) => h.label));

      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFBDD7EE" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      /* -------------------- 3) Data rows -------------------- */
      searchResults.forEach((row) => {
        const rowValues = dynamicHeaders.map((h) => {
          const value = row[h.key];

          // Date handling
          if (h.type === "date" && value) {
            return new Date(value);
          }

          // Numeric handling
          if (h.type === "number") {
            if (value == null || value === "") return null;
            const n = Number(value);
            return Number.isFinite(n) ? n : null;
          }

          return value ?? "";
        });

        const dataRow = ws.addRow(rowValues);

        dataRow.eachCell((cell, colNumber) => {
          const h = dynamicHeaders[colNumber - 1];

          // Formats
          if (h?.type === "date" && cell.value instanceof Date) {
            cell.numFmt = "yyyy-mm-dd";
          }
          if (h?.type === "number") {
            cell.numFmt = "0.00";
          }

          // Center EVERYTHING
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Borders
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      /* -------------------- 4) Auto-fit columns -------------------- */
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

      /* -------------------- Export file -------------------- */
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lamination_${getCurrentDate()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export error:", err);
      setErrorMessage(err?.message || "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- Edit load ---
  const handleEdit = async (row: any) => {
    if (!row?.id) {
      setErrorMessage("Cannot edit: row id is missing.");
      return;
    }

    setIsMutating(true);
    setErrorMessage("");

    try {
      const fetched = await fetchLaminationById({
        id: String(row.id),
        category: row.category,
      });

      if ((fetched as any)?.error || !(fetched as any)?.data) {
        setErrorMessage((fetched as any)?.error || "Failed to load data.");
        return;
      }

      const current = (fetched as any).data;

      const form: Record<string, string> = {};
      form["category"] = String(current.category ?? row.category ?? "");
      form["range"] = String(current.range ?? row.range ?? "");

      dynamicHeaders.forEach((h) => {
        const key = h.key;
        const value = current[key];

        if (h.type === "date" && value)
          form[key] = new Date(value).toISOString().split("T")[0];
        else if (value == null) form[key] = "";
        else form[key] = String(value);
      });

      setEditingRow(current);
      setEditForm(form);
    } catch (err: any) {
      console.error("Edit load error:", err);
      setErrorMessage(err?.message || "Edit failed.");
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditChange = (key: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEditCancel = () => setEditingRow(null);

  // --- Edit save (Option A: re-search after save) ---
  const handleEditSave = async () => {
    if (!editingRow?.id) return;

    setIsMutating(true);
    setErrorMessage("");

    try {
      const payloadData: Record<string, any> = {};

      // Range
      payloadData.range = editForm["range"]
        ? String(editForm["range"]).trim()
        : null;

      dynamicHeaders.forEach((h) => {
        const key = h.key;
        if (READONLY_EDIT_KEYS.has(key)) return;

        const raw = editForm[key] ?? "";
        payloadData[key] = raw === "" ? null : raw; // backend coerces number/date
      });

      const newCategory = (editForm["category"] ?? "").trim();
      if (!newCategory) {
        setErrorMessage("Category is required.");
        return;
      }

      const updatedRes = (await updateLamination({
        id: String(editingRow.id),
        category: editingRow.category, // OLD category/table
        newCategory, // NEW category/table (may be same)
        data: payloadData,
      })) as LaminationUpdateResult;

      if ("error" in updatedRes) {
        setErrorMessage(updatedRes.error);
        return;
      }

      // Close modal first
      setEditingRow(null);

      // refresh results from server so moved rows disappear automatically
      await handleSearch();
    } catch (err: any) {
      console.error("Edit save error:", err);
      setErrorMessage(err?.message || "Edit failed.");
    } finally {
      setIsMutating(false);
    }
  };

  // --- Delete ---
  const handleDelete = async (row: any) => {
    if (!row?.id) {
      setErrorMessage("Cannot delete: row id is missing.");
      return;
    }

    const ok = window.confirm("Are you sure you want to delete this row?");
    if (!ok) return;

    setIsMutating(true);
    setErrorMessage("");

    try {
      const res = await deleteLamination({
        id: String(row.id),
        category: row.category,
      });

      if (res && "error" in (res as any) && (res as any).error) {
        setErrorMessage((res as any).error);
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
      <h1 className="text-3xl font-extrabold text-gray-900">Lamination Search</h1>

      {/* Search Form */}
      <div className="bg-white p-6 rounded-xl shadow border space-y-4">
        <h2 className="text-lg font-semibold text-indigo-600">Filter Options</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Start Date */}
          <div className="flex flex-col relative">
            <label className="text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="relative">
              <input
                type="date"
                className={`${baseInputStyle} pr-10`}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* End Date */}
          <div className="flex flex-col relative">
            <label className="text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="relative">
              <input
                type="date"
                className={`${baseInputStyle} pr-10`}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <FaCalendarAlt className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className={baseDropdownStyle}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setRange("");
              }}
            >
              <option value="">Select Category</option>
              {Object.keys(categoryRanges).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Range */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className={baseDropdownStyle}
              value={range}
              onChange={(e) => setRange(e.target.value)}
              disabled={!category}
            >
              <option value="">Select Type</option>
              {(categoryRanges[category] ?? []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div className="flex flex-col md:col-span-4">
            <label className="text-sm font-medium text-gray-700 mb-1">Product Model</label>
            <input
            ref={productRef}
              type="text"
              className={baseInputStyle}
              placeholder="Enter product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
                              onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent newline
      searchBtnRef.current?.focus();
    }
  }}
            />
          </div>
        </div>

  {/* Highlight Ranges */}
<div className="bg-indigo-50 p-4 rounded-lg border space-y-4">
  <h3 className="text-sm font-semibold text-indigo-700">
    Highlight Out-of-Range Values (Optional)
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {dynamicHeaders
      .filter((h) => h.type === "number")
      .map((h) => (
        <div key={h.key}>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={!!rangeEnabled[h.key]}
              onChange={() => toggleRange(h.key)}
            />
            {h.label}
          </label>

          {rangeEnabled[h.key] && (
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                placeholder="Min"
                className={baseInputStyle}
                value={ranges[`${h.key}Min`] ?? ""}
                onChange={(e) =>
                  updateRange(`${h.key}Min`, e.target.value)
                }
              />
              <input
                type="number"
                placeholder="Max"
                className={baseInputStyle}
                value={ranges[`${h.key}Max`] ?? ""}
                onChange={(e) =>
                  updateRange(`${h.key}Max`, e.target.value)
                }
              />
            </div>
          )}
        </div>
      ))}
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

      {/* Results Table */}
      <div className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Search Results</h2>

        {isSearching ? (
          <div className="text-center text-indigo-600 py-4">Loading results...</div>
        ) : searchResults.length > 0 && dynamicHeaders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {dynamicHeaders.map((h) => (
                    <th
                      key={h.key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {h.label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.map((row, idx) => (
                  <tr key={row.id || idx}>
                    {dynamicHeaders.map((h) => (
<td
  key={h.key}
  className={`px-6 py-4 text-sm ${
    h.type === "number" &&
    isOutOfRange(
      row[h.key],
      rangeEnabled[h.key],
      ranges[`${h.key}Min`],
      ranges[`${h.key}Max`]
    )
      ? "text-red-600 font-semibold bg-red-50"
      : "text-gray-700"
  }`}
>
  {h.key === "date" && row[h.key]
    ? new Date(row[h.key])
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "/")
    : row[h.key] ?? ""}
</td>
                    ))}
                    <td className="px-6 py-4 text-sm text-gray-700">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl space-y-4">
            <h3 className="text-lg font-semibold mb-2">
              Edit Lamination Record (ID: {editingRow.id})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Category dropdown */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className={baseDropdownStyle}
                  value={editForm["category"] ?? ""}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    handleEditChange("category", newCat);
                    handleEditChange("range", "");
                  }}
                >
                  <option value="">Select Category</option>
                  {Object.keys(categoryRanges).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <p className="text-xs text-gray-400 mt-1">
                  Changing category will move the record to a different table (new ID will be generated).
                </p>
              </div>

              {/* Range dropdown */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className={baseDropdownStyle}
                  value={editForm["range"] ?? ""}
                  onChange={(e) => handleEditChange("range", e.target.value)}
                  disabled={!editForm["category"]}
                >
                  <option value="">Select Type</option>
                  {(categoryRanges[editForm["category"] ?? ""] ?? []).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic fields */}
              {dynamicHeaders.map((h) => {
                const isReadOnly = READONLY_EDIT_KEYS.has(h.key);

                return (
                  <div key={h.key} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">
                      {h.label}
                      {isReadOnly && <span className="ml-2 text-xs text-gray-400">(auto)</span>}
                    </label>

                    {h.type === "date" ? (
                      <input
                        type="date"
                        className={`${baseInputStyle} ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
                        value={editForm[h.key] ?? ""}
                        disabled={isReadOnly}
                        onChange={(e) => handleEditChange(h.key, e.target.value)}
                      />
                    ) : h.type === "number" ? (
                      <input
                        type="number"
                        className={`${baseInputStyle} ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
                        value={editForm[h.key] ?? ""}
                        disabled={isReadOnly}
                        onChange={(e) => handleEditChange(h.key, e.target.value)}
                      />
                    ) : (
                      <input
                        type="text"
                        className={`${baseInputStyle} ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
                        value={editForm[h.key] ?? ""}
                        disabled={isReadOnly}
                        onChange={(e) => handleEditChange(h.key, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
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

            <p className="text-xs text-gray-400">
              Note: Tear Propagation and BS476I are auto-calculated fields and cannot be edited.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
