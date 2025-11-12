import React, {
	useState,
	useEffect,
	useRef,
	useContext,
} from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
	TextInput,
	Button,
	StyleSheet,
	Alert,
	ScrollView,
	ToastAndroid,
} from 'react-native';
import axios from 'axios';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { ProductsContext } from '@/context/ProductsContext';
import axiosInstance from '@/utils/axiosInstance';
// import InvoiceTable from '../../../components/InvoiceTable';
import SalesTable from '../../../components/SalesTable';

const SalesScreen = () => {
	const { userInfo, sendPushNotification } =
		useContext(AuthContext);
	const { fetchProductsByStore, loading } =
		useContext(ProductsContext);

	const [customer, setCustomer] = useState({
		name: '',
		phone: '',
	});
	const [products, setProducts] = useState([
		{ name: '', price: 0, quantity: 1 },
	]);
	const [totalPrice, setTotalPrice] = useState(0);

	const storeId = userInfo?._id;

	const router = useRouter();
	const [invoices, setInvoices] = useState([]);
	const [modalVisible, setModalVisible] = useState(false);

	const [invoiceLoading, setInvoiceLoading] =
		useState(false);

	useEffect(() => {
		fetchProductsByStore(storeId);
	}, [storeId]); 

	useEffect(() => {
		fetchOrders();
	}, []);

	const handleCustomerChange = (field, value) => {
		setCustomer({ ...customer, [field]: value });
	};

	const handleProductChange = (index, field, value) => {
		const updatedProducts = products.map((product, i) =>
			i === index
				? {
						...product,
						[field]:
							field === 'price' || field === 'quantity'
								? parseFloat(value) || 0
								: value,
				  }
				: product,
		);

		updatedProducts[index].total =
			updatedProducts[index].price *
			updatedProducts[index].quantity;
		setProducts(updatedProducts);
		calculateTotal(updatedProducts);
	};

	const addProduct = () => {
		setProducts([
			...products,
			{ name: '', price: 0, quantity: 1 },
		]);
	};

	const removeProduct = (index) => {
		const updatedProducts = products.filter(
			(_, i) => i !== index,
		);
		setProducts(updatedProducts);
		calculateTotal(updatedProducts);
	};

	const calculateTotal = (products) => {
		const total = products.reduce(
			(sum, product) =>
				sum + (product.price * product.quantity || 0),
			0,
		);
		setTotalPrice(total);
	};

	const fetchOrders = async () => {
			try {
				setInvoiceLoading(true);
				const response = await axiosInstance.get(
					`/orders/store/${userInfo?._id}`,
				);
	
				// Sort orders by createdAt (newest first)
				const sortedInvoices = response.data.sort(
					(a, b) =>
						new Date(b.createdAt) - new Date(a.createdAt),
				);
	
				setInvoices(sortedInvoices);
				setError(null);
			} catch (err) {
				setError(err.message || 'Error fetching orders');
			} finally {
				setInvoiceLoading(false);
			}
		};

	const createOrder = async (orderData) => {
		try {
			setInvoiceLoading(true);
			const response = await axiosInstance.post(
				'/orders',
				orderData,
			); // API endpoint for creating order
			ToastAndroid.show(
				'Sales recorded successfully!',
				ToastAndroid.LONG,
			);
			// await sendPushNotification(
			// 	userInfo?.expoPushToken,
			// 	'New Invoice Created 🔔',
			// 	'New invoice created on ' + userInfo?.name,
			// );

			setModalVisible(false);
			fetchOrders();
			setInvoiceLoading(false);
			
		} catch (error) {
			console.error(
				'Error creating order:',
				error.response?.data || error.message,
			);
			ToastAndroid.show(
				`Failed to place order: ${
					error.response?.data?.message ||
					'Something went wrong'
				}`,
				ToastAndroid.LONG,
			);

			setInvoiceLoading(false);
		}
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		// Handle form submission logic
		console.log({ customer, products, totalPrice });

		const orderData = {
			storeId: userInfo?._id,
			customerInfo: {
				name: customer?.name,
				contact: customer?.phone,
				address: '',
				// expoPushToken: userInfo?.expoPushToken,
				// pickUp: deliveryOption === 'pickup' ? true : false,
			},
			items: products,
			userId: null,
			totalAmount: totalPrice,
			itemsAmount: totalPrice,
			discountCode: null,
			status: 'pending',
		};

		createOrder(orderData);
	};

	return (
		<View style={styles.container}>
			<View style={styles.headerContainer}>
				<TouchableOpacity onPress={() => router.push('/(tabs)')}>
					<Ionicons
						name="arrow-back"
						size={24}
						color="black"
					/>
				</TouchableOpacity>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						width: '90%',
						paddingVertical: 10,
					}}
				>
					<Text style={styles.headerText}>Sales Record</Text>
					{invoices?.length > 0 && (
						<TouchableOpacity
							style={{
								backgroundColor: '#121212',
								paddingVertical: 5,
								borderRadius: 5,
								paddingHorizontal: 10,
							}}
							onPress={() => setModalVisible(true)}
						>
							<Text style={styles.createButtonText}>
								Record sales
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
			{loading ? (
				<Text>Loading...</Text>
			) : (
				<>
					{invoices.length === 0 ? (
						<View style={styles.noInvoicesContainer}>
							<Text style={styles.noInvoicesText}>
								No sales record yet.
							</Text>
							<TouchableOpacity
								style={styles.createButton}
								onPress={() => setModalVisible(true)}
							>
								<Text style={styles.createButtonText}>
									Record sales
								</Text>
							</TouchableOpacity>
						</View>
					) : (
						<SalesTable
							invoices={invoices}
							userInfo={userInfo}
							fetchOrders={fetchOrders}
						/>
					)}
				</>
			)}
			<Modal
				visible={modalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<ScrollView>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>
									Record Sales
								</Text>
								<TouchableOpacity
									onPress={() => setModalVisible(false)}
								>
									<Ionicons
										name="close-circle-outline"
										size={28}
										color="black"
									/>
								</TouchableOpacity>
							</View>
							{/* Customer Details */}
							<View style={styles.section}>
								<Text>Customer Name</Text>
								<TextInput
									style={styles.input}
									placeholder="Enter customer name"
									value={customer.name}
									onChangeText={(value) =>
										handleCustomerChange('name', value)
									}
								/>
								<Text>Phone Number</Text>
								<TextInput
									style={styles.input}
									placeholder="Enter phone number"
									value={customer.phone}
									keyboardType="phone-pad"
									onChangeText={(value) =>
										handleCustomerChange('phone', value)
									}
								/>
							</View>

							{/* Product List */}
							<FlatList
								data={products}
								keyExtractor={(_, index) =>
									index.toString()
								}
								renderItem={({ item, index }) => (
									<View style={styles.productItem}>
										<Text>Product/Service Name</Text>
										<TextInput
											style={styles.input}
											placeholder="Product/Service Name"
											value={item.name}
											onChangeText={(value) =>
												handleProductChange(
													index,
													'name',
													value,
												)
											}
										/>
										<View
											style={{
												flexDirection: 'row',
												width: '90%',
												gap: 7,
											}}
										>
											<View style={{ width: '79%' }}>
												<Text>Amount</Text>
												<TextInput
													style={[styles.input]}
													placeholder="Price"
													value={item.price.toString()}
													keyboardType="numeric"
													onChangeText={(value) =>
														handleProductChange(
															index,
															'price',
															value,
														)
													}
												/>
											</View>
											<View style={{ width: '29%' }}>
												<Text>Quantity</Text>
												<TextInput
													style={[styles.input, {}]}
													placeholder="Quantity"
													value={item.quantity.toString()}
													keyboardType="numeric"
													onChangeText={(value) =>
														handleProductChange(
															index,
															'quantity',
															value,
														)
													}
												/>
											</View>
										</View>

										<View
											style={{
												flexDirection: 'row',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}
										>
											<TouchableOpacity
												onPress={() => removeProduct(index)}
												// style={styles.removeButton}
											>
												<Ionicons
													name="trash"
													size={24}
													color="red"
												/>
											</TouchableOpacity>
											<Text style={{ fontSize: 18 }}>
												Total: ₦
												{(
													item.price * item.quantity
												)?.toLocaleString()}
											</Text>
										</View>
									</View>
								)}
								ListFooterComponent={
									<View
										style={{
											justifyContent: 'flex-end',
											alignItems: 'flex-end',
										}}
									>
										<TouchableOpacity
											onPress={addProduct}
											style={styles.addButton}
										>
											<Text style={styles.addButtonText}>
												Add Item
											</Text>
										</TouchableOpacity>
									</View>
								}
							/>

							{/* Total Price */}
							<Text style={styles.total}>
								Total Amount: ₦
								{totalPrice?.toLocaleString()}
							</Text>

							{/* Submit Button */}

							<TouchableOpacity
								onPress={handleSubmit}
								style={{
									backgroundColor: '#121212',
									padding: 14,
									alignItems: 'center',
									borderRadius: 5,
									marginBottom: 20,
								}}
							>
								<Text style={styles.addButtonText}>
									Create Invoice
								</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	headerContainer: {
		paddingTop: 20,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	headerText: {
		fontSize: 22,
		fontWeight: 'bold',
		marginLeft: 8,
	},
	noInvoicesContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	noInvoicesText: {
		fontSize: 18,
		marginBottom: 16,
	},
	createButton: {
		backgroundColor: '#4CAF50',
		padding: 10,
		borderRadius: 8,
	},
	createButtonText: {
		color: '#fff',
		fontSize: 16,
	},
	listContainer: {
		paddingBottom: 20,
	},
	invoiceCard: {
		backgroundColor: '#fff',
		borderRadius: 8,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 2,
	},
	invoiceText: {
		fontSize: 16,
		marginBottom: 8,
	},
	shareButton: {
		backgroundColor: '#2196F3',
		padding: 10,
		borderRadius: 8,
		alignItems: 'center',
	},
	shareButtonText: {
		color: '#fff',
		fontSize: 16,
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 8,
		width: '90%',
		maxHeight: '80%',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: 'bold',
	},
	productCard: {
		backgroundColor: '#f9f9f9',
		padding: 10,
		marginBottom: 8,
		borderRadius: 5,
		borderWidth: 1,
		borderColor: '#ccc',
	},
	selectedProductCard: {
		backgroundColor: '#d4edda',
		borderColor: '#155724',
	},
	productText: {
		fontSize: 16,
	},
	productListContainer: {
		paddingBottom: 20,
	},
	selectedProductContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 10,
		backgroundColor: '#fff3e0',
		borderRadius: 8,
		marginBottom: 10,
	},
	quantityInput: {
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
		padding: 8,
		width: 60,
		textAlign: 'center',
		fontSize: 16,
	},
	modalSubTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginVertical: 10,
	},
	section: {
		marginBottom: 20,
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		marginBottom: 10,
		borderRadius: 5,
	},
	productItem: {
		marginBottom: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
		paddingBottom: 10,
	},
	addButton: {
		backgroundColor: '#28a745',
		padding: 10,
		alignItems: 'center',
		borderRadius: 5,
		marginBottom: 20,
		justifyContent: 'flex-end',
	},
	addButtonText: {
		color: '#fff',
		fontWeight: 'bold',
	},
	removeButton: {
		backgroundColor: '#dc3545',
		padding: 5,
		alignItems: 'center',
		borderRadius: 5,
		marginTop: 10,
	},
	removeButtonText: {
		color: '#fff',
		fontWeight: 'bold',
	},
	total: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 20,
	},
});

export default SalesScreen;
