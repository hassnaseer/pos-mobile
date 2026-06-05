import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Linking, Alert } from 'react-native';
import { useMyDocuments } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const DOC_ICON = {
  pdf:   { emoji: '📄', bg: '#FEE2E2', color: '#DC2626' },
  image: { emoji: '🖼️', bg: '#DBEAFE', color: '#2563EB' },
  doc:   { emoji: '📝', bg: '#EDE9FE', color: '#7C3AED' },
  other: { emoji: '📎', bg: '#F3F4F6', color: '#6B7280' },
};

const getDocType = filename => {
  if (!filename) return 'other';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['doc', 'docx', 'txt', 'xlsx', 'xls'].includes(ext)) return 'doc';
  return 'other';
};

const MyDocumentsScreen = () => {
  const { data: raw = [], isLoading, refetch } = useMyDocuments();
  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const openDoc = async item => {
    const url = item.fileUrl ?? item.url;
    if (!url) { Alert.alert('No file', 'This document has no attached file.'); return; }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Cannot open', 'No app available to open this file.');
    } catch {
      Alert.alert('Error', 'Could not open the document.');
    }
  };

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const docType = getDocType(item.fileName ?? item.filename);
          const icon = DOC_ICON[docType];
          const hasFile = !!(item.fileUrl ?? item.url);
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => openDoc(item)}
              activeOpacity={hasFile ? 0.7 : 1}
            >
              <View style={[styles.iconWrap, { backgroundColor: icon.bg }]}>
                <Text style={styles.iconEmoji}>{icon.emoji}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.title ?? item.name ?? 'Document'}</Text>
                {item.category && (
                  <Text style={styles.rowCategory}>{item.category}</Text>
                )}
                {item.fileName && (
                  <Text style={styles.rowFile} numberOfLines={1}>{item.fileName}</Text>
                )}
                {item.uploadedAt && (
                  <Text style={styles.rowMeta}>{new Date(item.uploadedAt).toLocaleDateString()}</Text>
                )}
              </View>
              {hasFile && (
                <Text style={styles.openIcon}>↗</Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No documents on file.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#f4f6f9' },
  row:        { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  iconWrap:   { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconEmoji:  { fontSize: 22 },
  rowInfo:    { flex: 1 },
  rowName:    { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111', marginBottom: 2 },
  rowCategory:{ fontSize: 12, fontFamily: 'Outfit-Medium', color: colors.primary },
  rowFile:    { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  rowMeta:    { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  openIcon:   { fontSize: 16, color: '#9CA3AF', marginLeft: 4 },
  empty:      { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MyDocumentsScreen;
