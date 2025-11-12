// screens/Orders.js
import {
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	RefreshControl,
	ActivityIndicator,
	TextInput,
} from 'react-native';
import React, {
	useContext,
	useEffect,
	useState,
	useCallback,
} from 'react';
import { router } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Picker } from '@react-native-picker/picker';

const Orders = () => {
	const {
		userInfo,
		selectedStore /*, switchSelectedStore */,
	} = useContext(AuthContext);

	// Build stores list from userInfo (defensive)
	const storesList = Array.isArray(userInfo?.stores)
		? userInfo.stores
		: [];

	// Selected store & branch local state (initialised from context.selectedStore if set)
	const initialStoreId =
		selectedStore && selectedStore.parent
			? selectedStore.parent // if selectedStore is a branch, parent points to store id (common pattern)
			: selectedStore?._id ?? storesList[0]?._id ?? null;

	const initialBranchId = selectedStore
		? selectedStore._id
		: null;

	const [storeId, setStoreId] = useState(initialStoreId);
	const [branchId, setBranchId] = useState(initialBranchId);
	const [branches, setBranches] = useState([]);

	// Orders and UI state
	const [orders, setOrders] = useState([]);
	const [statusFilter, setStatusFilter] =
		useState('in progress'); // 'in progress' | 'completed' | 'cancelled' | 'all'
	const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'paid' | 'unpaid'
	const [searchQuery, setSearchQuery] = useState('');
	const [filteredOrders, setFilteredOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	// When storeId or userInfo changes, derive branches array
	useEffect(() => {
		if (!storeId) {
			setBranches([]);
			setBranchId(null);
			return;
		}
		const store = storesList.find(
			(s) => String(s._id) === String(storeId),
		);
		if (!store) {
			setBranches([]);
			setBranchId(null);
			return;
		}
		// store.branches may be array of ids or array of objects.
		const normalized =
			Array.isArray(store.branches) &&
			store.branches.length > 0
				? store.branches.map((b) =>
						typeof b === 'string' || typeof b === 'number'
							? { _id: String(b), name: String(b) }
							: {
									_id: b._id || b.id,
									name:
										b.name || b.branchKey || String(b._id),
							  },
				  )
				: [];

		setBranches(normalized);

		// If current branchId belongs to another store, reset to default branch for this store
		const belongsToStore = normalized.some(
			(b) => String(b._id) === String(branchId),
		);
		if (!belongsToStore) {
			// prefer defaultBranch if present on store object
			const defaultBranchId =
				store.defaultBranch || normalized[0]?._id || null;
			setBranchId(defaultBranchId);
		}
	}, [storeId, userInfo]);

	// Robust helper to compute final total (subtract discount and service fees)
	const computeNetTotal = (order) => {
		const rawTotal = Number(
			order.totalAmount ?? 0,
		);

		// discount could be named or nested in different shapes
		const discount = order.discountAmount

		// serviceFee candidates
		const serviceFee = order.serviceFee

		let net = rawTotal - serviceFee;
		if (!isFinite(net)) net = 0;
		// ensure not negative
		return Math.max(0, Math.round(net * 100) / 100);
	};

	// Fetch orders from the API (branch-aware)
	const fetchOrders = useCallback(async () => {
		setLoading(true);
		try {
			let url = `/orders`;
			const params = [];
			if (branchId)
				params.push(
					`branchId=${encodeURIComponent(branchId)}`,
				);
			if (storeId)
				params.push(
					`storeId=${encodeURIComponent(storeId)}`,
				);
			if (params.length) url = `${url}?${params.join('&')}`;

			const response = await axiosInstance.get(url);

			// Normalize response shape: prefer response.data.orders or response.data.items
			const fetched =
				response?.data?.orders ??
				response?.data?.items ??
				response?.data ??
				[];

			// Sort orders by createdAt in descending order (newest first)
			const sortedOrders = Array.isArray(fetched)
				? fetched.sort(
						(a, b) =>
							new Date(b.createdAt) - new Date(a.createdAt),
				  )
				: [];

			setOrders(sortedOrders);
		} catch (err) {
			console.error(
				'Error fetching orders:',
				err?.response?.data ?? err.message ?? err,
			);
		} finally {
			setLoading(false);
		}
	}, [branchId, storeId]);

	// Refresh orders
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchOrders();
		setRefreshing(false);
	}, [fetchOrders]);

	// Filter and search orders
	const applyFiltersAndSearch = useCallback(() => {
		let currentFiltered = Array.isArray(orders)
			? [...orders]
			: [];

		// Apply status filter
		if (statusFilter === 'in progress') {
			currentFiltered = currentFiltered.filter((order) =>
				[
					'pending',
					'accepted',
					'processing',
					'out-for-delivery',
				].includes(String(order.status)),
			);
		} else if (statusFilter === 'completed') {
			currentFiltered = currentFiltered.filter(
				(order) => String(order.status) === 'completed',
			);
		} else if (statusFilter === 'cancelled') {
			currentFiltered = currentFiltered.filter(
				(order) => String(order.status) === 'cancelled',
			);
		} // 'all' -> no filtering

		// Apply payment filter
		if (paymentFilter === 'paid') {
			currentFiltered = currentFiltered.filter(
				(order) => String(order.payment?.status) === 'paid',
			);
		} else if (paymentFilter === 'unpaid') {
			currentFiltered = currentFiltered.filter(
				(order) => String(order.payment?.status) !== 'paid',
			);
		}

		// Apply search query (robust against different order shapes)
		if (searchQuery && searchQuery.trim().length > 0) {
			const q = searchQuery.trim().toLowerCase();
			currentFiltered = currentFiltered.filter((order) => {
				const orderNumber = String(
					order.orderNumber ?? order._id ?? '',
				).toLowerCase();
				const customerName = String(
					order.customerInfo?.name ??
						order.customerName ??
						'',
				).toLowerCase();
				const customerContact = String(
					order.customerInfo?.contact ??
						order.customerPhone ??
						order.customerInfo?.phone ??
						'',
				).toLowerCase();

				return (
					orderNumber.includes(q) ||
					customerName.includes(q) ||
					customerContact.includes(q)
				);
			});
		}

		setFilteredOrders(currentFiltered);
	}, [orders, statusFilter, paymentFilter, searchQuery]);

	// Apply filters when dependencies change
	useEffect(() => {
		applyFiltersAndSearch();
	}, [
		orders,
		statusFilter,
		paymentFilter,
		searchQuery,
		applyFiltersAndSearch,
	]);

	// Initial fetch on mount and when branchId / storeId change
	useEffect(() => {
		fetchOrders();
	}, [fetchOrders, branchId, storeId]);

	// Counters for UI display (derived from loaded orders)
	const totalOrdersCount = orders.length;
	const ongoingOrdersCount = orders.filter((order) =>
		[
			'pending',
			'accepted',
			'processing',
			'out-for-delivery',
		].includes(String(order.status)),
	).length;
	const completedOrdersCount = orders.filter(
		(order) => String(order.status) === 'completed',
	).length;
	const cancelledOrdersCount = orders.filter(
		(order) => String(order.status) === 'cancelled',
	).length;
	const paidOrdersCount = orders.filter(
		(order) => String(order.payment?.status) === 'paid',
	).length;
	const unpaidOrdersCount = orders.filter(
		(order) => String(order.payment?.status) !== 'paid',
	).length;

	// Filter options data
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
			label: `Cancelled (${cancelledOrdersCount})`,
			value: 'cancelled',
		},
		{
			label: `All Orders (${totalOrdersCount})`,
			value: 'all',
		},
	];

	const paymentOptions = [
		{ label: `All (${totalOrdersCount})`, value: 'all' },
		{ label: `Paid (${paidOrdersCount})`, value: 'paid' },
		{
			label: `Unpaid (${unpaidOrdersCount})`,
			value: 'unpaid',
		},
	];

	// Render chips helper
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
			{/* Header */}
			<View style={styles.headerContainer}>
				<Text style={styles.headerTitle}>
					Order Management
				</Text>
			</View>

			{/* Store & Branch pickers */}
			<View
				style={{ paddingHorizontal: 20, marginTop: 12 }}
			>
				{storesList.length > 0 ? (
					<View
						style={{
							backgroundColor: '#fff',
							borderRadius: 10,
							padding: 8,
							flexDirection: 'row',
							justifyContent: 'space-between',
							alignItems: 'center'
						}}
					>
						<View style={{ flex: .5 }}>
							<Text
								style={{
									fontSize: 12,
									fontWeight: '600',
									color: '#444',
									marginBottom: 6,
								}}
							>
								Store
							</Text>
							<Picker
								selectedValue={storeId}
								onValueChange={(val) => {
									setStoreId(val);
									// when store changes, branch effect will run and set branchId
								}}
							>
								{storesList.map((s) => (
									<Picker.Item
										key={s._id}
										label={s.name ?? s.storeLink ?? s._id}
										value={s._id}
									/>
								))}
							</Picker>
						</View>

						<View style={{ flex: .5 }}>
							<Text
								style={{
									fontSize: 12,
									fontWeight: '600',
									color: '#444',
									marginTop: 8,
								}}
							>
								Branch
							</Text>
							{branches.length > 0 ? (
								<Picker
									selectedValue={branchId}
									onValueChange={(val) => setBranchId(val)}
								>
									{branches.map((b) => (
										<Picker.Item
											key={b._id}
											label={b.name ?? b.branchKey ?? b._id}
											value={b._id}
										/>
									))}
								</Picker>
							) : (
								<Text
									style={{
										color: '#777',
										paddingVertical: 8,
									}}
								>
									No branches for selected store
								</Text>
							)}
						</View>
					</View>
				) : (
					<Text style={{ color: '#777' }}>
						You have no stores assigned.
					</Text>
				)}
			</View>

			{/* Search Bar */}
			{/* <View style={styles.searchBarContainer}>
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
					clearButtonMode="while-editing"
				/>
			</View> */}

			{/* Filters */}
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

			{/* Orders List */}
			<View style={styles.listContainer}>
				<FlatList
					data={filteredOrders}
					keyExtractor={(item) => String(item._id)}
					renderItem={({ item }) => {
						const netTotal = computeNetTotal(item);
						return (
							<TouchableOpacity
								style={styles.orderCard}
								onPress={() =>
									router.push(`/(app)/orders/${item._id}`)
								}
							>
								<View style={styles.cardHeader}>
									<Text style={styles.orderNumber}>
										{item.orderNumber ??
											`#${String(item._id).slice(-6)}`}
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
									Customer:{' '}
									{item.customerInfo?.name ??
										item.customerName ??
										'N/A'}
								</Text>

								<Text style={styles.totalAmount}>
									Total: ₦
									{Number(netTotal ?? 0).toLocaleString()}
								</Text>

								<View style={styles.cardBadges}>
									<View
										style={[
											styles.statusBadge,
											String(item.payment?.status) ===
											'paid'
												? styles.paidBadge
												: styles.unpaidBadge,
										]}
									>
										<Text style={styles.badgeText}>
											{String(item.payment?.status) ===
											'paid'
												? 'Paid'
												: 'Unpaid'}
										</Text>
									</View>

									<View
										style={[
											styles.statusBadge,
											String(item.status) === 'completed'
												? styles.completedBadge
												: String(item.status) ===
												  'cancelled'
												? styles.defaultBadge
												: [
														'pending',
														'accepted',
														'processing',
														'out-for-delivery',
												  ].includes(String(item.status))
												? styles.inProgressBadge
												: styles.defaultBadge,
										]}
									>
										<Text style={styles.badgeText}>
											{String(item.status)
												.charAt(0)
												.toUpperCase() +
												String(item.status).slice(1)}
										</Text>
									</View>
								</View>
							</TouchableOpacity>
						);
					}}
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
							colors={['#065637']}
							tintColor="#065637"
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
		backgroundColor: '#f8f8f8',
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
	headerContainer: {
		paddingTop: 55,
		paddingHorizontal: 20,
		paddingBottom: 15,
		backgroundColor: '#065637',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
	},
	headerTitle: {
		fontSize: 26,
		fontWeight: '700',
		color: '#f1f1f1',
	},
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
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 15,
	},
	filterChip: {
		paddingVertical: 8,
		paddingHorizontal: 15,
		borderRadius: 20,
		backgroundColor: '#E0E0E0',
		borderWidth: 1,
		borderColor: '#E0E0E0',
		marginRight: 8,
		marginBottom: 8,
	},
	activeFilterChip: {
		backgroundColor: '#065637',
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
	listContainer: {
		flex: 1,
		paddingHorizontal: 20,
		paddingBottom: 20,
	},
	listContent: {
		paddingBottom: 20,
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
		gap: 8,
	},
	statusBadge: {
		paddingVertical: 5,
		paddingHorizontal: 10,
		borderRadius: 15,
		justifyContent: 'center',
		alignItems: 'center',
	},
	paidBadge: {
		backgroundColor: '#DFF6E2',
	},
	unpaidBadge: {
		backgroundColor: '#FDE5E9',
	},
	completedBadge: {
		backgroundColor: '#E8F5E9',
	},
	inProgressBadge: {
		backgroundColor: '#FFF3E0',
	},
	defaultBadge: {
		backgroundColor: '#E0E0E0',
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '600',
		textTransform: 'capitalize',
		color: '#333',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 50,
	},
	emptyListContent: {
		flexGrow: 1,
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
