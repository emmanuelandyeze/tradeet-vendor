// components/BusinessActions.jsx
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Alert,
	Dimensions,
} from 'react-native';
import React from 'react';
import {
	FontAwesome6,
	Ionicons,
	MaterialCommunityIcons,
	MaterialIcons,
	Feather,
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const ACTIONS = [
	{
		id: 'sales',
		label: 'Sales',
		icon: 'sale',
		lib: MaterialCommunityIcons,
		route: '/sales',
		color: '#065637',
	},
	{
		id: 'expenses',
		label: 'Expenses',
		icon: 'circle-minus',
		lib: FontAwesome6,
		route: '/expenses',
		color: '#B91C1C', // distinct color for expense
	},
	{
		id: 'invoices',
		label: 'Invoices',
		icon: 'receipt',
		lib: MaterialIcons,
		route: '/invoices',
		color: '#065637',
	},
	{
		id: 'msg',
		label: 'Customers',
		icon: 'users',
		lib: Feather,
		action: () => Alert.alert('Coming Soon', 'Customer management is on the way!'),
		color: '#065637',
	},
	{
		id: 'delivery',
		label: 'Delivery',
		icon: 'bike-fast',
		lib: MaterialCommunityIcons,
		route: '/delivery',
		color: '#065637',
	},
	{
		id: 'website',
		label: 'Website',
		icon: 'web',
		lib: MaterialCommunityIcons,
		route: '/(app)/setupstore',
		color: '#065637',
	},
	{
		id: 'discounts',
		label: 'Discounts',
		icon: 'discount',
		lib: MaterialIcons,
		route: '/(app)/discounts',
		color: '#065637',
	},
	{
		id: 'marketing',
		label: 'Marketing',
		icon: 'megaphone-outline',
		lib: Ionicons,
		action: () => Alert.alert('Coming Soon', 'Marketing tools are coming soon!'),
		color: '#065637',
	},
];

const BusinessActions = () => {
	const router = useRouter();

	const handlePress = (item) => {
		if (item.action) {
			item.action();
		} else if (item.route) {
			router.push(item.route);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.sectionTitle}>Quick Actions</Text>
			<View style={styles.grid}>
				{ACTIONS.map((item) => {
					const IconLib = item.lib;
					return (
						<TouchableOpacity
							key={item.id}
							style={styles.actionItem}
							onPress={() => handlePress(item)}
							activeOpacity={0.7}
						>
							<View style={[styles.iconBox, { backgroundColor: '#F9FAFB' }]}>
								<IconLib name={item.icon} size={22} color="#374151" />
							</View>
							<Text style={styles.actionLabel} numberOfLines={1}>
								{item.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
};

export default BusinessActions;

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		// Shadow for professional feel
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 16,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		rowGap: 20,
	},
	actionItem: {
		width: '23%', // 4 items per row
		alignItems: 'center',
		gap: 8,
	},
	iconBox: {
		width: 48,
		height: 48,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#F3F4F6',
	},
	actionLabel: {
		fontSize: 11,
		fontWeight: '600',
		color: '#4B5563',
		textAlign: 'center',
	},
});
