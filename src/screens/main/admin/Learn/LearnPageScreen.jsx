import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Linking, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import colors from '../../../../theme/colors';

const useGuideRecord = key =>
  useQuery({
    queryKey: ['learn-guide', key],
    queryFn: async () => { const res = await apiClient.get(`/admin/learn-guides/${key}`); return res?.data ?? res ?? null; },
    enabled: !!key,
  });

export default function LearnPageScreen({ route }) {
  const { guideKey, label } = route.params ?? {};
  const { data: rx, isLoading, isFetching, refetch } = useGuideRecord(guideKey);

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  const title = rx?.title ?? label ?? 'Guide';
  const subtitle = rx?.subtitle ?? '';
  const overview = rx?.overview ?? '';
  const cards = rx?.cards ?? [];
  const steps = rx?.steps ?? [];
  const screenshots = rx?.screenshots ?? [];
  const hasContent = !!(rx && (overview || cards.length || steps.length || screenshots.length));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}><Text style={{ fontSize: 20 }}>📘</Text></View>
        <Text style={styles.heroTitle}>{title}</Text>
        {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
        {overview ? <Text style={styles.heroOverview}>{overview}</Text> : null}

        <View style={styles.ctaRow}>
          {rx?.tutorialUrl ? (
            <TouchableOpacity style={styles.ctaBtn} onPress={() => Linking.openURL(rx.tutorialUrl)}>
              <Text style={styles.ctaText}>✨ Interactive Tutorial</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.ctaBtn, styles.ctaBtnDisabled]}><Text style={styles.ctaTextDisabled}>Interactive Tutorial — Coming Soon</Text></View>
          )}
          {rx?.videoUrl ? (
            <TouchableOpacity style={styles.ctaBtn} onPress={() => Linking.openURL(rx.videoUrl)}>
              <Text style={styles.ctaText}>▶ Watch Video</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.ctaBtn, styles.ctaBtnDisabled]}><Text style={styles.ctaTextDisabled}>Watch Video — Coming Soon</Text></View>
          )}
        </View>
      </View>

      {!hasContent && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Guide content coming soon.</Text>
        </View>
      )}

      {cards.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.cardsGrid}>
            {cards.map((c, i) => (
              <View key={i} style={styles.featureCard}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureTitle}>{c.title}</Text>
                <Text style={styles.featureDesc}>{c.description}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {screenshots.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Screenshots{screenshots.length > 1 ? ` (${screenshots.length})` : ''}</Text>
          {screenshots.map((s, i) => (
            <View key={i} style={styles.screenshotCard}>
              <Image source={{ uri: s.url }} style={styles.screenshotImg} resizeMode="cover" />
              {s.label ? <Text style={styles.screenshotLabel}>{s.label}</Text> : null}
            </View>
          ))}
        </View>
      )}

      {steps.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Step-by-Step Guide</Text>
          <View style={{ gap: 10 }}>
            {steps.map((step, i) => (
              <View key={i} style={styles.stepCard}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 20, paddingBottom: 32 },
  hero: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 18 },
  heroIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  heroTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827' },
  heroSubtitle: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#4b5563', marginTop: 4 },
  heroOverview: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151', marginTop: 10, lineHeight: 19 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  ctaBtn: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 9 },
  ctaBtnDisabled: { backgroundColor: '#f3f4f6' },
  ctaText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  ctaTextDisabled: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#9ca3af' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#9ca3af' },
  sectionTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 10 },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard: { flexBasis: '100%', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  featureCheck: { fontSize: 15, color: colors.primary, marginBottom: 6, fontFamily: 'Outfit-Bold' },
  featureTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  featureDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4, lineHeight: 17 },
  screenshotCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', marginBottom: 10 },
  screenshotImg: { width: '100%', height: 200 },
  screenshotLabel: { fontSize: 11, fontFamily: 'Outfit-Medium', color: '#6b7280', padding: 10, borderTopWidth: 1, borderColor: '#f3f4f6' },
  stepCard: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#fff' },
  stepTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  stepDesc: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 3, lineHeight: 17 },
});
