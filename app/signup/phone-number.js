import React, { useContext, useRef, useState } from 'react';
import {
	View,
	TextInput, // Kept in case you decide to use it, but PhoneInput handles the input
	Text,
	TouchableOpacity,
	ActivityIndicator, // Import ActivityIndicator for loading state
} from 'react-native';
import { useRouter } from 'expo-router';
import PhoneInput from 'react-native-phone-number-input';
import { AuthContext } from '@/context/AuthContext';
import Toast from 'react-native-toast-message'; // Import Toast for better UX

export default function PhoneNumberScreen() {
	const router = useRouter();
	const [phoneNumber, setPhoneNumber] = useState(''); // Stores the raw number (e.g., "8012345678")
	const [formattedValue, setFormattedValue] = useState(''); // Stores the formatted number (e.g., "+2348012345678")
	const [loading, setLoading] = useState(false); // State for loading indicator
	const [isValidPhone, setIsValidPhone] = useState(false); // State for phone number validation status

	const phoneInputRef = useRef(null); // Renamed for clarity from 'phoneInput'

	const { verifyPhoneNumber } = useContext(AuthContext);

	// Centralized toast function for consistent feedback
	const showToast = (type, message) => {
		Toast.show({
			type: type, // 'success', 'error', 'info'
			text1: message,
			position: 'top', // Typically better for alerts
			visibilityTime: 3000,
			autoHide: true,
		});
	};

	const handleNext = async () => {
		// Client-side validation: Check if input is empty
		if (!phoneNumber.trim()) {
			showToast('error', 'Please enter your phone number.');
			return;
		}

		// Client-side validation: Check if the phone number format is valid
		if (
			phoneInputRef.current &&
			!phoneInputRef.current.isValidNumber(phoneNumber)
		) {
			showToast(
				'error',
				'The phone number entered is not valid.',
			);
			return;
		}

		setLoading(true); // Start loading

		try {
			let phoneNumberToSend = formattedValue;
			const callingCode =
				phoneInputRef.current?.getCallingCode();

			if (
				callingCode &&
				formattedValue.startsWith(`+${callingCode}`)
			) {
				phoneNumberToSend = formattedValue.substring(
					`+${callingCode}`.length,
				);
			} else if (formattedValue.startsWith('+234')) {
				phoneNumberToSend = formattedValue.substring(4); // Remove "+234"
			}

			// Important for Nigerian numbers: remove leading '0' if present after removing country code
			if (phoneNumberToSend.startsWith('0')) {
				phoneNumberToSend = phoneNumberToSend.substring(1);
			}

			const response = await verifyPhoneNumber(
				phoneNumberToSend,
			); // Use the cleaned number

			if (
				response &&
				response.message ===
					'Verification code sent via WhatsApp'
			) {
				showToast(
					'success',
					`Verification code sent to ${formattedValue}.`,
				); // Show full number to user
				router.push({
					pathname: '/signup/verification',
					params: { phoneNumber: phoneNumberToSend }, // Pass the cleaned number to verification screen
				});
			} else {
				// If backend sends a specific error message
				const errorMessage =
					response?.message ||
					'Failed to send verification code. Please try again.';
				showToast('error', errorMessage);
			}
		} catch (error) {
			console.error('Error verifying phone number:', error);
			showToast(
				'error',
				'An unexpected error occurred. Please try again.',
			);
		} finally {
			setLoading(false); // End loading
		}
	};

	return (
		<View className="flex-1 justify-center px-5 bg-white">
			<Text className="text-3xl font-bold mb-5 text-gray-800">
				Enter WhatsApp Number
			</Text>
			<Text className="text-lg text-gray-700 mb-5">
				We will send a verification code to this number via
				WhatsApp to ensure it's accurate.
			</Text>

			<View className="w-full my-5">
				<PhoneInput
					ref={phoneInputRef}
					defaultValue={phoneNumber}
					defaultCode="NG" // Assuming Nigeria is the primary country
					layout="first" // Layout for country code and input
					onChangeText={(text) => {
						setPhoneNumber(text);
						// Validate instantly as user types
						if (phoneInputRef.current) {
							setIsValidPhone(
								phoneInputRef.current.isValidNumber(text),
							);
						}
					}}
					onChangeFormattedText={(text) => {
						setFormattedValue(text);
					}}
					containerStyle={{
						backgroundColor: '#f1f2f6',
						width: '100%',
						borderRadius: 10,
						borderWidth: 1, // Add border to match TextInput look
						borderColor: '#ccc', // Border color
						height: 60, // Consistent height
					}}
					textContainerStyle={{
						backgroundColor: '#f1f2f6',
						paddingVertical: 0, // Adjust vertical padding for text input
						borderRadius: 10,
					}}
					textInputStyle={{
						fontSize: 16,
						height: 50, // Adjust text input height
					}}
					codeTextStyle={{
						fontSize: 16,
					}}
					countryPickerButtonStyle={{
						width: 60, // Adjust width of country picker button
					}}
					// autoFocus={true} // Consider if this is the desired initial focus behavior
				/>
				{!isValidPhone && phoneNumber.length > 0 && (
					<Text className="text-red-500 text-sm mt-1">
						Please enter a valid phone number.
					</Text>
				)}
			</View>

			<View className="flex flex-row justify-end items-end">
				<TouchableOpacity
					onPress={handleNext}
					className={`bg-[#065637] my-3 px-6 py-4 rounded-lg ${
						loading ? 'opacity-70' : ''
					}`}
					disabled={loading} // Disable button while loading
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text className="text-white text-center text-xl font-semibold">
							Send Code
						</Text>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
}
