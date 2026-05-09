import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import colors from '../../../theme/colors';
import crossIcon from '../../../assets/icons/cross-icon.png';
import maakLogo from '../../../assets/images/logo.png'; //  Add your logo image here
import { formatDate } from '../../../utils/formatDate';
import { capitalizeWords } from '../../../utils/stringUtils';

const ViewInvoiceModal = ({ visible, onClose, invoice, client }) => {
  console.log("Invoice",invoice);
  
  if (!invoice) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Invoice</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Image source={crossIcon} style={styles.closeIcon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Invoice Container */}
            <View style={styles.invoiceContainer}>
              {/* Invoice Header */}
              <View style={styles.invoiceHeader}>
                {/*  Replace Custom Triangles with Logo Image */}
                <View style={styles.logoSection}>
                  <Image source={maakLogo} style={styles.logoImage} />
                </View>

                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>
                    Invoice # {invoice?.invoiceNumber}
                  </Text>
                  <Text style={styles.invoiceDate}>
                    Date: {invoice?.invoiceDate}
                  </Text>
                </View>
              </View>

              {/* Invoice Details */}
              <View style={styles.invoiceDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Invoice To:</Text>
                  <Text style={styles.detailValue}>
                    {capitalizeWords(client?.client_name )}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payable amount:</Text>
                  <Text style={styles.detailValue}>
                    {invoice.paymentPrice} AED
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Due date:</Text>
                  <Text style={styles.detailValue}>{formatDate(invoice?.dueDate)}</Text>
                </View>

                <View style={styles.detailRowInput}>
                  <Text style={styles.detailLabel}>Cash/Cheque:</Text>
                  <View style={styles.inputLine} />
                </View>

                <View style={styles.detailRowInput}>
                  <Text style={styles.detailLabel}>Bank name:</Text>
                  <View style={styles.inputLine} />
                </View>

                <View style={styles.detailRowInput}>
                  <Text style={styles.detailLabel}>Receiver's sign:</Text>
                  <View style={styles.inputLine} />
                </View>

                <View style={styles.detailRowInput}>
                  <Text style={styles.detailLabel}>Cashier's sign:</Text>
                  <View style={styles.inputLine} />
                </View>
              </View>

              {/* Invoice Footer */}
              <View style={styles.invoiceFooter}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactText}>
                    Tel: +971 4 5564923 | Mob: +971 52 9934234
                  </Text>
                  <Text style={styles.contactText}>
                    Mail: maakdreams@maaksons.com
                  </Text>
                </View>
                <Text style={styles.addressText}>
                  Address: Bin Shabib Building 3, Office M-205 on Sheikh Zayed
                  Road, Dubai, U.A.E.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.defaultWhite,
    borderRadius: 16,
    width: '90%',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  scrollContent: {
    // paddingHorizontal: 20,
    // paddingVertical: 20,
  },
  invoiceContainer: {
    backgroundColor: colors.defaultWhite,
    // borderRadius: 12,
    // borderWidth: 1,
    // borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    // borderBottomWidth: 2,
    // borderBottomColor: colors.primary,
  },
  logoSection: {
    flex: 1,
  },
  logoImage: {
    width: 100,
    height: 40,
    resizeMode: 'contain',
  },
  invoiceInfo: {
    alignItems: 'flex-end',
  },
  invoiceNumber: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
  invoiceDetails: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailRowInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: colors.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Outfit-SemiBold',
    color: colors.defaultBlack,
  },
  inputLine: {
    width: 150,
    height: 1,
    backgroundColor: '#D0D5DD',
  },
  invoiceFooter: {
    backgroundColor: colors.primary,
    padding: 16,
  },
  contactInfo: {
    marginBottom: 8,
  },
  contactText: {
    fontSize: 10,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultWhite,
    textAlign: 'center',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 9,
    fontFamily: 'Outfit-Regular',
    color: colors.defaultWhite,
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default ViewInvoiceModal;
