// components/Header.js
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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import PlaceholderLogo from './PlaceholderLogo';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '@/context/AuthContext';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import axiosInstance from '@/utils/axiosInstance';

// Custom Shimmer Component using Animated API
const Shimmer = ({ style }) => {
	const shimmerAnimation = new Animated.Value(0);

	React.useEffect(() => {
		Animated.loop(
			Animated.timing(shimmerAnimation, {
				toValue: 1,
				duration: 1200,
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
					colors={['#E1E9EE', '#F2F8FC', '#E1E9EE']}
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
	const {
		selectedStore,
		switchSelectedStore,
		switchSelectedBranch,
	} = useContext(AuthContext);

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

	// Add-branch modal state
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

	// helper to build public url. We prefer brand.storeLink if available.
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

	// utility to safely get display name
	const safeName = (o, fallback = 'Store') =>
		(o && (o.name || o.branchKey)) || fallback;

	// Determine storeDisplay and branchDisplay
	let storeDisplayName = 'Store';
	let branchDisplayName = null;
	let parentStoreObj = null;
	const displayStore = selectedStore || storeInfo || null;

	// If selectedStore is branch-shaped (we mark _isBranch in AuthContext)
	if (selectedStore && selectedStore._isBranch) {
		branchDisplayName =
			selectedStore.name || selectedStore.branchKey || null;
		// find parent store object in userInfo
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

	if (loading) {
		return (
			<View style={styles.headerContainer}>
				<StatusBar
					style="light"
					backgroundColor="#065637"
				/>
				<View style={styles.shimmerRow}>
					<Shimmer style={styles.shimmerLogo} />
					<View style={styles.shimmerTextContainer}>
						<Shimmer style={styles.shimmerTitle} />
						<Shimmer style={styles.shimmerSubtitle} />
					</View>
				</View>
			</View>
		);
	}

	// open branches modal for the relevant parent store
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
				'No parent store selected',
				'Cannot create branch without a parent store.',
			);
			return;
		}
		if (!newBranchName || !newBranchKey) {
			Alert.alert(
				'Validation',
				'Please provide branch name and branch key.',
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
			// refresh local branches list (server usually returns updated branch list; if not, append)
			const refreshed = Array.isArray(resp.data?.branches)
				? resp.data.branches
				: created
				? [...(branchesForStore || []), created]
				: branchesForStore;
			setBranchesForStore(refreshed);

			// optional: auto-switch to newly created branch
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
				} catch (e) {
					console.warn(
						'Auto-switch to new branch failed',
						e,
					);
				}
			}

			// reset form & close add modal
			setNewBranchName('');
			setNewBranchKey('');
			setNewBranchAddress('');
			setAddBranchModalVisible(false);
			Alert.alert(
				'Branch created',
				'Branch successfully created.',
			);
		} catch (err) {
			console.error('createBranch error', err);
			const msg =
				err?.response?.data?.message ||
				err.message ||
				'Failed to create branch';
			Alert.alert('Error', msg);
		} finally {
			setCreatingBranch(false);
		}
	};

	// logo dropdown: shows stores list for quick switching
	const openLogoStoresModal = () =>
		setLogoStoresModalVisible(true);

	// Compute public URL and display link
	const item = displayStore;
	const parent = selectedStore?._isBranch
		? parentStoreObj
		: displayStore;
	const publicUrl = makePublicUrl(item, parent);
	const displayLink = publicUrl
		? publicUrl.replace(/^https?:\/\//, '')
		: null;

	// Effective logo URL
	const effectiveLogoUrl =
		displayStore?.logoUrl ||
		(selectedStore?._isBranch
			? parentStoreObj?.logoUrl
			: null);

	// Sections for 'all' modal
	const sections = Array.isArray(userInfo?.stores)
		? userInfo.stores.map((store) => ({
				title: store.name || 'Unnamed Store',
				data: Array.isArray(store.branches)
					? store.branches
					: [],
				store,
		  }))
		: [];

	return (
		<View style={styles.headerContainer}>
			<StatusBar style="light" backgroundColor="#065637" />
			<View style={styles.headerContent}>
				{/* Logo - acts as quick stores dropdown */}
				<TouchableOpacity
					onPress={openLogoStoresModal}
					activeOpacity={0.8}
				>
					{effectiveLogoUrl ? (
						<Image
							source={{ uri: effectiveLogoUrl }}
							style={styles.logo}
						/>
					) : (
						<PlaceholderLogo name={storeDisplayName} />
					)}
				</TouchableOpacity>

				<View style={styles.headerTextContainer}>
					<View style={styles.titleRow}>
						{hasMultipleStores ? (
							<TouchableOpacity
								onPress={() => {
									setModalMode('all');
									setModalVisible(true);
								}}
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									gap: 8,
								}}
								activeOpacity={0.8}
							>
								<Text
									style={styles.headerTitle}
									numberOfLines={1}
								>
									{storeDisplayName || 'Select Store'}
								</Text>
								<Ionicons
									name="chevron-down"
									size={20}
									color="#f1f1f1"
								/>
							</TouchableOpacity>
						) : (
							<Text
								style={styles.headerTitle}
								numberOfLines={1}
							>
								{storeDisplayName || 'Store'}
							</Text>
						)}

						<Text style={styles.planBadge}>
							{userInfo?.plan?.name || ''}
						</Text>
					</View>

					

					{publicUrl ? (
						<TouchableOpacity
							style={styles.openStoreButton}
							onPress={() => Linking.openURL(publicUrl)}
							activeOpacity={0.8}
						>
							<MaterialCommunityIcons
								name="web"
								size={18}
								color="#f1f1f1"
							/>
							<Text style={styles.openStoreButtonText}>
								{displayLink}
							</Text>
						</TouchableOpacity>
					) : null}
				</View>

				{/* branch switch icon on the right */}
				<TouchableOpacity
					onPress={() => openBranchModal(null)}
					style={styles.branchSwitchIcon}
					activeOpacity={0.7}
					accessibilityLabel="Switch branch"
					accessibilityHint="Opens modal to select or add a branch"
				>
					{branchDisplayName ? (
						<Text
							style={styles.branchSubtitle}
							numberOfLines={1}
						>
							{branchDisplayName}
						</Text>
					) : null}
					<MaterialIcons
						name="change-circle"
						size={18}
						color="#f1f1f1"
					/>
				</TouchableOpacity>
			</View>

			{/* Main modal (full store/branch or branch list depending on mode) */}
			<Modal
				visible={modalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>
							{modalMode === 'branches'
								? 'Select Branch'
								: 'Select Store / Branch'}
						</Text>

						{modalMode === 'branches' ? (
							<View style={{ flex: 1 }}>
								{branchesParentStore ? (
									<>
										<View
											style={{
												flexDirection: 'row',
												justifyContent: 'space-between',
												alignItems: 'center',
												marginBottom: 8,
											}}
										>
											<Text style={{ fontWeight: '600' }}>
												{safeName(
													branchesParentStore,
													'Store',
												)}
											</Text>
											<TouchableOpacity
												onPress={() =>
													setAddBranchModalVisible(true)
												}
												style={{
													paddingVertical: 6,
													paddingHorizontal: 10,
													backgroundColor: '#065637',
													borderRadius: 6,
												}}
											>
												<Text
													style={{
														color: 'white',
														fontWeight: '600',
													}}
												>
													+ Add Branch
												</Text>
											</TouchableOpacity>
										</View>

										<FlatList
											style={{ flex: 1 }}
											data={branchesForStore}
											keyExtractor={(b) => String(b._id)}
											renderItem={({ item }) => {
												const isSelected =
													selectedStore &&
													selectedStore._id === item._id &&
													selectedStore._isBranch;
												const isDefault =
													String(item._id) ===
														String(
															branchesParentStore.defaultBranch,
														) || item.isDefault;
												return (
													<TouchableOpacity
														onPress={async () => {
															try {
																if (switchSelectedBranch)
																	await switchSelectedBranch(
																		item._id,
																		branchesParentStore._id,
																	);
																else
																	await switchSelectedStore(
																		{
																			...item,
																			_isBranch: true,
																			_storeId:
																				branchesParentStore._id,
																		},
																	);
															} catch (e) {
																console.error(
																	'Error switching branch:',
																	e,
																);
															} finally {
																setModalVisible(false);
															}
														}}
														style={[
															styles.branchItem,
															{
																backgroundColor: isSelected
																	? '#f7fff9'
																	: 'white',
															},
														]}
													>
														<View
															style={{
																flexDirection: 'row',
																justifyContent:
																	'space-between',
																alignItems: 'center',
															}}
														>
															<View>
																<Text
																	style={styles.storeName}
																>
																	{item.name ||
																		item.branchKey}
																</Text>
																{item.address ? (
																	<Text
																		style={{
																			color: '#777',
																			fontSize: 12,
																		}}
																	>
																		{item.address}
																	</Text>
																) : null}
																{isDefault ? (
																	<Text
																		style={{
																			fontSize: 12,
																			color: '#065637',
																			marginTop: 4,
																		}}
																	>
																		Default branch
																	</Text>
																) : null}
															</View>
															{isSelected ? (
																<Ionicons
																	name="checkmark"
																	size={18}
																	color="#065637"
																/>
															) : null}
														</View>
													</TouchableOpacity>
												);
											}}
											ItemSeparatorComponent={() => (
												<View style={{ height: 8 }} />
											)}
											ListEmptyComponent={() => (
												<View
													style={{
														flex: 1,
														justifyContent: 'center',
														alignItems: 'center',
													}}
												>
													<Text
														style={{
															textAlign: 'center',
															color: '#777',
														}}
													>
														No branches for this store.
													</Text>
												</View>
											)}
										/>
									</>
								) : (
									<View
										style={{
											flex: 1,
											justifyContent: 'center',
											alignItems: 'center',
										}}
									>
										<Text
											style={{
												textAlign: 'center',
												color: '#777',
											}}
										>
											No parent store selected.
										</Text>
									</View>
								)}
							</View>
						) : (
							<SectionList
								style={{ flex: 1 }}
								sections={sections}
								keyExtractor={(item) => String(item._id)}
								renderSectionHeader={({ section }) => {
									const { store } = section;
									const isBrandSelected =
										selectedStore &&
										selectedStore._id === store._id &&
										!selectedStore._isBranch;
									const defaultBranchPreview =
										(store.defaultBranch &&
											store.branches?.find(
												(b) =>
													String(b._id) ===
													String(store.defaultBranch),
											)?.name) ||
										store.branches?.find((b) => b.isDefault)
											?.name ||
										(store.branches &&
											store.branches[0]?.name) ||
										null;
									return (
										<TouchableOpacity
											onPress={async () => {
												try {
													await switchSelectedStore(store);
												} catch (e) {
													console.error(
														'Error switching store:',
														e,
													);
												} finally {
													setModalVisible(false);
												}
											}}
											style={[
												styles.storeItem,
												{
													backgroundColor: isBrandSelected
														? '#f1f8f4'
														: 'white',
												},
											]}
										>
											<View
												style={{
													flexDirection: 'row',
													alignItems: 'center',
													justifyContent: 'space-between',
												}}
											>
												<View>
													<Text style={styles.storeName}>
														{section.title}
													</Text>
													{store.address ? (
														<Text
															style={{
																color: '#666',
																fontSize: 12,
															}}
														>
															{store.address}
														</Text>
													) : null}
													{defaultBranchPreview ? (
														<Text
															style={{
																color: '#777',
																fontSize: 12,
																marginTop: 6,
															}}
														>
															Default:{' '}
															{defaultBranchPreview}
														</Text>
													) : null}
												</View>
												{isBrandSelected ? (
													<Ionicons
														name="checkmark"
														size={20}
														color="#065637"
													/>
												) : null}
											</View>
										</TouchableOpacity>
									);
								}}
								renderItem={({ item, section }) => {
									const { store } = section;
									const isSelectedBranch =
										selectedStore &&
										selectedStore._id === item._id &&
										selectedStore._isBranch;
									const isDefault =
										String(item._id) ===
											String(store.defaultBranch) ||
										item.isDefault;
									return (
										<TouchableOpacity
											onPress={async () => {
												try {
													if (switchSelectedBranch)
														await switchSelectedBranch(
															item._id,
															store._id,
														);
													else
														await switchSelectedStore({
															...item,
															_isBranch: true,
															_storeId: store._id,
														});
												} catch (e) {
													console.error(
														'Error switching branch:',
														e,
													);
												} finally {
													setModalVisible(false);
												}
											}}
											style={[
												styles.branchItem,
												{
													backgroundColor: isSelectedBranch
														? '#f7fff9'
														: 'white',
													paddingLeft: 20,
												},
											]}
										>
											<View
												style={{
													flexDirection: 'row',
													alignItems: 'center',
													justifyContent: 'space-between',
												}}
											>
												<View>
													<Text style={styles.storeName}>
														{item.name || item.branchKey}
													</Text>
													{item.address ? (
														<Text
															style={{
																color: '#777',
																fontSize: 12,
															}}
														>
															{item.address}
														</Text>
													) : null}
													{isDefault ? (
														<Text
															style={{
																fontSize: 12,
																color: '#065637',
																marginTop: 4,
															}}
														>
															Default
														</Text>
													) : null}
												</View>
												{isSelectedBranch ? (
													<Ionicons
														name="checkmark"
														size={18}
														color="#065637"
													/>
												) : null}
											</View>
										</TouchableOpacity>
									);
								}}
								ItemSeparatorComponent={() => (
									<View style={{ height: 8 }} />
								)}
								ListEmptyComponent={() => (
									<View
										style={{
											flex: 1,
											justifyContent: 'center',
											alignItems: 'center',
										}}
									>
										<Text
											style={{
												textAlign: 'center',
												color: '#777',
											}}
										>
											No stores available.
										</Text>
									</View>
								)}
							/>
						)}

						<TouchableOpacity
							onPress={() => setModalVisible(false)}
							style={styles.closeButton}
						>
							<Text style={styles.closeText}>Close</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Logo stores modal (quick store selector) */}
			<Modal
				visible={logoStoresModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={() =>
					setLogoStoresModalVisible(false)
				}
			>
				<View style={styles.smallModalOverlay}>
					<View style={styles.smallModal}>
						<Text
							style={{
								fontWeight: '600',
								marginBottom: 10,
							}}
						>
							Your stores
						</Text>
						<FlatList
							data={
								Array.isArray(userInfo?.stores)
									? userInfo.stores
									: []
							}
							keyExtractor={(s) => String(s._id)}
							renderItem={({ item }) => {
								const isSelected =
									selectedStore &&
									selectedStore._id === item._id &&
									!selectedStore._isBranch;
								return (
									<TouchableOpacity
										onPress={async () => {
											try {
												await switchSelectedStore(item);
												setLogoStoresModalVisible(false);
											} catch (e) {
												console.error(
													'Error switching store:',
													e,
												);
											}
										}}
										style={[
											styles.smallStoreRow,
											{
												backgroundColor: isSelected
													? '#f1f8f4'
													: 'white',
											},
										]}
									>
										<View
											style={{
												flexDirection: 'row',
												alignItems: 'center',
												gap: 8,
												flex: 1,
											}}
										>
											{item.logoUrl ? (
												<Image
													source={{ uri: item.logoUrl }}
													style={styles.smallLogo}
												/>
											) : (
												<PlaceholderLogo
													name={item.name}
													style={styles.smallLogo}
												/>
											)}
											<Text
												style={{
													fontSize: 15,
													fontWeight: '500',
													flex: 1,
												}}
											>
												{item.name}
											</Text>
											{isSelected ? (
												<Ionicons
													name="checkmark"
													size={18}
													color="#065637"
												/>
											) : null}
										</View>
									</TouchableOpacity>
								);
							}}
							ItemSeparatorComponent={() => (
								<View style={{ height: 8 }} />
							)}
						/>
						<TouchableOpacity
							onPress={() =>
								setLogoStoresModalVisible(false)
							}
							style={[
								styles.closeButton,
								{ marginTop: 10 },
							]}
						>
							<Text style={styles.closeText}>Close</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Add Branch Modal */}
			<Modal
				visible={addBranchModalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() =>
					setAddBranchModalVisible(false)
				}
			>
				<View style={styles.modalContainer}>
					<View
						style={[
							styles.modalContent,
							{ maxHeight: 360 },
						]}
					>
						<Text style={styles.modalTitle}>
							Add Branch
						</Text>
						<Text
							style={{ marginBottom: 6, color: '#444' }}
						>
							{safeName(
								branchesParentStore,
								'Parent store',
							)}
						</Text>

						<TextInput
							placeholder="Branch name"
							value={newBranchName}
							onChangeText={setNewBranchName}
							style={styles.input}
						/>
						<TextInput
							placeholder="Branch key (unique short id)"
							value={newBranchKey}
							onChangeText={setNewBranchKey}
							style={styles.input}
						/>
						<TextInput
							placeholder="Address (optional)"
							value={newBranchAddress}
							onChangeText={setNewBranchAddress}
							style={styles.input}
						/>

						<TouchableOpacity
							onPress={createBranch}
							style={[
								styles.primaryButton,
								creatingBranch ? { opacity: 0.8 } : null,
							]}
							disabled={creatingBranch}
						>
							{creatingBranch ? (
								<ActivityIndicator color="white" />
							) : (
								<Text
									style={{
										color: 'white',
										fontWeight: '600',
									}}
								>
									Create Branch
								</Text>
							)}
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() =>
								setAddBranchModalVisible(false)
							}
							style={[styles.closeButton, { marginTop: 8 }]}
						>
							<Text style={styles.closeText}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
	// Shimmer styles
	shimmerContainer: {
		backgroundColor: '#E1E9EE',
		overflow: 'hidden',
		borderRadius: 8,
	},
	shimmer: {
		width: '100%',
		height: '100%',
		position: 'absolute',
		opacity: 0.5,
	},
	shimmerGradient: {
		flex: 1,
		width: '100%',
	},
	// Header styles
	headerContainer: {
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 60,
		paddingBottom: 16,
		paddingHorizontal: 16,
		backgroundColor: '#065637',
		flexDirection: 'row',
		zIndex: 100,
	},
	shimmerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
	},
	shimmerLogo: {
		width: 60,
		height: 60,
		borderRadius: 12,
	},
	shimmerTextContainer: {
		marginLeft: 12,
		flexDirection: 'column',
	},
	shimmerTitle: {
		width: width * 0.4,
		height: 24,
		borderRadius: 6,
		marginBottom: 8,
	},
	shimmerSubtitle: {
		width: width * 0.3,
		height: 16,
		borderRadius: 6,
	},
	headerContent: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
	},
	logo: {
		width: 50,
		height: 50,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.2)',
		resizeMode: 'cover',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
	headerTextContainer: {
		flexDirection: 'column',
		justifyContent: 'center',
		flex: 1,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 0,
	},
	headerTitle: {
		color: '#f1f1f1',
		fontSize: 20,
		fontWeight: '600',
		maxWidth: width * 0.5,
	},
	branchSubtitle: {
		color: 'rgba(241,241,241,0.9)',
		fontSize: 13,
		// marginTop: 4,
		maxWidth: width * 0.6,
	},
	planBadge: {
		color: '#f1f1f1',
		backgroundColor: '#212121',
		paddingHorizontal: 6,
		paddingBottom: 2,
		paddingTop: 4,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.6)',
		fontSize: 10,
		fontWeight: '500',
		textTransform: 'uppercase',
		textAlign: 'center',
		marginLeft: 4,
	},
	openStoreButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 0,
		paddingVertical: 0,
		gap: 0,
		marginTop: 3,
	},
	openStoreButtonText: {
		color: '#f1f1f1',
		fontSize: 14,
		fontWeight: '400',
		textDecorationLine: 'underline',
		opacity: 0.9,
		marginLeft: 3,
	},
	// Modal styles
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		paddingHorizontal: 16,
	},
	modalContent: {
		backgroundColor: '#ffffff',
		padding: 16,
		borderRadius: 12,
		width: '100%',
		height: '80%',
		elevation: 8,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 12,
		textAlign: 'center',
		color: '#333',
	},
	storeItem: {
		paddingVertical: 12,
		paddingHorizontal: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	branchItem: {
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f6f6f6',
	},
	storeName: {
		fontSize: 16,
		color: '#333',
		fontWeight: '500',
	},
	closeButton: {
		marginTop: 12,
		alignItems: 'center',
		backgroundColor: '#f0f0f0',
		paddingVertical: 12,
		borderRadius: 8,
	},
	closeText: {
		color: '#065637',
		fontSize: 16,
		fontWeight: '500',
	},
	// branch icon
	branchSwitchIcon: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		marginLeft: 8,
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row-reverse',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.7)',
		borderRadius: 20,
		gap: 3,
	},
	// small logo modal
	smallModalOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.35)',
	},
	smallModal: {
		backgroundColor: 'white',
		width: '80%',
		padding: 12,
		borderRadius: 10,
		maxHeight: '60%',
	},
	smallStoreRow: {
		paddingVertical: 10,
		paddingHorizontal: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	smallLogo: {
		width: 30,
		height: 30,
		borderRadius: 6,
	},
	// add branch form
	input: {
		borderWidth: 1,
		borderColor: '#e0e0e0',
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 8,
		marginTop: 8,
	},
	primaryButton: {
		marginTop: 12,
		backgroundColor: '#065637',
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
});
