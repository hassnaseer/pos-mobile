import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRELeadsDashboard } from '../../../../services/api/posApi';
import { useAuth } from '../../../../context/AuthContext';
import colors from '../../../../theme/colors';

const fmtContacted = iso => {
  if (!iso) return 'Never contacted';
  const d = new Date(iso);
  return `Last contacted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const STAT_CARDS = [
  { key: 'totalLeads',     label: 'Total Leads',        suffix: '' },
  { key: 'emailsSentWeek', label: 'Emails Sent (week)', suffix: '' },
  { key: 'replyRate',      label: 'Reply Rate',         suffix: '%' },
  { key: 'followUpsDue',   label: 'Follow-ups Due',     suffix: '' },
];

export default function LeadsDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data, isLoading, isFetching, refetch } = useRELeadsDashboard();

  const d = data ?? {};
  const urgent = Array.isArray(d.urgent) ? d.urgent : [];
  const firstName = user?.name ?? 'there';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* Greeting */}
      <Text style={styles.greeting}>Great to have you here, <Text style={{ color: colors.primary }}>{firstName}</Text></Text>
      <Text style={styles.subGreeting}>Your outreach performance at a glance.</Text>

      {/* Stat cards */}
      <View style={styles.statGrid}>
        {STAT_CARDS.map(card => (
          <View key={card.key} style={styles.statCard}>
            <Text style={styles.statLabel}>{card.label}</Text>
            <Text style={styles.statValue}>
              {isLoading ? '—' : (d[card.key] ?? 0)}{card.suffix ? <Text style={styles.statSuffix}>{card.suffix}</Text> : null}
            </Text>
          </View>
        ))}
      </View>

      {/* Urgent follow-ups */}
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>Urgent Follow-ups</Text>
            <Text style={styles.panelSub}>Leads that need your attention today.</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('RELeads')}>
            <Text style={styles.viewAll}>View all ↗</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : urgent.length === 0 ? (
          <Text style={styles.emptyText}>No follow-ups due. You're all caught up. 🎉</Text>
        ) : (
          urgent.map(l => (
            <TouchableOpacity key={l.id} style={styles.leadRow} onPress={() => navigation.navigate('RELeads')}>
              <Text style={styles.leadName}>
                {l.name}
                {(l.email || l.phone) ? <Text style={styles.leadMeta}>  {l.email ?? l.phone}</Text> : null}
              </Text>
              <Text style={styles.leadDue}>⚠ {fmtContacted(l.lastContactedAt)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('RELeads')}>
          <View style={[styles.actionIcon, { backgroundColor: '#ede9fe' }]}><Text style={{ fontSize: 18 }}>👤</Text></View>
          <View>
            <Text style={styles.actionTitle}>Add New Lead</Text>
            <Text style={styles.actionSub}>Manually enter a prospect</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('RELeads')}>
          <View style={[styles.actionIcon, { backgroundColor: '#d1fae5' }]}><Text style={{ fontSize: 18 }}>✉️</Text></View>
          <View>
            <Text style={styles.actionTitle}>Work Your Pipeline</Text>
            <Text style={styles.actionSub}>Contact and qualify leads</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  greeting: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#111827' },
  subGreeting: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2, marginBottom: 16 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  statLabel: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 30, fontFamily: 'Outfit-Bold', color: '#111827', marginTop: 6 },
  statSuffix: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#6B7280' },

  panel: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginTop: 16 },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  panelTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#111827' },
  panelSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  viewAll: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },

  emptyText: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', paddingVertical: 20 },
  leadRow: { paddingVertical: 12, borderTopWidth: 1, borderColor: '#f3f4f6' },
  leadName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  leadMeta: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  leadDue: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#ef4444', marginTop: 3 },

  action: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, marginTop: 10 },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  actionSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 1 },
});
