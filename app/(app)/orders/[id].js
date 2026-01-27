import {
	useLocalSearchParams,
	useRouter,
} from 'expo-router';
import React, {
	useContext,
	useEffect,
	useState,
	useCallback,
} from 'react';
import {
	View,
	Text,
	ScrollView,
	Alert,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	Modal,
	ActivityIndicator,
	ToastAndroid,
	Image,
	Linking,
	Platform,
	SafeAreaView,
} from 'react-native';
import axiosInstance from '@/utils/axiosInstance';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AuthContext } from '@/context/AuthContext';

const COLORS = {
	primary: '#065637',
	primaryLight: '#E8F5E9',
	secondary: '#F9FAFB',
	text: '#111827',
	textLight: '#6B7280',
	border: '#E5E7EB',
	white: '#FFFFFF',
	danger: '#DC2626',
	success: '#059669',
	warning: '#D97706',
	blue: '#2563EB',
};

const ALL_STATUSES = [
	'pending',
	'processing',
	'accepted',
	'out-for-delivery',
	'completed',
	'cancelled',
	'rejected',
	'refunded',
];

const SingleOrderPage = () => {
	const { userInfo, sendPushNotification } = useContext(AuthContext);
	const { id } = useLocalSearchParams();
	const [order, setOrder] = useState(null);
	const [loading, setLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();

	// State for logic
	const [deliveryCode, setDeliveryCode] = useState('');
	const [deliveryType, setDeliveryType] = useState('');
	const [availableRunners, setAvailableRunners] = useState([]);
	const [showRunnerModal, setShowRunnerModal] = useState(false);
	const [selectedRunner, setSelectedRunner] = useState(null);
	const [runnerLoading, setRunnerLoading] = useState(false);
	const [showStatusModal, setShowStatusModal] = useState(false);
	const [statusUpdating, setStatusUpdating] = useState(false);
	const [showSelfDeliveryModal, setShowSelfDeliveryModal] = useState(false);
	const [selfDeliveryCode, setSelfDeliveryCode] = useState('');
	const [expandedSections, setExpandedSections] = useState({
		items: true,
		summary: true,
		customer: true,
	});
	// Record Payment State
	const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
	const [paymentAmount, setPaymentAmount] = useState('');
	const [paymentMethod, setPaymentMethod] = useState('cash');
	const [paymentNote, setPaymentNote] = useState('');

	const orderId = id;

	// --- Helpers ---
	const formatOrderId = (id) => id ? `#${id.slice(-6).toUpperCase()}` : 'N/A';

	// --- Data Fetching ---
	const fetchOrderDetails = useCallback(async () => {
		setLoading(true);
		try {
			const response = await axiosInstance.get(`/orders/${orderId}`);
			setOrder(response.data.order);

			if (response.data.customerInfo?.pickUp === true) {
				setDeliveryType('customer_pickup');
			} else if (response.data.deliveryOption) {
				setDeliveryType(response.data.deliveryOption);
			} else if (response.data.runnerInfo?.runnerId) {
				setDeliveryType('assigned');
			} else {
				setDeliveryType('');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to fetch order details.');
			console.error('Error fetching order:', error);
		} finally {
			setLoading(false);
		}
	}, [orderId]);

	useEffect(() => {
		fetchOrderDetails();
	}, [fetchOrderDetails]);

	// --- Fetch Runners ---
	const fetchDeliveryPersonnel = async () => {
		setRunnerLoading(true);
		try {
			const personnelFromOrder = order?.storeId?.deliverySettings?.personnel;
			if (Array.isArray(personnelFromOrder) && personnelFromOrder.length > 0) {
				setAvailableRunners(personnelFromOrder);
				return;
			}
			const storeId = order?.storeId?._id || order?.storeId;
			if (!storeId) return;

			const resp = await axiosInstance.get(`/stores?id=${storeId}`);
			setAvailableRunners(resp.data?.deliverySettings?.personnel || []);
		} catch (error) {
			Alert.alert('Error', 'Failed to fetch delivery personnel.');
		} finally {
			setRunnerLoading(false);
		}
	};

	// --- Helper ---
	const showToast = (message) => {
		if (Platform.OS === 'android') {
			ToastAndroid.show(message, ToastAndroid.SHORT);
		} else {
			Alert.alert('', message);
		}
	};

	const toggleSection = (section) => {
		setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
	};

	const getStatusColor = (status) => {
		switch (status?.toLowerCase()) {
			case 'completed': return COLORS.success;
			case 'accepted': return COLORS.success;
			case 'pending': return COLORS.warning;
			case 'processing': return COLORS.blue;
			case 'cancelled':
			case 'rejected': return COLORS.danger;
			default: return COLORS.textLight;
		}
	};

	// --- Actions ---
	const handleUpdateOrderStatus = async (status) => {
		if (!status) return;
		setStatusUpdating(true);
		try {
			const response = await axiosInstance.patch(`/orders/${orderId}/status`, { status });
			if (response.status === 200) {
				await fetchOrderDetails();
				showToast(`Order updated to ${status}.`);
				setShowStatusModal(false);
				const refreshed = response.data?.order || (await axiosInstance.get(`/orders/${orderId}`)).data;
				if (refreshed?.customerInfo?.expoPushToken) {
					sendPushNotification(
						refreshed.customerInfo.expoPushToken,
						`Order ${formatOrderId(refreshed.orderNumber)} ${status.charAt(0).toUpperCase() + status.slice(1)}!`,
						`Your order status is now ${status}.`
					);
				}
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to update status.');
		} finally {
			setStatusUpdating(false);
		}
	};

	const handleProcessPaymentToRestaurant = async () => {
		setIsSubmitting(true);
		try {
			await axiosInstance.patch(`/orders/${orderId}/payment-status`, { status: 'paid' });
			await fetchOrderDetails();
			const refreshed = (await axiosInstance.get(`/orders/${orderId}`)).data;
			if (refreshed?.storeId?.expoPushToken) {
				sendPushNotification(
					refreshed.storeId.expoPushToken,
					'Payment Received!',
					`You've received ₦${refreshed.itemsAmount?.toLocaleString()} for order ${formatOrderId(refreshed.orderNumber)}.`
				);
			}
		} catch (error) {
			console.error(error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCompleteDelivery = async (code) => {
		const codeToSend = code ?? deliveryCode;
		if ((['self', 'assigned'].includes(deliveryType) || order.customerInfo?.pickUp) && codeToSend?.length !== 4) {
			return Alert.alert('Invalid Code', 'Enter a valid 4-digit code.');
		}

		setIsSubmitting(true);
		try {
			await axiosInstance.post(`/businesses/${userInfo?._id}/order/${orderId}/delivered`, { deliveryCode: codeToSend });
			await fetchOrderDetails();
			showToast('Order marked as delivered!');
			if (order?.payment?.status !== 'paid') await handleProcessPaymentToRestaurant();
			if (order?.customerInfo?.expoPushToken) {
				sendPushNotification(order.customerInfo.expoPushToken, 'Order Delivered!', `Order ${formatOrderId(order.orderNumber)} completed.`);
			}
			router.replace('(tabs)/orders');
		} catch (err) {
			Alert.alert('Delivery Failed', err.response?.data?.message || 'Failed to complete delivery.');
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- Logic ---
	const handleRecordPayment = async () => {
		if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
			return Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
		}

		setIsSubmitting(true);
		try {
			await axiosInstance.post(`/orders/${orderId}/payments`, {
				amount: Number(paymentAmount),
				method: paymentMethod,
				note: paymentNote,
			});
			await fetchOrderDetails();
			showToast('Payment recorded successfully!');
			setShowRecordPaymentModal(false);

			// Trigger standard payment received notification to store owner (optional, as they recorded it themselves, but keeps log consistent)
			// But critically, backend now handles the Customer Digital Delivery notification automatically.

		} catch (error) {
			Alert.alert('Error', error.response?.data?.message || 'Failed to record payment.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const assignRunner = async (runner) => {
		if (!runner) return;
		setIsSubmitting(true);
		try {
			await axiosInstance.post(`/orders/${orderId}/assign-runner`, { runnerId: runner._id });
			await fetchOrderDetails();
			showToast(`${runner.name} assigned!`);
			if (runner.expoPushToken) sendPushNotification(runner.expoPushToken, 'New Delivery Assignment!', `Order ${formatOrderId(order.orderNumber)} assigned.`);
			setShowRunnerModal(false);
		} catch (error) {
			Alert.alert('Error', 'Failed to assign runner.');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleRemoveRunner = async () => {
		Alert.alert('Remove Runner?', 'Are you sure?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Remove',
				onPress: async () => {
					setIsSubmitting(true);
					try {
						await axiosInstance.patch(`/orders/${orderId}/clear-runner`);
						await fetchOrderDetails();
						setDeliveryType('unassigned');
						showToast('Runner removed.');
					} catch (error) {
						Alert.alert('Error', 'Failed to remove runner.');
					} finally {
						setIsSubmitting(false);
					}
				},
			},
		]);
	};

	const handleSelectDeliveryType = async (type) => {
		if (type === 'assigned' && order?.runnerInfo?.runnerId) {
			return Alert.alert('Reassign Runner?', 'Do you want to change the runner?', [
				{ text: 'No', style: 'cancel' },
				{
					text: 'Yes', onPress: async () => {
						setDeliveryType(type);
						await fetchDeliveryPersonnel();
						setShowRunnerModal(true);
					}
				}
			]);
		}
		if (deliveryType === type) return;

		setIsSubmitting(true);
		try {
			if (type === 'self') {
				setShowSelfDeliveryModal(true); setIsSubmitting(false); return;
			}
			setDeliveryType(type);
			if (type === 'assigned') {
				await fetchDeliveryPersonnel(); setShowRunnerModal(true);
			} else if (type === 'self' && order?.runnerInfo?.runnerId) {
				await axiosInstance.patch(`/orders/${orderId}/clear-runner`);
				await fetchOrderDetails();
			}
			await fetchOrderDetails();
		} catch (error) {
			Alert.alert('Error', 'Failed to set delivery type.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
	if (!order) return <View style={styles.center}><Text>Order not found</Text><TouchableOpacity onPress={fetchOrderDetails}><Text style={{ color: COLORS.primary }}>Retry</Text></TouchableOpacity></View>;

	const isStatusUpdatable = !['completed', 'cancelled', 'rejected', 'refunded'].includes(order.status);
	const isRunnerAssigned = order.runnerInfo && order.runnerInfo.runnerId;
	const shouldShowCompleteDeliverySection = order.status === 'accepted' && (order.customerInfo?.pickUp || deliveryType === 'self' || isRunnerAssigned);
	const showDeliveryMethod = ['accepted', 'processing', 'out-for-delivery'].includes(order?.status) && !order.customerInfo?.pickUp;

	const Card = ({ title, children, expanded, onToggle }) => (
		<View style={styles.card}>
			<TouchableOpacity onPress={onToggle} style={styles.cardHeader} disabled={!onToggle}>
				<Text style={styles.cardTitle}>{title}</Text>
				{onToggle && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textLight} />}
			</TouchableOpacity>
			{(!onToggle || expanded) && <View style={styles.cardContent}>{children}</View>}
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" backgroundColor={COLORS.white} />

			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
					<Ionicons name="arrow-back" size={24} color={COLORS.text} />
				</TouchableOpacity>
				<View style={styles.headerTitleContainer}>
					<Text style={styles.headerTitle}>Order {formatOrderId(order.orderNumber)}</Text>
					<Text style={styles.subHeaderDate}>{new Date(order.createdAt).toLocaleDateString()}</Text>
				</View>
				<View style={[styles.statusPill, { backgroundColor: getStatusColor(order.status) + '15', borderColor: getStatusColor(order.status) + '40' }]}>
					<Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
						{order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
					</Text>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Customer Details */}
				<Card
					title="Customer"
					expanded={expandedSections.customer}
					onToggle={() => toggleSection('customer')}
				>
					<View style={styles.customerContainer}>
						<View style={styles.customerRow}>
							<View style={styles.avatarPlaceholder}>
								<Text style={styles.avatarText}>{order.customerInfo?.name?.charAt(0) || 'C'}</Text>
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.customerName}>{order.customerInfo?.name || 'Guest'}</Text>
								<Text style={styles.customerAddress}>
									{order.customerInfo?.pickUp ? 'Pickup Order' : (order.customerInfo?.address || 'No address provided')}
								</Text>
							</View>
						</View>

						{order.customerInfo?.contact && (
							<View style={styles.contactActions}>
								<TouchableOpacity
									style={styles.actionButtonOutline}
									onPress={() => Linking.openURL(`tel:${order.customerInfo.contact}`)}
								>
									<Feather name="phone" size={16} color={COLORS.text} />
									<Text style={styles.actionButtonText}>Call</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.actionButtonOutline}
									onPress={() => Linking.openURL(`https://wa.me/${order.customerInfo.contact.replace('+', '')}`)}
								>
									<MaterialCommunityIcons name="whatsapp" size={18} color={COLORS.text} />
									<Text style={styles.actionButtonText}>Message</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				</Card>

				{/* Order Items */}
				<Card title={`Items (${order.items?.length || 0})`} expanded={expandedSections.items} onToggle={() => toggleSection('items')}>
					{order.items?.map((item, idx) => (
						<View key={idx} style={styles.itemRow}>
							<View style={styles.qtyBadge}>
								<Text style={styles.qtyText}>{item.quantity}x</Text>
							</View>
							<View style={styles.itemInfo}>
								<Text style={styles.itemName}>{item.name}</Text>
								{item.variants?.map((v, i) => (
									<Text key={`variant-${i}`} style={styles.variantText}>+ {v.name}</Text>
								))}
								{item.addOns?.map((addOn, i) => (
									<Text key={`addon-${i}`} style={styles.variantText}>
										+ {addOn.name} {addOn.quantity > 1 ? `(x${addOn.quantity})` : ''}
										{addOn.price > 0 ? ` - ₦${(addOn.price * addOn.quantity).toLocaleString()}` : ''}
									</Text>
								))}
							</View>
							<Text style={styles.itemPrice}>₦{(item.totalPrice || item.price * item.quantity).toLocaleString()}</Text>
						</View>
					))}
				</Card>

				{/* Delivery Method */}
				{showDeliveryMethod && (
					<Card title="Delivery Method">
						<View style={styles.deliverySelector}>
							<TouchableOpacity
								style={[styles.deliveryChoice, deliveryType === 'self' && styles.deliveryChoiceActive]}
								onPress={() => handleSelectDeliveryType('self')}
							>
								<Text style={[styles.deliveryChoiceText, deliveryType === 'self' && styles.deliveryChoiceTextActive]}>Self Delivery</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.deliveryChoice, deliveryType === 'assigned' && styles.deliveryChoiceActive]}
								onPress={() => handleSelectDeliveryType('assigned')}
							>
								<Text style={[styles.deliveryChoiceText, deliveryType === 'assigned' && styles.deliveryChoiceTextActive]}>Runner</Text>
							</TouchableOpacity>
						</View>

						{isRunnerAssigned && (
							<View style={styles.runnerInfoContainer}>
								<Image
									source={{ uri: order.runnerInfo.profileImage || 'https://via.placeholder.com/40' }}
									style={styles.runnerAvatar}
								/>
								<View style={{ flex: 1 }}>
									<Text style={styles.runnerName}>{order.runnerInfo.name}</Text>
									<Text style={styles.runnerPhone}>{order.runnerInfo.contact}</Text>
								</View>
								<TouchableOpacity onPress={handleRemoveRunner} style={styles.iconButton}>
									<Ionicons name="close" size={20} color={COLORS.textLight} />
								</TouchableOpacity>
							</View>
						)}
					</Card>
				)}

				{/* Complete Delivery Input */}
				{shouldShowCompleteDeliverySection && !['completed', 'cancelled'].includes(order.status) && (
					<Card title="Verification">
						<Text style={styles.helpText}>Enter the 4-digit code provided by the customer</Text>
						<View style={styles.codeRow}>
							<TextInput
								style={styles.codeInput}
								value={deliveryCode}
								onChangeText={setDeliveryCode}
								placeholder="0000"
								placeholderTextColor="#D1D5DB"
								keyboardType="number-pad"
								maxLength={4}
							/>
							<TouchableOpacity
								style={[styles.verifyBtn, (deliveryCode.length !== 4 || isSubmitting) && { opacity: 0.5 }]}
								disabled={deliveryCode.length !== 4 || isSubmitting}
								onPress={() => handleCompleteDelivery()}
							>
								{isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={24} color="#fff" />}
							</TouchableOpacity>
						</View>
					</Card>
				)}

				{/* Summary */}
				<Card title="Payment Summary" expanded={expandedSections.summary} onToggle={() => toggleSection('summary')}>
					<View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>₦{order.itemsAmount?.toLocaleString()}</Text></View>
					{order.deliveryFee > 0 && (
						<View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery Fee</Text><Text style={styles.summaryValue}>₦{order.deliveryFee?.toLocaleString()}</Text></View>
					)}
					{order.serviceFee > 0 && (
						null
					)}

					{order.discountAmount > 0 && (
						<View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: COLORS.danger }]}>Discount</Text><Text style={[styles.summaryValue, { color: COLORS.danger }]}>-₦{order.discountAmount?.toLocaleString()}</Text></View>
					)}
					<View style={styles.totalRow}>
						<Text style={styles.totalLabel}>Total Payout</Text>
						<Text style={styles.totalValue}>
							₦{((order.itemsAmount || 0) + (order.deliveryFee || 0) - (order.discountAmount || 0)).toLocaleString()}
						</Text>
					</View>

					{/* Record Payment Button */}
					{order.payment?.status !== 'paid' && (
						<TouchableOpacity
							style={styles.recordPaymentBtn}
							onPress={() => {
								setPaymentAmount(String(order.outstandingAmount ?? order.totalAmount));
								setShowRecordPaymentModal(true);
							}}
						>
							<Ionicons name="cash-outline" size={18} color={COLORS.primary} />
							<Text style={styles.recordPaymentText}>Record Payment</Text>
						</TouchableOpacity>
					)}
				</Card>

				<View style={{ height: 100 }} />
			</ScrollView>

			{/* Bottom Actions */}
			{
				isStatusUpdatable && (
					<View style={styles.actionBar}>
						{order.status === 'pending' ? (
							<View style={styles.pendingActions}>
								<TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleUpdateOrderStatus('rejected')}>
									<Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Reject</Text>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => handleUpdateOrderStatus('accepted')}>
									<Text style={[styles.actionBtnText, { color: COLORS.white }]}>Accept Order</Text>
								</TouchableOpacity>
							</View>
						) : (
							<TouchableOpacity style={[styles.actionBtn, styles.updateBtn]} onPress={() => setShowStatusModal(true)}>
								<Text style={styles.actionBtnText}>Update Status</Text>
							</TouchableOpacity>
						)}
					</View>
				)
			}

			{/* Status Modal */}
			<Modal visible={showStatusModal} transparent animationType="fade" onRequestClose={() => setShowStatusModal(false)}>
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusModal(false)}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Update Status</Text>
						{ALL_STATUSES.map(status => (
							<TouchableOpacity key={status} style={styles.modalItem} onPress={() => handleUpdateOrderStatus(status)}>
								<Text style={[styles.modalItemText, { color: status === order.status ? COLORS.primary : COLORS.text }]}>
									{status.charAt(0).toUpperCase() + status.slice(1)}
								</Text>
								{status === order.status && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
							</TouchableOpacity>
						))}
					</View>
				</TouchableOpacity>
			</Modal>

			{/* Runner Modal */}
			<Modal visible={showRunnerModal} transparent animationType="slide" onRequestClose={() => setShowRunnerModal(false)}>
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRunnerModal(false)}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Assign Runner</Text>
						{runnerLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
							<ScrollView style={{ maxHeight: 400 }}>
								{availableRunners && availableRunners.length > 0 ? availableRunners.map(runner => (
									<TouchableOpacity key={runner._id} style={styles.runnerModalItem} onPress={() => assignRunner(runner)}>
										<Image source={{ uri: runner.profileImage || 'https://via.placeholder.com/40' }} style={styles.runnerAvatarSmall} />
										<View style={{ flex: 1, marginLeft: 12 }}>
											<Text style={styles.runnerName}>{runner.name}</Text>
											<Text style={styles.runnerPhone}>{runner.contact || runner.phone}</Text>
										</View>
										<Ionicons name="arrow-forward-circle" size={24} color={COLORS.primary} />
									</TouchableOpacity>
								)) : (
									<View style={{ padding: 20, alignItems: 'center' }}>
										<Text style={{ color: COLORS.textLight }}>No runners available</Text>
									</View>
								)}
							</ScrollView>
						)}
					</View>
				</TouchableOpacity>
			</Modal>

			{/* Self Delivery Confirm */}
			<Modal visible={showSelfDeliveryModal} transparent animationType="fade" onRequestClose={() => setShowSelfDeliveryModal(false)}>
				<View style={styles.modalCenterOverlay}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>Confirm Self Delivery</Text>
						<Text style={styles.helpText}>Enter 4-digit verification code:</Text>
						<TextInput
							style={styles.modalCodeInput}
							value={selfDeliveryCode}
							onChangeText={setSelfDeliveryCode}
							keyboardType="number-pad"
							maxLength={4}
							autoFocus
							placeholder="0000"
						/>
						<View style={styles.modalActions}>
							<TouchableOpacity onPress={() => setShowSelfDeliveryModal(false)} style={styles.mdlBtnOutline}>
								<Text style={{ color: COLORS.text }}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={async () => {
									if (selfDeliveryCode.length !== 4) return;
									setShowSelfDeliveryModal(false);
									setDeliveryType('self');
									await handleCompleteDelivery(selfDeliveryCode);
									setSelfDeliveryCode('');
								}}
								style={styles.mdlBtnPrimary}
							>
								<Text style={{ color: COLORS.white }}>Verify & Complete</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Record Payment Modal */}
			<Modal visible={showRecordPaymentModal} transparent animationType="slide" onRequestClose={() => setShowRecordPaymentModal(false)}>
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRecordPaymentModal(false)}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Record Payment</Text>

						<Text style={styles.inputLabel}>Amount (₦)</Text>
						<TextInput
							style={styles.modalInput}
							value={paymentAmount}
							onChangeText={setPaymentAmount}
							keyboardType="numeric"
							placeholder="0.00"
						/>

						<Text style={styles.inputLabel}>Payment Method</Text>
						<View style={styles.methodSelector}>
							{['cash', 'pos', 'transfer', 'other'].map(m => (
								<TouchableOpacity
									key={m}
									style={[styles.methodOption, paymentMethod === m && styles.methodOptionActive]}
									onPress={() => setPaymentMethod(m)}
								>
									<Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>
										{m.toUpperCase()}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<Text style={styles.inputLabel}>Note (Optional)</Text>
						<TextInput
							style={styles.modalInput}
							value={paymentNote}
							onChangeText={setPaymentNote}
							placeholder="e.g. Paid at pickup"
						/>

						<TouchableOpacity
							style={[styles.mdlBtnPrimary, { marginTop: 16, flex: 0, minHeight: 48, width: '100%' }]}
							onPress={handleRecordPayment}
							disabled={isSubmitting}
						>
							{isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 16 }}>Confirm Payment</Text>}
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>

		</SafeAreaView >
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#FFFFFF' },
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

	header: {
		backgroundColor: COLORS.white,
		paddingHorizontal: 20,
		paddingVertical: 16,
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	iconBtn: { padding: 4, marginRight: 12 },
	headerTitleContainer: { flex: 1 },
	headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, letterSpacing: -0.5 },
	subHeaderDate: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
	statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
	statusText: { fontSize: 11, fontWeight: '600' },

	scrollContent: { padding: 20 },

	card: {
		marginBottom: 24,
	},
	cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
	cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', letterSpacing: 0.2, textTransform: 'uppercase' },
	cardContent: {
		backgroundColor: '#FFFFFF',
		// No heavy borders or shadows, just clean layout
	},

	// Customer
	customerContainer: { flexDirection: 'column', gap: 16 },
	customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
	avatarText: { fontSize: 16, fontWeight: '600', color: '#4B5563' },
	customerName: { fontSize: 16, fontWeight: '500', color: COLORS.text },
	customerAddress: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
	contactActions: { flexDirection: 'row', gap: 10 },
	actionButtonOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
	actionButtonText: { fontSize: 13, fontWeight: '500', color: COLORS.text },

	// Items
	itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	qtyBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 12 },
	qtyText: { fontSize: 12, fontWeight: '600', color: '#374151' },
	itemInfo: { flex: 1 },
	itemName: { fontSize: 14, fontWeight: '500', color: COLORS.text, lineHeight: 20 },
	variantText: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
	itemPrice: { fontSize: 14, fontWeight: '600', color: COLORS.text },

	// Delivery Method
	deliverySelector: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 4, marginBottom: 12 },
	deliveryChoice: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
	deliveryChoiceActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { height: 1, width: 0 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
	deliveryChoiceText: { fontSize: 13, fontWeight: '500', color: COLORS.textLight },
	deliveryChoiceTextActive: { color: COLORS.text, fontWeight: '600' },
	runnerInfoContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', gap: 12 },
	iconButton: { padding: 8 },

	// Verification
	helpText: { fontSize: 13, color: COLORS.textLight, marginBottom: 12 },
	codeRow: { flexDirection: 'row', gap: 12 },
	codeInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 18, textAlign: 'center', letterSpacing: 4, color: COLORS.text },
	verifyBtn: { backgroundColor: COLORS.primary, width: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

	// Summary
	summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
	summaryLabel: { fontSize: 14, color: COLORS.textLight },
	summaryValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
	totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
	totalLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
	totalValue: { fontSize: 18, fontWeight: '700', color: COLORS.primary },

	// Actions
	actionBar: {
		position: 'absolute', bottom: 0, left: 0, right: 0,
		backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 16,
		borderTopWidth: 1,
		borderTopColor: '#F3F4F6',
	},
	pendingActions: { flexDirection: 'row', gap: 12 },
	actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	rejectBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
	acceptBtn: { backgroundColor: COLORS.primary },
	updateBtn: { backgroundColor: COLORS.text },
	actionBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },

	// Modals
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
	modalCenterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
	modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
	modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24 },
	modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
	modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	modalItemText: { fontSize: 15, fontWeight: '500' },
	runnerModalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	runnerAvatarSmall: { width: 36, height: 36, borderRadius: 18 },
	modalCodeInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, fontSize: 24, textAlign: 'center', letterSpacing: 8, marginVertical: 16 },
	modalActions: { flexDirection: 'row', gap: 12 },
	mdlBtnOutline: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
	mdlBtnPrimary: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },

	// Record Payment Styles
	recordPaymentBtn: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: COLORS.primaryLight, borderRadius: 8, gap: 8 },
	recordPaymentText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
	inputLabel: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginBottom: 6 },
	modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, color: COLORS.text },
	methodSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
	methodOption: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F9FAFB' },
	methodOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
	methodText: { fontSize: 12, fontWeight: '500', color: COLORS.textLight },
	methodTextActive: { color: COLORS.white },
});

export default SingleOrderPage;
