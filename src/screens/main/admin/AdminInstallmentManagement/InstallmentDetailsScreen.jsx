import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import CircularProgress from '../../../../components/Ui/CircularProgressBar';
import colors from '../../../../theme/colors';
import { formatCurrency } from '../../../../utils/formatCurrency';
import layerIcon from '../../../../assets/icons/layers-three.png';
import checkIcon from '../../../../assets/icons/check-broken.png';
import clockIcon from '../../../../assets/icons/clock-01.png';
import calendarIcon from '../../../../assets/icons/calendar-check.png';
import GenerateInvoiceModal from '../../../../components/Modal/installmentManagement/GenerateInvoiceModal';
import ViewInvoiceModal from '../../../../components/Modal/installmentManagement/ViewInvoiceModal';
import { useSearchStore } from '../../../../store/searchStore';

import {
  useClientProjects,
  useInProgressClient,
  useInstallmentPlan,
} from '../../../../services/api/installmentApi';
import { formatDate } from '../../../../utils/formatDate';
import { usePermissions } from '../../../../hooks/usePermissions';
import { MODULES, PERMISSIONS } from '../../../../utils/permissions';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';
import { capitalizeWords } from '../../../../utils/stringUtils';
import { ColorProperties } from 'react-native-reanimated/lib/typescript/Colors';
import Toast from '../../../../components/Toast/Toast';
import Tooltip from 'react-native-walkthrough-tooltip';

