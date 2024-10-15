import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
	ScrollView,
	Alert,
	Modal,
	ActivityIndicator,
	TextInput,
	Image,
	Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const CheckoutScreen = () => {
	const [cartItems, setCartItems] = useState([]);
	const [currentTab, setCurrentTab] = useState(0);
	const [selectedRunner, setSelectedRunner] =
		useState(null);
	const [isModalVisible, setIsModalVisible] =
		useState(false);
	const [isLoadingRunners, setIsLoadingRunners] =
		useState(true);
	const [
		isWaitingForAcceptance,
		setIsWaitingForAcceptance,
	] = useState(false);
	const [runnerAccepted, setRunnerAccepted] =
		useState(false);
	const [userLocation, setUserLocation] = useState(''); // User's location input
	const [userPhoneNumber, setUserPhoneNumber] = useState('07034343002'); // User's phone number input
	const [filteredRunners, setFilteredRunners] = useState(
		[],
	);
	const [userAddress, setUserAddress] = useState('');
	const [isPinModalVisible, setPinModalVisible] =
		useState(false);
	const [transactionPin, setTransactionPin] = useState('');
	const [isPinValid, setIsPinValid] = useState(true);
	const [walletBalance, setWalletBalance] = useState(5000);

	const totalAmount = cartItems.reduce(
		(acc, item) => acc + item.totalPrice,
		0,
	);
	const [paymentMethod, setPaymentMethod] =
		useState('wallet'); // wallet or bank

	const userWalletBalance = 1000;

	// Mocked list of errand runners
	const errandRunners = [
		{
			id: 1,
			name: 'Emmanuel Eze',
			rating: 4.5,
			price: 200,
			location: 'Yabatech',
			profileImage:
				'https://lh3.googleusercontent.com/a/AEdFTp5kkk2o05BEXoptDUxBywu9mKC8M1pyQm5-L_Zb=s96-c',
			available: true,
			estimatedDelivery: '10-15mins',
			phoneNumber: '07034343002',
		},
		{
			id: 2,
			name: 'Chidi Eze',
			rating: 4.2,
			price: 200,
			location: 'Yabatech',
			profileImage:
				'https://lh3.googleusercontent.com/a/AEdFTp5kkk2o05BEXoptDUxBywu9mKC8M1pyQm5-L_Zb=s96-c',
			available: false,
			estimatedDelivery: '15-20mins',
			phoneNumber: '07034343003',
		},
		{
			id: 3,
			name: 'Maxwell Timothy',
			rating: 3.8,
			price: 200,
			location: 'Yabatech',
			profileImage:
				'https://media.istockphoto.com/id/517302398/photo/portrait-of-nigerian-man-with-beard-looking-at-camera.jpg?s=612x612&w=0&k=20&c=BC5pdsmTWzmFO3mIlA7TQAIECnJ7Kpd-daL6G4RJqT4=',
			available: true,
			estimatedDelivery: '12-15mins',
			phoneNumber: '07034343004',
		},
	];

	const availableRunners = errandRunners?.filter(
		(runner) => runner.available,
	);

	// Fetch cart items from AsyncStorage
	useEffect(() => {
		const fetchCartItems = async () => {
			const storedCart = await AsyncStorage.getItem('cart');
			const parsedCart = storedCart
				? JSON.parse(storedCart)
				: [];
			setCartItems(parsedCart);
		};

		fetchCartItems();
	}, []);

	// Automatically open modal after a simulated loading time
	useEffect(() => {
		if (currentTab === 1) {
			setIsLoadingRunners(false);
			setIsModalVisible(false); // Ensure modal is not open automatically
		}
	}, [currentTab]);

	// Simulate waiting for runner acceptance
	const simulateRunnerAcceptance = () => {
		setIsWaitingForAcceptance(true);
		setTimeout(() => {
			setIsWaitingForAcceptance(false);
			setRunnerAccepted(true); // Simulate acceptance
		}, 3000);
	};

	const handleRemoveItem = async (id) => {
		const updatedCart = cartItems.filter(
			(item) => item.id !== id,
		);
		setCartItems(updatedCart);
		await AsyncStorage.setItem(
			'cart',
			JSON.stringify(updatedCart),
		);
	};

	const handleClearCart = async () => {
		Alert.alert(
			'Clear Cart',
			'Are you sure you want to clear the cart?',
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Yes',
					onPress: async () => {
						setCartItems([]);
						await AsyncStorage.setItem(
							'cart',
							JSON.stringify([]),
						);
					},
				},
			],
		);
	};

	const handleRunnerSelection = (runner) => {
		setSelectedRunner(runner);
		setIsModalVisible(false);
		simulateRunnerAcceptance(); // Start waiting for runner acceptance
	};

	const renderOrderSummary = () => (
		<View style={styles.tabContent}>
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			<FlatList
				data={cartItems}
				keyExtractor={(item) => item?.id?.toString()}
				renderItem={({ item }) => (
					<View style={styles.cartItem}>
						<Text style={styles.cartItemName}>
							{item.product} ({item.quantity})
						</Text>
						{item.variants.length > 0 && (
							<View>
								{item.variants.map((variant, index) => (
									<Text key={index}>
										{variant.name} (x{variant.quantity})
									</Text>
								))}
							</View>
						)}
						{item.addOns.length > 0 && (
							<View>
								{item.addOns.map((addOn, index) => (
									<Text key={index}>
										{addOn.name} (x{addOn.quantity})
									</Text>
								))}
							</View>
						)}
						<Text style={styles.cartItemPrice}>
							₦{item.totalPrice}
						</Text>
						<TouchableOpacity
							style={styles.removeButton}
							onPress={() => handleRemoveItem(item.id)}
						>
							<Text style={styles.removeButtonText}>
								Remove
							</Text>
						</TouchableOpacity>
					</View>
				)}
			/>
			<Text style={styles.totalAmount}>
				Total: ₦{totalAmount}
			</Text>
			<View style={styles.buttonContainer}>
				<TouchableOpacity
					style={[styles.button, styles.clearCartButton]}
					onPress={handleClearCart}
				>
					<Text
						style={{
							color: '#fff',
							textAlign: 'center',
							fontSize: 18,
						}}
					>
						Clear Cart
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.button}
					onPress={() => setCurrentTab(1)}
				>
					<Text
						style={{
							color: '#fff',
							textAlign: 'center',
							fontSize: 18,
						}}
					>
						Continue
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	const renderRunnerSelection = () => (
		<View style={styles.tabContent}>
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			{/* User location input */}

			<View style={styles.modalContent}>
				<Text style={{ fontSize: 22, fontWeight: 'bold' }}>
					Choose errand runner
				</Text>
				<View
					style={{
						borderTopWidth: 1,
						marginVertical: 10,
						borderTopColor: '#ccc',
					}}
				></View>
				<FlatList
					data={availableRunners}
					keyExtractor={(item) => item.id.toString()}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={{
								padding: 10,
								borderBottomWidth: 1,
								borderBottomColor: '#ccc',
								display: 'flex',
								flexDirection: 'row',

								justifyContent: 'space-between',
							}}
							onPress={() => handleRunnerSelection(item)}
						>
							<View
								style={{
									display: 'flex',
									flexDirection: 'row',
									gap: 8,
								}}
							>
								<Image
									source={{ uri: item.profileImage }}
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
												fontSize: 20,
												fontWeight: 'semibold',
											}}
										>
											{item.name}
										</Text>
										<Text
											style={{
												fontSize: 14,
												fontWeight: 'semibold',
												color: 'green',
												backgroundColor: 'lightgreen',
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
												flexDirection: 'row',
												gap: 3,
												alignItems: 'center',
											}}
										>
											<AntDesign
												name="star"
												size={14}
												color="gold"
											/>
											<Text>{item.rating}</Text>
										</View>
										<View
											style={{
												display: 'flex',
												flexDirection: 'row',
												gap: 3,
												alignItems: 'center',
											}}
										>
											<MaterialIcons
												name="delivery-dining"
												size={14}
												color="gray"
											/>
											<Text>{item.estimatedDelivery}</Text>
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
									₦{item.price}
								</Text>
							</View>
						</TouchableOpacity>
					)}
				/>
			</View>
			<View
				style={{
					position: 'absolute',
					bottom: 10,
					width: '100%',
				}}
			>
				<Text
					style={{
						color: '#000',
						textAlign: 'center',
						fontSize: 20,
						fontWeight: 'bold',
					}}
				>
					Or
				</Text>
				<View
					style={{
						borderTopWidth: 1,
						marginVertical: 20,
						borderTopColor: '#ccc',
					}}
				></View>
				<TouchableOpacity
					style={{
						backgroundColor: '#fff',
						textAlign: 'center',
						paddingVertical: 15,
						borderRadius: 10,
						borderWidth: 1,
					}}
				>
					<Text
						style={{
							color: '#000',
							textAlign: 'center',
							fontSize: 20,
						}}
					>
						Pick up myself
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	const renderDeliveryAndPaymentSummary = () => {
		const runnerFee = selectedRunner
			? selectedRunner.price
			: 0; // Get runner fee
		const serviceFee = 100;
		const finalTotal = totalAmount + runnerFee + serviceFee; // Add runner fee to total
		const isWalletSufficient =
			userWalletBalance >= finalTotal; // Check if wallet balance is sufficient

		const handleOrderNow = () => {
			if (!userAddress) {
				alert('Please enter your delivery address.');
				return;
			}
			if (
				paymentMethod === 'wallet' &&
				!isWalletSufficient
			) {
				alert(
					'Insufficient wallet balance for this transaction.',
				);
				return;
			}
			// Proceed to payment method based on selection
			if (paymentMethod === 'wallet') {
				console.log('Proceeding with wallet payment');
			} else {
				console.log('Proceeding with bank payment');
			}
		};

		return (
			<View style={styles.tabContent}>
				<StatusBar
					backgroundColor="#fff"
					style="dark"
					translucent={true}
				/>
				<View
					style={{
						borderBottomWidth: 1,
						borderBottomColor: '#ccc',
						paddingBottom: 20,
					}}
				>
					<Text style={styles.summaryHeader}>
						Delivery Location
					</Text>
					{/* Address input */}
					<TextInput
						style={styles.input}
						placeholder="Enter your delivery address"
						value={userAddress}
						onChangeText={setUserAddress}
					/>

					<Text style={styles.summaryHeader}>
						Phone Number
					</Text>
					<View>
						<Text style={{ fontSize: 18 }}>
							{userPhoneNumber}
						</Text>
						<TouchableOpacity>
							<Text
								style={{ color: '#0091FF', marginTop: 4 }}
							>
								Change
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				<View
					style={{
						borderBottomWidth: 1,
						borderBottomColor: '#ccc',
						paddingVertical: 20,
					}}
				>
					{selectedRunner && (
						<>
							<Text style={styles.summaryHeader}>
								Selected Runner
							</Text>
							<Text style={{ fontSize: 18 }}>
								{selectedRunner.name}
							</Text>
							<Text style={{ fontSize: 16, marginTop: 4 }}>
								{selectedRunner?.phoneNumber}
							</Text>
						</>
					)}
				</View>

				<View style={{ paddingVertical: 20 }}>
					<Text style={styles.summaryHeader}>
						Payment Summary
					</Text>
					<View style={styles.paymentRow}>
						<Text style={{ fontSize: 18 }}>
							Order Amount
						</Text>
						<Text style={{ fontSize: 18 }}>
							₦{totalAmount.toLocaleString()}
						</Text>
					</View>
					<View style={styles.paymentRow}>
						<Text style={{ fontSize: 18 }}>Runner Fee</Text>
						<Text style={{ fontSize: 18 }}>
							₦{runnerFee.toLocaleString()}
						</Text>
					</View>
					<View style={styles.paymentRow}>
						<Text style={{ fontSize: 18 }}>
							Service Fee
						</Text>
						<Text style={{ fontSize: 18 }}>
							₦{serviceFee.toLocaleString()}
						</Text>
					</View>
				</View>

				<View style={styles.totalRow}>
					<Text
						style={{ fontSize: 20, fontWeight: 'bold' }}
					>
						Total
					</Text>
					<Text
						style={{ fontSize: 20, fontWeight: 'bold' }}
					>
						₦{finalTotal.toLocaleString()}
					</Text>
				</View>

				{/* Payment Method Section */}
				<View style={{ marginVertical: 20 }}>
					<Text style={styles.summaryHeader}>
						Choose Payment Method
					</Text>
					<View style={styles.paymentMethodContainer}>
						{/* Wallet Payment Option */}
						<TouchableOpacity
							style={[
								styles.paymentMethodButton,
								paymentMethod === 'wallet' &&
									styles.selectedPaymentMethod,
							]}
							onPress={() => setPaymentMethod('wallet')}
						>
							<View
								style={[
									styles.circle,
									paymentMethod === 'wallet' &&
										styles.selectedCircle,
								]}
							>
								{paymentMethod === 'wallet' && (
									<View style={styles.circleInner} />
								)}
							</View>
							<View>
								<Text style={styles.paymentMethodText}>
									Pay from Wallet
								</Text>
								<Text style={{ fontSize: 12, marginLeft: 10 }}>
									Balance: ₦{userWalletBalance.toLocaleString()}
								</Text>
							</View>
						</TouchableOpacity>

						{/* Bank Payment Option */}
						<TouchableOpacity
							style={[
								styles.paymentMethodButton,
								paymentMethod === 'bank' &&
									styles.selectedPaymentMethod,
							]}
							onPress={() => setPaymentMethod('bank')}
						>
							<View
								style={[
									styles.circle,
									paymentMethod === 'bank' &&
										styles.selectedCircle,
								]}
							>
								{paymentMethod === 'bank' && (
									<View style={styles.circleInner} />
								)}
							</View>
							<Text style={styles.paymentMethodText}>
								Pay through Bank
							</Text>
						</TouchableOpacity>
					</View>

					{/* Show insufficient balance warning */}
					{!isWalletSufficient &&
						paymentMethod === 'wallet' && (
							<Text style={{ color: 'red', marginTop: 10 }}>
								Insufficient wallet balance for this
								transaction.
							</Text>
						)}
				</View>

				{/* Full width button at the bottom */}
				<View style={styles.fullWidthButtonContainer}>
					<TouchableOpacity
						style={{
							backgroundColor: '#18a54a',
							paddingVertical: 15,
							borderRadius: 10,
							width: '100%',
							justifyContent: 'center',
							alignItems: 'center',
						}}
						onPress={handleOrderNow}
					>
						<Text style={styles.buttonText}>Order Now</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			<View style={styles.tabBar}>
				<TouchableOpacity
					style={[
						styles.tabButton,
						currentTab === 0 && styles.activeTab,
					]}
					onPress={() => setCurrentTab(0)}
				>
					<Text style={styles.tabButtonText}>
						Order Summary
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.tabButton,
						currentTab === 1 && styles.activeTab,
					]}
					onPress={() => setCurrentTab(1)}
				>
					<Text style={styles.tabButtonText}>
						Errand Runner
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.tabButton,
						currentTab === 2 && styles.activeTab,
					]}
					onPress={() => setCurrentTab(2)}
				>
					<Text style={styles.tabButtonText}>
						Delivery & Payment
					</Text>
				</TouchableOpacity>
			</View>

			{currentTab === 0
				? renderOrderSummary()
				: currentTab === 1
				? renderRunnerSelection()
				: renderDeliveryAndPaymentSummary()}

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
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 16,
		backgroundColor: '#fff',
		paddingTop: 40,
		paddingBottom: 10,
	},
	tabBar: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 16,
		// backgroundColor: '#ccc',
		paddingHorizontal: 0,
	},
	tabButton: {
		paddingVertical: 10,
		paddingHorizontal: 10,
	},
	activeTab: {
		borderBottomWidth: 2,
		borderBottomColor: '#18a54a',
		// backgroundColor: '#000'
	},
	tabButtonText: {
		fontSize: 18,
		color: '#000',
	},
	tabContent: {
		flex: 1,
	},
	cartItem: {
		padding: 10,
		borderWidth: 1,
		borderColor: '#ccc',
		marginBottom: 15,
		borderRadius: 8,
	},
	cartItemName: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 5,
	},
	cartItemPrice: {
		color: '#000',
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'right',
	},
	removeButton: {
		backgroundColor: 'gray',
		padding: 5,
		borderTopRightRadius: 8,
		position: 'absolute',
		top: 0,
		right: 0,
	},
	removeButtonText: {
		color: '#fff',
	},
	totalAmount: {
		fontSize: 22,
		marginVertical: 10,
		textAlign: 'right',
		borderTopWidth: 1,
		paddingVertical: 16,
		borderTopColor: '#ccc',
		fontWeight: 'bold',
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	button: {
		backgroundColor: '#000',
		padding: 15,
		borderRadius: 5,
		width: '48%',
	},
	buttonText: {
		color: '#fff',
		textAlign: 'center',
		fontSize: 20,
	},
	clearCartButton: {
		backgroundColor: 'gray',
	},
	locationInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		// marginBottom: 10,
		borderRadius: 5,
		width: '85%',
	},
	searchButton: {
		backgroundColor: '#000',
		padding: 14,
		borderRadius: 5,
		marginLeft: 5,
	},
	mapContainer: {
		height: 200,
		backgroundColor: '#eaeaea',
		justifyContent: 'center',
		alignItems: 'center',
		marginVertical: 10,
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		width: '100%',
		backgroundColor: '#fff',
		paddingVertical: 20,
		borderRadius: 10,
	},
	modalHeader: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
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
	summaryHeader: {
		fontSize: 18,
		fontWeight: 'bold',
		marginVertical: 5,
		// backgroundColor: '#ccc'
	},
	input: {
		height: 50,
		borderColor: '#ccc',
		borderWidth: 1,
		marginBottom: 16,
		paddingHorizontal: 10,
		borderRadius: 5,
		fontSize: 18,
	},
	runnerOption: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
	},
	// fullWidthButtonContainer: {
	// 	position: 'absolute',
	// 	bottom: 0,
	// 	left: 0,
	// 	right: 0,
	// 	paddingHorizontal: 0,
	// 	paddingBottom: 20,
	// 	width: '100%',
	// },
	paymentRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 5,
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderBottomColor: '#ccc',
		borderBottomWidth: 1,
		paddingBottom: 20,
	},
	paymentMethodContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 10,
	},
	paymentMethodButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 10,
		width: '48%', // for equal width buttons side by side
	},
	selectedPaymentMethod: {
		borderColor: '#18a54a',
	},
	paymentMethodText: {
		fontSize: 16,
		marginLeft: 10,
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
	fullWidthButtonContainer: {
		marginTop: 30,
		width: '100%',
	},
	buttonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
});

export default CheckoutScreen;
