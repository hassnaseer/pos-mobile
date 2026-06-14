import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import {
  usePatientVisits, useCreatePatientVisit,
  useUpdatePatientVisit, usePatientsList,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const VISIT_TYPES = ['consultation', 'follow-up', 'emergency', 'checkup', 'procedure'];
const VISIT_STATUS = ['in-progress', 'completed', 'cancelled'];
const STATUS_STYLE = {
  'in-progress': { bg: '#dbeafe', text: '#1d4ed8' },
  completed:     { bg: '#dcfce7', text: '#16a34a' },
  cancelled:     { bg: '#f3f4f6', text: '#6b7280' },
};

const EMPTY_VISIT = { diagnosis: '', treatment: '', visitType: 'consultation', status: 'in-progress', notes: '', visitDate: '' };

const PatientTrackingScreen = () => {
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [visitForm, setVisitForm] = useState(EMPTY_VISIT);
  const setV = k => v => setVisitForm(p => ({ ...p, [k]: v }));

  const { data: pRaw = [] } = usePatientsList();
  const patients = Array.isArray(pRaw) ? pRaw : (pRaw?.data ?? []);
  const selectedPatient = patients.find(p => String(p.id) === String(selectedPatientId));

  const { data: visitRaw = [], isLoading, refetch } = usePatientVisits(selectedPatientId);
  const visits = Array.isArray(visitRaw) ? visitRaw : (visitRaw?.data ?? []);

  const { mutateAsync: createVisit, isPending: creating } = useCreatePatientVisit();
  const { mutateAsync: updateVisit, isPending: updating } = useUpdatePatientVisit();

  const openAddVisit = () => {
    if (!selectedPatientId) { Alert.alert('Select Patient', 'Please select a patient first'); return; }
    setEditingVisit(null);
    setVisitForm({ ...EMPTY_VISIT, visitDate: new Date().toISOString().slice(0, 10) });
    setShowVisitModal(true);
  };
  const openEditVisit = v => {
    setEditingVisit(v);
    setVisitForm({ diagnosis: v.diagnosis ?? '', treatment: v.treatment ?? '', visitType: v.visitType ?? 'consultation', status: v.status ?? 'in-progress', notes: v.notes ?? '', visitDate: v.visitDate?.slice(0, 10) ?? '' });
    setShowVisitModal(true);
  };

  const handleSaveVisit = async () => {
    try {
      if (editingVisit) await updateVisit({ id: editingVisit.id, ...visitForm });
      else await createVisit({ patientId: selectedPatientId, ...visitForm });
      setShowVisitModal(false);
    } catch { Alert.alert('Error', 'Save failed'); }
  };

  return (
    <View style={styles.root}>
      {/* Patient selector */}
      <TouchableOpacity style={styles.patientSelector} onPress={() => setShowPatientPicker(true)}>
        <Text style={styles.patientSelectorLabel}>{selectedPatient ? selectedPatient.name : 'Select Patient'}</Text>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      {selectedPatientId && (
        <TouchableOpacity style={styles.addVisitBtn} onPress={openAddVisit}>
          <Text style={styles.addVisitBtnText}>+ Add Visit</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={visits}
        keyExtractor={v => String(v.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {selectedPatientId ? 'No visits recorded.' : 'Select a patient to view their visits.'}
          </Text>
        }
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.status] ?? STATUS_STYLE['in-progress'];
          return (
            <TouchableOpacity style={styles.card} onPress={() => openEditVisit(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.visitDate}>{item.visitDate ? new Date(item.visitDate).toLocaleDateString() : '—'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.visitType}>{item.visitType ?? 'consultation'}</Text>
              {item.diagnosis ? <Text style={styles.detail}><Text style={styles.detailLabel}>Diagnosis: </Text>{item.diagnosis}</Text> : null}
              {item.treatment ? <Text style={styles.detail}><Text style={styles.detailLabel}>Treatment: </Text>{item.treatment}</Text> : null}
              {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
            </TouchableOpacity>
          );
        }}
      />

      {/* Patient picker modal */}
      <Modal visible={showPatientPicker} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Select Patient</Text>
            <FlatList
              data={patients}
              keyExtractor={p => String(p.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.patientItem} onPress={() => { setSelectedPatientId(String(item.id)); setShowPatientPicker(false); }}>
                  <Text style={styles.patientItemName}>{item.name}</Text>
                  {item.phone ? <Text style={styles.patientItemSub}>{item.phone}</Text> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No patients.</Text>}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPatientPicker(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Visit form modal */}
      <Modal visible={showVisitModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingVisit ? 'Edit Visit' : 'New Visit'}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.field}><Text style={styles.label}>Visit Date</Text><TextInput style={styles.input} value={visitForm.visitDate} onChangeText={setV('visitDate')} placeholder="YYYY-MM-DD" placeholderTextColor="#999" /></View>
              <View style={styles.field}>
                <Text style={styles.label}>Visit Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ flexDirection: 'row', gap: 6 }}>{VISIT_TYPES.map(t => (<TouchableOpacity key={t} style={[styles.typeChip, visitForm.visitType === t && styles.typeChipActive]} onPress={() => setVisitForm(f => ({ ...f, visitType: t }))}><Text style={[styles.typeText, visitForm.visitType === t && styles.typeTextActive]}>{t}</Text></TouchableOpacity>))}</View></ScrollView>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Status</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>{VISIT_STATUS.map(s => (<TouchableOpacity key={s} style={[styles.typeChip, visitForm.status === s && styles.typeChipActive]} onPress={() => setVisitForm(f => ({ ...f, status: s }))}><Text style={[styles.typeText, visitForm.status === s && styles.typeTextActive]}>{s}</Text></TouchableOpacity>))}</View>
              </View>
              <View style={styles.field}><Text style={styles.label}>Diagnosis</Text><TextInput style={[styles.input, { height: 60 }]} value={visitForm.diagnosis} onChangeText={setV('diagnosis')} placeholder="Diagnosis" placeholderTextColor="#999" multiline /></View>
              <View style={styles.field}><Text style={styles.label}>Treatment</Text><TextInput style={[styles.input, { height: 60 }]} value={visitForm.treatment} onChangeText={setV('treatment')} placeholder="Treatment" placeholderTextColor="#999" multiline /></View>
              <View style={styles.field}><Text style={styles.label}>Notes</Text><TextInput style={[styles.input, { height: 60 }]} value={visitForm.notes} onChangeText={setV('notes')} placeholder="Notes" placeholderTextColor="#999" multiline /></View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowVisitModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveVisit} disabled={creating || updating}>
                {(creating || updating) ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{editingVisit ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  patientSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: colors.primary + '40' },
  patientSelectorLabel: { fontSize: 15, fontFamily: 'Outfit-Medium', color: colors.primary },
  arrow: { fontSize: 20, color: colors.primary },
  addVisitBtn: { marginHorizontal: 12, marginBottom: 4, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addVisitBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 14 },
  card: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  visitDate: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontFamily: 'Outfit-SemiBold' },
  visitType: { fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.primary, marginBottom: 6, textTransform: 'capitalize' },
  detail: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#444', marginBottom: 3 },
  detailLabel: { fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  notes: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 4, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  patientItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  patientItemName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1a1a1a' },
  patientItemSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#888', marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1a1a1a', marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#1a1a1a', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#1a1a1a' },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  typeTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#666' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default PatientTrackingScreen;
