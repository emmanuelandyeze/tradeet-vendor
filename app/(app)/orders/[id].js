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
} from 'react-native';
import axiosInstance from '@/utils/axiosInstance';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AuthContext } from '@/context/AuthContext';

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
	const { userInfo, sendPushNotification } =
		useContext(AuthContext);
	const { id } = useLocalSearchParams();
	const [order, setOrder] = useState(null);
	const [loading, setLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();
	const [deliveryCode, setDeliveryCode] = useState('');
	const [deliveryType, setDeliveryType] = useState('');
	const [availableRunners, setAvailableRunners] = useState(
		[],
	);
	const [showRunnerModal, setShowRunnerModal] =
		useState(false);
	const [selectedRunner, setSelectedRunner] =
		useState(null);
	const [runnerLoading, setRunnerLoading] = useState(false);
	const [showStatusModal, setShowStatusModal] =
		useState(false);
	const [statusUpdating, setStatusUpdating] =
		useState(false);
	const [showSelfDeliveryModal, setShowSelfDeliveryModal] =
		useState(false);
	const [selfDeliveryCode, setSelfDeliveryCode] =
		useState('');
	const [expandedSections, setExpandedSections] = useState({
		items: true,
		summary: true,
	});

	const orderId = id;

	// --- Data Fetching ---
	const fetchOrderDetails = useCallback(async () => {
		setLoading(true);
		try {
			const response = await axiosInstance.get(
				`/orders/${orderId}`,
			);
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
			Alert.alert(
				'Error',
				'Failed to fetch order details. Please try again.',
			);
			console.error(
				'Error fetching order:',
				error.response?.data || error.message,
			);
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
			const personnelFromOrder =
				order?.storeId?.deliverySettings?.personnel;
			if (
				Array.isArray(personnelFromOrder) &&
				personnelFromOrder.length > 0
			) {
				setAvailableRunners(personnelFromOrder);
				return;
			}

			const storeId = order?.storeId?._id || order?.storeId;
			if (!storeId) {
				setAvailableRunners([]);
				Alert.alert(
					'Error',
					'Store ID not available to fetch delivery personnel.',
				);
				return;
			}

			const resp = await axiosInstance.get(
				`/stores?id=${storeId}`,
			);
			const personnel =
				resp.data?.deliverySettings?.personnel || [];
			setAvailableRunners(personnel);
		} catch (error) {
			Alert.alert(
				'Error',
				'Failed to fetch delivery personnel.',
			);
			console.error(
				'Error fetching delivery personnel:',
				error.response?.data || error.message,
			);
		} finally {
			setRunnerLoading(false);
		}
	};

	// --- Utility Functions ---
	const showToast = (message) => {
		if (Platform.OS === 'android') {
			ToastAndroid.show(message, ToastAndroid.SHORT);
		} else {
			Alert.alert('', message);
		}
	};

	const toggleSection = (section) => {
		setExpandedSections((prev) => ({
			...prev,
			[section]: !prev[section],
		}));
	};

	// --- Status Update Handler ---
	const handleUpdateOrderStatus = async (status) => {
		if (!status) return;
		setStatusUpdating(true);
		try {
			const response = await axiosInstance.patch(
				`/orders/${orderId}/status`,
				{ status },
			);
			if (response.status === 200) {
				await fetchOrderDetails();
				showToast(`Order status updated to ${status}.`);
				setShowStatusModal(false);
				const refreshed =
					response.data?.order ||
					(await axiosInstance.get(`/orders/${orderId}`))
						.data;
				if (refreshed?.customerInfo?.expoPushToken) {
					sendPushNotification(
						refreshed.customerInfo.expoPushToken,
						`Order #${refreshed.orderNumber} ${
							status.charAt(0).toUpperCase() +
							status.slice(1)
						}!`,
						`Your order has been updated to ${status}.`,
					);
				}
			} else {
				Alert.alert(
					'Update Failed',
					'Could not update order status.',
				);
			}
		} catch (error) {
			Alert.alert(
				'Error',
				error.response?.data?.message ||
					'An error occurred while updating order status.',
			);
			console.error(
				'Error updating order status:',
				error.response?.data || error.message,
			);
		} finally {
			setStatusUpdating(false);
		}
	};

	// --- Process Payment to Restaurant ---
	const handleProcessPaymentToRestaurant = async () => {
		setIsSubmitting(true);
		try {
			const response = await axiosInstance.patch(
				`/orders/${orderId}/payment-status`,
				{ status: 'paid' },
			);
			if (response.status === 200) {
				await fetchOrderDetails();
				showToast(
					'Payment to restaurant processed successfully!',
				);
				const refreshed = (
					await axiosInstance.get(`/orders/${orderId}`)
				).data;
				if (
					refreshed?.storeId?.expoPushToken &&
					refreshed?.storeId?.paymentInfo?.[0]?.bankName
				) {
					sendPushNotification(
						refreshed.storeId.expoPushToken,
						'Payment Received!',
						`You've received ₦${refreshed.itemsAmount?.toLocaleString()} for order #${
							refreshed.orderNumber
						} to your ${
							refreshed.storeId.paymentInfo[0].bankName
						} account.`,
					);
				}
			} else {
				Alert.alert(
					'Payment Failed',
					'Could not process payment to restaurant.',
				);
			}
		} catch (error) {
			Alert.alert(
				'Error',
				error.response?.data?.message ||
					'An error occurred during payment processing.',
			);
			console.error(
				'Error processing payment:',
				error.response?.data || error.message,
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- Complete Delivery ---
	const handleCompleteDelivery = async (code) => {
		const deliveryCodeToSend = code ?? deliveryCode;
		if (
			(order.customerInfo?.pickUp === true ||
				deliveryType === 'self' ||
				deliveryType === 'assigned') &&
			deliveryCodeToSend?.length !== 4
		) {
			Alert.alert(
				'Invalid Code',
				'Please enter a valid 4-digit delivery code.',
			);
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await axiosInstance.post(
				`/businesses/${userInfo?._id}/order/${orderId}/delivered`,
				{
					deliveryCode: deliveryCodeToSend,
				},
			);
			if (response.status === 200) {
				await fetchOrderDetails();
				showToast(
					'Order successfully marked as delivered!',
				);
				if (order?.payment?.status !== 'paid') {
					await handleProcessPaymentToRestaurant();
				}
				if (order?.customerInfo?.expoPushToken) {
					sendPushNotification(
						order.customerInfo.expoPushToken,
						'Order Delivered!',
						`Your order #${order.orderNumber} has been successfully completed. Enjoy!`,
					);
				}
				router.replace('(tabs)/orders');
			} else {
				Alert.alert(
					'Delivery Failed',
					response.data?.message ||
						'Incorrect delivery code. Please try again.',
				);
			}
		} catch (err) {
			Alert.alert(
				'Error',
				err.response?.data?.message ||
					'Failed to complete delivery.',
			);
			console.error(
				'Error completing delivery:',
				err.response?.data || err.message,
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- Contact Handlers ---
	const handleOpenWhatsapp = () => {
		const contact = order?.customerInfo?.contact;
		if (contact) {
			Linking.openURL(
				`https://wa.me/${contact.replace('+', '')}`,
			).catch(() =>
				Alert.alert('Error', 'Could not open WhatsApp.'),
			);
		} else {
			Alert.alert(
				'Error',
				'Customer contact not available.',
			);
		}
	};

	const handleCallCustomer = () => {
		const phoneNumber = order?.customerInfo?.contact;
		if (phoneNumber) {
			Linking.openURL(`tel:${phoneNumber}`).catch(() =>
				Alert.alert('Error', 'Could not initiate call.'),
			);
		} else {
			Alert.alert(
				'Error',
				'Customer phone number is not available.',
			);
		}
	};

	// --- Delivery Type Selection ---
	const handleSelectDeliveryType = async (type) => {
		if (
			type === 'assigned' &&
			order?.runnerInfo?.runnerId
		) {
			Alert.alert(
				'Reassign Runner?',
				'A runner is already assigned. Do you want to select a new runner?',
				[
					{ text: 'No', style: 'cancel' },
					{
						text: 'Yes',
						onPress: async () => {
							setDeliveryType(type);
							await fetchDeliveryPersonnel();
							setShowRunnerModal(true);
							setSelectedRunner(null);
						},
					},
				],
			);
			return;
		}

		if (deliveryType === type) return;

		setIsSubmitting(true);
		try {
			if (type === 'self') {
				setShowSelfDeliveryModal(true);
				setIsSubmitting(false);
				return;
			}

			setDeliveryType(type);
			showToast(
				`Delivery set to: ${
					type === 'self'
						? 'Self-Delivery'
						: 'Assigned Delivery'
				}.`,
			);

			if (type === 'assigned') {
				await fetchDeliveryPersonnel();
				setShowRunnerModal(true);
			} else if (
				type === 'self' &&
				order?.runnerInfo?.runnerId
			) {
				await axiosInstance.patch(
					`/orders/${orderId}/clear-runner`,
				);
				await fetchOrderDetails();
			}
			await fetchOrderDetails();
		} catch (error) {
			Alert.alert(
				'Error',
				error.response?.data?.message ||
					'An error occurred while setting delivery type.',
			);
			console.error(
				'Error changing delivery type:',
				error.response?.data || error.message,
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- Assign Runner ---
	const assignRunner = async (runner) => {
		if (!runner) return;
		setIsSubmitting(true);
		try {
			const response = await axiosInstance.post(
				`/orders/${orderId}/assign-runner`,
				{ runnerId: runner._id },
			);
			if (response.status === 200) {
				await fetchOrderDetails();
				showToast(`${runner.name} assigned successfully!`);
				if (runner.expoPushToken) {
					sendPushNotification(
						runner.expoPushToken,
						'New Delivery Assignment!',
						`You have been assigned order #${order.orderNumber} for delivery.`,
					);
				}
				setShowRunnerModal(false);
				setSelectedRunner(null);
			} else {
				Alert.alert(
					'Assignment Failed',
					response.data?.message ||
						'Could not assign delivery person.',
				);
			}
		} catch (error) {
			Alert.alert(
				'Error',
				error.response?.data?.message ||
					'An error occurred during delivery assignment.',
			);
			console.error(
				'Error assigning runner:',
				error.response?.data || error.message,
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// --- Remove Runner ---
	const handleRemoveRunner = async () => {
		Alert.alert(
			'Remove Runner?',
			'Are you sure you want to remove the assigned runner?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Remove',
					onPress: async () => {
						setIsSubmitting(true);
						try {
							const response = await axiosInstance.patch(
								`/orders/${orderId}/clear-runner`,
							);
							if (response.status === 200) {
								await fetchOrderDetails();
								setDeliveryType('unassigned');
								showToast('Runner successfully removed.');
							} else {
								Alert.alert(
									'Error',
									response.data?.message ||
										'Failed to remove runner.',
								);
							}
						} catch (error) {
							Alert.alert(
								'Error',
								error.response?.data?.message ||
									'An error occurred while removing runner.',
							);
							console.error(
								'Error removing runner:',
								error.response?.data || error.message,
							);
						} finally {
							setIsSubmitting(false);
						}
					},
				},
			],
		);
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#4A90E2" />
			</View>
		);
	}

	if (!order) {
		return (
			<View style={styles.emptyStateContainer}>
				<Text style={styles.emptyStateText}>
					Order not found or an error occurred.
				</Text>
				<TouchableOpacity
					style={styles.retryButton}
					onPress={fetchOrderDetails}
				>
					<Text style={styles.retryButtonText}>Retry</Text>
				</TouchableOpacity>
			</View>
		);
	}

	const isStatusUpdatable = ![
		'completed',
		'cancelled',
		'rejected',
		'refunded',
	].includes(order.status);
	const isRunnerAssigned =
		order.runnerInfo && order.runnerInfo.runnerId;
	const shouldShowCompleteDeliverySection =
		order.status === 'accepted' &&
		(order.customerInfo?.pickUp === true ||
			(order.customerInfo?.pickUp === false &&
				deliveryType === 'self') ||
			(order.customerInfo?.pickUp === false &&
				isRunnerAssigned));
	const showDeliveryMethodSelection =
		['accepted', 'processing', 'out-for-delivery'].includes(
			order?.status,
		) && order.customerInfo?.pickUp !== true;

	return (
		<View style={styles.container}>
			<StatusBar style="dark" backgroundColor="#FFFFFF" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backButton}
				>
					<Ionicons
						name="arrow-back-outline"
						size={28}
						color="#2C3E50"
					/>
				</TouchableOpacity>
				<Text style={styles.headerTitle}>
					Order #{order.orderNumber}
				</Text>
				<TouchableOpacity
					style={styles.headerStatusContainer}
					onPress={() =>
						isStatusUpdatable && setShowStatusModal(true)
					}
					disabled={!isStatusUpdatable}
				>
					<Text style={styles.headerStatusText}>
						{order.status
							? order.status.charAt(0).toUpperCase() +
							  order.status.slice(1)
							: 'Unknown'}
					</Text>
					{isStatusUpdatable && (
						<Ionicons
							name="chevron-down"
							size={16}
							color="#2C3E50"
						/>
					)}
				</TouchableOpacity>
			</View>

			<ScrollView
				contentContainerStyle={styles.scrollViewContent}
			>
				{/* Customer Information */}
				<View style={styles.section}>
					<TouchableOpacity
						onPress={() => toggleSection('customer')}
						style={styles.sectionHeader}
					>
						<Text style={styles.sectionTitle}>
							Customer Details
						</Text>
						<Ionicons
							name={
								expandedSections.customer
									? 'chevron-up'
									: 'chevron-down'
							}
							size={20}
							color="#2C3E50"
						/>
					</TouchableOpacity>
					{expandedSections.customer && (
						<View style={styles.sectionContent}>
							<View style={styles.detailItem}>
								<Ionicons
									name="person-outline"
									size={20}
									color="#4A90E2"
								/>
								<Text style={styles.detailText}>
									{order.customerInfo?.name || '-'}
								</Text>
							</View>
							<View style={styles.detailItem}>
								<Ionicons
									name="call-outline"
									size={20}
									color="#4A90E2"
								/>
								<Text style={styles.detailText}>
									{order.customerInfo?.contact || '-'}
								</Text>
							</View>
							<View style={styles.detailItem}>
								<Ionicons
									name="location-outline"
									size={20}
									color="#4A90E2"
								/>
								<Text style={styles.detailText}>
									{order.customerInfo?.pickUp === false
										? order.customerInfo?.address || '-'
										: 'Self Pickup at Store'}
								</Text>
							</View>
							<View style={styles.contactButtons}>
								<TouchableOpacity
									style={styles.contactButton}
									onPress={handleCallCustomer}
								>
									<Feather
										name="phone"
										size={20}
										color="#FFFFFF"
									/>
									<Text style={styles.contactButtonText}>
										Call
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.contactButtonWhatsapp}
									onPress={handleOpenWhatsapp}
								>
									<MaterialCommunityIcons
										name="whatsapp"
										size={20}
										color="#FFFFFF"
									/>
									<Text style={styles.contactButtonText}>
										Chat
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					)}
				</View>

				{/* Delivery Method Selection */}
				{showDeliveryMethodSelection && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>
							Delivery Method
						</Text>
						<View style={styles.deliveryOptions}>
							<TouchableOpacity
								style={[
									styles.deliveryOption,
									deliveryType === 'self' &&
										styles.deliveryOptionSelected,
								]}
								onPress={() =>
									handleSelectDeliveryType('self')
								}
								disabled={isSubmitting}
							>
								<MaterialCommunityIcons
									name="truck-delivery-outline"
									size={32}
									color={
										deliveryType === 'self'
											? '#FFFFFF'
											: '#4A90E2'
									}
								/>
								<Text
									style={[
										styles.deliveryOptionText,
										deliveryType === 'self' &&
											styles.deliveryOptionTextSelected,
									]}
								>
									Self Delivery
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.deliveryOption,
									deliveryType === 'assigned' &&
										styles.deliveryOptionSelected,
								]}
								onPress={() =>
									handleSelectDeliveryType('assigned')
								}
								disabled={isSubmitting}
							>
								<MaterialCommunityIcons
									name="account-multiple-plus-outline"
									size={32}
									color={
										deliveryType === 'assigned'
											? '#FFFFFF'
											: '#4A90E2'
									}
								/>
								<Text
									style={[
										styles.deliveryOptionText,
										deliveryType === 'assigned' &&
											styles.deliveryOptionTextSelected,
									]}
								>
									Assign Runner
								</Text>
							</TouchableOpacity>
						</View>
						{isRunnerAssigned && (
							<View style={styles.assignedRunnerContainer}>
								<Text style={styles.assignedRunnerTitle}>
									Assigned Runner
								</Text>
								<View style={styles.assignedRunnerDetails}>
									<Text style={styles.assignedRunnerName}>
										{order.runnerInfo.name} (
										{order.runnerInfo.contact})
									</Text>
									{order.runnerInfo.price && (
										<Text
											style={styles.assignedRunnerPrice}
										>
											₦
											{order.runnerInfo.price.toLocaleString()}
										</Text>
									)}
								</View>
								<TouchableOpacity
									style={styles.removeRunnerButton}
									onPress={handleRemoveRunner}
									disabled={isSubmitting}
								>
									<Text
										style={styles.removeRunnerButtonText}
									>
										Remove Runner
									</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				)}

				{/* Complete Delivery Section */}
				{shouldShowCompleteDeliverySection &&
					order.status !== 'completed' &&
					order.status !== 'cancelled' && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>
								Complete Delivery
							</Text>
							<Text style={styles.sectionSubtitle}>
								{order.customerInfo?.pickUp === true
									? 'Enter the 4-digit code from customer for pickup verification.'
									: 'Enter the 4-digit code provided by the customer.'}
							</Text>
							<TextInput
								style={styles.input}
								value={deliveryCode}
								onChangeText={setDeliveryCode}
								keyboardType="number-pad"
								maxLength={4}
								placeholder="Enter 4-digit code"
							/>
							<TouchableOpacity
								style={[
									styles.primaryButton,
									deliveryCode.length !== 4 &&
										styles.disabledButton,
								]}
								onPress={() => handleCompleteDelivery()}
								disabled={
									deliveryCode.length !== 4 || isSubmitting
								}
							>
								{isSubmitting ? (
									<ActivityIndicator color="#FFFFFF" />
								) : (
									<Text style={styles.primaryButtonText}>
										Mark as Completed
									</Text>
								)}
							</TouchableOpacity>
						</View>
					)}

				{/* Order Items */}
				<View style={styles.section}>
					<TouchableOpacity
						onPress={() => toggleSection('items')}
						style={styles.sectionHeader}
					>
						<Text style={styles.sectionTitle}>
							Order Items
						</Text>
						<Ionicons
							name={
								expandedSections.items
									? 'chevron-up'
									: 'chevron-down'
							}
							size={20}
							color="#2C3E50"
						/>
					</TouchableOpacity>
					{expandedSections.items && (
						<View style={styles.sectionContent}>
							{order.items?.map((item, index) => (
								<View
									key={item._id || item.productId || index}
									style={styles.itemCard}
								>
									<View style={styles.itemHeader}>
										<Text style={styles.itemName}>
											{item.name} x{item.quantity}
										</Text>
										<Text style={styles.itemPrice}>
											₦
											{(
												item.totalPrice ??
												(item.unitPrice ??
													item.price ??
													0) * (item.quantity ?? 1)
											).toLocaleString()}
										</Text>
									</View>
									{item.type && (
										<Text style={styles.itemType}>
											Type:{' '}
											{item.type.charAt(0).toUpperCase() +
												item.type.slice(1)}
										</Text>
									)}
									{item.specialInstructions && (
										<Text style={styles.itemInstructions}>
											Notes: {item.specialInstructions}
										</Text>
									)}
									{item.variants?.length > 0 &&
										item.variants.map((variant, vIndex) => (
											<View
												key={vIndex}
												style={styles.subItem}
											>
												<Text style={styles.subItemText}>
													- {variant.name} x
													{variant.quantity ?? 1}
												</Text>
												<Text style={styles.subItemText}>
													₦
													{(
														variant.price ??
														0 * (variant.quantity ?? 1)
													).toLocaleString()}
												</Text>
											</View>
										))}
									{item.addOns?.length > 0 &&
										item.addOns.map((addOn, aIndex) => (
											<View
												key={aIndex}
												style={styles.subItem}
											>
												<Text style={styles.subItemText}>
													+ {addOn.name} x
													{addOn.quantity ?? 1}
												</Text>
												<Text style={styles.subItemText}>
													₦
													{(
														(addOn.price ?? 0) *
														(addOn.quantity ?? 1)
													).toLocaleString()}
												</Text>
											</View>
										))}
									{item.type === 'digital' &&
										item.digital?.files?.length > 0 && (
											<View style={styles.itemDetails}>
												<Text
													style={styles.itemDetailsTitle}
												>
													Digital Files
												</Text>
												{item.digital.files.map(
													(file, fIndex) => (
														<TouchableOpacity
															key={fIndex}
															onPress={() =>
																file.url &&
																Linking.openURL(file.url)
															}
															style={styles.fileItem}
														>
															<Text style={styles.fileText}>
																{file.filename ||
																	`File ${fIndex + 1}`}
																{file.sizeBytes &&
																	` (${(
																		file.sizeBytes /
																		1024 /
																		1024
																	).toFixed(2)} MB)`}
															</Text>
														</TouchableOpacity>
													),
												)}
												{item.digital.licenseType && (
													<Text
														style={styles.itemDetailsText}
													>
														License:{' '}
														{item.digital.licenseType
															.charAt(0)
															.toUpperCase() +
															item.digital.licenseType.slice(
																1,
															)}
													</Text>
												)}
												{item.digital.accessExpiresDays && (
													<Text
														style={styles.itemDetailsText}
													>
														Access Expires:{' '}
														{item.digital.accessExpiresDays}{' '}
														days
													</Text>
												)}
											</View>
										)}
									{item.type === 'service' &&
										item.service && (
											<View style={styles.itemDetails}>
												<Text
													style={styles.itemDetailsTitle}
												>
													Service Details
												</Text>
												{item.service.startAt && (
													<Text
														style={styles.itemDetailsText}
													>
														Scheduled:{' '}
														{new Date(
															item.service.startAt,
														).toLocaleString()}
													</Text>
												)}
												{item.service.durationMinutes && (
													<Text
														style={styles.itemDetailsText}
													>
														Duration:{' '}
														{item.service.durationMinutes}{' '}
														minutes
													</Text>
												)}
												{item.service
													.cancellationPolicy && (
													<Text
														style={styles.itemDetailsText}
													>
														Cancellation:{' '}
														{
															item.service
																.cancellationPolicy
																.allowBeforeHours
														}{' '}
														hours before,{' '}
														{
															item.service
																.cancellationPolicy
																.penaltyPercent
														}
														% penalty
													</Text>
												)}
											</View>
										)}
									{item.type === 'physical' &&
										item.physical && (
											<View style={styles.itemDetails}>
												<Text
													style={styles.itemDetailsTitle}
												>
													Physical Details
												</Text>
												{item.physical.shippingOptions
													?.length > 0 && (
													<Text
														style={styles.itemDetailsText}
													>
														Shipping:{' '}
														{
															item.physical
																.shippingOptions[0].name
														}{' '}
														(₦
														{item.physical.shippingOptions[0].fee?.toLocaleString()}
														,{' '}
														{
															item.physical
																.shippingOptions[0]
																.leadTimeDays
														}{' '}
														days)
													</Text>
												)}
												{item.physical.inventoryCount !==
													undefined && (
													<Text
														style={styles.itemDetailsText}
													>
														Stock:{' '}
														{item.physical.inventoryCount}
													</Text>
												)}
											</View>
										)}
								</View>
							))}
						</View>
					)}
				</View>

				{/* Order Summary */}
				<View style={styles.section}>
					<TouchableOpacity
						onPress={() => toggleSection('summary')}
						style={styles.sectionHeader}
					>
						<Text style={styles.sectionTitle}>
							Order Summary
						</Text>
						<Ionicons
							name={
								expandedSections.summary
									? 'chevron-up'
									: 'chevron-down'
							}
							size={20}
							color="#2C3E50"
						/>
					</TouchableOpacity>
					{expandedSections.summary && (
						<View style={styles.sectionContent}>
							<View style={styles.summaryItem}>
								<Text style={styles.summaryLabel}>
									Subtotal
								</Text>
								<Text style={styles.summaryValue}>
									₦
									{order.itemsAmount?.toLocaleString() ??
										'0'}
								</Text>
							</View>
							{order?.deliveryFee > 0 && (
								<View style={styles.summaryItem}>
									<Text style={styles.summaryLabel}>
										Delivery Fee
									</Text>
									<Text style={styles.summaryValue}>
										₦{order.deliveryFee?.toLocaleString()}
									</Text>
								</View>
							)}
							{order.discountCode && (
								<View style={styles.summaryItem}>
									<Text style={styles.summaryLabel}>
										Discount ({order.discountCode})
									</Text>
									<Text style={styles.summaryValueDiscount}>
										-₦
										{order.discountAmount?.toLocaleString() ??
											'0'}
									</Text>
								</View>
							)}
							<View style={styles.summaryTotal}>
								<Text style={styles.summaryTotalLabel}>
									Total
								</Text>
								<Text style={styles.summaryTotalValue}>
									₦
									{order.totalAmount?.toLocaleString() ??
										'0'}
								</Text>
							</View>
						</View>
					)}
				</View>
			</ScrollView>

			{/* Action Bar */}
			{isStatusUpdatable && (
				<View style={styles.actionBar}>
					{order.status === 'pending' && (
						<>
							<TouchableOpacity
								style={[
									styles.actionBarButton,
									styles.acceptButton,
								]}
								onPress={() =>
									handleUpdateOrderStatus('accepted')
								}
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<ActivityIndicator color="#FFFFFF" />
								) : (
									<Text style={styles.actionBarButtonText}>
										Accept
									</Text>
								)}
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.actionBarButton,
									styles.rejectButton,
								]}
								onPress={() =>
									handleUpdateOrderStatus('rejected')
								}
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<ActivityIndicator color="#FFFFFF" />
								) : (
									<Text style={styles.actionBarButtonText}>
										Reject
									</Text>
								)}
							</TouchableOpacity>
						</>
					)}
					<TouchableOpacity
						style={[
							styles.actionBarButton,
							styles.statusButton,
						]}
						onPress={() => setShowStatusModal(true)}
						disabled={statusUpdating}
					>
						<Text style={styles.actionBarButtonText}>
							{statusUpdating
								? 'Updating...'
								: 'Change Status'}
						</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Runner Assignment Modal */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={showRunnerModal}
				onRequestClose={() => setShowRunnerModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								Assign Runner
							</Text>
							<TouchableOpacity
								onPress={() => setShowRunnerModal(false)}
							>
								<Ionicons
									name="close"
									size={24}
									color="#2C3E50"
								/>
							</TouchableOpacity>
						</View>
						{runnerLoading ? (
							<ActivityIndicator
								size="large"
								color="#4A90E2"
							/>
						) : availableRunners.length === 0 ? (
							<Text style={styles.modalEmptyText}>
								No runners available
							</Text>
						) : (
							<ScrollView>
								{availableRunners.map((runner) => (
									<TouchableOpacity
										key={runner._id}
										style={[
											styles.runnerItem,
											selectedRunner?._id === runner._id &&
												styles.runnerItemSelected,
										]}
										onPress={async () => {
											setSelectedRunner(runner);
											await assignRunner(runner);
										}}
									>
										<Image
											source={{
												uri:
													runner.profileImage ||
													'https://via.placeholder.com/40',
											}}
											style={styles.runnerAvatar}
										/>
										<View style={styles.runnerInfo}>
											<Text style={styles.runnerName}>
												{runner.name}
											</Text>
											<Text style={styles.runnerContact}>
												{runner.phone || runner.contact}
											</Text>
										</View>
										{runner.price && (
											<Text style={styles.runnerPrice}>
												₦{runner.price.toLocaleString()}
											</Text>
										)}
									</TouchableOpacity>
								))}
							</ScrollView>
						)}
					</View>
				</View>
			</Modal>

			{/* Status Update Modal */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={showStatusModal}
				onRequestClose={() => setShowStatusModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								Update Status
							</Text>
							<TouchableOpacity
								onPress={() => setShowStatusModal(false)}
							>
								<Ionicons
									name="close"
									size={24}
									color="#2C3E50"
								/>
							</TouchableOpacity>
						</View>
						<ScrollView>
							{ALL_STATUSES.map((s) => (
								<TouchableOpacity
									key={s}
									style={styles.statusItem}
									onPress={() => handleUpdateOrderStatus(s)}
								>
									<Text style={styles.statusItemText}>
										{s.charAt(0).toUpperCase() + s.slice(1)}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* Self Delivery Code Modal */}
			<Modal
				animationType="slide"
				transparent={true}
				visible={showSelfDeliveryModal}
				onRequestClose={() =>
					setShowSelfDeliveryModal(false)
				}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>
								Self Delivery Code
							</Text>
							<TouchableOpacity
								onPress={() =>
									setShowSelfDeliveryModal(false)
								}
							>
								<Ionicons
									name="close"
									size={24}
									color="#2C3E50"
								/>
							</TouchableOpacity>
						</View>
						<Text style={styles.sectionSubtitle}>
							Enter 4-digit code to confirm self delivery.
						</Text>
						<TextInput
							style={styles.input}
							value={selfDeliveryCode}
							onChangeText={setSelfDeliveryCode}
							keyboardType="number-pad"
							maxLength={4}
							placeholder="Enter 4-digit code"
						/>
						<TouchableOpacity
							style={[
								styles.primaryButton,
								selfDeliveryCode.length !== 4 &&
									styles.disabledButton,
							]}
							onPress={async () => {
								if (selfDeliveryCode.length !== 4) return;
								setShowSelfDeliveryModal(false);
								setDeliveryType('self');
								await handleCompleteDelivery(
									selfDeliveryCode,
								);
								setSelfDeliveryCode('');
							}}
							disabled={
								selfDeliveryCode.length !== 4 ||
								isSubmitting
							}
						>
							{isSubmitting ? (
								<ActivityIndicator color="#FFFFFF" />
							) : (
								<Text style={styles.primaryButtonText}>
									Confirm
								</Text>
							)}
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
		backgroundColor: '#F7FAFC',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F7FAFC',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: Platform.OS === 'android' ? 40 : 60,
		paddingBottom: 16,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	backButton: {
		padding: 8,
	},
	headerTitle: {
		flex: 1,
		fontSize: 20,
		fontWeight: '700',
		color: '#1F2937',
	},
	headerStatusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E5E7EB',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
	},
	headerStatusText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1F2937',
		marginRight: 6,
	},
	scrollViewContent: {
		padding: 16,
		paddingBottom: 80,
	},
	section: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 2,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1F2937',
	},
	sectionContent: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	sectionSubtitle: {
		fontSize: 14,
		color: '#6B7280',
		marginBottom: 12,
	},
	detailItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 12,
	},
	detailText: {
		fontSize: 16,
		color: '#1F2937',
		flex: 1,
	},
	contactButtons: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 8,
	},
	contactButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#4A90E2',
		paddingVertical: 12,
		borderRadius: 8,
		gap: 8,
	},
	contactButtonWhatsapp: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#25D366',
		paddingVertical: 12,
		borderRadius: 8,
		gap: 8,
	},
	contactButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	deliveryOptions: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 16,
	},
	deliveryOption: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F3F4F6',
		borderRadius: 12,
		padding: 16,
		gap: 8,
	},
	deliveryOptionSelected: {
		backgroundColor: '#4A90E2',
	},
	deliveryOptionText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1F2937',
	},
	deliveryOptionTextSelected: {
		color: '#FFFFFF',
	},
	assignedRunnerContainer: {
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		paddingTop: 12,
	},
	assignedRunnerTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#6B7280',
		marginBottom: 8,
	},
	assignedRunnerDetails: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	assignedRunnerName: {
		fontSize: 16,
		color: '#1F2937',
		fontWeight: '500',
	},
	assignedRunnerPrice: {
		fontSize: 16,
		fontWeight: '600',
		color: '#10B981',
	},
	removeRunnerButton: {
		backgroundColor: '#F3F4F6',
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	removeRunnerButtonText: {
		color: '#EF4444',
		fontSize: 16,
		fontWeight: '600',
	},
	input: {
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		marginBottom: 12,
	},
	primaryButton: {
		backgroundColor: '#4A90E2',
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: 'center',
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	disabledButton: {
		backgroundColor: '#D1D5DB',
	},
	itemCard: {
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
		paddingVertical: 12,
	},
	itemHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	itemName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
		flex: 1,
	},
	itemPrice: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
	},
	itemType: {
		fontSize: 14,
		color: '#6B7280',
		marginBottom: 8,
	},
	itemInstructions: {
		fontSize: 14,
		color: '#6B7280',
		marginBottom: 8,
	},
	subItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 4,
	},
	subItemText: {
		fontSize: 14,
		color: '#6B7280',
	},
	itemDetails: {
		marginTop: 12,
		padding: 12,
		backgroundColor: '#F9FAFB',
		borderRadius: 8,
	},
	itemDetailsTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1F2937',
		marginBottom: 8,
	},
	itemDetailsText: {
		fontSize: 14,
		color: '#4B5563',
		marginBottom: 4,
	},
	fileItem: {
		paddingVertical: 8,
	},
	fileText: {
		fontSize: 14,
		color: '#4A90E2',
		textDecorationLine: 'underline',
	},
	summaryItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	summaryLabel: {
		fontSize: 16,
		color: '#6B7280',
	},
	summaryValue: {
		fontSize: 16,
		color: '#1F2937',
		fontWeight: '500',
	},
	summaryValueDiscount: {
		fontSize: 16,
		color: '#EF4444',
		fontWeight: '500',
	},
	summaryTotal: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		paddingTop: 12,
		marginTop: 12,
	},
	summaryTotalLabel: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1F2937',
	},
	summaryTotalValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1F2937',
	},
	actionBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		flexDirection: 'row',
		backgroundColor: '#FFFFFF',
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 2,
		gap: 12,
	},
	actionBarButton: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: 'center',
	},
	acceptButton: {
		backgroundColor: '#10B981',
	},
	rejectButton: {
		backgroundColor: '#EF4444',
	},
	statusButton: {
		backgroundColor: '#4A90E2',
	},
	actionBarButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 20,
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
		fontSize: 20,
		fontWeight: '700',
		color: '#1F2937',
	},
	modalEmptyText: {
		textAlign: 'center',
		color: '#6B7280',
		fontSize: 16,
	},
	runnerItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	runnerItemSelected: {
		backgroundColor: '#F3F4F6',
	},
	runnerAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 12,
	},
	runnerInfo: {
		flex: 1,
	},
	runnerName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
	},
	runnerContact: {
		fontSize: 14,
		color: '#6B7280',
	},
	runnerPrice: {
		fontSize: 16,
		fontWeight: '600',
		color: '#10B981',
	},
	statusItem: {
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	statusItemText: {
		fontSize: 16,
		color: '#1F2937',
		fontWeight: '500',
	},
	emptyStateContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F7FAFC',
	},
	emptyStateText: {
		fontSize: 18,
		color: '#6B7280',
		marginBottom: 16,
	},
	retryButton: {
		backgroundColor: '#4A90E2',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
	},
	retryButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '600',
	},
});

export default SingleOrderPage;
