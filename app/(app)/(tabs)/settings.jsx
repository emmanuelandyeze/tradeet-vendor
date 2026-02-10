// app/(app)/(tabs)/settings.jsx
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
	Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ProfileScreen = () => {
	const router = useRouter();
	const { logout, userInfo, selectedStore, switchSelectedStore, getPlanCapability, isBiometricSupported, isBiometricEnabled, enableBiometrics, disableBiometrics } = useContext(AuthContext);
	const [darkMode, setDarkMode] = useState(false);

	const insets = useSafeAreaInsets();
	const headerTopPadding = Math.max(insets.top, 20) + 10;

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
			await switchSelectedStore(store);
		} catch (error) {
			Alert.alert('Error', 'Failed to switch store');
		}
	};

	// Settings categories
	const settingsSections = [
		{
			title: 'Account',
			data: [
				{
					id: '2',
					title: 'Change Password',
					icon: 'lock-closed-outline',
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
					icon: 'globe-outline',
					onPress: () => router.push('/(app)/domain-settings'),
				},
				{
					id: '3',
					title: 'Website Settings',
					icon: 'desktop-outline',
					onPress: () => router.push('/(app)/setupstore'),
				},
				{
					id: '1',
					title: 'Business Hours',
					icon: 'time-outline',
					onPress: () =>
						router.push('/(app)/business-hours'),
				},
				{
					id: '4',
					title: 'Payment & Payouts',
					icon: 'card-outline',
					onPress: () => router.push('/(app)/payment-info'),
				},
				{
					id: '9',
					title: 'Team Management',
					icon: 'people-outline',
					onPress: () => router.push('/(app)/team-management'),
				},
			],
		},
		{
			title: 'Preferences',
			data: [
				{
					id: '5',
					title: 'Dark Mode',
					icon: 'moon-outline',
					toggle: true,
					value: darkMode,
					onToggle: () => setDarkMode((prev) => !prev),
					disabled: true
				},
				{
					id: '6',
					title: 'Notifications',
					icon: 'notifications-outline',
					disabled: true
				},
				// Biometric Toggle
				...(!isBiometricSupported ? [{
					id: 'bio-auth',
					title: 'Biometric Login',
					icon: Platform.OS === 'ios' ? 'face-id' : 'finger-print', // Ionicons might not have face-id, checking below
					toggle: true,
					value: isBiometricEnabled,
					onToggle: async () => {
						if (isBiometricEnabled) {
							await disableBiometrics();
						} else {
							await enableBiometrics();
						}
					},
					disabled: false
				}] : []),
			],
		},
		{
			title: 'Support',
			data: [
				{
					id: '7',
					title: 'Help & FAQs',
					icon: 'help-circle-outline',
					onPress: openSupport,
				},
			],
		},
	];

	return (
		<View style={styles.container}>
			<StatusBar style="dark" backgroundColor="#FFFFFF" />

			{/* Header */}
			<View style={[styles.header, { paddingTop: headerTopPadding }]}>
				<Text style={styles.headerTitle}>More</Text>
			</View>

			<ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}>
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
							activeOpacity={0.7}
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
							{selectedStore?._id === store._id ? (
								<Ionicons name="checkmark-circle" size={24} color="#065637" />
							) : (
								<View style={styles.radioOutline} />
							)}
						</TouchableOpacity>
					))}

					{userInfo?.stores?.length < getPlanCapability('storeLimit') ? (
						<TouchableOpacity
							style={styles.addBusinessButton}
							onPress={() => router.push('/(app)/create-business')}
						>
							<Ionicons name="add" size={18} color="#065637" />
							<Text style={styles.addBusinessText}>Add New Business</Text>
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={[styles.addBusinessButton, { borderColor: '#6366f1', borderStyle: 'solid' }]}
							onPress={() => router.push('/(app)/subscription')}
						>
							<Ionicons name="star" size={18} color="#6366f1" />
							<Text style={[styles.addBusinessText, { color: '#6366f1' }]}>Upgrade for Multi-Store</Text>
						</TouchableOpacity>
					)}
				</View>

				{/* Settings Sections */}
				{settingsSections.map((section) => (
					<View key={section.title} style={styles.section}>
						<Text style={styles.sectionTitle}>
							{section.title}
						</Text>
						<View style={styles.sectionCard}>
							{section.data.map((item, index) => (
								<TouchableOpacity
									key={item.id}
									style={[
										styles.settingButton,
										index !== section.data.length - 1 && styles.settingDivider
									]}
									onPress={item.onPress}
									disabled={item.disabled}
								>
									<View style={styles.settingIconBox}>
										<Ionicons
											name={item.id === 'bio-auth' && Platform.OS === 'ios' ? 'scan-outline' : item.icon} // 'scan-outline' as proxy for FaceID if needed, or 'finger-print'
											size={20}
											color="#4B5563"
										/>
									</View>
									<View style={{ flex: 1 }}>
										<Text style={[styles.settingText, item.disabled && styles.disabledText]}>
											{item.title}
										</Text>
										{item.disabled && (
											<Text style={styles.comingSoon}>Coming soon</Text>
										)}
									</View>

									{item.toggle ? (
										<Switch
											value={item.value}
											onValueChange={item.onToggle}
											trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
											thumbColor={item.value ? '#065637' : '#F3F4F6'}
											disabled={item.disabled}
										/>
									) : (
										!item.disabled && (
											<Ionicons
												name="chevron-forward"
												size={18}
												color="#9CA3AF"
											/>
										)
									)}
								</TouchableOpacity>
							))}
						</View>
					</View>
				))}

				{/* Logout Button */}
				<View style={[styles.section, { marginTop: 12 }]}>
					<TouchableOpacity
						onPress={confirmLogout}
						style={styles.logoutButton}
					>
						<Ionicons name="log-out-outline" size={20} color="#EF4444" />
						<Text style={styles.logoutText}>Log Out</Text>
					</TouchableOpacity>
				</View>

				<Text style={styles.versionText}>Version 1.0.0</Text>
			</ScrollView>
		</View>
	);
};

