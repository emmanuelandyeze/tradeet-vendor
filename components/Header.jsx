import React, {
	useContext,
	useEffect,
	useState,
} from 'react';
import {
	View,
	Text,
	TextInput,
	Image,
	Linking,
	TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthContext } from '@/context/AuthContext';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import PlaceholderLogo from './PlaceholderLogo'
import { StatusBar } from 'expo-status-bar';

export default function Header({ userInfo }) {
	const { loading, checkLoginStatus } =
		useContext(AuthContext);

	const handleOpenWebsite = () => {
		Linking.openURL(
			`https://${userInfo?.storeLink}.tradeet.ng`,
		); // Replace with your desired website URL
	};

	if (loading) {
		return <Text></Text>;
	}

	return (
		<View
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'flex-start',
				paddingTop: 45,
				paddingBottom: 10,
				paddingLeft: 20,
				paddingRight: 20,
				backgroundColor: '#065637',
				flexDirection: 'row',
				zIndex: 100,
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				elevation: 1,
			}}
		>
			<StatusBar style="light" backgroundColor="#065637" />
			<View className="flex flex-row gap-2">
				{userInfo?.logoUrl ? (
					<Image
						source={{ uri: userInfo.logoUrl }}
						style={{
							marginBottom: 4,
							resizeMode: 'cover',
							height: 50,
							width: 50,
							borderRadius: 10,
							borderWidth: 1,
							borderColor: 'gray',
							elevation: 3,
						}}
					/>
				) : (
					<PlaceholderLogo name={userInfo?.name} />
				)}
				<View
					style={{
						flexDirection: 'column',
						width: '85%',
						marginTop: 5,
					}}
				>
					<View
						className="flex flex-row gap-1 items-center "
						style={{
							justifyContent: 'space-between',
							marginBottom: 0,
						}}
					>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'flex-start',
							}}
						>
							<Text
								className="text-xl font-bold"
								style={{
									color: '#f1f1f1',
									fontSize: 20,
									marginLeft: 3,
								}}
							>
								{userInfo?.name}
							</Text>
							<Text
								style={{
									color: '#121212',
									fontSize: 12,
									marginLeft: 5,
									color: 'white',
									backgroundColor: '#065637',
									paddingHorizontal: 5,
									borderRadius: 15,
									borderWidth: 1,
									borderColor: 'white'
								}}
							>
								{userInfo?.plan?.name}
							</Text>
						</View>
						{userInfo?.storeLink && (
							<View
								style={{ marginBottom: 5 }}
								className="flex flex-row items-center"
							>
								<TouchableOpacity
									onPress={handleOpenWebsite}
								>
									<Text
										style={{
											color: '#f1f1f1',
											textDecorationLine: 'underline',
											fontSize: 16,
											marginLeft: 5,
										}}
									>
										Open Store
									</Text>
								</TouchableOpacity>
								<EvilIcons
									name="external-link"
									size={18}
									color="#f1f1f1"
								/>
							</View>
						)}
					</View>
					<View
						className="flex flex-row items-center mb-2"
						style={{ gap: 3 }}
					>
						<Ionicons
							name="location"
							size={15}
							color="#f1f1f1"
						/>
						<TouchableOpacity
							onPress={() => router.push('/selectLocation')}
						>
							<Text
								style={{
									color: '#f1f1f1',
									// textDecorationLine: 'underline',
									fontSize: 13,
									marginLeft: 0,
								}}
							>
								{userInfo?.address}
							</Text>
						</TouchableOpacity>
						{/* <FontAwesome
							name="angle-down"
							size={18}
							color="#f1f1f1"
						/> */}
					</View>
				</View>
			</View>
			<View></View>
		</View>
	);
}
