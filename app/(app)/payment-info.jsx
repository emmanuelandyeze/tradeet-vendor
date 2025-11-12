// screens/StorePaymentsScreen.js
import React, {
	useState,
	useEffect,
	useContext,
	useCallback,
} from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Modal,
	TextInput,
	Switch,
	Alert,
	ActivityIndicator,
	Platform,
	SafeAreaView,
	ScrollView, // Import ScrollView
	KeyboardAvoidingView, // Import KeyboardAvoidingView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axiosInstance from '@/utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '@/context/AuthContext';
import axios from 'axios';
import Ionicons from '@expo/vector-icons/Ionicons';

const STORAGE_KEY = 'userToken';

// Minimal bank fallback if backend is unavailable
const FALLBACK_BANKS = [
	{ name: 'Access Bank', code: '044' },
	{ name: 'GTBank', code: '058' },
	{ name: 'Zenith Bank', code: '057' },
	{ name: 'First Bank of Nigeria', code: '011' },
	{ name: 'Union Bank', code: '032' },
];

const maskAccount = (num) => {
	if (!num) return '';
	const s = String(num);
	if (s.length <= 4) return '****' + s;
	const last = s.slice(-4);
	return '****' + last;
};

const validateAccountNumber = (num) => {
	if (!num) return false;
	const s = String(num).replace(/\s+/g, '');
	return /^\d{6,20}$/.test(s);
};

