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
		
			<TouchableOpacity
				style={[styles.button, styles.createInvoice]}
				onPress={() => router.push('/invoices')}
			>
				<MaterialIcons
					name="receipt"
					size={14}
					color="#212121"
				/>
				<Text style={styles.buttonText}>Invoices</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.button, styles.updateInventory]}
				onPress={() => router.push('/expenses')}
			>
				<FontAwesome6
					name="circle-minus"
					size={14}
					color="#212121"
				/>
				<Text style={styles.buttonText}>Expenses</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[
					styles.button,
					{ backgroundColor: '#E1F5F9', gap: 8 },
				]}
				onPress={() => router.push('/transfer')}
			>
				<FontAwesome6
					name="paper-plane"
					size={14}
					color="#212121"
				/>
				<Text style={[styles.buttonText, {color: '#212121'}]}>Transfer</Text>
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
		width: '40%',
	},
	buttonText: {
		color: '#212121',
		fontSize: 14,
		// marginLeft: 8,
	},

	createInvoice: {
		backgroundColor: '#6BD48A', // Blue
		gap: 8,
	},
	updateInventory: {
		backgroundColor: '#FFC4B0', // Red
		gap: 8,
	},
});
