import React, { useContext, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Linking,
	Alert,
	Switch,
	Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const ProfileScreen = () => {
	const router = useRouter();
	const { logout, userInfo, selectedStore, switchSelectedStore } = useContext(AuthContext);
	const [darkMode, setDarkMode] = useState(false);

	// Open website
	const handleOpenWebsite = () => {
		const storeStart = selectedStore || userInfo;
		if (storeStart?.customDomain) {
			let url = storeStart.customDomain;
			if (!url.startsWith('http')) {
				url = 'https://' + url;
			}
			Linking.openURL(url);
		} else if (storeStart?.storeLink) {
			Linking.openURL(`https://tradeet.ng/store/${storeStart.storeLink}`);
		} else {
			Alert.alert('Info', 'No store link available.');
		}
	};

	// Open support chat
	const openSupport = () => {
		Linking.openURL(`https://wa.me/9165095973`);
	};

	// Confirm Logout
	const confirmLogout = () => {
		Alert.alert(
			'Logout',
			'Are you sure you want to log out?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Logout',
					onPress: logout,
					style: 'destructive',
				},
			],
		);
	};

	const handleSwitchStore = async (store) => {
		try {
			// switchSelectedStore uses the same methodsignature: storeId or storeObj
			// Since we have the store object here, we can pass it directly or its id
			await switchSelectedStore(store);
			// Optionally show a toast, but UI update should be enough
		} catch (error) {
			Alert.alert('Error', 'Failed to switch store');
		}
	};

	// Settings categories
	const settingsSections = [
		{
			title: 'Account Settings',
			data: [
				{
					id: '2',
					title: 'Change Password',
					icon: 'lock-closed',
					onPress: () => router.push('/change-password'),
				},
			],
		},
		{
			title: 'Store Settings',
			data: [
				{
					id: '8',
					title: 'Custom Domain',
					icon: 'globe-outline', // Updated icon
					onPress: () => router.push('/(app)/domain-settings'),
				},
				{
					id: '3',
					title: 'Website Settings',
					icon: 'globe',
					onPress: () => router.push('/(app)/setupstore'),
				},
				{
					id: '1',
					title: 'Business Hours',
					icon: 'time',
					onPress: () =>
						router.push('/(app)/business-hours'),
				},
				{
					id: '4',
					title: 'Payment & Payouts',
					icon: 'card',
					onPress: () => router.push('/(app)/payment-info'),
				},
			],
		},
		{
			title: 'Preferences',
			data: [
				{
					id: '5',
					title: 'Dark Mode (coming soon)',
					icon: 'moon',
					toggle: true,
					value: darkMode,
					onToggle: () => setDarkMode((prev) => !prev),
				},
				{
					id: '6',
					title: 'Notifications (coming soon)',
					icon: 'notifications',
				},
			],
		},
		{
			title: 'Help & Support',
			data: [
				{
					id: '7',
					title: 'Help & FAQs',
					icon: 'help-circle',
					onPress: openSupport,
				},
			],
		},
	];

	return (
		<View style={styles.container}>
			<StatusBar style="light" backgroundColor="#065637" />
			<View
				style={{
					paddingTop: 25,
					elevation: 3,
					backgroundColor: '#065637',
					paddingHorizontal: 16,
					paddingBottom: 20,
				}}
			>
				<View
					style={{
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<Text style={{ fontSize: 24, color: '#f1f1f1', fontWeight: 'bold' }}>Settings</Text>
				</View>
			</View>

			<ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
				{/* My Businesses Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>My Businesses</Text>
					{userInfo?.stores?.map((store) => (
						<TouchableOpacity
							key={store._id}
							style={[
								styles.businessItem,
								selectedStore?._id === store._id && styles.selectedBusiness,
							]}
							onPress={() => handleSwitchStore(store)}
						>
							<View style={styles.businessInfo}>
								{store.logoUrl ? (
									<Image
										source={{ uri: store.logoUrl }}
										style={styles.businessLogo}
									/>
								) : (
									<View style={styles.placeholderLogo}>
										<Text style={styles.placeholderText}>
											{store.name ? store.name.charAt(0).toUpperCase() : '?'}
										</Text>
									</View>
								)}
								<View style={{ flex: 1 }}>
									<Text style={styles.businessName} numberOfLines={1}>{store.name}</Text>
									<Text style={styles.businessLink} numberOfLines={1}>
										{store.storeLink || 'No link'}
									</Text>
								</View>
							</View>
							{selectedStore?._id === store._id && (
								<Ionicons name="checkmark-circle" size={24} color="#065637" />
							)}
						</TouchableOpacity>
					))}

					<TouchableOpacity
						style={styles.addBusinessButton}
						onPress={() => router.push('/(app)/create-business')}
					>
						<Ionicons name="add-circle-outline" size={20} color="#065637" />
						<Text style={styles.addBusinessText}>Add New Business</Text>
					</TouchableOpacity>
				</View>

				{/* Settings Sections */}
				{settingsSections.map((section) => (
					<View key={section.title} style={styles.section}>
						<Text style={styles.sectionTitle}>
							{section.title}
						</Text>
						{section.data.map((item) => (
							<TouchableOpacity
								key={item.id}
								style={styles.settingButton}
								onPress={item.onPress}
							>
								<Ionicons
									name={item.icon}
									size={20}
									color="#000"
								/>
								<Text style={styles.settingText}>
									{item.title}
								</Text>
								{item.toggle ? (
									<Switch
										value={item.value}
										onValueChange={item.onToggle}
									/>
								) : (
									<Ionicons
										name="chevron-forward"
										size={20}
										color="#000"
									/>
								)}
							</TouchableOpacity>
						))}
					</View>
				))}

				{/* Logout Button */}
				<TouchableOpacity
					onPress={confirmLogout}
					style={styles.logoutButton}
				>
					<Text style={styles.logoutText}>Logout</Text>
					<Ionicons name="log-out" size={20} color="red" />
				</TouchableOpacity>
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		paddingTop: 0,
		paddingBottom: 0,
	},
	header: {
		flexDirection: 'row',
		paddingHorizontal: 15,
		backgroundColor: '#fff',
		alignItems: 'center',
		gap: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
		paddingVertical: 10,
	},
	section: {
		padding: 15,
		backgroundColor: '#fff',
		marginBottom: 10,
		marginTop: 10,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
		color: '#333',
	},
	settingButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
		gap: 10,
	},
	settingText: { fontSize: 16, flex: 1, color: '#333' },
	logoutButton: {
		flexDirection: 'row',
		padding: 15,
		marginTop: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 30,
		borderColor: 'red',
		borderWidth: 1,
		borderRadius: 5,
		backgroundColor: '#fff',
		width: '90%',
		alignSelf: 'center',
	},
	logoutText: {
		fontSize: 16,
		color: 'red',
		marginRight: 5,
		fontWeight: 'bold',
	},
	// My Business Styles
	businessItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#eee',
		marginBottom: 8,
		backgroundColor: '#fafafa',
	},
	selectedBusiness: {
		borderColor: '#065637',
		backgroundColor: '#e8f5e9',
	},
	businessInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		flex: 1,
	},
	businessLogo: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	placeholderLogo: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#eee',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#ddd',
	},
	placeholderText: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#555',
	},
	businessName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
	},
	businessLink: {
		fontSize: 12,
		color: '#666',
	},
	addBusinessButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 12,
		marginTop: 5,
		borderWidth: 1,
		borderColor: '#065637',
		borderRadius: 8,
		borderStyle: 'dashed',
	},
	addBusinessText: {
		marginLeft: 5,
		color: '#065637',
		fontWeight: '600',
	},
});

export default ProfileScreen;
