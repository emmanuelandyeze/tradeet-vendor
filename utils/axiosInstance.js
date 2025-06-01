import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create base instance
const axiosInstance = axios.create({
	baseURL: 'https://tradeet-api.onrender.com',
	headers: {
		'Content-Type': 'application/json',
	},
});

// Attach token dynamically to every request
axiosInstance.interceptors.request.use(
	async (config) => {
		const token = await AsyncStorage.getItem('userToken'); // or your key
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	},
);

export default axiosInstance;
