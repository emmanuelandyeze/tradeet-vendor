import React, { useState, useRef, useEffect } from 'react';
import {
	View,
	Text,
	ImageBackground,
	TouchableOpacity,
	ScrollView,
	Dimensions,
	TextInput,
	Button,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function Login() {
	const router = useRouter();
	const navigation = useNavigation();

	// Hide header
	useEffect(() => {
		navigation.setOptions({ headerShown: false });
	}, [navigation]);

	const handleLogin = () => {
		// Handle login logic here
		console.log('Login pressed');
		router.push('(tabs)');
	};

	return (
		<View className="flex-1 justify-center px-10">
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			<Text className="text-4xl mb-5 font-bold">Login</Text>
			<View className="flex flex-col gap-2 text-lg">
				<TextInput
					className="border-b border-gray-300 mb-4"
					placeholder="Phone number"
					keyboardType="numeric"
				/>
				<TextInput
					className="border-b border-gray-300 mb-4"
					placeholder="Password"
					secureTextEntry
				/>
			</View>
			<View className="flex flex-row justify-end items-end">
				<TouchableOpacity
					onPress={() => router.push('/forgot-password')}
					className=""
				>
					<Text className="text-green-500 text-center text-lg">
						Forgot password?
					</Text>
				</TouchableOpacity>
			</View>
			<TouchableOpacity
				onPress={handleLogin}
				className="bg-green-500 mt-8 mb-3 py-3 rounded-lg"
			>
				<Text className="text-white text-center text-xl font-semibold">
					Login
				</Text>
			</TouchableOpacity>

			<View className="flex flex-row justify-center items-center gap-1">
				<Text className="text-lg">
					Don't have an account?{' '}
				</Text>
				<TouchableOpacity
					onPress={() =>
						router.push('/signup/phone-number')
					}
					className=""
				>
					<Text className="text-green-500 text-center text-lg">
						Sign up now
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
