import React, {
	useContext,
	useEffect,
	useState,
} from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
	StyleSheet,
	Image,
	ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Import Picker
import AddProduct from '@/components/AddProduct';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useProducts } from '@/context/ProductsContext';
import { AuthContext } from '@/context/AuthContext';
import { ProductsContext } from '@/context/ProductsContext';
import { StatusBar } from 'expo-status-bar';

const Products = () => {
	const { userInfo } = useContext(AuthContext);
	const {
		products,
		fetchProductsByStore,
		loading,
		error,
		setProducts,
		addProduct,
		updateProduct,
		deleteProduct,
		updateVariant,
		deleteVariant,
		updateAddon,
		deleteAddon,
	} = useContext(ProductsContext);

	const storeId = userInfo?._id;

	useEffect(() => {
		fetchProductsByStore(storeId);
	}, [storeId]);

	const [isModalVisible, setModalVisible] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [selectedProduct, setSelectedProduct] =
		useState(null);
	const [menuVisible, setMenuVisible] = useState(false);
	const [selectedCategory, setSelectedCategory] =
		useState('All'); // State for selected category

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

	// Function to add a new product
	const onAddProduct = async (newProduct) => {
		if (isEditing) {
			console.log('new: ', newProduct);
			updateProduct(newProduct._id, newProduct);
		} else {
			// Add a new product
			addProduct(newProduct);
		}
		setModalVisible(false); // Close modal after adding/editing
	};

	// Function to open the modal for adding or editing a product
	const openModal = (product = null) => {
		setIsEditing(!!product);
		setSelectedProduct(product);
		setModalVisible(true);
	};

	// Get unique categories from products
	const categories = [
		'All',
		...new Set(products.map((product) => product.category.name)),
	];

	// Filter products based on selected category
	const filteredProducts =
		selectedCategory === 'All'
			? products
			: products.filter(
					(product) =>
						product.category.name === selectedCategory,
			  );

	if (loading) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<ActivityIndicator size="large" color="green" />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<StatusBar style="light" backgroundColor="#065637" />
			<View
				style={{
					paddingTop: 20,
					elevation: 3,
					backgroundColor: '#065637',
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
					<Text style={{ fontSize: 24, color: '#f1f1f1', fontWeight: 'bold' }}>Catalogue</Text>
					<TouchableOpacity>
						{/* <Ionicons name="search-outline" size={22} color="black" /> */}
					</TouchableOpacity>
				</View>

				{/* Category Dropdown */}
				<View style={styles.pickerContainer}>
					<Picker
						selectedValue={selectedCategory}
						onValueChange={(itemValue) =>
							setSelectedCategory(itemValue)
						}
						style={styles.picker}
						itemStyle={{ color: '#f1f1f1', backgroundColor: '#065637' }} // Style for picker items
						mode="dropdown" // Use dropdown mode for better UX
						backgroundColor="#065637" // Background color for the picker
						dropdownIconColor="#f1f1f1" // Color for the dropdown icon
					>
						{categories.map((category, index) => (
							<Picker.Item
								key={index}
								label={category}
								value={category}
							/>
						))}
					</Picker>
				</View>
			</View>

			<View
				style={{
					flex: 1,
					paddingHorizontal: 16,
					paddingBottom: 10,
				}}
			>
				{/* List of Products */}
				<FlatList
					data={filteredProducts} // Use filtered products
					keyExtractor={(item) => item._id.toString()}
					showsVerticalScrollIndicator={false}
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
								<Text>
									Price: ₦{item?.price.toLocaleString()}
								</Text>
								<Text style={{ color: 'green' }}>
									Active
								</Text>
							</View>

							{/* Actions */}
							<View style={styles.actions}>
								{/* Edit Button */}
								<TouchableOpacity
									onPress={() => openModal(item)}
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
							<View>
								<Text style={styles.modalText}>
									{selectedProduct.description}
								</Text>
							</View>

							<View
								style={{
									display: 'flex',
									flexDirection: 'row',
									justifyContent: 'flex-end',
									marginTop: 20,
								}}
							>
								<TouchableOpacity
									style={{
										padding: 10,
										backgroundColor: 'transparent',
										borderRadius: 4,
										alignItems: 'center',
										borderWidth: 1,
										borderColor: 'gray',
										marginRight: 10,
									}}
									onPress={closeMenu}
								>
									<Text style={styles.closeButton}>
										Close
									</Text>
								</TouchableOpacity>
								{/* Delete Option */}
								<TouchableOpacity
									onPress={() => {
										deleteProduct(selectedProduct._id);
										closeMenu();
									}}
									style={styles.deleteButton}
								>
									<Text style={styles.deleteText}>
										Delete Product
									</Text>
								</TouchableOpacity>
							</View>
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
						size={40}
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
						storeId={storeId}
						loading={loading}
					/>
					<TouchableOpacity
						onPress={() => setModalVisible(false)}
						style={{
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
	pickerContainer: {
		marginTop: 10,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 5,
	},
	picker: {
		width: '100%',
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
		borderRadius: 5,
		marginRight: 10,
		borderWidth: 1,
		borderColor: '#ddd',
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
		gap: 10,
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
	deleteButton: {
		padding: 10,
		backgroundColor: '#e74c3c',
		borderRadius: 4,
		alignItems: 'center',
	},
	deleteText: {
		color: '#fff',
		fontWeight: 'bold',
	},
	closeButton: {
		color: 'gray',
		fontWeight: 'bold',
		textAlign: 'center',
	},
});

export default Products;
