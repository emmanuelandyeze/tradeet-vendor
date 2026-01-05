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
	const { selectedStore, userInfo, switchSelectedBranch } = useContext(AuthContext);

	// selectedStore may be a branch or a top-level store object
	const storeId = selectedStore?._id ?? userInfo?.stores?.[0]?._id ?? null;

	const {
		products,
		fetchProductsByStore, // (storeId, branchId, { page, q, limit })
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
			const activeStoreId = selectedStore?.parent || selectedStore?._id;
			if (!activeStoreId) return;

			try {
				if (opts.reset) {
					setPage(1);
					setHasMore(true);
				}
				const p = opts.reset ? 1 : page;

				// pass selectedStore._id as branchId (could be a branch object or store)
				// If selectedStore is the parent store itself, branchId might be same or specialized.
				// Based on products context signature update:
				// fetchProductsByStore(storeId, branchId, params)
				const sId = selectedStore?.parent || selectedStore?._id;
				const bId = selectedStore?.parent ? selectedStore._id : null; // If parent exists, it's a branch

				const resp = await fetchProductsByStore(
					sId,
					bId,
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
	}, [selectedStore]); // Dependency on selectedStore object to catch switches

	// Refresh
	const onRefresh = async () => {
		setRefreshing(true);
		await loadProducts({ reset: true });
		setRefreshing(false);
	};

	// Modal Actions
	const openModal = (product = null) => {
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
				const sId = selectedStore?.parent || selectedStore?._id;
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
			// Adapt to AuthContext: switchSelectedBranch(branchId, storeId)
			if (obj.type === 'branch') {
				await switchSelectedBranch(obj._id, obj.parent);
			} else {
				await switchSelectedBranch(obj._id, null);
			}
			setStoreModalVisible(false);
		} catch (err) {
			console.error('Error switching store/branch', err);
		}
	};

	// Display Logic
	const isActiveIsBranch = !!selectedStore?.parent;
	const displayStoreName = selectedStore?.parentStoreName || selectedStore?.name || 'Select Store';

	// Card Component
	const ProductCard = ({ item }) => (
		<TouchableOpacity
			style={styles.card}
			activeOpacity={0.9}
			onPress={() => openMenu(item)}
		>
			<Image
				source={{ uri: getThumbnail(item) }}
				style={styles.cardImage}
				resizeMode="cover"
			/>
			<View style={styles.cardContent}>
				<View style={styles.cardTop}>
					<Text style={styles.cardTitle} numberOfLines={2}>
						{getProductTitle(item)}
					</Text>
					<TouchableOpacity style={styles.moreBtn} onPress={() => openMenu(item)}>
						<MaterialCommunityIcons name="dots-horizontal" size={20} color="#9CA3AF" />
					</TouchableOpacity>
				</View>

				<Text style={styles.cardCategory}>{getCategoryName(item)}</Text>

				<View style={styles.cardFooter}>
					<Text style={styles.cardPrice}>{getPriceString(item)}</Text>
					<View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
						<Text style={[styles.statusText, item.isActive ? styles.statusTextActive : styles.statusTextInactive]}>
							{item.isActive ? 'Active' : 'Inactive'}
						</Text>
					</View>
				</View>

				<View style={styles.typeBadge}>
					<Text style={styles.typeBadgeLabel}>{getTypeBadge(item)}</Text>
				</View>
			</View>
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			<StatusBar style="light" backgroundColor="#065637" />

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
						<Ionicons name="chevron-down" size={14} color="#D1FAE5" style={{ marginLeft: 4 }} />
					</TouchableOpacity>
				</View>
				<TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
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
					contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
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
							<MaterialCommunityIcons name="tag-off-outline" size={64} color="#D1D5DB" />
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
						storeId={selectedStore?.parent || selectedStore?._id}
						branchId={selectedStore?.parent ? selectedStore?._id : null}
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
				<TouchableOpacity style={styles.menuOverlay} onPress={closeMenu} activeOpacity={1}>
					<View style={styles.menuContent}>
						<View style={styles.menuHeader}>
							<Text style={styles.menuTitle} numberOfLines={1}>
								{menuProduct ? getProductTitle(menuProduct) : ''}
							</Text>
							<TouchableOpacity onPress={closeMenu}>
								<Ionicons name="close-circle" size={24} color="#E5E7EB" />
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

										{Array.isArray(s.branches) && s.branches.map(b => {
											const isBranchSelected = selectedStore?._id === b._id;
											return (
												<TouchableOpacity
													key={b._id}
													onPress={() => handleSelectStoreBranch({ type: 'branch', _id: b._id, parent: s._id, ...b })}
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

export default Products;

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F3F4F6' },
	header: {
		backgroundColor: '#065637',
		paddingTop: Platform.OS === 'android' ? 50 : 60,
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
		maxWidth: 200,
	},
	addButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#fff',
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
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
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		marginRight: 8,
	},
	activeTab: { backgroundColor: '#065637', borderColor: '#065637' },
	tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
	activeTabText: { color: '#fff' },
	listContent: { paddingHorizontal: 16, paddingBottom: 100 },

	// Card
	card: {
		backgroundColor: '#fff',
		borderRadius: 16,
		marginBottom: 16,
		flexDirection: 'row',
		padding: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
	},
	cardImage: {
		width: 80,
		height: 80,
		borderRadius: 12,
		backgroundColor: '#F3F4F6',
	},
	cardContent: { flex: 1, marginLeft: 12 },
	cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
	cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
	moreBtn: { padding: 4, marginTop: -4 },
	cardCategory: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
	cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
	cardPrice: { fontSize: 16, fontWeight: '700', color: '#065637' },
	statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
	statusActive: { backgroundColor: '#ECFDF5' },
	statusInactive: { backgroundColor: '#FEF2F2' },
	statusText: { fontSize: 11, fontWeight: '600' },
	statusTextActive: { color: '#059669' },
	statusTextInactive: { color: '#DC2626' },
	typeBadge: {
		position: 'absolute',
		top: -4,
		left: -96, // align with image
		backgroundColor: 'rgba(0,0,0,0.6)',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	typeBadgeLabel: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

	// Empty State
	emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
	emptyStateText: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
	emptyStateSub: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },

	// Modals (General)
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },

	// Action Menu
	menuContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
	menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	menuTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 },
	menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
	menuIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
	menuText: { fontSize: 16, fontWeight: '500', color: '#374151' },
	menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

	// Store Selector (matches Orders)
	selectorContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
	selectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	selectorTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
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

	// Add/Edit Modal
	modalContainer: { flex: 1, backgroundColor: '#fff' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
	closeBtn: { padding: 4 },
});
