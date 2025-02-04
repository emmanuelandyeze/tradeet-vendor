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
} from 'react-native';
import { Paystack } from 'react-native-paystack-webview';

const PricingTable = ({getBusinessInfo, setPayModalVisible}) => {
	const [selectedPlan, setSelectedPlan] = useState(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [calculatedPrice, setCalculatedPrice] = useState(0);
	const router = useRouter();
	const { userInfo, sendPushNotification } =
		useContext(AuthContext);
	const [pay, setPay] = useState(false);
    const [businessData, setBusinessData] = useState(null);
    const [planDuration, setPlanDuration] = useState(null);

	// Function to get user information
	const getStoreInfo = async () => {
		try {
			const response = await axiosInstance.get(
				`/businesses/b/${userInfo?._id}`,
			);
			// console.log('User info response:', response.data);
			setBusinessData(response.data.business); // Update the user state with fetched data
		} catch (error) {
			console.error(
				'Failed to fetch business info:',
				error.response?.data || error,
			);
			throw error; // Propagate error for handling in the UI
		}
	};

	useEffect(() => {
		getStoreInfo();
	}, []);

	const plans = [
		{
			name: 'Economy',
			monthlyPrice: 3500,
			annualPrice: 35000,
			features: [
				'Access to Tradeet Campus',
				'Product listings (up to 20)',
				'Analytics (Basic insights on views, orders, and popular products).',
				'Store customization options',
				'Priority listing on Tradeet Campus',
				'Order Tracking with Real-Time Updates',
				'Ability to create and manage discount codes.',
			],
		},
		{
			name: 'Pro',
			monthlyPrice: 7500,
			annualPrice: 75000,
			features: [
				'Unlimited product listings',
				'Custom domains & premium themes',
				'Automated marketing tools',
				'Advanced order management',
				'24/7 customer support',
				'Runner delivery discounts',
				'API access for integrations',
				'Detailed insights, including customer demographics, retention rates, and peak order times.',
				'Subscription-Based Sales',
			],
		},
	];

	const durations = [
		{ label: '1 Month', multiplier: 1 },
		// { label: '3 Months', multiplier: 3 },
		// { label: '6 Months', multiplier: 6 },
		{ label: '1 Year', multiplier: 12 },
	];

	const handlePayNow = (plan) => {
		setSelectedPlan(plan);
		setModalVisible(true);
	};

	const handleDurationSelect = (multiplier) => {
        if (selectedPlan) {
            setPlanDuration(multiplier);
			const price =
				multiplier === 12
					? selectedPlan.annualPrice
					: selectedPlan.monthlyPrice * multiplier;
			setCalculatedPrice(price);
		}
	};

	const handlePayment = () => {
		// setModalVisible(false);
        if (planDuration) {
            setPay(true);
        } else {
            alert('Please choose a plan duration.')
        }
	};

	const handleOrderNow = async () => {
		try {
			const response = await axiosInstance.put(
				`/businesses/${userInfo._id}/subscription`,
                {
                    planName: selectedPlan.name,
                    planType: planDuration,
                    startDate: Date.now(),
                },
            );
            // console.log('Purchase response:', response.data);
            getBusinessInfo()
            setPayModalVisible(false);
		} catch (error) {
			console.log(error);
		}
    };
    
    console.log(selectedPlan, planDuration)

	return (
		<View style={styles.container}>
			<Text style={styles.title}>
				Tradeet Pricing Plans
			</Text>
			<ScrollView showsVerticalScrollIndicator={false}>
				{plans.map((plan, index) => (
					<View key={index} style={styles.planCard}>
						<Text style={styles.planTitle}>
							{plan.name}
						</Text>
						<Text style={styles.planPrice}>
							₦{plan.monthlyPrice.toLocaleString()}/month
						</Text>
						<Text style={styles.planPriceAnnual}>
							₦{plan.annualPrice.toLocaleString()}/year
							(Save!)
						</Text>
						<View style={styles.features}>
							{plan.features.map((feature, idx) => (
								<Text key={idx} style={styles.feature}>
									• {feature}
								</Text>
							))}
						</View>
						<TouchableOpacity
							style={styles.payButton}
							onPress={() => handlePayNow(plan)}
						>
							<Text style={styles.payButtonText}>
								Pay Now
							</Text>
						</TouchableOpacity>
					</View>
				))}
			</ScrollView>

			{/* Modal for Duration Selection */}
			<Modal
				transparent
				animationType="slide"
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>
							Choose Duration for {selectedPlan?.name}
						</Text>
						<View style={styles.optionContainer}>
							{durations.map((duration, idx) => (
								<TouchableOpacity
									key={idx}
									style={[
										styles.durationButton,
										calculatedPrice ===
											(duration.multiplier === 12
												? selectedPlan?.annualPrice
												: selectedPlan?.monthlyPrice *
												  duration.multiplier) &&
											styles.selectedButton,
									]}
									onPress={() =>
										handleDurationSelect(
											duration.multiplier,
										)
									}
								>
									<Text
										style={[
											styles.durationText,
											calculatedPrice ===
												(duration.multiplier === 12
													? selectedPlan?.annualPrice
													: selectedPlan?.monthlyPrice *
													  duration.multiplier) &&
												styles.selectedText,
										]}
									>
										{duration.label} - ₦
										{duration.multiplier === 12
											? selectedPlan?.annualPrice
											: selectedPlan?.monthlyPrice *
											  duration.multiplier}
									</Text>
								</TouchableOpacity>
							))}
						</View>
						<TouchableOpacity
							style={styles.confirmButton}
							onPress={handlePayment}
						>
							<Text style={styles.confirmButtonText}>
								Pay ₦{calculatedPrice}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.cancelButton}
							onPress={() => setModalVisible(false)}
						>
							<Text style={styles.cancelButtonText}>
								Cancel
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
			{pay && (
				<View>
					<Paystack
						paystackKey="pk_live_9ed31e08b1843a6818e392764c8dd6ac8457ea23"
						amount={calculatedPrice}
						billingEmail={businessData?.email}
						billingMobile={businessData?.phone}
						channels={
							['card', 'bank_transfer', 'ussd']
						}
						autoStart={pay}
						onCancel={() => {
							ToastAndroid.show(
								'Transaction Cancelled!',
								ToastAndroid.LONG,
							);
							setPay(false);
						}}
						onSuccess={async (response) => {
							if (response?.status === 'success') {
								ToastAndroid.show(
									'Transaction Approved!',
									ToastAndroid.LONG,
								);
								handleOrderNow();
								setModalVisible(false);
							}
							setPay(false);
						}}
						onError={(error) => {
							ToastAndroid.show(
								'An error occurred. Please try again!',
								ToastAndroid.LONG,
							);
							console.error('Payment Error:', error);
							setPay(false);
						}}
						headers={{
							'Content-Type': 'application/json',
							Accept: 'application/json',
						}}
					/>
					<View>
						<TouchableOpacity
							style={{
								backgroundColor: '#18a54a',
								paddingVertical: 15,
								borderRadius: 10,
								width: '100%',
								justifyContent: 'center',
								alignItems: 'center',
							}}
							onPress={() => {
								setPay(false);
							}}
						>
							<Text style={{ color: '#fff', fontSize: 18 }}>
								Retry payment
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		// flex: 1,
		backgroundColor: '#fff',
		paddingTop: 40,
		paddingHorizontal: 20,
		width: '95%',
		height: '98%',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 20,
		color: '#333',
	},
	planCard: {
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 20,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#ccc',
	},
	planTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 10,
		color: 'green',
	},
	planPrice: {
		fontSize: 18,
		fontWeight: '600',
		textAlign: 'center',
		color: '#333',
		marginBottom: 5,
	},
	planPriceAnnual: {
		fontSize: 16,
		fontWeight: '400',
		textAlign: 'center',
		color: '#28a745',
		marginBottom: 15,
	},
	features: {
		marginBottom: 15,
	},
	feature: {
		fontSize: 14,
		color: '#555',
		marginBottom: 5,
	},
	payButton: {
		backgroundColor: 'green',
		paddingVertical: 12,
		borderRadius: 5,
		alignItems: 'center',
	},
	payButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	modalContainer: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 20,
		width: '80%',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
	},
	durationButton: {
		backgroundColor: '#f0f0f0',
		paddingVertical: 12,
		paddingHorizontal: 10,
		borderRadius: 5,
		marginBottom: 10,
	},
	durationText: {
		textAlign: 'center',
		fontSize: 16,
		color: '#333',
	},
	confirmButton: {
		backgroundColor: 'green',
		paddingVertical: 12,
		borderRadius: 5,
		marginTop: 10,
	},
	confirmButtonText: {
		color: '#fff',
		textAlign: 'center',
		fontSize: 16,
		fontWeight: '600',
	},
	cancelButton: {
		marginTop: 10,
		paddingVertical: 10,
	},
	cancelButtonText: {
		color: 'red',
		textAlign: 'center',
		fontSize: 16,
	},
});

export default PricingTable;
