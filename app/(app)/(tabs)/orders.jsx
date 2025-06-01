import {
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	RefreshControl,
	ActivityIndicator,
	TextInput, // Added for search bar
} from 'react-native';
import React, {
	useContext,
	useEffect,
	useState,
	useCallback, // Added for memoizing functions
} from 'react';
import { router } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const Orders = () => {
	const { userInfo } = useContext(AuthContext);
	const [orders, setOrders] = useState([]);
	const [statusFilter, setStatusFilter] =
		useState('in progress'); // Renamed for clarity
	const [paymentFilter, setPaymentFilter] = useState('all');
	const [searchQuery, setSearchQuery] = useState(''); // New state for search
	const [filteredOrders, setFilteredOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	// Fetch orders from the API
	const fetchOrders = useCallback(async () => {
		setLoading(true);
		try {
			const response = await axiosInstance.get(
				`/orders/store/${userInfo?._id}`,
			);
			// Sort orders by createdAt in descending order (newest first)
			const sortedOrders = response.data.sort(
				(a, b) =>
					new Date(b.createdAt) - new Date(a.createdAt),
			);
			setOrders(sortedOrders);
			setLoading(false);
		} catch (err) {
			console.error(
				'Error fetching orders:',
				err.message || err,
			);
			setLoading(false);
		}
	}, [userInfo?._id]); // Dependency for useCallback

	// Refresh orders
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchOrders();
		setRefreshing(false);
	}, [fetchOrders]); // Dependency for useCallback

	// Filter and search orders
	const applyFiltersAndSearch = useCallback(() => {
		let currentFiltered = orders;

		// Apply status filter
		if (statusFilter === 'in progress') {
			currentFiltered = currentFiltered.filter(
				(order) =>
					order.status === 'pending' ||
					order.status === 'accepted',
			);
		} else if (statusFilter === 'completed') {
			currentFiltered = currentFiltered.filter(
				(order) => order.status === 'completed',
			);
		}
		// If statusFilter is 'all', no status filtering is applied here

		// Apply payment filter
		if (paymentFilter === 'paid') {
			currentFiltered = currentFiltered.filter(
				(order) => order.payment.status === 'completed',
			);
		} else if (paymentFilter === 'unpaid') {
			currentFiltered = currentFiltered.filter(
				(order) => order.payment.status !== 'completed',
			);
		}
		// If paymentFilter is 'all', no payment filtering is applied here

		// Apply search query
		if (searchQuery) {
			const lowerCaseQuery = searchQuery.toLowerCase();
			currentFiltered = currentFiltered.filter(
				(order) =>
					order.orderNumber
						.toString()
						.includes(lowerCaseQuery) ||
					(order.customerName &&
						order.customerName
							.toLowerCase()
							.includes(lowerCaseQuery)) ||
					(order.customerPhone &&
						order.customerPhone.includes(lowerCaseQuery)),
			);
		}

		setFilteredOrders(currentFiltered);
	}, [orders, statusFilter, paymentFilter, searchQuery]); // Dependencies for useCallback

	// Effect to apply filters whenever orders, statusFilter, paymentFilter, or searchQuery changes
	useEffect(() => {
		applyFiltersAndSearch();
	}, [
		orders,
		statusFilter,
		paymentFilter,
		searchQuery,
		applyFiltersAndSearch,
	]);

	// Initial fetch on component mount
	useEffect(() => {
		fetchOrders();
	}, [fetchOrders]);

	// Counters for UI display
	const totalOrdersCount = orders.length;
	const ongoingOrdersCount = orders.filter(
		(order) =>
			order.status === 'pending' ||
			order.status === 'accepted',
	).length;
	const completedOrdersCount = orders.filter(
		(order) => order.status === 'completed',
	).length;
	const paidOrdersCount = orders.filter(
		(order) => order.payment.status === 'completed',
	).length;
	const unpaidOrdersCount = orders.filter(
		(order) => order.payment.status !== 'completed',
	).length;

	// Filter options data for rendering
	const statusOptions = [
		{
			label: `In Progress (${ongoingOrdersCount})`,
			value: 'in progress',
		},
		{
			label: `Completed (${completedOrdersCount})`,
			value: 'completed',
		},
		{
			label: `All Orders (${totalOrdersCount})`,
			value: 'all',
		}, // Added 'All' status
	];

	const paymentOptions = [
		{ label: `All (${totalOrdersCount})`, value: 'all' },
		{ label: `Paid (${paidOrdersCount})`, value: 'paid' },
		{
			label: `Unpaid (${unpaidOrdersCount})`,
			value: 'unpaid',
		},
	];

	const renderFilterChips = (
		options,
		activeFilter,
		setFilter,
	) => (
		<View style={styles.filterChipsContainer}>
			{options.map((option) => (
				<TouchableOpacity
					key={option.value}
					style={[
						styles.filterChip,
						activeFilter === option.value &&
							styles.activeFilterChip,
					]}
					onPress={() => setFilter(option.value)}
				>
					<Text
						style={[
							styles.filterChipText,
							activeFilter === option.value &&
								styles.activeFilterChipText,
						]}
					>
						{option.label}
					</Text>
				</TouchableOpacity>
			))}
		</View>
	);

	if (loading && orders.length === 0) {
		// Show loading only if no orders are loaded yet
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#065637" />
				<Text style={styles.loadingText}>
					Loading orders...
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<StatusBar style="light" backgroundColor="#065637" />
			{/* Header Section */}
			<View style={styles.headerContainer}>
				<Text style={styles.headerTitle}>
					Order Management
				</Text>
				
			</View>

			{/* Search Bar */}
			<View style={styles.searchBarContainer}>
				<Ionicons
					name="search-outline"
					size={20}
					color="#666"
					style={styles.searchIcon}
				/>
				<TextInput
					style={styles.searchInput}
					placeholder="Search orders by number or customer"
					placeholderTextColor="#999"
					value={searchQuery}
					onChangeText={setSearchQuery}
					clearButtonMode="while-editing" // iOS
				/>
			</View>

			{/* Filters Section */}
			<View style={styles.filtersSection}>
				<Text style={styles.filterSectionTitle}>
					Filter by Status
				</Text>
				{renderFilterChips(
					statusOptions,
					statusFilter,
					setStatusFilter,
				)}

				<Text style={styles.filterSectionTitle}>
					Filter by Payment
				</Text>
				{renderFilterChips(
					paymentOptions,
					paymentFilter,
					setPaymentFilter,
				)}
			</View>

			{/* Order List */}
			<View style={styles.listContainer}>
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
							<View style={styles.cardHeader}>
								<Text style={styles.orderNumber}>
									Order #{item.orderNumber}
								</Text>
								<Text style={styles.orderDate}>
									{new Date(
										item.createdAt,
									).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'short',
										day: 'numeric',
										hour: '2-digit',
										minute: '2-digit',
									})}
								</Text>
							</View>
							<Text style={styles.customerName}>
								Customer: {item.customerInfo.name || 'N/A'}
							</Text>
							<Text style={styles.totalAmount}>
								Total: ₦
								{item.totalAmount?.toLocaleString() ||
									'0.00'}
							</Text>
							<View style={styles.cardBadges}>
								<View
									style={[
										styles.statusBadge,
										item.payment.status === 'completed'
											? styles.paidBadge
											: styles.unpaidBadge,
									]}
								>
									<Text style={styles.badgeText}>
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
											: item.status === 'pending' ||
											  item.status === 'accepted'
											? styles.inProgressBadge
											: styles.defaultBadge, // Fallback for other statuses
									]}
								>
									<Text style={styles.badgeText}>
										{item.status.charAt(0).toUpperCase() +
											item.status.slice(1)}
									</Text>
								</View>
							</View>
						</TouchableOpacity>
					)}
					ListEmptyComponent={
						<View style={styles.emptyContainer}>
							<Ionicons
								name="cube-outline"
								size={60}
								color="#ccc"
							/>
							<Text style={styles.emptyText}>
								No orders found.
							</Text>
							<Text style={styles.emptySubText}>
								Adjust your filters or pull to refresh.
							</Text>
						</View>
					}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={['#065637']} // Customize refresh spinner color
							tintColor="#065637" // For iOS
						/>
					}
					contentContainerStyle={
						filteredOrders.length === 0
							? styles.emptyListContent
							: styles.listContent
					}
				/>
			</View>
		</View>
	);
};

