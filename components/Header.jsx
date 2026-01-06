// components/Header.jsx
import React, { useState, useContext } from 'react';
import {
	View,
	Text,
	Image,
	Linking,
	TouchableOpacity,
	StyleSheet,
	Animated,
	Modal,
	FlatList,
	SectionList,
	Dimensions,
	TextInput,
	ActivityIndicator,
	Alert,
	Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PlaceholderLogo from './PlaceholderLogo';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '@/context/AuthContext';
import {
	MaterialCommunityIcons,
	MaterialIcons,
	Feather,
} from '@expo/vector-icons';
import axiosInstance from '@/utils/axiosInstance';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Fast shimmer for loading state
const Shimmer = ({ style }) => {
	const shimmerAnimation = new Animated.Value(0);

	React.useEffect(() => {
		Animated.loop(
			Animated.timing(shimmerAnimation, {
				toValue: 1,
				duration: 1000,
				useNativeDriver: true,
			}),
		).start();
	}, []);

	const translateX = shimmerAnimation.interpolate({
		inputRange: [0, 1],
		outputRange: [-200, 200],
	});

	return (
		<View style={[styles.shimmerContainer, style]}>
			<Animated.View
				style={[
					styles.shimmer,
					{
						transform: [{ translateX }],
					},
				]}
			>
				<LinearGradient
					colors={['#F3F4F6', '#FFFFFF', '#F3F4F6']}
					style={styles.shimmerGradient}
					start={{ x: 0, y: 0.5 }}
					end={{ x: 1, y: 0.5 }}
				/>
			</Animated.View>
		</View>
	);
};

export default function Header({
	loading,
	userInfo,
	storeInfo,
}) {
	const router = useRouter();
	const {
		selectedStore,
		switchSelectedStore,
		switchSelectedBranch,
		getPlanCapability,
	} = useContext(AuthContext);

	// Multi-business logic (preserved)
	const [modalVisible, setModalVisible] = useState(false);
	const [modalMode, setModalMode] = useState('all'); // 'all' | 'branches'
	const [branchesForStore, setBranchesForStore] = useState(
		[],
	);
	const [branchesParentStore, setBranchesParentStore] =
		useState(null);
	const [
		logoStoresModalVisible,
		setLogoStoresModalVisible,
	] = useState(false);

	const [addBranchModalVisible, setAddBranchModalVisible] =
		useState(false);
	const [newBranchName, setNewBranchName] = useState('');
	const [newBranchKey, setNewBranchKey] = useState('');
	const [newBranchAddress, setNewBranchAddress] =
		useState('');
	const [creatingBranch, setCreatingBranch] =
		useState(false);

	const hasMultipleStores =
		Array.isArray(userInfo?.stores) &&
		userInfo.stores.length > 1;

	// Insets for safe area
	// Note: If you don't have SafeAreaProvider in root, this might default to 0. 
	// We'll add fallback padding just in case.
	// const insets = useSafeAreaInsets(); 
	// Using manual padding for compatibility if safe-area-context isn't set up
	const topPadding = Platform.OS === 'android' ? 60 : 50;

	// Logic ----------------------------------------------------

	const makePublicUrl = (item, parentBrand) => {
		const link =
			item?.storeLink ||
			parentBrand?.storeLink ||
			item?.branchKey ||
			null;
		if (!link) return null;
		let url = `${link.trim().toLowerCase()}.tradeet.ng`;
		if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
		return url;
	};

	const safeName = (o, fallback = 'Store') =>
		(o && (o.name || o.branchKey)) || fallback;

	let storeDisplayName = 'Store';
	let branchDisplayName = null;
	let parentStoreObj = null;
	const displayStore = selectedStore || storeInfo || null;

	if (selectedStore && selectedStore._isBranch) {
		branchDisplayName =
			selectedStore.name || selectedStore.branchKey || null;
		if (userInfo && Array.isArray(userInfo.stores)) {
			parentStoreObj = userInfo.stores.find(
				(s) =>
					String(s._id) === String(selectedStore._storeId),
			);
		}
		if (
			!parentStoreObj &&
			storeInfo &&
			String(storeInfo._id) ===
			String(selectedStore._storeId)
		) {
			parentStoreObj = storeInfo;
		}
		if (parentStoreObj)
			storeDisplayName =
				parentStoreObj.name || safeName(parentStoreObj);
	} else {
		storeDisplayName = safeName(displayStore, 'Store');
		const storeCandidate = displayStore || storeInfo;
		if (
			storeCandidate &&
			Array.isArray(storeCandidate.branches)
		) {
			const byDefault =
				storeCandidate.branches.find(
					(b) =>
						String(b._id) ===
						String(storeCandidate.defaultBranch),
				) ||
				storeCandidate.branches.find((b) => b.isDefault) ||
				null;
			if (byDefault)
				branchDisplayName =
					byDefault.name || byDefault.branchKey || null;
		}
	}

	const openBranchModal = (parent) => {
		let parentObj = parent || null;
		if (!parentObj) {
			if (
				selectedStore &&
				selectedStore._isBranch &&
				selectedStore._storeId &&
				Array.isArray(userInfo?.stores)
			) {
				parentObj = userInfo.stores.find(
					(s) =>
						String(s._id) ===
						String(selectedStore._storeId),
				);
			} else if (
				selectedStore &&
				!selectedStore._isBranch
			) {
				parentObj = selectedStore;
			} else if (storeInfo) parentObj = storeInfo;
		}
		const branchesArr = Array.isArray(parentObj?.branches)
			? parentObj.branches
			: [];
		setBranchesForStore(branchesArr);
		setBranchesParentStore(parentObj || null);
		setModalMode('branches');
		setModalVisible(true);
	};

	const createBranch = async () => {
		if (!branchesParentStore || !branchesParentStore._id) {
			Alert.alert(
				'Error',
				'No parent store selected.',
			);
			return;
		}
		if (!newBranchName || !newBranchKey) {
			Alert.alert(
				'Validation',
				'Provide Name and Key.',
			);
			return;
		}
		setCreatingBranch(true);
		try {
			const payload = {
				name: newBranchName.trim(),
				branchKey: newBranchKey.trim(),
				address: newBranchAddress?.trim() || undefined,
			};
			const resp = await axiosInstance.post(
				`/stores/${branchesParentStore._id}/branches`,
				payload,
			);
			const created = resp.data?.branch ?? resp.data;
			const refreshed = Array.isArray(resp.data?.branches)
				? resp.data.branches
				: created
					? [...(branchesForStore || []), created]
					: branchesForStore;
			setBranchesForStore(refreshed);

			if (
				created &&
				(switchSelectedBranch || switchSelectedStore)
			) {
				try {
					if (switchSelectedBranch) {
						await switchSelectedBranch(
							created._id,
							branchesParentStore._id,
						);
					} else {
						await switchSelectedStore({
							...created,
							_isBranch: true,
							_storeId: branchesParentStore._id,
						});
					}
				} catch (e) { }
			}
			setNewBranchName('');
			setNewBranchKey('');
			setNewBranchAddress('');
			setAddBranchModalVisible(false);
			Alert.alert('Success', 'Branch created.');
		} catch (err) {
			Alert.alert('Error', err.response?.data?.message || 'Failed');
		} finally {
			setCreatingBranch(false);
		}
	};

	const openLogoStoresModal = () =>
		setLogoStoresModalVisible(true);

	const item = displayStore;
	const parent = selectedStore?._isBranch
		? parentStoreObj
		: displayStore;
	const publicUrl = makePublicUrl(item, parent);
	const displayLink = publicUrl
		? publicUrl.replace(/^https?:\/\//, '')
		: null;

	const effectiveLogoUrl =
		displayStore?.logoUrl ||
		(selectedStore?._isBranch
			? parentStoreObj?.logoUrl
			: null);

	const sections = Array.isArray(userInfo?.stores)
		? userInfo.stores.map((store) => ({
			title: store.name || 'Unnamed Store',
			data: Array.isArray(store.branches)
				? store.branches
				: [],
			store,
		}))
		: [];

	// Render ---------------------------------------------------

	if (loading) {
		return (
			<View style={[styles.headerWrapper, { paddingTop: topPadding }]}>
				<StatusBar style="dark" backgroundColor="#fff" />
				<View style={styles.headerContent}>
					<Shimmer style={styles.shimmerLogo} />
					<View style={{ marginLeft: 12 }}>
						<Shimmer style={styles.shimmerTitle} />
						<Shimmer style={styles.shimmerSubtitle} />
					</View>
				</View>
			</View>
		);
	}

	return (
		<View style={[styles.headerWrapper, { paddingTop: topPadding }]}>
			{/* Force Dark Status Bar for White Header */}
			<StatusBar style="dark" backgroundColor="#fff" />

			<View style={styles.headerContent}>
				{/* Avatar / Logo */}
				<TouchableOpacity
					onPress={openLogoStoresModal}
					activeOpacity={0.7}
					style={styles.logoContainer}
				>
					{effectiveLogoUrl ? (
						<Image
							source={{ uri: effectiveLogoUrl }}
							style={styles.logo}
						/>
					) : (
						<PlaceholderLogo name={storeDisplayName} size={42} />
					)}
					{/* Status Dot */}
					<View style={styles.activeDot} />
				</TouchableOpacity>

				{/* Main Info */}
				<View style={styles.textContainer}>
					<TouchableOpacity
						onPress={() => {
							if (hasMultipleStores) {
								setModalMode('all');
								setModalVisible(true);
							}
						}}
						activeOpacity={0.7}
						style={styles.storeNameRow}
					>
						<Text style={styles.storeNameText} numberOfLines={1}>
							{storeDisplayName}
						</Text>
						{hasMultipleStores && (
							<Feather name="chevron-down" size={16} color="#4B5563" />
						)}
					</TouchableOpacity>

					<View style={styles.metaRow}>
						{userInfo?.plan?.name && (
							<View style={[styles.planBadge, userInfo.plan.isTrial && { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
								<Text style={[styles.planText, userInfo.plan.isTrial && { color: '#4338ca' }]}>
									{userInfo.plan.name}{userInfo.plan.isTrial ? ' (TRIAL)' : ''}
								</Text>
							</View>
						)}
						{displayLink && (
							<TouchableOpacity
								onPress={() => Linking.openURL(publicUrl)}
								style={styles.linkButton}
							>
								<Feather name="external-link" size={12} color="#065637" />
								<Text style={styles.linkText} numberOfLines={1}>
									visit store
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>

				{/* Branch Switcher (Pill Style) */}
				<TouchableOpacity
					onPress={() => openBranchModal(null)}
					style={styles.branchPill}
					activeOpacity={0.8}
				>
					<View style={{ flex: 1 }}>
						<Text style={styles.branchLabel}>Branch</Text>
						<Text style={styles.branchValue} numberOfLines={1}>
							{branchDisplayName || 'Main'}
						</Text>
					</View>
					<View style={styles.branchIconCircle}>
						<MaterialIcons name="swap-vert" size={20} color="#065637" />
					</View>
				</TouchableOpacity>
			</View>

			{/* ---------------- Modals (Preserved Logic, Updated styles slightly optional) ---------------- */}

			{/* Main Selection Modal */}
			<Modal
				visible={modalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{modalMode === 'branches' ? 'Select Branch' : 'Switch Store'}
							</Text>
							<TouchableOpacity onPress={() => setModalVisible(false)}>
								<Feather name="x" size={24} color="#374151" />
							</TouchableOpacity>
						</View>

						{modalMode === 'branches' ? (
							<FlatList
								data={branchesForStore}
								keyExtractor={(item) => item._id}
								style={{ maxHeight: 400 }}
								ListHeaderComponent={
									branchesParentStore ? (
										<View style={styles.modalSubHeader}>
											<Text style={{ color: '#6B7280' }}>
												For: <Text style={{ fontWeight: '600', color: '#111' }}>{safeName(branchesParentStore)}</Text>
											</Text>
											<TouchableOpacity
												onPress={() => {
													if (branchesForStore.length < getPlanCapability('branchLimit')) {
														setAddBranchModalVisible(true);
													} else {
														setModalVisible(false);
														router.push('/(app)/subscription');
													}
												}}
												style={[styles.addBranchBtn, branchesForStore.length >= getPlanCapability('branchLimit') && { backgroundColor: '#6366f1' }]}
											>
												<Feather name={branchesForStore.length >= getPlanCapability('branchLimit') ? "star" : "plus"} size={14} color="#fff" />
												<Text style={styles.addBranchText}>
													{branchesForStore.length >= getPlanCapability('branchLimit') ? "Upgrade" : "New"}
												</Text>
											</TouchableOpacity>
										</View>
									) : null
								}
								renderItem={({ item }) => {
									const isSelected = selectedStore?._id === item._id && selectedStore?._isBranch;
									return (
										<TouchableOpacity
											style={[styles.listItem, isSelected && styles.listItemSelected]}
											onPress={() => {
												if (switchSelectedBranch && branchesParentStore) {
													switchSelectedBranch(item._id, branchesParentStore._id);
												} else if (switchSelectedStore && branchesParentStore) {
													switchSelectedStore({
														...item,
														_isBranch: true,
														_storeId: branchesParentStore._id,
													});
												}
												setModalVisible(false);
											}}
										>
											<View>
												<Text style={[styles.listItemTitle, isSelected && { color: '#065637', fontWeight: '700' }]}>
													{item.name || item.branchKey}
												</Text>
												{item.address && <Text style={styles.listItemSub}>{item.address}</Text>}
											</View>
											{isSelected && <Feather name="check" size={18} color="#065637" />}
										</TouchableOpacity>
									);
								}}
								ListEmptyComponent={<Text style={styles.emptyText}>No branches found.</Text>}
							/>
						) : (
							<SectionList
								sections={sections}
								keyExtractor={(item) => item._id}
								style={{ maxHeight: 500 }}
								renderSectionHeader={({ section }) => (
									<TouchableOpacity
										style={styles.sectionHeader}
										onPress={() => {
											switchSelectedStore(section.store);
											setModalVisible(false);
										}}
									>
										<Text style={styles.sectionTitle}>{section.title}</Text>
										{selectedStore?._id === section.store._id && !selectedStore?._isBranch && (
											<Feather name="check-circle" size={16} color="#065637" />
										)}
									</TouchableOpacity>
								)}
								renderItem={({ item, section }) => {
									const isSelected = selectedStore?._id === item._id && selectedStore?._isBranch;
									return (
										<TouchableOpacity
											style={[styles.listItem, { paddingLeft: 24 }, isSelected && styles.listItemSelected]}
											onPress={() => {
												switchSelectedStore({
													...item,
													_isBranch: true,
													_storeId: section.store._id,
												});
												setModalVisible(false);
											}}
										>
											<Text style={[styles.listItemTitle, isSelected && { color: '#065637' }]}>
												{item.name || item.branchKey}
											</Text>
											{isSelected && <Feather name="check" size={16} color="#065637" />}
										</TouchableOpacity>
									);
								}}
							/>
						)}
					</View>
				</View>
			</Modal>

			{/* Add Branch Modal */}
			<Modal
				visible={addBranchModalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setAddBranchModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>New Branch</Text>
						<TextInput
							style={styles.input}
							placeholder="Branch Name"
							value={newBranchName}
							onChangeText={setNewBranchName}
						/>
						<TextInput
							style={styles.input}
							placeholder="Branch Key (ID)"
							value={newBranchKey}
							onChangeText={setNewBranchKey}
							autoCapitalize="none"
						/>
						<TextInput
							style={styles.input}
							placeholder="Address (Optional)"
							value={newBranchAddress}
							onChangeText={setNewBranchAddress}
						/>
						<View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
							<TouchableOpacity
								style={[styles.btn, styles.btnOutline]}
								onPress={() => setAddBranchModalVisible(false)}
							>
								<Text style={styles.btnTextOutline}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.btn, styles.btnPrimary]}
								onPress={createBranch}
								disabled={creatingBranch}
							>
								{creatingBranch ? (
									<ActivityIndicator color="#fff" />
								) : (
									<Text style={styles.btnTextPrimary}>Create</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Quick Swap Logo Modal */}
			<Modal
				visible={logoStoresModalVisible}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setLogoStoresModalVisible(false)}
			>
				<LinkCatcher onPress={() => setLogoStoresModalVisible(false)}>
					<View style={styles.quickSwapCard}>
						<Text style={styles.quickSwapTitle}>Switch Business</Text>
						{userInfo?.stores?.map(s => (
							<TouchableOpacity
								key={s._id}
								style={styles.quickSwapRow}
								onPress={() => {
									switchSelectedStore(s);
									setLogoStoresModalVisible(false);
								}}
							>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
									<PlaceholderLogo name={s.name} size={30} style={{ borderRadius: 6 }} />
									<Text style={{ fontWeight: '500' }}>{s.name}</Text>
								</View>
								{selectedStore?._id === s._id && !selectedStore?._isBranch && (
									<Feather name="check" size={16} color="green" />
								)}
							</TouchableOpacity>
						))}
					</View>
				</LinkCatcher>
			</Modal>

		</View>
	);
}

const LinkCatcher = ({ onPress, children }) => (
	<TouchableOpacity activeOpacity={1} onPress={onPress} style={styles.modalOverlay}>
		{children}
	</TouchableOpacity>
);

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
	headerWrapper: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 20,
		paddingBottom: 16,
		paddingTop: 50,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
		// Shadow
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
		elevation: 2,
		zIndex: 50,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
	},
	logoContainer: {
		position: 'relative',
	},
	logo: {
		width: 44,
		height: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	activeDot: {
		position: 'absolute',
		bottom: -2,
		right: -2,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: '#10B981',
		borderWidth: 2,
		borderColor: '#FFF',
	},
	textContainer: {
		flex: 1,
		justifyContent: 'center',
	},
	storeNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	storeNameText: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		letterSpacing: -0.5,
		maxWidth: 160,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
		gap: 8,
	},
	planBadge: {
		backgroundColor: '#ECFDF5',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		borderWidth: 0.5,
		borderColor: '#A7F3D0',
	},
	planText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#047857',
		textTransform: 'uppercase',
	},
	linkButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	linkText: {
		fontSize: 11,
		color: '#4B5563',
		textDecorationLine: 'underline',
	},
	// Branch Pill
	branchPill: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F9FAFB',
		paddingLeft: 12,
		paddingRight: 6,
		paddingVertical: 6,
		borderRadius: 30,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		gap: 8,
		maxWidth: 130,
	},
	branchLabel: {
		fontSize: 9,
		color: '#6B7280',
		textTransform: 'uppercase',
		fontWeight: '600',
	},
	branchValue: {
		fontSize: 13,
		fontWeight: '600',
		color: '#374151',
	},
	branchIconCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#ECFDF5',
		justifyContent: 'center',
		alignItems: 'center',
	},

	// Shimmer
	shimmerContainer: {
		backgroundColor: '#F3F4F6',
		overflow: 'hidden',
		borderRadius: 8,
	},
	shimmer: {
		width: '100%',
		height: '100%',
		position: 'absolute',
		opacity: 0.7,
	},
	shimmerLogo: { width: 44, height: 44, borderRadius: 10 },
	shimmerTitle: { width: 120, height: 20, marginBottom: 6, borderRadius: 4 },
	shimmerSubtitle: { width: 80, height: 14, borderRadius: 4 },

	// Modals
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'flex-end',
	},
	modalCard: {
		backgroundColor: '#FFF',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 20,
		paddingBottom: 40,
		maxHeight: '80%',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
	modalSubHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
		backgroundColor: '#F9FAFB',
		padding: 10,
		borderRadius: 8,
	},
	addBranchBtn: {
		backgroundColor: '#065637',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		gap: 4,
	},
	addBranchText: { color: '#fff', fontSize: 12, fontWeight: '600' },
	listItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	listItemSelected: {
		backgroundColor: '#F0FDF4',
		marginHorizontal: -20,
		paddingHorizontal: 20, // compensate for negative margin
	},
	listItemTitle: { fontSize: 15, fontWeight: '500', color: '#374151' },
	listItemSub: { fontSize: 12, color: '#9CA3AF' },
	sectionHeader: {
		backgroundColor: '#F3F4F6',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 6,
		marginTop: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	sectionTitle: { fontWeight: '700', fontSize: 13, color: '#4B5563' },
	emptyText: { textAlign: 'center', padding: 20, color: '#9CA3AF' },

	// Form
	input: {
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 8,
		padding: 12,
		fontSize: 15,
		marginBottom: 12,
		backgroundColor: '#FAFAFA',
	},
	btn: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	btnPrimary: { backgroundColor: '#065637' },
	btnOutline: { borderWidth: 1, borderColor: '#D1D5DB' },
	btnTextPrimary: { color: '#FFF', fontWeight: '600' },
	btnTextOutline: { color: '#374151', fontWeight: '600' },

	// Quick Swap
	quickSwapCard: {
		backgroundColor: 'white',
		width: '80%',
		borderRadius: 12,
		padding: 16,
		alignSelf: 'center',
		marginTop: 'auto',
		marginBottom: 'auto',
	},
	quickSwapTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 12,
	},
	quickSwapRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	}
});
