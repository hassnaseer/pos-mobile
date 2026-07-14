import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView, Switch, Share,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency } from '../../../../context/CurrencyContext';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'BDT', 'CAD', 'AUD', 'NZD', 'SGD', 'MYR', 'THB', 'JPY', 'CNY', 'KRW', 'TRY', 'ZAR', 'NGN'];
const INVOICE_STATUSES = ['Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue'];
const STATUS_COLOR = {
  Paid: { bg: '#dcfce7', text: '#15803d' },
  'Payment Submitted': { bg: '#dbeafe', text: '#1d4ed8' },
  'Partially Paid': { bg: '#f3e8ff', text: '#7c3aed' },
  Draft: { bg: '#f3f4f6', text: '#4b5563' },
};
const DEFAULT_STATUS_COLOR = { bg: '#fef3c7', text: '#b45309' };
const EMPTY = { name: '', contactPerson: '', email: '', phone: '', company: '', notes: '' };
const EMPTY_INVOICE = { lineItems: [{ description: '', amount: '' }], notes: '', status: 'Draft', applyTax: false, taxRate: '', currency: '', installmentsEnabled: false, installmentCount: 2, installmentRows: [], thirdPartyEnabled: false, thirdPartyPercentage: '' };

const useClients = () =>
  useQuery({
    queryKey: ['project-clients'],
    queryFn: async () => { const r = await apiClient.get('/admin/project-clients'); return r?.data ?? r ?? []; },
    staleTime: 30_000,
  });

const useProjectsForEarning = enabled =>
  useQuery({
    queryKey: ['projects-earning'],
    queryFn: async () => { const r = await apiClient.get('/admin/projects'); return r?.data ?? r ?? []; },
    enabled,
  });

const useInvoiceSummary = enabled =>
  useQuery({
    queryKey: ['client-invoice-summary'],
    queryFn: async () => { const r = await apiClient.get('/admin/project-clients/invoice-summary'); return r?.data ?? r ?? null; },
    enabled,
  });

const usePortalStatus = (clientId, enabled) =>
  useQuery({
    queryKey: ['portal-status', clientId],
    queryFn: async () => { const r = await apiClient.get(`/admin/project-clients/${clientId}/portal-status`); return r?.data ?? r ?? null; },
    enabled: enabled && !!clientId,
  });

function generateInstallmentRows(count, total, existingRows) {
  const base = parseFloat((total / count).toFixed(2));
  return Array.from({ length: count }, (_, i) => ({
    amount: i === count - 1 ? parseFloat((total - base * (count - 1)).toFixed(2)) : base,
    dueDate: existingRows[i]?.dueDate ?? '',
  }));
}

function PortalBadge({ clientId, canPortal }) {
  const { data: status } = usePortalStatus(clientId, canPortal);
  if (!status?.hasPortalAccess) return null;
  return <View style={s.portalBadge}><Text style={s.portalBadgeText}>Portal</Text></View>;
}

