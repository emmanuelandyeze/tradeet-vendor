import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// --- Kwik Delivery API Configuration (MOCK FOR DEMO) ---
const KWIK_API_BASE_URL = 'https://api.kwik.delivery/v4/';
const KWIK_API_KEY = 'YOUR_KWIK_API_KEY';
const KWIK_SECRET_KEY = 'YOUR_KWIK_SECRET_KEY';
const Maps_API_KEY =
	'AIzaSyDB9u0LKWhMKSBImf97RJjD8KzNq8rfPMY'; // Ensure this is also configured in native projects


// --- Kwik Delivery Request SCREEN Component ---
const KwikDeliveryScreen = ({ onClose, onConfirm }) => {
	const [pickupAddress, setPickupAddress] = useState('');
	const [dropoffAddress, setDropoffAddress] = useState('');
	const [pickupCoords, setPickupCoords] = useState(null); // {latitude, longitude}
	const [dropoffCoords, setDropoffCoords] = useState(null); // {latitude, longitude}
	const [recipientName, setRecipientName] = useState('');
	const [recipientPhone, setRecipientPhone] = useState('');
	const [itemDescription, setItemDescription] =
		useState('');
	const [eta, setEta] = useState(''); // User's preferred ETA
	const [estimatedCost, setEstimatedCost] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const mapRef = useRef(null);

	const [mapRegion, setMapRegion] = useState({
		latitude: 6.5244, // Lagos default
		longitude: 3.3792, // Lagos default
		latitudeDelta: 0.1,
		longitudeDelta: 0.1,
	});

	const [activeAddressInput, setActiveAddressInput] =
		useState(null); // 'pickup' or 'dropoff'

	useEffect(() => {
		(async () => {
			let { status } =
				await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert(
					'Permission to access location was denied',
				);
				return;
			}

			let location = await Location.getCurrentPositionAsync(
				{},
			);
			setMapRegion((prev) => ({
				...prev,
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
			}));
		})();
	}, []);

	// Function to geocode address to coordinates
	const geocodeAddress = async (address) => {
		try {
			// Using Google Geocoding API directly
			const response = await fetch(
				`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
					address,
				)}&key=${Maps_API_KEY}`,
			);
			const data = await response.json();
			if (data.status === 'OK' && data.results.length > 0) {
				const location = data.results[0].geometry.location;
				return {
					latitude: location.lat,
					longitude: location.lng,
					fullAddress: data.results[0].formatted_address,
				};
			}
		} catch (err) {
			console.error('Geocoding error: ', err);
		}
		return null;
	};

	// Function to reverse geocode coordinates to address
	const reverseGeocodeCoords = async (coords) => {
		try {
			const response = await fetch(
				`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${Maps_API_KEY}`,
			);
			const data = await response.json();
			if (data.status === 'OK' && data.results.length > 0) {
				return data.results[0].formatted_address;
			}
		} catch (err) {
			console.error('Reverse geocoding error: ', err);
		}
		return `Lat: ${coords.latitude.toFixed(
			4,
		)}, Lon: ${coords.longitude.toFixed(4)}`;
	};

	const handleMapPress = async (event) => {
		const { coordinate } = event.nativeEvent;
		const address = await reverseGeocodeCoords(coordinate);

		if (activeAddressInput === 'pickup') {
			setPickupCoords(coordinate);
			setPickupAddress(address);
		} else if (activeAddressInput === 'dropoff') {
			setDropoffCoords(coordinate);
			setDropoffAddress(address);
		}
	};

	const handleAddressInputSubmit = async (type) => {
		setError('');
		let addressToGeocode =
			type === 'pickup' ? pickupAddress : dropoffAddress;
		if (addressToGeocode.trim() === '') {
			if (type === 'pickup') setPickupCoords(null);
			else setDropoffCoords(null);
			return;
		}
		setLoading(true);
		const geoResult = await geocodeAddress(
			addressToGeocode,
		);
		setLoading(false);

		if (geoResult) {
			if (type === 'pickup') {
				setPickupCoords({
					latitude: geoResult.latitude,
					longitude: geoResult.longitude,
				});
				setPickupAddress(geoResult.fullAddress);
			} else {
				setDropoffCoords({
					latitude: geoResult.latitude,
					longitude: geoResult.longitude,
				});
				setDropoffAddress(geoResult.fullAddress);
			}
			// Animate map to the new coordinate
			mapRef.current?.animateToRegion(
				{
					latitude: geoResult.latitude,
					longitude: geoResult.longitude,
					latitudeDelta: 0.05,
					longitudeDelta: 0.05,
				},
				500,
			);
		} else {
			setError(
				`Could not find location for ${addressToGeocode}`,
			);
			if (type === 'pickup') setPickupCoords(null);
			else setDropoffCoords(null);
		}
	};

	const calculateEstimatedCost = useCallback(() => {
		if (pickupCoords && dropoffCoords) {
			// Very rough distance calculation (Haversine formula approximation)
			const R = 6371; // Radius of Earth in kilometers
			const dLat =
				((dropoffCoords.latitude - pickupCoords.latitude) *
					Math.PI) /
				180;
			const dLon =
				((dropoffCoords.longitude -
					pickupCoords.longitude) *
					Math.PI) /
				180;
			const a =
				Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				Math.cos((pickupCoords.latitude * Math.PI) / 180) *
					Math.cos(
						(dropoffCoords.latitude * Math.PI) / 180,
					) *
					Math.sin(dLon / 2) *
					Math.sin(dLon / 2);
			const c =
				2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			const distance = R * c; // Distance in km

			// Mock Kwik pricing: Base fee + per KM fee
			const baseFee = 1500; // NGN
			const perKmRate = 150; // NGN per km
			const cost = baseFee + distance * perKmRate;
			setEstimatedCost(cost.toFixed(0)); // Round to nearest Naira
		} else {
			setEstimatedCost(null);
		}
	}, [pickupCoords, dropoffCoords]);

	useEffect(() => {
		calculateEstimatedCost();
	}, [pickupCoords, dropoffCoords, calculateEstimatedCost]);

	const handleConfirmRequest = async () => {
		if (
			!pickupCoords ||
			!dropoffCoords ||
			!recipientName ||
			!recipientPhone ||
			!itemDescription
		) {
			setError(
				'Please ensure pickup/dropoff locations are set and all required recipient/item details are filled.',
			);
			return;
		}

		setError('');
		setLoading(true);

		const deliveryDetails = {
			pickupAddress,
			pickupCoords,
			dropoffAddress,
			dropoffCoords,
			recipientName,
			recipientPhone,
			itemDescription,
			eta,
			estimatedCost, // Include estimated cost for user's info
		};

		// Simulate Kwik API call - in a real app, this would be an actual fetch request
		// await kwikApi.requestDelivery(deliveryDetails);
		setTimeout(() => {
			onConfirm(deliveryDetails);
			setLoading(false);
		}, 2000);
	};

	return (
		<KeyboardAvoidingView
			style={kwikDeliveryStyles.container}
			behavior={
				Platform.OS === 'ios' ? 'padding' : 'height'
			}
		>
			<View style={kwikDeliveryStyles.header}>
				<TouchableOpacity
					onPress={onClose}
					style={kwikDeliveryStyles.closeButton}
				>
					<Ionicons
						name="arrow-back-outline"
						size={30}
						color="#2c3e50"
					/>
				</TouchableOpacity>
				<Text style={kwikDeliveryStyles.headerTitle}>
					Request Kwik Delivery
				</Text>
				<View style={kwikDeliveryStyles.placeholder} />
			</View>

			<ScrollView
				contentContainerStyle={
					kwikDeliveryStyles.scrollViewContent
				}
			>
				<Text style={kwikDeliveryStyles.sectionTitle}>
					1. Set Locations
				</Text>

				<Text style={kwikDeliveryStyles.label}>
					Pickup Address
				</Text>
				<TextInput
					style={kwikDeliveryStyles.input}
					placeholder="Enter pickup address or tap on map"
					value={pickupAddress}
					onChangeText={setPickupAddress}
					onFocus={() => setActiveAddressInput('pickup')}
					onEndEditing={() =>
						handleAddressInputSubmit('pickup')
					}
					returnKeyType="done"
				/>
				{pickupCoords && (
					<Text style={kwikDeliveryStyles.coordText}>
						Lat: {pickupCoords.latitude.toFixed(4)}, Lon:{' '}
						{pickupCoords.longitude.toFixed(4)}
					</Text>
				)}

				<Text style={kwikDeliveryStyles.label}>
					Dropoff Address
				</Text>
				<TextInput
					style={kwikDeliveryStyles.input}
					placeholder="Enter dropoff address or tap on map"
					value={dropoffAddress}
					onChangeText={setDropoffAddress}
					onFocus={() => setActiveAddressInput('dropoff')}
					onEndEditing={() =>
						handleAddressInputSubmit('dropoff')
					}
					returnKeyType="done"
				/>
				{dropoffCoords && (
					<Text style={kwikDeliveryStyles.coordText}>
						Lat: {dropoffCoords.latitude.toFixed(4)}, Lon:{' '}
						{dropoffCoords.longitude.toFixed(4)}
					</Text>
				)}

				<View style={kwikDeliveryStyles.mapContainer}>
					<MapView
						ref={mapRef}
						style={kwikDeliveryStyles.map}
						initialRegion={mapRegion}
						showsUserLocation={true}
						onPress={handleMapPress}
						provider="google" // Ensure Google Maps is used
					>
						{pickupCoords && (
							<Marker
								coordinate={pickupCoords}
								title="Pickup Location"
								pinColor="green"
							/>
						)}
						{dropoffCoords && (
							<Marker
								coordinate={dropoffCoords}
								title="Dropoff Location"
								pinColor="red"
							/>
						)}
					</MapView>
					<Text style={kwikDeliveryStyles.mapInstruction}>
						Tap on the map to set{' '}
						{activeAddressInput === 'pickup'
							? 'pickup'
							: activeAddressInput === 'dropoff'
							? 'dropoff'
							: 'a'}{' '}
						location.
					</Text>
				</View>

				<Text style={kwikDeliveryStyles.sectionTitle}>
					2. Recipient & Item Details
				</Text>

				<Text style={kwikDeliveryStyles.label}>
					Recipient Name *
				</Text>
				<TextInput
					style={kwikDeliveryStyles.input}
					placeholder="Enter recipient's full name"
					value={recipientName}
					onChangeText={setRecipientName}
				/>

				<Text style={kwikDeliveryStyles.label}>
					Recipient Phone Number *
				</Text>
				<TextInput
					style={kwikDeliveryStyles.input}
					placeholder="e.g., +23480xxxxxxxx"
					value={recipientPhone}
					onChangeText={setRecipientPhone}
					keyboardType="phone-pad"
				/>

				<Text style={kwikDeliveryStyles.label}>
					Item Description *
				</Text>
				<TextInput
					style={[
						kwikDeliveryStyles.input,
						kwikDeliveryStyles.notesInput,
					]}
					placeholder="e.g., Small package, Documents, Laptop"
					value={itemDescription}
					onChangeText={setItemDescription}
					multiline
					numberOfLines={3}
				/>

				<Text style={kwikDeliveryStyles.label}>
					Preferred ETA (Optional)
				</Text>
				<TextInput
					style={kwikDeliveryStyles.input}
					placeholder="e.g., 02:30 PM, ASAP"
					value={eta}
					onChangeText={setEta}
				/>

				{estimatedCost && (
					<View style={kwikDeliveryStyles.costContainer}>
						<Text style={kwikDeliveryStyles.costLabel}>
							Estimated Cost:
						</Text>
						<Text style={kwikDeliveryStyles.costValue}>
							₦{estimatedCost}
						</Text>
					</View>
				)}

				{error ? (
					<Text style={kwikDeliveryStyles.errorText}>
						{error}
					</Text>
				) : null}
			</ScrollView>

			<View style={kwikDeliveryStyles.footer}>
				<TouchableOpacity
					style={[
						kwikDeliveryStyles.actionButton,
						kwikDeliveryStyles.cancelButton,
					]}
					onPress={onClose}
					disabled={loading}
				>
					<Text style={kwikDeliveryStyles.actionButtonText}>
						Cancel
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						kwikDeliveryStyles.actionButton,
						kwikDeliveryStyles.confirmButton,
					]}
					onPress={handleConfirmRequest}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text
							style={kwikDeliveryStyles.actionButtonText}
						>
							Request Kwik
						</Text>
					)}
				</TouchableOpacity>
			</View>
		</KeyboardAvoidingView>
	);
};

