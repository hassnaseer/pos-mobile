import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useCurrency } from '../../../../context/CurrencyContext';
import colors from '../../../../theme/colors';

const useREDashboard = () =>
  useQuery({
    queryKey: ['re-dashboard'],
    queryFn: async () => {
      const r = await apiClient.get('/admin/real-estate/dashboard');
      return r?.data ?? r ?? null;
    },
    staleTime: 30_000,
  });

const StatCard = ({ icon, label, value, bg, onPress }) => (
  <TouchableOpacity style={st.stat} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
    <View style={[st.statIcon, { backgroundColor: bg }]}><Text style={{ fontSize: 16 }}>{icon}</Text></View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={st.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={st.statValue} numberOfLines={1}>{value}</Text>
    </View>
  </TouchableOpacity>
);

export default function RealEstateDashboardScreen() {
  const navigation = useNavigation();
  const { fmt, rates, currency } = useCurrency();
  const { data: stats, isLoading, isFetching, refetch } = useREDashboard();

  const money = n => fmt(Number(n || 0) * (rates?.[currency] ?? 1));
  const go = route => () => navigation.navigate(route);

  if (isLoading) return <View style={st.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!stats) return <View style={st.center}><Text style={st.empty}>No data.</Text></View>;

  const p = stats.properties ?? {}; const units = p.unitsByStatus ?? {};
  const deals = stats.deals ?? {}; const leases = stats.leases ?? {}; const rent = stats.rent ?? {};
  const maint = stats.maintenance ?? {}; const view = stats.viewings ?? {};

  return (
    <ScrollView style={st.root} contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}>
      <Text style={st.title}>Real Estate Dashboard</Text>
      <Text style={st.sub}>Overview of properties, deals, leases, and rent</Text>

      <Text style={st.section}>🏢  Properties & Units</Text>
      <View style={st.grid}>
        <StatCard icon="🏢" label="Total Properties" value={p.total ?? 0} bg="#dbeafe" onPress={go('REProperties')} />
        <StatCard icon="🧱" label="Total Units" value={p.totalUnits ?? 0} bg="#e0e7ff" onPress={go('REProperties')} />
        <StatCard icon="✅" label="Available Units" value={units.Available ?? 0} bg="#dcfce7" onPress={go('REProperties')} />
        <StatCard icon="🔑" label="Leased Units" value={units.Leased ?? 0} bg="#f3e8ff" onPress={go('REProperties')} />
      </View>

      <Text style={st.section}>🤝  Leads & Deals</Text>
      <View style={st.grid}>
        <StatCard icon="👥" label="Active Leads" value={stats.leads?.active ?? 0} bg="#dbeafe" onPress={go('RELeads')} />
        <StatCard icon="🤝" label="Open Deals" value={deals.open?.count ?? 0} bg="#fef3c7" onPress={go('REDeals')} />
        <StatCard icon="📈" label="Won This Month" value={deals.wonThisMonth?.count ?? 0} bg="#dcfce7" onPress={go('REDeals')} />
        <StatCard icon="💰" label="Open Deal Value" value={money(deals.open?.valueUSD)} bg="#fef3c7" onPress={go('REDeals')} />
      </View>

      <Text style={st.section}>📄  Leases & Rent</Text>
      <View style={st.grid}>
        <StatCard icon="📄" label="Active Leases" value={leases.active?.count ?? 0} bg="#e0e7ff" onPress={go('RELeases')} />
        <StatCard icon="⏰" label="Rent Due Soon (7d)" value={rent.dueSoonCount ?? 0} bg="#fef3c7" onPress={go('RERentInvoices')} />
        <StatCard icon="⚠️" label="Overdue Invoices" value={rent.overdue?.count ?? 0} bg="#fee2e2" onPress={go('RERentInvoices')} />
        <StatCard icon="🧾" label="Overdue Amount" value={money(rent.overdue?.amountUSD)} bg="#fee2e2" onPress={go('RERentInvoices')} />
        <StatCard icon="💵" label="Active Lease Value" value={money(leases.active?.monthlyValueUSD)} bg="#e0e7ff" onPress={go('RELeases')} />
      </View>

      <Text style={st.section}>🔧  Maintenance & Viewings</Text>
      <View style={st.grid}>
        <StatCard icon="🔧" label="Open Requests" value={maint.open ?? 0} bg="#ffedd5" onPress={go('REMaintenance')} />
        <StatCard icon="⚠️" label="Urgent Requests" value={maint.urgent ?? 0} bg="#fee2e2" onPress={go('REMaintenance')} />
        <StatCard icon="📅" label="Upcoming Viewings (7d)" value={view.upcoming ?? 0} bg="#dbeafe" onPress={go('REViewings')} />
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9' },
  empty: { color: '#94a3b8', fontFamily: 'Outfit-Regular' },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#0f172a' },
  sub: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#64748b', marginTop: 2, marginBottom: 6 },
  section: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151', marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#64748b' },
  statValue: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#0f172a', marginTop: 1 },
});
