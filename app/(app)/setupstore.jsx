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
	StyleSheet,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
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
import EvilIcons from '@expo/vector-icons/EvilIcons';
import { Picker } from '@react-native-picker/picker';
import Tabs from '@/components/Tabs';
import CategoryDropdown from '../../components/CategoryDropdown';
import * as FileSystem from 'expo-file-system';

const SetupStoreScreen = () => {
	const router = useRouter();
	const { userInfo, checkLoginStatus, selectedStore } =
		useContext(AuthContext);
	const [businessData, setBusinessData] = useState(null);
	const storeInfo = selectedStore;

	// General Store Info
	const [storeName, setStoreName] = useState(
		storeInfo?.name || '',
	);
	const [storeLink, setStoreLink] = useState(
		storeInfo?.storeLink || '',
	);
	const [description, setDescription] = useState(
		storeInfo?.description || '',
	);
	const [email, setEmail] = useState(
		storeInfo?.email || '',
	);
	const [openingHours, setOpeningHours] = useState(
		storeInfo?.openingHours || '',
	);

	// Images (align with backend fields)
	const [picture, setPicture] = useState(
		storeInfo?.logoUrl || '',
	); // Logo (logoUrl)
	const [banner, setBanner] = useState(
		storeInfo?.bannerUrl || '',
	); // Banner (bannerUrl)

	// Theme & Features
	const [themes, setThemes] = useState([
		{ id: 'product', name: 'Product Store (Item focus)' },
		{ id: 'service', name: 'Service Business (Booking focus)' },
	]);
	const [selectedTheme, setSelectedTheme] =
		useState('product');
	const [isCampusAppEnabled, setIsCampusAppEnabled] =
		useState(storeInfo?.isVendor || false);
	const [reviewsEnabled, setReviewsEnabled] = useState(
		storeInfo?.reviewsEnabled ?? true,
	);
	const [currency, setCurrency] = useState(
		storeInfo?.currency || 'NGN',
	);
	const [priceFormat, setPriceFormat] = useState(
		storeInfo?.priceFormat || 'comma',
	);

	// Category
	const [category, setCategory] = useState(
		storeInfo?.category || '',
	);

	// UI States
	const [loading, setLoading] = useState(false);
	const [showPreviewModal, setShowPreviewModal] =
		useState(false);

	// Ref for screenshot (wrap a native view)
	const storeInfoRef = useRef(null);

	// --- Helper Functions ---

	const generateStoreLink = () => {
		const sanitizedStoreName = storeName
			.trim()
			.replace(/\s+/g, '')
			.toLowerCase();
		setStoreLink(`${sanitizedStoreName}`);
	};

	const getBusinessInfo = async () => {
		try {
			// fetch store by id
			const response = await axiosInstance.get(
				`/stores?id=${storeInfo?._id}`,
			);
			console.log('Fetched business info:', response.data);
			const fetchedBusinessData = response.data.store;
			setBusinessData(fetchedBusinessData);
			// Populate states with fetched data
			setStoreName(fetchedBusinessData.name || '');
			setStoreLink(fetchedBusinessData.storeLink || '');
			setDescription(fetchedBusinessData.description || '');
			setEmail(fetchedBusinessData.email || '');
			setOpeningHours(
				fetchedBusinessData.openingHours || '',
			);
			setIsCampusAppEnabled(
				fetchedBusinessData.isVendor || false,
			);
			setSelectedTheme(
				fetchedBusinessData.theme || 'product',
			);
			setPicture(fetchedBusinessData.logoUrl || '');
			setBanner(fetchedBusinessData.bannerUrl || '');
			setReviewsEnabled(
				typeof fetchedBusinessData.reviewsEnabled ===
					'boolean'
					? fetchedBusinessData.reviewsEnabled
					: true,
			);
			setCurrency(fetchedBusinessData.currency || 'NGN');
			setPriceFormat(
				fetchedBusinessData.priceFormat || 'comma',
			);
			setCategory(fetchedBusinessData.category || '');
		} catch (error) {
			console.error(
				'Failed to fetch business info:',
				error.response?.data || error,
			);
			Alert.alert(
				'Error',
				'Failed to load business information.',
			);
		}
	};

	// 	const fetchThemes = async () => {
	// 		try {
	// 			// Replace with your actual themes API endpoint if you have one
	// 			setThemes([{ id: 'default', name: 'Default' }]);
	// 		} catch (error) {
	// 			console.error('Error fetching themes:', error);
	// 		}
	// 	};

	const pickImage = async (setImageSetter, aspect) => {
		let result = await ImagePicker.launchImageLibraryAsync({
			allowsEditing: true,
			aspect: aspect,
			quality: 1,
		});

		if (!result.canceled) {
			setImageSetter(result.assets[0].uri);
		}
	};

	// helper to create a file object suitable for FormData
	const makeFileForForm = (uri, fieldName = 'file') => {
		// derive filename & type
		const uriParts = uri.split('/');
		const name =
			uriParts[uriParts.length - 1] || `${fieldName}.jpg`;
		// attempt to infer mime type
		let match = /\.(\w+)$/.exec(name);
		let ext = match ? match[1].toLowerCase() : 'jpg';
		let type = 'image/jpeg';
		if (ext === 'png') type = 'image/png';
		if (ext === 'gif') type = 'image/gif';
		return {
			uri,
			name,
			type,
		};
	};

	const handleSaveSetup = async () => {
		setLoading(true);

		if (!storeName || !description) {
			Alert.alert(
				'Heads Up!',
				'Please fill in your Store Name and Description.',
			);
			setLoading(false);
			return;
		}

		try {
			const formData = new FormData();

			// append basic fields
			formData.append('name', storeName);
			formData.append('storeLink', storeLink);
			formData.append('description', description);
			if (openingHours)
				formData.append(
					'openingHours',
					JSON.stringify(openingHours),
				);
			if (category) formData.append('category', category);
			formData.append('theme', selectedTheme);
			formData.append(
				'isVendor',
				String(isCampusAppEnabled),
			);
			formData.append(
				'reviewsEnabled',
				String(reviewsEnabled),
			);
			formData.append('currency', currency);
			formData.append('priceFormat', priceFormat);
			if (category) formData.append('category', category);

			// For images:
			// - If local URI (not starting with http) -> append file under field names 'logo' and 'banner'
			// - If remote URL, append logoUrl/bannerUrl so backend knows to keep it
			if (picture && !picture.startsWith('http')) {
				formData.append(
					'logo',
					makeFileForForm(picture, 'logo'),
				);
			} else if (picture && picture.startsWith('http')) {
				formData.append('logoUrl', picture);
			} else {
				// user cleared the logo -> send empty string so backend can remove it
				formData.append('logoUrl', '');
			}

			if (banner && !banner.startsWith('http')) {
				formData.append(
					'banner',
					makeFileForForm(banner, 'banner'),
				);
			} else if (banner && banner.startsWith('http')) {
				formData.append('bannerUrl', banner);
			} else {
				formData.append('bannerUrl', '');
			}

			const token = await AsyncStorage.getItem('userToken');
			const businessId = storeInfo?.parent;

			// axiosInstance usually has interceptors; but set header explicitly for safety
			await axiosInstance.put(
				`/stores/${businessId}`,
				formData,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'multipart/form-data',
					},
				},
			);

			// Re-fetch user + business info to update context/UI
			await checkLoginStatus();
			await getBusinessInfo();

			setLoading(false);
			Alert.alert(
				'Success!',
				'Your website settings have been saved successfully!',
			);
		} catch (error) {
			console.error(
				'Error saving store setup:',
				error.response?.data || error,
			);
			Alert.alert(
				'Error',
				error.response?.data?.message ||
					'Failed to save your store settings. Please try again.',
			);
			setLoading(false);
		}
	};

	const handleShare = async () => {
		try {
			if (!storeInfoRef.current) {
				Alert.alert(
					'Error',
					'Could not capture image for sharing. Please try again.',
				);
				return;
			}

			// captureRef expects the native view (ref.current)
			const base64 = await captureRef(
				storeInfoRef.current,
				{
					format: 'jpg',
					quality: 1,
					result: 'base64',
				},
			);

			const message = `Check out my store on Tradeet! Visit: https://${storeLink}.tradeet.ng`;

			if (Platform.OS === 'ios') {
				await Share.share({
					message,
					url: `data:image/jpeg;base64,${base64}`,
				});
			} else {
				// Android: write base64 to a temporary file and share
				const tempFilePath = `${FileSystem.cacheDirectory}store_preview.jpg`;
				await FileSystem.writeAsStringAsync(
					tempFilePath,
					base64,
					{ encoding: FileSystem.EncodingType.Base64 },
				);

				await Sharing.shareAsync(tempFilePath, {
					mimeType: 'image/jpeg',
					UTI: 'public.jpeg',
					dialogTitle: message,
				});

				Clipboard.setString(message);
				ToastAndroid.show(
					'Store link copied to clipboard!',
					ToastAndroid.LONG,
				);
			}
		} catch (error) {
			console.error('Error sharing store info:', error);
			Alert.alert(
				'Share Failed',
				'Could not share the store information. Please try again.',
			);
		}
	};

	// --- Effects ---
	useEffect(() => {
		getBusinessInfo();
		// fetchThemes();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		generateStoreLink();
	}, [storeName]);

	const scenes = [
		{
			key: 'branding',
			title: 'Branding',
			content: (
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.scrollViewContent}
				>
					<Text style={styles.sectionHeading}>
						Your Business Branding
					</Text>
					<View style={styles.sectionCard}>
						<TouchableOpacity
							onPress={() => pickImage(setBanner, [16, 9])}
							style={styles.bannerUploadContainer}
						>
							<View style={styles.dottedRectangle}>
								{banner ? (
									<Image
										source={{ uri: banner }}
										style={styles.bannerPreview}
									/>
								) : (
									<View style={styles.uploadPlaceholder}>
										<EvilIcons
											name="camera"
											size={34}
											color="#ccc"
										/>
										<Text style={styles.bannerText}>
											Upload your business banner
										</Text>
									</View>
								)}
							</View>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => pickImage(setPicture, [1, 1])}
							style={styles.logoUploadContainer}
						>
							<View style={styles.dottedCircle}>
								{picture ? (
									<Image
										source={{ uri: picture }}
										style={styles.imagePreview}
									/>
								) : (
									<View style={styles.uploadPlaceholder}>
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

						<Text style={styles.label}>Business Name</Text>
						<TextInput
							style={styles.input}
							placeholder="e.g., My Amazing Shop"
							value={storeName}
							onChangeText={setStoreName}
							onBlur={generateStoreLink}
						/>

						<Text style={styles.label}>
							Business Category
						</Text>
						<CategoryDropdown
							selectedCategory={category}
							setSelectedCategory={setCategory}
						/>

						<Text style={styles.label}>
							About Your Business
						</Text>
						<TextInput
							style={[
								styles.input,
								{ textAlignVertical: 'top' },
							]}
							placeholder="Tell customers about your business..."
							value={description}
							onChangeText={setDescription}
							multiline
							numberOfLines={4}
						/>

						<Text style={styles.label}>Email Address</Text>
						<TextInput
							style={styles.input}
							placeholder="e.g., info@yourstore.com"
							value={email}
							onChangeText={setEmail}
							keyboardType="email-address"
						/>
					</View>
				</ScrollView>
			),
		},
		// ... presence, payment, theme scenes remain unchanged ...
		{
			key: 'presence',
			title: 'Presence',
			content: (
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.scrollViewContent}
				>
					<Text style={styles.sectionHeading}>
						Online Presence & Features
					</Text>
					<View style={styles.sectionCard}>
						<Text style={styles.label}>
							Your Unique Store Link
						</Text>
						<View style={styles.linkContainer}>
							<Text style={styles.linkText}>
								{storeLink.replace('tradeet.ng/', '')}
							</Text>
							<Text style={styles.linkPrefix}>
								.tradeet.ng
							</Text>
						</View>
						<Text style={styles.hintText}>
							This link is automatically generated from your
							store name.
						</Text>

						<View style={styles.switchContainer}>
							<View>
								<Text style={styles.switchLabel}>
									Enable Reviews & Ratings
								</Text>
								<Text style={styles.hintText}>
									Allow customers to leave feedback on your
									products/services.
								</Text>
							</View>
							<Switch
								onValueChange={setReviewsEnabled}
								value={reviewsEnabled}
								trackColor={{
									false: '#767577',
									true: '#81b0ff',
								}}
								thumbColor={
									reviewsEnabled ? '#f5dd4b' : '#f4f3f4'
								}
							/>
						</View>

						<View style={styles.switchContainer}>
							<View>
								<Text style={styles.switchLabel}>
									Enable on Tradeet App (Vendor Status)
								</Text>
								<Text style={styles.hintText}>
									Show your store to users on the main
									Tradeet app.
								</Text>
							</View>
							<Switch
								onValueChange={setIsCampusAppEnabled}
								value={isCampusAppEnabled}
								trackColor={{
									false: '#767577',
									true: '#81b0ff',
								}}
								thumbColor={
									isCampusAppEnabled ? '#f5dd4b' : '#f4f3f4'
								}
							/>
						</View>
					</View>
				</ScrollView>
			),
		},
		{
			key: 'payment',
			title: 'Payment',
			content: (
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.scrollViewContent}
				>
					<Text style={styles.sectionHeading}>
						Payment & Display Settings
					</Text>
					<View style={styles.sectionCard}>
						<Text style={styles.label}>Currency</Text>
						<View style={styles.pickerContainer}>
							<Picker
								selectedValue={currency}
								onValueChange={(itemValue) =>
									setCurrency(itemValue)
								}
								style={styles.picker}
							>
								<Picker.Item
									label="Nigerian Naira (NGN)"
									value="NGN"
								/>
								<Picker.Item
									label="United States Dollar (USD)"
									value="USD"
								/>
							</Picker>
						</View>

						<Text style={styles.label}>
							Price Display Format
						</Text>
						<View style={styles.pickerContainer}>
							<Picker
								selectedValue={priceFormat}
								onValueChange={(itemValue) =>
									setPriceFormat(itemValue)
								}
								style={styles.picker}
							>
								<Picker.Item
									label="1,234.56 (Comma Separator)"
									value="comma"
								/>
								<Picker.Item
									label="1.234,56 (Dot Separator)"
									value="dot"
								/>
							</Picker>
						</View>
					</View>
				</ScrollView>
			),
		},
		{
			key: 'theme',
			title: 'Theme',
			content: (
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.scrollViewContent}
				>
					<Text style={styles.sectionHeading}>
						Choose Your Store Theme
					</Text>
					<View
						style={[
							styles.sectionCard,
							styles.themeContainer,
						]}
					>
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
				</ScrollView>
			),
		},
	];

	return (
		<View style={styles.container}>
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={false}
			/>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backButton}
				>
					<Ionicons
						name="arrow-back"
						size={24}
						color="#1C2634"
					/>
					<Text style={styles.headerTitle}>
						Business Website Setup
					</Text>
				</TouchableOpacity>
			</View>

			<Tabs scenes={scenes} />

			<View style={styles.saveButtonContainer}>
				<Pressable
					style={styles.saveButton}
					onPress={handleSaveSetup}
					disabled={loading}
				>
					{loading ? (
						<Text style={styles.saveButtonText}>
							Saving...
						</Text>
					) : (
						<Text style={styles.saveButtonText}>
							Save All Settings
						</Text>
					)}
				</Pressable>
			</View>

			<Modal
				visible={showPreviewModal}
				transparent
				animationType="slide"
			>
				<View style={styles.modalBackground}>
					<View style={styles.modalContent}>
						{/* Wrap StoreCard with a native View that has the ref so captureRef works reliably */}
						<View
							ref={storeInfoRef}
							collapsable={false}
							style={{ width: '100%' }}
						>
							<StoreCard
								storeName={storeName}
								description={description}
								storeLink={`https://tradeet.ng/${storeLink}`}
								logoUrl={picture}
								bannerUrl={banner}
								storeBanner={banner}
								currency={currency}
								priceFormat={priceFormat}
								reviewsEnabled={reviewsEnabled}
							/>
						</View>

						<View style={styles.modalActions}>
							<TouchableOpacity
								style={[
									styles.modalButton,
									styles.closeButton,
								]}
								onPress={() => setShowPreviewModal(false)}
							>
								<Text style={styles.modalButtonText}>
									Close
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.modalButton,
									styles.shareButton,
								]}
								onPress={handleShare}
							>
								<Text style={styles.modalButtonText}>
									Share Your Store
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
};

