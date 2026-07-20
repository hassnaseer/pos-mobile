import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, RefreshControl,
} from 'react-native';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useAuth } from '../../../context/AuthContext';
import {
  useMyAttendance, useClockIn, useClockOut, useBreakStart, useBreakEnd,
  useStaffDashboard, useHRMSUpcomingEvents, useMyLeaveQuotaUsage, useUpdateTicket,
} from '../../../services/api/posApi';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../utils/permissions';
import colors from '../../../theme/colors';
import { parseDateOnly } from '../../../utils/formatDate';

const screenWidth = Dimensions.get('window').width;
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];

const fmtTime = ts => {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Clock In/Out Card ─────────────────────────────────────────────────────────
const AttendanceCard = ({ navigation }) => {
  const { data: records = [], isLoading } = useMyAttendance();
  const { mutateAsync: clockIn, isPending: clockingIn } = useClockIn();
  const { mutateAsync: clockOut, isPending: clockingOut } = useClockOut();
  const { mutateAsync: breakStart, isPending: breakStarting } = useBreakStart();
  const { mutateAsync: breakEnd, isPending: breakEnding } = useBreakEnd();

  const todayStr = new Date().toISOString().slice(0, 10);
  const today = useMemo(
    () => records.find(r => r.date?.slice(0, 10) === todayStr) ?? null,
    [records, todayStr],
  );

  const isClockedIn = !!today && !today.clockOut;
  const isCompleted = !!today && !!today.clockOut;
  const isOnBreak = !!today?.isOnBreak;
  const breaks = today?.breaks ?? [];
  const actionLoading = clockingIn || clockingOut || breakStarting || breakEnding;

  const handleClockIn = async () => {
    try { await clockIn({}); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to clock in'); }
  };

  const handleClockOut = async () => {
    try { await clockOut({}); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to clock out'); }
  };

  const handleBreakStart = async () => {
    try { await breakStart(); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to start break'); }
  };

  const handleBreakEnd = async () => {
    try { await breakEnd(); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to end break'); }
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

      {(isClockedIn || isCompleted) && breaks.length > 0 && (
        <View style={styles.breakSummaryRow}>
          <Text style={styles.breakSummaryText}>
            {breaks.length} break{breaks.length !== 1 ? 's' : ''} today ({today?.totalBreakMinutes ?? 0}m)
          </Text>
          {isOnBreak && (
            <View style={styles.onBreakBadge}><Text style={styles.onBreakBadgeText}>On Break</Text></View>
          )}
        </View>
      )}

      <View style={styles.clockBtnRow}>
        {!isClockedIn && !isCompleted && (
          <TouchableOpacity
            style={[styles.clockBtn, { backgroundColor: '#16a34a' }]}
            onPress={handleClockIn}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.clockBtnText}>
              {clockingIn ? 'Processing…' : 'Clock In'}
            </Text>
          </TouchableOpacity>
        )}
        {isClockedIn && (
          <>
            <TouchableOpacity
              style={[styles.clockBtn, { backgroundColor: '#dc2626' }]}
              onPress={handleClockOut}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.clockBtnText}>
                {clockingOut ? 'Processing…' : 'Clock Out'}
              </Text>
            </TouchableOpacity>
            {isOnBreak ? (
              <TouchableOpacity
                style={[styles.clockBtn, styles.breakClockBtn]}
                onPress={handleBreakEnd}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.breakClockBtnText}>{breakEnding ? '…' : 'End Break'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.clockBtn, styles.breakClockBtn]}
                onPress={handleBreakStart}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.breakClockBtnText}>{breakStarting ? '…' : 'Start Break'}</Text>
              </TouchableOpacity>
            )}
          </>
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
  { label: 'Attendance', route: 'MyAttendance',  color: '#3B82F6' },
  { label: 'Leave',      route: 'MyLeave',       color: '#10B981' },
  { label: 'Claims',     route: 'MyClaims',      color: '#F59E0B' },
  { label: 'Payslips',   route: 'MyPayslips',    color: '#EC4899' },
  { label: 'Tasks',      route: 'MyTasks',       color: '#06B6D4' },
  { label: 'Reviews',    route: 'MyReviews',     color: '#F97316' },
  { label: 'Job Board',  route: 'StaffJobBoard', color: '#14B8A6' },
  { label: 'Documents',  route: 'MyDocuments',   color: '#7C3AED' },
  { label: 'Trainings',  route: 'MyTrainings',   color: '#84CC16' },
];

// Personal 14-day attendance trend, computed client-side from the same history
// the "View History" screen uses — mirrors the web employee dashboard's approach.
function PersonalTrendChart() {
  const { data: records = [], isLoading } = useMyAttendance();

  const trend = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const record = records.find(r => r.date?.slice(0, 10) === key);
      days.push({
        date: key,
        present: record && record.status !== 'Late' && record.status !== 'Half Day' ? 1 : 0,
        late: record?.status === 'Late' ? 1 : 0,
        halfDay: record?.status === 'Half Day' ? 1 : 0,
      });
    }
    return days;
  }, [records]);

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />;

  return (
    <LineChart
      data={{
        labels: trend.map((t, i) => (i % 2 === 0 ? parseDateOnly(t.date).toLocaleDateString([], { day: 'numeric' }) : '')),
        datasets: [
          { data: trend.map(t => t.present), color: () => '#16a34a', strokeWidth: 2 },
          { data: trend.map(t => t.late), color: () => '#f59e0b', strokeWidth: 2 },
          { data: trend.map(t => t.halfDay), color: () => '#dc2626', strokeWidth: 2 },
        ],
        legend: ['Present', 'Late', 'Half Day'],
      }}
      width={screenWidth - 60}
      height={180}
      bezier
      chartConfig={{
        backgroundGradientFrom: '#fff',
        backgroundGradientTo: '#fff',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
        labelColor: () => '#6b7280',
        propsForDots: { r: '2.5' },
      }}
      style={{ borderRadius: 12, marginLeft: -16 }}
    />
  );
}

