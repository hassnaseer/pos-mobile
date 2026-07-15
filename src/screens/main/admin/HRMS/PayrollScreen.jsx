import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import {
  usePayrollRuns, useRunPayroll, useDeletePayrollRun,
  usePayrollSlips, useAllPayrollSlips, usePreviewPayslip,
  useStaff, useAdminSettings, usePayslipTemplate,
} from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import InvoicePreviewModal from '../../../../components/InvoicePreviewModal/InvoicePreviewModal';
import { generateSlipHtml } from '../../../../utils/payslipPrinter';
import colors from '../../../../theme/colors';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const PERIOD_TYPES = [
  { id: 'monthly', name: 'Monthly' },
  { id: 'weekly', name: 'Weekly' },
  { id: 'daily', name: 'Daily' },
  { id: 'custom', name: 'Custom Range' },
];

// Mirrors web's constants.ts slipPeriodLabel — monthly (or legacy, no periodStart) slips show
// "Month Year"; daily/weekly/custom slips show their real date range.
const slipPeriodLabel = s => {
  if (!s.periodType || s.periodType === 'monthly' || !s.periodStart) {
    return `${MONTHS[(s.month ?? 1) - 1]} ${s.year}`;
  }
  const fmt = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return s.periodType === 'daily' ? fmt(s.periodStart) : `${fmt(s.periodStart)} – ${fmt(s.periodEnd ?? s.periodStart)}`;
};

