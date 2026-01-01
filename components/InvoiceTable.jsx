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

	// Helper to get the display store (Parent if current is Branch, else current)
	const getDisplayStore = () => {
		if (selectedStore?._isBranch) {
			// Try to find parent in userInfo.stores
			const parent = userInfo?.stores?.find(
				(s) => s._id === (selectedStore.parent || selectedStore._storeId)
			);
			// Fallback: use selectedStore but try to show parent name if possible, 
			// though usually we want the full parent object for logo/payment info.
			return parent || selectedStore;
		}
		return selectedStore || userInfo || {};
	};

	/**
	 * Build an invoice HTML for PDF (used when sharing invoice)
	 */
	function buildInvoiceHtml(invoice) {
		const displayStore = getDisplayStore();

		const logoUrl = displayStore.logoUrl || '';
		const storeName = (displayStore.name || '').replace(/&/g, '&amp;');
		const storeAddress = displayStore.address || '';
		const storePhone = displayStore.phone || '';
		const storeEmail = displayStore.email || '';

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

		const paidAmount = (invoice.payments || []).reduce(
			(sum, payment) => sum + Number(payment.amount || 0),
			0,
		);
		const outstanding = Number(invoice.outstandingAmount ?? 0);

		// Use Primary Account from Display Store
		const storePaymentInfo = displayStore.paymentInfo || [];
		const paymentAccount = storePaymentInfo.find((a) => a.isPrimary) || storePaymentInfo[0] || null;

		const rowsHtml = lines
			.map((l, index) => {
				const desc = (l.description || '')
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
				const qty = l.quantity ?? 1;
				const unit = Number(l.unitPrice ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });
				const lineTotal = Number(
					l.total ?? (l.unitPrice || 0) * (l.quantity || 1),
				).toLocaleString('en-NG', { minimumFractionDigits: 2 });

				const rowBg = index % 2 === 0 ? '#fff' : '#F9FAFB';

				return `
        <tr style="background-color: ${rowBg};">
          <td style="padding:12px;border-bottom:1px solid #E5E7EB;color:#374151;font-size:13px;">
             <div style="font-weight:500;">${desc}</div>
          </td>
          <td style="padding:12px;border-bottom:1px solid #E5E7EB;text-align:center;color:#4B5563;font-size:13px;">${qty}</td>
          <td style="padding:12px;border-bottom:1px solid #E5E7EB;text-align:right;color:#4B5563;font-size:13px;">₦${unit}</td>
          <td style="padding:12px;border-bottom:1px solid #E5E7EB;text-align:right;color:#111827;font-weight:600;font-size:13px;">₦${lineTotal}</td>
        </tr>
      `;
			})
			.join('');

		const logoHtml = logoUrl
			? `<img src="${logoUrl}" alt="logo" style="height:60px;width:auto;object-fit:contain;" />`
			: `<div style="height:60px;width:60px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#F3F4F6;color:#6B7280;font-weight:700;font-size:10px;">NO LOGO</div>`;

		const paymentStatusColor =
			invoice.status === 'paid' ? '#059669' :
				invoice.status === 'partial' ? '#D97706' : '#DC2626';

		const paymentStatusBg =
			invoice.status === 'paid' ? '#ECFDF5' :
				invoice.status === 'partial' ? '#FFFBEB' : '#FEF2F2';

		const html = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Invoice ${invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', sans-serif;
          color: #1F2937;
          margin: 0;
          padding: 40px;
          background: #fff;
          -webkit-print-color-adjust: exact;
        }
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80px;
          color: rgba(0, 0, 0, 0.03);
          font-weight: 800;
          white-space: nowrap;
          pointer-events: none;
          z-index: -1;
          text-transform: uppercase;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }
        .brand {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .store-details {
          margin-top: 8px;
          font-size: 13px;
          color: #6B7280;
          line-height: 1.6;
        }
        .invoice-meta {
          text-align: right;
        }
        .invoice-title {
          font-size: 32px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.5px;
          margin: 0;
          line-height: 1;
        }
        .meta-row {
          margin-top: 8px;
          font-size: 13px;
          color: #6B7280;
        }
        .meta-value {
          color: #374151;
          font-weight: 600;
        }
        .status-badge {
          display: inline-block;
          margin-top: 12px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          background-color: ${paymentStatusBg};
          color: ${paymentStatusColor};
        }

        .bill-to {
          margin-bottom: 40px;
          padding: 20px;
          background: #F9FAFB;
          border-radius: 8px;
          border: 1px solid #F3F4F6;
        }
        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6B7280;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .customer-name {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }
        .customer-detail {
          font-size: 13px;
          color: #4B5563;
          margin-top: 4px;
        }

        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { 
          text-align: left; 
          padding: 12px; 
          font-size: 11px; 
          text-transform: uppercase; 
          color: #6B7280; 
          font-weight: 700; 
          border-bottom: 2px solid #E5E7EB;
        }
        
        .totals {
          width: 300px;
          margin-left: auto;
          margin-bottom: 40px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
          color: #374151;
        }
        .total-row.final {
          border-top: 2px solid #E5E7EB;
          margin-top: 8px;
          padding-top: 12px;
          font-weight: 800;
          font-size: 16px;
          color: #111827;
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          padding-top: 30px;
          border-top: 1px solid #E5E7EB;
        }
        .bank-info {
          font-size: 13px;
          color: #4B5563;
          line-height: 1.6;
        }
        .terms {
          font-size: 12px;
          color: #6B7280;
          line-height: 1.5;
        }
        .branding {
          margin-top: 40px;
          text-align: center;
          font-size: 11px;
          color: #9CA3AF;
        }
      </style>
    </head>
    <body>
      <div class="watermark">TRADEET BUSINESS</div>
      
      <div class="container">
        
        <!-- Header -->
        <div class="header">
          <div class="brand">
            ${logoHtml}
            <div class="store-details">
              <div style="font-weight: 600; color: #111827; font-size: 15px;">${storeName}</div>
              <div>${storeAddress}</div>
              <div>${storeEmail}</div>
              <div>${storePhone}</div>
            </div>
          </div>
          
          <div class="invoice-meta">
            <div class="invoice-title">INVOICE</div>
            <div class="meta-row">Number: <span class="meta-value">${invoiceNumber}</span></div>
            <div class="meta-row">Date: <span class="meta-value">${issuedAt}</span></div>
            <div class="status-badge">${(invoice.status || 'pending')}</div>
          </div>
        </div>

        <!-- Bill To -->
        <div class="bill-to">
          <div class="section-title">Bill To</div>
          <div class="customer-name">${customer.name || 'Valued Customer'}</div>
          ${customer.contact ? `<div class="customer-detail">${customer.contact}</div>` : ''}
          ${customer.email ? `<div class="customer-detail">${customer.email}</div>` : ''}
          ${customer.address ? `<div class="customer-detail">${customer.address}</div>` : ''}
        </div>

        <!-- Items -->
        <table>
          <thead>
            <tr>
              <th style="width: 45%">Description</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 20%; text-align: right;">Unit Price</th>
              <th style="width: 20%; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>₦${subTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
          </div>
          ${taxAmount > 0 ? `
            <div class="total-row">
              <span>Tax (${taxPercent}%)</span>
              <span>₦${taxAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          ${deliveryFee > 0 ? `
            <div class="total-row">
              <span>Delivery</span>
              <span>₦${deliveryFee.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          ${serviceFee > 0 ? `
            <div class="total-row">
              <span>Service Fee</span>
              <span>₦${serviceFee.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          
          <div class="total-row final">
            <span>Total</span>
            <span>₦${total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
          </div>

           <div class="total-row" style="margin-top:12px; color:#10B981;">
            <span>Paid</span>
            <span>₦${paidAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
          </div>
           <div class="total-row" style="color:${outstanding > 0 ? '#EF4444' : '#6B7280'}; font-weight:600;">
            <span>Balance Due</span>
            <span>₦${outstanding.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <!-- Footer Grid -->
        <div class="footer-grid">
          ${paymentAccount ? `
            <div>
               <div class="section-title">Payment Details</div>
               <div class="bank-info">
                 <div style="font-weight:600; color:#111827;">${paymentAccount.bankName}</div>
                 <div>${paymentAccount.accountNumber}</div>
                 <div>${paymentAccount.accountName}</div>
               </div>
            </div>
          ` : `<div><!-- No payment info --></div>`}
          
          <div>
            ${invoice.note ? `
              <div class="section-title">Notes</div>
              <div class="terms">${invoice.note}</div>
            ` : ''}
            <div class="section-title" style="margin-top:16px;">Thank You</div>
            <div class="terms">We appreciate your business.</div>
          </div>
        </div>

        <div class="branding">Powered by <b>Tradeet Business</b></div>
      </div>
    </body>
    </html>
  `;
		return html;
	}

	/**
	 * Build a receipt HTML for a payment
	 */
	function buildReceiptHtml({
		invoice = null,
		payment = {},
	}) {
		const displayStore = getDisplayStore();

		const logoUrl = displayStore.logoUrl || '';
		const storeName = (displayStore.name || '').replace(/&/g, '&amp;');
		const storeAddress = displayStore.address || '';

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
			? `<img src="${logoUrl}" alt="logo" style="height:50px;width:auto;object-fit:contain;" />`
			: `<div style="height:50px;width:50px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#F3F4F6;color:#6B7280;font-weight:700;font-size:9px;">NO LOGO</div>`;

		const html = `
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
          <div class="receipt-subtitle">Reference: ${payment.id || '—'}</div>
        </div>

        <div class="amount-box">
          <div class="amount-label">Amount Paid</div>
          <div class="amount-value">₦${Number(paidNow).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
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
            <span class="label">Invoice Number</span>
            <span class="value">${invoiceNumber}</span>
          </div>
          <div class="row">
            <span class="label">Billed To</span>
            <span class="value">${customer.name || 'Customer'}</span>
          </div>
        </div>
        
        <div class="store-info">
          <div style="margin-bottom: 12px;">${logoHtml}</div>
          <div class="store-name">${storeName}</div>
          <div class="store-addr">${storeAddress}</div>
        </div>

        <div class="footer">Powered by <b>Tradeet Business</b></div>
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
				#{String(item.invoiceNumber || item._id).slice(-6)}
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
							{/* Watermark */}
							<Text style={styles.watermarkText}>TRADEET BUSINESS</Text>

							<ScrollView
								style={styles.invoiceDetailScroll}
								contentContainerStyle={
									styles.invoiceDetailContent
								}
								ref={invoiceRef}
							>
								{(() => {
									const displayStore = getDisplayStore();
									const storePaymentInfo = displayStore.paymentInfo || [];
									const displayPaymentAccount =
										storePaymentInfo.find((a) => a.isPrimary) ||
										storePaymentInfo[0] ||
										null;

									return (
										<>
											{/* Header */}
											<View style={styles.invoiceHeaderSection}>
												<View>
													<Text style={styles.modalInvoiceId}>
														#{String(selectedInvoice.invoiceNumber || selectedInvoice._id).slice(-6)}
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
													{displayStore?.logoUrl ? (
														<Image
															source={{
																uri: displayStore.logoUrl,
															}}
															style={styles.storeLogo}
														/>
													) : (
														<PlaceholderLogo
															name={displayStore?.name}
														/>
													)}
													<Text style={styles.storeName}>
														{displayStore?.name}
													</Text>
													{displayStore?.address ? (
														<Text style={styles.storeContact}>
															{displayStore.address}
														</Text>
													) : null}
													{displayStore?.phone ? (
														<Text style={styles.storeContact}>
															{displayStore.phone}
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
												{selectedInvoice.customerInfo
													?.address ? (
													<Text style={styles.customerContact}>
														{
															selectedInvoice.customerInfo
																.address
														}
													</Text>
												) : null}
												{selectedInvoice.customerInfo
													?.contact ? (
													<Text style={styles.customerContact}>
														{
															selectedInvoice.customerInfo
																.contact
														}
													</Text>
												) : null}
											</View>

											{/* Lines */}
											<View style={{ marginTop: 24 }}>
												<Text style={styles.sectionTitle}>
													Invoice Details
												</Text>

												{/* Table Header */}
												<View style={[styles.itemsHeader, { borderBottomWidth: 2, borderColor: '#E5E7EB', paddingBottom: 8 }]}>
													<Text
														style={[
															styles.itemHeaderCell,
															{ flex: 3.5, textAlign: 'left', color: '#6B7280', fontSize: 11, textTransform: 'uppercase', fontWeight: '700' },
														]}
													>
														Description
													</Text>
													<Text style={[styles.itemHeaderCell, { flex: 0.8, color: '#6B7280', fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }]}>
														Qty
													</Text>
													<Text style={[styles.itemHeaderCell, { flex: 1.5, color: '#6B7280', fontSize: 11, textTransform: 'uppercase', fontWeight: '700', textAlign: 'right' }]}>
														Amount
													</Text>
												</View>

												{(selectedInvoice.lines || []).map(
													(line, idx) => (
														<View
															key={idx}
															style={[
																styles.itemRow,
																{
																	backgroundColor: idx % 2 === 0 ? '#fff' : '#F9FAFB',
																	paddingVertical: 12,
																	paddingHorizontal: 4,
																	borderBottomWidth: 1,
																	borderBottomColor: '#F3F4F6'
																}
															]}
														>
															<View style={{ flex: 3.5 }}>
																<Text style={[styles.itemName, { fontSize: 13, fontWeight: '500', color: '#1F2937' }]}>
																	{line.description}
																</Text>
																{line.meta?.notes && (
																	<Text
																		style={{
																			fontSize: 11,
																			color: '#6B7280',
																			marginTop: 2
																		}}
																	>
																		{line.meta.notes}
																	</Text>
																)}
															</View>
															<Text style={[styles.itemQuantity, { flex: 0.8, fontSize: 13, color: '#4B5563' }]}>
																{line.quantity ?? 1}
															</Text>
															<Text style={[styles.itemAmount, { flex: 1.5, fontSize: 13, color: '#111827', fontWeight: '600' }]}>
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
											</View>

											{/* Totals */}
											<View
												style={{
													marginTop: 30,
													alignSelf: 'flex-end',
													width: '60%',
												}}
											>
												<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
													<Text style={{ fontSize: 13, color: '#4B5563' }}>Subtotal</Text>
													<Text style={{ fontSize: 13, color: '#111827', fontWeight: '500' }}>
														₦
														{(
															selectedInvoice.subTotal ??
															selectedInvoice.itemsAmount ??
															0
														).toLocaleString()}
													</Text>
												</View>

												{selectedInvoice.taxAmount > 0 && (
													<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
														<Text style={{ fontSize: 13, color: '#4B5563' }}>Tax</Text>
														<Text style={{ fontSize: 13, color: '#111827', fontWeight: '500' }}>
															₦{(selectedInvoice.taxAmount || 0).toLocaleString()}
														</Text>
													</View>
												)}

												{selectedInvoice.deliveryFee > 0 && (
													<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
														<Text style={{ fontSize: 13, color: '#4B5563' }}>Delivery</Text>
														<Text style={{ fontSize: 13, color: '#111827', fontWeight: '500' }}>
															₦{(selectedInvoice.deliveryFee || 0).toLocaleString()}
														</Text>
													</View>
												)}

												{selectedInvoice.serviceFee > 0 && (
													<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
														<Text style={{ fontSize: 13, color: '#4B5563' }}>Service Fee</Text>
														<Text style={{ fontSize: 13, color: '#111827', fontWeight: '500' }}>
															₦{(selectedInvoice.serviceFee || 0).toLocaleString()}
														</Text>
													</View>
												)}

												<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 8 }}>
													<Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>Total</Text>
													<Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
														₦{(selectedInvoice.totalAmount || 0).toLocaleString()}
													</Text>
												</View>

												{(selectedInvoice.paidAmount ?? 0) > 0 && (
													<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
														<Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>Paid</Text>
														<Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>
															₦{(selectedInvoice.paidAmount || 0).toLocaleString()}
														</Text>
													</View>
												)}

												{((selectedInvoice.outstandingAmount ?? selectedInvoice.totalAmount - (selectedInvoice.paidAmount ?? 0)) > 0) && (
													<View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
														<Text style={{ fontSize: 13, color: '#DC2626', fontWeight: '600' }}>Balance Due</Text>
														<Text style={{ fontSize: 13, color: '#DC2626', fontWeight: '600' }}>
															₦{((selectedInvoice.outstandingAmount ?? (selectedInvoice.totalAmount - (selectedInvoice.paidAmount ?? 0))) || 0).toLocaleString()}
														</Text>
													</View>
												)}
											</View>

											{/* Payment history */}
											{(selectedInvoice.payments || []).length > 0 && (
												<View style={styles.paymentHistorySection}>
													<Text style={styles.paymentHistoryTitle}>
														Payment History
													</Text>
													{(selectedInvoice.payments || []).map(
														(p, i) => (
															<View
																key={i}
																style={styles.paymentHistoryItem}
															>
																<Text style={styles.paymentHistoryText}>
																	{formatDateTime(
																		p.confirmedAt ||
																		p.createdAt,
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
																	₦{(p.amount || 0).toLocaleString()}
																</Text>
															</View>
														),
													)}
												</View>
											)}

											{/* Bank details if unpaid: use primary account of DISPLAY store */}
											{selectedInvoice.status !== 'paid' && displayPaymentAccount && (
												<View style={{ marginTop: 32, padding: 16, backgroundColor: '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
													<Text
														style={{
															fontSize: 14,
															fontWeight: '700',
															color: '#374151',
															marginBottom: 8,
															textTransform: 'uppercase',
															letterSpacing: 0.5
														}}
													>
														Payment Details
													</Text>

													<View>
														<Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
															{displayPaymentAccount.bankName}
														</Text>
														<Text style={{ fontSize: 14, color: '#4B5563', marginTop: 2 }}>
															{displayPaymentAccount.accountNumber}
														</Text>
														<Text style={{ fontSize: 14, color: '#4B5563', marginTop: 2 }}>
															{displayPaymentAccount.accountName}
														</Text>
													</View>

													<Text style={{ fontSize: 12, color: '#6B7280', marginTop: 12, fontStyle: 'italic' }}>
														Please use Invoice #{selectedInvoice.invoiceNumber || selectedInvoice._id.slice(-6)} as reference.
													</Text>
												</View>
											)}
										</>
									);
								})()}


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
	watermarkText: {
		position: 'absolute',
		top: '50%',
		left: '10%',
		right: '10%',
		textAlign: 'center',
		fontSize: 50,
		fontWeight: '800',
		color: 'rgba(0, 0, 0, 0.03)',
		transform: [{ rotate: '-45deg' }],
		zIndex: 0,
		textTransform: 'uppercase',
	},
});

export default InvoiceTable;
