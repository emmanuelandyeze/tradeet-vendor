import React, { useState, useRef, useEffect } from 'react';
import {
	Image,
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const OfferCard = ({
	offerText,
	offerDetails,
	imageUrl,
	onPress,
}) => {
	return (
		<TouchableOpacity
			onPress={onPress}
			style={{ width: Dimensions.get('window').width + 2, marginHorizontal: 'auto', borderRadius: 15 }}
		>
			<View
				// style={{ borderRadius: 15, elevation: 5 }}
				className="bg-white mb-4 shadow-sm rounded-lg"
			>
				<Image
					source={{ uri: imageUrl }}
					style={{
						width: '92%',
						height: 180,
						resizeMode: 'cover',
						borderRadius: 15,
						elevation: 5
					}}
				/>
				
			</View>
		</TouchableOpacity>
	);
};

export default function OffersSection({ offers }) {
	const [activeIndex, setActiveIndex] = useState(0);
	const scrollViewRef = useRef(null);
	const navigation = useNavigation();
	const screenWidth = Dimensions.get('window').width;

	// Automatically scroll to the next image every 3 seconds
	useEffect(() => {
		const intervalId = setInterval(() => {
			setActiveIndex(
				(prevIndex) => (prevIndex + 1) % offers.length,
			);
		}, 4000); // Change image every 3 seconds

		return () => clearInterval(intervalId); // Cleanup on component unmount
	}, [offers.length]);

	useEffect(() => {
		if (scrollViewRef.current) {
			scrollViewRef.current.scrollTo({
				x: activeIndex * screenWidth,
				animated: true,
			});
		}
	}, [activeIndex, screenWidth]);

	const handleOfferClick = (offer) => {
		navigation.navigate('OfferDetails', {
			offerId: offer.id,
		});
	};

	const handleManualScroll = (event) => {
		const scrollPosition =
			event.nativeEvent.contentOffset.x;
		const currentIndex = Math.round(
			scrollPosition / screenWidth,
		);
		setActiveIndex(currentIndex);
	};

	return (
		<View className="px-4 mt-1">
			<ScrollView
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				ref={scrollViewRef}
				onMomentumScrollEnd={handleManualScroll}
				scrollEventThrottle={16}
			>
				{offers.map((offer) => (
					<OfferCard
						key={offer.id}
						offerText={offer.title}
						offerDetails={offer.details}
						imageUrl={offer.imageUrl}
						onPress={() => handleOfferClick(offer)}
					/>
				))}
			</ScrollView>
			{/* Pagination dots */}
			<View
				style={{
					flexDirection: 'row',
					justifyContent: 'center',
					marginTop: 1,
				}}
			>
				{offers.map((_, index) => (
					<View
						key={index}
						style={{
							width: 8,
							height: 8,
							borderRadius: 4,
							backgroundColor:
								activeIndex === index ? '#000' : '#ccc',
							marginHorizontal: 3,
						}}
					/>
				))}
			</View>
		</View>
	);
}
