import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView, Switch,
} from 'react-native';
import {
  useTickets, useCreateTicket, useUpdateTicket, useTicketDetail,
  useCustomers, useStaff, useManufacturers, useDevices,
  useTicketStatuses, useCategories, useTaxes, useMiscCharges, useProducts,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import CascadingCategorySelect from '../../../../components/Ui/CascadingCategorySelect';
import colors from '../../../../theme/colors';

const STATUS_COLORS = {
  New: '#6366f1', 'In Progress': '#3b82f6', 'Waiting for Parts': '#f59e0b',
  Completed: '#22c55e', Delivered: '#06b6d4', Cancelled: '#ef4444',
};
const PRIORITY_COLORS = { Low: '#16a34a', Normal: '#3b82f6', High: '#f59e0b', Urgent: '#ef4444' };
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const WARRANTY_UNITS = ['days', 'months', 'years'];
const FALLBACK_STATUSES = ['New', 'In Progress', 'Waiting for Parts', 'Completed', 'Delivered', 'Cancelled'];

const EMPTY_FORM = {
  customerName: '', customerPhone: '', customerId: '',
  brand: '', model: '', serialNumber: '', deviceType: '',
  issue: '', accessories: '', priority: 'Normal',
  estimatedCost: '', advancePayment: '',
  expectedCompletion: '', notes: '', physicalLocation: '',
  manufacturerId: '', deviceId: '', assignedUserId: '',
  statusId: '',
  categoryId: '',
  warrantyDays: '', warrantyUnit: 'days',
  lockType: '', lockCode: '', patternSequence: '',
  isTaxExcluded: false, taxId: '',
  specs: [],
  lines: [],
  miscLines: [],
};

// â”€â”€â”€ Inline Select â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const InlineSelect = ({ label, value, options, onSelect, keyField = 'id', labelField = 'name' }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => (o[keyField] ?? o) === value);
  const displayLabel = selected ? (selected[labelField] ?? selected) : 'Selectâ€¦';

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !selected && { color: '#999' }]}>{displayLabel}</Text>
        <Text style={styles.chevronIcon}>â–¾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <ScrollView>
              <TouchableOpacity style={styles.pickerOption} onPress={() => { onSelect(''); setOpen(false); }}>
                <Text style={styles.pickerOptionText}>â€” None â€”</Text>
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

// â”€â”€â”€ Product Search Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ProductSearchModal = ({ visible, onClose, onAdd, products = [] }) => {
  const [search, setSearch] = useState('');
  const filtered = search.length >= 1
    ? products.filter(p => (p.name ?? '').toLowerCase().includes(search.toLowerCase())).slice(0, 30)
    : products.slice(0, 20);

  const handleClose = () => { setSearch(''); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.fullModalBg}>
        <View style={[styles.fullModalCard, { maxHeight: '80%' }]}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>Add Part</Text>
            <TouchableOpacity onPress={handleClose}><Text style={styles.closeX}>âœ•</Text></TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { marginBottom: 10 }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search productsâ€¦"
            placeholderTextColor="#999"
            autoFocus
          />
          <FlatList
            data={filtered}
            keyExtractor={p => String(p.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerOption}
                onPress={() => {
                  onAdd({
                    productId: item.id,
                    productName: item.name,
                    quantity: 1,
                    unitPrice: parseFloat(item.salePrice ?? item.sellingPrice ?? item.price ?? 0),
                  });
                  handleClose();
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.pickerOptionText, { flex: 1 }]}>{item.name}</Text>
                  <Text style={[styles.pickerOptionText, { color: colors.secondary, fontSize: 12 }]}>
                    {item.salePrice ?? item.sellingPrice ?? item.price ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: colors.secondary, padding: 16, fontFamily: 'Outfit-Regular' }}>
                {products.length === 0 ? 'No products available' : 'No products match search'}
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

