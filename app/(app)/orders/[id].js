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
		useState('runner');
	const [riderName, setRiderName] = useState('');
	const [riderNumber, setRiderNumber] = useState('');
	const [runners, setRunners] = useState([]);
	const [runnerLoading, setRunnerLoading] = useState(false);
	const [loadingRunner, setLoadingRunner] = useState(false);
	const [availableRunners, setAvailableRunners] =
		useState(null);
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
					await sendPushNotification(
						order?.customerInfo?.expoPushToken,
						'Order delivered',
						'Your order has been completed successfully',
					);
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

	const fetchAvailableRunners = async () => {
		try {
			setRunnerLoading(true);
			const response = await axiosInstance.get(
				`/runner/available`,
			);
			setRunners(response.data);
		} catch (error) {
			console.error('Error fetching runners:', error);
		} finally {
			setRunnerLoading(false);
		}
	};

	const errandRunners = runners;

	const selectRandomAvailableErrandRunner = () => {
		setLoadingRunner(true);

		if (errandRunners?.length > 0) {
			const randomRunner =
				errandRunners[
					Math.floor(Math.random() * errandRunners?.length)
				];
			setAvailableRunners(randomRunner);
			setLoadingRunner(false);
		} else {
			setAvailableRunners(null); // Handle case when no runner is available
			ToastAndroid.showWithGravity(
				'No runner currently available. Please try again',
				ToastAndroid.SHORT,
				ToastAndroid.CENTER,
			);
			setLoadingRunner(false);
		}
	};

	useEffect(() => {
		fetchAvailableRunners();

		// Set up WebSocket listener for real-time updates
		socket.on('runnerStatusUpdated', (updatedRunner) => {
			// console.log(updatedRunner);
			// Update the state when a runner's status changes
			setRunners((prevRunners) => {
				// Find the updated runner and modify the status
				return prevRunners.map((runner) =>
					runner._id === updatedRunner._id
						? updatedRunner
						: runner,
				);
			});
		});

		// Cleanup the WebSocket listener on component unmount
		return () => {
			socket.off('runnerStatusUpdated');
		};
	}, [userInfo?.campus]);

	const handleSearch = () => {
		if (!order?.customerInfo?.address) {
			Alert.alert('Error', 'Customer address is missing!');
			return;
		} else {
			fetchAvailableRunners();
			selectRandomAvailableErrandRunner();
		}
	};

	const handleSelectRunner = async (runner) => {
		const orderDetails = {
			storeName: userInfo?.name,
			pickupAddress: userInfo?.address,
			deliveryAddress: order.customerInfo.address,
			studentName: order.customerInfo.name,
			studentPhone: order.customerInfo.phone,
			runnerId: runner._id,
		};
		try {
			setIsWaitingForAcceptance(true);
			// Send runner selection details to backend
			const response = await axiosInstance.post(
				`/delivery/create`,
				orderDetails,
			);

			await sendPushNotification(
				runner?.expoPushToken,
				'New delivery Request 🔔',
				'New delivery request from ' + userInfo?.name,
			);

			// console.log(response.data.deliveryRequest._id);

			if (response.status === 201) {
				// Emit a socket event to notify the runner of the order details
				socket.emit('newDeliveryRequest', {
					runnerId: runner._id,
					orderDetails,
				});
				// console.log('hey');

				listenForAcceptance(
					response?.data?.deliveryRequest?._id, // Replace with the actual request ID
					() => {
						setIsWaitingForAcceptance(false);
						setRunnerAccepted(true);
						setSelectedRunner(availableRunners);
					},
					() => {
						setIsWaitingForAcceptance(false);
						setRunnerAccepted(false);
						ToastAndroid.showWithGravity(
							'Runner did not accept the request! Try again.',
							ToastAndroid.SHORT,
							ToastAndroid.CENTER,
						);
					},
				); // Listen for the runner's response (accept/reject)
			} else {
				ToastAndroid.showWithGravity(
					'Failed to select runner! Try again.',
					ToastAndroid.SHORT,
					ToastAndroid.CENTER,
				);
				setIsWaitingForAcceptance(false);
			}
		} catch (error) {
			console.log('Error selecting runner');
			setIsWaitingForAcceptance(false);
		}
	};

	const listenForAcceptance = (
		requestId,
		onSuccess,
		onFailure,
		timeout = 120000,
		interval = 5000,
	) => {
		let elapsedTime = 0;
		let isAccepted = false;

		// Function to check acceptance status
		const checkAcceptanceStatus = async () => {
			try {
				const response = await axiosInstance.get(
					`/delivery/status/${requestId}`,
				);

				if (response.data.status === 'accepted') {
					isAccepted = true;
					clearInterval(pollingInterval); // Stop polling
					clearTimeout(timeoutTimer); // Clear timeout timer
					onSuccess(); // Call the success callback
				} else if (response.data.status === 'rejected') {
					isAccepted = true;
					clearInterval(pollingInterval); // Stop polling
					clearTimeout(timeoutTimer); // Clear timeout timer
					onFailure(); // Call the failure callback
				}
			} catch (error) {
				console.log(
					'Error checking acceptance status:',
					error.message,
				);
			}
		};

		// Start the interval for polling every 5 seconds
		const pollingInterval = setInterval(() => {
			if (!isAccepted) {
				checkAcceptanceStatus();
				elapsedTime += interval;
			}
		}, interval);

		// Timeout to stop checking after the specified timeout duration
		const timeoutTimer = setTimeout(() => {
			if (!isAccepted) {
				clearInterval(pollingInterval); // Stop polling
				onFailure(); // Call the failure callback on timeout
				console.log(
					'Timeout: Stopped checking after 2 minutes.',
				);
			}
		}, timeout);
	};

	const handleAcceptOrder = async () => {
		setLoading(true); // Start loading

		try {
			const response = await axiosInstance.put(
				`/orders/v/${order?._id}/accept`,
				{
					storeId: order?.storeId._id,
				},
			);

			if (response.data.order) {
				console.log(
					'Emitting order update:',
					response.data.order,
				);
				sendPushNotification(
					order?.customerInfo?.expoPushToken,
					'Order update',
					`Your order #${order?.orderNumber} has been accepted by ${order?.storeId?.name}.`,
				);
				socket.emit(
					'orderUpdate',
					response.data.order,
					(error) => {
						if (error) {
							console.error('Error updating order:', error);
						} else {
							console.log('Order updated successfully');
						}
					},
				);
			} else {
				console.error('Order not found in response data');
			}
		} catch (err) {
			console.error('Error in handleAcceptOrder:', err);
			setError(err.message || 'Error accepting order');
		} finally {
			setLoading(false); // Always stop loading
		}
	};

	const handleRejectOrder = async () => {
		try {
			const response = await axiosInstance.put(
				`/orders/v/${order?._id}/cancel`,
				{
					storeId: order?.storeId._id,
				},
			);
			setLoading(false);
		} catch (err) {
			setError(err.message || 'Error fetching orders');
			setLoading(false);
		}
	};

	if (loading) return <LoadingScreen />;

	return (
		<ScrollView style={styles.container}>
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<TouchableOpacity
						onPress={() => router.push('(tabs)')}
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

			{order.status === 'pending' && (
				<View style={styles.actionButtons}>
					<TouchableOpacity
						onPress={() => handleRejectOrder()}
						style={styles.rejectButton}
					>
						<Text style={{ color: 'red', fontSize: 18 }}>
							{loading ? '...' : 'Reject'}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => handleAcceptOrder()}
						style={styles.acceptButton}
					>
						<Text style={{ color: '#fff', fontSize: 18 }}>
							{loading ? '...' : 'Accept'}
						</Text>
					</TouchableOpacity>
				</View>
			)}

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
						fontSize: 22,
						fontWeight: 'semibold',
						marginBottom: 1,
						fontWeight: 'bold',
					}}
				>
					Customer Information
				</Text>
				<View>
					<Text>Customer Name</Text>
					<Text
						style={{
							fontSize: 16,
							fontWeight: 'bold',
							color: '#333B3F',
						}}
					>
						{order.customerInfo?.name}
					</Text>
				</View>
				<View>
					<Text>Phone Number</Text>
					<Text
						style={{
							fontSize: 16,
							fontWeight: 'bold',
							color: '#333B3F',
						}}
					>
						{order.customerInfo?.contact}
					</Text>
				</View>
				<View>
					<Text>Address</Text>
					<Text
						style={{
							fontSize: 16,
							fontWeight: 'bold',
							color: '#333B3F',
						}}
					>
						{order.deliveryOption === 'delivery'
							? order.customerInfo?.address
							: 'Self Pickup'}
					</Text>
				</View>
			</View>
			{/* Timeline */}

			{/* Items Ordered */}
			<View style={styles.section}>
				<Text
					style={{
						fontSize: 22,
						fontWeight: 'semibold',
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
						}}
					>
						<View>
							{item.variants.length > 0 && (
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
							{item.addOns.length > 0 && (
								<View>
									{item.addOns.map((addOn, index) => (
										<Text
											style={{
												fontSize: 16,
												marginBottom: 5,
											}}
											key={index}
										>
											{addOn.name} (x{addOn.quantity})
										</Text>
									))}
								</View>
							)}
						</View>
						<Text style={{ fontSize: 16 }}>
							₦{item.totalPrice}
						</Text>
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
				<Text style={styles.orderNumber}>Total</Text>
				<Text style={styles.orderNumber}>
					{' '}
					₦{order.itemsAmount}
				</Text>
			</View>
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
					<Text
						style={{ fontSize: 16, fontWeight: 'bold' }}
					>
						Discount Code Applied
					</Text>
					<Text
						style={{ fontSize: 16, fontWeight: 'bold' }}
					>
						{order.discountCode}
					</Text>
				</View>
			)}

			{order?.status === 'completed' ? null : (
				<>
					{order.deliveryOption === 'pickup' ? (
						<View
							style={{
								paddingHorizontal: 10,
								paddingTop: 20,
							}}
						>
							<Text
								style={{ fontSize: 20, fontWeight: 'bold' }}
							>
								Complete Pickup
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
					) : (
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

							<View style={styles.optionContainer}>
								<TouchableOpacity
									style={[
										styles.optionButton,
										deliveryType === 'runner' &&
											styles.selectedOption,
									]}
									onPress={() => setDeliveryType('runner')}
								>
									<View
										style={[
											styles.circle,
											deliveryType === 'runner' &&
												styles.selectedCircle,
										]}
									>
										{deliveryType === 'runner' && (
											<View style={styles.circleInner} />
										)}
									</View>
									<View>
										<Text style={styles.optionText}>
											Tradeet Runner
										</Text>
										<Text style={{ fontSize: 12 }}>
											Fast, Safe and Secure
										</Text>
									</View>
								</TouchableOpacity>

								<TouchableOpacity
									style={[
										styles.optionButton,
										deliveryType === 'personal' &&
											styles.selectedOption,
									]}
									onPress={() => {
										setDeliveryType('personal');
									}}
								>
									<View
										style={[
											styles.circle,
											deliveryType === 'personal' &&
												styles.selectedCircle,
										]}
									>
										{deliveryType === 'personal' && (
											<View style={styles.circleInner} />
										)}
									</View>
									<View>
										<Text style={styles.optionText}>
											Personal
										</Text>
										<Text style={{ fontSize: 12 }}>
											Use your own rider
										</Text>
									</View>
								</TouchableOpacity>
							</View>

							{/* Personal rider */}
							{deliveryType === 'personal' && (
								<View style={{ marginTop: 10 }}>
									<Text
										style={{
											fontSize: 20,
											fontWeight: 'bold',
										}}
									>
										Personal Rider Details
									</Text>
									<View>
										<Text>Name</Text>
										<TextInput
											style={styles.dinput}
											value={riderName}
											onChangeText={setRiderName}
											disabled={true}
											keyboardType="text"
										/>
									</View>
									<View>
										<Text>WhatsApp Number</Text>
										<TextInput
											style={styles.dinput}
											value={riderNumber}
											onChangeText={setRiderNumber}
											keyboardType="numeric"
										/>
									</View>
									<TouchableOpacity
										style={[
											styles.button,
											{
												backgroundColor: '#4CAF50',
											},
										]}
										// onPress={handleCompleteDelivery}
									>
										<Text
											style={{
												fontSize: 18,
												color: '#fff',
											}}
										>
											Assign Order
										</Text>
									</TouchableOpacity>
								</View>
							)}

							{deliveryType === 'runner' && (
								<>
									<View
										style={{
											display: 'flex',
											flexDirection: 'row',
											justifyContent: 'flex-end',
										}}
									>
										<TouchableOpacity
											style={styles.button}
											onPress={() => handleSearch()}
										>
											<Text
												style={{
													color: '#fff',
													textAlign: 'center',
													fontSize: 18,
												}}
											>
												Find errand runner
											</Text>
										</TouchableOpacity>
									</View>
									<View style={styles.modalContent}>
										{loadingRunner ? (
											<View
												style={{
													display: 'flex',
													flexDirection: 'column',
													justifyContent: 'center',
													alignItems: 'center',
													height: 200,
												}}
											>
												<ActivityIndicator
													size="large"
													color="green"
												/>
												<Text
													style={{
														fontSize: 20,
														marginTop: 5,
													}}
												>
													Searching for runner...
												</Text>
											</View>
										) : (
											<>
												{availableRunners ? (
													<>
														<View
															style={{
																display: 'flex',
																flexDirection: 'row',
																alignItems: 'center',
																gap: 10,
																marginTop: 10,
															}}
														>
															<Text
																style={{
																	fontSize: 22,
																	fontWeight: 'bold',
																}}
															>
																Available errand runner
															</Text>
															<TouchableOpacity
																onPress={() => {
																	fetchAvailableRunners();
																	selectRandomAvailableErrandRunner();
																}}
															>
																<Ionicons
																	name="refresh"
																	size={24}
																	color="black"
																/>
															</TouchableOpacity>
														</View>
														<View
															style={{
																borderTopWidth: 1,
																marginVertical: 10,
																borderTopColor: '#ccc',
															}}
														></View>
														<TouchableOpacity
															style={{
																padding: 10,
																borderBottomWidth: 1,
																borderBottomColor: '#ccc',
																display: 'flex',
																flexDirection: 'row',

																justifyContent:
																	'space-between',
															}}
															onPress={() =>
																handleSelectRunner(
																	availableRunners,
																)
															}
														>
															<View
																style={{
																	display: 'flex',
																	flexDirection: 'row',
																	gap: 8,
																}}
															>
																<Image
																	source={{
																		uri: availableRunners?.profileImage,
																	}}
																	className="w-10 h-10 rounded-full"
																	style={{
																		marginBottom: 4,
																		resizeMode: 'cover',
																		height: 50,
																		width: 50,
																		borderRadius: 50,
																	}}
																/>
																<View>
																	<View
																		style={{
																			marginBottom: 5,
																			display: 'flex',
																			flexDirection: 'row',
																			gap: 5,
																			alignItems: 'center',
																		}}
																	>
																		<Text
																			style={{
																				fontSize: 18,
																				fontWeight:
																					'semibold',
																			}}
																		>
																			{
																				availableRunners?.name
																			}
																		</Text>
																		<Text
																			style={{
																				fontSize: 14,
																				fontWeight:
																					'semibold',
																				color: 'green',
																				backgroundColor:
																					'lightgreen',
																				paddingHorizontal: 5,
																				borderRadius: 15,
																			}}
																		>
																			active
																		</Text>
																	</View>
																	<View
																		style={{
																			display: 'flex',
																			flexDirection: 'row',
																			gap: 8,
																			alignItems: 'center',
																		}}
																	>
																		<View
																			style={{
																				display: 'flex',
																				flexDirection:
																					'row',
																				gap: 3,
																				alignItems:
																					'center',
																			}}
																		>
																			<AntDesign
																				name="star"
																				size={14}
																				color="gold"
																			/>
																			<Text>4.2</Text>
																		</View>
																		<View
																			style={{
																				display: 'flex',
																				flexDirection:
																					'row',
																				gap: 3,
																				alignItems:
																					'center',
																			}}
																		>
																			<MaterialIcons
																				name="delivery-dining"
																				size={14}
																				color="gray"
																			/>
																			<Text>10mins</Text>
																		</View>
																	</View>
																</View>
															</View>
															<View>
																<Text
																	style={{
																		fontSize: 20,
																		fontWeight: 'semibold',
																	}}
																>
																	₦{availableRunners?.price}
																</Text>
															</View>
														</TouchableOpacity>
													</>
												) : (
													<View></View>
												)}
											</>
										)}
									</View>
								</>
							)}
						</View>
					)}
				</>
			)}
			{/* Loading indicator for runner acceptance */}
			<Modal
				visible={isWaitingForAcceptance}
				transparent={true}
			>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#27D367" />
					<Text style={styles.loadingText}>
						Waiting for runner to accept...
					</Text>
				</View>
			</Modal>

			{/* Success modal for runner acceptance */}
			<Modal visible={runnerAccepted} transparent={true}>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>
						{selectedRunner
							? `${selectedRunner.name} has accepted your request!`
							: 'Runner has accepted your request!'}
					</Text>
					<TouchableOpacity
						style={styles.closeModalButton}
						onPress={() => {
							setRunnerAccepted(false);
							setCurrentTab(2);
						}}
					>
						<Text style={styles.buttonText}>
							Go to Payment
						</Text>
					</TouchableOpacity>
				</View>
			</Modal>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 40,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerRight: {
		flexDirection: 'row',
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
	section: { marginVertical: 10, paddingHorizontal: 10 },
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
