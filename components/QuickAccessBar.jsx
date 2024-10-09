import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function QuickAccessBar ({ navigation }) {
	return (
		<View className="flex-row justify-around items-center bg-white py-4 border-t border-gray-200">
			<TouchableOpacity
				onPress={() => navigation.navigate('Home')}
			>
				<Text className="text-gray-700">Home</Text>
			</TouchableOpacity>
			<TouchableOpacity
				onPress={() => navigation.navigate('Search')}
			>
				<Text className="text-gray-700">Search</Text>
			</TouchableOpacity>
			<TouchableOpacity
				onPress={() => navigation.navigate('Orders')}
			>
				<Text className="text-gray-700">Orders</Text>
			</TouchableOpacity>
			<TouchableOpacity
				onPress={() => navigation.navigate('Profile')}
			>
				<Text className="text-gray-700">Profile</Text>
			</TouchableOpacity>
		</View>
	);
};
