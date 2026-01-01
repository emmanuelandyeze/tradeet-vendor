// HomeScreen.jsx
import React, {
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import {
	RefreshControl,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	Dimensions,
	Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, EvilIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Context & Utils
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import socket from '@/utils/socket';

// Components
import Header from './Header';
import BusinessActions from './BusinessActions';
import StatsGrid from './StatsGrid';
import RecentOrders from './RecentOrders';
import FinancialSummaryFilter from './FinancialSummaryFilter';
import StoreTodoBannerConnected from './StoreTodoBannerConnected';
import UpgradeButton from './UpgradeButton';

const { width } = Dimensions.get('window');

const HomeScreen = ({ userInfo }) => {
	const router = useRouter();
	const { selectedStore } = useContext(AuthContext);

	// State
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [viewValues, setViewValues] = useState(true);

	// Data
	const [businessData, setBusinessData] = useState(null);
	const [orders, setOrders] = useState([]);
	const [filteredOrders, setFilteredOrders] = useState([]);
	const [invoices, setInvoices] = useState([]);
	const [expenses, setExpenses] = useState([]);
	const [wallet, setWallet] = useState(0);

	// Filters
	const [orderFilter, setOrderFilter] = useState('inprogress');
	const [financialFilter, setFinancialFilter] = useState('allTime');
	const [selectedFinancialMonth, setSelectedFinancialMonth] = useState(new Date());
	const [selectedFinancialWeek, setSelectedFinancialWeek] = useState(null);

	// --- Fetching Logic ---

	const fetchData = async () => {
		if (!selectedStore?._id) return;
		try {
			// Business Info
			const storeRes = await axiosInstance.get(`/stores/?id=${selectedStore._id}`);
			setBusinessData(storeRes.data.store);

			// Orders
			const targetStoreId = selectedStore.parent || selectedStore._id;
			const branchQuery = selectedStore.parent ? `?branchId=${selectedStore._id}` : '';

			const ordersRes = await axiosInstance.get(
				`/orders/store/${targetStoreId}${branchQuery}`
			);
			const ordersData = Array.isArray(ordersRes.data)
				? ordersRes.data
				: ordersRes.data.orders ?? ordersRes.data;
			setOrders((ordersData || []).slice().reverse());

			// Invoices
			const invParams = {
				storeId: selectedStore.parent || selectedStore._id,
			};
			if (selectedStore.parent) {
				invParams.branchId = selectedStore._id;
			}

			const invRes = await axiosInstance.get('/invoices', {
				params: invParams,
			});
			const invData = Array.isArray(invRes.data)
				? invRes.data
				: invRes.data.invoices ?? invRes.data;
			setInvoices(
				(invData || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
			);

			// Expenses
			// Expenses
			const expRes = await axiosInstance.get(`/expenses/${targetStoreId}`);
			setExpenses(expRes.data.expenses || []);

			// Wallet
			const walletRes = await axiosInstance.get(`/businesses/wallet/${selectedStore._id}`);
			setWallet(walletRes.data.walletBalance);

		} catch (error) {
			console.log('Error fetching dashboard data:', error?.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (selectedStore) {
			setLoading(true);
			fetchData();
		}
	}, [selectedStore]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchData().then(() => setRefreshing(false));
	}, [selectedStore]);

	// --- Socket Logic ---

	useEffect(() => {
		const handleOrderUpdate = (updated) => {
			setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
		};
		const handleNewOrder = (newOrder) => {
			setOrders((prev) => [newOrder, ...prev]);
		};
		const handleDeleteOrder = (id) => {
			setOrders((prev) => prev.filter((o) => o._id !== id));
		};

		socket.on('orderUpdate', handleOrderUpdate);
		socket.on('newOrder', handleNewOrder);
		socket.on('deleteOrder', handleDeleteOrder);

		return () => {
			socket.off('orderUpdate', handleOrderUpdate);
			socket.off('newOrder', handleNewOrder);
			socket.off('deleteOrder', handleDeleteOrder);
		};
	}, []);

	// --- Filtering Logic (Orders) ---

	useEffect(() => {
		let res = [];
		if (orderFilter === 'inprogress') {
			res = orders.filter(
				(o) =>
					o?.status !== 'cancelled' &&
					o?.payment?.status === 'paid' &&
					['pending', 'accepted', 'processing'].includes(o?.status)
			);
		} else if (orderFilter === 'notpaid') {
			res = orders.filter((o) => o?.status !== 'cancelled' && o?.payment?.status !== 'paid');
		} else {
			res = orders.filter((o) => o.status === orderFilter && o.status !== 'cancelled');
		}
		setFilteredOrders(res);
	}, [orders, orderFilter]);

	// --- Filtering Logic (Financials) ---

	const filterFinancials = (data, type) => {
		const now = new Date();
		// ... (Same date logic as before, simplified for brevity but functional)
		// For robust implementation, we can extract this logic to a util if needed.
		// Reusing existing logic pattern:

		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
		const selectedMonthStart = new Date(selectedFinancialMonth.getFullYear(), selectedFinancialMonth.getMonth(), 1);
		const selectedMonthEnd = new Date(selectedFinancialMonth.getFullYear(), selectedFinancialMonth.getMonth() + 1, 0, 23, 59, 59);
		const weekStart = selectedFinancialWeek?.start;
		const weekEnd = selectedFinancialWeek?.end;

		return data?.filter((item) => {
			let d;
			if (type === 'order') d = new Date(item.createdAt);
			else if (type === 'expense') d = new Date(item.date);
			else if (type === 'invoice') d = new Date(item.createdAt || item.issuedAt);

			if (!d) return false;

			if (financialFilter === 'today') {
				return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
			} else if (financialFilter === 'thisMonth') {
				return d >= thisMonthStart && d <= thisMonthEnd;
			} else if (financialFilter === 'selectedMonth') {
				return d >= selectedMonthStart && d <= selectedMonthEnd;
			} else if (financialFilter === 'selectedWeek' && weekStart && weekEnd) {
				return d >= weekStart && d <= weekEnd;
			}
			return true; // allTime
		});
	};

	// --- Calculations ---

	const financialOrders = filterFinancials(orders.filter(o => o.status !== 'cancelled'), 'order');
	const financialExpenses = filterFinancials(expenses, 'expense');
	const financialInvoices = filterFinancials(invoices, 'invoice');

	// Income (Orders + Invoices Paid)
	const ordersIncome = financialOrders?.reduce((acc, o) => {
		const paid = o.payment?.providerData?.amountPaid || 0;
		// vendor logic: min(total, paid) - usually we just take paid if it matches logic
		return acc + paid;
	}, 0) || 0;

	const invoicesIncome = (financialInvoices || []).reduce((acc, inv) => {
		let paid = inv.paidAmount || (inv.payments?.reduce((s, p) => s + (p.amount || 0), 0)) || (inv.payment?.providerData?.amountPaid) || 0;
		return acc + paid;
	}, 0);

	const totalIncomeAmount = ordersIncome + invoicesIncome;

	// Outstanding (Orders + Invoices Unpaid)
	const ordersOutstanding = (financialOrders || []).reduce((acc, o) => {
		const total = (o.itemsAmount || 0) + (o.deliveryFee || 0) - (o.discountAmount || 0);
		const paid = o.payment?.providerData?.amountPaid || 0;
		return acc + Math.max(0, total - paid);
	}, 0);

	const invoicesOutstanding = (financialInvoices || []).reduce((acc, inv) => {
		let outstanding = inv.outstandingAmount;
		if (typeof outstanding !== 'number') {
			const total = Number(inv.totalAmount || 0);
			let paid = inv.paidAmount || (inv.payments?.reduce((s, p) => s + (p.amount || 0), 0)) || (inv.payment?.providerData?.amountPaid) || 0;
			outstanding = Math.max(0, total - paid);
		}
		return acc + (outstanding || 0);
	}, 0);

	const totalPendingAmount = ordersOutstanding + invoicesOutstanding;

	// Expenses
	const totalExpensesAmount = financialExpenses?.reduce((acc, e) => acc + e.amount, 0) || 0;

	// Invoices Total (Billed)
	const totalInvoiceAmount = financialInvoices?.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0) || 0;
	const unpaidInvoicesCount = financialInvoices?.filter((inv) => inv.status !== 'paid').length || 0;

	// --- Handlers ---

	const handleOpenWebsite = () => {
		if (selectedStore?.storeLink) {
			const url = `https://${selectedStore.storeLink}.tradeet.ng`;
			Linking.openURL(url);
		}
	};

	return (
		<View style={styles.container}>
			{/* Header */}
			<Header
				loading={loading}
				userInfo={userInfo}
				storeInfo={businessData}
			/>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#065637" />
				}
			>


				{/* Financial Overview */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<View style={styles.titleRow}>
							<Text style={styles.sectionTitle}>Overview</Text>
							<TouchableOpacity onPress={() => setViewValues(!viewValues)}>
								<Ionicons
									name={viewValues ? 'eye-outline' : 'eye-off-outline'}
									size={20}
									color="#6B7280"
								/>
							</TouchableOpacity>
						</View>

						{/* Date Filter Bubble */}
						<FinancialSummaryFilter
							currentFilter={financialFilter}
							onFilterChange={setFinancialFilter}
							onMonthSelect={(d) => {
								setSelectedFinancialMonth(d);
								setFinancialFilter('selectedMonth');
							}}
							onWeekSelect={(range) => {
								setSelectedFinancialWeek(range);
								setFinancialFilter('selectedWeek');
							}}
						/>
					</View>

					<StatsGrid
						loading={loading}
						viewValues={viewValues}
						totalIncomeAmount={totalIncomeAmount}
						totalInvoiceAmount={totalInvoiceAmount}
						unpaidInvoicesCount={unpaidInvoicesCount}
						totalPendingAmount={totalPendingAmount}
						totalExpensesAmount={totalExpensesAmount}
						onInvoicePress={() => router.push('/(app)/invoices')}
					/>
				</View>

				{/* Todos / Setup Banner */}
				<View style={styles.section}>
					<StoreTodoBannerConnected />
				</View>

				{/* Business Actions (Quick Access) */}
				<View style={styles.sectionNoPadding}>
					<BusinessActions />
				</View>

				{/* Recent Orders */}
				<View style={styles.section}>
					<RecentOrders
						orders={filteredOrders}
						loading={loading}
						filter={orderFilter}
						onFilterSelect={setOrderFilter}
					/>
				</View>

				{/* Upgrade Button (Floating or Bottom) */}
				<View style={{ marginBottom: 20 }}>
					<UpgradeButton />
				</View>

			</ScrollView>
		</View>
	);
};

export default HomeScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9FAFB', // Light gray background for dashboard feel
	},
	scrollContent: {
		paddingTop: 16,
		paddingBottom: 40,
	},
	section: {
		paddingHorizontal: 16,
		marginBottom: 8,
		flexDirection: 'column',
		display: 'flex'
	},
	sectionNoPadding: {
		paddingHorizontal: 16,
		marginBottom: 0,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
});
