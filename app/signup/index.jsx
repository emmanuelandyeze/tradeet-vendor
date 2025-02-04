import React, { useEffect } from 'react';
import {
	View,
	Text,
	Image,
	TouchableOpacity,
	Dimensions,
	Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// Images with their sources
const images = [
	{
		id: 1,
		src: require('@/assets/images/adaptive-icon.png'),
	}
];

export default function SplashScreen() {
	const router = useRouter();
	const navigation = useNavigation();

	// Hide header
	useEffect(() => {
		navigation.setOptions({ headerShown: false });
	}, [navigation]);

	const handleOpenPrivacy = () => {
		Linking.openURL(
			`https://www.privacypolicies.com/live/294f3b79-c462-4006-ae52-2190057d0ca7`,
		); // Replace with your desired website URL
	};

	return (
		<View className="flex-1 justify-center items-center bg-white">
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			{/* Top Half: Images in a triangular format */}
			<View
				// style={{ height: height * 0.4 }}
				className="items-center justify-center pt-10"
			>
				<Image
					source={images[0].src}
					style={{
						width: width, // Increased image size
						height: 450,
						resizeMode: 'contain',
					}}
				/>
			</View>

			{/* Bottom Half: Display text and buttons */}
			<View
				// style={{ height: height * 0.5 }}
				className="px-6 py-4 justify-center items-center"
			>
				<View
					style={{ width: '100%' }}
					className="items-center justify-center pb-10"
				>
					<Text className="text-center text-4xl font-semibold mb-4">
						Grow Your Business with Ease.
					</Text>
					<Text className="text-center text-2xl text-gray-500">
						Manage orders, finances and customers
						effortlessly on the go.
					</Text>
				</View>

				{/* Bottom Section: Buttons */}
				<View className="w-full px-2">
					<TouchableOpacity
						onPress={() => router.push('/login')}
						className="border border-slate-700 py-3 rounded-lg mb-4"
					>
						<Text className="text-slate-700 text-center text-lg">
							Login
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() =>
							router.push('/signup/phone-number')
						}
						className="bg-green-500 py-3 rounded-lg"
					>
						<Text className="text-white text-center text-lg">
							Sign Up
						</Text>
					</TouchableOpacity>
					<Text className="text-center mt-3">
						By clicking login or sign up, you agree to our{' '}
						<Text
							onPress={handleOpenPrivacy}
							className="text-blue-600"
						>
							Terms of Service
						</Text>{' '}
						and{' '}
						<Text
							onPress={handleOpenPrivacy}
							className="text-blue-600"
						>
							Privacy Policy
						</Text>
						.
					</Text>
				</View>
			</View>
		</View>
	);
}
