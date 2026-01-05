"use client";

import React, { useState, useRef } from "react";
import ExcelJS from "exceljs";
import { FaCalendarAlt } from "react-icons/fa";

import { fetchYarnById, updateYarn, deleteYarn } from "@/app/actions/yarnRecords";

const baseInputStyle =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500";

// --- Table headers ---
const HEADERS = [
  { key: "productID", label: "Product ID" },
  { key: "date", label: "Date" },
  { key: "productType", label: "Product Type" },
  { key: "machine", label: "Machine" },
  { key: "denier", label: "Denier" },
  { key: "material", label: "Material" },
  { key: "side", label: "Side" },
  { key: "time", label: "Time" },
  { key: "tensile", label: "Tensile" },
  { key: "elongation", label: "Elongation" },
  { key: "widthMm", label: "Width" },
  { key: "tenacity", label: "Tenacity" },
  { key: "notes", label: "Notes" },
  { key: "actions", label: "Actions" },
] as const;

const NUMERIC_KEYS = new Set<string>([
  "denier",
  "widthMm",
  "tensile",
  "elongation",
  "tenacity",
]);

const getCurrentDate = () => new Date().toISOString().split("T")[0];

/**
 * Convert any date-ish value (Date | ISO string | "YYYY-MM-DD") to "YYYY-MM-DD".
 * Returns "" if invalid/empty.
 */
function toISODateOnly(v: any): string {
  if (!v) return "";
  // If already YYYY-MM-DD
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0]; // always YYYY-MM-DD
}

// Small helper for UI rendering (YYYY/MM/DD)
const toDisplayDate = (v: any) => {
  const iso = toISODateOnly(v);
  return iso ? iso.replace(/-/g, "/") : "";
};