const StorePaymentsScreen = ({ navigation }) => {
	const {
		userInfo,
		selectedStore: contextSelectedStore,
		checkLoginStatus,
	} = useContext(AuthContext);

	const storesList = Array.isArray(userInfo?.stores)
		? userInfo.stores
		: [];

	const [selectedStoreId, setSelectedStoreId] = useState(
		contextSelectedStore?._id || storesList[0]?._id || null,
	);
	const [store, setStore] = useState(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	// add/edit modal state
	const [modalVisible, setModalVisible] = useState(false);
	const [editingIndex, setEditingIndex] = useState(-1); // -1 = new
	const [bankName, setBankName] = useState(''); // This will now be used for the search input
	const [bankCode, setBankCode] = useState('');
	const [accountNumber, setAccountNumber] = useState('');
	const [accountName, setAccountName] = useState('');
	const [currency, setCurrency] = useState('NGN');
	const [isPrimary, setIsPrimary] = useState(false);

	// bank list
	const [banks, setBanks] = useState(FALLBACK_BANKS);
	const [banksLoading, setBanksLoading] = useState(false); // We can use this

	// ** NEW STATE for bank autocomplete **
	const [filteredBanks, setFilteredBanks] = useState([]);
	const [showBankSuggestions, setShowBankSuggestions] =
		useState(false);

	// fetch selected store's details
	const fetchStore = useCallback(
		async (id) => {
			if (!id) {
				setStore(null);
				return;
			}
			setLoading(true);
			try {
				const resp = await axiosInstance.get(
					`/stores?id=${id}`,
				);
				const s = resp.data?.store ?? resp.data;
				setStore(s);
			} catch (err) {
				console.error(
					'Failed to fetch store:',
					err?.response?.data || err,
				);
				Alert.alert(
					'Error',
					'Unable to load store details. Please try again.',
				);
			} finally {
				setLoading(false);
			}
		},
		[setStore],
	);

	const paystack_key = process.env.PAYSTACK_SECRET_KEY;

	const getBankNames = async () => {
		setBanksLoading(true); // Set loading true
		try {
			const response = await axios.get(
				'https://api.paystack.co/bank',
				{
					headers: {
						Authorization: `Bearer ${paystack_key}`, // Replace with your secret key
					},
				},
			);
			const banks = response.data.data;
			setBanks(banks);
		} catch (error) {
			console.error('Error fetching bank list:', error);
			// Don't overwrite fallback if API fails
			if (banks.length === 0) setBanks(FALLBACK_BANKS);
		} finally {
			setBanksLoading(false); // Set loading false
		}
	};

	useEffect(() => {
		if (contextSelectedStore && contextSelectedStore._id) {
			setSelectedStoreId(contextSelectedStore._id);
		} else if (storesList.length > 0 && !selectedStoreId) {
			setSelectedStoreId(storesList[0]._id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [contextSelectedStore, storesList]);

	useEffect(() => {
		if (selectedStoreId) fetchStore(selectedStoreId);
	}, [selectedStoreId, fetchStore]);

	useEffect(() => {
		getBankNames();
	}, []);

	const persistPaymentInfo = async (newPaymentArray) => {
		if (!store || !store._id) {
			Alert.alert('Error', 'No store selected');
			return false;
		}
		setSaving(true);
		try {
			const token = await AsyncStorage.getItem(STORAGE_KEY);
			await axiosInstance.put(
				`/stores/${store._id}`,
				{ paymentInfo: newPaymentArray },
				{ headers: { Authorization: `Bearer ${token}` } },
			);

			await fetchStore(store._id);
			await checkLoginStatus();
			return true;
		} catch (err) {
			console.error(
				'Failed to save payment info:',
				err?.response?.data || err,
			);
			Alert.alert(
				'Save failed',
				err?.response?.data?.message ||
					'Could not save payment information.',
			);
			return false;
		} finally {
			setSaving(false);
		}
	};

	// ** HELPER to reset modal state **
	const resetModalState = () => {
		setEditingIndex(-1);
		setBankName('');
		setBankCode('');
		setAccountNumber('');
		setAccountName('');
		setCurrency('NGN');
		setIsPrimary(false);
		setFilteredBanks([]);
		setShowBankSuggestions(false);
	};

	const openAddModal = () => {
		resetModalState();
		setModalVisible(true);
	};

	const openEditModal = (index) => {
		const p = (store?.paymentInfo || [])[index];
		if (!p) return;

		resetModalState(); // Reset first

		// Then set editing state
		setEditingIndex(index);
		setBankName(p.bankName || '');
		setBankCode(p.bankCode || '');
		setAccountNumber(p.accountNumber || '');
		setAccountName(p.accountName || '');
		setCurrency(p.currency || 'NGN');
		setIsPrimary(!!p.isPrimary);

		setModalVisible(true);
	};

	const handleDelete = (index) => {
		Alert.alert(
			'Delete account',
			'Are you sure you want to remove this payment account?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						const arr = Array.from(store.paymentInfo || []);
						arr.splice(index, 1);
						const ok = await persistPaymentInfo(arr);
						if (ok)
							Alert.alert(
								'Deleted',
								'Payment account removed',
							);
					},
				},
			],
		);
	};

	const handleSetPrimary = async (index) => {
		const arr = (store.paymentInfo || []).map((p, i) => ({
			...p,
			isPrimary: i === index,
		}));
		const ok = await persistPaymentInfo(arr);
		if (ok)
			Alert.alert('Updated', 'Primary account updated');
	};

	// ** NEW: Handle bank search text change **
	const handleBankSearch = (text) => {
		setBankName(text); // Update the text input
		if (text.length > 1) {
			const filtered = banks.filter((b) =>
				b.name.toLowerCase().includes(text.toLowerCase()),
			);
			setFilteredBanks(filtered.slice(0, 5)); // Show top 5
			setShowBankSuggestions(true);
		} else {
			setFilteredBanks([]);
			setShowBankSuggestions(false);
			setBankCode(''); // Clear bank code if search is cleared
		}
	};

	// ** NEW: Handle selecting a bank from suggestions **
	const handleSelectBank = (bank) => {
		setBankName(bank.name);
		setBankCode(bank.code);
		setFilteredBanks([]);
		setShowBankSuggestions(false);
	};

	const handleModalSave = async () => {
		if (!bankName.trim() || !accountNumber.trim()) {
			Alert.alert(
				'Validation',
				'Please fill bank name and account number',
			);
			return;
		}
		if (!validateAccountNumber(accountNumber)) {
			Alert.alert(
				'Validation',
				'Account number appears invalid — use 6–20 digits',
			);
			return;
		}
		// ** UPDATED: Check bank code **
		if (!bankCode || String(bankCode).trim() === '') {
			Alert.alert(
				'Validation',
				'Please choose a bank from the suggestions list',
			);
			return;
		}

		try {
			setSaving(true);
			const token = await AsyncStorage.getItem(STORAGE_KEY);

			const verifyResp = await axiosInstance.post(
				`/stores/${store._id}/verify-account`,
				{
					accountNumber: accountNumber.trim(),
					bankCode: bankCode.trim(),
				},
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			const resolved =
				verifyResp.data?.account ??
				verifyResp.data?.data ??
				verifyResp.data;
			const resolvedName =
				resolved?.account_name ||
				resolved?.accountName ||
				accountName;

			if (resolvedName) {
				setAccountName(resolvedName);
			}

			const newEntry = {
				bankName: bankName.trim(),
				bankCode: bankCode.trim(),
				accountNumber: accountNumber.trim(),
				accountName:
					resolvedName || accountName.trim() || '',
				currency: currency || 'NGN',
				isPrimary: !!isPrimary,
				addedAt: new Date(),
			};

			const arr = Array.from(store.paymentInfo || []);
			if (editingIndex >= 0 && editingIndex < arr.length) {
				arr[editingIndex] = {
					...arr[editingIndex],
					...newEntry,
				};
			} else {
				if (newEntry.isPrimary)
					arr.forEach((p) => (p.isPrimary = false));
				arr.push(newEntry);
			}

			const ok = await persistPaymentInfo(arr);
			if (ok) {
				setModalVisible(false);
				Alert.alert('Saved', 'Payment information saved');
			}
		} catch (err) {
			console.error(
				'Account verification failed',
				err?.response?.data || err,
			);
			const message =
				err?.response?.data?.message ||
				err?.message ||
				'Account verification failed';
			Alert.alert('Verification failed', message);
		} finally {
			setSaving(false);
		}
	};

	// ** UPDATED: renderPayment with Icon **
	const renderPayment = ({ item, index }) => (
		<View style={styles.paymentRow}>
			<View style={styles.paymentIcon}>
				<Ionicons
					name="business-outline"
					size={24}
					color="#1C99FF"
				/>
			</View>
			<View style={styles.paymentLeft}>
				<Text style={styles.bankName}>
					{item.bankName || 'Bank'}
				</Text>
				<Text style={styles.accountName}>
					{item.accountName || ''}
				</Text>
				<Text style={styles.accountNumber}>
					{maskAccount(item.accountNumber)}
				</Text>
			</View>

			<View style={styles.paymentRight}>
				{item.isPrimary ? (
					<View style={styles.primaryBadge}>
						<Text style={styles.primaryText}>PRIMARY</Text>
					</View>
				) : (
					<TouchableOpacity
						style={styles.setPrimaryBtn}
						onPress={() => handleSetPrimary(index)}
					>
						<Text style={styles.setPrimaryText}>
							Set primary
						</Text>
					</TouchableOpacity>
				)}

				<View style={styles.rowActions}>
					<TouchableOpacity
						onPress={() => openEditModal(index)}
						style={styles.iconBtn}
					>
						<Ionicons
							name="create-outline"
							size={20}
							color="#1C2634"
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => handleDelete(index)}
						style={styles.iconBtn}
					>
						<Ionicons
							name="trash-outline"
							size={20}
							color="#ff5a5f"
						/>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);

	if (loading) {
		return (
			<SafeAreaView
				style={[styles.container, styles.center]}
			>
				<ActivityIndicator size="large" />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.headerRow}>
				<View style={{ flex: 1 }}>
					<Text style={styles.heading}>
						Payment & Payouts
					</Text>
					<Text style={styles.smallMuted}>
						Manage payout accounts for your stores
					</Text>
				</View>

				{storesList.length > 1 ? (
					<View style={styles.storePickerWrapper}>
						<Picker
							selectedValue={selectedStoreId}
							onValueChange={(val) =>
								setSelectedStoreId(val)
							}
							style={styles.storePicker}
							itemStyle={styles.storePickerItem} // Added for potential iOS styling
						>
							{storesList.map((s) => (
								<Picker.Item
									key={s._id}
									label={s.name || s.storeLink || s._id}
									value={s._id}
								/>
							))}
						</Picker>
					</View>
				) : (
					<View style={styles.storeBadge}>
						<Text style={styles.storeBadgeText}>
							{store?.name ?? 'Your store'}
						</Text>
					</View>
				)}
			</View>

			<View style={styles.controlsRow}>
				<TouchableOpacity
					style={styles.addBtn}
					onPress={openAddModal}
				>
					<Ionicons name="add" size={20} color="#fff" />
					<Text style={styles.addBtnText}>Add account</Text>
				</TouchableOpacity>
			</View>

			<FlatList
				data={store?.paymentInfo ?? []}
				keyExtractor={(p, i) => `${p.accountNumber || i}`}
				renderItem={renderPayment}
				// ** UPDATED: ListEmptyComponent **
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<Ionicons
							name="information-circle-outline"
							size={48}
							color="#9ca3af"
						/>
						<Text style={styles.emptyText}>
							No payout accounts yet
						</Text>
						<Text style={styles.emptySubText}>
							Add one to receive your payouts.
						</Text>
					</View>
				}
				contentContainerStyle={{ paddingBottom: 24 }}
			/>

			{/* ** UPDATED: Add / Edit Modal ** */}
			<Modal
				visible={modalVisible}
				animationType="slide"
				transparent
			>
				<View style={styles.modalBg}>
					{/* ** NEW: KeyboardAvoidingView ** */}
					<KeyboardAvoidingView
						behavior={
							Platform.OS === 'ios' ? 'padding' : 'height'
						}
						style={styles.modalKAV}
					>
						<View style={styles.modalCard}>
							<Text style={styles.modalTitle}>
								{editingIndex >= 0
									? 'Edit account'
									: 'Add payment account'}
							</Text>

							{/* ** NEW: ScrollView ** */}
							<ScrollView
								keyboardShouldPersistTaps="handled"
								contentContainerStyle={
									styles.modalScrollContent
								}
							>
								<Text style={styles.label}>Bank Name</Text>
								<TextInput
									value={bankName}
									onChangeText={handleBankSearch} // Use new handler
									placeholder="Type to search your bank..."
									style={styles.input}
									onFocus={() => {
										// Show suggestions if user focuses and has text
										if (bankName.length > 1) {
											handleBankSearch(bankName);
										}
									}}
								/>

								{/* ** NEW: Bank Suggestions List ** */}
								{showBankSuggestions && (
									<FlatList
										data={filteredBanks}
										keyExtractor={(item) => item.code}
										renderItem={({ item }) => (
											<TouchableOpacity
												style={styles.suggestionItem}
												onPress={() =>
													handleSelectBank(item)
												}
											>
												<Text style={styles.suggestionText}>
													{item.name}
												</Text>
											</TouchableOpacity>
										)}
										style={styles.suggestionsList}
										nestedScrollEnabled
									/>
								)}

								{banksLoading && !showBankSuggestions && (
									<ActivityIndicator
										style={{ marginVertical: 10 }}
									/>
								)}

								{/* ** REMOVED: Old Bank Name Input and Picker ** */}

								<Text style={styles.label}>
									Account Number
								</Text>
								<TextInput
									value={accountNumber}
									onChangeText={setAccountNumber}
									placeholder="Account number"
									style={styles.input}
									keyboardType={
										Platform.OS === 'ios'
											? 'number-pad'
											: 'numeric'
									}
								/>

								<Text style={styles.label}>
									Account Name
								</Text>
								<TextInput
									value={accountName}
									onChangeText={setAccountName}
									placeholder="Account name (auto-filled on verify)"
									style={styles.input}
								/>

								<View style={styles.rowBetween}>
									<Text style={styles.smallLabel}>
										Set as primary payout account
									</Text>
									<Switch
										value={isPrimary}
										onValueChange={setIsPrimary}
									/>
								</View>
							</ScrollView>

							{/* Modal Actions */}
							<View style={styles.modalActions}>
								<TouchableOpacity
									style={[
										styles.modalBtn,
										styles.cancelBtn,
									]}
									onPress={() => setModalVisible(false)}
								>
									<Text
										style={styles.modalBtnTextSecondary}
									>
										Cancel
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.modalBtn,
										styles.verifyBtn,
									]}
									onPress={handleModalSave}
									disabled={saving}
								>
									{saving ? (
										<ActivityIndicator color="#fff" />
									) : (
										<Text style={styles.modalBtnText}>
											Verify & Save
										</Text>
									)}
								</TouchableOpacity>
							</View>

							<Text style={styles.helpText}>
								We securely verify account name using
								Paystack before saving.
							</Text>
						</View>
					</KeyboardAvoidingView>
				</View>
			</Modal>
		</SafeAreaView>
	);
};

