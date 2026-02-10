import React, {
	useEffect,
	useState,
	useCallback,
	useContext,
} from 'react';
import {
	View,
	Text,
	StyleSheet,
	ActivityIndicator,
	FlatList,
	TouchableOpacity,
	Modal,
	TextInput,
	Alert,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import axiosInstance from '../../utils/axiosInstance';
import { AuthContext } from '@/context/AuthContext';


const CURRENCY_SYMBOL = '₦';

// Helper function to handle API errors uniformly
const handleApiError = (err, defaultMessage) => {
	console.warn(err);
	Alert.alert('Error', err.message || defaultMessage);
};

const DeliverySettingsScreen = () => {
	const { selectedStore } = useContext(AuthContext);
	const router = useRouter();
	const storeId = selectedStore?._id;

	console.log(selectedStore, 'selectedStore')

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [deliverySettings, setDeliverySettings] = useState({
		enabled: false,
		allowPickup: true,
		allowStoreDelivery: false,
		zones: [],
		personnel: [],
		defaultZoneKey: null,
	});
	const [error, setError] = useState(null);

	// Zone modal state
	const [zoneModalVisible, setZoneModalVisible] =
		useState(false);
	const [editingZone, setEditingZone] = useState(null); // null for new zone
	const [zoneKey, setZoneKey] = useState('');
	const [zoneName, setZoneName] = useState('');
	const [zonePrice, setZonePrice] = useState('0');

	// Personnel modal state
	const [personModalVisible, setPersonModalVisible] =
		useState(false);
	const [editingPerson, setEditingPerson] = useState(null);
	const [personName, setPersonName] = useState('');
	const [personPhone, setPersonPhone] = useState('');
	const [personWhatsapp, setPersonWhatsapp] = useState('');

	// Fetch settings
	const fetchSettings = useCallback(async () => {
		if (!storeId) return;
		setLoading(true);
		setError(null);
		try {
			const response = await axiosInstance.get(
				`delivery/stores/${storeId}`,
			);
			if (response.status !== 200) {
				throw new Error(
					response.data.message ||
					'Failed to load delivery settings',
				);
			}
			setDeliverySettings((prev) => ({
				...prev,
				...(response.data.deliverySettings || {}),
			}));
		} catch (err) {
			setError(err.message || 'Error loading settings');
			handleApiError(
				err,
				'Failed to fetch delivery settings',
			);
		} finally {
			setLoading(false);
		}
	}, [storeId]);

	useEffect(() => {
		fetchSettings();
	}, [fetchSettings]);

	// Helpers for zone modals
	const openAddZone = () => {
		setEditingZone(null);
		setZoneKey('');
		setZoneName('');
		setZonePrice('0');
		setZoneModalVisible(true);
	};

	const openEditZone = (zone) => {
		setEditingZone(zone);
		setZoneKey(zone.key);
		setZoneName(zone.name);
		setZonePrice(String(zone.price));
		setZoneModalVisible(true);
	};

	// Helpers for personnel modals
	const openAddPerson = () => {
		setEditingPerson(null);
		setPersonName('');
		setPersonPhone('');
		setPersonWhatsapp('');
		setPersonModalVisible(true);
	};

	const openEditPerson = (person) => {
		setEditingPerson(person);
		setPersonName(person.name || '');
		setPersonPhone(person.phone || '');
		setPersonWhatsapp(person.whatsapp || '');
		setPersonModalVisible(true);
	};

	// Save base settings
	const saveBaseSettings = async (patch = {}) => {
		setSaving(true);
		try {
			const updatedSettings = {
				...deliverySettings,
				...patch,
				branchId: selectedStore?._id,
			};
			const response = await axiosInstance.put(
				`delivery/stores/${selectedStore?.parent}`,
				updatedSettings,
			);
			if (response.status !== 200) {
				throw new Error(
					response.data.message ||
					'Failed to save settings',
				);
			}
			setDeliverySettings((prev) => ({
				...prev,
				...(response.data.deliverySettings || {}),
			}));
			Alert.alert(
				'Success',
				'Delivery settings updated successfully',
			);
		} catch (err) {
			handleApiError(
				err,
				'Failed to save delivery settings',
			);
		} finally {
			setSaving(false);
		}
	};

	// Submit zone (create or update)
	const submitZone = async () => {
		if (!zoneName) {
			Alert.alert(
				'Validation Error',
				'Please provide a unique key and name for the zone.',
			);
			return;
		}
		const priceNum = Number(zonePrice);
		if (isNaN(priceNum) || priceNum < 0) {
			Alert.alert(
				'Validation Error',
				'Please enter a valid non-negative price.',
			);
			return;
		}

		const zoneData = {
			name: zoneName,
			price: priceNum,
			active: true,
			branchId: selectedStore?._id,
		};
		try {
			let response;
			if (editingZone) {
				response = await axiosInstance.put(
					`delivery/stores/${selectedStore?.parent}/zones/${encodeURIComponent(
						editingZone.key,
					)}`,
					zoneData,
				);
				// console.log(response)
				if (response.status !== 200 && response.status !== 201) {
					throw new Error('Failed to update zone');
				}
				setDeliverySettings((prev) => ({
					...prev,
					zones: prev.zones.map((z) =>
						z.key === editingZone.key
							? { ...z, ...zoneData }
							: z,
					),
				}));
				Alert.alert('Success', 'Zone updated successfully');
			} else {
				zoneData.key = zoneKey;
				response = await axiosInstance.post(
					`delivery/stores/${selectedStore?.parent}/zones`,
					zoneData,
				);
				if (response.status !== 200 && response.status !== 201) {
					throw new Error(
						response.data.message ||
						'Failed to create zone',
					);
				}
				const newZone = response.data.zone;
				setDeliverySettings((prev) => ({
					...prev,
					zones: [...(prev.zones || []), newZone],
				}));
				Alert.alert('Success', 'Zone added successfully');
			}
		} catch (err) {
			handleApiError(err, 'Failed to save zone');
		} finally {
			setZoneModalVisible(false);
		}
	};

	// Remove zone
	const removeZone = (zone) => {
		Alert.alert(
			'Confirm Deletion',
			`Are you sure you want to delete the zone "${zone.name}"? This action cannot be undone.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							const response = await axiosInstance.delete(
								`delivery/stores/${storeId}/zones/${encodeURIComponent(
									zone.key,
								)}`,
							);
							if (response.status !== 200 && response.status !== 204) {
								throw new Error('Failed to delete zone');
							}
							setDeliverySettings((prev) => ({
								...prev,
								zones: prev.zones.filter(
									(z) => z.key !== zone.key,
								),
							}));
							Alert.alert(
								'Success',
								'Zone removed successfully',
							);
						} catch (err) {
							handleApiError(err, 'Failed to delete zone');
						}
					},
				},
			],
		);
	};

	// Submit personnel (create or update)
	const submitPerson = async () => {
		if (!personName || !personWhatsapp) {
			Alert.alert(
				'Validation Error',
				'Please provide a name and phone number for the delivery personnel.',
			);
			return;
		}

		const personData = {
			name: personName,
			phone: personPhone,
			whatsapp: personWhatsapp,
		};
		try {
			let response;
			if (editingPerson) {
				response = await axiosInstance.put(
					`delivery/stores/${storeId}/personnel/${editingPerson._id}`,
					personData,
				);
				if (response.status !== 200 && response.status !== 201) {
					throw new Error('Failed to update personnel');
				}
				setDeliverySettings((prev) => ({
					...prev,
					personnel: prev.personnel.map((p) =>
						String(p._id) === String(editingPerson._id)
							? { ...p, ...personData }
							: p,
					),
				}));
				Alert.alert(
					'Success',
					'Personnel updated successfully',
				);
			} else {
				response = await axiosInstance.post(
					`delivery/stores/${storeId}/personnel`,
					personData,
				);
				if (response.status !== 200 && response.status !== 201) {
					throw new Error(
						response.data.message ||
						'Failed to create personnel',
					);
				}
				const newPerson = response.data.person;
				setDeliverySettings((prev) => ({
					...prev,
					personnel: [...(prev.personnel || []), newPerson],
				}));
				Alert.alert(
					'Success',
					'Personnel added successfully',
				);
			}
		} catch (err) {
			handleApiError(err, 'Failed to save personnel');
		} finally {
			setPersonModalVisible(false);
		}
	};

	// Remove personnel
	const removePerson = (person) => {
		Alert.alert(
			'Confirm Deletion',
			`Are you sure you want to remove "${person.name}" from delivery personnel?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							const response = await axiosInstance.delete(
								`delivery/stores/${storeId}/personnel/${person._id}`,
							);
							if (response.status !== 200 && response.status !== 204) {
								throw new Error(
									'Failed to delete personnel',
								);
							}
							setDeliverySettings((prev) => ({
								...prev,
								personnel: prev.personnel.filter(
									(p) =>
										String(p._id) !== String(person._id),
								),
							}));
							Alert.alert(
								'Success',
								'Personnel removed successfully',
							);
						} catch (err) {
							handleApiError(
								err,
								'Failed to delete personnel',
							);
						}
					},
				},
			],
		);
	};

	// Render zone item
	const renderZone = ({ item }) => (
		<View style={styles.itemRow}>
			<View style={styles.itemIconBox}>
				<Ionicons name="map-outline" size={20} color="#6B7280" />
			</View>
			<View style={{ flex: 1 }}>
				<Text style={styles.itemTitle}>{item.name}</Text>
				<Text style={styles.itemSubtitle}>
					{item.key} • {CURRENCY_SYMBOL}
					{Number(item.price).toLocaleString()}
				</Text>
			</View>
			<View style={styles.rowActions}>
				<TouchableOpacity
					style={styles.iconButton}
					onPress={() => openEditZone(item)}
				>
					<Ionicons
						name="pencil"
						size={18}
						color="#374151"
					/>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.iconButton}
					onPress={() => removeZone(item)}
				>
					<Ionicons
						name="trash-outline"
						size={18}
						color="#EF4444"
					/>
				</TouchableOpacity>
			</View>
		</View>
	);

	// Render personnel item
	const renderPerson = ({ item }) => (
		<View style={styles.itemRow}>
			<View style={styles.itemIconBox}>
				<Ionicons name="person-outline" size={20} color="#6B7280" />
			</View>
			<View style={{ flex: 1 }}>
				<Text style={styles.itemTitle}>{item.name}</Text>
				<Text style={styles.itemSubtitle}>
					{item.phone}
					{item.whatsapp ? ` • WA: ${item.whatsapp}` : ''}
				</Text>
			</View>
			<View style={styles.rowActions}>
				<TouchableOpacity
					style={styles.iconButton}
					onPress={() => openEditPerson(item)}
				>
					<Ionicons
						name="pencil"
						size={18}
						color="#374151"
					/>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.iconButton}
					onPress={() => removePerson(item)}
				>
					<Ionicons
						name="trash-outline"
						size={18}
						color="#EF4444"
					/>
				</TouchableOpacity>
			</View>
		</View>
	);

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#18a54a" />
				<Text style={{ marginTop: 12, color: '#6B7280' }}>
					Loading delivery settings...
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centered}>
				<Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
				<Text
					style={{ color: '#EF4444', marginTop: 12, marginBottom: 20, textAlign: 'center' }}
				>
					{error}
				</Text>
				<TouchableOpacity onPress={fetchSettings} style={[styles.modalPrimary, { flex: 0, paddingHorizontal: 32 }]}>
					<Text
						style={styles.modalPrimaryText}
					>
						Retry
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={{ flex: 1, backgroundColor: '#F9FAFB' }}
			behavior={
				Platform.OS === 'ios' ? 'padding' : undefined
			}
		>
			<StatusBar style="dark" />
			<View style={styles.container}>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerRow}>
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ padding: 8, marginLeft: -8 }}
						>
							<Ionicons name="arrow-back" size={24} color="#1F2937" />
						</TouchableOpacity>
						<Text style={styles.title}>
							Delivery Settings
						</Text>
						<TouchableOpacity disabled style={{ opacity: 0 }}>
							<Ionicons name="arrow-back" size={24} color="transparent" />
						</TouchableOpacity>
					</View>
					<View style={{ paddingHorizontal: 4 }}>
						<Text style={styles.subtitle}>
							Manage delivery options, zones, and personnel.
						</Text>
					</View>
				</View>

				<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
					<View style={styles.card}>
						<View style={styles.cardHeader}>
							<Text style={styles.sectionTitle}>
								General Preferences
							</Text>
						</View>

						<View style={styles.toggleRow}>
							<Text style={styles.label}>
								Enable Delivery
							</Text>
							<Switch
								trackColor={{
									false: '#E5E7EB',
									true: '#10B981',
								}}
								thumbColor={'#fff'}
								ios_backgroundColor="#E5E7EB"
								onValueChange={() =>
									saveBaseSettings({
										enabled: !deliverySettings.enabled,
									})
								}
								value={deliverySettings.enabled}
								disabled={saving}
							/>
						</View>

						<View style={styles.toggleRow}>
							<Text style={styles.label}>Allow Pickup</Text>
							<Switch
								trackColor={{
									false: '#E5E7EB',
									true: '#10B981',
								}}
								thumbColor={'#fff'}
								ios_backgroundColor="#E5E7EB"
								onValueChange={() =>
									saveBaseSettings({
										allowPickup:
											!deliverySettings.allowPickup,
									})
								}
								value={deliverySettings.allowPickup}
								disabled={saving}
							/>
						</View>

						<View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
							<Text style={styles.label}>
								Allow Store Delivery
							</Text>
							<Switch
								trackColor={{
									false: '#E5E7EB',
									true: '#10B981',
								}}
								thumbColor={'#fff'}
								ios_backgroundColor="#E5E7EB"
								onValueChange={() =>
									saveBaseSettings({
										allowStoreDelivery:
											!deliverySettings.allowStoreDelivery,
									})
								}
								value={deliverySettings.allowStoreDelivery}
								disabled={saving}
							/>
						</View>

						<View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
							<Text style={[styles.label, { marginBottom: 8 }]}>
								Default Delivery Zone
							</Text>
							<Text style={styles.hint}>
								Applied when customer doesn't select a zone.
							</Text>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								style={{ marginTop: 4 }}
							>
								{(deliverySettings.zones || []).length > 0 ? (
									(deliverySettings.zones || []).map(
										(zone) => (
											<TouchableOpacity
												key={zone.key}
												onPress={() =>
													saveBaseSettings({
														defaultZoneKey: zone.key,
													})
												}
												style={[
													styles.zoneChip,
													deliverySettings.defaultZoneKey ===
													zone.key && styles.zoneChipActive,
												]}
											>
												<Text
													style={[
														styles.zoneChipText,
														deliverySettings.defaultZoneKey ===
														zone.key && { color: '#047857' },
													]}
												>
													{zone.name}
												</Text>
											</TouchableOpacity>
										),
									)
								) : (
									<Text style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>No zones available</Text>
								)}
							</ScrollView>
						</View>
					</View>

					{/* Delivery Zones Section */}
					<View style={styles.card}>
						<View style={styles.cardHeader}>
							<Text style={styles.sectionTitle}>
								Delivery Zones
							</Text>
							<TouchableOpacity
								style={styles.addButton}
								onPress={openAddZone}
							>
								<Ionicons name="add" size={16} color="#059669" />
								<Text style={styles.addButtonText}>
									Add Zone
								</Text>
							</TouchableOpacity>
						</View>

						{deliverySettings.zones.length === 0 ? (
							<View style={styles.emptyRow}>
								<Ionicons name="map-outline" size={40} color="#E5E7EB" />
								<Text style={styles.emptyText}>
									No delivery zones configured yet. Add zones
									to define fees.
								</Text>
							</View>
						) : (
							<View>
								{deliverySettings.zones.map((item) => (
									<View key={item.key}>
										{renderZone({ item })}
									</View>
								))}
							</View>
						)}
					</View>

					{/* Delivery Personnel Section */}
					<View style={styles.card}>
						<View style={styles.cardHeader}>
							<Text style={styles.sectionTitle}>
								Delivery Personnel
							</Text>
							<TouchableOpacity
								style={styles.addButton}
								onPress={openAddPerson}
							>
								<Ionicons name="add" size={16} color="#059669" />
								<Text style={styles.addButtonText}>
									Add Personnel
								</Text>
							</TouchableOpacity>
						</View>

						{deliverySettings.personnel.length === 0 ? (
							<View style={styles.emptyRow}>
								<Ionicons name="people-outline" size={40} color="#E5E7EB" />
								<Text style={styles.emptyText}>
									No personnel added.
								</Text>
							</View>
						) : (
							<View>
								{deliverySettings.personnel.map((item) => (
									<View key={item._id}>
										{renderPerson({ item })}
									</View>
								))}
							</View>
						)}
					</View>
				</ScrollView>

				{/* Zone Modal */}
				<Modal
					visible={zoneModalVisible}
					animationType="fade"
					transparent
					onRequestClose={() => setZoneModalVisible(false)}
				>
					<View style={styles.modalOverlay}>
						<View style={styles.modalPanel}>
							<Text style={styles.modalTitle}>
								{editingZone
									? 'Edit Delivery Zone'
									: 'New Delivery Zone'}
							</Text>
							<ScrollView showsVerticalScrollIndicator={false}>
								<Text style={styles.inputLabel}>
									Zone Name
								</Text>
								<TextInput
									value={zoneName}
									onChangeText={setZoneName}
									style={styles.input}
									placeholder="e.g., Within Campus"
									placeholderTextColor="#9CA3AF"
								/>
								<Text style={styles.inputLabel}>
									Delivery Price (NGN)
								</Text>
								<TextInput
									value={zonePrice}
									onChangeText={setZonePrice}
									keyboardType="numeric"
									style={styles.input}
									placeholder="e.g., 500"
									placeholderTextColor="#9CA3AF"
								/>

								<View style={styles.modalActions}>
									<TouchableOpacity
										style={styles.modalBtn}
										onPress={() =>
											setZoneModalVisible(false)
										}
									>
										<Text style={styles.modalBtnText}>
											Cancel
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.modalPrimary}
										onPress={submitZone}
									>
										<Text style={styles.modalPrimaryText}>
											{editingZone
												? 'Save Changes'
												: 'Create Zone'}
										</Text>
									</TouchableOpacity>
								</View>
							</ScrollView>
						</View>
					</View>
				</Modal>

				{/* Personnel Modal */}
				<Modal
					visible={personModalVisible}
					animationType="fade"
					transparent
					onRequestClose={() => setPersonModalVisible(false)}
				>
					<View style={styles.modalOverlay}>
						<View style={styles.modalPanel}>
							<Text style={styles.modalTitle}>
								{editingPerson
									? 'Edit Personnel'
									: 'New Personnel'}
							</Text>
							<ScrollView showsVerticalScrollIndicator={false}>
								<Text style={styles.inputLabel}>
									Full Name
								</Text>
								<TextInput
									value={personName}
									onChangeText={setPersonName}
									style={styles.input}
									placeholder="e.g., John Doe"
									placeholderTextColor="#9CA3AF"
								/>
								<Text style={styles.inputLabel}>
									WhatsApp Number
								</Text>
								<TextInput
									value={personWhatsapp}
									onChangeText={setPersonWhatsapp}
									style={styles.input}
									placeholder="e.g., 080..."
									keyboardType="phone-pad"
									placeholderTextColor="#9CA3AF"
								/>

								<View style={styles.modalActions}>
									<TouchableOpacity
										style={styles.modalBtn}
										onPress={() =>
											setPersonModalVisible(false)
										}
									>
										<Text style={styles.modalBtnText}>
											Cancel
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.modalPrimary}
										onPress={submitPerson}
									>
										<Text style={styles.modalPrimaryText}>
											{editingPerson
												? 'Save Changes'
												: 'Add Person'}
										</Text>
									</TouchableOpacity>
								</View>
							</ScrollView>
						</View>
					</View>
				</Modal>
			</View>
		</KeyboardAvoidingView>
	);
};



