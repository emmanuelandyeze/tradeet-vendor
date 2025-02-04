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
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '@/context/AuthContext';
import PhoneInput from 'react-native-phone-number-input';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

export default function Login() {
	const router = useRouter();
	const navigation = useNavigation();
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

	// Hide header
	useEffect(() => {
		navigation.setOptions({ headerShown: false });
	}, [navigation]);

	const handleSendCode = async () => {
		setLoading(true);

		// Validate phone number format here
		if (!phone) {
			ToastAndroid.show(
				'Please enter a valid phone number.',
				ToastAndroid.SHORT,
			);
			return;
		}

		try {
			const response = await sendResetOtp(phone);
			console.log(response);

			if (response.message === 'OTP sent via WhatsApp') {
				ToastAndroid.show(
					`OTP sent to ${phone}`,
					ToastAndroid.SHORT,
				);
				router.push({
					pathname: '/forgot-password/verification',
					params: { phone },
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
		<View className="flex-1 justify-center px-10">
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
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
