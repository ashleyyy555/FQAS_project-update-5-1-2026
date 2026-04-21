"use client";

import React, { useState, useRef } from "react";
import { FaCalendarAlt } from "react-icons/fa";

export default function LaminationUI() {
  // Checkbox states
  const [showGrammage, setShowGrammage] = useState(false);
  const [showTensile, setShowTensile] = useState(false);
  const [showElongation, setShowElongation] = useState(false);
  const [showTongueTear, setShowTongueTear] = useState(false);
  const [showNailShank, setShowNailShank] = useState(false);
  const [showTearStrength, setShowTearStrength] = useState(false);
  const [showBondStrength, setShowBondStrength] = useState(false);
  const [showBondStrength2, setShowBondStrength2] = useState(false);
  const [showAdhesive, setShowAdhesive] = useState(false);
  const [showAdhesive2, setShowAdhesive2] = useState(false);
  const [showTearResistance, setShowTearResistance] = useState(false);
  const [showInitialTear, setShowInitialTear] = useState(false);
  const [showStaplerTest, setShowStaplerTest] = useState(false);
  const [showEmissivity, setShowEmissivity] = useState(false);
  const [showSewing, setShowSewing] = useState(false);
  const [showThickness, setShowThickness] = useState(false);
  const [showWVTR, setShowWVTR] = useState(false);
  const [showBS476, setShowBS476] = useState(false);


  // Input states

  const [productID, setProductID] = useState("");
  const [grammage, setGrammage] = useState("");

  const [tensileMD, setTensileMD] = useState("");
  const [tensileCD, setTensileCD] = useState("");
  const [tensileUnit, setTensileUnit] = useState("");

  const [elongationMD, setElongationMD] = useState("");
  const [elongationCD, setElongationCD] = useState("");

  const [tongueTearMD, setTongueTearMD] = useState("");
  const [tongueTearCD, setTongueTearCD] = useState("");

  const [nailShankMD, setNailShankMD] = useState("");
  const [nailShankCD, setNailShankCD] = useState("");

  const [tearStrengthMD, setTearStrengthMD] = useState("");
  const [tearStrengthCD, setTearStrengthCD] = useState("");

  const [bondStrengthMD, setBondStrengthMD] = useState("");
  const [bondStrengthCD, setBondStrengthCD] = useState("");

  const [bondStrength2MD, setBondStrength2MD] = useState("");
  const [bondStrength2CD, setBondStrength2CD] = useState("");

  const [adhesiveMD, setAdhesiveMD] = useState("");
  const [adhesiveCD, setAdhesiveCD] = useState("");

  const [adhesive2MD, setAdhesive2MD] = useState("");
  const [adhesive2CD, setAdhesive2CD] = useState("");

  const [tearResistanceMD, setTearResistanceMD] = useState("");
  const [tearResistanceCD, setTearResistanceCD] = useState("");

  const [initialTearMD, setInitialTearMD] = useState("");
  const [initialTearCD, setInitialTearCD] = useState("");

  const [staplerTestMD, setStaplerTestMD] = useState("");
  const [staplerTestCD, setStaplerTestCD] = useState("");

  const [emissivityAlum1, setEmissivityAlum1] = useState("");
  const [emissivityAlum2, setEmissivityAlum2] = useState("");
  const [emissivityMPET, setEmissivityMPET] = useState("");
  const [emissivityMCPP, setEmissivityMCPP] = useState("");

  const [sewingMD, setSewingMD] = useState("");
  const [sewingCD, setSewingCD] = useState("");

  const [thickness, setThickness] = useState("");

  const [wVTR, setWVTR] = useState("");
  
  const [bS476i1, setBS476i1] = useState("");
  const [bS476i2, setBS476i2] = useState("");
  const [bS476i3, setBS476i3] = useState("");

  
  const [notes, setNotes] = useState("");

  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [range, setRange] = useState("");

  const [dateValue, setDateValue] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

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

  const [saving, setSaving] = useState(false);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateValue(e.target.value);
  };

  const formatDisplayDate = (value: string) => value.replace(/-/g, "/");

  const handleNumberInput = (v: string, setter: (val: string) => void) => {
    if (/^\d*\.?\d*$/.test(v)) setter(v);
  };

    const handleEnterMove = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (!form) return;
      const index = Array.prototype.indexOf.call(form.elements, e.currentTarget);
      const next = form.elements[index + 1] as HTMLElement | undefined;
      next?.focus();
    }
  };

  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const handleSave = async () => {
    if (!dateValue || !category || !product || !productID) {
      alert("Please make sure Date, Category, Product and Product ID are selected.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/lamination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateValue,
          category,
          range,
          product,
          productID,

          grammage: showGrammage ? grammage : null,

          tensileMD: showTensile ? tensileMD : null,
          tensileCD: showTensile ? tensileCD : null,
          tensileUnit: showTensile ? tensileUnit : null,

          elongationMD: showElongation ? elongationMD : null,
          elongationCD: showElongation ? elongationCD : null,

          tongueTearMD: showTongueTear ? tongueTearMD : null,
          tongueTearCD: showTongueTear ? tongueTearCD : null,

          nailShankMD: showNailShank ? nailShankMD : null,
          nailShankCD: showNailShank ? nailShankCD : null,

          tearStrengthMD: showTearStrength ? tearStrengthMD : null,
          tearStrengthCD: showTearStrength ? tearStrengthCD : null,

          bondStrengthMD: showBondStrength ? bondStrengthMD : null,
          bondStrengthCD: showBondStrength ? bondStrengthCD : null,

          bondStrength2MD: showBondStrength2 ? bondStrength2MD : null,
          bondStrength2CD: showBondStrength2 ? bondStrength2CD : null,

          adhesiveMD: showAdhesive ? adhesiveMD : null,
          adhesiveCD: showAdhesive ? adhesiveCD : null,

          adhesive2MD: showAdhesive2 ? adhesive2MD : null,
          adhesive2CD: showAdhesive2 ? adhesive2CD : null,

          tearResistanceMD: showTearResistance ? tearResistanceMD : null,
          tearResistanceCD: showTearResistance ? tearResistanceCD : null,

          initialTearMD: showInitialTear ? initialTearMD : null,
          initialTearCD: showInitialTear ? initialTearCD : null,

          staplerTestMD: showStaplerTest ? staplerTestMD : null,
          staplerTestCD: showStaplerTest ? staplerTestCD : null,

          emissivityAlum1: showEmissivity ? emissivityAlum1 : null,
          emissivityAlum2: showEmissivity ? emissivityAlum2 : null,
          emissivityMPET: showEmissivity ? emissivityMPET : null,
          emissivityMCPP: showEmissivity ? emissivityMCPP : null,

          sewingMD: showSewing ? sewingMD : null,
          sewingCD: showSewing ? sewingCD : null,

          thickness: showThickness ? thickness : null,

          wVTR: showWVTR ? wVTR : null,

          bS476i1: showBS476 ? bS476i1 : null,
          bS476i2: showBS476 ? bS476i2 : null,
          bS476i3: showBS476 ? bS476i3 : null,

          notes,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(`Error saving data: ${json.message ?? "Unknown error"}`);
        return;
      }

      alert("Data saved!");

      // Reset only numeric / text fields; keep date, category, range, product, checkboxes
      setTensileMD("");
      setTensileCD("");
      setElongationMD("");
      setElongationCD("");
      setTongueTearMD("");
      setTongueTearCD("");
      setNailShankMD("");
      setNailShankCD("");
      setTearStrengthMD("");
      setTearStrengthCD("");
      setBondStrengthMD("");
      setBondStrengthCD("");
      setBondStrength2MD("");
      setBondStrength2CD("");
      setAdhesiveMD("");
      setAdhesiveCD("");
      setAdhesive2MD("");
      setAdhesive2CD("");
      setTearResistanceMD("");
      setTearResistanceCD("");
      setInitialTearMD("");
      setInitialTearCD("");
      setStaplerTestMD("");
      setStaplerTestCD("");
      setEmissivityAlum1("");
      setEmissivityAlum2("");
      setEmissivityMPET("");
      setEmissivityMCPP("");
      setSewingMD("");
      setSewingCD("");
      setThickness("");
      setWVTR("");
      setBS476i1("");
      setBS476i2("");
      setBS476i3("");
    } catch (err) {
      console.error(err);
      alert("Error saving data.");
    } finally {
      setSaving(false);
    }
  };

  const productIdRef = useRef<HTMLInputElement>(null);


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-extrabold text-gray-900">Lamination Data Entry</h1>

      <div className="bg-white border border-gray-300 rounded-xl shadow-lg p-6 space-y-6">
        {/* Top row: Date picker + Category + Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Date Picker */}
          <div className="flex items-center">
            <label
              htmlFor="date"
              className="text-lg font-semibold mr-4 text-right"
            >
              Date:
            </label>
            <div className="relative w-full">
              <input
                id="date"
                type="date"
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                value={dateValue}
                onChange={handleDateChange}
              />
              <div
                className="flex items-center justify-between p-2 border border-gray-300 rounded-lg shadow-sm bg-white cursor-pointer
                           focus-within:ring-2 focus-within:ring-indigo-500 w-full text-gray-800 text-center font-medium select-none h-10"
                onClick={() => {
                  const realInput = document.getElementById(
                    "date"
                  ) as HTMLInputElement | null;
                  realInput?.showPicker?.();
                }}
              >
                <span className="flex-1 text-gray-800 text-center">
                  {formatDisplayDate(dateValue)}
                </span>
                <FaCalendarAlt className="text-gray-600 ml-2 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center">
            <label
              htmlFor="category"
              className="text-lg font-semibold mr-4 text-right"
            >
              Category:
            </label>
            <select
              id="category"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setRange(""); // Reset range when category changes
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

          {/* Range Dropdown */}
          <div className="flex items-center">
            <label
              htmlFor="range"
              className="text-lg font-semibold mr-4 text-right"
            >
              Type:
            </label>
            <select
              id="range"
              className="w-full p-2 border border-gray-300 rounded-lg h-10"
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

