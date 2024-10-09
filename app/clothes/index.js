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
			name: 'Big Sam Collections',
			category: 'Jersey',
			image:
				'https://res.cloudinary.com/dkhoomk9a/image/upload/v1726521928/xq6vb6tkucltmc0xqqpp.jpg',
			rating: 4.5,
			estimatedDelivery: '45 - 60 minutes',
			discount: '10% Off',
			storeLink: 'bigsamcollection',
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
					pathname: '/clothes/[storeName]',
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
						Select your favourite vendor
					</Text>
					<Text></Text>
				</View>
				<TextInput
					style={styles.searchBar}
					placeholder="Search vendors..."
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
