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
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import { AuthContext } from '@/context/AuthContext';
import PlaceholderLogo from './PlaceholderLogo';
import Ionicons from '@expo/vector-icons/Ionicons';
import axiosInstance from '@/utils/axiosInstance';
import { router } from 'expo-router';

const SalesTable = ({
	invoices,
	userInfo,
	fetchOrders,
}) => {
	const { sendPushNotification } = useContext(AuthContext);
	const [selectedInvoice, setSelectedInvoice] =
		useState(null);
	const [isModalVisible, setModalVisible] = useState(false);
	const [isPaymentModalVisible, setPaymentModalVisible] =
		useState(false);
	const invoiceRef = useRef();
	const [invoiceLoading, setInvoiceLoading] =
		useState(false);
	const [paymentLoading, setPaymentLoading] =
		useState(false); // New loading state for payment
	const [amountPaid, setAmountPaid] = useState(''); // Changed to string for TextInput
	const [selectedMethod, setSelectedMethod] =
		useState('transfer');

	const openModal = (invoice) => {
		setSelectedInvoice(invoice);
		setModalVisible(true);
	};

	const openPaymentModal = () => {
		if (!selectedInvoice) return; // Ensure an invoice is selected
		const total = selectedInvoice.totalAmount || 0;
		const paid = selectedInvoice.paidAmount || selectedInvoice.amountPaid || 0;
		const balance = total - paid;
		setAmountPaid(
			balance > 0 ? balance.toString() : ''
		); // Pre-fill with balance or empty
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
		const options = {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		};
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
		if (
			!selectedInvoice ||
			!amountPaid ||
			parseFloat(amountPaid) <= 0
		) {
			ToastAndroid.show(
				'Please enter a valid amount.',
				ToastAndroid.SHORT,
			);
			return;
		}

		Alert.alert(
			'Confirm Payment',
			`Are you sure you want to record a payment of ₦${parseFloat(
				amountPaid,
			).toLocaleString()} via ${selectedMethod}?`,
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
								ToastAndroid.show(
									'Payment recorded successfully!',
									ToastAndroid.LONG,
								);
								closePaymentModal();
								closeModal(); // Close invoice detail modal too
								fetchOrders(); // Refresh orders
							} else {
								ToastAndroid.show(
									'Failed to record payment',
									ToastAndroid.LONG,
								);
							}
						} catch (error) {
							console.error(
								'Error recording payment:',
								error.response?.data || error.message,
							);
							ToastAndroid.show(
								`Failed to record payment: ${error.response?.data?.message ||
								'Something went wrong'
								}`,
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

	/*
	 * Build a receipt HTML for the selected invoice
	 */
	const buildReceiptHtml = (invoice) => {
		const storeName = (userInfo?.name || '').replace(/&/g, '&amp;');
		const storeAddress = userInfo?.address || '';
		const storePhone = userInfo?.phone || '';
		const logoUrl = userInfo?.logoUrl || '';

		const invoiceNumber = invoice?.orderNumber || (invoice?._id ? `#${String(invoice._id).slice(-6)}` : '—');
		const issueDate = formatDateTime(invoice?.createdAt || new Date());
		const customerName = invoice?.customerInfo?.name || 'Customer';

		// Calculate total paid
		const paidAmount = invoice.paidAmount || invoice.amountPaid ||
			((invoice.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0));

		// Determine payment method from last payment or 'Multiple'
		const lastPayment = (invoice.payments && invoice.payments.length > 0)
			? invoice.payments[invoice.payments.length - 1]
			: null;
		const paymentMethod = lastPayment?.method || invoice?.payment?.method || (invoice?.payment?.status === 'paid' ? 'Cash' : '—');

		const logoHtml = logoUrl
			? `<img src="${logoUrl}" alt="logo" style="height:50px;width:auto;object-fit:contain;" />`
			: `<div style="height:50px;width:50px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#F3F4F6;color:#6B7280;font-weight:700;font-size:9px;">NO LOGO</div>`;

		return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Receipt ${invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; color: #1F2937; margin: 0; padding: 40px; background: #fff; }
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 60px;
          color: rgba(0, 0, 0, 0.03);
          font-weight: 800;
          white-space: nowrap;
          pointer-events: none;
          z-index: -1;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 32px;
        }
        .header { text-align: center; margin-bottom: 32px; }
        .success-icon { 
          font-size: 48px; 
          color: #059669; 
          margin-bottom: 16px; 
          display: block;
        }
        .receipt-title { font-size: 24px; font-weight: 800; color: #111827; }
        .receipt-subtitle { color: #6B7280; font-size: 14px; margin-top: 4px; }
        
        .amount-box {
          text-align: center;
          margin-bottom: 32px;
          padding: 24px;
          background: #F9FAFB;
          border-radius: 8px;
        }
        .amount-label { font-size: 12px; text-transform: uppercase; color: #6B7280; font-weight: 600; letter-spacing: 0.5px; }
        .amount-value { font-size: 36px; font-weight: 800; color: #111827; margin-top: 8px; }

        .details-grid {
          display: grid;
          gap: 16px;
          margin-bottom: 32px;
        }
        .row { display: flex; justify-content: space-between; font-size: 14px; padding-bottom: 12px; border-bottom: 1px solid #F3F4F6; }
        .label { color: #6B7280; }
        .value { color: #111827; font-weight: 500; }
        
        .store-info { text-align: center; padding-top: 24px; border-top: 1px dashed #E5E7EB; }
        .store-name { font-weight: 700; color: #111827; }
        .store-addr { font-size: 13px; color: #6B7280; margin-top: 4px; }

        .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #9CA3AF; }
      </style>
    </head>
    <body>
      <div class="watermark">TRADEET BUSINESS</div>
      <div class="container">
        <div class="header">
          <div class="success-icon">✓</div>
          <div class="receipt-title">Payment Receipt</div>
          <div class="receipt-subtitle">Order #${invoiceNumber}</div>
        </div>

        <div class="amount-box">
          <div class="amount-label">Total Paid</div>
          <div class="amount-value">₦${Number(paidAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
        </div>

        <div class="details-grid">
           <div class="row">
            <span class="label">Date</span>
            <span class="value">${issueDate}</span>
          </div>
          <div class="row">
            <span class="label">Payment Method</span>
            <span class="value" style="text-transform: capitalize;">${paymentMethod}</span>
          </div>
          <div class="row">
            <span class="label">Billed To</span>
            <span class="value">${customerName}</span>
          </div>
        </div>
        
        <div class="store-info">
          <div style="margin-bottom: 12px;">${logoHtml}</div>
          <div class="store-name">${storeName}</div>
          <div class="store-addr">${storeAddress}</div>
          <div class="store-addr">${storePhone}</div>
        </div>

        <div class="footer">Powered by <b>Tradeet Business</b></div>
      </div>
    </body>
    </html>
  `;
	};

	const handleShareReceipt = async () => {
		try {
			setInvoiceLoading(true);
			const html = buildReceiptHtml(selectedInvoice);
			const { uri } = await Print.printToFileAsync({
				html,
				base64: false
			});
			await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
		} catch (error) {
			console.error('Error sharing receipt:', error);
			Alert.alert('Error', 'Failed to generate receipt.');
		} finally {
			setInvoiceLoading(false);
		}
	};

	const getPaymentStatusStyle = (status) => {
		const s = (status || '').toLowerCase();
		switch (s) {
			case 'completed':
			case 'paid':
				return styles.statusCompleted;
			case 'partial':
				return styles.statusPartial;
			case 'pending':
				return styles.statusPending;
			case 'failed':
			case 'cancelled':
				return { backgroundColor: '#EF4444' };
			default:
				return { backgroundColor: '#9CA3AF' }; // Grey for unknown
		}
	};

	const renderItem = ({ item, index }) => (
		<TouchableOpacity
			style={[
				styles.row,
				index % 2 === 0 ? styles.evenRow : styles.oddRow,
			]}
			onPress={() => openModal(item)}
		>
			{/* Order # & Date */}
			<View style={[styles.cell, { flex: 0.8, alignItems: 'flex-start' }]}>
				<Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
					#{item.orderNumber || String(item._id).slice(-6)}
				</Text>
				<Text style={{ fontSize: 11, color: '#9CA3AF' }}>
					{formatDate(item.createdAt)}
				</Text>
			</View>

			{/* Customer */}
			<View style={[styles.cell, { flex: 1.2, alignItems: 'flex-start' }]}>
				<Text style={{ fontSize: 13, color: '#111827', fontWeight: '500' }} numberOfLines={1}>
					{item.customerInfo?.name || 'Walk-in'}
				</Text>
			</View>

			{/* Amount */}
			<View style={[styles.cell, { flex: 1, alignItems: 'flex-end', paddingRight: 8 }]}>
				<Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
					₦{item.totalAmount?.toLocaleString()}
				</Text>
				{/* Show balance if not paid */}
				{item.payment?.status !== 'paid' && (
					<Text style={{ fontSize: 10, color: '#EF4444' }}>
						Bal: ₦{((item.totalAmount || 0) - (item.paidAmount || item.amountPaid || 0)).toLocaleString()}
					</Text>
				)}
			</View>

			{/* Status */}
			<View style={[styles.statusCellContainer, { flex: 0.8 }]}>
				<Text
					style={[
						styles.statusBadge,
						getPaymentStatusStyle(item?.payment?.status || item.status),
						{ fontSize: 9, paddingHorizontal: 6, minWidth: 60 }
					]}
				>
					{item?.payment?.status || item.status}
				</Text>
			</View>
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			{/* Table Header */}
			<View style={styles.header}>
				<Text style={[styles.headerCell, { flex: 0.8, textAlign: 'left' }]}>Order #</Text>
				<Text style={[styles.headerCell, { flex: 1.2, textAlign: 'left' }]}>Customer</Text>
				<Text style={[styles.headerCell, { flex: 1, textAlign: 'right', paddingRight: 8 }]}>Amount</Text>
				<Text style={[styles.headerCell, { flex: 0.8 }]}>Status</Text>
			</View>

			{/* Table Body */}
			<FlatList
				data={invoices}
				renderItem={renderItem}
				keyExtractor={(item) => item._id}
				ListEmptyComponent={() => (
					<View style={{ padding: 40, alignItems: 'center' }}>
						<Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
						<Text style={styles.emptyListText}>No sales records found.</Text>
					</View>
				)}
				contentContainerStyle={{ paddingBottom: 20 }}
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
							<Text style={styles.watermarkText}>
								TRADEET BUSINESS
							</Text>

							<ScrollView // Allow content to scroll if it overflows
								style={styles.invoiceDetailScroll}
								contentContainerStyle={
									styles.invoiceDetailContent
								}
								ref={invoiceRef} // Ref for screenshot
							>
								{(() => {
									const isPaid = (selectedInvoice?.payment?.status || '').toLowerCase() === 'paid' ||
										(selectedInvoice?.status || '').toLowerCase() === 'completed';
									const docTitle = isPaid ? 'Payment Receipt' : 'Invoice';
									const docLabel = isPaid ? 'Receipt #' : 'Invoice #';

									const paidAmount = selectedInvoice?.paidAmount || selectedInvoice?.amountPaid || 0;
									const totalAmount = selectedInvoice?.totalAmount || 0;
									const balance = totalAmount - paidAmount;

									return (
										<>
											{/* Header Section */}
											<View style={styles.invoiceHeaderSection}>
												<View>
													<Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
														{docTitle}
													</Text>
													<Text style={styles.invoiceId}>
														{docLabel} {selectedInvoice?.orderNumber || String(selectedInvoice._id).slice(-6)}
													</Text>
													<Text style={styles.invoiceDate}>
														{formatDate(selectedInvoice?.createdAt)}
													</Text>
													<View style={{ marginTop: 8 }}>
														<Text
															style={[
																styles.statusBadge,
																getPaymentStatusStyle(selectedInvoice?.payment?.status),
																styles.modalStatusBadge,
																{ alignSelf: 'flex-start' }
															]}
														>
															{selectedInvoice?.payment?.status || 'Pending'}
														</Text>
													</View>
												</View>

												<View style={styles.storeInfo}>
													{userInfo?.logoUrl ? (
														<Image
															source={{ uri: userInfo.logoUrl }}
															style={styles.storeLogo}
														/>
													) : (
														<PlaceholderLogo name={userInfo?.name} />
													)}
													<Text style={styles.storeName}>{userInfo?.name}</Text>
													<Text style={styles.storeContact}>{userInfo?.address}</Text>
													<Text style={styles.storeContact}>{userInfo?.phone}</Text>
													{userInfo?.tin && (
														<Text style={styles.storeContact}>TIN: {userInfo.tin}</Text>
													)}
												</View>
											</View>

											{/* Billed To */}
											<View style={styles.billedToSection}>
												<Text style={styles.sectionTitle}>Billed to:</Text>
												<Text style={styles.customerName}>
													{selectedInvoice?.customerInfo?.name || 'Walk-in Customer'}
												</Text>
												{selectedInvoice?.customerInfo?.phone && (
													<Text style={styles.customerContact}>
														{selectedInvoice.customerInfo.phone}
													</Text>
												)}
												{selectedInvoice?.customerInfo?.address && (
													<Text style={styles.customerContact}>
														{selectedInvoice.customerInfo.address}
													</Text>
												)}
											</View>

											{/* Items Table */}
											<View style={{ marginTop: 24 }}>
												<Text style={styles.sectionTitle}>Details</Text>
												<View style={[styles.itemsHeader, { borderBottomWidth: 1, borderColor: '#E5E7EB', paddingBottom: 8 }]}>
													<Text style={[styles.itemHeaderCell, { flex: 3, textAlign: 'left' }]}>Item</Text>
													<Text style={[styles.itemHeaderCell, { flex: 0.8 }]}>Qty</Text>
													<Text style={[styles.itemHeaderCell, { flex: 1.2 }]}>Amount</Text>
												</View>

												{selectedInvoice?.items?.map((item, index) => (
													<View key={index} style={[styles.itemRow, { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 12 }]}>
														<View style={{ flex: 3 }}>
															<Text style={[styles.itemName, { fontWeight: '500', color: '#1F2937' }]}>
																{item?.name || item?.product}
															</Text>
															{item?.addOns?.map((addon, idx) => (
																<Text key={idx} style={styles.itemAddon}>
																	+ {addon.name} (x{addon.quantity})
																</Text>
															))}
														</View>
														<Text style={[styles.itemQuantity, { flex: 0.8 }]}>{item?.quantity}</Text>
														<Text style={[styles.itemAmount, { flex: 1.2, fontWeight: '600', color: '#111827' }]}>
															₦{(item?.total || item?.totalPrice || 0).toLocaleString()}
														</Text>
													</View>
												))}
											</View>

											{/* Totals */}
											<View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
												<View style={styles.summaryRow}>
													<Text style={styles.summaryLabel}>Sub-total</Text>
													<Text style={styles.summaryValue}>₦{(selectedInvoice?.itemsAmount || 0).toLocaleString()}</Text>
												</View>

												{selectedInvoice?.taxAmount > 0 && (
													<View style={styles.summaryRow}>
														<Text style={styles.summaryLabel}>Tax</Text>
														<Text style={styles.summaryValue}>₦{selectedInvoice.taxAmount.toLocaleString()}</Text>
													</View>
												)}

												<View style={[styles.totalRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
													<Text style={styles.totalLabel}>Total</Text>
													<Text style={styles.totalValue}>₦{totalAmount.toLocaleString()}</Text>
												</View>

												{/* Paid Amount */}
												{(paidAmount > 0 || isPaid) && (
													<View style={styles.balanceRow}>
														<Text style={[styles.balanceLabel, { color: '#059669' }]}>Amount Paid</Text>
														<Text style={[styles.balanceValue, { color: '#059669' }]}>
															₦{paidAmount.toLocaleString()}
														</Text>
													</View>
												)}

												{/* Balance Due (only if pending/partial) */}
												{balance > 0 && !isPaid && (
													<View style={styles.balanceRow}>
														<Text style={[styles.balanceLabel, { color: '#DC2626' }]}>Balance Due</Text>
														<Text style={[styles.balanceValue, { color: '#DC2626' }]}>
															₦{balance.toLocaleString()}
														</Text>
													</View>
												)}
											</View>

											{/* Payment History */}
											{selectedInvoice?.payments?.length > 0 && (
												<View style={styles.paymentHistorySection}>
													<Text style={styles.paymentHistoryTitle}>Payment History</Text>
													{selectedInvoice.payments.map((payment, index) => (
														<View key={index} style={styles.paymentHistoryItem}>
															<Text style={styles.paymentHistoryText}>{formatDateTime(payment.date)}</Text>
															<Text style={styles.paymentHistoryMethod}>{payment.method || payment.provider}</Text>
															<Text style={styles.paymentHistoryAmount}>₦{payment.amount.toLocaleString()}</Text>
														</View>
													))}
												</View>
											)}

											{/* Bank Info (only if unpaid) */}
											{!isPaid && (
												<View style={{ marginTop: 20, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 8 }}>
													<Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>
														Payment Details
													</Text>
													<Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
														{userInfo?.paymentInfo?.[0]?.bankName || 'Bank Name'}
													</Text>
													<Text style={{ fontSize: 14, color: '#4B5563' }}>
														{userInfo?.paymentInfo?.[0]?.accountNumber || '0000000000'}
													</Text>
													<Text style={{ fontSize: 14, color: '#4B5563' }}>
														{userInfo?.paymentInfo?.[0]?.accountName || 'Account Name'}
													</Text>
												</View>
											)}
										</>
									);
								})()}
								<Text style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#9CA3AF' }}>
									Powered by Tradeet Business
								</Text>
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
										onPress={handleShareReceipt}
										disabled={invoiceLoading}
									>
										{invoiceLoading ? (
											<ActivityIndicator color="#fff" />
										) : (
											<Text style={styles.actionButtonText}>
												Share Receipt
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
								<View style={styles.paymentMethodContainer}>
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
												<View style={styles.circleInner} />
											)}
										</View>
										<Text style={styles.paymentMethodText}>
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
												<View style={styles.circleInner} />
											)}
										</View>
										<Text style={styles.paymentMethodText}>
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
	container: { flex: 1, backgroundColor: '#F9FAFB' },
	header: {
		flexDirection: 'row',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
		backgroundColor: '#F9FAFB',
	},
	headerCell: {
		fontSize: 12,
		fontWeight: '600',
		color: '#6B7280',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	row: {
		flexDirection: 'row',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
		alignItems: 'center',
	},
	evenRow: { backgroundColor: '#ffffff' },
	oddRow: { backgroundColor: '#F9FAFB' },
	cell: {
		fontSize: 13,
		color: '#374151',
	},
	statusCellContainer: {
		alignItems: 'flex-start',
	},
	statusBadge: {
		paddingVertical: 2,
		paddingHorizontal: 8,
		borderRadius: 12,
		overflow: 'hidden',
		fontSize: 11,
		fontWeight: '600',
		textAlign: 'center',
	},
	statusCompleted: {
		backgroundColor: '#ECFDF5',
		color: '#059669',
	},
	statusPending: {
		backgroundColor: '#FEF3C7',
		color: '#D97706',
	},
	statusPartial: {
		backgroundColor: '#DBEAFE',
		color: '#2563EB',
	},
	statusFailed: {
		backgroundColor: '#FEE2E2',
		color: '#DC2626'
	},
	emptyListText: {
		textAlign: 'center',
		marginTop: 20,
		fontSize: 15,
		color: '#6B7280',
	},

	// --- Modal Styles (Mirrored from InvoiceTable) ---
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		width: '100%',
		maxHeight: '100%',
		backgroundColor: '#fff',
		padding: 0,
		elevation: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
		height: '100%',
	},
	invoiceDetailScroll: {
		flexGrow: 1,
		width: '100%',
		backgroundColor: '#fff',
		paddingTop: 20,
		paddingHorizontal: 20,
	},
	invoiceDetailContent: { paddingBottom: 40 },
	invoiceHeaderSection: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 24,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
		paddingBottom: 20,
	},
	invoiceId: {
		fontSize: 22,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 4,
	},
	invoiceDate: {
		fontSize: 13,
		color: '#6B7280',
		marginTop: 4,
	},
	modalStatusBadge: {
		marginTop: 10,
		alignSelf: 'flex-start',
	},
	storeInfo: { alignItems: 'flex-end' },
	storeLogo: {
		width: 50,
		height: 50,
		borderRadius: 25,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		resizeMode: 'contain',
		backgroundColor: '#F9FAFB',
	},
	storeName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
		textAlign: 'right',
	},
	storeContact: {
		fontSize: 12,
		color: '#6B7280',
		textAlign: 'right',
		marginTop: 2,
	},
	billedToSection: {
		marginBottom: 24,
		paddingBottom: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '700',
		marginBottom: 8,
		color: '#9CA3AF',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	customerName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
		marginBottom: 4,
	},
	customerContact: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
	itemsHeader: {
		flexDirection: 'row',
		borderBottomWidth: 2,
		borderColor: '#E5E7EB',
		paddingBottom: 8,
		marginBottom: 10,
	},
	itemHeaderCell: {
		flex: 1,
		fontWeight: '700',
		textAlign: 'left',
		fontSize: 11,
		color: '#6B7280',
		textTransform: 'uppercase',
	},
	itemRow: {
		flexDirection: 'row',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
		alignItems: 'flex-start',
	},
	itemName: {
		fontSize: 13,
		color: '#1F2937',
		fontWeight: '500',
		lineHeight: 20,
	},
	itemAddon: {
		fontSize: 11,
		color: '#6B7280',
		marginTop: 2,
	},
	itemQuantity: {
		flex: 1,
		textAlign: 'left',
		fontSize: 13,
		color: '#4B5563',
	},
	itemAmount: {
		flex: 1,
		textAlign: 'left',
		fontSize: 13,
		fontWeight: '600',
		color: '#111827',
	},
	summaryRow: {
		flexDirection: 'row',
		paddingVertical: 6,
		paddingHorizontal: 0,
		justifyContent: 'space-between',
	},
	summaryLabel: {
		fontSize: 13,
		color: '#6B7280',
	},
	summaryValue: {
		fontSize: 13,
		fontWeight: '500',
		color: '#111827',
		textAlign: 'right',
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
	},
	totalLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	totalValue: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	balanceRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 8,
	},
	balanceLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#DC2626',
	},
	balanceValue: {
		fontSize: 14,
		fontWeight: '600',
		color: '#DC2626',
	},
	paymentHistorySection: {
		marginTop: 30,
		paddingTop: 20,
		borderTopWidth: 1,
		borderTopColor: '#F3F4F6',
	},
	paymentHistoryTitle: {
		fontSize: 13,
		fontWeight: '700',
		marginBottom: 12,
		color: '#374151',
		textTransform: 'uppercase',
	},
	paymentHistoryItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#F9FAFB',
	},
	paymentHistoryText: {
		fontSize: 12,
		color: '#6B7280',
		flex: 2,
	},
	paymentHistoryMethod: {
		fontSize: 12,
		color: '#374151',
		flex: 1.5,
		textAlign: 'center',
		textTransform: 'capitalize',
		fontWeight: '500',
	},
	paymentHistoryAmount: {
		fontSize: 12,
		fontWeight: '600',
		color: '#111827',
		flex: 1,
		textAlign: 'right',
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 0,
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		paddingTop: 16,
		paddingHorizontal: 16,
		paddingBottom: 24,
		backgroundColor: '#fff',
	},
	actionButton: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		minWidth: 100,
	},
	recordPaymentButton: { backgroundColor: '#059669' },
	shareButton: {
		backgroundColor: '#2563EB',
		marginLeft: 12,
	},
	closeModalButton: {
		backgroundColor: '#F3F4F6',
		paddingHorizontal: 16,
		minWidth: 80,
	},
	actionButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 14,
	},
	closeButtonText: {
		color: '#374151',
		fontWeight: '600',
		fontSize: 14,
	},
	rightActionButtons: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		flex: 1,
	},

	// Payment modal
	paymentModalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
	},
	paymentModalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
	inputGroup: { marginBottom: 20 },
	inputLabel: {
		fontSize: 14,
		marginBottom: 8,
		color: '#374151',
		fontWeight: '500',
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#D1D5DB',
		padding: 12,
		borderRadius: 8,
		fontSize: 15,
		color: '#111827',
		backgroundColor: '#fff',
	},
	paymentMethodContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 8,
		marginBottom: 24,
		gap: 12,
	},
	paymentMethodButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 8,
		flex: 1,
		backgroundColor: '#fff',
	},
	selectedPaymentMethod: {
		borderColor: '#059669',
		backgroundColor: '#ECFDF5',
	},
	paymentMethodText: {
		fontSize: 14,
		marginLeft: 8,
		color: '#374151',
		fontWeight: '500',
	},
	circle: {
		height: 18,
		width: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: '#D1D5DB',
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedCircle: { borderColor: '#059669' },
	circleInner: {
		height: 9,
		width: 9,
		borderRadius: 4.5,
		backgroundColor: '#059669',
	},
	recordPaymentSubmitButton: {
		backgroundColor: '#059669',
		paddingVertical: 14,
		borderRadius: 10,
		alignItems: 'center',
		marginTop: 8,
	},
	recordPaymentSubmitButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 15,
	},
	watermarkText: {
		position: 'absolute',
		top: '40%',
		left: '10%',
		right: '10%',
		textAlign: 'center',
		fontSize: 40,
		fontWeight: '800',
		color: 'rgba(0, 0, 0, 0.02)',
		transform: [{ rotate: '-45deg' }],
		zIndex: 0,
		textTransform: 'uppercase',
	},
	formSection: { marginBottom: 20 },
	paymentMethodChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
	paymentMethodChipActive: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
	paymentMethodTextActive: { color: '#065637', fontWeight: '600' },
	paymentMethodOptions: { flexDirection: 'row', gap: 8 },
	paymentMethodLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 8 },
});

export default SalesTable;
