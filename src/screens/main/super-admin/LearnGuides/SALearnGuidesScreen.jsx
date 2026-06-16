import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { useSALearnGuides, useUpsertSALearnGuide } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { title: '', subtitle: '', overview: '', videoUrl: '', tutorialUrl: '' };

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

// Group guides by their category field (or derive from key prefix)
function groupGuides(guides) {
  const groups = {};
  guides.forEach(g => {
    const cat = g.category ?? (g.key?.startsWith('sa-') ? 'Super Admin' : 'Admin');
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(g);
  });
  return Object.entries(groups);
}

export default function SALearnGuidesScreen() {
  const { data: guides = [], isLoading } = useSALearnGuides();
  const { mutateAsync: upsertGuide, isPending: saving } = useUpsertSALearnGuide();

  const [search, setSearch] = useState('');
  const [editKey, setEditKey] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);

  const filtered = useMemo(
    () => guides.filter(g =>
      (g.key ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (g.title ?? '').toLowerCase().includes(search.toLowerCase()),
    ),
    [guides, search],
  );

  const grouped = useMemo(() => groupGuides(filtered), [filtered]);

  const openEdit = guide => {
    setForm({
      title:       guide.title       ?? '',
      subtitle:    guide.subtitle    ?? '',
      overview:    guide.overview    ?? '',
      videoUrl:    guide.videoUrl    ?? '',
      tutorialUrl: guide.tutorialUrl ?? '',
    });
    setEditKey(guide.key);
  };

  const handleSave = async () => {
    try {
      await upsertGuide({ key: editKey, ...form });
      setEditKey(null);
      Alert.alert('Saved', 'Guide updated successfully.');
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Failed to save guide');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Learn & Guides</Text>
        <Text style={styles.subtitle}>Step-by-step guides for every feature. Pick a topic to get started.</Text>
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

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {grouped.length === 0 && (
            <Text style={styles.emptyText}>{search ? 'No guides match your search' : 'No guides found'}</Text>
          )}
          {grouped.map(([category, items]) => (
            <View key={category} style={styles.section}>
              <Text style={styles.sectionTitle}>{category.toUpperCase()}</Text>
              <View style={styles.cardGrid}>
                {items.map(guide => (
                  <TouchableOpacity
                    key={guide.key ?? guide.id}
                    style={styles.card}
                    onPress={() => openEdit(guide)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardIconWrap}>
                      <Text style={styles.cardIcon}>{guideIcon(guide.key)}</Text>
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{guide.title ?? guide.key}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {guide.subtitle ?? guide.overview ?? 'Guide coming soon — check back after content is added.'}
                    </Text>
                    {guide.videoUrl ? (
                      <View style={styles.videoTag}>
                        <Text style={styles.videoTagText}>🎬 Video</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

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
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  subtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  searchInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#f9fafb' },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', letterSpacing: 1, marginBottom: 10 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', width: '47%' },
  cardIconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f4f6f9', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', lineHeight: 16 },
  videoTag: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#d1fae5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  videoTagText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#065f46' },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af', textAlign: 'center', marginTop: 40, paddingHorizontal: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827' },
  closeX: { fontSize: 18, color: '#9ca3af', padding: 4 },
  modalKey: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  hint: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4, paddingBottom: 20 },
  cancelBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  saveBtn: { flex: 1, borderRadius: 8, paddingVertical: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
