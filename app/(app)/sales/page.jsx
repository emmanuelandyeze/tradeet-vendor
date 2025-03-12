import {
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import axiosInstance from '@/utils/axiosInstance';
import { AuthContext } from '@/context/AuthContext';

const page = () => {
	const { userInfo, checkLoginStatus } =
		useContext(AuthContext);
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState('in progress');
	const [filteredOrders, setFilteredOrders] =
        useState(orders);
    

	const fetchOrders = async () => {
		try {
			const response = await axiosInstance.get(
				`/orders/store/${userInfo?._id}`,
			);
			// Reverse the fetched orders so that the newest orders are at the top
			setOrders(response.data.reverse());
			setLoading(false);
		} catch (err) {
			console.log(err.message || 'Error fetching orders');
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOrders();
	}, []);

    const ordersData = orders;
    
	const filterOrders = () => {
		if (filter === 'in progress') {
			setFilteredOrders(
				ordersData?.filter(
					(order) =>
						order.status === 'pending' ||
						order.status === 'accepted',
				),
			);
		} else {
			setFilteredOrders(
				ordersData?.filter(
					(order) => order.status === filter,
				),
			);
		}
    };
    
	return (
		<View>
			{/* Order Management */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>
					Sales Management
				</Text>
				<View style={styles.filterContainer}>
					<TouchableOpacity
						style={[
							styles.filterButton,
							filter === 'in progress' &&
								styles.activeFilterButton,
						]}
						onPress={() => setFilter('in progress')}
					>
						<Text style={styles.filterText}>
							In Progress ({ongoingOrders?.length})
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.filterButton,
							filter === 'completed' &&
								styles.activeFilterButton,
						]}
						onPress={() => setFilter('completed')}
					>
						<Text style={styles.filterText}>
							Completed ({completedOrders?.length})
						</Text>
					</TouchableOpacity>
				</View>
				<FlatList
					data={filteredOrders}
					keyExtractor={(item) => item._id}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={styles.orderRow}
							onPress={() =>
								router.push(`/(app)/orders/${item._id}`)
							}
						>
							<Text style={styles.orderText}>
								Order #{item.orderNumber}
							</Text>
							<View style={styles.headerRight}>
								<View
									style={{
										display: 'flex',
										flexDirection: 'row',
										gap: 5,
										alignItems: 'center',
										backgroundColor:
											item.payment.status !== 'completed'
												? '#FF7043'
												: 'green',
										paddingHorizontal: 10,
										borderRadius: 15,
										paddingVertical: 5,
									}}
								>
									<Text
										style={{
											fontSize: 10,
											color:
												item.payment.status !== 'completed'
													? 'white'
													: 'white',

											textTransform: 'capitalize',
										}}
									>
										{item?.payment?.status !== 'completed'
											? 'Not paid'
											: 'Paid'}
									</Text>
								</View>
								<View
									style={{
										display: 'flex',
										flexDirection: 'row',
										gap: 5,
										alignItems: 'center',
										backgroundColor:
											item.status === 'completed'
												? 'green'
												: '#FFEDB3',
										paddingHorizontal: 10,
										borderRadius: 15,
										paddingVertical: 5,
									}}
								>
									<Text
										style={{
											fontSize: 10,
											color:
												item.status === 'completed'
													? '#fff'
													: '#121212',
											textTransform: 'capitalize',
										}}
									>
										{item?.status}
									</Text>
								</View>
							</View>
						</TouchableOpacity>
					)}
					ListEmptyComponent={
						<View
							style={{
								justifyContent: 'center',
								height: 50,
							}}
						>
							<Text
								style={{
									textAlign: 'center',
									fontSize: 14,
								}}
							>
								No active orders
							</Text>
						</View>
					}
				/>
			</View>
		</View>
	);
};

export default page;

const styles = StyleSheet.create({});
