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
	ActivityIndicator,
	Alert,
	Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
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

	// Flatten stores and branches for the selector
	const [storesList, setStoresList] = useState([]);

	useEffect(() => {
		if (userInfo?.stores) {
			const flattened = [];
			userInfo.stores.forEach(store => {
				const mainName = store.name || store.storeLink || store._id || 'Unnamed Store';
				// Add the main store
				flattened.push({
					...store,
					displayName: mainName,
					isBranch: false, // Mark as main store
				});
				// Add branches if any
				if (store.branches?.length > 0) {
					store.branches.forEach(branch => {
						const branchName = branch.name || branch._id || 'Unnamed Branch';
						flattened.push({
							...branch,
							displayName: `${mainName} - ${branchName} (Branch)`,
							isBranch: true,
							parentId: store._id,
						});
					});
				}
			});
			setStoresList(flattened);
		}
	}, [userInfo]);

	const [selectedStoreId, setSelectedStoreId] = useState(null);

	// Initialize selectedStoreId
	useEffect(() => {
		if (!selectedStoreId && storesList.length > 0) {
			// Prefer context store if available
			if (contextSelectedStore?._id) {
				const found = storesList.find(s => s._id === contextSelectedStore._id);
				if (found) {
					setSelectedStoreId(found._id);
					return;
				}
			}
			// Fallback to first item
			setSelectedStoreId(storesList[0]._id);
		}
	}, [storesList, contextSelectedStore, selectedStoreId]);


	const [store, setStore] = useState(null);
	const [loading, setLoading] = useState(false);

	// hours state... (kept same)
	const [hours, setHours] = useState(
		days.map((day) => ({
			day,
			open: false,
			openTime: minutesToDate(9 * 60),
			closeTime: minutesToDate(18 * 60),
		})),
	);

	// time picker state... (kept same)
	const [showPicker, setShowPicker] = useState({
		index: null,
		type: null,
	});

	// fetch store detail from backend
	const fetchStore = useCallback(
		async (id) => {
			if (!id) {
				setStore(null);
				return;
			}
			setLoading(true);
			try {
				// We need to know if it's a branch or store to hit the right endpoint?
				// Actually, existing code used /stores?id=${id}. Let's stick to that if it works for generic fetching.
				// But we need to handle the response structure carefully.
				const resp = await axiosInstance.get(`/stores?id=${id}`);

				// The backend might return { store: ... } or just the object
				const s = resp.data?.store ?? resp.data;
				setStore(s);

				// Determine where openingHours are located
				// Could be s.openingHours or s.branch.openingHours or s.customOpeningHours?
				// The previous code checked `s?.branch?.openingHours`.
				// If we are fetching a MAIN store, it might be directly on `s.openingHours`?
				// Let's safe-check multiple locations.
				const openingHours = s?.openingHours ?? s?.branch?.openingHours ?? {};

				const updated = days.map((day) => {
					const dayData = openingHours?.[day];
					const closedFlag =
						!dayData ||
						(typeof dayData === 'object' && dayData.closed === true);

					if (closedFlag) {
						return {
							day,
							open: false,
							openTime: minutesToDate(9 * 60),
							closeTime: minutesToDate(18 * 60),
						};
					} else {
						const openMin = typeof dayData.open === 'number' ? Number(dayData.open) : 9 * 60;
						const closeMin = typeof dayData.close === 'number' ? Number(dayData.close) : 18 * 60;
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
				console.error('Failed to fetch store/branch:', err);
				Alert.alert('Error', 'Could not load opening hours.');
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	// fetch whenever selectedStoreId changes
	useEffect(() => {
		if (selectedStoreId) fetchStore(selectedStoreId);
	}, [selectedStoreId, fetchStore]);

	// toggle/updateTime functions... (kept same)
	const toggleOpen = (index) => {
		setHours((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], open: !next[index].open };
			return next;
		});
	};

	const updateTime = (event, selectedTime, index, type) => {
		if (selectedTime) {
			setHours((prev) => {
				const next = [...prev];
				next[index] = { ...next[index], [type]: selectedTime };
				return next;
			});
		}
		setShowPicker({ index: null, type: null });
	};

	const saveOpeningHours = async () => {
		if (!selectedStoreId) {
			Alert.alert('Error', 'No store selected');
			return;
		}

		// Build object
		const openingHours = {};
		for (const item of hours) {
			if (!item.open) {
				openingHours[item.day] = { closed: true };
			} else {
				const openMin = dateToMinutes(item.openTime);
				const closeMin = dateToMinutes(item.closeTime);
				if (closeMin <= openMin) {
					Alert.alert('Validation', `${item.day}: closing time must be after opening time`);
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
			// Find the selected item to check if it represents a branch
			const selectedItem = storesList.find(s => s._id === selectedStoreId);
			const isBranch = selectedItem?.isBranch;

			let endpoint;
			if (isBranch) {
				endpoint = `/stores/branches/${selectedStoreId}`;
			} else {
				endpoint = `/stores/${selectedStoreId}`;
			}

			// For branches, we might send { openingHours }.
			// For stores, it might be the same or inside data wrapper.
			// Assuming generic PUT update body.
			await axiosInstance.put(endpoint, { openingHours });

			Alert.alert('Success', 'Business hours updated successfully!');
			// optionally refresh
			fetchStore(selectedStoreId);
		} catch (err) {
			console.error('Error updating opening hours:', err);
			Alert.alert('Error', 'Failed to update business hours.');
		}
	};

	const renderRow = ({ item, index }) => (
		<View style={styles.dayRow}>
			<View style={styles.dayInfo}>
				<Text style={[styles.dayName, item.open && styles.dayNameActive]}>{item.day}</Text>
				<Switch
					value={item.open}
					onValueChange={() => toggleOpen(index)}
					trackColor={{ false: '#E5E7EB', true: '#10B981' }}
					thumbColor={'#fff'}
					style={{ transform: [{ scale: 0.8 }] }}
				/>
			</View>

			{item.open ? (
				<View style={styles.timeSlotsContainer}>
					<TouchableOpacity
						style={styles.timePill}
						activeOpacity={0.8}
						onPress={() =>
							setShowPicker({
								index,
								type: 'openTime',
							})
						}
					>
						<Feather name="sun" size={12} color="#2563EB" />
						<Text style={styles.timePillText}>
							{item.openTime.toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</Text>
					</TouchableOpacity>

					<Text style={styles.timeSeparator}>to</Text>

					<TouchableOpacity
						style={styles.timePill}
						activeOpacity={0.8}
						onPress={() =>
							setShowPicker({
								index,
								type: 'closeTime',
							})
						}
					>
						<Feather name="moon" size={12} color="#6B7280" />
						<Text style={styles.timePillText}>
							{item.closeTime.toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.closedContainer}>
					<Text style={styles.closedText}>Closed</Text>
				</View>
			)}
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" backgroundColor="#fff" />
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
					<Feather name="arrow-left" size={24} color="#1F2937" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Business Hours</Text>
				<View style={{ width: 40 }} />
			</View>

			<View style={styles.content}>
				{/* Store Selector */}
				{storesList.length > 0 && (
					<View style={styles.storeSelectorContainer}>
						<Text style={styles.inputLabel}>Select Store</Text>
						<View style={styles.pickerWrapper}>
							<Picker
								selectedValue={selectedStoreId}
								onValueChange={(val) => setSelectedStoreId(val)}
								style={styles.picker}
							>
								{storesList.map((s) => (
									<Picker.Item
										key={s._id}
										label={s.displayName}
										value={s._id}
										color="#000000"
									/>
								))}
							</Picker>
						</View>
					</View>
				)}

				<View style={styles.cardHeader}>
					<Text style={styles.cardTitle}>Operating Scedule</Text>
					<Text style={styles.cardSubtitle}>Set your weekly availability</Text>
				</View>

				<FlatList
					data={hours}
					keyExtractor={(it) => it.day}
					renderItem={renderRow}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
				/>
			</View>

			<View style={styles.footer}>
				<TouchableOpacity
					style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
					onPress={saveOpeningHours}
					disabled={loading}
					activeOpacity={0.9}
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.saveBtnText}>Save Schedule</Text>
					)}
				</TouchableOpacity>
			</View>

			{showPicker.index !== null && (
				<DateTimePicker
					value={
						hours[showPicker.index][showPicker.type] ??
						minutesToDate(9 * 60)
					}
					mode="time"
					display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
		backgroundColor: '#F9FAFB',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	backBtn: {
		padding: 4,
	},
	headerTitle: {
		fontSize: 17,
		fontWeight: '600',
		color: '#111827',
	},
	content: {
		flex: 1,
	},
	storeSelectorContainer: {
		padding: 16,
		paddingBottom: 0,
	},
	inputLabel: {
		fontSize: 13,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 6,
	},
	pickerWrapper: {
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 8,
		backgroundColor: '#fff',
		overflow: 'hidden',
		height: 48,
		justifyContent: 'center',
	},
	picker: {
		width: '100%',
		height: 48,
	},

	cardHeader: {
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 12,
	},
	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#111827',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	cardSubtitle: {
		fontSize: 13,
		color: '#6B7280',
		marginTop: 2,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 20,
	},
	dayRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14,
		paddingHorizontal: 16,
		backgroundColor: '#fff',
		marginBottom: 10,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#F3F4F6',
		// Shadow
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 2,
		elevation: 1,
	},
	dayInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	dayName: {
		fontSize: 15,
		fontWeight: '600',
		color: '#6B7280',
		width: 90,
	},
	dayNameActive: {
		color: '#111827',
	},
	timeSlotsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	timePill: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#EFF6FF',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		gap: 6,
	},
	timePillText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#2563EB',
	},
	timeSeparator: {
		fontSize: 12,
		color: '#9CA3AF',
	},
	closedContainer: {
		backgroundColor: '#F3F4F6',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
	},
	closedText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#9CA3AF',
	},

	footer: {
		padding: 16,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
	},
	saveBtn: {
		backgroundColor: '#10B981',
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: 'center',
	},
	saveBtnDisabled: {
		opacity: 0.7,
	},
	saveBtnText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});

export default BusinessHoursScreen;
