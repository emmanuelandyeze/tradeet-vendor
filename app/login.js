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
	TextInput,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from 'react-native';
import { useRouter, Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '@/context/AuthContext';
import PhoneInput from 'react-native-phone-number-input';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
	const router = useRouter();
	const { login } = useContext(AuthContext);

	const [phone, setPhone] = useState('');
	const [password, setPassword] = useState('');
	const [formattedValue, setFormattedValue] = useState('');
	const [isValidPhone, setIsValidPhone] = useState(true);
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [loading, setLoading] = useState(false);

	const phoneInputRef = useRef(null);
	const passwordInputRef = useRef(null);

	const showToast = (type, message) => {
		Toast.show({
			type: type,
			text1: message,
			position: 'top',
			visibilityTime: 3000,
			autoHide: true,
		});
	};

	const togglePasswordVisibility = () => {
		setIsPasswordVisible(!isPasswordVisible);
	};

	const handleLogin = async () => {
		if (!phone.trim()) {
			showToast('error', 'Please enter your phone number.');
			return;
		}

		if (phoneInputRef.current && !phoneInputRef.current.isValidNumber(phone)) {
			setIsValidPhone(false);
			showToast('error', 'Please enter a valid phone number.');
			return;
		}
		setIsValidPhone(true);

		if (!password.trim()) {
			showToast('error', 'Please enter your password.');
			return;
		}

		setLoading(true);

		let phoneNumberToSend = formattedValue;
		const callingCode = phoneInputRef.current?.getCallingCode();

		if (callingCode && formattedValue.startsWith(`+${callingCode}`)) {
			phoneNumberToSend = formattedValue.substring(`+${callingCode}`.length);
		} else if (formattedValue.startsWith('+234')) {
			phoneNumberToSend = formattedValue.substring(4);
		}

		try {
			const response = await login(phoneNumberToSend, password);
			if (response && response.token) {
				showToast('success', 'Welcome back!');
				router.push('(tabs)');
			} else {
				const errorMessage = response?.message || 'Login failed.';
				showToast('error', errorMessage);
			}
		} catch (error) {
			console.error('Login error:', error);
			showToast('error', error.response?.data?.message || 'Something went wrong.');
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
					<Text className="text-4xl font-extrabold text-[#065637] mb-2">Welcome Back</Text>
					<Text className="text-gray-500 text-lg">Sign in to continue managing your business.</Text>
				</View>

				{/* Phone Input */}
				<View className="mb-6">
					<Text className="text-gray-700 font-semibold mb-2 ml-1">Phone Number</Text>
					<View className={`border rounded-xl overflow-hidden ${!isValidPhone ? 'border-red-500' : 'border-gray-200'} bg-gray-50 h-[60px] justify-center`}>
						<PhoneInput
							ref={phoneInputRef}
							defaultValue={phone}
							defaultCode="NG"
							layout="second"
							onChangeText={(text) => {
								setPhone(text);
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
						/>
					</View>
					{!isValidPhone && <Text className="text-red-500 text-xs mt-1 ml-1">Invalid phone number</Text>}
				</View>

				{/* Password Input */}
				<View className="mb-4">
					<Text className="text-gray-700 font-semibold mb-2 ml-1">Password</Text>
					<View className="flex-row items-center border border-gray-200 bg-gray-50 rounded-xl h-[60px] px-4">
						<Ionicons name="lock-closed-outline" size={20} color="#9ca3af" className="mr-3" />
						<TextInput
							ref={passwordInputRef}
							className="flex-1 text-base text-gray-900 h-full"
							placeholder="Enter your password"
							secureTextEntry={!isPasswordVisible}
							value={password}
							onChangeText={setPassword}
							placeholderTextColor="#9ca3af"
							returnKeyType="done"
							onSubmitEditing={handleLogin}
						/>
						<TouchableOpacity onPress={togglePasswordVisibility} className="p-2">
							<Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
						</TouchableOpacity>
					</View>
				</View>

				{/* Forgot Password */}
				<View className="flex-row justify-end mb-8">
					<Link href="/forgot-password" asChild>
						<TouchableOpacity>
							<Text className="text-[#065637] font-semibold">Forgot Password?</Text>
						</TouchableOpacity>
					</Link>
				</View>

				{/* Login Button */}
				<TouchableOpacity
					onPress={handleLogin}
					disabled={loading}
					className={`bg-[#065637] h-[60px] rounded-xl justify-center items-center shadow-lg shadow-green-900/20 active:opacity-90 ${loading ? 'opacity-70' : ''}`}
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text className="text-white text-lg font-bold">Sign In</Text>
					)}
				</TouchableOpacity>

				{/* Sign Up Link */}
				<View className="flex-row justify-center mt-8">
					<Text className="text-gray-500 text-base">Don't have an account? </Text>
					<Link href="/signup/phone-number" asChild>
						<TouchableOpacity>
							<Text className="text-[#065637] font-bold text-base">Sign Up</Text>
						</TouchableOpacity>
					</Link>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
