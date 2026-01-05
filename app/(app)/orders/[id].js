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
	secondary: '#F3F4F6',
	text: '#1F2937',
	textLight: '#6B7280',
	border: '#E5E7EB',
	white: '#FFFFFF',
	danger: '#EF4444',
	success: '#10B981',
	warning: '#F59E0B',
	blue: '#3B82F6',
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

	const orderId = id;

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
						`Order #${refreshed.orderNumber} ${status.charAt(0).toUpperCase() + status.slice(1)}!`,
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
					`You've received ₦${refreshed.itemsAmount?.toLocaleString()} for order #${refreshed.orderNumber}.`
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
				sendPushNotification(order.customerInfo.expoPushToken, 'Order Delivered!', `Order #${order.orderNumber} completed.`);
			}
			router.replace('(tabs)/orders');
		} catch (err) {
			Alert.alert('Delivery Failed', err.response?.data?.message || 'Failed to complete delivery.');
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- Logic ---
	const assignRunner = async (runner) => {
		if (!runner) return;
		setIsSubmitting(true);
		try {
			await axiosInstance.post(`/orders/${orderId}/assign-runner`, { runnerId: runner._id });
			await fetchOrderDetails();
			showToast(`${runner.name} assigned!`);
			if (runner.expoPushToken) sendPushNotification(runner.expoPushToken, 'New Delivery Assignment!', `Order #${order.orderNumber} assigned.`);
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
				{onToggle && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textLight} />}
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
				<Text style={styles.headerTitle}>Order #{order.orderNumber}</Text>
				<View style={[styles.statusPill, { backgroundColor: getStatusColor(order.status) + '20' }]}>
					<Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
						{order.status?.toUpperCase()}
					</Text>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContent}>
				{/* Customer Details */}
				<Card
					title="Customer Details"
					expanded={expandedSections.customer}
					onToggle={() => toggleSection('customer')}
				>
					<View style={styles.detailRow}>
						<View style={styles.iconBox}><Ionicons name="person-outline" size={18} color={COLORS.primary} /></View>
						<Text style={styles.detailText}>{order.customerInfo?.name || 'N/A'}</Text>
					</View>
					<View style={styles.detailRow}>
						<View style={styles.iconBox}><Ionicons name="location-outline" size={18} color={COLORS.primary} /></View>
						<Text style={styles.detailText}>
							{order.customerInfo?.pickUp ? 'Pickup at Store' : (order.customerInfo?.address || 'N/A')}
						</Text>
					</View>

					{order.customerInfo?.contact && (
						<View style={styles.contactActions}>
							<TouchableOpacity 
								style={[styles.contactBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
								onPress={() => Linking.openURL(`tel:${order.customerInfo.contact}`)}
							>
								<Feather name="phone" size={18} color={COLORS.blue} />
								<Text style={[styles.contactBtnText, { color: COLORS.blue }]}>Call</Text>
							</TouchableOpacity>
							<TouchableOpacity 
								style={[styles.contactBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
								onPress={() => Linking.openURL(`https://wa.me/${order.customerInfo.contact.replace('+', '')}`)}
							>
								<MaterialCommunityIcons name="whatsapp" size={20} color={COLORS.success} />
								<Text style={[styles.contactBtnText, { color: COLORS.success }]}>WhatsApp</Text>
							</TouchableOpacity>
						</View>
					)}
				</Card>

				{/* Delivery Method */}
				{showDeliveryMethod && (
					<Card title="Delivery Method">
						<View style={styles.deliveryGrid}>
							<TouchableOpacity 
								style={[styles.deliveryOption, deliveryType === 'self' && styles.deliveryOptionActive]}
								onPress={() => handleSelectDeliveryType('self')}
							>
								<MaterialCommunityIcons name="truck-delivery-outline" size={28} color={deliveryType === 'self' ? COLORS.primary : COLORS.textLight} />
								<Text style={[styles.deliveryOptionText, deliveryType === 'self' && { color: COLORS.primary }]}>Self Delivery</Text>
							</TouchableOpacity>
							<TouchableOpacity 
								style={[styles.deliveryOption, deliveryType === 'assigned' && styles.deliveryOptionActive]}
								onPress={() => handleSelectDeliveryType('assigned')}
							>
								<MaterialCommunityIcons name="account-group-outline" size={28} color={deliveryType === 'assigned' ? COLORS.primary : COLORS.textLight} />
								<Text style={[styles.deliveryOptionText, deliveryType === 'assigned' && { color: COLORS.primary }]}>Use Runner</Text>
							</TouchableOpacity>
						</View>

						{isRunnerAssigned && (
							<View style={styles.runnerCard}>
								<View style={styles.runnerHeader}>
									<Image
										source={{ uri: order.runnerInfo.profileImage || 'https://via.placeholder.com/40' }}
										style={styles.runnerAvatar}
									/>
									<View style={{ flex: 1 }}>
										<Text style={styles.runnerName}>{order.runnerInfo.name}</Text>
										<Text style={styles.runnerPhone}>{order.runnerInfo.contact}</Text>
									</View>
									<TouchableOpacity onPress={handleRemoveRunner}>
										<Ionicons name="trash-outline" size={20} color={COLORS.danger} />
									</TouchableOpacity>
								</View>
							</View>
						)}
					</Card>
				)}

				{/* Complete Delivery Input */}
				{shouldShowCompleteDeliverySection && !['completed', 'cancelled'].includes(order.status) && (
					<Card title="Complete Delivery">
						<Text style={styles.helpText}>Ask customer for the 4-digit verification code</Text>
						<View style={styles.codeRow}>
							<TextInput
								style={styles.codeInput}
								value={deliveryCode}
								onChangeText={setDeliveryCode}
								placeholder="0000"
								keyboardType="number-pad"
								maxLength={4}
							/>
							<TouchableOpacity 
								style={[styles.goBtn, (deliveryCode.length !== 4 || isSubmitting) && { opacity: 0.5 }]}
								disabled={deliveryCode.length !== 4 || isSubmitting}
								onPress={() => handleCompleteDelivery()}
							>
								{isSubmitting ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-forward" size={24} color="#fff" />}
							</TouchableOpacity>
						</View>
					</Card>
				)}

				{/* Order Items */}
				<Card title={`Items (${order.items?.length || 0})`} expanded={expandedSections.items} onToggle={() => toggleSection('items')}>
					{order.items?.map((item, idx) => (
						<View key={idx} style={styles.itemRow}>
							<View style={styles.itemInfo}>
								<Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
								{item.variants?.map((v, i) => (
									<Text key={i} style={styles.variantText}>+ {v.name}</Text>
								))}
								{item.type === 'service' && item.service?.startAt && (
									<Text style={styles.variantText}>📅 {new Date(item.service.startAt).toLocaleString()}</Text>
								)}
								{item.type === 'digital' && (
									<Text style={[styles.variantText, { color: COLORS.blue }]}>📎 Digital File</Text>
								)}
							</View>
							<Text style={styles.itemPrice}>₦{(item.totalPrice || item.price * item.quantity).toLocaleString()}</Text>
						</View>
					))}
				</Card>

				{/* Summary */}
				<Card title="Summary" expanded={expandedSections.summary} onToggle={() => toggleSection('summary')}>
					<View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>₦{order.itemsAmount?.toLocaleString()}</Text></View>
					{order.deliveryFee > 0 && (
						<View style={styles.summaryRow}><Text style={styles.summaryLabel}>Delivery</Text><Text style={styles.summaryValue}>₦{order.deliveryFee?.toLocaleString()}</Text></View>
					)}

					{order.discountAmount > 0 && (
						<View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: COLORS.danger }]}>Discount</Text><Text style={[styles.summaryValue, { color: COLORS.danger }]}>-₦{order.discountAmount?.toLocaleString()}</Text></View>
					)}
					<View style={[styles.totalRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' }]}>
						<Text style={[styles.totalLabel, { color: COLORS.primary }]}>Total Earnings</Text>
						<Text style={[styles.totalValue, { color: COLORS.primary }]}>
							₦{((order.totalAmount || 0) - (order.serviceFee || 0)).toLocaleString()}
						</Text>
					</View>
				</Card>

				<View style={{ height: 100 }} /> 
			</ScrollView>

			{/* Bottom Actions */}
			{isStatusUpdatable && (
				<View style={styles.actionBar}>
					{order.status === 'pending' ? (
						<View style={styles.pendingActions}>
							<TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.danger, flex: 1, marginRight: 8 }]} onPress={() => handleUpdateOrderStatus('rejected')}>
								<Text style={styles.actionBtnText}>Reject</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success, flex: 2 }]} onPress={() => handleUpdateOrderStatus('accepted')}>
								<Text style={styles.actionBtnText}>Accept Order</Text>
							</TouchableOpacity>
						</View>
					) : (
							<TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={() => setShowStatusModal(true)}>
								<Text style={styles.actionBtnText}>Update Status</Text>
							</TouchableOpacity>
					)}
				</View>
			)}

			{/* Status Modal */}
			<Modal visible={showStatusModal} transparent animationType="slide" onRequestClose={() => setShowStatusModal(false)}>
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusModal(false)}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Update Status</Text>
						{ALL_STATUSES.map(status => (
							<TouchableOpacity key={status} style={styles.modalItem} onPress={() => handleUpdateOrderStatus(status)}>
								<Text style={[styles.modalItemText, { color: status === order.status ? COLORS.primary : COLORS.text }]}>
									{status.toUpperCase()}
								</Text>
								{status === order.status && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
							</TouchableOpacity>
						))}
					</View>
				</TouchableOpacity>
			</Modal>

			{/* Runner Modal */}
			<Modal visible={showRunnerModal} transparent animationType="slide" onRequestClose={() => setShowRunnerModal(false)}>
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRunnerModal(false)}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Select Runner</Text>
						{runnerLoading ? <ActivityIndicator /> : (
							<ScrollView style={{ maxHeight: 400 }}>
								{availableRunners.map(runner => (
									<TouchableOpacity key={runner._id} style={styles.runnerModalItem} onPress={() => assignRunner(runner)}>
										<Image source={{ uri: runner.profileImage || 'https://via.placeholder.com/40' }} style={styles.runnerAvatarSmall} />
										<View style={{ flex: 1, marginLeft: 12 }}>
											<Text style={styles.runnerName}>{runner.name}</Text>
											<Text style={styles.runnerPhone}>{runner.contact || runner.phone}</Text>
										</View>
										<Ionicons name="add-circle" size={24} color={COLORS.primary} />
									</TouchableOpacity>
								))}
								{availableRunners.length === 0 && <Text style={{ textAlign: 'center', color: COLORS.textLight, padding: 20 }}>No runners found</Text>}
							</ScrollView>
						)}
					</View>
				</TouchableOpacity>
			</Modal>

			{/* Self Delivery Confirm */}
			<Modal visible={showSelfDeliveryModal} transparent animationType="slide" onRequestClose={() => setShowSelfDeliveryModal(false)}>
				<View style={styles.modalCenterOverlay}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>Self Delivery</Text>
						<Text style={styles.helpText}>Enter 4-digit code to confirm:</Text>
						<TextInput
							style={[styles.codeInput, { width: '100%', textAlign: 'center', letterSpacing: 8, fontSize: 24 }]}
							value={selfDeliveryCode}
							onChangeText={setSelfDeliveryCode}
							keyboardType="number-pad"
							maxLength={4}
							autoFocus
						/>
						<View style={styles.modalActions}>
							<TouchableOpacity onPress={() => setShowSelfDeliveryModal(false)} style={[styles.mdlBtn, { backgroundColor: COLORS.secondary }]}>
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
								style={[styles.mdlBtn, { backgroundColor: COLORS.primary }]}
							>
								<Text style={{ color: COLORS.white }}>Confirm</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.secondary },
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

	header: {
		backgroundColor: COLORS.white,
		padding: 16,
		paddingTop: Platform.OS === 'android' ? 40 : 16,
		flexDirection: 'row',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		elevation: 2,
	},
	iconBtn: { padding: 8, marginRight: 8 },
	headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
	statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
	statusText: { fontSize: 12, fontWeight: '700' },

	scrollContent: { padding: 16 },

	card: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		marginBottom: 16,
		padding: 16,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 5,
		elevation: 2,
	},
	cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
	cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
	cardContent: { marginTop: 8 },

	detailRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
	iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
	detailText: { fontSize: 15, color: COLORS.text, flex: 1 },

	contactActions: { flexDirection: 'row', marginTop: 8, gap: 12 },
	contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
	contactBtnText: { fontWeight: '600', fontSize: 14 },

	deliveryGrid: { flexDirection: 'row', gap: 12 },
	deliveryOption: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FAFAFA' },
	deliveryOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
	deliveryOptionText: { marginTop: 8, fontWeight: '600', color: COLORS.textLight, fontSize: 13 },

	runnerCard: { marginTop: 16, padding: 12, backgroundColor: '#FAFAFA', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
	runnerHeader: { flexDirection: 'row', alignItems: 'center' },
	runnerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
	runnerName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
	runnerPhone: { fontSize: 12, color: COLORS.textLight },

	helpText: { fontSize: 14, color: COLORS.textLight, marginBottom: 12 },
	codeRow: { flexDirection: 'row', gap: 12 },
	codeInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, fontSize: 18, textAlign: 'center', letterSpacing: 4, backgroundColor: '#FAFAFA' },
	goBtn: { backgroundColor: COLORS.primary, width: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

	itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	itemInfo: { flex: 1 },
	itemName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
	variantText: { fontSize: 13, color: COLORS.textLight, marginTop: 2, paddingLeft: 8 },
	itemPrice: { fontSize: 15, fontWeight: '600', color: COLORS.text },

	summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
	summaryLabel: { fontSize: 14, color: COLORS.textLight },
	summaryValue: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
	totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
	totalLabel: { fontSize: 18, fontWeight: '800', color: COLORS.text },
	totalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },

	actionBar: {
		position: 'absolute', bottom: 0, left: 0, right: 0,
		backgroundColor: COLORS.white, padding: 16,
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
		elevation: 10,
	},
	pendingActions: { flexDirection: 'row' },
	actionBtn: { padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
	actionBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

	// Modals
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalCenterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
	modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
	modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24 },
	modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
	modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	modalItemText: { fontSize: 16, fontWeight: '600' },

	runnerModalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	runnerAvatarSmall: { width: 36, height: 36, borderRadius: 18 },

	modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
	mdlBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

export default SingleOrderPage;
