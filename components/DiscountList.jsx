import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	Button,
	FlatList,
	Modal,
	TextInput,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';
import {
	getDiscounts,
	createDiscount,
	updateDiscount,
	deleteDiscount,
} from '@/services/discountServices';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

const DiscountList = ({ businessId }) => {
	const [discounts, setDiscounts] = useState([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [discountData, setDiscountData] = useState({
		code: '',
		percentage: '',
		isActive: true,
	});
	const [editingDiscountId, setEditingDiscountId] =
		useState(null);
	const router = useRouter();

	useEffect(() => {
		// Fetch discounts for the business
		const fetchDiscounts = async () => {
			try {
				const data = await getDiscounts(businessId);
				setDiscounts(data);
			} catch (error) {
				console.error('Error fetching discounts', error);
			}
		};

		fetchDiscounts();
	}, [businessId]);

	// Handle create or update discount
	const handleSaveDiscount = async () => {
		if (!discountData.code || !discountData.percentage) {
			alert('Please fill out all fields');
			return;
		}

		const data = {
			code: discountData.code,
			percentage: discountData.percentage,
			isActive: discountData.isActive,
			businessId,
		};

		try {
			if (editingDiscountId) {
				await updateDiscount(editingDiscountId, data);
			} else {
				await createDiscount(data);
			}

			// Reload discounts after creating/updating
			const updatedDiscounts = await getDiscounts(
				businessId,
			);
			setDiscounts(updatedDiscounts);
			setModalVisible(false);
			setDiscountData({
				code: '',
				percentage: '',
				isActive: true,
			});
			setEditingDiscountId(null);
		} catch (error) {
			console.error('Error saving discount', error);
		}
	};

	// Open modal to edit discount
	const handleEditDiscount = (discount) => {
		setDiscountData({
			code: discount.code,
			percentage: discount.percentage,
			isActive: discount.isActive,
		});
		setEditingDiscountId(discount._id);
		setModalVisible(true);
	};

	// Handle delete discount
	const handleDeleteDiscount = async (discountId) => {
		try {
			await deleteDiscount(discountId);
			// Reload discounts after deletion
			const updatedDiscounts = await getDiscounts(
				businessId,
			);
			setDiscounts(updatedDiscounts);
		} catch (error) {
			console.error('Error deleting discount', error);
		}
	};

	return (
		<View style={styles.container}>
			<View
				style={{
					flexDirection: 'row',
					justifyContent: 'space-between',
					paddingVertical: 20,
					alignItems: 'center',
				}}
			>
				<TouchableOpacity
					style={{
						flexDirection: 'row',
						alignItems: 'center',
					}}
					onPress={() => router.push('/(tabs)')}
				>
					<Ionicons
						name="chevron-back"
						size={24}
						color="black"
					/>
					<Text style={styles.title}>Discounts</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={() => setModalVisible(true)}
					style={{
						backgroundColor: 'green',
						paddingHorizontal: 8,
						paddingVertical: 5,
						borderRadius: 5,
						borderWidth: 1,
						borderColor: 'white',
					}}
				>
					<Text style={{ color: 'white', fontSize: 18 }}>
						Create new
					</Text>
				</TouchableOpacity>
			</View>

			<FlatList
				data={discounts}
				keyExtractor={(item) => item._id}
				renderItem={({ item }) => (
					<View style={styles.discountCard}>
						<Text style={styles.discountText}>
							Code: {item.code}
						</Text>
						<Text style={styles.discountText}>
							Percentage: {item.percentage}%
						</Text>
						<Text style={styles.discountText}>
							Status:{' '}
							{item.isActive ? 'Active' : 'Inactive'}
						</Text>
						<View style={styles.buttonGroup}>
							<TouchableOpacity
								style={styles.editButton}
								onPress={() => handleEditDiscount(item)}
							>
								<Text style={styles.buttonText}>Edit</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.deleteButton}
								onPress={() =>
									handleDeleteDiscount(item._id)
								}
							>
								<Text style={styles.buttonText}>
									Delete
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
				ListEmptyComponent={
					<>
						<View
							style={{
								justifyContent: 'center',
								alignItems: 'center',
								height: 350,
							}}
						>
							<Text
								style={{ fontSize: 22, fontWeight: 'bold' }}
							>
								No discount found.
							</Text>
							<Text style={{ fontSize: 18 }}>
								Click create new to add a discount.
							</Text>
						</View>
					</>
				}
			/>

			<Modal
				visible={modalVisible}
				animationType="slide"
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<Text style={styles.modalTitle}>
						{editingDiscountId
							? 'Edit Discount'
							: 'Create Discount'}
					</Text>
					<TextInput
						style={styles.input}
						placeholder="Discount Code"
						value={discountData.code}
						onChangeText={(text) =>
							setDiscountData({
								...discountData,
								code: text,
							})
						}
					/>
					<TextInput
						style={styles.input}
						placeholder="Percentage"
						value={discountData.percentage}
						onChangeText={(text) =>
							setDiscountData({
								...discountData,
								percentage: text,
							})
						}
						keyboardType="numeric"
					/>
					<TouchableOpacity
						style={styles.toggleActiveButton}
						onPress={() =>
							setDiscountData({
								...discountData,
								isActive: !discountData.isActive,
							})
						}
					>
						<Text style={styles.buttonText}>
							{discountData.isActive
								? 'Deactivate'
								: 'Activate'}{' '}
							Discount
						</Text>
					</TouchableOpacity>

					<View style={styles.modalActions}>
						<TouchableOpacity
							style={styles.saveButton}
							onPress={handleSaveDiscount}
						>
							<Text style={styles.buttonText}>Save</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.cancelButton}
							onPress={() => setModalVisible(false)}
						>
							<Text style={styles.buttonText}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		// marginBottom: 20,
		textAlign: 'center',
	},
	discountCard: {
		backgroundColor: '#f9f9f9',
		padding: 15,
		marginVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	discountText: {
		fontSize: 16,
		marginBottom: 5,
	},
	buttonGroup: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	editButton: {
		backgroundColor: 'blue',
		padding: 10,
		borderRadius: 5,
	},
	deleteButton: {
		backgroundColor: 'red',
		padding: 10,
		borderRadius: 5,
	},
	buttonText: {
		color: '#fff',
	},
	modalContainer: {
		flex: 1,
		padding: 20,
		justifyContent: 'center',
		backgroundColor: 'white',
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		padding: 10,
		marginBottom: 10,
		borderRadius: 5,
	},
	toggleActiveButton: {
		backgroundColor: '#28a745',
		padding: 12,
		borderRadius: 5,
		marginBottom: 20,
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	saveButton: {
		backgroundColor: 'green',
		padding: 12,
		borderRadius: 5,
		width: '48%',
	},
	cancelButton: {
		backgroundColor: 'gray',
		padding: 12,
		borderRadius: 5,
		width: '48%',
	},
});

export default DiscountList;
