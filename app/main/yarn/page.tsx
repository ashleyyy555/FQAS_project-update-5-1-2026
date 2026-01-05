"use client";

import React, { useState, useRef } from "react";
import { FaCalendarAlt } from "react-icons/fa";

export default function YarnUI() {
  const [productID, setProductID] = useState("");
  const [productType, setProductType] = useState("");
  const [material, setMaterial] = useState("");
  const [width, setWidth] = useState("");
  const [side, setSide] = useState("");
  const [time, setTime] = useState("");
  const [denier, setDenier] = useState("");
  const [machine, setMachine] = useState("");
  const [tensile, setTensile] = useState("");
  const [elongation, setElongation] = useState("");
  const [notes, setNotes] = useState("");

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
      const res = await fetch("/api/yarn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateValue,
          productID,
          productType,
          material,
          width,
          side,
          time,
          denier,
          machine,
          tensile,
          elongation,
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
          `Product ID: ${productID}\n` +
          `Denier: ${denier}\n` +
          `Date: ${dateValue}`
      );

      // Clear fields (keep date & product type)
      setTensile("");
      setElongation("");
      setWidth("");
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
        Yarn QA Data Entry
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold block mb-1">Product ID</label>
            <input
              type="text"
              placeholder="I.D"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={productID}
              onChange={(e) => setProductID(e.target.value)}
              ref={(el) => setRef(el, 2)}
              onKeyDown={(e) => handleEnter(e, 2)}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Material</label>
            <input
              type="text"
              placeholder="Innoplus"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              ref={(el) => setRef(el, 3)}
              onKeyDown={(e) => handleEnter(e, 3)}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Side</label>
            <input
              type="text"
              placeholder="A"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={side}
              onChange={(e) => setSide(e.target.value)}
              ref={(el) => setRef(el, 4)}
              onKeyDown={(e) => handleEnter(e, 4)}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Time</label>
            <input
              type="text"
              placeholder="AM"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              ref={(el) => setRef(el, 5)}
              onKeyDown={(e) => handleEnter(e, 5)}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Denier</label>
            <input
              type="text"
              placeholder="100"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={denier}
              onChange={(e) => handleNumberInput(e.target.value, setDenier)}
              ref={(el) => setRef(el, 6)}
              onKeyDown={(e) => handleEnter(e, 6)}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1">Machine</label>
            <input
              type="text"
              placeholder="Machine 1"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              ref={(el) => setRef(el, 7)}
              onKeyDown={(e) => handleEnter(e, 7)}
            />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Tensile MD */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
          <label className="text-lg font-semibold text-right md:pr-4">Tensile Strength (N/50mm)</label>
          <input
            type="text"
            placeholder="0.00"
            value={tensile}
            onChange={(e) => handleNumberInput(e.target.value, setTensile)}
            className="p-2 border border-gray-300 rounded-lg h-10"
            ref={(el) => setRef(el, 8)}
            onKeyDown={(e) => handleEnter(e, 8)}
          />
        </div>


        {/* Elongation MD */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
          <label className="text-lg font-semibold text-right md:pr-4">Elongation (%)</label>
          <input
            type="text"
            placeholder="0.00"
            value={elongation}
            onChange={(e) => handleNumberInput(e.target.value, setElongation)}
            className="p-2 border border-gray-300 rounded-lg h-10"
            ref={(el) => setRef(el, 9)}
            onKeyDown={(e) => handleEnter(e, 9)}
          />
        </div>

        {/* Width */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
          <label className="text-lg font-semibold text-right md:pr-4">Width (MM)</label>
          <input
            type="text"
            placeholder="0.00"
            value={width}
            onChange={(e) => handleNumberInput(e.target.value, setWidth)}
            className="p-2 border border-gray-300 rounded-lg h-10"
            ref={(el) => setRef(el, 10)}
            onKeyDown={(e) => handleEnter(e, 10)}
          />
        </div>

        {/* Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4">
          <label className="text-lg font-semibold text-right md:pr-4 pt-2">Notes</label>
          <textarea
            value={notes}
            placeholder="Enter Notes Here..."
            onChange={(e) => setNotes(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg h-24 resize-none"
            ref={(el) => setRef(el, 11)}
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
