import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  useTickets, useCreateTicket, useUpdateTicket,
  useCustomers, useStaff, useManufacturers, useDevices,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const STATUS_COLORS = {
  New: '#6366f1', 'In Progress': '#3b82f6', 'Waiting for Parts': '#f59e0b',
  Completed: '#22c55e', Delivered: '#06b6d4', Cancelled: '#ef4444',
};
const PRIORITY_COLORS = { Low: '#16a34a', Normal: '#3b82f6', High: '#f59e0b', Urgent: '#ef4444' };
const STATUSES = ['New', 'In Progress', 'Waiting for Parts', 'Completed', 'Delivered', 'Cancelled'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];

const EMPTY_FORM = {
  customerName: '', customerPhone: '', customerId: '',
  brand: '', model: '', serialNumber: '', deviceType: '',
  issue: '', accessories: '', priority: 'Normal',
  estimatedCost: '', advancePayment: '',
  expectedCompletion: '', notes: '', physicalLocation: '',
  manufacturerId: '', deviceId: '', assignedUserId: '',
};

// ─── Small picker component ────────────────────────────────────────────────
const InlineSelect = ({ label, value, options, onSelect, keyField = 'id', labelField = 'name' }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => (o[keyField] ?? o) === value);
  const displayLabel = selected ? (selected[labelField] ?? selected) : 'Select…';

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !selected && { color: '#999' }]}>{displayLabel}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <ScrollView>
              <TouchableOpacity style={styles.pickerOption} onPress={() => { onSelect(''); setOpen(false); }}>
                <Text style={styles.pickerOptionText}>— None —</Text>
              </TouchableOpacity>
              {options.map(opt => {
                const k = opt[keyField] ?? opt;
                const l = opt[labelField] ?? opt;
                return (
                  <TouchableOpacity key={k} style={styles.pickerOption} onPress={() => { onSelect(k); setOpen(false); }}>
                    <Text style={[styles.pickerOptionText, value === k && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Create/Edit form ─────────────────────────────────────────────────────────
const TicketForm = ({ visible, editing, onClose, onSave, isSaving }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: rawCustomers = [] } = useCustomers();
  const { data: rawStaff = [] } = useStaff();
  const { data: rawMfrs = [] } = useManufacturers();
  const { data: rawDevices = [] } = useDevices(form.manufacturerId || null);

  const customers = Array.isArray(rawCustomers) ? rawCustomers : (rawCustomers?.data ?? []);
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const manufacturers = Array.isArray(rawMfrs) ? rawMfrs : (rawMfrs?.data ?? []);
  const devices = Array.isArray(rawDevices) ? rawDevices : (rawDevices?.data ?? []);

  React.useEffect(() => {
    if (visible) {
      if (editing) {
        setForm({
          customerName: editing.customerName ?? '',
          customerPhone: editing.customerPhone ?? '',
          customerId: editing.customer?.id ?? '',
          brand: editing.brand ?? '',
          model: editing.model ?? '',
          serialNumber: editing.serialNumber ?? '',
          deviceType: editing.deviceType ?? '',
          issue: editing.issue ?? '',
          accessories: editing.accessories ?? '',
          priority: editing.priority ?? 'Normal',
          estimatedCost: editing.estimatedCost != null ? String(editing.estimatedCost) : '',
          advancePayment: editing.advancePayment != null ? String(editing.advancePayment) : '',
          expectedCompletion: editing.expectedCompletion ? new Date(editing.expectedCompletion).toISOString().slice(0, 10) : '',
          notes: editing.notes ?? '',
          physicalLocation: editing.physicalLocation ?? '',
          manufacturerId: editing.manufacturerId ?? '',
          deviceId: editing.deviceId ?? '',
          assignedUserId: editing.assignedUser?.id ?? '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [visible, editing]);

  const handleSubmit = () => {
    if (!form.customerName.trim()) { Alert.alert('Error', 'Customer name is required'); return; }
    if (!form.issue.trim()) { Alert.alert('Error', 'Issue is required'); return; }
    const payload = {
      customerName: form.customerName,
      customerPhone: form.customerPhone || undefined,
      customerId: form.customerId || undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      serialNumber: form.serialNumber || undefined,
      deviceType: form.deviceType || undefined,
      issue: form.issue,
      accessories: form.accessories || undefined,
      priority: form.priority,
      estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      advancePayment: form.advancePayment ? parseFloat(form.advancePayment) : undefined,
      expectedCompletion: form.expectedCompletion || undefined,
      notes: form.notes || undefined,
      physicalLocation: form.physicalLocation || undefined,
      manufacturerId: form.manufacturerId || undefined,
      deviceId: form.deviceId || undefined,
      assignedUserId: form.assignedUserId || undefined,
    };
    onSave(payload);
  };

  const F = ({ label, fkey, placeholder, keyboard, multi }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multi && { height: 70, textAlignVertical: 'top' }]}
        value={form[fkey]}
        onChangeText={set(fkey)}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={keyboard}
        multiline={multi}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.fullModalBg}>
        <View style={styles.fullModalCard}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Ticket' : 'New Repair Ticket'}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.formSection}>Customer</Text>
            <InlineSelect
              label="Existing Customer"
              value={form.customerId}
              options={customers.map(c => ({ id: c.id, name: `${c.name}${c.phone ? ` · ${c.phone}` : ''}` }))}
              onSelect={val => {
                const c = customers.find(x => x.id === val);
                setForm(p => ({ ...p, customerId: val, customerName: c?.name ?? p.customerName, customerPhone: c?.phone ?? p.customerPhone }));
              }}
            />
            <F label="Customer Name *" fkey="customerName" placeholder="John Doe" />
            <F label="Customer Phone" fkey="customerPhone" placeholder="+1 234 567 890" keyboard="phone-pad" />

            <Text style={styles.formSection}>Device</Text>
            <InlineSelect
              label="Manufacturer"
              value={form.manufacturerId}
              options={manufacturers}
              onSelect={val => setForm(p => ({ ...p, manufacturerId: val, deviceId: '' }))}
            />
            {form.manufacturerId ? (
              <InlineSelect label="Device" value={form.deviceId} options={devices.map(d => ({ id: d.id, name: d.name + (d.model ? ` (${d.model})` : '') }))} onSelect={set('deviceId')} />
            ) : null}
            <F label="Brand" fkey="brand" placeholder="e.g. Apple" />
            <F label="Model" fkey="model" placeholder="e.g. iPhone 15 Pro" />
            <F label="Serial Number" fkey="serialNumber" placeholder="SN123456" />
            <F label="Device Type" fkey="deviceType" placeholder="e.g. Smartphone" />
            <F label="Accessories" fkey="accessories" placeholder="Charger, Case…" />
            <F label="Physical Location" fkey="physicalLocation" placeholder="Shelf A3" />

            <Text style={styles.formSection}>Issue & Priority</Text>
            <F label="Issue *" fkey="issue" placeholder="Describe the problem…" multi />

            <View style={styles.field}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.chipRow}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity key={p} style={[styles.chip, form.priority === p && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => set('priority')(p)}>
                    <Text style={[styles.chipText, form.priority === p && { color: '#fff' }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.formSection}>Financials</Text>
            <F label="Estimated Cost ($)" fkey="estimatedCost" placeholder="0.00" keyboard="decimal-pad" />
            <F label="Advance Payment ($)" fkey="advancePayment" placeholder="0.00" keyboard="decimal-pad" />

            <Text style={styles.formSection}>Assignment</Text>
            <InlineSelect label="Assign To" value={form.assignedUserId} options={staffList.map(s => ({ id: s.id, name: s.name ?? s.fullName }))} onSelect={set('assignedUserId')} />

            <F label="Expected Completion (YYYY-MM-DD)" fkey="expectedCompletion" placeholder="2025-01-01" />
            <F label="Notes" fkey="notes" placeholder="Internal notes…" multi />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editing ? 'Update' : 'Create'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Status update modal ──────────────────────────────────────────────────────
const StatusModal = ({ visible, ticket, onClose, onUpdate, isUpdating }) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={onClose}>
      <View style={styles.pickerSheet}>
        <Text style={[styles.pickerOptionText, { fontFamily: 'Outfit-Bold', padding: 12 }]}>Update Status</Text>
        {STATUSES.map(s => (
          <TouchableOpacity key={s} style={[styles.pickerOption, ticket?.status === s && { backgroundColor: '#f0f0f0' }]} onPress={() => onUpdate(s)} disabled={isUpdating}>
            <Text style={[styles.pickerOptionText, ticket?.status === s && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Main screen ──────────────────────────────────────────────────────────────
const TicketsScreen = () => {
  const perms = usePermissions();
  const canCreate = perms.can(PERMISSIONS.CREATE_TICKETS);
  const canUpdate = perms.can(PERMISSIONS.UPDATE_TICKETS);
  const { fmt } = useCurrency();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const { data: raw = {}, isLoading, refetch } = useTickets({ search, status: statusFilter });
  const { mutateAsync: create, isPending: creating } = useCreateTicket();
  const { mutateAsync: update, isPending: updating } = useUpdateTicket();

  const tickets = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const handleSave = async payload => {
    try {
      if (editing) {
        await update({ id: editing.id, ...payload });
      } else {
        await create(payload);
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Save failed');
    }
  };

  const handleStatusUpdate = async newStatus => {
    if (!statusTarget) return;
    try {
      await update({ id: statusTarget.id, status: newStatus });
      setStatusTarget(null);
    } catch { /* non-critical */ }
  };

  return (
    <View style={styles.root}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Search tickets…"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => { setEditing(null); setShowForm(true); }}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {['', ...STATUSES].map(s => (
          <TouchableOpacity key={s} style={[styles.filterChip, statusFilter === s && styles.filterChipActive]} onPress={() => setStatusFilter(s)}>
            <Text style={[styles.filterChipText, statusFilter === s && { color: '#fff' }]}>{s || 'All'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={tickets}
        keyExtractor={t => String(t.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const sc = STATUS_COLORS[item.status] ?? '#aaa';
          const pc = PRIORITY_COLORS[item.priority] ?? '#aaa';
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.ticketNum}>{item.ticketNumber}</Text>
                <View style={[styles.badge, { backgroundColor: sc + '22' }]}>
                  <Text style={[styles.badgeText, { color: sc }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.customerName}>{item.customerName}</Text>
              {item.brand || item.model ? (
                <Text style={styles.deviceInfo}>{[item.brand, item.model].filter(Boolean).join(' ')}</Text>
              ) : null}
              <Text style={styles.issue} numberOfLines={2}>{item.issue}</Text>
              <View style={styles.cardBottom}>
                <View style={[styles.badge, { backgroundColor: pc + '22' }]}>
                  <Text style={[styles.badgeText, { color: pc }]}>{item.priority}</Text>
                </View>
                {item.estimatedCost != null && (
                  <Text style={styles.cost}>Est: {fmt(item.estimatedCost)}</Text>
                )}
                {item.assignedUser && (
                  <Text style={styles.assigned}>→ {item.assignedUser.name}</Text>
                )}
                <View style={styles.cardActions}>
                  {canUpdate && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setStatusTarget(item)}>
                      <Text style={styles.actionBtnText}>Status</Text>
                    </TouchableOpacity>
                  )}
                  {canUpdate && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditing(item); setShowForm(true); }}>
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No tickets found.</Text>}
      />

      <TicketForm
        visible={showForm}
        editing={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={handleSave}
        isSaving={creating || updating}
      />

      <StatusModal
        visible={!!statusTarget}
        ticket={statusTarget}
        onClose={() => setStatusTarget(null)}
        onUpdate={handleStatusUpdate}
        isUpdating={updating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  toolbar: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { flex: 1, backgroundColor: '#f4f6f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  filterRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0', maxHeight: 48 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', marginTop: 8 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.secondary },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginTop: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketNum: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  customerName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 2 },
  deviceInfo: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 4 },
  issue: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  cost: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  assigned: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, flex: 1 },
  cardActions: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  actionBtn: { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  actionBtnText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
  // Form
  fullModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  fullModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  closeX: { fontSize: 18, color: colors.secondary, padding: 4 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  formSection: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, backgroundColor: '#fff' },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  selectText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
  chevron: { fontSize: 12, color: colors.secondary },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  chipText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: colors.secondary },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 360, padding: 8 },
  pickerOption: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack },
});

export default TicketsScreen;
