import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pick, types, isCancel } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import apiClient, { BASE_URL } from '../../../../services/api/globalApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { showToast } from '../../../../utils/toast';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';

const ALL_ENTITIES = [
  { value: 'patients',  label: 'Patients',  fields: ['name', 'phone', 'email', 'dateOfBirth', 'gender', 'address'], permission: PERMISSIONS.ACCESS_MEDICAL },
  { value: 'staff',     label: 'Staff',     fields: ['name', 'email', 'phone', 'role', 'department'],               permission: PERMISSIONS.MANAGE_STAFF },
  { value: 'products',  label: 'Products',  fields: ['name', 'sku', 'price', 'costPrice', 'category', 'stock'],     permission: PERMISSIONS.MANAGE_PRODUCTS },
  { value: 'customers', label: 'Customers', fields: ['name', 'email', 'phone', 'address'],                          permission: PERMISSIONS.MANAGE_CUSTOMERS },
];

export default function BulkOperationsScreen() {
  const perms = usePermissions();
  const entities = useMemo(
    () => ALL_ENTITIES.filter(e => !e.permission || perms.can(e.permission)),
    [perms],
  );

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await apiClient.get(`/admin/bulk/${entity}/export`);
      const text = typeof csv === 'string' ? csv : (csv?.data ?? '');
      if (!text) { showToast.error('Export failed'); return; }
      await shareCsv(`${entity}-export-${new Date().toISOString().slice(0, 10)}.csv`, text);
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
      const token = await AsyncStorage.getItem('authToken');
      const body = new FormData();
      body.append('file', { uri: picked.uri, type: picked.type ?? 'text/csv', name: picked.name ?? `${entity}.csv` });
      const res = await fetch(`${BASE_URL}/admin/bulk/${entity}/import`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body,
      });
      const j = await res.json();
      const data = j.data ?? j;
      setResult(data);
      if (data.success > 0) showToast.success(`${data.success} records imported`);
      if (data.failed > 0) showToast.error(`${data.failed} records failed`);
    } catch { showToast.error('Import failed'); }
    finally { setImporting(false); }
  };

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

      {/* Import */}
      <View style={s.card}>
        <Text style={s.cardTitle}>⬆️  Import</Text>
        <Text style={s.cardDesc}>Upload a CSV file to create or update records in bulk.</Text>
        <TouchableOpacity onPress={downloadTemplate}><Text style={s.link}>Download template CSV</Text></TouchableOpacity>
        <TouchableOpacity style={s.primaryBtn} onPress={handleImport} disabled={importing}>
          {importing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.primaryBtnText}>Choose CSV File</Text>}
        </TouchableOpacity>

        {result && (
          <View style={s.resultBox}>
            <Text style={s.resultOk}>✓ {result.success ?? 0} records imported</Text>
            {result.failed > 0 && (
              <View style={s.resultErr}>
                <Text style={s.resultErrTitle}>⚠ {result.failed} records failed</Text>
                {(result.errors ?? []).slice(0, 5).map((err, i) => <Text key={i} style={s.errLine}>{err}</Text>)}
                {(result.errors ?? []).length > 5 && <Text style={s.errLine}>…and {result.errors.length - 5} more</Text>}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Export */}
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
