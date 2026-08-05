// components/StatsGrid.jsx
import React from 'react';
import {
	View,
	Text,
	StyleSheet,
	Dimensions,
	TouchableWithoutFeedback,
} from 'react-native';
import {
	Entypo,
	AntDesign,
	MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

/**
 * 2x2 Financial Overview Grid:
 * 1. Income (Green) - Total revenue received
 * 2. Invoices (Blue) - Total invoices issued & unpaid count
 * 3. Debtors (Amber) - Total customer debt balance & active debtors count
 * 4. Expenses (Red) - Total business expenses
 */
const StatsGrid = ({
	loading,
	viewValues,
	totalIncomeAmount,
	totalInvoiceAmount,
	unpaidInvoicesCount,
	totalPendingAmount,
	totalExpensesAmount,
	debtSummary,
	onInvoicePress,
}) => {
	const router = useRouter();

	const debtorsAmount = debtSummary?.totalStoreDebt ?? totalPendingAmount ?? 0;
	const debtorsCount = debtSummary?.debtorCount || 0;

	return (
		<View style={styles.statsContainer}>
			{/* 1. Income Card */}
			<TouchableWithoutFeedback>
				<View style={[styles.statCard, styles.incomeCard]}>
					<View style={styles.statHeader}>
						<View style={[styles.iconCircle, { backgroundColor: '#E6F4EA' }]}>
							<Entypo name="arrow-bold-down" size={14} color="#065637" />
						</View>
						<Text style={styles.statLabel}>Income</Text>
					</View>
					{loading ? (
						<View style={styles.skeletonBox} />
					) : viewValues ? (
						<Text style={styles.statValue}>
							₦{totalIncomeAmount?.toLocaleString() || '0'}
						</Text>
					) : (
						<Text style={styles.hiddenTextValue}>••••••••</Text>
					)}
				</View>
			</TouchableWithoutFeedback>

			{/* 2. Invoices Card */}
			<TouchableWithoutFeedback onPress={onInvoicePress}>
				<View style={[styles.statCard, styles.invoiceCard]}>
					<View style={styles.statHeader}>
						<View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
							<AntDesign name="file-text" size={14} color="#1D4ED8" />
						</View>
						<Text style={styles.statLabel}>Invoices</Text>
					</View>
					{loading ? (
						<View style={styles.skeletonBox} />
					) : (
						<View>
							{viewValues ? (
								<Text style={styles.statValue}>
									₦{totalInvoiceAmount?.toLocaleString() || '0'}
								</Text>
							) : (
								<Text style={styles.hiddenTextValue}>••••••••</Text>
							)}
							<View style={styles.subTextContainer}>
								<Text style={styles.subText}>
									{unpaidInvoicesCount} unpaid
								</Text>
								<AntDesign name="right" size={10} color="#94A3B8" />
							</View>
						</View>
					)}
				</View>
			</TouchableWithoutFeedback>

			{/* 3. Debtors Card */}
			<TouchableWithoutFeedback onPress={() => router.push('/(app)/debtors')}>
				<View style={[styles.statCard, styles.debtorsCard]}>
					<View style={styles.statHeader}>
						<View style={[styles.iconCircle, { backgroundColor: '#FFFBEB' }]}>
							<MaterialCommunityIcons name="book-open-variant" size={14} color="#D97706" />
						</View>
						<Text style={styles.statLabel}>Debtors</Text>
					</View>
					{loading ? (
						<View style={styles.skeletonBox} />
					) : (
						<View>
							{viewValues ? (
								<Text style={styles.statValue}>
									₦{debtorsAmount.toLocaleString()}
								</Text>
							) : (
								<Text style={styles.hiddenTextValue}>••••••••</Text>
							)}
							<View style={styles.subTextContainer}>
								<Text style={styles.subText}>{debtorsCount} debtors</Text>
								<AntDesign name="right" size={10} color="#94A3B8" />
							</View>
						</View>
					)}
				</View>
			</TouchableWithoutFeedback>

			{/* 4. Expenses Card */}
			<TouchableWithoutFeedback>
				<View style={[styles.statCard, styles.expensesCard]}>
					<View style={styles.statHeader}>
						<View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
							<Entypo name="arrow-bold-up" size={14} color="#DC2626" />
						</View>
						<Text style={styles.statLabel}>Expenses</Text>
					</View>
					{loading ? (
						<View style={styles.skeletonBox} />
					) : viewValues ? (
						<Text style={styles.statValue}>
							₦{totalExpensesAmount?.toLocaleString() || '0'}
						</Text>
					) : (
						<Text style={styles.hiddenTextValue}>••••••••</Text>
					)}
				</View>
			</TouchableWithoutFeedback>
		</View>
	);
};

export default StatsGrid;

const styles = StyleSheet.create({
	statsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		rowGap: 12,
		marginBottom: 16,
	},
	statCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 14,
		width: '48.5%', // 2 cards per row
		borderWidth: 1,
		borderColor: '#F1F5F9',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
		elevation: 1,
	},
	// Color coded left accent borders
	incomeCard: { borderLeftWidth: 3, borderLeftColor: '#065637' },
	invoiceCard: { borderLeftWidth: 3, borderLeftColor: '#1D4ED8' },
	debtorsCard: { borderLeftWidth: 3, borderLeftColor: '#D97706' },
	expensesCard: { borderLeftWidth: 3, borderLeftColor: '#DC2626' },

	statHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 10,
	},
	iconCircle: {
		width: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	statLabel: {
		fontSize: 12,
		color: '#64748B',
		fontWeight: '700',
		flex: 1,
	},
	statValue: {
		fontSize: 17,
		fontWeight: '800',
		color: '#0F172A',
		letterSpacing: -0.3,
	},
	hiddenTextValue: {
		fontSize: 16,
		fontWeight: '800',
		color: '#94A3B8',
		letterSpacing: 2,
		marginTop: 2,
	},
	subTextContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 6,
	},
	subText: {
		fontSize: 11,
		color: '#64748B',
		fontWeight: '600',
	},
	skeletonBox: {
		height: 24,
		width: '60%',
		backgroundColor: '#E2E8F0',
		borderRadius: 4,
	},
});
