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
			setLoadingInvoices(true);
			const res = await axiosInstance.get('/invoices', {
				params: { storeId },
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

		const payload = {
			storeId,
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
				transparent
				onRequestClose={() => setModalVisible(false)}
			>
				<KeyboardAvoidingView
					style={styles.modalContainer}
					behavior={
						Platform.OS === 'ios' ? 'padding' : 'height'
					}
				>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								Create Invoice
							</Text>
							<TouchableOpacity
								onPress={() => setModalVisible(false)}
								style={styles.closeButton}
							>
								<Ionicons
									name="close-circle-outline"
									size={30}
									color="#555"
								/>
							</TouchableOpacity>
						</View>

						<ScrollView
							style={styles.scrollViewContent}
							contentContainerStyle={{ paddingBottom: 140 }}
							showsVerticalScrollIndicator={false}
						>
							<View style={styles.section}>
								<Text style={styles.label}>
									Customer Name
								</Text>
								<TextInput
									style={styles.input}
									placeholder="Enter customer name"
									value={customer.name}
									onChangeText={(v) =>
										setCustomer((s) => ({ ...s, name: v }))
									}
								/>
								<Text style={styles.label}>
									Phone Number
								</Text>
								<TextInput
									style={styles.input}
									placeholder="Enter phone number"
									value={customer.phone}
									keyboardType="phone-pad"
									onChangeText={(v) =>
										setCustomer((s) => ({ ...s, phone: v }))
									}
								/>
								<Text style={styles.label}>
									Address (optional)
								</Text>
								<TextInput
									style={styles.input}
									placeholder="Customer address"
									value={customer.address}
									onChangeText={(v) =>
										setCustomer((s) => ({
											...s,
											address: v,
										}))
									}
								/>
								<Text style={styles.label}>
									Email (optional)
								</Text>
								<TextInput
									style={styles.input}
									placeholder="customer@example.com"
									value={customer.email}
									keyboardType="email-address"
									onChangeText={(v) =>
										setCustomer((s) => ({ ...s, email: v }))
									}
								/>
							</View>

							<Text style={styles.modalSubTitle}>
								Items
							</Text>

							<FlatList
								data={lines}
								keyExtractor={(_, i) => String(i)}
								renderItem={({ item, index }) => (
									<View style={styles.productItem}>
										<Text style={styles.label}>
											Description
										</Text>
										<TextInput
											style={styles.input}
											placeholder="Item description"
											value={item.description}
											multiline={true}
											onChangeText={(v) =>
												handleLineChange(
													index,
													'description',
													v,
												)
											}
										/>

										<View style={styles.priceQuantityRow}>
											<View style={styles.priceColumn}>
												<Text style={styles.label}>
													Amount
												</Text>
												<TextInput
													style={styles.input}
													placeholder="Unit price"
													keyboardType="numeric"
													value={String(item.unitPrice)}
													onChangeText={(v) =>
														handleLineChange(
															index,
															'unitPrice',
															v,
														)
													}
												/>
											</View>
											<View style={styles.quantityColumn}>
												<Text style={styles.label}>
													Quantity
												</Text>
												<TextInput
													style={styles.input}
													placeholder="Qty"
													keyboardType="numeric"
													value={String(item.quantity)}
													onChangeText={(v) =>
														handleLineChange(
															index,
															'quantity',
															v,
														)
													}
												/>
											</View>
										</View>

										<View style={styles.productActions}>
											<TouchableOpacity
												onPress={() => removeLine(index)}
												style={styles.removeButton}
											>
												<Ionicons
													name="trash"
													size={20}
													color="#fff"
												/>
												<Text
													style={styles.removeButtonText}
												>
													Remove
												</Text>
											</TouchableOpacity>
											<Text style={styles.itemTotal}>
												Total: ₦
												{(
													item.unitPrice * item.quantity
												).toLocaleString()}
											</Text>
										</View>
									</View>
								)}
							/>

							<TouchableOpacity
								onPress={addLine}
								style={styles.addProductButton}
							>
								<Ionicons
									name="add-circle-outline"
									size={20}
									color="#fff"
								/>
								<Text style={styles.addProductButtonText}>
									Add New Item
								</Text>
							</TouchableOpacity>

							<View
								style={[styles.section, { marginTop: 10 }]}
							>
								<View
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										justifyContent: 'space-between',
										marginBottom: 10,
									}}
								>
									<Text
										style={[
											styles.label,
											{ marginBottom: 0 },
										]}
									>
										Apply tax?
									</Text>
									<Switch
										value={taxEnabled}
										onValueChange={(v) => setTaxEnabled(v)}
									/>
								</View>

								{taxEnabled && (
									<>
										<Text style={styles.label}>
											Tax percentage (%)
										</Text>
										<TextInput
											style={styles.input}
											placeholder="e.g. 7.5"
											keyboardType="numeric"
											value={String(taxPercent)}
											onChangeText={(v) => {
												const n = v.replace(/[^0-9.]/g, '');
												setTaxPercent(
													n === '' ? 0 : Number(n),
												);
											}}
										/>
									</>
								)}

								<Text style={styles.label}>
									Note (optional)
								</Text>
								<TextInput
									style={[
										styles.input,
										{
											height: 80,
											textAlignVertical: 'top',
										},
									]}
									placeholder="Add a note or terms"
									value={note}
									onChangeText={setNote}
									multiline
								/>
							</View>

							<View style={styles.totalsBox}>
								<View style={styles.totalsRow}>
									<Text style={styles.totalsLabel}>
										Sub-total
									</Text>
									<Text style={styles.totalsValue}>
										₦{subTotal?.toLocaleString()}
									</Text>
								</View>
								{taxEnabled && (
									<View style={styles.totalsRow}>
										<Text style={styles.totalsLabel}>
											Tax ({taxPercent}%)
										</Text>
										<Text style={styles.totalsValue}>
											₦{taxAmount?.toLocaleString()}
										</Text>
									</View>
								)}
								<View
									style={[
										styles.totalsRow,
										{
											borderTopWidth: 1,
											borderTopColor: '#eee',
											paddingTop: 10,
										},
									]}
								>
									<Text
										style={[
											styles.totalsLabel,
											{ fontWeight: '700' },
										]}
									>
										Total
									</Text>
									<Text
										style={[
											styles.totalsValue,
											{ fontWeight: '700' },
										]}
									>
										₦{totalPrice?.toLocaleString()}
									</Text>
								</View>
							</View>
						</ScrollView>

						<TouchableOpacity
							onPress={createInvoice}
							style={styles.submitButtonFixed}
							disabled={invoiceLoading}
						>
							{invoiceLoading ? (
								<Text style={styles.submitButtonText}>
									Creating Invoice...
								</Text>
							) : (
								<Text style={styles.submitButtonText}>
									Create Invoice
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		backgroundColor: '#f8f8f8',
	},
	headerContainer: {
		paddingTop: Platform.OS === 'android' ? 30 : 0,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		flex: 1,
		paddingLeft: 8,
	},
	headerText: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#333',
	},
	createButtonHeader: {
		backgroundColor: '#121212',
		paddingVertical: 8,
		borderRadius: 8,
		paddingHorizontal: 15,
	},
	createButtonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
	loadingText: {
		textAlign: 'center',
		marginTop: 50,
		fontSize: 16,
		color: '#666',
	},
	noInvoicesContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	noInvoicesText: {
		fontSize: 18,
		marginBottom: 20,
		color: '#777',
		textAlign: 'center',
	},
	createButton: {
		backgroundColor: '#4CAF50',
		paddingVertical: 12,
		paddingHorizontal: 25,
		borderRadius: 10,
		elevation: 3,
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.6)',
	},
	modalContent: {
		backgroundColor: '#fff',
		padding: 20,
		height: '100%',
		width: '100%',
		position: 'relative',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	modalTitle: {
		fontSize: 26,
		fontWeight: 'bold',
		color: '#333',
	},
	closeButton: { padding: 5 },
	scrollViewContent: { flexGrow: 1, paddingBottom: 80 },
	section: {
		marginBottom: 25,
		backgroundColor: '#f0f4f7',
		padding: 15,
		borderRadius: 10,
	},
	label: {
		fontSize: 15,
		color: '#555',
		marginBottom: 5,
		fontWeight: '500',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		padding: 12,
		marginBottom: 15,
		borderRadius: 8,
		fontSize: 16,
		backgroundColor: '#fff',
	},
	productItem: {
		marginBottom: 30,
		padding: 15,
		borderRadius: 10,
		backgroundColor: '#fdfdfd',
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	priceQuantityRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 15,
		marginBottom: 15,
	},
	priceColumn: { flex: 2 },
	quantityColumn: { flex: 1 },
	productActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#eee',
		paddingTop: 10,
	},
	removeButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#dc3545',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
	},
	removeButtonText: {
		color: '#fff',
		fontWeight: '600',
		marginLeft: 5,
	},
	itemTotal: {
		fontSize: 17,
		fontWeight: 'bold',
		color: '#333',
	},
	addProductButton: {
		backgroundColor: '#28a745',
		padding: 14,
		alignItems: 'center',
		borderRadius: 10,
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 20,
		elevation: 3,
	},
	addProductButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
		marginLeft: 8,
	},
	modalSubTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 15,
		color: '#444',
	},
	totalsBox: {
		marginTop: 10,
		backgroundColor: '#fff',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#eee',
	},
	totalsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 6,
	},
	totalsLabel: { color: '#555' },
	totalsValue: { fontWeight: '600' },
	overallTotal: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#121212',
		textAlign: 'right',
		marginTop: 10,
		paddingVertical: 10,
		paddingHorizontal: 5,
		backgroundColor: '#e6f7ff',
		borderRadius: 8,
	},
	submitButtonFixed: {
		backgroundColor: '#121212',
		padding: 16,
		alignItems: 'center',
		borderRadius: 10,
		position: 'absolute',
		bottom: 20,
		left: 20,
		right: 20,
		elevation: 5,
	},
	submitButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 18,
	},
});

export default InvoicesScreen;
