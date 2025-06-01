import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
} from 'react-native';
import React from 'react';
import {
	FontAwesome6,
	MaterialIcons,
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const BusinessActions = () => {
	const router = useRouter();

	return (
		<View style={styles.container}>
			<Text style={styles.sectionTitle}>Quick actions</Text>
			<View
				style={{
					flexDirection: 'row',
					gap: 10,
					marginTop: 10,
				}}
			>
				<TouchableOpacity
					style={[styles.button, styles.createInvoice]}
					onPress={() => router.push('/sales')}
				>
					<MaterialIcons
						name="receipt"
						size={14}
						color="#212121"
					/>
					<Text style={styles.buttonText}>
						Record Sales
					</Text>
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
					<Text style={styles.buttonText}>
						Record expenses
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.button,
						{ backgroundColor: '#E1F5F9', gap: 5 },
					]}
					onPress={() => router.push('/invoices')}
				>
					<MaterialIcons
						name="receipt"
						size={14}
						color="#212121"
					/>
					<Text
						style={[
							styles.buttonText,
							{ color: '#212121', width: '80%', fontSize: 12},
						]}
					>
						Create invoice
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default BusinessActions;

const styles = StyleSheet.create({
	container: {
		// flexDirection: 'row',
		// justifyContent: 'space-between',
		paddingVertical: 16,
		width: '100%',
		backgroundColor: '#fff',
		borderRadius: 10,
		paddingHorizontal: 16,
		elevation: 2,
		marginBottom: 5,
		borderRightWidth: 3,
		borderRightColor: '#fcdbb8',
		borderBottomWidth: 1,
		borderBottomColor: '#fcdbb8',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#3C4043',
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
		gap: 0,
		elevation: 1,
	},
	buttonText: {
		color: '#212121',
		fontSize: 12,
		// marginLeft: 8,
	},

	createInvoice: {
		backgroundColor: '#6BD48A', // Blue
		gap: 3,
		width: '40%',
	},
	updateInventory: {
		backgroundColor: '#FFC4B0', // Red
		gap: 2,
		width: '50%',
		paddingHorizontal: 10,
	},
});
