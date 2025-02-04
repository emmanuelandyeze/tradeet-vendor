import React, { useState } from 'react';
import {
	Image,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
// Adjust the import path as needed
import Header from '@/components/Header';
import HomeScreen from '@/components/HomeScreen';
import NewRequests from '@/components/NewRequests';
import AntDesign from '@expo/vector-icons/AntDesign';
import { StatusBar } from 'expo-status-bar';

export default function Page() {
	const [isOnline, setIsOnline] = useState(true);
	return (
		<View className="flex-1 w-full bg-white">
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			{/* Header */}
			{/* <View>
				<Header
					profileImage="https://res.cloudinary.com/dkhoomk9a/image/upload/v1725260302/u07x55tbyv1bohgmc309.png"
					campus="Yabatech"
					onSearch={(text) => console.log(text)}
					name="Bengee Foods"
					isOnline={isOnline}
					setIsOnline={setIsOnline}
				/>
			</View> */}
			<HomeScreen />
			
		</View>
	);
}
