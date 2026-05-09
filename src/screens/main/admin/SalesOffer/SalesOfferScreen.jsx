import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import notifee from '@notifee/react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Toast from '../../../../components/Toast/Toast';
import VerifyPaymentModal from '../../../../components/Modal/leadsManagement/VerifyPaymentModal';
import colors from '../../../../theme/colors';
import CreateClientModal from '../../../../components/Modal/salesOffer/CreateClientModal';
import GenerateOfferModal from '../../../../components/Modal/salesOffer/GenerateOfferModal';
import AssignProjectModal from '../../../../components/Modal/salesOffer/AssignProjectModal';
import ConfirmDeleteModal from '../../../../components/Modal/ConfirmDeleteModal';
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useSalesOffersClients,
  useSendSignRequestClient,
  useSendSalesOfferToClient,
  useAssignSalesOffer,
  useDeclineSalesOffer,
  useUpdateSalesOfferStatus,
  useDeleteOffer,
} from '../../../../services/api/adminApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useSearchStore } from '../../../../store/searchStore';

import {
  MODULES,
  PERMISSIONS,
  getErrorMessage,
} from '../../../../utils/permissions';
import SPATemplateModal from '../../../../components/Modal/leadsManagement/SPATemplateModal';
import { TextInput } from 'react-native-gesture-handler';
import { capitalizeWords } from '../../../../utils/stringUtils';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';

// Import custom icons
const icons = {
  dotsVertical: require('../../../../assets/icons/dots-vertical.png'),
  email: require('../../../../assets/icons/email.png'),
  trash: require('../../../../assets/icons/trash-01.png'),
  edit: require('../../../../assets/icons/edit-contained.png'),
  calendar: require('../../../../assets/icons/calendar-check.png'),
  cross: require('../../../../assets/icons/cross-icon.png'),
  pdf: require('../../../../assets/icons/filetype-Icon.png'),
  users: require('../../../../assets/icons/users-01.png'),
  user: require('../../../../assets/icons/user-icon.png'),
  phone: require('../../../../assets/icons/message-square.png'),
  home: require('../../../../assets/icons/home-line.png'),
  send: require('../../../../assets/icons/paperclip-01.png'),
  sendIcon: require('../../../../assets/icons/sendIcon.png'),
  settings: require('../../../../assets/icons/Component.png'),
  building: require('../../../../assets/icons/home-line.png'),
  close: require('../../../../assets/icons/trash-01.png'),
};

const ClientCard = ({ client, onEdit, onDelete, onSendOffer }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <View style={styles.clientCard}>
      <View style={styles.clientHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>
            {capitalizeWords(client?.full_name || client?.name)}
          </Text>
          {/* <View
            style={[
              styles.statusBadge,
              { backgroundColor: client.statusColor || '#4CAF50' },
            ]}
          >
            <Text style={styles.statusText}>{client?.status}</Text>
          </View> */}
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Image source={icons.dotsVertical} style={styles.iconSmall} />
        </TouchableOpacity>
      </View>

      <View style={styles.clientDetails}>
        <View style={styles.contactInfo}>
          <Image source={icons.email} style={styles.iconTiny} />
          <Text style={styles.contactText}>{client.email}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Image source={icons.phone} style={styles.iconTiny} />
          <Text style={styles.contactText}>
            {client.phone_number || client.phone}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Image source={icons.home} style={styles.iconTiny} />
          <Text style={styles.contactText}>
            {client.interested_in || client.interestedIn}
          </Text>
        </View>
      </View>

      {showMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onSendOffer(client);
            }}
          >
            <Image
              source={icons.sendIcon}
              style={[styles.iconTiny, { tintColor: colors.secondary }]}
            />
            <Text style={[styles.menuItemText, { color: colors.secondary }]}>
              Send offer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onEdit(client);
            }}
          >
            <Image
              source={icons.edit}
              style={[styles.iconTiny, { tintColor: colors.primary }]}
            />
            <Text style={[styles.menuItemText, { color: colors.primary }]}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onDelete(client);
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
        </View>
      )}
    </View>
  );
};

