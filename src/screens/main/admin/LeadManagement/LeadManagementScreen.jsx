import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Toast from '../../../../components/Toast/Toast';
import { BASE_URL } from '../../../../services/api/globalApi'; // your API URL
import colors from '../../../../theme/colors';
import { capitalizeWords } from '../../../../utils/stringUtils';
import {
  useAllLeads,
  useDeleteLeadNew,
  useDeleteOffer,
  useConvertLeadToClient,
  useSendSalesOffer,
  useSalesOffersAll,
  useSendSignRequestLead,
  useUpdateSalesOfferStatus,
  useSalesOffersLeads,
  useDownloadSPA,
} from '../../../../services/api/adminApi';
import SendOfferModal from '../../../../components/Modal/leadsManagement/SendOfferModal';
import ConvertToClientModal from '../../../../components/Modal/leadsManagement/ConvertToClientModal';
import ConfirmDeleteModal from '../../../../components/Modal/ConfirmDeleteModal';
import SPATemplateModal from '../../../../components/Modal/leadsManagement/SPATemplateModal';
import VerifyPaymentModal from '../../../../components/Modal/leadsManagement/VerifyPaymentModal';
import { usePermissions } from '../../../../hooks/usePermissions';
import {
  MODULES,
  PERMISSIONS,
  getErrorMessage,
} from '../../../../utils/permissions';
import { useSearchStore } from '../../../../store/searchStore';
import { useResetSearchOnFocus } from '../../../../utils/resetSearch';
// Import custom icons
const icons = {
  dotsVertical: require('../../../../assets/icons/dots-vertical.png'),
  email: require('../../../../assets/icons/email.png'),
  phone: require('../../../../assets/icons/Component.png'),
  home: require('../../../../assets/icons/home-line.png'),
  message: require('../../../../assets/icons/message-square.png'),
  pdf: require('../../../../assets/icons/filetype-Icon.png'),
  send: require('../../../../assets/icons/file-02.png'),
  sendIcon: require('../../../../assets/icons/sendIcon.png'),
  user: require('../../../../assets/icons/users-01.png'),
  trash: require('../../../../assets/icons/trash-01.png'),
  filter: require('../../../../assets/icons/filter.png'),
  cross: require('../../../../assets/icons/cross-icon.png'),
  calendar: require('../../../../assets/icons/calendar-check.png'),
};

