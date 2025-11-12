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
		src: require('@/assets/images/landing.png'),
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
		<View className="flex-1 justify-center items-center bg-[#fcdbb8]">
			<StatusBar
				backgroundColor="#fcdbb8"
				style="dark"
				translucent={true}
			/>
			{/* Top Half: Images in a triangular format */}
			<View
				// style={{ height: height * 0.4 }}
				className="items-center justify-center pt-10"
				style={{
					width: '85%', // Increased image size
					// height: height * 0.4,
					overflow: 'hidden',
					borderWidth: 1,
					borderColor: '#fcdbb8',
					borderRadius: 10,
					marginBottom: 20,
				}}
			>
				<Image
					source={images[0].src}
					style={{
						width: '100%', // Increased image size
						height: 400,
						resizeMode: 'cover',
						borderRadius: 10,
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
						className="border border-slate-700 py-4 rounded-lg mb-4"
					>
						<Text className="text-slate-700 text-center text-[1.3rem]">
							Login
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() =>
							router.push('/signup/phone-number')
						}
						className="bg-[#065637] py-4 rounded-lg"
					>
						<Text className="text-white text-center text-[1.3rem]">
							Sign Up
						</Text>
					</TouchableOpacity>
					<Text className="text-center mt-3 text-[1.2rem]">
						By clicking login or sign up, you agree to our{' '}
						<Text
							onPress={handleOpenPrivacy}
							className="text-[#000] font-bold underline"
						>
							Terms of Service
						</Text>{' '}
						and{' '}
						<Text
							onPress={handleOpenPrivacy}
							className="text-[#000] font-bold underline"
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
