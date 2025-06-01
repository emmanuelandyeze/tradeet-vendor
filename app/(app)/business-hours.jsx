import React, {
	useContext,
	useEffect,
	useState,
} from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	FlatList,
	Switch,
	Platform,
	Alert,
	Button,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import axiosInstance from '@/utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '@/context/AuthContext';

const days = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
];

const BusinessHoursScreen = () => {
	const { userInfo, checkLoginStatus } =
		useContext(AuthContext);
	const [businessData, setBusinessData] = useState(null);
	const [hours, setHours] = useState(
		days.map((day) => ({
			day,
			open: true,
			openTime: new Date(2024, 0, 1, 9, 0), // Default 9:00 AM
			closeTime: new Date(2024, 0, 1, 18, 0), // Default 6:00 PM
		})),
	);

	const businessId = userInfo?._id;

	// Function to get user information
	const getBusinessInfo = async () => {
		try {
			const token = await AsyncStorage.getItem('userToken');
			const response = await axiosInstance.get(
				`/businesses/b/${businessId}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			const fetchedBusiness = response.data.business;
			setBusinessData(fetchedBusiness);

			// Convert backend openingHours data into full Date objects
			const updatedHours = days.map((day) => {
				const dayData =
					fetchedBusiness.openingHours?.[day] || null;
				return {
					day,
					open: dayData !== null, // If null, it's closed
					openTime: dayData
						? new Date(2024, 0, 1, dayData.open, 0) // Convert hour to Date object
						: new Date(2024, 0, 1, 9, 0), // Default to 9 AM if closed
					closeTime: dayData
						? new Date(2024, 0, 1, dayData.close, 0)
						: new Date(2024, 0, 1, 18, 0), // Default to 6 PM if closed
				};
			});

			setHours(updatedHours);
		} catch (error) {
			console.error(
				'Failed to fetch user info:',
				error.response?.data || error,
			);
		}
	};

	useEffect(() => {
		getBusinessInfo();
	}, []);

	const [showPicker, setShowPicker] = useState({
		index: null,
		type: null,
	});

	const toggleOpen = (index) => {
		const updatedHours = [...hours];
		updatedHours[index].open = !updatedHours[index].open;
		setHours(updatedHours);
	};

	const updateTime = (event, selectedTime, index, type) => {
		if (selectedTime) {
			const updatedHours = [...hours];
			updatedHours[index][type] = selectedTime;
			setHours(updatedHours);
		}
		setShowPicker({ index: null, type: null });
	};

	const saveOpeningHours = async () => {
		const formattedHours = {};
		hours.forEach((item) => {
			formattedHours[item.day] = item.open
				? {
						open: item.openTime.getHours(), // Send only the hour (0-23)
						close: item.closeTime.getHours(),
				  }
				: null; // If closed, send null
		});

		try {
			const token = await AsyncStorage.getItem('userToken');
			console.log(
				'Sending payload:',
				JSON.stringify(
					{ openingHours: formattedHours },
					null,
					2,
				),
			); // Debugging

			const response = await axiosInstance.put(
				`/businesses/${businessId}/opening-hours`,
				{ openingHours: formattedHours },
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				},
			);

			console.log('Update successful:', response.data);
			Alert.alert(
				'Success',
				'Business hours updated successfully!',
			);
		} catch (error) {
			console.error(
				'Error updating opening hours:',
				error.response?.data || error,
			);
			Alert.alert(
				'Error',
				'Failed to update business hours. Try again.',
			);
		}
	};

	return (
		<View style={styles.container}>
			<StatusBar style="dark" backgroundColor="#f1f1f1" />
			<View style={styles.header}>
				<View style={styles.headerRow}>
					<TouchableOpacity
						onPress={() => router.push('/(app)/settings')}
					>
						<Ionicons
							name="arrow-back-sharp"
							size={22}
							color="black"
						/>
					</TouchableOpacity>
					<Text style={styles.headerText}>
						Business Hours
					</Text>
				</View>
			</View>
			<View style={{ paddingHorizontal: 16 }}>
				<FlatList
					data={hours}
					keyExtractor={(item) => item.day}
					renderItem={({ item, index }) => (
						<View style={styles.row}>
							<Text style={styles.day}>{item.day}</Text>
							<Switch
								value={item.open}
								onValueChange={() => toggleOpen(index)}
							/>
							{item.open && (
								<View style={styles.timeContainer}>
									<TouchableOpacity
										onPress={() =>
											setShowPicker({
												index,
												type: 'openTime',
											})
										}
									>
										<Text style={styles.timeText}>
											{item.openTime.toLocaleTimeString(
												[],
												{
													hour: '2-digit',
													minute: '2-digit',
												},
											)}
										</Text>
									</TouchableOpacity>
									<Text> - </Text>
									<TouchableOpacity
										onPress={() =>
											setShowPicker({
												index,
												type: 'closeTime',
											})
										}
									>
										<Text style={styles.timeText}>
											{item.closeTime.toLocaleTimeString(
												[],
												{
													hour: '2-digit',
													minute: '2-digit',
												},
											)}
										</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					)}
				/>
			</View>

			{/* Save Button */}
			<View style={styles.buttonContainer}>
				
				<TouchableOpacity
					style={{
						backgroundColor: '#4CAF50',
						paddingHorizontal: 16,
                        borderRadius: 5,
                        paddingVertical: 10
					}}
					onPress={saveOpeningHours}
				>
					<Text style={{textAlign: 'center', fontSize: 16, color: '#fff', fontWeight: 'bold'}}>Save</Text>
				</TouchableOpacity>
			</View>

			{/* Time Picker */}
			{showPicker.index !== null && (
				<DateTimePicker
					value={hours[showPicker.index][showPicker.type]}
					mode="time"
					display={
						Platform.OS === 'ios' ? 'spinner' : 'default'
					}
					onChange={(event, selectedTime) =>
						updateTime(
							event,
							selectedTime,
							showPicker.index,
							showPicker.type,
						)
					}
				/>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		paddingTop: 20,
	},
	header: {
		paddingTop: 25,
		elevation: 3,
		backgroundColor: '#f1f1f1',
		paddingHorizontal: 16,
		paddingBottom: 20,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	headerText: {
		fontSize: 24,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderColor: '#ddd',
	},
	day: {
		fontSize: 16,
		fontWeight: 'bold',
		flex: 1,
	},
	timeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	timeText: {
		fontSize: 16,
		color: 'blue',
		textDecorationLine: 'underline',
	},
	buttonContainer: {
        margin: 16,
        alignItems: 'flex-end'
	},
});

export default BusinessHoursScreen;
