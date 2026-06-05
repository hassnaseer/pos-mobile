import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useStaffJobBoard, useApplyToJob } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const StaffJobBoardScreen = () => {
  const [selected, setSelected]   = useState(null); // job for detail modal
  const [coverLetter, setCoverLetter] = useState('');

  const { data: raw = [], isLoading, refetch } = useStaffJobBoard();
  const { mutateAsync: applyJob, isPending: applying } = useApplyToJob();

  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const openJob = job => {
    setSelected(job);
    setCoverLetter('');
  };

  const handleApply = async () => {
    if (!selected) return;
    try {
      await applyJob({ jobId: selected.id, coverLetter });
      Alert.alert('Applied!', 'Your application has been submitted.');
      setSelected(null);
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Application failed');
    }
  };

  const typeColor = t => {
    if (t === 'full_time') return '#3B82F6';
    if (t === 'part_time') return '#8B5CF6';
    if (t === 'contract')  return '#F59E0B';
    return '#9CA3AF';
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openJob(item)} activeOpacity={0.75}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.department && (
                <Text style={styles.rowDept}>{item.department}</Text>
              )}
              {item.description ? (
                <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <View style={styles.metaRow}>
                {item.jobType && (
                  <View style={[styles.typeBadge, { backgroundColor: typeColor(item.jobType) + '20' }]}>
                    <Text style={[styles.typeText, { color: typeColor(item.jobType) }]}>
                      {item.jobType.replace('_', ' ')}
                    </Text>
                  </View>
                )}
                {item.salary && (
                  <Text style={styles.rowMeta}>Rs {Number(item.salary).toLocaleString()}</Text>
                )}
                {item.deadline && (
                  <Text style={styles.rowMeta}>Deadline: {new Date(item.deadline).toLocaleDateString()}</Text>
                )}
              </View>
            </View>
            <Text style={styles.applyArrow}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No open positions right now.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />

      {/* Detail / Apply Modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{selected?.title}</Text>
              {selected?.department && (
                <Text style={styles.modalSub}>Department: {selected.department}</Text>
              )}
              {selected?.jobType && (
                <Text style={styles.modalSub}>Type: {selected.jobType.replace('_', ' ')}</Text>
              )}
              {selected?.salary && (
                <Text style={styles.modalSub}>Salary: Rs {Number(selected.salary).toLocaleString()}</Text>
              )}
              {selected?.description ? (
                <Text style={styles.modalDesc}>{selected.description}</Text>
              ) : null}
              {selected?.requirements ? (
                <>
                  <Text style={styles.sectionLabel}>Requirements</Text>
                  <Text style={styles.modalDesc}>{selected.requirements}</Text>
                </>
              ) : null}

              <Text style={styles.sectionLabel}>Cover Letter (optional)</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                value={coverLetter}
                onChangeText={setCoverLetter}
                placeholder="Tell us why you're a great fit..."
                placeholderTextColor="#999"
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelected(null)}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={applying}>
                {applying
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.submitText}>Apply Now</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f4f6f9' },
  row:         { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  rowInfo:     { flex: 1 },
  rowTitle:    { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 2 },
  rowDept:     { fontSize: 13, fontFamily: 'Outfit-Medium', color: colors.primary, marginBottom: 4 },
  rowDesc:     { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginBottom: 8 },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  typeBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText:    { fontSize: 11, fontFamily: 'Outfit-SemiBold', textTransform: 'capitalize' },
  rowMeta:     { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF' },
  applyArrow:  { fontSize: 22, color: '#D1D5DB', marginLeft: 8 },
  empty:       { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  // Modal
  modalBg:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:   { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle:  { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 4 },
  modalSub:    { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6B7280', marginBottom: 2 },
  modalDesc:   { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#374151', lineHeight: 22, marginTop: 4, marginBottom: 12 },
  sectionLabel:{ fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111', marginTop: 12, marginBottom: 6 },
  input:       { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions:{ flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn:   { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText:  { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  submitBtn:   { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  submitText:  { fontFamily: 'Outfit-SemiBold', color: '#fff' },
});

export default StaffJobBoardScreen;
