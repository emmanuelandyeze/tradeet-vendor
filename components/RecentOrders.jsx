// components/RecentOrders.jsx
import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SkeletonLoader from './SkeletonLoader';
import OrderFilterDropdown from './OrderFilterDropdown';

const formatOrderDate = (dateString) => {
	if (!dateString) return '';
	const date = new Date(dateString);
	const day = String(date.getDate()).padStart(2, '0');
	const monthNames = [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
	];
	const month = monthNames[date.getMonth()];
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${day} ${month}, ${hours}:${minutes}`;
};

const RecentOrders = ({
	orders,
	loading,
	filter,
	onFilterSelect,
}) => {
	const router = useRouter();

	if (loading) {
		return (
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>Recent Orders</Text>
				</View>
				<SkeletonLoader />
				<SkeletonLoader />
				<SkeletonLoader />
			</View>
		);
	}

	if (!orders || orders.length === 0) {
		return (
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>Recent Orders</Text>
					<OrderFilterDropdown
						selectedOption={filter}
						onSelect={onFilterSelect}
					/>
				</View>
				<View style={styles.emptyState}>
					<View style={styles.emptyIconCircle}>
						<Ionicons name="cart-outline" size={32} color="#9CA3AF" />
					</View>
					<Text style={styles.emptyText}>No orders found</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Recent Orders</Text>
				<OrderFilterDropdown
					selectedOption={filter}
					onSelect={onFilterSelect}
				/>
			</View>

			<View>
				{orders.slice(0, 5).map((item) => {
					// Status Badge Logic
					const isDelivered = item.status === 'delivered';
					const isCancelled = item.status === 'cancelled';
					const badgeBg = isDelivered ? '#ECFDF5' : isCancelled ? '#FEF2F2' : '#EFF6FF';
					const badgeColor = isDelivered ? '#059669' : isCancelled ? '#DC2626' : '#2563EB';

					return (
						<TouchableOpacity
							key={item._id}
							style={styles.orderItem}
							onPress={() =>
								router.push({
									pathname: '/(app)/orders/[id]',
									params: { id: item._id },
								})
							}
							activeOpacity={0.7}
						>
							<View style={styles.row}>
								{/* Left: Info */}
								<View style={{ flex: 1 }}>
									<View style={styles.topRow}>
										<Text style={styles.customerName}>
											{item.customerName || 'Guest'}
										</Text>
										<View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
											<Text style={[styles.statusText, { color: badgeColor }]}>
												{item.status}
											</Text>
										</View>
									</View>
									<Text style={styles.orderId}>#{item._id.slice(-6)} • {formatOrderDate(item.createdAt)}</Text>
								</View>

								{/* Right: Amount */}
								<View style={{ alignItems: 'flex-end', justifyContent:'center' }}>
									<Text style={styles.amount}>₦{item.totalAmount.toLocaleString()}</Text>
									<Text 
										style={[
											styles.paymentStatus, 
											{ color: item.payment.status === 'paid' ? '#059669' : '#D97706' }
										]}
									>
										{item.payment.status}
									</Text>
								</View>
							</View>
						</TouchableOpacity>
					);
				})}
			</View>

			{orders.length > 5 && (
				<TouchableOpacity
					style={styles.viewMoreBtn}
					onPress={() => router.push('/(app)/(tabs)/orders')}
				>
					<Text style={styles.viewMoreText}>View All Orders</Text>
					<Ionicons name="arrow-forward" size={14} color="#065637" />
				</TouchableOpacity>
			)}
		</View>
	);
};

export default RecentOrders;

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	orderItem: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 4,
	},
	customerName: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1F2937',
	},
	orderId: {
		fontSize: 12,
		color: '#6B7280',
	},
	statusBadge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	statusText: {
		fontSize: 10,
		fontWeight: '600',
		textTransform: 'uppercase',
	},
	amount: {
		fontSize: 15,
		fontWeight: '700',
		color: '#111827',
	},
	paymentStatus: {
		fontSize: 11,
		fontWeight: '500',
		textTransform: 'capitalize',
		marginTop: 2,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	emptyIconCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#F3F4F6',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 12,
	},
	emptyText: {
		color: '#6B7280',
		fontWeight: '500',
	},
	viewMoreBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 16,
		gap: 6,
	},
	viewMoreText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#065637',
	},
});
