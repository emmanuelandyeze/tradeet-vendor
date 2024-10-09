import React, { useEffect } from 'react';
import {
	View,
	Text,
	Image,
	TouchableOpacity,
	Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// Images with their sources
const images = [
	{
		id: 1,
		src: require('../assets/splash1.png'),
	},
	{
		id: 2,
		src: require('../assets/splash2.png'),
	},
	{
		id: 3,
		src: require('../assets/splash3.png'),
	},
];

export default function SplashScreen() {
	const router = useRouter();
	const navigation = useNavigation();

	// Hide header
	useEffect(() => {
		navigation.setOptions({ headerShown: false });
	}, [navigation]);

	return (
		<View className="flex-1 justify-center items-center bg-white">
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			{/* Top Half: Images in a triangular format */}
			<View
				style={{ height: height * 0.4 }}
				className="items-center justify-center pt-40"
			>
				<View
					style={{
						width: width * 0.8, // Increased size for larger images
						height: width * 0.8, // Larger container
						flexDirection: 'row',
						flexWrap: 'wrap',
					}}
				>
					{/* Top Image */}
					<View
						style={{
							width: width * 0.5, // Increased size for larger image
							height: width * 0.5, // Increased size for larger image
							justifyContent: 'center',
							alignItems: 'center',
							position: 'absolute',
							top: 0,
						}}
					>
						<Image
							source={images[0].src}
							style={{
								width: width * 0.35, // Increased image size
								height: width * 0.35,
								resizeMode: 'contain',
							}}
						/>
					</View>

					{/* Bottom Left Image */}
					<View
						style={{
							width: width * 0.5,
							height: width * 0.5,
							justifyContent: 'center',
							alignItems: 'center',
							position: 'absolute',
							bottom: 0,
							left: 0,
						}}
					>
						<Image
							source={images[1].src}
							style={{
								width: width * 0.35,
								height: width * 0.35,
								resizeMode: 'contain',
							}}
						/>
					</View>

					{/* Bottom Right Image */}
					<View
						style={{
							width: width * 0.5,
							height: width * 0.5,
							justifyContent: 'center',
							alignItems: 'center',
							position: 'absolute',
							bottom: 0,
							right: 0,
						}}
					>
						<Image
							source={images[2].src}
							style={{
								width: width * 0.35,
								height: width * 0.35,
								resizeMode: 'contain',
							}}
						/>
					</View>
				</View>
			</View>

			{/* Bottom Half: Display text and buttons */}
			<View
				style={{ height: height * 0.5 }}
				className="px-6 py-4 justify-center items-center"
			>
				<View className="items-center justify-center">
					<Text className="text-center text-4xl font-semibold mb-4">
						Your Campus, Your Way!
					</Text>
					<Text className="text-center text-xl text-gray-500">
						Discover services, order deliveries, and get
						things done faster with Tradeet Campus.
						{/* Personalize your experience by choosing the best
						vendors for your needs! */}
					</Text>
				</View>

				{/* Bottom Section: Buttons */}
				<View className="absolute bottom-2 w-full px-6">
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
						<Text className="text-blue-600">
							Terms of Service
						</Text>{' '}
						and{' '}
						<Text className="text-blue-600">
							Privacy Policy
						</Text>
						.
					</Text>
				</View>
			</View>
		</View>
	);
}
