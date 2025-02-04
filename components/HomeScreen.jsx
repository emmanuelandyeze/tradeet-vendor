import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import socket from '@/utils/socket';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, {
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import { FlatList, RefreshControl, TouchableWithoutFeedback } from 'react-native';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
} from 'react-native';
import UpgradeButton from './UpgradeButton';
import PaymentInfoModal from './PaymentInfoModal';
import { Alert } from 'react-native';
import TodoList from './TodoList';
import Header from './Header';
import SkeletonLoader from './SkeletonLoader';
import BusinessActions from './BusinessActions';

const HomeScreen = () => {
	const router = useRouter();
	const { userInfo, checkLoginStatus } =
		useContext(AuthContext);
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState('in progress');
	const [filteredOrders, setFilteredOrders] =
		useState(orders);
	const [refreshing, setRefreshing] = useState(false);
	const [businessData, setBusinessData] = useState(null);
	const [expenses, setExpenses] = useState([]);
	const [expensesLoading, setExpensesLoading] =
		useState(false);

	const [modalVisible, setModalVisible] = useState(false);

	const handleSavePaymentInfo = async (paymentInfo) => {
		const response = await axiosInstance.post(
			`/businesses/${userInfo?._id}/payment`,
			{
				bankName: paymentInfo.selectedBank.name,
				accountNumber: paymentInfo.accountNumber,
				accountName: paymentInfo.accountName,
			},
		);
		console.log('Payment info saved:', response.data);
		if (response.data.success === true) {
			setModalVisible(false); // Hide the modal after saving the payment info
			await getBusinessInfo(); // Update the user's business data with the new payment info
		}
	};

	// Effect to update the count of active orders whenever the orders list changes
	useEffect(() => {
		filterOrders();
		fetchExpenses()
	}, [orders, filter]);

	// Function to get user information
	const getBusinessInfo = async () => {
		try {
			setLoading(true);
			const token = await AsyncStorage.getItem('userToken');
			const response = await axiosInstance.get(
				`/businesses/b/${userInfo?._id}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);
			// console.log('User info response:', response.data);
			setBusinessData(response.data.business); // Update the user state with fetched data
			setLoading(false);
		} catch (error) {
			console.error(
				'Failed to fetch user info:',
				error.response?.data || error,
			);
			setLoading(false);
			throw error; // Propagate error for handling in the UI
		}
	};

	// console.log('Business data:', businessData);

	const fetchOrders = async () => {
		try {
			const response = await axiosInstance.get(
				`/orders/store/${userInfo?._id}`,
			);
			// Reverse the fetched orders so that the newest orders are at the top
			setOrders(response.data.reverse());
			setLoading(false);
		} catch (err) {
			console.log(err.message || 'Error fetching orders');
			setLoading(false);
		}
	};

	const fetchExpenses = async () => {
		try {
			const response = await axiosInstance.get(
				`/expenses/${userInfo?._id}`,
			);
			console.log(response.data.expenses);
			setExpenses(response.data.expenses);
			setExpensesLoading(false);
		} catch (err) {
			setExpensesLoading(false);
		}
	};

	useEffect(() => {
		getBusinessInfo();
		fetchOrders();

		const handleOrderUpdate = (updatedOrder) => {
			setOrders((prevOrders) =>
				prevOrders.map((order) =>
					order._id === updatedOrder._id
						? updatedOrder
						: order,
				),
			);
		};

		const handleNewOrder = (newOrder) => {
			// Add new orders at the start of the array to keep the newest first
			setOrders((prevOrders) => [newOrder, ...prevOrders]);
		};

		const handleDeleteOrder = (orderId) => {
			setOrders((prevOrders) =>
				prevOrders.filter((order) => order._id !== orderId),
			);
		};

		socket.on('orderUpdate', handleOrderUpdate);
		socket.on('newOrder', handleNewOrder);
		socket.on('deleteOrder', handleDeleteOrder);

		// Cleanup function
		return () => {
			socket.off('orderUpdate', handleOrderUpdate);
			socket.off('newOrder', handleNewOrder);
			socket.off('deleteOrder', handleDeleteOrder);
		};
	}, []);

	const ordersData = orders;

	const ongoingOrders = ordersData?.filter(
		(order) =>
			order.status === 'pending' ||
			order.status === 'accepted',
	);

	const completedOrders = ordersData?.filter(
		(order) => order.status === 'completed',
	);

	const paidOrders = ordersData?.filter(
		(order) => order.payment.status === 'completed',
	);

	const totalAmount = paidOrders?.reduce(
		(total, order) => total + order.totalAmount,
		0,
	);

	const pendingOrders = ordersData?.filter(
		(order) => order.payment.status === 'pending',
	);

	// Calculate the total of totalAmount for pending orders
	const totalPendingAmount = ordersData?.reduce(
		(total, order) => total + order.balance,
		0,
	);

	// Calculate the total of totalAmount for pending orders
	const totalIncomeAmount = ordersData?.reduce(
		(total, order) => total + order.amountPaid,
		0,
	);

	const totalExpensesAmount = expenses?.reduce(
		(total, expense) => total + expense.amount,
		0,
	);

	const profitOrLossAmount = totalIncomeAmount - totalExpensesAmount;

	// Function to filter orders based on status
	const filterOrders = () => {
		if (filter === 'in progress') {
			setFilteredOrders(
				ordersData?.filter(
					(order) =>
						order.status === 'pending' ||
						order.status === 'accepted',
				),
			);
		} else {
			setFilteredOrders(
				ordersData?.filter(
					(order) => order.status === filter,
				),
			);
		}
	};

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchOrders();
		getBusinessInfo();
		setTimeout(() => {
			setRefreshing(false);
		}, 3000);
	}, []);

	const quickAccessItems = [
		{
			label: 'Add Product',
			icon: 'bag-add-outline',
			route: '/(app)/(tabs)/products',
		},
		{
			label: 'Manage Store',
			icon: 'settings-outline',
			route: '/(app)/(tabs)/settings',
		},
		{
			label: 'Analytics',
			icon: 'pie-chart-outline',
			locked:
				businessData?.plan.name !== 'Pro' ? true : false,
		},
		{
			label: 'Discounts',
			icon: 'pricetags-outline',
			// locked: businessData?.plan?.name === 'Starter',
			route: '/(app)/discounts',
		},
		{
			label: 'Marketing',
			icon: 'megaphone-outline',
			locked:
				businessData?.plan?.name !== 'Pro' ? true : false,
		},
		{
			label: 'Help & Guides',
			icon: 'help-circle-outline',
			route: '/(app)/helpsandguides',
		},
	];

	return (
		<View style={styles.container}>
			{loading ? (
				<SkeletonLoader />
			) : (
				<>
					<Header userInfo={businessData} />
					<ScrollView
						contentContainerStyle={styles.contentContainer}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={onRefresh}
							/>
						}
					>
						{/* <View
							style={{
								marginBottom: 8,
								alignItems: 'center',
								backgroundColor: 'green',
								borderRadius: 5,
								paddingVertical: 6,
							}}
						>
							<UpgradeButton
								businessData={businessData}
								getBusinessInfo={getBusinessInfo}
							/>
						</View> */}
						{/* Todo List */}
						<TodoList
							businessData={businessData}
							setModalVisible={setModalVisible}
						/>

						<PaymentInfoModal
							visible={modalVisible}
							onClose={() => setModalVisible(false)}
							onSave={handleSavePaymentInfo}
						/>

						{/* Sales Overview */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>
								Business Overview
							</Text>
							<View style={styles.statsContainer}>
								<View style={styles.statBox}>
									<Text style={styles.statValue}>
										₦{totalIncomeAmount?.toLocaleString()}
									</Text>
									<Text style={styles.statLabel}>
										Income
									</Text>
								</View>
								<TouchableWithoutFeedback
									onPress={() => router.push('/invoices')}
								>
									<View style={styles.statBox}>
										<Text style={styles.statValue}>
											₦
											{totalPendingAmount?.toLocaleString()}
										</Text>
										<Text style={styles.statLabel}>
											Outstanding funds
										</Text>
									</View>
								</TouchableWithoutFeedback>
							</View>
							<View style={styles.statsContainer}>
								<TouchableWithoutFeedback
									onPress={() => router.push('/expenses')}
								>
									<View style={styles.statBox}>
										<Text style={styles.statValue}>
											₦
											{totalExpensesAmount?.toLocaleString()}
										</Text>

										<Text style={styles.statLabel}>
											Expenses
										</Text>
									</View>
								</TouchableWithoutFeedback>
								<View style={styles.statBox}>
									<Text style={styles.statValue}>
										₦{profitOrLossAmount?.toLocaleString()}
									</Text>

									<Text style={styles.statLabel}>
										Profit/Loss
									</Text>
								</View>
							</View>
							<BusinessActions />
						</View>

						{/* Order Management */}
						{/* <View style={styles.section}>
							<Text style={styles.sectionTitle}>
								Sales Management
							</Text>
							<View style={styles.filterContainer}>
								<TouchableOpacity
									style={[
										styles.filterButton,
										filter === 'in progress' &&
											styles.activeFilterButton,
									]}
									onPress={() => setFilter('in progress')}
								>
									<Text style={styles.filterText}>
										In Progress ({ongoingOrders?.length})
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[
										styles.filterButton,
										filter === 'completed' &&
											styles.activeFilterButton,
									]}
									onPress={() => setFilter('completed')}
								>
									<Text style={styles.filterText}>
										Completed ({completedOrders?.length})
									</Text>
								</TouchableOpacity>
							</View>
							<FlatList
								data={filteredOrders?.slice(0, 4)}
								keyExtractor={(item) => item._id}
								renderItem={({ item }) => (
									<TouchableOpacity
										style={styles.orderRow}
										onPress={() =>
											router.push(
												`/(app)/orders/${item._id}`,
											)
										}
									>
										<Text style={styles.orderText}>
											Order #{item.orderNumber}
										</Text>
										<Text
											style={{
												fontSize: 14,
												color:
													item.status === 'completed'
														? 'green'
														: '#121212',
												textTransform: 'capitalize',
											}}
										>
											{item.status}
										</Text>
									</TouchableOpacity>
								)}
								ListEmptyComponent={
									<View
										style={{
											justifyContent: 'center',
											height: 50,
										}}
									>
										<Text
											style={{
												textAlign: 'center',
												fontSize: 14,
											}}
										>
											No active orders
										</Text>
									</View>
								}
							/>
							<TouchableOpacity
								onPress={() =>
									router.push('/(app)/(tabs)/orders')
								}
								style={styles.viewAllButton}
							>
								<Text style={styles.viewAllText}>
									View All Orders
								</Text>
							</TouchableOpacity>
						</View> */}

						{/* Quick Access Buttons */}
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>
								Quick Access
							</Text>
							<View
								style={{
									flexDirection: 'row',
									flexWrap: 'wrap',
									justifyContent: 'space-between',
								}}
							>
								{quickAccessItems?.map((item, index) => (
									<TouchableOpacity
										key={index}
										onPress={() =>
											item.route && router.push(item.route)
										}
										style={[
											styles.settingButton,
											{
												borderColor: item.locked
													? '#ccc'
													: 'green',
											},
										]}
									>
										<Text
											style={[
												styles.settingText,
												{
													color: item.locked
														? '#121212'
														: 'green',
												},
											]}
										>
											{item.label}
										</Text>
										<Ionicons
											name={item.icon}
											size={24}
											color={item.locked ? '#ccc' : 'green'}
										/>
										{item?.locked && (
											<View
												style={{
													position: 'absolute',
													top: 0,
													right: 0,
													backgroundColor: 'gray',
													borderTopRightRadius: 5,
													padding: 1,
													flexDirection: 'row',
												}}
											>
												<Ionicons
													name="lock-closed-outline"
													size={12}
													color="#ccc"
												/>
												<Text
													style={{
														color: '#ccc',
														fontSize: 10,
													}}
												>
													{businessData?.plan?.name ===
													'Economy'
														? 'Pro'
														: 'Economy'}
												</Text>
											</View>
										)}
									</TouchableOpacity>
								))}
							</View>
						</View>
					</ScrollView>
				</>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f9f9f9',
	},
	contentContainer: {
		padding: 20,
	},
	header: {
		marginBottom: 20,
		padding: 15,
		backgroundColor: 'green',
		borderRadius: 10,
	},
	welcomeText: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#ffffff',
	},
	subHeaderText: {
		fontSize: 14,
		color: '#e1e1e1',
	},
	section: {
		marginBottom: 20,
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 15,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 5,
		elevation: 1
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333333',
		marginBottom: 10,
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	statBox: {
		alignItems: 'center',
		width: '48%',
		padding: 20,
		backgroundColor: '#f1f1f1',
		borderRadius: 8,
		gap: 5
	},
	statValue: {
		fontSize: 18,
		fontWeight: 'bold',
		color: 'green',
	},
	statLabel: {
		fontSize: 14,
		color: '#777777',
	},
	orderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#eeeeee',
	},
	orderText: {
		fontSize: 16,
		color: '#333333',
	},
	orderStatus: {
		fontSize: 14,
		color: 'green',
	},
	viewAllButton: {
		marginTop: 10,
		padding: 10,
		alignItems: 'center',
		backgroundColor: 'transparent',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ccc',
	},
	viewAllText: {
		color: '#121212',
		fontSize: 14,
		fontWeight: 'bold',
	},
	quickAccessContainer: {
		// flexDirection: 'row',
		justifyContent: 'space-between',
	},
	quickButton: {
		flex: 1,
		padding: 15,
		backgroundColor: 'green',
		borderRadius: 8,
		alignItems: 'center',
		marginHorizontal: 5,
	},
	buttonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: 'bold',
	},
	settingButton: {
		flexDirection: 'column-reverse',
		alignItems: 'center',
		paddingVertical: 15,
		borderWidth: 1,
		borderColor: '#ccc',
		width: '30%',
		borderRadius: 8,
		// height: 100,
		justifyContent: 'center',
		alignItems: 'center',
		display: 'flex',
		marginBottom: 15,
	},
	settingText: {
		fontSize: 14,
		flex: 1,
		marginTop: 5,
		color: '#333333',
	},
	filterContainer: {
		flexDirection: 'row',
		// justifyContent: 'space-around',
		paddingVertical: 5,
		gap: 8,
		marginBottom: 2,
		// position: 'absolute',
		// left: 0,
		// top: 0,
		backgroundColor: '#fff',
		width: '100%',
		zIndex: 100,
	},
	filterButton: {
		paddingVertical: 5,
		paddingHorizontal: 10,
		borderRadius: 20,
		backgroundColor: '#ddd',
	},
	activeFilterButton: {
		backgroundColor: 'orange',
	},
	filterText: {
		color: '#121212',
		fontSize: 12,
		// fontWeight: 'bold',
	},
});

export default HomeScreen;
