import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import TabView from '@/components/TabView';

const AnalyticsScreen = () => {
	const [isLoading, setIsLoading] = useState(true);
	const [analyticsData, setAnalyticsData] = useState(null);

	// Simulate fetching analytics data from an API
	useEffect(() => {
		// This could be replaced with a real API call
		setTimeout(() => {
			setAnalyticsData({
				totalSales: 12345,
				totalOrders: 478,
				topSellingProducts: [
					{ id: '1', name: 'T-shirt', quantitySold: 300 },
					{ id: '2', name: 'Sneakers', quantitySold: 150 },
					{ id: '3', name: 'Jeans', quantitySold: 120 },
				],
				activeUsers: 142,
			});
			setIsLoading(false);
		}, 1000);
	}, []);

	if (isLoading) {
		return (
			<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
				<ActivityIndicator size="large" color="green" />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View
				style={{
					paddingTop: 10,
					paddingBottom: 16,
					paddingHorizontal: 16,
				    // borderBottomWidth: 1,
                    borderBottomColor: '#ccc',
                }}
			>
				<Text style={{fontSize: 24}}>Orders</Text>
			</View>
			<TabView />
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		paddingTop: 30,
		paddingHorizontal: 0,
	},
});

export default AnalyticsScreen;
