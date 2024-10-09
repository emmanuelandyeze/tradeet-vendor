import React, { useState } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Image,
	Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function ServiceScreen() {
	const router = useRouter();
	const [interestedService, setInterestedService] =
		useState('');

	const services = [
		{
			id: '1',
			name: 'Food Ordering',
			image: require('../../assets/splash1.png'), // Add your image paths here
		},
		{
			id: '2',
			name: 'Services',
			image: require('../../assets/splash2.png'), // Add your image paths here
		},
		{
			id: '3',
			name: 'Errands',
			image: require('../../assets/splash3.png'), // Add your image paths here
		},
	];

	const handleServiceSelect = (service) => {
		setInterestedService(service);
	};

	const handleSubmit = () => {
		Alert.alert(
			'Sign-up Completed!',
			`Selected service: ${interestedService}`,
		);
		// Optionally, navigate to a confirmation or home screen
	};

	return (
		<View className="flex-1 justify-center px-4 py-6">
			<Text className="text-3xl font-bold mb-5">
				Select a Service You Are Interested In
			</Text>

			<FlatList
				data={services}
				numColumns={2} // Display in a grid with 2 columns
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<TouchableOpacity
						onPress={() => handleServiceSelect(item.name)}
						className={`m-2 p-2 border bg-red-300  rounded-lg ${
							interestedService === item.name
								? 'border-blue-500'
								: 'border-gray-300'
						}`}
					>
						{/* <Image
							source={item.image}
							style={{
								width: '100%',
								resizeMode: 'cover',
							}}
						/> */}
						<Text className="text-center text-lg font-semibold mt-2">
							{item.name}
						</Text>
					</TouchableOpacity>
				)}
			/>

			<View className="flex flex-row justify-end items-end mt-6">
				<TouchableOpacity
					onPress={handleSubmit}
					className="bg-green-500 px-4 py-3 rounded-lg"
				>
					<Text className="text-white text-center text-xl font-semibold">
						Submit
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
