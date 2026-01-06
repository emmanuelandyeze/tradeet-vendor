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
	Platform,
	Modal,
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Helper for "Time Ago"
const formatTimeAgo = (dateString) => {
	if (!dateString) return '';
	const date = new Date(dateString);
	const now = new Date();
	const seconds = Math.floor((now - date) / 1000);

	let interval = seconds / 31536000;
	if (interval > 1) return Math.floor(interval) + 'y ago';
	interval = seconds / 2592000;
	if (interval > 1) return Math.floor(interval) + 'mo ago';
	interval = seconds / 86400;
	if (interval > 1) return Math.floor(interval) + 'd ago';
	interval = seconds / 3600;
	if (interval > 1) return Math.floor(interval) + 'h ago';
	interval = seconds / 60;
	if (interval > 1) return Math.floor(interval) + 'm ago';
	return 'Just now';
};

const Orders = () => {
	const {
		userInfo,
		selectedStore,
		switchSelectedBranch,
		switchSelectedStore,
	} = useContext(AuthContext);

	// Build stores list
	const storesList = Array.isArray(userInfo?.stores) ? userInfo.stores : [];

	// Local State for Filtering & UI
	const [orders, setOrders] = useState([]);
	const [statusFilter, setStatusFilter] = useState('in progress');
	const [paymentFilter, setPaymentFilter] = useState('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [filteredOrders, setFilteredOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	// Store Selection Modal State
	const [storeModalVisible, setStoreModalVisible] = useState(false);

	const isActiveIsBranch = !!selectedStore?.parent; // heuristic

	// Display Name Logic
	const displayStoreName = selectedStore?.parentStoreName || selectedStore?.name || 'Select Store';

	// Fetch orders based on CURRENT selectedStore from Context
	const fetchOrders = useCallback(async () => {
		if (!selectedStore) return;
		setLoading(true);
		try {
			let url = `/orders`;
			const params = [];

			if (selectedStore.parent) {
				// It's a branch
				params.push(`storeId=${encodeURIComponent(selectedStore.parent)}`);
				params.push(`branchId=${encodeURIComponent(selectedStore._id)}`);
			} else {
				// It's a store
				params.push(`storeId=${encodeURIComponent(selectedStore._id)}`);
			}

			if (params.length) url = `${url}?${params.join('&')}`;

			const response = await axiosInstance.get(url);
			const fetched =
				response?.data?.orders ??
				response?.data?.items ??
				response?.data ??
				[];

			const sortedOrders = Array.isArray(fetched)
				? fetched.sort(
					(a, b) =>
						new Date(b.createdAt) - new Date(a.createdAt),
				)
				: [];

			setOrders(sortedOrders);
		} catch (err) {
			console.error('Error fetching orders:', err);
		} finally {
			setLoading(false);
		}
	}, [selectedStore]);

	// Load on mount or context change
	useEffect(() => {
		fetchOrders();
	}, [fetchOrders]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchOrders();
		setRefreshing(false);
	}, [fetchOrders]);

	// Filter Logic (Same as before)
	const applyFiltersAndSearch = useCallback(() => {
		let currentFiltered = Array.isArray(orders) ? [...orders] : [];

		if (statusFilter === 'in progress') {
			currentFiltered = currentFiltered.filter((order) =>
				['pending', 'accepted', 'processing', 'out-for-delivery'].includes(String(order.status)),
			);
		} else if (statusFilter === 'completed') {
			currentFiltered = currentFiltered.filter((order) => String(order.status) === 'completed');
		} else if (statusFilter === 'cancelled') {
			currentFiltered = currentFiltered.filter((order) => String(order.status) === 'cancelled');
		}

		if (paymentFilter === 'paid') {
			currentFiltered = currentFiltered.filter((order) => String(order.payment?.status) === 'paid');
		} else if (paymentFilter === 'unpaid') {
			currentFiltered = currentFiltered.filter((order) => String(order.payment?.status) !== 'paid');
		}

		if (searchQuery && searchQuery.trim().length > 0) {
			const q = searchQuery.trim().toLowerCase();
			currentFiltered = currentFiltered.filter((order) => {
				const orderNumber = String(order.orderNumber ?? order._id ?? '').toLowerCase();
				const customerName = String(order.customerInfo?.name ?? order.customerName ?? '').toLowerCase();
				return orderNumber.includes(q) || customerName.includes(q);
			});
		}

		setFilteredOrders(currentFiltered);
	}, [orders, statusFilter, paymentFilter, searchQuery]);

	useEffect(() => {
		applyFiltersAndSearch();
	}, [orders, statusFilter, paymentFilter, searchQuery, applyFiltersAndSearch]);

	// Handling Store Switching
	const handleSelectStoreBranch = async (obj) => {
		try {
			if (!obj) return;

			if (obj.type === 'branch') {
				await switchSelectedBranch(obj._id, obj.parent);
			} else {
				// Was calling switchSelectedBranch(obj._id, null) which is wrong for stores
				await switchSelectedStore(obj);
			}
			setStoreModalVisible(false);
		} catch (err) {
			console.error('Error switching store/branch', err);
		}
	};

	// Derived Counts
	const getCount = (filterFn) => orders.filter(filterFn).length;
	const ongoingCount = getCount((o) => ['pending', 'accepted', 'processing', 'out-for-delivery'].includes(String(o.status)));
	const completedCount = getCount((o) => String(o.status) === 'completed');
	const cancelledCount = getCount((o) => String(o.status) === 'cancelled');

	// Styling Helpers
	const getStatusColor = (status) => {
		switch (String(status).toLowerCase()) {
			case 'pending': return '#D97706'; // Warning
			case 'accepted': return '#2563EB'; // Blue
			case 'processing': return '#7C3AED'; // Purple
			case 'out-for-delivery': return '#059669'; // Success
			case 'completed': return '#065637'; // Brand Dark Green
			case 'cancelled':
			case 'rejected': return '#DC2626'; // Danger
			default: return '#6B7280';
		}
	};
	const getStatusLabel = (status) => String(status).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');


	return (
		<View style={styles.container}>
			<StatusBar style="dark" backgroundColor="#FFFFFF" />

			{/* Header */}
			<View style={styles.header}>
				<View>
					<Text style={styles.headerTitle}>Orders</Text>
					<TouchableOpacity
						style={styles.storeSelector}
						onPress={() => setStoreModalVisible(true)}
					>
						<Text style={styles.storeSelectorText} numberOfLines={1}>
							{displayStoreName}
							{isActiveIsBranch && ` • ${selectedStore?.name}`}
						</Text>
						<Ionicons name="chevron-down" size={14} color="#6B7280" style={{ marginLeft: 4 }} />
					</TouchableOpacity>
				</View>
				{/* Could place add icon here if needed */}
			</View>

			{/* Search */}
			<View style={styles.searchSection}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color="#9CA3AF" />
					<TextInput
						style={styles.searchInput}
						placeholder="Search order # or customer..."
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
			</View>

			{/* Filters */}
			<View style={styles.tabsContainer}>
				<FlatList
					horizontal
					showsHorizontalScrollIndicator={false}
					data={[
						{ id: 'in progress', label: 'Processing', count: ongoingCount },
						{ id: 'completed', label: 'History', count: completedCount },
						{ id: 'cancelled', label: 'Cancelled', count: cancelledCount },
						{ id: 'all', label: 'All Orders', count: orders.length },
					]}
					keyExtractor={item => item.id}
					contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
					renderItem={({ item }) => {
						const isActive = statusFilter === item.id;
						return (
							<TouchableOpacity
								style={[styles.tab, isActive && styles.activeTab]}
								onPress={() => setStatusFilter(item.id)}
							>
								<Text style={[styles.tabText, isActive && styles.activeTabText]}>{item.label}</Text>
								{item.count > 0 && (
									<View style={[styles.badge, isActive && styles.activeBadge]}>
										<Text style={[styles.badgeText, isActive && styles.activeBadgeText]}>{item.count}</Text>
									</View>
								)}
							</TouchableOpacity>
						);
					}}
				/>
			</View>

			{/* List */}
			<FlatList
				data={filteredOrders}
				keyExtractor={(item) => String(item._id)}
				contentContainerStyle={styles.listContent}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#065637" />
				}
				ListEmptyComponent={
					!loading && (
						<View style={styles.emptyState}>
							<View style={styles.emptyIconBg}>
								<Ionicons name="documents-outline" size={48} color="#9CA3AF" />
							</View>
							<Text style={styles.emptyStateText}>No orders found</Text>
							<Text style={styles.emptyStateSub}>Items you receive will appear here</Text>
						</View>
					)
				}
				renderItem={({ item }) => {
					const statusColor = getStatusColor(item.status);
					const totalAmount = item.totalAmount || 0;
					const itemCount = item.items?.length || 0;
					const orderIdShort = `#${(item.orderNumber || String(item._id).slice(-6)).slice(-6).toUpperCase()}`;

					return (
						<TouchableOpacity
							style={styles.card}
							activeOpacity={0.7}
							onPress={() => router.push(`/(app)/orders/${item._id}`)}
						>
							<View style={styles.cardHeader}>
								<View style={styles.orderIdRow}>
									<Text style={styles.orderId}>{orderIdShort}</Text>
									<Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
								</View>
								<View style={[styles.statusPill, { backgroundColor: statusColor + '10', borderColor: statusColor + '40' }]}>
									<Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
								</View>
							</View>

							<View style={styles.cardBody}>
								<View style={styles.customerRow}>
									<View style={styles.avatar}>
										<Text style={styles.avatarText}>{(item.customerInfo?.name || item.customerName || 'C').charAt(0).toUpperCase()}</Text>
									</View>
									<View style={{ flex: 1 }}>
										<Text style={styles.customerName} numberOfLines={1}>{item.customerInfo?.name || item.customerName || 'Walk-in Customer'}</Text>
										<Text style={styles.itemsText}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
									</View>
								</View>
								<View style={styles.amountContainer}>
									<Text style={styles.amountValue}>₦{Number(totalAmount).toLocaleString()}</Text>
									<Text style={[
										styles.paymentStatus,
										{ color: item.payment?.status === 'paid' ? '#059669' : '#D97706' }
									]}>
										{item.payment?.status === 'paid' ? 'Paid' : 'Pending'}
									</Text>
								</View>
							</View>
						</TouchableOpacity>
					);
				}}
			/>

			{/* Store/Branch Selector Modal */}
			<Modal
				visible={storeModalVisible}
				animationType="slide"
				transparent
				onRequestClose={() => setStoreModalVisible(false)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setStoreModalVisible(false)}
				>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Select Business</Text>
							<TouchableOpacity onPress={() => setStoreModalVisible(false)} style={styles.closeBtn}>
								<Ionicons name="close" size={20} color="#374151" />
							</TouchableOpacity>
						</View>
						<FlatList
							data={userInfo?.stores || []}
							keyExtractor={(s) => s._id}
							contentContainerStyle={{ padding: 20 }}
							renderItem={({ item: s }) => {
								const isStoreSelected = selectedStore?._id === s._id;
								return (
									<View style={{ marginBottom: 16 }}>
										<TouchableOpacity
											onPress={() => handleSelectStoreBranch({ type: 'store', _id: s._id, ...s })}
											style={[styles.storeOption, isStoreSelected && styles.storeOptionSelected]}
										>
											<View>
												<Text style={[styles.storeOptionName, isStoreSelected && styles.storeOptionNameSelected]}>{s.name}</Text>
												<Text style={styles.storeOptionAddress}>{s.address || 'Main Store'}</Text>
											</View>
											{isStoreSelected && <Ionicons name="checkmark-circle" size={20} color="#065637" />}
										</TouchableOpacity>

										{/* Branches */}
										{Array.isArray(s.branches) && s.branches.map(b => {
											const isBranchSelected = selectedStore?._id === b._id;
											return (
												<TouchableOpacity
													key={b._id}
													onPress={() => handleSelectStoreBranch({ type: 'branch', _id: b._id, parent: s._id, storeObj: s, ...b })}
													style={[styles.branchOption, isBranchSelected && styles.branchOptionSelected]}
												>
													<Ionicons
														name="return-down-forward-outline"
														size={16}
														color="#9CA3AF"
														style={{ marginRight: 8, marginLeft: 4 }}
													/>
													<View style={{ flex: 1 }}>
														<Text style={[styles.branchOptionName, isBranchSelected && styles.branchOptionNameSelected]}>
															{b.name || b.branchKey || 'Branch'}
														</Text>
														<Text style={styles.branchOptionAddress}>{b.address || 'Location'}</Text>
													</View>
													{isBranchSelected && <Ionicons name="checkmark-circle" size={18} color="#065637" />}
												</TouchableOpacity>
											);
										})}
									</View>
								);
							}}
						/>
					</View>
				</TouchableOpacity>
			</Modal>
		</View>
	);
};

