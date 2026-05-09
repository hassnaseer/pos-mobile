import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// import Header from '../../../../components/Header/Header';
import colors from '../../../../theme/colors';
import { formatCurrency } from '../../../../utils/formatCurrency';
import ViewInvoiceModal from '../../../../components/Modal/installmentManagement/ViewInvoiceModal';
import SendInvoiceConfirmModal from '../../../../components/Modal/installmentManagement/SendInvoiceConfirmModal';
import ConfirmDeleteModal from '../../../../components/Modal/ConfirmDeleteModal';
import Toast from '../../../../components/Toast/Toast';
import Tooltip from 'react-native-walkthrough-tooltip';
import {
  useInstallmentPlan,
  useUpdateInstallmentStatus,
  useDeleteInstallment,
  useSendInvoiceEmail,
} from '../../../../services/api/installmentApi';
import { formatDate } from '../../../../utils/formatDate';
import { usePermissions } from '../../../../hooks/usePermissions';
import { MODULES, PERMISSIONS } from '../../../../utils/permissions';

const icons = {
  dotsVertical: require('../../../../assets/icons/dots-vertical.png'),
  trash: require('../../../../assets/icons/trash-01.png'),
  send: require('../../../../assets/icons/file-02.png'),
  receipt: require('../../../../assets/icons/receipt-lines.png'),
  date: require('../../../../assets/icons/calendar-check.png'),
};
import layerIcon from '../../../../assets/icons/layers-three.png';
import checkIcon from '../../../../assets/icons/check-broken.png';
import clockIcon from '../../../../assets/icons/clock-01.png';

