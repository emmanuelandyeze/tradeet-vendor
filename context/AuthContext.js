import React, {
	createContext,
	useEffect,
	useState,
	useRef,
} from 'react';
import axiosInstance from '../utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const AuthContext = createContext();

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

async function sendPushNotification(
	expoPushToken,
	title,
	msg,
) {
	const message = {
		to: expoPushToken,
		sound: 'default',
		title: title,
		body: msg,
		data: { someData: 'goes here' },
	};

	await fetch('https://exp.host/--/api/v2/push/send', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Accept-encoding': 'gzip, deflate',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(message),
	});
}

function handleRegistrationError(errorMessage) {
	alert(errorMessage);
	throw new Error(errorMessage);
}

async function registerForPushNotificationsAsync() {
	if (Platform.OS === 'android') {
		Notifications.setNotificationChannelAsync('default', {
			name: 'default',
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: '#FF231F7C',
		});
	}

	if (Device.isDevice) {
		const { status: existingStatus } =
			await Notifications.getPermissionsAsync();
		let finalStatus = existingStatus;
		if (existingStatus !== 'granted') {
			const { status } =
				await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}
		if (finalStatus !== 'granted') {
			handleRegistrationError(
				'Permission not granted to get push token for push notification!',
			);
			return;
		}
		const projectId =
			Constants?.expoConfig?.extra?.eas?.projectId ??
			Constants?.easConfig?.projectId;
		if (!projectId) {
			handleRegistrationError('Project ID not found');
		}
		try {
			const pushTokenString = (
				await Notifications.getExpoPushTokenAsync({
					projectId,
				})
			).data;
			console.log(pushTokenString);
			return pushTokenString;
		} catch (e) {
			handleRegistrationError(`${e}`);
		}
	} else {
		handleRegistrationError(
			'Must use physical device for push notifications',
		);
	}
}

