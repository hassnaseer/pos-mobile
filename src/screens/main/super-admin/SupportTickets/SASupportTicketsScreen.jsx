import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Alert, ScrollView, Modal,
} from 'react-native';
import { useSASupportTickets, useUpdateSASupportTicket } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const STATUS_STYLE = {
  open:        { bg: '#dbeafe', text: '#1d4ed8', label: 'Open' },
  in_progress: { bg: '#fef9c3', text: '#b45309', label: 'In Progress' },
  resolved:    { bg: '#dcfce7', text: '#15803d', label: 'Resolved' },
  closed:      { bg: '#f3f4f6', text: '#6b7280', label: 'Closed' },
};

const PRIORITY_STYLE = {
  low:    { bg: '#f3f4f6', text: '#6b7280' },
  medium: { bg: '#fef9c3', text: '#b45309' },
  high:   { bg: '#fee2e2', text: '#dc2626' },
  urgent: { bg: '#fce7f3', text: '#be185d' },
};

const STATUSES = ['', 'open', 'in_progress', 'resolved', 'closed'];

const fmtDate = d => d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const SASupportTicketsScreen = () => {
  const { data: raw = [], isLoading, refetch } = useSASupportTickets();
  const tickets = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const { mutateAsync: updateTicket } = useUpdateSASupportTicket();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  const filtered = useMemo(() => tickets.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (t.title ?? '').toLowerCase().includes(q) ||
        (t.ticketRef ?? '').toLowerCase().includes(q) ||
        (t.customerName ?? '').toLowerCase().includes(q) ||
        (t.customerEmail ?? '').toLowerCase().includes(q) ||
        (t.createdByName ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [tickets, search, statusFilter]);

  const changeStatus = async (ticket, newStatus) => {
    setUpdating(true);
    try {
      await updateTicket({ id: ticket.id, status: newStatus });
      setSelected(prev => prev?.id === ticket.id ? { ...prev, status: newStatus } : prev);
    } catch {
      Alert.alert('Error', 'Failed to update status');
    } finally { setUpdating(false); }
  };

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search tickets…"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterRow}>
        {STATUSES.map(s => {
          const st = s ? STATUS_STYLE[s] : null;
          const isActive = statusFilter === s;
          return (
            <TouchableOpacity
              key={s || 'all'}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {s ? (STATUS_STYLE[s]?.label ?? s) : 'All'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Count */}
      <Text style={styles.count}>{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</Text>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => String(t.id)}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.empty}>No tickets found.</Text>}
          renderItem={({ item }) => {
            const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.open;
            const pr = PRIORITY_STYLE[(item.priority ?? '').toLowerCase()] ?? PRIORITY_STYLE.low;
            return (
              <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.85}>
                <View style={styles.cardHeader}>
                  <Text style={styles.ticketRef}>{item.ticketRef ?? `#${item.id}`}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: pr.bg }]}>
                      <Text style={[styles.badgeText, { color: pr.text }]}>{(item.priority ?? 'low').toUpperCase()}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <View style={styles.meta}>
                  <Text style={styles.metaText}>{item.customerName ?? item.createdByName ?? '—'}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{fmtDate(item.insertedDate)}</Text>
                </View>
                {item.assignedToName && (
                  <Text style={styles.assigned}>Assigned: {item.assignedToName}</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Detail modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            {selected && (() => {
              const st = STATUS_STYLE[selected.status] ?? STATUS_STYLE.open;
              const pr = PRIORITY_STYLE[(selected.priority ?? '').toLowerCase()] ?? PRIORITY_STYLE.low;
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalRef}>{selected.ticketRef ?? `#${selected.id}`}</Text>
                    <TouchableOpacity onPress={() => setSelected(null)}>
                      <Text style={styles.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalTitle}>{selected.title}</Text>

                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: pr.bg }]}>
                      <Text style={[styles.badgeText, { color: pr.text }]}>{(selected.priority ?? 'low').toUpperCase()}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                    </View>
                  </View>

                  {selected.description ? (
                    <Text style={styles.desc}>{selected.description}</Text>
                  ) : null}

                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Customer</Text>
                      <Text style={styles.infoValue}>{selected.customerName ?? '—'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>{selected.customerEmail ?? '—'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Created by</Text>
                      <Text style={styles.infoValue}>{selected.createdByName ?? '—'}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Date</Text>
                      <Text style={styles.infoValue}>{fmtDate(selected.insertedDate)}</Text>
                    </View>
                    {selected.assignedToName ? (
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Assigned to</Text>
                        <Text style={styles.infoValue}>{selected.assignedToName}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.changeStatusLabel}>Change Status</Text>
                  <View style={styles.statusActions}>
                    {Object.entries(STATUS_STYLE).map(([key, s]) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.statusBtn, { backgroundColor: s.bg }, selected.status === key && styles.statusBtnActive]}
                        onPress={() => changeStatus(selected, key)}
                        disabled={updating || selected.status === key}
                      >
                        <Text style={[styles.statusBtnText, { color: s.text }]}>{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {updating && <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />}
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  search: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#f9fafb' },
  filterBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', maxHeight: 52 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  chipTextActive: { color: '#fff' },
  count: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', paddingHorizontal: 16, paddingVertical: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ticketRef: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: 'Outfit-Bold' },
  title: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  metaDot: { fontSize: 11, color: '#9ca3af' },
  assigned: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalRef: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  closeBtn: { fontSize: 18, color: '#9ca3af', padding: 4 },
  modalTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 10 },
  desc: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151', lineHeight: 20, marginTop: 8, marginBottom: 8 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12, backgroundColor: '#f9fafb', borderRadius: 10, padding: 12 },
  infoItem: { minWidth: '45%' },
  infoLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  infoValue: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 1 },
  changeStatusLabel: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 8 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  statusBtnActive: { borderWidth: 2, borderColor: '#374151' },
  statusBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
});

export default SASupportTicketsScreen;
