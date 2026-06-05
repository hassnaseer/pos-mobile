import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import {
  useMyAttendance, useClockIn, useClockOut, useStaffDashboard,
} from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const fmtTime = ts => {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Clock In/Out Card ─────────────────────────────────────────────────────────
const AttendanceCard = ({ navigation }) => {
  const { data: records = [], isLoading } = useMyAttendance();
  const { mutateAsync: clockIn, isPending: clockingIn } = useClockIn();
  const { mutateAsync: clockOut, isPending: clockingOut } = useClockOut();

  const todayStr = new Date().toISOString().slice(0, 10);
  const today = useMemo(
    () => records.find(r => r.date?.slice(0, 10) === todayStr) ?? null,
    [records, todayStr],
  );

  const isClockedIn = !!today && !today.clockOut;
  const isCompleted = !!today && !!today.clockOut;

  const handleClockIn = async () => {
    try { await clockIn({}); }
    catch (e) { Alert.alert('Error', e?.message ?? 'Failed to clock in'); }
  };

  const handleClockOut = async () => {
    try { await clockOut({}); }
    catch (e) { Alert.alert('Error', e?.message ?? 'Failed to clock out'); }
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        {isClockedIn && (
          <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
            <Text style={[styles.badgeText, { color: '#065f46' }]}>Clocked In</Text>
          </View>
        )}
        {isCompleted && (
          <View style={[styles.badge, { backgroundColor: '#dbeafe' }]}>
            <Text style={[styles.badgeText, { color: '#1e40af' }]}>Shift Complete</Text>
          </View>
        )}
        {!today && !isLoading && (
          <View style={[styles.badge, { backgroundColor: '#f3f4f6' }]}>
            <Text style={[styles.badgeText, { color: '#6b7280' }]}>Not Started</Text>
          </View>
        )}
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Clock In</Text>
          <Text style={styles.timeValue}>{fmtTime(today?.clockIn ?? null)}</Text>
        </View>
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Clock Out</Text>
          <Text style={styles.timeValue}>{fmtTime(today?.clockOut ?? null)}</Text>
        </View>
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Hours</Text>
          <Text style={styles.timeValue}>
            {today?.hoursWorked != null ? `${today.hoursWorked}h` : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.clockBtnRow}>
        {!isClockedIn && !isCompleted && (
          <TouchableOpacity
            style={[styles.clockBtn, { backgroundColor: '#16a34a' }]}
            onPress={handleClockIn}
            disabled={clockingIn}
            activeOpacity={0.8}
          >
            <Text style={styles.clockBtnText}>
              {clockingIn ? 'Processing…' : 'Clock In'}
            </Text>
          </TouchableOpacity>
        )}
        {isClockedIn && (
          <TouchableOpacity
            style={[styles.clockBtn, { backgroundColor: '#dc2626' }]}
            onPress={handleClockOut}
            disabled={clockingOut}
            activeOpacity={0.8}
          >
            <Text style={styles.clockBtnText}>
              {clockingOut ? 'Processing…' : 'Clock Out'}
            </Text>
          </TouchableOpacity>
        )}
        {isCompleted && (
          <View style={[styles.clockBtn, { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' }]}>
            <Text style={[styles.clockBtnText, { color: '#1d4ed8' }]}>
              Shift complete — {today.hoursWorked}h worked
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.historyBtn]}
          onPress={() => navigation.navigate('MyAttendance')}
          activeOpacity={0.7}
        >
          <Text style={styles.historyBtnText}>View History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── HRMS Quick Links ──────────────────────────────────────────────────────────
const HRMS_LINKS = [
  { label: 'Attendance', route: 'MyAttendance' },
  { label: 'Leave',      route: 'MyLeave' },
  { label: 'Claims',     route: 'MyClaims' },
  { label: 'Payslips',   route: 'MyPayslips' },
  { label: 'Tasks',      route: 'MyTasks' },
  { label: 'Reviews',    route: 'MyReviews' },
  { label: 'Job Board',  route: 'StaffJobBoard' },
  { label: 'Documents',  route: 'MyDocuments' },
  { label: 'Trainings',  route: 'MyTrainings' },
];

const HRMSStaffDashboard = ({ userName, navigation }) => (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
    <View>
      <Text style={styles.greeting}>Welcome, {userName}!</Text>
      <Text style={styles.greetingSub}>Your HR portal — attendance, leave, claims and more</Text>
    </View>

    <AttendanceCard navigation={navigation} />

    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.quickGrid}>
        {HRMS_LINKS.map(q => (
          <TouchableOpacity
            key={q.route}
            style={styles.quickLink}
            onPress={() => navigation.navigate(q.route)}
            activeOpacity={0.7}
          >
            <Text style={styles.quickLinkText}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </ScrollView>
);

// ── Medical Staff Dashboard ────────────────────────────────────────────────────
const MedicalStaffDashboard = ({ userName, navigation }) => (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
  >
    <View>
      <Text style={styles.greeting}>Welcome, {userName}!</Text>
      <Text style={styles.greetingSub}>Track your attendance and work hours</Text>
    </View>
    <AttendanceCard navigation={navigation} />
  </ScrollView>
);

// ── General Staff Dashboard ───────────────────────────────────────────────────
const GeneralStaffDashboard = ({ userName, isCashier, isManager, isTechnician, navigation }) => {
  const { data: dashData = {}, isLoading } = useStaffDashboard();

  const orders  = dashData.orders  ?? [];
  const tickets = dashData.tickets ?? [];
  const lowStock = dashData.lowStockProducts ?? [];
  const openTicketsCount  = dashData.openTicketsCount  ?? 0;
  const todayOrdersCount  = dashData.todayOrdersCount  ?? 0;

  const stats = isTechnician
    ? [
        { label: 'Assigned Tickets', value: String(tickets.length) },
        { label: 'In Progress', value: String(tickets.filter(t => t.status === 'In Progress').length) },
      ]
    : isCashier
    ? [
        { label: 'Orders Today', value: String(todayOrdersCount) },
        { label: 'Open Tickets', value: String(openTicketsCount) },
      ]
    : [
        { label: 'Total Orders',    value: String(todayOrdersCount) },
        { label: 'Open Tickets',    value: String(openTicketsCount) },
        { label: 'Low Stock Items', value: String(lowStock.length) },
      ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome, {userName}!</Text>
          <Text style={styles.greetingSub}>
            {isCashier    ? 'Ready to process your next sale'
             : isTechnician ? 'Your assigned tickets and updates'
             : 'Manage your team and operations'}
          </Text>
        </View>
        {(isCashier || isManager) && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('POS')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>New Sale</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statValue}>{isLoading ? '…' : s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent orders (cashier / manager) */}
      {(isCashier || isManager) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isCashier ? 'My Orders Today' : 'Recent Orders'}
          </Text>
          {isLoading
            ? <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
            : orders.length === 0
            ? <Text style={styles.empty}>No orders yet</Text>
            : orders.slice(0, 5).map(order => (
                <View key={order.id} style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listPrimary}>{order.orderNumber}</Text>
                    <Text style={styles.listSub}>{order.customer?.name ?? 'Walk-in'}</Text>
                  </View>
                  <View style={[
                    styles.statusPill,
                    { backgroundColor: order.status === 'Completed' ? '#d1fae5' : '#fee2e2' },
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: order.status === 'Completed' ? '#065f46' : '#991b1b' },
                    ]}>{order.status}</Text>
                  </View>
                </View>
              ))
          }
        </View>
      )}

      {/* Assigned tickets (technician) */}
      {isTechnician && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Assigned Tickets</Text>
          {isLoading
            ? <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
            : tickets.length === 0
            ? <Text style={styles.empty}>No tickets assigned</Text>
            : tickets.slice(0, 5).map(ticket => {
                const pillBg =
                  ticket.status === 'In Progress'       ? '#dbeafe'
                  : ticket.status === 'Waiting for Parts' ? '#fef3c7'
                  : '#d1fae5';
                const pillColor =
                  ticket.status === 'In Progress'       ? '#1e40af'
                  : ticket.status === 'Waiting for Parts' ? '#92400e'
                  : '#065f46';
                return (
                  <View key={ticket.id} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listPrimary}>{ticket.ticketNumber}</Text>
                      <Text style={styles.listSub}>
                        {ticket.customerName} — {ticket.brand} {ticket.model}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
                      <Text style={[styles.statusText, { color: pillColor }]}>{ticket.status}</Text>
                    </View>
                  </View>
                );
              })
          }
        </View>
      )}

      {/* Low stock (manager) */}
      {isManager && lowStock.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Low Stock Alerts</Text>
          {lowStock.slice(0, 5).map(p => (
            <View key={p.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listPrimary}>{p.name}</Text>
                <Text style={styles.listSub}>Min: {p.lowStockThreshold ?? 10} units</Text>
              </View>
              <Text style={styles.stockNum}>{p.stock}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

// ── Main (variant router) ─────────────────────────────────────────────────────
export default function StaffDashboardScreen({ navigation }) {
  const { user } = useAuth();

  const isHRMS      = user?.businessPermissionCodes?.includes('manage_attendance') ?? false;
  const isMedical   = user?.permissionCodes?.includes('access_medical') ?? false;
  const isTechnician = user?.role === 'technician';
  const isCashier   = user?.role === 'cashier' || user?.role === 'staff';
  const isManager   = user?.role === 'manager';
  const firstName   = (user?.name ?? user?.fullName ?? 'there').split(' ')[0];

  if (isHRMS)    return <HRMSStaffDashboard    userName={firstName} navigation={navigation} />;
  if (isMedical) return <MedicalStaffDashboard userName={firstName} navigation={navigation} />;
  return (
    <GeneralStaffDashboard
      userName={firstName}
      isCashier={isCashier}
      isManager={isManager}
      isTechnician={isTechnician}
      navigation={navigation}
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  content:     { padding: 16, gap: 14, paddingBottom: 32 },
  greeting:    { fontSize: 22, fontFamily: 'Outfit-Bold',    color: '#111827' },
  greetingSub: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },

  card:       { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle:  { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 10 },

  badge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },

  timeRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  timeBox:   { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, alignItems: 'center' },
  timeLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginBottom: 4 },
  timeValue: { fontSize: 18, fontFamily: 'Outfit-Bold',    color: '#111827' },

  clockBtnRow: { flexDirection: 'row', gap: 8 },
  clockBtn:    { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  clockBtnText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  historyBtn:  { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#f3f4f6', alignItems: 'center' },
  historyBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },

  sectionTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 12 },
  quickGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickLink:    { backgroundColor: '#f3f4f6', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  quickLinkText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  actionBtn:  { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  actionBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#fff' },

  statsRow:   { flexDirection: 'row', gap: 10 },
  statCard:   { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  statValue:  { fontSize: 26, fontFamily: 'Outfit-Bold',    color: '#111827' },
  statLabel:  { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4, textAlign: 'center' },

  listRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderColor: '#f3f4f6' },
  listPrimary: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  listSub:     { fontSize: 12, fontFamily: 'Outfit-Regular',  color: '#6b7280', marginTop: 2 },
  statusPill:  { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:  { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  stockNum:    { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#dc2626' },
  empty:       { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
});
