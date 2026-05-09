import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import CircularProgress from '../../../../components/Ui/CircularProgressBar';
import calendarIcon from '../../../../assets/icons/calendar-check.png';
import layerIcon from '../../../../assets/icons/layers-three.png';
import clockIcon from '../../../../assets/icons/clock-01.png';
import checkIcon from '../../../../assets/icons/check-broken.png';
import Tooltip from 'react-native-walkthrough-tooltip';

import colors from '../../../../theme/colors';
import {
  useClientSummary,
  useConstructionUpdates,
} from '../../../../services/api/clientApi';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { formatDate } from '../../../../utils/formatDate';
import { useAuth } from '../../../../context/AuthContext';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';
import { useSearchStore } from '../../../../store/searchStore';

const { width } = Dimensions.get('window');

const SummaryCard = ({ icon, borderColor, title, value, fullValue, backgroundColor }) => {
  const isCurrency = title !== 'Total projects';
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

const ProjectCard = ({ project, onViewPlan }) => {
  return (
    <View style={styles.projectCard}>
      {/* Project Header */}
      <View style={styles.projectHeader}>
        <Text style={styles.projectName}>{project.name}</Text>
      </View>

      {/* Project Date */}
      <View style={styles.dateTextContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Image source={calendarIcon} style={styles.calendarIcon} />
          <Text style={styles.projectDate}>{formatDate(project.date)}</Text>
        </View>
        <CircularProgress
          progress={project.progress}
          color="#336699"
          size={50}
          strokeWidth={5}
        />
      </View>

      {/* View Installment Plan */}
      <TouchableOpacity
        style={styles.viewPlanButton}
        onPress={() => onViewPlan(project.id, project.name)}
      >
        <Text style={styles.viewPlanText}>View installment plan</Text>
      </TouchableOpacity>
    </View>
  );
};

const InstallmentManagementScreen = ({ navigation }) => {
  useResetSearchOnFocus();
  const searchQuery = useSearchStore(state => state.searchQuery);
  const { isAuthenticated } = useAuth();

  const { data: installmentData, isLoading: updatesLoading } =
    useConstructionUpdates({
      enabled: isAuthenticated,
    });

  const { data: summaryDetails } = useClientSummary({
    enabled: isAuthenticated,
  });

  const normalizedData = Array.isArray(installmentData)
    ? installmentData
    : installmentData
    ? [installmentData]
    : [];

  const allProjects =
    normalizedData.flatMap(
      client =>
        client.units?.map(project => ({
          id: project.inprogress_id,
          name: project.project_name,
          date: project.last_update_date || '20-10-2023',
          progress: project.percentage ? Number(project.percentage) : 0,
          clientName: client.client_name,
          clientId: client.client_id,
          status: project.status,
        })) || [],
    ) || [];

  const q = searchQuery.toLowerCase();
  const filteredProjects = allProjects.filter(project =>
    project.name?.toLowerCase().includes(q),
  );
  const handleViewPlan = (projectId, project_name) => {
    navigation.navigate('InstallmentPlan', {
      projectId: projectId,
      project_name: project_name,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Installment Management</Text>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Section */}
        <View style={styles.summarySection}>
          <SummaryCard
            icon={layerIcon}
            title="Total projects"
            value={allProjects?.length?.toString() || '0'}
            backgroundColor="#EDF5FE"
            borderColor="#3083FF"
          />
          <SummaryCard
            icon={checkIcon}
            title="Total payments"
            value={formatCurrency(summaryDetails?.total_amount)}
            fullValue={summaryDetails?.total_amount || '0'}
            backgroundColor="#F0FEED"
            borderColor="#259800"
          />
          <SummaryCard
            icon={clockIcon}
            title="Remaining payments"
            value={formatCurrency(summaryDetails?.total_remaining)}
            fullValue={summaryDetails?.total_remaining || '0'}
            backgroundColor="#FEF9ED"
            borderColor="#FFC830"
          />
        </View>

        {/* Project Cards */}
        {updatesLoading ? (
          <Text style={styles.loadingText}>Loading projects...</Text>
        ) : filteredProjects.length > 0 ? (
          filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onViewPlan={handleViewPlan}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'No matching projects found'
              : 'No ongoing projects found'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  heading: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  summarySection: { marginBottom: 30 },
  summaryCard: {
    height: 48,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
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
  projectCard: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#EAECF0',
  },
  projectName: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarIcon: { width: 18, height: 18, marginRight: 8 },
  projectDate: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
  viewPlanButton: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewPlanText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
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

export default InstallmentManagementScreen;
