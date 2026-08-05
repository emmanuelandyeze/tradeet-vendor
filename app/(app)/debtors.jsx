import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	FlatList,
	TextInput,
	Modal,
	ActivityIndicator,
	RefreshControl,
	Alert,
	Linking,
	Platform,
	ScrollView,
	SafeAreaView,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';

export default function DebtorsScreen() {
	const router = useRouter();
	const { selectedStore, getPlanCapability } = useContext(AuthContext);
	const entityId = selectedStore?._id;

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [debtors, setDebtors] = useState([]);
	const [summary, setSummary] = useState({ totalStoreDebt: 0, debtorCount: 0 });
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'overdue', 'cleared'

	// Modals
	const [giveCreditModalVisible, setGiveCreditModalVisible] = useState(false);
	const [repaymentModalVisible, setRepaymentModalVisible] = useState(false);
	const [ledgerModalVisible, setLedgerModalVisible] = useState(false);

	// Selected customer & form states
	const [selectedCustomer, setSelectedCustomer] = useState(null);
	const [ledgerData, setLedgerData] = useState([]);
	const [loadingLedger, setLoadingLedger] = useState(false);

	const [creditForm, setCreditForm] = useState({
		customerId: '',
		name: '',
		whatsappNumber: '',
		amount: '',
		note: '',
		dueDate: '',
	});

	const [repaymentForm, setRepaymentForm] = useState({
		customerId: '',
		amount: '',
		note: '',
		paymentMethod: 'cash',
	});

	const [isSubmitting, setIsSubmitting] = useState(false);

	const fetchDebtors = useCallback(async () => {
		if (!entityId) return;
		try {
			const res = await axiosInstance.get(`/debts/${entityId}`, {
				params: { q: searchQuery, status: statusFilter },
			});
			if (res.data) {
				setSummary(res.data.summary || { totalStoreDebt: 0, debtorCount: 0 });
				setDebtors(res.data.debtors || []);
			}
		} catch (err) {
			console.error('Error fetching debtors:', err.response?.data || err.message);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [entityId, searchQuery, statusFilter]);

	useEffect(() => {
		fetchDebtors();
	}, [fetchDebtors]);

	const onRefresh = () => {
		setRefreshing(true);
		fetchDebtors();
	};

	// Open Give Credit Modal
	const openGiveCreditModal = (customer = null) => {
		if (customer) {
			setSelectedCustomer(customer);
			setCreditForm({
				customerId: customer._id,
				name: customer.name,
				whatsappNumber: customer.whatsappNumber,
				amount: '',
				note: '',
				dueDate: '',
			});
		} else {
			setSelectedCustomer(null);
			setCreditForm({
				customerId: '',
				name: '',
				whatsappNumber: '',
				amount: '',
				note: '',
				dueDate: '',
			});
		}
		setGiveCreditModalVisible(true);
	};

	// Open Repayment Modal
	const openRepaymentModal = (customer) => {
		setSelectedCustomer(customer);
		setRepaymentForm({
			customerId: customer._id,
			amount: '',
			note: '',
			paymentMethod: 'cash',
		});
		setRepaymentModalVisible(true);
	};

	// Open Ledger History Modal
	const openLedgerModal = async (customer) => {
		setSelectedCustomer(customer);
		setLedgerModalVisible(true);
		setLoadingLedger(true);
		try {
			const res = await axiosInstance.get(`/debts/${entityId}/customer/${customer._id}`);
			if (res.data) {
				setLedgerData(res.data.ledger || []);
			}
		} catch (err) {
			console.error('Error fetching customer ledger:', err);
		} finally {
			setLoadingLedger(false);
		}
	};

	// Submit Give Credit
	const handleGiveCreditSubmit = async () => {
		if (!creditForm.amount || parseFloat(creditForm.amount) <= 0) {
			return Alert.alert('Invalid Amount', 'Please enter a valid credit amount.');
		}
		if (!creditForm.customerId && (!creditForm.name || !creditForm.whatsappNumber)) {
			return Alert.alert('Missing Details', 'Please enter customer name and WhatsApp number.');
		}

		try {
			setIsSubmitting(true);
			await axiosInstance.post(`/debts/${entityId}/give-credit`, {
				customerId: creditForm.customerId || undefined,
				name: creditForm.name || undefined,
				whatsappNumber: creditForm.whatsappNumber || undefined,
				amount: parseFloat(creditForm.amount),
				note: creditForm.note,
				dueDate: creditForm.dueDate || undefined,
			});
			setGiveCreditModalVisible(false);
			Alert.alert('Success', 'Credit recorded successfully!');
			fetchDebtors();
		} catch (err) {
			const msg = err.response?.data?.message || 'Failed to record credit';
			Alert.alert('Error', msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Submit Repayment
	const handleRepaymentSubmit = async () => {
		if (!repaymentForm.amount || parseFloat(repaymentForm.amount) <= 0) {
			return Alert.alert('Invalid Amount', 'Please enter a valid repayment amount.');
		}

		try {
			setIsSubmitting(true);
			await axiosInstance.post(`/debts/${entityId}/record-payment`, {
				customerId: repaymentForm.customerId,
				amount: parseFloat(repaymentForm.amount),
				note: repaymentForm.note,
				paymentMethod: repaymentForm.paymentMethod,
			});
			setRepaymentModalVisible(false);
			Alert.alert('Success', 'Repayment recorded successfully!');
			fetchDebtors();
		} catch (err) {
			const msg = err.response?.data?.message || 'Failed to record repayment';
			Alert.alert('Error', msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	// Send WhatsApp Reminder
	const handleWhatsAppReminder = async (customer) => {
		try {
			const res = await axiosInstance.post(`/debts/${entityId}/reminder`, {
				customerId: customer._id,
			});

			if (res.data?.reminderText && res.data?.whatsappNumber) {
				const text = encodeURIComponent(res.data.reminderText);
				let cleanPhone = res.data.whatsappNumber.replace(/[^0-9]/g, '');
				if (cleanPhone.startsWith('0')) {
					cleanPhone = '234' + cleanPhone.slice(1);
				}
				const url = `https://wa.me/${cleanPhone}?text=${text}`;
				const supported = await Linking.canOpenURL(url);

				if (supported) {
					await Linking.openURL(url);
				} else {
					Alert.alert('Error', 'WhatsApp is not installed on this device.');
				}
			}
		} catch (err) {
			const msg = err.response?.data?.message || 'Could not send reminder.';
			Alert.alert('Error', msg);
		}
	};

	const renderDebtorItem = ({ item }) => {
		const debt = item.totalDebt || 0;
		const hasDebt = debt > 0;

		return (
			<View style={styles.debtorCard}>
				<TouchableOpacity
					style={styles.debtorHeader}
					onPress={() => openLedgerModal(item)}
					activeOpacity={0.7}
				>
					<View style={styles.avatarCircle}>
						<Text style={styles.avatarText}>
							{item.name ? item.name.charAt(0).toUpperCase() : 'C'}
						</Text>
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.debtorName} numberOfLines={1}>{item.name}</Text>
						<Text style={styles.debtorPhone}>{item.whatsappNumber}</Text>
					</View>
					<View style={{ alignItems: 'flex-end' }}>
						<Text style={[styles.debtAmount, !hasDebt && styles.clearedAmount]}>
							₦{debt.toLocaleString()}
						</Text>
						<Text style={[styles.debtBadgeText, !hasDebt && styles.clearedBadgeText]}>
							{hasDebt ? 'Owed' : 'Cleared'}
						</Text>
					</View>
				</TouchableOpacity>

				<View style={styles.actionRow}>
					<TouchableOpacity
						style={[styles.actionBtn, styles.giveCreditBtn]}
						onPress={() => openGiveCreditModal(item)}
					>
						<Feather name="plus-circle" size={14} color="#065637" />
						<Text style={styles.giveCreditText}>+ Credit</Text>
					</TouchableOpacity>

					{hasDebt && (
						<>
							<TouchableOpacity
								style={[styles.actionBtn, styles.repayBtn]}
								onPress={() => openRepaymentModal(item)}
							>
								<Feather name="check-circle" size={14} color="#2563EB" />
								<Text style={styles.repayText}>- Repay</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.actionBtn, styles.reminderBtn]}
								onPress={() => handleWhatsAppReminder(item)}
							>
								<Ionicons name="logo-whatsapp" size={14} color="#16A34A" />
								<Text style={styles.reminderText}>Remind</Text>
							</TouchableOpacity>
						</>
					)}
				</View>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
					<Ionicons name="arrow-back" size={24} color="#1E293B" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Customer Debt Book</Text>
				<TouchableOpacity
					style={styles.headerAddBtn}
					onPress={() => openGiveCreditModal(null)}
				>
					<Feather name="plus" size={18} color="#FFFFFF" />
					<Text style={styles.headerAddText}>Add Debt</Text>
				</TouchableOpacity>
			</View>

			{/* Summary Card */}
			<View style={styles.summaryCard}>
				<View style={{ flex: 1 }}>
					<Text style={styles.summaryLabel}>Total Outstanding Debt</Text>
					<Text style={styles.summaryAmount}>₦{(summary.totalStoreDebt || 0).toLocaleString()}</Text>
				</View>
				<View style={styles.summaryBadge}>
					<Ionicons name="people-outline" size={16} color="#DC2626" />
					<Text style={styles.summaryBadgeText}>{summary.debtorCount || 0} Debtors</Text>
				</View>
			</View>

			{/* Search & Filter */}
			<View style={styles.filterSection}>
				<View style={styles.searchBar}>
					<Ionicons name="search-outline" size={18} color="#94A3B8" />
					<TextInput
						style={styles.searchInput}
						placeholder="Search debtor name or phone..."
						placeholderTextColor="#94A3B8"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>

				<View style={styles.tabsRow}>
					{[
						{ id: 'all', label: 'All' },
						{ id: 'overdue', label: 'Unpaid' },
						{ id: 'cleared', label: 'Cleared' },
					].map((tab) => (
						<TouchableOpacity
							key={tab.id}
							style={[styles.tabBtn, statusFilter === tab.id && styles.activeTabBtn]}
							onPress={() => setStatusFilter(tab.id)}
						>
							<Text style={[styles.tabText, statusFilter === tab.id && styles.activeTabText]}>
								{tab.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			{/* List */}
			{loading ? (
				<View style={styles.centered}>
					<ActivityIndicator size="large" color="#065637" />
				</View>
			) : (
				<FlatList
					data={debtors}
					keyExtractor={(item) => item._id}
					renderItem={renderDebtorItem}
					contentContainerStyle={styles.listContent}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
					ListEmptyComponent={
						<View style={styles.emptyState}>
							<Ionicons name="book-outline" size={48} color="#CBD5E1" />
							<Text style={styles.emptyTitle}>No Debt Records Found</Text>
							<Text style={styles.emptySub}>Tap "+ Add Debt" to record new customer credit.</Text>
						</View>
					}
				/>
			)}

			{/* --- GIVE CREDIT MODAL --- */}
			<Modal visible={giveCreditModalVisible} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Record Credit (+ Debt)</Text>
							<TouchableOpacity onPress={() => setGiveCreditModalVisible(false)}>
								<Ionicons name="close" size={24} color="#64748B" />
							</TouchableOpacity>
						</View>

						<ScrollView>
							{!selectedCustomer && (
								<>
									<Text style={styles.fieldLabel}>Customer Name *</Text>
									<TextInput
										style={styles.input}
										placeholder="e.g. Chukwuma Ada"
										value={creditForm.name}
										onChangeText={(text) => setCreditForm({ ...creditForm, name: text })}
									/>

									<Text style={styles.fieldLabel}>WhatsApp Phone Number *</Text>
									<TextInput
										style={styles.input}
										placeholder="e.g. 08012345678"
										keyboardType="phone-pad"
										value={creditForm.whatsappNumber}
										onChangeText={(text) => setCreditForm({ ...creditForm, whatsappNumber: text })}
									/>
								</>
							)}

							{selectedCustomer && (
								<View style={styles.selectedCustomerBanner}>
									<Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
									<Text style={styles.selectedCustomerPhone}>{selectedCustomer.whatsappNumber}</Text>
								</View>
							)}

							<Text style={styles.fieldLabel}>Amount (₦) *</Text>
							<TextInput
								style={styles.input}
								placeholder="0.00"
								keyboardType="numeric"
								value={creditForm.amount}
								onChangeText={(text) => setCreditForm({ ...creditForm, amount: text })}
							/>

							<Text style={styles.fieldLabel}>Description / Items (Optional)</Text>
							<TextInput
								style={[styles.input, { height: 70 }]}
								placeholder="e.g. 2 Cartons of Vegetable Oil"
								multiline
								value={creditForm.note}
								onChangeText={(text) => setCreditForm({ ...creditForm, note: text })}
							/>

							<TouchableOpacity
								style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
								onPress={handleGiveCreditSubmit}
								disabled={isSubmitting}
							>
								{isSubmitting ? (
									<ActivityIndicator color="#FFF" />
								) : (
									<Text style={styles.submitBtnText}>Save Credit Record</Text>
								)}
							</TouchableOpacity>
						</ScrollView>
					</View>
				</View>
			</Modal>

			{/* --- REPAYMENT MODAL --- */}
			<Modal visible={repaymentModalVisible} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Record Repayment (- Pay)</Text>
							<TouchableOpacity onPress={() => setRepaymentModalVisible(false)}>
								<Ionicons name="close" size={24} color="#64748B" />
							</TouchableOpacity>
						</View>

						{selectedCustomer && (
							<View style={styles.selectedCustomerBanner}>
								<Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
								<Text style={styles.selectedCustomerPhone}>Current Balance: ₦{(selectedCustomer.totalDebt || 0).toLocaleString()}</Text>
							</View>
						)}

						<Text style={styles.fieldLabel}>Repayment Amount (₦) *</Text>
						<TextInput
							style={styles.input}
							placeholder="0.00"
							keyboardType="numeric"
							value={repaymentForm.amount}
							onChangeText={(text) => setRepaymentForm({ ...repaymentForm, amount: text })}
						/>

						<Text style={styles.fieldLabel}>Payment Method</Text>
						<View style={styles.methodRow}>
							{['cash', 'transfer', 'pos'].map((m) => (
								<TouchableOpacity
									key={m}
									style={[styles.methodBtn, repaymentForm.paymentMethod === m && styles.activeMethodBtn]}
									onPress={() => setRepaymentForm({ ...repaymentForm, paymentMethod: m })}
								>
									<Text style={[styles.methodText, repaymentForm.paymentMethod === m && styles.activeMethodText]}>
										{m.toUpperCase()}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<Text style={styles.fieldLabel}>Note / Remark (Optional)</Text>
						<TextInput
							style={styles.input}
							placeholder="e.g. Bank Transfer repayment"
							value={repaymentForm.note}
							onChangeText={(text) => setRepaymentForm({ ...repaymentForm, note: text })}
						/>

						<TouchableOpacity
							style={[styles.submitBtn, { backgroundColor: '#2563EB' }, isSubmitting && { opacity: 0.7 }]}
							onPress={handleRepaymentSubmit}
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<ActivityIndicator color="#FFF" />
							) : (
								<Text style={styles.submitBtnText}>Record Repayment</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* --- LEDGER STATEMENT HISTORY MODAL --- */}
			<Modal visible={ledgerModalVisible} animationType="slide" transparent>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { maxHeight: '80%' }]}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Debt History Statement</Text>
							<TouchableOpacity onPress={() => setLedgerModalVisible(false)}>
								<Ionicons name="close" size={24} color="#64748B" />
							</TouchableOpacity>
						</View>

						{selectedCustomer && (
							<View style={[styles.selectedCustomerBanner, { marginBottom: 12 }]}>
								<Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
								<Text style={styles.selectedCustomerPhone}>Balance Owed: ₦{(selectedCustomer.totalDebt || 0).toLocaleString()}</Text>
							</View>
						)}

						{loadingLedger ? (
							<View style={{ padding: 40 }}>
								<ActivityIndicator color="#065637" />
							</View>
						) : (
							<FlatList
								data={ledgerData}
								keyExtractor={(item) => item._id}
								renderItem={({ item }) => {
									const isCredit = item.type === 'GIVE_CREDIT';
									return (
										<View style={styles.ledgerRow}>
											<View style={{ flex: 1 }}>
												<Text style={styles.ledgerType}>
													{isCredit ? 'Credit Added' : 'Payment Received'}
												</Text>
												{item.note ? <Text style={styles.ledgerNote}>{item.note}</Text> : null}
												<Text style={styles.ledgerDate}>
													{new Date(item.createdAt).toLocaleString()}
												</Text>
											</View>
											<View style={{ alignItems: 'flex-end' }}>
												<Text style={[styles.ledgerAmount, isCredit ? { color: '#DC2626' } : { color: '#16A34A' }]}>
													{isCredit ? '+' : '-'}₦{(item.amount || 0).toLocaleString()}
												</Text>
												<Text style={styles.ledgerBalance}>
													Bal: ₦{(item.balanceAfter || 0).toLocaleString()}
												</Text>
											</View>
										</View>
									);
								}}
								ListEmptyComponent={
									<Text style={{ textAlign: 'center', color: '#94A3B8', padding: 20 }}>
										No debt entries recorded yet.
									</Text>
								}
							/>
						)}
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		paddingTop: Platform.OS === 'android' ? 40 : 12,
	},
	backBtn: {
		padding: 4,
		marginRight: 8,
	},
	headerTitle: {
		flex: 1,
		fontSize: 18,
		fontWeight: '800',
		color: '#0F172A',
	},
	headerAddBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#065637',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
	},
	headerAddText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '700',
	},
	summaryCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		marginHorizontal: 16,
		marginTop: 14,
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#FEF2F2',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		elevation: 1,
	},
	summaryLabel: {
		fontSize: 12,
		color: '#64748B',
		fontWeight: '600',
	},
	summaryAmount: {
		fontSize: 24,
		fontWeight: '800',
		color: '#DC2626',
		marginTop: 2,
	},
	summaryBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#FEF2F2',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 12,
	},
	summaryBadgeText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#DC2626',
	},
	filterSection: {
		paddingHorizontal: 16,
		marginTop: 12,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		height: 42,
		marginBottom: 10,
	},
	searchInput: {
		flex: 1,
		fontSize: 13,
		color: '#0F172A',
		marginLeft: 8,
	},
	tabsRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 6,
	},
	tabBtn: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: '#E2E8F0',
	},
	activeTabBtn: {
		backgroundColor: '#065637',
	},
	tabText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#64748B',
	},
	activeTabText: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 40,
	},
	debtorCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 14,
		marginTop: 10,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	debtorHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	avatarCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#F1F5F9',
		alignItems: 'center',
		justify: 'center',
	},
	avatarText: {
		fontSize: 16,
		fontWeight: '800',
		color: '#065637',
	},
	debtorName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	debtorPhone: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 1,
	},
	debtAmount: {
		fontSize: 16,
		fontWeight: '800',
		color: '#DC2626',
	},
	clearedAmount: {
		color: '#16A34A',
	},
	debtBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#DC2626',
		marginTop: 1,
	},
	clearedBadgeText: {
		color: '#16A34A',
	},
	actionRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 12,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
	},
	actionBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: '#F1F5F9',
	},
	giveCreditBtn: {
		backgroundColor: '#E6F4EA',
	},
	giveCreditText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#065637',
	},
	repayBtn: {
		backgroundColor: '#EFF6FF',
	},
	repayText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#2563EB',
	},
	reminderBtn: {
		backgroundColor: '#F0FDF4',
	},
	reminderText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#16A34A',
	},
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 40,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 50,
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#475569',
		marginTop: 12,
	},
	emptySub: {
		fontSize: 13,
		color: '#94A3B8',
		marginTop: 4,
	},

	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: '#FFFFFF',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 20,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0F172A',
	},
	fieldLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: '#475569',
		marginBottom: 4,
		marginTop: 10,
	},
	input: {
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		color: '#0F172A',
	},
	selectedCustomerBanner: {
		backgroundColor: '#F1F5F9',
		padding: 12,
		borderRadius: 12,
		marginBottom: 10,
	},
	selectedCustomerName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	selectedCustomerPhone: {
		fontSize: 12,
		color: '#64748B',
	},
	submitBtn: {
		backgroundColor: '#065637',
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: 'center',
		marginTop: 20,
		marginBottom: 10,
	},
	submitBtnText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '700',
	},
	methodRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 4,
	},
	methodBtn: {
		flex: 1,
		paddingVertical: 8,
		alignItems: 'center',
		borderRadius: 8,
		backgroundColor: '#F1F5F9',
	},
	activeMethodBtn: {
		backgroundColor: '#2563EB',
	},
	methodText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#64748B',
	},
	activeMethodText: {
		color: '#FFFFFF',
	},
	ledgerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	ledgerType: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
	},
	ledgerNote: {
		fontSize: 12,
		color: '#64748B',
	},
	ledgerDate: {
		fontSize: 11,
		color: '#94A3B8',
		marginTop: 2,
	},
	ledgerAmount: {
		fontSize: 14,
		fontWeight: '800',
	},
	ledgerBalance: {
		fontSize: 11,
		color: '#64748B',
		marginTop: 2,
	},
});
