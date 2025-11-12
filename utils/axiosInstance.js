// utils/axiosInstance.js
import axios from 'axios';

// const BASE_URL = 'http://192.168.0.115:5000/api/v1/';
const BASE_URL =
	'https://tradeet-server.onrender.com/api/v1/';

const axiosInstance = axios.create({
	baseURL: BASE_URL,
	timeout: 30000,
});

// Listeners for auth-failure events (e.g. 401 responses)
const authFailureListeners = new Set();

/**
 * Register a callback to be invoked when a 401/unauthorized response is observed.
 * Returns an unsubscribe function.
 * Usage: const unsubscribe = onAuthFailure(() => { ... }); unsubscribe();
 */
export const onAuthFailure = (cb) => {
	if (typeof cb !== 'function') return () => {};
	authFailureListeners.add(cb);
	return () => authFailureListeners.delete(cb);
};

/**
 * Call all registered listeners (safe: copy first)
 */
function notifyAuthFailureListeners(err) {
	const listeners = Array.from(authFailureListeners);
	for (const l of listeners) {
		try {
			l(err);
		} catch (e) {
			// swallow listener errors so one bad listener doesn't break others
			/* eslint-disable no-console */
			console.error('onAuthFailure listener error:', e);
			/* eslint-enable no-console */
		}
	}
}

/**
 * Synchronously set or remove the Authorization header used by axiosInstance.
 * Use this immediately after storing/clearing token in AsyncStorage / in-memory state.
 */
export const setAuthToken = (token) => {
	if (token) {
		axiosInstance.defaults.headers.common[
			'Authorization'
		] = `Bearer ${token}`;
	} else {
		delete axiosInstance.defaults.headers.common[
			'Authorization'
		];
	}
};

/* ---------------------------
   Response interceptor: detect 401s and notify listeners.
   We avoid retrying requests here. The listener (AuthContext) should
   handle logout / refresh logic if needed.
   --------------------------- */
axiosInstance.interceptors.response.use(
	(response) => response,
	(err) => {
		const status = err?.response?.status;
		// Notify on 401 or 403
		if (status === 401 || status === 403) {
			notifyAuthFailureListeners(err);
		}
		return Promise.reject(err);
	},
);

export default axiosInstance;
