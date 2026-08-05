// components/BusinessActions.jsx
import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
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

/**
 * 8 Core Quick Actions arranged in 2 symmetrical rows of 4:
 * Row 1 (Financial Operations): Sales, Invoices, Expenses, Debt Book
 * Row 2 (Customer & Growth): Customers, Discounts, Delivery, Website
 */
const ACTIONS = [
	// Row 1: Financial Operations
	{
		id: 'sales',
		label: 'Sales',
		icon: 'sale',
		lib: MaterialCommunityIcons,
		route: '/sales',
		color: '#065637',
		bgColor: '#E6F4EA',
	},
	{
		id: 'invoices',
		label: 'Invoices',
		icon: 'receipt',
		lib: MaterialIcons,
		route: '/invoices',
		color: '#1D4ED8',
		bgColor: '#EFF6FF',
	},
	{
		id: 'expenses',
		label: 'Expenses',
		icon: 'circle-minus',
		lib: FontAwesome6,
		route: '/expenses',
		color: '#B91C1C',
		bgColor: '#FEF2F2',
	},
	{
		id: 'debtors',
		label: 'Debt Book',
		icon: 'book-open-variant',
		lib: MaterialCommunityIcons,
		route: '/(app)/debtors',
		color: '#D97706',
		bgColor: '#FFFBEB',
	},

	// Row 2: Store Operations & Growth
	{
		id: 'msg',
		label: 'Customers',
		icon: 'users',
		lib: Feather,
		route: '/(app)/customers',
		color: '#7C3AED',
		bgColor: '#F3E8FF',
	},
	{
		id: 'discounts',
		label: 'Discounts',
		icon: 'discount',
		lib: MaterialIcons,
		route: '/(app)/discounts',
		color: '#4F46E5',
		bgColor: '#EEF2FF',
	},
	{
		id: 'delivery',
		label: 'Delivery',
		icon: 'bike-fast',
		lib: MaterialCommunityIcons,
		route: '/delivery',
		color: '#C2410C',
		bgColor: '#FFF7ED',
	},
	{
		id: 'website',
		label: 'Website',
		icon: 'web',
		lib: MaterialCommunityIcons,
		route: '/(app)/setupstore',
		color: '#0D9488',
		bgColor: '#F0FDFA',
	},
];

const BusinessActions = () => {
	const router = useRouter();

	const handlePress = (item) => {
		if (item.route) {
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
							activeOpacity={0.75}
						>
							<View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
								<IconLib name={item.icon} size={22} color={item.color} />
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
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#F1F5F9',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
		elevation: 1,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0F172A',
		marginBottom: 16,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		rowGap: 18,
	},
	actionItem: {
		width: '23%', // Exactly 4 items per row
		alignItems: 'center',
		gap: 6,
	},
	iconBox: {
		width: 48,
		height: 48,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
	},
	actionLabel: {
		fontSize: 11,
		fontWeight: '700',
		color: '#334155',
		textAlign: 'center',
	},
});
