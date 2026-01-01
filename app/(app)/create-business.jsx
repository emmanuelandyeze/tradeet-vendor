import React, { useState, useContext } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Alert,
	ActivityIndicator,
	Image,
	Platform,
} from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { StatusBar } from 'expo-status-bar';

const CreateBusinessScreen = () => {
	const router = useRouter();
	const { checkLoginStatus, switchSelectedStore } = useContext(AuthContext);

	const [storeName, setStoreName] = useState('');
	const [description, setDescription] = useState('');
	const [serviceType, setServiceType] = useState('products');
	const [logo, setLogo] = useState(null);
	const [loading, setLoading] = useState(false);

	const pickImage = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			allowsEditing: true,
			aspect: [1, 1],
			quality: 1,
		});

		if (!result.canceled) {
			setLogo(result.assets[0].uri);
		}
	};

	const makeFileForForm = (uri, fieldName = 'file') => {
		const uriParts = uri.split('/');
		const name = uriParts[uriParts.length - 1] || `${fieldName}.jpg`;
		let match = /\.(\w+)$/.exec(name);
		let ext = match ? match[1].toLowerCase() : 'jpg';
		let type = 'image/jpeg';
		if (ext === 'png') type = 'image/png';
		if (ext === 'gif') type = 'image/gif';
		return {
			uri,
			name,
			type,
		};
	};

	const handleCreate = async () => {
		if (!storeName.trim()) {
			Alert.alert('Error', 'Please enter a business name');
			return;
		}

		setLoading(true);
		try {
			const formData = new FormData();
			formData.append('name', storeName);
			formData.append('description', description);
			formData.append('serviceType', serviceType);
			// Default values for new store
			formData.append('isVendor', 'true'); 

			if (logo) {
				formData.append('logo', makeFileForForm(logo, 'logo'));
			}

			const config = {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			};

			const response = await axiosInstance.post('/stores', formData, config);
			
			// response.data.store contains the new store
			const newStoreId = response.data.store._id;

			// Refresh user info to get the new store in the list
			await checkLoginStatus();

			// Switch to the new store
			await switchSelectedStore(newStoreId);

			Alert.alert('Success', 'Business created successfully!', [
				{
					text: 'OK',
					onPress: () => router.replace('/(app)/(tabs)'), // Go to dashboard with new store selected
				},
			]);
		} catch (error) {
			console.error('Create store error:', error);
			Alert.alert(
				'Error',
				error.response?.data?.message || 'Failed to create business',
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<StatusBar style="dark" />
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Ionicons name="arrow-back" size={24} color="#1C2634" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Create New Business</Text>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				
				{/* Logo Upload */}
				<TouchableOpacity onPress={pickImage} style={styles.logoContainer}>
					{logo ? (
						<Image source={{ uri: logo }} style={styles.logo} />
					) : (
						<View style={styles.logoPlaceholder}>
							<EvilIcons name="camera" size={40} color="#ccc" />
							<Text style={styles.uploadText}>Add Logo</Text>
						</View>
					)}
				</TouchableOpacity>

				<View style={styles.formGroup}>
					<Text style={styles.label}>Business Name</Text>
					<TextInput
						style={styles.input}
						placeholder="e.g. My Awesome Store"
						value={storeName}
						onChangeText={setStoreName}
					/>
				</View>

				<View style={styles.formGroup}>
					<Text style={styles.label}>Description</Text>
					<TextInput
						style={[styles.input, styles.textArea]}
						placeholder="Tell us about your business..."
						value={description}
						onChangeText={setDescription}
						multiline
						numberOfLines={3}
					/>
				</View>

				<View style={styles.formGroup}>
					<Text style={styles.label}>Service Type</Text>
					<View style={styles.pickerContainer}>
						<Picker
							selectedValue={serviceType}
							onValueChange={(itemValue) => setServiceType(itemValue)}
							style={styles.picker}
						>
							<Picker.Item label="Products" value="products" />
							<Picker.Item label="Services" value="services" />
							<Picker.Item label="Both" value="both" />
						</Picker>
					</View>
				</View>

				<TouchableOpacity
					style={[styles.createButton, loading && styles.disabledButton]}
					onPress={handleCreate}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.createButtonText}>Create Business</Text>
					)}
				</TouchableOpacity>
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		paddingTop: Platform.OS === 'android' ? 30 : 0,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	backButton: {
		paddingRight: 16,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#1C2634',
	},
	content: {
		padding: 20,
	},
	logoContainer: {
		alignSelf: 'center',
		marginBottom: 20,
	},
	logo: {
		width: 100,
		height: 100,
		borderRadius: 50,
		borderWidth: 1,
		borderColor: '#eee',
	},
	logoPlaceholder: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: '#e1e1e1',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#ccc',
		borderStyle: 'dashed',
	},
	uploadText: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	formGroup: {
		marginBottom: 20,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 8,
		color: '#333',
	},
	input: {
		backgroundColor: '#fff',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	textArea: {
		height: 100,
		textAlignVertical: 'top',
	},
	pickerContainer: {
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
		overflow: 'hidden',
	},
	picker: {
		height: 50,
		width: '100%',
	},
	createButton: {
		backgroundColor: '#05b204',
		padding: 16,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 20,
	},
	disabledButton: {
		opacity: 0.7,
	},
	createButtonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
});

export default CreateBusinessScreen;