export default Orders;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8f8f8', // Light background for the entire screen
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8f8f8',
	},
	loadingText: {
		marginTop: 10,
		fontSize: 16,
		color: '#555',
	},
	// --- Header Styles ---
	headerContainer: {
		paddingTop: 55, // Adjusted for status bar and spacing
		paddingHorizontal: 20,
		paddingBottom: 15,
		backgroundColor: '#065637', // White header background
		
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		elevation: 4, // Android shadow
		shadowColor: '#000', // iOS shadow
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
	},
	headerTitle: {
		fontSize: 26,
		fontWeight: '700',
		color: '#f1f1f1',
	},
	headerIconContainer: {
		padding: 5, // Tappable area
		color: '#f1f1f1', // Icon color
	},

	// --- Search Bar Styles ---
	searchBarContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 10,
		marginHorizontal: 20,
		marginTop: 20,
		paddingHorizontal: 15,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 2,
	},
	searchIcon: {
		marginRight: 10,
	},
	searchInput: {
		flex: 1,
		height: 45,
		fontSize: 16,
		color: '#333',
	},

	// --- Filters Section Styles ---
	filtersSection: {
		paddingHorizontal: 20,
		marginTop: 20,
		marginBottom: 10,
	},
	filterSectionTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#3C4043',
		marginBottom: 8,
	},
	filterChipsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap', // Allow chips to wrap to the next line
		gap: 8, // Space between chips
		marginBottom: 15,
	},
	filterChip: {
		paddingVertical: 8,
		paddingHorizontal: 15,
		borderRadius: 20,
		backgroundColor: '#E0E0E0', // Light grey for inactive chips
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	activeFilterChip: {
		backgroundColor: '#065637', // Brand color for active chip
		borderColor: '#065637',
	},
	filterChipText: {
		color: '#555',
		fontSize: 12,
		fontWeight: '500',
	},
	activeFilterChipText: {
		color: '#fff',
		fontWeight: '600',
	},

	// --- Order List Styles ---
	listContainer: {
		flex: 1,
		paddingHorizontal: 20,
		paddingBottom: 20, // Add padding to the bottom of the list container
	},
	listContent: {
		paddingBottom: 20, // Ensures content isn't cut off by bottom padding of parent container
	},
	orderCard: {
		backgroundColor: '#FFF',
		borderRadius: 10,
		padding: 15,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	orderNumber: {
		fontSize: 17,
		fontWeight: '700',
		color: '#1A1A1A',
	},
	orderDate: {
		fontSize: 12,
		color: '#777',
	},
	customerName: {
		fontSize: 14,
		color: '#555',
		marginBottom: 4,
	},
	totalAmount: {
		fontSize: 15,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	cardBadges: {
		flexDirection: 'row',
		gap: 8, // Space between badges
	},
	statusBadge: {
		paddingVertical: 5,
		paddingHorizontal: 10,
		borderRadius: 15,
		justifyContent: 'center',
		alignItems: 'center',
	},
	paidBadge: {
		backgroundColor: '#DFF6E2', // Light green
	},
	unpaidBadge: {
		backgroundColor: '#FDE5E9', // Light red/pink
	},
	completedBadge: {
		backgroundColor: '#E8F5E9', // Light green
	},
	inProgressBadge: {
		backgroundColor: '#FFF3E0', // Light orange/yellow
	},
	defaultBadge: {
		// For any other status
		backgroundColor: '#E0E0E0',
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '600',
		textTransform: 'capitalize',
		color: '#333', // Default text color, adjust per badge if needed
	},
	paidBadgeText: {
		color: '#065637', // Darker green for paid
	},
	unpaidBadgeText: {
		color: '#89192F', // Darker red for unpaid
	},
	// --- Empty State Styles ---
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 50, // More vertical space for a better empty state
	},
	emptyListContent: {
		flexGrow: 1, // Allows content to grow and center if empty
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyText: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#888',
		marginTop: 15,
	},
	emptySubText: {
		fontSize: 14,
		color: '#A0A0A0',
		marginTop: 5,
		textAlign: 'center',
	},
});
