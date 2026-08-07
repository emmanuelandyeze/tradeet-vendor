import React, { useState, useEffect, useContext, useCallback } from 'react';
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
	ScrollView,
	KeyboardAvoidingView,
	RefreshControl,
} from 'react-native';
import axiosInstance from '@/utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '@/context/AuthContext';
import axios from 'axios';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '@/constants/theme';

/**
 * Payout accounts — the merchant's own bank accounts, used for withdrawals and printed on
 * invoices when they have no Anchor account.
 *
 * The Anchor account itself is NOT managed here. It used to be, duplicating the onboarding
 * that now lives in the Payments tab, which meant two implementations of the same flow drifting
 * apart. What remains is a read-only summary that links across, so there is one place to set it
 * up and one place this screen has to agree with.
 */

const STORAGE_KEY = 'userToken';

const FALLBACK_BANKS = [
	{ name: 'Access Bank', code: '044' },
	{ name: 'GTBank', code: '058' },
	{ name: 'Zenith Bank', code: '057' },
	{ name: 'First Bank of Nigeria', code: '011' },
	{ name: 'Union Bank', code: '032' },
	{ name: 'Kuda Bank', code: '50211' },
	{ name: 'OPay', code: '999992' },
	{ name: 'Moniepoint', code: '50515' },
];

const validateAccountNumber = (num) => /^\d{6,20}$/.test(String(num || '').replace(/\s+/g, ''));

