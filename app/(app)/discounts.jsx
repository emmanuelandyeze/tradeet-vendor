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
	const {selectedStore} = useContext(AuthContext);

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
						name="chevron-back"
						size={24}
						color={THEME.text}
					/>
				</TouchableOpacity>
				<View style={styles.headerContent}>
					<Text style={styles.headerTitle}>
						Discount Management
					</Text>
					<Text style={styles.headerSubtitle}>
						Overview and control of promotional discounts
					</Text>
				</View>
				<TouchableOpacity
					onPress={openCreate}
					style={styles.headerAction}
				>
					<Ionicons
						name="add-circle-outline"
						size={24}
						color={THEME.primary}
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
							{ color: THEME.success },
						]}
					>
						{active}
					</Text>
					<Text style={styles.statLabel}>
						Active Discounts
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
						name="search-outline"
						size={20}
						color={THEME.subtext}
						style={styles.searchIcon}
					/>
					<TextInput
						placeholder="Search by code or name..."
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
							false: THEME.border,
							true: THEME.primary,
						}}
						thumbColor={THEME.card}
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
									? THEME.success
									: THEME.error,
							},
						]}
					>
						<Text style={styles.statusText}>
							{item.active ? 'Active' : 'Inactive'}
						</Text>
					</View>
				</View>
				<Text style={styles.discountName}>
					{item.name || 'Unnamed Discount'}
				</Text>
				<View style={styles.discountDetails}>
					<Text style={styles.detailText}>
						Type:{' '}
						{item.type.charAt(0).toUpperCase() +
							item.type.slice(1)}
					</Text>
					<Text style={styles.detailText}>
						Value:{' '}
						{item.type === 'percentage'
							? `${item.percentage}%`
							: formatMoney(item.amount)}
					</Text>
					<Text style={styles.detailText}>
						Min Order: {formatMoney(item.minOrderAmount)}
					</Text>
				</View>
				<View style={styles.discountActions}>
					<TouchableOpacity
						onPress={() => openEdit(item._id)}
						style={styles.actionButton}
					>
						<Ionicons
							name="pencil-outline"
							size={20}
							color={THEME.primary}
						/>
						<Text style={styles.actionText}>Edit</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => remove(item._id)}
						style={styles.actionButton}
					>
						<Ionicons
							name="trash-outline"
							size={20}
							color={THEME.error}
						/>
						<Text style={styles.actionText}>Delete</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<Header />
			<ScrollView style={styles.content}>
				<Stats />
				<Filters />
				{loading ? (
					<ActivityIndicator
						size="large"
						color={THEME.primary}
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
									name="alert-circle-outline"
									size={48}
									color={THEME.subtext}
								/>
								<Text style={styles.emptyText}>
									No discounts available
								</Text>
								<Text style={styles.emptySubtext}>
									Create a new discount to get started
								</Text>
							</View>
						}
						style={styles.list}
					/>
				)}
				<TouchableOpacity
					onPress={openValidateModal}
					style={styles.validateButton}
				>
					<Text style={styles.validateButtonText}>
						Validate Discount Code
					</Text>
				</TouchableOpacity>
			</ScrollView>

			{/* Create/Edit Modal */}
			<Modal
				visible={modalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={closeModal}
			>
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView
						behavior={
							Platform.OS === 'ios' ? 'padding' : 'height'
						}
						style={styles.modalContainer}
					>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{editing ? 'Edit Discount' : 'New Discount'}
							</Text>
							<TouchableOpacity onPress={closeModal}>
								<Ionicons
									name="close-outline"
									size={24}
									color={THEME.text}
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
										Percentage
									</Text>
									<TextInput
										style={styles.formInput}
										value={form.percentage}
										onChangeText={(v) =>
											setForm({ ...form, percentage: v })
										}
										keyboardType="numeric"
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
									/>
								</View>
							)}
							<View style={styles.formField}>
								<Text style={styles.formLabel}>
									Minimum Order Amount (kobo)
								</Text>
								<TextInput
									style={styles.formInput}
									value={form.minOrderAmount}
									onChangeText={(v) =>
										setForm({ ...form, minOrderAmount: v })
									}
									keyboardType="numeric"
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
											false: THEME.border,
											true: THEME.primary,
										}}
										thumbColor={THEME.card}
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
								<ActivityIndicator color={THEME.card} />
							) : (
								<Text style={styles.submitButtonText}>
									{editing ? 'Update' : 'Create'}
								</Text>
							)}
						</TouchableOpacity>
					</KeyboardAvoidingView>
				</View>
			</Modal>

			{/* Validate Modal */}
			<Modal
				visible={validateModalVisible}
				animationType="fade"
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
									name="close-outline"
									size={24}
									color={THEME.text}
								/>
							</TouchableOpacity>
						</View>
						<View style={styles.formField}>
							<Text style={styles.formLabel}>
								Discount Code
							</Text>
							<TextInput
								style={styles.formInput}
								value={validateCode}
								onChangeText={setValidateCode}
								autoCapitalize="characters"
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
							/>
						</View>
						<TouchableOpacity
							style={styles.submitButton}
							onPress={runValidate}
							disabled={validating}
						>
							{validating ? (
								<ActivityIndicator color={THEME.card} />
							) : (
								<Text style={styles.submitButtonText}>
									Validate
								</Text>
							)}
						</TouchableOpacity>
						{validateResult && (
							<View
								style={[
									styles.validateResultContainer,
									{
										borderColor: validateResult.valid
											? THEME.success
											: THEME.error,
									},
								]}
							>
								<Text
									style={[
										styles.validateStatus,
										{
											color: validateResult.valid
												? THEME.success
												: THEME.error,
										},
									]}
								>
									{validateResult.valid
										? 'Valid'
										: 'Invalid'}
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
			</Modal>

			{loading && (
				<View style={styles.overlay}>
					<ActivityIndicator
						size="large"
						color={THEME.primary}
					/>
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: THEME.background,
	},
	content: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: 40,
		paddingBottom: 20,
		backgroundColor: THEME.card,
		borderBottomWidth: 1,
		borderBottomColor: THEME.border,
	},
	backButton: {
		marginRight: 16,
	},
	headerContent: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: THEME.text,
	},
	headerSubtitle: {
		fontSize: 14,
		color: THEME.subtext,
	},
	headerAction: {
		marginLeft: 16,
	},
	statsContainer: {
		flexDirection: 'row',
		padding: 16,
		backgroundColor: THEME.card,
		margin: 16,
		borderRadius: 12,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 3,
	},
	statItem: {
		flex: 1,
		alignItems: 'center',
	},
	statValue: {
		fontSize: 24,
		fontWeight: 'bold',
		color: THEME.text,
	},
	statLabel: {
		fontSize: 14,
		color: THEME.subtext,
		marginTop: 4,
	},
	filtersContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		marginBottom: 8,
	},
	searchContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: THEME.card,
		borderRadius: 8,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: THEME.border,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: THEME.text,
	},
	switchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 16,
	},
	switchLabel: {
		fontSize: 14,
		color: THEME.subtext,
		marginRight: 8,
	},
	list: {
		paddingHorizontal: 16,
	},
	discountItem: {
		backgroundColor: THEME.card,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 5 },
		elevation: 3,
	},
	discountHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	discountCode: {
		fontSize: 18,
		fontWeight: 'bold',
		color: THEME.text,
	},
	statusIndicator: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 20,
	},
	statusText: {
		fontSize: 12,
		fontWeight: 'bold',
		color: THEME.card,
	},
	discountName: {
		fontSize: 16,
		color: THEME.subtext,
		marginBottom: 12,
	},
	discountDetails: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	detailText: {
		fontSize: 14,
		color: THEME.subtext,
	},
	discountActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 16,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	actionText: {
		fontSize: 14,
		fontWeight: '600',
	},
	validateButton: {
		backgroundColor: THEME.primary,
		padding: 16,
		margin: 16,
		borderRadius: 12,
		alignItems: 'center',
	},
	validateButtonText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: THEME.card,
	},
	loader: {
		marginTop: 32,
	},
	emptyContainer: {
		alignItems: 'center',
		padding: 32,
	},
	emptyText: {
		fontSize: 18,
		fontWeight: 'bold',
		color: THEME.text,
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 14,
		color: THEME.subtext,
		marginTop: 8,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContainer: {
		backgroundColor: THEME.background,
		borderRadius: 16,
		width: '90%',
		maxHeight: '80%',
		overflow: 'hidden',
	},
	validateModalContainer: {
		backgroundColor: THEME.background,
		borderRadius: 16,
		width: '90%',
		paddingBottom: 16,
		overflow: 'hidden',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: THEME.border,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: THEME.text,
	},
	modalBody: {
		padding: 16,
	},
	formField: {
		marginBottom: 16,
	},
	formLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: THEME.text,
		marginBottom: 8,
	},
	formInput: {
		backgroundColor: THEME.card,
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: THEME.border,
		fontSize: 16,
		color: THEME.text,
	},
	textArea: {
		height: 100,
	},
	typeButtons: {
		flexDirection: 'row',
		gap: 8,
	},
	typeButton: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: THEME.border,
		alignItems: 'center',
	},
	typeButtonActive: {
		borderColor: THEME.primary,
		backgroundColor: THEME.primary + '1A', // semi-transparent
	},
	typeButtonText: {
		fontSize: 14,
		fontWeight: '600',
		color: THEME.text,
	},
	typeButtonTextActive: {
		color: THEME.primary,
	},
	switchRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	submitButton: {
		backgroundColor: THEME.primary,
		padding: 16,
		alignItems: 'center',
		borderBottomLeftRadius: 16,
		borderBottomRightRadius: 16,
	},
	submitButtonText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: THEME.card,
	},
	validateResultContainer: {
		margin: 16,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
	},
	validateStatus: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	validateMessage: {
		fontSize: 14,
		color: THEME.subtext,
		marginTop: 8,
	},
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(255,255,255,0.8)',
		justifyContent: 'center',
		alignItems: 'center',
	},
});
