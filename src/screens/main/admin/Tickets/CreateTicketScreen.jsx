import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateTicket, useCreateCustomer,
  useCustomers, useStaff, useManufacturers, useDevices,
  useTicketStatuses, useCategories, useTaxes, useMiscCharges, useProducts,
} from '../../../../services/api/posApi';
import CascadingCategorySelect from '../../../../components/Ui/CascadingCategorySelect';
import colors from '../../../../theme/colors';

const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const WARRANTY_UNITS = ['days', 'months', 'years'];

const EMPTY_FORM = {
  customerName: '', customerPhone: '', customerId: '',
  brand: '', model: '', serialNumber: '', deviceType: '',
  issue: '', accessories: '', priority: 'Normal',
  estimatedCost: '', advancePayment: '',
  expectedCompletion: '', notes: '', physicalLocation: '',
  manufacturerId: '', deviceId: '', assignedUserId: '',
  statusId: '', categoryId: '',
  warrantyDays: '', warrantyUnit: 'days',
  lockType: '', lockCode: '', patternSequence: '',
  isTaxExcluded: false, taxId: '',
  specs: [], lines: [], miscLines: [],
};

const STEPS = [
  { label: 'Customer',       desc: 'Who is this ticket for?' },
  { label: 'Device & Specs', desc: 'Device details and specifications' },
  { label: 'Issue & Parts',  desc: 'Problem description, parts, and charges' },
  { label: 'Pricing',        desc: 'Costs, assignment, warranty, and tax' },
];

