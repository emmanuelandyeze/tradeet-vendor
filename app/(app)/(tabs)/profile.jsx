import React, { useContext } from 'react';
import {
	View,
	Text,
	Image,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '@/context/AuthContext';

const ProfileScreen = () => {
	const settingsOptions = [
		{ id: '1', title: 'Edit Profile' },
		{ id: '2', title: 'Change Password' },
		{ id: '3', title: 'Payment Methods' },
		{ id: '4', title: 'Notifications' },
		{ id: '5', title: 'Help & Support' },
		// { id: '6', title: 'Logout' },
	];

	const { logout, userInfo, loading } = useContext(AuthContext);

	const user = {
		name: 'Bengee Foods',
		phoneNumber: '+234 123 456 7890',
		id: '123',
		image:
			'https://res.cloudinary.com/dkhoomk9a/image/upload/v1725260302/u07x55tbyv1bohgmc309.png',
		walletBalance: 2000,
	};

	return (
		<ScrollView style={styles.container}>
			<View style={styles.header}>
				<Image
					source={{
						uri: userInfo?.logoUrl,
					}} // Replace with actual profile image URL
					style={styles.profileImage}
				/>
				<Text style={styles.name}>{userInfo?.name}</Text>
				<Text style={styles.contact}>
					{userInfo?.phone}
				</Text>
				<Text style={styles.walletBalance}>
					Wallet Balance: ₦
					{userInfo?.walletBalance?.toLocaleString()}
				</Text>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Settings</Text>
				{settingsOptions.map((option) => (
					<TouchableOpacity
						key={option.id}
						style={styles.settingButton}
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
					<Text style={styles.settingText}>
						Logout
					</Text>
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
		alignItems: 'center',
		padding: 20,
		backgroundColor: '#fff',
		marginBottom: 10,
		borderBottomWidth: 1,
		borderColor: '#ccc'
	},
	profileImage: {
		width: 100,
		height: 100,
		borderRadius: 50,
		marginBottom: 10,
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
