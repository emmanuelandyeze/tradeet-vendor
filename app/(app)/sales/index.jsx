import React, { useState, useEffect, useContext } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
	TextInput,
	StyleSheet,
	ScrollView,
	ToastAndroid,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	StatusBar,
	Switch
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { ProductsContext } from '@/context/ProductsContext';
import axiosInstance from '@/utils/axiosInstance';
import SalesTable from '../../../components/SalesTable';

const SalesScreen = () => {
	const { userInfo, selectedStore } = useContext(AuthContext);
	const { fetchProductsByStore, loading: productsLoading } = useContext(ProductsContext);

	const router = useRouter();
	const [invoices, setInvoices] = useState([]);
	const [invoiceLoading, setInvoiceLoading] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);

	// Search and Filter
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('All');

	// Form State
	const [customer, setCustomer] = useState({ name: '', phone: '' });
	const [products, setProducts] = useState([{ name: '', price: 0, quantity: 1 }]);
	const [totalPrice, setTotalPrice] = useState(0);
	const [addTax, setAddTax] = useState(false);
	const [taxPercent, setTaxPercent] = useState(0);
	const [taxInput, setTaxInput] = useState('0');
	// Payment State
	const [isPaid, setIsPaid] = useState(true);
	const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'transfer', 'pos'

	// Helper to get effective Store and Branch IDs
	const getContextIds = () => {
		if (!selectedStore) return { storeId: null, branchId: null };
		const isBranch = selectedStore.parent || selectedStore._isBranch;

		const storeId = isBranch ? (selectedStore.parent || selectedStore._storeId) : selectedStore._id;

		// Helper to safe-extract ID (if populated object)
		const getId = (item) => (item && typeof item === 'object' && item._id ? item._id : item);

		// If it's a branch, use its ID. If it's a parent store, try defaultBranch or first branch.
		// Fallback: If no branch exists, use storeId as branchId.
		const branchId = isBranch
			? selectedStore._id
			: (getId(selectedStore.defaultBranch) || getId(selectedStore.branches?.[0]) || selectedStore._id);

		return { storeId, branchId };
	};

	useEffect(() => {
		const { storeId } = getContextIds();
		if (storeId) {
			fetchProductsByStore(storeId);
			fetchOrders();
		}
	}, [selectedStore]);

	const fetchOrders = async () => {
		const { storeId, branchId } = getContextIds();
		if (!storeId) return;

		try {
			setInvoiceLoading(true);
			const response = await axiosInstance.get(`/orders/store/${storeId}`, {
				params: { branchId }
			});
			// Extract orders array (API returns object with orders property)
			const ordersList = response.data?.orders || (Array.isArray(response.data) ? response.data : []);
			// Sort orders by createdAt (newest first)
			const sortedInvoices = ordersList.sort(
				(a, b) => new Date(b.createdAt) - new Date(a.createdAt),
			);
			setInvoices(sortedInvoices);
		} catch (err) {
			console.error('Error fetching orders:', err);
		} finally {
			setInvoiceLoading(false);
		}
	};

	// Calculation Logic
	useEffect(() => {
		const total = products.reduce((sum, product) => sum + (product.price * product.quantity || 0), 0);
		setTotalPrice(total);
	}, [products]);

	const handleCustomerChange = (field, value) => {
		setCustomer({ ...customer, [field]: value });
	};

	const handleProductChange = (index, field, value) => {
		const updatedProducts = products.map((product, i) =>
			i === index
				? {
					...product,
					[field]: field === 'price' || field === 'quantity' ? parseFloat(value) || 0 : value,
				}
				: product,
		);
		setProducts(updatedProducts);
	};

	const addProduct = () => {
		setProducts([...products, { name: '', price: 0, quantity: 1 }]);
	};

	const removeProduct = (index) => {
		const updatedProducts = products.filter((_, i) => i !== index);
		setProducts(updatedProducts);
	};

	const handleSubmit = async () => {
		if (!customer.name || !customer.phone) {
			ToastAndroid.show('Please enter customer details', ToastAndroid.SHORT);
			return;
		}

		const { storeId, branchId } = getContextIds();

		if (!storeId || !branchId) {
			ToastAndroid.show('Store context error. Please restart app.', ToastAndroid.LONG);
			return;
		}

		const orderData = {
			storeId,
			branchId,
			customerInfo: {
				name: customer?.name,
				contact: customer?.phone,
				address: '',
			},
			items: products,
			userId: null,
			totalAmount: totalPrice + (addTax ? (totalPrice * taxPercent) / 100 : 0),
			itemsAmount: totalPrice,
			taxPercent: addTax ? taxPercent : 0,
			taxAmount: addTax ? (totalPrice * taxPercent) / 100 : 0,
			discountCode: null,
			status: isPaid ? 'completed' : 'pending',
			payment: {
				status: isPaid ? 'paid' : 'pending',
				method: isPaid ? paymentMethod : null,
			},
		};

		try {
			setInvoiceLoading(true);
			await axiosInstance.post('/orders', orderData);
			ToastAndroid.show('Sales recorded successfully!', ToastAndroid.LONG);
			setModalVisible(false);
			fetchOrders();

			// Reset form
			setCustomer({ name: '', phone: '' });
			setProducts([{ name: '', price: 0, quantity: 1 }]);
			setTotalPrice(0);
			setAddTax(false);
			setTaxPercent(0);
			setTaxInput('0');
			setIsPaid(true);
			setPaymentMethod('cash');
		} catch (error) {
			console.error('Error creating order:', error.response?.data || error.message);
			ToastAndroid.show(error.response?.data?.message || 'Failed to record sales', ToastAndroid.LONG);
		} finally {
			setInvoiceLoading(false);
		}
	};

	const filteredInvoices = invoices.filter(inv => {
		const matchesSearch = (inv.customerInfo?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
			String(inv._id).toLowerCase().includes(searchQuery.toLowerCase()) ||
			String(inv.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()); // Added orderNumber search

		let matchesStatus = true;
		if (statusFilter !== 'All') {
			const status = (inv.status || 'pending').toLowerCase();
			const payStatus = (inv.payment?.status || '').toLowerCase();

			if (statusFilter === 'Paid') {
				matchesStatus = status === 'completed' || payStatus === 'paid' || payStatus === 'completed';
			} else if (statusFilter === 'Pending') {
				matchesStatus = status === 'pending' && payStatus !== 'paid' && payStatus !== 'completed';
			} else {
				matchesStatus = status === statusFilter.toLowerCase();
			}
		}
		return matchesSearch && matchesStatus;
	});

	const filterOptions = ['All', 'Paid', 'Pending'];

	return (
		<View style={styles.container}>
			<StatusBar barStyle="dark-content" backgroundColor="#fff" />

			{/* Header */}
			<View style={styles.headerContainer}>
				<TouchableOpacity onPress={() => router.push('/(tabs)')}>
					<Ionicons name="arrow-back" size={24} color="#1F2937" />
				</TouchableOpacity>

				<View style={styles.headerContent}>
					<Text style={styles.headerTitle}>Sales Record</Text>
					<TouchableOpacity
						style={styles.createButtonHeader}
						onPress={() => setModalVisible(true)}
					>
						<Text style={styles.createButtonText}>Record Sale</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Filter Section */}
			<View style={styles.filterSection}>
				<View style={styles.searchContainer}>
					<Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search customer or ID..."
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholderTextColor="#9CA3AF"
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery('')}>
							<Ionicons name="close-circle" size={18} color="#9CA3AF" />
						</TouchableOpacity>
					)}
				</View>
				<View style={styles.filterRow}>
					{filterOptions.map((status) => (
						<TouchableOpacity
							key={status}
							style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
							onPress={() => setStatusFilter(status)}
						>
							<Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
								{status}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			{/* Content */}
			{invoiceLoading && !modalVisible ? (
				<View style={[styles.centerContainer, { paddingTop: 40 }]}>
					<ActivityIndicator size="large" color="#065637" />
				</View>
			) : filteredInvoices.length === 0 ? (
				<View style={styles.emptyContainer}>
					<View style={styles.emptyIconCircle}>
						<Ionicons name="cart-outline" size={64} color="#9CA3AF" />
					</View>
					<Text style={styles.emptyTitle}>No Sales Found</Text>
					<Text style={styles.emptySubtitle}>
						{searchQuery ? "Try adjusting your search criteria." : "Start recording your sales transactions."}
					</Text>
					{!searchQuery && (
						<TouchableOpacity
							style={styles.createButtonLarge}
							onPress={() => setModalVisible(true)}
						>
							<Text style={styles.createButtonLargeText}>Record First Sale</Text>
						</TouchableOpacity>
					)}
				</View>
			) : (
				<SalesTable
					invoices={filteredInvoices}
					userInfo={selectedStore || userInfo}
					fetchOrders={fetchOrders}
				/>
			)}

			{/* Record Sales Modal */}
			<Modal
				visible={modalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setModalVisible(false)}
			>
				<KeyboardAvoidingView
					style={styles.modalOverlay}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				>
					<View style={styles.modalContent}>
						<View style={styles.modalHeaderBar}>
							<Text style={styles.modalTitle}>New Sale</Text>
							<TouchableOpacity
								onPress={() => setModalVisible(false)}
								style={styles.closeModalButton}
							>
								<Ionicons name="close" size={24} color="#666" />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>

							{/* Customer Info */}
							<View style={styles.formSection}>
								<Text style={styles.sectionTitle}>Customer Details</Text>
								<View style={styles.card}>
									<View style={styles.inputGroup}>
										<Text style={styles.label}>Name</Text>
										<TextInput
											style={styles.input}
											placeholder="Customer Name"
											value={customer.name}
											onChangeText={(v) => handleCustomerChange('name', v)}
										/>
									</View>
									<View style={styles.inputGroup}>
										<Text style={styles.label}>Phone</Text>
										<TextInput
											style={styles.input}
											placeholder="Phone Number"
											value={customer.phone}
											keyboardType="phone-pad"
											onChangeText={(v) => handleCustomerChange('phone', v)}
										/>
									</View>
								</View>
							</View>

							{/* Products */}
							<View style={styles.formSection}>
								<Text style={styles.sectionTitle}>Items</Text>
								{products.map((item, index) => (
									<View key={index} style={styles.itemCard}>
										<View style={styles.itemHeader}>
											<Text style={styles.itemTitle}>Item {index + 1}</Text>
											{products.length > 1 && (
												<TouchableOpacity onPress={() => removeProduct(index)} style={styles.removeBtn}>
													<Ionicons name="trash-outline" size={18} color="#EF4444" />
												</TouchableOpacity>
											)}
										</View>

										<TextInput
											style={[styles.input, { marginBottom: 12 }]}
											placeholder="Product/Service Name"
											value={item.name}
											onChangeText={(v) => handleProductChange(index, 'name', v)}
										/>

										<View style={styles.rowInputs}>
											<View style={{ flex: 1, marginRight: 8 }}>
												<Text style={styles.label}>Price</Text>
												<View style={styles.currencyInputContainer}>
													<Text style={styles.currencyPrefix}>₦</Text>
													<TextInput
														style={styles.currencyInput}
														placeholder="0.00"
														keyboardType="numeric"
														value={item.price > 0 ? String(item.price) : ''}
														onChangeText={(v) => handleProductChange(index, 'price', v)}
													/>
												</View>
											</View>
											<View style={{ width: 80 }}>
												<Text style={styles.label}>Qty</Text>
												<TextInput
													style={[styles.input, { textAlign: 'center' }]}
													placeholder="1"
													keyboardType="numeric"
													value={String(item.quantity)}
													onChangeText={(v) => handleProductChange(index, 'quantity', v)}
												/>
											</View>
										</View>
									</View>
								))}

								<TouchableOpacity onPress={addProduct} style={styles.addItemButton}>
									<Ionicons name="add-circle-outline" size={20} color="#065637" />
									<Text style={styles.addItemText}>Add Another Item</Text>
								</TouchableOpacity>
							</View>

							{/* Summary & Tax */}
							<View style={styles.formSection}>
								<Text style={styles.sectionTitle}>Summary</Text>
								<View style={styles.card}>
									<View style={styles.summaryRow}>
										<Text style={styles.summaryLabel}>Subtotal</Text>
										<Text style={styles.summaryValue}>₦{totalPrice.toLocaleString()}</Text>
									</View>

									<View style={[styles.summaryRow, { marginTop: 12 }]}>
										<View style={{ flexDirection: 'row', alignItems: 'center' }}>
											<Text style={styles.summaryLabel}>Apply Tax?</Text>
											<Switch
												value={addTax}
												onValueChange={setAddTax}
												trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
												thumbColor={addTax ? '#10B981' : '#F9FAFB'}
												style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], marginLeft: 8 }}
											/>
										</View>
										{addTax && (
											<View style={styles.taxInputWrapper}>
												<TextInput
													style={styles.taxInput}
													placeholder="0"
													keyboardType="numeric"
													value={taxInput}
													onChangeText={(v) => {
														setTaxInput(v);
														setTaxPercent(parseFloat(v) || 0);
													}}
												/>
												<Text style={styles.taxSuffix}>%</Text>
											</View>
										)}
									</View>

									{addTax && (
										<View style={styles.summaryRow}>
											<Text style={styles.summaryLabel}>Tax Amount</Text>
											<Text style={styles.summaryValue}>₦{((totalPrice * taxPercent) / 100).toLocaleString()}</Text>
										</View>
									)}

									<View style={styles.divider} />

									{/* Payment Options */}
									<View style={[styles.summaryRow, { marginBottom: 16 }]}>
										<Text style={styles.summaryLabel}>Mark as Paid?</Text>
										<Switch
											value={isPaid}
											onValueChange={setIsPaid}
											trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
											thumbColor={isPaid ? '#10B981' : '#F9FAFB'}
										/>
									</View>

									{isPaid && (
										<View style={styles.paymentMethodContainer}>
											<Text style={styles.paymentMethodLabel}>Payment Method</Text>
											<View style={styles.paymentMethodOptions}>
												{['cash', 'transfer', 'pos'].map((method) => (
													<TouchableOpacity
														key={method}
														style={[
															styles.paymentMethodChip,
															paymentMethod === method && styles.paymentMethodChipActive
														]}
														onPress={() => setPaymentMethod(method)}
													>
														<Text style={[
															styles.paymentMethodText,
															paymentMethod === method && styles.paymentMethodTextActive
														]}>
															{method.charAt(0).toUpperCase() + method.slice(1)}
														</Text>
													</TouchableOpacity>
												))}
											</View>
										</View>
									)}

									<View style={styles.divider} />

									<View style={styles.summaryRow}>
										<Text style={styles.totalLabel}>Grand Total</Text>
										<Text style={styles.totalValue}>
											₦{(totalPrice + (addTax ? (totalPrice * taxPercent) / 100 : 0)).toLocaleString()}
										</Text>
									</View>
								</View>
							</View>

							<TouchableOpacity
								style={styles.submitButton}
								onPress={handleSubmit}
								disabled={invoiceLoading}
							>
								{invoiceLoading ? (
									<ActivityIndicator color="#fff" />
								) : (
									<Text style={styles.submitButtonText}>Create Sales Record</Text>
								)}
							</TouchableOpacity>

						</ScrollView>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: Platform.OS === 'android' ? 30 : 40,
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
	headerTitle: {
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
	// Filters
	filterSection: {
		backgroundColor: '#fff',
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F3F4F6',
		marginHorizontal: 16,
		marginTop: 12,
		paddingHorizontal: 12,
		borderRadius: 8,
		height: 40,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: '#111827',
		height: '100%',
	},
	filterRow: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingTop: 12,
		gap: 8,
	},
	filterChip: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 20,
		backgroundColor: '#F3F4F6',
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	filterChipActive: {
		backgroundColor: '#ECFDF5',
		borderColor: '#10B981',
	},
	filterText: {
		fontSize: 13,
		color: '#4B5563',
		fontWeight: '500',
	},
	filterTextActive: {
		color: '#059669',
		fontWeight: '600',
	},

	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 40,
	},
	emptyIconCircle: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#F3F4F6',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 24,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 8,
	},
	emptySubtitle: {
		fontSize: 15,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: 32,
	},
	createButtonLarge: {
		backgroundColor: '#065637',
		paddingVertical: 14,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
		width: '100%',
	},
	createButtonLargeText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},

	// Modal
	modalOverlay: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	modalContent: {
		backgroundColor: '#F3F4F6',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		height: '90%',
		paddingBottom: 20,
		paddingTop: 40,
	},
	modalHeaderBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingBottom: 20,
		paddingTop: 60,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
	closeModalButton: {
		padding: 4,
	},
	formScroll: {
		padding: 16,
	},
	formSection: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: '#6B7280',
		textTransform: 'uppercase',
		marginBottom: 8,
		marginLeft: 4,
		letterSpacing: 0.5,
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	inputGroup: {
		marginBottom: 16,
	},
	label: {
		fontSize: 13,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 6,
	},
	input: {
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		padding: 12,
		fontSize: 15,
		color: '#111827',
	},

	itemCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	itemHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	itemTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: '#9CA3AF',
	},
	removeBtn: {
		padding: 4,
	},
	rowInputs: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	currencyInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		paddingHorizontal: 12,
		backgroundColor: '#fff',
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
		paddingVertical: 12,
	},
	addItemButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		gap: 8,
	},
	addItemText: {
		color: '#065637',
		fontWeight: '600',
		fontSize: 14,
	},

	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	summaryLabel: {
		fontSize: 14,
		color: '#4B5563',
	},
	summaryValue: {
		fontSize: 14,
		fontWeight: '600',
		color: '#111827',
	},
	paymentMethodContainer: {
		marginTop: 12,
		marginBottom: 16,
	},
	paymentMethodLabel: {
		fontSize: 13,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 8,
	},
	paymentMethodOptions: {
		flexDirection: 'row',
		gap: 8,
	},
	paymentMethodChip: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		backgroundColor: '#F9FAFB',
	},
	paymentMethodChipActive: {
		backgroundColor: '#ECFDF5',
		borderColor: '#10B981',
	},
	paymentMethodText: {
		fontSize: 13,
		color: '#6B7280',
	},
	paymentMethodTextActive: {
		color: '#065637',
		fontWeight: '600',
	},
	taxInputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F3F4F6',
		borderRadius: 6,
		paddingHorizontal: 8,
	},
	taxInput: {
		width: 40,
		paddingVertical: 4,
		textAlign: 'right',
		fontSize: 13,
		fontWeight: '600',
	},
	taxSuffix: {
		fontSize: 13,
		color: '#6B7280',
		marginLeft: 2,
	},
	divider: {
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
		fontWeight: '800',
		color: '#065637',
	},
	submitButton: {
		backgroundColor: '#065637',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		marginTop: 12,
		marginBottom: 40,
	},
	submitButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},
});

export default SalesScreen;
