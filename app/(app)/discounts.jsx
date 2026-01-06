import React, {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {
	SafeAreaView,
	View,
	Text,
	TextInput,
	Pressable,
	FlatList,
	Modal,
	StyleSheet,
	ActivityIndicator,
	Alert,
	Switch,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Keyboard,
	TouchableOpacity,
} from 'react-native';
import axiosInstance from '../../utils/axiosInstance';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

const DISCOUNT_ENDPOINT = '/discounts';
const THEME = {
	primary: '#3B82F6',
	secondary: '#10B981',
	accent: '#F59E0B',
	text: '#1F2937',
	subtext: '#6B7280',
	background: '#F3F4F6',
	card: '#FFFFFF',
	border: '#D1D5DB',
	error: '#EF4444',
	success: '#22C55E',
};

export default function DiscountsScreen() {
	const [discounts, setDiscounts] = useState([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const { selectedStore, getPlanCapability } = useContext(AuthContext);
	const hasDiscounts = getPlanCapability('hasDiscounts');

	// Modal / Form state
	const initialForm = useMemo(
		() => ({
			code: '',
			name: '',
			description: '',
			type: 'percentage',
			percentage: '0',
			amount: '0',
			minOrderAmount: '0',
			active: true,
		}),
		[],
	);

	const [modalVisible, setModalVisible] = useState(false);
	const [editing, setEditing] = useState(false);
	const [currentId, setCurrentId] = useState(null);
	const [form, setForm] = useState(initialForm);
	const [submitting, setSubmitting] = useState(false);

	// Validation & code check
	const [validateModalVisible, setValidateModalVisible] =
		useState(false);
	const [validateCode, setValidateCode] = useState('');
	const [cartAmount, setCartAmount] = useState('0');
	const [validateResult, setValidateResult] =
		useState(null);
	const [validating, setValidating] = useState(false);

	// search
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] =
		useState('');
	const [showActiveOnly, setShowActiveOnly] =
		useState(false);

	// helpers
	const formatMoney = (smallest) => {
		if (smallest == null) return '-';
		const n = Number(smallest) / 100;
		return `₦${n.toLocaleString(undefined, {
			minimumFractionDigits: 2,
		})}`;
	};

	const apiCall = useCallback(
		async ({ path, method = 'GET', body = null }) => {
			try {
				const res = await axiosInstance.request({
					url: path,
					method,
					data: body,
				});
				return res.data;
			} catch (err) {
				if (err?.response?.data) throw err.response.data;
				throw err;
			}
		},
		[],
	);

	const fetchDiscounts = useCallback(async () => {
		setLoading(true);
		try {
			const data = await apiCall({
				path: DISCOUNT_ENDPOINT,
				method: 'GET',
			});
			setDiscounts(
				Array.isArray(data) ? data : data.discounts || [],
			);
		} catch (err) {
			console.warn(err);
			Alert.alert(
				'Error',
				err?.message || 'Unable to load discounts',
			);
		} finally {
			setLoading(false);
		}
	}, [apiCall]);

	useEffect(() => {
		fetchDiscounts();
	}, [fetchDiscounts]);

	useEffect(() => {
		const t = setTimeout(
			() => setDebouncedSearch(search.trim().toLowerCase()),
			250,
		);
		return () => clearTimeout(t);
	}, [search]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchDiscounts();
		setRefreshing(false);
	}, [fetchDiscounts]);

	const filtered = useMemo(() => {
		return discounts
			.filter((d) => (showActiveOnly ? d.active : true))
			.filter((d) => {
				if (!debouncedSearch) return true;
				const q = debouncedSearch;
				return (
					(d.code || '').toLowerCase().includes(q) ||
					(d.name || '').toLowerCase().includes(q)
				);
			});
	}, [discounts, debouncedSearch, showActiveOnly]);

	const openCreate = useCallback(() => {
		setForm(initialForm);
		setEditing(false);
		setCurrentId(null);
		setModalVisible(true);
	}, [initialForm]);

	const openEdit = useCallback(
		async (id) => {
			setLoading(true);
			try {
				const res = await apiCall({
					path: `${DISCOUNT_ENDPOINT}/${id}`,
					method: 'GET',
				});
				const d = res.discount;
				setForm({
					code: d.code || '',
					name: d.name || '',
					description: d.description || '',
					type: d.type || 'percentage',
					percentage: (d.percentage || 0).toString(),
					amount: (d.amount || 0).toString(),
					minOrderAmount: (
						d.minOrderAmount || 0
					).toString(),
					active:
						typeof d.active === 'boolean' ? d.active : true,
				});
				setCurrentId(id);
				setEditing(true);
				setModalVisible(true);
			} catch (err) {
				console.warn(err);
				Alert.alert('Error', 'Unable to load discount');
			} finally {
				setLoading(false);
			}
		},
		[apiCall],
	);

	const closeModal = useCallback(() => {
		setModalVisible(false);
		setEditing(false);
		setCurrentId(null);
		setForm(initialForm);
		Keyboard.dismiss();
	}, [initialForm]);

	const validateForm = useCallback(() => {
		if (!form.code.trim()) return 'Code is required';
		if (
			form.type === 'percentage' &&
			Number(form.percentage) <= 0
		)
			return 'Percentage must be greater than 0';
		if (form.type === 'fixed' && Number(form.amount) <= 0)
			return 'Amount must be greater than 0';
		return null;
	}, [form]);

	const submit = useCallback(async () => {
		const err = validateForm();
		if (err) return Alert.alert('Validation Error', err);

		setSubmitting(true);
		try {
			const payload = {
				code: form.code.trim().toUpperCase(),
				name: form.name,
				description: form.description,
				type: form.type,
				percentage: Number(form.percentage) || 0,
				amount: Number(form.amount) || 0,
				appliesTo: { scope: 'global' },
				minOrderAmount: Number(form.minOrderAmount) || 0,
				active: !!form.active,
				meta: {},
			};

			if (editing && currentId) {
				await apiCall({
					path: `${DISCOUNT_ENDPOINT}/${currentId}`,
					method: 'PATCH',
					body: payload,
				});
				Alert.alert(
					'Success',
					'Discount updated successfully',
				);
			} else {
				await apiCall({
					path: DISCOUNT_ENDPOINT,
					method: 'POST',
					body: payload,
				});
				Alert.alert(
					'Success',
					'Discount created successfully',
				);
			}

			closeModal();
			fetchDiscounts();
		} catch (err) {
			console.warn(err);
			Alert.alert(
				'Error',
				err?.message || 'Unable to save discount',
			);
		} finally {
			setSubmitting(false);
		}
	}, [
		apiCall,
		closeModal,
		currentId,
		editing,
		fetchDiscounts,
		form,
		validateForm,
	]);

	const remove = useCallback(
		(id) => {
			Alert.alert(
				'Confirm Deletion',
				'Are you sure you want to delete this discount? This action cannot be undone.',
				[
					{ text: 'Cancel', style: 'cancel' },
					{
						text: 'Delete',
						style: 'destructive',
						onPress: async () => {
							try {
								setLoading(true);
								await apiCall({
									path: `${DISCOUNT_ENDPOINT}/${id}`,
									method: 'DELETE',
								});
								await fetchDiscounts();
								Alert.alert('Success', 'Discount deleted');
							} catch (err) {
								console.warn(err);
								Alert.alert(
									'Error',
									'Unable to delete discount',
								);
							} finally {
								setLoading(false);
							}
						},
					},
				],
			);
		},
		[apiCall, fetchDiscounts],
	);

	const runValidate = useCallback(async () => {
		if (!validateCode.trim())
			return Alert.alert(
				'Validation Error',
				'Please enter a code',
			);
		setValidating(true);
		setValidateResult(null);
		try {
			const res = await apiCall({
				path: `${DISCOUNT_ENDPOINT}/validate`,
				method: 'POST',
				body: {
					code: validateCode.trim().toUpperCase(),
					cartAmount: Number(cartAmount) || 0,
				},
			});
			setValidateResult(res);
		} catch (err) {
			console.warn(err);
			Alert.alert('Error', 'Validation failed');
		} finally {
			setValidating(false);
		}
	}, [apiCall, cartAmount, validateCode]);

	const openValidateModal = () => {
		setValidateCode('');
		setCartAmount('0');
		setValidateResult(null);
		setValidateModalVisible(true);
	};

	const closeValidateModal = () => {
		setValidateModalVisible(false);
	};

	/* -------- UI Subcomponents -------- */
	function Header() {
		return (
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backButton}
				>
					<Ionicons
						name="arrow-back"
						size={24}
						color="#111827"
					/>
				</TouchableOpacity>
				<View style={styles.headerContent}>
					<Text style={styles.headerTitle}>
						Discount Management
					</Text>
					<Text style={styles.headerSubtitle}>
						Promotions & Coupons
					</Text>
				</View>
				<TouchableOpacity
					onPress={openCreate}
					style={styles.headerAction}
				>
					<Ionicons
						name="add-circle"
						size={28}
						color="#3B82F6"
					/>
				</TouchableOpacity>
			</View>
		);
	}

	function Stats() {
		const total = discounts.length;
		const active = discounts.filter((d) => d.active).length;
		return (
			<View style={styles.statsContainer}>
				<View style={styles.statItem}>
					<Text style={styles.statValue}>{total}</Text>
					<Text style={styles.statLabel}>
						Total Discounts
					</Text>
				</View>
				<View style={styles.statItem}>
					<Text
						style={[
							styles.statValue,
							{ color: '#10B981' },
						]}
					>
						{active}
					</Text>
					<Text style={styles.statLabel}>
						Active Now
					</Text>
				</View>
			</View>
		);
	}

	function Filters() {
		return (
			<View style={styles.filtersContainer}>
				<View style={styles.searchContainer}>
					<Ionicons
						name="search"
						size={20}
						color="#9CA3AF"
						style={styles.searchIcon}
					/>
					<TextInput
						placeholder="Search by code or name..."
						placeholderTextColor="#9CA3AF"
						value={search}
						onChangeText={setSearch}
						style={styles.searchInput}
						returnKeyType="search"
					/>
				</View>
				<View style={styles.switchContainer}>
					<Text style={styles.switchLabel}>
						Active Only
					</Text>
					<Switch
						value={showActiveOnly}
						onValueChange={setShowActiveOnly}
						trackColor={{
							false: '#E5E7EB',
							true: '#3B82F6',
						}}
						thumbColor="#fff"
					/>
				</View>
			</View>
		);
	}

	function DiscountItem({ item }) {
		return (
			<View style={styles.discountItem}>
				<View style={styles.discountHeader}>
					<Text style={styles.discountCode}>
						{item.code}
					</Text>
					<View
						style={[
							styles.statusIndicator,
							{
								backgroundColor: item.active
									? '#10B981'
									: '#EF4444',
							},
						]}
					>
						<Text style={styles.statusText}>
							{item.active ? 'ACTIVE' : 'INACTIVE'}
						</Text>
					</View>
				</View>
				<Text style={styles.discountName}>
					{item.name || 'Unnamed Discount'}
				</Text>
				<View style={styles.discountDetails}>
					<Text style={styles.detailText}>
						{item.type === 'percentage'
							? `${item.percentage}% OFF`
							: `${formatMoney(item.amount)} OFF`}
					</Text>
					<Text style={styles.detailText}>•</Text>
					<Text style={styles.detailText}>
						Min: {formatMoney(item.minOrderAmount)}
					</Text>
				</View>
				<View style={styles.discountActions}>
					<TouchableOpacity
						onPress={() => openEdit(item._id)}
						style={styles.actionButton}
					>
						<Ionicons
							name="create-outline"
							size={18}
							color="#374151"
						/>
						<Text style={styles.actionText}>Edit</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => remove(item._id)}
						style={[styles.actionButton, { backgroundColor: '#FEF2F2' }]}
					>
						<Ionicons
							name="trash-outline"
							size={18}
							color="#EF4444"
						/>
						<Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	if (!hasDiscounts) {
		return (
			<View style={styles.container}>
				<Header />
				<View style={[styles.content, styles.centered]}>
					<View style={styles.lockIconContainer}>
						<Ionicons name="lock-closed" size={64} color="#3B82F6" />
					</View>
					<Text style={styles.restrictedTitle}>Pro Feature</Text>
					<Text style={styles.restrictedSub}>
						Discount codes are available on Pro and Business plans. Upgrade now to start creating promotions and boost your sales!
					</Text>
					<TouchableOpacity
						style={styles.upgradeButtonLarge}
						onPress={() => router.push('/(app)/subscription')}
					>
						<Text style={styles.upgradeButtonTextLarge}>Upgrade to Pro</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Header />
			<View style={styles.content}>
				<Stats />
				<Filters />
				{loading ? (
					<ActivityIndicator
						size="large"
						color="#3B82F6"
						style={styles.loader}
					/>
				) : (
					<FlatList
						data={filtered}
						keyExtractor={(item) => item._id}
						renderItem={DiscountItem}
						onRefresh={onRefresh}
						refreshing={refreshing}
						ListEmptyComponent={
							<View style={styles.emptyContainer}>
								<Ionicons
									name="pricetag-outline"
									size={48}
									color="#9CA3AF"
								/>
								<Text style={styles.emptyText}>
									No discounts found
								</Text>
								<Text style={styles.emptySubtext}>
									Create a new campaign to get started
								</Text>
							</View>
						}
						style={styles.list}
						contentContainerStyle={{ paddingBottom: 100 }}
					/>
				)}
				<TouchableOpacity
					onPress={openValidateModal}
					style={styles.validateButton}
				>
					<Text style={styles.validateButtonText}>
						Validate Code
					</Text>
				</TouchableOpacity>
			</View>

			{/* Create/Edit Modal */}
			<Modal
				visible={modalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={closeModal}
			>
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView
						behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
						style={styles.modalContainer}
					>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{editing ? 'Edit Discount' : 'New Discount'}
							</Text>
							<TouchableOpacity onPress={closeModal}>
								<Ionicons
									name="close"
									size={24}
									color="#374151"
								/>
							</TouchableOpacity>
						</View>
						<ScrollView style={styles.modalBody}>
							<View style={styles.formField}>
								<Text style={styles.formLabel}>Code</Text>
								<TextInput
									style={styles.formInput}
									value={form.code}
									onChangeText={(v) =>
										setForm({ ...form, code: v })
									}
									autoCapitalize="characters"
									placeholder="e.g. SUMMER2024"
									placeholderTextColor="#9CA3AF"
								/>
							</View>
							<View style={styles.formField}>
								<Text style={styles.formLabel}>Name</Text>
								<TextInput
									style={styles.formInput}
									value={form.name}
									onChangeText={(v) =>
										setForm({ ...form, name: v })
									}
									placeholder="Internal Name"
									placeholderTextColor="#9CA3AF"
								/>
							</View>
							<View style={styles.formField}>
								<Text style={styles.formLabel}>
									Description
								</Text>
								<TextInput
									style={[
										styles.formInput,
										styles.textArea,
									]}
									value={form.description}
									onChangeText={(v) =>
										setForm({ ...form, description: v })
									}
									multiline
									placeholder="Optional description..."
									placeholderTextColor="#9CA3AF"
								/>
							</View>
							<View style={styles.formField}>
								<Text style={styles.formLabel}>Type</Text>
								<View style={styles.typeButtons}>
									{[
										'percentage',
										'fixed',
										'free_shipping',
									].map((t) => (
										<TouchableOpacity
											key={t}
											style={[
												styles.typeButton,
												form.type === t &&
												styles.typeButtonActive,
											]}
											onPress={() =>
												setForm({ ...form, type: t })
											}
										>
											<Text
												style={[
													styles.typeButtonText,
													form.type === t &&
													styles.typeButtonTextActive,
												]}
											>
												{t
													.split('_')
													.map(
														(word) =>
															word.charAt(0).toUpperCase() +
															word.slice(1),
													)
													.join(' ')}
											</Text>
										</TouchableOpacity>
									))}
								</View>
							</View>
							{form.type === 'percentage' && (
								<View style={styles.formField}>
									<Text style={styles.formLabel}>
										Percentage (%)
									</Text>
									<TextInput
										style={styles.formInput}
										value={form.percentage}
										onChangeText={(v) =>
											setForm({ ...form, percentage: v })
										}
										keyboardType="numeric"
										placeholder="0"
										placeholderTextColor="#9CA3AF"
									/>
								</View>
							)}
							{form.type === 'fixed' && (
								<View style={styles.formField}>
									<Text style={styles.formLabel}>
										Amount (kobo)
									</Text>
									<TextInput
										style={styles.formInput}
										value={form.amount}
										onChangeText={(v) =>
											setForm({ ...form, amount: v })
										}
										keyboardType="numeric"
										placeholder="0"
										placeholderTextColor="#9CA3AF"
									/>
								</View>
							)}
							<View style={styles.formField}>
								<Text style={styles.formLabel}>
									Min Order Amount (kobo)
								</Text>
								<TextInput
									style={styles.formInput}
									value={form.minOrderAmount}
									onChangeText={(v) =>
										setForm({ ...form, minOrderAmount: v })
									}
									keyboardType="numeric"
									placeholder="0"
									placeholderTextColor="#9CA3AF"
								/>
							</View>
							<View style={styles.formField}>
								<View style={styles.switchRow}>
									<Text style={styles.formLabel}>
										Active
									</Text>
									<Switch
										value={form.active}
										onValueChange={(v) =>
											setForm({ ...form, active: v })
										}
										trackColor={{
											false: '#E5E7EB',
											true: '#3B82F6',
										}}
										thumbColor="#fff"
									/>
								</View>
							</View>
						</ScrollView>
						<TouchableOpacity
							style={styles.submitButton}
							onPress={submit}
							disabled={submitting}
						>
							{submitting ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text style={styles.submitButtonText}>
									{editing ? 'Update Discount' : 'Create Discount'}
								</Text>
							)}
						</TouchableOpacity>
					</KeyboardAvoidingView>
				</View>
			</Modal>

			{/* Validate Modal */}
			<Modal
				visible={validateModalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={closeValidateModal}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.validateModalContainer}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								Validate Code
							</Text>
							<TouchableOpacity
								onPress={closeValidateModal}
							>
								<Ionicons
									name="close"
									size={24}
									color="#374151"
								/>
							</TouchableOpacity>
						</View>
						<View style={styles.modalBody}>
							<View style={styles.formField}>
								<Text style={styles.formLabel}>
									Discount Code
								</Text>
								<TextInput
									style={styles.formInput}
									value={validateCode}
									onChangeText={setValidateCode}
									autoCapitalize="characters"
									placeholder="Code to check"
									placeholderTextColor="#9CA3AF"
								/>
							</View>
							<View style={styles.formField}>
								<Text style={styles.formLabel}>
									Cart Amount (kobo)
								</Text>
								<TextInput
									style={styles.formInput}
									value={cartAmount}
									onChangeText={setCartAmount}
									keyboardType="numeric"
									placeholder="0"
									placeholderTextColor="#9CA3AF"
								/>
							</View>
							<TouchableOpacity
								style={styles.submitButton}
								onPress={runValidate}
								disabled={validating}
							>
								{validating ? (
									<ActivityIndicator color="#fff" />
								) : (
									<Text style={styles.submitButtonText}>
										Check Validity
									</Text>
								)}
							</TouchableOpacity>
							{validateResult && (
								<View
									style={[
										styles.validateResultContainer,
										{
											backgroundColor: validateResult.valid
												? '#ECFDF5'
												: '#FEF2F2',
											borderColor: validateResult.valid
												? '#10B981'
												: '#EF4444',
										},
									]}
								>
									<Text
										style={[
											styles.validateStatus,
											{
												color: validateResult.valid
													? '#059669'
													: '#DC2626',
											},
										]}
									>
										{validateResult.valid
											? 'Valid Discount'
											: 'Invalid Discount'}
									</Text>
									{validateResult.message && (
										<Text style={styles.validateMessage}>
											{validateResult.message}
										</Text>
									)}
								</View>
							)}
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9FAFB',
	},
	content: {
		paddingHorizontal: 16,
		paddingBottom: 40,
	},
	header: {
		backgroundColor: '#fff',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: Platform.OS === 'android' ? 40 : 50,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
		marginBottom: 16,
	},
	headerContent: {
		flex: 1,
		marginLeft: 12,
	},
	backButton: {
		padding: 4,
		marginLeft: -4,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
	headerSubtitle: {
		fontSize: 12,
		color: '#6B7280',
		marginTop: 2,
	},
	headerAction: {
		padding: 4,
	},
	statsContainer: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 20,
	},
	statItem: {
		flex: 1,
		backgroundColor: '#fff',
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
		alignItems: 'center',
	},
	statValue: {
		fontSize: 24,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 4,
	},
	statLabel: {
		fontSize: 13,
		color: '#6B7280',
		fontWeight: '500',
	},
	filtersContainer: {
		marginBottom: 20,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 48,
		marginBottom: 12,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		height: '100%',
		fontSize: 15,
		color: '#111827',
	},
	switchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#fff',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	switchLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
	},
	list: {
		// flex: 1,
	},
	discountItem: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	discountHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	discountCode: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1F2937',
		letterSpacing: 0.5,
	},
	statusIndicator: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 99,
	},
	statusText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#fff',
	},
	discountName: {
		fontSize: 14,
		color: '#4B5563',
		marginBottom: 12,
		fontWeight: '500',
	},
	discountDetails: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginBottom: 16,
		backgroundColor: '#F9FAFB',
		padding: 10,
		borderRadius: 8,
	},
	detailText: {
		fontSize: 13,
		color: '#4B5563',
		fontWeight: '500',
	},
	discountActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 8,
		borderTopWidth: 1,
		borderTopColor: '#F3F4F6',
		paddingTop: 12,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 10,
		backgroundColor: '#F3F4F6',
		borderRadius: 8,
	},
	actionText: {
		fontSize: 13,
		fontWeight: '600',
		marginLeft: 4,
		color: '#374151',
	},
	validateButton: {
		flexDirection: 'row',
		justifyContent: 'center',
		backgroundColor: '#3B82F6',
		padding: 16,
		marginTop: 20,
		marginBottom: 40,
		borderRadius: 12,
		alignItems: 'center',
		shadowColor: '#3B82F6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	validateButtonText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#fff',
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginTop: 12,
	},
	emptySubtext: {
		fontSize: 14,
		color: '#9CA3AF',
		marginTop: 4,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'flex-end',
	},
	modalContainer: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingBottom: 20,
		maxHeight: '90%',
	},
	validateModalContainer: {
		backgroundColor: '#fff',
		borderRadius: 16,
		width: '90%',
		alignSelf: 'center',
		marginBottom: 'auto',
		marginTop: 'auto',
		paddingBottom: 16,
		overflow: 'hidden',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
	modalBody: {
		padding: 20,
	},
	formField: {
		marginBottom: 16,
	},
	formLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 6,
	},
	formInput: {
		backgroundColor: '#fff',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: '#D1D5DB',
		fontSize: 15,
		color: '#1F2937',
	},
	textArea: {
		height: 80,
		textAlignVertical: 'top',
	},
	typeButtons: {
		flexDirection: 'row',
		gap: 8,
	},
	typeButton: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		backgroundColor: '#F9FAFB',
	},
	typeButtonActive: {
		borderColor: '#3B82F6',
		backgroundColor: '#EFF6FF',
	},
	typeButtonText: {
		fontSize: 13,
		fontWeight: '500',
		color: '#6B7280',
	},
	typeButtonTextActive: {
		color: '#3B82F6',
		fontWeight: '600',
	},
	switchRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	submitButton: {
		backgroundColor: '#10B981',
		padding: 16,
		alignItems: 'center',
		marginHorizontal: 20,
		borderRadius: 12,
		marginBottom: 10,
	},
	submitButtonText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#fff',
	},
	validateResultContainer: {
		marginTop: 16,
		padding: 12,
		backgroundColor: '#F3F4F6',
		borderRadius: 8,
	},
	validateStatus: {
		fontWeight: '700',
		fontSize: 16,
		marginBottom: 4,
	},
	validateMessage: {
		fontSize: 14,
		color: '#4B5563',
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	lockIconContainer: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: '#EFF6FF',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 24,
	},
	restrictedTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: '#111827',
		marginBottom: 12,
	},
	restrictedSub: {
		fontSize: 16,
		color: '#6B7280',
		textAlign: 'center',
		paddingHorizontal: 32,
		lineHeight: 24,
		marginBottom: 32,
	},
	upgradeButtonLarge: {
		backgroundColor: '#3B82F6',
		paddingVertical: 16,
		paddingHorizontal: 48,
		borderRadius: 12,
		shadowColor: '#3B82F6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	upgradeButtonTextLarge: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '700',
	},
});
