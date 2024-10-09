import React, { useState } from 'react';
import {
	View,
	TextInput,
	Button,
	Text,
	TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function NamePasswordScreen() {
	const router = useRouter();
	const [name, setName] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] =
		useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] =
		useState(false);

	const handleNext = () => {
		if (password === confirmPassword) {
			// Navigate to the select campus screen
			router.push('/signup/select-campus');
		} else {
			alert('Passwords do not match');
		}
	};

	return (
		<View className="flex-1 justify-center px-10">
			<Text className="text-4xl mb-2 font-bold">
				Just some more details
			</Text>
			{/* <Text className="text-4xl mb-2 font-bold">
				Personal information
			</Text> */}
			<Text className="text-lg mb-5">
				Help us secure your account
			</Text>
			<View className="flex flex-col gap-5">
				<TextInput
					value={name}
					onChangeText={setName}
					className="border-b text-xl border-gray-300 mb-4"
					placeholder="Name"
				/>

				{/* Password Input */}
				<View className="flex-row items-center mb-4 border-b border-gray-300">
					<TextInput
						value={password}
						onChangeText={setPassword}
						secureTextEntry={!showPassword}
						className="flex-1 text-xl"
						placeholder="Password"
					/>
					<TouchableOpacity
						onPress={() => setShowPassword(!showPassword)}
						className="ml-2"
					>
						<Text className="text-xl">
							{showPassword ? 'Hide' : 'Show'}
						</Text>
					</TouchableOpacity>
				</View>

				{/* Confirm Password Input */}
				<View className="flex-row items-center mb-4 border-b border-gray-300">
					<TextInput
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						secureTextEntry={!showConfirmPassword}
						className="flex-1 text-xl"
						placeholder="Confirm Password"
					/>
					<TouchableOpacity
						onPress={() =>
							setShowConfirmPassword(!showConfirmPassword)
						}
						className="ml-2"
					>
						<Text className="text-xl">
							{showConfirmPassword ? 'Hide' : 'Show'}
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			<TouchableOpacity
				onPress={handleNext}
				className="bg-green-500 mt-8 mb-3 py-3 rounded-lg"
			>
				<Text className="text-white text-center text-xl font-semibold">
					Continue
				</Text>
			</TouchableOpacity>
		</View>
	);
}