/** "Access Bank" -> "AB", for the account tile. */
const bankInitials = (name) =>
	String(name || '?')
		.split(/\s+/)
		.map((w) => w[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

const StorePaymentsScreen = () => {
	const router = useRouter();
	const { selectedStore: contextSelectedStore, checkLoginStatus } = useContext(AuthContext);

	const brandId = contextSelectedStore?._isBranch
		? contextSelectedStore._storeId
		: contextSelectedStore?._id;

	const [store, setStore] = useState(null);
	const [anchorAccount, setAnchorAccount] = useState(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const [modalVisible, setModalVisible] = useState(false);
	const [editingIndex, setEditingIndex] = useState(-1);
	const [bankName, setBankName] = useState('');
	const [bankCode, setBankCode] = useState('');
	const [accountNumber, setAccountNumber] = useState('');
	const [accountName, setAccountName] = useState('');
	const [isPrimary, setIsPrimary] = useState(false);

	const [banks, setBanks] = useState(FALLBACK_BANKS);
	const [filteredBanks, setFilteredBanks] = useState([]);
	const [showBankSuggestions, setShowBankSuggestions] = useState(false);

	/* ------------------------------ data ------------------------------ */

	const fetchStore = useCallback(async (id) => {
		if (!id) return setStore(null);
		setLoading(true);
		try {
			const resp = await axiosInstance.get(`/stores?id=${id}`);
			setStore(resp.data?.store ?? resp.data);
		} catch (err) {
			console.error('Failed to fetch store:', err);
			Alert.alert('Error', 'Unable to load store details.');
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchAnchorAccount = useCallback(async (id) => {
		if (!id) return;
		try {
			const resp = await axiosInstance.get(`/anchor/${id}`);
			if (resp.data?.success) setAnchorAccount(resp.data.data);
		} catch (err) {
			// A merchant without an Anchor account is the normal case, not an error.
			setAnchorAccount(null);
		}
	}, []);

	const getBankNames = useCallback(async () => {
		const key = process.env.PAYSTACK_SECRET_KEY;
		if (!key) return; // keep the fallback list
		try {
			const response = await axios.get('https://api.paystack.co/bank', {
				headers: { Authorization: `Bearer ${key}` },
			});
			if (Array.isArray(response.data?.data)) setBanks(response.data.data);
		} catch {
			// fallback list already in state
		}
	}, []);

	useEffect(() => {
		fetchStore(brandId);
		fetchAnchorAccount(brandId);
		getBankNames();
	}, [brandId, fetchStore, fetchAnchorAccount, getBankNames]);

	const persistPaymentInfo = async (newPaymentArray) => {
		if (!store?._id) return false;
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

	/* ------------------------------ form ------------------------------ */

	const resetForm = () => {
		setEditingIndex(-1);
		setBankName('');
		setBankCode('');
		setAccountNumber('');
		setAccountName('');
		setIsPrimary(false);
		setFilteredBanks([]);
		setShowBankSuggestions(false);
	};

	const openAdd = () => {
		resetForm();
		setModalVisible(true);
	};

	const openEdit = (index) => {
		const p = (store?.paymentInfo || [])[index];
		if (!p) return;
		setEditingIndex(index);
		setBankName(p.bankName || '');
		setBankCode(p.bankCode || '');
		setAccountNumber(p.accountNumber || '');
		setAccountName(p.accountName || '');
		setIsPrimary(!!p.isPrimary);
		setFilteredBanks([]);
		setShowBankSuggestions(false);
		setModalVisible(true);
	};

	const handleBankSearch = (text) => {
		setBankName(text);
		setBankCode('');
		if (!text.trim()) {
			setShowBankSuggestions(false);
			return setFilteredBanks([]);
		}
		setFilteredBanks(banks.filter((b) => b.name.toLowerCase().includes(text.toLowerCase())).slice(0, 8));
		setShowBankSuggestions(true);
	};

	const handleSelectBank = (bank) => {
		setBankName(bank.name);
		setBankCode(bank.code);
		setFilteredBanks([]);
		setShowBankSuggestions(false);
	};

	const handleDelete = (index) => {
		const p = (store?.paymentInfo || [])[index];
		Alert.alert(
			'Remove account',
			`Remove ${p?.bankName} ${p?.accountNumber}? It will no longer appear on your invoices.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Remove',
					style: 'destructive',
					onPress: async () => {
						const arr = (store.paymentInfo || []).filter((_, i) => i !== index);
						await persistPaymentInfo(arr);
					},
				},
			],
		);
	};

	const makePrimary = async (index) => {
		const arr = (store.paymentInfo || []).map((p, i) => ({ ...p, isPrimary: i === index }));
		await persistPaymentInfo(arr);
	};

	const handleSave = async () => {
		if (!bankName.trim() || !accountNumber.trim()) {
			return Alert.alert('Missing details', 'Choose a bank and enter the account number.');
		}
		if (!bankCode) {
			return Alert.alert('Choose a bank', 'Pick your bank from the list so we can verify the account.');
		}
		if (!validateAccountNumber(accountNumber)) {
			return Alert.alert('Check the number', 'A Nigerian account number is 10 digits.');
		}

		setSaving(true);
		try {
			const token = await AsyncStorage.getItem(STORAGE_KEY);

			// Resolve the real account name with the bank. A name the merchant typed themselves
			// is not trustworthy — it is what customers check before sending money.
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
			} catch {
				if (!accountName.trim()) {
					setSaving(false);
					return Alert.alert(
						'Could not verify',
						'We could not confirm this account with the bank. Check the number, or type the account name to save it anyway.',
					);
				}
			}

			const entry = {
				bankName: bankName.trim(),
				bankCode: bankCode.trim(),
				accountNumber: accountNumber.trim(),
				accountName: (resolvedName || accountName).trim(),
				currency: 'NGN',
				isPrimary: !!isPrimary,
				addedAt: new Date(),
			};

			const arr = Array.from(store.paymentInfo || []);
			if (editingIndex >= 0 && editingIndex < arr.length) {
				arr[editingIndex] = { ...arr[editingIndex], ...entry };
				if (entry.isPrimary) arr.forEach((p, i) => { if (i !== editingIndex) p.isPrimary = false; });
			} else {
				if (entry.isPrimary) arr.forEach((p) => { p.isPrimary = false; });
				arr.push(entry);
			}

			if (await persistPaymentInfo(arr)) {
				setModalVisible(false);
				resetForm();
			}
		} finally {
			setSaving(false);
		}
	};

	/* ------------------------------ render ------------------------------ */

	const anchorIsActive = anchorAccount?.status === 'active' && anchorAccount?.accountNumber;

	const ListHeader = () => (
		<>
			{/* Collection account — read-only here; the Payments tab owns it. */}
			<TouchableOpacity
				style={styles.anchorCard}
				activeOpacity={0.85}
				onPress={() => router.push('/(app)/(tabs)/payments')}
			>
				<View style={styles.anchorTop}>
					<View style={styles.anchorIcon}>
						<Ionicons name="business" size={18} color={COLORS.primary} />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.anchorTitle}>Business account</Text>
						<Text style={styles.anchorSubtitle}>
							{anchorIsActive ? 'Customers pay into this directly' : 'Not set up yet'}
						</Text>
					</View>
					<Feather name="chevron-right" size={18} color={COLORS.textLight} />
				</View>

				{anchorIsActive ? (
					<View style={styles.anchorBody}>
						<Text style={styles.anchorNumber}>{anchorAccount.accountNumber}</Text>
						<Text style={styles.anchorName}>{anchorAccount.accountName || '—'}</Text>
						<Text style={styles.anchorBank}>{anchorAccount.bankName || '—'}</Text>
					</View>
				) : (
					<Text style={styles.anchorCta}>
						Get an account number your customers can transfer into. Tap to set it up.
					</Text>
				)}
			</TouchableOpacity>

			<View style={styles.sectionRow}>
				<View>
					<Text style={styles.sectionTitle}>Payout accounts</Text>
					<Text style={styles.sectionHint}>Where you withdraw to</Text>
				</View>
				<TouchableOpacity style={styles.addBtn} onPress={openAdd}>
					<Feather name="plus" size={16} color={COLORS.primary} />
					<Text style={styles.addBtnText}>Add</Text>
				</TouchableOpacity>
			</View>
		</>
	);

	const renderAccount = ({ item, index }) => (
		<View style={styles.accountCard}>
			<View style={styles.accountTop}>
				<View style={styles.bankBadge}>
					<Text style={styles.bankBadgeText}>{bankInitials(item.bankName)}</Text>
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.accountName} numberOfLines={1}>{item.accountName || '—'}</Text>
					<Text style={styles.accountMeta}>
						{item.accountNumber} · {item.bankName}
					</Text>
				</View>
				{item.isPrimary ? (
					<View style={styles.primaryPill}>
						<Text style={styles.primaryPillText}>PRIMARY</Text>
					</View>
				) : null}
			</View>

			<View style={styles.accountActions}>
				{!item.isPrimary && (
					<TouchableOpacity style={styles.accountAction} onPress={() => makePrimary(index)}>
						<Feather name="star" size={14} color={COLORS.textSecondary} />
						<Text style={styles.accountActionText}>Make primary</Text>
					</TouchableOpacity>
				)}
				<TouchableOpacity style={styles.accountAction} onPress={() => openEdit(index)}>
					<Feather name="edit-2" size={14} color={COLORS.textSecondary} />
					<Text style={styles.accountActionText}>Edit</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.accountAction} onPress={() => handleDelete(index)}>
					<Feather name="trash-2" size={14} color={COLORS.danger} />
					<Text style={[styles.accountActionText, { color: COLORS.danger }]}>Remove</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	return (
		<View style={styles.container}>
			<StatusBar style="dark" />
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
					<Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Bank Accounts</Text>
				<View style={{ width: 32 }} />
			</View>

			{loading && !store ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={COLORS.primary} />
				</View>
			) : (
				<FlatList
					data={store?.paymentInfo ?? []}
					keyExtractor={(p, i) => `${p.accountNumber}-${i}`}
					renderItem={renderAccount}
					ListHeaderComponent={ListHeader}
					contentContainerStyle={styles.listContent}
					refreshControl={
						<RefreshControl
							refreshing={loading}
							onRefresh={() => { fetchStore(brandId); fetchAnchorAccount(brandId); }}
							tintColor={COLORS.primary}
						/>
					}
					ListEmptyComponent={
						<View style={styles.emptyState}>
							<Feather name="credit-card" size={26} color={COLORS.textLight} />
							<Text style={styles.emptyTitle}>No payout account yet</Text>
							<Text style={styles.emptySubtitle}>
								Add the bank account you want your money paid into.
							</Text>
						</View>
					}
				/>
			)}

			{/* Add / edit */}
			<Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
				<KeyboardAvoidingView
					style={styles.modalOverlay}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<View style={styles.modalCard}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								{editingIndex >= 0 ? 'Edit account' : 'Add payout account'}
							</Text>
							<TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={10}>
								<Feather name="x" size={22} color={COLORS.textSecondary} />
							</TouchableOpacity>
						</View>

						<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
							<Text style={styles.label}>Bank</Text>
							<TextInput
								value={bankName}
								onChangeText={handleBankSearch}
								placeholder="Start typing your bank"
								style={styles.input}
								placeholderTextColor={COLORS.textLight}
							/>
							{showBankSuggestions && filteredBanks.length > 0 && (
								<View style={styles.suggestions}>
									{filteredBanks.map((item) => (
										<TouchableOpacity
											key={item.code}
											style={styles.suggestionItem}
											onPress={() => handleSelectBank(item)}
										>
											<Text style={styles.suggestionText}>{item.name}</Text>
										</TouchableOpacity>
									))}
								</View>
							)}
							{bankCode ? (
								<Text style={styles.verifiedHint}>
									<Feather name="check" size={11} color={COLORS.success} /> {bankName} selected
								</Text>
							) : null}

							<Text style={styles.label}>Account number</Text>
							<TextInput
								value={accountNumber}
								onChangeText={(v) => setAccountNumber(v.replace(/\D/g, '').slice(0, 10))}
								placeholder="0123456789"
								style={styles.input}
								keyboardType="number-pad"
								maxLength={10}
								placeholderTextColor={COLORS.textLight}
							/>

							<Text style={styles.label}>Account name</Text>
							<TextInput
								value={accountName}
								onChangeText={setAccountName}
								placeholder="We confirm this with your bank"
								style={styles.input}
								placeholderTextColor={COLORS.textLight}
							/>
							<Text style={styles.helper}>
								We check this against the bank when you save. Leave it blank and we will fill it in.
							</Text>

							<View style={styles.switchRow}>
								<View style={{ flex: 1 }}>
									<Text style={styles.switchLabel}>Primary account</Text>
									<Text style={styles.switchHint}>Used first for payouts</Text>
								</View>
								<Switch
									value={isPrimary}
									onValueChange={setIsPrimary}
									trackColor={{ false: COLORS.border, true: COLORS.primary }}
								/>
							</View>
						</ScrollView>

						<TouchableOpacity
							style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
							onPress={handleSave}
							disabled={saving}
						>
							{saving
								? <ActivityIndicator color={COLORS.textWhite} />
								: <Text style={styles.saveBtnText}>Save account</Text>}
						</TouchableOpacity>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</View>
	);
};

export default StorePaymentsScreen;

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 40 },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: COLORS.surface,
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.borderSubtle,
	},
	backBtn: { padding: 4, width: 32 },
	headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
	listContent: { padding: 16, paddingBottom: 40 },

	/* anchor summary */
	anchorCard: {
		backgroundColor: COLORS.surface,
		borderRadius: 14,
		padding: 16,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	anchorTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	anchorIcon: {
		width: 36, height: 36, borderRadius: 10,
		backgroundColor: COLORS.primaryLight,
		alignItems: 'center', justifyContent: 'center',
	},
	anchorTitle: { fontSize: 14.5, fontWeight: '700', color: COLORS.textPrimary },
	anchorSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
	anchorBody: {
		marginTop: 14, paddingTop: 14,
		borderTopWidth: 1, borderTopColor: COLORS.borderSubtle,
	},
	anchorNumber: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 1.5 },
	anchorName: { fontSize: 13.5, color: COLORS.textPrimary, fontWeight: '600', marginTop: 4 },
	anchorBank: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
	anchorCta: { fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 18, marginTop: 12 },

	/* section */
	sectionRow: {
		flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		marginTop: 28, marginBottom: 12,
	},
	sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
	sectionHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
	addBtn: {
		flexDirection: 'row', alignItems: 'center', gap: 5,
		paddingHorizontal: 12, paddingVertical: 8,
		borderRadius: 9, borderWidth: 1, borderColor: COLORS.border,
		backgroundColor: COLORS.surface,
	},
	addBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

	/* account card */
	accountCard: {
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		padding: 14,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: COLORS.borderSubtle,
	},
	accountTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	bankBadge: {
		width: 38, height: 38, borderRadius: 19,
		backgroundColor: COLORS.surfaceSubtle,
		alignItems: 'center', justifyContent: 'center',
	},
	bankBadgeText: { fontSize: 12.5, fontWeight: '800', color: COLORS.textSecondary },
	accountName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
	accountMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
	primaryPill: {
		backgroundColor: COLORS.primaryLight,
		paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
	},
	primaryPillText: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
	accountActions: {
		flexDirection: 'row', gap: 18,
		marginTop: 14, paddingTop: 12,
		borderTopWidth: 1, borderTopColor: COLORS.borderSubtle,
	},
	accountAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	accountActionText: { fontSize: 12.5, color: COLORS.textSecondary, fontWeight: '500' },

	/* empty */
	emptyState: { alignItems: 'center', paddingVertical: 34 },
	emptyTitle: { fontSize: 14.5, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 },
	emptySubtitle: {
		fontSize: 12.5, color: COLORS.textMuted, marginTop: 5,
		textAlign: 'center', paddingHorizontal: 40, lineHeight: 18,
	},

	/* modal */
	modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
	modalCard: {
		backgroundColor: COLORS.surface,
		borderTopLeftRadius: 20, borderTopRightRadius: 20,
		padding: 20, maxHeight: '88%',
	},
	modalHeader: {
		flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		marginBottom: 16,
	},
	modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
	label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginTop: 14, marginBottom: 6 },
	input: {
		backgroundColor: COLORS.background,
		borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
		paddingHorizontal: 14, paddingVertical: 13,
		fontSize: 15, color: COLORS.textPrimary,
	},
	helper: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 6, lineHeight: 16 },
	verifiedHint: { fontSize: 11.5, color: COLORS.success, marginTop: 6, fontWeight: '600' },
	suggestions: {
		marginTop: 6,
		borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
		backgroundColor: COLORS.surface, overflow: 'hidden',
	},
	suggestionItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle },
	suggestionText: { fontSize: 14, color: COLORS.textPrimary },
	switchRow: {
		flexDirection: 'row', alignItems: 'center',
		marginTop: 20, paddingTop: 16,
		borderTopWidth: 1, borderTopColor: COLORS.borderSubtle,
	},
	switchLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
	switchHint: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },
	saveBtn: {
		backgroundColor: COLORS.primary,
		borderRadius: 12, paddingVertical: 16,
		alignItems: 'center', marginTop: 18,
	},
	saveBtnDisabled: { opacity: 0.6 },
	saveBtnText: { color: COLORS.textWhite, fontSize: 15, fontWeight: '700' },
});
