import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView, Share, Image, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types, isCancel } from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { BASE_URL } from '../../../../services/api/globalApi';
import { useMedicalPatientsInfinite, flattenPages } from '../../../../services/api/posApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const uploadPatientFile = async (file, fallbackMime) => {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: file.uri, type: file.type ?? fallbackMime, name: file.name ?? file.fileName ?? 'file' });
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.data?.url ?? json.url ?? '';
};

const INVOICE_STATUSES = ['Draft', 'Paid', 'Partially Paid'];
const INV_STATUS_COLOR = {
  Paid: { bg: '#dcfce7', text: '#15803d' },
  'Partially Paid': { bg: '#dbeafe', text: '#1d4ed8' },
  Draft: { bg: '#f3f4f6', text: '#4b5563' },
};
const EMPTY_INVOICE = { lineItems: [{ description: '', amount: '' }], notes: '', status: 'Draft', applyTax: false, taxRate: '', installmentsEnabled: false, installmentCount: 2, installmentRows: [] };

function generateInstallmentRows(count, total, existingRows) {
  const base = parseFloat((total / count).toFixed(2));
  return Array.from({ length: count }, (_, i) => ({
    amount: i === count - 1 ? parseFloat((total - base * (count - 1)).toFixed(2)) : base,
    dueDate: existingRows[i]?.dueDate ?? '',
  }));
}

