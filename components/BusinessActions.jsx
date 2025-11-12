import {
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
} from 'react-native';
import React from 'react';
import {
	FontAwesome6,
	Ionicons,
	MaterialCommunityIcons,
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
					// gap: 10,
					marginTop: 10,
					justifyContent: 'space-between',
					// width: '100%',
				}}
			>
				<TouchableOpacity
					style={styles.buttonContainer}
					onPress={() => router.push('/sales')}
				>
					<View style={styles.button}>
						<MaterialCommunityIcons
							name="sale"
							size={24}
							color="#0C8C5B"
						/>
					</View>
					<Text style={styles.buttonText}>Sales</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.buttonContainer}
					onPress={() => router.push('/expenses')}
				>
					<View style={styles.button}>
						<FontAwesome6
							name="circle-minus"
							size={25}
							color="#0C8C5B"
						/>
					</View>
					<Text style={styles.buttonText}>Expenses</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.buttonContainer}
					onPress={() => router.push('/invoices')}
				>
					<View style={styles.button}>
						<MaterialIcons
							name="receipt"
							size={25}
							color="#0C8C5B"
						/>
					</View>
					<Text style={[styles.buttonText]}>Invoices</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.buttonContainer}
					onPress={() => alert('Customer management coming soon!')}
				>
					<View style={styles.button}>
						<MaterialIcons
							name="people"
							size={25}
							color="#0C8C5B"
						/>
					</View>
					<Text style={[styles.buttonText]}>Customers</Text>
				</TouchableOpacity>
			</View>
			<View
				style={{
					flexDirection: 'row',
					// backgroundColor: '#F5F5F5',
					marginTop: 15,
					justifyContent: 'space-between',
				}}
			>
				<TouchableOpacity
					style={styles.buttonContainer}
					onPress={() => router.push('/delivery')}
				>
					<View style={styles.button}>
						<MaterialCommunityIcons
							name="bike-fast"
							size={25}
							color="#0C8C5B"
						/>
					</View>
					<Text style={styles.buttonText}>Delivery</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.buttonContainer}
					onPress={() => router.push('/(app)/setupstore')}
				>
					<View style={styles.button}>
						<MaterialCommunityIcons
							name="web"
							size={25}
							color="#0C8C5B"
						/>
					</View>
					<Text style={styles.buttonText}>Edit Website</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.buttonContainer}
					onPress={() => router.push('/(app)/discounts')}
				>
					<View style={styles.button}>
						<MaterialIcons
							name="discount"
							size={25}
							color="#0C8C5B"
						/>
					</View>
					<Text style={[styles.buttonText]}>Discounts</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.buttonContainer}
					onPress={() => alert('Marketing coming soon!')}
				>
					<View style={styles.button}>
						<Ionicons
							name="megaphone"
							size={25}
							color="#0C8C5B"
						/>
					</View>
					<Text style={[styles.buttonText]}>Marketing</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default BusinessActions;

const styles = StyleSheet.create({
	container: {
		flexDirection: 'column',
		// justifyContent: 'space-between',
		backgroundColor: '#fff',
		marginTop: 15,
		marginBottom: 5,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#3C4043',
	},
	buttonContainer: {
		// flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'space-between',
		
	},
	button: {
		// flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 8,
		borderRadius: 50,
		marginHorizontal: 0,
		gap: 0,
		// elevation: 1,
		backgroundColor: '#EDFBEF',
		// width: '100%',
		// borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	buttonText: {
		color: '#212121',
		fontSize: 13,
		textAlign: 'center',
		marginTop: 2,
		fontWeight: 'semibold',
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
