import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import apiClient from '../../../../services/api/globalApi';
import { GUIDE_KEY_DEFS, ADMIN_GUIDE_GROUPS } from './learnGuideKeys';
import colors from '../../../../theme/colors';

const useGuideRestrictions = () =>
  useQuery({
    queryKey: ['learn-guides-list'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/learn-guides');
      return res?.data ?? res ?? [];
    },
    staleTime: 5 * 60_000,
  });

export default function LearnHubScreen({ navigation }) {
  const { user } = useAuth();
  const { data: rawGuides = [], isFetching, refetch } = useGuideRestrictions();

  const restrictionMap = useMemo(() => {
    const guides = Array.isArray(rawGuides) ? rawGuides : (rawGuides?.data ?? []);
    const map = new Map();
    guides.forEach(g => { if (g.requiredPermissions?.length > 0) map.set(g.key, g.requiredPermissions); });
    return map;
  }, [rawGuides]);

  const isAccessible = def => {
    if (def.requiredAnyPerm?.length) {
      const allCodes = [...(user?.permissionCodes ?? []), ...(user?.businessPermissionCodes ?? [])];
      if (!allCodes.some(p => def.requiredAnyPerm.includes(p))) return false;
    }
    const required = restrictionMap.get(def.key);
    if (!required || required.length === 0) return true;
    if (user?.permissionCodes?.length) return required.some(p => user.permissionCodes.includes(p));
    return true;
  };

  const groupedGuides = ADMIN_GUIDE_GROUPS
    .map(group => ({ group, defs: GUIDE_KEY_DEFS.filter(d => d.group === group && isAccessible(d)) }))
    .filter(g => g.defs.length > 0);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View>
        <Text style={styles.heading}>Learn & Guides</Text>
        <Text style={styles.subHeading}>Step-by-step guides for every feature. Pick a topic below to get started.</Text>
      </View>

      {groupedGuides.map(({ group, defs }) => (
        <View key={group}>
          <Text style={styles.groupTitle}>{group}</Text>
          <View style={styles.grid}>
            {defs.map(def => (
              <TouchableOpacity
                key={def.key}
                style={styles.card}
                onPress={() => navigation.navigate('LearnPage', { guideKey: def.key, label: def.label })}
                activeOpacity={0.8}
              >
                <View style={styles.cardIcon}><Text style={styles.cardIconText}>📘</Text></View>
                <Text style={styles.cardTitle}>{def.label}</Text>
                <Text style={styles.cardLink}>Read guide →</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 22, paddingBottom: 32 },
  heading: { fontSize: 22, fontFamily: 'Outfit-Bold', color: '#111827' },
  subHeading: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
  groupTitle: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, borderBottomWidth: 1, borderColor: '#e5e7eb', paddingBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  cardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  cardIconText: { fontSize: 16 },
  cardTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 6 },
  cardLink: { fontSize: 11, fontFamily: 'Outfit-Medium', color: colors.primary },
});
