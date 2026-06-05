import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useMyReviews } from '../../../services/api/posApi';
import colors from '../../../theme/colors';

const RATING_COLOR = { 1: '#EF4444', 2: '#F97316', 3: '#F59E0B', 4: '#10B981', 5: '#059669' };

const StarRating = ({ rating }) => {
  const r = Number(rating) || 0;
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <Text key={n} style={{ fontSize: 14, color: n <= r ? '#F59E0B' : '#D1D5DB' }}>★</Text>
      ))}
    </View>
  );
};

const MyReviewsScreen = () => {
  const { data: raw = [], isLoading, refetch } = useMyReviews();
  const items = Array.isArray(raw) ? raw : (raw?.data ?? []);

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.rowPeriod}>{item.period ?? item.reviewPeriod ?? 'Performance Review'}</Text>
                {item.reviewedAt && (
                  <Text style={styles.rowMeta}>{new Date(item.reviewedAt).toLocaleDateString()}</Text>
                )}
              </View>
              <View style={[styles.ratingBadge, { backgroundColor: (RATING_COLOR[Math.round(item.rating)] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.ratingNum, { color: RATING_COLOR[Math.round(item.rating)] ?? '#9CA3AF' }]}>
                  {Number(item.rating ?? 0).toFixed(1)}
                </Text>
              </View>
            </View>
            <StarRating rating={item.rating} />
            {item.comments ? (
              <Text style={styles.comments}>{item.comments}</Text>
            ) : null}
            {item.reviewerName ? (
              <Text style={styles.reviewer}>Reviewed by: {item.reviewerName}</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No reviews available yet.</Text>}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#f4f6f9' },
  row:         { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  headerLeft:  { flex: 1 },
  rowPeriod:   { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111' },
  rowMeta:     { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 2 },
  ratingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  ratingNum:   { fontSize: 15, fontFamily: 'Outfit-Bold' },
  stars:       { flexDirection: 'row', gap: 2, marginBottom: 10 },
  comments:    { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#374151', lineHeight: 20, marginTop: 8, padding: 10, backgroundColor: '#F9FAFB', borderRadius: 8 },
  reviewer:    { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9CA3AF', marginTop: 8, fontStyle: 'italic' },
  empty:       { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
});

export default MyReviewsScreen;