{/* Product Model */}
<div className="flex items-center w-full w-full">
  <label
    htmlFor="product"
    className="text-lg font-semibold mr-4 w-32 text-right whitespace-nowrap"
  >
    Product Model:
  </label>
  <input
    placeholder="Enter product name..."
    type="text"
    className="flex-1 p-2 border border-gray-300 rounded-lg h-10"
    value={product}
    onChange={(e) => setProduct(e.target.value)}
      onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      productIdRef.current?.focus();
    }
  }}
  />
</div>

        {/* Checkboxes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-100 rounded-lg">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showGrammage}
              onChange={() => setShowGrammage(!showGrammage)}
            />
            <span className="font-medium">Grammage</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showTensile}
              onChange={() => setShowTensile(!showTensile)}
            />
            <span className="font-medium">Tensile Strength</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showElongation}
              onChange={() => setShowElongation(!showElongation)}
            />
            <span className="font-medium">Elongation</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showTongueTear}
              onChange={() => setShowTongueTear(!showTongueTear)}
            />
            <span className="font-medium">Tongue Tear</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showNailShank}
              onChange={() => setShowNailShank(!showNailShank)}
            />
            <span className="font-medium">Nail Shank</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showTearStrength}
              onChange={() => setShowTearStrength(!showTearStrength)}
            />
            <span className="font-medium">Tear Strength</span>
          </label>

<label className="flex items-center space-x-2">
  <input
    type="checkbox"
    checked={showBondStrength}
    onChange={() => {
      const newVal = !showBondStrength;
      setShowBondStrength(newVal);
      setShowBondStrength2(newVal); // also toggle Bond Strength 2
    }}
  />
  <span className="font-medium">Bond Strength</span>
</label>


<label className="flex items-center space-x-2">
  <input
    type="checkbox"
    checked={showAdhesive}
    onChange={() => {
      const newVal = !showAdhesive;
      setShowAdhesive(newVal);
      setShowAdhesive2(newVal); // also toggle Bond Strength 2
    }}
  />
  <span className="font-medium">Adhesive</span>
</label>



          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showTearResistance}
              onChange={() => setShowTearResistance(!showTearResistance)}
            />
            <span className="font-medium">Tear Resistance</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showInitialTear}
              onChange={() => setShowInitialTear(!showInitialTear)}
            />
            <span className="font-medium">Initial Tear</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showStaplerTest}
              onChange={() => setShowStaplerTest(!showStaplerTest)}
            />
            <span className="font-medium">Stapler Test</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showEmissivity}
              onChange={() => setShowEmissivity(!showEmissivity)}
            />
            <span className="font-medium">Emissivity</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showSewing}
              onChange={() => setShowSewing(!showSewing)}
            />
            <span className="font-medium">Sewing</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showThickness}
              onChange={() => setShowThickness(!showThickness)}
            />
            <span className="font-medium">Thickness</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showWVTR}
              onChange={() => setShowWVTR(!showWVTR)}
            />
            <span className="font-medium">WVTR</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showBS476}
              onChange={() => setShowBS476(!showBS476)}
            />
            <span className="font-medium">BS476</span>
          </label>
          
        </div>

        <hr className="border-gray-300" />
        <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
{/* Product ID */}
<div className="flex items-center w-full mt-2">
  <label
    htmlFor="productid"
    className="text-lg font-semibold mr-4 w-32 text-right whitespace-nowrap"
  >
    Product ID:
  </label>
  <input
    ref={productIdRef}
    placeholder="Enter product ID ..."
    type="text"
    className="flex-1 p-2 border border-gray-300 rounded-lg h-10"
    value={productID}
    onChange={(e) => setProductID(e.target.value)}
    onKeyDown={handleEnterMove}
  />
