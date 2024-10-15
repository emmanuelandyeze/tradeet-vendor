import React, { useState } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
	StyleSheet,
	Button,
	Image,
	Switch,
} from 'react-native';
import AddProduct from '@/components/AddProduct';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const products = () => {
	const [products, setProducts] = useState([
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
		// Additional products can be added here...
	]);

	const [isModalVisible, setModalVisible] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [selectedProduct, setSelectedProduct] =
		useState(null);
	const [menuVisible, setMenuVisible] = useState(false);

	// Function to open menu for a specific product
	const openMenu = (product) => {
		setSelectedProduct(product);
		setMenuVisible(true);
	};

	// Function to close menu
	const closeMenu = () => {
		setMenuVisible(false);
		setSelectedProduct(null);
	};

	// Function to handle toggle
	const handleToggle = (isActive) => {
		setProducts(
			products.map((product) =>
				product.id === selectedProduct.id
					? { ...product, isActive }
					: product,
			),
		);
		closeMenu();
	};

	// Function to add a new product
	const onAddProduct = (newProduct) => {
		if (isEditing) {
			// Update the existing product
			setProducts(
				products.map((product) =>
					product.id === newProduct.id
						? newProduct
						: product,
				),
			);
		} else {
			// Add a new product
			setProducts([...products, newProduct]);
		}
		setModalVisible(false); // Close modal after adding/editing
	};

	// Function to delete a product
	const deleteProduct = (productId) => {
		setProducts(
			products.filter(
				(product) => product.id !== productId,
			),
		);
		closeMenu();
	};

	// Function to open the modal for adding or editing a product
	const openModal = (product = null) => {
		setIsEditing(!!product);
		setSelectedProduct(product);
		setModalVisible(true);
	};

	return (
		<View style={styles.container}>
			<View
				style={{
					paddingTop: 20,
					elevation: 3,
					backgroundColor: '#fff',
					paddingHorizontal: 16,
					paddingBottom: 20,
				}}
			>
				<View
					style={{
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<Text
						style={{ fontSize: 22, fontWeight: 'bold' }}
					>
						Products
					</Text>
					<TouchableOpacity>
						<Ionicons
							name="search-outline"
							size={22}
							color="black"
						/>
					</TouchableOpacity>
				</View>
			</View>
			<View style={{ flex: 1, padding: 16 }}>
				{/* List of Products */}
				<FlatList
					data={products}
					keyExtractor={(item) => item.id.toString()}
					renderItem={({ item }) => (
						<View style={styles.productCard}>
							{/* Product Image */}
							<Image
								source={{ uri: item.image }}
								style={styles.productImage}
								resizeMode="cover"
							/>

							{/* Product Info */}
							<View style={styles.productInfo}>
								<Text style={styles.productName}>
									{item.name}
								</Text>
								<Text>Price: ₦{item?.price.toLocaleString()}</Text>
								<Text
									style={{
										color: item.isActive ? 'green' : 'red',
									}}
								>
									{item.isActive ? 'Active' : 'Inactive'}
								</Text>
							</View>

							{/* Actions */}
							<View style={styles.actions}>
								{/* Edit Button */}
								<TouchableOpacity
									onPress={() => openModal(item)}
									// style={styles.actionButton}
								>
									<FontAwesome
										name="edit"
										size={24}
										color="black"
									/>
								</TouchableOpacity>

								{/* Menu Button */}
								<TouchableOpacity
									onPress={() => openMenu(item)}
									// style={styles.actionButton}
								>
									<MaterialCommunityIcons
										name="dots-vertical"
										size={24}
										color="black"
									/>
								</TouchableOpacity>
							</View>
						</View>
					)}
				/>
			</View>

			{/* Modal for Toggle & Delete */}
			{menuVisible && selectedProduct && (
				<Modal
					transparent={true}
					visible={menuVisible}
					onRequestClose={closeMenu}
				>
					<View style={styles.modalContainer}>
						<View style={styles.modalContent}>
							<Text style={styles.modalTitle}>
								{selectedProduct?.name}
							</Text>

							{/* Toggle Active/Inactive */}
							<View style={styles.toggleRow}>
								<Text style={styles.modalText}>
									{selectedProduct.isActive
										? 'Active'
										: 'Inactive'}
								</Text>
								<Switch
									value={selectedProduct.isActive}
									onValueChange={(value) =>
										handleToggle(value)
									}
								/>
							</View>

							{/* Delete Option */}
							<TouchableOpacity
								onPress={() => {
									deleteProduct(selectedProduct.id);
								}}
								style={styles.deleteButton}
							>
								<Text style={styles.deleteText}>
									Delete Product
								</Text>
							</TouchableOpacity>

							<TouchableOpacity onPress={closeMenu}>
								<Text style={styles.closeButton}>
									Close
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>
			)}

			{/* Button to Add Product */}
			<View
				style={{
					position: 'absolute',
					right: 16,
					bottom: 20,
				}}
			>
				<TouchableOpacity
					onPress={() => openModal()}
					style={{
						backgroundColor: 'green',
						padding: 6,
						borderRadius: 30,
						elevation: 3,
						shadowColor: 'black',
					}}
				>
					<Ionicons
						name="add-sharp"
						size={34}
						color="white"
					/>
				</TouchableOpacity>
			</View>

			{/* Modal for Adding/Editing Product */}
			<Modal visible={isModalVisible} animationType="slide">
				<View
					style={{
						backgroundColor: '#fff',
						margin: 10,
						padding: 0,
						borderRadius: 10,
					}}
				>
					<AddProduct
						onAddProduct={onAddProduct}
						initialProduct={selectedProduct}
					/>
					<TouchableOpacity
						onPress={() => setModalVisible(false)}
						style={{
							// marginVertical: 20,
							backgroundColor: 'gray',
							paddingVertical: 5,
							paddingHorizontal: 5,
							elevation: 3,
							borderRadius: 50,
							position: 'absolute',
							right: 10,
							top: 10,
						}}
					>
						<Ionicons
							name="close"
							size={24}
							color="white"
						/>
					</TouchableOpacity>
				</View>
			</Modal>
		</View>
	);
};

// Styles
const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 20,
		backgroundColor: '#fff',
	},
	productCard: {
		flexDirection: 'row',
		paddingVertical: 16,
		marginBottom: 8,
		borderBottomWidth: 1,
		borderColor: '#ddd',
		borderRadius: 4,
		alignItems: 'start',
	},
	productImage: {
		width: 50,
		height: 50,
		borderRadius: 4,
		marginRight: 10,
	},
	productInfo: {
		flex: 1,
	},
	productName: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	actions: {
    flexDirection: 'row',
    gap: 10
	},
	actionButton: {
		padding: 10,
		backgroundColor: '#3498db',
		borderRadius: 4,
		marginLeft: 10,
	},
	actionText: {
		color: '#fff',
		fontWeight: 'bold',
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		backgroundColor: '#fff',
		margin: 10,
		padding: 16,
    borderRadius: 10,
    
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	toggleRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 20,
    alignItems: 'center',
	},
	deleteButton: {
		padding: 10,
		backgroundColor: '#e74c3c',
		borderRadius: 4,
		alignItems: 'center',
		marginBottom: 20,
	},
	deleteText: {
		color: '#fff',
		fontWeight: 'bold',
	},
	closeButton: {
		color: '#3498db',
		fontWeight: 'bold',
		textAlign: 'center',
		marginTop: 10,
	},
});

export default products;
