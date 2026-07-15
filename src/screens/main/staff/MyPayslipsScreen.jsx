import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { useMyPayslips } from '../../../services/api/posApi';
import { useCurrency } from '../../../context/CurrencyContext';
import { useAuth } from '../../../context/AuthContext';
import InvoicePreviewModal from '../../../components/InvoicePreviewModal/InvoicePreviewModal';
import { buildEmployeePayslipHtml } from '../../../utils/payslipPrinter';
import colors from '../../../theme/colors';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STATUS_COLOR = { Pending: '#F59E0B', Paid: '#10B981', Cleared: '#3B82F6' };
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const MyPayslipsScreen = () => {
  const { fmt, symbol } = useCurrency();
  const { user } = useAuth();
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSlipId, setPreviewSlipId] = useState(null);
  const { data: raw = [], isLoading, refetch } = useMyPayslips(month, year);
  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const handlePrint = item => {
    const period = `${MONTHS[item.month - 1] ?? item.month} ${item.year}`;
    const html = buildEmployeePayslipHtml(item, period, user?.businessName, user?.name, user?.email, symbol);
    setPreviewHtml(html);
    setPreviewSlipId(item.id);
  };

  return (
    <View style={styles.root}>
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, !year && styles.filterChipActive]} onPress={() => setYear('')}>
            <Text style={[styles.filterChipText, !year && styles.filterChipTextActive]}>All Years</Text>
          </TouchableOpacity>
          {YEARS.map(y => (
            <TouchableOpacity key={y} style={[styles.filterChip, year === String(y) && styles.filterChipActive]} onPress={() => setYear(String(y))}>
              <Text style={[styles.filterChipText, year === String(y) && styles.filterChipTextActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, !month && styles.filterChipActive]} onPress={() => setMonth('')}>
            <Text style={[styles.filterChipText, !month && styles.filterChipTextActive]}>All Months</Text>
          </TouchableOpacity>
          {MONTHS.map((m, i) => (
            <TouchableOpacity key={m} style={[styles.filterChip, month === String(i + 1) && styles.filterChipActive]} onPress={() => setMonth(String(i + 1))}>
              <Text style={[styles.filterChipText, month === String(i + 1) && styles.filterChipTextActive]}>{m.slice(0, 3)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowName}>{MONTHS[item.month - 1] ?? item.month} {item.year}</Text>
              <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>
                  {item.status ?? 'Pending'}
                </Text>
              </View>
            </View>

            <View style={styles.breakdownRow}>
              <View style={styles.breakdownCol}>
                <Text style={styles.breakdownLabel}>Base Salary</Text>
                <Text style={styles.breakdownVal}>{fmt(item.baseSalary)}</Text>
              </View>
              <View style={styles.breakdownCol}>
                <Text style={styles.breakdownLabel}>Claims Added</Text>
                <Text style={[styles.breakdownVal, { color: '#16a34a' }]}>+{fmt(item.claimsTotal ?? 0)}</Text>
              </View>
              <View style={styles.breakdownCol}>
                <Text style={styles.breakdownLabel}>Deductions</Text>
                <Text style={[styles.breakdownVal, { color: '#dc2626' }]}>-{fmt(item.deductions ?? 0)}</Text>
              </View>
            </View>

            <View style={styles.rowFooter}>
              <View>
                <Text style={styles.rowNet}>Net Pay: {fmt(item.netPay)}</Text>
                {item.salaryDate && (
                  <Text style={styles.rowMeta}>Paid on {new Date(item.salaryDate).toLocaleDateString()}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.printBtn} onPress={() => handlePrint(item)}>
                <Text style={styles.printBtnText}>Print / Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No payslips available.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />

      <InvoicePreviewModal
        visible={!!previewSlipId}
        onClose={() => setPreviewSlipId(null)}
        html={previewHtml}
        fileName="payslip"
        title="Payslip"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#f4f6f9' },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 8 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#555' },
  filterChipTextActive: { color: '#fff' },
  row:       { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rowName:   { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#111' },
  breakdownRow: { flexDirection: 'row', backgroundColor: '#f9fafb', borderRadius: 8, paddingVertical: 10, marginBottom: 10 },
  breakdownCol: { flex: 1, alignItems: 'center' },
  breakdownLabel: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9CA3AF' },
  breakdownVal: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111', marginTop: 2 },
  rowNet:    { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginTop: 2 },
  rowMeta:   { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 4 },
  rowFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 2 },
  printBtn:  { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary },
  printBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  empty:     { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MyPayslipsScreen;
