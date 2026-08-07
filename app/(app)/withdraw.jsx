import React, { useContext, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { COLORS } from '@/constants/theme';
import PinPad from '@/components/PinPad';

/**
 * Moving money out, on its own screen.
 *
 * Was a bottom sheet, which was the wrong shape for it: the flow has three inputs, a searchable
 * bank list and a confirmation step, and all of that fighting for room above a keyboard in a
 * half-height sheet. A withdrawal is also a deliberate, occasional act rather than a quick
 * toggle — a screen you navigate to suits it better than something you dismiss by tapping away.
 */

const naira = (n) =>
	`₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WithdrawScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { selectedStore } = useContext(AuthContext);

	const storeId = selectedStore?._isBranch ? selectedStore._storeId : selectedStore?._id;

	const [amount, setAmount] = useState('');
	const [bank, setBank] = useState({ name: '', code: '' });
	const [accountNumber, setAccountNumber] = useState('');
	const [resolvedName, setResolvedName] = useState(null);
	const [resolving, setResolving] = useState(false);
	const [bankPickerOpen, setBankPickerOpen] = useState(false);
	const [bankQuery, setBankQuery] = useState('');
	const [pinOpen, setPinOpen] = useState(false);
	const [pinError, setPinError] = useState(null);

	// Whether this merchant has a transaction PIN at all. Cached across screens under a
	// user-level key, since the PIN belongs to the person rather than the store.
	const { data: pinStatus } = useQuery({
		queryKey: ['transactionPin'],
		queryFn: async () => (await axiosInstance.get('/anchor/security/pin')).data.data,
		staleTime: 5 * 60 * 1000,
	});

	// Shares the Payments tab's cache entry, so the balance shown here is the same one the
	// merchant just looked at.
	const { data: account } = useQuery({
		queryKey: ['anchorAccount', storeId],
		queryFn: async () => (await axiosInstance.get(`/anchor/${storeId}`)).data.data,
		enabled: !!storeId,
		staleTime: 0,
	});

	const { data: banks = [], isLoading: banksLoading } = useQuery({
		queryKey: ['anchorBanks', storeId],
		queryFn: async () => (await axiosInstance.get(`/anchor/${storeId}/banks`)).data.data,
		enabled: !!storeId,
		staleTime: 24 * 60 * 60 * 1000,
	});

	const balance = account?.availableBalance || 0;
	const value = Number(amount);
	const exceedsBalance = Number.isFinite(value) && value > balance;

	/**
	 * Ask the bank who owns the account before any money moves. The merchant reading an
	 * unexpected name is what catches a mistyped digit.
	 */
	const resolveDestination = async (bankCode, number) => {
		if (!bankCode || number.length !== 10) return setResolvedName(null);
		setResolving(true);
		try {
			const res = await axiosInstance.post(`/anchor/${storeId}/resolve-account`, {
				bankCode,
				accountNumber: number,
			});
			setResolvedName(res.data?.data?.accountName || null);
		} catch (e) {
			setResolvedName(null);
			Alert.alert('Could not verify', e?.response?.data?.message || 'Check the account number and bank.');
		} finally {
			setResolving(false);
		}
	};

	const withdrawMutation = useMutation({
		mutationFn: async (payload) => (await axiosInstance.post(`/anchor/${storeId}/withdraw`, payload)).data,
		onSuccess: (data) => {
			setPinOpen(false);
			queryClient.invalidateQueries({ queryKey: ['anchorAccount', storeId] });
			queryClient.invalidateQueries({ queryKey: ['anchorPayments', storeId] });
			Alert.alert('On its way', data?.message || 'Your withdrawal has been sent.', [
				{ text: 'Done', onPress: () => router.back() },
			]);
		},
		/**
		 * A rejected PIN keeps the keypad open with the server's message on it — including the
		 * attempts-remaining count and the lockout notice, which the merchant needs to see. Any
		 * other failure is about the withdrawal, not the PIN, so the keypad closes and gets out
		 * of the way of the form they need to fix.
		 */
		onError: (e) => {
			const message = e?.response?.data?.message || 'Please try again.';
			if (e?.response?.data?.pinError) {
				setPinError({ message, id: Date.now() });
				return;
			}
			setPinOpen(false);
			Alert.alert('Withdrawal failed', message);
		},
	});

	const canWithdraw =
		!!resolvedName
		&& Number.isFinite(value)
		&& value > 0
		&& !exceedsBalance
		&& !withdrawMutation.isPending;

	/**
	 * The button no longer withdraws — it asks for the PIN, and the PIN withdraws.
	 *
	 * A merchant who has never set one is sent to do that first rather than being refused at the
	 * end: they have already filled in the whole form, and the server would reject them anyway.
	 */
	const submit = () => {
		if (!canWithdraw) return;

		if (pinStatus && !pinStatus.isSet) {
			return Alert.alert(
				'Set a transaction PIN',
				'Withdrawals need a 4-digit PIN, so that signing in on its own is not enough to move your money.',
				[
					{ text: 'Not now', style: 'cancel' },
					{ text: 'Set PIN', onPress: () => router.push('/(app)/transaction-pin') },
				],
			);
		}

		setPinError(null);
		setPinOpen(true);
	};

	const confirmWithPin = (pin) => {
		withdrawMutation.mutate({ amount: value, bankCode: bank.code, accountNumber, pin });
	};

	const filteredBanks = banks.filter((b) =>
		b.name.toLowerCase().includes(bankQuery.toLowerCase()),
	);

	return (
		<View style={styles.container}>
			<StatusBar style="dark" />

			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
					<Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Withdraw</Text>
				<View style={{ width: 32 }} />
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* The decision being made, given the weight. */}
					<View style={styles.amountBlock}>
						<View style={styles.amountRow}>
							<Text style={styles.amountCurrency}>₦</Text>
							<TextInput
								style={styles.amountInput}
								value={amount}
								onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))}
								keyboardType="decimal-pad"
								placeholder="0"
								placeholderTextColor={COLORS.textLight}
								autoFocus
							/>
						</View>
						<View style={styles.amountFooter}>
							<Text style={[styles.amountAvailable, exceedsBalance && styles.amountError]}>
								{exceedsBalance
									? `Only ${naira(balance)} available`
									: `${naira(balance)} available`}
							</Text>
							<TouchableOpacity onPress={() => setAmount(String(balance))}>
								<Text style={styles.allBtn}>Withdraw all</Text>
							</TouchableOpacity>
						</View>
					</View>

					<Text style={styles.sectionLabel}>SEND TO</Text>

					<TouchableOpacity
						style={styles.field}
						activeOpacity={0.7}
						onPress={() => { setBankPickerOpen((o) => !o); setBankQuery(''); }}
					>
						<View style={styles.fieldIcon}>
							<Ionicons name="business-outline" size={16} color={COLORS.primary} />
						</View>
						<Text style={[styles.fieldValue, !bank.name && styles.fieldPlaceholder]}>
							{bank.name || 'Choose bank'}
						</Text>
						<Feather
							name={bankPickerOpen ? 'chevron-up' : 'chevron-down'}
							size={18}
							color={COLORS.textLight}
						/>
					</TouchableOpacity>

					{bankPickerOpen && (
						<View style={styles.bankPanel}>
							<TextInput
								style={styles.bankSearch}
								value={bankQuery}
								onChangeText={setBankQuery}
								placeholder="Search banks"
								placeholderTextColor={COLORS.textLight}
								autoFocus
							/>
							<ScrollView style={styles.bankList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
								{banksLoading && <Text style={styles.bankEmpty}>Loading banks…</Text>}
								{!banksLoading && filteredBanks.length === 0 && (
									<Text style={styles.bankEmpty}>No bank matches “{bankQuery}”.</Text>
								)}
								{filteredBanks.slice(0, 60).map((b) => (
									<TouchableOpacity
										key={b.nipCode}
										style={styles.bankOption}
										onPress={() => {
											setBank({ name: b.name, code: b.nipCode });
											setBankPickerOpen(false);
											setBankQuery('');
											setResolvedName(null);
											resolveDestination(b.nipCode, accountNumber);
										}}
									>
										<Text style={styles.bankOptionText}>{b.name}</Text>
										{bank.code === b.nipCode && (
											<Feather name="check" size={16} color={COLORS.primary} />
										)}
									</TouchableOpacity>
								))}
							</ScrollView>
						</View>
					)}

					<View style={styles.field}>
						<View style={styles.fieldIcon}>
							<Feather name="hash" size={15} color={COLORS.primary} />
						</View>
						<TextInput
							style={styles.fieldInput}
							value={accountNumber}
							onChangeText={(v) => {
								const digits = v.replace(/\D/g, '').slice(0, 10);
								setAccountNumber(digits);
								setResolvedName(null);
								if (digits.length === 10) resolveDestination(bank.code, digits);
							}}
							keyboardType="number-pad"
							maxLength={10}
							placeholder="Account number"
							placeholderTextColor={COLORS.textLight}
						/>
						{resolving && <ActivityIndicator size="small" color={COLORS.primary} />}
					</View>

					{resolvedName ? (
						<View style={styles.confirmBox}>
							<View style={styles.confirmIcon}>
								<Feather name="check" size={14} color={COLORS.textWhite} />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.confirmLabel}>Money goes to</Text>
								<Text style={styles.confirmName}>{resolvedName}</Text>
							</View>
						</View>
					) : (
						<Text style={styles.confirmHint}>
							Pick a bank and enter the account number — we will show you the account name
							before anything is sent.
						</Text>
					)}
				</ScrollView>

				{/* Pinned, so the action is reachable without scrolling back down. */}
				<View style={styles.footer}>
					<TouchableOpacity
						style={[styles.primaryBtn, !canWithdraw && styles.btnDisabled]}
						onPress={submit}
						disabled={!canWithdraw}
					>
						{withdrawMutation.isPending
							? <ActivityIndicator color={COLORS.textWhite} />
							: (
								<Text style={styles.primaryBtnText}>
									{value > 0 ? `Withdraw ${naira(value)}` : 'Withdraw'}
								</Text>
							)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>

			{/* The last gate before the money moves. */}
			<PinPad
				visible={pinOpen}
				title="Enter your transaction PIN"
				subtitle={`To send ${naira(value)} to ${resolvedName || 'this account'}.`}
				error={pinError}
				busy={withdrawMutation.isPending}
				onSubmit={confirmWithPin}
				onClose={() => { setPinOpen(false); setPinError(null); }}
				onForgot={() => {
					setPinOpen(false);
					setPinError(null);
					router.push('/(app)/transaction-pin?reset=1');
				}}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 40 },
	header: {
		flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		backgroundColor: COLORS.surface,
		paddingHorizontal: 16, paddingVertical: 14,
		borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
	},
	backBtn: { padding: 4, width: 32 },
	headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
	content: { padding: 16, paddingBottom: 24 },

	amountBlock: {
		backgroundColor: COLORS.surface,
		borderRadius: 14,
		paddingHorizontal: 16, paddingVertical: 20,
		borderWidth: 1, borderColor: COLORS.border,
	},
	amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
	amountCurrency: { fontSize: 26, fontWeight: '700', color: COLORS.textMuted, marginRight: 4 },
	amountInput: {
		fontSize: 40, fontWeight: '800', color: COLORS.textPrimary,
		padding: 0, minWidth: 130, textAlign: 'center',
	},
	amountFooter: {
		flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		marginTop: 16, paddingTop: 14,
		borderTopWidth: 1, borderTopColor: COLORS.borderSubtle,
	},
	amountAvailable: { fontSize: 12.5, color: COLORS.textMuted },
	amountError: { color: COLORS.danger, fontWeight: '600' },
	allBtn: { fontSize: 12.5, fontWeight: '700', color: COLORS.primary },

	sectionLabel: {
		fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
		letterSpacing: 0.9, marginTop: 28, marginBottom: 10,
	},
	field: {
		flexDirection: 'row', alignItems: 'center', gap: 12,
		backgroundColor: COLORS.surface,
		borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
		paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10,
	},
	fieldIcon: {
		width: 30, height: 30, borderRadius: 9,
		backgroundColor: COLORS.primaryLight,
		alignItems: 'center', justifyContent: 'center',
	},
	fieldValue: { flex: 1, fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
	fieldPlaceholder: { color: COLORS.textLight, fontWeight: '400' },
	fieldInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary, padding: 0 },

	bankPanel: {
		borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
		backgroundColor: COLORS.surface, marginBottom: 10, overflow: 'hidden',
	},
	bankSearch: {
		paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.textPrimary,
		borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
	},
	bankList: { maxHeight: 260 },
	bankOption: {
		flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		paddingHorizontal: 14, paddingVertical: 13,
		borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
	},
	bankOptionText: { fontSize: 14, color: COLORS.textPrimary },
	bankEmpty: { padding: 16, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

	confirmBox: {
		flexDirection: 'row', alignItems: 'center', gap: 12,
		backgroundColor: COLORS.successBg, borderRadius: 12, padding: 14, marginTop: 4,
	},
	confirmIcon: {
		width: 26, height: 26, borderRadius: 13,
		backgroundColor: COLORS.success,
		alignItems: 'center', justifyContent: 'center',
	},
	confirmLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
	confirmName: { fontSize: 15.5, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
	confirmHint: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, paddingHorizontal: 2, marginTop: 2 },

	footer: {
		padding: 16, paddingBottom: 28,
		backgroundColor: COLORS.surface,
		borderTopWidth: 1, borderTopColor: COLORS.borderSubtle,
	},
	primaryBtn: {
		backgroundColor: COLORS.primary,
		borderRadius: 12, paddingVertical: 16, alignItems: 'center',
	},
	primaryBtnText: { color: COLORS.textWhite, fontSize: 15, fontWeight: '700' },
	btnDisabled: { opacity: 0.5 },
});
