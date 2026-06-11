import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { BASE_URL } from '../../services/api/globalApi';
import colors from '../../theme/colors';

const TITLES = { terms: 'Terms of Service', privacy: 'Privacy Policy' };

const LegalPageScreen = ({ navigation, route }) => {
  const { type = 'terms' } = route.params ?? {};
  const [content, setContent] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/legal/${type}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (j?.data) {
          setContent(j.data.content ?? '');
          setUpdatedAt(j.data.updatedAt ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{TITLES[type] ?? 'Legal'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>{TITLES[type] ?? 'Legal'}</Text>
          {updatedAt && (
            <Text style={styles.updatedAt}>
              Last updated: {new Date(updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Text>
          )}
          <View style={styles.divider} />
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : !content ? (
            <Text style={styles.empty}>This page has not been set up yet.</Text>
          ) : (
            <Text style={styles.content}>{content}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f4f6f9' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  backBtn:     { width: 60 },
  backText:    { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.primary },
  headerTitle: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#111', textAlign: 'center', flex: 1 },
  body:        { padding: 16, paddingBottom: 40 },
  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  title:       { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 6 },
  updatedAt:   { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginBottom: 16 },
  divider:     { height: 1, backgroundColor: '#E5E7EB', marginBottom: 16 },
  content:     { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#374151', lineHeight: 22 },
  empty:       { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#9CA3AF', textAlign: 'center', marginTop: 16 },
});

export default LegalPageScreen;
