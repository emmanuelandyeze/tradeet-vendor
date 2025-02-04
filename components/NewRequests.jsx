import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import formatDateTime from '@/utils/formatTime';
import axiosInstance from '@/utils/axiosInstance';
import socket from '@/utils/socket';

const NewRequests = ({
	onCountChange,
	ordersData,
	sendPushNotification,
}) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const newRequests = ordersData?.filter(
		(order) => order.status === 'pending',
	);

	const handleAcceptOrder = async (order) => {
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
				    `Your order has been accepted by ${order?.storeId?.name}.`,
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

	const handleRejectOrder = async (order) => {
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

	const OrderCard = ({ order }) => {
		return (
			<View style={styles.card}>
				<View style={styles.header}>
					<Text style={styles.orderId}>
						#{order?.orderNumber}{' '}
						{order?.customerInfo?.name}
					</Text>
					<Text style={styles.orderTime}>
						{formatDateTime(order?.updatedAt)}
					</Text>
				</View>

				{/* Display order items */}
				<View style={styles.itemsContainer}>
					{order?.items?.map((item, index) => (
						<View key={index}>
							{item?.variants?.map((variant, index) => (
								<Text style={{ fontSize: 14 }} key={index}>
									{variant.name} (x{variant.quantity})
								</Text>
							))}
							{item?.addOns?.map((addon, index) => (
								<Text style={{ fontSize: 14 }} key={index}>
									{addon.name} (x{addon.quantity})
								</Text>
							))}
						</View>
					))}
				</View>

				{/* Conditionally show ETA or feedback */}
				{order.status === 'ongoing' && (
					<Text>ETA: {order.eta}</Text>
				)}
				{order.status === 'completed' && order.feedback && (
					<Text>
						Feedback: {order.feedback.rating}⭐ -{' '}
						{order.feedback.comment}
					</Text>
				)}

				{/* Show action buttons for New Orders */}
				{order.status === 'pending' && (
					<View style={styles.actionButtons}>
						<TouchableOpacity
							onPress={() => handleRejectOrder(order)}
							style={styles.rejectButton}
						>
							<Text style={styles.buttonText}>
								{loading ? '...' : 'Reject'}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => handleAcceptOrder(order)}
							style={styles.acceptButton}
						>
							<Text style={styles.buttonText}>
								{loading ? '...' : 'Accept'}
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		);
	};
	return (
		<View style={styles.container}>
			{/* <Text style={styles.header}>New Requests</Text> */}
			<FlatList
				data={newRequests}
				keyExtractor={(item) => item._id}
				renderItem={({ item }) => (
					<OrderCard order={item} />
				)}
				ListEmptyComponent={
					<View
						style={{
							flex: 1,
							justifyContent: 'center',
							alignItems: 'center',
							minHeight: 600,
						}}
					>
						<Text style={{ fontSize: 22 }}>
							No new requests at the moment.
						</Text>
					</View>
				}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	card: {
		backgroundColor: '#fff',
		padding: 16,
		// borderRadius: 8,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	orderId: {
		fontWeight: 'bold',
		fontSize: 16,
	},
	orderTime: {
		fontSize: 14,
		color: '#888',
	},
	customerName: {
		fontSize: 16,
		marginBottom: 8,
	},
	itemsContainer: {
		marginBottom: 8,
	},
	actionButtons: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 8,
		alignItems: 'center',
		gap: 10,
	},
	acceptButton: {
		backgroundColor: 'green',
		padding: 10,
		borderRadius: 4,
	},
	rejectButton: {
		backgroundColor: 'red',
		padding: 10,
		borderRadius: 4,
	},
	buttonText: {
		color: '#fff',
	},
	statusIndicator: {
		marginTop: 8,
		padding: 8,
		borderRadius: 4,
		textAlign: 'center',
	},
	statusText: {
		fontWeight: 'bold',
		textAlign: 'center',
		color: '#fff',
	},
	newStatus: {
		backgroundColor: 'orange',
	},
	ongoingStatus: {
		backgroundColor: 'blue',
	},
	completedStatus: {
		backgroundColor: 'green',
	},
});

export default NewRequests;
