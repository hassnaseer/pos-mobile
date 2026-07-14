import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { useHRMSDashboard, useHRMSAttendanceTrend } from '../../../../services/api/posApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import colors from '../../../../theme/colors';

const MODULE_CARDS = [
  { route: 'HRMSAttendance',    label: 'Attendance',      perm: PERMISSIONS.MANAGE_ATTENDANCE,    color: '#3B82F6' },
  { route: 'HRMSLeave',         label: 'Leave',           perm: PERMISSIONS.MANAGE_LEAVE,         color: '#10B981' },
  { route: 'HRMSClaims',        label: 'Claims',          perm: PERMISSIONS.MANAGE_CLAIMS,        color: '#F59E0B' },
  { route: 'HRMSAnnouncements', label: 'Announcements',   perm: PERMISSIONS.MANAGE_ANNOUNCEMENTS, color: '#8B5CF6' },
  { route: 'HRMSPayroll',       label: 'Payroll',         perm: PERMISSIONS.MANAGE_PAYROLL,       color: '#EC4899' },
  { route: 'Staff',             label: 'Employees',       perm: PERMISSIONS.MANAGE_STAFF,         color: '#F472B6' },
  { route: 'OrgChart',          label: 'Org. Chart',      perm: PERMISSIONS.MANAGE_STAFF,         color: '#0EA5E9' },
  { route: 'Departments',       label: 'Departments',     perm: PERMISSIONS.MANAGE_DEPARTMENTS,   color: '#6366F1' },
  { route: 'HRMSTasks',         label: 'Tasks',           perm: PERMISSIONS.MANAGE_TASKS,         color: '#06B6D4' },
  { route: 'HRMSReviews',       label: 'Annual Reviews',  perm: PERMISSIONS.MANAGE_REVIEWS,       color: '#F97316' },
  { route: 'HRMSJobBoard',      label: 'Job Board',       perm: PERMISSIONS.MANAGE_INTERNAL_JOBS, color: '#14B8A6' },
  { route: 'HRMSDocuments',     label: 'Documents',       perm: PERMISSIONS.MANAGE_DOCUMENTS,     color: '#7C3AED' },
  { route: 'HRMSTrainings',     label: 'Trainings',       perm: PERMISSIONS.MANAGE_TRAININGS,     color: '#84CC16' },
];

const STAT_COLORS = ['#4F46E5', '#0891B2', '#D97706', '#DC2626', '#059669'];
const screenWidth = Dimensions.get('window').width;

function StatCard({ label, value, color }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const HRMSDashboardScreen = () => {
  const navigation = useNavigation();
  const perms = usePermissions();

  const { data: stats, isLoading: statsLoading, isFetching: statsFetching, refetch: refetchStats } = useHRMSDashboard();
  const { data: rawTrend = [], isLoading: trendLoading, isFetching: trendFetching, refetch: refetchTrend } = useHRMSAttendanceTrend();
  const trend = Array.isArray(rawTrend) ? rawTrend : (rawTrend?.data ?? []);

  const visible = MODULE_CARDS.filter(m => perms.can(m.perm));

  const statCards = [
    { label: 'Total Staff', value: stats?.totalStaff ?? '—' },
    { label: "Today's Attendance", value: stats?.todayAttendance ?? '—' },
    { label: 'Pending Leaves', value: stats?.pendingLeaves ?? '—' },
    { label: 'Pending Claims', value: stats?.pendingClaims ?? '—' },
    ...(stats?.salaryDataIncluded ? [{ label: 'Total Paid Salaries', value: `$${Math.round(stats.totalPaidSalaries ?? 0).toLocaleString()}` }] : []),
  ];

  const chartData = {
    labels: trend.map(t => new Date(t.date).toLocaleDateString([], { day: 'numeric' })).filter((_, i) => i % 2 === 0 || i === trend.length - 1),
    datasets: [
      { data: trend.map(t => t.present ?? 0), color: () => '#16a34a', strokeWidth: 2 },
      { data: trend.map(t => t.late ?? 0), color: () => '#f59e0b', strokeWidth: 2 },
      { data: trend.map(t => t.halfDay ?? 0), color: () => '#dc2626', strokeWidth: 2 },
    ],
    legend: ['Present', 'Late', 'Half Day'],
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={statsFetching || trendFetching}
          onRefresh={() => { refetchStats(); refetchTrend(); }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.heading}>HRMS Dashboard</Text>
      <Text style={styles.sub}>Your workforce, at a glance</Text>

      {statsLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 10 }}>
          {statCards.map((s, i) => (
            <StatCard key={s.label} label={s.label} value={s.value} color={STAT_COLORS[i % STAT_COLORS.length]} />
          ))}
        </ScrollView>
      )}

      {!!stats?.departments?.length && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Department Headcount</Text>
          {stats.departments.map(d => (
            <View key={d.id} style={styles.deptRow}>
              <Text style={styles.deptName}>{d.name}</Text>
              <Text style={styles.deptCount}>{d.headcount}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Attendance Trend (14 days)</Text>
        {trendLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : trend.length === 0 ? (
          <Text style={styles.empty}>No attendance data yet.</Text>
        ) : (
          <LineChart
            data={chartData}
            width={screenWidth - 60}
            height={200}
            bezier
            chartConfig={{
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
              labelColor: () => '#6b7280',
              propsForDots: { r: '3' },
            }}
            style={{ borderRadius: 12, marginLeft: -16 }}
          />
        )}
      </View>

      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.grid}>
        {visible.map(card => (
          <TouchableOpacity
            key={card.route}
            style={[styles.card, { borderLeftColor: card.color }]}
            onPress={() => navigation.navigate('Main', { screen: card.route })}
            activeOpacity={0.7}
          >
            <View style={[styles.dot, { backgroundColor: card.color }]} />
            <Text style={styles.cardLabel}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {visible.length === 0 && (
        <Text style={styles.empty}>No HRMS modules are enabled for your account.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  content:   { padding: 16, paddingBottom: 32 },
  heading:   { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 4 },
  sub:       { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6B7280', marginBottom: 16 },

  statCard: { width: 130, borderRadius: 14, padding: 14 },
  statValue: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#fff' },
  statLabel: { fontSize: 12, fontFamily: 'Outfit-Medium', color: 'rgba(255,255,255,0.85)', marginTop: 4 },

  sectionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 10 },
  deptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderColor: '#f3f4f6' },
  deptName: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151' },
  deptCount: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },

  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:      { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  dot:       { width: 10, height: 10, borderRadius: 5, marginBottom: 10 },
  cardLabel: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111' },
  empty:     { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 16, marginBottom: 16 },
});

export default HRMSDashboardScreen;
