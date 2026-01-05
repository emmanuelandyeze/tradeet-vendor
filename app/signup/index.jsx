import React from 'react';
import {
	View,
	Text,
	Image,
	TouchableOpacity,
	Linking,
	Dimensions,
} from 'react-native';
import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

const assets = {
	coin: require('@/assets/images/floating_coin.png'),
	arrow: require('@/assets/images/floating_arrow.png'),
	shield: require('@/assets/images/floating_shield.png'),
};

export default function SignupLanding() {
	const handleOpenPrivacy = () => {
		Linking.openURL(
			`https://www.privacypolicies.com/live/294f3b79-c462-4006-ae52-2190057d0ca7`,
		);
	};

	return (
		<View className="flex-1 bg-white justify-between pb-10 relative overflow-hidden">
			<Stack.Screen options={{ headerShown: false }} />
			<StatusBar style="dark" />

			{/* Floating Elements (Background/Decoration) */}
			{/* Top Right - Arrow */}
			<Image
				source={assets.arrow}
				className="absolute opacity-90"
				style={{
					width: 140,
					height: 140,
					top: height * 0.1,
					right: -10,
					transform: [{ rotate: '15deg' }],
				}}
				resizeMode="contain"
			/>

			{/* Middle Left - Shield */}
			<Image
				source={assets.shield}
				className="absolute opacity-80"
				style={{
					width: 110,
					height: 110,
					top: height * 0.54,
					left: -10,
					transform: [{ rotate: '-15deg' }],
				}}
				resizeMode="contain"
			/>

			{/* Bottom Right (above buttons) - Coin */}
			<Image
				source={assets.coin}
				className="absolute opacity-90"
				style={{
					width: 90,
					height: 90,
					bottom: height * 0.24,
					right: 20,
					transform: [{ rotate: '25deg' }],
				}}
				resizeMode="contain"
			/>

			{/* Main Content */}
			<View className="flex-1 justify-center px-8 z-10 pt-10">
				<Text className="text-5xl font-extrabold text-[#1f2937] leading-[1.1] tracking-tight">
					Business{'\n'}Management{'\n'}
					<Text className="text-[#065637]">Made Simple</Text>
				</Text>
				<Text className="text-gray-500 text-lg mt-5 font-medium max-w-[90%] leading-7">
					The all-in-one platform to manage orders, secure finances, and scale your business effortlessly.
				</Text>
			</View>

			{/* Sticky Bottom Actions */}
			<View className="px-8 z-10 gap-4">
				<Link href="/login" asChild>
					<TouchableOpacity className="w-full bg-[#065637] h-[60px] justify-center items-center rounded-2xl shadow-lg shadow-green-900/20 active:opacity-90">
						<Text className="text-white text-xl font-bold tracking-wide">
							Login
						</Text>
					</TouchableOpacity>
				</Link>

				<Link href="/signup/phone-number" asChild>
					<TouchableOpacity className="w-full bg-gray-50 border border-gray-200 h-[60px] justify-center items-center rounded-2xl active:bg-gray-100">
						<Text className="text-[#065637] text-xl font-bold tracking-wide">
							Create Account
						</Text>
					</TouchableOpacity>
				</Link>

				<Text className="text-center text-xs text-gray-400 mt-2 leading-5">
					By continuing, you agree to our{' '}
					<Text
						onPress={handleOpenPrivacy}
						className="text-[#065637] font-semibold underline"
					>
						Terms
					</Text>{' '}
					and{' '}
					<Text
						onPress={handleOpenPrivacy}
						className="text-[#065637] font-semibold underline"
					>
						Privacy Policy
					</Text>.
				</Text>
			</View>
		</View>
	);
}
