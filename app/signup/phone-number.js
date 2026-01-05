import React, { useContext, useRef, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import PhoneInput from 'react-native-phone-number-input';
import { AuthContext } from '@/context/AuthContext';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';

export default function PhoneNumberScreen() {
	const router = useRouter();
	const [phoneNumber, setPhoneNumber] = useState('');
	const [formattedValue, setFormattedValue] = useState('');
	const [loading, setLoading] = useState(false);
	const [isValidPhone, setIsValidPhone] = useState(true);

	const phoneInputRef = useRef(null);

	const { verifyPhoneNumber } = useContext(AuthContext);

	const showToast = (type, message) => {
		Toast.show({
			type: type,
			text1: message,
			position: 'top',
			visibilityTime: 3000,
			autoHide: true,
		});
	};

	const handleNext = async () => {
		if (!phoneNumber.trim()) {
			showToast('error', 'Please enter your phone number.');
			return;
		}

		if (phoneInputRef.current && !phoneInputRef.current.isValidNumber(phoneNumber)) {
			setIsValidPhone(false);
			showToast('error', 'The phone number entered is not valid.');
			return;
		}
		setIsValidPhone(true);

		setLoading(true);

		try {
			let phoneNumberToSend = formattedValue;
			const callingCode = phoneInputRef.current?.getCallingCode();

			if (callingCode && formattedValue.startsWith(`+${callingCode}`)) {
				phoneNumberToSend = formattedValue.substring(`+${callingCode}`.length);
			} else if (formattedValue.startsWith('+234')) {
				phoneNumberToSend = formattedValue.substring(4);
			}

			if (phoneNumberToSend.startsWith('0')) {
				phoneNumberToSend = phoneNumberToSend.substring(1);
			}

			const response = await verifyPhoneNumber(phoneNumberToSend);

			if (response && response.message === 'Verification code sent via WhatsApp') {
				showToast('success', `Verification code sent to ${formattedValue}.`);
				router.push({
					pathname: '/signup/verification',
					params: { phoneNumber: phoneNumberToSend },
				});
			} else {
				const errorMessage = response?.message || 'Failed to send verification code.';
				showToast('error', errorMessage);
			}
		} catch (error) {
			console.error('Error verifying phone number:', error);
			showToast('error', 'An unexpected error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			className="flex-1 bg-white"
		>
			<StatusBar style="dark" />
			<Stack.Screen options={{ headerShown: false }} />

			<ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
				<View className="mb-10">
					<Text className="text-4xl font-extrabold text-[#065637] mb-2">Get Started</Text>
					<Text className="text-gray-500 text-lg">Enter your WhatsApp number to verify your account.</Text>
				</View>

				{/* Phone Input */}
				<View className="mb-8">
					<Text className="text-gray-700 font-semibold mb-2 ml-1">WhatsApp Number</Text>
					<View className={`border rounded-xl overflow-hidden ${!isValidPhone ? 'border-red-500' : 'border-gray-200'} bg-gray-50 h-[60px] justify-center`}>
						<PhoneInput
							ref={phoneInputRef}
							defaultValue={phoneNumber}
							defaultCode="NG"
							layout="second"
							onChangeText={(text) => {
								setPhoneNumber(text);
								if (phoneInputRef.current) {
									setIsValidPhone(phoneInputRef.current.isValidNumber(text));
								}
							}}
							onChangeFormattedText={(text) => setFormattedValue(text)}
							containerStyle={{ width: '100%', backgroundColor: 'transparent' }}
							textContainerStyle={{ backgroundColor: 'transparent', paddingVertical: 0 }}
							textInputStyle={{ fontSize: 16, color: '#1f2937', height: 50 }}
							codeTextStyle={{ fontSize: 16, color: '#1f2937' }}
							flagButtonStyle={{ width: 50 }}
							autoFocus
						/>
					</View>
					{!isValidPhone && <Text className="text-red-500 text-xs mt-1 ml-1">Please enter a valid phone number</Text>}
				</View>

				{/* Action Button */}
				<TouchableOpacity
					onPress={handleNext}
					disabled={loading}
					className={`bg-[#065637] h-[60px] rounded-xl justify-center items-center shadow-lg shadow-green-900/20 active:opacity-90 ${loading ? 'opacity-70' : ''}`}
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text className="text-white text-lg font-bold">Send Code</Text>
					)}
				</TouchableOpacity>

				<View className="mt-8 flex-row justify-center">
					<Text className="text-gray-400 text-sm text-center px-6">
						By continuing, you will receive a verification code on WhatsApp.
					</Text>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
