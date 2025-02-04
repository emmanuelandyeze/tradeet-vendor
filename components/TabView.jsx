import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	PanResponder,
	Animated,
	ScrollView,
	RefreshControl,
} from 'react-native';
import ActiveOrders from './ActiveOrders';
import NewRequests from './NewRequests';
import CompletedOrders from './CompletedOrders';
import socket from '@/utils/socket'
import axiosInstance from '@/utils/axiosInstance';
import { AuthContext } from '@/context/AuthContext';

const TabView = () => {
	const { userInfo, checkLoginStatus, sendPushNotification } =
		useContext(AuthContext);
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

	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false); 
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		// Ensure socket connection is re-established
		socket.connect();

		// Cleanup: disconnect the socket when the component unmounts
		return () => {
			socket.disconnect();
		};
	}, []);

	const fetchOrders = async () => {
		try {
			const response = await axiosInstance.get(
				`/orders/store/${userInfo?._id}`,
			);
			setOrders(response.data);
			setLoading(false);
		} catch (err) {
			setError(err.message || 'Error fetching orders');
			setLoading(false);
		}
	};


	useEffect(() => {
		

		fetchOrders();

		const handleOrderUpdate = (updatedOrder) => {
			setOrders((prevOrders) =>
				prevOrders.map((order) =>
					order._id === updatedOrder._id
						? updatedOrder
						: order,
				),
			);
		};

		const handleNewOrder = (newOrder) => {
			setOrders((prevOrders) => [newOrder, ...prevOrders]);
		};

		const handleDeleteOrder = (orderId) => {
			setOrders((prevOrders) =>
				prevOrders.filter((order) => order._id !== orderId),
			);
		};

		socket.on('orderUpdate', handleOrderUpdate);
		socket.on('newOrder', handleNewOrder); 
		socket.on('deleteOrder', handleDeleteOrder);

		// Cleanup function
		return () => {
			socket.off('orderUpdate', handleOrderUpdate);
			socket.off('newOrder', handleNewOrder);
			socket.off('deleteOrder', handleDeleteOrder);
		};
	}, []);

	const ordersData = orders;

	const newRequests = ordersData?.filter(
		(order) => order.status === 'pending',
	);

	const ongoingOrders = ordersData?.filter(
		(order) => order.status === 'accepted',
	);

	const completedOrders = ordersData?.filter(
		(order) => order.status === 'completed',
	);

	// Effect to update the count of new requests
	useEffect(() => {
		setNewRequestsCount(newRequests?.length);
		setActiveOrdersCount(ongoingOrders?.length);
		setCompletedOrdersCount(completedOrders?.length);
	}, [newRequests, ongoingOrders]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchOrders();
		setTimeout(() => {
			setRefreshing(false);
		}, 3000);
	}, []);


	return (
		<ScrollView
			style={styles.container}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={onRefresh}
				/>
			}
		>
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
					// { transform: [{ translateX }] },
				]}
			>
				{activeTab === 'activeOrders' ? (
					<ActiveOrders
						onCountChange={handleActiveOrdersCountChange}
						ordersData={ordersData}
						sendPushNotification={sendPushNotification}
					/>
				) : activeTab === 'newRequests' ? (
					<NewRequests
						onCountChange={handleNewRequestsCountChange}
						ordersData={ordersData}
						sendPushNotification={sendPushNotification}
					/>
				) : (
					<CompletedOrders
						onCountChange={handleCompletedOrdersCountChange}
						ordersData={ordersData}
					/>
				)}
			</Animated.View>
		</ScrollView> 
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		// backgroundColor: '#f1f1f1',
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
