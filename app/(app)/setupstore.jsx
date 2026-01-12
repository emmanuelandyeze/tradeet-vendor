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
	ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { Picker } from '@react-native-picker/picker'; // Keep native picker for now, or could replace with custom dropdown
import Tabs from '@/components/Tabs';
import CategoryDropdown from '../../components/CategoryDropdown';
import * as FileSystem from 'expo-file-system';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

const SetupStoreScreen = () => {
	const router = useRouter();
	const { userInfo, checkLoginStatus, selectedStore } = useContext(AuthContext);
	const [businessData, setBusinessData] = useState(null);
	const storeInfo = selectedStore;

	// General Store Info
	const [storeName, setStoreName] = useState(storeInfo?.name || '');
	const [storeLink, setStoreLink] = useState(storeInfo?.storeLink || '');
	const [customDomain, setCustomDomain] = useState(storeInfo?.customDomain || '');
	const [description, setDescription] = useState(storeInfo?.description || '');
	const [email, setEmail] = useState(storeInfo?.email || '');
	const [tin, setTin] = useState(storeInfo?.tin || '');
	const [openingHours, setOpeningHours] = useState(storeInfo?.openingHours || '');

	// Images
	const [picture, setPicture] = useState(storeInfo?.logoUrl || ''); // Logo
	const [banner, setBanner] = useState(storeInfo?.bannerUrl || ''); // Banner

	// Theme & Features
	const [themes, setThemes] = useState([
		{ id: 'product', name: 'Product Store', description: 'Best for physical items' },
		{ id: 'service', name: 'Service Business', description: 'Best for bookings/requests' },
	]);
	const [selectedTheme, setSelectedTheme] = useState('product');
	const [themeColor, setThemeColor] = useState(storeInfo?.themeColor || '#000000');
	const [isCampusAppEnabled, setIsCampusAppEnabled] = useState(storeInfo?.isVendor || false);
	const [reviewsEnabled, setReviewsEnabled] = useState(storeInfo?.reviewsEnabled ?? true);
	const [currency, setCurrency] = useState(storeInfo?.currency || 'NGN');
	const [priceFormat, setPriceFormat] = useState(storeInfo?.priceFormat || 'comma');

	// Category
	const [category, setCategory] = useState(storeInfo?.category || '');

	// Predefined Color Palette
	const colorPalette = [
		'#000000', // Black
		'#2563EB', // Blue
		'#DC2626', // Red
		'#16A34A', // Green
		'#D97706', // Amber
		'#7C3AED', // Violet
		'#DB2777', // Pink
		'#4B5563', // Gray
	];

	// UI States
	const [loading, setLoading] = useState(false);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const storeInfoRef = useRef(null);

	// --- Helper Functions ---
	const generateStoreLink = () => {
		if (storeInfo?.storeLink && storeInfo.storeLink !== '') return; // Don't overwrite existing
		const sanitizedStoreName = storeName
			.trim()
			.replace(/\s+/g, '')
			.toLowerCase();
		setStoreLink(`${sanitizedStoreName}`);
	};

	const getBusinessInfo = async () => {
		try {
			const response = await axiosInstance.get(`/stores?id=${storeInfo?._id}`);
			const fetchedBusinessData = response.data.store;
			setBusinessData(fetchedBusinessData);

			setStoreName(fetchedBusinessData.name || '');
			setStoreLink(fetchedBusinessData.storeLink || '');
			setCustomDomain(fetchedBusinessData.customDomain || '');
			setDescription(fetchedBusinessData.description || '');
			setEmail(fetchedBusinessData.email || '');
			setTin(fetchedBusinessData.tin || '');
			setOpeningHours(fetchedBusinessData.openingHours || '');
			setIsCampusAppEnabled(fetchedBusinessData.isVendor || false);
			setSelectedTheme(fetchedBusinessData.theme || 'product');
			setThemeColor(fetchedBusinessData.themeColor || '#000000');
			setPicture(fetchedBusinessData.logoUrl || '');
			setBanner(fetchedBusinessData.bannerUrl || '');
			setReviewsEnabled(typeof fetchedBusinessData.reviewsEnabled === 'boolean' ? fetchedBusinessData.reviewsEnabled : true);
			setCurrency(fetchedBusinessData.currency || 'NGN');
			setPriceFormat(fetchedBusinessData.priceFormat || 'comma');
			setCategory(fetchedBusinessData.category || '');
		} catch (error) {
			console.error('Failed to fetch business info:', error);
			Alert.alert('Error', 'Failed to load business information.');
		}
	};

	const pickImage = async (setImageSetter, aspect) => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') {
			alert('Sorry, we need camera roll permissions to make this work!');
			return;
		}

		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: aspect,
			quality: 0.8,
		});

		if (!result.canceled) {
			setImageSetter(result.assets[0].uri);
		}
	};

	const makeFileForForm = (uri, fieldName = 'file') => {
		const uriParts = uri.split('/');
		const name = uriParts[uriParts.length - 1] || `${fieldName}.jpg`;
		let match = /\.(\w+)$/.exec(name);
		let ext = match ? match[1].toLowerCase() : 'jpg';
		let type = 'image/jpeg';
		if (ext === 'png') type = 'image/png';
		if (ext === 'gif') type = 'image/gif';
		return { uri, name, type };
	};

	const handleSaveSetup = async () => {
		if (!storeName || !description) {
			Alert.alert('Incomplete', 'Please fill in your Store Name and Description.');
			return;
		}

		setLoading(true);
		try {
			const formData = new FormData();
			formData.append('name', storeName);
			formData.append('storeLink', storeLink);
			if (customDomain) formData.append('customDomain', customDomain);
			formData.append('description', description);
			if (openingHours) formData.append('openingHours', JSON.stringify(openingHours));
			formData.append('category', category);
			formData.append('theme', selectedTheme);
			formData.append('themeColor', themeColor);
			formData.append('isVendor', String(isCampusAppEnabled));
			formData.append('reviewsEnabled', String(reviewsEnabled));
			formData.append('currency', currency);
			formData.append('priceFormat', priceFormat);
			if (tin) formData.append('tin', tin);

			if (picture && !picture.startsWith('http')) {
				formData.append('logo', makeFileForForm(picture, 'logo'));
			} else if (picture && picture.startsWith('http')) {
				formData.append('logoUrl', picture);
			} else {
				formData.append('logoUrl', '');
			}

			if (banner && !banner.startsWith('http')) {
				formData.append('banner', makeFileForForm(banner, 'banner'));
			} else if (banner && banner.startsWith('http')) {
				formData.append('bannerUrl', banner);
			} else {
				formData.append('bannerUrl', '');
			}

			const token = await AsyncStorage.getItem('userToken');
			const businessId = storeInfo?.parent;

			await axiosInstance.put(`/stores/${businessId}`, formData, {
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'multipart/form-data',
				},
			});

			await checkLoginStatus();
			await getBusinessInfo();

			Alert.alert('Success', 'Settings saved successfully!');
		} catch (error) {
			console.error('Error saving:', error?.response?.data || error);
			Alert.alert('Error', error?.response?.data?.message || 'Failed to save settings.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		getBusinessInfo();
	}, []);

	// --- Render Components ---

	const renderLabel = (text, required = false) => (
		<Text style={styles.inputLabel}>
			{text} {required && <Text style={{ color: '#EF4444' }}>*</Text>}
		</Text>
	);

	const scenes = [
		{
			key: 'branding',
			title: 'Branding',
			content: (
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Visual Identity</Text>

						{/* Banner Upload */}
						<TouchableOpacity onPress={() => pickImage(setBanner, [16, 9])} style={styles.bannerUpload}>
							{banner ? (
								<>
									<Image source={{ uri: banner }} style={styles.bannerImage} />
									<View style={styles.editBadge}>
										<Feather name="edit-2" size={14} color="#fff" />
									</View>
								</>
							) : (
								<View style={styles.placeholderContainer}>
									<Feather name="image" size={32} color="#9CA3AF" />
									<Text style={styles.placeholderText}>Upload Cover Image</Text>
									<Text style={styles.placeholderSubText}>Recommended 16:9</Text>
								</View>
							)}
						</TouchableOpacity>

						{/* Logo Upload - Overlapping */}
						<View style={styles.logoRow}>
							<TouchableOpacity onPress={() => pickImage(setPicture, [1, 1])} style={styles.logoUpload}>
								{picture ? (
									<Image source={{ uri: picture }} style={styles.logoImage} />
								) : (
									<View style={styles.logoPlaceholder}>
										<Feather name="camera" size={24} color="#9CA3AF" />
									</View>
								)}
								<View style={styles.logoEditBadge}>
									<Feather name="plus" size={12} color="#fff" />
								</View>
							</TouchableOpacity>
							<View style={styles.logoTextContainer}>
								<Text style={styles.logoTitle}>Store Logo</Text>
								<Text style={styles.logoSubtitle}>Visible on your profile and invoices</Text>
							</View>
						</View>
					</View>

					<View style={styles.card}>
						<Text style={styles.cardTitle}>Basic Information</Text>

						<View style={styles.inputGroup}>
							{renderLabel('Business Name', true)}
							<TextInput
								style={styles.textInput}
								placeholder="e.g. Acme Corp"
								placeholderTextColor="#9CA3AF"
								value={storeName}
								onChangeText={setStoreName}
							/>
						</View>

						<View style={styles.inputGroup}>
							{renderLabel('Business Category')}
							<CategoryDropdown selectedCategory={category} setSelectedCategory={setCategory} />
						</View>

						<View style={styles.inputGroup}>
							{renderLabel('Description', true)}
							<TextInput
								style={[styles.textInput, styles.textArea]}
								placeholder="Describe your business to customers..."
								placeholderTextColor="#9CA3AF"
								value={description}
								onChangeText={setDescription}
								multiline
								numberOfLines={4}
							/>
						</View>
						<View style={styles.inputGroup}>
							{renderLabel('Tax Identification Number (TIN)')}
							<TextInput
								style={styles.textInput}
								placeholder="e.g. 12345678-0001"
								placeholderTextColor="#9CA3AF"
								value={tin}
								onChangeText={setTin}
							/>
							<Text style={styles.helperText}>Required for invoices and official receipts.</Text>
						</View>
					</View>
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Contact Details</Text>
						<View style={styles.inputGroup}>
							{renderLabel('Email Address')}
							<TextInput
								style={styles.textInput}
								placeholder="contact@example.com"
								placeholderTextColor="#9CA3AF"
								value={email}
								onChangeText={setEmail}
								keyboardType="email-address"
								autoCapitalize="none"
							/>
						</View>
					</View>
				</ScrollView>
			),
		},
		{
			key: 'presence',
			title: 'Presence',
			content: (
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Store Visibility</Text>

						{/* Custom Domain Section - Updated */}
						<View style={styles.domainSection}>
							<View style={styles.domainHeader}>
								<View style={styles.domainIconBg}>
									<Feather name="globe" size={20} color="#2563EB" />
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.domainTitle}>Custom Domain</Text>
									<Text style={styles.domainSubtitle}>{customDomain ? 'Active' : 'Not Connected'}</Text>
								</View>
							</View>

							{customDomain ? (
								<View style={styles.activeDomainBox}>
									<Text style={styles.activeDomainText}>{customDomain}</Text>
									<Feather name="check-circle" size={18} color="#10B981" />
								</View>
							) : (
								<View style={styles.noDomainBox}>
									<Text style={styles.noDomainText}>No custom domain connected.</Text>
									<Text style={styles.noDomainSubText}>Contact support to connect your own domain (e.g. mystore.com)</Text>
								</View>
							)}

							<View style={styles.divider} />

							<Text style={styles.inputLabel}>Tradeet Subdomain</Text>
							<View style={styles.subdomainInputContainer}>
								<TextInput
									style={styles.subdomainInput}
									value={storeLink}
									onChangeText={setStoreLink}
									placeholder="mystore"
									placeholderTextColor="#9CA3AF"
									autoCapitalize="none"
								/>
								<Text style={styles.subdomainSuffix}>.tradeet.ng</Text>
							</View>
							<Text style={styles.helperText}>Used when no custom domain is set.</Text>
						</View>
					</View>

					<View style={styles.card}>
						<Text style={styles.cardTitle}>Features</Text>

						<View style={styles.switchRow}>
							<View style={{ flex: 1 }}>
								<Text style={styles.switchTitle}>Allow Reviews</Text>
								<Text style={styles.switchDesc}>Let customers rate your services</Text>
							</View>
							<Switch
								value={reviewsEnabled}
								onValueChange={setReviewsEnabled}
								trackColor={{ false: '#E5E7EB', true: '#10B981' }}
								thumbColor={'#fff'}
							/>
						</View>

						<View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
							<View style={{ flex: 1 }}>
								<Text style={styles.switchTitle}>Marketplace Listing</Text>
								<Text style={styles.switchDesc}>Show in Tradeet search results</Text>
							</View>
							<Switch
								value={isCampusAppEnabled}
								onValueChange={setIsCampusAppEnabled}
								trackColor={{ false: '#E5E7EB', true: '#10B981' }}
								thumbColor={'#fff'}
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
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

					<View style={styles.card}>
						<Text style={styles.cardTitle}>Currency & Format</Text>
						<View style={styles.rowTwoCols}>
							<View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
								{renderLabel('Currency')}
								<View style={styles.pickerWrapper}>
									<Picker
										selectedValue={currency}
										onValueChange={setCurrency}
										style={styles.picker}
										itemStyle={{ fontSize: 13 }}
									>
										<Picker.Item label="NGN" value="NGN" />
										<Picker.Item label="USD" value="USD" />
									</Picker>
								</View>
							</View>
							<View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
								{renderLabel('Format')}
								<View style={styles.pickerWrapper}>
									<Picker
										selectedValue={priceFormat}
										onValueChange={setPriceFormat}
										style={styles.picker}
										itemStyle={{ fontSize: 13 }}
									>
										<Picker.Item label="1,234.56" value="comma" />
										<Picker.Item label="1.234,56" value="dot" />
									</Picker>
								</View>
							</View>
						</View>
					</View>

					<View style={styles.card}>
						<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
							<Text style={[styles.cardTitle, { marginBottom: 0 }]}>Bank Accounts</Text>
							<TouchableOpacity onPress={() => router.push('/(app)/payment-info')} style={styles.addBankBtn}>
								<Feather name="plus" size={14} color="#2563EB" />
								<Text style={styles.addBankText}>Manage</Text>
							</TouchableOpacity>
						</View>

						{/* Payment Info Preview - Redesigned */}
						{businessData?.paymentInfo?.length > 0 ? (
							businessData.paymentInfo.map((payment, index) => (
								<View key={index} style={styles.bankCard}>
									<View style={styles.bankIconBg}>
										<FontAwesome5 name="university" size={16} color="#4B5563" />
									</View>
									<View style={{ flex: 1 }}>
										<Text style={styles.bankName}>{payment.bankName}</Text>
										<Text style={styles.accountNumber}>{payment.accountNumber} • {payment.accountName}</Text>
									</View>
									{payment.isPrimary && (
										<View style={styles.primaryBadge}>
											<Text style={styles.primaryText}>Primary</Text>
										</View>
									)}
								</View>
							))
						) : (
							<View style={styles.emptyBankState}>
								<Feather name="credit-card" size={32} color="#D1D5DB" />
								<Text style={styles.emptyBankText}>No bank accounts added yet.</Text>
								<Text style={styles.emptyBankSubText}>Add one to receive payouts.</Text>
							</View>
						)}
					</View>
				</ScrollView>
			),
		},
		{
			key: 'theme',
			title: 'Theme',
			content: (
				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
					<View style={styles.card}>
						<Text style={styles.cardTitle}>Select Layout</Text>
						<Text style={styles.cardSubtitle}>Choose the structure that fits your business model.</Text>

						<View style={styles.themeGrid}>
							{themes.map((theme) => (
								<TouchableOpacity
									key={theme.id}
									activeOpacity={0.8}
									style={[styles.themeCard, selectedTheme === theme.id && styles.themeCardSelected]}
									onPress={() => setSelectedTheme(theme.id)}
								>
									<View style={[styles.radioCircle, selectedTheme === theme.id && styles.radioCircleSelected]}>
										{selectedTheme === theme.id && <View style={styles.radioInner} />}
									</View>
									<View style={{ flex: 1 }}>
										<Text style={[styles.themeName, selectedTheme === theme.id && styles.themeNameSelected]}>{theme.name}</Text>
										<Text style={styles.themeDesc}>{theme.description}</Text>
									</View>
								</TouchableOpacity>
							))}
						</View>

						<View style={styles.separator} />

						<Text style={styles.cardTitle}>Brand Color</Text>
						<Text style={styles.cardSubtitle}>Select a primary color for your store.</Text>

						<View style={styles.colorGrid}>
							{colorPalette.map((color) => (
								<TouchableOpacity
									key={color}
									style={[styles.colorCircle, themeColor === color && styles.colorCircleSelected]}
									onPress={() => setThemeColor(color)}
									activeOpacity={0.8}
								>
									<View style={[styles.colorInner, { backgroundColor: color }]}>
										{themeColor === color && <Ionicons name="checkmark" size={16} color="#fff" />}
									</View>
								</TouchableOpacity>
							))}
						</View>
					</View>
				</ScrollView>
			),
		},
	];

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" backgroundColor="#fff" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
					<Feather name="arrow-left" size={24} color="#1F2937" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Store Settings</Text>
				<View style={{ width: 24 }} /> {/* Spacer for balance */}
			</View>

			<Tabs scenes={scenes} />

			<View style={styles.footer}>
				<TouchableOpacity
					style={[styles.saveButton, loading && styles.saveButtonDisabled]}
					onPress={handleSaveSetup}
					disabled={loading}
					activeOpacity={0.9}
				>
					{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
				</TouchableOpacity>
			</View>

			{/* Preview Modal */}
			<Modal visible={showPreviewModal} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View ref={storeInfoRef} collapsable={false} style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
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
						<TouchableOpacity onPress={() => setShowPreviewModal(false)} style={styles.closeModalBtn}>
							<Feather name="x" size={24} color="#fff" />
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9FAFB', // Light gray background
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	backBtn: {
		padding: 4,
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: '600',
		color: '#111827',
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 100,
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#F3F4F6',
		overflow: 'hidden',
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 16,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	cardSubtitle: {
		fontSize: 13,
		color: '#6B7280',
		marginBottom: 16,
		marginTop: -12
	},

	// Image Upload
	bannerUpload: {
		height: 140,
		backgroundColor: '#F3F4F6',
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderStyle: 'dashed',
		marginBottom: 20,
		overflow: 'hidden',
	},
	placeholderContainer: {
		alignItems: 'center',
	},
	placeholderText: {
		marginTop: 8,
		color: '#6B7280',
		fontWeight: '500',
		fontSize: 13,
	},
	placeholderSubText: {
		fontSize: 11,
		color: '#9CA3AF',
		marginTop: 2,
	},
	bannerImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	editBadge: {
		position: 'absolute',
		bottom: 8,
		right: 8,
		backgroundColor: 'rgba(0,0,0,0.6)',
		padding: 6,
		borderRadius: 20,
	},

	logoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
	},
	logoUpload: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: '#F3F4F6',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},
	logoPlaceholder: {
		alignItems: 'center',
		justifyContent: 'center',
		width: '100%',
		height: '100%',
	},
	logoImage: {
		width: '100%',
		height: '100%',
		borderRadius: 36,
	},
	logoEditBadge: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		backgroundColor: '#10B981',
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#fff',
	},
	logoTextContainer: {
		flex: 1,
	},
	logoTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	logoSubtitle: {
		fontSize: 12,
		color: '#6B7280',
		marginTop: 2,
	},

	// Inputs
	inputGroup: {
		marginBottom: 16,
	},
	inputLabel: {
		fontSize: 13,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 6,
	},
	textInput: {
		backgroundColor: '#F9FAFB',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		color: '#111827',
	},
	textArea: {
		minHeight: 80,
		textAlignVertical: 'top',
	},
	helperText: {
		fontSize: 11,
		color: '#6B7280',
		marginTop: 4,
	},

	// Pickers
	pickerWrapper: {
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 8,
		backgroundColor: '#F9FAFB',
		overflow: 'hidden',
	},
	picker: {
		color: '#1F2937'
	},
	rowTwoCols: {
		flexDirection: 'row',
	},

	// Domain Section
	domainSection: {
		marginBottom: 10,
	},
	domainHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 16,
	},
	domainIconBg: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#DBEAFE',
		alignItems: 'center',
		justifyContent: 'center',
	},
	domainTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1F2937',
	},
	domainSubtitle: {
		fontSize: 12,
		color: '#6B7280',
	},
	activeDomainBox: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#ECFDF5',
		borderWidth: 1,
		borderColor: '#10B981',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 8,
		marginBottom: 16,
	},
	activeDomainText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#047857',
	},
	noDomainBox: {
		backgroundColor: '#F3F4F6',
		padding: 12,
		borderRadius: 8,
		marginBottom: 16,
	},
	noDomainText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 4,
	},
	noDomainSubText: {
		fontSize: 12,
		color: '#6B7280',
	},
	divider: {
		height: 1,
		backgroundColor: '#E5E7EB',
		marginVertical: 16,
	},
	subdomainInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	subdomainInput: {
		flex: 1,
		backgroundColor: '#F9FAFB',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderTopLeftRadius: 8,
		borderBottomLeftRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		color: '#111827',
		borderRightWidth: 0,
	},
	subdomainSuffix: {
		backgroundColor: '#F3F4F6',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderTopRightRadius: 8,
		borderBottomRightRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		color: '#6B7280',
	},

	// Features
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	switchTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	switchDesc: {
		fontSize: 12,
		color: '#9CA3AF',
		marginTop: 2,
	},

	// Theme
	themeGrid: {
		gap: 12,
	},
	themeCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		padding: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 12,
		gap: 12,
	},
	themeCardSelected: {
		borderColor: '#2563EB',
		backgroundColor: '#EFF6FF',
	},
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#D1D5DB',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
	},
	radioCircleSelected: {
		borderColor: '#2563EB',
	},
	radioInner: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#2563EB',
	},
	themeName: {
		fontSize: 15,
		fontWeight: '600',
		color: '#374151',
	},
	themeNameSelected: {
		color: '#2563EB',
	},
	themeDesc: {
		fontSize: 12,
		color: '#6B7280',
		marginTop: 2,
	},

	// Color Picker
	colorGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 8,
	},
	colorOption: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: 'transparent',
	},
	colorOptionSelected: {
		borderColor: '#fff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
		elevation: 3,
		transform: [{ scale: 1.1 }],
	},
	selectedColorPreview: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderWidth: 1,
		borderRadius: 8,
		backgroundColor: '#F9FAFB',
	},
	colorDot: {
		width: 24,
		height: 24,
		borderRadius: 12,
		marginRight: 10,
	},
	colorHexText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
		fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
	},

	// Payment
	addBankBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	addBankText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#2563EB',
	},
	bankCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		backgroundColor: '#F9FAFB',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#F3F4F6',
		marginBottom: 8,
		gap: 12,
	},
	bankIconBg: {
		width: 36,
		height: 36,
		borderRadius: 6,
		backgroundColor: '#E5E7EB',
		alignItems: 'center',
		justifyContent: 'center',
	},
	bankName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	accountNumber: {
		fontSize: 12,
		color: '#6B7280',
		marginTop: 1,
	},
	primaryBadge: {
		backgroundColor: '#DBEAFE',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
	},
	primaryText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#2563EB',
		textTransform: 'uppercase',
	},
	emptyBankState: {
		alignItems: 'center',
		padding: 24,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderStyle: 'dashed',
		borderRadius: 8,
		backgroundColor: '#F9FAFB',
	},
	emptyBankText: {
		marginTop: 8,
		fontSize: 14,
		fontWeight: '600',
		color: '#6B7280',
	},
	emptyBankSubText: {
		fontSize: 12,
		color: '#9CA3AF',
		marginTop: 2,
	},

	// Footer
	footer: {
		padding: 16,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
	},
	saveButton: {
		backgroundColor: '#2563EB',
		borderRadius: 8,
		paddingVertical: 14,
		alignItems: 'center',
	},
	saveButtonDisabled: {
		opacity: 0.7,
	},
	saveButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},

	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		padding: 24,
	},
	modalContent: {
		position: 'relative',
	},
	closeModalBtn: {
		position: 'absolute',
		top: -48,
		right: 0,
		padding: 8,
	},
	activeDomainBox: {
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 12,
		backgroundColor: '#ECFDF5',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#A7F3D0',
	},
	activeDomainText: {
		fontWeight: '600',
		color: '#065F46',
		fontSize: 14,
	},
	noDomainBox: {
		padding: 12,
		backgroundColor: '#F3F4F6',
		borderRadius: 8,
	},
	noDomainText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#4B5563',
		marginBottom: 4,
	},
	noDomainSubText: {
		fontSize: 12,
		color: '#9CA3AF',
	},
	divider: {
		height: 1,
		backgroundColor: '#E5E7EB',
		marginVertical: 16,
	},
	subdomainInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 8,
		backgroundColor: '#F9FAFB',
		paddingHorizontal: 12,
	},
	subdomainInput: {
		flex: 1,
		paddingVertical: 10,
		fontSize: 14,
		color: '#111827',
	},
	subdomainSuffix: {
		color: '#9CA3AF',
		fontSize: 14,
		fontWeight: '500',
	},

	// Bank Info
	addBankBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 10,
		backgroundColor: '#EFF6FF',
		borderRadius: 6,
	},
	addBankText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#2563EB',
	},
	bankCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 10,
		backgroundColor: '#F9FAFB',
		marginBottom: 10,
	},
	bankIconBg: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#E5E7EB',
		borderRadius: 10,
	},
	bankName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	accountNumber: {
		fontSize: 12,
		color: '#6B7280',
		marginTop: 2,
	},
	primaryBadge: {
		backgroundColor: '#ECFDF5',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#A7F3D0',
	},
	primaryText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#059669',
		textTransform: 'uppercase',
	},
	emptyBankState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
		opacity: 0.7,
	},
	emptyBankText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#4B5563',
		marginTop: 10,
	},
	emptyBankSubText: {
		fontSize: 12,
		color: '#9CA3AF',
	},


	// Switches
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	switchTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	switchDesc: {
		fontSize: 12,
		color: '#6B7280',
		marginTop: 2,
	},

	// Themes
	themeGrid: {
		gap: 12,
	},
	themeCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		backgroundColor: '#F9FAFB',
		gap: 12,
	},
	themeCardSelected: {
		borderColor: '#10B981',
		backgroundColor: '#ECFDF5',
	},
	radioCircle: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: '#D1D5DB',
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioCircleSelected: {
		borderColor: '#10B981',
	},
	radioInner: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#10B981',
	},
	themeName: {
		fontSize: 14,
		fontWeight: '600',
		color: '#374151',
	},
	themeNameSelected: {
		color: '#065F46',
	},
	themeDesc: {
		fontSize: 12,
		color: '#6B7280',
	},

	// Color Picker
	separator: {
		height: 1,
		backgroundColor: '#E5E7EB',
		marginVertical: 24,
	},
	colorGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		marginTop: 12,
	},
	colorCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		borderWidth: 3,
		borderColor: 'transparent',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 3,
	},
	colorCircleSelected: {
		borderColor: '#10B981',
	},
	colorInner: {
		width: '100%',
		height: '100%',
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	customColorCircle: {
		borderWidth: 1,
		borderColor: '#D1D5DB',
		backgroundColor: '#F3F4F6',
	},

	// Footer
	footer: {
		padding: 16,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
	},
	saveButton: {
		backgroundColor: '#10B981',
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: 'center',
	},
	saveButtonDisabled: {
		opacity: 0.7,
	},
	saveButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 15,
	},

	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.8)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	modalContent: {
		width: '100%',
		alignItems: 'center',
	},
	closeModalBtn: {
		marginTop: 24,
		padding: 8,
		backgroundColor: 'rgba(255,255,255,0.2)',
		borderRadius: 50,
	},

});

export default SetupStoreScreen;
