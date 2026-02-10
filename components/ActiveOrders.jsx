import axiosInstance from '@/utils/axiosInstance';
import formatDateTime from '@/utils/formatTime';
import socket from '@/utils/socket';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';

const ActiveOrders = ({ onCountChange, ordersData, sendPushNotification }) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const orders = ordersData?.filter(
		(order) => order.status === 'accepted',
	);

	const handleCompleteOrder = async (order) => {
		setLoading(true); // Start loading

		try {
			const response = await axiosInstance.put(
				`/orders/v/${order?._id}/complete`,
				{
					storeId: order?.storeId._id,
				},
			);


			if (response.data.order) {

				sendPushNotification(
					order?.customerInfo?.expoPushToken,
					'Order update',
					`Your order has been marked as delivered.`,
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
			console.error('Error in handleConfirmOrder:', err);
			setError(err.message || 'Error confirming order');
		} finally {
			setLoading(false); // Always stop loading
		}
	};

	// Effect to update the count of active orders
	useEffect(() => {
		onCountChange(orders.length);
	}, [orders]);

	const OrderCard = ({ order }) => {
		return (
			<View style={styles.card}>
				<View style={styles.header}>
					<View>
						<Text style={styles.orderId}>
							#{order?.orderNumber}{' '}
						</Text>
						<Text style={styles.orderId}>
							{order?.customerInfo?.name}
						</Text>
					</View>
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
							{item?.selectedOptions?.map((opt, index) => (
								<Text style={{ fontSize: 14 }} key={`opt-${index}`}>
									{opt.group ? `${opt.group}: ` : ''}{opt.name} {opt.price > 0 ? `(+₦${opt.price})` : ''}
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
				{order.status === 'accepted' &&
					!order.runnerInfo?.runnerId && (
						<View style={styles.actionButtons}>
							<TouchableOpacity
								onPress={() => handleCompleteOrder(order)}
								style={styles.acceptButton}
							>
								<Text style={styles.buttonText}>
									Mark as Delivered
								</Text>
							</TouchableOpacity>
						</View>
					)}
			</View>
		);
	};

	return (
		<View style={styles.container}>
			{/* <Text style={styles.header}>Active Orders</Text> */}
			<FlatList
				data={orders}
				keyExtractor={(item) => item.id}
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
							No active orders at the moment.
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
		// marginBottom: 16,
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowRadius: 4,
		// elevation: 2,
		borderBottomWidth: 0.5,
		borderColor: '#ccc',
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

export default ActiveOrders;
