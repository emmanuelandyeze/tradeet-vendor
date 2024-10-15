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
	const [confirmPassword, setConfirmPassword] =
		useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] =
		useState(false);

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
		if (
			!businessAddress ||
			!businessName ||
			!selectedService
		) {
			ToastAndroid.show(
				'Please fill in all details, including service type.',
				ToastAndroid.SHORT,
			);
			return;
		}

		if (!image) {
			ToastAndroid.show(
				'Please upload a logo.',
				ToastAndroid.SHORT,
			);
			return;
		}

		if (password !== confirmPassword) {
			ToastAndroid.show(
				'Passwords do not match.',
				ToastAndroid.SHORT,
			);
			return;
		}

		setLoading(true);

		const uploadedLogoUrl = await handleImageUpload();
		if (!uploadedLogoUrl) {
			setLoading(false);
			return;
		}

		try {
			const profile = {
				logoUrl: uploadedLogoUrl,
				name: businessName,
				address: businessAddress,
				phone: phoneNumber,
				password: password,
				serviceType: selectedService, // Add selected service
				isVendor: true,
			};
			console.log(profile);

			const response = await completeProfile(profile);
			if (response.message === 'Profile setup completed') {
				router.push({
					pathname: '/signup/select-campus',
					params: { phoneNumber },
				});
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

	return (
		<View className="flex-1 justify-center px-10">
			<Text className="text-4xl mb-2 font-bold">
				Just some more details
			</Text>
			<Text className="text-lg mb-5">
				Let us set up your store
			</Text>
			<View className="flex flex-col justify-center align-middle gap-5">
				{/* Image Upload Section */}
				<TouchableOpacity
					onPress={() => setModalVisible(true)}
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

				<TextInput
					value={businessName}
					onChangeText={setBusinessName}
					className="border-b text-xl border-gray-300 mb-4"
					placeholder="Your Business Name*"
				/>
				<TextInput
					value={businessAddress}
					onChangeText={setBusinessAddress}
					className="border-b text-xl border-gray-300 mb-4"
					placeholder="Your Business Address*"
				/>

				{/* Picker for Service Type */}
				<Picker
					selectedValue={selectedService}
					style={{
						height: 50,
						width: '100%',
						borderWidth: 1,
						borderColor: 'gray',
						borderRadius: 5,
						paddingHorizontal: 10,
						paddingVertical: 5,
						fontSize: 16,
					}}
					onValueChange={(itemValue) =>
						setSelectedService(itemValue)
					}
				>
					<Picker.Item
						label="Select Service Type"
						value=""
					/>
					<Picker.Item label="Food" value="food" />
					<Picker.Item label="Clothing" value="clothing" />
					<Picker.Item
						label="Accessories"
						value="accessories"
					/>
					<Picker.Item label="Shoes" value="shoes" />
				</Picker>
				<View
					style={{
						borderBottomWidth: 1,
						borderColor: '#ccc',
						marginVertical: 5,
					}}
				></View>

				{/* Password and Confirm Password Inputs */}
				<View className="flex flex-col gap-5">
					<View className="flex-row items-center mb-4 border-b border-gray-300">
						<TextInput
							value={password}
							onChangeText={setPassword}
							secureTextEntry={!showPassword}
							className="flex-1 text-xl"
							placeholder="Password"
						/>
						<TouchableOpacity
							onPress={() => setShowPassword(!showPassword)}
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

					<View className="flex-row items-center mb-4 border-b border-gray-300">
						<TextInput
							value={confirmPassword}
							onChangeText={setConfirmPassword}
							secureTextEntry={!showConfirmPassword}
							className="flex-1 text-xl"
							placeholder="Confirm Password"
						/>
						<TouchableOpacity
							onPress={() =>
								setShowConfirmPassword(!showConfirmPassword)
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

				<TouchableOpacity
					onPress={handleNext}
					disabled={loading}
					className="bg-green-600 p-4 rounded-lg"
				>
					<Text className="text-white text-center text-lg">
						{loading ? 'Please wait...' : 'Next'}
					</Text>
				</TouchableOpacity>
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
		fontSize: 14,
		textAlign: 'center',
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
});
