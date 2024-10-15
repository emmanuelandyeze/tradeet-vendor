import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	Button,
	Image,
	FlatList,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function FoodScreen() {
	const [searchQuery, setSearchQuery] = useState('');
	const [category, setCategory] = useState('All');
	const router = useRouter();

	const restaurants = [
		{
			id: 1,
			name: 'Chops by Idy',
			category: 'Fast Food',
			image:
				'https://justfantastic.com.ng/wp-content/uploads/2017/07/Small-Chops-Small-1.jpg',
			rating: 4.5,
			estimatedDelivery: '30 mins',
			discount: '10% Off',
			storeLink: 'chopsbyId',
		},
		{
			id: 2,
			name: 'Mama’s Kitchen',
			category: 'Local Dishes',
			image:
				'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcznAHVpW9uCeHqF3hc9gSrdHhyGf031HfNA&s',
			rating: 4.0,
			estimatedDelivery: '45 mins',
			storeLink: 'mamaskitchen',
		},
		{
			id: 3,
			name: 'Pizza Palace',
			category: 'Italian',
			image:
				'https://static.vecteezy.com/system/resources/thumbnails/045/383/391/small/a-cheesy-delicious-pizza-with-tasty-pepperoni-on-a-transparent-background-png.png',
			rating: 4.7,
			estimatedDelivery: '20 mins',
			discount: '15% Off',
			storeLink: 'pizzapalace',
		},
		{
			id: 4,
			name: 'Burgers & Fries',
			category: 'Fast Food',
			image:
				'https://static.vecteezy.com/system/resources/previews/036/333/896/original/ai-generated-crispy-chicken-burger-with-fries-meal-png.png',
			rating: 4.3,
			estimatedDelivery: '25 mins',
			storeLink: 'burgersandfries',
		},
		{
			id: 5,
			name: 'Rockshealthy',
			category: 'Parfait',
			image:
				'https://png.pngtree.com/png-vector/20231019/ourmid/pngtree-parfait-ice-cream-png-image_10252074.png',
			rating: 4.9,
			estimatedDelivery: '15 mins',
			storeLink: 'rockshealthy',
		},
		{
			id: 6,
			name: 'Crunch It',
			category: 'Snacks',
			image:
				'https://zambiankitchen.com/wp-content/uploads/2023/08/20230820_124557_0000.png',
			rating: 4.4,
			estimatedDelivery: '35 mins',
			discount: '5% Off',
			storeLink: 'crunchit',
		},
	];

	// Extract unique categories from the restaurants array
	const categories = [
		'All',
		...new Set(restaurants.map((r) => r.category)),
	];

	const filteredRestaurants = restaurants.filter(
		(restaurant) => {
			const matchesCategory =
				category === 'All' ||
				restaurant.category === category;
			const matchesSearch = restaurant.name
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
			return matchesCategory && matchesSearch;
		},
	);

	const renderRestaurant = ({ item }) => (
		<TouchableOpacity
			style={styles.restaurantCard}
			onPress={() =>
				router.push({
					pathname: '/food/[storeName]',
					params: {
						storeName: item.name, // First parameter
						storeLink: item.storeLink, // Second parameter
					},
				})
			}
		>
			<View style={styles.imageContainer}>
				<Image
					source={{ uri: item.image }}
					style={styles.restaurantImage}
				/>
				{item.discount && (
					<View style={styles.discountBadge}>
						<Text style={styles.discountText}>
							{item.discount}
						</Text>
					</View>
				)}
			</View>
			<Text style={styles.restaurantName}>{item.name}</Text>
			<Text style={styles.restaurantDetails}>
				⭐ {item.rating} • {item.estimatedDelivery}
			</Text>
		</TouchableOpacity>
	);

	return (
		<View
			style={{
				paddingTop: 40,
				paddingHorizontal: 16,
				paddingBottom: 60,
				// flex: 1,
			}}
		>
			<View
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 3,
					alignItems: 'flex-start',
					marginBottom: 16,
					width: '100%',
				}}
			>
				<View
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						marginBottom: 15,
						justifyContent: 'space-between',
						width: '100%',
					}}
				>
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons
							name="chevron-back-outline"
							size={24}
							color="black"
						/>
					</TouchableOpacity>
					<Text
						style={{ fontSize: 22, fontWeight: 'bold' }}
					>
						Select your favourite food vendor
					</Text>
					<Text></Text>
				</View>
				<TextInput
					style={styles.searchBar}
					placeholder="Search restaurants..."
					value={searchQuery}
					onChangeText={(text) => setSearchQuery(text)}
				/>
			</View>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.filterContainer}
			>
				{categories.map((cat) => (
					<TouchableOpacity
						key={cat}
						style={[
							styles.categoryButton,
							category === cat && styles.activeCategory,
						]}
						onPress={() => setCategory(cat)}
					>
						<Text
							style={
								category === cat
									? styles.activeCategoryText
									: styles.categoryText
							}
						>
							{cat}
						</Text>
					</TouchableOpacity>
				))}
			</ScrollView>

			<FlatList
				data={filteredRestaurants}
				keyExtractor={(item) => item.id.toString()}
				renderItem={renderRestaurant}
				numColumns={2}
				columnWrapperStyle={styles.columnWrapper}
				contentContainerStyle={styles.grid}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	searchBar: {
		height: 40,
		borderColor: '#bbb',
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 10,
		fontSize: 18,
		width: '100%',
	},
	filterContainer: {
		flexDirection: 'row',
		marginBottom: 16,
	},
	categoryButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: '#eee',
		marginRight: 8,
	},
	activeCategory: {
		backgroundColor: '#27D367',
	},
	categoryText: {
		fontSize: 14,
		color: '#000',
	},
	activeCategoryText: {
		fontSize: 16,
		color: '#fff',
	},
	grid: {
		paddingBottom: 78,
	},
	columnWrapper: {
		justifyContent: 'space-between',
	},
	restaurantCard: {
		backgroundColor: '#f8f8f8',
		borderRadius: 10,
		paddingBottom: 10,
		alignItems: 'center',
		marginBottom: 16,
		width: '48%',
		elevation: 1,
	},
	imageContainer: {
		position: 'relative',
		width: '100%',
	},
	restaurantImage: {
		width: '100%',
		height: 150,
		borderTopRightRadius: 8,
		borderTopLeftRadius: 8,
	},
	discountBadge: {
		position: 'absolute',
		top: 8,
		right: 8,
		backgroundColor: 'red',
		borderRadius: 5,
		padding: 4,
	},
	discountText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 12,
	},
	restaurantName: {
		marginTop: 8,
		fontWeight: 'bold',
		fontSize: 16,
	},
	restaurantDetails: {
		color: '#555',
		fontSize: 14,
		marginTop: 4,
		textAlign: 'left',
	},
});