export default SetupStoreScreen;

// Styles remain unchanged; pasted for completeness
const styles = StyleSheet.create({
	/* ... keep your existing styles as you provided earlier ... */
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		paddingTop:
			Platform.OS === 'android'
				? StatusBar.currentHeight
				: 0,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 15,
		paddingVertical: 10,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	headerTitle: {
		fontSize: 22,
		color: '#1C2634',
		fontWeight: 'bold',
	},
	scrollViewContent: {
		paddingHorizontal: 20,
		paddingBottom: 30,
	},
	sectionHeading: {
		fontSize: 18,
		fontWeight: '700',
		color: '#333',
		marginTop: 25,
		marginBottom: 10,
	},
	sectionCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 15,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 3,
		marginBottom: 15,
	},
	label: {
		fontSize: 15,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
		marginTop: 15,
	},
	hintText: {
		fontSize: 12,
		color: '#777',
		marginBottom: 10,
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		padding: 12,
		borderRadius: 8,
		fontSize: 16,
		color: '#333',
	},
	bannerUploadContainer: {
		alignItems: 'center',
		marginBottom: 20,
	},
	dottedRectangle: {
		borderStyle: 'dashed',
		borderWidth: 2,
		borderColor: '#ccc',
		width: '100%',
		height: 150,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10,
		backgroundColor: '#f9f9f9',
		overflow: 'hidden',
	},
	bannerPreview: {
		width: '100%',
		height: '100%',
		borderRadius: 8,
		resizeMode: 'cover',
	},
	bannerText: {
		textAlign: 'center',
		color: '#999',
		marginTop: 5,
		fontSize: 14,
	},
	logoUploadContainer: {
		alignItems: 'center',
		marginTop: -60,
		marginBottom: 20,
		zIndex: 10,
	},
	dottedCircle: {
		borderStyle: 'dashed',
		borderWidth: 2,
		borderColor: '#ccc',
		width: 120,
		height: 120,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 60,
		backgroundColor: '#fff',
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 5,
	},
	imagePreview: {
		width: 110,
		height: 110,
		borderRadius: 55,
		resizeMode: 'cover',
	},
	uploadPlaceholder: {
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
	},
	uploadText: {
		textAlign: 'center',
		color: '#999',
		marginTop: 5,
		fontSize: 13,
	},
	linkContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#e9e9e9',
		padding: 12,
		borderRadius: 8,
		marginBottom: 10,
	},
	linkPrefix: {
		color: '#666',
		fontSize: 16,
	},
	linkText: {
		color: '#333',
		fontWeight: '600',
		fontSize: 16,
	},
	switchContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
		marginBottom: 5,
	},
	switchLabel: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
	},
	pickerContainer: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		overflow: 'hidden',
		marginBottom: 15,
		backgroundColor: '#fff',
	},
	picker: {
		height: 50,
		width: '100%',
		color: '#333',
	},
	themeContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'flex-start',
		paddingVertical: 10,
	},
	themeOption: {
		paddingHorizontal: 15,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 20,
		marginRight: 10,
		marginBottom: 10,
		backgroundColor: '#f0f0f0',
	},
	selectedTheme: {
		borderColor: '#007bff',
		backgroundColor: '#e6f2ff',
	},
	themeText: {
		color: '#333',
		fontWeight: '500',
	},
	saveButtonContainer: {
		padding: 20,
		backgroundColor: '#f5f5f5',
	},
	saveButton: {
		backgroundColor: '#007bff',
		padding: 16,
		borderRadius: 10,
		alignItems: 'center',
		shadowColor: '#007bff',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
		elevation: 6,
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
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 15,
		padding: 20,
		width: '90%',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
		elevation: 8,
	},
	modalActions: {
		flexDirection: 'row',
		marginTop: 20,
		gap: 15,
	},
	modalButton: {
		paddingVertical: 12,
		paddingHorizontal: 25,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 100,
	},
	closeButton: {
		backgroundColor: '#6c757d',
	},
	shareButton: {
		backgroundColor: '#28a745',
	},
	modalButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});
