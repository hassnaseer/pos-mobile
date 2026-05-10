import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSAPlatformSettings, useUpdateSAPlatformSetting } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const SASettingsScreen = () => {
  const { data: settings = [], isLoading, refetch } = useSAPlatformSettings();
  const { mutateAsync: update, isPending } = useUpdateSAPlatformSetting();
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');

  const settingList = Array.isArray(settings) ? settings : (settings?.data ?? []);

  const startEdit = s => { setEditing(s.id); setEditValue(String(s.value ?? '')); };

  const handleSave = async id => {
    try {
      await update({ id, value: editValue });
      setEditing(null);
    } catch (err) { Alert.alert('Error', typeof err === 'string' ? err : 'Save failed'); }
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={settingList}
        keyExtractor={s => String(s.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.settingName?.replace(/_/g, ' ') ?? item.name}</Text>
              {item.description && <Text style={styles.rowSub}>{item.description}</Text>}
            </View>
            {editing === item.id ? (
              <View style={styles.editWrap}>
                <TextInput style={styles.editInput} value={editValue} onChangeText={setEditValue} autoFocus />
                <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave(item.id)} disabled={isPending}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                  <Text style={styles.cancelBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.valueWrap} onPress={() => startEdit(item)}>
                <Text style={styles.value}>{String(item.value ?? '')}</Text>
                <Text style={styles.editHint}>tap to edit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No platform settings.</Text>}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  row: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14 },
  rowInfo: { marginBottom: 8 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, textTransform: 'capitalize' },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  editHint: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#aaa' },
  editWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: { flex: 1, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontFamily: 'Outfit-Regular' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  cancelBtn: { padding: 8 },
  cancelBtnText: { color: colors.secondary, fontSize: 16 },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default SASettingsScreen;
