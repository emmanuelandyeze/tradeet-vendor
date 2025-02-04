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
import formatDateTime from '@/utils/formatTime';
import { useRouter } from 'expo-router';

const CompletedOrders = ({ onCountChange, ordersData }) => {
	const router = useRouter()
	const completed = ordersData?.filter(
		(order) => order.status === 'completed', 
	);

	// Effect to update the count of new requests
	useEffect(() => {
		onCountChange(completed.length);
	}, [completed]);

	const OrderCard = ({ order }) => {
		return (
			<TouchableOpacity
				onPress={() =>
					router.push(`/(app)/orders/${order._id}`)
				}
				style={styles.card}
			>
				<View style={styles.header}>
					<Text style={styles.orderId}>
						#{order?.orderNumber}{' '}
						{order?.customerInfo?.name}
					</Text>
					<Text style={styles.orderTime}>
						{formatDateTime(order?.updatedAt)}
					</Text>
				</View>

				{/* Display order items
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
				</View> */}

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
			</TouchableOpacity>
		);
	};

	return (
		<View style={styles.container}>
			{/* <Text style={styles.header}>New Requests</Text> */}
			<FlatList
				data={completed}
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
							No completed orders at the moment.
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
		borderBottomWidth: .5,
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
		justifyContent: 'space-between',
		marginTop: 8,
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

export default CompletedOrders;
