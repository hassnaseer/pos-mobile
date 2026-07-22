import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { pick, types, isCancel } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import apiClient from '../../../../services/api/globalApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { showToast } from '../../../../utils/toast';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

// Each entity maps to a real `POST /admin/<entity>/import` endpoint (JSON `{ rows }`).
// There's no generic `/admin/bulk/*` controller, so CSV parsing and export are done
// client-side. `exportFields` omits write-only columns (staff passwords are never exported).
const ALL_ENTITIES = [
  { value: 'products',  label: 'Products',  list: '/admin/products',         import: '/admin/products/import',         fields: ['name', 'sku', 'price', 'costPrice', 'category', 'stock'], permission: PERMISSIONS.MANAGE_PRODUCTS },
  { value: 'customers', label: 'Customers', list: '/admin/customers',        import: '/admin/customers/import',        fields: ['name', 'email', 'phone', 'address'],                      permission: PERMISSIONS.MANAGE_CUSTOMERS },
  { value: 'patients',  label: 'Patients',  list: '/admin/medical/patients', import: '/admin/medical/patients/import', fields: ['name', 'phone', 'email', 'dateOfBirth', 'gender', 'address'], permission: PERMISSIONS.ACCESS_MEDICAL },
  { value: 'staff',     label: 'Staff',     list: '/admin/staff',            import: '/admin/staff/import',            fields: ['fullName', 'email', 'phone', 'role', 'password'], exportFields: ['fullName', 'email', 'phoneNumber', 'role'], permission: PERMISSIONS.MANAGE_STAFF },
];

// Minimal CSV parser — handles quoted fields and embedded commas.
const parseCsv = text => {
  const lines = String(text).split(/\r?\n/).filter(l => l.trim().length);
  if (!lines.length) return { headers: [], rows: [] };
  const splitLine = line => {
    const out = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(v => v.trim());
  };
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(l => {
    const vals = splitLine(l);
    return headers.reduce((o, h, i) => { o[h] = vals[i] ?? ''; return o; }, {});
  });
  return { headers, rows };
};

const toCsv = (fields, records) => {
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [fields.join(','), ...records.map(r => fields.map(f => esc(r[f])).join(','))].join('\n') + '\n';
};

export default function BulkOperationsScreen() {
  const perms = usePermissions();
  const entities = useMemo(() => ALL_ENTITIES.filter(e => perms.can(e.permission)), [perms]);

  const [entity, setEntity] = useState(entities[0]?.value ?? 'products');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);

  const info = entities.find(e => e.value === entity) ?? ALL_ENTITIES[0];

  const shareCsv = async (filename, content) => {
    const path = `${RNFS.CachesDirectoryPath}/${filename}`;
    await RNFS.writeFile(path, content, 'utf8');
    await Share.open({ url: `file://${path}`, type: 'text/csv', filename }).catch(() => {});
  };

  const downloadTemplate = async () => {
    try { await shareCsv(`${entity}-import-template.csv`, info.fields.join(',') + '\n'); }
    catch { showToast.error('Could not create template'); }
  };

  // No backend export endpoint exists — build the CSV from the entity list instead.
  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await apiClient.get(info.list);
      const raw = r?.data ?? r ?? [];
      const list = Array.isArray(raw) ? raw : (raw.data ?? raw.items ?? []);
      if (!list.length) { showToast.error(`No ${info.label.toLowerCase()} to export`); return; }
      await shareCsv(`${entity}-export-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(info.exportFields ?? info.fields, list));
      showToast.success(`${info.label} exported`);
    } catch { showToast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const handleImport = async () => {
    let picked;
    try {
      [picked] = await pick({ type: [types.csv, types.plainText, types.allFiles] });
    } catch (e) { if (!isCancel(e)) showToast.error('Could not pick file'); return; }
    if (!picked?.uri) return;

    setImporting(true); setResult(null);
    try {
      const text = await RNFS.readFile(picked.uri, 'utf8');
      const { rows } = parseCsv(text);
      if (!rows.length) { showToast.error('CSV has no data rows'); return; }
      const res = await apiClient.post(info.import, { rows });
      const data = res?.data ?? res ?? {};
      setResult({
        success: data.success ?? data.imported ?? rows.length,
        failed: data.failed ?? 0,
        errors: data.errors ?? [],
      });
    } catch (e) {
      showToast.error(typeof e === 'string' ? e : 'Import failed');
    } finally { setImporting(false); }
  };

  if (!entities.length) {
    return <View style={s.center}><Text style={s.muted}>You don't have permission to import or export data.</Text></View>;
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={s.title}>Bulk Operations</Text>
      <Text style={s.sub}>Import or export data via CSV for rapid batch updates</Text>

      <View style={s.card}>
        <Text style={s.label}>Data Type</Text>
        <InlinePicker
          options={entities.map(e => ({ id: e.value, name: e.label }))}
          value={entity}
          onSelect={v => { setEntity(v); setResult(null); }}
          allowNone={false}
        />
        <Text style={[s.label, { marginTop: 12 }]}>Expected CSV columns</Text>
        <View style={s.pills}>
          {info.fields.map(f => <View key={f} style={s.pill}><Text style={s.pillText}>{f}</Text></View>)}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>⬆️  Import</Text>
        <Text style={s.cardDesc}>Upload a CSV file to create records in bulk.</Text>
        <TouchableOpacity onPress={downloadTemplate}><Text style={s.link}>Download template CSV</Text></TouchableOpacity>
        <TouchableOpacity style={s.primaryBtn} onPress={handleImport} disabled={importing}>
          {importing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.primaryBtnText}>Choose CSV File</Text>}
        </TouchableOpacity>

        {result && (
          <View style={s.resultBox}>
            <Text style={s.resultOk}>✓ {result.success} records imported</Text>
            {result.failed > 0 && (
              <View style={s.resultErr}>
                <Text style={s.resultErrTitle}>⚠ {result.failed} records failed</Text>
                {result.errors.slice(0, 5).map((err, i) => <Text key={i} style={s.errLine}>{String(err)}</Text>)}
                {result.errors.length > 5 && <Text style={s.errLine}>…and {result.errors.length - 5} more</Text>}
              </View>
            )}
          </View>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>⬇️  Export</Text>
        <Text style={s.cardDesc}>Download all {info.label.toLowerCase()} as a CSV you can edit and re-import.</Text>
        <TouchableOpacity style={s.outlineBtn} onPress={handleExport} disabled={exporting}>
          {exporting ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={s.outlineBtnText}>Export {info.label} CSV</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f4f6f9' },
  muted: { color: '#94a3b8', fontFamily: 'Outfit-Regular', textAlign: 'center' },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  sub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2, marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#0f172a', marginBottom: 4 },
  cardDesc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#64748b', marginBottom: 10 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#475569' },
  link: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginBottom: 10 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  outlineBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  outlineBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  resultBox: { marginTop: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  resultOk: { backgroundColor: '#f0fdf4', color: '#15803d', fontFamily: 'Outfit-Medium', fontSize: 13, padding: 10 },
  resultErr: { backgroundColor: '#fef2f2', padding: 10 },
  resultErrTitle: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 13, marginBottom: 4 },
  errLine: { color: '#ef4444', fontSize: 11, fontFamily: 'Outfit-Regular', marginLeft: 8 },
});