function InvoicesSheet({ client, onClose, canInvoice, fmtMoney, onRefreshSummary }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [form, setForm] = useState(EMPTY_INVOICE);
  const [expanded, setExpanded] = useState({});

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['client-invoices', client?.id],
    queryFn: async () => { const r = await apiClient.get(`/admin/project-clients/${client.id}/invoices`); return r?.data ?? r ?? []; },
    enabled: !!client,
  });
  const invoices = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const save = useMutation({
    mutationFn: data => editingInvoice
      ? apiClient.patch(`/admin/project-clients/${client.id}/invoices/${editingInvoice.id}`, data)
      : apiClient.post(`/admin/project-clients/${client.id}/invoices`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-invoices', client.id] }); setCreateOpen(false); onRefreshSummary(); },
    onError: () => Alert.alert('Error', 'Failed to save invoice'),
  });
  const removeInvoice = useMutation({
    mutationFn: id => apiClient.delete(`/admin/project-clients/${client.id}/invoices/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-invoices', client.id] }); onRefreshSummary(); },
  });
  const payInstallment = useMutation({
    mutationFn: ({ invoiceId, installmentId }) => apiClient.patch(`/admin/project-clients/${client.id}/invoices/${invoiceId}/installments/${installmentId}/pay`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-invoices', client.id] }); onRefreshSummary(); },
  });

  const invSubtotal = form.lineItems.reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0);
  const taxRateNum = parseFloat(form.taxRate) || 0;
  const invTax = form.applyTax ? parseFloat(((invSubtotal * taxRateNum) / 100).toFixed(2)) : 0;
  const invTotal = invSubtotal + invTax;
  const thirdPartyPctNum = parseFloat(form.thirdPartyPercentage) || 0;
  const invThirdParty = form.thirdPartyEnabled ? parseFloat(((invTotal * thirdPartyPctNum) / 100).toFixed(2)) : 0;

  const openCreate = () => { setEditingInvoice(null); setForm(EMPTY_INVOICE); setCreateOpen(true); };
  const openEdit = inv => {
    setEditingInvoice(inv);
    const hasTax = Number(inv.taxRate) > 0;
    setForm({
      lineItems: inv.lineItems?.length ? inv.lineItems.map(l => ({ description: l.description, amount: String(l.amount) })) : [{ description: '', amount: '' }],
      notes: inv.notes ?? '', status: inv.status, applyTax: hasTax, taxRate: hasTax ? String(inv.taxRate) : '',
      currency: inv.currency ?? '', installmentsEnabled: inv.installmentsEnabled ?? false,
      installmentCount: inv.installments?.length ?? 2,
      installmentRows: (inv.installments ?? []).map(i => ({ amount: Number(i.amount), dueDate: String(i.dueDate ?? '').slice(0, 10) })),
      thirdPartyEnabled: inv.thirdPartyEnabled ?? false, thirdPartyPercentage: inv.thirdPartyPercentage != null ? String(inv.thirdPartyPercentage) : '',
    });
    setCreateOpen(true);
  };
  const handleSaveInvoice = () => {
    const validItems = form.lineItems.filter(li => li.description.trim());
    if (!validItems.length) { Alert.alert('Error', 'Add at least one line item with a description.'); return; }
    if (form.installmentsEnabled && form.installmentRows.some(r => !r.dueDate)) { Alert.alert('Error', 'Set a due date for all installments.'); return; }
    save.mutate({
      lineItems: validItems.map(l => ({ description: l.description, amount: parseFloat(l.amount) || 0 })),
      notes: form.notes, status: form.status, taxRate: form.applyTax ? taxRateNum : 0,
      currency: form.currency || undefined, thirdPartyEnabled: form.thirdPartyEnabled,
      thirdPartyPercentage: form.thirdPartyEnabled ? thirdPartyPctNum : 0,
      installmentsEnabled: form.installmentsEnabled,
      installments: form.installmentsEnabled ? form.installmentRows.map((r, i) => ({ installmentNumber: i + 1, amount: r.amount, dueDate: r.dueDate })) : [],
    });
  };
  const toggleInstallments = enabled => {
    const rows = enabled ? generateInstallmentRows(form.installmentCount, invTotal, form.installmentRows) : [];
    setForm(f => ({ ...f, installmentsEnabled: enabled, installmentRows: rows }));
  };
  const shareInvoice = inv => {
    const sym = inv.currency ? `${inv.currency} ` : '';
    const lines = (inv.lineItems ?? []).map(l => `  ${l.description}: ${sym}${Number(l.amount).toFixed(2)}`).join('\n');
    const msg = `Invoice — ${client.name}\nStatus: ${inv.status}\nDate: ${new Date(inv.createdAt).toLocaleDateString()}\n\n${lines}\n\nSubtotal: ${sym}${Number(inv.subtotal).toFixed(2)}${Number(inv.taxRate) > 0 ? `\nTax (${Number(inv.taxRate)}%): ${sym}${Number(inv.taxAmount).toFixed(2)}` : ''}\nTotal: ${sym}${Number(inv.total).toFixed(2)}${inv.notes ? `\n\nNotes: ${inv.notes}` : ''}`;
    Share.share({ message: msg, title: `Invoice — ${client.name}` });
  };

  return (
    <Modal visible={!!client} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.sheetBg}>
        <View style={s.sheetCard}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{client?.name} — Invoices</Text>
            <TouchableOpacity onPress={onClose}><Text style={s.closeX}>✕</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={s.newInvoiceBtn} onPress={openCreate}><Text style={s.newInvoiceBtnText}>+ New Invoice</Text></TouchableOpacity>
          {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
              {invoices.length === 0 ? <Text style={s.empty}>No invoices yet.</Text> : invoices.map(inv => {
                const badge = STATUS_COLOR[inv.status] ?? DEFAULT_STATUS_COLOR;
                return (
                  <View key={inv.id} style={s.invoiceCard}>
                    <View style={s.invoiceTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                          <View style={[s.badge, { backgroundColor: badge.bg }]}><Text style={[s.badgeText, { color: badge.text }]}>{inv.status}</Text></View>
                          {inv.installmentsEnabled && <View style={s.installBadge}><Text style={s.installBadgeText}>{inv.installments?.length ?? 0} installments</Text></View>}
                        </View>
                        <Text style={s.invoiceTotal}>{inv.currency ? `${inv.currency} ` : ''}{Number(inv.total).toFixed(2)}</Text>
                        {Number(inv.taxRate) > 0 && <Text style={s.invoiceSub}>Subtotal {Number(inv.subtotal).toFixed(2)} + Tax {Number(inv.taxRate)}%</Text>}
                        {inv.thirdPartyEnabled && <Text style={s.invoiceSubAmber}>3rd party {Number(inv.thirdPartyPercentage)}%: -{Number(inv.thirdPartyAmount).toFixed(2)} · Net {(Number(inv.total) - Number(inv.thirdPartyAmount)).toFixed(2)}</Text>}
                        <Text style={s.invoiceDate}>{new Date(inv.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <View style={{ gap: 6 }}>
                        <TouchableOpacity onPress={() => shareInvoice(inv)}><Text style={s.iconBtn}>Share</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => openEdit(inv)}><Text style={s.iconBtn}>Edit</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => Alert.alert('Delete Invoice', 'Delete this invoice?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeInvoice.mutate(inv.id) }])}><Text style={[s.iconBtn, { color: '#dc2626' }]}>Delete</Text></TouchableOpacity>
                      </View>
                    </View>
                    {inv.installmentsEnabled && inv.installments?.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <TouchableOpacity onPress={() => setExpanded(p => ({ ...p, [inv.id]: !p[inv.id] }))}>
                          <Text style={s.expandLink}>{expanded[inv.id] ? '▲ Hide' : '▼ Show'} installments</Text>
                        </TouchableOpacity>
                        {expanded[inv.id] && inv.installments.map(inst => (
                          <View key={inst.id} style={s.instRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.instText}>#{inst.installmentNumber} · {inv.currency ? `${inv.currency} ` : ''}{Number(inst.amount).toFixed(2)}{inst.dueDate ? ` · ${new Date(inst.dueDate).toLocaleDateString()}` : ''}</Text>
                            </View>
                            {inst.status === 'Paid' ? (
                              <View style={s.paidBadge}><Text style={s.paidBadgeText}>Paid</Text></View>
                            ) : (
                              <TouchableOpacity style={s.markPaidBtn} onPress={() => payInstallment.mutate({ invoiceId: inv.id, installmentId: inst.id })}>
                                <Text style={s.markPaidText}>Mark Paid</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Modal visible={createOpen} animationType="slide" transparent>
            <View style={s.modalBg}>
              <View style={s.modalCard}>
                <Text style={s.modalTitle}>{editingInvoice ? 'Edit Invoice' : 'New Invoice'}</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={s.label}>Line Items</Text>
                  {form.lineItems.map((li, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <TextInput style={[s.input, { flex: 2 }]} placeholder="Description" placeholderTextColor="#999" value={li.description}
                        onChangeText={v => setForm(f => ({ ...f, lineItems: f.lineItems.map((x, i) => i === idx ? { ...x, description: v } : x) }))} />
                      <TextInput style={[s.input, { flex: 1 }]} placeholder="Amount" placeholderTextColor="#999" keyboardType="decimal-pad" value={li.amount}
                        onChangeText={v => setForm(f => ({ ...f, lineItems: f.lineItems.map((x, i) => i === idx ? { ...x, amount: v } : x) }))} />
                      <TouchableOpacity disabled={form.lineItems.length === 1} onPress={() => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }))}>
                        <Text style={{ color: form.lineItems.length === 1 ? '#d1d5db' : '#ef4444', fontSize: 18 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={s.addLineBtn} onPress={() => setForm(f => ({ ...f, lineItems: [...f.lineItems, { description: '', amount: '' }] }))}>
                    <Text style={s.addLineBtnText}>+ Add Line</Text>
                  </TouchableOpacity>

                  <View style={s.switchRow}>
                    <Text style={s.switchLabel}>Apply Tax</Text>
                    <Switch value={form.applyTax} onValueChange={v => setForm(f => ({ ...f, applyTax: v }))} trackColor={{ false: '#e5e7eb', true: colors.primary + '80' }} thumbColor={form.applyTax ? colors.primary : '#fff'} />
                  </View>
                  {form.applyTax && (
                    <TextInput style={s.input} placeholder="Tax rate %" placeholderTextColor="#999" keyboardType="decimal-pad" value={form.taxRate} onChangeText={v => setForm(f => ({ ...f, taxRate: v }))} />
                  )}

                  <View style={s.switchRow}>
                    <Text style={s.switchLabel}>3rd Party %</Text>
                    <Switch value={form.thirdPartyEnabled} onValueChange={v => setForm(f => ({ ...f, thirdPartyEnabled: v }))} trackColor={{ false: '#e5e7eb', true: colors.primary + '80' }} thumbColor={form.thirdPartyEnabled ? colors.primary : '#fff'} />
                  </View>
                  {form.thirdPartyEnabled && (
                    <>
                      <TextInput style={s.input} placeholder="3rd party %" placeholderTextColor="#999" keyboardType="decimal-pad" value={form.thirdPartyPercentage} onChangeText={v => setForm(f => ({ ...f, thirdPartyPercentage: v }))} />
                      <Text style={s.hintText}>Internal only — the client's total is unaffected; this is what you net after the 3rd party's cut.</Text>
                    </>
                  )}

                  <View style={s.summaryBox}>
                    <View style={s.summaryLine}><Text style={s.invSummaryLabel}>Subtotal</Text><Text style={s.invSummaryValue}>{invSubtotal.toFixed(2)}</Text></View>
                    {form.applyTax && <View style={s.summaryLine}><Text style={s.invSummaryLabel}>Tax ({taxRateNum}%)</Text><Text style={s.invSummaryValue}>{invTax.toFixed(2)}</Text></View>}
                    <View style={[s.summaryLine, { borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 4, marginTop: 4 }]}><Text style={s.summaryLabelBold}>Total (client owes)</Text><Text style={s.summaryValueBold}>{invTotal.toFixed(2)}</Text></View>
                    {form.thirdPartyEnabled && (
                      <>
                        <View style={s.summaryLine}><Text style={[s.invSummaryLabel, { color: '#b45309' }]}>3rd Party Cut ({thirdPartyPctNum}%)</Text><Text style={[s.invSummaryValue, { color: '#b45309' }]}>-{invThirdParty.toFixed(2)}</Text></View>
                        <View style={s.summaryLine}><Text style={[s.summaryLabelBold, { color: '#15803d' }]}>You Net</Text><Text style={[s.summaryValueBold, { color: '#15803d' }]}>{(invTotal - invThirdParty).toFixed(2)}</Text></View>
                      </>
                    )}
                  </View>

                  <Text style={s.label}>Currency</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[s.chip, !form.currency && s.chipActive]} onPress={() => setForm(f => ({ ...f, currency: '' }))}><Text style={[s.chipText, !form.currency && s.chipTextActive]}>Default</Text></TouchableOpacity>
                      {CURRENCY_OPTIONS.map(c => (
                        <TouchableOpacity key={c} style={[s.chip, form.currency === c && s.chipActive]} onPress={() => setForm(f => ({ ...f, currency: c }))}><Text style={[s.chipText, form.currency === c && s.chipTextActive]}>{c}</Text></TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={s.label}>Status</Text>
                  <View style={s.chips}>
                    {INVOICE_STATUSES.map(st => (
                      <TouchableOpacity key={st} style={[s.chip, form.status === st && s.chipActive]} onPress={() => setForm(f => ({ ...f, status: st }))}><Text style={[s.chipText, form.status === st && s.chipTextActive]}>{st}</Text></TouchableOpacity>
                    ))}
                  </View>

                  <Text style={s.label}>Notes</Text>
                  <TextInput style={s.input} placeholder="Optional notes…" placeholderTextColor="#999" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} />

                  <View style={s.installBox}>
                    <View style={s.switchRow}>
                      <Text style={s.switchLabel}>Split into installments</Text>
                      <Switch value={form.installmentsEnabled} onValueChange={toggleInstallments} trackColor={{ false: '#e5e7eb', true: colors.primary + '80' }} thumbColor={form.installmentsEnabled ? colors.primary : '#fff'} />
                    </View>
                    {form.installmentsEnabled && (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Text style={s.label}>Count</Text>
                          <TextInput style={[s.input, { width: 60 }]} keyboardType="number-pad" value={String(form.installmentCount)}
                            onChangeText={v => { const count = Math.max(2, parseInt(v, 10) || 2); setForm(f => ({ ...f, installmentCount: count, installmentRows: generateInstallmentRows(count, invTotal, f.installmentRows) })); }} />
                        </View>
                        {form.installmentRows.map((row, i) => (
                          <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, color: '#6b7280', width: 20 }}>#{i + 1}</Text>
                            <TextInput style={[s.input, { flex: 1 }]} keyboardType="decimal-pad" value={String(row.amount)}
                              onChangeText={v => setForm(f => ({ ...f, installmentRows: f.installmentRows.map((r, idx) => idx === i ? { ...r, amount: parseFloat(v) || 0 } : r) }))} />
                            <DatePicker
                              value={row.dueDate}
                              onDateChange={v => setForm(f => ({ ...f, installmentRows: f.installmentRows.map((r, idx) => idx === i ? { ...r, dueDate: v } : r) }))}
                              placeholder="Due date"
                              style={{ flex: 1, marginBottom: 0 }}
                            />
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                </ScrollView>
                <View style={s.modalActions}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setCreateOpen(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={s.saveBtn} onPress={handleSaveInvoice} disabled={save.isPending}>
                    {save.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>{editingInvoice ? 'Update Invoice' : 'Create Invoice'}</Text>}
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

const ProjectClientsScreen = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { fmt: fmtMoney } = useCurrency();
  const hasPortalPerm = user?.permissionCodes?.includes('access_client_portal') ?? false;
  const hasInvoicePerm = user?.permissionCodes?.includes('client_invoice') ?? false;
  const hasProjectsPerm = !user?.permissionCodes?.length || user.permissionCodes.includes('manage_projects');

  const { data: raw = [], isLoading, refetch } = useClients();
  const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const { data: summary } = useInvoiceSummary(hasInvoicePerm);
  const { data: projectsRaw = [] } = useProjectsForEarning(hasProjectsPerm);
  const projects = Array.isArray(projectsRaw) ? projectsRaw : (projectsRaw?.data ?? []);
  const totalCompanyEarning = projects.reduce((sum, p) => sum + (p.companyEarning ?? 0), 0);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [invoiceClient, setInvoiceClient] = useState(null);
  const [portalClient, setPortalClient] = useState(null);
  const [portalPassword, setPortalPassword] = useState('');
  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: data => editing
      ? apiClient.patch(`/admin/project-clients/${editing.id}`, data)
      : apiClient.post('/admin/project-clients', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-clients'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to save client'),
  });

  const remove = useMutation({
    mutationFn: id => apiClient.delete(`/admin/project-clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-clients'] }),
  });

  const grantPortal = useMutation({
    mutationFn: ({ id, email, password }) => apiClient.post(`/admin/project-clients/${id}/portal-access`, { email, password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-status', portalClient?.id] });
      Alert.alert('Success', 'Portal access granted — welcome email sent');
      setPortalClient(null); setPortalPassword('');
    },
    onError: err => Alert.alert('Error', typeof err === 'string' ? err : 'Failed to grant portal access'),
  });

  const revokePortal = useMutation({
    mutationFn: id => apiClient.delete(`/admin/project-clients/${id}/portal-access`),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: ['portal-status', id] }); Alert.alert('Success', 'Portal access revoked'); },
    onError: () => Alert.alert('Error', 'Failed to revoke portal access'),
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = c => { setEditing(c); setForm({ name: c.name, contactPerson: c.contactPerson ?? '', email: c.email ?? '', phone: c.phone ?? '', company: c.company ?? '', notes: c.notes ?? '' }); setShowModal(true); };
  const handleDelete = c => Alert.alert('Delete Client', `Delete "${c.name}"? Their linked projects will remain but will show no client.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(c.id) },
  ]);
  const handleGrantPortal = () => {
    if (!portalPassword) { Alert.alert('Error', 'Password is required'); return; }
    grantPortal.mutate({ id: portalClient.id, email: portalClient.email ?? '', password: portalPassword });
  };
  const handleRevokePortal = client => Alert.alert('Revoke Portal Access', `Remove portal access for "${client.name}"? They will no longer be able to log in.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Revoke', style: 'destructive', onPress: () => revokePortal.mutate(client.id) },
  ]);
  const openClientMenu = async item => {
    const options = [];
    if (hasInvoicePerm) options.push({ text: 'Invoices', onPress: () => setInvoiceClient(item) });
    if (hasPortalPerm) {
      let status = qc.getQueryData(['portal-status', item.id]);
      if (status === undefined) {
        try {
          const res = await apiClient.get(`/admin/project-clients/${item.id}/portal-status`);
          status = res?.data ?? res ?? null;
          qc.setQueryData(['portal-status', item.id], status);
        } catch { status = null; }
      }
      if (status?.hasPortalAccess) options.push({ text: 'Revoke Portal Access', style: 'destructive', onPress: () => handleRevokePortal(item) });
      else options.push({ text: 'Portal Access', onPress: () => setPortalClient(item) });
    }
    options.push({ text: 'Edit', onPress: () => openEdit(item) });
    options.push({ text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) });
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(item.name, undefined, options);
  };

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.heading}>Clients</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}><Text style={s.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>

      {hasInvoicePerm && summary && (
        <View style={s.summaryGrid}>
          <View style={[s.summaryCard, { backgroundColor: '#eff6ff' }]}><Text style={s.summaryLabel}>Total Invoice</Text><Text style={[s.summaryValue, { color: '#1d4ed8' }]}>{fmtMoney(summary.totalEarning ?? 0)}</Text></View>
          {hasProjectsPerm && (
            <View style={[s.summaryCard, { backgroundColor: '#f5f3ff' }]}><Text style={s.summaryLabel}>Company Earning</Text><Text style={[s.summaryValue, { color: '#6d28d9' }]}>{fmtMoney(totalCompanyEarning)}</Text></View>
          )}
          <View style={[s.summaryCard, { backgroundColor: '#f0fdf4' }]}><Text style={s.summaryLabel}>Invoice Paid</Text><Text style={[s.summaryValue, { color: '#15803d' }]}>{fmtMoney(summary.totalPaid ?? 0)}</Text></View>
          <View style={[s.summaryCard, { backgroundColor: '#fefce8' }]}><Text style={s.summaryLabel}>Pending</Text><Text style={[s.summaryValue, { color: '#a16207' }]}>{fmtMoney(summary.totalPending ?? 0)}</Text></View>
        </View>
      )}

      {!hasPortalPerm && (
        <View style={s.portalNotice}><Text style={s.portalNoticeText}>Client Portal is not included in your plan. Upgrade to give clients login access to their project dashboards.</Text></View>
      )}

      <FlatList
        data={list}
        keyExtractor={c => String(c.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={!isLoading && <Text style={s.empty}>No clients yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => openClientMenu(item)} activeOpacity={0.7}>
            <View style={s.avatar}><Text style={s.avatarText}>{(item.name ?? 'C')[0].toUpperCase()}</Text></View>
            <View style={s.info}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.name}>{item.name}</Text>
                <PortalBadge clientId={item.id} canPortal={hasPortalPerm} />
              </View>
              <Text style={s.sub}>{[item.company, item.contactPerson, item.phone, item.email].filter(Boolean).join(' · ')}</Text>
            </View>
            <Text style={s.menuDots}>⋮</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{editing ? 'Edit Client' : 'Add Client'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[['name','Name *'],['company','Company'],['contactPerson','Contact Person'],['email','Email'],['phone','Phone'],['notes','Notes']].map(([k, lbl]) => (
                <View key={k} style={s.field}>
                  <Text style={s.label}>{lbl}</Text>
                  <TextInput style={s.input} value={form[k]} onChangeText={set(k)} placeholder={lbl} placeholderTextColor="#999"
                    keyboardType={k === 'email' ? 'email-address' : k === 'phone' ? 'phone-pad' : 'default'} autoCapitalize="none" />
                </View>
              ))}
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>{editing ? 'Update' : 'Create'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {invoiceClient && (
        <InvoicesSheet client={invoiceClient} onClose={() => setInvoiceClient(null)} canInvoice={hasInvoicePerm} fmtMoney={fmtMoney}
          onRefreshSummary={() => qc.invalidateQueries({ queryKey: ['client-invoice-summary'] })} />
      )}

      <Modal visible={!!portalClient} animationType="fade" transparent>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Grant Portal Access</Text>
            <Text style={s.hintText}>Set login credentials for {portalClient?.name}. A welcome email will be sent.</Text>
            <Text style={s.label}>Login Email</Text>
            <TextInput style={[s.input, { backgroundColor: '#f9fafb', color: '#6b7280' }]} value={portalClient?.email ?? ''} editable={false} />
            <Text style={s.label}>Password *</Text>
            <TextInput style={s.input} value={portalPassword} onChangeText={setPortalPassword} placeholder="Set a password" placeholderTextColor="#999" secureTextEntry />
            <Text style={s.hintText}>Client can change this from their profile after login.</Text>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setPortalClient(null); setPortalPassword(''); }}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleGrantPortal} disabled={grantPortal.isPending || !portalPassword}>
                {grantPortal.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveText}>Grant Access & Send Email</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  summaryCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 12, padding: 12 },
  summaryLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 2 },
  summaryValue: { fontSize: 15, fontFamily: 'Outfit-Bold' },
  portalNotice: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, margin: 12, padding: 12 },
  portalNoticeText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#b45309' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 12, gap: 10, borderWidth: 1, borderColor: '#eee' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: colors.primary, fontFamily: 'Outfit-Bold', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#0f172a' },
  sub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2 },
  portalBadge: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  portalBadgeText: { fontSize: 9, fontFamily: 'Outfit-SemiBold', color: '#15803d' },
  menuDots: { fontSize: 20, color: '#9ca3af', paddingHorizontal: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', fontFamily: 'Outfit-Regular', marginTop: 40 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginBottom: 8 },
  hintText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4, marginBottom: 6 },
  field: { marginBottom: 10 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 4, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#555' },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#64748b' },
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
  installBadge: { backgroundColor: '#f3e8ff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  installBadgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#7c3aed' },
  invoiceTotal: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#0f172a', marginTop: 4 },
  invoiceSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  invoiceSubAmber: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#b45309' },
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
  summaryBox: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 10 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  invSummaryLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  invSummaryValue: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#111827' },
  summaryLabelBold: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111827' },
  summaryValueBold: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111827' },
  installBox: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginTop: 10 },
});

export default ProjectClientsScreen;
