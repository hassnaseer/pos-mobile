import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
} from 'react-native';
import { useSALearnGuides, useUpsertSALearnGuide } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const EMPTY_FORM = { title: '', subtitle: '', overview: '', videoUrl: '', tutorialUrl: '' };

export default function SALearnGuidesScreen() {
  const { data: guides = [], isLoading } = useSALearnGuides();
  const { mutateAsync: upsertGuide, isPending: saving } = useUpsertSALearnGuide();

  const [search, setSearch]     = useState('');
  const [editKey, setEditKey]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);

  // Build a key → guide map
  const guideMap = useMemo(
    () => Object.fromEntries(guides.map(g => [g.key, g])),
    [guides],
  );

  const filtered = useMemo(
    () => guides.filter(g =>
      (g.key ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (g.title ?? '').toLowerCase().includes(search.toLowerCase()),
    ),
    [guides, search],
  );

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

  const renderItem = ({ item: guide }) => {
    const hasVideo      = !!guide.videoUrl;
    const hasScreenshots = (guide.screenshots?.length ?? 0) > 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.guideTitle}>{guide.title ?? guide.key}</Text>
            <Text style={styles.guideKey}>{guide.key}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: hasVideo ? '#16a34a' : '#d1d5db' }]} />
        </View>

        <View style={styles.indicators}>
          <Text style={[styles.indicator, hasVideo && styles.indicatorOn]}>
            🎬 {hasVideo ? 'Video set' : 'No video'}
          </Text>
          <Text style={[styles.indicator, hasScreenshots && styles.indicatorOn]}>
            🖼️ {hasScreenshots ? `${guide.screenshots.length} screenshot${guide.screenshots.length > 1 ? 's' : ''}` : 'No screenshots'}
          </Text>
          {(guide.cards?.length ?? 0) > 0 && (
            <Text style={styles.indicator}>📋 {guide.cards.length} cards</Text>
          )}
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(guide)} activeOpacity={0.7}>
          <Text style={styles.editBtnText}>Edit Guide</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Learn Guides Manager</Text>
        <Text style={styles.subtitle}>Customize module guides shown to business admins</Text>
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

      {/* Legend */}
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
        <Text style={styles.legendText}>Has video</Text>
        <View style={[styles.legendDot, { backgroundColor: '#d1d5db', marginLeft: 12 }]} />
        <Text style={styles.legendText}>No video</Text>
      </View>

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.key ?? item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search ? 'No guides match your search' : 'No guides found'}
            </Text>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal visible={!!editKey} transparent animationType="slide" onRequestClose={() => setEditKey(null)}>
        <View style={styles.overlay}>
          <ScrollView style={styles.modalBox} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalTitle}>Edit Guide</Text>
            <Text style={styles.modalKey}>{editKey}</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={v => setForm(f => ({ ...f, title: v }))}
                placeholder="e.g. Point of Sale (POS)"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Subtitle</Text>
              <TextInput
                style={styles.input}
                value={form.subtitle}
                onChangeText={v => setForm(f => ({ ...f, subtitle: v }))}
                placeholder="One-line description"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Overview</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={form.overview}
                onChangeText={v => setForm(f => ({ ...f, overview: v }))}
                placeholder="Describe what this module does…"
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Watch Video URL</Text>
              <TextInput
                style={styles.input}
                value={form.videoUrl}
                onChangeText={v => setForm(f => ({ ...f, videoUrl: v }))}
                placeholder="YouTube embed or direct .mp4 URL"
                placeholderTextColor="#9ca3af"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Interactive Tutorial URL</Text>
              <TextInput
                style={styles.input}
                value={form.tutorialUrl}
                onChangeText={v => setForm(f => ({ ...f, tutorialUrl: v }))}
                placeholder="https://…"
                placeholderTextColor="#9ca3af"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.hint}>
              Screenshots, feature cards, and step-by-step guides can be managed from the web admin panel for richer content.
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
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  subtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  legend: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  guideTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  guideKey: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  indicators: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  indicator: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  indicatorOn: { color: '#16a34a' },
  editBtn: { borderRadius: 8, paddingVertical: 9, backgroundColor: '#f3f4f6', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  editBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  emptyText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9ca3af', textAlign: 'center', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111827', marginBottom: 2 },
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
