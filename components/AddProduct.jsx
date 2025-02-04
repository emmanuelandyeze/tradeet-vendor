import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	Button,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Image,
	ScrollView,
	Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import axiosInstance from '../utils/axiosInstance';

const AddProduct = ({
	onAddProduct,
	initialProduct,
	storeId,
	loading,
}) => {
	const [img, setImg] = useState('');
	const [picture, setPicture] = useState('');
	const [product, setProduct] = useState(
		initialProduct || {
			name: '',
			price: '',
			image: '',
			variants: [],
			addOns: [],
			description: '',
			storeId: storeId,
		},
	);

	const [variantName, setVariantName] = useState('');
	const [variantPrice, setVariantPrice] = useState('');
	const [addOnName, setAddOnName] = useState('');
	const [addOnPrice, setAddOnPrice] = useState('');
	const [addOnCompulsory, setAddOnCompulsory] =
		useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [editingVariantIndex, setEditingVariantIndex] =
		useState(null);
	const [editingAddOnIndex, setEditingAddOnIndex] =
		useState(null);

	const [categories, setCategories] = useState([]);
	const [selectedCategory, setSelectedCategory] =
		useState(null);
	const [isDropdownVisible, setDropdownVisible] =
		useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [newCategory, setNewCategory] = useState('');
	const [isAddingCategory, setIsAddingCategory] =
		useState(false);

	useEffect(async() => {
		// Fetch categories from the backend
		const response = await axiosInstance
			.get(`/category/${storeId}`)
			console.log(response.data)
		 setCategories(response.data);
	}, []);

	const addCategory = () => {
		// Create a new category
		if (!newCategory.trim()) return;

		axiosInstance
			.post(`/category/${storeId}`, { name: newCategory })
			.then((response) => {
				setCategories((prev) => [...prev, response.data]);
				setNewCategory(''); 
				setIsAddingCategory(false);
			});
	};

	// console.log(categories)
	const pickImage = async () => {
		let result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 1,
		});

		if (!result.canceled) {
			setPicture(result.assets[0].uri);
			setModalVisible(false);
		}
	};

	const takePhoto = async () => {
		ImagePicker.requestCameraPermissionsAsync();
		let result = await ImagePicker.launchCameraAsync({
			allowsEditing: true,
			aspect: [1, 1],
			quality: 1,
		});

		if (!result.canceled) {
			setPicture(result.assets[0].uri);
			setModalVisible(false);
		}
	};

	// Function to handle image upload to Cloudinary
	const handleImageUpload = async () => {
		try {
			const response = await uploadImageToCloudinary(
				picture || product.image,
			);
			if (response.secure_url) {
				setProduct({
					...product,
					image: response.secure_url,
				});
				return response.secure_url;
			} else {
				alert('Failed to upload image');
				return null;
			}
		} catch (error) {
			console.error('Error uploading image:', error);
			alert('Image upload failed. Please try again.');
			return null;
		}
	};

	const addVariant = () => {
		if (variantName && variantPrice) {
			const newVariant = {
				name: variantName,
				price: parseInt(variantPrice),
			};
			if (editingVariantIndex !== null) {
				const updatedVariants = [...product.variants];
				updatedVariants[editingVariantIndex] = newVariant;
				setProduct({
					...product,
					variants: updatedVariants,
				});
				setEditingVariantIndex(null);
			} else {
				setProduct({
					...product,
					variants: [...product.variants, newVariant],
				});
			}
			setVariantName('');
			setVariantPrice('');
		}
	};

	const editVariant = (index) => {
		const variantToEdit = product.variants[index];
		setVariantName(variantToEdit.name);
		setVariantPrice(variantToEdit.price.toString());
		setEditingVariantIndex(index);
	};

	const deleteVariant = (index) => {
		const updatedVariants = product.variants.filter(
			(_, i) => i !== index,
		);
		setProduct({ ...product, variants: updatedVariants });
	};

	const addAddOn = () => {
		if (addOnName && addOnPrice) {
			const newAddOn = {
				name: addOnName,
				price: parseInt(addOnPrice),
				compulsory: addOnCompulsory,
			};
			if (editingAddOnIndex !== null) {
				const updatedAddOns = [...product.addOns];
				updatedAddOns[editingAddOnIndex] = newAddOn;
				setProduct({
					...product,
					addOns: updatedAddOns,
				});
				setEditingAddOnIndex(null);
			} else {
				setProduct({
					...product,
					addOns: [...product.addOns, newAddOn],
				});
			}
			setAddOnName('');
			setAddOnPrice('');
			setAddOnCompulsory(false);
		}
	};

	const editAddOn = (index) => {
		const addOnToEdit = product.addOns[index];
		setAddOnName(addOnToEdit.name);
		setAddOnPrice(addOnToEdit.price.toString());
		setAddOnCompulsory(addOnToEdit.compulsory);
		setEditingAddOnIndex(index);
	};

	const deleteAddOn = (index) => {
		const updatedAddOns = product.addOns.filter(
			(_, i) => i !== index,
		);
		setProduct({ ...product, addOns: updatedAddOns });
	};

	const handleSaveProduct = async () => {
		const uploadedLogoUrl = await handleImageUpload();

		// Ensure the product's image is updated with the uploaded URL
		if (uploadedLogoUrl) {
			setProduct((prevProduct) => ({
				...prevProduct,
				image: uploadedLogoUrl,
			}));

			// Check that all necessary fields are filled after updating the product state
			if (product.name && product.price) {
				onAddProduct({
					...product,
					image: uploadedLogoUrl,
				});
				console.log(product); // This will log the product object, but remember the state update is asynchronous
			} else {
				alert('Please fill in the product name and price.');
			}
		} else {
			alert('Image upload failed. Please try again.');
		}
	};

	return (
		<ScrollView
			showsVerticalScrollIndicator={false}
			style={styles.container}
		>
			<Text style={styles.title}>
				{initialProduct
					? 'Edit Product'
					: 'Add New Product'}
			</Text>

			<TouchableOpacity
				onPress={() => setModalVisible(true)}
				style={styles.imageUploadContainer}
			>
				<View style={styles.dottedCircle}>
					{picture || product.image ? (
						<Image
							source={{ uri: picture || product.image }}
							style={styles.imagePreview}
						/>
					) : (
						<Text style={styles.uploadText}>
							Upload your product image
						</Text>
					)}
				</View>
			</TouchableOpacity>

			{/* Modal for Image Picker Options */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalView}>
						<TouchableOpacity
							onPress={takePhoto}
							style={{
								borderWidth: 1,
								padding: 10,
								borderRadius: 5,
								marginBottom: 10,
							}}
						>
							<Text style={{ color: 'black' }}>
								Take a Photo
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={pickImage}
							style={{
								borderWidth: 1,
								padding: 10,
								borderRadius: 5,
								marginBottom: 10,
							}}
						>
							<Text style={{ color: 'black' }}>
								Choose from Gallery
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setModalVisible(false)}
							style={styles.modalCancelButton}
						>
							<Text style={styles.modalButtonText}>
								Cancel
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			<Text style={styles.label}>Product Name</Text>
			<TextInput
				style={styles.input}
				placeholder="Product Name"
				value={product.name}
				onChangeText={(text) =>
					setProduct({ ...product, name: text })
				}
			/>

			<Text style={styles.label}>Price</Text>
			<TextInput
				style={styles.input}
				placeholder="Price (₦)"
				keyboardType="numeric"
				value={product.price.toString()}
				onChangeText={(text) =>
					setProduct({
						...product,
						price: text ? parseInt(text) : 0, // If text is empty, set price to 0
					})
				}
			/>

			<Text style={styles.label}>Product Category</Text>
			{/* Selected Category Display */}
			<TouchableOpacity
				style={styles.dropdownButton}
				onPress={() =>
					setDropdownVisible(!isDropdownVisible)
				}
			>
				<Text style={styles.dropdownText}>
					{selectedCategory
						? selectedCategory.name
						: 'Select a category'}
				</Text>
			</TouchableOpacity>

			{/* Dropdown Menu */}
			{isDropdownVisible && (
				<View style={styles.dropdown}>
					<FlatList
						data={categories}
						keyExtractor={(item, index) => index.toString()}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={styles.dropdownItem}
								onPress={() => {
									setSelectedCategory(item);
									setDropdownVisible(false);
								}}
							>
								<Text style={styles.dropdownItemText}>
									{item.name}
								</Text>
							</TouchableOpacity>
						)}
					/>
					<TouchableOpacity
						style={styles.addCategoryButton}
						onPress={() => {
							setDropdownVisible(false);
							setIsModalVisible(true);
						}}
					>
						<Text style={styles.addCategoryText}>
							+ Add New Category
						</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Modal for Adding New Category */}
			<Modal
				visible={isModalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>
							Add New Category
						</Text>
						<TextInput
							style={styles.textInput}
							placeholder="Enter category name"
							value={newCategory}
							onChangeText={setNewCategory}
						/>
						<View style={styles.modalActions}>
							<TouchableOpacity
								style={styles.modalButton}
								onPress={addCategory}
							>
								<Text style={styles.modalButtonText}>
									Add
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.modalButton,
									styles.cancelButton,
								]}
								onPress={() => setIsModalVisible(false)}
							>
								<Text style={styles.modalButtonText}>
									Cancel
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			<Text style={styles.label}>Description</Text>
			<TextInput
				style={styles.input}
				placeholder="Description"
				value={product.description}
				onChangeText={(text) =>
					setProduct({ ...product, description: text })
				}
			/>

			{/* Variants */}
			<View>
				<Text style={styles.label}>Variants</Text>
				<View style={styles.variantContainer}>
					<FlatList
						data={product.variants}
						keyExtractor={(item, index) => index.toString()}
						renderItem={({ item, index }) => (
							<View style={styles.variantItem}>
								<Text style={{ marginBottom: 5 }}>
									{item.name} - ₦{item.price}
								</Text>
								<View style={styles.variantActions}>
									<TouchableOpacity
										onPress={() => editVariant(index)}
									>
										<Ionicons
											name="pencil"
											size={20}
											color="gray"
										/>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => deleteVariant(index)}
									>
										<Ionicons
											name="trash"
											size={24}
											color="red"
										/>
									</TouchableOpacity>
								</View>
							</View>
						)}
					/>
				</View>
				<View style={styles.variantInputContainer}>
					<TextInput
						style={styles.variantInput}
						placeholder="Variant Name"
						value={variantName}
						onChangeText={setVariantName}
					/>
					<TextInput
						style={styles.variantInput}
						placeholder="Price (₦)"
						keyboardType="numeric"
						value={variantPrice}
						onChangeText={setVariantPrice}
					/>
					<TouchableOpacity
						onPress={addVariant}
						style={styles.addButton}
					>
						<Ionicons
							name="add-sharp"
							size={28}
							color="white"
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Add-ons */}
			<View>
				<Text style={styles.label}>Add-ons</Text>
				<View style={styles.addOnContainer}>
					<FlatList
						data={product.addOns}
						keyExtractor={(item, index) => index.toString()}
						renderItem={({ item, index }) => (
							<View style={styles.addOnItem}>
								<Text style={{ marginBottom: 5 }}>
									{item.name} - ₦{item.price}{' '}
									{item.compulsory ? '(Compulsory)' : ''}
								</Text>
								<View style={styles.addOnActions}>
									<TouchableOpacity
										onPress={() => editAddOn(index)}
									>
										<Ionicons
											name="pencil"
											size={20}
											color="gray"
										/>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => deleteAddOn(index)}
									>
										<Ionicons
											name="trash"
											size={24}
											color="red"
										/>
									</TouchableOpacity>
								</View>
							</View>
						)}
					/>
				</View>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'flex-start',
						marginBottom: 20,
						width: '97%',
					}}
				>
					<View
						style={{
							flexDirection: 'column',
							// justifyContent: 'space-between',
							gap: 10,
							width: '89%',
						}}
					>
						<View
							style={{
								display: 'flex',
								flexDirection: 'row',
							}}
						>
							<TextInput
								style={styles.addOnInput}
								placeholder="Add-on Name"
								value={addOnName}
								onChangeText={setAddOnName}
							/>
							<TextInput
								style={styles.addOnInput}
								placeholder="Price (₦)"
								keyboardType="numeric"
								value={addOnPrice}
								onChangeText={setAddOnPrice}
							/>
						</View>
						<View style={styles.compulsoryContainer}>
							<TouchableOpacity
								onPress={() =>
									setAddOnCompulsory(!addOnCompulsory)
								}
							>
								<Ionicons
									name={
										addOnCompulsory
											? 'checkmark-circle'
											: 'checkmark-circle-outline'
									}
									size={24}
									color={addOnCompulsory ? 'green' : 'grey'}
								/>
							</TouchableOpacity>
							<Text>Compulsory</Text>
						</View>
					</View>
					<TouchableOpacity
						onPress={addAddOn}
						style={styles.addButton}
					>
						<Ionicons
							name="add-sharp"
							size={28}
							color="white"
						/>
					</TouchableOpacity>
				</View>
			</View>

			<TouchableOpacity
				onPress={handleSaveProduct}
				style={{
					// marginVertical: 20,
					backgroundColor: 'green',
					paddingVertical: 16,
					paddingHorizontal: 5,
					elevation: 3,
					borderRadius: 5,
					marginBottom: 30,
				}}
			>
				{loading ? (
					<Text
						style={{
							color: 'white',
							textAlign: 'center',
							fontSize: 20,
							fontWeight: 'semibold',
						}}
					>
						Loading...
					</Text>
				) : (
					<Text
						style={{
							color: 'white',
							textAlign: 'center',
							fontSize: 20,
							fontWeight: 'semibold',
						}}
					>
						{initialProduct
							? 'Update Product'
							: 'Add Product'}
					</Text>
				)}
			</TouchableOpacity>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
	},
	title: {
		fontSize: 24,
		marginBottom: 20,
		textAlign: 'left',
	},
	imageUploadContainer: {
		// borderWidth: 1,
		// borderColor: '#ccc',
		// padding: 20,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	dottedCircle: {
		borderStyle: 'dotted',
		borderWidth: 1,
		borderColor: '#ccc',
		width: 160,
		height: 160,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 100,
	},
	imagePreview: {
		width: 120,
		height: 120,
		borderRadius: 60,
	},
	uploadText: {
		textAlign: 'center',
		color: '#999',
	},
	label: {
		marginVertical: 10,
		fontSize: 18,
		fontWeight: 'bold',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		borderRadius: 5,
		marginBottom: 10,
		fontSize: 16,
	},
	variantContainer: {
		marginBottom: 10,
	},
	variantItem: {
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	variantActions: {
		flexDirection: 'row',
		gap: 10,
	},
	variantInputContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20,
	},
	variantInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		borderRadius: 5,
		width: '40%',
	},
	addOnContainer: {
		marginBottom: 10,
	},
	addOnItem: {
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	addOnActions: {
		flexDirection: 'row',
		gap: 10,
	},
	addOnInputContainer: {
		flexDirection: 'row',
		// justifyContent: 'space-between',
		marginBottom: 10,
		gap: 30,
	},
	addOnInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		borderRadius: 5,
		width: '47%',
		marginRight: 7,
	},
	compulsoryContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	addButton: {
		backgroundColor: 'gray',
		padding: 10,
		borderRadius: 5,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalView: {
		width: 300,
		backgroundColor: 'white',
		padding: 20,
		borderRadius: 10,
		alignItems: 'center',
	},
	modalButton: {
		padding: 10,
		borderRadius: 5,
		backgroundColor: '#007BFF',
	},
	modalCancelButton: {
		backgroundColor: 'red',
		padding: 10,
		borderRadius: 5,
	},
	modalButtonText: {
		color: 'white',
	},
	dropdownButton: {
		padding: 15,
		borderWidth: 1,
		borderRadius: 5,
		borderColor: '#ccc',
		backgroundColor: '#f9f9f9',
	},
	dropdownText: {
		fontSize: 16,
		color: '#333',
	},
	dropdown: {
		marginTop: 10,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 5,
		backgroundColor: '#fff',
	},
	dropdownItem: {
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	dropdownItemText: {
		fontSize: 16,
		color: '#333',
	},
	addCategoryButton: {
		padding: 15,
		backgroundColor: '#e9e9e9',
		alignItems: 'center',
	},
	addCategoryText: {
		fontSize: 16,
		color: '#007BFF',
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		width: '90%',
		padding: 20,
		backgroundColor: '#fff',
		borderRadius: 10,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 5,
		padding: 10,
		marginBottom: 20,
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 10
	},
	cancelButton: {
		backgroundColor: 'gray',
	},
});

export default AddProduct;
