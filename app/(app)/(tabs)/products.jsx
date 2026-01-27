// screens/Products.js
import React, {
	useContext,
	useEffect,
	useState,
	useCallback,
} from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
	StyleSheet,
	Image,
	ActivityIndicator,
	Alert,
	TextInput,
	Platform,
	RefreshControl,
	Dimensions,
} from 'react-native';
import AddProduct from '@/components/AddProduct';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ProductsContext } from '@/context/ProductsContext';
import { AuthContext } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';

const DEFAULT_THUMB =
	'https://res.cloudinary.com/demo/image/upload/v1690000000/placeholder.png';
const { width } = Dimensions.get('window');

const Products = () => {
	const { selectedStore, userInfo, switchSelectedBranch, switchSelectedStore, getPlanCapability } = useContext(AuthContext);

	// selectedStore may be a branch or a top-level store object
	const selectedOrFallback = selectedStore || userInfo?.stores?.[0];

	// Determine Brand ID (parent) and Branch ID
	const effectiveBrandId = selectedOrFallback?.parent || selectedOrFallback?._id || null;
	const effectiveBranchId = selectedOrFallback?.parent ? selectedOrFallback?._id : null;

	// For loadProducts effect dependency
	const storeId = effectiveBrandId;

	const {
		products,
		fetchProductsByStore,
		loading,
		setProducts,
		addProduct,
		updateProduct,
		deleteProduct,
	} = useContext(ProductsContext);

	// Helper: always return items array from products state
	const itemsArray = Array.isArray(products)
		? products
		: Array.isArray(products?.items)
			? products.items
			: [];

	// Helper to update products state safely
	const updateProductsItems = (updater) => {
		setProducts((prev) => {
			const currentItems = Array.isArray(prev)
				? prev
				: Array.isArray(prev?.items)
					? prev.items
					: [];

			const nextItems = updater(currentItems || []);

			if (prev && typeof prev === 'object' && !Array.isArray(prev)) {
				return { ...prev, items: nextItems };
			}
			return nextItems;
		});
	};

	// Local UI state
	const [isModalVisible, setModalVisible] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [menuProduct, setMenuProduct] = useState(null);
	const [selectedCategory, setSelectedCategory] = useState('All');
	const [searchQ, setSearchQ] = useState('');
	const [refreshing, setRefreshing] = useState(false);

	// Store selection modal
	const [storeModalVisible, setStoreModalVisible] = useState(false);

	// Pagination
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const PER_PAGE = 20;

	// Load Products
	const loadProducts = useCallback(
		async (opts = { reset: false }) => {
			if (!effectiveBrandId) return;

			try {
				if (opts.reset) {
					setPage(1);
					setHasMore(true);
				}
				const p = opts.reset ? 1 : page;

				const resp = await fetchProductsByStore(
					effectiveBrandId,
					effectiveBranchId,
					{
						page: p,
						q: searchQ || undefined,
						limit: PER_PAGE,
					},
				);

				if (resp && resp.items) {
					setHasMore(
						resp.items.length === PER_PAGE &&
						(resp.total ? resp.items.length < resp.total : true),
					);
					if (opts.reset) {
						setPage(2);
					} else {
						setPage((prev) => prev + 1);
					}
				} else {
					setHasMore(itemsArray.length >= PER_PAGE);
				}
				return resp;
			} catch (err) {
				console.error('loadProducts error', err);
			}
		},
		[selectedStore, page, searchQ],
	);

	// Reload when store changes
	useEffect(() => {
		if (storeId) {
			loadProducts({ reset: true });
		} else {
			setProducts([]);
		}
	}, [selectedStore]);

	// Refresh
	const onRefresh = async () => {
		setRefreshing(true);
		await loadProducts({ reset: true });
		setRefreshing(false);
	};

	// Modal Actions
	const openModal = (product = null) => {
		if (!product) {
			// Check limit for NEW products
			const limit = getPlanCapability('productLimit');
			if (itemsArray.length >= limit) {
				Alert.alert(
					'Product Limit Reached',
					`Your current plan allows up to ${limit} products. Please upgrade to add more.`,
					[
						{ text: 'Cancel', style: 'cancel' },
						{ text: 'Upgrade', onPress: () => router.push('/(app)/subscription') }
					]
				);
				return;
			}
		}
		setIsEditing(Boolean(product));
		setSelectedProduct(product);
		setModalVisible(true);
	};

	const closeModal = () => {
		setModalVisible(false);
		setSelectedProduct(null);
		setIsEditing(false);
	};

	// Save Product
	const onAddProduct = async (newProduct) => {
		try {
			if (isEditing && newProduct._id) {
				await updateProduct(newProduct._id, newProduct);
			} else {
				// Add to current store context
				const sId = effectiveBrandId;
				await addProduct(newProduct, sId);
			}
			await loadProducts({ reset: true });
			closeModal();
		} catch (err) {
			console.error('onAddProduct error', err);
			Alert.alert('Error', 'Could not save product. Try again.');
		}
	};

	// Menu Actions
	const openMenu = (product) => setMenuProduct(product);
	const closeMenu = () => setMenuProduct(null);

	const confirmDelete = (product) => {
		Alert.alert(
			'Delete product',
			`Are you sure you want to delete "${getProductTitle(product)}"?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteProduct(product._id);
							updateProductsItems((items) =>
								items.filter((p) => p._id !== product._id),
							);
							closeMenu();
						} catch (err) {
							Alert.alert('Error', 'Failed to delete product.');
						}
					},
				},
			],
		);
	};

	const toggleActive = async (product) => {
		try {
			const newStatus = !Boolean(product.isActive);
			// Optimistic update
			updateProductsItems((items) =>
				items.map((p) =>
					String(p._id) === String(product._id)
						? { ...p, isActive: newStatus }
						: p,
				),
			);
			await updateProduct(product._id, { isActive: newStatus });
		} catch (err) {
			Alert.alert('Error', 'Could not change status.');
			loadProducts({ reset: true });
		} finally {
			closeMenu();
		}
	};

	// Read Fields
	const getProductTitle = (p) => p?.title || p?.name || 'Untitled';
	const getThumbnail = (p) =>
		p?.thumbnail ||
		(Array.isArray(p?.images) ? p.images[0] : null) ||
		p?.image ||
		DEFAULT_THUMB;
	const getCategoryName = (p) =>
		typeof p?.category === 'string'
			? p.category
			: p?.category?.name || 'Uncategorized';
	const getPriceString = (p) => {
		const amount = Number(p?.price ?? p?.priceAmount ?? 0);
		const currency = p?.currency ?? p?.currencyCode ?? 'NGN';
		return `${currency} ${amount.toLocaleString()}`;
	};
	const getTypeBadge = (p) => p?.type || p?.productType || 'physical';

	// Categories
	const categories = [
		'All',
		...Array.from(new Set(itemsArray.map((p) => getCategoryName(p)))),
	];

	// Store Switching
	const handleSelectStoreBranch = async (obj) => {
		try {
			if (!obj) return;
			if (obj.type === 'branch') {
				await switchSelectedBranch(obj._id, obj.parent);
			} else {
				// Fixed: use switchSelectedStore for stores
				await switchSelectedStore(obj);
			}
			setStoreModalVisible(false);
		} catch (err) {
			console.error('Error switching store/branch', err);
		}
	};

	// Display Logic
	const isActiveIsBranch = !!selectedStore?.parent;
	const displayStoreName = selectedStore?.parentStoreName || selectedStore?.name || 'Select Store';

	// Card Component - Updated Style
	const ProductCard = ({ item }) => (
		<TouchableOpacity
			style={styles.card}
			activeOpacity={0.7}
			onPress={() => openMenu(item)}
		>
			<Image
				source={{ uri: getThumbnail(item) }}
				style={styles.cardImage}
				resizeMode="cover"
			/>
			<View style={styles.cardContent}>
				<View style={styles.cardHeaderRow}>
					<View style={{ flex: 1 }}>
						<Text style={styles.cardTitle} numberOfLines={1}>
							{getProductTitle(item)}
						</Text>
						<Text style={styles.cardCategory}>{getCategoryName(item)}</Text>
					</View>

					<View style={[styles.statusPill, item.isActive ? styles.statusActive : styles.statusInactive]}>
						<Text style={[styles.statusText, item.isActive ? styles.statusTextActive : styles.statusTextInactive]}>
							{item.isActive ? 'Active' : 'Inactive'}
						</Text>
					</View>
				</View>

				<View style={styles.cardFooter}>
					<Text style={styles.cardPrice}>{getPriceString(item)}</Text>
					{item.stock !== undefined && (
						<Text style={styles.stockLabel}>{item.stock} in stock</Text>
					)}
				</View>
			</View>
			<View style={styles.moreBtnAbsolute}>
				<Ionicons name="ellipsis-vertical" size={16} color="#9CA3AF" />
			</View>
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			<StatusBar style="dark" backgroundColor="#FFFFFF" />

			{/* Header */}
			<View style={styles.header}>
				<View style={{ flex: 1 }}>
					<Text style={styles.headerTitle}>Products</Text>
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
				<TouchableOpacity style={styles.iconButton} onPress={() => openModal()}>
					<Ionicons name="add" size={24} color="#065637" />
				</TouchableOpacity>
			</View>

			{/* Search */}
			<View style={styles.searchSection}>
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color="#9CA3AF" />
					<TextInput
						style={styles.searchInput}
						placeholder="Search products..."
						value={searchQ}
						onChangeText={setSearchQ}
						onSubmitEditing={() => loadProducts({ reset: true })}
						placeholderTextColor="#9CA3AF"
					/>
					{searchQ.length > 0 && (
						<TouchableOpacity onPress={() => { setSearchQ(''); loadProducts({ reset: true }); }}>
							<Ionicons name="close-circle" size={18} color="#9CA3AF" />
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* Categories */}
			<View style={styles.tabsContainer}>
				<FlatList
					horizontal
					showsHorizontalScrollIndicator={false}
					data={categories}
					keyExtractor={(c) => c}
					contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
					renderItem={({ item }) => {
						const isActive = selectedCategory === item;
						return (
							<TouchableOpacity
								style={[styles.tab, isActive && styles.activeTab]}
								onPress={() => setSelectedCategory(item)}
							>
								<Text style={[styles.tabText, isActive && styles.activeTabText]}>{item}</Text>
							</TouchableOpacity>
						);
					}}
				/>
			</View>

			{/* List */}
			<FlatList
				data={
					selectedCategory === 'All'
						? itemsArray
						: itemsArray.filter((p) => getCategoryName(p) === selectedCategory)
				}
				keyExtractor={(item) => String(item._id)}
				contentContainerStyle={styles.listContent}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#065637" />
				}
				onEndReached={() => {
					if (!loading && hasMore) loadProducts({ reset: false });
				}}
				onEndReachedThreshold={0.5}
				ListEmptyComponent={
					!loading && (
						<View style={styles.emptyState}>
							<View style={styles.emptyIconBg}>
								<Ionicons name="cube-outline" size={48} color="#9CA3AF" />
							</View>
							<Text style={styles.emptyStateText}>No products found</Text>
							<Text style={styles.emptyStateSub}>Tap + to add your first product</Text>
						</View>
					)
				}
				renderItem={({ item }) => <ProductCard item={item} />}
			/>

			{/* Modals */}

			{/* Add/Edit Modal */}
			<Modal visible={isModalVisible} animationType="slide" onRequestClose={closeModal} presentationStyle="pageSheet">
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>{isEditing ? 'Edit Product' : 'New Product'}</Text>
						<TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
							<Ionicons name="close" size={24} color="#374151" />
						</TouchableOpacity>
					</View>
					<AddProduct
						updateProduct={updateProduct}
						onAddProduct={onAddProduct}
						initialProduct={selectedProduct}
						storeId={effectiveBrandId}
						branchId={effectiveBranchId}
						loading={loading}
					/>
				</View>
			</Modal>

			{/* Actions Menu Modal */}
			<Modal
				visible={!!menuProduct}
				transparent
				animationType="fade"
				onRequestClose={closeMenu}
			>
				<TouchableOpacity style={styles.modalOverlay} onPress={closeMenu} activeOpacity={1}>
					<View style={styles.menuContent}>
						<View style={styles.menuHeader}>
							<Text style={styles.menuTitle} numberOfLines={1}>
								{menuProduct ? getProductTitle(menuProduct) : ''}
							</Text>
							<TouchableOpacity onPress={closeMenu}>
								<Ionicons name="close" size={20} color="#9CA3AF" />
							</TouchableOpacity>
						</View>

						<TouchableOpacity
							style={styles.menuItem}
							onPress={() => { closeMenu(); openModal(menuProduct); }}
						>
							<View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
								<FontAwesome name="edit" size={18} color="#3B82F6" />
							</View>
							<Text style={styles.menuText}>Edit Details</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.menuItem}
							onPress={() => toggleActive(menuProduct)}
						>
							<View style={[styles.menuIcon, { backgroundColor: menuProduct?.isActive ? '#FEF3C7' : '#ECFDF5' }]}>
								<Ionicons
									name={menuProduct?.isActive ? "eye-off" : "eye"}
									size={20}
									color={menuProduct?.isActive ? "#D97706" : "#10B981"}
								/>
							</View>
							<Text style={styles.menuText}>
								{menuProduct?.isActive ? 'Mark as Inactive' : 'Mark as Active'}
							</Text>
						</TouchableOpacity>

						<View style={styles.menuDivider} />

						<TouchableOpacity
							style={styles.menuItem}
							onPress={() => confirmDelete(menuProduct)}
						>
							<View style={[styles.menuIcon, { backgroundColor: '#FEF2F2' }]}>
								<Ionicons name="trash" size={20} color="#EF4444" />
							</View>
							<Text style={[styles.menuText, { color: '#EF4444' }]}>Delete Product</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>

			{/* Store Selector Modal */}
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
					<View style={styles.selectorContent}>
						<View style={styles.selectorHeader}>
							<Text style={styles.selectorTitle}>Select Business</Text>
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

										{Array.isArray(s.branches) && s.branches.map(b => {
											const isBranchSelected = selectedStore?._id === b._id;
											return (
												<TouchableOpacity
													key={b._id}
													onPress={() => handleSelectStoreBranch({ type: 'branch', _id: b._id, parent: s._id, ...b })}
													style={[styles.branchOption, isBranchSelected && styles.branchOptionSelected]}
												>
													<View style={{ flexDirection: 'row', alignItems: 'center' }}>
														<Ionicons
															name="return-down-forward-outline"
															size={16}
															color="#9CA3AF"
															style={{ marginRight: 8, marginLeft: 4 }}
														/>
														<View>
															<Text style={[styles.branchOptionName, isBranchSelected && styles.branchOptionNameSelected]}>
																{b.name || b.branchKey || 'Branch'}
															</Text>
															<Text style={styles.branchOptionAddress}>{b.address || 'Location'}</Text>
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

export default Products;

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#FFFFFF' },

	// Header
	header: {
		backgroundColor: '#FFFFFF',
		paddingTop: Platform.OS === 'android' ? 50 : 60,
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
		maxWidth: 200,
	},
	iconButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#F3F4F6',
		justifyContent: 'center',
		alignItems: 'center',
	},

	// Search
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
	},
	searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1F2937' },

	// Tabs
	tabsContainer: { paddingBottom: 16 },
	tab: {
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
	listContent: { paddingHorizontal: 20, paddingBottom: 100 },

	// Card - Refined
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		marginBottom: 16,
		flexDirection: 'row',
		padding: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	cardImage: {
		width: 72,
		height: 72,
		borderRadius: 8,
		backgroundColor: '#F3F4F6',
	},
	cardContent: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
	cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
	cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginRight: 16 },
	cardCategory: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

	moreBtnAbsolute: { position: 'absolute', top: 12, right: 0, padding: 4 },

	cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
	cardPrice: { fontSize: 15, fontWeight: '700', color: '#111827' },
	stockLabel: { fontSize: 11, color: '#6B7280' },

	statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginRight: 10 },
	statusActive: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
	statusInactive: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
	statusText: { fontSize: 10, fontWeight: '700' },
	statusTextActive: { color: '#166534' },
	statusTextInactive: { color: '#991B1B' },

	// Empty State
	emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
	emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
	emptyStateText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
	emptyStateSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },

	// Modals (General)
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },

	// Action Menu
	menuContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
	menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	menuTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 },
	menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
	menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
	menuText: { fontSize: 15, fontWeight: '500', color: '#374151' },
	menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },

	// Store Selector (matches Orders)
	selectorContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
	selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	selectorTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
	closeBtn: { padding: 4, backgroundColor: '#F3F4F6', borderRadius: 20 },
	storeOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
	storeOptionSelected: { backgroundColor: '#F0FDF4', borderColor: '#065637' },
	storeOptionName: { fontSize: 15, fontWeight: '600', color: '#374151' },
	storeOptionNameSelected: { color: '#065637' },
	storeOptionAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },
	branchOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingLeft: 0, marginTop: 8 },
	branchOptionSelected: { backgroundColor: '#F9FAFB', borderRadius: 8 },
	branchLine: { width: 2, height: '100%', backgroundColor: '#E5E7EB' },
	branchOptionName: { fontSize: 14, fontWeight: '500', color: '#4B5563' },
	branchOptionNameSelected: { color: '#065637', fontWeight: '700' },
	branchOptionAddress: { fontSize: 11, color: '#9CA3AF' },

	// Add/Edit Modal
	modalContainer: { flex: 1, backgroundColor: '#fff' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
});
