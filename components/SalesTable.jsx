import React, { useContext, useRef, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Image,
    Alert,
    ToastAndroid,
    TextInput,
    ScrollView, // Added for scrollable modal content
    ActivityIndicator, // Added for loading states
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { AuthContext } from '@/context/AuthContext';
import PlaceholderLogo from './PlaceholderLogo';
import Ionicons from '@expo/vector-icons/Ionicons';
import axiosInstance from '@/utils/axiosInstance';

const SalesTable = ({
    invoices,
    userInfo,
    fetchOrders,
}) => {
    const { sendPushNotification } = useContext(AuthContext);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
    const invoiceRef = useRef();
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false); // New loading state for payment
    const [amountPaid, setAmountPaid] = useState(''); // Changed to string for TextInput
    const [selectedMethod, setSelectedMethod] = useState('transfer');

    const openModal = (invoice) => {
        setSelectedInvoice(invoice);
        setModalVisible(true);
    };

    const openPaymentModal = () => {
        if (!selectedInvoice) return; // Ensure an invoice is selected
        setAmountPaid(selectedInvoice.totalAmount - selectedInvoice.amountPaid > 0 ? (selectedInvoice.totalAmount - selectedInvoice.amountPaid).toString() : ''); // Pre-fill with balance or empty
        setPaymentModalVisible(true);
    };

    const closeModal = () => {
        setSelectedInvoice(null);
        setModalVisible(false);
    };

    const closePaymentModal = () => {
        setPaymentModalVisible(false);
        setAmountPaid(''); // Clear amount when closing
    };

    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function formatDateTime(dateString) {
        const date = new Date(dateString);
        const options = {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        };
        return date.toLocaleDateString('en-US', options);
    }

    const handleRecordPayment = async () => {
        if (!selectedInvoice || !amountPaid || parseFloat(amountPaid) <= 0) {
            ToastAndroid.show('Please enter a valid amount.', ToastAndroid.SHORT);
            return;
        }

        Alert.alert(
            'Confirm Payment',
            `Are you sure you want to record a payment of ₦${parseFloat(amountPaid).toLocaleString()} via ${selectedMethod}?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Record',
                    onPress: async () => {
                        setPaymentLoading(true);
                        try {
                            const response = await axiosInstance.post(
                                '/orders/add-payment',
								{
									storeId: userInfo._id,
                                    orderId: selectedInvoice._id,
                                    amount: parseFloat(amountPaid),
                                    method: selectedMethod,
                                },
                            );
                            if (response.status === 200) {
                                ToastAndroid.show('Payment recorded successfully!', ToastAndroid.LONG);
                                closePaymentModal();
                                closeModal(); // Close invoice detail modal too
                                fetchOrders(); // Refresh orders
                            } else {
                                ToastAndroid.show('Failed to record payment', ToastAndroid.LONG);
                            }
                        } catch (error) {
                            console.error('Error recording payment:', error.response?.data || error.message);
                            ToastAndroid.show(
                                `Failed to record payment: ${error.response?.data?.message || 'Something went wrong'}`,
                                ToastAndroid.LONG,
                            );
                        } finally {
                            setPaymentLoading(false);
                        }
                    },
                },
            ],
            { cancelable: true },
        );
    };

    const handleShareInvoice = async () => {
        try {
            setInvoiceLoading(true); // Indicate loading for share
            const uri = await captureRef(invoiceRef, {
                format: 'jpg',
                quality: 1,
            });
            await Sharing.shareAsync(uri);
        } catch (error) {
            console.error('Error sharing invoice:', error);
            Alert.alert('Error', 'Failed to share invoice.');
        } finally {
            setInvoiceLoading(false); // Stop loading regardless of success/failure
        }
    };

    const getPaymentStatusStyle = (status) => {
        switch (status) {
            case 'completed':
                return styles.statusCompleted;
            case 'partial':
                return styles.statusPartial;
            case 'pending':
                return styles.statusPending; // Renamed from 'red' to 'pending' for clarity
            default:
                return {};
        }
    };

    const renderItem = ({ item, index }) => (
        <TouchableOpacity
            style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}
            onPress={() => openModal(item)}
        >
            <Text style={[styles.cell, { fontWeight: '500' }]}>#{item.orderNumber}</Text>
            <Text style={styles.cell}>₦{item.totalAmount?.toLocaleString()}</Text>
            <Text style={styles.cell}>
                ₦{(item.totalAmount - item.amountPaid)?.toLocaleString()}
            </Text>
            <View style={styles.statusCellContainer}>
                <Text style={[styles.statusBadge, getPaymentStatusStyle(item?.payment?.status)]}>
                    {item?.payment?.status}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
			<View style={styles.container}>
				{/* Table Header */}
				<View style={styles.header}>
					<Text style={styles.headerCell}>
						Order Number
					</Text>
					<Text style={styles.headerCell}>Amount</Text>
					<Text style={styles.headerCell}>Balance</Text>
					<Text style={styles.headerCell}>Status</Text>
				</View>

				{/* Table Body */}
				<FlatList
					data={invoices}
					renderItem={renderItem}
					keyExtractor={(item) => item._id}
					ListEmptyComponent={() => (
						<Text style={styles.emptyListText}>
							No invoices found.
						</Text>
					)}
				/>

				{/* Modal for Invoice Details */}
				{selectedInvoice && (
					<Modal
						visible={isModalVisible}
						animationType="slide"
						transparent
						onRequestClose={closeModal}
					>
						<View style={styles.modalContainer}>
							<View style={styles.modalContent}>
								<ScrollView // Allow content to scroll if it overflows
									style={styles.invoiceDetailScroll}
									contentContainerStyle={
										styles.invoiceDetailContent
									}
									ref={invoiceRef} // Ref for screenshot
								>
									{/* Store/Business Info */}
									<View style={styles.invoiceHeaderSection}>
										<View>
											<Text style={styles.invoiceId}>
												Invoice #
												{selectedInvoice?.orderNumber}
											</Text>
											<Text style={styles.invoiceDate}>
												{formatDate(
													selectedInvoice?.createdAt,
												)}
											</Text>
											<Text
												style={[
													styles.statusBadge,
													getPaymentStatusStyle(
														selectedInvoice?.payment
															?.status,
													),
													styles.modalStatusBadge,
												]}
											>
												{selectedInvoice.payment.status}
											</Text>
										</View>
										<View style={styles.storeInfo}>
											{userInfo?.logoUrl ? (
												<Image
													source={{ uri: userInfo.logoUrl }}
													style={styles.storeLogo}
												/>
											) : (
												<PlaceholderLogo
													name={userInfo?.name}
												/>
											)}
											<Text style={styles.storeName}>
												{userInfo?.name}
											</Text>
											<Text style={styles.storeContact}>
												{userInfo?.address}
											</Text>
											<Text style={styles.storeContact}>
												{userInfo?.phone}
											</Text>
										</View>
									</View>

									{/* Billed To */}
									<View style={styles.billedToSection}>
										<Text style={styles.sectionTitle}>
											Billed to:
										</Text>
										<Text style={styles.customerName}>
											{selectedInvoice?.customerInfo?.name}
										</Text>
										{selectedInvoice?.customerInfo
											?.address && (
											<Text style={styles.customerContact}>
												{
													selectedInvoice?.customerInfo
														?.address
												}
											</Text>
										)}
										<Text style={styles.customerContact}>
											{
												selectedInvoice?.customerInfo
													?.contact
											}
										</Text>
									</View>

									{/* Invoice Items Table */}
									<Text style={styles.sectionTitle}>
										Order Details
									</Text>
									<View style={styles.itemsHeader}>
										<Text
											style={[
												styles.itemHeaderCell,
												{ flex: 3, textAlign: 'left' },
											]}
										>
											Item
										</Text>
										<Text style={styles.itemHeaderCell}>
											Qty
										</Text>
										<Text style={styles.itemHeaderCell}>
											Amount
										</Text>
									</View>
									{selectedInvoice?.items?.map(
										(item, index) => (
											<View
												key={index}
												style={styles.itemRow}
											>
												<View style={{ flex: 3 }}>
													<Text style={styles.itemName}>
														{item?.name || item?.product}
													</Text>
													{item?.addOns?.map(
														(addon, idx) => (
															<Text
																key={idx}
																style={styles.itemAddon}
															>
																{addon.name} (x
																{addon.quantity})
															</Text>
														),
													)}
												</View>
												<Text style={styles.itemQuantity}>
													{item?.quantity}
												</Text>
												<Text style={styles.itemAmount}>
													₦
													{item?.total?.toLocaleString() ||
														item?.totalPrice?.toLocaleString()}
												</Text>
											</View>
										),
									)}

									{/* Totals */}
									<View style={styles.summaryRow}>
										<Text style={styles.summaryLabel}>
											Sub-total
										</Text>
										<Text style={styles.summaryValue}>
											₦
											{selectedInvoice?.itemsAmount?.toLocaleString()}
										</Text>
									</View>
									{selectedInvoice?.deliveryFee > 0 && (
										<View>
											<View style={styles.summaryRow}>
												<Text style={styles.summaryLabel}>
													Delivery Fee
												</Text>
												<Text style={styles.summaryValue}>
													₦
													{selectedInvoice?.deliveryFee?.toLocaleString()}
												</Text>
											</View>
											<View style={styles.summaryRow}>
												<Text style={styles.summaryLabel}>
													Service Fee
												</Text>
												<Text style={styles.summaryValue}>
													₦
													{selectedInvoice?.serviceFee?.toLocaleString()}
												</Text>
											</View>
										</View>
									)}
									<View style={styles.totalRow}>
										<Text style={styles.totalLabel}>
											Total
										</Text>
										<Text style={styles.totalValue}>
											₦
											{selectedInvoice?.totalAmount?.toLocaleString()}
										</Text>
									</View>
									{selectedInvoice?.amountPaid > 0 && (
										<View style={styles.balanceRow}>
											<Text style={styles.balanceLabel}>
												Balance Due
											</Text>
											<Text style={styles.balanceValue}>
												₦
												{(
													selectedInvoice?.totalAmount -
													selectedInvoice?.amountPaid
												)?.toLocaleString()}
											</Text>
										</View>
									)}

									{/* Payment History */}
									{selectedInvoice?.payments?.length >
										0 && (
										<View
											style={styles.paymentHistorySection}
										>
											<Text
												style={styles.paymentHistoryTitle}
											>
												Payment History
											</Text>
											{selectedInvoice.payments.map(
												(payment, index) => (
													<View
														key={index}
														style={
															styles.paymentHistoryItem
														}
													>
														<Text
															style={
																styles.paymentHistoryText
															}
														>
															{formatDateTime(payment.date)}
														</Text>
														<Text
															style={
																styles.paymentHistoryMethod
															}
														>
															{payment.method}
														</Text>
														<Text
															style={
																styles.paymentHistoryAmount
															}
														>
															₦
															{payment.amount.toLocaleString()}
														</Text>
													</View>
												),
											)}
										</View>
									)}
								</ScrollView>

								{/* Modal Action Buttons */}
								<View style={styles.modalActions}>
									{selectedInvoice?.payment?.status !==
										'completed' && (
										<TouchableOpacity
											style={[
												styles.actionButton,
												styles.recordPaymentButton,
											]}
											onPress={openPaymentModal}
										>
											<Text style={styles.actionButtonText}>
												Record Payment
											</Text>
										</TouchableOpacity>
									)}

									<View style={styles.rightActionButtons}>
										<TouchableOpacity
											style={[
												styles.actionButton,
												styles.closeModalButton,
											]}
											onPress={closeModal}
										>
											<Text style={styles.closeButtonText}>
												Close
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={[
												styles.actionButton,
												styles.shareButton,
											]}
											onPress={handleShareInvoice}
											disabled={invoiceLoading}
										>
											{invoiceLoading ? (
												<ActivityIndicator color="#fff" />
											) : (
												<Text
													style={styles.actionButtonText}
												>
													Share
												</Text>
											)}
										</TouchableOpacity>
									</View>
								</View>
							</View>
						</View>

						{/* Payment Recording Modal */}
						<Modal
							visible={isPaymentModalVisible}
							animationType="slide"
							transparent
							onRequestClose={closePaymentModal}
						>
							<View style={styles.modalContainer}>
								<View
									style={[
										styles.modalContent,
										{ padding: 20 },
									]}
								>
									<View style={styles.paymentModalHeader}>
										<Text style={styles.paymentModalTitle}>
											Record Payment
										</Text>
										<TouchableOpacity
											onPress={closePaymentModal}
										>
											<Ionicons
												name="close-sharp"
												size={28}
												color="#333"
											/>
										</TouchableOpacity>
									</View>

									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>
											Amount Paid
										</Text>
										<TextInput
											style={styles.textInput}
											placeholder="Enter amount (e.g., 5000)"
											value={amountPaid}
											onChangeText={(text) => {
												const numericValue = text.replace(
													/[^0-9.]/g,
													'',
												);
												setAmountPaid(numericValue);
											}}
											keyboardType="numeric"
										/>
									</View>

									<Text style={styles.inputLabel}>
										Method of Payment
									</Text>
									<View
										style={styles.paymentMethodContainer}
									>
										{/* Bank Transfer Option */}
										<TouchableOpacity
											style={[
												styles.paymentMethodButton,
												selectedMethod === 'transfer' &&
													styles.selectedPaymentMethod,
											]}
											onPress={() =>
												setSelectedMethod('transfer')
											}
										>
											<View
												style={[
													styles.circle,
													selectedMethod === 'transfer' &&
														styles.selectedCircle,
												]}
											>
												{selectedMethod === 'transfer' && (
													<View
														style={styles.circleInner}
													/>
												)}
											</View>
											<Text
												style={styles.paymentMethodText}
											>
												Bank Transfer
											</Text>
										</TouchableOpacity>

										{/* Cash Option */}
										<TouchableOpacity
											style={[
												styles.paymentMethodButton,
												selectedMethod === 'cash' &&
													styles.selectedPaymentMethod,
											]}
											onPress={() =>
												setSelectedMethod('cash')
											}
										>
											<View
												style={[
													styles.circle,
													selectedMethod === 'cash' &&
														styles.selectedCircle,
												]}
											>
												{selectedMethod === 'cash' && (
													<View
														style={styles.circleInner}
													/>
												)}
											</View>
											<Text
												style={styles.paymentMethodText}
											>
												Cash
											</Text>
										</TouchableOpacity>
									</View>

									<TouchableOpacity
										style={styles.recordPaymentSubmitButton}
										onPress={handleRecordPayment}
										disabled={paymentLoading}
									>
										{paymentLoading ? (
											<ActivityIndicator color="#fff" />
										) : (
											<Text
												style={
													styles.recordPaymentSubmitButtonText
												}
											>
												Record Payment
											</Text>
										)}
									</TouchableOpacity>
								</View>
							</View>
						</Modal>
					</Modal>
				)}
			</View>
		);
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f8f8', // Lighter background for the main screen
    },
    header: {
        flexDirection: 'row',
        backgroundColor: '#e0e0e0', // Slightly darker header background
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingHorizontal: 10,
    },
    headerCell: {
        flex: 1,
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 13,
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee', // Lighter border
        alignItems: 'center', // Align items vertically in the center
    },
    evenRow: {
        backgroundColor: '#ffffff', // White background for even rows
    },
    oddRow: {
        backgroundColor: '#fcfcfc', // Slightly off-white for odd rows
    },
    cell: {
        flex: 1,
        textAlign: 'center',
        fontSize: 13,
        color: '#555',
    },
    statusCellContainer: {
        flex: 1,
        alignItems: 'center', // Center the badge in its cell
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 15, // More rounded badge
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
        textTransform: 'uppercase', // Make status text uppercase
        minWidth: 70, // Ensure a minimum width for badges
        textAlign: 'center',
        overflow: 'hidden', // Ensures content stays within rounded corners
    },
    statusCompleted: {
        backgroundColor: '#4CAF50', // Green
    },
    statusPartial: {
        backgroundColor: '#FFC107', // Amber/Orange
    },
    statusPending: {
        backgroundColor: '#F44336', // Red
    },
    emptyListText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#777',
    },

    // Modal Styles (Invoice Details)
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker overlay
    },
    modalContent: {
        width: '90%', // Wider modal for more content
        maxHeight: '90%', // Limit height and enable scroll
        backgroundColor: '#fff',
        borderRadius: 12, // More rounded corners
        padding: 5,
        elevation: 10, // Add shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    invoiceDetailScroll: {
        flexGrow: 1, // Allow content to grow
		width: '100%',
		backgroundColor: '#fff', // Ensure background is white for the scroll view
		// borderRadius: 12, // More rounded corners
		padding: 15
    },
    invoiceDetailContent: {
        paddingBottom: 20, // Add padding at the bottom for scroll
    },
    invoiceHeaderSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 15,
    },
    invoiceId: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    invoiceDate: {
        fontSize: 14,
        color: '#777',
        marginTop: 5,
    },
    modalStatusBadge: {
        marginTop: 8,
        alignSelf: 'flex-start', // Align badge to the left
    },
    storeInfo: {
        alignItems: 'flex-end', // Align store info to the right
    },
    storeLogo: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#eee',
        resizeMode: 'contain', // Ensure logo fits well
    },
    storeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'right',
    },
    storeContact: {
        fontSize: 13,
        color: '#666',
        textAlign: 'right',
    },
    billedToSection: {
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#444',
    },
    customerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    customerContact: {
        fontSize: 13,
        color: '#666',
    },
    itemsHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        paddingVertical: 8,
        borderRadius: 5,
        marginBottom: 10,
    },
    itemHeaderCell: {
        flex: 1,
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 12,
        color: '#555',
    },
    itemRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f7f7f7',
        alignItems: 'flex-start',
    },
    itemName: {
        fontSize: 14,
        color: '#333',
    },
    itemAddon: {
        fontSize: 12,
        color: '#777',
        marginLeft: 10, // Indent addons slightly
    },
    itemQuantity: {
        flex: 1,
        textAlign: 'center',
        fontSize: 14,
        color: '#555',
    },
    itemAmount: {
        flex: 1,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
    },
    summaryLabel: {
        fontSize: 15,
        color: '#555',
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#222',
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    balanceLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#D32F2F', // Red for balance due
    },
    balanceValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#D32F2F',
    },
    paymentHistorySection: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    paymentHistoryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#444',
    },
    paymentHistoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f5f5f5',
    },
    paymentHistoryText: {
        fontSize: 13,
        color: '#666',
        flex: 2,
    },
    paymentHistoryMethod: {
        fontSize: 13,
        color: '#666',
        flex: 1.5,
        textAlign: 'center',
        textTransform: 'capitalize',
    },
    paymentHistoryAmount: {
        fontSize: 13,
        fontWeight: '500',
        color: '#333',
        flex: 1,
        textAlign: 'right',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 25,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 15,
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 100, // Ensure buttons have a reasonable minimum width
    },
    recordPaymentButton: {
        backgroundColor: '#18a54a', // Green for recording payment
    },
    shareButton: {
        backgroundColor: '#007BFF', // Blue for share
        marginLeft: 10, // Space between buttons
    },
    closeModalButton: {
		backgroundColor: '#e0e0e0', // Light gray for close
		paddingHorizontal: 3,
		minWidth: 60
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    closeButtonText: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 15,
    },
    rightActionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        flex: 1, // Allows them to take up remaining space
    },

    // Payment Modal Styles
    paymentModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    paymentModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 16,
        marginBottom: 8,
        color: '#333',
        fontWeight: '500',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd', // Lighter border
        padding: 12,
        borderRadius: 8, // More rounded corners
        fontSize: 16,
        color: '#333',
    },
    paymentMethodContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 20,
    },
    paymentMethodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderWidth: 2, // Thicker border for selection
        borderColor: '#e0e0e0', // Default light gray border
        borderRadius: 10,
        width: '48%',
    },
    selectedPaymentMethod: {
        borderColor: '#18a54a', // Green border when selected
        backgroundColor: '#e6f7ed', // Light green background when selected
    },
    paymentMethodText: {
        fontSize: 15,
        marginLeft: 10,
        color: '#333',
        fontWeight: '500',
    },
    circle: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#ccc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedCircle: {
        borderColor: '#18a54a',
    },
    circleInner: {
        height: 10,
        width: 10,
        borderRadius: 5,
        backgroundColor: '#18a54a',
    },
    recordPaymentSubmitButton: {
        backgroundColor: '#18a54a',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    recordPaymentSubmitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default SalesTable;