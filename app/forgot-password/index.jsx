import React, {
	useState,
	useRef,
	useEffect,
	useContext,
} from 'react';
import {
	View,
	Text,
	ImageBackground,
	TouchableOpacity,
	ScrollView,
	Dimensions,
	TextInput,
	Button,
	ToastAndroid,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '@/context/AuthContext';
import PhoneInput from 'react-native-phone-number-input';
import Toast from 'react-native-toast-message';
import { extractNationalPhoneNumber } from '@/utils/phone';

const { width, height } = Dimensions.get('window');

export default function ForgotPassword() {
	const router = useRouter();
	// const navigation = useNavigation(); // Removed
	const { sendResetOtp } = useContext(AuthContext);
	const [phone, setPhone] = useState('');
	const [password, setPassword] = useState('');
	const [formattedValue, setFormattedValue] = useState('');
	const phoneInput = useRef();
	const [isPasswordVisible, setIsPasswordVisible] =
		useState(false);
	const [loading, setLoading] = useState(false);

	const togglePasswordVisibility = () => {
		setIsPasswordVisible(!isPasswordVisible);
	};

	// Hide header - Replaced with Stack.Screen
	// useEffect(() => {
	// 	navigation.setOptions({ headerShown: false });
	// }, [navigation]);

	const showToast = (type, text1) => {
		Toast.show({ type, text1, position: 'top', visibilityTime: 3000 });
	};

	const handleSendCode = async () => {
		if (!phone.trim()) {
			showToast('error', 'Please enter your phone number.');
			return;
		}
		if (phoneInput.current && !phoneInput.current.isValidNumber(phone)) {
			showToast('error', 'Please enter a valid phone number.');
			return;
		}

		setLoading(true);
		const callingCode = phoneInput.current?.getCallingCode();
		const phoneNumberToSend = extractNationalPhoneNumber({
			phone,
			formattedValue,
			callingCode,
		});

		try {
			const response = await sendResetOtp(phoneNumberToSend);

			if (response?.message === 'OTP sent via WhatsApp') {
				showToast('success', `OTP sent to ${formattedValue || phoneNumberToSend}`);
				router.push({
					pathname: '/forgot-password/verification',
					params: { phone: phoneNumberToSend },
				});
			} else {
				showToast('error', response?.message || 'Failed to send OTP.');
			}
		} catch (error) {
			showToast(
				'error',
				error?.response?.data?.message ||
					error?.message ||
					'An error occurred. Please try again.',
			);
			console.error('Error verifying phone number:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View className="flex-1 justify-center px-10">
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			<Stack.Screen options={{ headerShown: false }} />
			<Text className="text-4xl mb-2 font-bold">
				Forgot Password?
			</Text>
			<Text className="text-lg mb-5 font-normal">
				Kindly enter your phone number. An OTP would be sent
				to this number via WhatsApp.
			</Text>
			<View className="flex flex-col gap-2 text-lg">
				{/* <TextInput
                    className="border-b border-gray-300 mb-4"
                    placeholder="Phone number"
                    keyboardType="numeric"
                    value={phone}
                    onChangeText={setPhone}
                /> */}
				<PhoneInput
					ref={phoneInput}
					defaultValue={phone}
					defaultCode="NG"
					layout="second"
					onChangeText={(text) => {
						setPhone(text);
					}}
					onChangeFormattedText={(text) => {
						setFormattedValue(text);
					}}
					// withDarkTheme
					textContainerStyle={{ width: '110%' }}
					textInputStyle={{ fontSize: 16, border: 1 }}
					containerStyle={{
						backgroundColor: '#f1f2f6',
						width: '100%',
						borderRadius: 10,
						borderBottom: 2,
					}}
					// withShadow
					autoFocus
				/>
			</View>
			<TouchableOpacity
				onPress={handleSendCode}
				className="bg-green-500 mt-8 mb-3 py-4 rounded-lg"
			>
				<Text className="text-white text-center text-xl font-semibold">
					{loading ? 'Sending...' : 'Send OTP'}
				</Text>
			</TouchableOpacity>
		</View>
	);
}
