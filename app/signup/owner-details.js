import React, { useContext, useState } from 'react';
import {
	View,
	TextInput,
	Text,
	TouchableOpacity,
	Image,
	Modal,
	StyleSheet,
	ToastAndroid,
	ActivityIndicator,
} from 'react-native';
import {
	useLocalSearchParams,
	useRouter,
} from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function OwnerDetailsScreen() {
	const router = useRouter();
	const [ownerName, setOwnerName] = useState('');
	const [loading, setLoading] = useState(false); // Indicates if an async operation is in progress
	const { completeOwnerProfile, setPassword, userInfo } =
		useContext(AuthContext); // Context for profile completion API call
	const { phoneNumber } = useLocalSearchParams(); // Phone number passed from previous screen

	const [ownerEmail, setOwnerEmail] = useState('');
	const [ownerPassword, setOwnerPassword] = useState('');
	const [confirmOwnerPassword, setConfirmOwnerPassword] =
		useState('');
	const [selectedTab, setSelectedTab] = useState('name');

	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] =
		useState(false);

	const handleNext = async () => {
		setLoading(true);

		try {
			const profileData = {
				name: ownerName.trim(),
				email: ownerEmail.trim(),
				phone: userInfo?.phone,
			};

			console.log('Submitting owner data:', profileData); // Log payload for debugging

			const response = await completeOwnerProfile(
				profileData,
			);
			console.log(response);

			if (
				response &&
				response.message === 'Profile updated'
			) {
				goToPassword();
			} else {
				ToastAndroid.show(
					response?.message ||
						'Failed to complete profile. Please try again.',
					ToastAndroid.LONG,
				);
			}
		} catch (error) {
			console.error(
				'Error during profile completion:',
				error,
			);
			ToastAndroid.show(
				'An unexpected error occurred. Please try again.',
				ToastAndroid.LONG,
			);
		} finally {
			setLoading(false); // Always reset loading state
		}
	};

	const savePassword = async () => {
		if (
			!ownerPassword.trim() ||
			!confirmOwnerPassword.trim()
		) {
			ToastAndroid.show(
				'Please fill in both password fields.',
				ToastAndroid.LONG,
			);
			return;
		}
		if (ownerPassword !== confirmOwnerPassword) {
			ToastAndroid.show(
				'Passwords do not match.',
				ToastAndroid.LONG,
			);
			return;
		}
		// Basic password strength check: at least 6 characters
		if (ownerPassword.length < 8) {
			ToastAndroid.show(
				'Password must be at least 8 characters long.',
				ToastAndroid.LONG,
			);
			return;
		}

		setLoading(true);

		try {
			console.log('pass', ownerPassword);
			const passwordData = {
				phone: userInfo?.phone,
				password: ownerPassword,
			};

			const response = await setPassword(passwordData);
			console.log(response);

			if (response && response.message === 'Password set') {
				ToastAndroid.show(
					`Your account is now secure!`,
					ToastAndroid.LONG,
				);
				router.push('/signup/business-name'); // Navigate to the main tabs screen
			} else {
				ToastAndroid.show(
					response?.message ||
						'Failed to set password. Please try again.',
					ToastAndroid.LONG,
				);
			}
		} catch (error) {
			console.error('Error setting password:', error);
			ToastAndroid.show(error.message, ToastAndroid.LONG);
		} finally {
			setLoading(false);
		}
	};

	const goToPassword = () => {
		setSelectedTab('password');
	};

	return (
		<View className="flex-1 justify-center px-10">
			<View className="flex flex-col justify-center align-middle gap-5">
				{/* --- Business Name & Logo Tab --- */}
				{selectedTab === 'name' && (
					<View>
						<Text
							style={{ lineHeight: 40 }}
							className="text-3xl mb-2 text-center font-bold"
						>
							👋 Welcome to Tradeet Business
						</Text>
						<Text
							style={{ lineHeight: 30 }}
							className="text-xl text-center mb-8 font-bold"
						>
							Let's get to know you!
						</Text>

						<View style={{ gap: 10 }}>
							<TextInput
								value={ownerName}
								onChangeText={setOwnerName}
								className="border-b text-xl border-gray-300 mb-4"
								placeholder="Your Full Legal Name*"
								style={{ paddingVertical: 10 }}
								autoCapitalize="words" // Suggest capitalizing first letter of words
							/>
							<TextInput
								value={ownerEmail}
								onChangeText={setOwnerEmail}
								className="border-b text-xl border-gray-300 mb-4"
								placeholder="Your Email Address*"
								style={{ paddingVertical: 10 }}
								keyboardType="email-address"
								autoCapitalize="none"
							/>
						</View>
						<View style={{ alignItems: 'flex-end' }}>
							<TouchableOpacity
								onPress={handleNext}
								disabled={loading} // Disable if an operation is ongoing
								className="bg-[#065637] p-4 rounded-lg"
								style={{ paddingHorizontal: 20 }}
							>
								<Text className="text-white text-center text-lg">
									{loading ? (
										<ActivityIndicator color={'white'} />
									) : (
										'Continue'
									)}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}

				{/* --- Password Setup Tab --- */}
				{selectedTab === 'password' && (
					<View>
						<Text
							style={{ lineHeight: 35 }}
							className="text-3xl text-center mb-2 font-bold"
						>
							Lovely to meet you, {ownerName}😊
						</Text>
						<Text
							style={{ lineHeight: 30 }}
							className="text-xl text-center mb-8 font-bold"
						>
							Now, let's secure your account
						</Text>
						<View className="flex flex-col gap-5">
							<View
								style={{
									paddingVertical: 10,
								}}
								className="flex-row items-center mb-4 border-b border-gray-300"
							>
								<TextInput
									value={ownerPassword}
									onChangeText={setOwnerPassword}
									secureTextEntry={!showPassword}
									className="flex-1 text-xl"
									placeholder="Password"
									autoCapitalize="none"
								/>
								<TouchableOpacity
									onPress={() =>
										setShowPassword(!showPassword)
									}
									className="ml-2"
								>
									<Text className="text-xl">
										{showPassword ? (
											<Ionicons
												name="eye-outline"
												size={24}
												color="black"
											/>
										) : (
											<Ionicons
												name="eye-off-outline"
												size={24}
												color="black"
											/>
										)}
									</Text>
								</TouchableOpacity>
							</View>

							<View
								style={{
									paddingVertical: 10,
								}}
								className="flex-row items-center mb-4 border-b border-gray-300"
							>
								<TextInput
									value={confirmOwnerPassword}
									onChangeText={setConfirmOwnerPassword}
									secureTextEntry={!showConfirmPassword}
									className="flex-1 text-xl"
									placeholder="Confirm Password"
									autoCapitalize="none"
								/>
								<TouchableOpacity
									onPress={() =>
										setShowConfirmPassword(
											!showConfirmPassword,
										)
									}
									className="ml-2"
								>
									<Text className="text-xl">
										{showConfirmPassword ? (
											<Ionicons
												name="eye-outline"
												size={24}
												color="black"
											/>
										) : (
											<Ionicons
												name="eye-off-outline"
												size={24}
												color="black"
											/>
										)}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginTop: 10,
							}}
						>
							<View></View>
							<TouchableOpacity
								onPress={savePassword}
								disabled={loading}
								className="bg-[#065637] p-4 rounded-lg"
							>
								<Text className="text-white text-center text-lg">
									{loading ? (
										<ActivityIndicator color={'white'} />
									) : (
										'Continue'
									)}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	dottedCircle: {
		width: 150,
		height: 150,
		borderRadius: 100,
		borderColor: '#ccc',
		borderWidth: 2,
		borderStyle: 'dotted',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20,
	},
	uploadText: {
		color: '#888',
		fontSize: 16,
		textAlign: 'center',
		width: '90%',
	},
	imagePreview: {
		width: 120,
		height: 120,
		borderRadius: 60,
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalView: {
		backgroundColor: 'white',
		padding: 20,
		borderRadius: 10,
		width: '80%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalButton: {
		backgroundColor: '#000',
		padding: 10,
		borderRadius: 5,
		marginVertical: 10,
		width: '100%',
		alignItems: 'center',
	},
	modalCancelButton: {
		backgroundColor: '#FF6347', // A distinct color for cancel
		padding: 10,
		borderRadius: 5,
		marginVertical: 10,
		width: '100%',
		alignItems: 'center',
	},
	modalButtonText: {
		color: 'white',
		fontSize: 16,
	},
	paymentMethodButton: {
		padding: 15,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 10,
		backgroundColor: '#fff',
	},
	selectedPaymentMethod: {
		borderColor: '#18a54a', // Green border for selected option
		backgroundColor: '#f0fff4', // Light green background for selected option
	},
	radioContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 5,
	},
	radioOuter: {
		height: 20,
		width: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#ccc',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	radioOuterSelected: {
		borderColor: '#18a54a',
	},
	radioInner: {
		height: 10,
		width: 10,
		borderRadius: 5,
		backgroundColor: '#18a54a',
	},
	optionText: {
		fontSize: 16,
		fontWeight: '500',
	},
	optionSubtext: {
		fontSize: 12,
		color: '#666',
		marginLeft: 30, // Aligns subtext with the content of the radio button
	},
	paymentMethodContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 5,
	},
	paymentMethodText: {
		fontSize: 16,
		marginLeft: 10,
	},
	circle: {
		height: 24,
		width: 24,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#ccc',
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedCircle: {
		borderColor: '#18a54a',
	},
	circleInner: {
		height: 12,
		width: 12,
		borderRadius: 6,
		backgroundColor: '#18a54a',
	},
});
