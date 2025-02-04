import React, {
	useState,
	useEffect,
	useRef,
	useContext,
} from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
	TextInput,
	Button,
	StyleSheet,
	Alert,
	ScrollView,
	ToastAndroid,
} from 'react-native';
import axios from 'axios';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { ProductsContext } from '@/context/ProductsContext';
import axiosInstance from '@/utils/axiosInstance';
import InvoiceTable from '../../../components/InvoiceTable';
import ExpenseTable from '../../../components/ExpenseTable';
import Feather from '@expo/vector-icons/Feather';

const ExpensesScreen = () => {
	const { userInfo, sendPushNotification } =
		useContext(AuthContext);

	const router = useRouter();
	const [invoices, setInvoices] = useState([]);
	const [expenses, setExpenses] = useState([]);
	const [expensesLoading, setExpensesLoading] =
		useState(false);
	const [modalVisible, setModalVisible] = useState(false);

	const [newExpense, setNewExpense] = useState({
		title: '',
		category: 'Inventory',
		amount: '',
		description: '',
	});

	useEffect(() => {
		fetchExpenses();
	}, []);

	const businessId = userInfo?._id;

	const [
		categoryDropdownVisible,
		setCategoryDropdownVisible,
	] = useState(false);

	const categories = [
		'Inventory',
		'Utilities',
		'Rent',
		'Salaries',
		'Marketing',
		'Miscellaneous',
	];

	const fetchExpenses = async () => {
		try {
			const response = await axiosInstance.get(
				`/expenses/${userInfo?._id}`,
			);
			console.log(response.data.expenses);
			setExpenses(response.data.expenses);
			setExpensesLoading(false);
		} catch (err) {
			setError(err.message || 'Error fetching orders');
			setExpensesLoading(false);
		}
	};

	const handleCreateExpense = async () => {
		if (!newExpense.title || !newExpense.category || !newExpense.amount) {
			ToastAndroid.show(
				'Please fill in all required fields',
				ToastAndroid.LONG,
			);
			return;
		}
		try {
			await axiosInstance.post('/expenses/create', {
				...newExpense,
				businessId,
			});
			fetchExpenses();
			setNewExpense({
				title: '',
				category: 'Inventory',
				amount: '',
				description: '',
			});
			setModalVisible(false);
		} catch (error) {
			console.error('Error creating expense:', error);
		}
	};

	const renderCategoryItem = ({ item }) => (
		<TouchableOpacity
			style={styles.categoryItem}
			onPress={() => {
				setNewExpense({ ...newExpense, category: item });
				setCategoryDropdownVisible(false);
			}}
		>
			<Text style={styles.categoryText}>{item}</Text>
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			<View style={styles.headerContainer}>
				<TouchableOpacity
					onPress={() => router.push('/(tabs)')}
				>
					<Ionicons
						name="arrow-back"
						size={24}
						color="black"
					/>
				</TouchableOpacity>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						width: '90%',
						paddingVertical: 10,
					}}
				>
					<Text style={styles.headerText}>Expenses</Text>
					{expenses?.length > 0 && (
						<TouchableOpacity
							style={{
								backgroundColor: '#121212',
								paddingVertical: 5,
								borderRadius: 5,
								paddingHorizontal: 10,
							}}
							onPress={() => setModalVisible(true)}
						>
							<Text style={styles.createButtonText}>
								Record Expenses
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
			{expensesLoading ? (
				<Text>Loading...</Text>
			) : (
				<>
					{expenses.length === 0 ? (
						<View style={styles.noInvoicesContainer}>
							<Text style={styles.noInvoicesText}>
								No expenses available
							</Text>
							<TouchableOpacity
								style={styles.createButton}
								onPress={() => setModalVisible(true)}
							>
								<Text style={styles.createButtonText}>
									Record Expenses
								</Text>
							</TouchableOpacity>
						</View>
					) : (
						<ExpenseTable
							expenses={expenses}
							userInfo={userInfo}
							fetchExpenses={fetchExpenses}
						/>
					)}
				</>
			)}
			<Modal
				visible={modalVisible}
				animationType="slide"
				transparent={true}
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<ScrollView>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>
									Record Expense
								</Text>
								<TouchableOpacity
									onPress={() => setModalVisible(false)}
								>
									<Ionicons
										name="close-circle-outline"
										size={28}
										color="black"
									/>
								</TouchableOpacity>
							</View>
							<View style={styles.newExpenseSection}>
								<Text
									style={{ marginBottom: 2, fontSize: 16 }}
								>
									Name
								</Text>
								<TextInput
									style={styles.input}
									placeholder="Name"
									value={newExpense.title}
									onChangeText={(text) =>
										setNewExpense({
											...newExpense,
											title: text,
										})
									}
								/>
								<View style={{}}>
									{/* Dropdown for Category */}
									<Text
										style={{
											marginBottom: 2,
											fontSize: 16,
										}}
									>
										Category
									</Text>
									<View>
										<TouchableOpacity
											style={styles.dropdownButton}
											onPress={() =>
												setCategoryDropdownVisible(
													!categoryDropdownVisible,
												)
											}
										>
											<Text
												style={styles.dropdownButtonText}
											>
												{newExpense.category ||
													'Select Category'}
											</Text>
											<Feather
												name="chevron-down"
												size={24}
												color="black"
											/>
										</TouchableOpacity>
										{categoryDropdownVisible && (
											<FlatList
												data={categories}
												renderItem={renderCategoryItem}
												keyExtractor={(item, index) =>
													index.toString()
												}
												style={styles.dropdownList}
											/>
										)}
									</View>
									<Text
										style={{
											marginBottom: 2,
											fontSize: 16,
										}}
									>
										Amount
									</Text>
									<TextInput
										style={styles.input}
										placeholder="Amount (NGN)"
										value={newExpense.amount}
										onChangeText={(text) =>
											setNewExpense({
												...newExpense,
												amount: text,
											})
										}
										keyboardType="numeric"
									/>
								</View>
								<Text
									style={{ marginBottom: 2, fontSize: 16 }}
								>
									Description
								</Text>
								<TextInput
									style={[
										styles.input,
										styles.descriptionInput,
									]}
									placeholder="Description"
									value={newExpense.description}
									onChangeText={(text) =>
										setNewExpense({
											...newExpense,
											description: text,
										})
									}
									multiline
									numberOfLines={4}
								/>
							</View>

							{/* Submit Button */}

							<TouchableOpacity
								onPress={handleCreateExpense}
								style={{
									backgroundColor: '#121212',
									padding: 14,
									alignItems: 'center',
									borderRadius: 5,
									marginBottom: 20,
								}}
							>
								<Text style={styles.addButtonText}>
									Record Expense
								</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	headerContainer: {
		paddingTop: 20,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	headerText: {
		fontSize: 22,
		fontWeight: 'bold',
		marginLeft: 8,
	},
	noInvoicesContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	noInvoicesText: {
		fontSize: 18,
		marginBottom: 16,
	},
	createButton: {
		backgroundColor: '#4CAF50',
		padding: 10,
		borderRadius: 8,
	},
	createButtonText: {
		color: '#fff',
		fontSize: 18,
	},
	listContainer: {
		paddingBottom: 20,
	},
	invoiceCard: {
		backgroundColor: '#fff',
		borderRadius: 8,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 2,
	},
	invoiceText: {
		fontSize: 16,
		marginBottom: 8,
	},
	shareButton: {
		backgroundColor: '#2196F3',
		padding: 10,
		borderRadius: 8,
		alignItems: 'center',
	},
	shareButtonText: {
		color: '#fff',
		fontSize: 16,
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 8,
		width: '90%',
		maxHeight: '80%',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: 'bold',
	},
	productCard: {
		backgroundColor: '#f9f9f9',
		padding: 10,
		marginBottom: 8,
		borderRadius: 5,
		borderWidth: 1,
		borderColor: '#ccc',
	},
	selectedProductCard: {
		backgroundColor: '#d4edda',
		borderColor: '#155724',
	},
	productText: {
		fontSize: 16,
	},
	productListContainer: {
		paddingBottom: 20,
	},
	selectedProductContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 10,
		backgroundColor: '#fff3e0',
		borderRadius: 8,
		marginBottom: 10,
	},
	quantityInput: {
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
		padding: 8,
		width: 60,
		textAlign: 'center',
		fontSize: 16,
	},
	modalSubTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginVertical: 10,
	},
	section: {
		marginBottom: 20,
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		marginBottom: 10,
		borderRadius: 5,
	},
	productItem: {
		marginBottom: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
		paddingBottom: 10,
	},
	addButton: {
		backgroundColor: '#28a745',
		padding: 10,
		alignItems: 'center',
		borderRadius: 5,
		marginBottom: 20,
		justifyContent: 'flex-end',
	},
	addButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 18
	},
	removeButton: {
		backgroundColor: '#dc3545',
		padding: 5,
		alignItems: 'center',
		borderRadius: 5,
		marginTop: 10,
	},
	removeButtonText: {
		color: '#fff',
		fontWeight: 'bold',
	},
	total: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 20,
	},
	newExpenseSection: {
		backgroundColor: '#FFFFFF',
		// padding: 16,
		borderRadius: 8,
		marginBottom: 20,
	},
	sectionHeader: {
		fontSize: 18,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 12,
	},
	input: {
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		fontSize: 16,
		color: '#374151',
	},
	descriptionInput: {
		height: 60,
	},
	dropdownButton: {
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	dropdownButtonText: {
		fontSize: 16,
		color: '#374151',
	},
	dropdownList: {
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		maxHeight: 150,
		backgroundColor: '#f1f1f1',
		marginBottom: 12,
	},
	categoryItem: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	categoryText: {
		fontSize: 16,
		color: '#374151',
	},
});

export default ExpensesScreen;
