// contexts/AuthContext.js
import React, {
	createContext,
	useEffect,
	useState,
	useRef,
	useCallback,
} from 'react';
import axiosInstance, {
	onAuthFailure,
	setAuthToken,
} from '../utils/axiosInstance';
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

/* ---------------------- Push helpers (unchanged) ---------------------- */

async function sendPushNotification(
	expoPushToken,
	title,
	msg,
) {
	if (!expoPushToken) {
		console.warn(
			'sendPushNotification: No Expo Push Token available.',
		);
		return;
	}
	const message = {
		to: expoPushToken,
		sound: 'default',
		title,
		body: msg,
		data: { someData: 'goes here' },
	};

	try {
		const resp = await fetch(
			'https://exp.host/--/api/v2/push/send',
			{
				method: 'POST',
				headers: {
					Accept: 'application/json',
					'Accept-encoding': 'gzip, deflate',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(message),
			},
		);
		const data = await resp.json();
		if (!resp.ok) {
			console.error(
				'Failed to send push notification:',
				data,
			);
			throw new Error(JSON.stringify(data));
		}
		console.log('Push notification sent:', data);
		return data;
	} catch (err) {
		console.error('Error sending push notification:', err);
	}
}

function handleRegistrationError(msg) {
	console.error(
		'Push Notification Registration Error:',
		msg,
	);
}

async function registerForPushNotificationsAsync() {
	let pushTokenString = null;

	if (Platform.OS === 'android') {
		try {
			await Notifications.setNotificationChannelAsync(
				'default',
				{
					name: 'default',
					importance: Notifications.AndroidImportance.MAX,
					vibrationPattern: [0, 250, 250, 250],
					lightColor: '#FF231F7C',
				},
			);
		} catch (err) {
			console.warn(
				'Failed to set Android notification channel:',
				err,
			);
		}
	}

	if (!Device.isDevice) {
		handleRegistrationError(
			'Push notifications require a physical device or supported emulator.',
		);
		return null;
	}

	try {
		const { status: existing } =
			await Notifications.getPermissionsAsync();
		let finalStatus = existing;
		if (existing !== 'granted') {
			const { status } =
				await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}
		if (finalStatus !== 'granted') {
			handleRegistrationError(
				'Permission not granted for push notifications.',
			);
			return null;
		}
	} catch (permErr) {
		handleRegistrationError(`Permission error: ${permErr}`);
		return null;
	}

	const projectId =
		Constants?.expoConfig?.extra?.eas?.projectId ??
		Constants?.easConfig?.projectId;
	if (!projectId) {
		handleRegistrationError(
			'Project ID not found in Constants.',
		);
		return null;
	}

	try {
		console.log(
			'Getting Expo push token (projectId):',
			projectId,
		);
		const tokenResult =
			await Notifications.getExpoPushTokenAsync({
				projectId,
			});
		pushTokenString = tokenResult.data;
		console.log('Expo push token:', pushTokenString);
		return pushTokenString;
	} catch (e) {
		handleRegistrationError(
			`Error fetching push token: ${e.message || e}`,
		);
		return null;
	}
}

/* ---------------------- Storage keys ---------------------- */
const STORAGE_KEY = 'userToken';
const SELECTED_STORE_KEY = 'selectedStore'; // saved as { _id, _isBranch?, _storeId? }

/* ---------------------- AuthProvider ---------------------- */

const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null); // { token }
	const [isLoading, setIsLoading] = useState(true);
	const [userInfo, setUserInfo] = useState(null); // full user object from /auth/me (stores are full objects)
	const [expoPushToken, setExpoPushToken] = useState('');
	const [notification, setNotification] = useState(null);

	// selectedStore can be:
	//  - store object: { _id, name, branches: [...], ... , _isBranch: false }
	//  - branch object: { _id, name, ... , _isBranch: true, _storeId: <parent store id> }
	const [selectedStore, setSelectedStore] = useState(null);

	const notificationListener = useRef();
	const responseListener = useRef();
	const prevSelectedStoreRef = useRef(null);

	/* ---------------------- Backend helpers for stores/branches ---------------------- */

	// GET /stores/:id - returns store object
	async function fetchStoreById(storeId, authToken = null) {
		if (!storeId) return null;
		try {
			const headers = authToken
				? { Authorization: `Bearer ${authToken}` }
				: undefined;
			const resp = await axiosInstance.get(
				`/stores/${storeId}`,
				{ headers },
			);
			return resp.data?.store ?? resp.data ?? null;
		} catch (err) {
			console.warn(
				'fetchStoreById failed for',
				storeId,
				err?.response?.data || err.message || err,
			);
			return null;
		}
	}

	// GET /stores/:id/branches - returns array of branch objects
	async function fetchBranchesForStore(
		storeId,
		authToken = null,
	) {
		if (!storeId) return [];
		try {
			const headers = authToken
				? { Authorization: `Bearer ${authToken}` }
				: undefined;
			const resp = await axiosInstance.get(
				`/stores/${storeId}/branches`,
				{ headers },
			);
			return resp.data?.branches ?? resp.data ?? [];
		} catch (err) {
			console.warn(
				'fetchBranchesForStore failed for',
				storeId,
				err?.response?.data || err.message || err,
			);
			return [];
		}
	}

	// Resolve branchId to branch object.
	// Because userInfo.stores now contains full store objects, first try to find branch inside those.
	async function fetchBranchById(
		branchId,
		parentStoreId = null,
		storeObj = null,
		authToken = null,
	) {
		if (!branchId) return null;

		// 1) if storeObj passed and has branches array, find there
		if (storeObj && Array.isArray(storeObj.branches)) {
			const b = storeObj.branches.find(
				(x) => String(x._id) === String(branchId),
			);
			if (b) return b;
		}

		// 2) if parentStoreId provided, fetch branches for that store
		if (parentStoreId) {
			const branches = await fetchBranchesForStore(
				parentStoreId,
				authToken,
			);
			const b = (branches || []).find(
				(x) => String(x._id) === String(branchId),
			);
			if (b) return b;
		}

		// 3) Search inside userInfo.stores (which now contains full store objects)
		if (userInfo && Array.isArray(userInfo.stores)) {
			for (const store of userInfo.stores) {
				if (store && Array.isArray(store.branches)) {
					const b = store.branches.find(
						(x) => String(x._id) === String(branchId),
					);
					if (b) return b;
				}
			}
		}

		// 4) last resort: try fetching branches from all stores the user has (if stores are objects, use their _id)
		if (userInfo && Array.isArray(userInfo.stores)) {
			for (const store of userInfo.stores) {
				const sId = store && store._id ? store._id : null;
				if (!sId) continue;
				const branches = await fetchBranchesForStore(
					sId,
					authToken,
				);
				const b = (branches || []).find(
					(x) => String(x._id) === String(branchId),
				);
				if (b) return b;
			}
		}

		return null;
	}

	/* ---------------------- Device token helpers ---------------------- */

	const saveDeviceTokenForStore = async (
		token,
		storeId,
		authToken = null,
	) => {
		if (!token || !storeId) {
			console.warn(
				'saveDeviceTokenForStore: missing token or storeId',
			);
			return;
		}
		try {
			const label = `${Device.manufacturer || ''} ${
				Device.modelName || ''
			}`.trim();
			const config = authToken
				? {
						headers: {
							Authorization: `Bearer ${authToken}`,
						},
				  }
				: undefined;
			await axiosInstance.post(
				`/stores/${selectedStore?._id}/device-tokens`,
				{ token, label, platform: Platform.OS },
				config,
			);
			console.log('Saved device token for store:', selectedStore?._id);
		} catch (err) {
			console.error(
				'Failed to save device token for store (non-fatal):',
				err?.response?.data || err,
			);
		}
	};

	const removeDeviceTokenForStore = async (
		token,
		storeId,
		authToken = null,
	) => {
		if (!token || !storeId) return;
		try {
			const config = authToken
				? {
						headers: {
							Authorization: `Bearer ${authToken}`,
						},
						data: { token },
				  }
				: { data: { token } };
			await axiosInstance.delete(
				`/stores/${storeId}/device-tokens`,
				config,
			);
			console.log(
				'Removed device token for store:',
				storeId,
			);
		} catch (err) {
			console.warn(
				'Failed to remove device token for store (non-fatal):',
				err?.response?.data || err,
			);
		}
	};

	// update expo push token on backend (non-blocking)
	const updateExpoPushToken = async (
		authToken,
		userObj,
	) => {
		if (!expoPushToken) {
			console.warn(
				'updateExpoPushToken: No expoPushToken available.',
			);
			return;
		}

		// prefer currently selected branch/store, else first store in userObj
		const attachTo = selectedStore
			? selectedStore._isBranch
				? selectedStore._storeId
				: selectedStore._id
			: userObj &&
			  Array.isArray(userObj.stores) &&
			  userObj.stores.length
			? userObj.stores[0]._id
			: null;

		if (!attachTo) {
			console.warn(
				'updateExpoPushToken: No store available to attach token to. Skipping for now.',
			);
			return;
		}
		try {
			await saveDeviceTokenForStore(
				expoPushToken,
				attachTo,
				authToken,
			);
		} catch (err) {
			console.error('updateExpoPushToken error:', err);
		}
	};

	/* ---------------------- Auth API helpers ---------------------- */

	const getUserInfo = async (token = null) => {
		try {
			if (token) setAuthToken(token);
			const headers = token
				? { Authorization: `Bearer ${token}` }
				: undefined;
			const resp = await axiosInstance.get('/auth/me', {
				headers,
			});
			const userObj = resp.data?.user ?? resp.data;
			// IMPORTANT: userObj.stores is expected to be an array of full store objects
			console.log('getUserInfo ->', userObj);
			setUserInfo(userObj);
			return userObj;
		} catch (err) {
			console.error(
				'Failed to fetch user info:',
				err?.response?.data?.message || err.message || err,
			);
			const status = err?.response?.status;
			if (
				(status === 401 || status === 403) &&
				(user?.token || token)
			) {
				console.log(
					'getUserInfo: auth failed (401/403) -> triggering logout',
				);
				try {
					await logout();
				} catch (e) {
					console.error('Logout after 401 failed:', e);
				}
			}
			throw err;
		}
	};

	/* ---------------------- Restore / check login status (branch-aware using store objects) ---------------------- */

	const checkLoginStatus = async () => {
		setIsLoading(true);
		try {
			const token = await AsyncStorage.getItem(STORAGE_KEY);
			if (token) {
				setUser({ token });
				setAuthToken(token);

				const u = await getUserInfo(token); // u.stores = full objects

				// Try restore persisted selected store/branch
				try {
					const persisted = await AsyncStorage.getItem(
						SELECTED_STORE_KEY,
					);
					let restored = null;
					if (persisted) {
						const parsed = JSON.parse(persisted);
						if (parsed && parsed._id) {
							// If persisted is branch
							if (parsed._isBranch && parsed._storeId) {
								// find parent store in userInfo.stores
								const parent = (u.stores || []).find(
									(s) =>
										String(s._id) ===
										String(parsed._storeId),
								);
								if (
									parent &&
									Array.isArray(parent.branches)
								) {
									const br = parent.branches.find(
										(b) =>
											String(b._id) === String(parsed._id),
									);
									if (br)
										restored = {
											...br,
											_isBranch: true,
											_storeId: parent._id,
										};
								}
								// fallback: try searching branches across stores
								if (!restored) {
									for (const s of u.stores || []) {
										if (Array.isArray(s.branches)) {
											const br = s.branches.find(
												(b) =>
													String(b._id) ===
													String(parsed._id),
											);
											if (br) {
												restored = {
													...br,
													_isBranch: true,
													_storeId: s._id,
												};
												break;
											}
										}
									}
								}
							} else {
								// persisted is a store id
								const storeObj = (u.stores || []).find(
									(s) =>
										String(s._id) === String(parsed._id),
								);
								if (storeObj) {
									// Resolve default branch for the store (prefer store.defaultBranch or branch.isDefault)
									let branchObj = null;
									if (storeObj.defaultBranch) {
										branchObj = (
											storeObj.branches || []
										).find(
											(b) =>
												String(b._id) ===
												String(storeObj.defaultBranch),
										);
									}
									if (
										!branchObj &&
										Array.isArray(storeObj.branches)
									) {
										branchObj =
											storeObj.branches.find(
												(b) => b.isDefault,
											) ||
											storeObj.branches[0] ||
											null;
									}
									if (branchObj)
										restored = {
											...branchObj,
											_isBranch: true,
											_storeId: storeObj._id,
										};
									else
										restored = {
											...storeObj,
											_isBranch: false,
										};
								}
							}
						}
					}

					// If nothing restored, pick a sensible default from userInfo.stores
					if (!restored) {
						if (
							Array.isArray(u.stores) &&
							u.stores.length > 0
						) {
							const firstStore = u.stores[0];
							let branchObj = null;
							if (firstStore.defaultBranch) {
								branchObj = (
									firstStore.branches || []
								).find(
									(b) =>
										String(b._id) ===
										String(firstStore.defaultBranch),
								);
							}
							if (
								!branchObj &&
								Array.isArray(firstStore.branches)
							) {
								branchObj =
									firstStore.branches.find(
										(b) => b.isDefault,
									) ||
									firstStore.branches[0] ||
									null;
							}
							console.log('firstStore:', firstStore);
							if (branchObj)
								restored = {
									...branchObj,
									_isBranch: true,
									_storeId: firstStore._id,
								};
							else
								restored = {
									...firstStore,
									_isBranch: false,
								};
						}
					}

					if (restored) {
						setSelectedStore(restored);
						prevSelectedStoreRef.current = restored;
					}
				} catch (e) {
					console.warn(
						'Error restoring persisted selected store:',
						e,
					);
				}

				if (expoPushToken) {
					await updateExpoPushToken(token, u);
				}
			}
		} catch (err) {
			console.error('checkLoginStatus error:', err);
		} finally {
			setIsLoading(false);
		}
	};

	/* ---------------------- logout (device token removal uses parent store id) ---------------------- */

	const logout = useCallback(async () => {
		setIsLoading(true);
		try {
			const authToken =
				user?.token ??
				(await AsyncStorage.getItem(STORAGE_KEY));

			if (authToken) {
				try {
					await axiosInstance.post(
						'/auth/logout',
						{},
						{
							headers: {
								Authorization: `Bearer ${authToken}`,
							},
						},
					);
				} catch (serverErr) {
					console.warn(
						'Server logout failed (non-fatal):',
						serverErr?.response?.data || serverErr,
					);
				}
			} else {
				console.log(
					'logout: no local token available, skipping server logout',
				);
			}

			try {
				if (expoPushToken && selectedStore) {
					const attachTo = selectedStore._isBranch
						? selectedStore._storeId
						: selectedStore._id;
					if (attachTo) {
						await removeDeviceTokenForStore(
							expoPushToken,
							attachTo,
							authToken,
						);
					}
				}
			} catch (e) {
				/* ignore */
			}

			await AsyncStorage.removeItem(STORAGE_KEY);
			await AsyncStorage.removeItem(SELECTED_STORE_KEY);
			setUser(null);
			setUserInfo(null);
			setExpoPushToken('');
			setSelectedStore(null);
			setAuthToken(null);

			console.log('Logged out locally.');
		} catch (err) {
			console.error('Logout failed:', err);
		} finally {
			setIsLoading(false);
		}
	}, [expoPushToken, selectedStore, user?.token]);

	useEffect(() => {
		const unsubscribe = onAuthFailure(() => {
			console.log(
				'onAuthFailure -> local logout triggered',
			);
			logout();
		});
		return () => unsubscribe();
	}, [logout]);

	/* ---------------------- push registration & listeners ---------------------- */

	useEffect(() => {
		let mounted = true;
		const setup = async () => {
			const token =
				await registerForPushNotificationsAsync();
			if (mounted && token) setExpoPushToken(token);

			notificationListener.current =
				Notifications.addNotificationReceivedListener(
					(n) => {
						console.log('Notification received:', n);
						setNotification(n);
					},
				);
			responseListener.current =
				Notifications.addNotificationResponseReceivedListener(
					(r) => {
						console.log('Notification response:', r);
					},
				);
		};
		setup();

		return () => {
			mounted = false;
			if (notificationListener.current)
				Notifications.removeNotificationSubscription(
					notificationListener.current,
				);
			if (responseListener.current)
				Notifications.removeNotificationSubscription(
					responseListener.current,
				);
		};
	}, []);

	/* ---------------------- Sync expo token on changes ---------------------- */

	useEffect(() => {
		(async () => {
			if (!expoPushToken || !user?.token || !userInfo)
				return;
			if (
				!Array.isArray(userInfo.stores) ||
				userInfo.stores.length === 0
			) {
				console.log(
					'Skipping expo token sync: user has no stores yet.',
				);
				return;
			}

			try {
				await updateExpoPushToken(user.token, userInfo);
			} catch (e) {
				console.error('Error syncing expo token:', e);
			}
		})();
	}, [expoPushToken, user?.token, userInfo, selectedStore]);

	/* ---------------------- Keep selectedStore in sync when userInfo changes ---------------------- */

	useEffect(() => {
		if (
			!userInfo ||
			!Array.isArray(userInfo.stores) ||
			userInfo.stores.length === 0
		)
			return;

		(async () => {
			// If no selectedStore, pick default branch or first branch/store
			if (!selectedStore) {
				const firstStore = userInfo.stores[0];
				console.log('firstStore:', firstStore);
				let branchObj = null;
				if (firstStore.defaultBranch) {
					branchObj = (firstStore.branches || []).find(
						(b) =>
							String(b._id) ===
							String(firstStore.defaultBranch),
					);
				}
				if (
					!branchObj &&
					Array.isArray(firstStore.branches)
				) {
					branchObj =
						firstStore.branches.find((b) => b.isDefault) ||
						firstStore.branches[0] ||
						null;
				}
				if (branchObj) {
					const sel = {
						...branchObj,
						_isBranch: true,
						_storeId: firstStore._id,
					};
					setSelectedStore(sel);
					prevSelectedStoreRef.current = sel;
				} else {
					const sel = { ...firstStore, _isBranch: false };
					setSelectedStore(sel);
					prevSelectedStoreRef.current = sel;
				}
				return;
			}

			// Refresh selectedStore object from updated userInfo
			let updated = null;
			if (selectedStore._isBranch) {
				// find parent store and branch inside it
				const parent = (userInfo.stores || []).find(
					(s) =>
						String(s._id) ===
						String(selectedStore._storeId),
				);
				if (parent && Array.isArray(parent.branches)) {
					const br = parent.branches.find(
						(b) =>
							String(b._id) === String(selectedStore._id),
					);
					if (br)
						updated = {
							...br,
							_isBranch: true,
							_storeId: parent._id,
						};
				} else {
					// branch might have moved — try to find across all stores
					for (const s of userInfo.stores || []) {
						if (Array.isArray(s.branches)) {
							const br = s.branches.find(
								(b) =>
									String(b._id) ===
									String(selectedStore._id),
							);
							if (br) {
								updated = {
									...br,
									_isBranch: true,
									_storeId: s._id,
								};
								break;
							}
						}
					}
				}
			} else {
				// selected is a store
				const st = (userInfo.stores || []).find(
					(s) =>
						String(s._id) === String(selectedStore._id),
				);
				if (st) updated = { ...st, _isBranch: false };
			}

			if (updated) {
				setSelectedStore(updated);
				prevSelectedStoreRef.current = updated;
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userInfo]);

	/* ---------------------- Persist selectedStore ---------------------- */

	useEffect(() => {
		(async () => {
			try {
				if (selectedStore) {
					const toPersist = {
						_id: selectedStore._id,
						_isBranch: !!selectedStore._isBranch,
						_storeId: selectedStore._isBranch
							? selectedStore._storeId
							: undefined,
					};
					await AsyncStorage.setItem(
						SELECTED_STORE_KEY,
						JSON.stringify(toPersist),
					);
				} else {
					await AsyncStorage.removeItem(SELECTED_STORE_KEY);
				}
			} catch (e) {
				console.warn('Failed to persist selectedStore:', e);
			}
		})();
	}, [selectedStore]);

	/* ---------------------- When selectedStore changes, update device tokens ---------------------- */

	useEffect(() => {
		(async () => {
			const prev = prevSelectedStoreRef.current;

			if (!expoPushToken) {
				prevSelectedStoreRef.current = selectedStore;
				return;
			}

			const authToken =
				user?.token ??
				(await AsyncStorage.getItem(STORAGE_KEY));

			// remove token from previous store's parent store id (if branch) or store id
			if (
				prev &&
				prev._id &&
				(!selectedStore || prev._id !== selectedStore._id)
			) {
				try {
					const prevParent = prev._isBranch
						? prev._storeId
						: prev._id;
					if (prevParent) {
						await removeDeviceTokenForStore(
							expoPushToken,
							prevParent,
							authToken,
						);
						console.log(
							`Removed device token from previous store ${prevParent}`,
						);
					}
				} catch (err) {
					console.warn(
						'Failed to remove token from previous store (non-fatal):',
						err,
					);
				}
			}

			// save token for new selection
			if (selectedStore && selectedStore._id) {
				try {
					const attachTo = selectedStore._isBranch
						? selectedStore._storeId
						: selectedStore._id;
					if (attachTo) {
						await saveDeviceTokenForStore(
							expoPushToken,
							attachTo,
							authToken,
						);
						console.log(
							`Saved device token for new selected store ${attachTo}`,
						);
					}
				} catch (err) {
					console.warn(
						'Failed to save token for selected store (non-fatal):',
						err,
					);
				}
			}

			prevSelectedStoreRef.current = selectedStore;
		})();
	}, [selectedStore, expoPushToken, user?.token]);

	/* ---------------------- Branch/store switch helpers (now use store objects) ---------------------- */

	// Switch to a store (accepts store object or store id). Will resolve default branch when available.
	const switchSelectedStore = useCallback(
		async (newStore) => {
			if (!newStore) return;
			const authToken =
				user?.token ??
				(await AsyncStorage.getItem(STORAGE_KEY));
			let storeObj = null;

			// if newStore is a string, try to find in userInfo.stores first (they are objects), else fetch
			if (typeof newStore === 'string') {
				if (userInfo && Array.isArray(userInfo.stores)) {
					storeObj =
						userInfo.stores.find(
							(s) => String(s._id) === String(newStore),
						) || null;
				}
				if (!storeObj) {
					storeObj = await fetchStoreById(
						newStore,
						authToken,
					);
				}
			} else {
				// assume object
				storeObj = newStore;
			}

			if (!storeObj) throw new Error('store not found');

			// resolve default branch using storeObj (which may already contain branches)
			let branchObj = null;
			if (storeObj.defaultBranch) {
				branchObj = (storeObj.branches || []).find(
					(b) =>
						String(b._id) ===
						String(storeObj.defaultBranch),
				);
			}
			if (!branchObj && Array.isArray(storeObj.branches)) {
				branchObj =
					storeObj.branches.find((b) => b.isDefault) ||
					storeObj.branches[0] ||
					null;
			}
			if (!branchObj) {
				// as fallback, try fetching branches from API
				const branches = await fetchBranchesForStore(
					storeObj._id,
					authToken,
				);
				branchObj =
					(branches || []).find(
						(b) =>
							String(b._id) ===
							String(storeObj.defaultBranch),
					) ||
					(branches || []).find((b) => b.isDefault) ||
					branches[0] ||
					null;
			}

			let selected = null;
			if (branchObj)
				selected = {
					...branchObj,
					_isBranch: true,
					_storeId: storeObj._id,
				};
			else selected = { ...storeObj, _isBranch: false };

			setSelectedStore(selected);
			prevSelectedStoreRef.current = selected;
			return selected;
		},
		[user?.token, userInfo],
	);

	// Explicitly switch to branchId (parentStoreId optional). thread-safe with userInfo.stores being objects
	const switchSelectedBranch = useCallback(
		async (branchId, parentStoreId = null) => {
			if (!branchId) throw new Error('branchId required');
			const authToken =
				user?.token ??
				(await AsyncStorage.getItem(STORAGE_KEY));
			let branchObj = null;
			let storeId = parentStoreId;

			// Try find branch inside provided parent store (from userInfo)
			if (
				parentStoreId &&
				userInfo &&
				Array.isArray(userInfo.stores)
			) {
				const parent = userInfo.stores.find(
					(s) => String(s._id) === String(parentStoreId),
				);
				if (parent && Array.isArray(parent.branches)) {
					branchObj = parent.branches.find(
						(b) => String(b._id) === String(branchId),
					);
				}
			}

			// Search across userInfo stores
			if (
				!branchObj &&
				userInfo &&
				Array.isArray(userInfo.stores)
			) {
				for (const s of userInfo.stores) {
					if (Array.isArray(s.branches)) {
						const b = s.branches.find(
							(x) => String(x._id) === String(branchId),
						);
						if (b) {
							branchObj = b;
							storeId = s._id;
							break;
						}
					}
				}
			}

			// Fallback: fetch branches from each store (if necessary)
			if (
				!branchObj &&
				userInfo &&
				Array.isArray(userInfo.stores)
			) {
				for (const s of userInfo.stores) {
					const branches = await fetchBranchesForStore(
						s._id,
						authToken,
					);
					const b = (branches || []).find(
						(x) => String(x._id) === String(branchId),
					);
					if (b) {
						branchObj = b;
						storeId = s._id;
						break;
					}
				}
			}

			// Last resort: fetch branch directly by trying parentStoreId
			if (!branchObj && parentStoreId) {
				const branches = await fetchBranchesForStore(
					parentStoreId,
					authToken,
				);
				branchObj = (branches || []).find(
					(x) => String(x._id) === String(branchId),
				);
				if (branchObj) storeId = parentStoreId;
			}

			console.log('bObj: ', branchObj);

			if (!branchObj)
				throw Object.assign(new Error('Branch not found'), {
					status: 404,
				});

			const selected = {
				...branchObj,
				_isBranch: true,
				_storeId: storeId,
			};

			setSelectedStore(selected);
			prevSelectedStoreRef.current = selected;
			return selected;
		},
		[user?.token, userInfo],
	);

	/* ---------------------- Auth flows (login, verify etc.) - same as before but using getUserInfo */

	const login = async (phone, password) => {
		setIsLoading(true);
		try {
			const resp = await axiosInstance.post('/auth/login', {
				phone,
				password,
			});
			const { token } = resp.data;
			if (!token)
				throw new Error('No token returned from login');

			await AsyncStorage.setItem(STORAGE_KEY, token);
			setUser({ token });
			setAuthToken(token);

			const u = await getUserInfo(token);
			if (u && expoPushToken) {
				await updateExpoPushToken(token, u);
			}
			return resp.data;
		} catch (err) {
			console.error(
				'login error:',
				err?.response?.data?.message || err.message || err,
			);
			throw err?.response?.data || err;
		} finally {
			setIsLoading(false);
		}
	};

	const verifyPhoneNumber = async (phone) => {
		setIsLoading(true);
		try {
			const resp = await axiosInstance.post(
				'/auth/send-code',
				{ phone },
			);
			return resp.data;
		} catch (err) {
			console.error(
				'verifyPhoneNumber error:',
				err?.response?.data?.message || err,
			);
			throw err?.response?.data || err;
		} finally {
			setIsLoading(false);
		}
	};

	const verifyCode = async (phone, code) => {
		setIsLoading(true);
		try {
			const resp = await axiosInstance.post(
				'/auth/verify-code',
				{ phone, code },
			);
			const { token } = resp.data;
			if (token) {
				await AsyncStorage.setItem(STORAGE_KEY, token);
				setUser({ token });
				setAuthToken(token);

				const u = await getUserInfo(token);
				if (expoPushToken)
					await updateExpoPushToken(token, u);
			}
			return resp.data;
		} catch (err) {
			console.error(
				'verifyCode error:',
				err?.response?.data?.message || err,
			);
			throw err?.response?.data || err;
		} finally {
			setIsLoading(false);
		}
	};

	const setPassword = async (passwordData) => {
		try {
			const { password, phone } = passwordData;
			const payload = { password, phone };
			const resp = await axiosInstance.post(
				'/auth/set-password',
				payload,
			);
			const { token } = resp.data;
			if (token) {
				await AsyncStorage.setItem(STORAGE_KEY, token);
				setUser({ token });
				setAuthToken(token);
				const u = await getUserInfo(token);
				if (expoPushToken)
					await updateExpoPushToken(token, u);
			}
			return resp.data;
		} catch (err) {
			console.error(
				'setPassword error:',
				err?.response?.data?.message || err,
			);
			throw err?.response?.data || err;
		}
	};

	const completeOwnerProfile = async (profileData) => {
		try {
			const resp = await axiosInstance.post(
				'/auth/complete-profile',
				profileData,
			);
			const { token } = resp.data;
			if (token) {
				await AsyncStorage.setItem(STORAGE_KEY, token);
				setUser({ token });
				setAuthToken(token);
				const u = await getUserInfo(token);
				if (expoPushToken)
					await updateExpoPushToken(token, u);
			}
			return resp.data;
		} catch (err) {
			console.error(
				'completeProfile error:',
				err?.response?.data?.message || err,
			);
			throw err?.response?.data || err;
		}
	};

	const completeBusinessProfile = async (profileData) => {
		setIsLoading(true);
		try {
			const resp = await axiosInstance.post(
				'/auth/complete-profile',
				profileData,
			);
			const { token } = resp.data;
			if (token) {
				await AsyncStorage.setItem(STORAGE_KEY, token);
				setUser({ token });
				setAuthToken(token);
				const u = await getUserInfo(token);
				if (expoPushToken)
					await updateExpoPushToken(token, u);
			}
			return resp.data;
		} catch (err) {
			console.error(
				'completeProfile error:',
				err?.response?.data?.message || err,
			);
			throw err?.response?.data || err;
		} finally {
			setIsLoading(false);
		}
	};

	const sendResetOtp = async (phone) => {
		setIsLoading(true);
		try {
			const resp = await axiosInstance.post(
				'/auth/forgot-password',
				{ phone },
			);
			return resp.data;
		} catch (err) {
			console.error(
				'sendResetOtp error:',
				err?.response?.data?.message || err,
			);
			throw err?.response?.data || err;
		} finally {
			setIsLoading(false);
		}
	};

	const verifyResetOtp = async (phone, otp) => {
		setIsLoading(true);
		try {
			const resp = await axiosInstance.post(
				'/auth/verify-otp',
				{ phone, otp },
			);
			return resp.data;
		} catch (err) {
			console.error(
				'verifyResetOtp error:',
				err?.response?.data?.message || err,
			);
			throw err?.response?.data || err;
		} finally {
			setIsLoading(false);
		}
	};

	const resetPassword = async (phone, otp, newPassword) => {
		setIsLoading(true);
		try {
			const resp = await axiosInstance.post(
				'/auth/reset-password',
				{ phone, otp, newPassword },
			);
			return resp.data;
		} catch (err) {
			console.error(
				'resetPassword error:',
				err?.response?.data?.message || err,
			);
			throw err?.response?.data || err;
		} finally {
			setIsLoading(false);
		}
	};

	const updateUserInfo = async (updates) => {
		setIsLoading(true);
		try {
			const resp = await axiosInstance.put(
				'/auth/me',
				updates,
			);
			const userObj = resp.data?.user ?? resp.data;
			// refresh local user info
			await getUserInfo(user?.token);
			return userObj;
		} catch (err) {
			console.error(
				'updateUserInfo error:',
				err?.response?.data?.message || err,
			);
			throw err?.response?.data || err;
		} finally {
			setIsLoading(false);
		}
	};

	const updatePassword = async (
		currentPassword,
		newPassword,
	) => {
		setIsLoading(true);
		try {
			const resp = await axiosInstance.post(
				'/auth/me/password',
				{ currentPassword, newPassword },
			);
			const { token } = resp.data;
			if (token) {
				await AsyncStorage.setItem(STORAGE_KEY, token);
				setUser({ token });
				setAuthToken(token);
				await getUserInfo(token);
			}
			return resp.data;
		} catch (err) {
			console.error(
				'updatePassword error:',
				err?.response?.data?.message || err,
			);
			throw err?.response?.data || err;
		} finally {
			setIsLoading(false);
		}
	};

	const getRedirectPath = useCallback(() => {
		if (isLoading) return '/loading';
		if (!user?.token || !userInfo) return '/login';
		if (!userInfo.name || !userInfo.password)
			return '/signup/owner-details';
		if (
			Array.isArray(userInfo.stores) &&
			userInfo.stores.length === 0 &&
			userInfo.name &&
			userInfo.password
		)
			return '/signup/business-name';
		return null;
	}, [isLoading, user, userInfo]);

	useEffect(() => {
		checkLoginStatus();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				userInfo,
				expoPushToken,
				notification,
				selectedStore,
				setSelectedStore,
				switchSelectedStore,
				switchSelectedBranch,
				verifyPhoneNumber,
				verifyCode,
				setPassword,
				completeOwnerProfile,
				completeBusinessProfile,
				login,
				logout,
				checkLoginStatus,
				sendPushNotification,
				sendResetOtp,
				verifyResetOtp,
				resetPassword,
				updateUserInfo,
				updatePassword,
				getRedirectPath,
				registerDeviceTokenForStore:
					saveDeviceTokenForStore,
				removeDeviceTokenForStore,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export { AuthContext, AuthProvider };
