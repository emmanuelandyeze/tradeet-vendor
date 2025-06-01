import React, { useContext, useRef, useState } from 'react';
import {
	View,
	TextInput,
	Button,
	Text,
	TouchableOpacity,
	ToastAndroid,
} from 'react-native';
import { useRouter } from 'expo-router';
import PhoneInput from 'react-native-phone-number-input';
import { AuthContext } from '@/context/AuthContext';

export default function PhoneNumberScreen() {
	const router = useRouter();
	const [phoneNumber, setPhoneNumber] = useState('');
	const phoneInput = useRef();
	const [formattedValue, setFormattedValue] = useState('');
	const { verifyPhoneNumber } = useContext(AuthContext);

	const handleNext = async () => {
		// Validate phone number format here
		if (!phoneNumber) {
			ToastAndroid.show(
				'Please enter a valid phone number.',
				ToastAndroid.SHORT,
			);
			return;
		}

		try {
			const response = await verifyPhoneNumber(phoneNumber);
			console.log(response);

			if (
				response.message ===
				'Verification code sent via WhatsApp'
			) {
				ToastAndroid.show(
					`Code sent to ${phoneNumber}`,
					ToastAndroid.SHORT,
				);
				router.push({
					pathname: '/signup/verification',
					params: { phoneNumber },
				});
			} else {
				ToastAndroid.show(
					response.message,
					ToastAndroid.SHORT,
				);
			}
		} catch (error) {
			ToastAndroid.show(
				'An error occurred. Please try again.',
				ToastAndroid.SHORT,
			);
			console.error('Error verifying phone number:', error);
		}
	};

	return (
		<View className="flex-1 justify-center px-5">
			<Text className="text-3xl font-bold mb-5">
				Enter WhatsApp Number
			</Text>
			<Text className="text-lg">
				We would send a verification code to this number to
				verify that the number is accurate.
			</Text>
			<View className="w-full my-5">
				<PhoneInput
					ref={phoneInput}
					defaultValue={phoneNumber}
					defaultCode="NG"
					layout="first"
					onChangeText={(text) => {
						setPhoneNumber(text);
					}}
					onChangeFormattedText={(text) => {
						setFormattedValue(text);
					}}
					// withDarkTheme
					textContainerStyle={{ width: '110%' }}
					textInputStyle={{ fontSize: 16 }}
					containerStyle={{
						backgroundColor: '#f1f2f6',
						width: '100%',
						borderRadius: 10,
						border: 2,
					}}
					// withShadow
					autoFocus
				/>
			</View>
			<View className="flex flex-row justify-end items-end">
				<TouchableOpacity
					onPress={() => handleNext()}
					className="bg-[#065637] my-3 px-4 py-4 rounded-lg"
				>
					<Text className="text-white text-center text-xl font-semibold">
						Send Code
					</Text>
				</TouchableOpacity>
			</View>

			{/* <Button title="Next" onPress={handleNext} /> */}
		</View>
	);
}
