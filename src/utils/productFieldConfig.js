/**
 * Mirrors web's frontend/src/app/utils/productFieldConfig.ts — extra product fields
 * shown only for pharmacy/pharmaceutical businesses. Values map 1:1 onto Product
 * entity columns (no backend changes needed).
 */
const PHARMA_FIELDS = [
  { key: 'genericName', label: 'Generic Name', type: 'text', section: 'Medicine Details', placeholder: 'e.g. Paracetamol' },
  { key: 'manufacturer', label: 'Manufacturer / Company', type: 'text', section: 'Medicine Details', placeholder: 'e.g. GSK, Abbott' },
  { key: 'strength', label: 'Strength / Potency', type: 'text', section: 'Medicine Details', placeholder: 'e.g. 500mg, 250mg/5ml' },
  {
    key: 'dosageForm', label: 'Dosage Form', type: 'select', section: 'Medicine Details',
    options: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Gel', 'Powder', 'Inhaler', 'Patch', 'Suppository', 'Lozenge', 'Spray'],
  },
  { key: 'packSize', label: 'Pack Size', type: 'text', section: 'Medicine Details', placeholder: 'e.g. Strip of 10, 100ml bottle' },
  { key: 'saltComposition', label: 'Salt / Active Ingredients', type: 'textarea', section: 'Medical Info', placeholder: 'e.g. Paracetamol 500mg + Caffeine 65mg' },
  { key: 'usage', label: 'Usage / Indication', type: 'textarea', section: 'Medical Info', placeholder: 'e.g. Fever, pain, headache' },
  { key: 'storageInstructions', label: 'Storage Instructions', type: 'text', section: 'Medical Info', placeholder: 'e.g. Keep below 25°C, away from light' },
  { key: 'prescriptionRequired', label: 'Prescription Required', type: 'boolean', section: 'Medical Info' },
  { key: 'controlledDrug', label: 'Controlled Drug', type: 'boolean', section: 'Medical Info' },
  { key: 'batchNumber', label: 'Batch Number', type: 'text', section: 'Batch & Expiry', placeholder: 'e.g. BN-2024-001' },
  { key: 'expiryDate', label: 'Expiry Date', type: 'date', section: 'Batch & Expiry' },
];

export function getExtraProductFields(businessType) {
  const t = (businessType ?? '').toLowerCase();
  if (t === 'pharmacy' || t === 'pharmaceutical') return PHARMA_FIELDS;
  return [];
}

/** Mirrors web's BarcodeDisplay.tsx generateBarcode — 12 random digits + a weighted check digit. */
export function generateBarcode() {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const checksum = digits.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (checksum % 10)) % 10;
  return [...digits, checkDigit].join('');
}
