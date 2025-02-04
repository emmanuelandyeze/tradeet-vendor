import React, { useContext } from 'react';
import {
	View,
	Text,
	Image,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import PlaceholderLogo from '../../../components/PlaceholderLogo';

const ProfileScreen = () => {
	const router = useRouter();
	const settingsOptions = [
		{
			id: '1',
			title: 'Website settings',
			onPress: () => router.push('/(app)/setupstore'),
		},
		{
			id: '2',
			title: 'Tradeet Marketplace',
			onPress: () => router.push('/(app)/setupcampus'),
		},
		// { id: '2', title: 'Change Password' },
		// { id: '3', title: 'Payment Methods' },
		// { id: '4', title: 'Notifications' },
		{
			id: '5',
			title: 'Help & Support',
			onPress: () => openSupport(),
		},
	];

	const { logout, userInfo, loading } =
		useContext(AuthContext);

	const handleOpenWebsite = () => {
		Linking.openURL(
			`https://tradeet.ng/${userInfo?.storeLink}`,
		); // Replace with your desired website URL
	};

	const openSupport = () => {
		Linking.openURL(`https://wa.me/9165095973`); // Replace with your desired website URL
	};

	return (
		<ScrollView style={styles.container}>
			<View style={styles.header}>
				{userInfo?.logoUrl ? (
					<Image
						source={{ uri: userInfo.logoUrl }}
						style={{
							marginBottom: 4,
							resizeMode: 'cover',
							height: 50,
							width: 50,
							borderRadius: 50,
							borderWidth: 1,
							borderColor: 'gray',
							elevation: 3,
						}}
					/>
				) : (
					<PlaceholderLogo name={userInfo?.name} />
				)}
				<View>
					<Text style={styles.name}>{userInfo?.name}</Text>
					<Text style={styles.contact}>
						{userInfo?.phone}
					</Text>
					{userInfo?.storeLink && (
						<TouchableOpacity
							style={{ marginVertical: 5 }}
							onPress={handleOpenWebsite}
						>
							<Text
								style={{
									color: 'blue',
									textDecorationLine: 'underline',
									fontSize: 16,
								}}
							>
								https://tradeet.ng/{userInfo?.storeLink}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>
					Store Settings
				</Text>
				{settingsOptions.map((option) => (
					<TouchableOpacity
						key={option.id}
						style={styles.settingButton}
						onPress={option.onPress}
					>
						<Text style={styles.settingText}>
							{option.title}
						</Text>
						<Ionicons
							name="chevron-forward"
							size={20}
							color="#000"
						/>
					</TouchableOpacity>
				))}
				<TouchableOpacity
					onPress={logout}
					style={styles.settingButton}
				>
					<Text style={styles.settingText}>Logout</Text>
					<Ionicons
						name="chevron-forward"
						size={20}
						color="#000"
					/>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		paddingTop: 20,
	},
	header: {
		alignItems: 'flex-start',
		paddingVertical: 20,
		paddingHorizontal: 10,
		backgroundColor: '#fff',
		marginBottom: 10,
		borderBottomWidth: 1,
		borderColor: '#ccc',
		flexDirection: 'row',
		gap: 10,
	},
	profileImage: {
		width: 100,
		height: 100,
		borderRadius: 50,
		marginBottom: 10,
		borderWidth: 3,
		borderColor: '#ccc',
	},
	name: {
		fontSize: 24,
		fontWeight: 'bold',
	},
	contact: {
		fontSize: 16,
		color: '#777',
	},
	walletBalance: {
		fontSize: 18,
		fontWeight: 'bold',
		marginVertical: 10,
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
	},
	settingText: {
		fontSize: 16,
		flex: 1,
	},
});

export default ProfileScreen;
