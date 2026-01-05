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
		switchSelectedBranch, // Assuming this is available in AuthContext if not, we use local state or similar logic
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
	
	// Determine current active identifiers
	// If selectedStore is set, use it. Otherwise default to first store.
	const activeStoreId = selectedStore?.parent /* if branch */ || selectedStore?._id /* if store */ || storesList[0]?._id;
	const activeBranchId = selectedStore?._id; 
	const isActiveIsBranch = !!selectedStore?.parent; // heuristic

	// Display Name Logic
	const displayStoreName = selectedStore?.parentStoreName || selectedStore?.name || 'Select Store';
	const displayBranchName = isActiveIsBranch ? (selectedStore?.name || selectedStore?.branchKey || 'Branch') : (selectedStore?.defaultBranch ? 'Main Branch check' : null);

	// Fetch orders based on CURRENT selectedStore from Context
	// We rely on AuthContext.selectedStore being the source of truth for "Current Context"
	const fetchOrders = useCallback(async () => {
		if (!selectedStore) return;
		setLoading(true);
		try {
			let url = `/orders`;
			const params = [];
			
			// logic: if selectedStore is a Branch, pass branchId & storeId
			// if selectedStore is a Store, pass storeId
			
			if (selectedStore.parent) {
				// It's a branch
				params.push(`storeId=${encodeURIComponent(selectedStore.parent)}`);
				params.push(`branchId=${encodeURIComponent(selectedStore._id)}`);
			} else {
				// It's a store
				params.push(`storeId=${encodeURIComponent(selectedStore._id)}`);
				// Optionally, if the store has a default branch or we want all branch orders?
				// Typically standard is: if no branchId, might return all orders for store or just store-level ones
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
			// If obj is a branch, it usually has .parent
			// If obj is a store, check standard fields
			// We assume switchSelectedBranch works as (branchId, storeId) or similar. 
			// Adapting to AuthContext signature from analysis: switchSelectedBranch(branchId, storeId)
			
			if (obj.type === 'branch') {
				await switchSelectedBranch(obj._id, obj.storeObj?._id || obj.parent);
			} else {
				// Switching to a Store (Brand) directly - behavior depends on app logic
				// Assuming we switch to its default branch or just the store context
				// For safety, if switchSelectedBranch expects an ID, pass it.
				
				// Checking if AuthContext handles store-only switch. 
				// Usually we select the store object itself.
				// Based on products.jsx: await switchSelectedBranch(obj._id, obj.parent);
				// If store, obj.parent is undefined.
				await switchSelectedBranch(obj._id, null); 
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
			case 'pending': return '#F59E0B';
			case 'accepted': return '#3B82F6';
			case 'processing': return '#8B5CF6';
			case 'out-for-delivery': return '#10B981';
			case 'completed': return '#065637';
			case 'cancelled': return '#EF4444';
			default: return '#6B7280';
		}
	};
	const getStatusLabel = (status) => String(status).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');


	return (
		<View style={styles.container}>
			<StatusBar style="light" backgroundColor="#065637" />
			
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
						<Ionicons name="chevron-down" size={14} color="#D1FAE5" style={{ marginLeft: 4 }} />
					</TouchableOpacity>
				</View>
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
					contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
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
							<MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#D1D5DB" />
							<Text style={styles.emptyStateText}>No orders found</Text>
							<Text style={styles.emptyStateSub}>Check a different status or clear your search</Text>
						</View>
					)
				}
				renderItem={({ item }) => {
					const statusColor = getStatusColor(item.status);
					const totalAmount = item.totalAmount || 0;
					const itemCount = item.items?.length || 0;

					return (
						<TouchableOpacity
							style={styles.card}
							activeOpacity={0.7}
							onPress={() => router.push(`/(app)/orders/${item._id}`)}
						>
							<View style={styles.cardHeader}>
								<View style={styles.orderIdRow}>
									<Text style={styles.orderId}>#{item.orderNumber || String(item._id).slice(-6).toUpperCase()}</Text>
									<Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
								</View>
								<View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
									<Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
								</View>
							</View>
							<View style={styles.divider} />
							<View style={styles.cardBody}>
								<View style={styles.customerRow}>
									<View style={styles.avatar}>
										<Text style={styles.avatarText}>{(item.customerInfo?.name || item.customerName || 'C').charAt(0).toUpperCase()}</Text>
									</View>
									<View>
										<Text style={styles.customerName}>{item.customerInfo?.name || item.customerName || 'Walk-in Customer'}</Text>
										<Text style={styles.itemsText}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
									</View>
								</View>
								<View style={styles.amountContainer}>
									<Text style={styles.amountLabel}>Total</Text>
									<Text style={styles.amountValue}>₦{Number(totalAmount).toLocaleString()}</Text>
								</View>
							</View>
							<View style={[styles.paymentStrip, { backgroundColor: item.payment?.status === 'paid' ? '#10B981' : '#F59E0B' }]}>
								<Text style={styles.paymentStripText}>{item.payment?.status === 'paid' ? 'PAID' : 'PAYMENT PENDING'}</Text>
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
							<TouchableOpacity onPress={() => setStoreModalVisible(false)}>
								<Ionicons name="close" size={24} color="#374151" />
							</TouchableOpacity>
						</View>
						<FlatList
							data={userInfo?.stores || []}
							keyExtractor={(s) => s._id}
							contentContainerStyle={{ padding: 16 }}
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
													<View style={{ flexDirection: 'row', alignItems: 'center' }}>
														<View style={styles.branchLine} />
														<View>
															<Text style={[styles.branchOptionName, isBranchSelected && styles.branchOptionNameSelected]}>
																{b.name || b.branchKey || 'Branch'}
															</Text>
															<Text style={styles.branchOptionAddress}>{b.address || 'Branch Location'}</Text>
														</View>
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
	container: { flex: 1, backgroundColor: '#F3F4F6' },
	header: {
		backgroundColor: '#065637',
		paddingTop: Platform.OS === 'android' ? 45 : 60,
		paddingBottom: 20,
		paddingHorizontal: 20,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: '#fff',
		marginBottom: 4,
	},
	storeSelector: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	storeSelectorText: {
		color: '#D1FAE5',
		fontSize: 14,
		fontWeight: '600',
		maxWidth: 250,
	},
	searchSection: {
		paddingHorizontal: 16,
		marginTop: -15,
		marginBottom: 10,
	},
	searchBar: {
		backgroundColor: '#fff',
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		paddingHorizontal: 15,
		height: 50,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 3,
	},
	searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1F2937' },
	tabsContainer: { paddingBottom: 10 },
	tab: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		marginRight: 8,
	},
	activeTab: { backgroundColor: '#065637', borderColor: '#065637' },
	tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
	activeTabText: { color: '#fff' },
	badge: { backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 6 },
	activeBadge: { backgroundColor: 'rgba(255,255,255,0.2)' },
	badgeText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
	activeBadgeText: { color: '#fff' },
	listContent: { paddingHorizontal: 16, paddingBottom: 20 },
	card: {
		backgroundColor: '#fff',
		borderRadius: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
		overflow: 'hidden',
	},
	cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
	orderIdRow: { flexDirection: 'column' },
	orderId: { fontSize: 16, fontWeight: '700', color: '#111827' },
	timeAgo: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
	statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
	statusText: { fontSize: 12, fontWeight: '700' },
	divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
	cardBody: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	customerRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
	avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
	avatarText: { fontSize: 18, fontWeight: '700', color: '#4F46E5' },
	customerName: { fontSize: 14, fontWeight: '600', color: '#374151' },
	itemsText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
	amountContainer: { alignItems: 'flex-end' },
	amountLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase' },
	amountValue: { fontSize: 18, fontWeight: '700', color: '#065637' },
	paymentStrip: { height: 4, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
	paymentStripText: { fontSize: 0, height: 0, opacity: 0 }, /* hidden text mainly for screen readers if needed or debug, simplified to color strip */
	emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
	emptyStateText: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
	emptyStateSub: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },

	// Modal Styles
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
	storeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6' },
	storeOptionSelected: { backgroundColor: '#ECFDF5', borderColor: '#065637' },
	storeOptionName: { fontSize: 16, fontWeight: '600', color: '#374151' },
	storeOptionNameSelected: { color: '#065637' },
	storeOptionAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },
	branchOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingLeft: 12, marginTop: 8 },
	branchOptionSelected: { backgroundColor: '#F0FDF4', borderRadius: 8 },
	branchLine: { width: 2, height: '100%', backgroundColor: '#D1D5DB', marginRight: 12, borderRadius: 1 },
	branchOptionName: { fontSize: 15, fontWeight: '500', color: '#4B5563' },
	branchOptionNameSelected: { color: '#065637', fontWeight: '700' },
	branchOptionAddress: { fontSize: 12, color: '#9CA3AF' },
});
