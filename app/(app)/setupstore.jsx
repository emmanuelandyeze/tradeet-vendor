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
} from 'react-native';
// import * as ScreenCapture from 'expo-screen-capture';
import * as Sharing from 'expo-sharing';
import axiosInstance from '@/utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '@/context/AuthContext';
import { captureRef } from 'react-native-view-shot';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import StoreCard from '@/components/StoreCard'
import StoreLocationPicker from '../../components/StoreLocationPicker';


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
	const [email, setEmail] = useState(
		userInfo?.email || '',
	);
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

	const generateStoreLink = () => {
		const sanitizedStoreName = storeName
			.trim()
			.replace(/\s+/g, '-')
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

	const handleSaveSetup = async () => {
		try {
			if (!storeName || !description) {
				Alert.alert(
					'Error',
					'Please fill in all required fields.',
				);
				return;
			}

			const updatedData = {
				name: storeName,
				storeLink,
				description,
				openingHours,
				email,
				theme: selectedTheme,
				isVendor: isCampusAppEnabled,
			};

			await axiosInstance.put(
				`/businesses/${businessData._id}`,
				updatedData,
			);
			setBusinessData((prevData) => ({
				...prevData,
				...updatedData,
			}));
			setShowPreviewModal(true);
		} catch (error) {
			console.error('Error saving store setup:', error);
			Alert.alert('Error', 'Failed to save store setup.');
		}
	};

	const handleShare = async () => {
		try {
			const uri = await captureRef(storeInfoRef, {
				format: 'jpg',
				quality: 1,
			});

			console.log(uri)

			const message = 'Check out this store information!';

			await Sharing.shareAsync(uri, {
				message: message, // This is the text that will accompany the shared image
			});

			router.back();
		} catch (error) {
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
		<ScrollView
			contentContainerStyle={{
				paddingHorizontal: 20,
				paddingTop: 40,
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
				style={[styles.input, { textAlignVertical: 'top' }]}
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

			

			<TouchableOpacity
				style={styles.saveButton}
				onPress={handleSaveSetup}
			>
				<Text style={styles.saveButtonText}>
					Save Settings
				</Text>
			</TouchableOpacity>

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
		</ScrollView>
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
		fontSize: 16,
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
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerRight: {
		flexDirection: 'row',
	},
};

export default SetupStoreScreen;
