import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';

const ActiveOrders = ({ onCountChange, ordersData }) => {
	const orders = ordersData?.filter(
		(order) => order.status === 'ongoing',
	);

	// Effect to update the count of active orders
	useEffect(() => {
		onCountChange(orders.length);
	}, [orders]);

	const OrderCard = ({ order }) => {
		return (
			<View style={styles.card}>
				<View style={styles.header}>
					<Text style={styles.orderId}>#{order.id}</Text>
					<Text style={styles.orderTime}>
						{order.orderDetails.orderTime}
					</Text>
				</View>
				<Text style={styles.customerName}>
					{order.customer.name}
				</Text>

				{/* Display order items */}
				<View style={styles.itemsContainer}>
					{order.orderDetails.items.map((item, index) => (
						<Text key={index}>
							{item.name} (x{item.quantity})
						</Text>
					))}
				</View>

				<Text style={{fontSize: 16, fontWeight: 'bold'}}>
					Total: ₦{order.orderDetails.totalAmount}
				</Text>
				

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
				{order.status === 'ongoing' && (
					<View style={styles.actionButtons}>
						<TouchableOpacity style={styles.acceptButton}>
							<Text style={styles.buttonText}>
								Ready for Pickup
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

export default ActiveOrders;