export default KwikDeliveryScreen

// Kwik Delivery Screen Specific Styles
const kwikDeliveryStyles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f7fa',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 15,
		paddingVertical: 15,
		paddingTop: 40,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#ecf0f1',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 3,
	},
	closeButton: {
		padding: 5,
	},
	headerTitle: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#2c3e50',
	},
	placeholder: {
		width: 40,
	},
	scrollViewContent: {
		padding: 20,
		paddingBottom: 100, // Ensure content isn't hidden by footer
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#2c3e50',
		marginTop: 20,
		marginBottom: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#ddeeff',
		paddingBottom: 5,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		color: '#34495e',
		marginBottom: 8,
		marginTop: 15,
	},
	input: {
		backgroundColor: '#fff',
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 15,
		fontSize: 16,
		color: '#34495e',
		borderWidth: 1,
		borderColor: '#ddeeff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	coordText: {
		fontSize: 13,
		color: '#7f8c8d',
		marginTop: 5,
		fontStyle: 'italic',
		textAlign: 'right',
		marginRight: 5,
	},
	notesInput: {
		minHeight: 100,
		textAlignVertical: 'top',
	},
	mapContainer: {
		height: 250,
		borderRadius: 10,
		overflow: 'hidden',
		marginTop: 20,
		borderWidth: 1,
		borderColor: '#ddeeff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	map: {
		...StyleSheet.absoluteFillObject,
	},
	mapInstruction: {
		position: 'absolute',
		bottom: 10,
		left: 10,
		right: 10,
		backgroundColor: 'rgba(255,255,255,0.85)',
		padding: 8,
		borderRadius: 8,
		textAlign: 'center',
		fontSize: 13,
		color: '#34495e',
	},
	costContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#e8f5e9',
		padding: 15,
		borderRadius: 10,
		marginTop: 20,
		borderWidth: 1,
		borderColor: '#a5d6a7',
	},
	costLabel: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#2e7d32',
	},
	costValue: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#388e3c',
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		padding: 15,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#ecf0f1',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 3,
	},
	actionButton: {
		flex: 1,
		paddingVertical: 15,
		borderRadius: 12,
		alignItems: 'center',
		marginHorizontal: 10,
	},
	cancelButton: {
		backgroundColor: '#e74c3c',
	},
	confirmButton: {
		backgroundColor: '#8e44ad', // Kwik purple
	},
	actionButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	errorText: {
		color: 'red',
		marginTop: 15,
		textAlign: 'center',
		fontSize: 14,
	},
});