const InstallmentItem = ({
  installment,
  onViewInvoice,
  onStatusChange,
  onDelete,
  onSendInvoice,
  canViewInvoice,
  canDeleteInvoice,
  canSendInvoice,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const getStatusColor = status => {
    switch (status.toLowerCase()) {
      case 'paid':
        return '#F0FEED';
      case 'pending':
        return '#FEF9ED';
      case 'overdue':
        return '#FEEDED';
      default:
        return colors.secondary;
    }
  };
  const getStatusLabelColor = status => {
    switch (status.toLowerCase()) {
      case 'paid':
        return '#259800';
      case 'pending':
        return '#FFC830';
      case 'overdue':
        return '#DC2626';
      default:
        return colors.secondary;
    }
  };

  const getStatusLabel = status => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
      default:
        return status;
    }
  };

  const statusOptions = ['paid', 'pending'];
  const isPaid = installment.status?.toLowerCase() === 'paid';

  return (
    <View style={styles.installmentItem}>
      <View style={styles.installmentHeader}>
        <View style={styles.installmentInfo}>
          <Text style={styles.installmentTitle}>
            Installment no. {installment.id}
          </Text>

          <TouchableOpacity
            activeOpacity={isPaid ? 1 : 0.7}
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(installment.status) },
            ]}
            onPress={() =>
              !isPaid && setShowStatusDropdown(!showStatusDropdown)
            }
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusLabelColor(installment.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusLabelColor(installment.status) },
              ]}
            >
              {getStatusLabel(installment.status)}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Image source={icons.dotsVertical} style={styles.iconSmall} />
        </TouchableOpacity>
      </View>

      {showStatusDropdown && !isPaid && (
        <View style={styles.statusDropdown}>
          {statusOptions.map(status => (
            <TouchableOpacity
              key={status}
              style={styles.statusDropdownItem}
              onPress={() => {
                onStatusChange(installment, status);
                setShowStatusDropdown(false);
              }}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusLabelColor(status) },
                ]}
              />
              <Text
                style={[
                  styles.statusDropdownText,
                  { color: getStatusLabelColor(status) },
                ]}
              >
                {getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.installmentDetails}>
        <View style={styles.detailRow}>
          <Image source={icons.date} style={styles.iconSmall} />
          <Text style={styles.detailText}>{formatDate(installment.date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Image source={icons.receipt} style={styles.iconSmall} />

          <Text style={styles.detailText}>
            {installment.invoice_number ?? 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.payableAmountContainer}>
        <Text style={styles.payableLabel}>Payable amount</Text>
        <Text style={styles.payableAmount}>
          {formatCurrency(installment.price_on_invoice)} AED
        </Text>
      </View>

      {canViewInvoice && (
        <TouchableOpacity
          style={styles.viewInvoiceButton}
          onPress={() => onViewInvoice(installment)}
        >
          <Text style={styles.viewInvoiceText}>View invoice</Text>
        </TouchableOpacity>
      )}

      {showMenu && (
        <View style={styles.dropdownMenu}>
          {canSendInvoice && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onSendInvoice(installment);
              }}
            >
              <Image
                source={icons.send}
                style={[styles.iconTiny, { tintColor: colors.primary }]}
              />
              <Text style={[styles.menuItemText, { color: colors.primary }]}>
                Send Invoice
              </Text>
            </TouchableOpacity>
          )}
          {canDeleteInvoice && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onDelete(installment);
              }}
            >
              <Image
                source={icons.trash}
                style={[styles.iconTiny, { tintColor: colors.warning }]}
              />
              <Text style={[styles.menuItemText, { color: colors.warning }]}>
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const InstallmentPlanScreen = ({ route, navigation }) => {
  const { projectId, projectName, client } = route.params;
  const { hasPermission } = usePermissions();
  const [viewInvoiceModalVisible, setViewInvoiceModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSendInvoiceModal, setShowSendInvoiceModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
  });

  // ✅ Added Tooltip visibility states
  const [showTotalTip, setShowTotalTip] = useState(false);
  const [showRemainingTip, setShowRemainingTip] = useState(false);

  const {
    data: installmentDetails,
    isLoading: loadingInstallmentDetails,
    refetch: refetchInstallmentDetails,
  } = useInstallmentPlan(projectId);

  const updateStatusMutation = useUpdateInstallmentStatus();
  const deleteInstallmentMutation = useDeleteInstallment();
  const sendInvoiceEmailMutation = useSendInvoiceEmail();

  const refreshing = loadingInstallmentDetails;

  const canViewInvoice = hasPermission(
    MODULES.INSTALLMENT_MANAGEMENT,
    PERMISSIONS.INSTALLMENT_MANAGEMENT.CAN_VIEW_INVOICE,
  );
  const canDeleteInvoice = hasPermission(
    MODULES.INSTALLMENT_MANAGEMENT,
    PERMISSIONS.INSTALLMENT_MANAGEMENT.CAN_DELETE_INVOICE,
  );
  const canSendInvoice = hasPermission(
    MODULES.INSTALLMENT_MANAGEMENT,
    PERMISSIONS.INSTALLMENT_MANAGEMENT.CAN_SEND_INVOICE,
  );

  const handleViewInvoice = installment => {
    setSelectedInvoice({
      invoiceNumber: installment.invoice_number,
      invoiceDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      paymentPrice: installment.price_on_invoice,
      dueDate: installment.expires_at,
    });
    setViewInvoiceModalVisible(true);
  };

  const handleRefresh = async () => {
    await refetchInstallmentDetails();
  };

  const handleStatusChange = async (installment, newStatus) => {
    if (updateStatusMutation.isPending) return;

    try {
      await updateStatusMutation.mutateAsync({
        installmentId: installment.id,
        status: newStatus,
      });
      showToast(`Status updated to ${newStatus}`);
    } catch (error) {
      showToast('Failed to update status');
    }
  };

  const handleDeleteInstallment = installment => {
    setSelectedInstallment(installment);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteInstallmentMutation.isPending) return;

    try {
      await deleteInstallmentMutation.mutateAsync(selectedInstallment.id);
      showToast('Installment deleted successfully');
      setShowDeleteModal(false);
      setSelectedInstallment(null);
    } catch (error) {
      showToast('Failed to delete installment');
    }
  };

  const handleSendInvoice = installment => {
    setSelectedInstallment(installment);
    setShowSendInvoiceModal(true);
  };

  const confirmSendInvoice = async () => {
    if (sendInvoiceEmailMutation.isPending) return;

    try {
      await sendInvoiceEmailMutation.mutateAsync({
        installmentId: selectedInstallment.id,
        subject: 'Your Invoice from MAAK Dream',
        message:
          'Dear Client,\n\nPlease find attached your invoice.\n\nBest regards,\nMAAK Dream',
      });
      showToast('Invoice sent successfully');
      setShowSendInvoiceModal(false);
      setSelectedInstallment(null);
    } catch (error) {
      showToast('Failed to send invoice');
    }
  };

  const showToast = message => {
    setToast({ visible: true, message });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '' });
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.heading}>{projectName}</Text>

        {/* Payment Summary Cards */}
        <View style={styles.summaryContainer}>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: '#EDF5FE',
                borderColor: '#3083FF',
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.summaryContent}>
              <View style={styles.summaryIcon}>
                <Image source={layerIcon} style={styles.iconSmall} />
                <Text style={styles.summaryTitle}>Project No</Text>
              </View>
              <View style={styles.summaryTextContainer}>
                <Text style={styles.summaryValue}>
                  {installmentDetails?.unit_id}
                </Text>
              </View>
            </View>
          </View>

          {/* ✅ Tooltip added here */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: '#F0FEED',
                borderColor: '#259800',
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.summaryContent}>
              <View style={styles.summaryIcon}>
                <Image source={checkIcon} style={styles.iconSmall} />
                <Text style={styles.summaryTitle}>Total payments</Text>
              </View>
              <Tooltip
                isVisible={showTotalTip}
                content={
                  <View style={styles.tooltipContent}>
                    <Text style={styles.tooltipText}>
                      {installmentDetails?.total_amount}
                    </Text>
                  </View>
                }
                placement="top"
                backgroundColor="transparent"
                tooltipStyle={styles.tooltipStyle}
                onClose={() => setShowTotalTip(false)}
                disableShadow
                showChildInTooltip={false}
              >
                <TouchableOpacity onPress={() => setShowTotalTip(true)}>
                  <View style={styles.summaryTextContainer}>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(installmentDetails?.total_amount)}
                    </Text>
                    <Text style={styles.currency}>AED</Text>
                  </View>
                </TouchableOpacity>
              </Tooltip>
            </View>
          </View>

          {/*  Tooltip added here */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: '#FEF9ED',
                borderColor: '#FFC830',
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.summaryContent}>
              <View style={styles.summaryIcon}>
                <Image source={clockIcon} style={styles.iconSmall} />
                <Text style={styles.summaryTitle}>Remaining payments</Text>
              </View>
              <Tooltip
                isVisible={showRemainingTip}
                content={
                  <View style={styles.tooltipContent}>
                    <Text style={styles.tooltipText}>
                      {installmentDetails?.remaining_amount}
                    </Text>
                  </View>
                }
                placement="top"
                backgroundColor="transparent"
                tooltipStyle={styles.tooltipStyle}
                onClose={() => setShowRemainingTip(false)}
                disableShadow
                showChildInTooltip={false}
              >
                <TouchableOpacity onPress={() => setShowRemainingTip(true)}>
                  <View style={styles.summaryTextContainer}>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(installmentDetails?.remaining_amount)}
                    </Text>
                    <Text style={styles.currency}>AED</Text>
                  </View>
                </TouchableOpacity>
              </Tooltip>
            </View>
          </View>
        </View>

        {/* Installment List */}
        <View style={styles.installmentList}>
          {installmentDetails?.installments?.length > 0 ? (
            installmentDetails.installments.map(installment => (
              <InstallmentItem
                key={installment.id}
                installment={installment}
                onViewInvoice={handleViewInvoice}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteInstallment}
                onSendInvoice={handleSendInvoice}
                canViewInvoice={canViewInvoice}
                canDeleteInvoice={canDeleteInvoice}
                canSendInvoice={canSendInvoice}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No installments available</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* View Invoice Modal */}
      <ViewInvoiceModal
        visible={viewInvoiceModalVisible}
        onClose={() => setViewInvoiceModalVisible(false)}
        invoice={selectedInvoice}
        client={client}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        itemName={`Installment ${selectedInstallment?.id}`}
        title="Delete Installment"
      />

      {/* Send Invoice Confirmation Modal */}
      <SendInvoiceConfirmModal
        visible={showSendInvoiceModal}
        onClose={() => setShowSendInvoiceModal(false)}
        onConfirm={confirmSendInvoice}
        isPending={sendInvoiceEmailMutation.isPending}
        invoiceNumber={selectedInstallment?.invoice_number}
      />

      {/* Toast */}
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
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
    marginVertical: 16,
  },
  projectInfoContainer: {
    marginBottom: 16,
  },
  projectInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF5FE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#3083FF',
  },
  projectInfoText: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.primary,
  },
  projectInfoValue: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
    color: colors.primary,
  },
  summaryContainer: {
    // gap: 12,
    marginBottom: 4,
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
  installmentList: {
    gap: 16,
    paddingBottom: 20,
  },
  installmentItem: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAECF0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  installmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  installmentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  installmentTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
  },
  installmentDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
  payableAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  payableLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
  payableAmount: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  viewInvoiceButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewInvoiceText: {
    color: colors.defaultWhite,
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
  },
  menuButton: {
    padding: 4,
    marginLeft: 8,
  },
  iconSmall: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  iconTiny: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  statusDropdown: {
    position: 'absolute',
    top: 45,
    right: 45,
    width: 120,
    zIndex: 10,
    backgroundColor: colors.defaultWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  statusDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  statusDropdownText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 16,
    backgroundColor: colors.defaultWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  menuItemText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Outfit-Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
    marginTop: 12,
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