export default function SearchPage() {
  const [startDate, setStartDate] = useState(getCurrentDate());
  const [endDate, setEndDate] = useState(getCurrentDate());

  const productRef = useRef<HTMLInputElement>(null);
  const machineRef = useRef<HTMLInputElement>(null);
  const denierRef = useRef<HTMLInputElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  const [productType, setProductType] = useState("");
  const [machine, setMachine] = useState("");
  const [denier, setDenier] = useState("");

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    productID: "",
    productType: "",
    machine: "",
    denier: "",
    material: "",
    side: "",
    time: "",
    tensile: "",
    elongation: "",
    widthMm: "",
    tenacity: "",
    notes: "",
  });

  const disableActions = isSearching || isExporting || isMutating;

  const handleSearch = async () => {
    if (!productType) return setErrorMessage("Please enter a product type to search for.");
    if (!machine) return setErrorMessage("Please enter the machine.");

    setIsSearching(true);
    setErrorMessage("");
    setSearchResults([]);

    try {
      const res = await fetch("/api/searchyarn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          productType,
          machine: machine.trim().toUpperCase(),
          denier: denier === "" ? undefined : Number(denier),
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

  // --- Export to Excel (date forced to "YYYY-MM-DD" string) ---
  const handleExport = async () => {
    if (searchResults.length === 0) return;

    setIsExporting(true);
    setErrorMessage("");

    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Yarn Data");

      const headersNoActions = HEADERS.filter((h) => h.key !== "actions");
      const colCount = headersNoActions.length;

      // 1) Title row
      const title = `Yarn(QA) Summary (${startDate} to ${endDate})`;
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

      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5E7EB" }, // light gray
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // 3) Data rows
      searchResults.forEach((row) => {
        const values = headersNoActions.map((h) => {
          const key = h.key as string;
          const value = row[key];

          // ✅ Force exported date to be plain "YYYY-MM-DD" string
          if (key === "date") return toISODateOnly(value);

          // Numeric: convert to number (or null)
          if (NUMERIC_KEYS.has(key)) {
            if (value == null || value === "") return null;
            const n = Number(value);
            return Number.isFinite(n) ? n : null;
          }

          return value ?? "";
        });

        const excelRow = ws.addRow(values);

        excelRow.eachCell((cell, colNumber) => {
          const key = headersNoActions[colNumber - 1]?.key as string;

          // Borders
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          // Formats
          // ✅ Date is string now, so do NOT apply date numFmt
          if (NUMERIC_KEYS.has(key)) {
            cell.numFmt = "0.00";
          }

          // Center everything
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
        });
      });

      // 4) Auto-fit columns
      ws.columns.forEach((col: any) => {
        let maxLength = 8;

        col.eachCell({ includeEmpty: true }, (cell: any) => {
          const v = cell.value;
          const text = v == null ? "" : String(v);
          maxLength = Math.max(maxLength, text.length + 1);
        });

        col.width = Math.min(Math.max(maxLength, 8), 18);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yarn(QA)_${startDate}_to_${endDate}.xlsx`;
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
      const fetched = await fetchYarnById({ id: String(row.id) });
      if (fetched.error || !fetched.data) {
        setErrorMessage(fetched.error || "Failed to load data.");
        return;
      }

      const current = fetched.data;

      setEditingRow(current);
      setEditForm({
        date: toISODateOnly(current.date), // ✅ always YYYY-MM-DD for input
        productID: current.productID ?? "",
        productType: current.productType ?? "",
        machine: current.machine ?? "",
        denier: current.denier != null ? String(current.denier) : "",
        material: current.material ?? "",
        side: current.side != null ? String(current.side) : "",
        time: current.time != null ? String(current.time) : "",
        tensile: current.tensile != null ? String(current.tensile) : "",
        elongation: current.elongation != null ? String(current.elongation) : "",
        widthMm: current.widthMm != null ? String(current.widthMm) : "",
        tenacity: current.tenacity != null ? String(current.tenacity) : "",
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
      const updatedRes = (await updateYarn({
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
      const res = await deleteYarn({ id: String(row.id) });
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
      <h1 className="text-3xl font-extrabold text-gray-900">Yarn Search</h1>

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
                  machineRef.current?.focus();
                }
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Machine</label>
            <input
              ref={machineRef}
              type="text"
              className={baseInputStyle}
              placeholder="Enter machine"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  denierRef.current?.focus();
                }
              }}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Denier (optional)</label>
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
                  searchBtnRef.current?.focus();
                }
              }}
            />
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
                        <td key={h.key} className="px-6 py-4 text-sm text-gray-700">
                          {h.key === "date" ? toDisplayDate(row[h.key]) : row[h.key] ?? ""}
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
              <h3 className="text-lg font-semibold">Edit Yarn (ID: {editingRow.id})</h3>
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
                  value={editForm.date}
                  onChange={(e) => handleEditChange("date", e.target.value)}
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

              <Field label="Machine">
                <input
                  type="text"
                  className={baseInputStyle}
                  value={editForm.machine}
                  onChange={(e) => handleEditChange("machine", e.target.value)}
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

              <Field label="Material">
                <input
                  type="text"
                  className={baseInputStyle}
                  value={editForm.material}
                  onChange={(e) => handleEditChange("material", e.target.value)}
                />
              </Field>

              <Field label="Side">
                <input
                  type="text"
                  className={baseInputStyle}
                  value={editForm.side}
                  onChange={(e) => handleEditChange("side", e.target.value)}
                />
              </Field>

              <Field label="Time">
                <input
                  type="text"
                  className={baseInputStyle}
                  value={editForm.time}
                  onChange={(e) => handleEditChange("time", e.target.value)}
                />
              </Field>

              <Field label="Tensile">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.tensile}
                  onChange={(e) => handleEditChange("tensile", e.target.value)}
                />
              </Field>

              <Field label="Elongation">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.elongation}
                  onChange={(e) => handleEditChange("elongation", e.target.value)}
                />
              </Field>

              <Field label="Width">
                <input
                  type="number"
                  className={baseInputStyle}
                  value={editForm.widthMm}
                  onChange={(e) => handleEditChange("widthMm", e.target.value)}
                />
              </Field>

              <Field label="Tenacity">
                <input
                  type="text"
                  className={`${baseInputStyle} bg-gray-100 cursor-not-allowed`}
                  value={editForm.tenacity}
                  disabled
                  readOnly
                  onChange={(e) => handleEditChange("tenacity", e.target.value)}
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
