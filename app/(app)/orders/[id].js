import {
	useLocalSearchParams,
	useRouter,
} from 'expo-router';
import React, {
	useContext,
	useEffect,
	useState,
} from 'react';
import {
	View,
	Text,
	ScrollView,
	Alert,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	Modal,
	ActivityIndicator,
	ToastAndroid,
	Image,
	Linking,
} from 'react-native';
import Timeline from 'react-native-timeline-flatlist';
import axiosInstance from '@/utils/axiosInstance';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import LoadingScreen from '@/components/LoadingScreen';
import { AuthContext } from '@/context/AuthContext';
import socket from '@/utils/socket';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const SingleOrderPage = () => {
	const { userInfo, sendPushNotification } =
		useContext(AuthContext);
	const { id } = useLocalSearchParams();
	const [order, setOrder] = useState(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();
	const [deliveryCode, setDeliveryCode] = useState('');
	const [deliveryType, setDeliveryType] =
		useState('personal');
	const [riderName, setRiderName] = useState('');
	const [riderNumber, setRiderNumber] = useState('');
	const [
		isWaitingForAcceptance,
		setIsWaitingForAcceptance,
	] = useState(false);
	const [runnerAccepted, setRunnerAccepted] =
		useState(false);
	const [selectedRunner, setSelectedRunner] =
		useState(null);

	const orderId = id;

	useEffect(() => {
		// Fetch order details from server
		const fetchOrder = async () => {
			try {
				// Fetch order by ID
				const response = await axiosInstance.get(
					`/orders/${orderId}`,
				);
				setOrder(response.data);
			} catch (error) {
				Alert.alert(
					'Error',
					'Failed to fetch order details',
				);
			} finally {
				setLoading(false);
			}
		};
		fetchOrder();
	}, [orderId]);

	// console.log(order);

	function formatDate(dateString) {
		const date = new Date(dateString); // Create a Date object from the input

		// Get day, month, year, and time components
		const day = date.getDate();
		const monthNames = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec',
		];
		const month = monthNames[date.getMonth()];
		const year = date.getFullYear();

		// Format hours and minutes
		let hours = date.getHours();
		const minutes = date
			.getMinutes()
			.toString()
			.padStart(2, '0'); // Add leading zero
		const ampm = hours >= 12 ? 'pm' : 'am'; // Determine AM/PM
		hours = hours % 12; // Convert to 12-hour format
		hours = hours ? hours : 12; // The hour '0' should be '12'

		// Get the day suffix
		const suffix = (day) => {
			if (day > 3 && day < 21) return 'th'; // General rule for all numbers between 4 and 20
			switch (day % 10) {
				case 1:
					return 'st';
				case 2:
					return 'nd';
				case 3:
					return 'rd';
				default:
					return 'th';
			}
		};

		// Construct the formatted date string
		return `${day}${suffix(day)} ${month}, ${year}`;
	}

	function formatTime(dateString) {
		const date = new Date(dateString); // Create a Date object from the input

		// Get day, month, year, and time components
		const day = date.getDate();
		const monthNames = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec',
		];
		const month = monthNames[date.getMonth()];
		const year = date.getFullYear();

		// Format hours and minutes
		let hours = date.getHours();
		const minutes = date
			.getMinutes()
			.toString()
			.padStart(2, '0'); // Add leading zero
		const ampm = hours >= 12 ? 'pm' : 'am'; // Determine AM/PM
		hours = hours % 12; // Convert to 12-hour format
		hours = hours ? hours : 12; // The hour '0' should be '12'

		// Get the day suffix
		const suffix = (day) => {
			if (day > 3 && day < 21) return 'th'; // General rule for all numbers between 4 and 20
			switch (day % 10) {
				case 1:
					return 'st';
				case 2:
					return 'nd';
				case 3:
					return 'rd';
				default:
					return 'th';
			}
		};

		// Construct the formatted date string
		return `${hours}:${minutes}${ampm}`;
	}

	const handlePayRestaurant = () => {
		setLoading(true);
		// Simulate payment processing
		setTimeout(() => {
			setLoading(false);
			alert('Payment processed successfully!');
			// sendPushNotification(
			// 	order?.customerInfo?.expoPushToken,
			// 	'Order picked up',
			// 	`Your runner is on the way. Use the code, ${order?.deliveryCode} to receive your order.`,
			// );
			sendPushNotification(
				order?.storeId?.expoPushToken,
				'Payment received',
				`You just received, ₦${order?.itemsAmount} for order #${order?.orderNumber} to your ${order?.storeId?.paymentInfo[0]?.bankName} account. Please confirm with your bank.`,
			);
		}, 2000); // Simulates a 2-second loading time
	};

	// Function to handle the button press
	const handleCompleteDelivery = async () => {
		if (deliveryCode.length === 4) {
			// Perform the action for completing the delivery here
			try {
				const response = await axiosInstance.post(
					`/businesses/${userInfo?._id}/order/${orderId}/delivered`,
					{ deliveryCode },
				);
				// console.log(response);
				if (response.status !== 200) {
					Alert.alert(
						'Error',
						'Delivery code is incorrect',
					);
				} else {
					Alert.alert(
						'Success',
						'Delivery marked as complete',
					);
					handlePayRestaurant();
					// await sendPushNotification(
					// 	order?.customerInfo?.expoPushToken,
					// 	'Order delivered',
					// 	'Your order has been completed successfully',
					// );
					setLoading(false);
					router.back();
				}
			} catch (err) {
				console.log(err.message || 'Error fetching orders');
				setLoading(false);
			}
		} else {
			Alert.alert(
				'Error',
				'Please enter a valid 4-digit delivery code',
			);
		}
	};

	const handleOpenWhatsapp = () => {
		Linking.openURL(
			`https://wa.me/${order?.customerInfo?.contact?.replace(
				'+',
				'',
			)}`,
		); // Replace with your desired website URL
	};

	const handleCallCustomer = () => {
		const phoneNumber = order?.customerInfo?.contact; // Remove the '+' sign if present
		if (phoneNumber) {
			Linking.openURL(`tel:${phoneNumber}`);
		} else {
			console.error('Phone number is not available.');
		}
	};

	if (loading) return <LoadingScreen />;

	return (
		<View style={styles.container}>
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<TouchableOpacity
						onPress={() => router.push('(tabs)/orders')}
						style={{
							display: 'flex',
							flexDirection: 'row',
							gap: 5,
							alignItems: 'center',
						}}
					>
						<Ionicons
							name="chevron-back-outline"
							size={24}
							color="#1C2634"
						/>
						<Text
							style={{
								fontSize: 22,
								color: '#1C2634',
								fontWeight: 'bold',
							}}
						>
							Order #{order.orderNumber}
						</Text>
					</TouchableOpacity>
					<Text style={styles.storeName}></Text>
				</View>
				<View style={styles.headerRight}>
					<TouchableOpacity
						style={{
							display: 'flex',
							flexDirection: 'row',
							gap: 5,
							alignItems: 'center',
							backgroundColor:
								order.payment.status !== 'completed'
									? 'red'
									: 'green',
							paddingHorizontal: 10,
							borderRadius: 15,
							paddingVertical: 5,
						}}
					>
						<Text
							style={{
								fontSize: 14,
								color:
									order.payment.status !== 'completed'
										? 'white'
										: 'white',
								fontWeight: 'bold',
								textTransform: 'capitalize',
							}}
						>
							{order?.payment?.status !== 'completed'
								? 'Not paid'
								: 'Paid'}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={{
							display: 'flex',
							flexDirection: 'row',
							gap: 5,
							alignItems: 'center',
							backgroundColor:
								order.status === 'completed'
									? '#4CAF50'
									: '#FFEDB3',
							paddingHorizontal: 10,
							borderRadius: 15,
							paddingVertical: 5,
						}}
					>
						<Text
							style={{
								fontSize: 14,
								color: '#1C2634',
								fontWeight: 'bold',
								textTransform: 'capitalize',
							}}
						>
							{order?.status}
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView>
				<View
					style={{
						gap: 5,
						paddingHorizontal: 7,
						borderBottomWidth: 0.5,
						borderColor: '#ccc',
						paddingBottom: 10,
						color: 'gray',
						paddingTop: 10,
					}}
				>
					<Text
						style={{
							fontSize: 20,
							fontWeight: 'semibold',
							marginBottom: 3,
							fontWeight: 'bold',
						}}
					>
						Customer Information
					</Text>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							gap: 5,
							marginBottom: 3,
						}}
					>
						<Text
							style={{
								fontSize: 16,
								// fontWeight: 'bold',
								color: '#333B3F',
							}}
						>
							{order.customerInfo?.name}
						</Text>
						<Text>|</Text>
						<Text
							style={{
								fontSize: 16,
								// fontWeight: 'bold',
								color: '#333B3F',
							}}
						>
							{order.customerInfo?.contact}
						</Text>
					</View>
					<View>
						<Text
							style={{
								fontSize: 16,
								marginBottom: 3,
								color: '#333B3F',
							}}
						>
							{order.customerInfo?.pickUp === false
								? order.customerInfo?.address
								: 'Self Pickup'}
						</Text>
					</View>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							gap: 5,
							marginVertical: 10,
						}}
					>
						<TouchableOpacity
							style={{
								flexDirection: 'row',
								gap: 3,
								alignItems: 'center',
								backgroundColor: 'green',
								paddingHorizontal: 10,
								borderRadius: 15,
								paddingVertical: 5,
							}}
							onPress={handleOpenWhatsapp}
						>
							<Ionicons
								name="logo-whatsapp"
								size={20}
								color="white"
							/>
							<Text style={{ color: '#fff' }}>
								Chat with customer
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={{
								flexDirection: 'row',
								gap: 3,
								alignItems: 'center',
								backgroundColor: '#A8D1DF',
								paddingHorizontal: 10,
								borderRadius: 15,
								paddingVertical: 5,
							}}
							onPress={handleCallCustomer}
						>
							<MaterialIcons
								name="phone-in-talk"
								size={20}
								color="black"
							/>
							<Text style={{ color: '#212121' }}>
								Call customer
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Items Ordered */}
				<View style={styles.section}>
					<Text
						style={{
							fontSize: 20,
							marginBottom: 10,
							fontWeight: 'bold',
						}}
					>
						Purchased Items
					</Text>
					{order.items.map((item, index) => (
						<View
							style={{
								display: 'flex',
								flexDirection: 'row',
								justifyContent: 'space-between',
								backgroundColor: '#f7f7f7',
								paddingVertical: 6,
								paddingHorizontal: 6,
								marginBottom: 10,
								elevation: 1,
								borderRadius: 5,
							}}
							key={index}
						>
							<View
								style={{
									width: '99.9%',
									paddingHorizontal: 10,
									paddingVertical: 5,
								}}
							>
								<View style={{ paddingBottom: 5 }}>
									<Text
										style={{
											fontSize: 16,
											fontWeight: 'bold',
										}}
									>
										{item.category}
									</Text>
								</View>
								<View
									style={{
										display: 'flex',
										flexDirection: 'row',
										justifyContent: 'space-between',
										marginBottom: 3,
									}}
								>
									<Text
										style={{
											fontSize: 16,
											marginBottom: 1,
										}}
									>
										{item.name} (x{item?.quantity})
									</Text>
									<Text style={{ fontSize: 16 }}>
										₦
										{(
											item.basePrice * item?.quantity
										)?.toLocaleString() ||
											item.price?.toLocaleString()}
									</Text>
								</View>
								{item?.specialInstructions && (
									<Text
										style={{
											fontSize: 14,
											marginBottom: 5,
										}}
									>
										~ ({item?.specialInstructions})
									</Text>
								)}
								{item?.variants?.length > 0 && (
									<View>
										{item.variants.map((variant, index) => (
											<Text
												style={{
													fontSize: 16,
													marginBottom: 5,
												}}
												key={index}
											>
												{variant.name} (x{variant.quantity})
											</Text>
										))}
									</View>
								)}
								{item?.addOns?.length > 0 && (
									<View>
										{item.addOns.map((addOn, index) => (
											<View
												style={{
													flexDirection: 'row',
													justifyContent: 'space-between',
													alignItems: 'center',
													// width: '99.9%',
												}}
												key={index}
											>
												<Text
													style={{
														fontSize: 16,
														marginBottom: 5,
													}}
												>
													{addOn.name} (x{addOn.quantity})
												</Text>
												<Text
													style={{
														fontSize: 16,
														marginBottom: 5,
													}}
												>
													₦{addOn.price * addOn.quantity}
												</Text>
											</View>
										))}
									</View>
								)}
							</View>
						</View>
					))}
				</View>

				<View
					style={{
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'space-between',
						borderTopColor: '#ccc',
						borderTopWidth: 1,
						paddingVertical: 10,
						paddingHorizontal: 10,
					}}
				>
					<Text style={{}}>Sub-total</Text>
					<Text style={{ fontSize: 16 }}>
						{' '}
						₦{order.itemsAmount?.toLocaleString()}
					</Text>
				</View>
				{order?.deliveryFee > 0 && (
					<View
						style={{
							display: 'flex',
							flexDirection: 'row',
							justifyContent: 'space-between',
							borderTopColor: '#ccc',
							borderTopWidth: 1,
							paddingVertical: 10,
							paddingHorizontal: 10,
						}}
					>
						<Text style={{}}>Delivery Fee</Text>
						<Text style={{ fontSize: 16 }}>
							{' '}
							₦{order.deliveryFee?.toLocaleString()}
						</Text>
					</View>
				)}
				{order.discountCode && (
					<View
						style={{
							display: 'flex',
							flexDirection: 'row',
							justifyContent: 'space-between',
							borderTopColor: '#ccc',
							borderTopWidth: 1,
							paddingVertical: 10,
							paddingHorizontal: 10,
						}}
					>
						<Text style={{ fontSize: 14 }}>
							Discount Amount ({order?.discountCode})
						</Text>
						<Text
							style={{
								fontSize: 16,
								color: 'red',
							}}
						>
							- ₦{order.discountAmount}
						</Text>
					</View>
				)}
				<View
					style={{
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'space-between',
						borderTopColor: '#ccc',
						borderTopWidth: 1,
						paddingVertical: 10,
						paddingHorizontal: 10,
					}}
				>
					<Text style={styles.orderNumber}>Total</Text>
					<Text style={styles.orderNumber}>
						{' '}
						₦
						{(
							Number(
								order?.deliveryFee + order?.itemsAmount,
							) - Number(order?.discountAmount) ||
							order?.totalAmount?.toLocaleString()
						)?.toLocaleString()}
					</Text>
				</View>

				{order?.status === 'completed' ? null : (
					<>
						<View
							style={{
								paddingHorizontal: 10,
								paddingTop: 20,
							}}
						>
							<Text
								style={{ fontSize: 20, fontWeight: 'bold' }}
							>
								Complete Delivery
							</Text>
							<Text>
								Enter the 4-digit pin from the customer.
							</Text>
							<TextInput
								style={styles.dinput}
								value={deliveryCode}
								onChangeText={setDeliveryCode}
								keyboardType="numeric"
								maxLength={4}
								placeholder="Enter 4-digit code"
							/>

							<TouchableOpacity
								style={[
									styles.button,
									{
										backgroundColor:
											deliveryCode.length === 4
												? '#4CAF50'
												: '#B0BEC5',
									},
								]}
								onPress={handleCompleteDelivery}
								disabled={deliveryCode.length !== 4}
							>
								<Text style={styles.buttonText}>
									Mark as delivered
								</Text>
							</TouchableOpacity>
						</View>
					</>
				)}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 40,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
		paddingBottom: 20,
		paddingTop: 10,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerRight: {
		flexDirection: 'row',
		gap: 5,
	},
	iconButton: {
		marginLeft: 16,
	},
	storeName: {
		fontSize: 24,
		fontWeight: 'bold',
		marginLeft: 8,
		color: '#1C2634',
	},
	orderNumber: { fontSize: 22, fontWeight: 'bold' },
	section: { marginVertical: 10, paddingHorizontal: 1 },
	dinput: {
		height: 40,
		borderColor: '#ddd',
		borderWidth: 1,
		borderRadius: 5,
		marginBottom: 20,
		paddingHorizontal: 10,
		fontSize: 16,
		marginTop: 5,
	},
	button: {
		backgroundColor: 'green',
		borderRadius: 8,
		padding: 10,
		width: '48%',
		alignItems: 'center',
	},
	buttonText: {
		color: '#000',
		fontSize: 18,
	},
	optionContainer: {
		flexDirection: 'row',
		width: '100%',
		marginBottom: 20,
		gap: 10,
		marginTop: 10,
	},
	optionButton: {
		paddingHorizontal: 10,
		borderWidth: 1,
		borderColor: 'gray',
		borderRadius: 5,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		marginBottom: 0,
		width: '50%',
		paddingVertical: 5,
	},
	selectedOption: {
		borderColor: '#18a54a',
	},
	optionText: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	circle: {
		height: 24,
		width: 24,
		borderRadius: 12, // makes the circle
		borderWidth: 2,
		borderColor: '#ccc',
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedCircle: {
		borderColor: '#18a54a', // green for selected state
	},
	circleInner: {
		height: 12,
		width: 12,
		borderRadius: 6,
		backgroundColor: '#18a54a', // inner green dot when selected
	},
	runnerItem: {
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
	},
	closeModalButton: {
		backgroundColor: '#000',
		padding: 10,
		borderRadius: 5,
		marginTop: 10,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
	},
	loadingText: {
		color: '#fff',
		marginTop: 10,
		fontSize: 20,
	},
	actionButtons: {
		flexDirection: 'row',
		// justifyContent: '',
		marginTop: 8,
		alignItems: 'center',
		gap: 10,
	},
	acceptButton: {
		backgroundColor: 'green',
		padding: 10,
		borderRadius: 4,
		width: '48%',
		alignItems: 'center',
	},
	rejectButton: {
		borderColor: 'red',
		borderWidth: 0.5,
		padding: 10,
		borderRadius: 4,
		width: '48%',
		alignItems: 'center',
	},
	buttonText: {
		color: '#fff',
	},
});

export default SingleOrderPage;
