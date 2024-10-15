import React, { useState, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	PanResponder,
	Animated,
} from 'react-native';
import ActiveOrders from './ActiveOrders';
import NewRequests from './NewRequests';
import CompletedOrders from './CompletedOrders';

const TabView = () => {
	const [activeTab, setActiveTab] = useState('newRequests'); // Initial tab
	const [activeOrdersCount, setActiveOrdersCount] =
		useState(0);
	const [newRequestsCount, setNewRequestsCount] =
		useState(0);
	const [completedOrdersCount, setCompletedOrdersCount] =
		useState(0);

	const handleActiveOrdersCountChange = (count) => {
		setActiveOrdersCount(count);
	};

	const handleNewRequestsCountChange = (count) => {
		setNewRequestsCount(count);
	};

	const handleCompletedOrdersCountChange = (count) => {
		setCompletedOrdersCount(count);
	};

	const pan = useRef(new Animated.Value(0)).current;

	const ordersData = [
		{
			id: 'order-001',
			customer: {
				name: 'John Doe',
				contact: '+2348123456789',
			},
			orderDetails: {
				items: [
					{
						name: 'Chicken Burger',
						quantity: 1,
						specialRequest: 'Extra cheese',
					},
					{
						name: 'Fries',
						quantity: 2,
						specialRequest: '',
					},
				],
				totalAmount: 1500, // in Naira
				orderTime: '2024-10-13 12:30:00',
				paymentMethod: 'Wallet', // or 'Bank'
			},
			deliveryInfo: {
				pickupLocation:
					'Restaurant Name, Block A, Yabatech',
				deliveryAddress: 'Hostel B, Yabatech',
				deliveryFee: 300,
			},
			errandRunner: {
				name: 'Jane Smith',
				contact: '+2348112233445',
			},
			status: 'new', // could be 'new', 'ongoing', 'completed'
			actions: {
				acceptOrder: true, // shows the 'Accept' button if true
				rejectOrder: true, // shows the 'Reject' button if true
			},
			paymentStatus: 'Pending', // could be 'Pending' or 'Confirmed'
		},
		{
			id: 'order-002',
			customer: {
				name: 'Sarah James',
				contact: '+2348012345678',
			},
			orderDetails: {
				items: [
					{
						name: 'Pizza',
						quantity: 1,
						specialRequest: 'No onions',
					},
				],
				totalAmount: 2000,
				orderTime: '2024-10-13 11:45:00',
				paymentMethod: 'Bank',
			},
			deliveryInfo: {
				pickupLocation: 'Pizza Hut, Block B, Yabatech',
				deliveryAddress: 'Hostel C, Yabatech',
				deliveryFee: 400,
			},
			errandRunner: {
				name: 'Emeka John',
				contact: '+2347012345678',
			},
			status: 'ongoing', // could be 'new', 'ongoing', 'completed'
			orderStatus: 'Out for Delivery', // e.g. 'Preparing', 'Ready for Pickup', 'Out for Delivery'
			eta: '15 minutes', // estimated time of arrival or completion
			actions: {
				acceptOrder: false, // no action buttons in 'ongoing'
				rejectOrder: false,
			},
			paymentStatus: 'Confirmed', // could be 'Pending' or 'Confirmed'
		},
		{
			id: 'order-003',
			customer: {
				name: 'Michael Johnson',
				contact: '+2347012345678',
			},
			orderDetails: {
				items: [
					{
						name: 'Shawarma',
						quantity: 1,
						specialRequest: '',
					},
					{
						name: 'Soda',
						quantity: 2,
						specialRequest: 'Chilled',
					},
				],
				totalAmount: 1800,
				orderTime: '2024-10-12 14:00:00',
				paymentMethod: 'Wallet',
			},
			deliveryInfo: {
				pickupLocation:
					'Shawarma Palace, Block D, Yabatech',
				deliveryAddress: 'Hostel D, Yabatech',
				deliveryFee: 300,
			},
			errandRunner: {
				name: 'Peter Obi',
				contact: '+2348098765432',
			},
			status: 'completed', // could be 'new', 'ongoing', 'completed'
			completionTime: '2024-10-12 14:45:00',
			feedback: {
				rating: 4, // optional rating from the customer (out of 5)
				comment: 'Great service, fast delivery!',
			},
			actions: {
				acceptOrder: false,
				rejectOrder: false,
			},
			paymentStatus: 'Confirmed',
		},
	];

	// PanResponder to handle swipes
	const panResponder = useRef(
		PanResponder.create({
			onMoveShouldSetPanResponder: (evt, gestureState) => {
				const { dx } = gestureState;
				return Math.abs(dx) > 20; // Detect swipe if more than 20px movement
			},
			onPanResponderMove: (evt, gestureState) => {
				const { dx } = gestureState;
				pan.setValue(dx); // Track the swipe movement
			},
			onPanResponderRelease: (evt, gestureState) => {
				const { dx } = gestureState;

				if (dx < -50) {
					// Swipe Left: Move to next tab
					if (activeTab === 'newRequests') {
						setActiveTab('activeOrders');
					} else if (activeTab === 'activeOrders') {
						setActiveTab('completedOrders');
					}
				} else if (dx > 50) {
					// Swipe Right: Move to previous tab
					if (activeTab === 'completedOrders') {
						setActiveTab('activeOrders');
					} else if (activeTab === 'activeOrders') {
						setActiveTab('newRequests');
					}
				}

				// Reset the pan value
				Animated.spring(pan, {
					toValue: 0,
					useNativeDriver: false,
				}).start();
			},
		}),
	).current;

	const translateX = pan.interpolate({
		inputRange: [-200, 0, 200],
		outputRange: [200, 0, -200],
		extrapolate: 'clamp',
	});

	return (
		<View style={styles.container}>
			<View style={styles.tabContainer}>
				<TouchableOpacity
					style={[
						styles.tabButton,
						activeTab === 'newRequests' && styles.activeTab,
					]}
					onPress={() => setActiveTab('newRequests')}
				>
					<Text style={styles.tabText}>
						New ({newRequestsCount})
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.tabButton,
						activeTab === 'activeOrders' &&
							styles.activeTab,
					]}
					onPress={() => setActiveTab('activeOrders')}
				>
					<Text style={styles.tabText}>
						On-going ({activeOrdersCount})
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.tabButton,
						activeTab === 'completedOrders' &&
							styles.activeTab,
					]}
					onPress={() => setActiveTab('completedOrders')}
				>
					<Text style={styles.tabText}>
						Completed ({completedOrdersCount})
					</Text>
				</TouchableOpacity>
			</View>

			<Animated.View
				// {...panResponder.panHandlers} // Attach PanResponder
				style={[
					styles.contentContainer,
					{ transform: [{ translateX }] },
				]}
			>
				{activeTab === 'activeOrders' ? (
					<ActiveOrders
						onCountChange={handleActiveOrdersCountChange}
						ordersData={ordersData}
					/>
				) : activeTab === 'newRequests' ? (
					<NewRequests
							onCountChange={handleNewRequestsCountChange}
							ordersData={ordersData}
					/>
				) : (
					<CompletedOrders
								onCountChange={handleCompletedOrdersCountChange}
								ordersData={ordersData}
					/>
				)}
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f1f1f1',
	},
	tabContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		backgroundColor: '#fff',
		elevation: 2,
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#ccc',
	},
	tabButton: {
		flex: 1,
		padding: 16,
		alignItems: 'center',
	},
	activeTab: {
		borderBottomWidth: 3,
		borderBottomColor: '#27D367',
	},
	tabText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#000',
	},
	contentContainer: {
		flex: 1,
		paddingHorizontal: 10,
		backgroundColor: '#fff',
	},
});

export default TabView;
