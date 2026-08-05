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
import { COLORS, TYPOGRAPHY, LAYOUT, ACCESSIBILITY } from '@/constants/theme';

export default function DebtorsScreen() {
	const router = useRouter();
	const { selectedStore } = useContext(AuthContext);
	const entityId = selectedStore?._id;

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [debtors, setDebtors] = useState([]);
	const [summary, setSummary] = useState({ totalStoreDebt: 0, debtorCount: 0 });
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');

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
					{...ACCESSIBILITY.buttonProps(`View debt statement for ${item.name}`, 'Opens customer debt history')}
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
						{...ACCESSIBILITY.buttonProps(`Add debt for ${item.name}`)}
					>
						<Feather name="plus-circle" size={14} color={COLORS.primary} />
						<Text style={styles.giveCreditText}>+ Credit</Text>
					</TouchableOpacity>

					{hasDebt && (
						<>
							<TouchableOpacity
								style={[styles.actionBtn, styles.repayBtn]}
								onPress={() => openRepaymentModal(item)}
								{...ACCESSIBILITY.buttonProps(`Record repayment for ${item.name}`)}
							>
								<Feather name="check-circle" size={14} color={COLORS.info} />
								<Text style={styles.repayText}>- Repay</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.actionBtn, styles.reminderBtn]}
								onPress={() => handleWhatsAppReminder(item)}
								{...ACCESSIBILITY.buttonProps(`Send WhatsApp reminder to ${item.name}`)}
							>
								<Ionicons name="logo-whatsapp" size={14} color={COLORS.success} />
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
				<TouchableOpacity
					onPress={() => router.back()}
					style={styles.backBtn}
					{...ACCESSIBILITY.buttonProps('Go Back', 'Returns to previous screen')}
				>
					<Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Customer Debt Book</Text>
				<TouchableOpacity
					style={styles.headerAddBtn}
					onPress={() => openGiveCreditModal(null)}
					{...ACCESSIBILITY.buttonProps('Add New Customer Debt')}
				>
					<Feather name="plus" size={18} color={COLORS.textWhite} />
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
					<Ionicons name="people-outline" size={16} color={COLORS.danger} />
					<Text style={styles.summaryBadgeText}>{summary.debtorCount || 0} Debtors</Text>
				</View>
			</View>

			{/* Search & Filter */}
			<View style={styles.filterSection}>
				<View style={styles.searchBar}>
					<Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search debtor name or phone..."
						placeholderTextColor={COLORS.textLight}
						value={searchQuery}
						onChangeText={setSearchQuery}
						{...ACCESSIBILITY.inputProps('Search debtors')}
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
							{...ACCESSIBILITY.buttonProps(`Filter by ${tab.label}`)}
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
					<ActivityIndicator size="large" color={COLORS.primary} />
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
							<Ionicons name="book-outline" size={48} color={COLORS.textLight} />
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
							<TouchableOpacity
								onPress={() => setGiveCreditModalVisible(false)}
								{...ACCESSIBILITY.buttonProps('Close Modal')}
							>
								<Ionicons name="close" size={24} color={COLORS.textSecondary} />
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
										{...ACCESSIBILITY.inputProps('Customer Name')}
									/>

									<Text style={styles.fieldLabel}>WhatsApp Phone Number *</Text>
									<TextInput
										style={styles.input}
										placeholder="e.g. 08012345678"
										keyboardType="phone-pad"
										value={creditForm.whatsappNumber}
										onChangeText={(text) => setCreditForm({ ...creditForm, whatsappNumber: text })}
										{...ACCESSIBILITY.inputProps('WhatsApp Phone Number')}
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
								{...ACCESSIBILITY.inputProps('Credit Amount')}
							/>

							<Text style={styles.fieldLabel}>Description / Items (Optional)</Text>
							<TextInput
								style={[styles.input, { height: 70 }]}
								placeholder="e.g. 2 Cartons of Vegetable Oil"
								multiline
								value={creditForm.note}
								onChangeText={(text) => setCreditForm({ ...creditForm, note: text })}
								{...ACCESSIBILITY.inputProps('Credit Note')}
							/>

							<TouchableOpacity
								style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
								onPress={handleGiveCreditSubmit}
								disabled={isSubmitting}
								{...ACCESSIBILITY.buttonProps('Save Credit Record')}
							>
								{isSubmitting ? (
									<ActivityIndicator color={COLORS.textWhite} />
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
							<TouchableOpacity
								onPress={() => setRepaymentModalVisible(false)}
								{...ACCESSIBILITY.buttonProps('Close Modal')}
							>
								<Ionicons name="close" size={24} color={COLORS.textSecondary} />
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
							{...ACCESSIBILITY.inputProps('Repayment Amount')}
						/>

						<Text style={styles.fieldLabel}>Payment Method</Text>
						<View style={styles.methodRow}>
							{['cash', 'transfer', 'pos'].map((m) => (
								<TouchableOpacity
									key={m}
									style={[styles.methodBtn, repaymentForm.paymentMethod === m && styles.activeMethodBtn]}
									onPress={() => setRepaymentForm({ ...repaymentForm, paymentMethod: m })}
									{...ACCESSIBILITY.buttonProps(`Select ${m} payment method`)}
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
							{...ACCESSIBILITY.inputProps('Repayment Note')}
						/>

						<TouchableOpacity
							style={[styles.submitBtn, { backgroundColor: COLORS.info }, isSubmitting && { opacity: 0.7 }]}
							onPress={handleRepaymentSubmit}
							disabled={isSubmitting}
							{...ACCESSIBILITY.buttonProps('Record Repayment')}
						>
							{isSubmitting ? (
								<ActivityIndicator color={COLORS.textWhite} />
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
							<TouchableOpacity
								onPress={() => setLedgerModalVisible(false)}
								{...ACCESSIBILITY.buttonProps('Close History Modal')}
							>
								<Ionicons name="close" size={24} color={COLORS.textSecondary} />
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
								<ActivityIndicator color={COLORS.primary} />
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
												<Text style={[styles.ledgerAmount, isCredit ? { color: COLORS.danger } : { color: COLORS.success }]}>
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
									<Text style={{ textAlign: 'center', color: COLORS.textMuted, padding: 20 }}>
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
		backgroundColor: COLORS.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: COLORS.surface,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		paddingTop: Platform.OS === 'android' ? 40 : 12,
	},
	backBtn: {
		minWidth: LAYOUT.minTouchTarget,
		minHeight: LAYOUT.minTouchTarget,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 4,
	},
	headerTitle: {
		...TYPOGRAPHY.h1,
		fontSize: 18,
		flex: 1,
	},
	headerAddBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: COLORS.primary,
		paddingHorizontal: 14,
		minHeight: LAYOUT.minTouchTarget,
		borderRadius: 22,
		justifyContent: 'center',
	},
	headerAddText: {
		...TYPOGRAPHY.captionBold,
		color: COLORS.textWhite,
	},
	summaryCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLORS.surface,
		marginHorizontal: 16,
		marginTop: 14,
		padding: 16,
		borderRadius: LAYOUT.borderRadiusLg,
		borderWidth: 1,
		borderColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
		elevation: 1,
	},
	summaryLabel: {
		...TYPOGRAPHY.caption,
		color: COLORS.textSecondary,
	},
	summaryAmount: {
		...TYPOGRAPHY.h1,
		fontSize: 24,
		color: COLORS.danger,
		marginTop: 2,
	},
	summaryBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: COLORS.dangerBg,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: LAYOUT.borderRadiusMd,
	},
	summaryBadgeText: {
		...TYPOGRAPHY.captionBold,
		color: COLORS.danger,
	},
	filterSection: {
		paddingHorizontal: 16,
		marginTop: 12,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLORS.surface,
		borderRadius: LAYOUT.borderRadiusMd,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
		height: 44,
		marginBottom: 10,
	},
	searchInput: {
		...TYPOGRAPHY.body,
		flex: 1,
		marginLeft: 8,
		color: COLORS.textPrimary,
	},
	tabsRow: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 6,
	},
	tabBtn: {
		paddingHorizontal: 16,
		minHeight: 36,
		justifyContent: 'center',
		borderRadius: 18,
		backgroundColor: COLORS.surfaceSubtle,
	},
	activeTabBtn: {
		backgroundColor: COLORS.primary,
	},
	tabText: {
		...TYPOGRAPHY.captionBold,
		color: COLORS.textSecondary,
	},
	activeTabText: {
		color: COLORS.textWhite,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 40,
	},
	debtorCard: {
		backgroundColor: COLORS.surface,
		borderRadius: LAYOUT.borderRadiusLg,
		padding: 14,
		marginTop: 10,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	debtorHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: LAYOUT.minTouchTarget,
	},
	avatarCircle: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: COLORS.primaryLight,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: {
		...TYPOGRAPHY.h2,
		fontSize: 16,
		color: COLORS.primary,
	},
	debtorName: {
		...TYPOGRAPHY.h3,
	},
	debtorPhone: {
		...TYPOGRAPHY.caption,
		marginTop: 1,
	},
	debtAmount: {
		...TYPOGRAPHY.h2,
		color: COLORS.danger,
	},
	clearedAmount: {
		color: COLORS.success,
	},
	debtBadgeText: {
		...TYPOGRAPHY.micro,
		color: COLORS.danger,
		marginTop: 1,
	},
	clearedBadgeText: {
		color: COLORS.success,
	},
	actionRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 12,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: COLORS.borderSubtle,
	},
	actionBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 12,
		minHeight: 36,
		borderRadius: LAYOUT.borderRadiusSm,
		backgroundColor: COLORS.surfaceSubtle,
	},
	giveCreditBtn: {
		backgroundColor: COLORS.primaryLight,
	},
	giveCreditText: {
		...TYPOGRAPHY.captionBold,
		color: COLORS.primary,
	},
	repayBtn: {
		backgroundColor: COLORS.infoBg,
	},
	repayText: {
		...TYPOGRAPHY.captionBold,
		color: COLORS.info,
	},
	reminderBtn: {
		backgroundColor: COLORS.successBg,
	},
	reminderText: {
		...TYPOGRAPHY.captionBold,
		color: COLORS.success,
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
		...TYPOGRAPHY.h2,
		color: COLORS.textSecondary,
		marginTop: 12,
	},
	emptySub: {
		...TYPOGRAPHY.caption,
		color: COLORS.textMuted,
		marginTop: 4,
	},

	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: COLORS.surface,
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
		...TYPOGRAPHY.h2,
		fontSize: 18,
	},
	fieldLabel: {
		...TYPOGRAPHY.captionBold,
		color: COLORS.textSecondary,
		marginBottom: 4,
		marginTop: 10,
	},
	input: {
		...TYPOGRAPHY.body,
		backgroundColor: COLORS.background,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: LAYOUT.borderRadiusMd,
		paddingHorizontal: 12,
		minHeight: 44,
		color: COLORS.textPrimary,
	},
	selectedCustomerBanner: {
		backgroundColor: COLORS.surfaceSubtle,
		padding: 12,
		borderRadius: LAYOUT.borderRadiusMd,
		marginBottom: 10,
	},
	selectedCustomerName: {
		...TYPOGRAPHY.h3,
	},
	selectedCustomerPhone: {
		...TYPOGRAPHY.caption,
	},
	submitBtn: {
		backgroundColor: COLORS.primary,
		minHeight: 48,
		borderRadius: LAYOUT.borderRadiusMd,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 20,
		marginBottom: 10,
	},
	submitBtnText: {
		...TYPOGRAPHY.h3,
		color: COLORS.textWhite,
	},
	methodRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 4,
	},
	methodBtn: {
		flex: 1,
		minHeight: 38,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: LAYOUT.borderRadiusSm,
		backgroundColor: COLORS.surfaceSubtle,
	},
	activeMethodBtn: {
		backgroundColor: COLORS.info,
	},
	methodText: {
		...TYPOGRAPHY.captionBold,
		color: COLORS.textSecondary,
	},
	activeMethodText: {
		color: COLORS.textWhite,
	},
	ledgerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.borderSubtle,
	},
	ledgerType: {
		...TYPOGRAPHY.h3,
		fontSize: 14,
	},
	ledgerNote: {
		...TYPOGRAPHY.caption,
	},
	ledgerDate: {
		...TYPOGRAPHY.caption,
		fontSize: 11,
		color: COLORS.textLight,
		marginTop: 2,
	},
	ledgerAmount: {
		...TYPOGRAPHY.h2,
		fontSize: 15,
	},
	ledgerBalance: {
		...TYPOGRAPHY.caption,
		fontSize: 11,
		marginTop: 2,
	},
});
