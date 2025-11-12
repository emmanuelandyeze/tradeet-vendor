import React, {
	useState,
	useRef,
	useEffect,
	useContext,
} from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	Dimensions,
	TextInput,
	ActivityIndicator, // Import ActivityIndicator for loading
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '@/context/AuthContext';
import PhoneInput from 'react-native-phone-number-input';
import Toast from 'react-native-toast-message'; // Ensure this is imported

const { width, height } = Dimensions.get('window');

export default function Login() {
	const router = useRouter();
	const navigation = useNavigation();
	const { login } = useContext(AuthContext);

	const [phone, setPhone] = useState('');
	const [password, setPassword] = useState('');
	const [formattedValue, setFormattedValue] = useState('');
	const [isValidPhone, setIsValidPhone] = useState(false); // State for phone validation
	const [isPasswordVisible, setIsPasswordVisible] =
		useState(false);
	const [loading, setLoading] = useState(false);

	const phoneInputRef = useRef(null); // Rename for clarity
	const passwordInputRef = useRef(null); // Ref for password input

	// Hide header
	useEffect(() => {
		navigation.setOptions({ headerShown: false });
	}, [navigation]);

	// Function to show toasts consistently
	const showToast = (type, message) => {
		Toast.show({
			type: type, // 'success', 'error', 'info'
			text1: message,
			position: 'top', // or 'bottom'
			visibilityTime: 3000,
			autoHide: true,
		});
	};

	const togglePasswordVisibility = () => {
		setIsPasswordVisible(!isPasswordVisible);
	};

	const handleLogin = async () => {
		// Client-side validation
		if (!phone.trim()) {
			showToast('error', 'Please enter your phone number.');
			return;
		}

		// Validate phone number format using PhoneInput's internal validation
		if (
			phoneInputRef.current &&
			!phoneInputRef.current.isValidNumber(phone)
		) {
			showToast(
				'error',
				'Please enter a valid phone number.',
			);
			return;
		}

		if (!password.trim()) {
			showToast('error', 'Please enter your password.');
			return;
		}

		setLoading(true);

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

		try {
			const response = await login(
				phoneNumberToSend,
				password,
			); // Use formattedValue for login if your API expects it

			if (response && response.token) {
				showToast('success', 'Login successful!');
				router.push('(tabs)');
			} else {
				// Assuming `response.message` holds the error message from the backend
				const errorMessage =
					response?.message ||
					'Login failed. Please try again.';
				showToast('error', errorMessage);
			}
		} catch (error) {
			console.error('Login error:', error);
			showToast(
				'error',
				error.response?.data?.message || error.message,
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View className="flex-1 justify-center px-10 bg-white">
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>

			<Text className="text-4xl mb-5 font-bold text-gray-800">
				Login
			</Text>

			<View className="flex flex-col gap-2">
				<PhoneInput
					ref={phoneInputRef}
					defaultValue={phone}
					defaultCode="NG"
					layout="second"
					onChangeText={(text) => {
						setPhone(text);
						// Optional: Validate instantly as user types
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
						borderWidth: 1,
						borderColor: '#ccc',
						height: 60, // Consistent height
					}}
					textContainerStyle={{
						backgroundColor: '#f1f2f6',
						paddingVertical: 0, // Adjust padding
						borderRadius: 10,
					}}
					textInputStyle={{
						fontSize: 16,
						height: 50, // Adjust text input height
					}}
					codeTextStyle={{
						fontSize: 16, // Adjust code text size
					}}
					countryPickerButtonStyle={{
						width: 60, // Adjust country picker button width
					}}
					// autoFocus={true} // Consider if this is the desired initial focus
				/>
				{!isValidPhone && phone.length > 0 && (
					<Text className="text-red-500 text-sm mt-1">
						Please enter a valid phone number.
					</Text>
				)}

				<View className="relative mt-4">
					<TextInput
						ref={passwordInputRef}
						className="border p-4 rounded-lg text-lg border-gray-300"
						placeholder="Password"
						secureTextEntry={!isPasswordVisible}
						value={password}
						onChangeText={setPassword}
						style={{ height: 60 }}
						returnKeyType="done" // Improves keyboard behavior
						onSubmitEditing={handleLogin} // Allow login on keyboard done
					/>
					<TouchableOpacity
						onPress={togglePasswordVisibility}
						className="absolute right-4 top-1/2 -translate-y-1/2" // Center vertically
					>
						<Text className="text-gray-600 text-sm">
							{isPasswordVisible ? 'Hide' : 'Show'}
						</Text>
					</TouchableOpacity>
				</View>

				<View className="flex flex-row justify-end mt-2">
					<Text className="text-gray-700 text-base">
						Forgotten your password?{' '}
					</Text>
					<TouchableOpacity
						onPress={() => router.push('/forgot-password')}
					>
						<Text className="text-[#065637] font-semibold text-base">
							Click here
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			<TouchableOpacity
				onPress={handleLogin}
				className={`bg-[#065637] mt-8 py-4 rounded-lg ${
					loading ? 'opacity-70' : ''
				}`} // Reduce opacity when loading
				disabled={loading} // Disable button when loading
			>
				{loading ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text className="text-white text-center text-[1.3rem] font-semibold">
						Login
					</Text>
				)}
			</TouchableOpacity>

			<View className="flex flex-row justify-center items-center mt-4">
				<Text className="text-lg text-gray-700">
					Don't have an account?{' '}
				</Text>
				<TouchableOpacity
					onPress={() =>
						router.push('/signup/phone-number')
					}
				>
					<Text className="text-[#065637] font-bold text-lg">
						Sign up now
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
