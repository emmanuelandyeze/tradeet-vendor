// screens/BusinessHoursScreen.js
import React, {
	useContext,
	useEffect,
	useState,
	useCallback,
} from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	FlatList,
	Switch,
	Platform,
	Alert,
	SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import axiosInstance from '@/utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '@/context/AuthContext';
import { Picker } from '@react-native-picker/picker';

const days = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
];

// Helper: convert minutes-from-midnight to Date object (same day)
function minutesToDate(minutes) {
	// clamp
	const m = Number.isFinite(minutes)
		? Math.max(0, Math.min(1440, minutes))
		: 9 * 60;
	const hours = Math.floor(m / 60);
	const mins = m % 60;
	// Use an arbitrary day for Date object (year 2024 to match prior code)
	return new Date(2024, 0, 1, hours, mins, 0);
}

// Helper: convert Date -> minutes-from-midnight
function dateToMinutes(d) {
	if (!(d instanceof Date)) return 9 * 60;
	return d.getHours() * 60 + d.getMinutes();
}

const BusinessHoursScreen = () => {
	const {
		userInfo,
		selectedStore: contextSelectedStore,
		checkLoginStatus,
	} = useContext(AuthContext);

	// store selection (supports multiple stores)
	const storesList = Array.isArray(userInfo?.stores)
		? userInfo.stores
		: [];
	const [selectedStoreId, setSelectedStoreId] = useState(
		contextSelectedStore?._id || storesList[0]?._id || null,
	);

	const [store, setStore] = useState(null);
	const [loading, setLoading] = useState(false);

	// hours state: each day: { day, open: boolean, openTime: Date, closeTime: Date }
	const [hours, setHours] = useState(
		days.map((day) => ({
			day,
			open: false,
			openTime: minutesToDate(9 * 60),
			closeTime: minutesToDate(18 * 60),
		})),
	);

	// time picker state
	const [showPicker, setShowPicker] = useState({
		index: null,
		type: null,
	});

	console.log(contextSelectedStore, 'contextSelectedStore')

	// fetch store detail from backend
	const fetchStore = useCallback(
		async (storeId) => {
			if (!storeId) {
				setStore(null);
				return;
			}
			setLoading(true);
			try {
				const resp = await axiosInstance.get(
					`/stores?id=${storeId}`,
				);
				const s = resp.data?.store ?? resp.data;
				setStore(s);

				// convert store.openingHours (minutes + closed flag) into UI hours
				const openingHours = s?.branch?.openingHours ?? {};
				const updated = days.map((day) => {
					const dayData = openingHours?.[day];
					// Interpret closed: treat null or { closed: true } or missing as closed
					const closedFlag =
						!dayData ||
						(typeof dayData === 'object' &&
							dayData.closed === true);
					if (closedFlag) {
						return {
							day,
							open: false,
							openTime: minutesToDate(9 * 60),
							closeTime: minutesToDate(18 * 60),
						};
					} else {
						// dayData should have open and close (in minutes)
						const openMin =
							typeof dayData.open === 'number'
								? Number(dayData.open)
								: 9 * 60;
						const closeMin =
							typeof dayData.close === 'number'
								? Number(dayData.close)
								: 18 * 60;
						return {
							day,
							open: true,
							openTime: minutesToDate(openMin),
							closeTime: minutesToDate(closeMin),
						};
					}
				});
				setHours(updated);
			} catch (err) {
				console.error(
					'Failed to fetch store:',
					err?.response?.data || err,
				);
				Alert.alert(
					'Error',
					'Could not load store opening hours.',
				);
			} finally {
				setLoading(false);
			}
		},
		[setStore],
	);

	useEffect(() => {
		// initial selection from context
		if (contextSelectedStore && contextSelectedStore._id) {
			setSelectedStoreId(contextSelectedStore._id);
		} else if (storesList.length > 0 && !selectedStoreId) {
			setSelectedStoreId(storesList[0]._id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [contextSelectedStore, storesList]);

	// fetch whenever selectedStoreId changes
	useEffect(() => {
		if (selectedStoreId) fetchStore(selectedStoreId);
	}, [selectedStoreId, fetchStore]);

	// toggle open/closed
	const toggleOpen = (index) => {
		setHours((prev) => {
			const next = [...prev];
			next[index] = {
				...next[index],
				open: !next[index].open,
			};
			return next;
		});
	};

	// update time from picker
	const updateTime = (event, selectedTime, index, type) => {
		// On Android, cancel selectedTime may be undefined; treat as no-op
		if (selectedTime) {
			setHours((prev) => {
				const next = [...prev];
				next[index] = {
					...next[index],
					[type]: selectedTime,
				};
				return next;
			});
		}
		setShowPicker({ index: null, type: null });
	};

	// Save: build openingHours object per backend schema (minutes + closed flag)
	const saveOpeningHours = async () => {
		if (!store || !store._id) {
			Alert.alert('Error', 'No store selected');
			return;
		}

		// Build object
		const openingHours = {};
		for (const item of hours) {
			if (!item.open) {
				// explicitly mark closed
				openingHours[item.day] = { closed: true };
			} else {
				const openMin = dateToMinutes(item.openTime);
				const closeMin = dateToMinutes(item.closeTime);

				// Basic validation: close must be after open
				if (closeMin <= openMin) {
					Alert.alert(
						'Validation',
						`${item.day}: closing time must be after opening time`,
					);
					return;
				}

				openingHours[item.day] = {
					open: openMin,
					close: closeMin,
					closed: false,
				};
			}
		}

		try {
			const token = await AsyncStorage.getItem('userToken');
			// Use PUT /stores/:id to update openingHours
			await axiosInstance.put(
				`/stores/branches/${contextSelectedStore._id}`,
				{ openingHours }
			);

			// Refresh local store/context
			await fetchStore(contextSelectedStore._id);
			if (typeof checkLoginStatus === 'function') {
				// refresh global user info if needed
				await checkLoginStatus();
			}

			Alert.alert(
				'Success',
				'Business hours updated successfully!',
			);
		} catch (err) {
			console.error(
				'Error updating opening hours:',
				err?.response?.data || err,
			);
			Alert.alert(
				'Error',
				err?.response?.data?.message ||
					'Failed to update business hours. Try again.',
			);
		}
	};

	const renderRow = ({ item, index }) => (
		<View style={styles.row}>
			<Text style={styles.day}>{item.day}</Text>

			<Switch
				value={item.open}
				onValueChange={() => toggleOpen(index)}
			/>

			{item.open && (
				<View style={styles.timeContainer}>
					<TouchableOpacity
						onPress={() =>
							setShowPicker({
								index,
								type: 'openTime',
							})
						}
					>
						<Text style={styles.timeText}>
							{item.openTime.toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</Text>
					</TouchableOpacity>

					<Text> - </Text>

					<TouchableOpacity
						onPress={() =>
							setShowPicker({
								index,
								type: 'closeTime',
							})
						}
					>
						<Text style={styles.timeText}>
							{item.closeTime.toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" backgroundColor="#f1f1f1" />
			<View style={styles.header}>
				<View style={styles.headerRow}>
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons
							name="arrow-back-sharp"
							size={22}
							color="black"
						/>
					</TouchableOpacity>
					<Text style={styles.headerText}>
						Business Hours
					</Text>
				</View>
				{/* show selected store name */}
				<View style={styles.storeInfoRow}>
					<Text style={styles.storeLabel}>
						Selected store:
					</Text>
					<View style={{flexDirection: 'row', alignItems: 'center', gap: 3}}>
						<Text style={styles.storeName}>
							{store?.name ?? store?.storeLink ?? '—'}
						</Text>
						<Text>--</Text>
						<Text style={styles.storeName}>
							{contextSelectedStore?.name ?? store?.storeLink ?? '—'}
						</Text>
					</View>
				</View>

				{/* if user has multiple stores allow switching */}
				{storesList.length > 1 && (
					<View style={styles.storePickerWrapper}>
						<Picker
							selectedValue={selectedStoreId}
							onValueChange={(val) =>
								setSelectedStoreId(val)
							}
							style={styles.storePicker}
						>
							{storesList.map((s) => (
								<Picker.Item
									key={s._id}
									label={s.name || s.storeLink || s._id}
									value={s._id}
								/>
							))}
						</Picker>
					</View>
				)}
			</View>

			<View
				style={{ paddingHorizontal: 16, paddingTop: 8 }}
			>
				<FlatList
					data={hours}
					keyExtractor={(it) => it.day}
					renderItem={renderRow}
				/>
			</View>

			<View style={styles.buttonContainer}>
				<TouchableOpacity
					style={styles.saveBtn}
					onPress={saveOpeningHours}
				>
					<Text style={styles.saveBtnText}>Save</Text>
				</TouchableOpacity>
			</View>

			{showPicker.index !== null && (
				<DateTimePicker
					value={
						hours[showPicker.index][showPicker.type] ??
						minutesToDate(9 * 60)
					}
					mode="time"
					display={
						Platform.OS === 'ios' ? 'spinner' : 'default'
					}
					onChange={(event, selectedTime) =>
						updateTime(
							event,
							selectedTime,
							showPicker.index,
							showPicker.type,
						)
					}
				/>
			)}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		paddingTop: 40,
		elevation: 3,
		backgroundColor: '#f1f1f1',
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	headerText: {
		fontSize: 22,
		marginLeft: 10,
		fontWeight: '700',
	},
	storeInfoRow: {
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'center',
	},
	storeLabel: {
		color: '#6b7280',
		marginRight: 8,
	},
	storeName: {
		fontWeight: '600',
		color: '#111827',
	},
	storePickerWrapper: {
		marginTop: 8,
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#eee',
		overflow: 'hidden',
	},
	storePicker: {
		height: 40,
		width: '100%',
	},

	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14,
		paddingHorizontal: 8,
		borderBottomWidth: 1,
		borderColor: '#eee',
	},
	day: {
		fontSize: 16,
		fontWeight: '700',
		flex: 1,
		color: '#0f172a',
	},
	timeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	timeText: {
		fontSize: 15,
		color: '#1C99FF',
		textDecorationLine: 'underline',
	},
	buttonContainer: {
		margin: 16,
		alignItems: 'flex-end',
	},
	saveBtn: {
		backgroundColor: '#4CAF50',
		paddingHorizontal: 18,
		borderRadius: 8,
		paddingVertical: 12,
	},
	saveBtnText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},
});

export default BusinessHoursScreen;
