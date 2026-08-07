import React, { useContext, useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	ActivityIndicator,
	Alert,
	Share,
	RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, Feather } from '@expo/vector-icons';
import Clipboard from '@react-native-clipboard/clipboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { COLORS } from '@/constants/theme';

/**
 * Money, in one place — the merchant's own bank account that customers pay into, what has
 * landed in it, and the settings behind it.
 *
 * A top-level tab rather than a settings page: receiving money is a daily job, not a thing you
 * configure once. Onboarding lives here too because there is nothing else to show until it is
 * done.
 *
 * `status` from the server is the single source of truth for what to render. Onboarding has an
 * asynchronous middle — KYC is submitted here but approved by Anchor later over a webhook — so
 * a merchant who closes the app mid-way comes back to exactly where they left off.
 */

const STATUS = {
	NOT_STARTED: 'not_started',
	CUSTOMER_CREATED: 'customer_created',
	KYC_PENDING: 'kyc_pending',
	KYC_MANUAL_REVIEW: 'kyc_manual_review',
	KYC_REJECTED: 'kyc_rejected',
	KYC_ERROR: 'kyc_error',
	ACTIVE: 'active',
};

const naira = (n) =>
	`₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PaymentAccountScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { selectedStore, userInfo } = useContext(AuthContext);

	// The account belongs to the brand, not a branch — a branch id would 404 on the server.
	const storeId = selectedStore?._isBranch ? selectedStore._storeId : selectedStore?._id;

	const [form, setForm] = useState({
		firstName: '',
		lastName: '',
		email: userInfo?.email || '',
		phoneNumber: userInfo?.phone || '',
	});
	const [kyc, setKyc] = useState({ bvn: '', dateOfBirth: '', gender: '' });

	const { data: account, isLoading, refetch, isRefetching } = useQuery({
		queryKey: ['anchorAccount', storeId],
		queryFn: async () => (await axiosInstance.get(`/anchor/${storeId}`)).data.data,
		enabled: !!storeId,
		// The app-wide default is a 5 minute staleTime, which is wrong here: this record
		// changes underneath the merchant when a KYC webhook lands or an account number is
		// finally issued, and they would keep seeing the old state for five minutes.
		staleTime: 0,
		refetchOnMount: 'always',
	});

	const status = account?.status || STATUS.NOT_STARTED;
	const isActive = status === STATUS.ACTIVE;

	const { data: payments = [] } = useQuery({
		queryKey: ['anchorPayments', storeId],
		queryFn: async () => (await axiosInstance.get(`/anchor/${storeId}/payments`)).data.data,
		enabled: !!storeId && isActive,
		staleTime: 0,
	});

	// Withdrawals live in their own collection, so without this a merchant's own transfer out
	// simply never appeared anywhere in the app.
	const { data: withdrawals = [] } = useQuery({
		queryKey: ['anchorWithdrawals', storeId],
		queryFn: async () => (await axiosInstance.get(`/anchor/${storeId}/withdrawals`)).data.data,
		enabled: !!storeId && isActive,
		staleTime: 0,
	});

	// Not scoped to a store: the PIN belongs to the person. Drives whether the Manage row offers
	// to set one or to change it.
	const { data: pinStatus } = useQuery({
		queryKey: ['transactionPin'],
		queryFn: async () => (await axiosInstance.get('/anchor/security/pin')).data.data,
		staleTime: 5 * 60 * 1000,
	});

	/** Money in and money out, newest first — the five most recent. */
	const recentActivity = useMemo(() => {
		const inflow = payments.map((p) => ({
			key: `in-${p.id}`,
			direction: 'in',
			amount: p.amount,
			title: p.payerName || 'Bank transfer',
			subtitle: p.payerBank || null,
			note: p.narration || null,
			at: p.paidAt,
		}));
		const outflow = withdrawals.map((w) => ({
			key: `out-${w.id}`,
			direction: 'out',
			amount: w.amount,
			title: w.accountName || 'Withdrawal',
			subtitle: w.bankName || null,
			note: w.status === 'failed' ? (w.failureReason || 'Failed') : null,
			at: w.createdAt,
		}));
		return [...inflow, ...outflow].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5);
	}, [payments, withdrawals]);

	const onboardMutation = useMutation({
		mutationFn: async (payload) => (await axiosInstance.post(`/anchor/${storeId}/onboard`, payload)).data,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['anchorAccount', storeId] }),
		onError: (e) => Alert.alert('Could not continue', e?.response?.data?.message || 'Please try again.'),
	});

	const verifyMutation = useMutation({
		mutationFn: async (payload) => (await axiosInstance.post(`/anchor/${storeId}/verify`, payload)).data,
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['anchorAccount', storeId] });
			Alert.alert('Submitted', data?.message || 'We are verifying your details.');
		},
		onError: (e) => Alert.alert('Verification failed', e?.response?.data?.message || 'Please check your details.'),
	});

	const handleOnboard = () => {
		const { firstName, lastName, email, phoneNumber } = form;
		if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim()) {
			Alert.alert('Missing details', 'Please fill in every field.');
			return;
		}
		onboardMutation.mutate({
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			email: email.trim(),
			phoneNumber: phoneNumber.trim(),
		});
	};

	const handleVerify = () => {
		if (!/^\d{11}$/.test(kyc.bvn)) {
			Alert.alert('Check your BVN', 'A BVN is exactly 11 digits.');
			return;
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(kyc.dateOfBirth)) {
			Alert.alert('Check the date', 'Use the format YYYY-MM-DD, e.g. 1994-07-11.');
			return;
		}
		if (!kyc.gender) {
			Alert.alert('Select gender', 'Please choose Male or Female.');
			return;
		}
		verifyMutation.mutate(kyc);
	};

	const copyNumber = () => {
		if (!account?.accountNumber) return;
		Clipboard.setString(account.accountNumber);
		Alert.alert('Copied', 'Account number copied.');
	};

	/**
	 * Built line by line and filtered, so a field we do not have is omitted rather than
	 * printed as "null" — this text gets pasted straight to a customer.
	 *
	 * The business name is the greeting, never a substitute for the account name: the account
	 * name is what the customer's banking app will show them, and a mismatch reads as fraud.
	 */
	const shareDetails = () => {
		if (!account?.accountNumber) return;
		const businessName = selectedStore?.name || 'us';
		const lines = [
			`Account Number: ${account.accountNumber}`,
			account.accountName ? `Account Name: ${account.accountName}` : null,
			account.bankName ? `Bank: ${account.bankName}` : null,
		].filter(Boolean);

		Share.share({
			message: `Payment details for ${businessName}:\n\n${lines.join('\n')}`,
		});
	};

	/* ---------------- states ---------------- */

	// Top-level tab, so no back button — and the branch name matters here, since the account
	// belongs to the brand while the merchant may be looking at one of several branches.
	const Header = () => (
		<View style={styles.header}>
			<View>
				<Text style={styles.headerTitle}>Payments</Text>
				<Text style={styles.headerSubtitle}>{selectedStore?.name || 'Your business'}</Text>
			</View>
		</View>
	);

	if (isLoading) {
		return (
			<View style={styles.container}>
				<StatusBar style="dark" />
				<Header />
				<View style={styles.centered}>
					<ActivityIndicator size="large" color={COLORS.primary} />
				</View>
			</View>
		);
	}

	const renderBody = () => {
		// ---- Active: the payoff ----
		if (isActive) {
			return (
				<>
					<View style={styles.accountCard}>
						<Text style={styles.accountCardLabel}>YOUR ACCOUNT NUMBER</Text>
						<Text style={styles.accountNumber}>{account.accountNumber}</Text>
						<Text style={styles.accountMeta}>{account.accountName}</Text>
						<Text style={styles.accountMetaMuted}>{account.bankName}</Text>

						<View style={styles.accountActions}>
							<TouchableOpacity style={styles.accountAction} onPress={copyNumber}>
								<Feather name="copy" size={16} color={COLORS.primary} />
								<Text style={styles.accountActionText}>Copy</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.accountAction} onPress={shareDetails}>
								<Feather name="share-2" size={16} color={COLORS.primary} />
								<Text style={styles.accountActionText}>Share</Text>
							</TouchableOpacity>
						</View>
					</View>

					<View style={styles.balanceRow}>
						<View>
							<Text style={styles.balanceLabel}>Available balance</Text>
							<Text style={styles.balanceValue}>{naira(account.availableBalance)}</Text>
						</View>
						<TouchableOpacity
							style={[styles.withdrawBtn, !account.availableBalance && styles.btnDisabled]}
							onPress={() => router.push('/(app)/withdraw')}
							disabled={!account.availableBalance}
						>
							<Feather name="arrow-up-right" size={15} color={COLORS.textWhite} />
							<Text style={styles.withdrawBtnText}>Withdraw</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.activityHeader}>
						<Text style={styles.sectionTitle}>Recent activity</Text>
						{recentActivity.length > 0 && (
							<TouchableOpacity onPress={() => router.push('/(app)/payment-history')}>
								<Text style={styles.seeAll}>See all</Text>
							</TouchableOpacity>
						)}
					</View>

					{recentActivity.length === 0 ? (
						<View style={styles.emptyBox}>
							<Feather name="inbox" size={28} color={COLORS.textLight} />
							<Text style={styles.emptyText}>No payments yet.</Text>
							<Text style={styles.emptyHint}>
								Share your account number with a customer to receive your first transfer.
							</Text>
						</View>
					) : (
						recentActivity.map((item) => (
							<View key={item.key} style={styles.paymentRow}>
								<View style={[
									styles.paymentIcon,
									item.direction === 'out' && { backgroundColor: COLORS.surfaceSubtle },
								]}>
									<Feather
										name={item.direction === 'in' ? 'arrow-down-left' : 'arrow-up-right'}
										size={16}
										color={item.direction === 'in' ? COLORS.success : COLORS.textSecondary}
									/>
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.paymentPayer}>{item.title}</Text>
									<Text style={styles.paymentMeta}>
										{[item.subtitle, new Date(item.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })]
											.filter(Boolean).join(' · ')}
									</Text>
									{item.note ? <Text style={styles.paymentNarration}>{item.note}</Text> : null}
								</View>
								<Text style={[
									styles.paymentAmount,
									item.direction === 'out' && { color: COLORS.textPrimary },
								]}>
									{item.direction === 'in' ? '+' : '−'}{naira(item.amount)}
								</Text>
							</View>
						))
					)}
				</>
			);
		}

		// ---- Waiting on Anchor ----
		if (status === STATUS.KYC_PENDING || status === STATUS.KYC_MANUAL_REVIEW) {
			const inReview = status === STATUS.KYC_MANUAL_REVIEW;
			return (
				<View style={styles.stateBox}>
					<View style={[styles.stateIcon, { backgroundColor: COLORS.warningBg }]}>
						<Feather name="clock" size={28} color={COLORS.warning} />
					</View>
					<Text style={styles.stateTitle}>
						{inReview ? 'Being reviewed' : 'Verifying your details'}
					</Text>
					<Text style={styles.stateBody}>
						{inReview
							? 'Your details need a manual check. This usually takes a few hours — we will notify you as soon as your account is ready.'
							: 'This usually takes a few minutes. You can close the app; we will notify you when your account number is ready.'}
					</Text>
					<TouchableOpacity style={styles.secondaryBtn} onPress={() => refetch()}>
						<Text style={styles.secondaryBtnText}>Check again</Text>
					</TouchableOpacity>
				</View>
			);
		}

		// ---- Rejected / errored: recoverable ----
		if (status === STATUS.KYC_REJECTED || status === STATUS.KYC_ERROR) {
			return (
				<View style={styles.stateBox}>
					<View style={[styles.stateIcon, { backgroundColor: COLORS.dangerBg }]}>
						<Feather name="alert-circle" size={28} color={COLORS.danger} />
					</View>
					<Text style={styles.stateTitle}>We could not verify you</Text>
					<Text style={styles.stateBody}>
						{account?.statusMessage
							|| 'Your details did not match your BVN records. Check the spelling of your name and try again.'}
					</Text>
					<Text style={styles.stateHint}>
						Your name and phone number must match exactly what your bank has on your BVN.
					</Text>
					{renderKycForm()}
				</View>
			);
		}

		// ---- Step 2: BVN ----
		if (status === STATUS.CUSTOMER_CREATED) return renderKycForm();

		// ---- Step 1: intro + identity ----
		return (
			<>
				<View style={styles.introCard}>
					<View style={styles.introIcon}>
						<Ionicons name="business-outline" size={26} color={COLORS.primary} />
					</View>
					<Text style={styles.introTitle}>Get an account number for your business</Text>
					<Text style={styles.introBody}>
						Customers pay straight into it by bank transfer, and the payment shows up here
						automatically. The money is yours — Tradeet never holds it.
					</Text>
				</View>

				<Text style={styles.formLabel}>Your legal first name</Text>
				<TextInput
					style={styles.input}
					value={form.firstName}
					onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
					placeholder="As it appears on your BVN"
					placeholderTextColor={COLORS.textLight}
				/>

				<Text style={styles.formLabel}>Your legal last name</Text>
				<TextInput
					style={styles.input}
					value={form.lastName}
					onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
					placeholder="As it appears on your BVN"
					placeholderTextColor={COLORS.textLight}
				/>

				<Text style={styles.formLabel}>Email</Text>
				<TextInput
					style={styles.input}
					value={form.email}
					onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
					autoCapitalize="none"
					keyboardType="email-address"
					placeholder="you@example.com"
					placeholderTextColor={COLORS.textLight}
				/>

				<Text style={styles.formLabel}>Phone number</Text>
				<TextInput
					style={styles.input}
					value={form.phoneNumber}
					onChangeText={(v) => setForm((f) => ({ ...f, phoneNumber: v }))}
					keyboardType="phone-pad"
					placeholder="08012345678"
					placeholderTextColor={COLORS.textLight}
				/>
				<Text style={styles.fieldHint}>Use the phone number registered with your BVN.</Text>

				<TouchableOpacity
					style={[styles.primaryBtn, onboardMutation.isPending && styles.btnDisabled]}
					onPress={handleOnboard}
					disabled={onboardMutation.isPending}
				>
					{onboardMutation.isPending
						? <ActivityIndicator color="#fff" />
						: <Text style={styles.primaryBtnText}>Continue</Text>}
				</TouchableOpacity>
			</>
		);
	};

	function renderKycForm() {
		return (
			<View style={{ width: '100%' }}>
				<Text style={[styles.sectionTitle, { marginTop: 8 }]}>Verify your identity</Text>
				<Text style={styles.introBody}>
					Your bank requires this before an account can be opened in your name. We never store
					your BVN.
				</Text>

				<Text style={styles.formLabel}>BVN</Text>
				<TextInput
					style={styles.input}
					value={kyc.bvn}
					onChangeText={(v) => setKyc((k) => ({ ...k, bvn: v.replace(/\D/g, '').slice(0, 11) }))}
					keyboardType="number-pad"
					maxLength={11}
					placeholder="11 digits"
					placeholderTextColor={COLORS.textLight}
				/>
				<Text style={styles.fieldHint}>Dial *565*0# on your registered line to see your BVN.</Text>

				<Text style={styles.formLabel}>Date of birth</Text>
				<TextInput
					style={styles.input}
					value={kyc.dateOfBirth}
					onChangeText={(v) => setKyc((k) => ({ ...k, dateOfBirth: v }))}
					placeholder="YYYY-MM-DD"
					placeholderTextColor={COLORS.textLight}
				/>

				<Text style={styles.formLabel}>Gender</Text>
				<View style={styles.genderRow}>
					{['Male', 'Female'].map((g) => (
						<TouchableOpacity
							key={g}
							style={[styles.genderOption, kyc.gender === g && styles.genderOptionActive]}
							onPress={() => setKyc((k) => ({ ...k, gender: g }))}
						>
							<Text style={[styles.genderText, kyc.gender === g && styles.genderTextActive]}>{g}</Text>
						</TouchableOpacity>
					))}
				</View>

				<TouchableOpacity
					style={[styles.primaryBtn, verifyMutation.isPending && styles.btnDisabled]}
					onPress={handleVerify}
					disabled={verifyMutation.isPending}
				>
					{verifyMutation.isPending
						? <ActivityIndicator color="#fff" />
						: <Text style={styles.primaryBtnText}>Verify and create account</Text>}
				</TouchableOpacity>
			</View>
		);
	}

	/**
	 * Everything else that is about money, so a merchant never has to hunt through Settings.
	 * Shown in every state — the bank details on invoices are useful long before the Anchor
	 * account exists.
	 */
	const ManageLinks = () => (
		<>
			<Text style={styles.sectionTitle}>Manage</Text>
			{[
				{
					icon: 'card-outline',
					title: 'Bank details on invoices',
					subtitle: 'Shown on the invoices and receipts you send',
					to: '/(app)/payment-info',
				},
				{
					icon: 'receipt-outline',
					title: 'Invoices',
					subtitle: 'Everything you have billed',
					to: '/(app)/invoices',
				},
				{
					icon: 'cash-outline',
					title: 'Sales',
					subtitle: 'Money you have recorded',
					to: '/(app)/sales',
				},
				{
					icon: 'people-outline',
					title: 'Debtors',
					subtitle: 'Who still owes you',
					to: '/(app)/debtors',
				},
				{
					icon: 'lock-closed-outline',
					title: 'Transaction PIN',
					subtitle: pinStatus?.isSet
						? 'Change the PIN you enter before withdrawing'
						: 'Set a PIN so signing in alone cannot move your money',
					to: pinStatus?.isSet ? '/(app)/transaction-pin?change=1' : '/(app)/transaction-pin',
				},
			].map((row) => (
				<TouchableOpacity key={row.to} style={styles.linkRow} onPress={() => router.push(row.to)}>
					<View style={styles.linkIcon}>
						<Ionicons name={row.icon} size={18} color={COLORS.primary} />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.linkTitle}>{row.title}</Text>
						<Text style={styles.linkSubtitle}>{row.subtitle}</Text>
					</View>
					<Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
				</TouchableOpacity>
			))}
		</>
	);

	return (
		<View style={styles.container}>
			<StatusBar style="dark" />
			<Header />
			<ScrollView
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
				}
			>
				{renderBody()}
				<ManageLinks />
			</ScrollView>

		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 40 },
	centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
	headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
	headerSubtitle: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 2 },
	content: { padding: 16, paddingBottom: 48 },

	linkRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		padding: 14,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: COLORS.borderSubtle,
	},
	linkIcon: {
		width: 36, height: 36, borderRadius: 10,
		backgroundColor: COLORS.primaryLight,
		alignItems: 'center', justifyContent: 'center',
	},
	linkTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
	linkSubtitle: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },

	introCard: {
		backgroundColor: COLORS.surface,
		borderRadius: 14,
		padding: 18,
		marginBottom: 22,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	introIcon: {
		width: 46, height: 46, borderRadius: 12,
		backgroundColor: COLORS.primaryLight,
		alignItems: 'center', justifyContent: 'center',
		marginBottom: 12,
	},
	introTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
	introBody: { fontSize: 13.5, color: COLORS.textSecondary, lineHeight: 20 },

	formLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 14 },
	input: {
		backgroundColor: COLORS.surface,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 13,
		fontSize: 15,
		color: COLORS.textPrimary,
	},
	fieldHint: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 6, lineHeight: 16 },

	genderRow: { flexDirection: 'row', gap: 10 },
	genderOption: {
		flex: 1,
		paddingVertical: 13,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: COLORS.border,
		backgroundColor: COLORS.surface,
		alignItems: 'center',
	},
	genderOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
	genderText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
	genderTextActive: { color: COLORS.primary, fontWeight: '700' },

	primaryBtn: {
		backgroundColor: COLORS.primary,
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
		marginTop: 24,
	},
	primaryBtnText: { color: COLORS.textWhite, fontSize: 15, fontWeight: '700' },
	btnDisabled: { opacity: 0.6 },
	secondaryBtn: {
		marginTop: 18,
		paddingVertical: 12,
		paddingHorizontal: 22,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	secondaryBtnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 },

	/* active */
	accountCard: {
		backgroundColor: COLORS.primary,
		borderRadius: 16,
		padding: 22,
		alignItems: 'center',
	},
	accountCardLabel: {
		fontSize: 10.5, fontWeight: '700', letterSpacing: 1.1,
		color: 'rgba(255,255,255,0.75)', marginBottom: 10,
	},
	accountNumber: {
		fontSize: 34, fontWeight: '800', color: COLORS.textWhite, letterSpacing: 2.5,
	},
	accountMeta: { fontSize: 14.5, color: COLORS.textWhite, fontWeight: '600', marginTop: 10 },
	accountMetaMuted: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
	accountActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
	accountAction: {
		flexDirection: 'row', alignItems: 'center', gap: 7,
		backgroundColor: COLORS.surface,
		paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
	},
	accountActionText: { color: COLORS.primary, fontWeight: '700', fontSize: 13.5 },

	balanceRow: {
		flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
		backgroundColor: COLORS.surface,
		borderRadius: 12, padding: 16, marginTop: 16,
		borderWidth: 1, borderColor: COLORS.border,
	},
	balanceLabel: { fontSize: 13.5, color: COLORS.textSecondary },
	balanceValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

	withdrawBtn: {
		flexDirection: 'row', alignItems: 'center', gap: 6,
		backgroundColor: COLORS.primary,
		paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
	},
	withdrawBtnText: { color: COLORS.textWhite, fontWeight: '700', fontSize: 13.5 },

	activityHeader: {
		flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		marginTop: 26, marginBottom: 12,
	},
	seeAll: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
	sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
	paymentRow: {
		flexDirection: 'row', alignItems: 'center', gap: 12,
		backgroundColor: COLORS.surface,
		borderRadius: 12, padding: 14, marginBottom: 10,
		borderWidth: 1, borderColor: COLORS.borderSubtle,
	},
	paymentIcon: {
		width: 34, height: 34, borderRadius: 17,
		backgroundColor: COLORS.successBg,
		alignItems: 'center', justifyContent: 'center',
	},
	paymentPayer: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
	paymentMeta: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },
	paymentNarration: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 3, fontStyle: 'italic' },
	paymentAmount: { fontSize: 14.5, fontWeight: '700', color: COLORS.success },

	emptyBox: { alignItems: 'center', paddingVertical: 34 },
	emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 10, fontWeight: '600' },
	emptyHint: { fontSize: 12.5, color: COLORS.textMuted, marginTop: 5, textAlign: 'center', paddingHorizontal: 30, lineHeight: 18 },

	stateBox: { alignItems: 'center', paddingTop: 26 },
	stateIcon: {
		width: 62, height: 62, borderRadius: 31,
		alignItems: 'center', justifyContent: 'center', marginBottom: 16,
	},
	stateTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
	stateBody: { fontSize: 13.5, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
	stateHint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 10, paddingHorizontal: 18, lineHeight: 17 },
});
