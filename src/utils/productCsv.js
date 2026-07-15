import RNFS from 'react-native-fs';
import Share from 'react-native-share';

/** Mirrors web's frontend/src/app/utils/productFieldConfig.ts ALL_PRODUCT_EXPORT_COLUMNS. */
const EXPORT_COLUMNS = [
  { header: 'Name', getValue: p => p.name },
  { header: 'SKU', getValue: p => p.sku || '' },
  { header: 'Barcode', getValue: p => p.barcode || '' },
  { header: 'Category', getValue: p => p.categoryRef?.name || p.category || '' },
  { header: 'Price', getValue: p => p.price },
  { header: 'Min Selling Price', getValue: p => p.minSellingPrice || '' },
  { header: 'Cost', getValue: p => p.cost || '' },
  { header: 'Stock', getValue: p => p.stock },
  { header: 'Low Stock Alert', getValue: p => p.lowStockThreshold || '' },
  { header: 'Supplier', getValue: p => p.supplier || p.supplierRef?.name || '' },
  { header: 'Manufacturer', getValue: p => p.manufacturer || '' },
  { header: 'Condition', getValue: p => p.condition || '' },
  { header: 'Description', getValue: p => p.description || '' },
  { header: 'Location', getValue: p => p.physicalLocation || '' },
  { header: 'Warranty (Days)', getValue: p => p.warrantyDays || '' },
  { header: 'Tax Included', getValue: p => p.isTaxExcluded === true ? 'No' : p.isTaxExcluded === false ? 'Yes' : '' },
];

const csvEscape = val => {
  const s = String(val ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportProductsToCsv(products, fileName = 'products') {
  const header = EXPORT_COLUMNS.map(c => csvEscape(c.header)).join(',');
  const rows = products.map(p => EXPORT_COLUMNS.map(c => csvEscape(c.getValue(p))).join(','));
  const csv = [header, ...rows].join('\n');
  const path = `${RNFS.CachesDirectoryPath}/${fileName}.csv`;
  await RNFS.writeFile(path, csv, 'utf8');
  await Share.open({ url: `file://${path}`, type: 'text/csv', failOnCancel: false });
}

/** Column headers recognized on import (case-insensitive), mirrors web's parseFileToRows. */
const IMPORT_COLUMNS = [
  'name', 'sku', 'barcode', 'category', 'price', 'minsellingprice', 'cost', 'stock',
  'lowstockthreshold', 'supplier', 'manufacturer', 'description', 'condition',
  'physicallocation', 'warrantydays', 'imageurl', 'taxincluded',
];

const IMPORT_FIELD_MAP = {
  name: 'name', sku: 'sku', barcode: 'barcode', category: 'category', price: 'price',
  minsellingprice: 'minSellingPrice', cost: 'cost', stock: 'stock',
  lowstockthreshold: 'lowStockThreshold', supplier: 'supplier', manufacturer: 'manufacturer',
  description: 'description', condition: 'condition', physicallocation: 'physicalLocation',
  warrantydays: 'warrantyDays', imageurl: 'imageUrl',
};

const NUMERIC_KEYS = new Set(['price', 'minSellingPrice', 'cost', 'stock', 'lowStockThreshold', 'warrantyDays']);

/** Naive CSV split (no quoted-comma handling) — matches web's own known limitation for .csv files. */
function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return [];
  const headerCols = lines[0].split(',').map(h => h.trim().toLowerCase());
  const idx = name => headerCols.indexOf(name);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const row = {};
    for (const col of IMPORT_COLUMNS) {
      const ci = idx(col);
      if (ci === -1) continue;
      const raw = (cols[ci] ?? '').trim();
      if (!raw) continue;
      if (col === 'taxincluded') {
        const v = raw.toLowerCase();
        if (v === 'no') row.isTaxExcluded = true;
        else if (v === 'yes') row.isTaxExcluded = false;
        continue;
      }
      const field = IMPORT_FIELD_MAP[col];
      row[field] = NUMERIC_KEYS.has(field) ? parseFloat(raw) : raw;
    }
    if (row.name) rows.push(row);
  }
  return rows;
}

export async function readCsvFileToRows(fileUri) {
  const text = await RNFS.readFile(fileUri, 'utf8');
  return parseCsvText(text);
}

export function buildCsvTemplate() {
  return IMPORT_COLUMNS.map(c => c).join(',') + '\n' +
    'Sample Product,SKU-001,1234567890123,Electronics,29.99,25.00,15.00,100,10,Supplier Name,Brand Co.,New,Product description,Shelf A1,365,https://example.com/img.jpg,No';
}

export async function shareCsvTemplate() {
  const csv = buildCsvTemplate();
  const path = `${RNFS.CachesDirectoryPath}/products_import_template.csv`;
  await RNFS.writeFile(path, csv, 'utf8');
  await Share.open({ url: `file://${path}`, type: 'text/csv', failOnCancel: false });
}
