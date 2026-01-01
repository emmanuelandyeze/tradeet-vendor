import React, { useContext, useRef, useState } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
	StyleSheet,
	Image,
	Alert,
	ToastAndroid,
	TextInput,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { AuthContext } from '@/context/AuthContext';
import PlaceholderLogo from './PlaceholderLogo';
import Ionicons from '@expo/vector-icons/Ionicons';
import axiosInstance from '@/utils/axiosInstance'; 

const ExpenseTable = ({
	expenses,
	userInfo,
	fetchExpenses,
}) => {
	const { sendPushNotification } = useContext(AuthContext);
	const [selectedExpense, setSelectedExpense] =
		useState(null);
	const [isModalVisible, setModalVisible] = useState(false);
	const [isPaymentModalVisible, setPaymentModalVisible] =
		useState(false);
	const invoiceRef = useRef();
	const [invoiceLoading, setInvoiceLoading] =
		useState(false);
	const [amountPaid, setAmountPaid] = useState(0);
	const [selectedMethod, setSelectedMethod] =
		useState('transfer');

	const openModal = (expense) => {
		setSelectedExpense(expense);
		setModalVisible(true);
	};

	const openPaymentModal = (expense) => {
		setPaymentModalVisible(true);
	};

	const closeModal = () => {
		setSelectedExpense(null);
		setModalVisible(false);
	};

	const closePaymentModal = (invoice) => {
		setPaymentModalVisible(false);
	};

	function formatDate(dateString) {
		const date = new Date(dateString); // Create a Date object from the input

		// Get day, month, year, and time components
		const day = date.getDate();
		const monthNames = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec',
		];
		const month = monthNames[date.getMonth()];
		const year = date.getFullYear();

		// Format hours and minutes
		let hours = date.getHours();
		const minutes = date
			.getMinutes()
			.toString()
			.padStart(2, '0'); // Add leading zero
		const ampm = hours >= 12 ? 'pm' : 'am'; // Determine AM/PM
		hours = hours % 12; // Convert to 12-hour format
		hours = hours ? hours : 12; // The hour '0' should be '12'

		// Get the day suffix
		const suffix = (day) => {
			if (day > 3 && day < 21) return 'th'; // General rule for all numbers between 4 and 20
			switch (day % 10) {
				case 1:
					return 'st';
				case 2:
					return 'nd';
				case 3:
					return 'rd';
				default:
					return 'th';
			}
		};

		// Construct the formatted date string
		return `${day}${suffix(day)} ${month}, ${year}`;
	}

	const handleRecordPayment = async () => {
		const response = await axiosInstance.post(
			'/orders/add-payment',
			{
				orderId: selectedExpense._id,
				amount: amountPaid,
				method: selectedMethod,
			},
		);
		if (response.status === 200) {
			ToastAndroid.show(
				'Payment recorded successfully!',
				ToastAndroid.LONG,
			);
			closePaymentModal();
			closeModal();
			fetchOrders();
		} else
			ToastAndroid.show(
				'Failed to record payment',
				ToastAndroid.LONG,
			);
	};

	const handleShareExpense = async (expense) => {
		try {
			const uri = await captureRef(invoiceRef.current, {
				format: 'jpg',
				quality: 1,
			});
			await Sharing.shareAsync(uri);
		} catch (error) {
			console.error('Error sharing expense:', error);
			Alert.alert('Error', 'Failed to share expense');
		}
	};
	// ...

	const renderItem = ({ item }) => (
		<TouchableOpacity
			style={styles.card}
			onPress={() => openModal(item)}
			activeOpacity={0.7}
		>
			<View style={styles.cardHeader}>
				<View style={styles.cardIconContainer}>
					<Ionicons name="receipt-outline" size={24} color="#007BFF" />
				</View>
				<View style={styles.cardTitleContainer}>
					<Text style={styles.cardTitle}>{item.title}</Text>
					<Text style={styles.cardDate}>{formatDate(item.date)}</Text>
				</View>
				<View>
					<Text style={styles.cardAmount}>
						₦{item.amount.toLocaleString()}
					</Text>
				</View>
			</View>
			<View style={styles.cardFooter}>
				<View style={styles.categoryBadge}>
					<Text style={styles.categoryText}>{item.category}</Text>
				</View>
				<Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
			</View>
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			<FlatList
				data={expenses}
				renderItem={renderItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
			/>
			{/* Modal for Invoice Details */}
			{selectedExpense && (
				<Modal
					visible={isModalVisible}
					animationType="fade"
					transparent
					onRequestClose={closeModal}
				>
					<View style={styles.modalContainer}>
						<View
							ref={invoiceRef}
							collapsable={false}
							style={styles.modalContent}
						>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitleDetail}>Expense Details</Text>
								<TouchableOpacity onPress={closeModal} style={styles.closeIcon}>
									<Ionicons name="close" size={24} color="#555" />
								</TouchableOpacity>
							</View>

							<View style={styles.detailSection}>
								<Text style={styles.detailLabel}>Title</Text>
								<Text style={styles.detailValue}>{selectedExpense?.title}</Text>
							</View>

							<View style={styles.detailRow}>
								<View style={styles.detailSectionHalf}>
									<Text style={styles.detailLabel}>Date</Text>
									<Text style={styles.detailValue}>{formatDate(selectedExpense?.date)}</Text>
								</View>
								<View style={styles.detailSectionHalf}>
									<Text style={styles.detailLabel}>Amount</Text>
									<Text style={styles.detailValueHighlight}>
										₦{selectedExpense?.amount?.toLocaleString()}
									</Text>
								</View>
							</View>

							<View style={styles.detailSection}>
								<Text style={styles.detailLabel}>Category</Text>
								<View style={styles.categoryBadgeLarge}>
									<Text style={styles.categoryTextLarge}>{selectedExpense?.category}</Text>
								</View>
							</View>

							{selectedExpense?.description && (
								<View style={styles.detailSection}>
									<Text style={styles.detailLabel}>Description</Text>
									<Text style={styles.detailDescription}>
										{selectedExpense?.description}
									</Text>
								</View>
							)}

							<View style={styles.divider} />

							<View style={styles.modalActions}>
								<TouchableOpacity
									style={styles.shareButton}
									onPress={() => handleShareExpense(selectedExpense)}
								>
									<Ionicons name="share-outline" size={20} color="#fff" />
									<Text style={styles.shareButtonText}>Share Receipt</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8F9FA',
	},
	listContent: {
		paddingBottom: 20,
		paddingTop: 10,
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
		marginVertical: 8,
		marginHorizontal: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#F0F0F0',
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	cardIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 12,
		backgroundColor: '#F0F7FF',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	cardTitleContainer: {
		flex: 1,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1A1A1A',
		marginBottom: 4,
	},
	cardDate: {
		fontSize: 12,
		color: '#8E8E93',
	},
	cardAmount: {
		fontSize: 16,
		fontWeight: '800',
		color: '#1A1A1A',
	},
	cardFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#F5F5F5',
	},
	categoryBadge: {
		backgroundColor: '#F2F2F7',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
	},
	categoryText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#636366',
	},
	// Modal Styles
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		padding: 20,
	},
	modalContent: {
		width: '100%',
		maxWidth: 400,
		backgroundColor: '#fff',
		borderRadius: 24,
		padding: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 10,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
	},
	modalTitleDetail: {
		fontSize: 20,
		fontWeight: '800',
		color: '#1A1A1A',
	},
	closeIcon: {
		padding: 4,
		backgroundColor: '#F2F2F7',
		borderRadius: 50,
	},
	detailSection: {
		marginBottom: 20,
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20,
	},
	detailSectionHalf: {
		flex: 1,
	},
	detailLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#8E8E93',
		marginBottom: 6,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	detailValue: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1A1A1A',
	},
	detailValueHighlight: {
		fontSize: 20,
		fontWeight: '800',
		color: '#007BFF',
	},
	detailDescription: {
		fontSize: 15,
		color: '#3C3C43',
		lineHeight: 22,
	},
	categoryBadgeLarge: {
		alignSelf: 'flex-start',
		backgroundColor: '#EAF4FF',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 100,
		borderWidth: 1,
		borderColor: '#007BFF20',
	},
	categoryTextLarge: {
		color: '#007BFF',
		fontWeight: '700',
		fontSize: 14,
	},
	divider: {
		height: 1,
		backgroundColor: '#F0F0F0',
		marginVertical: 20,
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},
	shareButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#1A1A1A',
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 12,
		gap: 8,
	},
	shareButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 15,
	},
});

export default ExpenseTable;
