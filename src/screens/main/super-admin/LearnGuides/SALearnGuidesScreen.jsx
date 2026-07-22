import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView, RefreshControl,
} from 'react-native';
import { useSALearnGuides, useUpsertSALearnGuide, useCreateSALearnGuide } from '../../../../services/api/posApi';
import { GUIDE_KEY_DEFS, GUIDE_GROUPS, PERMISSION_OPTIONS } from '../../../../constants/learnGuideKeys';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const EMPTY_FORM = { title: '', subtitle: '', overview: '', videoUrl: '', tutorialUrl: '', requiredPermissions: [] };

// Icon mapping by guide key
const GUIDE_ICONS = {
  'sa-dashboard':        '📊',
  'sa-businesses':       '🏢',
  'sa-package-plans':    '📦',
  'sa-business-types':   '🏷',
  'sa-settings':         '⚙️',
  'sa-reports':          '💰',
  'sa-vendors':          '🛒',
  'sa-legal':            '📜',
  'sa-documents':        '📁',
  'sa-demo-requests':    '📅',
  'sa-platform-team':    '👥',
  'sa-custom-plans':     '🎯',
  'sa-payment-queue':    '💳',
  'sa-activity-logs':    '📋',
  'sa-error-logs':       '🐛',
  'sa-learn-guides':     '📖',
  dashboard:             '📊',
  pos:                   '🛒',
  products:              '📦',
  customers:             '👤',
  staff:                 '👥',
  reports:               '📈',
  inventory:             '📦',
  settings:              '⚙️',
};

const guideIcon = key => GUIDE_ICONS[key] ?? '📖';

const slugify = v => v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

