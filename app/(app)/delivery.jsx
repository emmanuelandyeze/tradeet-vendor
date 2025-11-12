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
				if (response.status !== 200) {
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
				if (response.status !== 200) {
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
							if (response.status !== 200) {
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
				if (response.status !== 200) {
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
				if (response.status !== 200) {
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
							if (response.status !== 200) {
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
						name="create-outline"
						size={20}
						color="#212121"
					/>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.iconButton}
					onPress={() => removeZone(item)}
				>
					<Ionicons
						name="trash-outline"
						size={20}
						color="#d32f2f"
					/>
				</TouchableOpacity>
			</View>
		</View>
	);

	// Render personnel item
	const renderPerson = ({ item }) => (
		<View style={styles.itemRow}>
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
						name="create-outline"
						size={20}
						color="#212121"
					/>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.iconButton}
					onPress={() => removePerson(item)}
				>
					<Ionicons
						name="trash-outline"
						size={20}
						color="#d32f2f"
					/>
				</TouchableOpacity>
			</View>
		</View>
	);

	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color="#18a54a" />
				<Text style={{ marginTop: 12 }}>
					Loading delivery settings...
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centered}>
				<Text
					style={{ color: '#d32f2f', marginBottom: 12 }}
				>
					{error}
				</Text>
				<TouchableOpacity onPress={fetchSettings}>
					<Text
						style={{ color: '#18a54a', fontWeight: '600' }}
					>
						Retry
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={
				Platform.OS === 'ios' ? 'padding' : undefined
			}
		>
			<StatusBar style="dark" />
			<ScrollView contentContainerStyle={styles.container}>
				<View style={styles.header}>
					<View style={styles.headerRow}>
						<Text style={styles.title}>
							Delivery Settings
						</Text>
						<TouchableOpacity
							onPress={() => router.back()}
							style={{ padding: 8 }}
						>
							<Text style={styles.closeButtonText}>
								Close
							</Text>
						</TouchableOpacity>
					</View>
					<Text style={styles.subtitle}>
						Manage delivery options, zones, and personnel
						for your store.
					</Text>
				</View>

				<View style={styles.card}>
					<Text style={styles.sectionTitle}>
						General Settings
					</Text>

					<View style={styles.toggleRow}>
						<Text style={styles.label}>
							Enable Delivery
						</Text>
						<Switch
							trackColor={{
								false: '#767577',
								true: '#18a54a',
							}}
							thumbColor={
								deliverySettings.enabled
									? '#f4f3f4'
									: '#f4f3f4'
							}
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
								false: '#767577',
								true: '#18a54a',
							}}
							thumbColor={
								deliverySettings.allowPickup
									? '#f4f3f4'
									: '#f4f3f4'
							}
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

					<View style={styles.toggleRow}>
						<Text style={styles.label}>
							Allow Store Delivery
						</Text>
						<Switch
							trackColor={{
								false: '#767577',
								true: '#18a54a',
							}}
							thumbColor={
								deliverySettings.allowStoreDelivery
									? '#f4f3f4'
									: '#f4f3f4'
							}
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

					<View style={{ marginTop: 12 }}>
						<Text style={styles.hint}>
							Default Delivery Zone (applied when no zone is
							selected by the customer)
						</Text>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={{ marginTop: 8 }}
						>
							{(deliverySettings.zones || []).map(
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
													zone.key && { color: '#fff' },
											]}
										>
											{zone.name} • {CURRENCY_SYMBOL}
											{Number(zone.price).toLocaleString()}
										</Text>
									</TouchableOpacity>
								),
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
							<MaterialIcons
								name="add-circle"
								size={20}
								color="#18a54a"
							/>
							<Text style={styles.addButtonText}>
								Add Zone
							</Text>
						</TouchableOpacity>
					</View>

					{deliverySettings.zones.length === 0 ? (
						<View style={styles.emptyRow}>
							<Text style={styles.emptyText}>
								No delivery zones configured yet. Add zones
								to define area-specific delivery fees.
							</Text>
						</View>
					) : (
						<FlatList
							data={deliverySettings.zones}
							keyExtractor={(item) => item.key}
							renderItem={renderZone}
							ItemSeparatorComponent={() => (
								<View style={styles.itemSeparator} />
							)}
						/>
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
							<MaterialIcons
								name="person-add"
								size={20}
								color="#18a54a"
							/>
							<Text style={styles.addButtonText}>
								Add Personnel
							</Text>
						</TouchableOpacity>
					</View>

					{deliverySettings.personnel.length === 0 ? (
						<View style={styles.emptyRow}>
							<Text style={styles.emptyText}>
								No delivery personnel added yet. Add
								personnel to assign them to delivery orders.
							</Text>
						</View>
					) : (
						<FlatList
							data={deliverySettings.personnel}
							keyExtractor={(item) => String(item._id)}
							renderItem={renderPerson}
							ItemSeparatorComponent={() => (
								<View style={styles.itemSeparator} />
							)}
						/>
					)}
				</View>

				<View style={{ height: 60 }} />

				{/* Zone Modal */}
				<Modal
					visible={zoneModalVisible}
					animationType="slide"
					transparent
				>
					<View style={styles.modalOverlay}>
						<View style={styles.modalPanel}>
							<Text style={styles.modalTitle}>
								{editingZone
									? 'Edit Delivery Zone'
									: 'Add New Delivery Zone'}
							</Text>
							<ScrollView>
								{/* <Text style={styles.inputLabel}>
									Unique Key
								</Text>
								<TextInput
									value={zoneKey}
									onChangeText={setZoneKey}
									style={styles.input}
									placeholder="e.g., within_campus"
									editable={!editingZone}
								/> */}
								<Text style={styles.inputLabel}>
									Zone Name
								</Text>
								<TextInput
									value={zoneName}
									onChangeText={setZoneName}
									style={styles.input}
									placeholder="e.g., Within Campus"
								/>
								<Text style={styles.inputLabel}>
									Delivery Price (NGN)
								</Text>
								<TextInput
									value={zonePrice}
									onChangeText={setZonePrice}
									keyboardType="numeric"
									style={styles.input}
									placeholder="400"
								/>

								<View style={styles.modalActions}>
									<TouchableOpacity
										style={[
											styles.modalBtn,
											{ marginRight: 8 },
										]}
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
					animationType="slide"
					transparent
				>
					<View style={styles.modalOverlay}>
						<View style={styles.modalPanel}>
							<Text style={styles.modalTitle}>
								{editingPerson
									? 'Edit Personnel'
									: 'Add New Personnel'}
							</Text>
							<ScrollView>
								<Text style={styles.inputLabel}>
									Full Name
								</Text>
								<TextInput
									value={personName}
									onChangeText={setPersonName}
									style={styles.input}
									placeholder="e.g., John Doe"
								/>
								{/* <Text style={styles.inputLabel}>
									Phone Number
								</Text>
								<TextInput
									value={personPhone}
									onChangeText={setPersonPhone}
									style={styles.input}
									placeholder="e.g., 0703..."
									keyboardType="phone-pad"
								/> */}
								<Text style={styles.inputLabel}>
									WhatsApp Number
								</Text>
								<TextInput
									value={personWhatsapp}
									onChangeText={setPersonWhatsapp}
									style={styles.input}
									placeholder="e.g., 0703..."
									keyboardType="phone-pad"
								/>

								<View style={styles.modalActions}>
									<TouchableOpacity
										style={[
											styles.modalBtn,
											{ marginRight: 8 },
										]}
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
												: 'Create Personnel'}
										</Text>
									</TouchableOpacity>
								</View>
							</ScrollView>
						</View>
					</View>
				</Modal>
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingBottom: 60,
		paddingTop: 40,
		backgroundColor: '#f6f7fb',
	},
	header: {
		marginBottom: 12,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#111827',
	},
	closeButtonText: {
		color: '#18a54a',
		fontWeight: '600',
	},
	subtitle: {
		marginTop: 6,
		color: '#6b7280',
		fontSize: 14,
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 14,
		marginTop: 12,
		shadowColor: '#000',
		shadowOpacity: 0.03,
		shadowRadius: 10,
		elevation: 2,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
	},
	toggleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 12,
	},
	label: {
		fontSize: 16,
		color: '#111827',
	},
	hint: {
		color: '#6b7280',
		fontSize: 14,
	},
	zoneChip: {
		backgroundColor: '#eef2ff',
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginRight: 8,
		borderRadius: 999,
	},
	zoneChipActive: {
		backgroundColor: '#18a54a',
	},
	zoneChipText: {
		color: '#111827',
		fontWeight: '600',
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	addButtonText: {
		marginLeft: 6,
		color: '#18a54a',
		fontWeight: '600',
	},
	emptyRow: {
		paddingVertical: 20,
		alignItems: 'center',
	},
	emptyText: {
		color: '#6b7280',
		textAlign: 'center',
	},
	itemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
	},
	itemTitle: {
		fontSize: 16,
		fontWeight: '600',
	},
	itemSubtitle: {
		marginTop: 4,
		color: '#6b7280',
	},
	rowActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	iconButton: {
		padding: 8,
		marginLeft: 6,
		borderRadius: 8,
		backgroundColor: '#fff',
	},
	itemSeparator: {
		height: 1,
		backgroundColor: '#eee',
		marginVertical: 8,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		padding: 20,
	},
	modalPanel: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		maxHeight: '85%',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 12,
	},
	inputLabel: {
		fontSize: 13,
		color: '#374151',
		marginTop: 8,
		marginBottom: 6,
	},
	input: {
		borderWidth: 1,
		borderColor: '#e5e7eb',
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 8,
		backgroundColor: '#fff',
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 12,
	},
	modalBtn: {
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	modalBtnText: {
		color: '#111827',
		fontWeight: '600',
	},
	modalPrimary: {
		backgroundColor: '#18a54a',
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 8,
	},
	modalPrimaryText: {
		color: '#fff',
		fontWeight: '700',
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
});

export default DeliverySettingsScreen;
