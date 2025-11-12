import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import HomeScreen from '@/components/HomeScreen';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '@/context/AuthContext';

export default function Page() {
	const { userInfo, selectedStore, setSelectedStore } =
		useContext(AuthContext);

	return (
		<View className="flex-1 w-full bg-white">
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			<HomeScreen
				userInfo={userInfo}
				selectedStore={selectedStore}
				setSelectedStore={setSelectedStore}
			/>
		</View>
	);
}
