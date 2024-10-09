import React, { useRef, useState } from 'react';
import {
	View,
	TextInput,
	Button,
	Text,
	TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import PhoneInput from 'react-native-phone-number-input';

export default function PhoneNumberScreen() {
	const router = useRouter();
	const [phoneNumber, setPhoneNumber] = useState('');
	const phoneInput = useRef();
	const [formattedValue, setFormattedValue] = useState('');

	const handleNext = () => {
		// Navigate to the verification screen with the phone number if needed
		router.push({
			pathname: '/signup/verification',
			params: { phoneNumber }, // Pass the phone number as a parameter if needed
		});
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
					onPress={handleNext}
					className="bg-green-500 my-3 px-4 py-3 rounded-lg"
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
