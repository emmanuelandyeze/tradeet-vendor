import {
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	RefreshControl,
	ActivityIndicator,
} from 'react-native';
import React, {
	useContext,
	useEffect,
	useState,
} from 'react';
import { router } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { Ionicons } from '@expo/vector-icons';

const Orders = () => {
	const { userInfo } = useContext(AuthContext);
	const [orders, setOrders] = useState([]);
	const [filter, setFilter] = useState('in progress'); // Status filter
	const [paymentFilter, setPaymentFilter] = useState('all'); // Payment filter
	const [filteredOrders, setFilteredOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	// Fetch orders from the API
	const fetchOrders = async () => {
		setLoading(true);
		try {
			const response = await axiosInstance.get(
				`/orders/store/${userInfo?._id}`,
			);
			setOrders(response.data.reverse()); // Reverse to show newest orders first
			setLoading(false);
		} catch (err) {
			console.log(err.message || 'Error fetching orders');
			setLoading(false);
		}
	};

	// Refresh orders
	const onRefresh = async () => {
		setRefreshing(true);
		await fetchOrders();
		setRefreshing(false);
	};

	// Filter orders based on status and payment status
	const filterOrders = () => {
		let filtered = orders;

		// Apply status filter
		if (filter === 'in progress') {
			filtered = filtered.filter(
				(order) =>
					order.status === 'pending' ||
					order.status === 'accepted',
			);
		} else if (filter === 'completed') {
			filtered = filtered.filter(
				(order) => order.status === 'completed',
			);
		}

		// Apply payment filter
		if (paymentFilter === 'paid') {
			filtered = filtered.filter(
				(order) => order.payment.status === 'completed',
			);
		} else if (paymentFilter === 'unpaid') {
			filtered = filtered.filter(
				(order) => order.payment.status !== 'completed',
			);
		}

		setFilteredOrders(filtered);
	};

	useEffect(() => {
		filterOrders();
	}, [orders, filter, paymentFilter]);

	useEffect(() => {
		fetchOrders();
	}, []);

	// Counters for UI
	const ongoingOrders = orders.filter(
		(order) =>
			order.status === 'pending' ||
			order.status === 'accepted',
	);
	const completedOrders = orders.filter(
		(order) => order.status === 'completed',
	);
	const paidOrders = orders.filter(
		(order) => order.payment.status === 'completed',
	);
	const unpaidOrders = orders.filter(
		(order) => order.payment.status !== 'completed',
	);

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#6C63FF" />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			
			<View
				style={{
					paddingTop: 45,
					// elevation: 3,
					// backgroundColor: '#fff',
					// paddingHorizontal: 16,
					// paddingBottom: 20,
				}}
			>
				<View
					style={{
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: 20
					}}
				>
					<Text style={{ fontSize: 24 }}>Order Management</Text>
					<TouchableOpacity>
						{/* <Ionicons name="search-outline" size={22} color="black" /> */}
					</TouchableOpacity>
				</View>

				{/* Filters */}
				<View style={styles.filterSection}>
					<Text style={styles.filterTitle}>
						Filter by Status
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
								In Progress ({ongoingOrders.length})
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
								Completed ({completedOrders.length})
							</Text>
						</TouchableOpacity>
					</View>

					<Text style={styles.filterTitle}>
						Filter by Payment
					</Text>
					<View style={styles.filterContainer}>
						<TouchableOpacity
							style={[
								styles.filterButton,
								paymentFilter === 'all' &&
									styles.activeFilterButton,
							]}
							onPress={() => setPaymentFilter('all')}
						>
							<Text style={styles.filterText}>
								All ({orders.length})
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.filterButton,
								paymentFilter === 'paid' &&
									styles.activeFilterButton,
							]}
							onPress={() => setPaymentFilter('paid')}
						>
							<Text style={styles.filterText}>
								Paid ({paidOrders.length})
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.filterButton,
								paymentFilter === 'unpaid' &&
									styles.activeFilterButton,
							]}
							onPress={() => setPaymentFilter('unpaid')}
						>
							<Text style={styles.filterText}>
								Unpaid ({unpaidOrders.length})
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>

			{/* Order List */}
			<FlatList
				data={filteredOrders}
				keyExtractor={(item) => item._id}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={styles.orderCard}
						onPress={() =>
							router.push(`/(app)/orders/${item._id}`)
						}
					>
						<Text style={styles.orderNumber}>
							Order #{item.orderNumber}
						</Text>
						<View style={styles.orderDetails}>
							<View
								style={[
									styles.statusBadge,
									item.payment.status === 'completed'
										? styles.paidBadge
										: styles.unpaidBadge,
								]}
							>
								<Text style={styles.statusText}>
									{item.payment.status === 'completed'
										? 'Paid'
										: 'Unpaid'}
								</Text>
							</View>
							<View
								style={[
									styles.statusBadge,
									item.status === 'completed'
										? styles.completedBadge
										: styles.inProgressBadge,
								]}
							>
								<Text style={styles.statusText}>
									{item.status}
								</Text>
							</View>
						</View>
					</TouchableOpacity>
				)}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyText}>
							No orders found
						</Text>
					</View>
				}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
					/>
				}
			/>
		</View>
	);
};

export default Orders;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		paddingHorizontal: 16,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#333',
	},
	filterSection: {
		marginBottom: 0,
	},
	filterTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#555',
		marginBottom: 8,
	},
	filterContainer: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 16,
	},
	filterButton: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		backgroundColor: '#E0E0E0',
	},
	activeFilterButton: {
		backgroundColor: '#EAE6F8',
	},
	filterText: {
		color: '#333',
		fontSize: 12,
	},
	orderCard: {
		backgroundColor: '#FFF',
		// borderRadius: 12,
		paddingVertical: 16,
		borderColor: '#ddd',
		borderBottomWidth: 1,
	},
	orderNumber: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 8,
	},
	orderDetails: {
		flexDirection: 'row',
		gap: 8,
	},
	statusBadge: {
		paddingVertical: 4,
		paddingHorizontal: 12,
		borderRadius: 20,
	},
	paidBadge: {
		backgroundColor: '#E8F5E9',
	},
	unpaidBadge: {
		backgroundColor: '#FFEBEE',
	},
	completedBadge: {
		backgroundColor: '#E8F5E9',
	},
	inProgressBadge: {
		backgroundColor: '#FFF3E0',
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'capitalize',
	},
	emptyContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		padding: 16,
	},
	emptyText: {
		fontSize: 14,
		color: '#666',
	},
});