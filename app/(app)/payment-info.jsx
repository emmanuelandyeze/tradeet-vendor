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
	ScrollView,
	KeyboardAvoidingView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Kept for currency if needed, though mostly NGN
import axiosInstance from '@/utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '@/context/AuthContext';
import axios from 'axios';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const STORAGE_KEY = 'userToken';

// Minimal bank fallback
const FALLBACK_BANKS = [
	{ name: 'Access Bank', code: '044' },
	{ name: 'GTBank', code: '058' },
	{ name: 'Zenith Bank', code: '057' },
	{ name: 'First Bank of Nigeria', code: '011' },
	{ name: 'Union Bank', code: '032' },
	{ name: 'Kuda Bank', code: '50211' },
	{ name: 'OPay', code: '999992' },
	{ name: 'Moniepoint', code: '50515' }
];

const maskAccount = (num) => {
	if (!num) return '';
	const s = String(num);
	if (s.length <= 4) return '****' + s;
	const last = s.slice(-4);
	return '**** ' + last;
};

const validateAccountNumber = (num) => {
	if (!num) return false;
	const s = String(num).replace(/\s+/g, '');
	return /^\d{6,20}$/.test(s);
};

const StorePaymentsScreen = () => {
	const router = useRouter();
	const {
		userInfo,
		selectedStore: contextSelectedStore,
		checkLoginStatus,
	} = useContext(AuthContext);

	const storesList = Array.isArray(userInfo?.stores) ? userInfo.stores : [];

	const [selectedStoreId, setSelectedStoreId] = useState(
		contextSelectedStore?._id || storesList[0]?._id || null,
	);
	const [store, setStore] = useState(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	// Modal State
	const [modalVisible, setModalVisible] = useState(false);
	const [editingIndex, setEditingIndex] = useState(-1); // -1 = new
	const [bankName, setBankName] = useState('');
	const [bankCode, setBankCode] = useState('');
	const [accountNumber, setAccountNumber] = useState('');
	const [accountName, setAccountName] = useState('');
	const [currency, setCurrency] = useState('NGN');
	const [isPrimary, setIsPrimary] = useState(false);

	// Bank List & Search
	const [banks, setBanks] = useState(FALLBACK_BANKS);
	const [banksLoading, setBanksLoading] = useState(false);
	const [filteredBanks, setFilteredBanks] = useState([]);
	const [showBankSuggestions, setShowBankSuggestions] = useState(false);

	const fetchStore = useCallback(async (id) => {
		if (!id) {
			setStore(null);
			return;
		}
		setLoading(true);
		try {
			const resp = await axiosInstance.get(`/stores?id=${id}`);
			const s = resp.data?.store ?? resp.data;
			setStore(s);
		} catch (err) {
			console.error('Failed to fetch store:', err);
			Alert.alert('Error', 'Unable to load store details.');
		} finally {
			setLoading(false);
		}
	}, []);

	// Use user env or hardcoded fallback for demo if needed
	const paystack_key = process.env.PAYSTACK_SECRET_KEY;

	const getBankNames = async () => {
		setBanksLoading(true);
		try {
			// If we don't have a key, we might fail, so rely on fallback silently or try public endpoint
			if (!paystack_key) {
				// optionally fetch from your own backend proxy if key is hidden
				// For now, use fallback if no key
				setBanks(FALLBACK_BANKS);
				return;
			}
			const response = await axios.get('https://api.paystack.co/bank', {
				headers: { Authorization: `Bearer ${paystack_key}` },
			});
			setBanks(response.data.data);
		} catch (error) {
			console.log('Using fallback banks list');
			if (banks.length === 0) setBanks(FALLBACK_BANKS);
		} finally {
			setBanksLoading(false);
		}
	};

	useEffect(() => {
		if (contextSelectedStore && contextSelectedStore._id) {
			setSelectedStoreId(contextSelectedStore._id);
		} else if (storesList.length > 0 && !selectedStoreId) {
			setSelectedStoreId(storesList[0]._id);
		}
	}, [contextSelectedStore, storesList]);

	useEffect(() => {
		if (selectedStoreId) fetchStore(selectedStoreId);
	}, [selectedStoreId, fetchStore]);

	useEffect(() => {
		getBankNames();
	}, []);

	const persistPaymentInfo = async (newPaymentArray) => {
		if (!store || !store._id) return false;
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
			console.error('Failed to save payment info:', err);
			Alert.alert('Save failed', 'Could not save payment information.');
			return false;
		} finally {
			setSaving(false);
		}
	};

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
		resetModalState();
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
		Alert.alert('Delete Account', 'Are you sure you want to remove this bank account?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: async () => {
					const arr = Array.from(store.paymentInfo || []);
					arr.splice(index, 1);
					const ok = await persistPaymentInfo(arr);
					if (ok) ToastAndroid.show('Account removed', ToastAndroid.SHORT);
				},
			},
		]);
	};

	const handleSetPrimary = async (index) => {
		const arr = (store.paymentInfo || []).map((p, i) => ({
			...p,
			isPrimary: i === index,
		}));
		await persistPaymentInfo(arr);
	};

	const handleBankSearch = (text) => {
		setBankName(text);
		if (text.length > 1) {
			const filtered = banks.filter((b) =>
				b.name.toLowerCase().includes(text.toLowerCase()),
			);
			setFilteredBanks(filtered.slice(0, 5));
			setShowBankSuggestions(true);
		} else {
			setFilteredBanks([]);
			setShowBankSuggestions(false);
			setBankCode('');
		}
	};

	const handleSelectBank = (bank) => {
		setBankName(bank.name);
		setBankCode(bank.code);
		setFilteredBanks([]);
		setShowBankSuggestions(false);
	};

	const handleModalSave = async () => {
		if (!bankName.trim() || !accountNumber.trim()) {
			Alert.alert('Missing Fields', 'Please select a bank and enter account number.');
			return;
		}
		if (!validateAccountNumber(accountNumber)) {
			Alert.alert('Invalid Number', 'Account number should be 10 digits.');
			return;
		}
		if (!bankCode) {
			Alert.alert('Select Bank', 'Please select a bank from the list.');
			return;
		}

		try {
			setSaving(true);
			const token = await AsyncStorage.getItem(STORAGE_KEY);

			// Verify Account (Simulated or Real)
			let resolvedName = accountName;
			try {
				const verifyResp = await axiosInstance.post(
					`/stores/${store._id}/verify-account`,
					{ accountNumber: accountNumber.trim(), bankCode: bankCode.trim() },
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				const resolved = verifyResp.data?.account ?? verifyResp.data?.data ?? verifyResp.data;
				resolvedName = resolved?.account_name || resolved?.accountName || accountName;
				if (resolvedName) setAccountName(resolvedName);
			} catch (vErr) {
				console.warn("Verification warning:", vErr);
				// Proceed if user entered a name manually or we just warn? 
				// Usually verification is strict.
				if (!accountName) {
					Alert.alert("Verification Failed", "Could not verify account name. Please check details.");
					setSaving(false);
					return;
				}
			}

			const newEntry = {
				bankName: bankName.trim(),
				bankCode: bankCode.trim(),
				accountNumber: accountNumber.trim(),
				accountName: resolvedName || accountName.trim() || 'Verified Name',
				currency: currency || 'NGN',
				isPrimary: !!isPrimary,
				addedAt: new Date(),
			};

			const arr = Array.from(store.paymentInfo || []);
			if (editingIndex >= 0 && editingIndex < arr.length) {
				arr[editingIndex] = { ...arr[editingIndex], ...newEntry };
			} else {
				if (newEntry.isPrimary) arr.forEach((p) => (p.isPrimary = false));
				arr.push(newEntry);
			}

			const ok = await persistPaymentInfo(arr);
			if (ok) {
				setModalVisible(false);
				Alert.alert('Success', 'Bank account saved successfully.');
			}
		} catch (err) {
			console.error('Save failed', err);
			Alert.alert('Error', 'Failed to save account.');
		} finally {
			setSaving(false);
		}
	};

	const renderPayment = ({ item, index }) => (
		<TouchableOpacity activeOpacity={0.9} style={[styles.card, item.isPrimary && styles.cardPrimary]}>
			<View style={styles.cardHeader}>
				<View style={styles.bankIcon}>
					<FontAwesome5 name="university" size={18} color="#4B5563" />
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.bankName}>{item.bankName}</Text>
					<Text style={styles.accountNumber}>{maskAccount(item.accountNumber)}</Text>
				</View>
				{item.isPrimary ? (
					<View style={styles.primaryBadge}>
						<Text style={styles.primaryText}>PRIMARY</Text>
					</View>
				) : (
					<TouchableOpacity onPress={() => handleSetPrimary(index)} style={styles.setPrimaryLink}>
						<Text style={styles.linkText}>Set Primary</Text>
					</TouchableOpacity>
				)}
			</View>

			<View style={styles.divider} />

			<View style={styles.cardFooter}>
				<Text style={styles.accountNameName}>{item.accountName}</Text>

				<View style={styles.actions}>
					<TouchableOpacity onPress={() => openEditModal(index)} style={styles.actionBtn}>
						<Feather name="edit-2" size={16} color="#4B5563" />
					</TouchableOpacity>
					<TouchableOpacity onPress={() => handleDelete(index)} style={[styles.actionBtn, { marginLeft: 12 }]}>
						<Feather name="trash-2" size={16} color="#EF4444" />
					</TouchableOpacity>
				</View>
			</View>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" backgroundColor="#fff" />
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
					<Feather name="arrow-left" size={24} color="#1F2937" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Payout Accounts</Text>
				<TouchableOpacity onPress={openAddModal} style={styles.addIconBtn}>
					<Feather name="plus" size={24} color="#2563EB" />
				</TouchableOpacity>
			</View>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color="#2563EB" />
				</View>
			) : (
				<FlatList
					data={store?.paymentInfo ?? []}
					keyExtractor={(p, i) => `${p.accountNumber}-${i}`}
					renderItem={renderPayment}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={
						<View style={styles.emptyState}>
							<View style={styles.emptyIconBg}>
								<Feather name="credit-card" size={32} color="#9CA3AF" />
							</View>
							<Text style={styles.emptyTitle}>No Accounts</Text>
							<Text style={styles.emptySubtitle}>Link a bank account to receive payouts.</Text>
							<TouchableOpacity style={styles.addBtnLarge} onPress={openAddModal}>
								<Text style={styles.addBtnText}>Add Bank Account</Text>
							</TouchableOpacity>
						</View>
					}
				/>
			)}

			{/* Form Modal */}
			<Modal visible={modalVisible} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
						<View style={styles.modalContent}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>{editingIndex >= 0 ? 'Edit Account' : 'Add New Account'}</Text>
								<TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
									<Feather name="x" size={24} color="#6B7280" />
								</TouchableOpacity>
							</View>

							<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formScroller}>
								<View style={[styles.inputGroup, { zIndex: 5000 }]}>
									<Text style={styles.label}>Bank Name</Text>
									<TextInput
										value={bankName}
										onChangeText={handleBankSearch}
										placeholder="Search bank..."
										style={styles.textInput}
										placeholderTextColor="#9CA3AF"
									/>
									{showBankSuggestions && (
										<View style={styles.suggestionsContainer}>
											<ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
												{filteredBanks.map((item) => (
													<TouchableOpacity key={item.code} style={styles.suggestionItem} onPress={() => handleSelectBank(item)}>
														<Text style={styles.suggestionText}>{item.name}</Text>
													</TouchableOpacity>
												))}
											</ScrollView>
										</View>
									)}
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.label}>Account Number</Text>
									<TextInput
										value={accountNumber}
										onChangeText={setAccountNumber}
										placeholder="0123456789"
										style={styles.textInput}
										keyboardType="numeric"
										placeholderTextColor="#9CA3AF"
										maxLength={10}
									/>
								</View>

								{/* Optional: Account Name field if verification is strictly manual for some reason, 
                                     but typically read-only or hidden until verified */}
								<View style={styles.inputGroup}>
									<Text style={styles.label}>Account Name</Text>
									<TextInput
										value={accountName}
										onChangeText={setAccountName}
										placeholder="Auto-verified payment name"
										style={[styles.textInput, { backgroundColor: '#F3F4F6' }]}
										editable={true} // Allow edit if verification fails often? Or keep readOnly
									/>
									<Text style={styles.helperText}>Name will be verified automatically.</Text>
								</View>

								<View style={styles.switchRow}>
									<Text style={styles.switchLabel}>Set as Primary Account</Text>
									<Switch value={isPrimary} onValueChange={setIsPrimary} trackColor={{ false: '#E5E7EB', true: '#10B981' }} />
								</View>
							</ScrollView>

							<View style={styles.modalFooter}>
								<TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
									<Text style={styles.cancelButtonText}>Cancel</Text>
								</TouchableOpacity>
								<TouchableOpacity style={styles.saveButton} onPress={handleModalSave} disabled={saving}>
									{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Details</Text>}
								</TouchableOpacity>
							</View>
						</View>
					</KeyboardAvoidingView>
				</View>
			</Modal>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9FAFB',
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: '600',
		color: '#111827',
	},
	backBtn: { padding: 4 },
	addIconBtn: { padding: 4 },

	listContent: {
		padding: 16,
	},

	// Cards
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	cardPrimary: {
		borderColor: '#10B981',
		borderWidth: 1.5,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	bankIcon: {
		width: 40,
		height: 40,
		backgroundColor: '#F3F4F6',
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	bankName: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1F2937',
	},
	accountNumber: {
		fontSize: 13,
		color: '#6B7280',
		fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
		marginTop: 2,
	},
	primaryBadge: {
		backgroundColor: '#ECFDF5',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	primaryText: {
		color: '#059669',
		fontSize: 11,
		fontWeight: '700',
	},
	setPrimaryLink: {
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	linkText: {
		color: '#2563EB',
		fontSize: 13,
		fontWeight: '500',
	},
	divider: {
		height: 1,
		backgroundColor: '#F3F4F6',
		marginVertical: 12,
	},
	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	accountNameName: {
		fontSize: 13,
		color: '#4B5563',
		fontWeight: '500',
		flex: 1,
	},
	actions: {
		flexDirection: 'row',
	},
	actionBtn: {
		padding: 6,
	},

	// Empty State
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 60,
	},
	emptyIconBg: {
		width: 64,
		height: 64,
		backgroundColor: '#E5E7EB',
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1F2937',
	},
	emptySubtitle: {
		fontSize: 14,
		color: '#6B7280',
		marginTop: 4,
		marginBottom: 24,
	},
	addBtnLarge: {
		backgroundColor: '#2563EB',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	addBtnText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 15,
	},

	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'flex-end',
	},
	modalContainer: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		height: '80%',
	},
	modalContent: {
		flex: 1,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
	closeModalBtn: {
		padding: 4,
	},
	formScroller: {
		padding: 16,
	},
	inputGroup: {
		marginBottom: 20,
		position: 'relative', // For suggestions absolute positioning
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 8,
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 8,
		padding: 12,
		fontSize: 15,
		color: '#111827',
		backgroundColor: '#fff',
	},
	helperText: {
		fontSize: 12,
		color: '#6B7280',
		marginTop: 4,
	},
	suggestionsContainer: {
		position: 'absolute',
		top: 75, // label + input height
		left: 0,
		right: 0,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 8,
		zIndex: 100,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
		maxHeight: 200,
	},
	suggestionItem: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	suggestionText: {
		fontSize: 14,
		color: '#374151',
	},
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 8,
	},
	switchLabel: {
		fontSize: 15,
		fontWeight: '500',
		color: '#1F2937',
	},

	modalFooter: {
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		flexDirection: 'row',
		gap: 12,
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 12,
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#F3F4F6',
	},
	cancelButtonText: {
		color: '#4B5563',
		fontWeight: '600',
	},
	saveButton: {
		flex: 2,
		paddingVertical: 12,
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#10B981',
	},
	saveButtonText: {
		color: '#fff',
		fontWeight: '600',
	},
});

export default StorePaymentsScreen;
