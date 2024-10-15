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
import TabView from '@/components/TabView';
import NewRequests from '@/components/NewRequests';
import AntDesign from '@expo/vector-icons/AntDesign';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
	const [isOnline, setIsOnline] = useState(true);
	return (
		<View className="flex-1 w-full bg-white">
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			{/* Header */}
			<View>
				<Header
					profileImage="https://res.cloudinary.com/dkhoomk9a/image/upload/v1725260302/u07x55tbyv1bohgmc309.png"
					campus="Yabatech"
					onSearch={(text) => console.log(text)}
					name="Bengee Foods"
					isOnline={isOnline}
					setIsOnline={setIsOnline}
				/>
			</View>

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingHorizontal: 0 }}
			>
				<TabView />
			</ScrollView>

			{/* <TouchableOpacity
				style={{
					backgroundColor: '#101010',
					width: 50,
					height: 50,
					display: 'flex',
					justifyContent: 'center',
					flexDirection: 'column',
					alignItems: 'center',
					borderRadius: 50,
					position: 'absolute',
					bottom: 20,
					right: 20,
				}}
			>
				<AntDesign
					name="customerservice"
					size={28}
					color="white"
				/>
			</TouchableOpacity> */}
		</View>
	);
}
