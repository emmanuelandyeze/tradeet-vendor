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

const InvoiceTable = ({
	invoices,
	userInfo,
	fetchOrders,
}) => {
	const { sendPushNotification } = useContext(AuthContext);
	const [selectedInvoice, setSelectedInvoice] =
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

	const openModal = (invoice) => {
		setSelectedInvoice(invoice);
		setModalVisible(true);
	};

	const openPaymentModal = (invoice) => {
		setPaymentModalVisible(true);
	};

	const closeModal = () => {
		setSelectedInvoice(null);
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

	const createInvoice = async (orderData) => {
		try {
			setInvoiceLoading(true);
			const response = await axiosInstance.post(
				'/orders',
				orderData,
			); // API endpoint for creating order
			ToastAndroid.show(
				'Invoice created successfully!',
				ToastAndroid.LONG,
			);
			await sendPushNotification(
				userInfo?.expoPushToken,
				'New Invoice created 🔔',
				'New invoice created on ' + userInfo?.name,
			);
			setInvoiceLoading(false);
		} catch (error) {
			console.error(
				'Error creating order:',
				error.response?.data || error.message,
			);
			ToastAndroid.show(
				`Failed to place order: ${
					error.response?.data?.message ||
					'Something went wrong'
				}`,
				ToastAndroid.LONG,
			);

			setInvoiceLoading(false);
		}
	};

	const handleRecordPayment = async () => {
		const response = await axiosInstance.post(
			'/orders/add-payment',
			{
				orderId: selectedInvoice._id,
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

	const handleCreateInvoice = () => {
		const orderData = {
			storeId: userInfo?._id,
			customerInfo: {
				name: userInfo?.name,
				contact: userPhoneNumber,
				address: userAddress,
				expoPushToken: userInfo?.expoPushToken,
				pickUp: deliveryOption === 'pickup' ? true : false,
			},
			items: cartItems,
			payment: {
				type: paymentMethod,
				status: 'completed',
				timestamp: new Date(), // Payment timestamp
			},
			userId: userInfo?._id,
			totalAmount: finalTotal,
			itemsAmount: totalAmount - discountAmount,
			discountCode: discountInfo ? discountInfo.code : null,
			runnerInfo: {
				runnerId: selectedRunner?._id,
				accepted: true,
				status: 'accepted',
				acceptedAt: Date.now(),
			},
			deliveryOption: deliveryOption,
			status: selectedRunner ? 'in progress' : 'pending',
		};

		createOrder(orderData);
	};

	const handleShareInvoice = async (invoice) => {
		try {
			const uri = await captureRef(invoiceRef.current, {
				format: 'jpg',
				quality: 1,
			});
			await Sharing.shareAsync(uri);
		} catch (error) {
			console.error('Error sharing invoice:', error);
			Alert.alert('Error', 'Failed to share invoice');
		}
	};

	const renderItem = ({ item }) => (
		<TouchableOpacity
			style={styles.row}
			onPress={() => openModal(item)}
		>
			<Text style={styles.cell}>
				INV-{item.orderNumber}
			</Text>
			{/* <Text style={styles.cell}>
				{formatDate(item.createdAt)}
			</Text> */}
			<Text style={styles.cell}>
				₦
				{(item.deliveryFee
					? item.itemsAmount + item.deliveryFee + item.discountAmount
					: item.itemsAmount
				)?.toLocaleString()}
			</Text>
			<Text style={styles.cell}>
				₦
				{(
					item.totalAmount - item.amountPaid
				).toLocaleString()}
			</Text>
			<Text
				style={{
					flex: 1,
					textAlign: 'center',
					backgroundColor:
						item?.payment?.status === 'completed'
							? 'green'
							: item?.payment?.status === 'partial'
							? '#FF7E09'
							: 'red',
					color: '#fff',
					width: '30%',
					borderRadius: 10,
					paddingVertical: 2,
					fontSize: 12,
					textTransform: 'capitalize',
				}}
			>
				{item?.payment?.status}
			</Text>
		</TouchableOpacity>
	);

	return (
		<View style={styles.container}>
			{/* Table Header */}
			<View style={styles.header}>
				<Text style={styles.headerCell}># Invoice</Text>
				<Text style={styles.headerCell}>Amount</Text>
				<Text style={styles.headerCell}>Balance</Text>
				<Text style={styles.headerCell}>Status</Text>
			</View>

			{/* Table Body */}
			<FlatList
				data={invoices}
				renderItem={renderItem}
				keyExtractor={(item) => item._id}
			/>

			{/* Modal for Invoice Details */}
			{selectedInvoice && (
				<Modal
					visible={isModalVisible}
					animationType="slide"
					transparent
					onRequestClose={closeModal}
				>
					<View style={styles.modalContainer}>
						<View style={styles.modalContent}>
							<View
								style={{
									width: '100%',
									backgroundColor: '#fff',
									borderRadius: 10,
									padding: 10,
								}}
								ref={invoiceRef}
							>
								<View
									style={{
										flexDirection: 'row',
										width: '100%',
										justifyContent: 'space-between',
										alignItems: 'flex-start',
									}}
								>
									<View>
										<Text
											style={{
												fontSize: 16,
												fontWeight: 'bold',
											}}
										>
											#{selectedInvoice?.orderNumber}
										</Text>
										<Text
											style={{
												fontSize: 12,
												fontWeight: 'normal',
											}}
										>
											{formatDate(
												selectedInvoice?.createdAt,
											)}
										</Text>
										<Text
											style={{
												marginTop: 2,
												textAlign: 'center',
												backgroundColor:
													selectedInvoice?.payment
														?.status === 'completed'
														? 'green'
														: selectedInvoice?.payment
																?.status === 'partial'
														? '#FF7E09'
														: 'red',
												color: '#fff',
												// width: '30%',
												borderRadius: 2,
												paddingVertical: 2,
												fontSize: 12,
												textTransform: 'capitalize',
											}}
										>
											{selectedInvoice.payment.status}
										</Text>
									</View>
									<View
										style={{
											flexDirection: 'column',
											// width: '100%',
											justifyContent: 'flex-end',
											alignItems: 'flex-end',
										}}
									>
										{userInfo?.logoUrl ? (
											<Image
												source={{ uri: userInfo.logoUrl }}
												style={{
													marginBottom: 4,
													resizeMode: 'cover',
													height: 50,
													width: 50,
													borderRadius: 50,
													borderWidth: 1,
													borderColor: 'gray',
													elevation: 3,
													justifyContent: 'flex-end',
													alignItems: 'flex-end',
													marginRight: -5,
												}}
											/>
										) : (
											<View
												style={{
													justifyContent: 'flex-end',
													alignItems: 'flex-end',
													marginRight: -5,
												}}
											>
												<PlaceholderLogo
													name={userInfo?.name}
												/>
											</View>
										)}
										<Text
											style={{
												fontSize: 16,
												fontWeight: 'bold',
											}}
										>
											{userInfo?.name}
										</Text>
										<Text
											style={{
												fontSize: 12,
												fontWeight: 'normal',
											}}
										>
											{userInfo?.address}
										</Text>
										<Text
											style={{
												fontSize: 12,
												fontWeight: 'normal',
											}}
										>
											{userInfo?.phone}
										</Text>
									</View>
								</View>
								<View
									style={{
										flexDirection: 'row',
										width: '100%',
										justifyContent: 'flex-start',
										paddingVertical: 10,
									}}
								>
									<View
										style={{
											flexDirection: 'column',
											// width: '100%',
											justifyContent: 'flex-start',
											alignItems: 'flex-start',
										}}
									>
										<Text
											style={{
												fontSize: 14,
												fontWeight: 'bold',
											}}
										>
											Billed to:
										</Text>
										<Text
											style={{
												fontSize: 16,
												fontWeight: 'bold',
											}}
										>
											{selectedInvoice?.customerInfo?.name}
										</Text>
										{selectedInvoice?.customerInfo
											?.address && (
											<Text
												style={{
													fontSize: 12,
													fontWeight: 'normal',
												}}
											>
												{
													selectedInvoice?.customerInfo
														?.address
												}
											</Text>
										)}
										<Text
											style={{
												fontSize: 12,
												fontWeight: 'normal',
											}}
										>
											{
												selectedInvoice?.customerInfo
													?.contact
											}
										</Text>
									</View>
								</View>
								<Text style={styles.modalTitle}>
									Invoice Details
								</Text>
								<View style={styles.header}>
									<Text
										style={[
											styles.headerCell,
											{ textAlign: 'left' },
										]}
									>
										Item
									</Text>
									<Text style={styles.headerCell}>
										Quantity
									</Text>
									<Text style={styles.headerCell}>
										Amount
									</Text>
								</View>
								{selectedInvoice?.items?.map(
									(item, index) => (
										<View
											key={index}
											style={{
												// paddingBottom: 10,
												borderBottomWidth: 1,
												borderColor: '#f0f0f0',
												marginBottom: 10,
											}}
										>
											<View style={styles.row}>
												<View
													style={{
														flexDirection: 'column',
													}}
												>
													<View>
														<Text>
															{item?.name || item?.product}
														</Text>
														{item?.addOns?.map(
															(addon, index) => (
																<View>
																	<Text
																		style={{ fontSize: 14 }}
																		key={index}
																	>
																		{addon.name}(x
																		{addon.quantity}){' '}
																	</Text>
																</View>
															),
														)}
													</View>
												</View>
												<Text style={styles.cell}>
													{item?.quantity}
												</Text>
												<Text style={styles.cell}>
													₦
													{item?.total?.toLocaleString() ||
														item?.totalPrice?.toLocaleString()}
												</Text>
											</View>
											{/* {item?.variants?.map(
												(variant, index) => (
													<Text
														style={{ fontSize: 14 }}
														key={index}
													>
														(x
														{variant.quantity}){' '}
														{variant.name}
													</Text>
												),
											)}
											{item?.addOns?.map((addon, index) => (
												<Text
													style={{ fontSize: 14 }}
													key={index}
												>
													(x{addon.quantity}) {addon.name}
												</Text>
											))} */}
										</View>
									),
								)}
								<View
									style={{
										flexDirection: 'row',
										justifyContent: 'space-between',
										alignItems: 'center',
									}}
								>
									<Text
										style={{
											fontSize: 16,
											// fontWeight: 'bold',
										}}
									>
										Sub-total
									</Text>
									<Text
										style={{
											fontSize: 16,
											// fontWeight: 'bold',
										}}
									>
										₦
										{selectedInvoice?.itemsAmount?.toLocaleString()}
									</Text>
								</View>
								{selectedInvoice?.deliveryFee > 0 && (
									<View>
										<View
											style={{
												flexDirection: 'row',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}
										>
											<Text
												style={{
													fontSize: 16,
													// fontWeight: 'bold',
												}}
											>
												Delivery Fee
											</Text>
											<Text
												style={{
													fontSize: 16,
													// fontWeight: 'bold',
												}}
											>
												₦
												{selectedInvoice?.deliveryFee?.toLocaleString()}
											</Text>
										</View>
										<View
											style={{
												flexDirection: 'row',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}
										>
											<Text
												style={{
													fontSize: 16,
													// fontWeight: 'bold',
												}}
											>
												Service Fee
											</Text>
											<Text
												style={{
													fontSize: 16,
													// fontWeight: 'bold',
												}}
											>
												₦
												{selectedInvoice?.serviceFee?.toLocaleString()}
											</Text>
										</View>
									</View>
								)}
								<View
									style={{
										flexDirection: 'row',
										justifyContent: 'space-between',
										alignItems: 'center',
										marginTop: 10,
									}}
								>
									<Text
										style={{
											fontSize: 18,
											fontWeight: 'bold',
										}}
									>
										Total
									</Text>
									<Text
										style={{
											fontSize: 18,
											fontWeight: 'bold',
										}}
									>
										₦
										{selectedInvoice?.totalAmount?.toLocaleString()}
									</Text>
								</View>
								{selectedInvoice?.amountPaid > 0 && (
									<View
										style={{
											flexDirection: 'row',
											justifyContent: 'space-between',
											alignItems: 'center',
										}}
									>
										<Text
											style={{
												fontSize: 16,
												// fontWeight: 'bold',
											}}
										>
											Balance
										</Text>
										<Text
											style={{
												fontSize: 16,
												// fontWeight: 'bold',
											}}
										>
											₦
											{(
												selectedInvoice?.totalAmount -
												selectedInvoice?.amountPaid
											)?.toLocaleString()}
										</Text>
									</View>
								)}
								{selectedInvoice?.amountPaid > 0 && (
									<View style={{ marginTop: 10 }}>
										<Text
											style={{
												borderBottomWidth: 0.5,
												borderColor: '#ccc',
												paddingBottom: 5,
											}}
										>
											Payment History
										</Text>
										{selectedInvoice?.payments?.map(
											(item, index) => (
												<View key={index}>
													<View
														style={{
															flexDirection: 'row',
															justifyContent:
																'space-between',
															alignItems: 'center',
															marginTop: 5,
														}}
													>
														<Text>
															{formatDate(item.date)}
														</Text>
														<Text
															style={{
																textTransform: 'capitalize',
															}}
														>
															{item.method}
														</Text>
														<Text>
															₦
															{item.amount.toLocaleString()}
														</Text>
													</View>
												</View>
											),
										)}
									</View>
								)}
							</View>
							<View
								style={{
									flexDirection: 'row',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<View>
									<TouchableOpacity
										style={[
											styles.closeButton,
											{ backgroundColor: '#121212' },
										]}
										onPress={openPaymentModal}
									>
										<Text
											style={[
												styles.closeButtonText,
												{ color: '#f1f1f1' },
											]}
										>
											Record payment
										</Text>
									</TouchableOpacity>
								</View>
								<View
									style={{
										flexDirection: 'row',
										justifyContent: 'flex-end',
										gap: 10,
									}}
								>
									<TouchableOpacity
										style={[
											styles.closeButton,
											{ backgroundColor: '#f0f0f0' },
										]}
										onPress={closeModal}
									>
										<Text
											style={[
												styles.closeButtonText,
												{ color: '#000' },
											]}
										>
											Close
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.closeButton}
										onPress={() => handleShareInvoice()}
									>
										<Text
											style={{
												color: '#fff',
												fontWeight: 'bold',
											}}
										>
											Share
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					</View>
					<Modal
						visible={isPaymentModalVisible}
						animationType="slide"
						transparent
						onRequestClose={closePaymentModal}
					>
						<View style={styles.modalContainer}>
							<View style={styles.modalContent}>
								<View
									style={{
										flexDirection: 'row',
										justifyContent: 'space-between',
										alignItems: 'center',
										marginBottom: 10,
									}}
								>
									<Text
										style={{
											fontSize: 18,
											fontWeight: 600,
										}}
									>
										Record payment
									</Text>
									<TouchableOpacity
										onPress={closePaymentModal}
									>
										<Ionicons
											name="close-sharp"
											size={24}
											color="black"
										/>
									</TouchableOpacity>
								</View>
								<View style={{ width: '100%' }}>
									<Text
										style={{
											fontSize: 16,
											marginBottom: 5,
										}}
									>
										Amount Paid
									</Text>
									<TextInput
										style={[styles.input]}
										placeholder="Amount (NGN)"
										value={amountPaid?.toLocaleString()}
										keyboardType="numeric"
										onChangeText={(value) =>
											setAmountPaid(value)
										}
									/>
								</View>
								<Text
									style={{ fontSize: 16 }}
									className="text-lg mt-5"
								>
									Method of payment
								</Text>
								<View style={styles.paymentMethodContainer}>
									{/* Wallet Payment Option */}
									<TouchableOpacity
										style={[
											styles.paymentMethodButton,
											selectedMethod === 'transfer' &&
												styles.selectedPaymentMethod,
										]}
										onPress={() =>
											setSelectedMethod('transfer')
										}
									>
										<View
											style={[
												styles.circle,
												selectedMethod === 'transfer' &&
													styles.selectedCircle,
											]}
										>
											{selectedMethod === 'transfer' && (
												<View style={styles.circleInner} />
											)}
										</View>
										<View>
											<Text
												style={styles.paymentMethodText}
											>
												Bank transfer
											</Text>
										</View>
									</TouchableOpacity>

									{/* Services Option */}
									<TouchableOpacity
										style={[
											styles.paymentMethodButton,
											selectedMethod === 'cash' &&
												styles.selectedPaymentMethod,
										]}
										onPress={() =>
											setSelectedMethod('cash')
										}
									>
										<View
											style={[
												styles.circle,
												selectedMethod === 'cash' &&
													styles.selectedCircle,
											]}
										>
											{selectedMethod === 'cash' && (
												<View style={styles.circleInner} />
											)}
										</View>
										<View>
											<Text
												style={styles.paymentMethodText}
											>
												Cash
											</Text>
										</View>
									</TouchableOpacity>
								</View>
								<View
									style={{
										flexDirection: 'row',
										justifyContent: 'flex-end',
										gap: 10,
									}}
								>
									<TouchableOpacity
										style={{
											marginTop: 10,
											paddingVertical: 10,
											paddingHorizontal: 20,
											backgroundColor: '#121212',
											borderRadius: 5,
										}}
										onPress={() => handleRecordPayment()}
									>
										<Text
											style={{
												color: '#fff',
												fontWeight: 'bold',
											}}
										>
											Record
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					</Modal>
				</Modal>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
		paddingBottom: 5,
		marginBottom: 10,
	},
	headerCell: {
		flex: 1,
		fontWeight: 'bold',
		textAlign: 'center',
	},
	row: {
		flexDirection: 'row',
		paddingVertical: 10,
		// borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		alignItems: 'flex-start',
	},
	cell: {
		flex: 1,
		textAlign: 'center',
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.65)',
	},
	modalContent: {
		width: '80%',
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 20,
		// alignItems: 'center',
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 15,
		textAlign: 'center',
	},
	closeButton: {
		marginTop: 20,
		padding: 10,
		backgroundColor: '#007BFF',
		borderRadius: 5,
	},
	closeButtonText: {
		color: '#fff',
		fontWeight: 'bold',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		padding: 10,
		marginBottom: 0,
		borderRadius: 5,
	},
	paymentMethodContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 5,
		marginBottom: 10,
	},
	paymentMethodButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 10,
		width: '48%', // for equal width buttons side by side
	},
	selectedPaymentMethod: {
		borderColor: '#18a54a',
	},
	paymentMethodText: {
		fontSize: 14,
		marginLeft: 10,
	},
	circle: {
		height: 20,
		width: 20,
		borderRadius: 12, // makes the circle
		borderWidth: 2,
		borderColor: '#ccc',
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedCircle: {
		borderColor: '#18a54a', // green for selected state
	},
	circleInner: {
		height: 10,
		width: 10,
		borderRadius: 6,
		backgroundColor: '#18a54a', // inner green dot when selected
	},
});

export default InvoiceTable;