const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingBottom: 80,
		paddingTop: 30,
		backgroundColor: '#F9FAFB',
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F9FAFB',
	},
	header: {
		marginBottom: 20,
		backgroundColor: '#fff',
		marginHorizontal: -16,
		paddingHorizontal: 16,
		paddingTop: Platform.OS === 'android' ? 40 : 10,
		paddingBottom: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#111827',
	},
	closeButtonText: {
		color: '#6B7280',
		fontWeight: '600',
		fontSize: 14,
	},
	subtitle: {
		marginTop: 4,
		color: '#6B7280',
		fontSize: 13,
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111827',
	},
	toggleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F9FAFB',
	},
	label: {
		fontSize: 15,
		color: '#374151',
		fontWeight: '500',
	},
	hint: {
		color: '#6B7280',
		fontSize: 13,
		marginBottom: 8,
	},
	zoneChip: {
		backgroundColor: '#F3F4F6',
		paddingHorizontal: 14,
		paddingVertical: 10,
		marginRight: 10,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	zoneChipActive: {
		backgroundColor: '#ECFDF5',
		borderColor: '#10B981',
	},
	zoneChipText: {
		color: '#374151',
		fontWeight: '500',
		fontSize: 13,
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
		paddingHorizontal: 8,
		backgroundColor: '#ECFDF5',
		borderRadius: 8,
	},
	addButtonText: {
		marginLeft: 4,
		color: '#059669',
		fontWeight: '600',
		fontSize: 12,
	},
	emptyRow: {
		paddingVertical: 32,
		alignItems: 'center',
	},
	emptyText: {
		color: '#9CA3AF',
		textAlign: 'center',
		fontSize: 14,
		marginTop: 8,
		maxWidth: 240,
	},
	itemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 8,
		backgroundColor: '#F9FAFB',
		marginBottom: 8,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#F3F4F6',
	},
	itemIconBox: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	itemTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1F2937',
	},
	itemSubtitle: {
		marginTop: 2,
		color: '#6B7280',
		fontSize: 13,
	},
	rowActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	iconButton: {
		padding: 8,
		marginLeft: 8,
		borderRadius: 8,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	itemSeparator: {
		// height: 1,
		// backgroundColor: '#eee',
		// marginVertical: 8,
		// (Removed separator logic in favor of spaced cards)
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'flex-end', // Bottom sheet style
	},
	modalPanel: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
		maxHeight: '90%',
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 24,
		color: '#111827',
		textAlign: 'center',
	},
	inputLabel: {
		fontSize: 14,
		color: '#374151',
		marginTop: 0,
		marginBottom: 6,
		fontWeight: '500',
	},
	input: {
		borderWidth: 1,
		borderColor: '#D1D5DB',
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 10,
		backgroundColor: '#FFFFFF',
		fontSize: 15,
		color: '#1F2937',
		marginBottom: 16,
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 24,
		paddingBottom: 20, // Safe area
	},
	modalBtn: {
		paddingVertical: 14,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F3F4F6',
		borderRadius: 10,
		marginRight: 12,
	},
	modalBtnText: {
		color: '#374151',
		fontWeight: '600',
		fontSize: 15,
	},
	modalPrimary: {
		backgroundColor: '#18a54a',
		paddingVertical: 14,
		flex: 2,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10,
	},
	modalPrimaryText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 15,
	},
});

export default DeliverySettingsScreen;
