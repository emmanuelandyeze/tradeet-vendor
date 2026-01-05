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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '@/context/AuthContext';
import PhoneInput from 'react-native-phone-number-input';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

export default function ResetPassword() {
	const router = useRouter();
	// const navigation = useNavigation(); // Removed
	const { resetPassword } = useContext(AuthContext);
	const [password, setPassword] = useState('');
	const { phone, otp } = useLocalSearchParams();
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

	const showToast = (status, text) => {
		Toast.show({
			type: status,
			text1: text,
		});
	};

	const handleNext = async () => {
		// Validate phone number format here
		if (!password) {
			ToastAndroid.show(
				'Please enter a new password.',
				ToastAndroid.SHORT,
			);
			return;
		}

		try {
			const response = await resetPassword(phone, otp, password);

			if (
				response.message === 'Password reset successful'
			) {
				router.push({
					pathname: '/login',
					params: { phone },
				});
				ToastAndroid.show(
					`Password reset successful. Please login`,
					ToastAndroid.SHORT,
				);
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
			<Stack.Screen options={{ headerShown: false }} />
			<Text className="text-4xl mb-5 font-bold">
				Create new password
			</Text>
			<View className="flex flex-col gap-2 text-lg">
				<View>
					<TextInput
						className="border p-4 rounded-lg text-lg mt-4 border-gray-300 mb-4"
						placeholder="Set new password"
						secureTextEntry={!isPasswordVisible}
						value={password}
						onChangeText={setPassword}
						style={{ height: 60 }}
					/>
					<TouchableOpacity
						onPress={togglePasswordVisibility}
						className="absolute right-4 top-10"
					>
						<Text className="text-black text-sm">
							{isPasswordVisible ? 'Hide' : 'Show'}
						</Text>
					</TouchableOpacity>
				</View>
			</View>
			<TouchableOpacity
				onPress={handleNext}
				className="bg-green-500 mt-8 mb-3 py-3 rounded-lg"
			>
				<Text className="text-white text-center text-xl font-semibold">
					{loading ? 'Loading...' : 'Continue'}
				</Text>
			</TouchableOpacity>
		</View>
	);
}