export default Orders;

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#FFFFFF' },
	header: {
		backgroundColor: '#FFFFFF',
		paddingTop: Platform.OS === 'android' ? 45 : 60,
		paddingBottom: 16,
		paddingHorizontal: 20,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 4,
	},
	storeSelector: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	storeSelectorText: {
		color: '#6B7280',
		fontSize: 14,
		fontWeight: '500',
		maxWidth: 250,
	},
	searchSection: {
		paddingHorizontal: 20,
		paddingTop: 16,
		marginBottom: 16,
	},
	searchBar: {
		backgroundColor: '#F3F4F6',
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		paddingHorizontal: 16,
		height: 48,
		borderWidth: 1,
		borderColor: 'transparent',
	},
	searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1F2937' },
	tabsContainer: { paddingBottom: 16 },
	tab: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		marginRight: 8,
	},
	activeTab: { backgroundColor: '#065637', borderColor: '#065637' },
	tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
	activeTabText: { color: '#fff' },
	badge: { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
	activeBadge: { backgroundColor: 'rgba(255,255,255,0.2)' },
	badgeText: { fontSize: 10, fontWeight: '700', color: '#4B5563' },
	activeBadgeText: { color: '#fff' },
	listContent: { paddingHorizontal: 20, paddingBottom: 100 },

	// Card Styles - Professional
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		// Removed heavy shadow for cleaner look
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		padding: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F9FAFB'
	},
	orderIdRow: { flexDirection: 'column' },
	orderId: { fontSize: 15, fontWeight: '600', color: '#111827', letterSpacing: -0.3 },
	timeAgo: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
	statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
	statusText: { fontSize: 11, fontWeight: '600' },

	cardBody: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	customerRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
	avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
	avatarText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
	customerName: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
	itemsText: { fontSize: 12, color: '#6B7280', marginTop: 2 },

	amountContainer: { alignItems: 'flex-end' },
	amountValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
	paymentStatus: { fontSize: 11, fontWeight: '500', marginTop: 2 },

	emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
	emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
	emptyStateText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
	emptyStateSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },

	// Modal Styles
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
	modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
	closeBtn: { padding: 4, backgroundColor: '#F3F4F6', borderRadius: 20 },
	storeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
	storeOptionSelected: { backgroundColor: '#F0FDF4', borderColor: '#065637' },
	storeOptionName: { fontSize: 15, fontWeight: '600', color: '#374151' },
	storeOptionNameSelected: { color: '#065637' },
	storeOptionAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },
	branchOption: { flexDirection: 'row', alignItems: 'center', padding: 12, marginTop: 8, paddingLeft: 0 },
	branchOptionSelected: { backgroundColor: '#F9FAFB', borderRadius: 8 },
	branchLineContainer: { width: 24, alignItems: 'center', height: '100%' },
	branchLine: { width: 2, height: '100%', backgroundColor: '#E5E7EB' },
	branchOptionName: { fontSize: 14, fontWeight: '500', color: '#4B5563' },
	branchOptionNameSelected: { color: '#065637', fontWeight: '700' },
	branchOptionAddress: { fontSize: 11, color: '#9CA3AF' },
});
