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
	FlatList,
	Linking,
	ToastAndroid,
	
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
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


const SetupStoreScreen = ({}) => {
	const router = useRouter();
	const { userInfo, checkLoginStatus } =
		useContext(AuthContext);
	const [businessData, setBusinessData] = useState(null);
	const [storeName, setStoreName] = useState(
		'',
	);
	const [storeLink, setStoreLink] = useState(
		userInfo?.storeLink || '',
	);
	const [description, setDescription] = useState(
		'',
	);
	const [email, setEmail] = useState(userInfo?.email || '');
	 const [openingHours, setOpeningHours] = useState(
			{
				Monday: { open: '09:00', close: '17:00' },
				Tuesday: { open: '09:00', close: '17:00' },
				Wednesday: { open: '09:00', close: '17:00' },
				Thursday: { open: '09:00', close: '17:00' },
				Friday: { open: '09:00', close: '17:00' },
				Saturday: { open: '09:00', close: '17:00' },
				Sunday: { open: '09:00', close: '17:00' },
			}
		);
	const [isCampusAppEnabled, setIsCampusAppEnabled] =
		useState(false);
	const [showPreviewModal, setShowPreviewModal] =
		useState(false);
	const [themes, setThemes] = useState([
		{ id: 'default', name: 'Default' },
	]);
	const [selectedTheme, setSelectedTheme] =
		useState('default');
	const [selectedCampus, setSelectedCampus] = useState('');
	const [search, setSearch] = useState('');
	const [showModal, setShowModal] = useState(false);
	const [selectedUniversity, setSelectedUniversity] =
		useState('');
	const storeInfoRef = useRef(null);

	const generateStoreLink = () => {
		const sanitizedStoreName = storeName
			.trim()
			.replace(/\s+/g, '-')
			.toLowerCase();
		setStoreLink(`${sanitizedStoreName}`);
	};

	const openSupport = () => {
		Linking.openURL(`https://wa.me/9165095973`); // Replace with your desired website URL
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
			// console.log(response.data.business);
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
		const fetchOpeningHours = async () => {
			try {
				const token = await AsyncStorage.getItem(
					'userToken',
				);
				const response = await axiosInstance.get(
					`/businesses/b/${userInfo?._id}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				);
				const fetchedOpeningHours =
					response.data?.business?.openingHours;
				const formattedOpeningHours = Object.keys(
					fetchedOpeningHours,
				).reduce((acc, day) => {
					acc[day] = {
						open: convertMinutesToTime(
							fetchedOpeningHours[day].open,
						),
						close: convertMinutesToTime(
							fetchedOpeningHours[day].close,
						),
					};
					return acc;
				}, {});
				setOpeningHours(formattedOpeningHours);
				setIsCampusAppEnabled(response.data?.business?.isVendor);
				setStoreName(response.data?.business?.name);
				setDescription(response.data?.business?.description);
			} catch (error) {
				console.error(
					'Error fetching opening hours:',
					error,
				);
			}
		};

		fetchOpeningHours();
	}, [userInfo]);

	const convertMinutesToTime = (minutes) => {
		const hours = Math.floor(minutes / 60)
			.toString()
			.padStart(1, '0');
		const mins = (minutes % 60).toString().padStart(2, '0');
		return `${hours}:${mins}`;
	};

	useEffect(() => {
		getBusinessInfo();
	}, []);

	

	const handleSaveSetup = async () => {
		try {
			if (!storeName || !description) {
				Alert.alert(
					'Error',
					'Please fill in all required fields.',
				);
				return;
			}

			 const formattedOpeningHours = Object.keys(
					openingHours,
				).reduce((acc, day) => {
					acc[day] = {
						open: convertTimeToMinutes(
							openingHours[day].open,
						),
						close: convertTimeToMinutes(
							openingHours[day].close,
						),
					};
					return acc;
				}, {});

			const updatedData = {
				name: storeName,
				storeLink,
				description,
				openingHours: formattedOpeningHours,
				email,
				theme: selectedTheme,
				isVendor: isCampusAppEnabled,
				campus: selectedCampus,
			};

			await axiosInstance.put(
				`/businesses/${businessData._id}`,
				updatedData,
			);
			setBusinessData((prevData) => ({
				...prevData,
				...updatedData,
			}));
			isCampusAppEnabled && setShowPreviewModal(true);
			router.push('(tabs)/settings');
			ToastAndroid.show(`Marketplace settings updated!`, ToastAndroid.LONG);
		} catch (error) {
			console.error('Error saving store setup:', error);
			Alert.alert('Error', 'Failed to save store setup.');
		}
	};

	// console.log(selectedCampus);
	const handleShare = async () => {
		try {
			console.log('hi')
			const uri = await captureRef(storeInfoRef, {
				format: 'jpg',
				quality: 1,
			});

			console.log(uri);

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

	const convertTimeToMinutes = (time) => {
		const [hours, minutes] = time.split(':').map(Number);
		return hours * 60 + minutes;
	};

	const handleOpeningHoursChange = (day, type, value) => {
		setOpeningHours((prev) => ({
			...prev,
			[day]: {
				...prev[day],
				[type]: value,
			},
		}));
	};

	const renderOpeningHours = () => {
		const days = Object.keys(openingHours);
		return days.map((day) => (
			<View key={day} style={styles.openingHoursContainer}>
				<Text style={styles.dayText}>{day}</Text>
				<Picker
					selectedValue={openingHours[day].open}
					style={styles.picker}
					onValueChange={(value) =>
						handleOpeningHoursChange(day, 'open', value)
					}
				>
					{/* Add Picker.Item components for time options */}
					{Array.from({ length: 24 }, (_, i) => (
						<Picker.Item
							key={i}
							label={`${i}:00`}
							value={`${i}:00`}
						/>
					))}
				</Picker>
				<Text style={styles.toText}>to</Text>
				<Picker
					selectedValue={openingHours[day].close}
					style={styles.picker}
					onValueChange={(value) =>
						handleOpeningHoursChange(day, 'close', value)
					}
				>
					{/* Add Picker.Item components for time options */}
					{Array.from({ length: 24 }, (_, i) => (
						<Picker.Item
							key={i}
							label={`${i}:00`}
							value={`${i}:00`}
						/>
					))}
				</Picker>
			</View>
		));
	};

	useEffect(() => {
		// fetchThemes();
		generateStoreLink();
	}, []);

	return (
		<ScrollView
			contentContainerStyle={{
				paddingHorizontal: 5,
				paddingTop: 45,
				paddingBottom: 20,
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
						onPress={() => router.push('(tabs)/settings')}
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
							Tradeet Marketplace Setup
						</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.headerRight}></View>
			</View>

			<View style={{ paddingHorizontal: 10 }}>
				<View style={styles.switchContainer}>
					<Text
						style={{
							marginTop: 10,
							fontWeight: '500',
							color: '#333',
							fontSize: 18,
						}}
					>
						Enable Tradeet Marketplace Listing
					</Text>
					<Switch
						value={isCampusAppEnabled}
						onValueChange={setIsCampusAppEnabled}
					/>
				</View>

				{isCampusAppEnabled && (
					<View>
						<Text style={styles.sectionHeader}>
							Store Name
						</Text>
						<TextInput
							style={styles.input}
							placeholder="Store Name"
							value={storeName}
							onChangeText={setStoreName}
							onBlur={generateStoreLink}
						/>
						<Text style={styles.sectionHeader}>
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
						<Text style={styles.sectionHeader}>
							Opening Hours
						</Text>
						{renderOpeningHours()}
					</View>
				)}

				<TouchableOpacity
					style={styles.saveButton}
					onPress={handleSaveSetup}
				>
					<Text style={styles.saveButtonText}>
						Save settings
					</Text>
				</TouchableOpacity>
			</View>

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
							campus={selectedCampus}
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

			{/* Modal for inactive campuses */}
			<Modal
				visible={showModal}
				transparent={true}
				animationType="slide"
			>
				<View style={styles.modalBackground}>
					<View style={styles.modalContent}>
						<Text style={styles.modalEmoji}>😥</Text>
						<Text style={styles.modalTitle}>
							We are currently working on bringing Tradeet
							to {selectedUniversity}
						</Text>
						<Text style={styles.modalSubtitle}>
							Become a Tradeet ambassador on your campus!
						</Text>

						<TouchableOpacity
							onPress={() => {
								setShowModal(false);
								openSupport();
							}}
							style={styles.joinButton}
						>
							<Text style={styles.joinButtonText}>
								Join us now!
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setShowModal(false)}
							style={styles.closeButton}
						>
							<Text style={styles.closeButtonText}>x</Text>
						</TouchableOpacity>
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
		fontSize: 16,
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
	sectionHeader: {
		fontSize: 18,
		fontWeight: 'bold',
		marginVertical: 10,
	},
	openingHoursContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	dayText: {
		flex: 1,
		fontSize: 16,
	},
	picker: {
		flex: 1.2,
	},
	toText: {
		marginHorizontal: 10,
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
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerRight: {
		flexDirection: 'row',
	},
	campusButton: {
		flex: 1,
		margin: 10,
		padding: 20,
		borderRadius: 8,
		borderWidth: 2,
		alignItems: 'center',
	},
	activeCampus: {
		borderColor: 'green',
	},
	selectedCampus: {
		borderColor: 'green',
		backgroundColor: 'green',
	},
	inactiveCampus: {
		borderColor: 'gray',
	},
	campusText: {
		fontSize: 16,
	},
	activeCampusText: {
		color: 'green',
	},
	selectedCampusText: {
		color: 'white',
	},
	inactiveCampusText: {
		color: 'gray',
	},
	modalBackground: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		backgroundColor: 'white',
		padding: 30,
		borderRadius: 10,
		width: '80%',
		alignItems: 'center',
	},
	modalEmoji: {
		fontSize: 40,
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginVertical: 15,
		textAlign: 'center',
	},
	modalSubtitle: {
		fontSize: 18,
		textAlign: 'center',
		marginBottom: 20,
	},
	joinButton: {
		backgroundColor: 'green',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 8,
		marginBottom: 20,
	},
	joinButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold',
	},
	closeButton: {
		position: 'absolute',
		top: 10,
		right: 10,
	},
	closeButtonText: {
		color: 'red',
		fontSize: 28,
		fontWeight: 'bold',
	},
};

export default SetupStoreScreen;
