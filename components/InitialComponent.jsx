// ExampleComponent.js
import React, { useContext } from 'react';
import { Slot, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import LoadingScreen from './LoadingScreen';

const InitialComponent = () => {
    // const { isLoading, user } = useContext(AuthContext);
    const isLoading = true

	if (isLoading) {
		return <LoadingScreen />; // Show a loading message
	}

	return (
		<View>
			{/* <StatusBar
				backgroundColor="#000"
				style="light"
				translucent={true}
			/> */}
			{/* Conditionally render based on login status */}
			{!user ? (
				<Slot />
			) : (
				<Slot /> // Render tabs or main app route if logged in
			)}
		</View>
	);
};

export default InitialComponent;
