import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  Alert, Modal, Switch,
} from 'react-native';
import {
  useSABusinessTypes, useDeleteSABusinessType,
  useUpdateSABusinessType, useSABusinessCategories,
} from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';
import ConfirmModal from '../../../../components/Modal/ConfirmModal';

const DASHBOARD_OPTIONS = [
  { value: '', label: 'Standard POS' },
  { value: 'hrms', label: 'HRMS' },
  { value: 'medical', label: 'Medical' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'factory', label: 'Factory' },
  { value: 'pharmacy', label: 'Pharmacy' },
];

const SABusinessTypesScreen = ({ navigation }) => {
  const { data: raw = [], isLoading, refetch } = useSABusinessTypes();
  const { data: rawCats = [] } = useSABusinessCategories();
  const types = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const cats  = Array.isArray(rawCats) ? rawCats : (rawCats?.data ?? []);

  const { mutate: remove }   = useDeleteSABusinessType();
  const { mutateAsync: update } = useUpdateSABusinessType();

  const [menuItem, setMenuItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [toggling, setToggling] = useState(false);

  const handleDelete = item => {
    setMenuItem(null);
    setConfirmDelete(item);
  };

  const doDelete = () => {
    remove(confirmDelete.id);
    setConfirmDelete(null);
  };

  const handleToggleActive = item => {
    setMenuItem(null);
    setConfirmToggle(item);
  };

  const doToggle = async () => {
    setToggling(true);
    try {
      await update({ id: confirmToggle.id, active: !confirmToggle.active });
    } catch {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setToggling(false);
      setConfirmToggle(null);
    }
  };

  const dashLabel = v => DASHBOARD_OPTIONS.find(o => o.value === v)?.label ?? 'Standard POS';
  const catName   = id => cats.find(c => String(c.id) === String(id))?.name ?? null;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.heading}>Business Types</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('SABusinessTypeForm')}>
          <Text style={styles.addBtnText}>+ Add Type</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={types}
        keyExtractor={t => String(t.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.icon}>
              <Text style={styles.iconText}>{(item.name ?? 'B')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{item.name}</Text>
              {item.description ? <Text style={styles.rowSub} numberOfLines={1}>{item.description}</Text> : null}
              <View style={styles.rowMeta}>
                <Text style={styles.rowMetaText}>📊 {dashLabel(item.primaryDashboard)}</Text>
                {item.categoryId || item.category?.id
                  ? <Text style={styles.rowMetaText}>🏷 {catName(item.categoryId ?? item.category?.id) ?? 'Category'}</Text>
                  : null}
                {(item.permissions ?? []).length > 0
                  ? <Text style={styles.rowMetaText}>🔐 {item.permissions.length} perms</Text>
                  : null}
              </View>
            </View>
            <View style={styles.rowRight}>
              <Switch
                value={item.active !== false}
                onValueChange={() => handleToggleActive(item)}
                trackColor={{ false: '#D0D5DD', true: colors.primary }}
                thumbColor="#fff"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
              <TouchableOpacity
                style={styles.menuBtn}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                onPress={() => setMenuItem(item)}
              >
                <Text style={styles.menuDots}>⋮</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No business types yet.</Text>
            <TouchableOpacity style={styles.emptyAdd} onPress={() => navigation.navigate('SABusinessTypeForm')}>
              <Text style={styles.emptyAddText}>Add First Type</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
      />

      {/* 3-dot menu modal */}
      {menuItem && (
        <Modal transparent animationType="fade" visible onRequestClose={() => setMenuItem(null)}>
          <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuItem(null)}>
            <View style={styles.menuBox}>
              <Text style={styles.menuItemName} numberOfLines={1}>{menuItem.name}</Text>
              <TouchableOpacity style={styles.menuOpt} onPress={() => { setMenuItem(null); navigation.navigate('SABusinessTypeForm', { item: menuItem }); }}>
                <Text style={styles.menuOptIcon}>✏️</Text>
                <Text style={styles.menuOptText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuOpt} onPress={() => handleToggleActive(menuItem)}>
                <Text style={styles.menuOptIcon}>{menuItem.active !== false ? '🔴' : '🟢'}</Text>
                <Text style={styles.menuOptText}>{menuItem.active !== false ? 'Set Inactive' : 'Set Active'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuOpt, styles.menuOptDanger]} onPress={() => handleDelete(menuItem)}>
                <Text style={styles.menuOptIcon}>🗑</Text>
                <Text style={[styles.menuOptText, { color: '#dc2626' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <ConfirmModal
        visible={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="Delete Business Type"
        message={`Delete "${confirmDelete?.name}"? This may affect existing businesses.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmModal
        visible={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={doToggle}
        title={confirmToggle?.active !== false ? 'Set Inactive' : 'Set Active'}
        message={`${confirmToggle?.active !== false ? 'Deactivate' : 'Activate'} "${confirmToggle?.name}"?`}
        confirmLabel={confirmToggle?.active !== false ? 'Deactivate' : 'Activate'}
        variant={confirmToggle?.active !== false ? 'warning' : 'success'}
        loading={toggling}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  heading: { fontSize: 16, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit-Bold' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  rowSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 2 },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  rowMetaText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280' },
  rowRight: { alignItems: 'center', gap: 4 },
  menuBtn: { padding: 4 },
  menuDots: { fontSize: 20, color: '#9ca3af', fontFamily: 'Outfit-Bold', lineHeight: 22 },
  empty: { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyText: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', fontSize: 14 },
  emptyAdd: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  emptyAddText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  menuBox: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 4, width: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, elevation: 8 },
  menuItemName: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  menuOpt: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  menuOptDanger: { borderTopWidth: 1, borderColor: '#fef2f2' },
  menuOptIcon: { fontSize: 16 },
  menuOptText: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151' },
});

export default SABusinessTypesScreen;
