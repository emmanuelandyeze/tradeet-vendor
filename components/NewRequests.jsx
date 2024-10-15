import React, { useEffect } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const NewRequests = ({ onCountChange, ordersData }) => {
	const newRequests = ordersData?.filter(
		(order) => order.status === 'new',
	);

	// Effect to update the count of new requests
	useEffect(() => {
		onCountChange(newRequests.length);
	}, [newRequests]);

	const OrderCard = ({ order }) => {
		return (
			<View style={styles.card}>
				<View style={styles.header}>
					<Text style={styles.orderId}>#{order?.id}</Text>
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

				<Text>
					Total: ₦{order.orderDetails.totalAmount}
				</Text>
				{/* <Text>
					Delivery: {order.deliveryInfo.address} (₦
					{order.deliveryInfo.fee})
				</Text> */}
				<Text>
					Payment: {order.orderDetails.paymentMethod}
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
				{order.status === 'new' && (
					<View style={styles.actionButtons}>
						<TouchableOpacity style={styles.rejectButton}>
							<Text style={styles.buttonText}>Reject</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.acceptButton}>
							<Text style={styles.buttonText}>Accept</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* <View
					style={[
						styles.statusIndicator,
						styles[`${order.status}Status`],
					]}
				>
					<Text style={styles.statusText}>
						{order.status.toUpperCase()}
					</Text>
				</View> */}
			</View>
		);
	};
	return (
		<View style={styles.container}>
			{/* <Text style={styles.header}>New Requests</Text> */}
			<FlatList
				data={newRequests}
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
		gap: 10
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