// ─── InlineSelect ──────────────────────────────────────────────────────────────
const InlineSelect = ({ label, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  return (
    <View style={s.field}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TouchableOpacity style={s.selectBtn} onPress={() => setOpen(true)}>
        <Text style={[s.selectText, !selected && { color: '#999' }]}>{selected ? selected.name : 'Select…'}</Text>
        <Text style={s.chevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={s.pickerBg} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.pickerSheet}>
            <ScrollView>
              <TouchableOpacity style={s.pickerRow} onPress={() => { onSelect(''); setOpen(false); }}>
                <Text style={s.pickerText}>— None —</Text>
              </TouchableOpacity>
              {options.map(opt => (
                <TouchableOpacity key={opt.id} style={s.pickerRow} onPress={() => { onSelect(opt.id); setOpen(false); }}>
                  <Text style={[s.pickerText, value === opt.id && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── ProductSearchModal ────────────────────────────────────────────────────────
const ProductSearchModal = ({ visible, onClose, products }) => {
  const [search, setSearch] = useState('');
  const filtered = search.length >= 1
    ? products.filter(p => (p.name ?? '').toLowerCase().includes(search.toLowerCase())).slice(0, 30)
    : products.slice(0, 20);
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.fullBg}>
        <View style={[s.fullCard, { maxHeight: '80%' }]}>
          <Text style={s.sheetTitle}>Add Part</Text>
          <TextInput style={[s.input, { marginBottom: 10 }]} value={search} onChangeText={setSearch}
            placeholder="Search products…" placeholderTextColor="#999" autoFocus />
          <ScrollView>
            {filtered.map(item => (
              <TouchableOpacity key={item.id} style={s.pickerRow} onPress={() => {
                onClose({ productId: item.id, productName: item.name, quantity: 1,
                  unitPrice: parseFloat(item.salePrice ?? item.sellingPrice ?? item.price ?? 0) });
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.pickerText}>{item.name}</Text>
                  <Text style={[s.pickerText, { color: colors.secondary, fontSize: 12 }]}>
                    {item.salePrice ?? item.sellingPrice ?? item.price ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {filtered.length === 0 && <Text style={s.emptyText}>No products found</Text>}
          </ScrollView>
          <TouchableOpacity style={s.cancelBtn} onPress={() => onClose(null)}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function CreateTicketScreen({ navigation }) {
  const qc = useQueryClient();
  const { mutateAsync: createTicket, isPending: saving } = useCreateTicket();
  const { mutateAsync: createCustomer, isPending: addingCustomer } = useCreateCustomer();

  const { data: rawCustomers = [] }   = useCustomers();
  const { data: rawStaff = [] }       = useStaff();
  const { data: rawMfrs = [] }        = useManufacturers();
  const { data: rawStatuses = [] }    = useTicketStatuses();
  const { data: rawCategories = [] }  = useCategories();
  const { data: rawTaxes = [] }       = useTaxes();
  const { data: rawMiscCharges = [] } = useMiscCharges();
  const { data: rawProducts = [] }    = useProducts({});

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [step, setStep] = useState(1);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { data: rawDevices = [] } = useDevices(form.manufacturerId || null);

  const norm = d => Array.isArray(d) ? d : (d?.data ?? []);
  const customers   = norm(rawCustomers);
  const staffList   = norm(rawStaff);
  const mfrs        = norm(rawMfrs);
  const devices     = norm(rawDevices);
  const statuses    = norm(rawStatuses);
  const categories  = norm(rawCategories);
  const taxes       = norm(rawTaxes);
  const miscCharges = norm(rawMiscCharges);
  const allProducts = norm(rawProducts);

  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const F = ({ label, fkey, placeholder, keyboard, multi }) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multi && { height: 80, textAlignVertical: 'top' }]}
        value={form[fkey]}
        onChangeText={set(fkey)}
        placeholder={placeholder}
        placeholderTextColor="#999"
        keyboardType={keyboard}
        multiline={multi}
      />
    </View>
  );

  const updateLine = (i, field, val) =>
    setForm(p => ({ ...p, lines: p.lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }));
  const removeLine = i =>
    setForm(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }));
  const updateMisc = (i, field, val) =>
    setForm(p => ({ ...p, miscLines: p.miscLines.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }));
  const removeMisc = i =>
    setForm(p => ({ ...p, miscLines: p.miscLines.filter((_, idx) => idx !== i) }));
  const updateSpec = (i, field, val) =>
    setForm(p => ({ ...p, specs: p.specs.map((sp, idx) => idx === i ? { ...sp, [field]: val } : sp) }));
  const removeSpec = i =>
    setForm(p => ({ ...p, specs: p.specs.filter((_, idx) => idx !== i) }));

  const goNext = () => {
    if (step === 1 && !form.customerName.trim()) {
      Alert.alert('Required', 'Customer name is required'); return;
    }
    if (step === 3 && !form.issue.trim()) {
      Alert.alert('Required', 'Issue description is required'); return;
    }
    if (step < 4) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    if (!form.customerName.trim()) { Alert.alert('Required', 'Customer name is required'); return; }
    if (!form.issue.trim())        { Alert.alert('Required', 'Issue is required'); return; }
    const payload = {
      customerName:       form.customerName,
      customerPhone:      form.customerPhone || undefined,
      customerId:         form.customerId || undefined,
      brand:              form.brand || undefined,
      model:              form.model || undefined,
      serialNumber:       form.serialNumber || undefined,
      deviceType:         form.deviceType || undefined,
      issue:              form.issue,
      accessories:        form.accessories || undefined,
      priority:           form.priority,
      estimatedCost:      form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      advancePayment:     form.advancePayment ? parseFloat(form.advancePayment) : undefined,
      expectedCompletion: form.expectedCompletion || undefined,
      notes:              form.notes || undefined,
      physicalLocation:   form.physicalLocation || undefined,
      manufacturerId:     form.manufacturerId || undefined,
      deviceId:           form.deviceId || undefined,
      assignedUserId:     form.assignedUserId || undefined,
      statusId:           form.statusId || undefined,
      categoryId:         form.categoryId || undefined,
      warrantyDays:       form.warrantyDays ? parseInt(form.warrantyDays, 10) : undefined,
      warrantyUnit:       form.warrantyDays ? form.warrantyUnit : undefined,
      lockType:           form.lockType || undefined,
      lockCode:           form.lockType === 'passcode' ? (form.lockCode || undefined) : undefined,
      patternSequence:    form.lockType === 'pattern' ? (form.patternSequence || undefined) : undefined,
      isTaxExcluded:      form.isTaxExcluded,
      taxId:              form.taxId || undefined,
      specs:              form.specs.filter(sp => sp.key?.trim()).map(sp => ({ key: sp.key.trim(), value: (sp.value ?? '').trim() })),
      lines:              form.lines.filter(l => l.productId).map(l => ({
        productId: l.productId, quantity: parseInt(l.quantity, 10) || 1, unitPrice: parseFloat(l.unitPrice) || 0,
      })),
      miscLines: form.miscLines.map(l => ({ miscChargeId: l.miscChargeId, price: parseFloat(l.price) || 0 })),
    };
    try {
      await createTicket(payload);
      qc.invalidateQueries({ queryKey: ['tickets'] });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to create ticket');
    }
  };

  return (
    <View style={s.root}>
      {/* ── Stepper ── */}
      <View style={s.stepperWrap}>
        {STEPS.map((st, i) => {
          const num = i + 1;
          const done   = num < step;
          const active = num === step;
          return (
            <React.Fragment key={num}>
              <TouchableOpacity
                style={s.stepItem}
                onPress={() => done && setStep(num)}
                disabled={!done}
              >
                <View style={[s.stepCircle, done && s.stepDone, active && s.stepActive]}>
                  <Text style={[s.stepNum, (done || active) && { color: '#fff' }]}>
                    {done ? '✓' : num}
                  </Text>
                </View>
                <Text style={[s.stepLabel, active && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }, done && { color: '#22c55e' }]} numberOfLines={1}>
                  {st.label}
                </Text>
              </TouchableOpacity>
              {i < STEPS.length - 1 && (
                <View style={[s.stepLine, done && { backgroundColor: '#22c55e' }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <Text style={s.stepDesc}>{STEPS[step - 1].desc}</Text>

      <ScrollView style={s.body} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* ── Step 1: Customer ── */}
        {step === 1 && (
          <>
            <Text style={s.section}>Customer Information</Text>

            {/* Selected customer chip */}
            {selectedCustomer ? (
              <View style={s.selectedCustomer}>
                <View style={{ flex: 1 }}>
                  <Text style={s.selectedCustomerName}>{selectedCustomer.name}</Text>
                  {selectedCustomer.phone ? <Text style={s.selectedCustomerPhone}>{selectedCustomer.phone}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                  setForm(p => ({ ...p, customerId: '', customerName: '', customerPhone: '' }));
                }}>
                  <Text style={s.selectedCustomerClear}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Search input */}
                <View style={s.field}>
                  <Text style={s.label}>Search Customer</Text>
                  <TextInput
                    style={s.input}
                    value={customerSearch}
                    onChangeText={text => {
                      setCustomerSearch(text);
                      setForm(p => ({ ...p, customerName: text, customerId: '' }));
                    }}
                    placeholder="Search by name or phone…"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Live results */}
                {customerSearch.trim().length > 0 && (
                  <View style={s.customerResultsList}>
                    {customers
                      .filter(c =>
                        (c.name ?? '').toLowerCase().includes(customerSearch.toLowerCase()) ||
                        (c.phone ?? '').includes(customerSearch)
                      )
                      .slice(0, 8)
                      .map(c => (
                        <TouchableOpacity
                          key={c.id}
                          style={s.customerResultRow}
                          onPress={() => {
                            setSelectedCustomer(c);
                            setCustomerSearch('');
                            setForm(p => ({ ...p, customerId: c.id, customerName: c.name, customerPhone: c.phone ?? '' }));
                          }}
                        >
                          <Text style={s.customerResultName}>{c.name}</Text>
                          {c.phone ? <Text style={s.customerResultPhone}>{c.phone}</Text> : null}
                        </TouchableOpacity>
                      ))}

                    {/* Add new customer inline */}
                    <TouchableOpacity
                      style={s.addCustomerRow}
                      disabled={addingCustomer}
                      onPress={async () => {
                        if (!customerSearch.trim()) return;
                        try {
                          const res = await createCustomer({ name: customerSearch.trim() });
                          const newCustomer = res?.data ?? res;
                          setSelectedCustomer(newCustomer);
                          setForm(p => ({ ...p, customerId: newCustomer.id, customerName: newCustomer.name, customerPhone: newCustomer.phone ?? '' }));
                          setCustomerSearch('');
                        } catch {
                          Alert.alert('Error', 'Failed to add customer');
                        }
                      }}
                    >
                      {addingCustomer
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Text style={s.addCustomerText}>+ Add "{customerSearch.trim()}" as new customer</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Manual fields shown only when no search text */}
                {customerSearch.trim().length === 0 && (
                  <>
                    <F label="Customer Name *" fkey="customerName" placeholder="John Doe" />
                    <F label="Customer Phone" fkey="customerPhone" placeholder="+1 234 567 890" keyboard="phone-pad" />
                  </>
                )}
              </>
            )}

            {/* Phone shown when customer selected and phone is empty */}
            {selectedCustomer && !selectedCustomer.phone && (
              <F label="Customer Phone" fkey="customerPhone" placeholder="+1 234 567 890" keyboard="phone-pad" />
            )}
          </>
        )}

        {/* ── Step 2: Device & Specs ── */}
        {step === 2 && (
          <>
            <Text style={s.section}>Device</Text>
            <InlineSelect
              label="Manufacturer"
              value={form.manufacturerId}
              options={mfrs}
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
            <F label="Accessories" fkey="accessories" placeholder="Charger, Case…" />
            <F label="Physical Location" fkey="physicalLocation" placeholder="Shelf A3" />

            <Text style={s.section}>Phone Lock</Text>
            <View style={s.field}>
              <Text style={s.label}>Lock Type</Text>
              <View style={s.chipRow}>
                {[{ key: '', label: 'None' }, { key: 'passcode', label: 'Passcode' }, { key: 'pattern', label: 'Pattern' }].map(lt => (
                  <TouchableOpacity
                    key={lt.key}
                    style={[s.chip, { flex: 1 }, form.lockType === lt.key && s.chipActive]}
                    onPress={() => set('lockType')(lt.key)}
                  >
                    <Text style={[s.chipText, form.lockType === lt.key && { color: '#fff' }]}>{lt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {form.lockType === 'passcode' && <F label="Lock Code" fkey="lockCode" placeholder="Enter passcode" keyboard="numeric" />}
            {form.lockType === 'pattern'  && <F label="Pattern Sequence" fkey="patternSequence" placeholder="e.g. 1-2-3-6-9" />}

            <Text style={s.section}>Specifications</Text>
            {form.specs.map((sp, i) => (
              <View key={i} style={s.specRow}>
                <TextInput style={[s.input, { flex: 1 }]} value={sp.key} onChangeText={v => updateSpec(i, 'key', v)} placeholder="Storage" placeholderTextColor="#999" />
                <TextInput style={[s.input, { flex: 1 }]} value={sp.value} onChangeText={v => updateSpec(i, 'value', v)} placeholder="128GB" placeholderTextColor="#999" />
                <TouchableOpacity style={s.removeBtn} onPress={() => removeSpec(i)}><Text style={s.removeBtnText}>✕</Text></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.addLineBtn} onPress={() => setForm(p => ({ ...p, specs: [...p.specs, { key: '', value: '' }] }))}>
              <Text style={s.addLineBtnText}>+ Add Specification</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 3: Issue & Parts ── */}
        {step === 3 && (
          <>
            <Text style={s.section}>Issue</Text>
            <F label="Issue *" fkey="issue" placeholder="Describe the problem…" multi />
            <F label="Notes" fkey="notes" placeholder="Internal notes…" multi />

            <Text style={s.section}>Parts Used</Text>
            {form.lines.map((l, i) => (
              <View key={i} style={s.lineItem}>
                <Text style={s.lineItemName} numberOfLines={1}>{l.productName}</Text>
                <View style={s.lineItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { fontSize: 11 }]}>Qty</Text>
                    <TextInput style={s.lineInput} value={String(l.quantity)} onChangeText={v => updateLine(i, 'quantity', v)} keyboardType="numeric" placeholder="1" placeholderTextColor="#999" />
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={[s.label, { fontSize: 11 }]}>Unit Price</Text>
                    <TextInput style={s.lineInput} value={String(l.unitPrice)} onChangeText={v => updateLine(i, 'unitPrice', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#999" />
                  </View>
                  <TouchableOpacity style={[s.removeBtn, { alignSelf: 'flex-end' }]} onPress={() => removeLine(i)}><Text style={s.removeBtnText}>✕</Text></TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.addLineBtn} onPress={() => setShowProductSearch(true)}>
              <Text style={s.addLineBtnText}>+ Add Part</Text>
            </TouchableOpacity>

            <Text style={s.section}>Misc Charges</Text>
            {form.miscLines.map((l, i) => (
              <View key={i} style={s.lineItem}>
                <Text style={s.lineItemName} numberOfLines={1}>{l.name}</Text>
                <View style={s.lineItemRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={[s.label, { fontSize: 11 }]}>Price</Text>
                    <TextInput style={s.lineInput} value={String(l.price)} onChangeText={v => updateMisc(i, 'price', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#999" />
                  </View>
                  <TouchableOpacity style={[s.removeBtn, { alignSelf: 'flex-end' }]} onPress={() => removeMisc(i)}><Text style={s.removeBtnText}>✕</Text></TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={s.miscGrid}>
              {miscCharges.map(c => (
                <TouchableOpacity key={c.id} style={s.miscChip} onPress={() => setForm(p => ({ ...p, miscLines: [...p.miscLines, { miscChargeId: c.id, name: c.name, price: parseFloat(c.price ?? c.amount ?? 0) }] }))}>
                  <Text style={s.miscChipText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Step 4: Pricing & Assign ── */}
        {step === 4 && (
          <>
            <Text style={s.section}>Financials</Text>
            <F label="Estimated Cost" fkey="estimatedCost" placeholder="0.00" keyboard="decimal-pad" />
            <F label="Advance Payment" fkey="advancePayment" placeholder="0.00" keyboard="decimal-pad" />

            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Tax Excluded</Text>
                <Text style={[s.label, { fontSize: 12, color: colors.secondary, fontFamily: 'Outfit-Regular' }]}>Price already includes tax</Text>
              </View>
              <Switch
                value={form.isTaxExcluded}
                onValueChange={set('isTaxExcluded')}
                trackColor={{ false: '#e5e7eb', true: colors.primary + '80' }}
                thumbColor={form.isTaxExcluded ? colors.primary : '#fff'}
              />
            </View>
            {!form.isTaxExcluded && (
              <InlineSelect label="Tax" value={form.taxId}
                options={taxes.map(t => ({ id: t.id, name: `${t.name} (${t.rate}%)` }))}
                onSelect={set('taxId')} />
            )}

            <Text style={s.section}>Warranty</Text>
            <View style={s.warrantyRow}>
              <View style={{ flex: 2 }}>
                <Text style={s.label}>Duration</Text>
                <TextInput style={s.input} value={form.warrantyDays} onChangeText={set('warrantyDays')} placeholder="e.g. 90" placeholderTextColor="#999" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={s.label}>Unit</Text>
                {WARRANTY_UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[s.warrantyUnitBtn, form.warrantyUnit === u && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                    onPress={() => set('warrantyUnit')(u)}
                  >
                    <Text style={[s.warrantyUnitText, form.warrantyUnit === u && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={s.section}>Assignment</Text>
            <View style={s.field}>
              <Text style={s.label}>Priority</Text>
              <View style={s.chipRow}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity key={p} style={[s.chip, form.priority === p && s.chipActive]} onPress={() => set('priority')(p)}>
                    <Text style={[s.chipText, form.priority === p && { color: '#fff' }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <InlineSelect label="Status" value={form.statusId} options={statuses.map(st => ({ id: st.id, name: st.name }))} onSelect={set('statusId')} />
            <CascadingCategorySelect categories={categories} value={form.categoryId} onChange={set('categoryId')} label="Category" />
            <InlineSelect label="Assign To" value={form.assignedUserId}
              options={staffList.map(st => ({ id: st.id, name: st.name ?? st.fullName }))}
              onSelect={set('assignedUserId')} />
            <F label="Expected Completion (YYYY-MM-DD)" fkey="expectedCompletion" placeholder="2025-01-01" />
          </>
        )}

      </ScrollView>

      {/* ── Footer nav ── */}
      <View style={s.footer}>
        <TouchableOpacity style={s.backBtn} onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}>
          <Text style={s.backBtnText}>{step > 1 ? '← Back' : 'Cancel'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.nextBtn} onPress={goNext} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : (
            <Text style={s.nextBtnText}>{step === 4 ? 'Create Ticket' : 'Next →'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ProductSearchModal
        visible={showProductSearch}
        products={allProducts}
        onClose={line => {
          setShowProductSearch(false);
          if (line) setForm(p => ({ ...p, lines: [...p.lines, line] }));
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },

  // Stepper
  stepperWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#eee' },
  stepItem: { alignItems: 'center', gap: 4, flex: 0 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: colors.primary },
  stepDone: { backgroundColor: '#22c55e' },
  stepNum: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#6b7280' },
  stepLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af', maxWidth: 60, textAlign: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginBottom: 14 },
  stepDesc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0' },

  // Customer search
  selectedCustomer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1.5, borderColor: '#bfdbfe', borderRadius: 10, padding: 12, marginBottom: 14 },
  selectedCustomerName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1e40af' },
  selectedCustomerPhone: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#3b82f6', marginTop: 2 },
  selectedCustomerClear: { fontSize: 16, color: '#93c5fd', paddingLeft: 12, fontFamily: 'Outfit-Bold' },
  customerResultsList: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, overflow: 'hidden', marginBottom: 14, backgroundColor: '#fff' },
  customerResultRow: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  customerResultName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  customerResultPhone: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 1 },
  addCustomerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, backgroundColor: '#f0f9ff', borderTopWidth: 1, borderColor: '#e0f2fe', minHeight: 46 },
  addCustomerText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary },

  // Form
  body: { flex: 1 },
  section: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  selectText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  chevron: { fontSize: 12, color: '#9ca3af' },

  // Chips
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151' },

  // Switch
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1.5, borderColor: '#D0D5DD' },

  // Specs
  specRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  removeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 14, color: '#ef4444', fontFamily: 'Outfit-Bold' },
  addLineBtn: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  addLineBtnText: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 14 },

  // Line items
  lineItem: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  lineItemName: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 6 },
  lineItemRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  lineInput: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#f9fafb' },

  // Misc grid
  miscGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 12 },
  miscChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  miscChipText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151' },

  // Warranty
  warrantyRow: { flexDirection: 'row', marginBottom: 14 },
  warrantyUnitBtn: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 6, paddingVertical: 6, alignItems: 'center', marginBottom: 4 },
  warrantyUnitText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#374151' },

  // Footer
  footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  backBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  backBtnText: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  nextBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  nextBtnText: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#fff' },

  // Picker
  pickerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%', padding: 12 },
  pickerRow: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  pickerText: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111827' },

  // Product search modal
  fullBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  fullCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  sheetTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 12 },
  cancelBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#f3f4f6' },
  cancelText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  emptyText: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', padding: 16 },
});
