// lib/inspectionFields.ts

export interface InspectionField {
  key: string;
  label: string;
  type: "text" | "number" | "date"; // type of input
  group?: string; // optional: grouping fields (e.g., MD/CD)
  searchable?: boolean; // optional: if this field should be included in search
}

// Lamination inspection fields
export const laminationFields: InspectionField[] = [
  { key: "productID", label: "Product ID", type: "text", searchable: true },
  { key: "date", label: "Date", type: "date", searchable: true },
  { key: "category", label: "Category", type: "text", searchable: true },
  { key: "range", label: "Range", type: "text", searchable: true },
  { key: "product", label: "Product", type: "text", searchable: true },

  { key: "grammage", label: "Grammage (g/m2)", type: "number", searchable: true },

  { key: "tensileUnit", label: "Tensile Unit", type: "text", group: "Tensile", searchable: true },
  { key: "tensileMD", label: "Tensile MD", type: "number", group: "Tensile", searchable: true },
  { key: "tensileCD", label: "Tensile CD", type: "number", group: "Tensile", searchable: true },

  { key: "elongationMD", label: "Elongation MD (%)", type: "number", group: "Elongation", searchable: true },
  { key: "elongationCD", label: "Elongation CD (%)", type: "number", group: "Elongation", searchable: true },

  { key: "tongueTearMD", label: "Tongue Tear MD (N)", type: "number", group: "Tongue Tear", searchable: true },
  { key: "tongueTearCD", label: "Tongue Tear CD (N)", type: "number", group: "Tongue Tear", searchable: true },

  { key: "nailShankMD", label: "Nail Shank MD (N)", type: "number", group: "Nail Shank", searchable: true },
  { key: "nailShankCD", label: "Nail Shank CD (N)", type: "number", group: "Nail Shank", searchable: true },

  { key: "tearStrengthMD", label: "Tear Strength MD (kgf)", type: "number", group: "Tear Strength", searchable: true },
  { key: "tearStrengthCD", label: "Tear Strength CD (kgf)", type: "number", group: "Tear Strength", searchable: true },

  { key: "bondStrengthMD", label: "Bond Strength 1st MD (N/50mm)", type: "number", group: "Bond Strength 1st", searchable: true },
  { key: "bondStrengthCD", label: "Bond Strength 1st CD (N/50mm)", type: "number", group: "Bond Strength 1st", searchable: true },

  { key: "bondStrength2MD", label: "BondStrength 2nd MD (N/50mm)", type: "number", group: "Bond Strength 2nd", searchable: true },
  { key: "bondStrength2CD", label: "BondStrength 2nd CD (N/50mm)", type: "number", group: "Bond Strength 2nd", searchable: true },

  { key: "adhesiveMD", label: "Adhesive 1st MD (N/25.4mm)", type: "number", group: "Adhesive 1st", searchable: true },
  { key: "adhesiveCD", label: "Adhesive 1st CD (N/25.4mm)", type: "number", group: "Adhesive 1st", searchable: true },

  { key: "adhesive2MD", label: "Adhesive 2nd MD (N/25.4mm)", type: "number", group: "Adhesive 2nd", searchable: true },
  { key: "adhesive2CD", label: "Adhesive 2nd CD (N/25.4mm)", type: "number", group: "Adhesive 2nd", searchable: true },

  { key: "tearResistanceMD", label: "Tear Resistance MD (N)", type: "number", group: "Tear Resistance", searchable: true },
  { key: "tearResistanceCD", label: "Tear Resistance CD (N)", type: "number", group: "Tear Resistance", searchable: true },

  { key: "staplerTestMD", label: "Stapler Test MD (N)", type: "number", group: "Stapler Test", searchable: true },
  { key: "staplerTestCD", label: "Stapler Test CD (N)", type: "number", group: "Stapler Test", searchable: true },

  { key: "emissivityAlum1", label: "Emissivity Alum 1 (Index)", type: "number", group: "Emissivity",searchable: true },
  { key: "emissivityAlum2", label: "Emissivity Alum 2 (Index)", type: "number", group: "Emissivity", searchable: true },
  { key: "emissivityMPET", label: "Emissivity MPET (Index)", type: "number", group: "Emissivity", searchable: true },

  { key: "sewingMD", label: "Sewing MD (%)", type: "number", group: "Sewing", searchable: true },
  { key: "sewingCD", label: "Sewing CD (%)", type: "number", group: "Sewing", searchable: true },

  { key: "thickness", label: "Thickness (mm)", type: "number", searchable: true },

  { key: "wVTR", label: "WVTR (g/m2/day)", type: "number", searchable: true },

  { key: "bS476i1", label: "BS476 : P6 (i1)", type: "number", group: "BS476", searchable: true },
  { key: "bS476i2", label: "BS476 : P6 (i2)", type: "number", group: "BS476", searchable: true },
  { key: "bS476i3", label: "BS476 : P6 (i3)", type: "number", group: "BS476", searchable: true },
  { key: "bs476I", label: "BS476 : P6 (I)", type: "number", group: "BS476", searchable: true },

  { key: "tearPropagationMD", label: "Tear Propagation MD (N/mm)", type: "number", group: "Tear Propagation", searchable: true },
  { key: "tearPropagationCD", label: "Tear Propagation CD (N/mm)", type: "number", group: "Tear Propagation", searchable: true },



  { key: "notes", label: "Notes", type: "text", searchable: true },
];
