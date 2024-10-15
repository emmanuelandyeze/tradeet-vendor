import React, {
	createContext,
	useEffect,
	useState,
} from 'react';
import axiosInstance from '../utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage'; // For persisting data locally

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null); // This will store the user info
	const [isLoading, setIsLoading] = useState(true); // Start loading to fetch token
	const [userInfo, setUserInfo] = useState(null); // Store additional user information

	// Function to check login status
	const checkLoginStatus = async () => {
		setIsLoading(true);
		try {
			const token = await AsyncStorage.getItem('userToken');
			console.log(token);
			if (token) {
				setUser({ token }); // You can expand this to get more user info if needed
				// Fetch user info once the token is available
				const userData = await getUserInfo(token); // Pass token to getUserInfo
				setUserInfo(userData.business); // Update userInfo with business data
			}
		} catch (error) {
			console.error('Failed to fetch token:', error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		checkLoginStatus();
	}, []);

	// Function to handle phone verification (Step 1)
	const verifyPhoneNumber = async (phone) => {
		setIsLoading(true);
		try {
			const response = await axiosInstance.post(
				'/auth/send-code',
				{ phone },
			);
			console.log(response);
			return response;
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
			return response;
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
			setUser(response.data);
			return response.data;
		} catch (error) {
			console.error(error.response?.data || error);
			throw error; // Propagate error for handling in the UI
		} finally {
			setIsLoading(false);
		}
	};

	// Function to complete profile (Step 3)
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
			setUser(response.data);
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
			setUser(response.data);
			return response.data;
		} catch (error) {
			console.error(error.response?.data || error);
			throw error; // Propagate error for handling in the UI
		} finally {
			setIsLoading(false);
		}
	};

	// Function to get user information
	const getUserInfo = async (token) => {
		try {
			const response = await axiosInstance.get(
				'/auth/user-info',
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);
			setUser(response.data); // Update the user state with fetched data
			return response.data; // Return fetched user data
		} catch (error) {
			console.error('Failed to fetch user info:', error);
			throw error; // Propagate error for handling in the UI
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
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export { AuthContext, AuthProvider };
