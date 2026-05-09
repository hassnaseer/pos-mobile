import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import colors from '../../../../theme/colors';
import Toast from '../../../../components/Toast/Toast';
import { capitalizeWords } from '../../../../utils/stringUtils';

// Lucide icons
import {
  Mail,
  Phone,
  Building,
  FileText,
  MapPin,
  MessageCircle,
  Briefcase,
  Calendar,
  Languages,
  Shield,
  Landmark,
  Home,
  FileBadge,
  Contact,
  Globe2,
  IdCard,
  User,
} from 'lucide-react-native';

const BrokerDetailScreen = ({ route }) => {
  const { broker, type } = route.params;
  const isAgency = type === 'agency';

  const [toast, setToast] = React.useState({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message, type) =>
    setToast({ visible: true, message, type });
  const hideToast = () =>
    setToast({ visible: false, message: '', type: 'success' });

  const handleOpenDocument = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() =>
      showToast('Failed to open document', 'error'),
    );
  };

  const renderInfoRow = (IconComponent, label, value) => {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <IconComponent
          size={20}
          color={colors.secondary}
          style={{ marginRight: 12, marginTop: 2 }}
        />
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    );
  };

  const renderDocumentItem = (label, url) => {
    if (!url) return null;
    return (
      <TouchableOpacity
        style={styles.documentItem}
        onPress={() => handleOpenDocument(url)}
        activeOpacity={0.7}>
        <FileText
          size={22}
          color={colors.secondary}
          style={{ marginRight: 12 }}
        />
        <View style={styles.documentContent}>
          <Text style={styles.documentLabel}>{label}</Text>
          <Text style={styles.documentUrl} numberOfLines={1}>
            {url}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAgencyDetails = (broker) => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        {renderInfoRow(Mail, 'Email', broker.email)}
        {renderInfoRow(Phone, 'Office Phone', broker.office_phone_number)}
        {renderInfoRow(MessageCircle, 'Company WhatsApp', broker.company_whatsapp)}
        {renderInfoRow(MessageCircle, 'GM WhatsApp', broker.general_manager_whatsapp)}
        {renderInfoRow(Contact, 'Accounts Contact', broker.accounts_contact_number)}
        {renderInfoRow(Globe2, 'Website', broker.website)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Details</Text>
        {renderInfoRow(Landmark, 'Country', broker.country)}
        {renderInfoRow(MapPin, 'City', broker.city)}
        {renderInfoRow(Home, 'State/Province', broker.state_province)}
        {renderInfoRow(MapPin, 'Postal Code', broker.postal_code)}
        {renderInfoRow(Building, 'Complete Address', broker.complete_address)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        {renderInfoRow(User, 'Relationship Manager', broker.relationship_manager)}
        {renderInfoRow(Calendar, 'Created At', new Date(broker.created_at).toLocaleDateString())}
        {renderInfoRow(Calendar, 'Last Updated', new Date(broker.updated_at).toLocaleDateString())}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documents</Text>
        {renderDocumentItem('Trade License', broker.trade_license)}
        {renderDocumentItem('RERA Certificate', broker.rera_certificate)}
        {renderDocumentItem('Tax Registration Certificate', broker.tax_registration_certificate)}
        {renderDocumentItem('Passport Copy (Owner/GM)', broker.passport_copy_owner_gm)}
        {broker.other_supporting_documents?.length > 0 &&
          broker.other_supporting_documents.map((doc, i) =>
            renderDocumentItem(`Supporting Document ${i + 1}`, doc),
          )}
      </View>
    </>
  );

  const renderIndividualDetails = (broker) => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        {renderInfoRow(Mail, 'Email', broker.email)}
        {renderInfoRow(Phone, 'Phone Number', broker.phone_number)}
        {renderInfoRow(MessageCircle, 'WhatsApp Number', broker.whatsapp_number)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        {renderInfoRow(Calendar, 'Date of Birth', broker.date_of_birth)}
        {renderInfoRow(Globe2, 'Nationality', broker.nationality)}
        {renderInfoRow(User, 'Gender', broker.gender)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Information</Text>
        {renderInfoRow(Briefcase, 'Current Company', broker.current_company)}
        {renderInfoRow(FileBadge, 'Years of Experience', broker.years_of_experience?.toString())}
        {renderInfoRow(Shield, 'Specialization', broker.specialization)}
        {renderInfoRow(Languages, 'Languages Spoken', broker.languages_spoken)}
        {renderInfoRow(IdCard, 'RERA Number', broker.rera_number)}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        {renderInfoRow(Calendar, 'Created At', new Date(broker.created_at).toLocaleDateString())}
        {renderInfoRow(Calendar, 'Last Updated', new Date(broker.updated_at).toLocaleDateString())}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documents</Text>
        {renderDocumentItem('Passport Copy', broker.passport_copy)}
        {renderDocumentItem('Resume/CV', broker.resume_cv)}
        {renderDocumentItem('RERA License', broker.rera_license)}
        {broker.other_supporting_documents?.length > 0 &&
          broker.other_supporting_documents.map((doc, i) =>
            renderDocumentItem(`Supporting Document ${i + 1}`, doc),
          )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* <View style={styles.header}>
        <Text style={styles.headerTitle}>Broker Details</Text>
      </View> */}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          <Text style={styles.brokerName}>
            {capitalizeWords(isAgency ? broker.company_name : broker.full_name)}
          </Text>
          <Text style={styles.brokerType}>
            {isAgency ? 'Agency Broker' : 'Individual Broker'}
          </Text>
        </View>

        {isAgency ? renderAgencyDetails(broker) : renderIndividualDetails(broker)}
      </ScrollView>

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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.defaultWhite,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    color: colors.text,
    fontFamily: 'Outfit-SemiBold',
  },
  scrollView: { flex: 1 },
  mainCard: {
        backgroundColor: colors.background,

    paddingVertical: 8,
    alignItems: 'center',
  },
  brokerName: {
    fontSize: 24,
    color: colors.primary,
    fontFamily: 'Outfit-SemiBold',
    marginBottom: 4,
  },
  brokerType: {
    fontSize: 16,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
  },
  section: {     backgroundColor: colors.background,
 paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 18,
    color: colors.text,
    fontFamily: 'Outfit-SemiBold',
    marginBottom: 8,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 18,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
    marginBottom: 4,
  },
  infoValue: { fontSize: 16, color: colors.text, fontFamily: 'Outfit-Medium' },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  documentContent: { flex: 1 },
  documentLabel: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'Outfit-Medium',
    marginBottom: 2,
  },
  documentUrl: {
    fontSize: 12,
    color: colors.secondary,
    fontFamily: 'Outfit-Regular',
  },
});

export default BrokerDetailScreen;