// ─── Slips modal (bulk run only) ───────────────────────────────────────────────
const SlipsModal = ({ runId, runLabel, onClose, fmt, symbol }) => {
  const { data: rawSlips = [], isLoading } = usePayrollSlips(runId);
  const { data: businessSettings } = useAdminSettings();
  const { data: payslipTemplateCfg } = usePayslipTemplate();
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSlipId, setPreviewSlipId] = useState(null);
  const slips = Array.isArray(rawSlips) ? rawSlips : (rawSlips?.data ?? []);

  const handlePrintSlip = s => {
    const html = generateSlipHtml(
      s, runLabel, businessSettings?.name || '', symbol, payslipTemplateCfg,
      { logoUrl: businessSettings?.logoUrl, phone: businessSettings?.phone, email: businessSettings?.email, address: businessSettings?.address },
    );
    setPreviewHtml(html);
    setPreviewSlipId(s.id);
  };

  return (
    <Modal visible={!!runId} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payroll Slips — {runLabel}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : slips.length === 0 ? (
            <Text style={styles.empty}>No slips found.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {slips.map(s => (
                <View key={s.id} style={styles.slipRow}>
                  <View style={styles.slipInfo}>
                    <Text style={styles.slipName}>{s.employee?.name ?? s.employeeName ?? '—'}</Text>
                    <Text style={styles.slipSub}>
                      Base: {fmt(s.baseSalary ?? 0)}  ·  Claims: {fmt(s.claimsTotal ?? 0)}
                      {s.commissionTotal > 0 ? `  ·  Commission: PKR ${Number(s.commissionTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                      {s.transportDeduction > 0 ? `  ·  Transport: -${fmt(s.transportDeduction)}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.slipNet}>{fmt(s.netPay ?? 0)}</Text>
                  <TouchableOpacity style={styles.slipPrintBtn} onPress={() => handlePrintSlip(s)}>
                    <Text style={styles.slipPrintBtnText}>Print</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <InvoicePreviewModal
        visible={!!previewSlipId}
        onClose={() => setPreviewSlipId(null)}
        html={previewHtml}
        fileName={`payslip-${runLabel}`}
        title="Payslip"
      />
    </Modal>
  );
};

// ─── Bulk "Run Payroll" modal — legacy monthly path, kept as a secondary option ─
const RunPayrollModal = ({ visible, onClose }) => {
  const perms = usePermissions();
  const canManageTransport = perms.can(PERMISSIONS.MANAGE_TRANSPORT);
  const { data: rawStaff = [] } = useStaff();
  const { mutateAsync: runPayroll, isPending } = useRunPayroll();
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);

  const [form, setForm] = useState({
    month: String(new Date().getMonth() + 1),
    year:  String(CURRENT_YEAR),
    employeeId: '',
    transportDeduction: '',
  });
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  const selectedEmployee = staffList.find(s => s.id === form.employeeId);
  const selectedIsBlocked = selectedEmployee?.employeeType === 'training_nesting';

  const handleRun = async () => {
    try {
      await runPayroll({
        periodType: 'monthly',
        month:      Number(form.month),
        year:       Number(form.year),
        employeeId: form.employeeId || undefined,
        transportDeduction: form.employeeId && form.transportDeduction ? Number(form.transportDeduction) : undefined,
      });
      Alert.alert('Success', 'Payroll processed successfully');
      onClose();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to run payroll');
    }
  };

  const MonthPicker = () => {
    const [open, setOpen] = useState(false);
    const label = MONTHS[Number(form.month) - 1];
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Month</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
          <Text style={styles.selectText}>{label}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        <Modal visible={open} transparent animationType="fade">
          <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
            <View style={styles.pickerSheet}>
              <ScrollView>
                {MONTHS.map((m, i) => (
                  <TouchableOpacity key={i} style={styles.pickerOption} onPress={() => { set('month')(String(i + 1)); setOpen(false); }}>
                    <Text style={[styles.pickerText, form.month === String(i + 1) && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const YearPicker = () => {
    const [open, setOpen] = useState(false);
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Year</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
          <Text style={styles.selectText}>{form.year}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        <Modal visible={open} transparent animationType="fade">
          <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
            <View style={styles.pickerSheet}>
              {YEARS.map(y => (
                <TouchableOpacity key={y} style={styles.pickerOption} onPress={() => { set('year')(String(y)); setOpen(false); }}>
                  <Text style={[styles.pickerText, form.year === String(y) && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const StaffPicker = () => {
    const [open, setOpen] = useState(false);
    const selected = staffList.find(s => s.id === form.employeeId);
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Employee (optional — leave blank for all)</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setOpen(true)}>
          <Text style={[styles.selectText, !selected && { color: '#999' }]}>{selected?.name ?? selected?.fullName ?? 'All Employees'}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
        <Modal visible={open} transparent animationType="fade">
          <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
            <View style={styles.pickerSheet}>
              <ScrollView>
                <TouchableOpacity style={styles.pickerOption} onPress={() => { set('employeeId')(''); setOpen(false); }}>
                  <Text style={styles.pickerText}>All Employees</Text>
                </TouchableOpacity>
                {staffList.map(s => {
                  const blocked = s.employeeType === 'training_nesting';
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.pickerOption}
                      disabled={blocked}
                      onPress={() => { set('employeeId')(s.id); setOpen(false); }}
                    >
                      <Text style={[
                        styles.pickerText,
                        form.employeeId === s.id && { color: colors.primary, fontFamily: 'Outfit-SemiBold' },
                        blocked && { color: '#D0D5DD' },
                      ]}>
                        {s.name ?? s.fullName}{blocked ? ' (Training & Nesting)' : ''}
                      </Text>
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bulk Monthly Run</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <Text style={styles.runDesc}>Calculate net pay based on base salary and approved claims for the selected calendar month.</Text>
          <MonthPicker />
          <YearPicker />
          <StaffPicker />
          {selectedIsBlocked && (
            <Text style={styles.blockedText}>Payroll can't be run for employees in Training & Nesting status.</Text>
          )}
          {!!form.employeeId && !selectedIsBlocked && canManageTransport && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Transportation Deduction (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={form.transportDeduction}
                onChangeText={set('transportDeduction')}
                placeholder="Leave blank if not applicable"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              <Text style={styles.runDesc}>The employee's half of the company pick-and-drop transport cost for this period.</Text>
            </View>
          )}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleRun} disabled={isPending || selectedIsBlocked}>
              {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Run Payroll</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const PayrollScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_PAYROLL);
  const { fmt, symbol } = useCurrency();

  const { data: rawStaff = [] } = useStaff();
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const staffOptions = staffList.map(s => ({ id: s.id, name: s.name ?? s.fullName, employeeType: s.employeeType }));

  const { data: businessSettings } = useAdminSettings();
  const { data: payslipTemplateCfg } = usePayslipTemplate();

  // Browse filters
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const { data: rawAllSlips = [], isLoading: allSlipsLoading } = useAllPayrollSlips({
    employeeId: filterEmployeeId || undefined, from: filterFrom || undefined, to: filterTo || undefined, search: filterSearch || undefined,
  });
  const allSlips = Array.isArray(rawAllSlips) ? rawAllSlips : (rawAllSlips?.data ?? []);

  // Generate panel
  const [genEmployeeId, setGenEmployeeId] = useState('');
  const [genPeriodType, setGenPeriodType] = useState('monthly');
  const [genMonth, setGenMonth] = useState(String(new Date().getMonth() + 1));
  const [genYear, setGenYear] = useState(String(CURRENT_YEAR));
  const [genPeriodStart, setGenPeriodStart] = useState('');
  const [genPeriodEnd, setGenPeriodEnd] = useState('');
  const [genTransportDeduction, setGenTransportDeduction] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewHtmlOpen, setPreviewHtmlOpen] = useState(false);

  const { mutateAsync: previewPayslip, isPending: previewLoading } = usePreviewPayslip();
  const { mutateAsync: runPayroll, isPending: generating } = useRunPayroll();

  const genSelectedEmployee = staffOptions.find(s => s.id === genEmployeeId);
  const genIsBlocked = genSelectedEmployee?.employeeType === 'training_nesting';
  const periodReady = genPeriodType === 'monthly'
    ? !!genMonth && !!genYear
    : genPeriodType === 'custom'
      ? !!genPeriodStart && !!genPeriodEnd
      : !!genPeriodStart;

  const buildPayload = () => {
    const base = { employeeId: genEmployeeId, transportDeduction: genTransportDeduction ? Number(genTransportDeduction) : undefined };
    if (genPeriodType === 'monthly') return { ...base, periodType: 'monthly', month: Number(genMonth), year: Number(genYear) };
    if (genPeriodType === 'custom') return { ...base, periodType: 'custom', periodStart: genPeriodStart, periodEnd: genPeriodEnd };
    return { ...base, periodType: genPeriodType, periodStart: genPeriodStart };
  };

  const handlePreview = async () => {
    if (!genEmployeeId || !periodReady) return;
    try {
      const res = await previewPayslip(buildPayload());
      setPreview(res?.data ?? res);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to preview payslip');
    }
  };

  const handleGenerate = async () => {
    try {
      await runPayroll(buildPayload());
      Alert.alert('Success', 'Payslip generated');
      setPreview(null);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to generate payslip');
    }
  };

  const previewHtml = preview
    ? generateSlipHtml(
        preview, slipPeriodLabel(preview), businessSettings?.name || '', symbol, payslipTemplateCfg,
        { logoUrl: businessSettings?.logoUrl, phone: businessSettings?.phone, email: businessSettings?.email, address: businessSettings?.address },
      )
    : '';

  // Bulk (legacy monthly) runs — secondary, collapsible
  const [showBulkRuns, setShowBulkRuns] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [slipsRunId, setSlipsRunId] = useState(null);
  const [slipsRunLabel, setSlipsRunLabel] = useState('');
  const { data: rawRuns = [] } = usePayrollRuns();
  const { mutate: deleteRun, isPending: deleting } = useDeletePayrollRun();
  const runs = Array.isArray(rawRuns) ? rawRuns : (rawRuns?.data ?? []);

  const handleDeleteRun = run => Alert.alert('Delete Payroll Run', `Delete ${MONTHS[run.month - 1]} ${run.year} payroll run?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteRun(run.id) },
  ]);

  const handlePrintSlip = s => {
    // Populate the same preview modal used for previews, but with a persisted slip's data.
    setPreview(s);
    setPreviewHtmlOpen(true);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Payroll</Text>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setRunOpen(true)}>
            <Text style={styles.addBtnText}>▶ Bulk Monthly Run</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {canManage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generate a Payslip</Text>
            <InlinePicker
              label="Employee"
              value={genEmployeeId}
              options={staffOptions}
              onSelect={setGenEmployeeId}
              placeholder="Select employee"
              allowNone={false}
            />
            <InlinePicker
              label="Period"
              value={genPeriodType}
              options={PERIOD_TYPES}
              onSelect={setGenPeriodType}
              allowNone={false}
            />
            {genPeriodType === 'monthly' ? (
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <InlinePicker
                    label="Month"
                    value={genMonth}
                    options={MONTHS.map((m, i) => ({ id: String(i + 1), name: m }))}
                    onSelect={setGenMonth}
                    allowNone={false}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InlinePicker
                    label="Year"
                    value={genYear}
                    options={YEARS.map(y => ({ id: String(y), name: String(y) }))}
                    onSelect={setGenYear}
                    allowNone={false}
                  />
                </View>
              </View>
            ) : genPeriodType === 'custom' ? (
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <DatePicker label="From" value={genPeriodStart} onDateChange={setGenPeriodStart} />
                </View>
                <View style={{ flex: 1 }}>
                  <DatePicker label="To" value={genPeriodEnd} onDateChange={setGenPeriodEnd} />
                </View>
              </View>
            ) : (
              <DatePicker
                label={genPeriodType === 'daily' ? 'Date' : 'Week Starting'}
                value={genPeriodStart}
                onDateChange={setGenPeriodStart}
              />
            )}
            {genIsBlocked && (
              <Text style={styles.blockedText}>Payroll can't be run for employees in Training & Nesting status.</Text>
            )}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Transportation Deduction (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={genTransportDeduction}
                onChangeText={setGenTransportDeduction}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.previewBtn, (!genEmployeeId || !periodReady || genIsBlocked) && { opacity: 0.5 }]}
                disabled={!genEmployeeId || !periodReady || genIsBlocked || previewLoading}
                onPress={handlePreview}
              >
                {previewLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.previewBtnText}>Preview</Text>}
              </TouchableOpacity>
              {preview && (
                <TouchableOpacity style={styles.saveBtnInline} disabled={generating} onPress={handleGenerate}>
                  {generating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Generate Payslip</Text>}
                </TouchableOpacity>
              )}
            </View>

            {preview && (
              <View style={styles.previewBox}>
                <Text style={styles.previewHint}>Preview only — nothing is saved until you tap Generate Payslip.</Text>
                <Text style={styles.slipSub}>
                  Base: {fmt(preview.baseSalary ?? 0)}  ·  Claims: {fmt(preview.claimsTotal ?? 0)}
                  {preview.commissionTotal > 0 ? `  ·  Commission: PKR ${Number(preview.commissionTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                </Text>
                <Text style={styles.slipNet}>Net Pay: {fmt(preview.netPay ?? 0)}</Text>
                <TouchableOpacity style={styles.slipPrintBtn} onPress={() => setPreviewHtmlOpen(true)}>
                  <Text style={styles.slipPrintBtnText}>View Styled Preview</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payslips</Text>
          <InlinePicker
            value={filterEmployeeId}
            options={[{ id: '', name: 'All Employees' }, ...staffOptions]}
            onSelect={setFilterEmployeeId}
          />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}><DatePicker label="From" value={filterFrom} onDateChange={setFilterFrom} /></View>
            <View style={{ flex: 1 }}><DatePicker label="To" value={filterTo} onDateChange={setFilterTo} /></View>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Search by employee name..."
            placeholderTextColor="#999"
            value={filterSearch}
            onChangeText={setFilterSearch}
          />

          {allSlipsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : allSlips.length === 0 ? (
            <Text style={styles.empty}>No payslips match the selected filters yet.</Text>
          ) : (
            allSlips.map(s => (
              <View key={s.id} style={styles.slipRow}>
                <View style={styles.slipInfo}>
                  <Text style={styles.slipName}>{s.employee?.name ?? '—'}</Text>
                  <Text style={styles.slipSub}>
                    {slipPeriodLabel(s)} · {fmt(s.netPay ?? 0)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.slipPrintBtn} onPress={() => handlePrintSlip(s)}>
                  <Text style={styles.slipPrintBtnText}>Print</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.collapseHeader} onPress={() => setShowBulkRuns(v => !v)}>
          <Text style={styles.collapseHeaderText}>{showBulkRuns ? '▾' : '▸'} Bulk Monthly Runs ({runs.length})</Text>
        </TouchableOpacity>
        {showBulkRuns && (
          <View style={styles.section}>
            {runs.length === 0 ? (
              <Text style={styles.empty}>No bulk payroll runs yet.</Text>
            ) : (
              runs.map(item => (
                <View key={String(item.id)} style={styles.row}>
                  <View style={styles.iconWrap}><Text style={styles.iconText}>$</Text></View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{MONTHS[(item.month ?? 1) - 1]} {item.year}</Text>
                    <Text style={styles.rowSub}>
                      {item.processedBy?.name ? `By ${item.processedBy.name}` : ''}
                      {item.createdAt ? `  ·  ${new Date(item.createdAt).toLocaleDateString()}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.badgeText, { color: '#059669' }]}>{item.status ?? 'processed'}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.slipsBtn}
                      onPress={() => { setSlipsRunId(item.id); setSlipsRunLabel(`${MONTHS[(item.month ?? 1) - 1]} ${item.year}`); }}
                    >
                      <Text style={styles.slipsBtnText}>Slips</Text>
                    </TouchableOpacity>
                    {canManage && (
                      <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteRun(item)} disabled={deleting}>
                        <Text style={styles.delText}>Del</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <RunPayrollModal visible={runOpen} onClose={() => setRunOpen(false)} />
      <SlipsModal runId={slipsRunId} runLabel={slipsRunLabel} onClose={() => { setSlipsRunId(null); setSlipsRunLabel(''); }} fmt={fmt} symbol={symbol} />
      <InvoicePreviewModal
        visible={previewHtmlOpen}
        onClose={() => setPreviewHtmlOpen(false)}
        html={previewHtml}
        fileName={preview ? `payslip-${slipPeriodLabel(preview)}` : 'payslip'}
        title="Payslip"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f4f6f9' },
  topBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading:     { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  addBtn:      { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:  { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  section:     { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 16 },
  sectionTitle:{ fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 10 },
  row2:        { flexDirection: 'row', gap: 10 },
  row:         { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0f0f0', marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap:    { width: 38, height: 38, borderRadius: 10, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconText:    { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#059669' },
  rowInfo:     { flex: 1 },
  rowName:     { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowSub:      { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:   { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  actions:     { flexDirection: 'row', gap: 6 },
  slipsBtn:    { backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  slipsBtnText:{ fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  delBtn:      { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  delText:     { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#DC2626' },
  empty:       { textAlign: 'center', color: '#9CA3AF', fontFamily: 'Outfit-Regular', fontSize: 14, lineHeight: 22, paddingVertical: 16 },
  collapseHeader: { paddingHorizontal: 16, paddingTop: 16 },
  collapseHeaderText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#6B7280' },
  // Modal
  modalBg:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  closeX:      { fontSize: 18, color: '#6B7280', padding: 4 },
  modalTitle:  { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111' },
  runDesc:     { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginBottom: 16 },
  field:       { marginBottom: 14 },
  fieldLabel:  { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  textInput:   { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 12 },
  blockedText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#DC2626', marginBottom: 14 },
  selectBtn:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  selectText:  { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  chevron:     { fontSize: 12, color: '#6B7280' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 300, padding: 8 },
  pickerOption:{ paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pickerText:  { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions:{ flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn:   { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:  { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn:     { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnInline: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  saveText:    { fontFamily: 'Outfit-SemiBold', color: '#fff' },
  previewBtn:  { flex: 1, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  previewBtnText: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  previewBox:  { marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F0F0F0' },
  previewHint: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginBottom: 8 },
  // Slips
  slipRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0', gap: 10 },
  slipInfo:    { flex: 1 },
  slipName:    { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111' },
  slipSub:     { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  slipNet:     { fontSize: 15, fontFamily: 'Outfit-Bold', color: '#059669', marginTop: 4 },
  slipPrintBtn:{ backgroundColor: '#EBF0F5', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  slipPrintBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
});

export default PayrollScreen;