// â”€â”€â”€ Misc Charge Picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MiscChargeModal = ({ visible, onClose, onAdd, charges = [] }) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={onClose}>
      <View style={styles.pickerSheet}>
        <Text style={[styles.pickerOptionText, { fontFamily: 'Outfit-Bold', padding: 12 }]}>Add Misc Charge</Text>
        <ScrollView>
          {charges.map(c => (
            <TouchableOpacity
              key={c.id}
              style={styles.pickerOption}
              onPress={() => onAdd({ miscChargeId: c.id, name: c.name, price: parseFloat(c.price ?? c.amount ?? 0) })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.pickerOptionText}>{c.name}</Text>
                <Text style={[styles.pickerOptionText, { color: colors.secondary, fontSize: 12 }]}>
                  {c.price ?? c.amount ?? 0}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {charges.length === 0 && (
            <Text style={{ textAlign: 'center', color: colors.secondary, padding: 16, fontFamily: 'Outfit-Regular' }}>
              No misc charges configured
            </Text>
          )}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

// â”€â”€â”€ Create/Edit form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TicketForm = ({ visible, editing, onClose, onSave, isSaving }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showMiscModal, setShowMiscModal] = useState(false);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const { data: rawCustomers = [] }   = useCustomers();
  const { data: rawStaff = [] }       = useStaff();
  const { data: rawMfrs = [] }        = useManufacturers();
  const { data: rawDevices = [] }     = useDevices(form.manufacturerId || null);
  const { data: rawStatuses = [] }    = useTicketStatuses();
  const { data: rawCategories = [] }  = useCategories();
  const { data: rawTaxes = [] }       = useTaxes();
  const { data: rawMiscCharges = [] } = useMiscCharges();
  const { data: rawProducts = [] }    = useProducts({});

  const customers    = Array.isArray(rawCustomers)   ? rawCustomers   : (rawCustomers?.data   ?? []);
  const staffList    = Array.isArray(rawStaff)        ? rawStaff        : (rawStaff?.data       ?? []);
  const manufacturers = Array.isArray(rawMfrs)       ? rawMfrs         : (rawMfrs?.data         ?? []);
  const devices      = Array.isArray(rawDevices)     ? rawDevices      : (rawDevices?.data      ?? []);
  const statuses     = Array.isArray(rawStatuses)    ? rawStatuses     : (rawStatuses?.data     ?? []);
  const categories   = Array.isArray(rawCategories)  ? rawCategories   : (rawCategories?.data   ?? []);
  const taxes        = Array.isArray(rawTaxes)       ? rawTaxes        : (rawTaxes?.data        ?? []);
  const miscCharges  = Array.isArray(rawMiscCharges) ? rawMiscCharges  : (rawMiscCharges?.data  ?? []);
  const allProducts  = Array.isArray(rawProducts)    ? rawProducts     : (rawProducts?.data     ?? []);

  React.useEffect(() => {
    if (visible) {
      if (editing) {
        setForm({
          customerName:      editing.customerName ?? '',
          customerPhone:     editing.customerPhone ?? '',
          customerId:        editing.customer?.id ?? '',
          brand:             editing.brand ?? '',
          model:             editing.model ?? '',
          serialNumber:      editing.serialNumber ?? '',
          deviceType:        editing.deviceType ?? '',
          issue:             editing.issue ?? '',
          accessories:       editing.accessories ?? '',
          priority:          editing.priority ?? 'Normal',
          estimatedCost:     editing.estimatedCost != null ? String(editing.estimatedCost) : '',
          advancePayment:    editing.advancePayment != null ? String(editing.advancePayment) : '',
          expectedCompletion: editing.expectedCompletion ? new Date(editing.expectedCompletion).toISOString().slice(0, 10) : '',
          notes:             editing.notes ?? '',
          physicalLocation:  editing.physicalLocation ?? '',
          manufacturerId:    editing.manufacturerId ?? '',
          deviceId:          editing.deviceId ?? '',
          assignedUserId:    editing.assignedUser?.id ?? '',
          statusId:          editing.statusId ?? '',
          categoryId:        editing.categoryId ?? '',
          warrantyDays:      editing.warrantyDays != null ? String(editing.warrantyDays) : '',
          warrantyUnit:      editing.warrantyUnit ?? 'days',
          lockType:          editing.lockType ?? '',
          lockCode:          editing.lockCode ?? '',
          patternSequence:   editing.patternSequence ?? '',
          isTaxExcluded:     editing.isTaxExcluded ?? false,
          taxId:             editing.taxId ?? '',
          specs:             editing.specs ?? [],
          lines: (editing.products ?? editing.lines ?? []).map(l => ({
            productId:   l.product?.id   ?? l.productId   ?? '',
            productName: l.product?.name ?? l.productName ?? '',
            quantity:    l.quantity ?? 1,
            unitPrice:   l.unitPrice ?? l.price ?? 0,
          })),
          miscLines: (editing.miscLines ?? []).map(l => ({
            miscChargeId: l.miscChargeId ?? l.id ?? '',
            name:         l.name ?? '',
            price:        l.price ?? 0,
          })),
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
      customerName:      form.customerName,
      customerPhone:     form.customerPhone || undefined,
      customerId:        form.customerId || undefined,
      brand:             form.brand || undefined,
      model:             form.model || undefined,
      serialNumber:      form.serialNumber || undefined,
      deviceType:        form.deviceType || undefined,
      issue:             form.issue,
      accessories:       form.accessories || undefined,
      priority:          form.priority,
      estimatedCost:     form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      advancePayment:    form.advancePayment ? parseFloat(form.advancePayment) : undefined,
      expectedCompletion: form.expectedCompletion || undefined,
      notes:             form.notes || undefined,
      physicalLocation:  form.physicalLocation || undefined,
      manufacturerId:    form.manufacturerId || undefined,
      deviceId:          form.deviceId || undefined,
      assignedUserId:    form.assignedUserId || undefined,
      statusId:          form.statusId || undefined,
      categoryId:        form.categoryId || undefined,
      warrantyDays:      form.warrantyDays ? parseInt(form.warrantyDays, 10) : undefined,
      warrantyUnit:      form.warrantyDays ? form.warrantyUnit : undefined,
      lockType:          form.lockType || undefined,
      lockCode:          form.lockType === 'passcode' ? (form.lockCode || undefined) : undefined,
      patternSequence:   form.lockType === 'pattern'  ? (form.patternSequence || undefined) : undefined,
      isTaxExcluded:     form.isTaxExcluded,
      taxId:             form.taxId || undefined,
      specs:             form.specs.filter(s => s.key?.trim()).map(s => ({ key: s.key.trim(), value: (s.value ?? '').trim() })),
      lines:             form.lines.filter(l => l.productId).map(l => ({
        productId: l.productId,
        quantity:  parseInt(l.quantity, 10) || 1,
        unitPrice: parseFloat(l.unitPrice) || 0,
      })),
      miscLines:         form.miscLines.map(l => ({
        miscChargeId: l.miscChargeId,
        price:        parseFloat(l.price) || 0,
      })),
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

  const updateLine = (idx, field, val) =>
    setForm(p => ({ ...p, lines: p.lines.map((l, i) => i === idx ? { ...l, [field]: val } : l) }));
  const removeLine = idx =>
    setForm(p => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }));
  const updateMisc = (idx, field, val) =>
    setForm(p => ({ ...p, miscLines: p.miscLines.map((l, i) => i === idx ? { ...l, [field]: val } : l) }));
  const removeMisc = idx =>
    setForm(p => ({ ...p, miscLines: p.miscLines.filter((_, i) => i !== idx) }));
  const updateSpec = (idx, field, val) =>
    setForm(p => ({ ...p, specs: p.specs.map((s, i) => i === idx ? { ...s, [field]: val } : s) }));
  const removeSpec = idx =>
    setForm(p => ({ ...p, specs: p.specs.filter((_, i) => i !== idx) }));

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.fullModalBg}>
          <View style={styles.fullModalCard}>
            <View style={styles.formHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Ticket' : 'New Repair Ticket'}</Text>
              <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>âœ•</Text></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* â”€â”€ Customer â”€â”€ */}
              <Text style={styles.formSection}>Customer</Text>
              <InlineSelect
                label="Existing Customer"
                value={form.customerId}
                options={customers.map(c => ({ id: c.id, name: `${c.name}${c.phone ? ` Â· ${c.phone}` : ''}` }))}
                onSelect={val => {
                  const c = customers.find(x => x.id === val);
                  setForm(p => ({ ...p, customerId: val, customerName: c?.name ?? p.customerName, customerPhone: c?.phone ?? p.customerPhone }));
                }}
              />
              <F label="Customer Name *" fkey="customerName" placeholder="John Doe" />
              <F label="Customer Phone" fkey="customerPhone" placeholder="+1 234 567 890" keyboard="phone-pad" />

              {/* â”€â”€ Ticket Info â”€â”€ */}
              <Text style={styles.formSection}>Ticket Info</Text>
              <InlineSelect
                label="Status"
                value={form.statusId}
                options={statuses.map(s => ({ id: s.id, name: s.name }))}
                onSelect={set('statusId')}
              />
              <CascadingCategorySelect categories={categories} value={form.categoryId} onChange={set('categoryId')} label="Category" />
              <View style={styles.field}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.chipRow}>
                  {PRIORITIES.map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.chip, form.priority === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => set('priority')(p)}
                    >
                      <Text style={[styles.chipText, form.priority === p && { color: '#fff' }]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* â”€â”€ Device â”€â”€ */}
              <Text style={styles.formSection}>Device</Text>
              <InlineSelect
                label="Manufacturer"
                value={form.manufacturerId}
                options={manufacturers}
                onSelect={val => setForm(p => ({ ...p, manufacturerId: val, deviceId: '' }))}
              />
              {form.manufacturerId ? (
                <InlineSelect
                  label="Device"
                  value={form.deviceId}
                  options={devices.map(d => ({ id: d.id, name: d.name + (d.model ? ` (${d.model})` : '') }))}
                  onSelect={set('deviceId')}
                />
              ) : null}
              <F label="Brand" fkey="brand" placeholder="e.g. Apple" />
              <F label="Model" fkey="model" placeholder="e.g. iPhone 15 Pro" />
              <F label="Serial Number" fkey="serialNumber" placeholder="SN123456" />
              <F label="Device Type" fkey="deviceType" placeholder="e.g. Smartphone" />
              <F label="Accessories" fkey="accessories" placeholder="Charger, Caseâ€¦" />
              <F label="Physical Location" fkey="physicalLocation" placeholder="Shelf A3" />

              {/* â”€â”€ Phone Lock â”€â”€ */}
              <Text style={styles.formSection}>Phone Lock</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Lock Type</Text>
                <View style={styles.chipRow}>
                  {[{ key: '', label: 'None' }, { key: 'passcode', label: 'Passcode' }, { key: 'pattern', label: 'Pattern' }].map(lt => (
                    <TouchableOpacity
                      key={lt.key}
                      style={[styles.chip, { flex: 1 }, form.lockType === lt.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => set('lockType')(lt.key)}
                    >
                      <Text style={[styles.chipText, form.lockType === lt.key && { color: '#fff' }]}>{lt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {form.lockType === 'passcode' && (
                <F label="Lock Code" fkey="lockCode" placeholder="Enter passcode" keyboard="numeric" />
              )}
              {form.lockType === 'pattern' && (
                <F label="Pattern Sequence" fkey="patternSequence" placeholder="e.g. 1-2-3-6-9" />
              )}

              {/* â”€â”€ Specifications â”€â”€ */}
              <Text style={styles.formSection}>Specifications</Text>
              {form.specs.map((s, i) => (
                <View key={i} style={styles.specRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={s.key}
                    onChangeText={v => updateSpec(i, 'key', v)}
                    placeholder="Storage"
                    placeholderTextColor="#999"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={s.value}
                    onChangeText={v => updateSpec(i, 'value', v)}
                    placeholder="128GB"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeSpec(i)}>
                    <Text style={styles.removeBtnText}>âœ•</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addLineBtn}
                onPress={() => setForm(p => ({ ...p, specs: [...p.specs, { key: '', value: '' }] }))}
              >
                <Text style={styles.addLineBtnText}>+ Add Specification</Text>
              </TouchableOpacity>

              {/* â”€â”€ Issue & Notes â”€â”€ */}
              <Text style={styles.formSection}>Issue & Notes</Text>
              <F label="Issue *" fkey="issue" placeholder="Describe the problemâ€¦" multi />
              <F label="Notes" fkey="notes" placeholder="Internal notesâ€¦" multi />

              {/* â”€â”€ Parts Used â”€â”€ */}
              <Text style={styles.formSection}>Parts Used</Text>
              {form.lines.map((l, i) => (
                <View key={i} style={styles.lineItem}>
                  <Text style={styles.lineItemName} numberOfLines={1}>{l.productName}</Text>
                  <View style={styles.lineItemFields}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { fontSize: 11 }]}>Qty</Text>
                      <TextInput
                        style={styles.lineInput}
                        value={String(l.quantity)}
                        onChangeText={v => updateLine(i, 'quantity', v)}
                        keyboardType="numeric"
                        placeholder="1"
                        placeholderTextColor="#999"
                      />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.label, { fontSize: 11 }]}>Unit Price</Text>
                      <TextInput
                        style={styles.lineInput}
                        value={String(l.unitPrice)}
                        onChangeText={v => updateLine(i, 'unitPrice', v)}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#999"
                      />
                    </View>
                    <TouchableOpacity style={[styles.removeBtn, { alignSelf: 'flex-end' }]} onPress={() => removeLine(i)}>
                      <Text style={styles.removeBtnText}>âœ•</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addLineBtn} onPress={() => setShowProductSearch(true)}>
                <Text style={styles.addLineBtnText}>+ Add Part</Text>
              </TouchableOpacity>

              {/* â”€â”€ Misc Charges â”€â”€ */}
              <Text style={styles.formSection}>Misc Charges</Text>
              {form.miscLines.map((l, i) => (
                <View key={i} style={styles.lineItem}>
                  <Text style={styles.lineItemName} numberOfLines={1}>{l.name}</Text>
                  <View style={styles.lineItemFields}>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.label, { fontSize: 11 }]}>Price</Text>
                      <TextInput
                        style={styles.lineInput}
                        value={String(l.price)}
                        onChangeText={v => updateMisc(i, 'price', v)}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor="#999"
                      />
                    </View>
                    <TouchableOpacity style={[styles.removeBtn, { alignSelf: 'flex-end' }]} onPress={() => removeMisc(i)}>
                      <Text style={styles.removeBtnText}>âœ•</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addLineBtn} onPress={() => setShowMiscModal(true)}>
                <Text style={styles.addLineBtnText}>+ Add Charge</Text>
              </TouchableOpacity>

              {/* â”€â”€ Financials â”€â”€ */}
              <Text style={styles.formSection}>Financials</Text>
              <F label="Estimated Cost" fkey="estimatedCost" placeholder="0.00" keyboard="decimal-pad" />
              <F label="Advance Payment" fkey="advancePayment" placeholder="0.00" keyboard="decimal-pad" />
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Tax Excluded</Text>
                  <Text style={styles.switchDesc}>Price already includes tax</Text>
                </View>
                <Switch
                  value={form.isTaxExcluded}
                  onValueChange={set('isTaxExcluded')}
                  trackColor={{ false: '#e5e7eb', true: colors.primary + '80' }}
                  thumbColor={form.isTaxExcluded ? colors.primary : '#fff'}
                />
              </View>
              {!form.isTaxExcluded && (
                <InlineSelect
                  label="Tax"
                  value={form.taxId}
                  options={taxes.map(t => ({ id: t.id, name: `${t.name} (${t.rate}%)` }))}
                  onSelect={set('taxId')}
                />
              )}
              <View style={styles.warrantyRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>Warranty Duration</Text>
                  <TextInput
                    style={styles.input}
                    value={form.warrantyDays}
                    onChangeText={set('warrantyDays')}
                    placeholder="e.g. 90"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Unit</Text>
                  {WARRANTY_UNITS.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.warrantyUnitBtn, form.warrantyUnit === u && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                      onPress={() => set('warrantyUnit')(u)}
                    >
                      <Text style={[styles.warrantyUnitText, form.warrantyUnit === u && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* â”€â”€ Assignment â”€â”€ */}
              <Text style={styles.formSection}>Assignment</Text>
              <InlineSelect
                label="Assign To"
                value={form.assignedUserId}
                options={staffList.map(s => ({ id: s.id, name: s.name ?? s.fullName }))}
                onSelect={set('assignedUserId')}
              />
              <F label="Expected Completion (YYYY-MM-DD)" fkey="expectedCompletion" placeholder="2025-01-01" />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
                  {isSaving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.saveText}>{editing ? 'Update' : 'Create'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ProductSearchModal
        visible={showProductSearch}
        onClose={() => setShowProductSearch(false)}
        onAdd={line => setForm(p => ({ ...p, lines: [...p.lines, line] }))}
        products={allProducts}
      />
      <MiscChargeModal
        visible={showMiscModal}
        onClose={() => setShowMiscModal(false)}
        onAdd={charge => { setShowMiscModal(false); setForm(p => ({ ...p, miscLines: [...p.miscLines, charge] })); }}
        charges={miscCharges}
      />
    </>
  );
};

// â”€â”€â”€ Status update modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatusModal = ({ visible, ticket, onClose, onUpdate, isUpdating }) => {
  const { data: rawStatuses = [] } = useTicketStatuses();
  const statuses = Array.isArray(rawStatuses) ? rawStatuses : (rawStatuses?.data ?? []);
  const statusNames = statuses.length > 0 ? statuses.map(s => s.name) : FALLBACK_STATUSES;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerSheet}>
          <Text style={[styles.pickerOptionText, { fontFamily: 'Outfit-Bold', padding: 12 }]}>Update Status</Text>
          {statusNames.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.pickerOption, ticket?.status === s && { backgroundColor: '#f0f0f0' }]}
              onPress={() => onUpdate(s)}
              disabled={isUpdating}
            >
              <Text style={[styles.pickerOptionText, ticket?.status === s && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// â”€â”€â”€ Ticket detail modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TicketDetailModal = ({ ticketId, onClose, onEdit, isAdmin, fmt }) => {
  const { data: ticket, isLoading } = useTicketDetail(ticketId);
  const { mutateAsync: update, isPending: updating } = useUpdateTicket();
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [paymentInput, setPaymentInput] = useState('');

  if (!ticketId) return null;

  const estimated   = ticket?.estimatedCost ?? 0;
  const advance     = ticket?.advancePayment ?? 0;
  const outstanding = Math.max(0, estimated - advance);
  const sc = STATUS_COLORS[ticket?.status] ?? '#aaa';
  const pc = PRIORITY_COLORS[ticket?.priority] ?? '#aaa';

  const handleCollect = async () => {
    const amount = parseFloat(paymentInput);
    if (isNaN(amount) || amount <= 0) return;
    const newAdvance = Math.min(parseFloat((advance + amount).toFixed(2)), estimated);
    try { await update({ id: ticketId, advancePayment: newAdvance }); } catch { /* noop */ }
    setCollectingPayment(false);
    setPaymentInput('');
  };

  const handleMarkFullyPaid = async () => {
    try { await update({ id: ticketId, advancePayment: estimated }); } catch { /* noop */ }
  };

  return (
    <Modal visible={!!ticketId} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.fullModalBg}>
        <View style={styles.fullModalCard}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>{ticket?.ticketNumber ?? 'â€¦'}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>âœ•</Text></TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
          ) : ticket ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={[styles.badge, { backgroundColor: sc + '22' }]}>
                  <Text style={[styles.badgeText, { color: sc }]}>{ticket.status}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: (PRIORITY_COLORS[ticket.priority] ?? '#aaa') + '22' }]}>
                  <Text style={[styles.badgeText, { color: pc }]}>{ticket.priority}</Text>
                </View>
              </View>

              <Text style={styles.formSection}>Customer</Text>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Name</Text><Text style={styles.infoValue}>{ticket.customerName}</Text></View>
              {ticket.customerPhone ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone</Text><Text style={styles.infoValue}>{ticket.customerPhone}</Text></View> : null}

              <Text style={styles.formSection}>Device</Text>
              {ticket.manufacturerRef?.name   ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Manufacturer</Text><Text style={styles.infoValue}>{ticket.manufacturerRef.name}</Text></View> : null}
              {(ticket.brand || ticket.model) ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Brand / Model</Text><Text style={styles.infoValue}>{[ticket.brand, ticket.model].filter(Boolean).join(' ')}</Text></View> : null}
              {ticket.serialNumber            ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Serial No.</Text><Text style={styles.infoValue}>{ticket.serialNumber}</Text></View> : null}
              {ticket.deviceType              ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Device Type</Text><Text style={styles.infoValue}>{ticket.deviceType}</Text></View> : null}
              {ticket.physicalLocation        ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{ticket.physicalLocation}</Text></View> : null}
              {ticket.lockType                ? <View style={styles.infoRow}><Text style={styles.infoLabel}>Lock Type</Text><Text style={styles.infoValue}>{ticket.lockType}</Text></View> : null}

              {ticket.specs?.length > 0 && (
                <>
                  <Text style={styles.formSection}>Specifications</Text>
                  {ticket.specs.map((s, i) => (
                    <View key={i} style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{s.key}</Text>
                      <Text style={styles.infoValue}>{s.value}</Text>
                    </View>
                  ))}
                </>
              )}

              <Text style={styles.formSection}>Issue</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, marginBottom: 12 }}>{ticket.issue}</Text>
              {ticket.notes ? <Text style={{ fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, marginBottom: 12 }}>{ticket.notes}</Text> : null}

              {ticket.products?.length > 0 && (
                <>
                  <Text style={styles.formSection}>Parts Used</Text>
                  {ticket.products.map(tp => (
                    <View key={tp.id} style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{tp.product?.name ?? 'â€”'} Ã— {tp.quantity}</Text>
                      <Text style={styles.infoValue}>{fmt(tp.quantity * tp.unitPrice)}</Text>
                    </View>
                  ))}
                </>
              )}

              {ticket.miscLines?.length > 0 && (
                <>
                  <Text style={styles.formSection}>Misc Charges</Text>
                  {ticket.miscLines.map((ml, i) => (
                    <View key={i} style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{ml.name}</Text>
                      <Text style={styles.infoValue}>{fmt(ml.price)}</Text>
                    </View>
                  ))}
                </>
              )}

              <Text style={styles.formSection}>Payment</Text>
              <View style={styles.paymentBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Estimated Cost</Text>
                  <Text style={[styles.infoValue, { color: '#22c55e', fontFamily: 'Outfit-Bold' }]}>{fmt(estimated)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Advance Paid</Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>{fmt(advance)}</Text>
                </View>
                <View style={[styles.infoRow, { borderTopWidth: 1, borderColor: '#eee', paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[styles.infoLabel, { fontFamily: 'Outfit-Bold' }]}>Outstanding</Text>
                  <Text style={[styles.infoValue, { color: outstanding > 0 ? colors.warning : '#22c55e', fontFamily: 'Outfit-Bold' }]}>
                    {outstanding > 0 ? fmt(outstanding) : 'Fully Paid'}
                  </Text>
                </View>
                {isAdmin && outstanding > 0.01 && !collectingPayment && (
                  <TouchableOpacity style={styles.collectBtn} onPress={() => setCollectingPayment(true)}>
                    <Text style={styles.collectBtnText}>Collect Payment</Text>
                  </TouchableOpacity>
                )}
                {collectingPayment && (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    <TextInput
                      style={styles.input}
                      value={paymentInput}
                      onChangeText={setPaymentInput}
                      placeholder={String(outstanding.toFixed(2))}
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={handleCollect} disabled={updating}>
                        {updating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Collect</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={handleMarkFullyPaid} disabled={updating}>
                        <Text style={styles.cancelText}>Mark Fully Paid</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.cancelBtn, { paddingHorizontal: 14 }]} onPress={() => { setCollectingPayment(false); setPaymentInput(''); }}>
                        <Text style={styles.cancelText}>âœ•</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {ticket.warrantyDays ? (
                <>
                  <Text style={styles.formSection}>Warranty</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Duration</Text>
                    <Text style={styles.infoValue}>{ticket.warrantyDays} {ticket.warrantyUnit ?? 'days'}</Text>
                  </View>
                </>
              ) : null}

              {ticket.expectedCompletion ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Due Date</Text>
                  <Text style={styles.infoValue}>{String(ticket.expectedCompletion).slice(0, 10)}</Text>
                </View>
              ) : null}

              {isAdmin && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 8 }}>
                  <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={onClose}>
                    <Text style={styles.cancelText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { flex: 1 }]} onPress={() => { onClose(); onEdit(ticket); }}>
                    <Text style={styles.saveText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

// â”€â”€â”€ Main screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TicketsScreen = ({ navigation }) => {
  const perms = usePermissions();
  const canCreate = perms.can(PERMISSIONS.CREATE_TICKETS);
  const canUpdate = perms.can(PERMISSIONS.UPDATE_TICKETS);
  const { fmt } = useCurrency();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [viewId, setViewId] = useState(null);

  const { data: raw = {}, isLoading, refetch } = useTickets({ search, status: statusFilter });
  const { data: rawStatuses = [] } = useTicketStatuses();
  const { mutateAsync: create, isPending: creating } = useCreateTicket();
  const { mutateAsync: update, isPending: updating } = useUpdateTicket();

  const tickets = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const statuses = Array.isArray(rawStatuses) ? rawStatuses : (rawStatuses?.data ?? []);
  const statusNames = statuses.length > 0 ? statuses.map(s => s.name) : FALLBACK_STATUSES;

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
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Search ticketsâ€¦"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateTicket')}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}>
        {['', ...statusNames].map(s => (
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
                  <Text style={styles.assigned}>â†’ {item.assignedUser.name}</Text>
                )}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setViewId(item.id)}>
                    <Text style={styles.actionBtnText}>View</Text>
                  </TouchableOpacity>
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

      <TicketDetailModal
        ticketId={viewId}
        onClose={() => setViewId(null)}
        onEdit={t => { setEditing(t); setShowForm(true); }}
        isAdmin={canUpdate}
        fmt={fmt}
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
  filterRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0', flexGrow: 0 },
  filterChip: { height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
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
  // Modal
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
  chevronIcon: { fontSize: 12, color: colors.secondary },
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
  // Parts / lines
  lineItem: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  lineItemName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 6 },
  lineItemFields: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  lineInput: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.defaultBlack, backgroundColor: '#fff' },
  addLineBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  addLineBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  removeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 12, color: '#ef4444', fontFamily: 'Outfit-Bold' },
  // Specs
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  // Switch / tax toggle
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, marginBottom: 12 },
  switchInfo: { flex: 1 },
  switchLabel: { fontSize: 14, fontFamily: 'Outfit-Medium', color: colors.defaultBlack },
  switchDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  // Warranty
  warrantyRow: { flexDirection: 'row', marginBottom: 12 },
  warrantyUnitBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 4 },
  warrantyUnitText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center' },
  // Detail modal
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  infoLabel: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, flex: 1 },
  infoValue: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, flexShrink: 1, textAlign: 'right' },
  paymentBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  collectBtn: { marginTop: 10, borderWidth: 1.5, borderColor: '#22c55e', borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f0fdf4' },
  collectBtnText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#16a34a' },
});

export default TicketsScreen;
