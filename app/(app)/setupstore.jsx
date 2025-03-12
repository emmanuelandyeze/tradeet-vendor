import React, {
	useState,
	useEffect,
	useContext,
	useRef,
} from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
	Alert,
	Switch,
	Modal,
	Share,
	Image,
	Platform,
	Pressable,
	ToastAndroid,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
// import * as ScreenCapture from 'expo-screen-capture';
import * as Sharing from 'expo-sharing';
import axiosInstance from '@/utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '@/context/AuthContext';
import { captureRef } from 'react-native-view-shot';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import StoreCard from '@/components/StoreCard';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '@/utils/cloudinary';
import EvilIcons from '@expo/vector-icons/EvilIcons';

const SetupStoreScreen = ({}) => {
	const router = useRouter();
	const { userInfo, checkLoginStatus } =
		useContext(AuthContext);
	const [businessData, setBusinessData] = useState(null);
	const [storeName, setStoreName] = useState(
		userInfo?.name || '',
	);
	const [storeLink, setStoreLink] = useState(
		userInfo?.storeLink || '',
	);
	const [description, setDescription] = useState(
		userInfo?.description || '',
	);
	const [email, setEmail] = useState(userInfo?.email || '');
	const [openingHours, setOpeningHours] = useState(
		userInfo?.openingHours || '',
	);
	const [isCampusAppEnabled, setIsCampusAppEnabled] =
		useState(userInfo?.isVendor || false);
	const [showPreviewModal, setShowPreviewModal] =
		useState(false);
	const [themes, setThemes] = useState([
		{ id: 'default', name: 'Default' },
	]);
	const [selectedTheme, setSelectedTheme] =
		useState('default');
	const storeInfoRef = useRef(null);
	const [picture, setPicture] = useState(
		userInfo?.logoUrl || '',
	);
	const [banner, setBanner] = useState(
		userInfo?.storeBanner || '',
	);
	const [loading, setLoading] = useState(false)

	const generateStoreLink = () => {
		const sanitizedStoreName = storeName
			.trim()
			.replace(/\s+/g, '')
			.toLowerCase();
		setStoreLink(`${sanitizedStoreName}`);
	};

	// Function to get user information
	const getBusinessInfo = async () => {
		try {
			const token = await AsyncStorage.getItem('userToken');
			const response = await axiosInstance.get(
				`/businesses/b/${userInfo?._id}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);
			console.log(response.data.business);
			// console.log('User info response:', response.data);
			setBusinessData(response.data.business); // Update the user state with fetched data
		} catch (error) {
			console.error(
				'Failed to fetch user info:',
				error.response?.data || error,
			);
			throw error; // Propagate error for handling in the UI
		}
	};

	useEffect(() => {
		getBusinessInfo();
	}, []);

	const fetchThemes = async () => {
		try {
			const response = await axiosInstance.get(
				'https://api.yourapi.com/themes',
			);
			setThemes(
				response.data.themes || [
					{ id: 'default', name: 'Default' },
				],
			);
		} catch (error) {
			console.error('Error fetching themes:', error);
		}
	};

	// Function to open ImagePicker
	const pickLogo = async () => {
		const { status } =
			await ImagePicker.requestMediaLibraryPermissionsAsync();

		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 1,
		});

		if (!result.canceled) {
			setPicture(result.assets[0].uri);
		}
	};

	const pickBanner = async () => {
		const { status } =
			await ImagePicker.requestMediaLibraryPermissionsAsync();

		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			// aspect: [16, 9],
			quality: 1,
		});

		if (!result.canceled) {
			setBanner(result.assets[0].uri);
		}
	};

	// Function to handle image upload to Cloudinary
	const handleLogoUpload = async () => {
		try {
			const response = await uploadImageToCloudinary(
				picture
			);
			if (response.secure_url) {
				setPicture(response.secure_url);
				return response.secure_url;
			} else {
				alert('Failed to upload logo');
				return null;
			}
		} catch (error) {
			console.error('Error uploading logo:', error);
			alert('Logo upload failed. Please try again.');
			return null;
		}
	};

	const handleBannerUpload = async () => {
		try {
			const response = await uploadImageToCloudinary(
				banner
			);
			console.log(response)
			if (response.secure_url) {
				setBanner(response.secure_url);
				return response.secure_url;
			} else {
				alert(response.error.message);
				return null;
			}
		} catch (error) {
			console.error('Error uploading banner:', error);
			return null;
		}
	};

	const handleSaveSetup = async () => {
		try {
			setLoading(true);

			if (!storeName || !description) {
				Alert.alert(
					'Error',
					'Please fill in all required fields.',
				);
				setLoading(false);
				return;
			}

			let uploadedLogoUrl = businessData.logoUrl; // Keep existing logo if not updated
			let uploadedBannerUrl = businessData.storeBanner; // Keep existing banner if not updated

			// Upload new logo only if user selected one
			if (picture) {
				uploadedLogoUrl = await handleLogoUpload();
				if (!uploadedLogoUrl) {
					ToastAndroid.show(
						'Logo upload failed. Please try again.',
						ToastAndroid.LONG,
					);
					setLoading(false);
					return;
				}
			}

			// Upload new banner only if user selected one
			if (banner) {
				uploadedBannerUrl = await handleBannerUpload();
				if (!uploadedBannerUrl) {
					ToastAndroid.show(
						'Banner upload failed. Please try again.',
						ToastAndroid.LONG,
					);
					setLoading(false);
					return;
				}
			}

			const updatedData = {
				name: storeName,
				storeLink,
				description,
				openingHours,
				email,
				theme: selectedTheme,
				isVendor: isCampusAppEnabled,
				logoUrl: uploadedLogoUrl,
				storeBanner: uploadedBannerUrl,
			};

			await axiosInstance.put(
				`/businesses/${businessData._id}`,
				updatedData,
			);

			setBusinessData((prevData) => ({
				...prevData,
				...updatedData,
			}));

			setLoading(false);
			Alert.alert(
				'Success',
				'Website settings have been saved successfully!',
			);
		} catch (error) {
			console.error('Error saving store setup:', error);
			Alert.alert('Error', 'Failed to save store setup.');
			setLoading(false);
		}
	};


	const handleShare = async () => {
		try {
			// Capture the store info as an image
			const uri = await captureRef(storeInfoRef, {
				format: 'jpg',
				quality: 1,
			});

			console.log('Captured Image URI:', uri);

			// Define the message
			const message =
				'Check out this store information! Visit: https://tradeet.ng/store-name';

			if (Platform.OS === 'ios') {
				// iOS supports sharing both text and image together
				await Share.share({
					message,
					url: uri,
				});
			} else {
				// On Android, share the image separately first
				const isAvailable =
					await Sharing.isAvailableAsync();
				if (isAvailable) {
					await Sharing.shareAsync(uri);
				}

				// Copy text to clipboard since Android may not support both
				await Clipboard.setStringAsync(message);
				Alert.alert(
					'Copied!',
					'Store info text copied to clipboard.',
				);
			}
		} catch (error) {
			console.error('Error sharing store info:', error);
			Alert.alert(
				'Error',
				'Failed to share the store information.',
			);
		}
	};

	useEffect(() => {
		fetchThemes();
		generateStoreLink();
	}, []);

	return (
		<View
			style={{
				paddingHorizontal: 20,
				paddingTop: 40,
				flex: 1,
				backgroundColor: '#fff'
			}}
		>
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<TouchableOpacity
						onPress={() => router.push('/(app)/settings')}
						style={{
							display: 'flex',
							flexDirection: 'row',
							gap: 5,
							alignItems: 'center',
						}}
					>
						<Ionicons
							name="chevron-back-outline"
							size={24}
							color="#1C2634"
						/>
						<Text
							style={{
								fontSize: 22,
								color: '#1C2634',
								fontWeight: 'bold',
							}}
						>
							Website Setup
						</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.headerRight}></View>
			</View>

			<ScrollView style={{marginBottom: 20}} showsVerticalScrollIndicator={false}>
				{/* Banner  */}
				<TouchableOpacity
					onPress={pickBanner}
					style={styles.bannerUploadContainer}
				>
					<View style={styles.dottedRectangle}>
						{banner || businessData?.storeBanner ? (
							<Image
								source={{
									uri: banner || businessData?.storeBanner,
								}}
								style={styles.bannerPreview}
							/>
						) : (
							<View
								style={{
									flexDirection: 'column',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<EvilIcons
									name="camera"
									size={34}
									color="#ccc"
								/>
								<Text style={styles.bannerText}>
									Upload your store banner
								</Text>
							</View>
						)}
					</View>
				</TouchableOpacity>
				{/* Logo  */}
				<TouchableOpacity
					onPress={pickLogo}
					style={styles.imageUploadContainer}
				>
					<View style={styles.dottedCircle}>
						{picture || businessData?.logoUrl ? (
							<Image
								source={{
									uri: picture || businessData?.logoUrl,
								}}
								style={styles.imagePreview}
							/>
						) : (
							<View
								style={{
									flexDirection: 'column',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<EvilIcons
									name="camera"
									size={34}
									color="#ccc"
								/>
								<Text style={styles.uploadText}>
									Upload your store logo
								</Text>
							</View>
						)}
					</View>
				</TouchableOpacity>

				<Text
					style={{
						fontWeight: 'bold',
						fontSize: 16,
						marginBottom: 5,
					}}
				>
					Store Name
				</Text>
				<TextInput
					style={styles.input}
					placeholder="Store Name"
					value={storeName}
					onChangeText={setStoreName}
					onBlur={generateStoreLink}
				/>
				<Text
					style={{
						fontWeight: 'bold',
						fontSize: 16,
						marginBottom: 5,
					}}
				>
					About your store
				</Text>
				<TextInput
					style={[
						styles.input,
						{ textAlignVertical: 'top' },
					]}
					placeholder="Store Description"
					value={description}
					onChangeText={setDescription}
					multiline
					numberOfLines={5}
				/>
				<Text
					style={{
						fontWeight: 'bold',
						fontSize: 16,
						marginBottom: 5,
					}}
				>
					Email Address
				</Text>
				<TextInput
					style={[styles.input]}
					placeholder="Email Address"
					value={email}
					onChangeText={setEmail}
				/>

				<Text
					style={{
						fontWeight: 'bold',
						fontSize: 16,
						marginBottom: 5,
					}}
				>
					Store Link (This is automatically generated)
				</Text>
				<View style={styles.linkContainer}>
					<Text style={styles.linkPrefix}>tradeet.ng/</Text>
					<Text style={styles.linkText}>
						{storeLink.replace('tradeet.ng/', '')}
					</Text>
				</View>

				<Text style={styles.sectionTitle}>Store Theme</Text>
				<View style={styles.themeContainer}>
					{themes.map((theme) => (
						<TouchableOpacity
							key={theme.id}
							style={[
								styles.themeOption,
								selectedTheme === theme.id &&
									styles.selectedTheme,
							]}
							onPress={() => setSelectedTheme(theme.id)}
						>
							<Text style={styles.themeText}>
								{theme.name}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				<Pressable
					style={styles.saveButton}
					onPress={handleSaveSetup}
					disabled={loading}
				>
					<Text style={styles.saveButtonText}>
						{loading ? 'Loading...' : 'Save Settings'}
					</Text>
				</Pressable>
			</ScrollView>

			{/* Modal to preview store details */}
			<Modal
				visible={showPreviewModal}
				transparent
				animationType="slide"
			>
				<View style={styles.modalBackground}>
					<View
						style={{
							backgroundColor: '#fff',
							paddingVertical: 16,
							borderRadius: 10,
							flexDirection: 'column',
							marginBottom: 10,
							justifyContent: 'center',
							alignItems: 'center',
							width: '90%',
							marginTop: 10,
							gap: 4,
						}}
					>
						<StoreCard
							userInfo={userInfo}
							storeName={storeName}
							description={description}
							storeLink={storeLink}
							storeInfoRef={storeInfoRef}
						/>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'flex-end',
								gap: 10,
							}}
						>
							<TouchableOpacity
								style={{
									backgroundColor: 'gray',
									padding: 10,
									borderRadius: 8,
									marginTop: 10,
								}}
								onPress={() => setShowPreviewModal(false)}
							>
								<Text style={styles.shareButtonText}>
									Close
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.shareButton}
								onPress={handleShare}
							>
								<Text style={styles.shareButtonText}>
									Share
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = {
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	label: {
		marginTop: 10,
		fontWeight: '500',
		color: '#333',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		borderRadius: 8,
		marginBottom: 15,
	},
	linkContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f0f0f0',
		padding: 10,
		borderRadius: 8,
		marginBottom: 20,
	},
	linkPrefix: { color: '#888' },
	linkText: { color: '#333', fontWeight: '600' },
	switchContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
	},
	themeContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	themeOption: {
		padding: 10,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		marginRight: 10,
		marginBottom: 10,
	},
	selectedTheme: {
		borderColor: 'blue',
		backgroundColor: '#e6f0ff',
	},
	saveButton: {
		backgroundColor: 'green',
		padding: 15,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 20,
	},
	saveButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 18,
	},
	modalBackground: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	previewContainer: {
		backgroundColor: '#fff',
		padding: 20,
		borderTopRightRadius: 10,
		borderTopLeftRadius: 10,
		alignItems: 'center',
		width: '80%',
	},
	previewTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	previewText: {
		fontSize: 16,
		marginVertical: 5,
		textAlign: 'center',
	},
	shareButton: {
		backgroundColor: 'green',
		padding: 10,
		borderRadius: 8,
		marginTop: 10,
	},
	shareButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		marginTop: 10,
		paddingHorizontal: 0,
		backgroundColor: '#fff',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerRight: {
		flexDirection: 'row',
	},
	imageUploadContainer: {
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
		marginTop: -60,
		zIndex: 50,
	},
	dottedCircle: {
		borderStyle: 'dotted',
		borderWidth: 1,
		borderColor: '#ccc',
		width: 160,
		height: 160,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 100,
		backgroundColor: '#fff',
	},
	imagePreview: {
		width: 120,
		height: 120,
		borderRadius: 60,
	},
	uploadText: {
		textAlign: 'center',
		color: '#999',
		marginTop: 10,
	},
	bannerUploadContainer: {
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	dottedRectangle: {
		borderStyle: 'dotted',
		borderWidth: 1,
		borderColor: '#ccc',
		width: '100%',
		height: 160,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10,
		backgroundColor: '#fff',
	},
	bannerPreview: {
		width: '100%',
		height: '100%',
		borderRadius: 10,
	},
	bannerText: {
		textAlign: 'center',
		color: '#999',
		marginTop: 10,
		fontSize: 16,
	},
};

export default SetupStoreScreen;
