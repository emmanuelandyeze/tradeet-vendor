import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	Image,
	FlatList,
	StyleSheet,
	Modal,
	Button,
	ScrollView,
} from 'react-native';
import {
	useRouter,
	useLocalSearchParams,
} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StoreScreen() {
	const { storeName, storeLink } = useLocalSearchParams();
	const router = useRouter();
	const [selectedProduct, setSelectedProduct] =
		useState(null);
	const [quantity, setQuantity] = useState(1);
	const [selectedVariant, setSelectedVariant] = useState(
		[],
	);
	const [selectedVariants, setSelectedVariants] = useState(
		[],
	);
	const [selectedAddOns, setSelectedAddOns] = useState([]);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [totalPrice, setTotalPrice] = useState(0);
	const [cart, setCart] = useState([]);

	// Restaurant information and products array
	const restaurantDetails = {
		openingHours: '9 AM - 10 PM',
		deliveryTime: '30-45 minutes',
		products: [
			{
				id: 1,
				name: 'Classic Burger',
				price: 1200,
				image:
					'https://static.vecteezy.com/system/resources/previews/036/333/896/original/ai-generated-crispy-chicken-burger-with-fries-meal-png.png',
				variants: [
					{ name: 'Single', price: 1200 },
					{ name: 'Double', price: 1800 },
					{ name: 'Cheese', price: 1500 },
				],
				addOns: [
					{
						name: 'Extra Cheese',
						price: 200,
						compulsory: false,
					},
					{ name: 'Bacon', price: 300, compulsory: false },
					{ name: 'Lettuce', price: 50, compulsory: true },
				],
				description:
					'Cheese variant with single and double options.',
			},
			{
				id: 2,
				name: 'Pizza Margherita',
				price: 2500,
				image:
					'https://static.vecteezy.com/system/resources/thumbnails/045/383/391/small/a-cheesy-delicious-pizza-with-tasty-pepperoni-on-a-transparent-background-png.png',
				variants: [
					{ name: 'Small', price: 1500 },
					{ name: 'Medium', price: 2500 },
					{ name: 'Large', price: 3500 },
				],
				addOns: [
					{
						name: 'Extra Cheese',
						price: 300,
						compulsory: false,
					},
					{ name: 'Olives', price: 100, compulsory: true },
				],
				description:
					'Small, medium, and large sizes available.',
			},
			{
				id: 3,
				name: 'Rice',
				price: 400,
				image:
					'https://pbs.twimg.com/media/FBBEJwWWEAAY0q9.jpg:large',
				variants: [
					{ name: 'Jollof rice', price: 400 },
					{ name: 'Fried rice', price: 500 },
				],
				addOns: [
					{
						name: 'Plantain',
						price: 300,
						compulsory: false,
					},
					{
						name: 'Chicken',
						price: 2000,
						compulsory: false,
					},
					{
						name: 'Turkey',
						price: 2500,
						compulsory: false,
					},
					{
						name: 'Take away pack',
						price: 200,
						compulsory: true,
					},
				],
				description:
					'Small, medium, and large sizes available.',
			},
			{
				id: 4,
				name: 'Beans',
				price: 400,
				image:
					'https://waracake.com/wp-content/uploads/2021/05/1610738789-1024x1024.jpeg',
				variants: [
					{ name: 'Ewa Agoyin', price: 400 },
					// { name: 'Fried rice', price: 500 },
				],
				addOns: [
					{
						name: 'Plantain',
						price: 300,
						compulsory: false,
					},

					{
						name: 'Chicken',
						price: 2000,
						compulsory: false,
					},
					{
						name: 'Turkey',
						price: 2500,
						compulsory: false,
					},
					{
						name: 'Meat',
						price: 200,
						compulsory: false,
					},
					{
						name: 'Bread',
						price: 500,
						compulsory: false,
					},
					{
						name: 'Take away pack',
						price: 200,
						compulsory: true,
					},
				],
				description:
					'Small, medium, and large sizes available.',
			},
		],
	};

	// Function to handle "Add to Cart" button click
	const handleAddToCart = (product) => {
		setSelectedProduct(product);
		setQuantity(1); // Reset quantity
		setSelectedVariants(
			product.variants.map((variant, index) => ({
				...variant,
				quantity: index === 0 ? 1 : 0, // Set quantity of the first variant to 1, others to 0
			})),
		);
		setSelectedAddOns(
			product.addOns.map((addOn) => ({
				...addOn,
				quantity: addOn.compulsory ? 1 : 0, // Default to 1 for compulsory add-ons
			})),
		); // Initialize add-ons with quantities
		setIsDrawerOpen(true); // Open the drawer
	};

	// Function to handle add-on quantity change
	const handleAddOnQuantityChange = (addOn, action) => {
		setSelectedAddOns((prev) =>
			prev.map((a) =>
				a.name === addOn.name
					? {
							...a,
							quantity:
								action === 'increase'
									? a.quantity + 1
									: a.quantity > 0
									? a.quantity - 1
									: 0,
					  }
					: a,
			),
		);
	};

	// Function to handle variant quantity change
	const handleVariantQuantityChange = (variant, action) => {
		setSelectedVariants((prev) =>
			prev.map((v) =>
				v.name === variant.name
					? {
							...v,
							quantity:
								action === 'increase'
									? v.quantity + 1
									: v.quantity > 0
									? v.quantity - 1
									: 0, // Allow quantity to go down to 0
					  }
					: v,
			),
		);
	};

	const calculateTotalPrice = () => {
		if (!selectedProduct || selectedVariants.length === 0)
			return 0;

		// Base price from the selected variants
		let price = selectedVariants.reduce(
			(total, variant) =>
				total + variant.price * variant.quantity,
			0,
		);

		// Add the prices of selected add-ons with quantities
		selectedAddOns.forEach((addOn) => {
			price += addOn.price * addOn.quantity;
		});

		// Multiply by quantity of the product
		price *= quantity;

		setTotalPrice(price);
	};

	// Recalculate total price when selectedVariant, selectedAddOns, or quantity changes
	useEffect(() => {
		calculateTotalPrice();
	}, [selectedVariants, selectedAddOns, quantity]);

	// useEffect(() => {
	// 	// Check if the product has variants and set the first one by default
	// 	if (selectedProduct?.variants.length > 0) {
	// 		const firstVariant = selectedProduct.variants[0];
	// 		setSelectedVariants([
	// 			{ ...firstVariant, quantity: 1 },
	// 		]);
	// 	}
	// }, [selectedProduct]);

	// Function to handle quantity change for product
	const handleQuantityChange = (action) => {
		if (action === 'increase') {
			setQuantity(quantity + 1);
		} else if (action === 'decrease' && quantity > 1) {
			setQuantity(quantity - 1);
		}
	};

	// Function to close drawer
	const closeDrawer = () => {
		setIsDrawerOpen(false);
		setSelectedProduct(null);
	};

	// Function to handle "Add to Cart" and store in AsyncStorage
	const handleAddToCartAndStore = async () => {
		const cartItem = {
			product: selectedProduct.name,
			variants: selectedVariants.filter(
				(variant) => variant.quantity > 0,
			),
			addOns: selectedAddOns.filter(
				(addOn) => addOn.quantity > 0,
			),
			quantity,
			totalPrice,
		};

		const existingCart = await AsyncStorage.getItem('cart');
		const cart = existingCart
			? JSON.parse(existingCart)
			: [];
		cart.push(cartItem);

		await AsyncStorage.setItem(
			'cart',
			JSON.stringify(cart),
		);

		setCart(cart); // Update local cart state
		closeDrawer(); // Close drawer
	};

	const renderProduct = ({ item }) => (
		<View style={styles.productCard}>
			<View
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 10,
					width: '60%',
				}}
			>
				<Text style={styles.productName}>{item.name}</Text>
				<Text style={styles.productPrice}>
					{item.description}
				</Text>
				<Text style={styles.productName}>
					From ₦{item.price}
				</Text>
			</View>
			<View
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: '30%',
				}}
			>
				<Image
					source={{ uri: item.image }}
					style={styles.productImage}
				/>
				<TouchableOpacity
					style={{
						backgroundColor: '#27D367',
						paddingVertical: 5,
					}}
					onPress={() => handleAddToCart(item)}
				>
					<Text style={styles.addButtonText}>Add +</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	return (
		<View
			style={{
				paddingTop: 40,
				paddingHorizontal: 16,
				flex: 1,
				paddingBottom: 20,
			}}
		>
			{/* Store Header */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<TouchableOpacity onPress={() => router.back()}>
						<Ionicons
							name="chevron-back-outline"
							size={24}
							color="black"
						/>
					</TouchableOpacity>
					<Text style={styles.storeName}>{storeName}</Text>
				</View>
				<View style={styles.headerRight}>
					<TouchableOpacity style={styles.iconButton}>
						<Ionicons
							name="heart-outline"
							size={26}
							color="black"
						/>
					</TouchableOpacity>
					<TouchableOpacity style={styles.iconButton}>
						<Ionicons
							name="search-outline"
							size={26}
							color="black"
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Products */}
			<FlatList
				data={restaurantDetails.products}
				keyExtractor={(item) => item.id.toString()}
				renderItem={renderProduct}
			/>

			{/* Modal for product customization */}
			<Modal
				visible={isDrawerOpen}
				animationType="slide"
				onRequestClose={closeDrawer}
			>
				<ScrollView style={styles.drawerContainer}>
					{/* Product Image */}
					<Image
						source={{ uri: selectedProduct?.image }}
						style={styles.drawerImage}
					/>

					{/* Product Details */}
					<Text style={styles.drawerTitle}>
						{selectedProduct?.name}
					</Text>
					<Text style={styles.drawerDescription}>
						{selectedProduct?.description}
					</Text>

					{/* Variant Selection */}
					<Text style={styles.sectionTitle}>Variants</Text>
					{selectedProduct?.variants.map(
						(variant, index) => (
							<View
								key={variant.name}
								style={styles.variantContainer}
							>
								<Text style={styles.addOnText}>
									{variant.name} - ₦{variant.price}
								</Text>

								{/* Quantity Control */}
								<View style={styles.quantityContainer}>
									<TouchableOpacity
										onPress={() =>
											handleVariantQuantityChange(
												variant,
												'decrease',
											)
										}
										style={styles.quantityButton}
									>
										<Text style={styles.quantityButtonText}>
											-
										</Text>
									</TouchableOpacity>
									<Text style={styles.quantityText}>
										{selectedVariants.find(
											(v) => v.name === variant.name,
										)?.quantity || 0}
									</Text>
									<TouchableOpacity
										onPress={() =>
											handleVariantQuantityChange(
												variant,
												'increase',
											)
										}
										style={styles.quantityButton}
									>
										<Text style={styles.quantityButtonText}>
											+
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						),
					)}

					{/* Add-ons Selection */}
					<Text style={styles.sectionTitle}>Add-ons</Text>
					{selectedProduct?.addOns.map((addOn) => (
						<View
							key={addOn.name}
							style={styles.addOnContainer}
						>
							<Text style={styles.addOnText}>
								{addOn.name} - ₦{addOn.price}
							</Text>

							{/* Quantity Control */}
							<View style={styles.quantityContainer}>
								<TouchableOpacity
									onPress={() => {
										if (!addOn.compulsory) {
											handleAddOnQuantityChange(
												addOn,
												'decrease',
											);
										}
									}}
									style={styles.quantityButton}
								>
									<Text style={styles.quantityButtonText}>
										-
									</Text>
								</TouchableOpacity>
								<Text style={styles.quantityText}>
									{
										selectedAddOns.find(
											(a) => a.name === addOn.name,
										)?.quantity
									}
								</Text>
								<TouchableOpacity
									onPress={() => {
										if (!addOn.compulsory) {
											handleAddOnQuantityChange(
												addOn,
												'increase',
											);
										}
									}}
									style={styles.quantityButton}
								>
									<Text style={styles.quantityButtonText}>
										+
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					))}

					<View
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							marginTop: 20,
							flexDirection: 'row',
						}}
					>
						{/* Product Quantity Control */}
						<View style={styles.quantityContainer}>
							<TouchableOpacity
								onPress={() =>
									handleQuantityChange('decrease')
								}
								style={styles.quantityButton}
							>
								<Text style={styles.quantityButtonText}>
									-
								</Text>
							</TouchableOpacity>
							<Text style={styles.quantityText}>
								{quantity}
							</Text>
							<TouchableOpacity
								onPress={() =>
									handleQuantityChange('increase')
								}
								style={styles.quantityButton}
							>
								<Text style={styles.quantityButtonText}>
									+
								</Text>
							</TouchableOpacity>
						</View>

						{/* Add to Cart Button */}
						<TouchableOpacity
							style={styles.addButton}
							onPress={handleAddToCartAndStore}
						>
							<Text style={styles.addButtonText}>
								Add to Cart (₦{totalPrice})
							</Text>
						</TouchableOpacity>
					</View>
					{/* Close Drawer Button */}
					<TouchableOpacity
						style={{
							position: 'absolute',
							top: 0,
							right: 0,
							zIndex: 100,
							backgroundColor: 'white',
							padding: 10,
							borderRadius: 5,
							shadowColor: '#000',
							shadowOffset: { width: 0, height: 2 },
							shadowOpacity: 0.2,
							shadowRadius: 4,
							elevation: 2,
							display: 'flex',
							flexDirection: 'row',
							justifyContent: 'center',
							alignItems: 'center',
							borderColor: '#ccc',
							borderWidth: 1,
							borderRadius: 5,
						}}
					>
						<Ionicons
							name="close-outline"
							size={24}
							color="black"
							onPress={closeDrawer}
						/>
					</TouchableOpacity>
				</ScrollView>
			</Modal>

			{/* Go to Checkout Button */}
			{cart.length > 0 && (
				<TouchableOpacity
					style={styles.checkoutButton}
					onPress={() => router.push('/checkout')}
				>
					<Text style={styles.checkoutButtonText}>
						Go to Checkout ({cart.length} items)
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerRight: {
		flexDirection: 'row',
	},
	iconButton: {
		marginLeft: 16,
	},
	storeName: {
		fontSize: 24,
		fontWeight: 'bold',
		marginLeft: 8,
	},
	productCard: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
		paddingHorizontal: 16,
		borderRadius: 8,
		backgroundColor: '#f9f9f9',
		borderBottomWidth: 1,
		borderColor: '#ccc',
		paddingTop: 14,
		paddingBottom: 24,
	},
	productName: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	productPrice: {
		fontSize: 16,
		color: '#888',
		marginBottom: 4,
	},
	productImage: {
		width: '100%',
		height: 80,
		resizeMode: 'cover',
		// borderRadius: 8,
	},
	addButton: {
		backgroundColor: '#27D367',
		paddingVertical: 15,
		paddingHorizontal: 12,
		borderRadius: 8,
		justifyContent: 'center',
		display: 'flex',
		width: '60%',
	},
	addButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		textAlign: 'center',
		fontSize: 16,
	},
	drawerContainer: {
		paddingHorizontal: 16,
		flex: 1,
		paddingVertical: 0,
	},
	drawerImage: {
		width: '100%',
		height: 280,
		resizeMode: 'cover',
		borderRadius: 8,
		marginBottom: 16,
	},
	drawerTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	drawerDescription: {
		fontSize: 16,
		color: '#888',
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	variantButton: {
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
	},
	variantButtonText: {
		fontSize: 16,
	},
	addOnContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	variantContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	addOnText: {
		fontSize: 16,
	},
	quantityContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#ccc',
		borderWidth: 1,
		paddingHorizontal: 8,
		borderRadius: 8,
	},
	quantityButton: {
		// backgroundColor: '#f0f0f0',
		borderRadius: 8,
		padding: 8,
	},
	quantityButtonText: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	quantityText: {
		fontSize: 16,
		marginHorizontal: 12,
	},
	totalPriceText: {
		fontSize: 18,
		fontWeight: 'bold',
		marginTop: 16,
		marginBottom: 16,
	},
	checkoutButton: {
		backgroundColor: '#27D367',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 16,
	},
	checkoutButtonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
});
