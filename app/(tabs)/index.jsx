import React from 'react';
import {
	Image,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
// Adjust the import path as needed
import Header from '@/components/Header';
import ServicesSection from '@/components/Services';
import OffersSection from '@/components/Offers';
import EventsSection from '@/components/Events';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  const router = useRouter()
	const services = [
		{
			id: 1,
			icon: require('../../assets/splash1.png'),
			title: 'Food Ordering',
			onPress: () => {
				router.push('food');
			},
			backgroundColor: '#EBF4FF',
		},
		{
			id: 2,
			icon: require('../../assets/splash2.png'),
			title: 'Services',
			onPress: () => {
				router.push('services');
			},
			backgroundColor: '#FFF9E6',
		},
		{
			id: 3,
			icon: require('../../assets/splash4.png'),
			title: 'Clothes',
			onPress: () => {
				router.push('clothes');
			},
			backgroundColor: '#FFF0F5',
		},
		{
			id: 4,
			icon: require('../../assets/splash5.png'),
			title: 'Accessories',
			onPress: () => {
				router.push('accessories');
			},
			backgroundColor: '#FFEDB3',
		},
		{
			id: 5,
			icon: require('../../assets/splash6.png'),
			title: 'Gadgets',
			onPress: () => {},
			backgroundColor: '#FFF0F5',
		},
		{
			id: 6,
			icon: require('../../assets/splash3.png'),
			title: 'Errands',
			onPress: () => {},
			backgroundColor: '#EBF4FF',
		},
	];

	const offers = [
		{
			id: 3,
			title: '10% off food orders!',
			details: 'Valid until October 15th',
			imageUrl:
				'https://static.vecteezy.com/system/resources/previews/008/174/590/non_2x/fashion-advertising-web-banner-illustration-vector.jpg',
		},
		{
			id: 2,
			title: '10% off food orders!',
			details: 'Valid until October 15th',
			imageUrl:
				'https://www.shutterstock.com/image-vector/delicious-homemade-burger-chili-bbq-260nw-1804330342.jpg',
		},
		{
			id: 4,
			title: '10% off food orders!',
			details: 'Valid until October 15th',
			imageUrl:
				'https://res.cloudinary.com/dkhoomk9a/image/upload/v1727253595/legacy-atelier/file_1727253595723.jpg',
		},
	];
  
  const events = [
		{
			id: 1,
			name: 'Tech Conference 2024',
			image:
				'https://lh3.googleusercontent.com/TB28MyQIbJcVzBXx5vhwc_UMtNFLEmaP0qIGwkytm5Imwo0XJOl9OdtETt6pHbrKkxlXdZe3IrtBfkYjDHjCfm5Ju6Q8WMa_y8qk7OhNUVaquDcru2K_YWFZvpK2dK_uriNQUB41ra2mYbvVnyeO8Lo',
			location: 'Lagos, Nigeria',
			time: 'October 15, 2024, 9:00 AM',
			onRegister: () =>
				console.log('Registering for Tech Conference 2024'),
		},
		
		{
			id: 3,
			name: 'Startup Pitch Event',
			image:
				'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F823799869%2F1047771334433%2F1%2Foriginal.20240809-102606?w=512&auto=format%2Ccompress&q=75&sharp=10&rect=0%2C0%2C2160%2C1080&s=0bcdbe2041075599aaafef02e49a4b96',
			location: 'Port Harcourt, Nigeria',
			time: 'December 5, 2024, 11:00 AM',
			onRegister: () =>
				console.log('Registering for Startup Pitch Event'),
		},
	];


	return (
		<View className="flex-1 w-full bg-white">
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			{/* Header */}
			<View
			// className="pt-10 pb-10 px-4 flex justify-between flex-row items-start bg-red-200"
			>
				<Header
					profileImage="https://lh3.googleusercontent.com/a/AEdFTp5kkk2o05BEXoptDUxBywu9mKC8M1pyQm5-L_Zb=s96-c"
					campus="Yabatech"
					onSearch={(text) => console.log(text)}
					name="Emmanuel"
				/>
			</View>
			<ScrollView>
				{/* Offers Section */}
				<OffersSection offers={offers} />

				{/* Services Section */}
				<ServicesSection services={services} />

				{/* Events Section  */}
				{/* <EventsSection events={events} /> */}
			</ScrollView>

			<TouchableOpacity
				style={{
					backgroundColor: '#101010',
					width: 50,
					height: 50,
					display: 'flex',
					justifyContent: 'center',
					flexDirection: 'column',
					alignItems: 'center',
					borderRadius: 50,
					position: 'absolute',
					bottom: 20,
					right: 20,
				}}
			>
				<AntDesign
					name="customerservice"
					size={28}
					color="white"
				/>
			</TouchableOpacity>
		</View>
	);
}