const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null); // This will store the user info
	const [isLoading, setIsLoading] = useState(true); // Start loading to fetch token
	const [userInfo, setUserInfo] = useState(null); // Store additional user information

	const [expoPushToken, setExpoPushToken] = useState('');
	const [isPushTokenLoading, setIsPushTokenLoading] =
		useState(true);
	const [notification, setNotification] =
		useState(undefined);
	const notificationListener = useRef();
	const responseListener = useRef();

	useEffect(() => {
		const fetchPushToken = async () => {
			try {
				const token =
					await registerForPushNotificationsAsync();
				if (token) setExpoPushToken(token);
			} catch (error) {
				console.error('Error fetching push token:', error);
			} finally {
				setIsPushTokenLoading(false);
			}
		};

		fetchPushToken();

		notificationListener.current =
			Notifications.addNotificationReceivedListener(
				(notification) => {
					setNotification(notification);
				},
			);

		responseListener.current =
			Notifications.addNotificationResponseReceivedListener(
				(response) => {
					console.log(response);
				},
			);

		return () => {
			notificationListener.current &&
				Notifications.removeNotificationSubscription(
					notificationListener.current,
				);
			responseListener.current &&
				Notifications.removeNotificationSubscription(
					responseListener.current,
				);
		};
	}, []);

	// console.log(expoPushToken);

	// Function to check and update the user's expoPushToken
	const updateExpoPushToken = async (token, userData) => {
		if (!expoPushToken) {
			console.warn('Expo Push Token is not available yet.');
			return;
		}

		try {
			const response = await axiosInstance.put(
				`/businesses/${userData._id}/expo-token`,
				{ expoPushToken },
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			console.log('Expo token updated:', response.data);
		} catch (error) {
			console.error(
				'Failed to update expoPushToken:',
				error.response?.data || error,
			);
		}
	};

	// Function to check login status
	const checkLoginStatus = async () => {
		setIsLoading(true);
		try {
			const token = await AsyncStorage.getItem('userToken');
			if (token) {
				setUser({ token });

				// Wait until push token is ready
				while (!expoPushToken) {
					await new Promise((resolve) =>
						setTimeout(resolve, 100),
					);
				}

				const userData = await getUserInfo(token);
				if (userData && userData.business) {
					await updateExpoPushToken(
						token,
						userData.business,
					);
				}
				if (userData.business)
					setUserInfo(userData.business);
			}
		} catch (error) {
			console.error('Failed to fetch token:', error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		checkLoginStatus();
	}, [expoPushToken]);

	// Function to verify phone number (Step 1)
	const verifyPhoneNumber = async (phone) => {
		setIsLoading(true);
		try {
			const response = await axiosInstance.post(
				'/auth/send-code',
				{ phone },
			);
			console.log(
				'verifyPhoneNumber response:',
				response.data,
			);
			return response.data;
		} catch (error) {
			console.error(error.response?.data.message || error);
			throw error; // Propagate error for handling in the UI
		} finally {
			setIsLoading(false);
		}
	};

	// Function to verify the code (Step 2)
	const verifyCode = async (phone, code) => {
		setIsLoading(true);
		try {
			const response = await axiosInstance.post(
				'/auth/verify-code',
				{ phone, code },
			);
			console.log('verifyCode response:', response.data);
			return response.data;
		} catch (error) {
			console.error(error.response?.data || error);
			throw error; // Propagate error for handling in the UI
		} finally {
			setIsLoading(false);
		}
	};

	// Function to complete profile (Step 3)
	const completeProfile = async (profileData, phone) => {
		setIsLoading(true);
		try {
			const response = await axiosInstance.post(
				'/auth/complete-profile',
				profileData,
			);
			const { token } = response.data;

			// Store token in AsyncStorage
			await AsyncStorage.setItem('userToken', token);

			// Update user state
			setUser({ token }); // Set user with token first

			// Fetch and set user info
			const userData = await getUserInfo(token);
			if (userData && userData.business) {
				setUserInfo(userData.business);
			}

			return response.data;
		} catch (error) {
			console.error(error.response?.data || error);
			throw error; // Propagate error for handling in the UI
		} finally {
			setIsLoading(false);
		}
	};

	// Function to complete campus profile (similar to completeProfile)
	const completeCampusProfile = async (
		profileData,
		phone,
	) => {
		setIsLoading(true);
		try {
			const response = await axiosInstance.post(
				'/auth/complete-campus-profile',
				profileData,
			);
			const { token } = response.data;

			// Store token in AsyncStorage
			await AsyncStorage.setItem('userToken', token);

			// Update user state
			setUser({ token }); // Set user with token first

			// Fetch and set user info
			const userData = await getUserInfo(token);
			if (userData && userData.business) {
				setUserInfo(userData.business);
			}

			return response.data;
		} catch (error) {
			console.error(error.response?.data || error);
			throw error; // Propagate error for handling in the UI
		} finally {
			setIsLoading(false);
		}
	};

	// Function to handle login
	const login = async (phone, password) => {
		setIsLoading(true);
		try {
			const response = await axiosInstance.post(
				'/auth/login',
				{ phone, password },
			);
			const { token } = response.data;

			// Store token in AsyncStorage
			await AsyncStorage.setItem('userToken', token);

			// Update user state
			setUser({ token }); // Set user with token first

			// Fetch and set user info
			const userData = await getUserInfo(token);
			if (userData && userData.business) {
				setUserInfo(userData.business);
			}
			console.log('res', response);

			return response.data;
		} catch (error) {
			console.log(error.response?.data || error);
			return error.response.data; // Propagate error for handling in the UI
		} finally {
			setIsLoading(false);
		}
	};

	// Function to get user information
	const getUserInfo = async (token) => {
		try {
			console.log('Fetching user info with token:', token);
			const response = await axiosInstance.get(
				'/auth/user-info',
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);
			console.log('User info response:', response.data);
			setUser(response.data); // Update the user state with fetched data
			return response.data; // Return fetched user data
		} catch (error) {
			console.error(
				'Failed to fetch user info:',
				error.response?.data || error,
			);
			await logout(); // Ensure logout is awaited
			throw error; // Propagate error for handling in the UI
		}
	};

	// Function to send reset otp
	const sendResetOtp = async (phone) => {
		setIsLoading(true);
		try {
			const response = await axiosInstance.post(
				'/auth/forgot-password',
				{ phone },
			);

			return response.data;
		} catch (error) {
			console.log(error.response?.data || error);
			return error.response.data; // Propagate error for handling in the UI
		} finally {
			setIsLoading(false);
		}
	};

	const verifyResetOtp = async (phone, otp) => {
		setIsLoading(true);
		try {
			const response = await axiosInstance.post(
				'/auth/verify-otp',
				{ phone, otp },
			);

			return response.data;
		} catch (error) {
			console.log(error.response?.data || error);
			return error.response.data; // Propagate error for handling in the UI
		} finally {
			setIsLoading(false);
		}
	};

	const resetPassword = async (phone, otp, password) => {
		setIsLoading(true);
		try {
			const response = await axiosInstance.post(
				'/auth/reset-password',
				{ phone, otp, newPassword: password },
			);

			return response.data;
		} catch (error) {
			console.log(error.response?.data || error);
			return error.response.data; // Propagate error for handling in the UI
		} finally {
			setIsLoading(false);
		}
	};

	// Function to handle logout
	const logout = async () => {
		setIsLoading(true);
		try {
			await AsyncStorage.removeItem('userToken');
			setUser(null);
			setUserInfo(null); // Clear user info on logout
		} catch (error) {
			console.error('Failed to log out:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				verifyPhoneNumber,
				verifyCode,
				completeProfile,
				login,
				logout,
				checkLoginStatus,
				userInfo, // Expose userInfo state
				completeCampusProfile,
				sendPushNotification,
				expoPushToken,
				sendResetOtp,
				verifyResetOtp,
				resetPassword,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export { AuthContext, AuthProvider };
