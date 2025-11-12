import React, { useContext } from 'react';
import {
	View,
	Text,
	Image,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Linking,
	FlatList,
	Alert,
	Switch,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import PlaceholderLogo from '../../../components/PlaceholderLogo';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';

const ProfileScreen = () => {
	const router = useRouter();
	const { logout, userInfo } = useContext(AuthContext);
	const [darkMode, setDarkMode] = useState(false);

	// Open website
	const handleOpenWebsite = () => {
		Linking.openURL(
			`https://tradeet.ng/store/${userInfo?.storeLink}`,
		);
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

	// Settings categories
	const settingsSections = [
		{
			title: 'Account Settings',
			data: [
				// {
				// 	id: '1',
				// 	title: 'Edit Profile',
				// 	icon: 'person',
				// 	onPress: () => router.push('/(app)/editprofile'),
				// },
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
					// onPress: () =>
					// 	router.push('/(app)/notifications'),
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
					<TouchableOpacity>
						{/* <Ionicons name="search-outline" size={22} color="black" /> */}
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView>
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
		backgroundColor: '#fff',
		paddingTop: 20,
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
	logo: {
		height: 50,
		width: 50,
		borderRadius: 50,
		borderWidth: 1,
		borderColor: 'gray',
	},
	name: { fontSize: 22, fontWeight: 'bold' },
	contact: { fontSize: 16, color: '#777' },
	storeLink: {
		color: 'blue',
		textDecorationLine: 'underline',
		fontSize: 16,
	},
	section: {
		padding: 15,
		backgroundColor: '#fff',
		marginBottom: 10,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	settingButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
		gap: 10,
	},
	settingText: { fontSize: 16, flex: 1 },
	logoutButton: {
		flexDirection: 'row',
		padding: 15,
		marginTop: 0,
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
});

export default ProfileScreen;
