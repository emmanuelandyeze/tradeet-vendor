import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { useRouter } from 'expo-router';
import React, {
	useContext,
	useEffect,
	useState,
} from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Modal,
	ToastAndroid,
	Platform,
	Alert,
	Dimensions,
} from 'react-native';
import { Paystack } from 'react-native-paystack-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PricingTable = ({ getBusinessInfo, setPayModalVisible }) => {
	const [selectedPlan, setSelectedPlan] = useState(null);
	const [calculatedPrice, setCalculatedPrice] = useState(0);
	const router = useRouter();
	const { userInfo } = useContext(AuthContext);
	const [isYearly, setIsYearly] = useState(false);
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
			name: 'Starter',
			monthlyPrice: 0,
			annualPrice: 0,
			planCode: null,
			yearlyPlanCode: null,
			features: [
				'Access to Tradeet Campus',
				'Product listings (up to 5)',
				'Basic Analytics',
				'Order Tracking',
			],
		},
		{
			name: 'Pro',
			monthlyPrice: 2500,
			annualPrice: 25000,
			planCode: 'PLN_bffghpr454a1hh9',
			yearlyPlanCode: 'PLN_ghi98m40dpy84iz',
			features: [
				'Product listings (up to 50)',
				'Create and manage discount codes',
				'Store customization options',
				'Priority listing on Tradeet Campus',
				'Standard Support',
			],
		},
		{
			name: 'Business',
			monthlyPrice: 8000,
			annualPrice: 80000,
			planCode: 'PLN_khbd9a4329iqmqc',
			yearlyPlanCode: 'PLN_2r67bk66ddafdeg',
			features: [
				'Unlimited product listings',
				'Custom domains & premium themes',
				'Advanced Analytics & Insights',
				'Automated marketing tools',
				'24/7 Priority customer support',
				'API access for integrations',
				'Subscription-Based Sales',
				'Multi-store & Branch management',
			],
		},
	];

	const handlePayNow = (plan) => {
		setSelectedPlan(plan);
		const price = isYearly ? plan.annualPrice : plan.monthlyPrice;
		setCalculatedPrice(price);

		const isTrialEligible = userInfo?.plan?.name === 'Starter' && (plan.name === 'Pro' || plan.name === 'Business');

		if (price === 0 || isTrialEligible) {
			handleOrderNow(plan, isYearly ? 12 : 1, null, isTrialEligible);
		} else {
			setPay(true);
		}
	};

	const handleOrderNow = async (plan = selectedPlan, duration = (isYearly ? 12 : 1), reference = null, isTrial = false) => {
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
				<Text style={styles.subtitle}>Choose the plan that's right for you</Text>

				{userInfo?.plan?.isTrial && (
					<View style={styles.trialNotice}>
						<Ionicons name="gift" size={18} color="#6366f1" />
						<Text style={styles.trialNoticeText}>
							You are exploring the <Text style={{ fontWeight: 'bold' }}>Business Plan</Text> for free!
							{userInfo.plan.expiryDate && ` Ends ${new Date(userInfo.plan.expiryDate).toLocaleDateString()}`}
						</Text>
					</View>
				)}

				<View style={styles.toggleContainer}>
					<TouchableOpacity
						style={[styles.toggleOption, !isYearly && styles.activeToggleOption]}
						onPress={() => setIsYearly(false)}
					>
						<Text style={[styles.toggleText, !isYearly && styles.activeToggleText]}>Monthly</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.toggleOption, isYearly && styles.activeToggleOption]}
						onPress={() => setIsYearly(true)}
					>
						<Text style={[styles.toggleText, isYearly && styles.activeToggleText]}>
							Yearly <Text style={styles.saveBadge}>-15%</Text>
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{plans.map((plan, index) => {
					const isBusiness = plan.name === 'Business';
					const price = isYearly ? plan.annualPrice : plan.monthlyPrice;

					return (
						<View key={index} style={[styles.planCard, isBusiness && styles.featuredCard]}>
							{isBusiness && (
								<LinearGradient
									colors={['#6366f1', '#4338ca']}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
									style={styles.popularBadge}
								>
									<Text style={styles.popularText}>POPULAR</Text>
								</LinearGradient>
							)}

							<Text style={styles.planName}>{plan.name}</Text>

							<View style={styles.priceContainer}>
								<Text style={styles.currencySymbol}>₦</Text>
								<Text style={styles.priceText}>{price.toLocaleString()}</Text>
								<Text style={styles.billingCycle}>/{isYearly ? 'year' : 'mo'}</Text>
							</View>

							<View style={styles.featureList}>
								{plan.features.map((feature, idx) => (
									<View key={idx} style={styles.featureRow}>
										<Ionicons name="checkmark-circle" size={18} color="#6366f1" />
										<Text style={styles.featureText}>{feature}</Text>
									</View>
								))}
							</View>

							<TouchableOpacity
								activeOpacity={0.8}
								style={[styles.selectButton, isBusiness && styles.selectButtonPrimary]}
								onPress={() => handlePayNow(plan)}
								disabled={isProcessing}
							>
								{isProcessing ? (
									<Text style={styles.selectButtonText}>Processing...</Text>
								) : (
									<Text style={[styles.selectButtonText, isBusiness && styles.selectButtonTextPrimary]}>
										{price === 0 ? 'Get Started' : (userInfo?.plan?.name === 'Starter' && (plan.name === 'Pro' || plan.name === 'Business') ? 'Start 14-Day Free Trial' : 'Upgrade Plan')}
									</Text>
								)}
							</TouchableOpacity>
						</View>
					);
				})}
				<View style={{ height: 40 }} />
			</ScrollView>

			{pay && (
				<Paystack
					paystackKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_live_9ed31e08b1843a6818e392764c8dd6ac8457ea23"}
					amount={calculatedPrice * 100}
					billingEmail={userInfo?.email}
					billingMobile={userInfo?.phone}
					plan={isYearly ? selectedPlan?.yearlyPlanCode : selectedPlan?.planCode}
					channels={['card']}
					autoStart={true}
					onCancel={() => {
						showToast('Transaction Cancelled!');
						setPay(false);
					}}
					onSuccess={async (response) => {
						if (response?.status === 'success') {
							showToast('Payment Successful!');
							await handleOrderNow(selectedPlan, isYearly ? 12 : 1, response.transactionRef?.reference || response.reference);
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
		paddingBottom: 20,
		paddingHorizontal: 20,
		alignItems: 'center',
	},
	mainTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: '#1E293B',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#64748B',
		marginBottom: 20,
	},
	toggleContainer: {
		flexDirection: 'row',
		backgroundColor: '#F1F5F9',
		padding: 4,
		borderRadius: 12,
		width: '100%',
	},
	toggleOption: {
		flex: 1,
		paddingVertical: 10,
		alignItems: 'center',
		borderRadius: 8,
	},
	activeToggleOption: {
		backgroundColor: '#fff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	toggleText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#64748B',
	},
	activeToggleText: {
		color: '#6366f1',
	},
	saveBadge: {
		color: '#10B981',
		fontSize: 12,
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	planCard: {
		backgroundColor: '#fff',
		borderRadius: 24,
		padding: 24,
		marginBottom: 20,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	featuredCard: {
		borderColor: '#6366f1',
		borderWidth: 2,
	},
	popularBadge: {
		position: 'absolute',
		top: -12,
		right: 24,
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 20,
	},
	popularText: {
		color: '#fff',
		fontSize: 10,
		fontWeight: '800',
	},
	planName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#64748B',
		textTransform: 'uppercase',
		letterSpacing: 1,
		marginBottom: 8,
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 20,
	},
	currencySymbol: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1E293B',
	},
	priceText: {
		fontSize: 32,
		fontWeight: '800',
		color: '#1E293B',
	},
	billingCycle: {
		fontSize: 14,
		color: '#64748B',
		marginLeft: 4,
	},
	featureList: {
		marginBottom: 28,
		gap: 12,
	},
	featureRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	featureText: {
		fontSize: 15,
		color: '#475569',
		flex: 1,
	},
	selectButton: {
		backgroundColor: '#F1F5F9',
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: 'center',
	},
	selectButtonPrimary: {
		backgroundColor: '#6366f1',
	},
	selectButtonText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#475569',
	},
	selectButtonTextPrimary: {
		color: '#fff',
	},
	trialNotice: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#EEF2FF',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 16,
		marginVertical: 10,
		gap: 10,
		borderWidth: 1,
		borderColor: '#C7D2FE',
	},
	trialNoticeText: {
		fontSize: 13,
		color: '#4338ca',
		flex: 1,
	},
});

export default PricingTable;
