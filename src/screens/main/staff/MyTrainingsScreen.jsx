import React from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useMyTrainings, useEnrollTraining, useUnenrollTraining } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const fmtDate = d => (d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

const STATUS_STYLE = {
  upcoming:  { bg: '#dbeafe', text: '#1d4ed8', label: 'Upcoming' },
  ongoing:   { bg: '#fef9c3', text: '#a16207', label: 'Ongoing' },
  completed: { bg: '#dcfce7', text: '#15803d', label: 'Completed' },
  cancelled: { bg: '#fee2e2', text: '#dc2626', label: 'Cancelled' },
};

const MyTrainingsScreen = () => {
  const { data, isLoading, refetch } = useMyTrainings();
  const { mutate: enroll, isPending: enrolling, variables: enrollingId } = useEnrollTraining();
  const { mutate: unenroll, isPending: unenrolling, variables: unenrollingId } = useUnenrollTraining();

  const trainings = data?.trainings ?? [];
  const enrolledIds = data?.enrolledIds ?? [];

  const active = trainings.filter(t => t.status !== 'cancelled' && t.status !== 'completed');
  const past = trainings.filter(t => t.status === 'completed' || t.status === 'cancelled');
  const sections = [
    ...(active.length ? [{ title: 'Active Trainings', data: active }] : []),
    ...(past.length ? [{ title: 'Past Trainings', data: past }] : []),
  ];

  const handleEnroll = id => enroll(id, { onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to enroll') });
  const handleUnenroll = id => unenroll(id, { onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to unenroll') });

  return (
    <View style={styles.root}>
      <SectionList
        sections={sections}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        renderItem={({ item }) => {
          const isEnrolled = enrolledIds.includes(item.id);
          const isFull = item.maxSeats > 0 && (item.enrolledCount ?? 0) >= item.maxSeats && !isEnrolled;
          const busy = (enrolling && enrollingId === item.id) || (unenrolling && unenrollingId === item.id);
          const canAct = item.status === 'upcoming';
          const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.upcoming;
          return (
            <View style={styles.row}>
              <View style={styles.topRow}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{item.title}</Text>
                  {item.trainerName ? <Text style={styles.rowTrainer}>Trainer: {item.trainerName}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: st.text }]}>{st.label}</Text>
                  </View>
                  {isEnrolled ? (
                    <View style={styles.enrolledBadge}><Text style={styles.enrolledBadgeText}>Enrolled</Text></View>
                  ) : null}
                </View>
              </View>

              {item.description ? <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text> : null}

              <View style={styles.metaRow}>
                {item.scheduledDate ? <Text style={styles.rowMeta}>📅 {fmtDate(item.scheduledDate)}</Text> : null}
                {item.location ? <Text style={styles.rowMeta}>📍 {item.location}</Text> : null}
                {item.maxSeats > 0 ? <Text style={styles.rowMeta}>👥 {item.enrolledCount ?? 0}/{item.maxSeats} seats</Text> : null}
              </View>

              {canAct && (
                <TouchableOpacity
                  style={[styles.actionBtn, isEnrolled ? styles.unenrollBtn : styles.enrollBtn, isFull && styles.actionBtnDisabled]}
                  onPress={() => (isEnrolled ? handleUnenroll(item.id) : handleEnroll(item.id))}
                  disabled={busy || isFull}
                >
                  {busy ? <ActivityIndicator size="small" color={isEnrolled ? '#dc2626' : '#fff'} /> : (
                    <Text style={isEnrolled ? styles.unenrollBtnText : styles.enrollBtnText}>
                      {isFull ? 'Full' : isEnrolled ? 'Unenroll' : 'Enroll'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No trainings scheduled yet.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  sectionHeader:{ fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
  row:          { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  topRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  rowInfo:      { flex: 1 },
  rowName:      { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 2 },
  rowTrainer:   { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.primary },
  rowDesc:      { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginBottom: 8 },
  statusBadge:  { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  enrolledBadge:{ backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  enrolledBadgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#15803d' },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  rowMeta:      { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF' },
  actionBtn:    { borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  actionBtnDisabled: { backgroundColor: '#e5e7eb' },
  enrollBtn:    { backgroundColor: colors.primary },
  enrollBtnText:{ color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  unenrollBtn:  { borderWidth: 1.5, borderColor: '#fecaca' },
  unenrollBtnText: { color: '#dc2626', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MyTrainingsScreen;