const SalesOfferCard = ({
  offer,
  onViewPDF,
  onSetProject,
  onDelete,
  onSendSPA,
  onStatusChange,
  setSelectedOffer,
  onPaymentVerify,
  onPaymentPercentageChange,
  onDownloadSPA,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const { canAccess } = usePermissions();
  const [localPaymentPercentage, setLocalPaymentPercentage] = useState(
    offer.advance_payment_percentage || '',
  );

  const canDeleteOffer = canAccess(
    MODULES.CLIENT_AND_SPA_MANAGEMENT,
    PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_DELETE_OFFER,
  );
  const canSendSPA = canAccess(
    MODULES.CLIENT_AND_SPA_MANAGEMENT,
    PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_SEND_SPA,
  );
  const canConvert = canAccess(
    MODULES.CLIENT_AND_SPA_MANAGEMENT,
    PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_CONVERT_TO_CLIENT,
  );
  //  const canViewOffer = canAccess(
  //    MODULES.CLIENT_AND_SPA_MANAGEMENT,
  //    PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_VIEW_OFFER,
  //  );
  const canUpdateStatus = canAccess(
    MODULES.CLIENT_AND_SPA_MANAGEMENT,
    PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_UPDATE_STATUS,
  );

  const statusOptions = [
    // { label: 'Sent', value: 'Sent' },
    { label: 'Accepted', value: 'Accepted' },
    { label: 'Declined', value: 'Declined' },
  ];

  const getStatusColor = status => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return '#F0FEED';
      case 'active':
        return '#4CAF50';
      case 'sent':
        return '#FEF9ED';
      case 'viewed':
        return '#FFC107';
      case 'declined':
        return '#FEEDED';
      default:
        return '#757575';
    }
  };
  const getLabelStatusColor = status => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return '#259800';
      case 'active':
        return '#4CAF50';
      case 'sent':
        return '#FFC830';
      case 'viewed':
        return '#FFC107';
      case 'declined':
        return '#DC2626';
      default:
        return '#757575';
    }
  };
  const getSPAStatusColor = spaStatus => {
    switch (spaStatus?.toLowerCase()) {
      case 'signed':
        return '#F0FEED';
      case 'sent':
        return '#EDF5FE';
      default:
        return '#FFC107';
    }
  };
  const getSPALabelColor = spaStatus => {
    switch (spaStatus?.toLowerCase()) {
      case 'signed':
        return '#259800';
      case 'sent':
        return '#3083FF';
      default:
        return '#FFC107';
    }
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.offerCard}>
      <View style={styles.offerMainRow}>
        <Text style={styles.offerClientName}>
          {capitalizeWords(offer.client_name || offer.lead_name || 'N/A')}
        </Text>
        <TouchableOpacity
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(offer.status) },
          ]}
          onPress={() => setShowStatusDropdown(!showStatusDropdown)}
        >
          <View
            style={[
              styles.typeDot,
              { backgroundColor: getLabelStatusColor(offer.status) },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: getLabelStatusColor(offer.status) },
            ]}
          >
            {offer.status || 'N/A'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Image source={icons.dotsVertical} style={styles.iconSmall} />
        </TouchableOpacity>
      </View>
      {showStatusDropdown && canUpdateStatus && (
        <View style={styles.statusDropdown}>
          {statusOptions.map(statusOption => (
            <TouchableOpacity
              key={statusOption.value}
              style={styles.statusDropdownItem}
              onPress={() => {
                onStatusChange(offer, statusOption.value);
                setShowStatusDropdown(false);
              }}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getLabelStatusColor(statusOption.value) },
                ]}
              />
              <Text
                style={[
                  styles.statusDropdownText,
                  { color: getLabelStatusColor(statusOption.label) },
                ]}
              >
                {statusOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.offerDetails}>
        <View style={styles.offerDateRow}>
          <Image
            source={icons.calendar}
            style={[styles.iconTiny, { tintColor: colors.secondary }]}
          />
          <Text style={styles.offerDate}>{formatDate(offer.expires_at)}</Text>
        </View>

        <TouchableOpacity
          style={styles.viewOfferButton}
          onPress={() => onViewPDF(offer)}
        >
          <Image source={icons.pdf} style={styles.iconTiny} />
          <Text style={styles.viewOfferText}>View PDF</Text>
        </TouchableOpacity>

        <Text style={styles.offerDate}>
          Payment Verified: {offer?.payment_verified ? 'Yes' : 'No'}
        </Text>
        {/* Payment Verification Section - Show when payment_verified is false */}
        {!offer.payment_verified &&
          offer.status?.toLowerCase() === 'accepted' &&
          !offer.spa_status && (
            <View style={styles.paymentVerificationSection}>
              <Text style={styles.sectionTitle}>Payment Verification</Text>
              <View style={styles.paymentInputRow}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.paymentInput}
                    placeholder="Payment %"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={String(localPaymentPercentage)}
                    onChangeText={text => {
                      // Only allow numbers
                      const numericValue = text.replace(/[^0-9]/g, '');
                      const value = Number(numericValue);
                      if (value <= 100) {
                        setLocalPaymentPercentage(numericValue);
                        onPaymentPercentageChange(offer.id, numericValue);
                      }
                    }}
                    editable={!offer.spa_status}
                  />
                  <Text style={styles.percentageSymbol}>%</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.verifyCheckbox,
                    !localPaymentPercentage || localPaymentPercentage <= 0
                      ? styles.verifyCheckboxDisabled
                      : {},
                  ]}
                  onPress={() => {
                    if (localPaymentPercentage && localPaymentPercentage > 0) {
                      onPaymentVerify(offer);
                    }
                  }}
                  disabled={
                    !localPaymentPercentage || localPaymentPercentage <= 0
                  }
                >
                  <Text style={styles.verifyCheckboxText}>Verify</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        {offer.spa_status && (
          <View style={styles.spaRow}>
            <Text style={styles.spaLabel}>SPA Status:</Text>
            <View
              style={[
                styles.spaStatusBadge,
                { backgroundColor: getSPAStatusColor(offer.spa_status) },
              ]}
            >
              <View
                style={[
                  styles.typeDot,
                  { backgroundColor: getSPALabelColor(offer.spa_status) },
                ]}
              />
              <Text
                style={[
                  styles.spaStatusText,
                  { color: getSPALabelColor(offer.spa_status) },
                ]}
              >
                {offer.spa_status || 'N/A'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {showMenu &&
        offer?.status?.toLowerCase() === 'accepted' &&
        offer?.payment_verified &&
        offer?.spa_status !== 'sent' &&
        offer?.spa_status !== 'signed' && (
          <View style={styles.dropdownMenu}>
            {/* Send SPA (after accepted + payment verified) */}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onSendSPA(offer);
              }}
            >
              <Image
                source={icons.send}
                style={[styles.iconTiny, { tintColor: colors.primary }]}
              />
              <Text style={[styles.menuItemText, { color: colors.primary }]}>
                Send SPA
              </Text>
            </TouchableOpacity>

            {/* Assign Project (after signed SPA) */}
            {offer?.spa_status?.toLowerCase() === 'signed' && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onSetProject(offer);
                  setSelectedOffer(offer);
                }}
              >
                <Image
                  source={icons.settings}
                  style={[styles.iconTiny, { tintColor: colors.primary }]}
                />
                <Text style={[styles.menuItemText, { color: colors.primary }]}>
                  Assign Project
                </Text>
              </TouchableOpacity>
            )}

            {/* NEW: Download SPA option */}
            {offer?.spa_status?.toLowerCase() === 'signed' &&
              canAccess(
                MODULES.CLIENT_AND_SPA_MANAGEMENT,
                PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_DOWNLOAD_SPA,
              ) && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    onDownloadSPA?.(offer);
                  }}
                >
                  <Image
                    source={icons.pdf}
                    style={[styles.iconTiny, { tintColor: colors.primary }]}
                  />
                  <Text
                    style={[styles.menuItemText, { color: colors.primary }]}
                  >
                    Download SPA
                  </Text>
                </TouchableOpacity>
              )}

            {/* Convert to Client (optional if needed) */}
            {offer?.spa_status?.toLowerCase() === 'signed' && canConvert && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onConvertToClient?.(offer);
                }}
              >
                <Image
                  source={icons.users}
                  style={[styles.iconTiny, { tintColor: colors.primary }]}
                />
                <Text style={[styles.menuItemText, { color: colors.primary }]}>
                  Convert to Client
                </Text>
              </TouchableOpacity>
            )}

            {/* Delete (only when declined) */}
            {canDeleteOffer && offer?.status === 'Declined' && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onDelete(offer);
                }}
              >
                <Image
                  source={icons.close}
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