// ── Leave Balance donut ─────────────────────────────────────────────────────
function LeaveBalanceCard() {
  const { data: rawQuotas = [], isLoading } = useMyLeaveQuotaUsage();
  const quotas = Array.isArray(rawQuotas) ? rawQuotas : (rawQuotas?.data ?? []);

  if (isLoading) return null;
  if (quotas.length === 0) return null;

  const totalQuotaDays = quotas.reduce((s, q) => s + (q.totalDays ?? 0), 0);
  const totalUsedDays  = quotas.reduce((s, q) => s + (q.usedDays ?? 0), 0);

  const pieData = (totalUsedDays > 0 ? quotas.map(q => ({ ...q, value: q.usedDays })) : quotas.map(q => ({ ...q, value: q.totalDays })))
    .map((q, i) => ({
      name: q.title,
      population: q.value || 0.0001,
      color: CHART_COLORS[i % CHART_COLORS.length],
      legendFontColor: '#6b7280',
      legendFontSize: 11,
    }));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Leave Balance</Text>
      <Text style={styles.leaveSubtitle}>{totalUsedDays} of {totalQuotaDays} days used</Text>
      <PieChart
        data={pieData}
        width={screenWidth - 64}
        height={140}
        chartConfig={{ color: () => '#000' }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="8"
        hasLegend={false}
      />
      <View style={{ marginTop: 8, gap: 8 }}>
        {quotas.map((q, i) => (
          <View key={q.id}>
            <View style={styles.leaveRow}>
              <View style={styles.leaveRowLabel}>
                <View style={[styles.leaveDot, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                <Text style={styles.leaveRowText} numberOfLines={1}>{q.title}</Text>
              </View>
              <Text style={[styles.leaveRowValue, q.isFull && { color: '#ef4444' }]}>{q.usedDays}/{q.totalDays}d</Text>
            </View>
            <View style={styles.leaveBarTrack}>
              <View style={[styles.leaveBarFill, { width: `${Math.min(100, (q.usedDays / q.totalDays) * 100)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Recent Attendance list ──────────────────────────────────────────────────
function RecentAttendanceWidget() {
  const { data: records = [], isLoading } = useMyAttendance();
  const recent = records.slice(0, 5);

  if (isLoading || recent.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Recent Attendance</Text>
      {recent.map(r => (
        <View key={r.id} style={styles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listPrimary}>
              {parseDateOnly(r.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <Text style={styles.listSub}>{fmtTime(r.clockIn)} → {fmtTime(r.clockOut)}</Text>
          </View>
          {r.hoursWorked != null
            ? <Text style={styles.recentHours}>{r.hoursWorked}h</Text>
            : <Text style={styles.recentInProgress}>In progress</Text>}
        </View>
      ))}
    </View>
  );
}

function UpcomingEvents() {
  const { data: rawEvents = [] } = useHRMSUpcomingEvents();
  const events = Array.isArray(rawEvents) ? rawEvents : (rawEvents?.data ?? []);
  if (events.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Upcoming Events</Text>
      {events.slice(0, 5).map((e, i) => (
        <View key={i} style={styles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listPrimary}>{e.name}</Text>
            <Text style={styles.listSub}>{e.type}{e.years ? ` · ${e.years} years` : ''}</Text>
          </View>
          <Text style={styles.listSub}>{e.daysUntil === 0 ? 'Today' : `in ${e.daysUntil}d`}</Text>
        </View>
      ))}
    </View>
  );
}

const HRMS_REFRESH_KEYS = [['my-attendance', {}], ['my-leave-quota-usage'], ['hrms-upcoming-events']];

const HRMSStaffDashboard = ({ userName, navigation }) => {
  const qc = useQueryClient();
  const attendanceFetching = useIsFetching({ queryKey: ['my-attendance'] });
  const quotaFetching = useIsFetching({ queryKey: ['my-leave-quota-usage'] });
  const eventsFetching = useIsFetching({ queryKey: ['hrms-upcoming-events'] });
  return (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
    refreshControl={
      <RefreshControl
        refreshing={!!(attendanceFetching || quotaFetching || eventsFetching)}
        onRefresh={() => HRMS_REFRESH_KEYS.forEach(queryKey => qc.refetchQueries({ queryKey }))}
        tintColor={colors.primary}
      />
    }
  >
    <View>
      <Text style={styles.greeting}>Welcome, {userName}!</Text>
      <Text style={styles.greetingSub}>Your HR portal — attendance, leave, claims and more</Text>
    </View>

    <AttendanceCard navigation={navigation} />

    <View style={styles.card}>
      <Text style={styles.sectionTitle}>My Attendance Trend (14 days)</Text>
      <PersonalTrendChart />
    </View>

    <LeaveBalanceCard />
    <RecentAttendanceWidget />
    <UpcomingEvents />

    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.quickGrid}>
        {HRMS_LINKS.map(q => (
          <TouchableOpacity
            key={q.route}
            style={[styles.quickLink, { backgroundColor: q.color }]}
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
};

// ── Medical Staff Dashboard ────────────────────────────────────────────────────
const MedicalStaffDashboard = ({ userName, navigation }) => {
  const qc = useQueryClient();
  const attendanceFetching = useIsFetching({ queryKey: ['my-attendance'] });
  return (
  <ScrollView
    style={styles.container}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
    refreshControl={
      <RefreshControl
        refreshing={!!attendanceFetching}
        onRefresh={() => qc.refetchQueries({ queryKey: ['my-attendance', {}] })}
        tintColor={colors.primary}
      />
    }
  >
    <View>
      <Text style={styles.greeting}>Welcome, {userName}!</Text>
      <Text style={styles.greetingSub}>Track your attendance and work hours</Text>
    </View>
    <AttendanceCard navigation={navigation} />
    <RecentAttendanceWidget />
  </ScrollView>
  );
};

// ── General Staff Dashboard ───────────────────────────────────────────────────
const GeneralStaffDashboard = ({ userName, isCashier, isManager, isTechnician, navigation }) => {
  const perms = usePermissions();
  const { data: dashData = {}, isLoading, isFetching, refetch } = useStaffDashboard(isTechnician, {
    canViewOrders: perms.can(PERMISSIONS.VIEW_ORDERS),
    canManageProducts: perms.can(PERMISSIONS.MANAGE_PRODUCTS),
    canCreateTickets: perms.can(PERMISSIONS.CREATE_TICKETS),
  });
  const { mutateAsync: updateTicket } = useUpdateTicket();

  const handleStatusUpdate = async (ticketId, status) => {
    try { await updateTicket({ id: ticketId, status }); }
    catch (e) { Alert.alert('Error', typeof e === 'string' ? e : 'Failed to update ticket'); }
  };

  const orders  = dashData.orders  ?? [];
  const tickets = dashData.tickets ?? [];
  const lowStock = dashData.lowStockProducts ?? [];
  const openTicketsCount  = dashData.openTicketsCount  ?? 0;
  const todayOrdersCount  = dashData.todayOrdersCount  ?? 0;

  // Only pick a stat set for a bucket this employee is actually permitted to see — a
  // plain staff role with none of cashier/manager/technician gets no fabricated stats,
  // not a silent fallback to manager-level numbers (matches GeneralStaffDashboard.tsx).
  const stats = isCashier
    ? [
        { label: 'Orders Today', value: String(todayOrdersCount) },
        { label: 'Open Tickets', value: String(openTicketsCount) },
      ]
    : isTechnician
    ? [
        { label: 'Assigned Tickets', value: String(tickets.length) },
        { label: 'In Progress', value: String(tickets.filter(t => t.status === 'In Progress').length) },
      ]
    : isManager
    ? [
        { label: 'Total Orders',    value: String(todayOrdersCount) },
        { label: 'Open Tickets',    value: String(openTicketsCount) },
        { label: 'Low Stock Items', value: String(lowStock.length) },
      ]
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome, {userName}!</Text>
          <Text style={styles.greetingSub}>
            {isCashier    ? 'Ready to process your next sale'
             : isTechnician ? 'Your assigned tickets and updates'
             : isManager   ? 'Manage your team and operations'
             : 'Welcome to your dashboard'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(isCashier || isManager) && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('POS')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>New Sale</Text>
            </TouchableOpacity>
          )}
          {(isTechnician || isManager) && (
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => navigation.navigate('CreateTicket')}
              activeOpacity={0.8}
            >
              <Text style={styles.outlineBtnText}>New Ticket</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stat cards */}
      {stats && (
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{isLoading ? '…' : s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

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
          <View style={styles.ticketsCardHeader}>
            <Text style={[styles.cardTitle, { marginBottom: 0 }]}>My Assigned Tickets</Text>
            <TouchableOpacity style={styles.newTicketBtn} onPress={() => navigation.navigate('CreateTicket')} activeOpacity={0.8}>
              <Text style={styles.newTicketBtnText}>+ New Ticket</Text>
            </TouchableOpacity>
          </View>
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
                  <React.Fragment key={ticket.id}>
                    <View style={styles.listRow}>
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
                    {ticket.status === 'In Progress' && (
                      <View style={styles.ticketActions}>
                        <TouchableOpacity style={styles.ticketActionBtn} onPress={() => handleStatusUpdate(ticket.id, 'Completed')}>
                          <Text style={styles.ticketActionText}>Mark Completed</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.ticketActionBtn} onPress={() => handleStatusUpdate(ticket.id, 'Waiting for Parts')}>
                          <Text style={styles.ticketActionText}>Waiting for Parts</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </React.Fragment>
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
  // "staff" is a generic default role used across many business types, not specifically
  // cashiers — only treat it as cashier-like if this business actually has POS enabled
  // (matches web's GeneralStaffDashboard/index.tsx exactly).
  const hasPosSales = user?.permissionCodes?.includes('pos_sales') ?? false;
  const isCashier   = user?.role === 'cashier' || (user?.role === 'staff' && hasPosSales);
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
  breakClockBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary },
  breakClockBtnText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  breakSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  breakSummaryText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#b45309' },
  onBreakBadge: { backgroundColor: '#fde68a', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  onBreakBadgeText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#78350f' },
  historyBtn:  { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#f3f4f6', alignItems: 'center' },
  historyBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },

  sectionTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 12 },
  leaveSubtitle: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: -8, marginBottom: 8 },
  leaveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  leaveRowLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  leaveDot: { width: 8, height: 8, borderRadius: 4 },
  leaveRowText: { flex: 1, fontSize: 12, fontFamily: 'Outfit-Medium', color: '#374151' },
  leaveRowValue: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#6b7280' },
  leaveBarTrack: { height: 5, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  leaveBarFill: { height: '100%', borderRadius: 3 },
  recentHours: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  recentInProgress: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#f97316' },
  quickGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickLink:    { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  quickLinkText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#fff' },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  actionBtn:  { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  actionBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  outlineBtn: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#d1d5db' },
  outlineBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  ticketsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  newTicketBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  newTicketBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#fff' },
  ticketActions: { flexDirection: 'row', gap: 8, paddingBottom: 10 },
  ticketActionBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  ticketActionText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#374151' },

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
