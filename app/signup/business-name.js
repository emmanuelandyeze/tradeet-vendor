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
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
	useLocalSearchParams,
	useRouter,
} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '@/context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import axiosInstance, {
	onAuthFailure,
} from '@/utils/axiosInstance';

export default function BusinessNameScreen() {
	const router = useRouter();
	const [businessName, setBusinessName] = useState('');
	const [businessDescription, setBusinessDescription] =
		useState('');
	const [image, setImage] = useState(null);
	const [modalVisible, setModalVisible] = useState(false);
	const [loading, setLoading] = useState(false);
	const { userInfo, token, getUserInfo } = useContext(AuthContext);
	const { phoneNumber } = useLocalSearchParams();

	const [selectedTab, setSelectedTab] = useState('name');
	const [selectedOffering, setSelectedOffering] =
		useState('');

	const pickImage = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.9,
		});

		if (!result.canceled) {
			setImage(result.assets[0].uri);
			setModalVisible(false);
		}
	};

	const takePhoto = async () => {
		const { status } =
			await ImagePicker.requestCameraPermissionsAsync();
		if (status !== 'granted') {
			ToastAndroid.show(
				'Camera permissions are required to take a photo.',
				ToastAndroid.LONG,
			);
			return;
		}

		let result = await ImagePicker.launchCameraAsync({
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.9,
		});

		if (!result.canceled) {
			setImage(result.assets[0].uri);
			setModalVisible(false);
		}
	};

	const handleNext = async () => {
		setLoading(true);

		try {
			if (!businessName.trim()) {
				ToastAndroid.show(
					'Please enter your business name.',
					ToastAndroid.LONG,
				);
				setLoading(false);
				return;
			}
			if (!selectedOffering) {
				ToastAndroid.show(
					'Please select your business offering.',
					ToastAndroid.LONG,
				);
				setLoading(false);
				return;
			}

			const formData = new FormData();
			formData.append('name', businessName.trim());
			formData.append('serviceType', selectedOffering);
			if (businessDescription.trim())
				formData.append(
					'description',
					businessDescription.trim(),
				);

			if (image) {
				const logoType = image
					.split('.')
					.pop()
					.toLowerCase();
				const logoMime =
					logoType === 'jpg' || logoType === 'jpeg'
						? 'image/jpeg'
						: `image/${logoType}`;
				formData.append('logo', {
					uri: image,
					type: logoMime,
					name: `logo.${logoType}`,
				});
			}

			// NOTE: keep your axiosInstance handling as you already have it.
			// Common axios usage: axios.post('/stores', formData, { headers: { 'Content-Type': 'multipart/form-data' }})
			const response = await axiosInstance.post(
				'/stores',
				formData,
				{
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				},
			);

			const data = response.data;

			if (
				response.status >= 200 &&
				response.status < 300 &&
				data.message === 'Store created'
			) {
				// Refresh user info to update stores array in context
				// This prevents the AuthContext from redirecting back to business-name
				await getUserInfo(token);

				ToastAndroid.show(
					`Welcome to Tradeet, ${businessName}!`,
					ToastAndroid.LONG,
				);
				router.push('/signup/owner-details');
			} else {
				ToastAndroid.show(
					data.message ||
					'Failed to create store. Please try again.',
					ToastAndroid.LONG,
				);
			}
		} catch (error) {
			console.error('Error during store creation:', error);
			ToastAndroid.show(
				'An unexpected error occurred. Please try again.',
				ToastAndroid.LONG,
			);
		} finally {
			setLoading(false);
		}
	};

	const goToOffering = () => {
		if (!businessName.trim()) {
			ToastAndroid.show(
				'Please enter your business name.',
				ToastAndroid.LONG,
			);
			return;
		}
		if (!businessDescription.trim()) {
			ToastAndroid.show(
				'Please enter your business description.',
				ToastAndroid.LONG,
			);
			return;
		}
		setSelectedTab('offering');
	};

	return (
		<SafeAreaView style={styles.safe}>
			<KeyboardAvoidingView
				behavior={
					Platform.OS === 'ios' ? 'padding' : 'height'
				}
				style={styles.flex}
			>
				<View style={styles.container}>
					<View style={styles.card}>
						{/* Step indicator */}
						<View style={styles.stepRow}>
							<View
								style={[
									styles.step,
									selectedTab === 'name' &&
									styles.stepActive,
								]}
							/>
							<View
								style={[
									styles.step,
									selectedTab === 'offering' &&
									styles.stepActive,
								]}
							/>
						</View>

						{/* Title */}
						<Text style={styles.title}>
							{selectedTab === 'name'
								? "Let's set up your Business Profile"
								: 'Tell us more about your business'}
						</Text>

						{/* --- NAME TAB --- */}
						{selectedTab === 'name' && (
							<>
								<TouchableOpacity
									onPress={() => setModalVisible(true)}
									activeOpacity={0.8}
									style={styles.logoWrapper}
								>
									<View style={styles.dottedCircle}>
										{image ? (
											<>
												<Image
													source={{ uri: image }}
													style={styles.imagePreview}
												/>
												<View style={styles.logoEdit}>
													<Ionicons
														name="camera"
														size={16}
														color="#fff"
													/>
												</View>
											</>
										) : (
											<View
												style={styles.uploadPlaceholder}
											>
												<Ionicons
													name="image-outline"
													size={36}
													color="#9AA0A6"
												/>
												<Text style={styles.uploadText}>
													Upload your logo
												</Text>
											</View>
										)}
									</View>
								</TouchableOpacity>

								<View style={styles.field}>
									<Text style={styles.label}>
										Your Business Name*
									</Text>
									<TextInput
										value={businessName}
										onChangeText={setBusinessName}
										placeholder="E.g., Tradeet Store"
										style={styles.input}
										autoCapitalize="words"
										placeholderTextColor="#9aa0a6"
									/>
								</View>

								<View style={styles.field}>
									<Text style={styles.label}>
										How would you describe your business to
										customers?*
									</Text>
									<TextInput
										value={businessDescription}
										onChangeText={setBusinessDescription}
										placeholder="E.g., We offer fast and reliable delivery services."
										multiline
										numberOfLines={3}
										style={[styles.input, styles.textArea]}
										placeholderTextColor="#9aa0a6"
									/>
								</View>

								<View style={styles.actionsRight}>
									<TouchableOpacity
										onPress={goToOffering}
										disabled={loading}
										activeOpacity={0.9}
										style={[styles.primaryButton]}
									>
										<LinearGradient
											colors={['#0b7a4a', '#065637']}
											style={styles.gradient}
										>
											<Text
												style={styles.primaryButtonText}
											>
												Next
											</Text>
											<Ionicons
												name="arrow-forward"
												size={18}
												color="#fff"
												style={{ marginLeft: 8 }}
											/>
										</LinearGradient>
									</TouchableOpacity>
								</View>
							</>
						)}

						{/* --- OFFERING TAB --- */}
						{selectedTab === 'offering' && (
							<>
								<Text style={styles.subtitle}>
									How do you make money?
								</Text>

								<View style={styles.optionsRow}>
									<TouchableOpacity
										style={[
											styles.paymentMethodCard,
											selectedOffering === 'products' &&
											styles.paymentMethodSelected,
										]}
										onPress={() =>
											setSelectedOffering('products')
										}
										activeOpacity={0.9}
									>
										<View style={styles.optionHeader}>
											<View
												style={[
													styles.radioOuter,
													selectedOffering === 'products' &&
													styles.radioOuterSelected,
												]}
											>
												{selectedOffering ===
													'products' && (
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

									<TouchableOpacity
										style={[
											styles.paymentMethodCard,
											selectedOffering === 'services' &&
											styles.paymentMethodSelected,
										]}
										onPress={() =>
											setSelectedOffering('services')
										}
										activeOpacity={0.9}
									>
										<View style={styles.optionHeader}>
											<View
												style={[
													styles.radioOuter,
													selectedOffering === 'services' &&
													styles.radioOuterSelected,
												]}
											>
												{selectedOffering ===
													'services' && (
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

								<View style={styles.twoButtons}>
									<TouchableOpacity
										onPress={() => setSelectedTab('name')}
										disabled={loading}
										style={[styles.ghostButton]}
										activeOpacity={0.9}
									>
										<Text style={styles.ghostButtonText}>
											Previous
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={handleNext}
										disabled={loading}
										style={[
											styles.primaryButton,
											loading && { opacity: 0.85 },
										]}
										activeOpacity={0.9}
									>
										<LinearGradient
											colors={['#0b7a4a', '#065637']}
											style={styles.gradient}
										>
											{loading ? (
												<ActivityIndicator color="#fff" />
											) : (
												<Text
													style={styles.primaryButtonText}
												>
													Continue
												</Text>
											)}
										</LinearGradient>
									</TouchableOpacity>
								</View>
							</>
						)}
					</View>
				</View>

				{/* Modal */}
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
								style={[
									styles.modalButton,
									{ backgroundColor: '#333' },
								]}
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
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: {
		// flex: 1,
		backgroundColor: '#f3f7f5',
	},
	// flex: { flex: 1 },
	container: {
		// flex: 1,
		paddingHorizontal: 20,
		paddingHorizontal: 20,
		alignItems: 'center',
	},
	card: {
		width: '100%',
		maxWidth: 760,
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 22,
		// shadow (iOS)
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.06,
		shadowRadius: 18,
		// elevation (Android)
		elevation: 6,
	},
	stepRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 8,
		marginBottom: 12,
	},
	step: {
		height: 8,
		width: 8,
		borderRadius: 4,
		backgroundColor: '#E6EEF0',
		marginHorizontal: 4,
	},
	stepActive: {
		backgroundColor: '#06a04f',
		transform: [{ scale: 1.4 }],
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		textAlign: 'center',
		color: '#12343b',
		marginBottom: 16,
	},
	subtitle: {
		fontSize: 18,
		color: '#254343',
		marginBottom: 12,
		textAlign: 'left',
	},
	logoWrapper: {
		alignItems: 'center',
		marginBottom: 8,
	},
	dottedCircle: {
		width: 150,
		height: 150,
		borderRadius: 100,
		borderColor: '#D6E6DF',
		borderWidth: 2,
		borderStyle: 'dashed',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 8,
		backgroundColor: '#fbfffe',
	},
	uploadPlaceholder: {
		alignItems: 'center',
	},
	uploadText: {
		color: '#98a3a0',
		fontSize: 13,
		marginTop: 6,
	},
	imagePreview: {
		width: 122,
		height: 122,
		borderRadius: 62,
	},
	logoEdit: {
		position: 'absolute',
		right: 6,
		bottom: 6,
		backgroundColor: '#065637',
		borderRadius: 16,
		padding: 6,
		elevation: 3,
	},
	field: {
		marginTop: 10,
		marginBottom: 4,
	},
	label: {
		color: '#41585A',
		fontSize: 14,
		marginBottom: 8,
		fontWeight: '600',
	},
	input: {
		borderBottomWidth: 1,
		borderBottomColor: '#E6EEF0',
		paddingVertical: 8,
		fontSize: 16,
		color: '#243434',
	},
	textArea: {
		minHeight: 72,
		textAlignVertical: 'top',
	},
	actionsRight: {
		marginTop: 18,
		alignItems: 'flex-end',
	},
	primaryButton: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	gradient: {
		paddingVertical: 12,
		paddingHorizontal: 18,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},
	optionsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
		marginBottom: 18,
	},
	paymentMethodCard: {
		flex: 1,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E7EEF0',
		backgroundColor: '#ffffff',
	},
	paymentMethodSelected: {
		borderColor: '#bfe9d6',
		backgroundColor: '#f6fff7',
		shadowColor: '#0a6b43',
		shadowOpacity: 0.04,
		elevation: 2,
	},
	optionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 6,
	},
	radioOuter: {
		height: 20,
		width: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#cfdfe0',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	radioOuterSelected: {
		borderColor: '#0b7a4a',
	},
	radioInner: {
		height: 10,
		width: 10,
		borderRadius: 5,
		backgroundColor: '#0b7a4a',
	},
	optionText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#12343b',
	},
	optionSubtext: {
		fontSize: 13,
		color: '#6f7c7b',
		marginLeft: 30,
	},
	twoButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 6,
	},
	ghostButton: {
		paddingVertical: 12,
		paddingHorizontal: 18,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#DCEAE5',
		backgroundColor: '#fff',
		minWidth: 120,
		alignItems: 'center',
	},
	ghostButtonText: {
		color: '#254343',
		fontSize: 15,
		fontWeight: '600',
	},

	/* Modal */
	modalContainer: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	modalView: {
		backgroundColor: 'white',
		padding: 18,
		borderTopLeftRadius: 14,
		borderTopRightRadius: 14,
	},
	modalButton: {
		backgroundColor: '#065637',
		paddingVertical: 12,
		borderRadius: 10,
		marginBottom: 10,
		alignItems: 'center',
	},
	modalCancelButton: {
		backgroundColor: '#d9534f',
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: 'center',
	},
	modalButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '700',
	},
});
