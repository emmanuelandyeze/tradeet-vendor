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
	const { selectedStore, userInfo, switchSelectedBranch } =
		useContext(AuthContext);

	// selectedStore may be a branch or a top-level store object
	const storeId =
		selectedStore?._id ??
		userInfo?.stores?.[0]?._id ??
		null;

	const {
		products,
		fetchProductsByStore, // (storeId, { page, q, limit })
		loading,
		error,
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

	// Helper to update products state safely (keeps shape if object)
	const updateProductsItems = (updater) => {
		setProducts((prev) => {
			const currentItems = Array.isArray(prev)
				? prev
				: Array.isArray(prev?.items)
				? prev.items
				: [];

			const nextItems = updater(currentItems || []);

			if (
				prev &&
				typeof prev === 'object' &&
				!Array.isArray(prev)
			) {
				return { ...prev, items: nextItems };
			}
			return nextItems;
		});
	};

	// Local UI state
	const [isModalVisible, setModalVisible] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [selectedProduct, setSelectedProduct] =
		useState(null);
	const [menuProduct, setMenuProduct] = useState(null);
	const [selectedCategory, setSelectedCategory] =
		useState('All');
	const [searchQ, setSearchQ] = useState('');
	const [refreshing, setRefreshing] = useState(false);

	// new: store/branch selector modal state
	const [storeModalVisible, setStoreModalVisible] =
		useState(false);

	// pagination local state
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const PER_PAGE = 20;

	// Fetch products for current store
	const loadProducts = useCallback(
		async (opts = { reset: false }) => {
			const storeId = selectedStore?.parent;
			if (!storeId) return;
			try {
				if (opts.reset) {
					setPage(1);
					setHasMore(true);
				}
				const p = opts.reset ? 1 : page;

				// pass selectedStore._id as branchId (could be a branch object or store)
				const branchId = selectedStore?._id ?? null;
				

				// fetchProductsByStore expected to accept (storeId, branchId, { page, q, limit })
				const resp = await fetchProductsByStore(
					storeId,
					branchId,
					{
						page: p,
						q: searchQ || undefined,
						limit: PER_PAGE,
					},
				);

				// If fetchProductsByStore returns { items, total } use it to set local pagination
				if (resp && resp.items) {
					setHasMore(
						resp.items.length === PER_PAGE &&
							(resp.total
								? resp.items.length < resp.total
								: true),
					);
					if (opts.reset) {
						setPage(2);
					} else {
						setPage((prev) => prev + 1);
					}
				} else {
					// fallback: if context contains products, set hasMore heuristically
					setHasMore(itemsArray.length >= PER_PAGE);
				}

				return resp;
			} catch (err) {
				console.error('loadProducts error', err);
				throw err;
			}
		},
		[storeId, page, searchQ],
	);


	// reload when store changes
	useEffect(() => {
		if (storeId) {
			loadProducts({ reset: true });
		} else {
			// clear if no store selected
			setProducts([]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [storeId]);

	// Pull-to-refresh
	const onRefresh = async () => {
		setRefreshing(true);
		await loadProducts({ reset: true });
		setRefreshing(false);
	};

	// Open add/edit modal
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

	// Handle product add/update callback from AddProduct component
	const onAddProduct = async (newProduct) => {
		try {
			if (isEditing && newProduct._id) {
				await updateProduct(newProduct._id, newProduct);
			} else {
				// ensure created in correct branch: addProduct signature accepts storeId override
				await addProduct(newProduct, storeId);
			}
			await loadProducts({ reset: true });
			closeModal();
		} catch (err) {
			console.error('onAddProduct error', err);
			Alert.alert(
				'Error',
				'Could not save product. Try again.',
			);
		}
	};

	// Open menu modal for actions
	const openMenu = (product) => {
		setMenuProduct(product);
	};
	const closeMenu = () => setMenuProduct(null);

	// Confirm delete
	const confirmDelete = (product) => {
		Alert.alert(
			'Delete product',
			`Are you sure you want to delete "${getProductTitle(
				product,
			)}"? This action cannot be undone.`,
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
							console.error('deleteProduct error', err);
							Alert.alert(
								'Error',
								'Failed to delete product.',
							);
						}
					},
				},
			],
		);
	};

	// Toggle active state
	const toggleActive = async (product) => {
		try {
			const newStatus = !Boolean(product.isActive);

			// optimistic UI update (safe)
			updateProductsItems((items) =>
				items.map((p) =>
					String(p._id) === String(product._id)
						? { ...p, isActive: newStatus }
						: p,
				),
			);

			await updateProduct(product._id, {
				isActive: newStatus,
			});
		} catch (err) {
			console.error('toggleActive error', err);
			Alert.alert(
				'Error',
				'Could not change product status.',
			);
			await loadProducts({ reset: true }); // rollback fetch
		} finally {
			closeMenu();
		}
	};

	// Helpers to read fields from backend-compatible item shapes
	const getProductTitle = (p) =>
		p?.title || p?.name || 'Untitled';
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
		const currency =
			p?.currency ?? p?.currencyCode ?? 'NGN';
		try {
			return `${currency} ${amount.toLocaleString()}`;
		} catch {
			return `${currency} ${amount}`;
		}
	};
	const getTypeBadge = (p) => {
		const t =
			p?.type ||
			(p?.productType ? p.productType : 'physical');
		return t;
	};

	// categories list computed from itemsArray
	const categories = [
		'All',
		...Array.from(
			new Set(itemsArray.map((p) => getCategoryName(p))),
		),
	];

	// Build store/branch flat structure for selector modal
	const buildStoreBranchList = () => {
		if (!Array.isArray(userInfo?.stores)) return [];
		const list = [];
		for (const s of userInfo.stores) {
			// push brand/store itself
			list.push({
				type: 'store',
				_id: s._id,
				name: s.name,
				address: s.address,
				storeObj: s,
			});
			// push branches if available
			if (Array.isArray(s.branches)) {
				for (const b of s.branches) {
					list.push({
						type: 'branch',
						_id: b._id,
						name:
							b.name || b.branchKey || `${s.name} branch`,
						address: b.address || s.address,
						storeObj: s,
						branchObj: b,
					});
				}
			}
		}
		return list;
	};

	const storeBranchList = buildStoreBranchList();

	// Render single product card
	const ProductCard = ({ item }) => {
		return (
			<View style={styles.productCard}>
				<Image
					source={{ uri: getThumbnail(item) }}
					style={styles.productImage}
					resizeMode="cover"
				/>

				<View style={styles.productInfo}>
					<View style={styles.titleRow}>
						<Text
							style={styles.productName}
							numberOfLines={2}
						>
							{getProductTitle(item)}
						</Text>
						<View
							style={[
								styles.typeBadge,
								item.isActive
									? styles.badgeActive
									: styles.badgeMuted,
							]}
						>
							<Text style={styles.typeBadgeText}>
								{getTypeBadge(item).toUpperCase()}
							</Text>
						</View>
					</View>

					<Text style={styles.metaText}>
						{getCategoryName(item)}
					</Text>

					<View style={styles.priceRow}>
						<Text style={styles.priceText}>
							{getPriceString(item)}
						</Text>
						<Text
							style={[
								styles.statusText,
								item.isActive
									? styles.statusActive
									: styles.statusInactive,
							]}
						>
							{item.isActive ? 'Active' : 'Inactive'}
						</Text>
					</View>

					<View style={styles.cardActions}>
						<TouchableOpacity
							onPress={() => openModal(item)}
							style={styles.iconBtn}
						>
							<FontAwesome
								name="edit"
								size={18}
								color="#065637"
							/>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => openMenu(item)}
							style={styles.iconBtn}
						>
							<MaterialCommunityIcons
								name="dots-vertical"
								size={20}
								color="#444"
							/>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		);
	};

	// Load more on scroll
	const handleEndReached = () => {
		if (!hasMore || loading) return;
		loadProducts({ reset: false });
	};

	// Search submit (press Enter) -> refresh list
	const onSearchSubmit = async () => {
		await loadProducts({ reset: true });
	};

	// switch handler from selector modal
	const handleSelectStoreBranch = async (obj) => {
		try {
			// obj may be storeObj or branch object with _id. use switchSelectedStore with the full object if available
			if (!obj) return;
			// switchSelectedStore accepts either id or object per your AuthContext
			await switchSelectedBranch(obj._id, obj.parent);
			setStoreModalVisible(false);
			// loadProducts will run as effect once selectedStore changes
		} catch (err) {
			console.error('Error switching store/branch', err);
		}
	};

	// compute display store name and branch line
	const displayStoreName =
		selectedStore?.name ??
		userInfo?.stores?.[0]?.name ??
		'—';
	// branch name: if selectedStore has branch-related fields (like branchKey or parent store reference), show them.
	const displayBranchName = selectedStore?.branchKey
		? selectedStore?.name || selectedStore?.branchKey
		: selectedStore?.parentStoreName // fallback if your branch objects have parentStoreName
		? selectedStore?.name
		: // If selectedStore has both store and branch fields, try to detect branch by presence of "branchKey" or "branchName"
		  selectedStore?.branchName ||
		  (selectedStore?.isBranch
				? selectedStore?.name
				: null);

	return (
		<View style={styles.container}>
			<StatusBar style="light" backgroundColor="#065637" />
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Catalogue</Text>

				<View style={styles.headerRight}>
					<TouchableOpacity
						onPress={() => openModal()}
						style={styles.addButton}
					>
						<Ionicons name="add" size={22} color="#fff" />
					</TouchableOpacity>
				</View>
			</View>

			{/* Store info + category + search */}
			<View style={styles.controls}>
				<TouchableOpacity
					style={styles.storeRow}
					onPress={() => setStoreModalVisible(true)}
				>
					<View>
						<Text style={styles.storeLabel}>Store</Text>
						<Text style={styles.storeName}>
							{displayStoreName}
						</Text>
						{displayBranchName ? (
							<Text style={styles.branchName}>
								{displayBranchName}
							</Text>
						) : null}
					</View>

					<View style={{ marginLeft: 'auto' }}>
						<Ionicons
							name="chevron-down"
							size={22}
							color="#065637"
						/>
					</View>
				</TouchableOpacity>

				<View style={styles.searchRow}>
					<TextInput
						placeholder="Search products..."
						value={searchQ}
						onChangeText={setSearchQ}
						onSubmitEditing={onSearchSubmit}
						returnKeyType="search"
						style={styles.searchInput}
					/>
					<TouchableOpacity
						onPress={onSearchSubmit}
						style={styles.searchBtn}
					>
						<Ionicons
							name="search"
							size={20}
							color="#fff"
						/>
					</TouchableOpacity>
				</View>

				<View style={styles.pickerContainer}>
					{/* category picker */}
					<FlatList
						horizontal
						showsHorizontalScrollIndicator={false}
						data={categories}
						keyExtractor={(c) => c}
						renderItem={({ item }) => (
							<TouchableOpacity
								onPress={() => setSelectedCategory(item)}
								style={[
									styles.categoryChip,
									selectedCategory === item &&
										styles.categoryChipActive,
								]}
							>
								<Text
									style={
										selectedCategory === item
											? styles.categoryTextActive
											: styles.categoryText
									}
								>
									{item}
								</Text>
							</TouchableOpacity>
						)}
					/>
				</View>
			</View>

			{/* Products list */}
			<View style={styles.listWrap}>
				{loading &&
				(!itemsArray || itemsArray.length === 0) ? (
					<View style={styles.loadingWrap}>
						<ActivityIndicator
							size="large"
							color="#065637"
						/>
					</View>
				) : (
					<FlatList
						data={
							selectedCategory === 'All'
								? itemsArray
								: itemsArray.filter(
										(p) =>
											getCategoryName(p) ===
											selectedCategory,
								  )
						}
						keyExtractor={(item) => String(item._id)}
						renderItem={({ item }) => (
							<ProductCard item={item} />
						)}
						ItemSeparatorComponent={() => (
							<View style={{ height: 12 }} />
						)}
						contentContainerStyle={{
							padding: 16,
							paddingBottom: 120,
						}}
						onEndReached={handleEndReached}
						onEndReachedThreshold={0.6}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={onRefresh}
							/>
						}
						ListEmptyComponent={
							<View style={styles.emptyWrap}>
								<Text style={styles.emptyText}>
									No products found.
								</Text>
								<Text style={styles.emptyHint}>
									Tap the + button to add your first
									product.
								</Text>
							</View>
						}
					/>
				)}
			</View>

			{/* Action menu modal */}
			<Modal
				visible={!!menuProduct}
				transparent
				animationType="fade"
				onRequestClose={closeMenu}
			>
				<TouchableOpacity
					style={styles.menuOverlay}
					onPress={closeMenu}
					activeOpacity={1}
				>
					<View style={styles.menu}>
						<Text style={styles.menuTitle}>
							{getProductTitle(menuProduct)}
						</Text>

						<TouchableOpacity
							style={styles.menuItem}
							onPress={() => {
								closeMenu();
								openModal(menuProduct);
							}}
						>
							<Text style={styles.menuItemText}>
								Edit product
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.menuItem}
							onPress={() => {
								toggleActive(menuProduct);
							}}
						>
							<Text style={styles.menuItemText}>
								{menuProduct?.isActive
									? 'Make inactive'
									: 'Make active'}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.menuItem,
								{
									borderTopWidth: 1,
									borderTopColor: '#eee',
								},
							]}
							onPress={() => confirmDelete(menuProduct)}
						>
							<Text
								style={[
									styles.menuItemText,
									{ color: '#e74c3c' },
								]}
							>
								Delete product
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.menuClose]}
							onPress={closeMenu}
						>
							<Text style={styles.menuCloseText}>
								Close
							</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>

			{/* Add/Edit modal */}
			<Modal
				visible={isModalVisible}
				animationType="slide"
				onRequestClose={closeModal}
			>
				<View style={styles.modalContainer}>
					<AddProduct
						updateProduct={updateProduct}
						onAddProduct={onAddProduct}
						initialProduct={selectedProduct}
						storeId={selectedStore?.parent}
						branchId={selectedStore?._id}
						loading={loading}
					/>
					<TouchableOpacity
						onPress={closeModal}
						style={styles.modalCloseBtn}
					>
						<Ionicons name="close" size={22} color="#fff" />
					</TouchableOpacity>
				</View>
			</Modal>

			{/* Store/Branch selector modal */}
			<Modal
				visible={storeModalVisible}
				animationType="slide"
				transparent
				onRequestClose={() => setStoreModalVisible(false)}
			>
				<View style={styles.storeModalOverlay}>
					<View style={styles.storeModal}>
						<Text style={styles.storeModalTitle}>
							Select store or branch
						</Text>

						<FlatList
							data={userInfo?.stores || []}
							keyExtractor={(s) => s._id}
							ItemSeparatorComponent={() => (
								<View style={{ height: 8 }} />
							)}
							renderItem={({ item: s }) => {
								const isStoreSelected =
									selectedStore &&
									selectedStore._id === s._id;
								return (
									<View>
										<TouchableOpacity
											onPress={async () => {
												await handleSelectStoreBranch(s);
											}}
											style={[
												styles.storeItem,
												isStoreSelected &&
													styles.storeItemSelected,
											]}
										>
											<View>
												<Text style={styles.storeNameModal}>
													{s.name}
												</Text>
												{s.address ? (
													<Text style={styles.storeAddress}>
														{s.address}
													</Text>
												) : null}
											</View>
											{isStoreSelected ? (
												<Ionicons
													name="checkmark"
													size={20}
													color="#065637"
												/>
											) : null}
										</TouchableOpacity>

										{Array.isArray(s.branches) &&
											s.branches.length > 0 && (
												<View style={{ paddingLeft: 12 }}>
													{s.branches.map((b) => {
														const isBranchSelected =
															selectedStore &&
															selectedStore._id === b._id;
														return (
															<TouchableOpacity
																key={b._id}
																onPress={async () => {
																	await handleSelectStoreBranch(
																		b,
																	);
																}}
																style={[
																	styles.branchItem,
																	isBranchSelected &&
																		styles.branchItemSelected,
																]}
															>
																<View>
																	<Text
																		style={
																			styles.branchNameModal
																		}
																	>
																		{b.name || b.branchKey}
																	</Text>
																	{b.address ? (
																		<Text
																			style={
																				styles.storeAddress
																			}
																		>
																			{b.address}
																		</Text>
																	) : null}
																</View>
																{isBranchSelected ? (
																	<Ionicons
																		name="checkmark"
																		size={18}
																		color="#065637"
																	/>
																) : null}
															</TouchableOpacity>
														);
													})}
												</View>
											)}
									</View>
								);
							}}
							ListEmptyComponent={() => (
								<View style={{ padding: 20 }}>
									<Text
										style={{
											textAlign: 'center',
											color: '#777',
										}}
									>
										No stores available
									</Text>
								</View>
							)}
						/>

						<TouchableOpacity
							style={styles.storeModalClose}
							onPress={() => setStoreModalVisible(false)}
						>
							<Text style={styles.storeModalCloseText}>
								Close
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	// container
	container: { flex: 1, backgroundColor: '#fff' },

	// header
	header: {
		backgroundColor: '#065637',
		paddingHorizontal: 16,
		paddingTop: Platform.OS === 'android' ? 60 : 40,
		paddingBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerTitle: {
		color: '#fff',
		fontSize: 22,
		fontWeight: '700',
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	addButton: {
		marginLeft: 12,
		backgroundColor: '#0fa36b',
		padding: 10,
		borderRadius: 8,
		elevation: 2,
	},

	// controls
	controls: { paddingHorizontal: 16, paddingTop: 12 },
	storeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		justifyContent: 'space-between',
	},
	storeLabel: { color: '#6b7280', marginRight: 8 },
	storeName: { fontWeight: '700', fontSize: 16 },
	branchName: { color: '#6b7280', fontSize: 13 },

	searchRow: { flexDirection: 'row', marginBottom: 8 },
	searchInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#e6e6e6',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: '#fff',
		marginRight: 8,
	},
	searchBtn: {
		backgroundColor: '#065637',
		padding: 10,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},

	pickerContainer: {
		marginBottom: 12,
	},
	categoryChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: '#f3f4f6',
		borderRadius: 20,
		marginRight: 8,
	},
	categoryChipActive: {
		backgroundColor: '#065637',
	},
	categoryText: { color: '#333' },
	categoryTextActive: { color: '#fff' },

	// list
	listWrap: { flex: 1 },
	loadingWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},

	// product card
	productCard: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 12,
		shadowColor: '#000',
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 1,
		alignItems: 'flex-start',
	},
	productImage: {
		width: 88,
		height: 88,
		borderRadius: 8,
		backgroundColor: '#f1f1f1',
		marginRight: 12,
	},
	productInfo: { flex: 1 },
	titleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	productName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
		flex: 1,
		marginRight: 8,
	},
	metaText: { color: '#6b7280', marginTop: 4 },
	priceRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 8,
	},
	priceText: {
		fontSize: 15,
		fontWeight: '800',
		color: '#065637',
	},
	statusText: {
		fontSize: 12,
		fontWeight: '700',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	statusActive: {
		color: '#0f5132',
		backgroundColor: '#d1fae5',
	},
	statusInactive: {
		color: '#6b7280',
		backgroundColor: '#f3f4f6',
	},

	// badge
	typeBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
	},
	typeBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#065637',
	},
	badgeActive: { backgroundColor: '#e6ffef' },
	badgeMuted: { backgroundColor: '#fff2f2' },

	// actions
	cardActions: { flexDirection: 'row', marginTop: 12 },
	iconBtn: { marginRight: 10, padding: 6 },

	// menu modal
	menuOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'flex-end',
	},
	menu: {
		backgroundColor: '#fff',
		padding: 16,
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
	},
	menuTitle: {
		fontSize: 16,
		fontWeight: '800',
		marginBottom: 8,
	},
	menuItem: { paddingVertical: 12 },
	menuItemText: { fontSize: 15, color: '#111827' },
	menuClose: {
		marginTop: 8,
		paddingVertical: 10,
		alignItems: 'center',
	},
	menuCloseText: { fontSize: 15, color: '#6b7280' },

	// empty
	emptyWrap: { padding: 30, alignItems: 'center' },
	emptyText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	emptyHint: { marginTop: 6, color: '#6b7280' },

	// add/edit modal container
	modalContainer: { flex: 1, backgroundColor: '#fff' },
	modalCloseBtn: {
		position: 'absolute',
		right: 16,
		top: Platform.OS === 'android' ? 10 : 48,
		backgroundColor: '#6b7280',
		borderRadius: 20,
		padding: 8,
		zIndex: 20,
	},

	// store selector modal
	storeModalOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.4)',
		padding: 16,
	},
	storeModal: {
		width: Math.min(width - 32, 800),
		maxHeight: '80%',
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 12,
	},
	storeModalTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 12,
		textAlign: 'center',
	},
	storeItem: {
		paddingVertical: 12,
		paddingHorizontal: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	storeItemSelected: {
		backgroundColor: '#f1f8f4',
	},
	branchItem: {
		paddingVertical: 10,
		paddingHorizontal: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#f6f6f6',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	branchItemSelected: {
		backgroundColor: '#f7fff9',
	},
	storeNameModal: { fontSize: 16, fontWeight: '700' },
	branchNameModal: { fontSize: 15 },
	storeAddress: { fontSize: 12, color: '#777' },
	storeModalClose: {
		marginTop: 12,
		alignItems: 'center',
		backgroundColor: '#f0f0f0',
		paddingVertical: 12,
		borderRadius: 8,
	},
	storeModalCloseText: {
		color: '#065637',
		fontSize: 16,
		fontWeight: '500',
	},
});

export default Products;
