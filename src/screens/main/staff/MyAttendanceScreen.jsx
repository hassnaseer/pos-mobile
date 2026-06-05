import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useMyAttendance, useClockIn, useClockOut } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const MyAttendanceScreen = () => {
  const { data: raw = [], isLoading, refetch } = useMyAttendance();
  const { mutateAsync: clockIn,  isPending: clockingIn }  = useClockIn();
  const { mutateAsync: clockOut, isPending: clockingOut } = useClockOut();

  const records = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const handleClockIn = async () => {
    try {
      await clockIn();
      Alert.alert('Clocked In', 'Your attendance has been recorded.');
    } catch (e) { Alert.alert('Error', e?.message ?? 'Clock-in failed'); }
  };

  const handleClockOut = async () => {
    try {
      await clockOut();
      Alert.alert('Clocked Out', 'See you tomorrow!');
    } catch (e) { Alert.alert('Error', e?.message ?? 'Clock-out failed'); }
  };

  const formatTime = t => {
    if (!t) return '—';
    return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = t => {
    if (!t) return '—';
    return new Date(t).toLocaleDateString();
  };

  const statusColor = s => {
    if (s === 'present') return '#10B981';
    if (s === 'absent')  return '#EF4444';
    if (s === 'late')    return '#F59E0B';
    return '#9CA3AF';
  };

  return (
    <View style={styles.root}>
      {/* Clock-in / Clock-out buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.clockBtn, styles.clockInBtn, (clockingIn || clockingOut) && { opacity: 0.6 }]}
          onPress={handleClockIn}
          disabled={clockingIn || clockingOut}
        >
          {clockingIn ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.clockBtnText}>Clock In</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.clockBtn, styles.clockOutBtn, (clockingIn || clockingOut) && { opacity: 0.6 }]}
          onPress={handleClockOut}
          disabled={clockingIn || clockingOut}
        >
          {clockingOut ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.clockBtnText}>Clock Out</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        data={records}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowDate}>{formatDate(item.date ?? item.checkIn)}</Text>
              <Text style={styles.rowTime}>
                In: {formatTime(item.checkIn)}  ·  Out: {formatTime(item.checkOut)}
              </Text>
              {item.hoursWorked != null && (
                <Text style={styles.rowMeta}>{Number(item.hoursWorked).toFixed(1)} hrs</Text>
              )}
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '20' }]}>
              <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>
                {item.status ?? 'present'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No attendance records found.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#f4f6f9' },
  actionBar:    { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  clockBtn:     { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  clockInBtn:   { backgroundColor: '#10B981' },
  clockOutBtn:  { backgroundColor: '#EF4444' },
  clockBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 15 },
  row:          { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowInfo:      { flex: 1 },
  rowDate:      { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowTime:      { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  rowMeta:      { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:    { fontSize: 12, fontFamily: 'Outfit-SemiBold' },
  empty:        { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MyAttendanceScreen;