const SummaryCard = ({
  icon,
  borderColor,
  title,
  value,
  fullValue,
  backgroundColor,
}) => {
  const isCurrency = title !== 'Total projects';
  const [showTip, setShowTip] = useState(false);

  return (
    <View style={[styles.summaryCard, { backgroundColor, borderColor }]}>
      <View style={styles.summaryContent}>
        <View style={styles.summaryIcon}>
          <Image source={icon} style={styles.iconImage} />
          <Text style={styles.summaryTitle}>{title}</Text>
        </View>

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

const ProjectCard = ({
  project,
  onGenerateInvoice,
  onViewPlan,
  setRemainingAmount,
}) => {
  const {
    data: installmentDetails,
    isLoading: loadingInstallmentDetails,
    refetch: refetchInstallmentDetails,
  } = useInstallmentPlan(project.inprogress_id);

  //Use to calculate the remaining payable amount for invoice generation (paid + pending)
  useEffect(() => {
    const invoicesTotal = installmentDetails?.installments
      ?.filter(i => i.status === 'paid' || i.status === 'pending')
      ?.reduce((sum, i) => sum + Number(i.price_on_invoice || 0), 0);
    const totalAmount = Number(
      installmentDetails?.total_amount?.replace(/[^\d.-]/g, '') || 0,
    );
    const remaining = totalAmount - invoicesTotal;
    setRemainingAmount(remaining);
  }, [installmentDetails]);
  return (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <Text style={styles.projectName}>
          {capitalizeWords(project?.project_name)}
        </Text>
      </View>

      <View style={styles.dateProgressContainer}>
        <View style={styles.projectInfo}>
          <View style={styles.dateContainer}>
            <Image source={layerIcon} style={styles.calendarIconStyle} />
            <Text style={styles.projectDate}>{project.unit_no}</Text>
          </View>
          <View style={styles.dateContainer}>
            <Image source={calendarIcon} style={styles.calendarIconStyle} />
            <Text style={styles.projectDate}>
              {project.last_update_date
                ? formatDate(project?.last_update_date)
                : `N/A`}
            </Text>
          </View>
        </View>
        <CircularProgress
          progress={project.last_percentage || 0}
          color="#336699"
          size={50}
          strokeWidth={5}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() => onGenerateInvoice(project)}
        >
          <Text style={styles.generateButtonText}>Generate invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewPlanButton}
          onPress={() => onViewPlan(project)}
        >
          <Text style={styles.viewPlanText}>View installment plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const InstallmentDetailsScreen = ({ route, navigation }) => {
  useResetSearchOnFocus();
  const { client } = route.params;
  const clientId = client?.client_id;
  const { hasPermission } = usePermissions();
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [viewInvoiceModalVisible, setViewInvoiceModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const searchQuery = useSearchStore(state => state.searchQuery);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
  });
  // React Query calls
  const {
    data: clientProjects,
    isLoading: loadingProjects,
    refetch: refetchProjects,
  } = useClientProjects(clientId);

  const {
    data: inProgressData,
    isLoading: loadingInProgress,
    refetch: refetchInProgress,
  } = useInProgressClient(clientId);

  const refreshing = loadingProjects || loadingInProgress;

  const handleGenerateInvoice = project => {
    if (
      !hasPermission(
        MODULES.INSTALLMENT_MANAGEMENT,
        PERMISSIONS.INSTALLMENT_MANAGEMENT.CAN_GENERATE_INVOICE,
      )
    ) {
      alert("You don't have permission to generate invoices");
      return;
    }
    setSelectedProject(project);
    setGenerateModalVisible(true);
  };

  const handleViewPlan = project => {
    if (
      !hasPermission(
        MODULES.INSTALLMENT_MANAGEMENT,
        PERMISSIONS.INSTALLMENT_MANAGEMENT.CAN_VIEW_INSTALLMENT_DETAILS,
      )
    ) {
      alert("You don't have permission to view installment details");
      return;
    }
    navigation.navigate('InstallmentPlan', {
      projectId: project.inprogress_id,
      projectName: project.project_name,
      client: client,
    });
  };

  const handleInvoiceGenerated = invoiceData => {
    showToast(invoiceData.message);
    setGenerateModalVisible(false);
  };

  const handleRefresh = async () => {
    await Promise.all([refetchProjects(), refetchInProgress()]);
  };
  const projects = inProgressData?.units || [];

  const filteredProjects = projects.filter(project =>
    (project.project_name || '')
      .toLowerCase()
      .includes((searchQuery || '').toLowerCase().trim()),
  );
  const showToast = message => {
    setToast({ visible: true, message });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '' });
  };

  return (
    <View style={styles.container}>
      {/* <Header
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      /> */}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <Text style={styles.heading}>Installment Management</Text>

        {/* Client Info */}
        <View style={styles.clientInfoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Client Name:</Text>
            <Text style={styles.infoValue}>
              {capitalizeWords(clientProjects?.client_name)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{clientProjects?.client_email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone number:</Text>
            <Text style={styles.infoValue}>{clientProjects?.client_phone}</Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <SummaryCard
            icon={layerIcon}
            title="Total projects"
            value={inProgressData?.units?.length || '0'}
            backgroundColor="#EDF5FE"
            borderColor="#3083FF"
          />
          <SummaryCard
            icon={checkIcon}
            title="Total payments"
            value={formatCurrency(clientProjects?.total_amount || 0)}
            fullValue={clientProjects?.total_amount || 0}
            backgroundColor="#F0FEED"
            borderColor="#259800"
          />
          <SummaryCard
            icon={clockIcon}
            title="Remaining payments"
            value={formatCurrency(clientProjects?.total_remaining || 0)}
            fullValue={clientProjects?.total_remaining || 0}
            backgroundColor="#FEF9ED"
            borderColor="#FFC830"
          />
        </View>

        {/* Filtered Project Cards */}
        {filteredProjects.length > 0 ? (
          filteredProjects.map(project => (
            <ProjectCard
              key={project.unit_id}
              project={project}
              onGenerateInvoice={handleGenerateInvoice}
              onViewPlan={handleViewPlan}
              setRemainingAmount={setRemainingAmount}
            />
          ))
        ) : (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text
              style={{
                color: colors.secondary,
                fontFamily: 'Outfit-Medium',
              }}
            >
              {searchQuery
                ? 'No matching projects found'
                : 'No projects available'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <GenerateInvoiceModal
        visible={generateModalVisible}
        onClose={() => setGenerateModalVisible(false)}
        project={selectedProject}
        client={client}
        onGenerate={handleInvoiceGenerated}
        remainingAmount={remainingAmount}
      />

      <ViewInvoiceModal
        visible={viewInvoiceModalVisible}
        onClose={() => setViewInvoiceModalVisible(false)}
        invoice={selectedInvoice}
        client={client}
      />
      <Toast
        visible={toast.visible}
        message={toast.message}
        onHide={hideToast}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
        backgroundColor: colors.background,

  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
    marginVertical: 16,
  },
  clientInfoCard: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    width: 110,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: colors.defaultBlack,
    flex: 1,
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryCard: {
    height: 48,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconImage: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultBlack,
  },
  summaryTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  projectName: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
    textAlign: 'center',
  },
  dateProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIconStyle: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: colors.secondary,
  },
  projectDate: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
  buttonContainer: {
    gap: 12,
  },
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: colors.defaultWhite,
  },
  viewPlanButton: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewPlanText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultBlack,
  },
  tooltipStyle: {
  backgroundColor: '#ffffff',
  borderColor: '#D0D5DD',
  borderWidth: 1,
  borderRadius: 10,
  padding:2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 4, // Android shadow
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

export default InstallmentDetailsScreen;
