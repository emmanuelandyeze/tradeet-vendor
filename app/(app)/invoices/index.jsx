// screens/InvoicesScreen.jsx
import React, {
	useState,
	useEffect,
	useContext,
} from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
	TextInput,
	StyleSheet,
	ToastAndroid,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	Switch,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { ProductsContext } from '@/context/ProductsContext';
import axiosInstance from '@/utils/axiosInstance';
import InvoiceTable from '../../../components/InvoiceTable';

const InvoicesScreen = () => {
	const { userInfo, sendPushNotification, selectedStore } =
		useContext(AuthContext);
	const { fetchProductsByStore } =
		useContext(ProductsContext);

	const router = useRouter();

	const [invoices, setInvoices] = useState([]);
	const [loadingInvoices, setLoadingInvoices] =
		useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [invoiceLoading, setInvoiceLoading] =
		useState(false);

	// customer snapshot now includes address + email
	const [customer, setCustomer] = useState({
		name: '',
		phone: '',
		address: '',
		email: '',
	});

	// lines correspond to invoice lines: description, unitPrice, quantity
	const [lines, setLines] = useState([
		{ description: '', unitPrice: 0, quantity: 1 },
	]);

	// tax
	const [taxEnabled, setTaxEnabled] = useState(false);
	const [taxPercent, setTaxPercent] = useState(0);
	const [taxInput, setTaxInput] = useState('0');
	// derived totals
	const [subTotal, setSubTotal] = useState(0);
	const [taxAmount, setTaxAmount] = useState(0);
	const [totalPrice, setTotalPrice] = useState(0);

	const [note, setNote] = useState('');

	const storeId = selectedStore?._id;

	useEffect(() => {
		if (storeId) {
			fetchProductsByStore(storeId); // optional: product suggestions
			fetchInvoices();
		}
	}, [storeId]);

	useEffect(() => {
		// recalc totals when lines or tax change
		calculateTotals(lines, taxEnabled, taxPercent);
	}, [lines, taxEnabled, taxPercent]);

	const calculateTotals = (
		linesArr = [],
		taxOn = false,
		taxPct = 0,
	) => {
		const subtotal = (linesArr || []).reduce((sum, l) => {
			const qty = Number(l.quantity || 0);
			const up = Number(l.unitPrice || 0);
			return sum + qty * up;
		}, 0);
		const taxAmt = taxOn
			? (subtotal * (Number(taxPct) || 0)) / 100
			: 0;
		const total = subtotal + taxAmt;
		setSubTotal(subtotal);
		setTaxAmount(taxAmt);
		setTotalPrice(total);
	};

	const handleLineChange = (index, field, value) => {
		const updated = lines.map((ln, i) =>
			i === index
				? {
						...ln,
						[field]:
							field === 'unitPrice' || field === 'quantity'
								? Number(value) || 0
								: value,
				  }
				: ln,
		);
		setLines(updated);
		calculateTotals(updated, taxEnabled, taxPercent);
	};

	const addLine = () => {
		setLines([
			...lines,
			{ description: '', unitPrice: 0, quantity: 1 },
		]);
	};

	const removeLine = (index) => {
		const updated = lines.filter((_, i) => i !== index);
		setLines(
			updated.length
				? updated
				: [{ description: '', unitPrice: 0, quantity: 1 }],
		);
		calculateTotals(updated, taxEnabled, taxPercent);
	};

	const fetchInvoices = async () => {
		if (!storeId) return;
		try {
			const isBranch = selectedStore?._isBranch === true;
			const actualStoreId = isBranch ? selectedStore.parent || selectedStore._storeId : selectedStore._id;
			const actualBranchId = isBranch ? selectedStore._id : undefined;

			setLoadingInvoices(true);
			const res = await axiosInstance.get('/invoices', {
				params: {
					storeId: actualStoreId,
					branchId: actualBranchId
				},
			});
			const data = Array.isArray(res.data)
				? res.data
				: res.data.invoices ?? res.data;
			const sorted = (data || [])
				.slice()
				.sort(
					(a, b) =>
						new Date(b.createdAt) - new Date(a.createdAt),
				);
			setInvoices(sorted);
		} catch (err) {
			console.error(
				'fetchInvoices error',
				err?.response?.data ?? err.message,
			);
			ToastAndroid.show(
				'Failed to fetch invoices',
				ToastAndroid.SHORT,
			);
		} finally {
			setLoadingInvoices(false);
		}
	};

	const validateBeforeCreate = () => {
		if (!customer.name || !customer.phone) {
			ToastAndroid.show(
				'Enter customer name and phone.',
				ToastAndroid.SHORT,
			);
			return false;
		}
		if (
			lines.some(
				(l) =>
					!l.description ||
					l.unitPrice <= 0 ||
					l.quantity <= 0,
			)
		) {
			ToastAndroid.show(
				'Ensure each item has a description, positive price & quantity.',
				ToastAndroid.SHORT,
			);
			return false;
		}
		if (
			taxEnabled &&
			(isNaN(taxPercent) || taxPercent < 0)
		) {
			ToastAndroid.show(
				'Enter a valid tax percentage.',
				ToastAndroid.SHORT,
			);
			return false;
		}
		return true;
	};

	const createInvoice = async () => {
		if (!validateBeforeCreate()) return;

		const normalizedLines = lines.map((l) => ({
			description: l.description,
			quantity: Number(l.quantity || 1),
			unitPrice: Number(l.unitPrice || 0),
			total: Number((l.unitPrice || 0) * (l.quantity || 1)),
			meta: { createdFrom: 'mobile_app' },
		}));

		const isBranch = selectedStore?._isBranch === true;
		const actualStoreId = isBranch ? selectedStore.parent || selectedStore._storeId : selectedStore._id;
		const actualBranchId = isBranch ? selectedStore._id : undefined;

		const payload = {
			storeId: actualStoreId,
			branchId: actualBranchId,
			orderId: null, // standalone invoice
			lines: normalizedLines,
			note: note || undefined,
			issue: true,
			customerInfo: {
				name: customer.name,
				contact: customer.phone,
				address: customer.address || undefined,
				email: customer.email || undefined,
			},
			taxPercent: taxEnabled ? Number(taxPercent || 0) : 0,
			taxAmount: taxEnabled
				? Number((taxAmount || 0).toFixed(2))
				: 0,
			subTotal: Number((subTotal || 0).toFixed(2)),
			totalAmount: Number((totalPrice || 0).toFixed(2)),
		};

		try {
			setInvoiceLoading(true);
			const res = await axiosInstance.post(
				'/invoices',
				payload,
			);
			ToastAndroid.show(
				'Invoice created successfully',
				ToastAndroid.LONG,
			);

			// reset form
			setCustomer({
				name: '',
				phone: '',
				address: '',
				email: '',
			});
			setLines([
				{ description: '', unitPrice: 0, quantity: 1 },
			]);
			setNote('');
			setTaxEnabled(false);
			setTaxPercent(0);
			setSubTotal(0);
			setTaxAmount(0);
			setTotalPrice(0);
			setModalVisible(false);

			// refresh list
			fetchInvoices();
		} catch (err) {
			console.error(
				'createInvoice error',
				err?.response?.data ?? err.message,
			);
			const msg =
				err.response?.data?.message ||
				'Failed to create invoice';
			ToastAndroid.show(msg, ToastAndroid.LONG);
		} finally {
			setInvoiceLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.headerContainer}>
				<TouchableOpacity
					onPress={() => router.push('/(tabs)')}
				>
					<Ionicons
						name="arrow-back"
						size={24}
						color="black"
					/>
				</TouchableOpacity>

				<View style={styles.headerContent}>
					<Text style={styles.headerText}>Invoices</Text>
					<TouchableOpacity
						style={styles.createButtonHeader}
						onPress={() => setModalVisible(true)}
					>
						<Text style={styles.createButtonText}>
							Create Invoice
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{loadingInvoices ? (
				<View
					style={{ marginTop: 40, alignItems: 'center' }}
				>
					<ActivityIndicator size="large" />
					<Text style={{ marginTop: 10 }}>
						Loading invoices...
					</Text>
				</View>
			) : invoices.length === 0 ? (
				<View style={styles.noInvoicesContainer}>
					<Text style={styles.noInvoicesText}>
						No invoices available
					</Text>
					<TouchableOpacity
						style={styles.createButton}
						onPress={() => setModalVisible(true)}
					>
						<Text style={styles.createButtonText}>
							Create Invoice
						</Text>
					</TouchableOpacity>
				</View>
			) : (
				<InvoiceTable
					invoices={invoices}
					userInfo={userInfo}
					selectedStore={selectedStore}
					fetchOrders={fetchInvoices}
				/>
			)}

			<Modal
				visible={modalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setModalVisible(false)}
			>
				<KeyboardAvoidingView
					style={styles.modalContainer}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<View style={styles.modalContent}>
						{/* Modal Header */}
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>New Invoice</Text>
							<TouchableOpacity
								onPress={() => setModalVisible(false)}
								style={styles.closeButton}
							>
								<Ionicons
									name="close"
									size={24}
									color="#1F2937"
								/>
							</TouchableOpacity>
						</View>

						<ScrollView
							style={styles.scrollViewContent}
							contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
							showsVerticalScrollIndicator={false}
						>
							{/* Customer Section */}
							<View style={styles.sectionContainer}>
								<Text style={styles.sectionHeaderTitle}>Customer Details</Text>
								<View style={styles.card}>
									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Name *</Text>
										<TextInput
											style={styles.inputField}
											placeholder="e.g. John Doe"
											value={customer.name}
											onChangeText={(v) =>
												setCustomer((s) => ({ ...s, name: v }))
											}
										/>
									</View>
									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>Phone *</Text>
										<TextInput
											style={styles.inputField}
											placeholder="e.g. 08012345678"
											value={customer.phone}
											keyboardType="phone-pad"
											onChangeText={(v) =>
												setCustomer((s) => ({ ...s, phone: v }))
											}
										/>
									</View>
									<View style={styles.rowInputs}>
										<View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
											<Text style={styles.inputLabel}>Email (Optional)</Text>
											<TextInput
												style={styles.inputField}
												placeholder="john@example.com"
												value={customer.email}
												keyboardType="email-address"
												autoCapitalize="none"
												onChangeText={(v) =>
													setCustomer((s) => ({ ...s, email: v }))
												}
											/>
										</View>
										<View style={[styles.inputGroup, { flex: 1 }]}>
											<Text style={styles.inputLabel}>Address (Optional)</Text>
											<TextInput
												style={styles.inputField}
												placeholder="City, State"
												value={customer.address}
												onChangeText={(v) =>
													setCustomer((s) => ({ ...s, address: v }))
												}
											/>
										</View>
									</View>
								</View>
							</View>

							{/* Items Section */}
							<View style={styles.sectionContainer}>
								<Text style={styles.sectionHeaderTitle}>Items</Text>

								{lines.map((item, index) => (
									<View key={index} style={styles.itemCard}>
										<View style={styles.itemHeaderRow}>
											<Text style={styles.itemNumber}>Item #{index + 1}</Text>
											{lines.length > 1 && (
												<TouchableOpacity
													onPress={() => removeLine(index)}
													style={styles.removeIconBtn}
												>
													<Ionicons name="trash-outline" size={18} color="#EF4444" />
												</TouchableOpacity>
											)}
										</View>

										<View style={styles.inputGroup}>
											<TextInput
												style={[styles.inputField, styles.descriptionInput]}
												placeholder="Item description (e.g. Web Design Service)"
												value={item.description}
												multiline={true}
												onChangeText={(v) =>
													handleLineChange(index, 'description', v)
												}
											/>
										</View>

										<View style={styles.rowInputs}>
											<View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
												<Text style={styles.inputLabel}>Price</Text>
												<View style={styles.currencyInputContainer}>
													<Text style={styles.currencyPrefix}>₦</Text>
													<TextInput
														style={styles.currencyInput}
														placeholder="0.00"
														keyboardType="numeric"
														value={item.unitPrice === 0 ? '' : String(item.unitPrice)}
														onChangeText={(v) =>
															handleLineChange(index, 'unitPrice', v)
														}
													/>
												</View>
											</View>
											<View style={[styles.inputGroup, { flex: 0.8 }]}>
												<Text style={styles.inputLabel}>Qty</Text>
												<TextInput
													style={[styles.inputField, { textAlign: 'center' }]}
													placeholder="1"
													keyboardType="numeric"
													value={String(item.quantity)}
													onChangeText={(v) =>
														handleLineChange(index, 'quantity', v)
													}
												/>
											</View>
										</View>
										<View style={styles.itemTotalRow}>
											<Text style={styles.itemTotalLabel}>Line Total:</Text>
											<Text style={styles.itemTotalValue}>
												₦{(item.unitPrice * item.quantity).toLocaleString()}
											</Text>
										</View>
									</View>
								))}

								<TouchableOpacity onPress={addLine} style={styles.addItemButton}>
									<Ionicons name="add" size={20} color="#059669" />
									<Text style={styles.addItemText}>Add Another Item</Text>
								</TouchableOpacity>
							</View>

							{/* Financials Section */}
							<View style={styles.sectionContainer}>
								<Text style={styles.sectionHeaderTitle}>Summary</Text>
								<View style={styles.card}>
									<View style={styles.summaryRow}>
										<Text style={styles.summaryLabel}>Subtotal</Text>
										<Text style={styles.summaryValue}>₦{subTotal.toLocaleString()}</Text>
									</View>

									<View style={[styles.summaryRow, { alignItems: 'center', marginTop: 12 }]}>
										<View style={{ flexDirection: 'row', alignItems: 'center' }}>
											<Text style={styles.summaryLabel}>Add Tax?</Text>
											<Switch
												value={taxEnabled}
												onValueChange={(v) => setTaxEnabled(v)}
												trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
												thumbColor={taxEnabled ? '#10B981' : '#F9FAFB'}
												style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], marginLeft: 8 }}
											/>
										</View>
										{taxEnabled && (
											<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 8 }}>
												<TextInput
													style={{ width: 40, paddingVertical: 4, textAlign: 'right', fontSize: 13, fontWeight: '600' }}
													placeholder="0"
													keyboardType="numeric"
													value={taxInput}
													onChangeText={(v) => {
														setTaxInput(v);
														const n = parseFloat(v);
														setTaxPercent(isNaN(n) ? 0 : n);
													}}
												/>
												<Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 2 }}>%</Text>
											</View>
										)}
									</View>

									{taxEnabled && (
										<View style={styles.summaryRow}>
											<Text style={styles.summaryLabel}>Tax Amount</Text>
											<Text style={styles.summaryValue}>₦{taxAmount.toLocaleString()}</Text>
										</View>
									)}

									<View style={styles.totalDivider} />

									<View style={styles.summaryRow}>
										<Text style={styles.totalLabel}>Total</Text>
										<Text style={styles.totalValue}>₦{totalPrice.toLocaleString()}</Text>
									</View>
								</View>
							</View>

							{/* Notes */}
							<View style={styles.sectionContainer}>
								<Text style={styles.sectionHeaderTitle}>Notes</Text>
								<TextInput
									style={styles.notesInput}
									placeholder="Add any notes or payment terms..."
									value={note}
									onChangeText={setNote}
									multiline
								/>
							</View>

						</ScrollView>

						{/* Footer Actions */}
						<View style={styles.modalFooter}>
							<TouchableOpacity
								onPress={createInvoice}
								style={styles.submitButtonFixed}
								disabled={invoiceLoading}
							>
								{invoiceLoading ? (
									<ActivityIndicator color="#fff" size="small" />
								) : (
									<Text style={styles.submitButtonText}>Create Invoice</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: Platform.OS === 'android' ? 30 : 0,
		backgroundColor: '#F9FAFB',
	},
	headerContainer: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		paddingTop: 10,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	headerContent: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingLeft: 12,
	},
	headerText: {
		fontSize: 20,
		fontWeight: '700',
		color: '#111827',
	},
	createButtonHeader: {
		backgroundColor: '#065637',
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 8,
	},
	createButtonText: {
		color: '#fff',
		fontSize: 13,
		fontWeight: '600',
	},
	noInvoicesContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
	},
	noInvoicesText: {
		fontSize: 16,
		color: '#6B7280',
		marginBottom: 16,
		marginTop: 8,
		textAlign: 'center',
	},
	createButton: {
		backgroundColor: '#065637',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		marginTop: 16,
	},
	// Modal Styles
	modalContainer: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.5)',
	},
	modalContent: {
		backgroundColor: '#F3F4F6',
		flex: 1,
		marginTop: Platform.OS === 'ios' ? 40 : 0,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 14,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
	},
	modalTitle: {
		fontSize: 17,
		fontWeight: '600',
		color: '#111827',
	},
	closeButton: {
		padding: 4,
	},
	scrollViewContent: {
		paddingTop: 20,
	},
	sectionContainer: {
		marginBottom: 24,
	},
	sectionHeaderTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: '#6B7280',
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginLeft: 4,
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	inputGroup: {
		marginBottom: 12,
	},
	rowInputs: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	inputLabel: {
		fontSize: 13,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 6,
	},
	inputField: {
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		color: '#111827',
		backgroundColor: '#fff',
	},
	// Item Styles
	itemCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	itemHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	itemNumber: {
		fontSize: 13,
		fontWeight: '600',
		color: '#9CA3AF',
	},
	removeIconBtn: {
		padding: 4,
	},
	descriptionInput: {
		minHeight: 40,
	},
	currencyInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		paddingHorizontal: 12,
		backgroundColor: '#fff',
		height: 48,
	},
	currencyPrefix: {
		fontSize: 15,
		color: '#9CA3AF',
		marginRight: 4,
		fontWeight: '500',
	},
	currencyInput: {
		flex: 1,
		fontSize: 15,
		color: '#111827',
		paddingVertical: 10,
	},
	itemTotalRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#F3F4F6',
	},
	itemTotalLabel: {
		fontSize: 13,
		color: '#6B7280',
		marginRight: 8,
	},
	itemTotalValue: {
		fontSize: 15,
		fontWeight: '600',
		color: '#111827',
	},
	addItemButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		backgroundColor: '#ECFDF5',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#D1FAE5',
		borderStyle: 'dashed',
		marginTop: 4,
	},
	addItemText: {
		color: '#059669',
		fontWeight: '600',
		fontSize: 14,
		marginLeft: 6,
	},
	// Summary Styles
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	summaryLabel: {
		fontSize: 14,
		color: '#4B5563',
	},
	summaryValue: {
		fontSize: 14,
		fontWeight: '500',
		color: '#111827',
	},
	totalDivider: {
		height: 1,
		backgroundColor: '#E5E7EB',
		marginVertical: 12,
	},
	totalLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	totalValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#065637',
	},
	notesInput: {
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 12,
		padding: 12,
		height: 100,
		textAlignVertical: 'top',
		fontSize: 14,
		color: '#111827',
	},
	// Footer
	modalFooter: {
		padding: 16,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
	},
	submitButtonFixed: {
		backgroundColor: '#065637',
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
		shadowColor: '#065637',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	submitButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 16,
	},
});

export default InvoicesScreen;
