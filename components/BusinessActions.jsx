import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
} from 'react-native';
import React from 'react';
import { FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BusinessActions = () => {
    const router = useRouter()

	return (
		<View style={styles.container}>
			{/* <TouchableOpacity
				style={[styles.button, styles.recordSales]}
				onPress={() => router.push('/invoices')}
			>
				<FontAwesome6
					name="naira-sign"
					size={12}
					color="#fff"
				/>
				<Text style={styles.buttonText}>Record Sales</Text>
			</TouchableOpacity> */}
			<TouchableOpacity
				style={[styles.button, styles.createInvoice]}
				onPress={() => router.push('/invoices')}
			>
				<MaterialIcons
					name="receipt"
					size={14}
					color="#fff"
				/>
				<Text style={styles.buttonText}>
					Create Invoice
				</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.button, styles.updateInventory]}
				onPress={() => router.push('/expenses')}
			>
				<FontAwesome6
					name="circle-minus"
					size={14}
					color="#fff"
				/>
				<Text style={styles.buttonText}>
					Record Expenses
				</Text>
			</TouchableOpacity>
		</View>
	);
};

export default BusinessActions;

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 16,
		width: '100%',
	},
	button: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 5,
		borderRadius: 5,
		marginHorizontal: 5,
		gap: 3,
		width: '40%'
	},
	buttonText: {
		color: '#fff',
		fontSize: 14,
		// marginLeft: 8,
	},
	recordSales: {
		backgroundColor: '#4CAF50', // Green
	},
	createInvoice: {
		backgroundColor: '#2196F3', // Blue
	},
	updateInventory: {
		backgroundColor: '#E80022', // Red
		// paddingHorizontal: 14,
	},
});
