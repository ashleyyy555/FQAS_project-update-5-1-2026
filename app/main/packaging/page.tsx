"use client";

import React, { useState, useRef } from "react";
import { FaCalendarAlt } from "react-icons/fa";

export default function PackingUI() {
  const [showTubingTensile, setShowTubingTensile] = useState(false);
  const [showTubingElongation, setShowTubingElongation] = useState(false);
  const [showTubingPeelPeak, setShowTubingPeelPeak] = useState(false);
  const [showTubingPeelAvg, setShowTubingPeelAvg] = useState(false);

  const [productID, setProductID] = useState("");
  const [grammage, setGrammage] = useState("");
  const [tensileMD, setTensileMD] = useState("");
  const [tensileCD, setTensileCD] = useState("");
  const [elongationMD, setElongationMD] = useState("");
  const [elongationCD, setElongationCD] = useState("");
  const [notes, setNotes] = useState("");

  const [productType, setProductType] = useState("");
  const [construction, setConstruction] = useState("");
  const [dinier, setDinier] = useState("");
  const [color, setColor] = useState("");
  const [additionalFeatures, setAdditionalFeatures] = useState("");
  const [tubingTensile, setTubingTensile] = useState("");
  const [tubingElongation, setTubingElongation] = useState("");
  const [tubingPeelPeak, setTubingPeelPeak] = useState("");
  const [tubingPeelAvg, setTubingPeelAvg] = useState("");

  const [dateValue, setDateValue] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [saving, setSaving] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | HTMLTextAreaElement | null>>([]);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const handleNumberInput = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (/^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateValue(e.target.value);
  };

  const formatDisplayDate = (value: string) => value.replace(/-/g, "/");

  const handleSave = async () => {
    if (!dateValue || !productType) {
      alert("Please make sure Date and Product Type are selected.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/packaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateValue,
          productType,
          construction,
          dinier,
          color,
          additionalFeatures,
          productID,
          grammage,
          tensileMD,
          tensileCD,
          elongationMD,
          elongationCD,
          tubingTensile: showTubingTensile ? tubingTensile : null,
          tubingElongatio: showTubingElongation ? tubingElongation : null,
          tubingPeelPeak: showTubingPeelPeak ? tubingPeelPeak : null,
          tubingPeelAvg: showTubingPeelAvg ? tubingPeelAvg : null,
          notes,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(`Failed to save data: ${json.message ?? "Unknown error"}`);
        return;
      }

      alert(
        `Data saved!\n` +
          `Product Type: ${productType}\n` +
          `Construction: ${construction}\n` +
          `Dinier: ${dinier}\n` +
          `Color: ${color}\n` +
          `Additional Features: ${additionalFeatures}\n` +
          `Date: ${dateValue}`
      );

      // Clear fields (keep date & product type)
      setTensileMD("");
      setTensileCD("");
      setElongationMD("");
      setElongationCD("");
      setTubingTensile("");
      setTubingElongation("");
      setTubingPeelPeak("");
      setTubingPeelAvg("");
    } catch (error) {
      console.error(error);
      alert("Error while saving data. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEnter = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) nextInput.focus();
    }
  };

  // Helper to assign refs
  const setRef = (el: HTMLInputElement | HTMLTextAreaElement | null, index: number) => {
    inputRefs.current[index] = el;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-gray-900">
        Packaging Data Entry
      </h1>

      <div className="bg-white border border-gray-300 rounded-xl shadow-lg p-6 space-y-4">
        {/* Date + Product Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date */}
          <div>
            <label className="font-semibold block mb-1">Date</label>
            <div className="relative">
              <input
                id="date"
                type="date"
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                value={dateValue}
                onChange={handleDateChange}
                ref={(el) => setRef(el, 0)}
                onKeyDown={(e) => handleEnter(e, 0)}
              />
              <div
                className="flex items-center justify-between p-2 border border-gray-300 rounded-lg bg-white cursor-pointer h-10"
                onClick={() =>
                  (document.getElementById("date") as HTMLInputElement)?.showPicker?.()
                }
              >
                <span className="flex-1 text-center">{formatDisplayDate(dateValue)}</span>
                <FaCalendarAlt className="text-gray-600 ml-2" />
              </div>
            </div>
          </div>

          {/* Product Type */}
          <div>
            <label className="font-semibold block mb-1">Product Type</label>
            <input
              type="text"
              placeholder="PP"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              ref={(el) => setRef(el, 1)}
              onKeyDown={(e) => handleEnter(e, 1)}
            />
          </div>
        </div>

        {/* Construction / Denier / Color / Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold block mb-1">Construction</label>
            <input
              type="text"
              placeholder="7x8"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={construction}
              onChange={(e) => setConstruction(e.target.value)}
              ref={(el) => setRef(el, 2)}
              onKeyDown={(e) => handleEnter(e, 2)}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Denier</label>
            <input
              type="text"
              placeholder="100"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={dinier}
              onChange={(e) => handleNumberInput(e.target.value, setDinier)}
              ref={(el) => setRef(el, 3)}
              onKeyDown={(e) => handleEnter(e, 3)}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Color</label>
            <input
              type="text"
              placeholder="W"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              ref={(el) => setRef(el, 4)}
              onKeyDown={(e) => handleEnter(e, 4)}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Additional Features</label>
            <input
              type="text"
              placeholder="Enter Additional Features..."
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={additionalFeatures}
              onChange={(e) => setAdditionalFeatures(e.target.value)}
              ref={(el) => setRef(el, 5)}
              onKeyDown={(e) => handleEnter(e, 5)}
            />
          </div>
        </div>

                {/* Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-100 rounded-lg">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showTubingTensile}
              onChange={() => setShowTubingTensile(!showTubingTensile)}
            />
            <span className="font-medium">Tubing Tensile</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showTubingElongation}
              onChange={() => setShowTubingElongation(!showTubingElongation)}
            />
            <span className="font-medium">Tubing Elongation</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showTubingPeelPeak}
              onChange={() => setShowTubingPeelPeak(!showTubingPeelPeak)}
            />
            <span className="font-medium">Tubing Peel Peak</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showTubingPeelAvg}
              onChange={() => setShowTubingPeelAvg(!showTubingPeelAvg)}
            />
            <span className="font-medium">Tubing Peel Avg</span>
          </label>
        </div>

        <hr className="border-gray-300" />

        {/* Product ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
          <label className="text-lg font-semibold text-right md:pr-4">Product ID</label>
          <input
            type="text"
            placeholder="Enter Product ID..."
            value={productID}
            onChange={(e) => setProductID(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg h-10"
            ref={(el) => setRef(el, 6)}
            onKeyDown={(e) => handleEnter(e, 6)}
          />
        </div>

        {/* Grammage */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
          <label className="text-lg font-semibold text-right md:pr-4">Grammage (g/m2)</label>
          <input
            type="text"
            placeholder="0.00"
            value={grammage}
            onChange={(e) => handleNumberInput(e.target.value, setGrammage)}
            className="p-2 border border-gray-300 rounded-lg h-10"
            ref={(el) => setRef(el, 7)}
            onKeyDown={(e) => handleEnter(e, 7)}
          />
        </div>

        {/* Tensile MD */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
          <label className="text-lg font-semibold text-right md:pr-4">Tensile Strength MD (KGF/50mm)</label>
          <input
            type="text"
            placeholder="0.00"
            value={tensileMD}
            onChange={(e) => handleNumberInput(e.target.value, setTensileMD)}
            className="p-2 border border-gray-300 rounded-lg h-10"
            ref={(el) => setRef(el, 8)}
            onKeyDown={(e) => handleEnter(e, 8)}
          />
        </div>


        {/* Elongation MD */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
          <label className="text-lg font-semibold text-right md:pr-4">Elongation MD (%)</label>
          <input
            type="text"
            placeholder="0.00"
            value={elongationMD}
            onChange={(e) => handleNumberInput(e.target.value, setElongationMD)}
            className="p-2 border border-gray-300 rounded-lg h-10"
            ref={(el) => setRef(el, 9)}
            onKeyDown={(e) => handleEnter(e, 9)}
          />
        </div>

                {/* Tensile CD */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
          <label className="text-lg font-semibold text-right md:pr-4">Tensile Strength CD (KGF/50mm)</label>
          <input
            type="text"
            placeholder="0.00"
            value={tensileCD}
            onChange={(e) => handleNumberInput(e.target.value, setTensileCD)}
            className="p-2 border border-gray-300 rounded-lg h-10"
            ref={(el) => setRef(el, 10)}
            onKeyDown={(e) => handleEnter(e, 10)}
          />
        </div>

        {/* Elongation CD */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
          <label className="text-lg font-semibold text-right md:pr-4">Elongation CD (%)</label>
          <input
            type="text"
            placeholder="0.00"
            value={elongationCD}
            onChange={(e) => handleNumberInput(e.target.value, setElongationCD)}
            className="p-2 border border-gray-300 rounded-lg h-10"
            ref={(el) => setRef(el, 11)}
            onKeyDown={(e) => handleEnter(e, 11)}
          />
        </div>

{/* Tubing Tensile */}
{showTubingTensile && (
  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
    <label className="text-right text-lg font-semibold md:pr-4">
      Tubing Tensile Strength (kgf/50mm)
    </label>
    <input
      type="text"
      placeholder="0.00"
      value={tubingTensile}
      onChange={(e) => handleNumberInput(e.target.value, setTubingTensile)}
      className="p-2 border border-gray-300 rounded-lg h-10"
      ref={(el) => setRef(el, 12)}
      onKeyDown={(e) => handleEnter(e, 12)}
    />
  </div>
)}

{/* Tubing Elongation */}
{showTubingElongation && (
  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
    <label className="text-right text-lg font-semibold md:pr-4">
      Tubing Elongation (%)
    </label>
    <input
      type="text"
      placeholder="0.00"
      value={tubingElongation}
      onChange={(e) => handleNumberInput(e.target.value, setTubingElongation)}
      className="p-2 border border-gray-300 rounded-lg h-10"
      ref={(el) => setRef(el, 13)}
      onKeyDown={(e) => handleEnter(e, 13)}
    />
  </div>
)}

{/* Tubing Peel Peak */}
{showTubingPeelPeak && (
  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
    <label className="text-right text-lg font-semibold md:pr-4">
      Tubing Peel Peak (kgf/6 lines)
    </label>
    <input
      type="text"
      placeholder="0.00"
      value={tubingPeelPeak}
      onChange={(e) => handleNumberInput(e.target.value, setTubingPeelPeak)}
      className="p-2 border border-gray-300 rounded-lg h-10"
      ref={(el) => setRef(el, 14)}
      onKeyDown={(e) => handleEnter(e, 14)}
    />
  </div>
)}

{/* Tubing Peel Avg */}
{showTubingPeelAvg && (
  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
    <label className="text-right text-lg font-semibold md:pr-4">
      Tubing Peel Average (kgf/6 lines)
    </label>
    <input
      type="text"
      placeholder="0.00"
      value={tubingPeelAvg}
      onChange={(e) => handleNumberInput(e.target.value, setTubingPeelAvg)}
      className="p-2 border border-gray-300 rounded-lg h-10"
      ref={(el) => setRef(el, 15)}
      onKeyDown={(e) => handleEnter(e, 15)}
    />
  </div>
)}


        {/* Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4">
          <label className="text-lg font-semibold text-right md:pr-4 pt-2">Notes</label>
          <textarea
            value={notes}
            placeholder="Enter Notes Here..."
            onChange={(e) => setNotes(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg h-24 resize-none"
            ref={(el) => setRef(el, 16)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent newline
      saveButtonRef.current?.focus();
    }
  }}
/>
        </div>

        {/* Save */}
        <div className="flex justify-end pt-4 border-t">
          <button
          ref={saveButtonRef}
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-3 rounded-lg text-white font-semibold ${
              saving
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {saving ? "Saving..." : "Save Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