const SalesOfferScreen = ({ navigation }) => {
  useResetSearchOnFocus();
  const [activeTab, setActiveTab] = useState('clients');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateOfferModal, setShowGenerateOfferModal] = useState(false);
  const [showAssignProjectModal, setShowAssignProjectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSPATemplateModal, setShowSPATemplateModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showVerifyPaymentModal, setShowVerifyPaymentModal] = useState(false);
  const [verifyingOffer, setVerifyingOffer] = useState(null);
  const searchQuery = useSearchStore(state => state.searchQuery);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success',
  });

  const { canAccess, hasPermission } = usePermissions();

  // Permission checks
  const canViewClients = canAccess(MODULES.CLIENT_AND_SPA_MANAGEMENT);
  const canViewOffers = canAccess(
    MODULES.CLIENT_AND_SPA_MANAGEMENT,
    PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_VIEW_SALES_OFFER,
  );

  const {
    data: clients,
    isLoading: clientsLoading,
    error: clientsError,
    refetch: refetchClients,
  } = useClients({ enabled: canViewClients });
  const {
    data: salesOffers,
    isLoading: offersLoading,
    error: offersError,
    refetch: refetchOffers,
  } = useSalesOffersClients({ enabled: canViewOffers });

  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
  const assignOfferMutation = useAssignSalesOffer();
  const declineOfferMutation = useDeclineSalesOffer();
  const sendSPAMutation = useSendSignRequestClient();
  const sendOfferMutation = useSendSalesOfferToClient();
  const updateStatusMutation = useUpdateSalesOfferStatus();

  const deleteOfferMutation = useDeleteOffer();

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'clients') {
      await refetchClients();
    } else {
      await refetchOffers();
    }
    setRefreshing(false);
  };

  const handleCreateClient = () => {
    if (
      !hasPermission(
        MODULES.CLIENT_AND_SPA_MANAGEMENT,
        PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_CREATE_CLIENT,
      )
    ) {
      showToast("You don't have permission to create clients", 'error');
      return;
    }
    setEditMode(false);
    setSelectedItem(null);
    setShowCreateModal(true);
  };

  const handleEditClient = client => {
    if (
      !hasPermission(
        MODULES.CLIENT_AND_SPA_MANAGEMENT,
        PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_EDIT_CLIENT,
      )
    ) {
      showToast("You don't have permission to edit clients", 'error');
      return;
    }
    setEditMode(true);
    setSelectedItem(client);
    setShowCreateModal(true);
  };

  const handleDeleteClient = client => {
    if (
      !hasPermission(
        MODULES.CLIENT_AND_SPA_MANAGEMENT,
        PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_DELETE_CLIENT,
      )
    ) {
      showToast("You don't have permission to delete clients", 'error');
      return;
    }
    setSelectedItem(client);
    setShowDeleteModal(true);
  };

  const handleClientSubmit = async formData => {
    if (createClientMutation.isPending || updateClientMutation.isPending)
      return;

    try {
      if (editMode) {
        await updateClientMutation.mutateAsync({
          id: selectedItem.id,
          data: {
            ...formData,
            password: '1234567890',
            unit_id: 0,
          },
        });
        showToast('Client updated successfully', 'success');
      } else {
        await createClientMutation.mutateAsync(formData);
        showToast('Client created successfully', 'success');
      }
      setShowCreateModal(false);
      setSelectedItem(null);
      refetchClients();
    } catch (error) {
      showToast(getErrorMessage(error, 'Operation failed'), 'error');
    }
  };

  const handleSendOffer = client => {
    if (
      !hasPermission(
        MODULES.CLIENT_AND_SPA_MANAGEMENT,
        PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_SEND_OFFER,
      )
    ) {
      showToast("You don't have permission to send offers", 'error');
      return;
    }
    setSelectedItem(client);
    setShowGenerateOfferModal(true);
  };

  const handleSubmitOffer = async formData => {
    if (sendOfferMutation.isPending) return;

    try {
      const payload = {
        client_id: selectedItem.id,
        unit_id: parseInt(formData.unit),
        subject: 'Your Sales Offer',
        message:
          'Dear Client,\n\nPlease find attached your sales offer.\n\nBest regards,\nMAAK Dream',
        status: 'Sent',
      };
      await sendOfferMutation.mutateAsync(payload);
      showToast('Sales offer sent successfully', 'success');
      setShowGenerateOfferModal(false);
      setSelectedItem(null);
      refetchOffers();
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to send offer'), 'error');
    }
  };

  const handleSetProject = offer => {
    if (
      !hasPermission(
        MODULES.CLIENT_AND_SPA_MANAGEMENT,
        PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_ASSIGN_PROJECT,
      )
    ) {
      showToast("You don't have permission to assign projects", 'error');
      return;
    }
    setSelectedItem(offer);
    setShowAssignProjectModal(true);
  };

  const handleSubmitAssignProject = async formData => {
    if (assignOfferMutation.isPending) return;

    try {
      if (formData.password !== formData.confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }

      await assignOfferMutation.mutateAsync({
        offerId: selectedItem.id,
        password: formData.password,
      });
      showToast('Project assigned successfully', 'success');
      setShowAssignProjectModal(false);
      setSelectedItem(null);
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to assign project'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (deleteOfferMutation.isPending || deleteClientMutation.isPending) return;

    try {
      if (activeTab === 'offers') {
        // Delete sales offer
        await deleteOfferMutation.mutateAsync(selectedItem.id);
        await refetchOffers();
        showToast('Sales offer deleted successfully', 'success');
      } else {
        // Delete client
        await deleteClientMutation.mutateAsync(selectedItem.id);
        setShowDeleteModal(false);
        setSelectedItem(null);
        showToast('Client deleted successfully', 'success');
      }

      setShowDeleteModal(false);
      setSelectedOffer(null);
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to delete client'), 'error');
    }
  };

  const handleViewPDF = offer => {
    if (
      !hasPermission(
        MODULES.CLIENT_AND_SPA_MANAGEMENT,
        PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_VIEW_OFFER_PDF,
      )
    ) {
      showToast("You don't have permission to view offer PDFs", 'error');
      return;
    }

    if (offer.sales_offer_pdf) {
      // Use React Native Linking to open the PDF URL
      const { Linking } = require('react-native');
      Linking.openURL(offer.sales_offer_pdf).catch(err => {
        console.error('Error opening PDF:', err);
        showToast('Failed to open PDF', 'error');
      });
    } else {
      showToast('No PDF available', 'error');
    }
  };

  const handleDeleteOffer = offer => {
    if (
      !hasPermission(
        MODULES.CLIENT_AND_SPA_MANAGEMENT,
        PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_DELETE_OFFER,
      )
    ) {
      showToast("You don't have permission to delete offers", 'error');
      return;
    }
    setSelectedItem(offer);
    setShowDeleteModal(true);
  };

  const handleSendSPA = async offer => {
    if (
      !hasPermission(
        MODULES.CLIENT_AND_SPA_MANAGEMENT,
        PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_SEND_SPA,
      )
    ) {
      showToast("You don't have permission to send SPA", 'error');
      return;
    }

    setSelectedOffer(offer);
    setShowSPATemplateModal(true);
  };
  const handlePaymentPercentageChange = async (offerId, percentage) => {
    if (updateStatusMutation.isPending) return;

    try {
      await updateStatusMutation.mutateAsync({
        offerId: offerId,
        advance_payment_percentage: Number(percentage),
      });
      refetchOffers();
    } catch (error) {
      showToast(
        getErrorMessage(error, 'Failed to update payment percentage'),
        'error',
      );
    }
  };
  const handlePaymentVerify = offer => {
    setVerifyingOffer(offer);
    setShowVerifyPaymentModal(true);
  };

  const handleConfirmPaymentVerify = async () => {
    if (updateStatusMutation.isPending) return;

    try {
      await updateStatusMutation.mutateAsync({
        offerId: verifyingOffer.id,
        payment_verified: true,
      });
      showToast('Payment verified successfully', 'success');
      setShowVerifyPaymentModal(false);
      setVerifyingOffer(null);
      refetchOffers();
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to verify payment'), 'error');
    }
  };
  const handleSubmitSPA = async formData => {
    if (sendSPAMutation.isPending) return;

    try {
      await sendSPAMutation.mutateAsync(formData);
      showToast('SPA sent successfully', 'success');
      setShowSPATemplateModal(false);
      setSelectedOffer(null);
      refetchOffers();
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to send SPA'), 'error');
    }
  };
  //download spa
  const handleDownloadSPA = async offer => {
    try {
      const signId = offer.sign_id || offer.id;
      const url = `https://your-api-url/odoo/download-signed-document/${signId}`;
      const { fs, config } = ReactNativeBlobUtil;
      const path = `${fs.dirs.DownloadDir}/SPA_${signId}.pdf`;

      // Create notification channel (already done globally, but safe here)
      const channelId = await notifee.createChannel({
        id: 'downloads',
        name: 'Downloads',
      });

      // Initial notification
      const notificationId = await notifee.displayNotification({
        title: 'Downloading SPA...',
        body: '0%',
        android: {
          channelId,
          progress: { max: 100, current: 0, indeterminate: false },
          onlyAlertOnce: true,
          ongoing: true,
          smallIcon: 'ic_launcher', // your app icon
        },
      });

      let lastProgress = 0;

      // Start file download with progress tracking
      await config({ path })
        .fetch('GET', url)
        .progress(async (received, total) => {
          const progress = Math.floor((received / total) * 100);
          if (progress - lastProgress >= 3) {
            lastProgress = progress;
            await notifee.displayNotification({
              id: notificationId,
              title: 'Downloading SPA...',
              body: `${progress}% completed`,
              android: {
                channelId,
                progress: { max: 100, current: progress, indeterminate: false },
                onlyAlertOnce: true,
                ongoing: true,
                smallIcon: 'ic_launcher',
              },
            });
          }
        });

      // When download completes
      await notifee.displayNotification({
        id: notificationId,
        title: 'Download complete',
        body: 'Tap to open SPA',
        android: {
          channelId,
          progress: { max: 100, current: 100, indeterminate: false },
          onlyAlertOnce: true,
          ongoing: false,
          smallIcon: 'ic_launcher',
          pressAction: {
            id: 'open_spa',
          },
        },
      });

      // Open the file automatically (optional)
      RNFetchBlob.android.actionViewIntent(path, 'application/pdf');
    } catch (error) {
      console.error('Error downloading SPA:', error);
      await notifee.displayNotification({
        title: 'Download failed',
        body: 'An error occurred while downloading the SPA file.',
        android: { channelId: 'downloads', smallIcon: 'ic_launcher' },
      });
    }
  };

  const showToast = (message, type) => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'success' });
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };
  const handleStatusChange = async (offer, newStatus) => {
    if (
      !canAccess(
        MODULES.CLIENT_AND_SPA_MANAGEMENT,
        PERMISSIONS.CLIENT_AND_SPA_MANAGEMENT.CAN_UPDATE_STATUS,
      )
    ) {
      showToast("You don't have permission to update status", 'error');
      return;
    }

    if (updateStatusMutation.isPending) return; // Prevent multiple API calls

    try {
      await updateStatusMutation.mutateAsync({
        offerId: offer.id,
        status: newStatus,
      });
      showToast('Status updated successfully', 'success');
      refetchOffers();
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to update status'), 'error');
    }
  };

  const isLoading = activeTab === 'clients' ? clientsLoading : offersLoading;
  const error = activeTab === 'clients' ? clientsError : offersError;
  const data = activeTab === 'clients' ? clients : salesOffers;
  // Lowercase search text
  const q = searchQuery.toLowerCase();

  // Filter clients
  const filteredClients =
    clients?.filter(
      client =>
        (client.full_name || client.name || '').toLowerCase().includes(q) ||
        (client.email || '').toLowerCase().includes(q) ||
        (client.phone_number || client.phone || '').toLowerCase().includes(q) ||
        (client.interested_in || client.interestedIn || '')
          .toLowerCase()
          .includes(q),
    ) || [];

  // Filter offers
  const filteredOffers =
    salesOffers?.filter(
      offer =>
        (offer.client_name || offer.lead_name || '')
          .toLowerCase()
          .includes(q) ||
        (offer.status || '').toLowerCase().includes(q) ||
        (offer.spa_status || '').toLowerCase().includes(q),
    ) || [];

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {/* <Header
          title="Sales Offer"
          onMenuPress={() => navigation.openDrawer()}
          onNotificationPress={handleNotificationPress}
        /> */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {/* <Header
          title="Sales Offer"
          onMenuPress={() => navigation.openDrawer()}
          onNotificationPress={handleNotificationPress}
        /> */}
        <View style={styles.errorContainer}>
          {/* <Icon name="error-outline" size={48} color={colors.warning} /> */}
          <Text style={styles.errorText}>Failed to load data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Header */}
      <View style={styles.headerWrapper}>
        <Text style={styles.pageTitle}>Client & SPA Management</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'clients' && styles.activeTab]}
            onPress={() => setActiveTab('clients')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'clients' && styles.activeTabText,
              ]}
            >
              Clients
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
            onPress={() => setActiveTab('offers')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'offers' && styles.activeTabText,
              ]}
            >
              Sales offer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createClientButton}
            onPress={handleCreateClient}
          >
            <Text style={styles.createClientButtonText}>Create a client</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* ScrollView  */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {activeTab === 'clients' ? (
            !canViewClients ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.noAccessTitle}>Access Denied</Text>
                <Text style={styles.noAccessText}>
                  You don't have permission to view clients.
                </Text>
              </View>
            ) : filteredClients.length > 0 ? (
              filteredClients.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onEdit={handleEditClient}
                  onDelete={handleDeleteClient}
                  onSendOffer={handleSendOffer}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? 'No matching clients found'
                    : 'No clients available'}
                </Text>
              </View>
            )
          ) : !canViewOffers ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.noAccessTitle}>Access Denied</Text>
              <Text style={styles.noAccessText}>
                You don't have permission to view sales offers.
              </Text>
            </View>
          ) : filteredOffers.length > 0 ? (
            filteredOffers.map(offer => (
              <SalesOfferCard
                key={offer.id}
                offer={offer}
                onViewPDF={handleViewPDF}
                onSetProject={handleSetProject}
                onDelete={handleDeleteOffer}
                onSendSPA={handleSendSPA}
                onStatusChange={handleStatusChange}
                onPaymentVerify={handlePaymentVerify}
                onPaymentPercentageChange={handlePaymentPercentageChange}
                setSelectedOffer={setSelectedOffer}
                onDownloadSPA={handleDownloadSPA}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No matching offers found'
                  : 'No sales offers available'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <CreateClientModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleClientSubmit}
        editData={selectedItem}
        isEditing={editMode}
      />

      <GenerateOfferModal
        visible={showGenerateOfferModal}
        onClose={() => setShowGenerateOfferModal(false)}
        onSubmit={handleSubmitOffer}
        isPending={sendOfferMutation.isPending}
      />

      <AssignProjectModal
        visible={showAssignProjectModal}
        onClose={() => setShowAssignProjectModal(false)}
        projectName={selectedOffer?.project_name || ''}
        onSubmit={handleSubmitAssignProject}
      />

      <ConfirmDeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        itemName={selectedItem?.full_name || selectedItem?.name}
        title={activeTab === 'clients' ? 'Delete Client' : 'Decline Offer'}
      />

      <SPATemplateModal
        visible={showSPATemplateModal}
        onClose={() => {
          setShowSPATemplateModal(false);
          setSelectedOffer(null);
        }}
        onSubmit={handleSubmitSPA}
        offerData={selectedOffer}
      />

      <VerifyPaymentModal
        visible={showVerifyPaymentModal}
        onClose={() => {
          setShowVerifyPaymentModal(false);
          setVerifyingOffer(null);
        }}
        onConfirm={handleConfirmPaymentVerify}
        paymentPercentage={verifyingOffer?.advance_payment_percentage || 0}
        isPending={updateStatusMutation.isPending}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: colors.background,
  },
  pageTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 24,
    color: colors.defaultBlack,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,

    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    // marginRight: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    // borderWidth:1,
    elevation: 4,
    // marginRight: 8,
  },
  tabText: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: 'Outfit-Medium',
  },
  activeTabText: {
    color: colors.text,
    fontFamily: 'Outfit-Medium',
  },
  createClientButton: {
    backgroundColor: colors.defaultBlack,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  createClientButtonText: {
    color: colors.defaultWhite,
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.warning,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  statusDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 150,
    zIndex: 999,
    backgroundColor: colors.defaultWhite,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginTop: 8,
    marginBottom: 8,
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDropdownText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Outfit-Medium',
  },
  // Client Card
  clientCard: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // position: 'relative',
  },
  clientHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clientInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientName: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    // marginRight: 8,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: colors.defaultWhite,
    marginRight: 4,
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
  statusText: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    // marginRight: 8,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: colors.defaultWhite,
    marginRight: 4,
  },
  iconSmall: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  statusText: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
  },
  menuButton: {
    // marginVertical: 10,
    // marginLeft: 8,
  },
  clientDetails: {
    gap: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Outfit-Regular',
  },
  messageButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  messageButtonText: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  offerCard: {
    // position: 'relative',
    zIndex: 1,
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerMainRow: {
    // position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 10,
  },
  offerClientName: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.defaultWhite,
    marginRight: 4,
  },
  spaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  spaLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
    marginRight: 4,
  },
  spaStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spaStatusText: {
    color: colors.defaultWhite,
    fontSize: 11,
    fontFamily: 'Outfit-Medium',
  },
  offerDetails: {
    gap: 8,
  },
  offerDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerDate: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
  },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  viewOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    gap: 4,
    alignSelf: 'flex-start',
  },
  viewOfferText: {
    color: colors.secondary,
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
  offerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offerStatusText: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
  },
  spaStatusContainer: {
    backgroundColor: '#E8F5E8',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  spaStatusText: {
    fontSize: 12,
    color: '#2E7D32',
    fontFamily: 'Outfit-Medium',
  },
  dropdownMenu: {
    position: 'absolute',
    zIndex: 10,
    top: 35,
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
    paddingHorizontal: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: colors.secondary,
    marginTop: 12,
    textAlign: 'center',
  },
  noAccessTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  noAccessText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  noAccessSubtext: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  clientModalContainer: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
  },
  modalContent: {
    maxHeight: 400,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: colors.warning,
  },
  errorText: {
    color: colors.warning,
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioText: {
    fontSize: 14,
    color: colors.text,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalContainer: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    width: '90%',
    maxWidth: 350,
    padding: 24,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.warning,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },

  paymentVerificationSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: colors.text,
    marginBottom: 8,
  },
  paymentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
  },
  paymentInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
  },
  percentageSymbol: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    color: colors.secondary,
    marginLeft: 4,
  },
  verifyCheckbox: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  verifyCheckboxDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  verifyCheckboxText: {
    color: colors.defaultWhite,
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
});

export default SalesOfferScreen;
