// components/InvoiceTable.jsx
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
	ScrollView,
	ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { AuthContext } from '@/context/AuthContext';
import PlaceholderLogo from './PlaceholderLogo';
import Ionicons from '@expo/vector-icons/Ionicons';
import axiosInstance from '@/utils/axiosInstance';

const InvoiceTable = ({
	invoices = [],
	userInfo = {},
	selectedStore = null,
	fetchOrders,
}) => {
	const { sendPushNotification } = useContext(AuthContext);

	const [selectedInvoice, setSelectedInvoice] =
		useState(null);
	const [isModalVisible, setModalVisible] = useState(false);
	const [isPaymentModalVisible, setPaymentModalVisible] =
		useState(false);
	const invoiceRef = useRef(null);
	const [invoiceLoading, setInvoiceLoading] =
		useState(false);
	const [paymentLoading, setPaymentLoading] =
		useState(false);
	const [amountPaid, setAmountPaid] = useState(''); // string for TextInput
	const [selectedMethod, setSelectedMethod] =
		useState('transfer');

	// choose primary account from selectedStore.paymentInfo or fallback to userInfo.paymentInfo
	const allAccounts =
		selectedStore?.paymentInfo?.length > 0
			? selectedStore.paymentInfo
			: userInfo?.paymentInfo ?? [];
	const primaryAccount =
		allAccounts.find((a) => a.isPrimary) ||
		allAccounts[0] ||
		null;

	function formatAccountNumber(acct = '') {
		const s = String(acct || '');
		return s
			.replace(/\D/g, '')
			.replace(/(\d{4})(?=\d)/g, '$1 ');
	}

	function formatDate(dateString) {
		if (!dateString) return '';
		const date = new Date(dateString);
		const options = {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		};
		return date.toLocaleDateString('en-US', options);
	}

	function formatDateTime(dateString) {
		if (!dateString) return '';
		const date = new Date(dateString);
		return date.toLocaleString('en-US', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true,
		});
	}

	const openModal = (invoice) => {
		setSelectedInvoice(invoice);
		setModalVisible(true);
	};

	const closeModal = () => {
		setSelectedInvoice(null);
		setModalVisible(false);
	};

	const openPaymentModal = () => {
		if (!selectedInvoice) return;
		const outstanding =
			typeof selectedInvoice.outstandingAmount === 'number'
				? selectedInvoice.outstandingAmount
				: Math.max(
						0,
						(selectedInvoice.totalAmount || 0) -
							(selectedInvoice.paidAmount || 0),
				  );
		setAmountPaid(
			outstanding > 0 ? String(outstanding) : '',
		);
		setPaymentModalVisible(true);
	};

	const closePaymentModal = () => {
		setPaymentModalVisible(false);
		setAmountPaid('');
	};

	/**
	 * Build an invoice HTML for PDF (used when sharing invoice)
	 */
	function buildInvoiceHtml(invoice) {
		const store = selectedStore || userInfo || {};
		const logoUrl = store.logoUrl || '';
		const invoiceNumber =
			invoice.invoiceNumber ||
			`#${String(invoice._id).slice(-6)}`;
		const issuedAt = formatDate(
			invoice.issuedAt || invoice.createdAt || new Date(),
		);
		const customer = invoice.customerInfo || {};
		const lines = invoice.lines || [];
		const subTotal = Number(
			invoice.subTotal ?? invoice.itemsAmount ?? 0,
		);
		const taxPercent = Number(invoice.taxPercent || 0);
		const taxAmount = Number(invoice.taxAmount || 0);
		const deliveryFee = Number(invoice.deliveryFee || 0);
		const serviceFee = Number(invoice.serviceFee || 0);
		const total = Number(invoice.totalAmount || 0);
		// Sum all payments in the payments array
		const paidAmount = (invoice.payments || []).reduce(
			(sum, payment) => sum + Number(payment.amount || 0),
			0,
		);
		const outstanding = Number(
			invoice.outstandingAmount ?? 0,
		); // Use outstandingAmount directly
		const payment = primaryAccount || {};

		const rowsHtml = lines
			.map((l) => {
				const desc = (l.description || '')
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
				const qty = l.quantity ?? 1;
				const unit = Number(l.unitPrice ?? 0).toFixed(2);
				const lineTotal = Number(
					l.total ?? (l.unitPrice || 0) * (l.quantity || 1),
				).toFixed(2);
				return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e6e8eb;color:#333;"><pre>${desc}</pre></td>
          <td style="padding:10px;border-bottom:1px solid #e6e8eb;text-align:center;color:#333;">${qty}</td>
          <td style="padding:10px;border-bottom:1px solid #e6e8eb;text-align:right;color:#333;">₦${Number(
						unit,
					).toLocaleString()}</td>
          <td style="padding:10px;border-bottom:1px solid #e6e8eb;text-align:right;color:#333;">₦${Number(
						lineTotal,
					).toLocaleString()}</td>
        </tr>
      `;
			})
			.join('');

		const logoHtml = logoUrl
			? `<img src="${logoUrl}" alt="logo" style="max-width:140px;max-height:70px;object-fit:contain;" />`
			: `<div style="width:140px;height:70px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#f0f2f5;color:#6b7280;font-weight:600;">No logo</div>`;

		const paymentStatusHtml = `
    <div style="margin-top:12px;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;">
        <span style="color:#6b7280;">Paid to Date:</span>
        <span style="font-weight:600;color:#333;">₦${Number(
					paidAmount,
				).toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;">
        <span style="color:#6b7280;">Outstanding Balance:</span>
        <span style="font-weight:600;color:${
					outstanding > 0 ? '#dc2626' : '#16a34a'
				};">₦${Number(outstanding).toLocaleString()}</span>
      </div>
    </div>
  `;

		const html = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Invoice ${invoiceNumber}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#1f2937; margin:0; padding:20px; background:#f9fafb; }
        .container { max-width:800px; margin:0 auto; background:#ffffff; padding:24px; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.05); }
        .header { display:flex; justify-content:space-between; align-items:center; padding-bottom:20px; border-bottom:2px solid #e6e8eb; }
        .store h2 { margin:0; font-size:22px; color:#1f2937; font-weight:600; }
        .meta { margin-top:4px; color:#6b7280; font-size:13px; line-height:1.5; }
        .section { margin:20px 0; }
        .customer { background:#f9fafb; padding:12px; border-radius:8px; border:1px solid #e6e8eb; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th { background:#f3f4f6; padding:12px; text-align:left; font-size:13px; font-weight:600; color:#374151; border-bottom:2px solid #e6e8eb; }
        td { padding:10px; font-size:13px; color:#333; }
        .payment-block { margin-top:20px; padding:16px; background:#f0fdf4; border-radius:8px; border:1px solid #dcfce7; }
        .footer { margin-top:24px; text-align:center; color:#9ca3af; font-size:12px; border-top:1px solid #e6e8eb; padding-top:16px; }
        .status { font-size:12px; font-weight:600; color:#fff; padding:6px 12px; border-radius:12px; display:inline-block; }
        .status-paid { background:#16a34a; }
        .status-partial { background:#f59e0b; }
        .status-pending { background:#dc2626; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${logoHtml}</div>
          <div class="store">
            <h2>${(store.name || '').replace(
							/&/g,
							'&amp;',
						)}</h2>
            <div class="meta">${store.address || ''}</div>
            <div class="meta">Phone: ${
							store.phone || ''
						}</div>
            <div class="meta">Invoice: ${invoiceNumber}</div>
            <div class="meta">Issued: ${issuedAt}</div>
            <span class="status status-${
							invoice.status === 'paid'
								? 'paid'
								: invoice.status === 'partial'
								? 'partial'
								: 'pending'
						}">${(
			invoice.status || 'pending'
		).toUpperCase()}</span>
          </div>
        </div>

        <div class="section">
          <div style="display:flex;gap:24px;">
            <div style="flex:1;">
              <strong style="font-size:15px;color:#374151;">Billed to</strong>
              <div class="customer" style="margin-top:8px;">
                <div style="font-weight:600;color:#1f2937;">${
									customer.name || 'Customer'
								}</div>
                <div style="color:#6b7280;margin-top:4px;">${
									customer.contact || ''
								}</div>
                <div style="color:#6b7280;margin-top:4px;">${
									customer.address || ''
								}</div>
              </div>
            </div>
            <div style="width:240px;">
              <strong style="font-size:15px;color:#374151;">Summary</strong>
              <div style="margin-top:8px;color:#1f2937;">
                <div style="display:flex;justify-content:space-between;padding:8px 0;">
                  <span>Subtotal:</span>
                  <span>₦${Number(
										subTotal,
									).toLocaleString()}</span>
                </div>
                ${
									taxAmount > 0
										? `<div style="display:flex;justify-content:space-between;padding:8px 0;">
                         <span>Tax (${taxPercent}%):</span>
                         <span>₦${Number(
														taxAmount,
													).toLocaleString()}</span>
                       </div>`
										: ''
								}
                ${
									deliveryFee > 0
										? `<div style="display:flex;justify-content:space-between;padding:8px 0;">
                         <span>Delivery:</span>
                         <span>₦${Number(
														deliveryFee,
													).toLocaleString()}</span>
                       </div>`
										: ''
								}
                ${
									serviceFee > 0
										? `<div style="display:flex;justify-content:space-between;padding:8px 0;">
                         <span>Service:</span>
                         <span>₦${Number(
														serviceFee,
													).toLocaleString()}</span>
                       </div>`
										: ''
								}
                <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:600;border-top:1px solid #e6e8eb;margin-top:8px;">
                  <span>Total:</span>
                  <span>₦${Number(
										total,
									).toLocaleString()}</span>
                </div>
                ${
									paidAmount > 0 || outstanding > 0
										? paymentStatusHtml
										: ''
								}
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <table>
            <thead>
              <tr>
                <th style="width:50%;">Description</th>
                <th style="width:15%;text-align:center;">Qty</th>
                <th style="width:20%;text-align:right;">Unit</th>
                <th style="width:15%;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        ${
					payment && outstanding > 0
						? `
        <div class="payment-block">
          <strong style="font-size:15px;color:#374151;">Payment Details</strong>
          <div style="margin-top:8px;color:#1f2937;">
            <div><strong>Bank:</strong> ${
							payment.bankName || '—'
						}</div>
            <div><strong>Account Name:</strong> ${
							payment.accountName || '—'
						}</div>
            <div><strong>Account Number:</strong> ${
							payment.accountNumber || '—'
						}</div>
          </div>
          <div style="margin-top:12px;color:#6b7280;font-size:13px;">
            Please include invoice number (${invoiceNumber}) in your payment reference.
          </div>
        </div>
        `
						: ''
				}

        <div class="footer">
          Powered by <span style="color:#2563eb;font-weight:600;">Tradeet Business</span>
        </div>
      </div>
    </body>
    </html>
  `;
		return html;
	}

	/**
	 * Build a receipt HTML for a payment (looks professional and compact)
	 * Accepts updatedInvoice (preferred) or falls back to invoice + paymentData
	 */
	function buildReceiptHtml({
		invoice = null,
		payment = {},
	}) {
		const store = selectedStore || userInfo || {};
		const logoUrl = store.logoUrl || '';
		const invoiceNumber =
			(invoice &&
				(invoice.invoiceNumber ||
					`#${String(invoice._id).slice(-6)}`)) ||
			payment.invoiceNumber ||
			'—';
		const issueDate = payment.date
			? formatDateTime(payment.date)
			: formatDateTime(new Date().toISOString());
		const customer =
			invoice?.customerInfo || payment.customerInfo || {};
		const total = invoice?.totalAmount ?? 0;
		const paidNow = payment.amount ?? 0;
		// Sum all payments in the payments array
		const paidAmount = invoice
			? (invoice.payments || []).reduce(
					(sum, p) => sum + Number(p.amount || 0),
					0,
			  )
			: paidNow;
		const outstanding = invoice
			? Number(invoice.outstandingAmount ?? 0)
			: Math.max(0, total - paidNow);
		const paymentMethod =
			payment.method || payment.provider || 'manual';

		const logoHtml = logoUrl
			? `<img src="${logoUrl}" alt="logo" style="max-width:120px;max-height:60px;object-fit:contain;" />`
			: `<div style="width:120px;height:60px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#f0f2f5;color:#6b7280;font-weight:600;">No logo</div>`;

		const html = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Payment Receipt - ${invoiceNumber}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#1f2937; margin:0; padding:20px; background:#f9fafb; }
        .container { max-width:700px; margin:0 auto; background:#ffffff; padding:24px; border-radius:12px; box-shadow:0 2px 10px rgba(0,0,0,0.05); }
        .header { display:flex; justify-content:space-between; align-items:center; padding-bottom:16px; border-bottom:2px solid #e6e8eb; }
        h1 { margin:0; font-size:20px; font-weight:600; color:#1f2937; }
        .meta { color:#6b7280; font-size:13px; line-height:1.5; }
        .section { margin:16px 0; }
        .customer { background:#f9fafb; padding:12px; border-radius:8px; border:1px solid #e6e8eb; }
        .summary { border-top:1px solid #e6e8eb; padding-top:16px; margin-top:16px; }
        .row { display:flex; justify-content:space-between; padding:8px 0; font-size:14px; color:#1f2937; }
        .total { font-weight:600; font-size:15px; }
        .footer { margin-top:20px; text-align:center; color:#9ca3af; font-size:12px; border-top:1px solid #e6e8eb; padding-top:16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>${logoHtml}</div>
          <div style="text-align:right;">
            <h1>Payment Receipt</h1>
            <div class="meta">${issueDate}</div>
            <div class="meta">Invoice: ${invoiceNumber}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:16px;">
          <div>
            <div style="font-weight:600;font-size:15px;color:#1f2937;">${
							store.name || ''
						}</div>
            <div class="meta">${store.address || ''}</div>
            <div class="meta">${store.phone || ''}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:600;color:#1f2937;">Billed to</div>
            <div class="customer" style="margin-top:8px;">
              <div style="font-weight:600;color:#1f2937;">${
								customer.name || 'Customer'
							}</div>
              <div style="color:#6b7280;margin-top:4px;">${
								customer.contact || ''
							}</div>
              <div style="color:#6b7280;margin-top:4px;">${
								customer.address || ''
							}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div style="font-weight:600;font-size:15px;margin-bottom:8px;">Payment Details</div>
          <div class="row"><span>Amount Paid:</span><span>₦${Number(
						paidNow,
					).toLocaleString()}</span></div>
          <div class="row"><span>Method:</span><span style="text-transform:capitalize;">${paymentMethod}</span></div>
          <div class="row"><span>Reference:</span><span>${
						payment.id || '—'
					}</span></div>
          <div class="row"><span>Date:</span><span>${issueDate}</span></div>
        </div>

        <div class="summary">
          <div class="row"><span>Invoice Total:</span><span>₦${Number(
						total,
					).toLocaleString()}</span></div>
          <div class="row"><span>Paid to Date:</span><span>₦${Number(
						paidAmount,
					).toLocaleString()}</span></div>
          <div class="row total"><span>Outstanding:</span><span style="color:${
						outstanding > 0 ? '#dc2626' : '#16a34a'
					};">₦${Number(
			outstanding,
		).toLocaleString()}</span></div>
        </div>

        <div style="margin-top:12px;color:#6b7280;font-size:13px;">
          Thank you for your payment. This receipt confirms the payment recorded for the invoice referenced above.
        </div>

        <div class="footer">
          Powered by <span style="color:#2563eb;font-weight:600;">Tradeet Business</span>
        </div>
      </div>
    </body>
    </html>
  `;
		return html;
	}

	// share invoice PDF
	const handleShareInvoice = async () => {
		if (!selectedInvoice) {
			Alert.alert('No invoice selected');
			return;
		}

		try {
			setInvoiceLoading(true);

			// Check invoice status
			const isFullyPaid = selectedInvoice.status === 'paid';
			const isPartiallyPaid =
				selectedInvoice.status === 'partial' ||
				(selectedInvoice.paidAmount > 0 &&
					selectedInvoice.outstandingAmount > 0);

			if (isFullyPaid) {
				// For fully paid invoices, share the receipt with the latest payment
				const latestPayment = (
					selectedInvoice.payments || []
				).slice(-1)[0] || {
					amount: selectedInvoice.paidAmount || 0,
					method: 'manual',
					provider: 'manual',
					date: new Date().toISOString(),
				};
				await shareReceipt(selectedInvoice, latestPayment);
			} else if (isPartiallyPaid) {
				// For partially paid invoices, prompt user to choose between receipt and updated invoice
				Alert.alert(
					'Share Options',
					'Would you like to share the payment receipt or the updated invoice?',
					[
						{ text: 'Cancel', style: 'cancel' },
						{
							text: 'Receipt',
							onPress: async () => {
								const latestPayment = (
									selectedInvoice.payments || []
								).slice(-1)[0] || {
									amount: selectedInvoice.paidAmount || 0,
									method: 'manual',
									provider: 'manual',
									date: new Date().toISOString(),
								};
								await shareReceipt(
									selectedInvoice,
									latestPayment,
								);
							},
						},
						{
							text: 'Invoice',
							onPress: async () => {
								const html =
									buildInvoiceHtml(selectedInvoice);
								const { uri } =
									await Print.printToFileAsync({ html });
								await Sharing.shareAsync(uri, {
									mimeType: 'application/pdf',
									dialogTitle: `Invoice ${
										selectedInvoice.invoiceNumber || ''
									}`,
								});
								ToastAndroid.show(
									'Invoice shared',
									ToastAndroid.SHORT,
								);
							},
						},
					],
					{ cancelable: true },
				);
			} else {
				// For unpaid invoices, share the invoice
				const html = buildInvoiceHtml(selectedInvoice);
				const { uri } = await Print.printToFileAsync({
					html,
				});
				await Sharing.shareAsync(uri, {
					mimeType: 'application/pdf',
					dialogTitle: `Invoice ${
						selectedInvoice.invoiceNumber || ''
					}`,
				});
				ToastAndroid.show(
					'Invoice shared',
					ToastAndroid.SHORT,
				);
			}
		} catch (error) {
			console.error('Error sharing document:', error);
			Alert.alert(
				'Error',
				'Failed to generate/share document.',
			);
		} finally {
			setInvoiceLoading(false);
		}
	};

	// share receipt PDF for a given invoice + payment info
	const shareReceipt = async (
		updatedInvoice,
		paymentRecord,
	) => {
		try {
			setInvoiceLoading(true);
			const html = buildReceiptHtml({
				invoice: updatedInvoice,
				payment: paymentRecord,
			});
			const { uri } = await Print.printToFileAsync({
				html,
			});
			await Sharing.shareAsync(uri, {
				mimeType: 'application/pdf',
				dialogTitle: `Receipt ${
					updatedInvoice?.invoiceNumber || ''
				}`,
			});
			ToastAndroid.show(
				'Receipt shared',
				ToastAndroid.SHORT,
			);
		} catch (err) {
			console.error('Error sharing receipt:', err);
			ToastAndroid.show(
				'Failed to share receipt',
				ToastAndroid.LONG,
			);
		} finally {
			setInvoiceLoading(false);
		}
	};

	// record payment, fetch updated invoice, then prompt share receipt
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
			`Record payment of ₦${parseFloat(
				amountPaid,
			).toLocaleString()} via ${selectedMethod}?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Record',
					onPress: async () => {
						setPaymentLoading(true);
						let paymentPayload = {
							amount: parseFloat(amountPaid),
							method: selectedMethod,
							provider: 'manual',
						};
						try {
							// POST payment
							const postRes = await axiosInstance.post(
								`/invoices/${selectedInvoice._id}/payments`,
								paymentPayload,
							);
							const createdPayment = postRes?.data
								?.payment || {
								id: postRes?.data?.id || undefined,
								amount: paymentPayload.amount,
								method: paymentPayload.method,
								provider: paymentPayload.provider,
								date: new Date().toISOString(),
							};

							// Fetch updated invoice
							let updatedInvoice = null;
							try {
								const invRes = await axiosInstance.get(
									`/invoices/${selectedInvoice._id}`,
								);
								updatedInvoice =
									invRes?.data?.invoice ??
									invRes?.data ??
									null;
							} catch (fetchErr) {
								console.warn(
									'Failed to fetch updated invoice, using local computation',
									fetchErr,
								);
								const localPaid =
									(selectedInvoice.paidAmount || 0) +
									paymentPayload.amount;
								updatedInvoice = {
									...selectedInvoice,
									paidAmount: localPaid,
									outstandingAmount: Math.max(
										0,
										(selectedInvoice.totalAmount || 0) -
											localPaid,
									),
									payments: [
										...(selectedInvoice.payments || []),
										createdPayment,
									],
									status:
										localPaid >=
										(selectedInvoice.totalAmount || 0)
											? 'paid'
											: 'partial',
								};
							}

							ToastAndroid.show(
								'Payment recorded successfully!',
								ToastAndroid.LONG,
							);
							closePaymentModal();

							// Refresh list/details in UI
							if (typeof fetchOrders === 'function')
								fetchOrders();

							// Update selectedInvoice to reflect new payment
							setSelectedInvoice(updatedInvoice);

							// Prompt to share receipt or invoice if partially paid
							if (updatedInvoice.status === 'paid') {
								await shareReceipt(
									updatedInvoice,
									createdPayment,
								);
							} else {
								Alert.alert(
									'Share Document',
									'Payment recorded. Would you like to share the receipt or the updated invoice?',
									[
										{ text: 'Cancel', style: 'cancel' },
										{
											text: 'Receipt',
											onPress: async () =>
												await shareReceipt(
													updatedInvoice,
													createdPayment,
												),
										},
										{
											text: 'Invoice',
											onPress: async () => {
												const html =
													buildInvoiceHtml(updatedInvoice);
												const { uri } =
													await Print.printToFileAsync({
														html,
													});
												await Sharing.shareAsync(uri, {
													mimeType: 'application/pdf',
													dialogTitle: `Invoice ${
														updatedInvoice.invoiceNumber ||
														''
													}`,
												});
												ToastAndroid.show(
													'Invoice shared',
													ToastAndroid.SHORT,
												);
											},
										},
									],
									{ cancelable: true },
								);
							}

							// Notify owner
							if (
								userInfo?.expoPushToken &&
								sendPushNotification
							) {
								try {
									await sendPushNotification(
										userInfo.expoPushToken,
										'Payment recorded',
										`A payment of ₦${paymentPayload.amount.toLocaleString()} was recorded for invoice ${
											updatedInvoice.invoiceNumber ||
											updatedInvoice._id
										}`,
										{
											type: 'payment_recorded',
											invoiceId: updatedInvoice._id,
										},
									);
								} catch (nerr) {
									console.warn(
										'Push notification failed',
										nerr,
									);
								}
							}
						} catch (err) {
							console.error(
								'Error recording payment:',
								err?.response?.data || err.message,
							);
							const msg =
								err.response?.data?.message ||
								'Failed to record payment';
							ToastAndroid.show(msg, ToastAndroid.LONG);
						} finally {
							setPaymentLoading(false);
						}
					},
				},
			],
			{ cancelable: true },
		);
	};

	const getPaymentStatusStyle = (status) => {
		switch (status) {
			case 'paid':
			case 'completed':
				return styles.statusCompleted;
			case 'issued':
			case 'partial':
				return styles.statusPartial;
			case 'draft':
			case 'pending':
			default:
				return styles.statusPending;
		}
	};

	const renderRow = ({ item, index }) => (
		<TouchableOpacity
			style={[
				styles.row,
				index % 2 === 0 ? styles.evenRow : styles.oddRow,
			]}
			onPress={() => openModal(item)}
		>
			<Text style={[styles.cell, { fontWeight: '500' }]}>
				{item.invoiceNumber
					? `#${item.invoiceNumber}`
					: `#${item._id.slice(-6)}`}
			</Text>
			<Text style={styles.cell}>
				₦{(item.totalAmount || 0).toLocaleString()}
			</Text>
			<Text style={styles.cell}>
				₦
				{(
					item.outstandingAmount ??
					Math.max(
						0,
						(item.totalAmount || 0) -
							(item.paidAmount || 0),
					)
				).toLocaleString()}
			</Text>
			<View style={styles.statusCellContainer}>
				<Text
					style={[
						styles.statusBadge,
						getPaymentStatusStyle(item.status),
					]}
				>
					{(item.status || 'unknown').toUpperCase()}
				</Text>
			</View>
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			{/* Table Header */}
			<View style={styles.header}>
				<Text style={styles.headerCell}>Invoice</Text>
				<Text style={styles.headerCell}>Amount</Text>
				<Text style={styles.headerCell}>Balance</Text>
				<Text style={styles.headerCell}>Status</Text>
			</View>

			{/* Table Body */}
			<FlatList
				data={invoices}
				renderItem={renderRow}
				keyExtractor={(item) => item._id}
				ListEmptyComponent={() => (
					<Text style={styles.emptyListText}>
						No invoices found.
					</Text>
				)}
			/>

			{/* Invoice Details Modal */}
			{selectedInvoice && (
				<Modal
					visible={isModalVisible}
					animationType="slide"
					transparent
					onRequestClose={closeModal}
				>
					<View style={styles.modalContainer}>
						<View style={styles.modalContent}>
							<ScrollView
								style={styles.invoiceDetailScroll}
								contentContainerStyle={
									styles.invoiceDetailContent
								}
								ref={invoiceRef}
							>
								{/* Header */}
								<View style={styles.invoiceHeaderSection}>
									<View>
										<Text style={styles.invoiceId}>
											{selectedInvoice.invoiceNumber ||
												`#${selectedInvoice._id.slice(-6)}`}
										</Text>
										<Text style={styles.invoiceDate}>
											{formatDate(
												selectedInvoice.createdAt,
											)}
										</Text>
										<Text
											style={[
												styles.statusBadge,
												getPaymentStatusStyle(
													selectedInvoice.status,
												),
												styles.modalStatusBadge,
											]}
										>
											{(
												selectedInvoice.status || 'N/A'
											).toUpperCase()}
										</Text>
									</View>

									<View style={styles.storeInfo}>
										{selectedStore?.logoUrl ? (
											<Image
												source={{
													uri: selectedStore.logoUrl,
												}}
												style={styles.storeLogo}
											/>
										) : (
											<PlaceholderLogo
												name={selectedStore?.name}
											/>
										)}
										<Text style={styles.storeName}>
											{selectedStore?.name}
										</Text>
										{selectedStore?.address ? (
											<Text style={styles.storeContact}>
												{selectedStore.address}
											</Text>
										) : null}
										{userInfo?.phone ? (
											<Text style={styles.storeContact}>
												{userInfo.phone}
											</Text>
										) : null}
									</View>
								</View>

								{/* Billed To */}
								<View style={styles.billedToSection}>
									<Text style={styles.sectionTitle}>
										Billed to:
									</Text>
									<Text style={styles.customerName}>
										{selectedInvoice.customerInfo?.name ||
											'Customer'}
									</Text>
									{selectedInvoice.customerInfo?.address ? (
										<Text style={styles.customerContact}>
											{selectedInvoice.customerInfo.address}
										</Text>
									) : null}
									{selectedInvoice.customerInfo?.contact ? (
										<Text style={styles.customerContact}>
											{selectedInvoice.customerInfo.contact}
										</Text>
									) : null}
								</View>

								{/* Lines */}
								<Text style={styles.sectionTitle}>
									Invoice Details
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

								{(selectedInvoice.lines || []).map(
									(line, idx) => (
										<View key={idx} style={styles.itemRow}>
											<View style={{ flex: 3 }}>
												<Text style={styles.itemName}>
													{line.description}
												</Text>
												{line.meta?.notes ? (
													<Text
														style={{
															fontSize: 12,
															color: '#333',
														}}
													>
														{line.meta.notes}
													</Text>
												) : null}
											</View>
											<Text style={styles.itemQuantity}>
												{line.quantity ?? 1}
											</Text>
											<Text style={styles.itemAmount}>
												₦
												{(
													line.total ??
													line.unitPrice *
														(line.quantity ?? 1)
												).toLocaleString()}
											</Text>
										</View>
									),
								)}

								{/* Totals */}
								<View
									style={{
										marginTop: 20,
										flexDirection: 'row',
										justifyContent: 'space-between',
										width: '100%',
										paddingLeft: 5,
										paddingRight: 28,
									}}
								>
									<Text>Sub-total</Text>
									<Text
										style={{ flex: 1, textAlign: 'right' }}
									>
										₦
										{(
											selectedInvoice.subTotal ??
											selectedInvoice.itemsAmount ??
											0
										).toLocaleString()}
									</Text>
								</View>

								{selectedInvoice.taxAmount > 0 && (
									<View style={styles.summaryRow}>
										<Text style={styles.summaryLabel}>
											Tax
										</Text>
										<Text style={styles.summaryValue}>
											₦
											{(
												selectedInvoice.taxAmount || 0
											).toLocaleString()}
										</Text>
									</View>
								)}

								{selectedInvoice.deliveryFee > 0 && (
									<>
										<View style={styles.summaryRow}>
											<Text style={styles.summaryLabel}>
												Delivery Fee
											</Text>
											<Text style={styles.summaryValue}>
												₦
												{(
													selectedInvoice.deliveryFee || 0
												).toLocaleString()}
											</Text>
										</View>
										<View style={styles.summaryRow}>
											<Text style={styles.summaryLabel}>
												Service Fee
											</Text>
											<Text style={styles.summaryValue}>
												₦
												{(
													selectedInvoice.serviceFee || 0
												).toLocaleString()}
											</Text>
										</View>
									</>
								)}

								<View style={styles.totalRow}>
									<Text style={styles.totalLabel}>
										Total
									</Text>
									<Text style={styles.totalValue}>
										₦
										{(
											selectedInvoice.totalAmount || 0
										).toLocaleString()}
									</Text>
								</View>

								{(selectedInvoice.paidAmount ?? 0) > 0 && (
									<View style={styles.balanceRow}>
										<Text style={styles.balanceLabel}>
											Balance Due
										</Text>
										<Text style={styles.balanceValue}>
											₦
											{(
												(selectedInvoice.outstandingAmount ??
													selectedInvoice.totalAmount -
														(selectedInvoice.paidAmount ??
															0)) ||
												0
											).toLocaleString()}
										</Text>
									</View>
								)}

								{/* Payment history */}
								{(selectedInvoice.payments || []).length >
									0 && (
									<View
										style={styles.paymentHistorySection}
									>
										<Text
											style={styles.paymentHistoryTitle}
										>
											Payment History
										</Text>
										{(selectedInvoice.payments || []).map(
											(p, i) => (
												<View
													key={i}
													style={styles.paymentHistoryItem}
												>
													<Text
														style={
															styles.paymentHistoryText
														}
													>
														{formatDateTime(
															p.confirmedAt || p.createdAt,
														)}
													</Text>
													<Text
														style={
															styles.paymentHistoryMethod
														}
													>
														{p.method ||
															p.provider ||
															'manual'}
													</Text>
													<Text
														style={
															styles.paymentHistoryAmount
														}
													>
														₦
														{(
															p.amount || 0
														).toLocaleString()}
													</Text>
												</View>
											),
										)}
									</View>
								)}

								{/* Bank details if unpaid: use primary account */}
								{selectedInvoice.status !== 'paid' && (
									<View style={{ marginTop: 20 }}>
										<Text
											style={{
												fontSize: 16,
												fontWeight: 'bold',
												color: '#333',
												width: '100%',
											}}
										>
											Payment should be made to the account
											below:
										</Text>

										{primaryAccount ? (
											<View style={{ marginTop: 8 }}>
												<Text
													style={{
														fontSize: 14,
														color: '#555',
														marginBottom: 6,
													}}
												>
													{primaryAccount.bankName ?? '—'}
													{primaryAccount.currency
														? ` (${primaryAccount.currency})`
														: ''}
													{primaryAccount.isPrimary ? (
														<Text
															style={{
																color: '#18a54a',
																fontWeight: '700',
															}}
														>
															{' '}
															• Primary
														</Text>
													) : null}
												</Text>

												<TouchableOpacity>
													<Text
														style={{
															fontSize: 16,
															fontWeight: 'bold',
															color: '#333',
														}}
													>
														{primaryAccount.accountNumber
															? formatAccountNumber(
																	primaryAccount.accountNumber,
															  )
															: '—'}
													</Text>
												</TouchableOpacity>

												<Text
													style={{
														fontSize: 14,
														color: '#333',
														marginTop: 4,
													}}
												>
													{primaryAccount.accountName ?? ''}
												</Text>
											</View>
										) : (
											<Text
												style={{
													marginTop: 8,
													fontSize: 14,
													color: '#777',
												}}
											>
												No payment account configured.
											</Text>
										)}
									</View>
								)}

								<Text
									style={{
										textAlign: 'center',
										marginTop: 20,
									}}
								>
									Powered by Tradeet Business
								</Text>
							</ScrollView>

							{/* Actions */}
							<View style={styles.modalActions}>
								{selectedInvoice.status !== 'paid' && (
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
											<Text style={styles.actionButtonText}>
												Share
											</Text>
										)}
									</TouchableOpacity>
								</View>
							</View>
						</View>

						{/* Payment Modal */}
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
											onChangeText={(text) =>
												setAmountPaid(
													text.replace(/[^0-9.]/g, ''),
												)
											}
											keyboardType="numeric"
										/>
									</View>

									<Text style={styles.inputLabel}>
										Method of Payment
									</Text>
									<View
										style={styles.paymentMethodContainer}
									>
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
					</View>
				</Modal>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f8f8f8' },
	header: {
		flexDirection: 'row',
		backgroundColor: '#e0e0e0',
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
		borderBottomColor: '#eee',
		alignItems: 'center',
	},
	evenRow: { backgroundColor: '#ffffff' },
	oddRow: { backgroundColor: '#fcfcfc' },
	cell: {
		flex: 1,
		textAlign: 'center',
		fontSize: 13,
		color: '#555',
	},
	statusCellContainer: { flex: 1, alignItems: 'center' },
	statusBadge: {
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 15,
		fontSize: 10,
		fontWeight: 'bold',
		color: '#fff',
		textTransform: 'uppercase',
		minWidth: 70,
		textAlign: 'center',
	},
	statusCompleted: { backgroundColor: '#4CAF50' },
	statusPartial: { backgroundColor: '#FFC107' },
	statusPending: { backgroundColor: '#F44336' },
	emptyListText: {
		textAlign: 'center',
		marginTop: 20,
		fontSize: 16,
		color: '#777',
	},

	// Modal
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
	},
	modalContent: {
		width: '100%',
		maxHeight: '100%',
		backgroundColor: '#fff',
		padding: 5,
		elevation: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
		height: '100%',
	},
	invoiceDetailScroll: {
		flexGrow: 1,
		width: '100%',
		backgroundColor: '#fff',
		paddingTop: 15,
		paddingHorizontal: 15,
	},
	invoiceDetailContent: { paddingBottom: 20 },
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
		alignSelf: 'flex-start',
	},
	storeInfo: { alignItems: 'center' },
	storeLogo: {
		width: 60,
		height: 60,
		borderRadius: 30,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#eee',
		resizeMode: 'contain',
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
	customerContact: { fontSize: 13, color: '#666' },

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
		textAlign: 'left',
		fontSize: 12,
		color: '#555',
		paddingHorizontal: 10,
	},
	itemRow: {
		flexDirection: 'row',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#f7f7f7',
		alignItems: 'flex-start',
		paddingHorizontal: 5,
	},
	itemName: {
		fontSize: 14,
		color: '#333',
		fontWeight: 'bold',
	},
	itemAddon: {
		fontSize: 12,
		color: '#777',
		marginLeft: 10,
	},
	itemQuantity: {
		flex: 1,
		textAlign: 'left',
		fontSize: 14,
		color: '#555',
	},
	itemAmount: {
		flex: 1,
		textAlign: 'left',
		fontSize: 14,
		fontWeight: '500',
		color: '#333',
	},

	summaryRow: {
		flexDirection: 'row',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#f7f7f7',
		alignItems: 'flex-start',
		paddingHorizontal: 5,
	},
	summaryLabel: {
		fontSize: 14,
		color: '#555',
		textAlign: 'center',
	},
	summaryValue: {
		flex: 1,
		textAlign: 'left',
		fontSize: 14,
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
		paddingRight: 15,
		paddingLeft: 5,
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
		paddingRight: 20,
	},
	balanceLabel: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#D32F2F',
	},
	balanceValue: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#D32F2F',
		textAlign: 'center',
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
		marginTop: 0,
		borderTopWidth: 1,
		borderTopColor: '#eee',
		paddingTop: 15,
		paddingHorizontal: 10,
		paddingBottom: 15,
	},
	actionButton: {
		paddingVertical: 12,
		paddingHorizontal: 10,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		minWidth: 100,
	},
	recordPaymentButton: { backgroundColor: '#18a54a' },
	shareButton: {
		backgroundColor: '#007BFF',
		marginLeft: 10,
	},
	closeModalButton: {
		backgroundColor: '#e0e0e0',
		paddingHorizontal: 3,
		minWidth: 60,
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
		flex: 1,
	},

	// Payment modal
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
	inputGroup: { marginBottom: 15 },
	inputLabel: {
		fontSize: 16,
		marginBottom: 8,
		color: '#333',
		fontWeight: '500',
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#ddd',
		padding: 12,
		borderRadius: 8,
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
		borderWidth: 2,
		borderColor: '#e0e0e0',
		borderRadius: 10,
		width: '48%',
	},
	selectedPaymentMethod: {
		borderColor: '#18a54a',
		backgroundColor: '#e6f7ed',
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
	selectedCircle: { borderColor: '#18a54a' },
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

export default InvoiceTable;