export default ProfileScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9FAFB',
	},
	header: {
		backgroundColor: '#FFFFFF',
		// paddingTop: handled inline
		paddingBottom: 16,
		paddingHorizontal: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: '800',
		color: '#111827',
	},
	section: {
		paddingHorizontal: 20,
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 12,
		color: '#6B7280',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	sectionCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		overflow: 'hidden',
	},
	settingButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
	},
	settingDivider: {
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	settingIconBox: {
		width: 32,
		height: 32,
		borderRadius: 8,
		backgroundColor: '#F3F4F6',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	settingText: { fontSize: 15, fontWeight: '500', color: '#1F2937' },
	disabledText: { color: '#9CA3AF' },
	comingSoon: { fontSize: 11, color: '#9CA3AF' },

	logoutButton: {
		flexDirection: 'row',
		padding: 16,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		backgroundColor: '#FEF2F2',
		borderWidth: 1,
		borderColor: '#FEE2E2',
		gap: 8,
	},
	logoutText: {
		fontSize: 15,
		color: '#EF4444',
		fontWeight: '600',
	},
	versionText: {
		textAlign: 'center',
		color: '#9CA3AF',
		fontSize: 12,
		marginBottom: 30,
	},

	// My Business Styles
	businessItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		marginBottom: 12,
		backgroundColor: '#FFFFFF',
	},
	selectedBusiness: {
		borderColor: '#065637',
		backgroundColor: '#F0FDF4',
	},
	businessInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1,
	},
	businessLogo: {
		width: 48,
		height: 48,
		borderRadius: 8,
		backgroundColor: '#F3F4F6',
	},
	placeholderLogo: {
		width: 48,
		height: 48,
		borderRadius: 8,
		backgroundColor: '#F3F4F6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	placeholderText: {
		fontSize: 20,
		fontWeight: '700',
		color: '#9CA3AF',
	},
	businessName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#111827',
	},
	businessLink: {
		fontSize: 13,
		color: '#6B7280',
	},
	radioOutline: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#D1D5DB',
	},
	addBusinessButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 14,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderStyle: 'dashed',
	},
	addBusinessText: {
		marginLeft: 8,
		color: '#065637',
		fontWeight: '600',
		fontSize: 15,
	},
});
