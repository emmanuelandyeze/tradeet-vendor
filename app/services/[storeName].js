import {
	useLocalSearchParams,
	useRouter,
} from 'expo-router';
import React, { useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	TextInput,
	Textarea,
	Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const ServiceRequestScreen = () => {
	const { storeName, storeLink } = useLocalSearchParams();
	const router = useRouter();
	const serviceProvider = {
		providerName: 'Sparkle Laundry',
		openingHours: '9:00 AM - 6:00 PM',
		estimatedDeliveryTime: '2 hours',
		serviceType: 'Laundry',
		services: [
			{ id: 1, name: 'Wash Only', price: 100 },
			{ id: 2, name: 'Wash and Iron', price: 300 },
			{ id: 3, name: 'Suits', price: 2000 },
			{ id: 4, name: 'Bed Spread', price: 1000 },
		],
	};

	const [selectedServices, setSelectedServices] = useState(
		{},
	);
	const [totalPrice, setTotalPrice] = useState(0);
	const [specialInstructions, setSpecialInstructions] =
		useState('');
	const [pickupDate, setPickupDate] = useState(new Date());
	const [showDatePicker, setShowDatePicker] =
		useState(false);
	const [showTimePicker, setShowTimePicker] =
		useState(false);

	const handleQuantityChange = (serviceId, quantity) => {
		const service = serviceProvider.services.find(
			(s) => s.id === serviceId,
		);
		const updatedServices = {
			...selectedServices,
			[serviceId]: quantity,
		};
		setSelectedServices(updatedServices);

		// Calculate total price
		const newTotal = Object.entries(updatedServices).reduce(
			(sum, [id, qty]) => {
				const service = serviceProvider.services.find(
					(s) => s.id === parseInt(id),
				);
				return sum + service.price * qty;
			},
			0,
		);
		setTotalPrice(newTotal);
	};

	const onDateChange = (event, selectedDate) => {
		const currentDate = selectedDate || pickupDate;
		setShowDatePicker(Platform.OS === 'ios');
		setPickupDate(currentDate);
	};

	const onTimeChange = (event, selectedTime) => {
		const currentTime = selectedTime || pickupDate;
		setShowTimePicker(Platform.OS === 'ios');
		setPickupDate(currentTime);
	};

	return (
		<View style={styles.container}>
			<Text style={styles.providerName}>{storeName}</Text>
			<View style={styles.infoRow}>
				<Text style={styles.details}>
					Opening Hours: {serviceProvider.openingHours}
				</Text>
				<Text style={styles.details}>
					Estimated Delivery Time:{' '}
					{serviceProvider.estimatedDeliveryTime}
				</Text>
			</View>

			{serviceProvider.services.map((service) => (
				<View key={service.id} style={styles.serviceItem}>
					<Text style={styles.serviceName}>
						{service.name} - ₦{service.price}
					</Text>
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						placeholder="Qty"
						onChangeText={(value) =>
							handleQuantityChange(
								service.id,
								parseInt(value) || 0,
							)
						}
					/>
				</View>
			))}

			<View style={styles.textAreaContainer}>
				<TextInput
					style={styles.textArea}
					multiline={true}
					numberOfLines={4}
					placeholder="Special Instructions"
					value={specialInstructions}
					onChangeText={(text) =>
						setSpecialInstructions(text)
					}
				/>
			</View>

			{/* Date Picker */}
			<View style={styles.dateTimeContainer}>
				<TouchableOpacity
					style={styles.dateTimeButton}
					onPress={() => setShowDatePicker(true)}
				>
					<Text style={styles.dateTimeText}>
						Select Pickup Date: {pickupDate.toDateString()}
					</Text>
				</TouchableOpacity>
				{showDatePicker && (
					<DateTimePicker
						value={pickupDate}
						mode="date"
						display="default"
						onChange={onDateChange}
					/>
				)}
			</View>

			{/* Time Picker */}
			<View style={styles.dateTimeContainer}>
				<TouchableOpacity
					style={styles.dateTimeButton}
					onPress={() => setShowTimePicker(true)}
				>
					<Text style={styles.dateTimeText}>
						Select Pickup Time:{' '}
						{pickupDate.toLocaleTimeString()}
					</Text>
				</TouchableOpacity>
				{showTimePicker && (
					<DateTimePicker
						value={pickupDate}
						mode="time"
						display="default"
						onChange={onTimeChange}
					/>
				)}
			</View>

			<View style={styles.totalContainer}>
				<Text style={styles.totalText}>
					Total Price: ₦{totalPrice}
				</Text>
			</View>

			<TouchableOpacity style={styles.submitButton}>
				<Text style={styles.submitButtonText}>
					Submit Request
				</Text>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 20,
		backgroundColor: '#fff',
		paddingVertical: 40,
	},
	providerName: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	details: {
		fontSize: 14,
		marginBottom: 5,
	},
	serviceItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginVertical: 10,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
	},
	serviceName: {
		fontSize: 18,
	},
	input: {
		width: 60,
		height: 40,
		borderColor: '#ccc',
		borderWidth: 1,
		borderRadius: 5,
		textAlign: 'center',
	},
	textAreaContainer: {
		marginTop: 20,
	},
	textArea: {
		height: 100,
		borderColor: '#ccc',
		borderWidth: 1,
		borderRadius: 5,
		padding: 10,
		textAlignVertical: 'top',
	},
	dateTimeContainer: {
		marginTop: 20,
	},
	dateTimeButton: {
		backgroundColor: '#007bff',
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderRadius: 5,
	},
	dateTimeText: {
		color: '#fff',
		fontSize: 16,
	},
	totalContainer: {
		marginTop: 20,
	},
	totalText: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	submitButton: {
		marginTop: 30,
		backgroundColor: '#007bff',
		paddingVertical: 15,
		borderRadius: 5,
	},
	submitButtonText: {
		color: '#fff',
		textAlign: 'center',
		fontSize: 18,
		fontWeight: 'bold',
	},
});

export default ServiceRequestScreen;
