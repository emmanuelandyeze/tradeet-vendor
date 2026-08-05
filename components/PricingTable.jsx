import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { useRouter } from 'expo-router';
import React, {
	useContext,
	useState,
} from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	ToastAndroid,
	Platform,
	Alert,
	Dimensions,
} from 'react-native';
import { Paystack } from 'react-native-paystack-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const BILLING_OPTIONS = {
	weekly: {
		id: 'weekly',
		label: 'Weekly',
		suffix: '/wk',
		note: 'Matches market cash cycles',
		duration: 'weekly',
	},
	monthly: {
		id: 'monthly',
		label: 'Monthly',
		suffix: '/mo',
		note: null,
		duration: 1,
	},
	yearly: {
		id: 'yearly',
		label: 'Yearly',
		suffix: '/yr',
		note: '2 months free (-15%)',
		duration: 12,
	},
};

const PricingTable = ({ getBusinessInfo, setPayModalVisible }) => {
	const [selectedPlan, setSelectedPlan] = useState(null);
	const [calculatedPrice, setCalculatedPrice] = useState(0);
	const router = useRouter();
	const { userInfo } = useContext(AuthContext);
	const [billing, setBilling] = useState('monthly');
	const [isProcessing, setIsProcessing] = useState(false);
	const [pay, setPay] = useState(false);

	const showToast = (message) => {
		if (Platform.OS === 'android') {
			ToastAndroid.show(message, ToastAndroid.LONG);
		} else {
			Alert.alert('Status', message);
		}
	};

	const plans = [
		{
			id: 'free',
			name: 'Free',
			tagline: 'Your books, at no cost. Forever.',
			price: { weekly: 0, monthly: 0, yearly: 0 },
			planCode: null,
			yearlyPlanCode: null,
			highlight: false,
			features: [
				{ text: 'Unlimited sales, expenses & invoices', strong: true },
				{ text: 'Text and voice notes' },
				{ text: 'Running balance after every entry' },
				{ text: 'PDF receipts and invoices' },
				{ text: 'Documents carry a "Made with Tradeet" mark', muted: true },
			],
		},
		{
			id: 'pro',
			name: 'Pro',
			tagline: 'For businesses that send documents to customers.',
			price: { weekly: 1000, monthly: 3500, yearly: 35000 },
			planCode: 'PLN_bffghpr454a1hh9',
			yearlyPlanCode: 'PLN_ghi98m40dpy84iz',
			highlight: true,
			features: [
				{ text: 'Everything in Free, unlimited', strong: true },
				{ text: 'Clean, unbranded invoices & receipts', strong: true },
				{ text: 'Full web dashboard' },
				{ text: 'Monthly statement PDF' },
				{ text: 'Customer records' },
				{ text: 'Your logo & bank details on every document' },
			],
		},
		{
			id: 'business',
			name: 'Business',
			tagline: 'For businesses with staff or more than one location.',
			price: { weekly: 2500, monthly: 9000, yearly: 90000 },
			planCode: 'PLN_khbd9a4329iqmqc',
			yearlyPlanCode: 'PLN_2r67bk66ddafdeg',
			highlight: false,
			features: [
				{ text: 'Everything in Pro', strong: true },
				{ text: 'Multiple branches & store management', strong: true },
				{ text: 'Priority WhatsApp support' },
				{ text: 'Custom domains & premium themes' },
				{ text: 'Staff logging to one ledger', soon: true },
				{ text: 'Bank reconciliation', soon: true },
			],
		},
	];

	const currentPlanName = userInfo?.plan?.name || 'Free';

	const handlePayNow = (plan) => {
		setSelectedPlan(plan);
		const price = plan.price[billing];
		setCalculatedPrice(price);

		const isFreeOrStarter = currentPlanName === 'Free' || currentPlanName === 'Starter';
		const isTrialEligible = isFreeOrStarter && (plan.name === 'Pro' || plan.name === 'Business') && !userInfo?.plan?.isTrial;

		const duration = BILLING_OPTIONS[billing].duration;

		if (price === 0 || isTrialEligible) {
			handleOrderNow(plan, duration, null, isTrialEligible);
		} else {
			setPay(true);
		}
	};

	const handleOrderNow = async (plan = selectedPlan, duration = BILLING_OPTIONS[billing].duration, reference = null, isTrial = false) => {
		try {
			setIsProcessing(true);
			const payload = {
				planName: plan.name,
				planType: duration,
				isTrial,
			};
			if (reference) {
				payload.reference = reference;
			}

			console.log('[SUBSCRIPTION UPDATE] Sending payload:', payload);
			const response = await axiosInstance.put(`/auth/subscription`, payload);
			console.log('[SUBSCRIPTION UPDATE] Server response:', response.data);

			if (getBusinessInfo) {
				console.log('[SUBSCRIPTION UPDATE] Refreshing user info...');
				await getBusinessInfo();
				console.log('[SUBSCRIPTION UPDATE] User info refreshed');
			}

			if (setPayModalVisible) setPayModalVisible(false);
			showToast(`Welcome to the ${plan.name} plan!`);
		} catch (error) {
			const errorMsg = error.response?.data?.message || 'Failed to update subscription.';
			console.log('[SUBSCRIPTION ERROR]:', error.response?.data || error.message);
			showToast(errorMsg);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.headerSection}>
				<Text style={styles.mainTitle}>Upgrade Your Business</Text>
				<Text style={styles.subtitle}>Pay only if you want our name off your paperwork</Text>

				{userInfo?.plan?.isTrial && (
					<View style={styles.trialNotice}>
						<Ionicons name="gift-outline" size={18} color="#065637" />
						<Text style={styles.trialNoticeText}>
							You are exploring the <Text style={{ fontWeight: '700' }}>Business Plan</Text> free trial!
							{userInfo.plan.expiryDate && ` Ends ${new Date(userInfo.plan.expiryDate).toLocaleDateString()}`}
						</Text>
					</View>
				)}

				<View style={styles.toggleContainer}>
					{Object.entries(BILLING_OPTIONS).map(([key, cfg]) => {
						const active = billing === key;
						return (
							<TouchableOpacity
								key={key}
								style={[styles.toggleOption, active && styles.activeToggleOption]}
								onPress={() => setBilling(key)}
								activeOpacity={0.8}
							>
								<Text style={[styles.toggleText, active && styles.activeToggleText]}>
									{cfg.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				{BILLING_OPTIONS[billing].note ? (
					<Text style={styles.billingNote}>{BILLING_OPTIONS[billing].note}</Text>
				) : (
					<View style={{ height: 18 }} />
				)}
			</View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{plans.map((plan) => {
					const isCurrent = (currentPlanName === plan.name) || (plan.name === 'Free' && currentPlanName === 'Starter');
					const price = plan.price[billing];
					const isPro = plan.id === 'pro';

					return (
						<View key={plan.id} style={[styles.planCard, isPro && styles.featuredCard]}>
							{isPro && (
								<LinearGradient
									colors={['#065637', '#0B7A4F']}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									style={styles.popularBadge}
								>
									<Text style={styles.popularText}>MOST POPULAR</Text>
								</LinearGradient>
							)}

							{isCurrent && (
								<View style={styles.currentBadge}>
									<Ionicons name="checkmark-circle" size={12} color="#065637" />
									<Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
								</View>
							)}

							<Text style={styles.planName}>{plan.name}</Text>
							<Text style={styles.tagline}>{plan.tagline}</Text>

							<View style={styles.priceContainer}>
								<Text style={styles.currencySymbol}>₦</Text>
								<Text style={styles.priceText}>{price.toLocaleString()}</Text>
								{price > 0 && (
									<Text style={styles.billingCycle}>{BILLING_OPTIONS[billing].suffix}</Text>
								)}
							</View>

							<View style={styles.featureList}>
								{plan.features.map((f, idx) => (
									<View key={idx} style={styles.featureRow}>
										{f.soon ? (
											<Ionicons name="time-outline" size={16} color="#9CA3AF" />
										) : f.muted ? (
											<Ionicons name="remove-outline" size={16} color="#9CA3AF" />
										) : (
											<Ionicons name="checkmark-circle" size={18} color="#065637" />
										)}
										<Text
											style={[
												styles.featureText,
												f.strong && styles.featureTextStrong,
												(f.muted || f.soon) && styles.featureTextMuted,
											]}
										>
											{f.text}
											{f.soon && <Text style={styles.soonTag}> (Coming Soon)</Text>}
										</Text>
									</View>
								))}
							</View>

							<TouchableOpacity
								activeOpacity={0.8}
								style={[
									styles.selectButton,
									isPro && styles.selectButtonPrimary,
									isCurrent && styles.selectButtonCurrent,
								]}
								onPress={() => handlePayNow(plan)}
								disabled={isProcessing || isCurrent}
							>
								{isProcessing ? (
									<Text style={styles.selectButtonText}>Processing...</Text>
								) : isCurrent ? (
									<Text style={styles.selectButtonTextCurrent}>Active Plan</Text>
								) : (
									<Text
										style={[
											styles.selectButtonText,
											isPro && styles.selectButtonTextPrimary,
										]}
									>
										{price === 0
											? 'Select Free'
											: ((currentPlanName === 'Free' || currentPlanName === 'Starter') && !userInfo?.plan?.isTrial
												? 'Start 14-Day Free Trial'
												: `Upgrade to ${plan.name}`)}
									</Text>
								)}
							</TouchableOpacity>
						</View>
					);
				})}
				<View style={{ height: 40 }} />
			</ScrollView>

			{pay && selectedPlan && (
				<Paystack
					paystackKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_live_9ed31e08b1843a6818e392764c8dd6ac8457ea23"}
					amount={calculatedPrice * 100}
					billingEmail={userInfo?.email}
					billingMobile={userInfo?.phone}
					plan={billing === 'yearly' ? selectedPlan?.yearlyPlanCode : (billing === 'monthly' ? selectedPlan?.planCode : undefined)}
					channels={['card']}
					autoStart={true}
					onCancel={() => {
						showToast('Transaction Cancelled!');
						setPay(false);
					}}
					onSuccess={async (response) => {
						if (response?.status === 'success') {
							showToast('Payment Successful!');
							await handleOrderNow(
								selectedPlan,
								BILLING_OPTIONS[billing].duration,
								response.transactionRef?.reference || response.reference
							);
						}
						setPay(false);
					}}
					onError={(error) => {
						showToast('Payment failed. Please try again.');
						console.error('Paystack Error:', error);
						setPay(false);
					}}
				/>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	headerSection: {
		paddingTop: 10,
		paddingBottom: 16,
		paddingHorizontal: 20,
		alignItems: 'center',
	},
	mainTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: '#1E293B',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 13,
		color: '#64748B',
		marginBottom: 16,
		textAlign: 'center',
	},
	toggleContainer: {
		flexDirection: 'row',
		backgroundColor: '#E2E8F0',
		padding: 3,
		borderRadius: 12,
		width: '100%',
	},
	toggleOption: {
		flex: 1,
		paddingVertical: 8,
		alignItems: 'center',
		borderRadius: 9,
	},
	activeToggleOption: {
		backgroundColor: '#FFFFFF',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	toggleText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#64748B',
	},
	activeToggleText: {
		color: '#065637',
		fontWeight: '700',
	},
	billingNote: {
		marginTop: 8,
		fontSize: 12,
		fontWeight: '600',
		color: '#065637',
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	planCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 20,
		marginBottom: 18,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		position: 'relative',
	},
	featuredCard: {
		borderColor: '#065637',
		borderWidth: 2,
	},
	popularBadge: {
		position: 'absolute',
		top: -12,
		right: 20,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 16,
	},
	popularText: {
		color: '#FFFFFF',
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 0.5,
	},
	currentBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		alignSelf: 'flex-start',
		backgroundColor: '#E6F4EA',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
		marginBottom: 8,
	},
	currentBadgeText: {
		color: '#065637',
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 0.5,
	},
	planName: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0F172A',
		marginBottom: 2,
	},
	tagline: {
		fontSize: 13,
		color: '#64748B',
		marginBottom: 12,
		lineHeight: 18,
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 16,
	},
	currencySymbol: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0F172A',
	},
	priceText: {
		fontSize: 30,
		fontWeight: '800',
		color: '#0F172A',
	},
	billingCycle: {
		fontSize: 13,
		color: '#64748B',
		marginLeft: 4,
		fontWeight: '500',
	},
	featureList: {
		marginBottom: 20,
		gap: 10,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
		paddingTop: 16,
	},
	featureRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	featureText: {
		fontSize: 13,
		color: '#475569',
		flex: 1,
		lineHeight: 18,
	},
	featureTextStrong: {
		fontWeight: '600',
		color: '#0F172A',
	},
	featureTextMuted: {
		color: '#94A3B8',
	},
	soonTag: {
		fontSize: 11,
		color: '#94A3B8',
		fontStyle: 'italic',
	},
	selectButton: {
		backgroundColor: '#F1F5F9',
		paddingVertical: 12,
		borderRadius: 12,
		alignItems: 'center',
	},
	selectButtonPrimary: {
		backgroundColor: '#065637',
	},
	selectButtonCurrent: {
		backgroundColor: '#F1F5F9',
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	selectButtonText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#334155',
	},
	selectButtonTextPrimary: {
		color: '#FFFFFF',
	},
	selectButtonTextCurrent: {
		fontSize: 14,
		fontWeight: '700',
		color: '#94A3B8',
	},
	trialNotice: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F4EA',
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 12,
		marginBottom: 12,
		gap: 8,
		borderWidth: 1,
		borderColor: '#A7F3D0',
	},
	trialNoticeText: {
		fontSize: 12,
		color: '#065637',
		flex: 1,
	},
});

export default PricingTable;
