import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	Image,
	TouchableOpacity,
	Linking,
	ActivityIndicator,
} from 'react-native';
import ImageColors from 'react-native-image-colors';
import { LinearGradient } from 'expo-linear-gradient';

const StoreCard = ({
	userInfo,
	storeName,
	description,
	storeLink,
	storeInfoRef,
	campus,
}) => {
	const [dominantColor, setDominantColor] =
		useState('#FFFFFF');
	const [secondaryColor, setSecondaryColor] =
		useState('#EAEAEA');

	useEffect(() => {
		const fetchColors = async () => {
			const result = await ImageColors.getColors(
				userInfo?.logoUrl,
				{
					fallback: '#FFFFFF',
					cache: true,
				},
			);

			if (
				result.platform === 'android' ||
				result.platform === 'ios'
			) {
				setDominantColor(result.dominant || '#FFFFFF');
				setSecondaryColor(result.lightMuted || '#EAEAEA');
			} else if (result.platform === 'web') {
				setDominantColor(result.lightVibrant || '#FFFFFF');
				setSecondaryColor(result.muted || '#EAEAEA');
			}
		};

		fetchColors();
	}, [userInfo?.logoUrl]);

	const handleGetAppPress = () => {
		Linking.openURL(
			'https://play.google.com/store/apps/details?id=com.tradeet',
		); // Replace with your actual Play Store link
	};

	if (!dominantColor) {
		return <ActivityIndicator size="large" color="#000" />;
	}

	return (
		<View
			style={{
				padding: 5,
				borderRadius: 10,
				alignItems: 'center',
				width: '90%',
				justifyContent: 'center',
				marginBottom: 10,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.25,
				display: 'flex',
			}}
			ref={storeInfoRef}
		>
			<LinearGradient
				colors={[dominantColor, secondaryColor]}
				start={{ x: 0, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={{
					paddingVertical: 20,
					borderRadius: 10,
					alignItems: 'center',
					width: '100%',
					justifyContent: 'center',
					marginBottom: 10,
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 2 },
					shadowOpacity: 0.25,
					display: 'flex',
				}}
			>
				<View
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 3,
						marginBottom: 10,
					}}
				>
					<View
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 3,
						}}
					>
						<Image
							source={require('@/assets/images/icon.png')}
							style={{
								height: 20,
								width: 20,
								borderRadius: 150,
							}}
						/>
						<Text
							style={{
								fontWeight: 'bold',
								fontSize: 22,
								color: 'white',
							}}
						>
							|
						</Text>
					</View>
					<View
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 3,
						}}
					>
						<Text
							style={{
								fontWeight: 'bold',
								fontSize: 16,
								color: 'white',
							}}
						>
							{storeName}
						</Text>
					</View>
				</View>

				<Text
					style={{
						fontWeight: 'bold',
						fontSize: 24,
						color: 'white',
						marginBottom: 20,
						marginTop: 10,
					}}
				>
					We are live on Tradeet!🥳
				</Text>

				<View style={{ alignItems: 'center' }}>
					<View
						style={{
							flexDirection: 'row',
							marginTop: 10,
							gap: 3,
							textAlign: 'center',
						}}
					>
						<Text
							style={{
								fontWeight: 'bold',
								fontSize: 28,
								color: 'black',
								alignItems: 'center',
							}}
						>
							{/* Use{' '} */}
							<Text
								style={{
									textTransform: 'uppercase',
									fontWeight: 'bold',
									color: 'white',
								}}
							>
								{/* {campus} */}
							</Text>{' '}
							Get massive
						</Text>
						<View
							style={{
								borderWidth: 1,
								borderColor: 'orange',
								backgroundColor: '#fff',
								color: 'orange',
								paddingHorizontal: 5,
								paddingVertical: 2,
								marginBottom: 0,
							}}
						>
							<Text
								style={{ fontSize: 28, fontWeight: 'bold' }}
							>
								10% off
							</Text>
						</View>
					</View>
					<Text
						style={{
							fontWeight: 'bold',
							fontSize: 28,
							color: 'black',
							alignItems: 'center',
						}}
					>
						on your first order!
					</Text>
				</View>

				<Image
					source={{ uri: userInfo?.logoUrl }}
					style={{
						height: 200,
						width: 200,
						borderRadius: 10,
						marginVertical: 10,
					}}
				/>
				<Text
					style={{
						textAlign: 'center',
						marginVertical: 5,
						color: 'white',
						textDecorationLine: 'underline',
						marginBottom: 10,
					}}
				>
					https://tradeet.ng/{storeLink}
				</Text>

				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'flex-end',
					}}
				>
					<Image
						source={require('@/assets/images/google-play.png')}
						style={{
							height: 30,
							width: '50%',
							resizeMode: 'contain',
						}}
					/>
				</View>
			</LinearGradient>
		</View>
	);
};

export default StoreCard;
