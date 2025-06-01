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
} from 'react-native';
import {
	useLocalSearchParams,
	useRouter,
} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker'; // Import Picker
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { AuthContext } from '@/context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
 
export default function BusinessNameScreen() {
	const router = useRouter();
	const [businessName, setBusinessName] = useState('');
	const [businessAddress, setBusinessAddress] =
		useState('');
	const [image, setImage] = useState(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [logo, setLogo] = useState(null);
	const [loading, setLoading] = useState(false);
	const { completeProfile } = useContext(AuthContext);
	const { phoneNumber } = useLocalSearchParams();
	const [password, setPassword] = useState('');
	const [businessEmail, setBusinessEmail] = useState('');
	const [businessDescription, setBusinessDescription] =
		useState('');
	const [confirmPassword, setConfirmPassword] =
		useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] =
		useState(false);
	const [selectedTab, setSelectedTab] = useState('name');
	const [selectedOffering, setSelectedOffering] =
		useState('products');

	// State for the selected service
	const [selectedService, setSelectedService] =
		useState('');

	// Function to open ImagePicker
	const pickImage = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1], // Square image
			quality: 1,
		});

		if (!result.canceled) {
			setImage(result.assets[0].uri);
			setModalVisible(false); // Close modal after selection
		}
	};

	// Function to open Camera
	const takePhoto = async () => {
		ImagePicker.requestCameraPermissionsAsync();
		let result = await ImagePicker.launchCameraAsync({
			allowsEditing: true,
			aspect: [1, 1], // Square image
			quality: 1,
		});

		if (!result.canceled) {
			setImage(result.assets[0].uri);
			setModalVisible(false); // Close modal after taking a photo
		}
	};

	// Function to handle image upload to Cloudinary
	const handleImageUpload = async () => {
		try {
			const response = await uploadImageToCloudinary(image);
			if (response.secure_url) {
				setLogo(response.secure_url);
				return response.secure_url;
			} else {
				alert('Failed to upload image');
				return null;
			}
		} catch (error) {
			console.error('Error uploading image:', error);
			alert('Image upload failed. Please try again.');
			return null;
		}
	};

	const handleNext = async () => {
		if (!password || !confirmPassword) {
			ToastAndroid.show(
				'Please fill in all details.',
				ToastAndroid.LONG,
			);
			return;
		}

		if (password !== confirmPassword) {
			ToastAndroid.show(
				'Passwords do not match.',
				ToastAndroid.LONG,
			);
			return;
		}

		setLoading(true);

		let uploadedLogoUrl = ''; // Declare the variable once

		if (image) {
			uploadedLogoUrl = await handleImageUpload(); // Assign the result to the outer variable
		}

		try {
			const profile = {
				logoUrl: uploadedLogoUrl || '',
				name: businessName,
				address: businessAddress,
				phone: phoneNumber,
				password: password,
				serviceType: selectedOffering, // Add selected service
				isVendor: true,
				email: businessEmail, // Add business email
				description: businessDescription,
			};
			console.log(profile);

			const response = await completeProfile(profile);
			if (response.message === 'Profile setup completed') {
				router.push('(tabs)');
				ToastAndroid.show(
					`Welcome to Tradeet, ${businessName}!`,
					ToastAndroid.LONG,
				);
				setLoading(false);
			} else {
				ToastAndroid.show(
					response.message,
					ToastAndroid.SHORT,
				);
				setLoading(false);
			}
		} catch (error) {
			ToastAndroid.show(
				'An error occurred. Please try again.',
				ToastAndroid.SHORT,
			);
			console.error('Error completing profile:', error);
			setLoading(false);
		}
	};

	const goToOffering = () => {
		if (!businessName || !businessEmail) {
			ToastAndroid.show(
				'Please fill in all details.',
				ToastAndroid.LONG,
			);
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(businessEmail)) {
			ToastAndroid.show(
				'Please enter a valid email address.',
				ToastAndroid.LONG,
			);
			return;
		}

		setSelectedTab('offering');
	};

	const goToPassword = () => {
		if (!selectedOffering) {
			ToastAndroid.show(
				'Please fill in all details.',
				ToastAndroid.LONG,
			);
			return;
		}
		setSelectedTab('password');
	};

	return (
		<View className="flex-1 justify-center px-10">
			<View className="flex flex-col justify-center align-middle gap-5">
				{selectedTab === 'name' && (
					<View>
						<Text
							style={{ lineHeight: 40 }}
							className="text-4xl mb-2 font-bold"
						>
							Let's set up your Business Profile
						</Text>
						{/* <Text className="text-lg mb-5">
							Just some more details
						</Text> */}
						<TouchableOpacity
							onPress={() => setModalVisible(true)}
							style={{ alignItems: 'center' }}
						>
							<View style={styles.dottedCircle}>
								{image ? (
									<Image
										source={{ uri: image }}
										style={styles.imagePreview}
									/>
								) : (
									<Text style={styles.uploadText}>
										Upload your business logo
									</Text>
								)}
							</View>
						</TouchableOpacity>

						<View style={{ gap: 10 }}>
							<TextInput
								value={businessName}
								onChangeText={setBusinessName}
								className="border-b text-xl border-gray-300 mb-4"
								placeholder="Your Business Name*"
								style={{ paddingVertical: 10 }}
							/>
							<TextInput
								value={businessEmail}
								onChangeText={setBusinessEmail}
								className="border-b text-xl border-gray-300 mb-4"
								placeholder="Your Email Address*"
								style={{ paddingVertical: 10 }}
								keyboardType="email-address"
							/>
						</View>
						<View style={{ alignItems: 'flex-end' }}>
							<TouchableOpacity
								onPress={() => goToOffering()}
								disabled={loading}
								className="bg-[#065637] p-4 rounded-lg"
								style={{ paddingHorizontal: 20 }}
							>
								<Text className="text-white text-center text-lg">
									Next
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}

				{selectedTab === 'offering' && (
					<View>
						<Text
							style={{ lineHeight: 40 }}
							className="text-4xl mb-2 font-bold"
						>
							Tell us about your business
						</Text>
						<Text
							style={{ fontSize: 18 }}
							className="text-lg mt-5"
						>
							How do you make money?
						</Text>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								marginBottom: 20,
							}}
						>
							{/* Products Option */}
							<TouchableOpacity
								style={[
									styles.paymentMethodButton,
									selectedOffering === 'products' &&
										styles.selectedPaymentMethod,
									{ width: '48%' }, // Explicit width
								]}
								onPress={() =>
									setSelectedOffering('products')
								}
							>
								<View style={styles.radioContainer}>
									<View
										style={[
											styles.radioOuter,
											selectedOffering === 'products' &&
												styles.radioOuterSelected,
										]}
									>
										{selectedOffering === 'products' && (
											<View style={styles.radioInner} />
										)}
									</View>
									<Text style={styles.optionText}>
										I sell
									</Text>
								</View>
								<Text style={styles.optionSubtext}>
									Food, gadgets, clothes, etc
								</Text>
							</TouchableOpacity>

							{/* Services Option */}
							<TouchableOpacity
								style={[
									styles.paymentMethodButton,
									selectedOffering === 'services' &&
										styles.selectedPaymentMethod,
									{ width: '48%' }, // Explicit width
								]}
								onPress={() =>
									setSelectedOffering('services')
								}
							>
								<View style={styles.radioContainer}>
									<View
										style={[
											styles.radioOuter,
											selectedOffering === 'services' &&
												styles.radioOuterSelected,
										]}
									>
										{selectedOffering === 'services' && (
											<View style={styles.radioInner} />
										)}
									</View>
									<Text style={styles.optionText}>
										I render services
									</Text>
								</View>
								<Text style={styles.optionSubtext}>
									Delivery, design, hairdressing, etc
								</Text>
							</TouchableOpacity>
						</View>

						<View
							style={{
								marginVertical: 5,
							}}
						>
							<Text
								style={{ fontSize: 18 }}
								className="text-lg mt-5"
							>
								How would you describe your brand to
								customers?
							</Text>
							<TextInput
								value={businessDescription}
								onChangeText={setBusinessDescription}
								className="border-b text-xl border-gray-300 mb-4"
								placeholder="About your business"
								multiline
								numberOfLines={3}
								style={{
									textAlignVertical: 'top',
									marginTop: 10,
									fontSize: 14,
								}}
							/>
						</View>
						{/* <Text
							style={{ fontSize: 18 }}
							className="text-lg mt-5"
						>
							Where is your business primarily located?
						</Text>
						<TextInput
							value={businessAddress}
							onChangeText={setBusinessAddress}
							className="border-b text-xl border-gray-300 mb-4"
							placeholder="Your Business Address*"
							style={{ paddingVertical: 10, fontSize: 14 }}
						/> */}
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
							}}
						>
							<TouchableOpacity
								onPress={() => setSelectedTab('name')}
								disabled={loading}
								className="bg-slate-600 p-4 rounded-lg"
							>
								<Text className="text-white text-center text-lg">
									Previous
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => goToPassword()}
								disabled={loading}
								className="bg-[#065637] p-4 rounded-lg"
							>
								<Text className="text-white text-center text-lg">
									Next
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}

				{selectedTab === 'password' && (
					<View>
						<Text
							style={{ lineHeight: 40 }}
							className="text-4xl mb-2 font-bold"
						>
							Great! Now, let's secure your account
						</Text>
						{/* Password and Confirm Password Inputs */}
						<View className="flex flex-col gap-5">
							<View
								style={{
									paddingVertical: 10,
								}}
								className="flex-row items-center mb-4 border-b border-gray-300"
							>
								<TextInput
									value={password}
									onChangeText={setPassword}
									secureTextEntry={!showPassword}
									className="flex-1 text-xl"
									placeholder="Password"
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
									value={confirmPassword}
									onChangeText={setConfirmPassword}
									secureTextEntry={!showConfirmPassword}
									className="flex-1 text-xl"
									placeholder="Confirm Password"
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
							<TouchableOpacity
								onPress={() => setSelectedTab('offering')}
								disabled={loading}
								className="bg-slate-600 p-4 rounded-lg"
							>
								<Text className="text-white text-center text-lg">
									Previous
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handleNext}
								disabled={loading}
								className="bg-[#065637] p-4 rounded-lg"
							>
								<Text className="text-white text-center text-lg">
									{loading ? 'Please wait...' : 'Continue'}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}

				{/* Modal for Image Picker Options */}
				<Modal
					animationType="slide"
					transparent={true}
					visible={modalVisible}
					onRequestClose={() => setModalVisible(false)}
				>
					<View style={styles.modalContainer}>
						<View style={styles.modalView}>
							<TouchableOpacity
								onPress={takePhoto}
								style={styles.modalButton}
							>
								<Text style={styles.modalButtonText}>
									Take a Photo
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={pickImage}
								style={styles.modalButton}
							>
								<Text style={styles.modalButtonText}>
									Choose from Gallery
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => setModalVisible(false)}
								style={styles.modalCancelButton}
							>
								<Text style={styles.modalButtonText}>
									Cancel
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>

				{/* <TouchableOpacity
					onPress={handleNext}
					disabled={loading}
					className="bg-green-600 p-4 rounded-lg"
				>
					<Text className="text-white text-center text-lg">
						{loading ? 'Please wait...' : 'Next'}
					</Text>
				</TouchableOpacity> */}
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
		backgroundColor: '#FF6347',
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
	paymentMethodContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 5,
	},
	paymentMethodButton: {
		padding: 15,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 10,
		backgroundColor: '#fff',
	},
	selectedPaymentMethod: {
		borderColor: '#18a54a',
		backgroundColor: '#f0fff4',
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
		marginLeft: 30, // Align with radio button
	},
	selectedPaymentMethod: {
		borderColor: '#18a54a',
	},
	paymentMethodText: {
		fontSize: 16,
		marginLeft: 10,
	},
	circle: {
		height: 24,
		width: 24,
		borderRadius: 12, // makes the circle
		borderWidth: 2,
		borderColor: '#ccc',
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedCircle: {
		borderColor: '#18a54a', // green for selected state
	},
	circleInner: {
		height: 12,
		width: 12,
		borderRadius: 6,
		backgroundColor: '#18a54a', // inner green dot when selected
	},
});
