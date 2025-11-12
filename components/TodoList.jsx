import React, {
	useState,
	useEffect,
	useRef,
	useContext,
	useCallback,
} from 'react'; // Add useCallback
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Animated,
	Vibration,
	Dimensions,
	Platform,
	Share,
	Image,
	ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as Progress from 'react-native-progress';
import axiosInstance from '@/utils/axiosInstance';
import { AuthContext } from '@/context/AuthContext';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Colors = {
	primaryGreen: '#007A00',
	lightGreen: '#E6F7E6',
	darkText: '#262626',
	mediumText: '#6C6C6C',
	lightGray: '#F5F5F5',
	border: '#E0E0E0',
	white: '#FFFFFF',
	buttonPrimary: '#007AFF',
	buttonText: '#FFFFFF',
	iconDefault: '#9B9B9B',
	shareButtonBg: '#F0F5FF',
	shareIcon: '#007AFF',
	accentBlue: '#007AFF',
};

// Define a key for AsyncStorage
const ASYNC_STORAGE_KEY_SHARED_STATUS =
	'has_shared_business_card';

const TodoList = ({ businessData, setModalVisible }) => {
	const router = useRouter();
	const completionScaleAnim = useRef(
		new Animated.Value(0),
	).current;
	const headerOpacityAnim = useRef(
		new Animated.Value(0),
	).current;
	const cardScaleAnim = useRef(
		new Animated.Value(1),
	).current;
	const shareCardOpacityAnim = useRef(
		new Animated.Value(0),
	).current;
	const minifiedCardOpacityAnim = useRef(
		new Animated.Value(0),
	).current;

	const { userInfo, checkLoginStatus } =
		useContext(AuthContext);

	const [currentTaskIndex, setCurrentTaskIndex] =
		useState(0);
	const [products, setProducts] = useState([]);
	const [showShareCard, setShowShareCard] = useState(false);
	const [isCapturing, setIsCapturing] = useState(false);
	const [hasSharedOnce, setHasSharedOnce] = useState(true);
	const [isLoadingStorage, setIsLoadingStorage] =
		useState(true); // New state to track AsyncStorage loading

	const shareCardRef = useRef(null);

	// --- AsyncStorage Load on Mount ---
	useEffect(() => {
		const loadSharedStatus = async () => {
			try {
				const storedStatus = userInfo?.sharedOnce
				if (storedStatus !== null) {
					setHasSharedOnce(storedStatus); // Parse the stored string back to boolean
				}
			} catch (error) {
				console.error(
					'Error loading shared status from AsyncStorage:',
					error,
				);
			} finally {
				setIsLoadingStorage(false); // Mark loading as complete
			}
		};

		loadSharedStatus();
    }, [businessData?._id]);
    
    console.log(hasSharedOnce)

	useEffect(() => {
		if (businessData?._id) {
			const fetchProducts = async () => {
				try {
					const response = await axiosInstance.get(
						`/businesses/products/${businessData._id}`,
					);
					setProducts(response.data.products || []);
				} catch (error) {
					console.error('Error fetching products:', error);
				}
			};
			fetchProducts();
		}
	}, [businessData?._id]);

	const updateCommunityStatus = async () => {
		try {
			const updatedData = {
				joinedCommunity: true,
			};

			await axiosInstance.put(
				`/businesses/${businessData?._id}`,
				updatedData,
			);

			await checkLoginStatus();
		} catch (error) {
			console.error(
				'Error saving store setup:',
				error.response?.data || error,
			);
		}
	};

    const updateSharedStatus = async () => {
			try {
				const updatedData = {
					sharedOnce: true,
				};

				await axiosInstance.put(
					`/businesses/${businessData?._id}`,
					updatedData,
				);

				await checkLoginStatus();
			} catch (error) {
				console.error(
					'Error saving store setup:',
					error.response?.data || error,
				);
			}
		};

	const allTasks = [
		{
			category: 'Your Business Profile',
			icon: 'storefront-outline',
			tasks: [
				{
					label: 'Add Business Location',
					description:
						'Pinpoint your exact spot so customers can easily find and visit you.',
					isComplete: Boolean(businessData?.address),
					onPress: () => router.push('/selectLocation'),
				},
				{
					label: 'Upload Logo & Banner',
					description:
						'Make a strong first impression with your brand’s logo and a captivating banner.',
					isComplete:
						Boolean(businessData?.logoUrl) &&
						Boolean(businessData?.storeBanner),
					onPress: () => router.push('/(app)/setupstore'),
				},
				{
					label: 'Choose Business Category',
					description:
						'Help customers discover your store by selecting the perfect category.',
					isComplete: Boolean(businessData?.category),
					onPress: () => router.push('/(app)/setupstore'),
				},
			],
		},
		{
			category: 'Payment & Services',
			icon: 'card-outline',
			tasks: [
				{
					label: 'Connect Bank Account',
					description:
						'Securely link your bank account to seamlessly receive payments from customers.',
					isComplete: businessData?.paymentInfo?.length > 0,
					onPress: () => setModalVisible(true),
				},
				{
					label: 'Set Currency & Price Format',
					description:
						'Define your preferred currency and how prices are displayed for clarity.',
					isComplete: Boolean(businessData?.currency),
					onPress: () => router.push('/(app)/setupstore'),
				},
				{
					label: 'Create First Product or Service',
					description:
						'Showcase what you offer! Add your very first product or service to get started.',
					isComplete: products?.length > 0,
					onPress: () => router.push('/(app)/products'),
				},
			],
		},
		{
			category: 'Online Presence',
			icon: 'globe-outline',
			tasks: [
				{
					label: 'Setup Your Online Store Link',
					description:
						'Personalize your unique web address for your Tradeet store and share it wide.',
					isComplete: Boolean(businessData?.storeLink),
					onPress: () => router.push('/(app)/setupstore'),
				},
				{
					label: 'Join Tradeet WhatsApp Community',
					description:
						'Connect with a vibrant network of fellow entrepreneurs and get exclusive updates.',
					isComplete: Boolean(
						businessData?.joinedCommunity,
					),
					onPress: () => {
						router.push(
							'https://chat.whatsapp.com/Du8xWBkUB8d66fuq0Qd7ul',
						);
						updateCommunityStatus();
					},
				},
				{
					label: 'Enable Reviews & Ratings',
					description:
						'Build trust and credibility by allowing customers to leave feedback on your services.',
					isComplete: Boolean(businessData?.reviewsEnabled),
					onPress: () => router.push('/(app)/setupstore'),
				},
			],
		},
	];

	const flatTasks = allTasks.flatMap(
		(group) => group.tasks,
	);
	const incompleteTasks = flatTasks.filter(
		(t) => !t.isComplete,
	);
	const completedTasksCount =
		flatTasks.length - incompleteTasks.length;
	const totalTasksCount = flatTasks.length;
	const progress =
		totalTasksCount > 0
			? completedTasksCount / totalTasksCount
			: 0;

	// Memoize handleShareCompletion to prevent unnecessary re-renders
	const handleShareCompletion = useCallback(async () => {
		setShowShareCard(false);
		setHasSharedOnce(true); // Update state
		await updateSharedStatus();
		Animated.timing(minifiedCardOpacityAnim, {
			toValue: 1,
			duration: 500,
			useNativeDriver: true,
		}).start();
	}, [minifiedCardOpacityAnim]); // Dependency for useCallback

	// Reset persistence if tasks become incomplete again
	useEffect(() => {
		if (incompleteTasks.length > 0 && hasSharedOnce) {
			const resetSharedStatus = async () => {
				setHasSharedOnce(false);
			};
			resetSharedStatus();
		}
	}, [incompleteTasks.length, hasSharedOnce]);

	useEffect(() => {
		Animated.timing(headerOpacityAnim, {
			toValue: 1,
			duration: 800,
			delay: 200,
			useNativeDriver: true,
		}).start();

		// Only proceed if AsyncStorage has finished loading
		if (!hasSharedOnce && incompleteTasks.length === 0) {
			Animated.spring(completionScaleAnim, {
				toValue: 1,
				friction: 3,
				useNativeDriver: true,
			}).start(() => {
				Platform.OS === 'ios' && Vibration.vibrate(150);
				if (!hasSharedOnce) {
					setTimeout(() => {
						setShowShareCard(true);
						Animated.timing(shareCardOpacityAnim, {
							toValue: 1,
							duration: 500,
							useNativeDriver: true,
						}).start();
					}, 1000);
				} else {
					Animated.timing(minifiedCardOpacityAnim, {
						toValue: 1,
						duration: 500,
						useNativeDriver: true,
					}).start();
				}
			});
		} else if (
			!isLoadingStorage &&
			incompleteTasks.length > 0
		) {
			completionScaleAnim.setValue(0);
			setShowShareCard(false);
			shareCardOpacityAnim.setValue(0);
			minifiedCardOpacityAnim.setValue(0);
		}
		// If still loading, don't do anything yet
	}, [
		incompleteTasks?.length,
		businessData,
		progress,
		hasSharedOnce,
		isLoadingStorage,
	]);

	const getProgressEmoji = () => {
		if (progress === 1) return '🥳';
		if (progress > 0.75) return '🚀';
		if (progress > 0.5) return '✨';
		if (progress > 0.25) return '🌱';
		return '💡';
	};

	const handleTaskNavigation = (direction) => {
		if (Platform.OS === 'ios') Vibration.vibrate(50);
		Animated.sequence([
			Animated.timing(cardScaleAnim, {
				toValue: 0.95,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.timing(cardScaleAnim, {
				toValue: 1,
				duration: 100,
				useNativeDriver: true,
			}),
		]).start(() => {
			if (
				direction === 'next' &&
				currentTaskIndex < incompleteTasks.length - 1
			) {
				setCurrentTaskIndex((prevIndex) => prevIndex + 1);
			} else if (
				direction === 'prev' &&
				currentTaskIndex > 0
			) {
				setCurrentTaskIndex((prevIndex) => prevIndex - 1);
			}
		});
	};

	const renderTaskCard = (task) => (
		<Animated.View
			style={[
				styles.taskCard,
				{ transform: [{ scale: cardScaleAnim }] },
			]}
		>
			<View style={styles.taskIconCircle}>
				<Ionicons
					name={
						allTasks.find((g) => g.tasks.includes(task))
							?.icon || 'help-circle-outline'
					}
					size={35}
					color={Colors.primaryGreen}
				/>
			</View>
			<Text style={styles.taskCardTitle}>{task.label}</Text>
			<Text style={styles.taskCardDescription}>
				{task.description}
			</Text>
			<TouchableOpacity
				style={styles.actionButton}
				onPress={task.onPress}
			>
				<Text style={styles.actionButtonText}>
					{task.label.includes('Connect Bank')
						? 'Connect Account'
						: task.label.includes('Upload Logo')
						? 'Upload Assets'
						: task.label.includes('Create First Product')
						? 'Add Product/Service'
						: 'Complete Task'}
				</Text>
				<Ionicons
					name="arrow-forward-outline"
					size={18}
					color={Colors.buttonText}
					style={{ marginLeft: 8 }}
				/>
			</TouchableOpacity>
		</Animated.View>
	);

	const ShareStoreCard = () => {
		const storeName =
			businessData?.name || 'Your Awesome Store';
		const storeLink = 'https://' +
			businessData?.storeLink +
			'.tradeet.ng';
		const slogan =
			businessData?.description ||
			'Discover quality products and services!';
		const logoUrl = businessData?.logoUrl;

		const shareImageAndText = async () => {
			setIsCapturing(true);
			try {
				if (!(await Sharing.isAvailableAsync())) {
					alert('Sharing is not available on your device.');
					return;
				}

				const uri = await shareCardRef.current.capture();

				// Build a message for sharing (can be used as text property in shareAsync or passed along)
				const message = `🎉 Exciting News! My new store, *"${storeName}"*, is now LIVE on Tradeet! \n Check out my amazing products and services here: ${storeLink}. #Tradeet #SmallBusinessNigeria #ShopLocal`;

				await Sharing.shareAsync(uri, {
					mimeType: 'image/png',
					dialogTitle: `Share ${storeName} on Tradeet!`,
					UTI: 'public.png',
					// text: message, // Some apps might pick up this text with the image
				});
				handleShareCompletion();
			} catch (error) {
				console.error('Error sharing image:', error);
				
			} finally {
				setIsCapturing(false);
			}
		};

		const shareTextOnly = async () => {
			try {
				const message = `🎉 Exciting News! My new store, "${storeName}", is now LIVE on Tradeet! Check out my amazing products and services here: ${storeLink}. #Tradeet #SmallBusinessNigeria #ShopLocal`;
				await Share.share({
					message: message,
					url: storeLink,
					title: `Check out ${storeName} on Tradeet!`,
				});
				handleShareCompletion();
			} catch (error) {
				console.error('Error sharing text:', error.message);
			}
		};

		return (
			<ViewShot
				ref={shareCardRef}
				options={{ format: 'png', quality: 0.9 }}
				style={styles.shareCardContainerForCapture}
			>
				<Animated.View
					style={[
						styles.shareCard,
						{
							opacity: shareCardOpacityAnim,
							transform: [
								{
									scale: shareCardOpacityAnim.interpolate({
										inputRange: [0, 1],
										outputRange: [0.8, 1],
									}),
								},
							],
						},
					]}
				>
					<Text style={styles.shareCardTitle}>
						🥳 Your Store is Live! 🥳
					</Text>
					<Text style={styles.shareCardSubtitle}>
						It's time to share your amazing Tradeet store
						with the world!
					</Text>

					<View style={styles.storeInfoContainer}>
						{logoUrl ? (
							<Image
								source={{ uri: logoUrl }}
								style={styles.storeLogo}
							/>
						) : (
							<View style={styles.storeLogoPlaceholder}>
								<Ionicons
									name="storefront-outline"
									size={30}
									color={Colors.mediumText}
								/>
							</View>
						)}
						<View style={styles.storeTextInfo}>
							<Text style={styles.storeName}>
								{storeName}
							</Text>
							{slogan && (
								<Text style={styles.storeSlogan}>
									{slogan}
								</Text>
							)}
							<Text style={styles.storeLink}>
								{storeLink}
							</Text>
						</View>
					</View>

					{isCapturing ? (
						<ActivityIndicator
							size="large"
							color={Colors.primaryGreen}
							style={{ marginVertical: 20 }}
						/>
					) : (
						<View style={styles.shareButtonsContainer}>
							<TouchableOpacity
								style={styles.shareButton}
								onPress={shareImageAndText}
							>
								<Ionicons
									name="share-outline"
									size={28}
									color={Colors.shareIcon}
								/>
								<Text style={styles.shareButtonText}>
									Share Image
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.shareButton}
								onPress={shareTextOnly}
							>
								<Ionicons
									name="text-outline"
									size={28}
									color={Colors.darkText}
								/>
								<Text style={styles.shareButtonText}>
									Share Text
								</Text>
							</TouchableOpacity>
						</View>
					)}
					<TouchableOpacity
						style={styles.otherShareButton}
						onPress={shareTextOnly}
					>
						<Ionicons
							name="share-outline"
							size={24}
							color={Colors.shareIcon}
						/>
						<Text style={styles.otherShareButtonText}>
							Share Link & Text only...
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.laterButton}
						onPress={handleShareCompletion}
					>
						<Text style={styles.laterButtonText}>
							Maybe Later
						</Text>
					</TouchableOpacity>
				</Animated.View>
			</ViewShot>
		);
	};

	const MinifiedShareCard = () => {
		const storeName =
			businessData?.name || 'Your Awesome Store';
		const storeLink =
			'https://' + businessData?.storeLink + '.tradeet.ng';
		const slogan =
			businessData?.description ||
			'Discover quality products and services!';
		const logoUrl = businessData?.logoUrl;

		const shareTextOnlyFromMinified = async () => {
			try {
				const message = `Check out my store: ${storeName} on Tradeet! ${storeLink}`;
				await Share.share({ message, url: storeLink });
			} catch (error) {
				console.error(
					'Error sharing text from minified card:',
					error.message,
				);
			}
		};

		return (
			<Animated.View
				style={[
					styles.minifiedShareCard,
					{ opacity: minifiedCardOpacityAnim },
				]}
			>
				<Ionicons
					name="share-social-outline"
					size={28}
					color={Colors.accentBlue}
				/>
				<View style={styles.minifiedTextContent}>
					<Text style={styles.minifiedTitle}>
						Your store is live!
					</Text>
					<Text style={styles.minifiedSubtitle}>
						Share it with your customers anytime.
					</Text>
				</View>
				<TouchableOpacity
					style={styles.minifiedShareButton}
					onPress={shareTextOnlyFromMinified}
				>
					<Ionicons
						name="share-outline"
						size={20}
						color={Colors.white}
					/>
					<Text style={styles.minifiedShareButtonText}>
						Share
					</Text>
				</TouchableOpacity>
			</Animated.View>
		);
	};

	return (
		<View style={styles.mainWrapper}>
			<Animated.View
				style={[
					styles.headerContainer,
					{ opacity: headerOpacityAnim },
				]}
			>
                {incompleteTasks.length > 0 && (
                    <>

                        <View style={styles.horizontalTaskContainer}>
                            {currentTaskIndex > 0 && (
                                <TouchableOpacity
                                    onPress={() =>
                                        handleTaskNavigation('prev')
                                    }
                                    style={styles.navButton}
                                >
                                    <Ionicons
                                        name="chevron-back"
                                        size={30}
                                        color={Colors.darkText}
                                    />
                                </TouchableOpacity>
                            )}

                            {incompleteTasks.length > 0 &&
                                renderTaskCard(
                                    incompleteTasks[currentTaskIndex],
                                )}

                            {currentTaskIndex <
                                incompleteTasks.length - 1 && (
                                    <TouchableOpacity
                                        onPress={() =>
                                            handleTaskNavigation('next')
                                        }
                                        style={styles.navButton}
                                    >
                                        <Ionicons
                                            name="chevron-forward"
                                            size={30}
                                            color={Colors.darkText}
                                        />
                                    </TouchableOpacity>
                                )}
                        </View>
                        {incompleteTasks.length > 1 && (
                            <Text style={styles.paginationText}>
                                Task {currentTaskIndex + 1} of{' '}
                                {incompleteTasks.length}
                            </Text>
                        )}
                    </>
                )}
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	mainWrapper: {
		flex: 1,
		paddingHorizontal: 0,
		paddingBottom: 0,
	},
	headerContainer: {
		borderRadius: 12,
		paddingTop: 10,
        paddingBottom: 5,
		paddingHorizontal: 0,
		marginBottom: 0,
	},
	header: {
		fontSize: 24,
		fontWeight: '800',
		color: Colors.darkText,
		marginBottom: 8,
		textAlign: 'center',
		paddingHorizontal: 15,
	},
	subHeader: {
		fontSize: 16,
		color: Colors.mediumText,
		marginBottom: 25,
		textAlign: 'center',
		lineHeight: 24,
		paddingHorizontal: 15,
	},
	mainProgressBar: {
		marginBottom: 30,
		width: 'auto',
		marginHorizontal: 15,
		backgroundColor: 'transparent',
	},
	horizontalTaskContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 10,
		minHeight: 100,
	},
	navButton: {
		padding: 10,
		borderRadius: 50,
		backgroundColor: Colors.lightGray,
		marginHorizontal: 0,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.15,
				shadowRadius: 5,
			},
			android: {
				elevation: 3,
			},
		}),
	},
	taskCard: {
		width: SCREEN_WIDTH * 0.78,
		backgroundColor: Colors.white,
		borderRadius: 20,
		padding: 25,
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: Colors.border,
		marginHorizontal: 10,
		minHeight: 200,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.1,
				shadowRadius: 5,
			},
			android: {
				elevation: 2,
			},
		}),
	},
	taskIconCircle: {
		width: 70,
		height: 70,
		borderRadius: 35,
		backgroundColor: Colors.white,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 15,
		borderWidth: 1,
		borderColor: Colors.border,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.05,
				shadowRadius: 3,
			},
			android: {
				elevation: 2,
			},
		}),
	},
	taskCardTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: Colors.darkText,
		textAlign: 'center',
		marginBottom: 10,
	},
	taskCardDescription: {
		fontSize: 15,
		color: Colors.mediumText,
		textAlign: 'center',
		marginBottom: 25,
		lineHeight: 22,
		flexGrow: 1,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.primaryGreen,
		paddingVertical: 14,
		paddingHorizontal: 25,
		borderRadius: 30,
		justifyContent: 'center',
		minWidth: 180,
		...Platform.select({
			ios: {
				shadowColor: Colors.primaryGreen,
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.3,
				shadowRadius: 10,
			},
			android: {
				elevation: 6,
			},
		}),
	},
	actionButtonText: {
		color: Colors.buttonText,
		fontSize: 17,
		fontWeight: '700',
	},
	paginationText: {
		fontSize: 14,
		color: Colors.mediumText,
		textAlign: 'center',
		marginTop: 5,
		marginBottom: 10,
	},
	completeBox: {
		padding: 30,
		backgroundColor: Colors.lightGreen,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: Colors.primaryGreen,
		marginVertical: 40,
		marginHorizontal: 15,
		...Platform.select({
			ios: {
				shadowColor: Colors.primaryGreen,
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.15,
				shadowRadius: 15,
			},
			android: {
				elevation: 6,
			},
		}),
	},
	completeText: {
		color: Colors.primaryGreen,
		fontWeight: '900',
		fontSize: 22,
		textAlign: 'center',
		marginBottom: 10,
	},
	completeSubText: {
		color: Colors.mediumText,
		fontSize: 15,
		textAlign: 'center',
		lineHeight: 22,
	},
	shareCardContainerForCapture: {
		backgroundColor: Colors.white,
		alignSelf: 'center',
		borderRadius: 20,
		overflow: 'hidden',
	},
	shareCard: {
		backgroundColor: Colors.white,
		borderRadius: 20,
		padding: 25,
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 15,
		marginTop: 20,
		borderWidth: 1,
		borderColor: Colors.border,
		width: SCREEN_WIDTH - 30,
		// ...Platform.select({
		// 	ios: {
		// 		shadowColor: '#000',
		// 		shadowOffset: { width: 0, height: 5 },
		// 		shadowOpacity: 0.15,
		// 		shadowRadius: 20,
		// 	},
		// 	android: {
		// 		elevation: 10,
		// 	},
		// }),
	},
	shareCardTitle: {
		fontSize: 24,
		fontWeight: '800',
		color: Colors.primaryGreen,
		marginBottom: 10,
		textAlign: 'center',
	},
	shareCardSubtitle: {
		fontSize: 16,
		color: Colors.mediumText,
		textAlign: 'center',
		marginBottom: 25,
		lineHeight: 24,
	},
	storeInfoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.lightGray,
		borderRadius: 15,
		padding: 15,
		marginBottom: 30,
		width: '100%',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.05,
				shadowRadius: 5,
			},
			android: {
				elevation: 2,
			},
		}),
	},
	storeLogo: {
		width: 60,
		height: 60,
		borderRadius: 30,
		marginRight: 15,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	storeLogoPlaceholder: {
		width: 60,
		height: 60,
		borderRadius: 30,
		marginRight: 15,
		borderWidth: 1,
		borderColor: Colors.border,
		backgroundColor: Colors.white,
		justifyContent: 'center',
		alignItems: 'center',
	},
	storeTextInfo: {
		flex: 1,
	},
	storeName: {
		fontSize: 18,
		fontWeight: '700',
		color: Colors.darkText,
		marginBottom: 4,
	},
	storeSlogan: {
		fontSize: 14,
		color: Colors.mediumText,
		marginBottom: 4,
	},
	storeLink: {
		fontSize: 14,
		color: Colors.primaryGreen,
		textDecorationLine: 'underline',
	},
	shareButtonsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		width: '100%',
		marginBottom: 20,
	},
	shareButton: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderRadius: 15,
		backgroundColor: Colors.shareButtonBg,
		width: '45%',
		aspectRatio: 1,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.1,
				shadowRadius: 3,
			},
			android: {
				elevation: 2,
			},
		}),
	},
	shareButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: Colors.darkText,
		marginTop: 5,
		textAlign: 'center',
	},
	otherShareButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.lightGray,
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 30,
		borderWidth: 1,
		borderColor: Colors.border,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.05,
				shadowRadius: 2,
			},
			android: {
				elevation: 1,
			},
		}),
	},
	otherShareButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: Colors.shareIcon,
		marginLeft: 10,
	},
	laterButton: {
		marginTop: 15,
		paddingVertical: 10,
		paddingHorizontal: 20,
	},
	laterButtonText: {
		color: Colors.mediumText,
		fontSize: 16,
		fontWeight: '600',
	},
	minifiedShareCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.white,
		borderRadius: 10,
		paddingVertical: 15,
		paddingHorizontal: 20,
		marginHorizontal: 0,
		marginTop: 5,
		borderWidth: 1,
        borderColor: Colors.border,
		width: '100%',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 3 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 1,
			}
		}),
	},
	minifiedTextContent: {
		flex: 1,
		marginLeft: 15,
	},
	minifiedTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: Colors.darkText,
		marginBottom: 2,
	},
	minifiedSubtitle: {
		fontSize: 13,
		color: Colors.mediumText,
	},
	minifiedShareButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.accentBlue,
		borderRadius: 25,
		paddingVertical: 8,
		paddingHorizontal: 15,
		marginLeft: 15,
		...Platform.select({
			ios: {
				shadowColor: Colors.accentBlue,
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.2,
				shadowRadius: 5,
			},
			android: {
				elevation: 3,
			},
		}),
	},
	minifiedShareButtonText: {
		color: Colors.white,
		fontSize: 15,
		fontWeight: '600',
		marginLeft: 5,
	},
	storageLoading: {
		marginTop: 50,
		marginBottom: 50,
	},
});

export default TodoList;
