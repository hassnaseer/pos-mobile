import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import colors from '../../../../theme/colors';
import {
  useNotifications,
  useMarkNotificationRead,
} from '../../../../services/api/clientApi';
import { useAuth } from '../../../../context/AuthContext';
import {formatTimestamp} from '../../../../utils/formatTime';
// --- Color mapping ---
const TYPE_COLORS = {
  success: '#28C76F', // green
  error: '#FF4D4F', // red
  warning: '#FFB020', // yellow
  info: '#00CFE8', // blue
  default: '#FFCC00',
};

// --- Determine color based on notification title ---
const getTypeFromTitle = title => {
  if (title.includes('Sales Offer')) return 'success';
  if (title.includes('Invoice')) return 'error';
  if (title.includes('Project Assigned')) return 'info';
  return 'default';
};

const getTypeColor = title => TYPE_COLORS[getTypeFromTitle(title)];

// --- Format time from ISO string ---
const formatTime = isoString => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// --- Notification Card ---
const NotificationCard = ({ item }) => {
  const color = getTypeColor(item.title);
  const { mutate: markRead } = useMarkNotificationRead();

  const handleCardPress = () => {
    if (!item.is_read) {
      markRead(item.id);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleCardPress}
      style={[
        styles.card,
        item.is_read ? { backgroundColor: '#fff' } : { backgroundColor: '#F9FBFF' },
      ]}
    >
      <View style={[styles.leftBar, { backgroundColor: color }]} />

      <View style={styles.cardMain}>
        <Text
          style={[
            styles.message,
            !item.is_read && { fontFamily: 'Outfit-Medium' },
          ]}
        >
          {item.message}
        </Text>
      </View>

      <View style={styles.sideContainer}>
        <Text style={styles.time}>{formatTimestamp(item.created_at)}</Text>

        {/* Blue dot indicator for unread notifications */}
        {!item.is_read && <View style={styles.blueDot} />}
      </View>
    </TouchableOpacity>
  );
};

// --- Notifications Screen ---
export default function NotificationsScreen({ navigation }) {
  const { userRole } = useAuth(); // get the current user role
  const { data, isLoading, isError, refetch } = useNotifications(userRole);
  const notifications = data || [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          <Text style={styles.title}>Notifications</Text>

          {isError && (
            <Text style={styles.errorText}>Failed to load notifications.</Text>
          )}

          {!isLoading && notifications.length === 0 && (
            <Text style={styles.emptyText}>No notifications available.</Text>
          )}

          {notifications.map(n => (
            <NotificationCard key={n.id} item={n} />
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const CARD_RADIUS = 8;
const CARD_MIN_HEIGHT = 64;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Outfit-Medium',
    color: colors.defaultBlack,
    paddingTop: 20,
    paddingBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#ECEFF3',
    borderRadius: CARD_RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    minHeight: CARD_MIN_HEIGHT,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  leftBar: {
    width: 6,
    height: '100%',
    borderRadius: CARD_RADIUS,
    marginRight: 12,
    alignSelf: 'stretch',
  },
  cardMain: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.defaultBlack,
    lineHeight: 20,
    fontFamily: 'Outfit-Regular',
  },
  sideContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 10,
    gap: 6,
  },
  time: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
  },
  blueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3083FF',
    marginTop: 4,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    marginTop: 10,
  },
});