export default function SALearnGuidesScreen() {
  const { data: guides = [], isLoading, isFetching, refetch } = useSALearnGuides();
  const { mutateAsync: upsertGuide, isPending: saving } = useUpsertSALearnGuide();
  const { mutateAsync: createGuide, isPending: creating } = useCreateSALearnGuide();

  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState('All');
  const [editKey, setEditKey] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [addOpen, setAddOpen] = useState(false);
  const [newKey, setNewKey]     = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newCustomGroup, setNewCustomGroup] = useState('');

  const dbMap = useMemo(() => Object.fromEntries(guides.map(g => [g.key, g])), [guides]);

  // Catalog merge: hardcoded guide keys + any DB-only custom ones
  const allDefs = useMemo(() => {
    const hardcodedKeys = new Set(GUIDE_KEY_DEFS.map(d => d.key));
    const customDefs = guides
      .filter(g => !hardcodedKeys.has(g.key) && g.label && g.guideGroup)
      .map(g => ({ key: g.key, label: g.label, group: g.guideGroup, isCustom: true }));
    return [...GUIDE_KEY_DEFS, ...customDefs];
  }, [guides]);

  const allGroups = useMemo(
    () => ['All', ...new Set([...GUIDE_GROUPS, ...allDefs.filter(d => d.isCustom).map(d => d.group)])],
    [allDefs],
  );

  const filtered = useMemo(() => allDefs.filter(def => {
    const matchGroup = activeGroup === 'All' || def.group === activeGroup;
    const matchSearch =
      def.label.toLowerCase().includes(search.toLowerCase()) ||
      def.key.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  }), [allDefs, activeGroup, search]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(def => {
      if (!groups[def.group]) groups[def.group] = [];
      groups[def.group].push(def);
    });
    return Object.entries(groups);
  }, [filtered]);

  const openEdit = def => {
    const db = dbMap[def.key];
    setForm({
      title:       db?.title       ?? '',
      subtitle:    db?.subtitle    ?? '',
      overview:    db?.overview    ?? '',
      videoUrl:    db?.videoUrl    ?? '',
      tutorialUrl: db?.tutorialUrl ?? '',
      requiredPermissions: db?.requiredPermissions ?? [],
    });
    setEditKey(def.key);
  };

  const togglePerm = code => {
    setForm(f => ({
      ...f,
      requiredPermissions: f.requiredPermissions.includes(code)
        ? f.requiredPermissions.filter(c => c !== code)
        : [...f.requiredPermissions, code],
    }));
  };

  const handleSave = async () => {
    try {
      await upsertGuide({ key: editKey, ...form });
      setEditKey(null);
      Alert.alert('Saved', 'Guide updated successfully.');
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save guide');
    }
  };

  const resetAddForm = () => {
    setNewKey(''); setNewLabel(''); setNewGroup(''); setNewCustomGroup('');
  };

  const handleCreateCustom = async () => {
    const finalGroup = newGroup === '__custom__' ? newCustomGroup.trim() : newGroup;
    if (!newKey.trim()) { Alert.alert('Error', 'Guide key is required'); return; }
    if (!newLabel.trim()) { Alert.alert('Error', 'Display label is required'); return; }
    if (!finalGroup) { Alert.alert('Error', 'Group is required'); return; }
    try {
      await createGuide({ key: newKey.trim(), label: newLabel.trim(), guideGroup: finalGroup });
      setAddOpen(false);
      resetAddForm();
      openEdit({ key: newKey.trim() });
    } catch (e) {
      Alert.alert('Error', typeof e === 'string' ? e : 'Failed to create guide');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Learn & Guides</Text>
            <Text style={styles.subtitle}>Step-by-step guides for every feature. Pick a topic to get started.</Text>
          </View>
          <HeaderAddButton onPress={() => setAddOpen(true)} label="Add Custom" />
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search guides…"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Group filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupBar} contentContainerStyle={styles.groupRow}>
        {allGroups.map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.groupChip, activeGroup === g && styles.groupChipActive]}
            onPress={() => setActiveGroup(g)}
          >
            <Text style={[styles.groupChipText, activeGroup === g && styles.groupChipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {grouped.length === 0 && (
            <Text style={styles.emptyText}>{search ? 'No guides match your search' : 'No guides found'}</Text>
          )}
          {grouped.map(([category, items]) => (
            <View key={category} style={styles.section}>
              <Text style={styles.sectionTitle}>{category.toUpperCase()}</Text>
              <View style={styles.cardGrid}>
                {items.map(def => {
                  const db = dbMap[def.key];
                  return (
                    <TouchableOpacity
                      key={def.key}
                      style={[styles.card, def.isCustom && styles.cardCustom]}
                      onPress={() => openEdit(def)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardIconWrap}>
                        <Text style={styles.cardIcon}>{guideIcon(def.key)}</Text>
                      </View>
                      <Text style={styles.cardTitle} numberOfLines={2}>{db?.title || def.label}</Text>
                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {db?.subtitle ?? db?.overview ?? 'Guide coming soon — check back after content is added.'}
                      </Text>
                      <View style={styles.tagRow}>
                        {def.isCustom && (
                          <View style={[styles.tag, { backgroundColor: '#f3e8ff' }]}>
                            <Text style={[styles.tagText, { color: '#7c3aed' }]}>Custom</Text>
                          </View>
                        )}
                        {db && (
                          <View style={[styles.tag, { backgroundColor: '#dcfce7' }]}>
                            <Text style={[styles.tagText, { color: '#15803d' }]}>Customised</Text>
                          </View>
                        )}
                        {db?.videoUrl ? (
                          <View style={[styles.tag, { backgroundColor: '#dbeafe' }]}>
                            <Text style={[styles.tagText, { color: '#1d4ed8' }]}>🎬 Video</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Custom Guide Modal */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.modalBox} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✨ Add Custom Guide</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              Create a guide key not in the standard list. It will appear here and on the Learn page for businesses.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Guide Key <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={newKey}
                onChangeText={v => setNewKey(slugify(v))}
                placeholder="e.g. my-custom-module"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
              <Text style={styles.fieldHint}>Lowercase letters, numbers, and hyphens only. Must be unique.</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Display Label <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="e.g. My Custom Module"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Group <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <View style={styles.chipWrap}>
                {[...GUIDE_GROUPS, '__custom__'].map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, newGroup === g && styles.chipActive]}
                    onPress={() => setNewGroup(g)}
                  >
                    <Text style={[styles.chipText, newGroup === g && styles.chipTextActive]}>
                      {g === '__custom__' ? '+ New group…' : g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {newGroup === '__custom__' && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={newCustomGroup}
                  onChangeText={setNewCustomGroup}
                  placeholder="Enter new group name"
                  placeholderTextColor="#9ca3af"
                />
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAddOpen(false); resetAddForm(); }} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#7c3aed' }]} onPress={handleCreateCustom} disabled={creating} activeOpacity={0.8}>
                {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Create Guide</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editKey} transparent animationType="slide" onRequestClose={() => setEditKey(null)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.modalBox} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Guide</Text>
              <TouchableOpacity onPress={() => setEditKey(null)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalKey}>{editKey}</Text>

            {/* Permission editor */}
            <View style={styles.field}>
              <Text style={styles.label}>Visibility</Text>
              <Text style={styles.fieldHint}>
                Leave all unchecked to show this guide to everyone. Check permissions to restrict it to staff who have at least one of the selected permissions.
              </Text>
              <View style={styles.chipWrap}>
                {PERMISSION_OPTIONS.map(opt => {
                  const active = form.requiredPermissions.includes(opt.code);
                  return (
                    <TouchableOpacity
                      key={opt.code}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => togglePerm(opt.code)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {form.requiredPermissions.length > 0 && (
                <Text style={styles.visibleToText}>
                  Visible to: staff with {form.requiredPermissions
                    .map(p => PERMISSION_OPTIONS.find(o => o.code === p)?.label ?? p)
                    .join(' or ')} permission (owners always see all guides).
                </Text>
              )}
            </View>

            {[
              { key: 'title',       label: 'Title',                    placeholder: 'e.g. Point of Sale (POS)' },
              { key: 'subtitle',    label: 'Subtitle',                 placeholder: 'One-line description' },
              { key: 'videoUrl',    label: 'Watch Video URL',          placeholder: 'YouTube or .mp4 URL', kb: 'url' },
              { key: 'tutorialUrl', label: 'Interactive Tutorial URL', placeholder: 'https://…', kb: 'url' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.label}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor="#9ca3af"
                  keyboardType={f.kb ?? 'default'}
                  autoCapitalize="none"
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={styles.label}>Overview</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.overview}
                onChangeText={v => setForm(p => ({ ...p, overview: v }))}
                placeholder="Describe what this module does…"
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>

            <Text style={styles.hint}>
              Screenshots, feature cards, and step-by-step guides can be managed from the web admin panel.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditKey(null)} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save Guide</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 16, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  subtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
  addBtn: { backgroundColor: '#f3e8ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#7c3aed' },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  searchInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#f9fafb' },
  groupBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', flexGrow: 0 },
  groupRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  groupChip: { height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  groupChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#666' },
  groupChipTextActive: { color: '#fff' },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', letterSpacing: 1, marginBottom: 10 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', width: '47%' },
  cardCustom: { borderColor: '#e9d5ff' },
  cardIconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f4f6f9', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', lineHeight: 16 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 10, fontFamily: 'Outfit-SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af', textAlign: 'center', marginTop: 40, paddingHorizontal: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827' },
  closeX: { fontSize: 18, color: '#9ca3af', padding: 4 },
  modalKey: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 6 },
  fieldHint: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 8 },
  visibleToText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.primary, marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#374151' },
  chipTextActive: { color: '#fff' },
  hint: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4, paddingBottom: 20 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  saveBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
