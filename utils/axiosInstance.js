import axios from 'axios';

const axiosInstance = axios.create({
	baseURL: 'https://tradeet-api.onrender.com', // or use your deployed server URL
	headers: {
		'Content-Type': 'application/json',
	},
});

export default axiosInstance;
