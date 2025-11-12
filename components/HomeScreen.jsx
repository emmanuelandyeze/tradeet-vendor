// HomeScreen.jsx
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import socket from '@/utils/socket';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, {
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import {
	FlatList,
	Linking,
	RefreshControl,
	TouchableWithoutFeedback,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	Dimensions,
} from 'react-native';
import UpgradeButton from './UpgradeButton';
import PaymentInfoModal from './PaymentInfoModal';
import { Alert } from 'react-native';
import TodoList from './TodoList';
import Header from './Header';
import SkeletonLoader from './SkeletonLoader';
import BusinessActions from './BusinessActions';
import StoreTodoBannerConnected from './StoreTodoBannerConnected';
import { StatusBar } from 'expo-status-bar';
import {
	AntDesign,
	Entypo,
	EvilIcons,
} from '@expo/vector-icons';
import FinancialSummaryFilter from './FinancialSummaryFilter';
import OrderFilterDropdown from './OrderFilterDropdown';

const { width } = Dimensions.get('window');

const formatOrderDate = (dateString) => {
	if (!dateString) return '';
	const date = new Date(dateString);
	const day = String(date.getDate()).padStart(2, '0');
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
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(
		2,
		'0',
	);
	return `${day} ${month} ${year} ${hours}:${minutes}`;
};

const HomeScreen = ({ userInfo, setSelectedStore }) => {
	const router = useRouter();
	const [orders, setOrders] = useState([]);
	const { selectedStore } = useContext(AuthContext);
	const [invoices, setInvoices] = useState([]); // NEW: invoices state
	const [wallet, setWallet] = useState(0);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState('inprogress');
	const [filteredOrders, setFilteredOrders] =
		useState(orders);
	const [refreshing, setRefreshing] = useState(false);
	const [businessData, setBusinessData] = useState(null);
	const [expenses, setExpenses] = useState([]);
	const [expensesLoading, setExpensesLoading] =
		useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [viewValues, setViewValues] = useState(true);
	const [financialFilter, setFinancialFilter] =
		useState('allTime');
	const [
		selectedFinancialMonth,
		setSelectedFinancialMonth,
	] = useState(new Date());
	const [selectedFinancialWeek, setSelectedFinancialWeek] =
		useState(null);

	const handleWeekSelect = (range) => {
		setSelectedFinancialWeek(range);
		setFinancialFilter('selectedWeek');
	};

	useEffect(() => {
		filterOrders();
		fetchExpenses();
	}, [orders, filter]);

	const getBusinessInfo = async () => {
		try {
			setLoading(true);
			const token = await AsyncStorage.getItem('userToken');
			const response = await axiosInstance.get(
				`/stores/?id=${selectedStore?._id}`,
			);
			setBusinessData(response.data.store);
			setLoading(false);
		} catch (error) {
			console.error(
				'Failed to fetch store info:',
				error.response?.data || error,
			);
			setLoading(false);
			throw error;
		}
	};

	const fetchOrders = async () => {
		try {
			const response = await axiosInstance.get(
				`/orders/store/${selectedStore?.parent}?branchId=${selectedStore?._id}`,
			);
			// if backend returns { orders: [...] } handle accordingly
			const ordersData = Array.isArray(response.data)
				? response.data
				: response.data.orders ?? response.data;
			setOrders((ordersData || []).slice().reverse());
			console.log('orders: ', ordersData);
			setLoading(false);
		} catch (err) {
			console.log(err.message || 'Error fetching orders');
			setLoading(false);
		}
	};

	// console.log('store: ', selectedStore)

	// NEW: fetch invoices for the selected store
	const fetchInvoices = async () => {
		if (!selectedStore?._id) return;
		try {
			const res = await axiosInstance.get('/invoices', {
				params: { storeId: selectedStore._id },
			});
			const data = Array.isArray(res.data)
				? res.data
				: res.data.invoices ?? res.data;
			// ensure newest first
			const sorted = (data || [])
				.slice()
				.sort(
					(a, b) =>
						new Date(b.createdAt) - new Date(a.createdAt),
				);
			setInvoices(sorted);
		} catch (err) {
			console.error(
				'fetchInvoices error',
				err?.response?.data ?? err.message,
			);
		}
	};

	const fetchWallet = async () => {
		try {
			const response = await axiosInstance.get(
				`/businesses/wallet/${selectedStore?._id}`,
			);
			setWallet(response.data.walletBalance);
			setLoading(false);
		} catch (err) {
			console.log(
				err.message || 'Error fetching wallet balance',
			);
			setLoading(false);
		}
	};

	const fetchExpenses = async () => {
		try {
			const response = await axiosInstance.get(
				`/expenses/${selectedStore?._id}`,
			);
			setExpenses(response.data.expenses);
			setExpensesLoading(false);
		} catch (err) {
			setExpensesLoading(false);
		}
	};

	useEffect(() => {
		// initial load
		getBusinessInfo();
		fetchOrders();
		fetchWallet();
		fetchExpenses();
		fetchInvoices(); // NEW: initial invoice load

		// socket handlers for orders
		const handleOrderUpdate = (updatedOrder) => {
			setOrders((prevOrders) =>
				prevOrders.map((order) =>
					order._id === updatedOrder._id
						? updatedOrder
						: order,
				),
			);
		};

		const handleNewOrder = (newOrder) => {
			setOrders((prevOrders) => [newOrder, ...prevOrders]);
		};

		const handleDeleteOrder = (orderId) => {
			setOrders((prevOrders) =>
				prevOrders.filter((order) => order._id !== orderId),
			);
		};

		// socket handlers for invoices (NEW)
		const handleInvoiceCreated = (newInvoice) => {
			setInvoices((prev) => [newInvoice, ...prev]);
		};
		const handleInvoiceUpdated = (updatedInvoice) => {
			setInvoices((prev) =>
				prev.map((inv) =>
					inv._id === updatedInvoice._id
						? updatedInvoice
						: inv,
				),
			);
		};
		const handleInvoiceDeleted = (invoiceId) => {
			setInvoices((prev) =>
				prev.filter((inv) => inv._id !== invoiceId),
			);
		};

		socket.on('orderUpdate', handleOrderUpdate);
		socket.on('newOrder', handleNewOrder);
		socket.on('deleteOrder', handleDeleteOrder);

		// invoice socket events
		socket.on('invoiceCreated', handleInvoiceCreated);
		socket.on('invoiceUpdated', handleInvoiceUpdated);
		socket.on('invoiceDeleted', handleInvoiceDeleted);

		return () => {
			socket.off('orderUpdate', handleOrderUpdate);
			socket.off('newOrder', handleNewOrder);
			socket.off('deleteOrder', handleDeleteOrder);

			socket.off('invoiceCreated', handleInvoiceCreated);
			socket.off('invoiceUpdated', handleInvoiceUpdated);
			socket.off('invoiceDeleted', handleInvoiceDeleted);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (selectedStore) {
			setLoading(true);
			getBusinessInfo();
			fetchOrders();
			fetchWallet();
			fetchExpenses();
			fetchInvoices(); // NEW: fetch invoices when store changes
		}
	}, [selectedStore]);

	const filterFinancialData = (data, type) => {
		const now = new Date();
		const today = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		const thisMonthStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			1,
		);
		const thisMonthEnd = new Date(
			now.getFullYear(),
			now.getMonth() + 1,
			0,
			23,
			59,
			59,
			999,
		);
		const selectedMonthStart = new Date(
			selectedFinancialMonth.getFullYear(),
			selectedFinancialMonth.getMonth(),
			1,
		);
		const selectedMonthEnd = new Date(
			selectedFinancialMonth.getFullYear(),
			selectedFinancialMonth.getMonth() + 1,
			0,
			23,
			59,
			59,
			999,
		);
		const weekStart = selectedFinancialWeek?.start ?? null;
		const weekEnd = selectedFinancialWeek?.end ?? null;

		return data?.filter((item) => {
			let itemDate;
			if (type === 'order') {
				itemDate = new Date(item.createdAt);
			} else if (type === 'expense') {
				itemDate = new Date(item.date);
			} else if (type === 'invoice') {
				// invoices may use createdAt or issuedAt
				itemDate = new Date(
					item.createdAt || item.issuedAt,
				);
			}

			if (!itemDate) return false;

			if (financialFilter === 'today') {
				return (
					itemDate.getFullYear() === today.getFullYear() &&
					itemDate.getMonth() === today.getMonth() &&
					itemDate.getDate() === today.getDate()
				);
			} else if (financialFilter === 'thisMonth') {
				return (
					itemDate >= thisMonthStart &&
					itemDate <= thisMonthEnd
				);
			} else if (financialFilter === 'allTime') {
				return true;
			} else if (financialFilter === 'selectedMonth') {
				return (
					itemDate >= selectedMonthStart &&
					itemDate <= selectedMonthEnd
				);
			} else if (
				financialFilter === 'selectedWeek' &&
				weekStart &&
				weekEnd
			) {
				return itemDate >= weekStart && itemDate <= weekEnd;
			}
			return true;
		});
	};

	// filtered orders used for financial summaries: exclude cancelled orders
	const filteredOrdersForFinancialSummary =
		filterFinancialData(
			orders.filter((o) => o?.status !== 'cancelled'),
			'order',
		);

	const filteredExpensesForFinancialSummary =
		filterFinancialData(expenses, 'expense');
	const filteredInvoicesForFinancialSummary =
		filterFinancialData(invoices, 'invoice'); // NEW

	const paidOrders =
		filteredOrdersForFinancialSummary?.filter(
			(order) => order.payment.status === 'paid',
		);
	const totalAmount = paidOrders?.reduce(
		(total, order) => total + order.totalAmount,
		0,
	);
	// existing order outstanding calc (unchanged)
	// existing order outstanding calc (exclude cancelled orders)
	const totalPendingAmountOrders =
		(filteredOrdersForFinancialSummary || []).reduce(
			(total, order) => {
				if (!order || order.status === 'cancelled')
					return total;

				const itemsAmount = order.itemsAmount || 0;
				const deliveryFee = order.deliveryFee || 0;
				const discountAmount = order.discountAmount || 0;
				const amountPaid =
					order.payment?.providerData?.amountPaid || 0;
				const vendorTotal =
					itemsAmount + deliveryFee - discountAmount;
				const balance = Math.max(
					0,
					vendorTotal - amountPaid,
				);
				return total + balance;
			},
			0,
		) || 0;

	// existing order income calc (unchanged for orders)
	const totalIncomeFromOrders =
		filteredOrdersForFinancialSummary?.reduce(
			(total, order) => {
				const itemsAmount = order.itemsAmount || 0;
				const deliveryFee = order.deliveryFee || 0;
				const discountAmount = order.discountAmount || 0;
				const amountPaid =
					order.payment?.providerData?.amountPaid || 0;
				const vendorTotal =
					itemsAmount + deliveryFee - discountAmount;
				const vendorIncome = Math.min(
					vendorTotal,
					amountPaid,
				);
				return total + vendorIncome;
			},
			0,
		) || 0;

	const totalExpensesAmount =
		filteredExpensesForFinancialSummary?.reduce(
			(total, expense) => total + expense.amount,
			0,
		);
	const profitOrLossAmount =
		totalIncomeFromOrders - totalExpensesAmount;

	// NEW: invoice-based metrics
	// invoicePaidTotal: sum paid amounts for invoices (prefer invoice.paidAmount, else sum payments)
	const invoicePaidTotal = (
		filteredInvoicesForFinancialSummary || []
	).reduce((sum, inv) => {
		let paid = 0;
		if (typeof inv.paidAmount === 'number') {
			paid = inv.paidAmount;
		} else if (
			Array.isArray(inv.payments) &&
			inv.payments.length
		) {
			paid = inv.payments.reduce(
				(s, p) => s + (p.amount || 0),
				0,
			);
		} else if (inv.payment?.providerData?.amountPaid) {
			paid = inv.payment.providerData.amountPaid;
		}
		return sum + (paid || 0);
	}, 0);

	// invoiceOutstandingTotal: prefer outstandingAmount, else compute totalAmount - paid
	const invoiceOutstandingTotal = (
		filteredInvoicesForFinancialSummary || []
	).reduce((sum, inv) => {
		let outstanding = 0;
		if (typeof inv.outstandingAmount === 'number') {
			outstanding = inv.outstandingAmount;
		} else {
			const total = Number(inv.totalAmount || 0);
			let paid = 0;
			if (typeof inv.paidAmount === 'number') {
				paid = inv.paidAmount;
			} else if (
				Array.isArray(inv.payments) &&
				inv.payments.length
			) {
				paid = inv.payments.reduce(
					(s, p) => s + (p.amount || 0),
					0,
				);
			} else if (inv.payment?.providerData?.amountPaid) {
				paid = inv.payment.providerData.amountPaid;
			}
			outstanding = Math.max(0, total - paid);
		}
		return sum + (outstanding || 0);
	}, 0);

	// combine invoice totals
	const totalInvoiceAmount =
		filteredInvoicesForFinancialSummary?.reduce(
			(total, inv) => total + (inv.totalAmount || 0),
			0,
		) || 0;
	const unpaidInvoicesCount =
		filteredInvoicesForFinancialSummary?.filter(
			(inv) => inv.status !== 'paid',
		).length || 0;

	// NOW add invoicePaidTotal to totalIncome and invoiceOutstandingTotal to outstanding
	const totalIncomeAmount =
		totalIncomeFromOrders + invoicePaidTotal;
	const totalPendingAmount =
		(totalPendingAmountOrders || 0) +
		invoiceOutstandingTotal;

	const filterOrders = () => {
		if (
			filter === 'inprogress' ||
			filter === 'in progress'
		) {
			const results = orders?.filter((order) => {
				if (!order) return false;
				if (order.status === 'cancelled') return false;
				const isPaid = order?.payment?.status === 'paid';
				const isOngoingStatus = [
					'pending',
					'accepted',
					'processing',
				].includes(order?.status);
				return isPaid && isOngoingStatus;
			});
			setFilteredOrders(results);
		} else if (
			filter === 'notpaid' ||
			filter === 'not paid'
		) {
			// show only not-paid orders that are NOT cancelled
			const results = orders?.filter((order) => {
				if (!order) return false;
				if (order.status === 'cancelled') return false;
				return order?.payment?.status !== 'paid';
			});
			setFilteredOrders(results);
		} else {
			// generic status filter, exclude cancelled results even if filter matches 'cancelled' (we might want to show cancelled in a separate tab)
			setFilteredOrders(
				orders?.filter(
					(order) =>
						order.status === filter &&
						order.status !== 'cancelled',
				),
			);
		}
	};

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchOrders();
		getBusinessInfo();
		fetchWallet();
		fetchExpenses();
		fetchInvoices(); // NEW: refresh invoices too
		setTimeout(() => {
			setRefreshing(false);
		}, 1500);
	}, [selectedStore]);

	const toggleView = () => {
		setViewValues(!viewValues);
	};

	const handleFinancialFilterChange = (newFilter) => {
		setFinancialFilter(newFilter);
	};

	const handleMonthSelect = (date) => {
		setSelectedFinancialMonth(date);
		setFinancialFilter('selectedMonth');
	};

	const handleOrderFilterSelect = (selectedOption) => {
		setFilter(selectedOption);
	};

	const handleOpenWebsite = () => {
		Linking.openURL(
			`https://${selectedStore?.storeLink}.tradeet.ng`,
		);
	};

	return (
		<View style={styles.container}>
			<StatusBar style="light" backgroundColor="#065637" />
			<Header
				loading={loading}
				userInfo={userInfo}
				storeInfo={businessData}
			/>
			<View style={styles.mainContent}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
						/>
					}
				>
					{/* Business Overview Section */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<View style={styles.sectionTitleRow}>
								<Text style={styles.sectionTitle}>
									Business Overview
								</Text>
								<TouchableOpacity onPress={toggleView}>
									<Ionicons
										name={
											viewValues
												? 'eye-outline'
												: 'eye-off-outline'
										}
										size={20}
										color="#3C4043"
									/>
								</TouchableOpacity>
							</View>
							{selectedStore?.storeLink && (
								<TouchableOpacity
									onPress={handleOpenWebsite}
									style={styles.openStoreButton}
								>
									<Text style={styles.openStoreButtonText}>
										Visit Store
									</Text>
									<EvilIcons
										name="external-link"
										size={22}
										color="#065637"
									/>
								</TouchableOpacity>
							)}
						</View>
						<FinancialSummaryFilter
							onFilterChange={handleFinancialFilterChange}
							onMonthSelect={handleMonthSelect}
							onWeekSelect={handleWeekSelect}
							currentFilter={financialFilter}
						/>

						{/* Stats: now includes invoices */}
						<View style={styles.statsContainer}>
							<TouchableWithoutFeedback>
								<View
									style={[
										styles.statCard,
										styles.incomeCard,
									]}
								>
									<View style={styles.statHeader}>
										<Entypo
											name="arrow-bold-down"
											size={16}
											color="#065637"
										/>
										<Text style={styles.statLabel}>
											Income
										</Text>
									</View>
									{loading ? (
										<View style={styles.skeletonBox} />
									) : (
										<Text
											style={
												viewValues
													? styles.statValue
													: styles.blurredText
											}
										>
											₦{totalIncomeAmount?.toLocaleString()}
										</Text>
									)}
								</View>
							</TouchableWithoutFeedback>

							<TouchableWithoutFeedback
								onPress={() =>
									router.push('/(app)/invoices')
								}
							>
								<View
									style={[
										styles.statCard,
										styles.invoiceCard,
									]}
								>
									<View style={styles.statHeader}>
										<AntDesign
											name="file1"
											size={14}
											color="#065637"
										/>
										<Text style={styles.statLabel}>
											Invoices
										</Text>
									</View>
									{loading ? (
										<View style={styles.skeletonBox} />
									) : (
										<View>
											<Text
												style={
													viewValues
														? styles.statValue
														: styles.blurredText
												}
											>
												₦
												{totalInvoiceAmount?.toLocaleString()}
											</Text>
											<View
												style={{
													flexDirection: 'row',
													justifyContent: 'space-between',
												}}
											>
												<Text
													style={{
														fontSize: 12,
														color: '#374151',
														marginTop: 6,
													}}
												>
													{unpaidInvoicesCount} unpaid
												</Text>
												<Text
													style={{
														fontSize: 12,
														color: '#374151',
														marginTop: 6,
													}}
												>
													View {'>'}
												</Text>
											</View>
										</View>
									)}
								</View>
							</TouchableWithoutFeedback>

							<TouchableWithoutFeedback>
								<View
									style={[
										styles.statCard,
										styles.outstandingCard,
									]}
								>
									<View style={styles.statHeader}>
										<AntDesign
											name="minuscircle"
											size={16}
											color="#6B7280"
										/>
										<Text style={styles.statLabel}>
											Outstanding
										</Text>
									</View>
									{loading ? (
										<View style={styles.skeletonBox} />
									) : (
										<Text
											style={
												viewValues
													? styles.statValue
													: styles.blurredText
											}
										>
											₦
											{totalPendingAmount?.toLocaleString()}
										</Text>
									)}
								</View>
							</TouchableWithoutFeedback>

							<TouchableWithoutFeedback>
								<View
									style={[
										styles.statCard,
										styles.expensesCard,
									]}
								>
									<View style={styles.statHeader}>
										<Entypo
											name="arrow-bold-up"
											size={16}
											color="#B91C1C"
										/>
										<Text style={styles.statLabel}>
											Expenses
										</Text>
									</View>
									{loading ? (
										<View style={styles.skeletonBox} />
									) : (
										<Text
											style={
												viewValues
													? styles.statValue
													: styles.blurredText
											}
										>
											₦
											{totalExpensesAmount?.toLocaleString()}
										</Text>
									)}
								</View>
							</TouchableWithoutFeedback>
						</View>

						<StoreTodoBannerConnected />
						<BusinessActions />
					</View>

					{/* Sales Management Section */}
					<View style={styles.section}>
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>
								Sales Management
							</Text>
						</View>
						<View style={styles.tabsContainer}>
							<TouchableOpacity
								onPress={() => setFilter('inprogress')}
								style={[
									styles.tabButton,
									filter === 'inprogress' &&
										styles.activeTabButton,
								]}
							>
								<Text
									style={[
										styles.tabText,
										filter === 'inprogress' &&
											styles.activeTabText,
									]}
								>
									In Progress
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => setFilter('notpaid')}
								style={[
									styles.tabButton,
									filter === 'notpaid' &&
										styles.activeTabButton,
								]}
							>
								<Text
									style={[
										styles.tabText,
										filter === 'notpaid' &&
											styles.activeTabText,
									]}
								>
									Not Paid
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => setFilter('completed')}
								style={[
									styles.tabButton,
									filter === 'completed' &&
										styles.activeTabButton,
								]}
							>
								<Text
									style={[
										styles.tabText,
										filter === 'completed' &&
											styles.activeTabText,
									]}
								>
									Completed
								</Text>
							</TouchableOpacity>
						</View>
						<FlatList
							data={filteredOrders?.slice(0, 15)}
							keyExtractor={(item) => item._id}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={styles.orderCard}
									onPress={() =>
										router.push(`/(app)/orders/${item._id}`)
									}
								>
									<View
										style={{
											flexDirection: 'row',
											gap: 10,
											alignItems: 'center',
										}}
									>
										<Text style={styles.orderName}>
											{item.customerInfo.name}
										</Text>
										<Text style={styles.orderAmount}>
											₦
											{(
												item.totalAmount - item.serviceFee
											)?.toLocaleString()}
										</Text>
									</View>
									<View
										style={{
											flexDirection: 'row',
											justifyContent: 'space-between',
											alignItems: 'center',
										}}
									>
										<Text style={styles.orderDateText}>
											{formatOrderDate(item.createdAt)}
										</Text>
										<View
											style={styles.orderStatusContainer}
										>
											<View
												style={[
													styles.statusBadge,
													item.payment.status !== 'paid'
														? styles.notPaidBadge
														: styles.paidBadge,
												]}
											>
												<Text style={styles.statusText}>
													{item.payment.status !== 'paid'
														? 'Not Paid'
														: 'Paid'}
												</Text>
											</View>
											<View
												style={[
													styles.statusBadge,
													item.status === 'completed'
														? styles.completedBadge
														: styles.pendingBadge,
												]}
											>
												<Text style={styles.statusText}>
													{item.status}
												</Text>
											</View>
										</View>
									</View>
								</TouchableOpacity>
							)}
							ListEmptyComponent={
								<View style={styles.emptyContainer}>
									<Text style={styles.emptyText}>
										No active orders
									</Text>
								</View>
							}
						/>
					</View>
				</ScrollView>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F3F4F6',
	},
	mainContent: {
		flex: 1,
		backgroundColor: '#065637',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 120,
		backgroundColor: '#FFFFFF',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		marginTop: 8,
	},
	section: {
		marginBottom: 0,
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		paddingHorizontal: 6,
		paddingVertical: 16,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	sectionTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1F2937',
	},
	openStoreButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 6,
		paddingHorizontal: 12,
		backgroundColor: '#E6F0EA',
		borderRadius: 8,
	},
	openStoreButtonText: {
		color: '#065637',
		fontSize: 14,
		fontWeight: '500',
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
		marginBottom: 10,
		marginTop: 16,
		flexWrap: 'wrap',
	},
	statCard: {
		flexBasis: '48%',
		padding: 12,
		borderRadius: 6,
		backgroundColor: '#F9FAFB',
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		marginBottom: 5,
	},
	incomeCard: {
		backgroundColor: '#E6F0EA',
	},
	invoiceCard: {
		backgroundColor: '#EEF2FF',
	},
	outstandingCard: {
		backgroundColor: '#F3F4F6',
	},
	expensesCard: {
		backgroundColor: '#FEF2F2',
	},
	statHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 8,
	},
	statLabel: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
	},
	statValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1F2937',
	},
	blurredText: {
		fontSize: 18,
		color: 'transparent',
		textShadowColor: 'rgba(0, 0, 0, 0.9)',
		textShadowOffset: { width: 0, height: 0 },
		textShadowRadius: 18,
	},
	skeletonBox: {
		height: 20,
		backgroundColor: '#E5E7EB',
		borderRadius: 4,
	},
	tabsContainer: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 6,
	},
	tabButton: {
		paddingVertical: 4,
		paddingHorizontal: 10,
		borderRadius: 6,
		backgroundColor: '#F3F4F6',
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	activeTabButton: {
		backgroundColor: '#065637',
		borderColor: '#065637',
	},
	tabText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#374151',
	},
	activeTabText: {
		color: '#FFFFFF',
		fontWeight: '600',
	},
	orderCard: {
		flexDirection: 'column',
		justifyContent: 'space-between',
		gap: 6,
		alignItems: 'start',
		paddingVertical: 16,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E5E7EB',
	},
	orderName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1F2937',
		letterSpacing: 0.4,
	},
	orderAmount: {
		fontSize: 16,
		color: '#6B7280',
	},
	orderDateText: {
		fontSize: 16,
		color: '#6B7280',
	},
	orderStatusContainer: {
		flexDirection: 'row',
		gap: 8,
	},
	statusBadge: {
		paddingVertical: 4,
		paddingHorizontal: 12,
		borderRadius: 6,
		marginTop: 4,
	},
	paidBadge: {
		backgroundColor: '#EEFAF0',
		color: '#FFFFFF',
	},
	notPaidBadge: {
		backgroundColor: '#EAEDF4',
	},
	completedBadge: {
		backgroundColor: '#EEFAF0',
	},
	pendingBadge: {
		backgroundColor: '#EAEDF4',
	},
	statusText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#121212',
		textTransform: 'capitalize',
	},
	emptyContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 20,
	},
	emptyText: {
		fontSize: 14,
		color: '#6B7280',
	},
});

export default HomeScreen;
