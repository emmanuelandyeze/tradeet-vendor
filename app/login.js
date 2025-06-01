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
	const { login } = useContext(AuthContext);
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

	const showToast = (status, text) => {
		Toast.show({
			type: status,
			text1: text,
		});
	};

	const handleLogin = async () => {
		setLoading(true);
		// Handle login logic here
		const response = await login(phone, password);

		// console.log(response);

		if (response.token) {
			ToastAndroid.show(
				'Login successful!',
				ToastAndroid.LONG,
			);
			setLoading(false);
			router.push('(tabs)');
		} else {
			// alert(response.messae);
			ToastAndroid.show(
				response.message,
				ToastAndroid.SHORT,
			);
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
			<Text className="text-4xl mb-5 font-bold">Login</Text>
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
					textContainerStyle={{ width: '70%' }}
					textInputStyle={{ fontSize: 16, border: 1 }}
					containerStyle={{
						backgroundColor: '#f1f2f6',
						width: '100%',
						borderRadius: 10,
						borderBottom: 2,
						borderWidth: 1,
						borderColor: '#ccc',
					}}
					// withShadow
					autoFocus
				/>
				<View>
					<TextInput
						className="border p-4 rounded-lg text-lg mt-4 border-gray-300 mb-4"
						placeholder="Password"
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
				<View
					style={{
						justifyContent: 'flex-end',
						alignItems: 'flex-end',
					}}
				>
					<View style={{ flexDirection: 'row', gap: 2 }}>
						<Text style={{ fontSize: 16 }}>
							Forgotten your password?
						</Text>
						<TouchableOpacity
							onPress={() =>
								router.push('/forgot-password')
							}
						>
							<Text
								style={{ color: '#065637', fontSize: 16 }}
							>
								Click here
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
			{/* <View className="flex flex-row justify-end items-end">
				<TouchableOpacity
					onPress={() => router.push('/forgot-password')}
					className=""
				>
					<Text className="text-green-500 text-center text-lg">
						Forgot password?
					</Text>
				</TouchableOpacity>
			</View> */}
			<TouchableOpacity
				onPress={handleLogin}
				className="bg-[#065637] mt-8 mb-3 py-4 rounded-lg"
			>
				<Text className="text-white text-center text-[1.3rem] font-semibold">
					{loading ? 'Loading...' : 'Login'}
				</Text>
			</TouchableOpacity>

			<View className="flex flex-row justify-center items-center gap-1">
				<Text className="text-lg">
					Don't have an account?{' '}
				</Text>
				<TouchableOpacity
					onPress={() =>
						router.push('/signup/phone-number')
					}
					className=""
				>
					<Text className="text-[#065637] font-bold text-center text-lg">
						Sign up now
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
