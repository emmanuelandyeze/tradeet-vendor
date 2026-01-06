import React, { useState, useEffect } from 'react';
import {
	View,
	StyleSheet,
	Text,
	TextInput,
	FlatList,
	TouchableOpacity,
	Alert,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import awsLocation from '@/utils/aws-config';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import axiosInstance from '@/utils/axiosInstance';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

const StoreLocationPicker = () => {
	const { userInfo, checkLoginStatus } =
		useContext(AuthContext);
	const [searchQuery, setSearchQuery] = useState('');
	const [suggestions, setSuggestions] = useState([]);
	const [selectedLocation, setSelectedLocation] =
		useState(null);
	const [address, setAddress] = useState('');

	const router = useRouter();

	useEffect(() => {
		(async () => {
			let { status } =
				await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert(
					'Permission Denied',
					'Permission to access location is required.',
				);
				return;
			}

			let currentLocation =
				await Location.getCurrentPositionAsync({});
			setSelectedLocation({
				latitude: currentLocation.coords.latitude,
				longitude: currentLocation.coords.longitude,
			});

			// Reverse geocoding to get the address
			const params = {
				IndexName: 'Tradeet',
				Position: [
					currentLocation.coords.longitude,
					currentLocation.coords.latitude,
				],
				MaxResults: 1,
			};

			awsLocation.searchPlaceIndexForPosition(
				params,
				(err, data) => {
					if (err) {
						console.error(
							'Error with reverse geocoding:',
							err,
						);
					} else {
						if (data.Results.length > 0) {
							setAddress(data.Results[0].Place.Label);
						}
					}
				},
			);
		})();
	}, []);

	const handleSearchQueryChange = (text) => {
		setSearchQuery(text);

		if (text.length > 2) {
			const params = {
				IndexName: 'Tradeet',
				Text: text,
				MaxResults: 3,
			};

			awsLocation.searchPlaceIndexForText(
				params,
				(err, data) => {
					if (err) {
						console.error(
							'Error with forward geocoding:',
							err,
						);
					} else {
						if (data.Results.length > 0) {
							setSuggestions(data.Results);
						} else {
							setSuggestions([]);
						}
					}
				},
			);
		} else {
			setSuggestions([]);
		}
	};

	const handleSelectSuggestion = (suggestion) => {
		const location = suggestion.Place.Geometry.Point;
		setSelectedLocation({
			latitude: location[1],
			longitude: location[0],
		});
		setAddress(suggestion.Place.Label);
		setSearchQuery(suggestion.Place.Label);
		setSuggestions([]);
	};

	const handleMapPress = (event) => {
		const { latitude, longitude } =
			event.nativeEvent.coordinate;
		setSelectedLocation({ latitude, longitude });

		// Reverse geocoding to get the address
		const params = {
			IndexName: 'Tradeet',
			Position: [longitude, latitude],
			MaxResults: 1,
		};

		awsLocation.searchPlaceIndexForPosition(
			params,
			(err, data) => {
				if (err) {
					console.error(
						'Error with reverse geocoding:',
						err,
					);
				} else {
					if (data.Results.length > 0) {
						setAddress(data.Results[0].Place.Label);
					}
				}
			},
		);
	};

	const updateLocationDetails = async () => {
		try {
			const response = await axiosInstance.put(
				`/stores/${userInfo?._id}`,
				{
					latitude: selectedLocation.latitude,
					longitude: selectedLocation.longitude,
					address: address,
				},
			);
			Alert.alert(
				'Success',
				'Location details updated successfully',
			);
		} catch (error) {
			console.error(
				'Error updating location details:',
				error,
			);
			Alert.alert(
				'Error',
				'Failed to update location details',
			);
		}
	};

	return (
		<View style={styles.container}>
			<View
				style={{
					flexDirection: 'row',
					justifyContent: 'space-between',
					alignItems: 'center',
					paddingVertical: 10,
					marginBottom: 10,
				}}
			>
				<View>
					<Text style={styles.header}>Store Location</Text>
					{/* <Text>Enter your store location.</Text> */}
				</View>
				<TouchableOpacity onPress={() => router.back()}>
					<MaterialIcons
						name="cancel"
						size={24}
						color="black"
					/>
				</TouchableOpacity>
			</View>
			<TextInput
				style={styles.input}
				placeholder="Enter your store location"
				value={searchQuery}
				onChangeText={handleSearchQueryChange}
			/>
			{suggestions.length > 0 && (
				<FlatList
					data={suggestions}
					keyExtractor={(item) => item.PlaceId}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={styles.suggestion}
							onPress={() => handleSelectSuggestion(item)}
						>
							<Text
								style={{
									fontSize: 18,
									paddingVertical: 10,
								}}
							>
								{item.Place.Label}
							</Text>
						</TouchableOpacity>
					)}
				/>
			)}
			{selectedLocation && (
				<View style={styles.selectedLocationContainer}>
					{/* <Text>Selected Location:</Text>
						<Text>
							Latitude: {selectedLocation.latitude}
						</Text>
						<Text>
							Longitude: {selectedLocation.longitude}
						</Text>
						<Text>Address: {address}</Text> */}
					<View
						className="flex flex-row items-start mb-2"
						style={{ gap: 3 }}
					>
						<Ionicons
							name="location"
							size={24}
							color="green"
						/>
						<TouchableOpacity>
							<Text
								style={{
									color: 'gray',
									// textDecorationLine: 'underline',
									fontSize: 16,
									marginLeft: 0,
								}}
							>
								Current location
							</Text>
							<Text
								style={{
									color: 'black',
									// textDecorationLine: 'underline',
									fontSize: 18,
									marginLeft: 0,
								}}
							>
								{address}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
			<View
				style={{
					position: 'absolute',
					bottom: 18,
					right: 10,
				}}
			>
				<TouchableOpacity
					style={{
						backgroundColor: 'green',
						padding: 10,
						borderRadius: 10,
					}}
					onPress={() => updateLocationDetails()}
				>
					<Text style={{ color: 'white', fontSize: 18 }}>Save location</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingVertical: 30,
		paddingHorizontal: 20,
		flex: 1,
	},
	header: {
		fontSize: 24,
		fontWeight: 'bold',
	},
	input: {
		height: 48,
		borderColor: 'gray',
		borderWidth: 1,
		marginBottom: 10,
		paddingHorizontal: 10,
		borderRadius: 10,
		fontSize: 18,
	},
	suggestion: {
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: 'gray',
	},
	selectedLocationContainer: {
		marginTop: 20,
	},
	map: {
		flex: 1,
		marginTop: 20,
	},
});

export default StoreLocationPicker;
