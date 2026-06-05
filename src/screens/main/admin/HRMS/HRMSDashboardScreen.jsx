import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';

const MODULE_CARDS = [
  { route: 'HRMSAttendance',    label: 'Attendance',      perm: PERMISSIONS.MANAGE_ATTENDANCE,    color: '#3B82F6' },
  { route: 'HRMSLeave',         label: 'Leave',           perm: PERMISSIONS.MANAGE_LEAVE,         color: '#10B981' },
  { route: 'HRMSClaims',        label: 'Claims',          perm: PERMISSIONS.MANAGE_CLAIMS,        color: '#F59E0B' },
  { route: 'HRMSAnnouncements', label: 'Announcements',   perm: PERMISSIONS.MANAGE_ANNOUNCEMENTS, color: '#8B5CF6' },
  { route: 'HRMSPayroll',       label: 'Payroll',         perm: PERMISSIONS.MANAGE_PAYROLL,       color: '#EC4899' },
  { route: 'Staff',             label: 'Employees',       perm: PERMISSIONS.MANAGE_STAFF,         color: '#F472B6' },
  { route: 'Departments',       label: 'Departments',     perm: PERMISSIONS.MANAGE_DEPARTMENTS,   color: '#6366F1' },
  { route: 'HRMSTasks',         label: 'Tasks',           perm: PERMISSIONS.MANAGE_TASKS,         color: '#06B6D4' },
  { route: 'HRMSReviews',       label: 'Annual Reviews',  perm: PERMISSIONS.MANAGE_REVIEWS,       color: '#F97316' },
  { route: 'HRMSJobBoard',      label: 'Job Board',       perm: PERMISSIONS.MANAGE_INTERNAL_JOBS, color: '#14B8A6' },
  { route: 'HRMSDocuments',     label: 'Documents',       perm: PERMISSIONS.MANAGE_DOCUMENTS,     color: '#7C3AED' },
  { route: 'HRMSTrainings',     label: 'Trainings',       perm: PERMISSIONS.MANAGE_TRAININGS,     color: '#84CC16' },
];

const HRMSDashboardScreen = () => {
  const navigation = useNavigation();
  const perms = usePermissions();

  const visible = MODULE_CARDS.filter(m => perms.can(m.perm));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>HRMS Dashboard</Text>
      <Text style={styles.sub}>Manage your workforce modules</Text>

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
  sub:       { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#6B7280', marginBottom: 20 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:      { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  dot:       { width: 10, height: 10, borderRadius: 5, marginBottom: 10 },
  cardLabel: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111' },
  empty:     { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default HRMSDashboardScreen;
