// HomeScreen.jsx
import React, {
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

let hasHomeScreenLoadedBefore = false;

const HomeScreen = ({ userInfo }) => {
	const router = useRouter();
	const { selectedStore, getPlanCapability } = useContext(AuthContext);
	const hasAdvancedAnalytics = getPlanCapability('hasAdvancedAnalytics');

	const previousStoreRef = React.useRef(selectedStore?._id);
	if (previousStoreRef.current !== selectedStore?._id) {
		hasHomeScreenLoadedBefore = false;
		previousStoreRef.current = selectedStore?._id;
	}

	const queryClient = useQueryClient();

	// State
	const [refreshing, setRefreshing] = useState(false);
	const [viewValues, setViewValues] = useState(true);
	const [filteredOrders, setFilteredOrders] = useState([]);

	// Filters
	const [orderFilter, setOrderFilter] = useState('new');
	const [financialFilter, setFinancialFilter] = useState('allTime');
	const [selectedFinancialMonth, setSelectedFinancialMonth] = useState(new Date());
	const [selectedFinancialWeek, setSelectedFinancialWeek] = useState(null);

	// --- Fetching Logic ---
	const targetStoreId = selectedStore?.parent || selectedStore?._id;
	const branchQuery = selectedStore?.parent ? `?branchId=${selectedStore._id}` : '';

	const storeQuery = useQuery({
		queryKey: ['store', selectedStore?._id],
		queryFn: async () => {
			try {
				const res = await axiosInstance.get(`/stores/?id=${selectedStore._id}`);
				return res.data.store;
			} catch (err) {
				return null;
			}
		},
		enabled: !!selectedStore?._id,
	});

	const ordersQuery = useQuery({
		queryKey: ['orders', targetStoreId, branchQuery],
		queryFn: async () => {
			try {
				const res = await axiosInstance.get(`/orders/store/${targetStoreId}${branchQuery}`);
				const data = Array.isArray(res.data) ? res.data : res.data.orders ?? res.data;
				return (data || []).slice().reverse();
			} catch (err) {
				return [];
			}
		},
		enabled: !!targetStoreId,
	});

	const invoicesQuery = useQuery({
		queryKey: ['invoices', targetStoreId, selectedStore?.parent ? selectedStore._id : null],
		queryFn: async () => {
			try {
				const params = { storeId: targetStoreId };
				if (selectedStore?.parent) params.branchId = selectedStore._id;
				const res = await axiosInstance.get('/invoices', { params });
				const data = Array.isArray(res.data) ? res.data : res.data.invoices ?? res.data;
				return (data || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
			} catch (err) {
				return [];
			}
		},
		enabled: !!targetStoreId,
	});

	const expensesQuery = useQuery({
		queryKey: ['expenses', targetStoreId],
		queryFn: async () => {
			try {
				const res = await axiosInstance.get(`/expenses/${targetStoreId}`);
				return res.data.expenses || [];
			} catch (err) {
				return [];
			}
		},
		enabled: !!targetStoreId,
	});

	const walletQuery = useQuery({
		queryKey: ['wallet', selectedStore?._id],
		queryFn: async () => {
			try {
				const res = await axiosInstance.get(`/businesses/wallet/${selectedStore._id}`);
				return res.data.walletBalance;
			} catch (err) {
				return 0;
			}
		},
		enabled: !!selectedStore?._id,
	});

	if (storeQuery.data && ordersQuery.data) {
		hasHomeScreenLoadedBefore = true;
	}

	const loading = !hasHomeScreenLoadedBefore && (storeQuery.isPending || ordersQuery.isPending);

	const businessData = storeQuery.data || null;
	const orders = ordersQuery.data || [];
	const invoices = invoicesQuery.data || [];
	const expenses = expensesQuery.data || [];
	const wallet = walletQuery.data || 0;

	// Trial Logic
	const isTrial = userInfo?.plan?.isTrial;
	const expiryDate = userInfo?.plan?.expiryDate ? new Date(userInfo.plan.expiryDate) : null;
	const isExpired = expiryDate && expiryDate < new Date();

	const getRemainingTrialDays = () => {
		if (!isTrial || !expiryDate) return null;
		const now = new Date();
		const diff = expiryDate - now;
		// If expired, diff is negative
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
		return days;
	};

	const trialDays = getRemainingTrialDays();

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await Promise.all([
			storeQuery.refetch(),
			ordersQuery.refetch(),
			invoicesQuery.refetch(),
			expensesQuery.refetch(),
			walletQuery.refetch(),
		]);
		setRefreshing(false);
	}, [storeQuery, ordersQuery, invoicesQuery, expensesQuery, walletQuery]);

	// --- Socket Logic ---

	useEffect(() => {
		const orderQueryKey = ['orders', targetStoreId, branchQuery];
		const handleOrderUpdate = (updated) => {
			queryClient.setQueryData(orderQueryKey, (old) => old ? old.map((o) => (o._id === updated._id ? updated : o)) : old);
		};
		const handleNewOrder = (newOrder) => {
			queryClient.setQueryData(orderQueryKey, (old) => old ? [newOrder, ...old] : old);
		};
		const handleDeleteOrder = (id) => {
			queryClient.setQueryData(orderQueryKey, (old) => old ? old.filter((o) => o._id !== id) : old);
		};

		socket.on('orderUpdate', handleOrderUpdate);
		socket.on('newOrder', handleNewOrder);
		socket.on('deleteOrder', handleDeleteOrder);

		return () => {
			socket.off('orderUpdate', handleOrderUpdate);
			socket.off('newOrder', handleNewOrder);
			socket.off('deleteOrder', handleDeleteOrder);
		};
	}, [targetStoreId, branchQuery, queryClient]);

	// --- Filtering Logic (Orders) ---

	useEffect(() => {
		let res = [];
		const validOrders = orders.filter(o => o.status !== 'cancelled');

		if (orderFilter === 'new') {
			// New: Usually just 'pending' status, maybe 'paid' or not.
			res = validOrders.filter((o) => o?.status === 'pending');
		} else if (orderFilter === 'not_paid') {
			// Not Paid
			res = validOrders.filter((o) => o?.payment?.status !== 'paid');
		} else if (orderFilter === 'active') {
			// Active: processing, accepted, out-for-delivery
			res = validOrders.filter((o) => ['processing', 'accepted', 'out-for-delivery'].includes(o?.status));
		} else {
			// All (except cancelled)
			res = validOrders;
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
	// Income (Orders + Invoices Paid)
	const ordersIncome = financialOrders?.reduce((acc, o) => {
		// Sum payments from array or fallback to providerData
		let paid = (o.payments || []).reduce((s, p) => s + (p.status === 'completed' ? (p.amount || 0) : 0), 0);
		if (paid === 0 && o.payment?.providerData?.amountPaid) {
			paid = o.payment.providerData.amountPaid;
		}

		// Deduct platform service fee from vendor income view
		const fee = o.serviceFee || 0;
		return acc + Math.max(0, paid - fee);
	}, 0) || 0;

	const invoicesIncome = (financialInvoices || []).reduce((acc, inv) => {
		let paid = inv.paidAmount || (inv.payments?.reduce((s, p) => s + (p.amount || 0), 0)) || (inv.payment?.providerData?.amountPaid) || 0;
		return acc + paid;
	}, 0);

	const totalIncomeAmount = ordersIncome + invoicesIncome;

	// Outstanding (Orders + Invoices Unpaid)
	const ordersOutstanding = (financialOrders || []).reduce((acc, o) => {
		const fee = o.serviceFee || 0;
		// Note: total usually includes serviceFee in backend totalAmount
		const grossTotal = o.totalAmount || 0;

		// Calculate paid
		let paid = (o.payments || []).reduce((s, p) => s + (p.status === 'completed' ? (p.amount || 0) : 0), 0);
		if (paid === 0 && o.payment?.providerData?.amountPaid) {
			paid = o.payment.providerData.amountPaid;
		}

		const realUniqueOutstanding = Math.max(0, grossTotal - paid);

		const discount = o.discountAmount || 0;
		const paidNet = Math.max(0, paid - fee);
		// Vendor Revenue = Total - Fee - Discount
		const totalNet = Math.max(0, (o.totalAmount || 0) - fee - discount);
		const finalOutstanding = Math.max(0, totalNet - paidNet);
		return acc + finalOutstanding;
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
				{isTrial && (
					<TouchableOpacity
						style={[styles.trialBanner, isExpired && styles.trialBannerExpired]}
						onPress={() => router.push('/(app)/subscription')}
						activeOpacity={0.9}
					>
						<View style={[styles.trialBannerIcon, isExpired && styles.trialBannerIconExpired]}>
							<Ionicons name={isExpired ? "alert-circle" : "gift"} size={20} color={isExpired ? "#B45309" : "#6366f1"} />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={[styles.trialBannerTitle, isExpired && styles.trialBannerTitleExpired]}>
								{isExpired ? 'Trial Expired' : '14-Day Business Trial Active'}
							</Text>
							<Text style={[styles.trialBannerSub, isExpired && styles.trialBannerSubExpired]}>
								{isExpired
									? 'Your trial has ended. Upgrade to continue using premium features.'
									: `${trialDays > 0 ? trialDays : 0} days remaining — Enjoy all premium features!`
								}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={18} color={isExpired ? "#B45309" : "#6366f1"} />
					</TouchableOpacity>
				)}


				{/* Financial Overview */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<View style={styles.titleRow}>
							<Text style={styles.sectionTitle}>Overview</Text>
							<TouchableOpacity
								onPress={() => setViewValues(!viewValues)}
								style={styles.eyeToggleBtn}
								activeOpacity={0.7}
							>
								<Ionicons
									name={viewValues ? 'eye-outline' : 'eye-off-outline'}
									size={16}
									color="#4B5563"
								/>
							</TouchableOpacity>
						</View>

						{/* Date Filter Bubble */}
						<FinancialSummaryFilter
							currentFilter={financialFilter}
							onFilterChange={setFinancialFilter}
							onMonthSelect={(d) => {
								if (!hasAdvancedAnalytics) {
									return Alert.alert(
										'Business Feature',
										'Advanced analytics filters are available on the Business plan.',
										[
											{ text: 'Cancel', style: 'cancel' },
											{ text: 'Upgrade', onPress: () => router.push('/(app)/subscription') }
										]
									);
								}
								setSelectedFinancialMonth(d);
								setFinancialFilter('selectedMonth');
							}}
							onWeekSelect={(range) => {
								if (!hasAdvancedAnalytics) {
									return Alert.alert(
										'Business Feature',
										'Advanced analytics filters are available on the Business plan.',
										[
											{ text: 'Cancel', style: 'cancel' },
											{ text: 'Upgrade', onPress: () => router.push('/(app)/subscription') }
										]
									);
								}
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
						counts={{
							new: orders.filter(o => o.status === 'pending').length,
							not_paid: orders.filter(o => o.status !== 'cancelled' && o.payment?.status !== 'paid').length,
							active: orders.filter(o => ['processing', 'accepted', 'out-for-delivery'].includes(o.status)).length,
							all: orders.filter(o => o.status !== 'cancelled').length
						}}
					/>
				</View>

				{/* Upgrade Button (Floating or Bottom) */}
				<View style={{ marginBottom: 20 }}>
					<UpgradeButton />
				</View>

			</ScrollView>
		</View >
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
	eyeToggleBtn: {
		backgroundColor: '#F3F4F6',
		paddingHorizontal: 8,
		paddingVertical: 6,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	// Active Trial Styles
	trialBanner: {
		marginHorizontal: 16,
		marginBottom: 16,
		backgroundColor: '#EEF2FF',
		borderRadius: 12,
		padding: 12,
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#C7D2FE',
		gap: 12,
	},
	trialBannerIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#fff',
		justifyContent: 'center',
		alignItems: 'center',
	},
	trialBannerTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#312E81',
	},
	trialBannerSub: {
		fontSize: 12,
		color: '#4338CA',
		marginTop: 2,
		lineHeight: 18,
	},

	// Expired Trial Styles
	trialBannerExpired: {
		backgroundColor: '#FFFBEB',
		borderColor: '#FCD34D',
	},
	trialBannerIconExpired: {
		backgroundColor: '#FFF7ED',
	},
	trialBannerTitleExpired: {
		color: '#92400E',
	},
	trialBannerSubExpired: {
		color: '#B45309',
	},
});