const FilterDropdown = ({ visible, onClose, onApplyFilter, currentFilter }) => {
  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Website leads', value: 'website' },
    { label: 'Social media leads', value: 'social_media' },
  ];

  if (!visible) return null;

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.dropdownOverlay}
      onPress={onClose}
    >
      <View style={styles.filterDropdown}>
        {filterOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterDropdownItem,
              currentFilter === option.value && styles.filterDropdownItemActive,
            ]}
            onPress={() => {
              onApplyFilter(option.value);
              onClose();
            }}
          >
            <Text
              style={[
                styles.filterDropdownText,
                currentFilter === option.value &&
                  styles.filterDropdownTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const SalesOfferCard = ({
  offer,
  onDelete,
  onSendSPA,
  onViewPDF,
  onConvert,
  onStatusChange,
  onPaymentVerify,
  onPaymentPercentageChange,
  onDownloadSPA,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [localPaymentPercentage, setLocalPaymentPercentage] = useState(
    offer.advance_payment_percentage || '',
  );

  const { canAccess } = usePermissions();

  const canDeleteOffer = canAccess(
    MODULES.LEAD_MANAGEMENT,
    PERMISSIONS.LEAD_MANAGEMENT.CAN_DELETE_OFFER,
  );
  const canSendSPA = canAccess(
    MODULES.LEAD_MANAGEMENT,
    PERMISSIONS.LEAD_MANAGEMENT.CAN_SEND_SPA,
  );
  const canConvert = canAccess(
    MODULES.LEAD_MANAGEMENT,
    PERMISSIONS.LEAD_MANAGEMENT.CAN_CONVERT_TO_CLIENT,
  );
  const canViewOffer = canAccess(
    MODULES.LEAD_MANAGEMENT,
    PERMISSIONS.LEAD_MANAGEMENT.CAN_VIEW_OFFER,
  );
  const canUpdateStatus = canAccess(
    MODULES.LEAD_MANAGEMENT,
    PERMISSIONS.LEAD_MANAGEMENT.CAN_UPDATE_STATUS,
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
        return '#D3D3D3';
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
        return '#808080';
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
  const isSPAEnabled =
    offer.status?.toLowerCase() === 'accepted' &&
    offer.advance_payment_percentage > 0 &&
    offer.payment_verified;
  const hasVisibleOptions =
    (canConvert &&
      offer.status?.toLowerCase() === 'accepted' &&
      offer.spa_status?.toLowerCase() === 'signed') ||
    offer?.status === 'Declined';
  return (
    <View style={styles.leadCard}>
      <View style={styles.leadHeader}>
        <Text style={styles.leadName}>
          {capitalizeWords(offer.client_name || offer.lead_name || 'N/A')}
        </Text>
        {canUpdateStatus ? (
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
        ) : (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(offer.status) },
            ]}
          >
            <View
              style={[
                styles.typeDot,
                { backgroundColor: getLabelStatusColor(offer.status) },
              ]}
            />

            {/* Colored text */}
            <Text
              style={[
                styles.statusText,
                { color: getLabelStatusColor(offer.status) },
              ]}
            >
              {offer.status || 'N/A'}
            </Text>
          </View>
        )}
        {(canDeleteOffer || canConvert) && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Image source={icons.dotsVertical} style={styles.iconSmall} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Dropdown */}
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
                  { color: getLabelStatusColor(statusOption.value) },
                ]}
              >
                {statusOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.leadDetails}>
        <View style={styles.contactInfo}>
          <Image
            source={icons.calendar}
            style={[styles.iconTiny, { tintColor: colors.secondary }]}
          />
          <Text style={styles.contactText}>{formatDate(offer.expires_at)}</Text>
        </View>

        {canViewOffer && (
          <TouchableOpacity
            style={styles.viewPdfButton}
            onPress={() => onViewPDF(offer)}
            activeOpacity={0.7}
          >
            <Image source={icons.pdf} style={styles.iconTiny} />
            <Text style={styles.viewPdfText}>View offer</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.offerDate}>
          Payment Verified: {offer?.payment_verified ? 'Yes' : 'No'}
        </Text>

        {offer.spa_status && (
          <View style={styles.spaStatusRow}>
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

      {/* Send SPA Button - Only show when payment_verified is true */}
      {canSendSPA && !offer.spa_status && (
        <TouchableOpacity
          style={[
            styles.sendSPAButton,
            !isSPAEnabled && styles.sendSPAButtonDisabled,
          ]}
          onPress={() => isSPAEnabled && onSendSPA(offer)}
          activeOpacity={isSPAEnabled ? 0.7 : 1}
          disabled={!isSPAEnabled}
        >
          <Text
            style={[
              styles.sendSPAButtonText,
              !isSPAEnabled && styles.sendSPAButtonTextDisabled,
            ]}
          >
            Send SPA
          </Text>
        </TouchableOpacity>
      )}

      {showMenu && (
        <View
          style={[
            styles.dropdownMenu,
            hasVisibleOptions && { borderWidth: 1, elevation: 5 },
          ]}
        >
          {canConvert &&
            offer.status?.toLowerCase() === 'accepted' &&
            offer.spa_status?.toLowerCase() === 'signed' && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    onConvert(offer);
                  }}
                >
                  <Image
                    source={icons.user}
                    style={[styles.iconTiny, { tintColor: colors.primary }]}
                  />
                  <Text
                    style={[styles.menuItemText, { color: colors.primary }]}
                  >
                    Convert to client
                  </Text>
                </TouchableOpacity>

                {canAccess(
                  MODULES.LEAD_MANAGEMENT,
                  PERMISSIONS.LEAD_MANAGEMENT.CAN_DOWNLOAD_SPA,
                ) && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMenu(false);
                      onDownloadSPA?.(offer);
                    }}
                  >
                    <Image source={icons.pdf} style={styles.iconTiny} />
                    <Text style={styles.menuItemText}>Download SPA</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

          {offer?.status === 'Declined' && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (
                  !canAccess(
                    MODULES.LEAD_MANAGEMENT,
                    PERMISSIONS.LEAD_MANAGEMENT.CAN_DELETE_OFFER,
                  )
                ) {
                  showToast(
                    "You don't have permission to delete offers",
                    'error',
                  );
                  return;
                }
                setShowMenu(false);
                onDelete(offer);
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

const LeadCard = ({ lead, onDelete, onSendOffer }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const { canAccess } = usePermissions();

  const canDeleteLead = canAccess(
    MODULES.LEAD_MANAGEMENT,
    PERMISSIONS.LEAD_MANAGEMENT.CAN_DELETE_LEAD,
  );
  const canSendOffer = canAccess(
    MODULES.LEAD_MANAGEMENT,
    PERMISSIONS.LEAD_MANAGEMENT.CAN_SEND_OFFER,
  );

  const getLeadTypeBadgeBgColor = leadType => {
    switch (leadType?.toLowerCase()) {
      case 'social_media':
        return '#EDF5FE'; // Light blue
      case 'website':
        return '#F0FEED'; // Light green
      default:
        return '#F5F5F5'; // Light gray
    }
  };

  const getLeadTypeBadgeTextColor = leadType => {
    switch (leadType?.toLowerCase()) {
      case 'social_media':
        return '#3083FF'; // Dark blue
      case 'website':
        return '#259800'; // Dark green
      default:
        return '#616161'; // Dark gray
    }
  };

  const getLeadTypeText = leadType => {
    switch (leadType?.toLowerCase()) {
      case 'social_media':
        return 'Social media lead';
      case 'website':
        return 'Website lead';
      default:
        return leadType || 'Lead';
    }
  };

  return (
    <View style={styles.leadCard}>
      <View style={styles.leadHeader}>
        <Text style={styles.leadName}>{capitalizeWords(lead.full_name)}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getLeadTypeBadgeBgColor(lead.lead_type) },
          ]}
        >
          <View
            style={[
              styles.typeDot,
              { backgroundColor: getLeadTypeBadgeTextColor(lead.lead_type) },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: getLeadTypeBadgeTextColor(lead.lead_type) },
            ]}
          >
            {getLeadTypeText(lead.lead_type)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Image source={icons.dotsVertical} style={styles.iconSmall} />
        </TouchableOpacity>
      </View>

      <View style={styles.leadDetails}>
        <View style={styles.contactInfo}>
          <Image
            source={icons.email}
            style={[styles.iconTiny, { tintColor: colors.secondary }]}
          />
          <Text style={styles.contactText}>{lead.email}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Image
            source={icons.phone}
            style={[styles.iconTiny, { tintColor: colors.secondary }]}
          />
          <Text style={styles.contactText}>{lead.phone_number}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Image
            source={icons.home}
            style={[styles.iconTiny, { tintColor: colors.secondary }]}
          />
          <Text style={styles.contactText}>{lead.interested_in}</Text>
        </View>
        {lead.additional_message && (
          <View>
            <TouchableOpacity
              style={styles.contactInfo}
              activeOpacity={0.7}
              onPress={() => setShowMessage(!showMessage)}
            >
              <Image
                source={icons.message}
                style={[styles.iconTiny, { tintColor: colors.secondary }]}
              />
              <Text style={styles.viewMessageText}>
                {showMessage
                  ? 'Hide additional message'
                  : 'View additional message'}
              </Text>
            </TouchableOpacity>

            {showMessage && (
              <View style={styles.additionalMessageBox}>
                <Text style={styles.additionalMessageText}>
                  {lead.additional_message}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {showMenu && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onSendOffer(lead);
            }}
          >
            <Image
              source={icons.sendIcon}
              style={[styles.iconTiny, { tintColor: colors.primary }]}
            />
            <Text style={[styles.menuItemText, { color: colors.primary }]}>
              Send sales offer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              onDelete(lead);
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

const LaunchManagementScreen = ({ navigation }) => {
  useResetSearchOnFocus();
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success',
  });
  const [showSalesOfferModal, setShowSalesOfferModal] = useState(false);
  const [showConvertClientModal, setShowConvertClientModal] = useState(false);
  const [showSPATemplateModal, setShowSPATemplateModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [viewMode, setViewMode] = useState('leads'); // 'leads' or 'offers'
  const [showVerifyPaymentModal, setShowVerifyPaymentModal] = useState(false);
  const [verifyingOffer, setVerifyingOffer] = useState(null);
  const searchQuery = useSearchStore(state => state.searchQuery); //search Filter state
  const { canAccess, hasPermission } = usePermissions();

  // Check if user has permission to view offers before fetching
  const canViewOffers = canAccess(
    MODULES.LEAD_MANAGEMENT,
    PERMISSIONS.LEAD_MANAGEMENT.CAN_VIEW_OFFER,
  );

  const { data: allLeads, isLoading, error, refetch } = useAllLeads();
  const {
    data: salesOffersData,
    isLoading: offersLoading,
    error: offersError,
    refetch: refetchOffers,
  } = useSalesOffersLeads({
    enabled: canViewOffers,
    retry: false, // Don't retry on permission errors
    cacheTime: 0, // Don't cache if disabled
    staleTime: 0, // Don't use stale data if disabled
  });

  // Only use salesOffers data if user has permission
  const salesOffers = canViewOffers ? salesOffersData : null;
  //Filter sales offers by global search query
  const filteredSalesOffers = salesOffers?.filter(offer => {
    const q = searchQuery.toLowerCase();
    return (
      offer.client_name?.toLowerCase().includes(q) ||
      offer.lead_name?.toLowerCase().includes(q) ||
      offer.status?.toLowerCase().includes(q) ||
      offer.spa_status?.toLowerCase().includes(q)
    );
  });

  const deleteLeadMutation = useDeleteLeadNew();
  const deleteOfferMutation = useDeleteOffer();
  const convertLeadMutation = useConvertLeadToClient();
  const sendOfferMutation = useSendSalesOffer();
  const sendSignRequestMutation = useSendSignRequestLead();
  const updateStatusMutation = useUpdateSalesOfferStatus();
  const downloadSPAMutation = useDownloadSPA();

  // Filter leads based on selected filter
  const leads =
    allLeads?.filter(lead => {
      if (currentFilter === 'all') return true;
      return lead.lead_type === currentFilter;
    }) || [];
  // Filter leads by global search query
  const filteredLeads = leads.filter(lead => {
    const q = searchQuery.toLowerCase();
    return (
      lead.full_name?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.phone_number?.toLowerCase().includes(q) ||
      lead.interested_in?.toLowerCase().includes(q)
    );
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log(viewMode, 'viewMode');

    if (viewMode === 'leads') {
      await refetch();
    } else {
      await refetchOffers();
    }
    setRefreshing(false);
  };

  const handleFilterApply = filter => {
    setCurrentFilter(filter);
  };

  const handleDeleteLead = lead => {
    if (
      !canAccess(
        MODULES.LEAD_MANAGEMENT,
        PERMISSIONS.LEAD_MANAGEMENT.CAN_DELETE_LEAD,
      )
    ) {
      showToast("You don't have permission to delete leads", 'error');
      return;
    }
    setSelectedLead(lead);
    setShowDeleteModal(true);
  };

  const handleSendOffer = lead => {
    if (
      !canAccess(
        MODULES.LEAD_MANAGEMENT,
        PERMISSIONS.LEAD_MANAGEMENT.CAN_SEND_OFFER,
      )
    ) {
      showToast("You don't have permission to send offers", 'error');
      return;
    }
    setSelectedLead(lead);
    setShowSalesOfferModal(true);
  };

  const handleSalesOfferClick = () => {
    if (!canViewOffers) {
      showToast("You don't have permission to view sales offers", 'error');
      return;
    }
    setViewMode(viewMode === 'leads' ? 'offers' : 'leads');
  };

  const handleConvertToClient = lead => {
    if (
      !canAccess(
        MODULES.LEAD_MANAGEMENT,
        PERMISSIONS.LEAD_MANAGEMENT.CAN_CONVERT_TO_CLIENT,
      )
    ) {
      showToast("You don't have permission to convert to client", 'error');
      return;
    }
    setSelectedLead(lead);
    setShowConvertClientModal(true);
  };

  const handleSubmitConvert = async formData => {
    if (convertLeadMutation.isPending) return; // Prevent multiple API calls

    try {
      if (!selectedLead?.id) {
        showToast('No sales offer ID found', 'error');
        return;
      }

      await convertLeadMutation.mutateAsync({
        salesOfferId: selectedLead.id,
        password: formData.password,
      });
      showToast('Converted to client successfully', 'success');
      setShowConvertClientModal(false);
      setSelectedLead(null);
      refetchOffers();
    } catch (error) {
      // Extract a readable backend message
      const errorMsg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to convert to client. Please try again.';

      // Show native alert with error message
      Alert.alert('Error', errorMsg);

      // Optionally still show toast for consistency
      showToast(errorMsg, 'error');
    }
  };
  const handleSubmitSendOffer = async formData => {
    if (sendOfferMutation.isPending) return; // Prevent multiple API calls

    try {
      const payload = {
        // lead_id: parseInt(formData.project),
        lead_id: selectedLead.id,
        unit_id: parseInt(formData.unit),
        subject: 'Your Sales Offer',
        message:
          'Dear Client,\n\nPlease find attached your sales offer.\n\nBest regards,\nMAAK Dream',
        status: 'Sent',
      };
      await sendOfferMutation.mutateAsync(payload);
      setShowSalesOfferModal(false);
      setSelectedLead(null);

      await refetch();
      // refresh leads
      await refetchOffers();

      showToast('Sales offer sent successfully', 'success');
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to send offer'), 'error');
    }
  };

  const handleSendSPA = offer => {
    if (
      !canAccess(
        MODULES.LEAD_MANAGEMENT,
        PERMISSIONS.LEAD_MANAGEMENT.CAN_SEND_SPA,
      )
    ) {
      showToast("You don't have permission to send SPA", 'error');
      return;
    }
    setSelectedOffer(offer);
    setShowSPATemplateModal(true);
  };

  const handleSubmitSPA = async formData => {
    if (sendSignRequestMutation.isPending) return; // Prevent multiple API calls

    try {
      await sendSignRequestMutation.mutateAsync(formData);
      showToast('SPA sent successfully', 'success');
      setShowSPATemplateModal(false);
      setSelectedOffer(null);
      refetchOffers();
    } catch (error) {
      showToast(getErrorMessage(error, 'Failed to send SPA'), 'error');
    }
  };

  const handleStatusChange = async (offer, newStatus) => {
    if (
      !canAccess(
        MODULES.LEAD_MANAGEMENT,
        PERMISSIONS.LEAD_MANAGEMENT.CAN_UPDATE_STATUS,
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

  const handleViewPDF = offer => {
    if (
      !hasPermission(
        MODULES.LEAD_MANAGEMENT,
        PERMISSIONS.LEAD_MANAGEMENT.CAN_VIEW_OFFER_PDF,
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
      !canAccess(
        MODULES.LEAD_MANAGEMENT,
        PERMISSIONS.LEAD_MANAGEMENT.CAN_DELETE_OFFER,
      )
    ) {
      showToast("You don't have permission to delete offers", 'error');
      return;
    }
    setSelectedLead(offer);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (deleteOfferMutation.isPending || deleteLeadMutation.isPending) return; // Prevent multiple API calls

    try {
      if (viewMode === 'offers') {
        // Delete sales offer
        await deleteOfferMutation.mutateAsync(selectedLead.id);
        await refetchOffers();
        showToast('Sales offer deleted successfully', 'success');
      } else {
        // Delete lead
        await deleteLeadMutation.mutateAsync(selectedLead.id);
        await refetch();
        showToast('Lead deleted successfully', 'success');
      }

      setShowDeleteModal(false);
      setSelectedLead(null);
    } catch (error) {
      showToast(
        getErrorMessage(
          error,
          `Failed to delete ${viewMode === 'offers' ? 'sales offer' : 'lead'}`,
        ),
        'error',
      );
    }
  };

  //Download SPA

  const handleDownloadSPA = async offer => {
    try {
      const signId = offer?.sign_id || offer?.odoo_request_id || offer?.id;

      if (!BASE_URL || !signId) {
        console.error('Missing BASE_URL or signId', { BASE_URL, signId });
        return;
      }

      const { fs, config, android } = ReactNativeBlobUtil;
      const path = `${fs.dirs.DownloadDir}/SPA_${signId}.pdf`;
      const url = `${BASE_URL}/odoo/download-signed-document/${signId}`;

      const channelId = await notifee.createChannel({
        id: 'downloads',
        name: 'File Downloads',
        importance: AndroidImportance.HIGH,
      });

      const notificationId = await notifee.displayNotification({
        title: 'Downloading SPA...',
        body: '0%',
        android: {
          channelId,
          progress: { max: 100, current: 0, indeterminate: false },
          onlyAlertOnce: true,
          ongoing: true,
          smallIcon: 'ic_launcher',
        },
      });

      let lastProgress = 0;
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

      await notifee.displayNotification({
        id: notificationId,
        title: 'Download Complete',
        body: 'Tap to open SPA document',
        android: {
          channelId,
          progress: { max: 100, current: 100, indeterminate: false },
          onlyAlertOnce: true,
          ongoing: false,
          smallIcon: 'ic_launcher',
        },
      });

      android.actionViewIntent(path, 'application/pdf');
    } catch (error) {
      console.error(' Error in handleDownloadSPA:', error);
      await notifee.displayNotification({
        title: 'Download Failed',
        body: 'Could not download the SPA file.',
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

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading leads...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load leads</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  const isLongNumber = String(leads?.length || 0).length > 3;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrapper}>
        <Text style={styles.pageTitle}>Leads Management</Text>

        <View style={styles.headerControls}>
          {viewMode === 'leads' && (
            <View
              style={[
                styles.totalLeadsCard,
                isLongNumber && styles.totalLeadsCardColumn, // switch layout
              ]}
            >
              <Image source={icons.user} style={styles.iconSmall} />
              <Text style={styles.totalLeadsText}>Total leads</Text>
              <Text style={styles.totalLeadsCount}>{leads?.length || 0}</Text>
            </View>
          )}
          <View style={styles.headerControlsRight}>
            <TouchableOpacity
              style={[
                styles.salesOfferCard,
                viewMode === 'offers' && styles.salesOfferCardActive,
              ]}
              onPress={handleSalesOfferClick}
            >
              <Text
                style={[
                  styles.salesOfferText,
                  viewMode === 'offers' && styles.salesOfferTextActive,
                ]}
              >
                Sales Offer
              </Text>
            </TouchableOpacity>
            {viewMode === 'leads' && (
              <TouchableOpacity
                style={styles.filterCard}
                onPress={() => setShowFilterModal(true)}
              >
                <Image source={icons.filter} style={styles.iconSmall} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {viewMode === 'leads' ? (
            filteredLeads && filteredLeads.length > 0 ? (
              filteredLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onDelete={handleDeleteLead}
                  onSendOffer={handleSendOffer}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? 'No matching leads found'
                    : 'No leads available'}
                </Text>
              </View>
            )
          ) : // Sales Offers
          !canViewOffers ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.noAccessTitle}>Access Denied</Text>
              <Text style={styles.noAccessText}>
                You don't have permission to view sales offers.
              </Text>
            </View>
          ) : filteredSalesOffers && filteredSalesOffers.length > 0 ? (
            filteredSalesOffers.map(offer => (
              <SalesOfferCard
                key={offer.id}
                offer={offer}
                onDelete={handleDeleteOffer}
                onSendSPA={handleSendSPA}
                onViewPDF={handleViewPDF}
                onConvert={() => handleConvertToClient(offer)}
                onStatusChange={handleStatusChange}
                onPaymentVerify={handlePaymentVerify}
                onPaymentPercentageChange={handlePaymentPercentageChange}
                onDownloadSPA={handleDownloadSPA}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No matching sales offers found'
                  : 'No sales offers available'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <FilterDropdown
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilter={handleFilterApply}
        currentFilter={currentFilter}
      />

      <ConfirmDeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        itemName={
          viewMode === 'offers'
            ? selectedLead?.client_name || selectedLead?.lead_name
            : selectedLead?.full_name
        }
        title={viewMode === 'offers' ? 'Delete Sales Offer' : 'Delete Lead'}
      />

      <SendOfferModal
        visible={showSalesOfferModal}
        onClose={() => setShowSalesOfferModal(false)}
        onSubmit={handleSubmitSendOffer}
        leadData={selectedLead}
        isPending={sendOfferMutation.isPending}
      />

      <ConvertToClientModal
        visible={showConvertClientModal}
        onClose={() => setShowConvertClientModal(false)}
        onSubmit={handleSubmitConvert}
        leadData={selectedLead}
      />

      <SPATemplateModal
        visible={showSPATemplateModal}
        onClose={() => {
          setShowSPATemplateModal(false);
          setSelectedOffer(null);
        }}
        onSubmit={handleSubmitSPA}
        offerData={selectedOffer}
        isPending={sendSignRequestMutation.isPending}
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
    // paddingBottom: 6,
    backgroundColor: colors.background,
  },

  pageTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 24,
    color: colors.defaultBlack,
    marginBottom: 16,
  },

  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    justifyContent: 'space-between',
  },
  headerControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  totalLeadsTextContainer: {
    // marginLeft: 8,
    // flexShrink: 1,
    // flexWrap: 'wrap', // ✅ Allows wrapping to next line
  },

  totalLeadsText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Outfit-Regular',
  },

  totalLeadsCount: {
    fontSize: 20,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
    marginTop: 2, // space between label and number
    flexWrap: 'wrap',
  },
  totalLeadsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 4,
    marginRight: 8,
  },

  // When number is long (4+ digits)
  totalLeadsCardColumn: {
    alignItems: 'flex-start',
    // gap:2,
  },

  totalLeadsTextContainer: {
    marginLeft: 8,
    flexShrink: 1,
  },

  totalLeadsText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Outfit-Medium',
  },

  totalLeadsCount: {
    fontSize: 18,
    fontFamily: 'Outfit-Medium',
    color: colors.primary,
    marginTop: 2,
  },

  salesOfferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginRight: 8,
  },

  salesOfferCardActive: {
    backgroundColor: colors.defaultBlack,
  },

  salesOfferText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Outfit-Medium',
  },

  salesOfferTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Outfit-Medium',
  },

  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  iconSmall: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
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
    fontFamily: 'Outfit-Medium',
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
    fontFamily: 'Outfit-Medium',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
  },
  leadCard: {
    position: 'relative',
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAECF0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    elevationBottom: 1,
  },
  leadName: {
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
    borderRadius: 8,
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
  menuButton: {
    padding: 4,
    // marginLeft: 8,
  },
  leadDetails: {
    gap: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
  },
  messageContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
  },
  viewMessageText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Outfit-Regular',
  },

  additionalMessageBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 10,
    marginLeft: 24, // aligns under icon
    marginTop: 6,
  },

  additionalMessageText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
    lineHeight: 18,
  },

  dropdownMenu: {
    position: 'absolute',
    top: 45,
    right: 16,
    backgroundColor: colors.defaultWhite,
    borderRadius: 8,
    // borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // elevation: 5,
    zIndex: 1000,
    paddingHorizontal: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    gap: 8,
  },
  menuItemText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: 'Outfit-Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
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
  // dropdownOverlay: {
  //   position: 'absolute',
  //   top: 0,
  //   left: 0,
  //   right: 0,
  //   bottom: 0,
  //   backgroundColor: 'transparent',
  //   zIndex: 999,
  // },

  filterDropdown: {
    position: 'absolute',
    textAlign: 'center',
    top: 120, // adjust depending on your header height
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    width: 150,
    paddingVertical: 4,
  },

  filterDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
  },

  filterDropdownItemActive: {
    backgroundColor: '#EBF0F5',
    paddingHorizontal: 8,
    borderRadius: 6,
  },

  filterDropdownText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#333',
  },

  filterDropdownTextActive: {
    color: colors.defaultBlack,
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Medium',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
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
    fontFamily: 'Outfit-Medium',
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
    fontFamily: 'Outfit-SemiBold',
  },
  salesOfferModalContainer: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 12,
    width: '95%',
    maxHeight: '80%',
    paddingBottom: 20,
  },
  formScrollView: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  formSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
    marginBottom: 6,
  },
  passwordNote: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  convertButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  convertButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  offerDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  offerDetailText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  spaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  spaButtonText: {
    color: colors.defaultWhite,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
  },
  viewPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    // backgroundColor: '#FFF3E0',
    gap: 4,
    alignSelf: 'flex-start',
  },
  viewPdfText: {
    color: colors.warning,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
  },
  offerDate: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
  },
  spaStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  spaLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.text,
    marginRight: 8,
  },
  spaStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    textAlign: 'center',
  },
  spaStatusText: {
    color: colors.defaultWhite,
    fontSize: 12,
    fontFamily: 'Outfit-Medium',
  },
  sendSPAButton: {
    backgroundColor: colors.defaultWhite,
    borderWidth: 1,
    borderColor: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  sendSPAButtonText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Outfit-Medium',
  },
  sendSPAButtonDisabled: {
    backgroundColor: '#E5E5E5',
    borderColor: '#CCCCCC',
    opacity: 0.6,
  },
  sendSPAButtonTextDisabled: {
    color: '#999999',
  },
  statusDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 150,
    zIndex: 10,
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
    // elevation: 5,
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
    fontFamily: 'Outfit-Regular',
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

export default LaunchManagementScreen;
