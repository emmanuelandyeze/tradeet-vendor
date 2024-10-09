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
} from 'react-native';
import {
	useRouter,
	useLocalSearchParams,
} from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function StoreScreen() {
	const { storeName, storeLink } = useLocalSearchParams();
	const router = useRouter();
	const [selectedProduct, setSelectedProduct] =
		useState(null);
	const [quantity, setQuantity] = useState(1);
	const [selectedVariant, setSelectedVariant] =
		useState(null);
	const [selectedAddOns, setSelectedAddOns] = useState([]);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [totalPrice, setTotalPrice] = useState(0);

	// Restaurant information and products array
	const restaurantDetails = {
		openingHours: '9 AM - 7 PM',
		deliveryTime: '45-60 minutes',
		products: [
			{
				id: 1,
				name: 'Manchester City Home',
				price: 1700,
				image:
					'https://res.cloudinary.com/dkhoomk9a/image/upload/v1726521995/zwsyuvszxqpfodcfrl4f.jpg',
				variants: [
					{ name: 'Without customization', price: 17000 },
					{ name: 'With customization', price: 20000 },
				],
				addOns: [
					// {
					// 	name: 'Extra Cheese',
					// 	price: 200,
					// 	compulsory: false,
					// },
					// { name: 'Bacon', price: 300, compulsory: false },
					// { name: 'Lettuce', price: 50, compulsory: true },
				],
				description:
					'Payment on delivery within Lagos Sizes Available M to XL👕👕',
			},
			{
				id: 2,
				name: 'Arsenal Home',
				price: 17000,
				image:
					'https://res.cloudinary.com/dkhoomk9a/image/upload/v1726521649/zqy61pijasrdq7lwsgze.jpg',
				variants: [
					{ name: 'Without customization', price: 17000 },
					{ name: 'With customization', price: 20000 },
				],
				addOns: [
					// {
					// 	name: 'Extra Cheese',
					// 	price: 300,
					// 	compulsory: false,
					// },
					// { name: 'Olives', price: 100, compulsory: true },
				],
				description:
					'Payment on delivery within Lagos Sizes Available M to XL👕👕',
			},
			{
				id: 3,
				name: 'Air Jordan',
				price: 27000,
				image:
					'https://res.cloudinary.com/dkhoomk9a/image/upload/v1726518643/nlwhybjeljojmftkkw8b.jpg',
				variants: [
					{ name: 'Size - 41', price: 27000 },
					{ name: 'Size - 42', price: 27000 },
					{ name: 'Size - 43', price: 27000 },
					{ name: 'Size - 44', price: 29000 },
					{ name: 'Size - 45', price: 32000 },
					{ name: 'Size - 46', price: 36000 },
				],
				addOns: [
					// {
					// 	name: 'Extra Cheese',
					// 	price: 300,
					// 	compulsory: false,
					// },
					// { name: 'Olives', price: 100, compulsory: true },
				],
				description:
					'Payment on delivery within Lagos 42 to 46 👟👟',
			},
			{
				id: 4,
				name: 'Dr. Mertens Boots',
				price: 47000,
				image:
					'https://res.cloudinary.com/dkhoomk9a/image/upload/v1726517563/w4b4vlikgtfijhnxxwne.jpg',
				variants: [
					{ name: 'Size - 41', price: 47000 },
					{ name: 'Size - 42', price: 47000 },
					{ name: 'Size - 43', price: 47000 },
					{ name: 'Size - 44', price: 49000 },
					{ name: 'Size - 45', price: 52000 },
					{ name: 'Size - 46', price: 56000 },
				],
				addOns: [
					// {
					// 	name: 'Extra Cheese',
					// 	price: 300,
					// 	compulsory: false,
					// },
					// { name: 'Olives', price: 100, compulsory: true },
				],
				description:
					'Payment on delivery within Lagos 42 to 46 👟👟',
			},
		],
	};

	// Function to handle "Add to Cart" button click
	const handleAddToCart = (product) => {
		setSelectedProduct(product);
		setQuantity(1); // Reset quantity
		setSelectedVariant(product.variants[0]); // Default to the first variant
		setSelectedAddOns(
			product.addOns.filter((addOn) => addOn.compulsory),
		); // Auto-select compulsory add-ons
		setIsDrawerOpen(true); // Open the drawer
	};

	// Function to handle variant selection
	const handleVariantSelect = (variant) => {
		setSelectedVariant(variant);
	};

	// Function to handle add-on selection
	const handleAddOnSelect = (addOn) => {
		if (selectedAddOns.includes(addOn)) {
			setSelectedAddOns((prev) =>
				prev.filter((a) => a !== addOn),
			);
		} else {
			setSelectedAddOns((prev) => [...prev, addOn]);
		}
	};

	// Function to calculate the total price
	const calculateTotalPrice = () => {
		if (!selectedProduct || !selectedVariant) return 0;

		// Base price from the selected variant
		let price = selectedVariant.price;

		// Add the prices of selected add-ons
		selectedAddOns.forEach((addOn) => {
			price += addOn.price;
		});

		// Multiply by quantity
		price *= quantity;

		setTotalPrice(price);
	};

	// Recalculate total price when selectedVariant, selectedAddOns, or quantity changes
	useEffect(() => {
		calculateTotalPrice();
	}, [selectedVariant, selectedAddOns, quantity]);

	// Function to handle quantity change
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
					style={styles.addButton}
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
							size={16}
							color="black"
						/>
					</TouchableOpacity>
					<TouchableOpacity style={styles.iconButton}>
						<Ionicons
							name="share-social-outline"
							size={16}
							color="black"
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Restaurant Details */}
			<View style={styles.restaurantInfo}>
				<Text>
					Opening Hours: {restaurantDetails.openingHours}
				</Text>
				<Text>
					Estimated Delivery:{' '}
					{restaurantDetails.deliveryTime}
				</Text>
			</View>

			{/* Products Grid */}
			<FlatList
				data={restaurantDetails.products}
				renderItem={renderProduct}
				keyExtractor={(item) => item.id.toString()}
				numColumns={1}
				contentContainerStyle={styles.grid}
				showsVerticalScrollIndicator={false}
			/>

			{/* Drawer Modal for Product Details */}
			{isDrawerOpen && selectedProduct && (
				<Modal
					visible={isDrawerOpen}
					transparent
					animationType="slide"
					onRequestClose={closeDrawer}
				>
					<View style={styles.drawer}>
						<Image
							source={{ uri: selectedProduct.image }}
							style={styles.selectedProductImage}
						/>
						{/* Product Details */}
						<View
							style={{
								display: 'flex',
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 10,
							}}
						>
							<Text
								style={{ fontSize: 22, fontWeight: 'bold' }}
							>
								{selectedProduct.name}
							</Text>
						</View>
						<Text style={styles.productPrice}>
							{selectedProduct.description}
						</Text>

						{/* Variants Selection */}
						{selectedProduct.variants.map((variant) => (
							<View
								key={variant.name}
								style={{
									display: 'flex',
									flexDirection: 'row',
									alignItems: 'center',
									marginVertical: 4,
								}}
							>
								<TouchableOpacity
									style={[
										styles.addOnCheckbox,
										selectedVariant === variant
											? styles.selectedAddOn
											: null,
									]}
									onPress={() =>
										handleVariantSelect(variant)
									}
								/>
								<Text
									style={{ marginLeft: 8, fontSize: 18 }}
								>
									{variant.name} - ₦{variant.price}
								</Text>
							</View>
						))}

						<View
							style={{
								borderTopWidth: 1,
								marginTop: 15,
								borderTopColor: 'gray',
								paddingVertical: 10,
							}}
						>
							<Text style={{ fontSize: 20 }}>
								Choose Add-ons
							</Text>
						</View>
						{/* Add-ons Selection */}
						{selectedProduct.addOns.map((addOn) => (
							<View
								key={addOn.name}
								style={{
									display: 'flex',
									flexDirection: 'row',
									alignItems: 'center',
									marginVertical: 4,
								}}
							>
								<TouchableOpacity
									style={[
										styles.addOnCheckbox,
										selectedAddOns.includes(addOn)
											? styles.selectedAddOn
											: null,
									]}
									onPress={() => handleAddOnSelect(addOn)}
								/>
								<Text
									style={{ marginLeft: 8, fontSize: 18 }}
								>
									{addOn.name} - ₦{addOn.price}
									{addOn.compulsory && (
										<Text> (Required)</Text>
									)}
								</Text>
							</View>
						))}

						<TouchableOpacity
							style={{
								position: 'absolute',
								right: 10,
								top: 15,
								backgroundColor: '#000',
								width: 35,
								padding: 5,
								borderRadius: 70,
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
								zIndex: 100,
							}}
							onPress={() => {
								// Handle adding to cart logic
								closeDrawer();
							}}
						>
							<Text style={{ fontSize: 22, color: '#fff' }}>
								X
							</Text>
						</TouchableOpacity>

						<View
							style={{
								display: 'flex',
								alignItems: 'center',
								flexDirection: 'row',
								gap: 10,
								width: '100%',
								justifyContent: 'space-between',
								marginTop: 15,
							}}
						>
							{/* Quantity Controls */}
							<View
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									justifyContent: 'space-between',
									// marginVertical: 16,
									width: '32%',
									borderWidth: 1,
									borderRadius: 5,
								}}
							>
								<TouchableOpacity
									style={{ padding: 12, borderRadius: 15 }}
									onPress={() =>
										handleQuantityChange('decrease')
									}
								>
									<Text style={styles.quantityButtonText}>
										-
									</Text>
								</TouchableOpacity>
								<Text style={styles.quantityText}>
									{quantity}
								</Text>
								<TouchableOpacity
									style={{ padding: 12, borderRadius: 15 }}
									onPress={() =>
										handleQuantityChange('increase')
									}
								>
									<Text style={styles.quantityButtonText}>
										+
									</Text>
								</TouchableOpacity>
							</View>

							{/* Add to Cart Button */}
							<TouchableOpacity
								style={{
									backgroundColor: '#27D367',
									padding: 12,
									borderRadius: 5,
									alignItems: 'center',
									width: '65%',
								}}
							>
								<Text
									style={{
										color: '#fff',
										fontWeight: 'bold',
										fontSize: 22,
									}}
								>
									Add to Cart{' '}
									<Text
										style={{
											fontSize: 22,
											fontWeight: 'bold',
										}}
									>
										(₦{totalPrice})
									</Text>
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	storeName: {
		fontSize: 22,
		fontWeight: 'bold',
		marginLeft: 5,
	},
	iconButton: {
		backgroundColor: '#F2F2F2',
		padding: 4,
		borderRadius: 50,
		marginLeft: 10,
	},
	restaurantInfo: {
		marginBottom: 16,
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		paddingBottom: 10,
		borderBottomColor: '#F2F2F2',
		marginHorizontal: 5,
	},
	grid: {
		paddingBottom: 40,
	},
	productCard: {
		backgroundColor: '#fff',
		// borderRadius: 10,
		paddingHorizontal: 10,
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		// marginBottom: 16,
		elevation: 1,
		width: '100%',
		borderBottomWidth: 1,
		borderBottomColor: '#F2F2F2',
		paddingVertical: 14,
	},
	productImage: {
		width: '100%',
		height: 80,
		// borderRadius: 8,
		margin: 0,
	},
	productName: {
		fontWeight: 'normal',
		fontSize: 18,
		marginBottom: 4,
	},
	productPrice: {
		color: '#888',
		marginBottom: 8,
	},
	addButton: {
		backgroundColor: '#CCF3E5',
		padding: 5,
		// width: 70,
		margin: 0,
		justifyContent: 'center',
		textAlign: 'center',
		display: 'flex',
		alignItems: 'center',
	},
	addButtonText: {
		color: '#121212',
		fontWeight: 'normal',
	},
	drawer: {
		backgroundColor: '#f8f8f8',
		position: 'absolute',
		bottom: 0,
		width: '100%',
		borderTopLeftRadius: 40,
		borderTopRightRadius: 40,
		padding: 16,
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 5,
		},
		borderWidth: 1,
	},
	selectedProductImage: {
		width: '100%',
		height: 250,
		// borderRadius: 8,
		margin: 0,
		resizeMode: 'contain',
	},
	productDrawerTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	quantityContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginVertical: 16,
		width: '32%',
		borderWidth: 1,
		borderRadius: 5,
	},
	quantityButton: {
		// backgroundColor: '#f0f0f0',
		padding: 12,
		borderRadius: 15,
	},
	quantityText: {
		fontSize: 18,
	},
	addToCartButton: {
		backgroundColor: '#27D367',
		paddingHorizontal: 15,
		borderRadius: 5,
		alignItems: 'center',
		width: '100%',
	},
	addToCartButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	quantityContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 10,
	},
	quantityButton: {
		width: 40,
		height: 40,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f0f0f0',
		borderRadius: 20,
	},
	quantityButtonText: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	quantityText: {
		fontSize: 18,
		fontWeight: 'bold',
		marginHorizontal: 20,
	},
	addToCartButton: {
		backgroundColor: '#27D367',
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 16,
	},
	addToCartButtonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
	variantButton: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 4,
		backgroundColor: '#f0f0f0',
		marginVertical: 4,
	},
	selectedVariantButton: {
		backgroundColor: '#27D367',
	},
	addOnCheckbox: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#27D367',
	},
	selectedAddOn: {
		backgroundColor: '#27D367',
	},
});
