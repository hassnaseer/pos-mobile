import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Tooltip from 'react-native-walkthrough-tooltip';
import Toast from '../../../../components/Toast/Toast';
import colors from '../../../../theme/colors';
import calendarIcon from '../../../../assets/icons/calendar-check.png';

import receiptIcon from '../../../../assets/icons/receipt-lines.png';
import layerIcon from '../../../../assets/icons/layers-three.png';
import clockIcon from '../../../../assets/icons/clock-01.png';
import checkIcon from '../../../../assets/icons/check-broken.png';
import { useInstallmentDetails } from '../../../../services/api/clientApi';
import { formatDate } from '../../../../utils/formatDate';
import { formatCurrency } from '../../../../utils/formatCurrency';
import LoadingScreen from '../../../../components/LoadingScreen';

const SummaryCard = ({ icon, borderColor, title, value, fullValue, backgroundColor }) => {
  const isCurrency = title !== 'Project no.';
  const [showTip, setShowTip] = useState(false);

  return (
    <View style={[styles.summaryCard, { backgroundColor, borderColor }]}>
      <View style={styles.summaryContent}>
        {/* Icon + Title */}
        <View style={styles.summaryIcon}>
          <Image source={icon} style={styles.layerIcon} />
          <Text style={styles.summaryTitle}>{title}</Text>
        </View>

        {/* Value with Tooltip for currency */}
        {isCurrency ? (
          <Tooltip
            isVisible={showTip}
            content={
              <View style={styles.tooltipContent}>
                <Text style={styles.tooltipText}>{fullValue}</Text>
              </View>
            }
            placement="top"
            backgroundColor="transparent"
            tooltipStyle={styles.tooltipStyle}
            onClose={() => setShowTip(false)}
            disableShadow
            showChildInTooltip={false}
          >
            <TouchableOpacity
              onPress={() => setShowTip(true)}
              activeOpacity={0.8}
            >
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryValue}>
                  {value.length > 8 ? `${value.slice(0, 6)}...` : value}
                </Text>
                <Text style={styles.currency}>AED</Text>
              </View>
            </TouchableOpacity>
          </Tooltip>
        ) : (
          <Text style={styles.summaryValue}>{value}</Text>
        )}
      </View>
    </View>
  );
};

const InstallmentItem = ({ installment }) => {
  const getStatusStyles = status => {
    switch (status.toLowerCase()) {
      case 'paid':
        return {
          text: colors.success,
          dot: colors.success,
          backgroundColor: '#F0FEED',
        };
      case 'pending':
        return { text: '#FFC830', dot: '#FFC830', backgroundColor: '#FEF9ED' };
      case 'overdue':
        return { text: '#DC2626', dot: '#DC2626', backgroundColor: '#FEEDED' };
      default:
        return { text: colors.gray, dot: colors.gray };
    }
  };

  const status = getStatusStyles(installment.status);

  return (
    <View style={styles.installmentCard}>
      {/* Header */}
      <View style={styles.installmentHeader}>
        <Text style={styles.installmentTitle}>
          Installment no. {installment.id}
        </Text>
        <View
          style={[
            styles.statusContainer,
            { backgroundColor: status.backgroundColor },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
          <Text style={[styles.statusText, { color: status.text }]}>
            {installment?.status}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailRow}>
        <Image source={calendarIcon} style={styles.layerIcon} />
        <Text style={styles.detailText}>
          {formatDate(installment?.created_at)}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Image source={receiptIcon} style={styles.layerIcon} />
        <Text style={styles.detailText}>{installment?.invoice_number}</Text>
      </View>

      {/* Payable */}
      <View style={styles.payableBox}>
        <Text style={styles.payableLabel}>Payable amount</Text>
        <Text style={styles.payableValue}>
          {formatCurrency(installment?.price_on_invoice)} AED
        </Text>
      </View>
    </View>
  );
};

const InstallmentPlanScreen = ({ route, navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const { projectId, project_name } = route.params; // passed from previous screen

  const {
    data: installmentData,
    isLoading,
    refetch,
  } = useInstallmentDetails(projectId);

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  };
  // ✅ Show loading screen if data is loading and not from pull-to-refresh
  if (isLoading && !refreshing) {
    return <LoadingScreen message="Fetching installment data..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Title */}
      <View style={styles.titleWrapper}>
        <Text style={styles.projectTitle}>{project_name ?? 'N/A'}</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <SummaryCard
          icon={layerIcon}
          title="Project no."
          value={installmentData?.unit_id ?? '0'}
          backgroundColor="#EDF5FE"
          borderColor="#3083FF"
          textColor={colors.defaultBlack}
        />
        <SummaryCard
          icon={checkIcon}
          title="Total payments"
          value={formatCurrency(`${installmentData?.total_amount}`)}
          fullValue={installmentData?.total_amount || '0'}
          backgroundColor="#F0FEED"
          borderColor="#259800"
        />
        <SummaryCard
          icon={clockIcon}
          title="Remaining payments"
          value={formatCurrency(`${installmentData?.remaining_amount}`)}
          fullValue={installmentData?.remaining_amount || '0'}
          backgroundColor="#FEF9ED"
          borderColor="#FFC830"
        />
      </View>

      {/* Installments List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listWrapper}>
          {installmentData?.installments.map(inst => (
            <InstallmentItem key={inst.id} installment={inst} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  titleWrapper: { padding: 20 },
  projectTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  summaryCard: {
    height: 48,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#3083FF',
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 36,
  },
  summaryIcon: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    width: '50%',
    gap: 10,
  },
  summaryTextContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultBlack,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.secondary,
  },
  currency: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    marginLeft: 4,
  },
  summaryRow: {
    paddingHorizontal: 20,
    gap: 12,
  },
  scrollView: { flex: 1 },
  listWrapper: { padding: 20 },
  installmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  installmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  installmentTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
    marginBottom: 12,
  },
  statusContainer: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    borderRadius: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 8 },
  statusText: { fontSize: 14, fontFamily: 'Outfit-Reg' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
  payableBox: {
    marginTop: 6,
    height: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderColor: '#D0D5DD',
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payableLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
  payableValue: {
    fontSize: 15,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  layerIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  tooltipStyle: {
    backgroundColor: '#ffffff',
    borderColor: '#D0D5DD',
    borderWidth: 1,
    borderRadius: 10,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipText: {
    fontSize: 16,
    color: colors.defaultBlack,
    fontFamily: 'Outfit-Medium',
  },
});

export default InstallmentPlanScreen;