function MedicalInvoicesSheet({ patient, onClose }) {
  const qc = useQueryClient();
  const { fmt: fmtMoney } = useCurrency();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [form, setForm] = useState(EMPTY_INVOICE);
  const [expanded, setExpanded] = useState({});
  const [installmentsBySInvoice, setInstallmentsByInvoice] = useState({});
  const [installmentsLoading, setInstallmentsLoading] = useState({});

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['medical-invoices', patient?.id],
    queryFn: async () => { const r = await apiClient.get(`/admin/medical/invoices?patientId=${patient.id}`); return r?.data ?? r ?? []; },
    enabled: !!patient,
  });
  const invoices = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const save = useMutation({
    mutationFn: async data => {
      const res = editingInvoice
        ? await apiClient.patch(`/admin/medical/invoices/${editingInvoice.id}`, data)
        : await apiClient.post('/admin/medical/invoices', { ...data, patientId: patient.id });
      const saved = res?.data ?? res;
      if (form.installmentsEnabled && form.installmentRows.length > 0) {
        await apiClient.post(`/admin/medical/invoices/${saved.id}/installments`, {
          installments: form.installmentRows.map((r, i) => ({ installmentNumber: i + 1, amount: r.amount, dueDate: r.dueDate })),
        });
      }
      return saved;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['medical-invoices', patient.id] }); setCreateOpen(false); },
    onError: () => Alert.alert('Error', 'Failed to save invoice'),
  });
  const removeInvoice = useMutation({
    mutationFn: id => apiClient.delete(`/admin/medical/invoices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-invoices', patient.id] }),
  });
  const payInstallment = useMutation({
    mutationFn: ({ invoiceId, installmentId }) => apiClient.patch(`/admin/medical/invoices/${invoiceId}/installments/${installmentId}/pay`, {}),
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: ['medical-invoices', patient.id] });
      setInstallmentsByInvoice(prev => ({ ...prev, [invoiceId]: undefined }));
    },
  });

  const invSubtotal = form.lineItems.reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0);
  const taxRateNum = parseFloat(form.taxRate) || 0;
  const invTax = form.applyTax ? parseFloat(((invSubtotal * taxRateNum) / 100).toFixed(2)) : 0;
  const invTotal = invSubtotal + invTax;

  const openCreate = () => { setEditingInvoice(null); setForm(EMPTY_INVOICE); setCreateOpen(true); };
  const openEdit = inv => {
    setEditingInvoice(inv);
    const hasTax = Number(inv.taxRate) > 0;
    setForm({
      lineItems: inv.lineItems?.length ? inv.lineItems.map(l => ({ description: l.description, amount: String(l.amount) })) : [{ description: '', amount: '' }],
      notes: inv.notes ?? '', status: inv.status, applyTax: hasTax, taxRate: hasTax ? String(inv.taxRate) : '',
      installmentsEnabled: inv.installmentsEnabled ?? false, installmentCount: 2, installmentRows: [],
    });
    setCreateOpen(true);
  };
  const handleSave = () => {
    const validItems = form.lineItems.filter(li => li.description.trim());
    if (!validItems.length) { Alert.alert('Error', 'Add at least one line item with a description.'); return; }
    if (form.installmentsEnabled && form.installmentRows.some(r => !r.dueDate)) { Alert.alert('Error', 'Set a due date for all installments.'); return; }
    save.mutate({
      lineItems: validItems.map(l => ({ description: l.description, amount: parseFloat(l.amount) || 0 })),
      notes: form.notes, status: form.status, taxRate: form.applyTax ? taxRateNum : 0,
    });
  };
  const toggleInstallments = async invoiceId => {
    setExpanded(p => ({ ...p, [invoiceId]: !p[invoiceId] }));
    if (!installmentsBySInvoice[invoiceId]) {
      setInstallmentsLoading(p => ({ ...p, [invoiceId]: true }));
      try {
        const r = await apiClient.get(`/admin/medical/invoices/${invoiceId}/installments`);
        setInstallmentsByInvoice(prev => ({ ...prev, [invoiceId]: r?.data ?? r ?? [] }));
      } finally { setInstallmentsLoading(p => ({ ...p, [invoiceId]: false })); }
    }
  };
  const shareInvoice = inv => {
    const sym = inv.currency ? `${inv.currency} ` : '';
    const lines = (inv.lineItems ?? []).map(l => `  ${l.description}: ${sym}${Number(l.amount).toFixed(2)}`).join('\n');
    const msg = `Medical Invoice — ${patient.name}\nStatus: ${inv.status}\nDate: ${new Date(inv.createdAt).toLocaleDateString()}\n\n${lines}\n\nSubtotal: ${sym}${Number(inv.subtotal).toFixed(2)}${Number(inv.taxRate) > 0 ? `\nTax (${Number(inv.taxRate)}%): ${sym}${Number(inv.taxAmount).toFixed(2)}` : ''}\nTotal: ${sym}${Number(inv.total).toFixed(2)}${inv.notes ? `\n\nNotes: ${inv.notes}` : ''}`;
    Share.share({ message: msg, title: `Medical Invoice — ${patient.name}` });
  };

  return (
    <Modal visible={!!patient} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetBg}>
        <View style={styles.sheetCard}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{patient?.name} — Invoices</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.newInvoiceBtn} onPress={openCreate}><Text style={styles.newInvoiceBtnText}>+ New Invoice</Text></TouchableOpacity>
          {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
              {invoices.length === 0 ? <Text style={styles.empty}>No invoices yet.</Text> : invoices.map(inv => {
                const badge = INV_STATUS_COLOR[inv.status] ?? INV_STATUS_COLOR.Draft;
                return (
                  <View key={inv.id} style={styles.invoiceCard}>
                    <View style={styles.invoiceTop}>
                      <View style={{ flex: 1 }}>
                        <View style={[styles.badge, { backgroundColor: badge.bg }]}><Text style={[styles.badgeText, { color: badge.text }]}>{inv.status}</Text></View>
                        <Text style={styles.invoiceTotal}>{fmtMoney(Number(inv.total))}</Text>
                        {Number(inv.taxRate) > 0 && <Text style={styles.invoiceSub}>Subtotal {fmtMoney(Number(inv.subtotal))} + Tax {Number(inv.taxRate)}%</Text>}
                        <Text style={styles.invoiceDate}>{new Date(inv.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <View style={{ gap: 6 }}>
                        <TouchableOpacity onPress={() => shareInvoice(inv)}><Text style={styles.iconBtn}>Share</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => openEdit(inv)}><Text style={styles.iconBtn}>Edit</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => Alert.alert('Delete Invoice', 'Delete this invoice?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeInvoice.mutate(inv.id) }])}><Text style={[styles.iconBtn, { color: '#dc2626' }]}>Delete</Text></TouchableOpacity>
                      </View>
                    </View>
                    {inv.installmentsEnabled && (
                      <View style={{ marginTop: 8 }}>
                        <TouchableOpacity onPress={() => toggleInstallments(inv.id)}>
                          <Text style={styles.expandLink}>{expanded[inv.id] ? '▲ Hide' : '▼ Show'} installments</Text>
                        </TouchableOpacity>
                        {expanded[inv.id] && (
                          installmentsLoading[inv.id] ? <ActivityIndicator size="small" color={colors.primary} /> :
                          (installmentsBySInvoice[inv.id] ?? []).map(inst => (
                            <View key={inst.id} style={styles.instRow}>
                              <Text style={styles.instText}>#{inst.installmentNumber} · {fmtMoney(Number(inst.amount))}{inst.dueDate ? ` · ${new Date(inst.dueDate).toLocaleDateString()}` : ''}</Text>
                              {inst.status === 'Paid' ? (
                                <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>Paid</Text></View>
                              ) : (
                                <TouchableOpacity style={styles.markPaidBtn} onPress={() => payInstallment.mutate({ invoiceId: inv.id, installmentId: inst.id })}>
                                  <Text style={styles.markPaidText}>Mark Paid</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Modal visible={createOpen} animationType="slide" transparent>
            <View style={styles.modalBg}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{editingInvoice ? 'Edit Invoice' : 'New Invoice'}</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.label}>Line Items</Text>
                  {form.lineItems.map((li, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <TextInput style={[styles.input, { flex: 2 }]} placeholder="Description" placeholderTextColor="#999" value={li.description}
                        onChangeText={v => setForm(f => ({ ...f, lineItems: f.lineItems.map((x, i) => i === idx ? { ...x, description: v } : x) }))} />
                      <TextInput style={[styles.input, { flex: 1 }]} placeholder="Amount" placeholderTextColor="#999" keyboardType="decimal-pad" value={li.amount}
                        onChangeText={v => setForm(f => ({ ...f, lineItems: f.lineItems.map((x, i) => i === idx ? { ...x, amount: v } : x) }))} />
                      <TouchableOpacity disabled={form.lineItems.length === 1} onPress={() => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }))}>
                        <Text style={{ color: form.lineItems.length === 1 ? '#d1d5db' : '#ef4444', fontSize: 18 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addLineBtn} onPress={() => setForm(f => ({ ...f, lineItems: [...f.lineItems, { description: '', amount: '' }] }))}>
                    <Text style={styles.addLineBtnText}>+ Add Line</Text>
                  </TouchableOpacity>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Apply Tax</Text>
                    <TouchableOpacity style={[styles.toggle, form.applyTax && styles.toggleOn]} onPress={() => setForm(f => ({ ...f, applyTax: !f.applyTax }))}>
                      <Text style={[styles.toggleText, form.applyTax && styles.toggleTextOn]}>{form.applyTax ? 'Yes' : 'No'}</Text>
                    </TouchableOpacity>
                  </View>
                  {form.applyTax && (
                    <TextInput style={styles.input} placeholder="Tax rate %" placeholderTextColor="#999" keyboardType="decimal-pad" value={form.taxRate} onChangeText={v => setForm(f => ({ ...f, taxRate: v }))} />
                  )}

                  <View style={styles.summaryBox}>
                    <View style={styles.summaryLine}><Text style={styles.invSummaryLabel}>Subtotal</Text><Text style={styles.invSummaryValue}>{invSubtotal.toFixed(2)}</Text></View>
                    {form.applyTax && <View style={styles.summaryLine}><Text style={styles.invSummaryLabel}>Tax ({taxRateNum}%)</Text><Text style={styles.invSummaryValue}>{invTax.toFixed(2)}</Text></View>}
                    <View style={[styles.summaryLine, { borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 4, marginTop: 4 }]}><Text style={styles.summaryLabelBold}>Total</Text><Text style={styles.summaryValueBold}>{invTotal.toFixed(2)}</Text></View>
                  </View>

                  <Text style={styles.label}>Status</Text>
                  <View style={styles.chips}>
                    {INVOICE_STATUSES.map(st => (
                      <TouchableOpacity key={st} style={[styles.chip, form.status === st && styles.chipActive]} onPress={() => setForm(f => ({ ...f, status: st }))}><Text style={[styles.chipText, form.status === st && styles.chipTextActive]}>{st}</Text></TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Notes</Text>
                  <TextInput style={styles.input} placeholder="Optional notes…" placeholderTextColor="#999" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} />

                  <View style={styles.installBox}>
                    <View style={styles.switchRow}>
                      <Text style={styles.switchLabel}>Enable Installments</Text>
                      <TouchableOpacity style={[styles.toggle, form.installmentsEnabled && styles.toggleOn]} onPress={() => {
                        const enabled = !form.installmentsEnabled;
                        const rows = enabled && form.installmentRows.length === 0 ? generateInstallmentRows(form.installmentCount, invTotal, []) : form.installmentRows;
                        setForm(f => ({ ...f, installmentsEnabled: enabled, installmentRows: rows }));
                      }}>
                        <Text style={[styles.toggleText, form.installmentsEnabled && styles.toggleTextOn]}>{form.installmentsEnabled ? 'Yes' : 'No'}</Text>
                      </TouchableOpacity>
                    </View>
                    {form.installmentsEnabled && (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Text style={styles.label}>Count</Text>
                          <TextInput style={[styles.input, { width: 60 }]} keyboardType="number-pad" value={String(form.installmentCount)}
                            onChangeText={v => { const count = Math.max(2, parseInt(v, 10) || 2); setForm(f => ({ ...f, installmentCount: count, installmentRows: generateInstallmentRows(count, invTotal, f.installmentRows) })); }} />
                        </View>
                        {form.installmentRows.map((row, i) => (
                          <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, color: '#6b7280', width: 20 }}>#{i + 1}</Text>
                            <TextInput style={[styles.input, { flex: 1 }]} keyboardType="decimal-pad" value={String(row.amount)}
                              onChangeText={v => setForm(f => ({ ...f, installmentRows: f.installmentRows.map((r, idx) => idx === i ? { ...r, amount: parseFloat(v) || 0 } : r) }))} />
                            <DatePicker
                              value={row.dueDate}
                              onDateChange={v => setForm(f => ({ ...f, installmentRows: f.installmentRows.map((r, idx) => idx === i ? { ...r, dueDate: v } : r) }))}
                              placeholder="Due date"
                              style={{ flex: 1, marginBottom: 0 }}
                            />
                          </View>
                        ))}
                        <Text style={styles.hintText}>Invoice will be marked "Partially Paid" once installments are saved.</Text>
                      </>
                    )}
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={save.isPending}>
                    {save.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editingInvoice ? 'Update Invoice' : 'Create Invoice'}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

const useCreatePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: data => apiClient.post('/admin/medical/patients', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-patients'] }),
  });
};

const useUpdatePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => apiClient.patch(`/admin/medical/patients/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-patients'] }),
  });
};

const useDeletePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: id => apiClient.delete(`/admin/medical/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medical-patients'] }),
  });
};

const EMPTY = { name: '', phone: '', email: '', age: '', gender: '', bloodType: '', address: '', medicalHistory: '', allergies: '', notes: '', documents: [], images: [] };
const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
let fileIdSeq = 0;
const nextFileId = () => `f${++fileIdSeq}`;

const PatientsScreen = () => {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [invoicePatient, setInvoicePatient] = useState(null);
  const [viewerPatient, setViewerPatient] = useState(null);
  const [viewerImage, setViewerImage] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const {
    data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useMedicalPatientsInfinite(search ? { search } : {});
  const patients = flattenPages(data);
  const { mutateAsync: create, isPending: creating } = useCreatePatient();
  const { mutateAsync: update, isPending: updating } = useUpdatePatient();
  const { mutate: remove } = useDeletePatient();

  const calcAge = dob => {
    if (!dob) return '—';
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return isNaN(y) ? '—' : y;
  };

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = p => {
    setEditing(p);
    setForm({
      name: p.name ?? '', phone: p.phone ?? '', email: p.email ?? '',
      age: String(calcAge(p.dateOfBirth)), gender: p.gender ?? '', bloodType: p.bloodType ?? '',
      address: p.address ?? '', medicalHistory: p.medicalHistory ?? '',
      allergies: p.allergies ?? '', notes: p.notes ?? '',
      documents: (p.documents ?? []).map(d => ({ id: nextFileId(), url: d.url, name: d.name ?? 'Document', isNew: false })),
      images: (p.images ?? []).map(i => ({ id: nextFileId(), url: i.url ?? i.name, name: i.name ?? 'Image', isNew: false })),
    });
    setShowModal(true);
  };

  const pickDocument = async () => {
    try {
      const picked = await pick({ type: [types.pdf], allowMultiSelection: true });
      const entries = picked.map(f => ({ id: nextFileId(), file: f, name: f.name ?? 'Document.pdf', isNew: true }));
      setForm(p => ({ ...p, documents: [...p.documents, ...entries] }));
    } catch (e) {
      if (!isCancel(e)) Alert.alert('Error', 'Failed to pick file');
    }
  };

  const pickImages = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 0 }, res => {
      if (res.didCancel || !res.assets?.length) return;
      const entries = res.assets.map(a => ({ id: nextFileId(), file: a, name: a.fileName ?? 'Image.jpg', isNew: true }));
      setForm(p => ({ ...p, images: [...p.images, ...entries] }));
    });
  };

  const removeDocument = id => setForm(p => ({ ...p, documents: p.documents.filter(d => d.id !== id) }));
  const removeImage = id => setForm(p => ({ ...p, images: p.images.filter(i => i.id !== id) }));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    const ageNum = parseInt(form.age, 10) || 0;
    setUploadingFiles(true);
    try {
      const [documentUrls, imageUrls] = await Promise.all([
        Promise.all(form.documents.map(d => d.isNew ? uploadPatientFile(d.file, 'application/pdf') : d.url)),
        Promise.all(form.images.map(i => i.isNew ? uploadPatientFile(i.file, 'image/jpeg') : i.url)),
      ]);
      const payload = {
        name: form.name, phone: form.phone, email: form.email,
        gender: form.gender, bloodType: form.bloodType || undefined, address: form.address,
        medicalHistory: form.medicalHistory, allergies: form.allergies, notes: form.notes,
        documentUrls, imageUrls,
        ...(ageNum > 0 ? { dateOfBirth: `${new Date().getFullYear() - ageNum}-01-01` } : {}),
      };
      if (editing) await update({ id: editing.id, ...payload });
      else await create(payload);
      setShowModal(false);
    } catch { Alert.alert('Error', 'Save failed'); }
    finally { setUploadingFiles(false); }
  };

  const handleDelete = p => Alert.alert('Delete Patient', `Delete "${p.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove(p.id) },
  ]);

  const isSaving = creating || updating;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={patients}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 16 }} /> : null}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No patients yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.name ?? 'P')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowSub}>
                {[item.gender, calcAge(item.dateOfBirth) !== '—' ? `${calcAge(item.dateOfBirth)} yrs` : null, item.bloodType, item.phone].filter(Boolean).join(' · ')}
              </Text>
              {item.medicalHistory ? <Text style={styles.rowSub} numberOfLines={1}>{item.medicalHistory}</Text> : null}
            </View>
            <View style={styles.rowActions}>
              {((item.documents?.length ?? 0) + (item.images?.length ?? 0)) > 0 && (
                <TouchableOpacity style={styles.docsBtn} onPress={() => setViewerPatient(item)}>
                  <Text style={styles.docsText}>📎 {(item.documents?.length ?? 0) + (item.images?.length ?? 0)}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.invBtn} onPress={() => setInvoicePatient(item)}>
                <Text style={styles.invText}>Inv</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rxBtn} onPress={() => navigation.navigate('PatientPrescriptions', { patientId: item.id, patientName: item.name })}>
                <Text style={styles.rxText}>Rx</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.delText}>Del</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Patient' : 'New Patient'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: 'name', label: 'Full Name *' },
                { key: 'age', label: 'Age', keyboard: 'number-pad' },
                { key: 'phone', label: 'Phone', keyboard: 'phone-pad' },
                { key: 'email', label: 'Email', keyboard: 'email-address' },
                { key: 'address', label: 'Address' },
                { key: 'medicalHistory', label: 'Medical History / Conditions' },
                { key: 'allergies', label: 'Allergies' },
                { key: 'notes', label: 'Notes' },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={set(f.key)}
                    keyboardType={f.keyboard ?? 'default'}
                    placeholder={f.label.replace(' *', '')}
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </View>
              ))}
              <View style={styles.field}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.chips}>
                  {GENDERS.map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.chip, form.gender === g && styles.chipActive]}
                      onPress={() => setForm(p => ({ ...p, gender: g }))}
                    >
                      <Text style={[styles.chipText, form.gender === g && styles.chipTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Blood Type</Text>
                <View style={styles.chips}>
                  {BLOOD_GROUPS.map(bg => (
                    <TouchableOpacity
                      key={bg}
                      style={[styles.chip, form.bloodType === bg && styles.chipActive]}
                      onPress={() => setForm(p => ({ ...p, bloodType: bg }))}
                    >
                      <Text style={[styles.chipText, form.bloodType === bg && styles.chipTextActive]}>{bg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Documents & Files</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                  <Text style={styles.uploadBtnText}>📄 Upload PDFs</Text>
                </TouchableOpacity>
                {form.documents.map(d => (
                  <View key={d.id} style={styles.fileRow}>
                    <Text style={styles.fileRowText} numberOfLines={1}>📄 {d.name}</Text>
                    <TouchableOpacity onPress={() => removeDocument(d.id)}>
                      <Text style={styles.fileRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>X-Rays / Medical Images</Text>
                <TouchableOpacity style={[styles.uploadBtn, { borderColor: '#7c3aed' }]} onPress={pickImages}>
                  <Text style={[styles.uploadBtnText, { color: '#7c3aed' }]}>🩻 Upload Images</Text>
                </TouchableOpacity>
                {form.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {form.images.map(img => (
                      <View key={img.id} style={styles.thumbWrap}>
                        <Image source={{ uri: img.isNew ? img.file.uri : img.url }} style={styles.thumb} />
                        <TouchableOpacity style={styles.thumbRemove} onPress={() => removeImage(img.id)}>
                          <Text style={styles.thumbRemoveText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving || uploadingFiles}>
                {(isSaving || uploadingFiles) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {invoicePatient && <MedicalInvoicesSheet patient={invoicePatient} onClose={() => setInvoicePatient(null)} />}

      {/* Documents / X-ray viewer */}
      <Modal visible={!!viewerPatient} animationType="slide" transparent onRequestClose={() => setViewerPatient(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.viewerHeader}>
              <Text style={styles.modalTitle}>{viewerPatient?.name}'s Files</Text>
              <TouchableOpacity onPress={() => setViewerPatient(null)}>
                <Text style={styles.viewerCloseX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(viewerPatient?.documents?.length ?? 0) > 0 && (
                <View style={styles.field}>
                  <Text style={styles.label}>Documents</Text>
                  {viewerPatient.documents.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={styles.fileRow}
                      onPress={() => Linking.openURL(d.url).catch(() => Alert.alert('Error', 'Cannot open this file'))}
                    >
                      <Text style={styles.fileRowText} numberOfLines={1}>📄 {d.name}</Text>
                      <Text style={styles.fileOpenIcon}>↗</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {(viewerPatient?.images?.length ?? 0) > 0 && (
                <View style={styles.field}>
                  <Text style={styles.label}>X-Rays / Medical Images</Text>
                  <View style={styles.thumbGrid}>
                    {viewerPatient.images.map(img => (
                      <TouchableOpacity key={img.id} onPress={() => setViewerImage(img.url ?? img.name)}>
                        <Image source={{ uri: img.url ?? img.name }} style={styles.gridThumb} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {((viewerPatient?.documents?.length ?? 0) + (viewerPatient?.images?.length ?? 0)) === 0 && (
                <Text style={styles.empty}>No files uploaded for this patient.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full-screen image preview */}
      <Modal visible={!!viewerImage} animationType="fade" transparent onRequestClose={() => setViewerImage(null)}>
        <TouchableOpacity style={styles.fullscreenBg} activeOpacity={1} onPress={() => setViewerImage(null)}>
          {viewerImage && <Image source={{ uri: viewerImage }} style={styles.fullscreenImage} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  searchInput: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: 'Outfit-Regular' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12, gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: colors.primary, fontFamily: 'Outfit-Bold', fontSize: 15 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 6 },
  invBtn: { backgroundColor: '#eff6ff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  invText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#1d4ed8' },
  rxBtn: { backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  rxText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#16a34a' },
  editBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  editText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  delText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#ef4444' },
  docsBtn: { backgroundColor: '#f3e8ff', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  docsText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#7c3aed' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 16 },
  viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewerCloseX: { fontSize: 20, color: colors.secondary, padding: 4, marginBottom: 16 },
  uploadBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  uploadBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  fileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  fileRowText: { flex: 1, fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  fileRemove: { fontSize: 15, color: '#ef4444', paddingLeft: 10 },
  fileOpenIcon: { fontSize: 15, color: colors.primary, paddingLeft: 10 },
  thumbWrap: { marginRight: 10, marginTop: 8 },
  thumb: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#f3f4f6' },
  thumbRemove: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  thumbRemoveText: { fontSize: 11, color: '#fff', fontFamily: 'Outfit-Bold' },
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  gridThumb: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#f3f4f6' },
  fullscreenBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  fullscreenImage: { width: '100%', height: '80%' },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.secondary },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
  // Invoice sheet
  sheetBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '92%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  closeX: { fontSize: 18, color: '#9ca3af', padding: 4 },
  newInvoiceBtn: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginTop: 10 },
  newInvoiceBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  invoiceCard: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, marginBottom: 10 },
  invoiceTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  invoiceTotal: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#0f172a', marginTop: 4 },
  invoiceSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  invoiceDate: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4 },
  iconBtn: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  expandLink: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  instRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, marginTop: 6 },
  instText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#374151' },
  paidBadge: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  paidBadgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#15803d' },
  markPaidBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  markPaidText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  addLineBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginBottom: 10 },
  addLineBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 6 },
  switchLabel: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151' },
  toggle: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  toggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#555' },
  toggleTextOn: { color: '#fff' },
  summaryBox: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 10 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  invSummaryLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  invSummaryValue: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#111827' },
  summaryLabelBold: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111827' },
  summaryValueBold: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111827' },
  installBox: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginTop: 10 },
  hintText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4 },
});

export default PatientsScreen;