export default StorePaymentsScreen;

// ** UPDATED: Styles **
const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: Platform.OS === 'android' ? 40 : 20, // Better safe area handling
		backgroundColor: '#f8f9fa', // Lighter bg
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
		paddingHorizontal: 4, // Add slight horizontal padding
	},
	heading: {
		fontSize: 22, // Slightly larger
		fontWeight: '700',
		color: '#1C2634',
	},
	smallMuted: {
		fontSize: 13,
		color: '#6b7280',
		marginTop: 2,
	},
	storePickerWrapper: {
		maxWidth: 180,
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#dee2e6', // Softer border
		overflow: 'hidden',
	},
	storePicker: { height: 44, width: '100%' },
	storePickerItem: { height: 44 }, // For iOS
	storeBadge: {
		backgroundColor: '#fff',
		paddingHorizontal: 12,
		paddingVertical: 8, // More padding
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#dee2e6',
	},
	storeBadgeText: {
		color: '#1C2634',
		fontWeight: '600',
		fontSize: 13,
	},

	controlsRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginBottom: 16,
		paddingHorizontal: 4,
	},
	addBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#1C99FF',
		paddingVertical: 10, // More padding
		paddingHorizontal: 14,
		borderRadius: 8, // Less rounded
		// Shadow for depth
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	addBtnText: {
		color: '#fff',
		fontWeight: '600', // 600 weight
		marginLeft: 6,
		fontSize: 14,
	},

	paymentRow: {
		flexDirection: 'row',
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16, // More padding
		marginBottom: 12,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e9ecef', // Softer border
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	// ** NEW: Style for icon **
	paymentIcon: {
		marginRight: 12,
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e7f5ff',
		borderRadius: 20, // Circle
	},
	paymentLeft: { flex: 1 },
	bankName: {
		fontSize: 16,
		fontWeight: '600', // 600 weight
		color: '#212529',
	},
	accountName: {
		color: '#495057',
		marginTop: 4,
		fontSize: 14,
	},
	accountNumber: {
		color: '#adb5bd',
		marginTop: 6,
		fontSize: 13,
	},
	paymentRight: {
		alignItems: 'flex-end',
		justifyContent: 'space-between',
		minHeight: 60, // Use minHeight instead of fixed height
	},
	primaryBadge: {
		backgroundColor: '#1C99FF',
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 6,
	},
	primaryText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 10,
	},
	setPrimaryBtn: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#1C99FF',
	},
	setPrimaryText: {
		color: '#1C99FF',
		fontWeight: '600',
		fontSize: 11,
	},
	rowActions: { flexDirection: 'row', marginTop: 10 },
	iconBtn: { marginLeft: 12 },

	// ** UPDATED: Empty state styles **
	emptyContainer: {
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 40,
	},
	emptyText: {
		color: '#495057',
		textAlign: 'center',
		marginTop: 12,
		fontSize: 16,
		fontWeight: '600',
	},
	emptySubText: {
		color: '#6b7280',
		textAlign: 'center',
		marginTop: 4,
		fontSize: 14,
	},

	modalBg: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)', // Darker bg
		justifyContent: 'center',
		padding: 16,
	},
	// ** NEW: KAV style **
	modalKAV: {
		width: '100%',
	},
	modalCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 20,
		maxHeight: '90%', // Ensure modal doesn't overflow
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 8,
		elevation: 10,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 16,
		color: '#212529',
	},
	// ** NEW: ScrollView content style **
	modalScrollContent: {
		paddingBottom: 20, // Add padding for the scroll
	},
	// ** NEW: Label style **
	label: {
		fontSize: 13,
		color: '#495057',
		marginBottom: 6,
		fontWeight: '500',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ced4da', // Standard border
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 8,
		marginBottom: 12,
		backgroundColor: '#fff',
		fontSize: 15,
	},

	// ** REMOVED: pickerRow, pickerBlock, pickerLabel, picker **

	// ** NEW: Bank Suggestion Styles **
	suggestionsList: {
		maxHeight: 150, // Limit height
		borderColor: '#dee2e6',
		borderWidth: 1,
		borderRadius: 8,
		marginTop: -4, // Overlap slightly with input bottom
		marginBottom: 10,
	},
	suggestionItem: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e9ecef',
	},
	suggestionText: {
		fontSize: 15,
		color: '#212529',
	},

	rowBetween: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginVertical: 12,
		paddingVertical: 8,
		borderTopWidth: 1,
		borderTopColor: '#f1f3f5',
	},
	smallLabel: { color: '#374151', fontSize: 14 },

	modalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#f1f3f5',
	},
	modalBtn: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
		marginLeft: 8,
		minWidth: 90, // Give buttons min width
		alignItems: 'center',
	},
	cancelBtn: {
		backgroundColor: '#e9ecef', // Lighter cancel
	},
	verifyBtn: { backgroundColor: '#1C99FF' },
	modalBtnText: { color: '#fff', fontWeight: '600' },
	modalBtnTextSecondary: {
		color: '#495057',
		fontWeight: '600',
	},

	helpText: {
		marginTop: 16,
		fontSize: 12,
		color: '#6b7280',
		textAlign: 'center',
	},
});