</div>

{/* Grammage */}
{showGrammage && (
  <div className="flex w-full items-center space-x-4 mt-2">
    <label className="w-1/2 text-lg font-semibold text-right pr-4">
      Grammage (g/m²):
    </label>
    <input
      type="text"
      placeholder="0.00"
      value={grammage}
      onChange={(e) => handleNumberInput(e.target.value, setGrammage)}
      className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
      onKeyDown={handleEnterMove}
    />
  </div>
)}

{/* Tensile */}
{showTensile && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Tensile Unit:
      </label>
      <input
        placeholder="N/50mm"
        value={tensileUnit}
        onChange={(e) => setTensileUnit(e.target.value)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Tensile MD:
      </label>
      <input
        placeholder="0.00"
        value={tensileMD}
        onChange={(e) => handleNumberInput(e.target.value, setTensileMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

{/* Elongation */}
{showElongation && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Elongation MD (%):
      </label>
      <input
        placeholder="0.00"
        value={elongationMD}
        onChange={(e) => handleNumberInput(e.target.value, setElongationMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

{/* Tongue Tear */}
{showTongueTear && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Tongue Tear MD (N):
      </label>
      <input
        placeholder="0.00"
        value={tongueTearMD}
        onChange={(e) => handleNumberInput(e.target.value, setTongueTearMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

{/* Nail Shank */}
{showNailShank && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Nail Shank MD (N):
      </label>
      <input
        placeholder="0.00"
        value={nailShankMD}
        onChange={(e) => handleNumberInput(e.target.value, setNailShankMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

{/* Tear Strength */}
{showTearStrength && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Tear Strength MD (kgf):
      </label>
      <input
        placeholder="0.00"
        value={tearStrengthMD}
        onChange={(e) => handleNumberInput(e.target.value, setTearStrengthMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

{/* Bond Strength 1 */}
{showBondStrength && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Bond Strength 1st MD (N/50mm):
      </label>
      <input
        placeholder="0.00"
        value={bondStrengthMD}
        onChange={(e) => handleNumberInput(e.target.value, setBondStrengthMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

{/* Bond Strength 2 */}
{showBondStrength2 && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Bond Strength 2nd MD (N/50mm):
      </label>
      <input
        placeholder="0.00"
        value={bondStrength2MD}
        onChange={(e) => handleNumberInput(e.target.value, setBondStrength2MD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

{/* Adhesive 1 */}
{showAdhesive && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Adhesive 1st MD (N/25.4mm):
      </label>
      <input
        placeholder="0.00"
        value={adhesiveMD}
        onChange={(e) => handleNumberInput(e.target.value, setAdhesiveMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

{/* Adhesive 2 */}
{showAdhesive2 && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Adhesive 2nd MD (N/25.4mm):
      </label>
      <input
        placeholder="0.00"
        value={adhesive2MD}
        onChange={(e) => handleNumberInput(e.target.value, setAdhesive2MD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

        {/* Tear Resistance */}
{showTearResistance && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Tear Resistance MD (N):
      </label>
      <input
        placeholder="0.00"
        value={tearResistanceMD}
        onChange={(e) => handleNumberInput(e.target.value, setTearResistanceMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

        {/* Initial Tear */}
{showInitialTear && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Initial Tear MD (N):
      </label>
      <input
        placeholder="0.00"
        value={initialTearMD}
        onChange={(e) => handleNumberInput(e.target.value, setInitialTearMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

        {/* Stapler Test */}
{showStaplerTest && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Stapler Test MD (N):
      </label>
      <input
        placeholder="0.00"
        value={staplerTestMD}
        onChange={(e) => handleNumberInput(e.target.value, setStaplerTestMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
      </div>
  </>
)}

        {/* Sewing */}
{showSewing && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Sewing MD (%):
      </label>
      <input
        placeholder="0.00"
        value={sewingMD}
        onChange={(e) => handleNumberInput(e.target.value, setSewingMD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
    </>
)}


{showTensile && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Tensile CD:
      </label>
      <input
        placeholder="0.00"
        value={tensileCD}
        onChange={(e) => handleNumberInput(e.target.value, setTensileCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}


{showElongation && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Elongation CD (%):
      </label>
      <input
        placeholder="0.00"
        value={elongationCD}
        onChange={(e) => handleNumberInput(e.target.value, setElongationCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}

{showTongueTear && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Tongue Tear CD (N):
      </label>
      <input
        placeholder="0.00"
        value={tongueTearCD}
        onChange={(e) => handleNumberInput(e.target.value, setTongueTearCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}

{showNailShank && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Nail Shank CD (N):
      </label>
      <input
        placeholder="0.00"
        value={nailShankCD}
        onChange={(e) => handleNumberInput(e.target.value, setNailShankCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}

{showTearStrength && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Tear Strength CD (kgf):
      </label>
      <input
        placeholder="0.00"
        value={tearStrengthCD}
        onChange={(e) => handleNumberInput(e.target.value, setTearStrengthCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}

{showBondStrength && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Bond Strength 1st CD (N/50mm):
      </label>
      <input
        placeholder="0.00"
        value={bondStrengthCD}
        onChange={(e) => handleNumberInput(e.target.value, setBondStrengthCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}

{showBondStrength2 && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Bond Strength 2nd CD (N/50mm):
      </label>
      <input
        placeholder="0.00"
        value={bondStrength2CD}
        onChange={(e) => handleNumberInput(e.target.value, setBondStrength2CD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}

{showAdhesive && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Adhesion 1st CD (N/25.4mm):
      </label>
      <input
        placeholder="0.00"
        value={adhesiveCD}
        onChange={(e) => handleNumberInput(e.target.value, setAdhesiveCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}

{showAdhesive2 && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Adhesive 2nd CD (N/25.4mm):
      </label>
      <input
        placeholder="0.00"
        value={adhesive2CD}
        onChange={(e) => handleNumberInput(e.target.value, setAdhesive2CD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}

{showTearResistance && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Tear Resistance CD (N):
      </label>
      <input
        placeholder="0.00"
        value={tearResistanceCD}
        onChange={(e) => handleNumberInput(e.target.value, setTearResistanceCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}

{showInitialTear && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Initial Tear CD (N):
      </label>
      <input
        placeholder="0.00"
        value={initialTearCD}
        onChange={(e) => handleNumberInput(e.target.value, setInitialTearCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}

{showStaplerTest && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Stapler Test CD (N):
      </label>
      <input
        placeholder="0.00"
        value={staplerTestCD}
        onChange={(e) => handleNumberInput(e.target.value, setStaplerTestCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
      </>
)}


        {/* Sewing */}
{showSewing && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Sewing CD (%):
      </label>
      <input
        placeholder="0.00"
        value={sewingCD}
        onChange={(e) => handleNumberInput(e.target.value, setSewingCD)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}


{/* Emissivity */}
{showEmissivity && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Emissivity Alum 1 (Index):
      </label>
      <input
        placeholder="0.00"
        value={emissivityAlum1}
        onChange={(e) => handleNumberInput(e.target.value, setEmissivityAlum1)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Emissivity Alum 2 (Index):
      </label>
      <input
        placeholder="0.00"
        value={emissivityAlum2}
        onChange={(e) => handleNumberInput(e.target.value, setEmissivityAlum2)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
        <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Emissivity MPET (Index):
      </label>
      <input
        placeholder="0.00"
        value={emissivityMPET}
        onChange={(e) => handleNumberInput(e.target.value, setEmissivityMPET)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>

        <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Emissivity MCPP (Index):
      </label>
      <input
        placeholder="0.00"
        value={emissivityMCPP}
        onChange={(e) => handleNumberInput(e.target.value, setEmissivityMCPP)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

        {/* Thickness */}
{showThickness && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        Thickness (mm):
      </label>
      <input
        placeholder="0.00"
        value={thickness}
        onChange={(e) => handleNumberInput(e.target.value, setThickness)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

        {/* WVTR */}
{showWVTR && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        WVTR (g/m2/day):
      </label>
      <input
        placeholder="0.00"
        value={wVTR}
        onChange={(e) => handleNumberInput(e.target.value, setWVTR)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}

{/* BS476 */}
{showBS476 && (
  <>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        BS476 : P6 (i1):
      </label>
      <input
        placeholder="0.00"
        value={bS476i1}
        onChange={(e) => handleNumberInput(e.target.value, setBS476i1)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        BS476 : P6 (i2):
      </label>
      <input
        placeholder="0.00"
        value={bS476i2}
        onChange={(e) => handleNumberInput(e.target.value, setBS476i2)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
        <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
        BS476 : P6 (i3):
      </label>
      <input
        placeholder="0.00"
        value={bS476i3}
        onChange={(e) => handleNumberInput(e.target.value, setBS476i3)}
        className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
        onKeyDown={handleEnterMove}
      />
    </div>
  </>
)}
        {/* Notes */}
    <div className="flex w-full items-center space-x-4 mt-2">
      <label className="w-1/2 text-lg font-semibold text-right pr-4">
              Notes:
            </label>
<textarea
  placeholder="Enter notes here..."
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  className="w-1/2 p-2 border border-gray-300 rounded-lg h-10"
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent newline
      saveButtonRef.current?.focus();
    }
  }}
/>
          </div>
        </form>

       {/* Save */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
          ref={saveButtonRef}
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-3 text-white font-semibold rounded-lg shadow-md transition ${
              saving ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {saving ? "Saving..." : "Save Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
