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
import { COLORS, TYPOGRAPHY, LAYOUT, ACCESSIBILITY } from '@/constants/theme';

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
			<TouchableWithoutFeedback {...ACCESSIBILITY.buttonProps('Income Summary Card')}>
				<View style={[styles.statCard, styles.incomeCard]}>
					<View style={styles.statHeader}>
						<View style={[styles.iconCircle, { backgroundColor: COLORS.primaryLight }]}>
							<Entypo name="arrow-bold-down" size={14} color={COLORS.primary} />
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
			<TouchableWithoutFeedback
				onPress={onInvoicePress}
				{...ACCESSIBILITY.buttonProps('Invoices Summary Card', 'Navigates to invoices')}
			>
				<View style={[styles.statCard, styles.invoiceCard]}>
					<View style={styles.statHeader}>
						<View style={[styles.iconCircle, { backgroundColor: COLORS.infoBg }]}>
							<AntDesign name="file-text" size={14} color={COLORS.info} />
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
								<AntDesign name="right" size={10} color={COLORS.textLight} />
							</View>
						</View>
					)}
				</View>
			</TouchableWithoutFeedback>

			{/* 3. Debtors Card */}
			<TouchableWithoutFeedback
				onPress={() => router.push('/(app)/debtors')}
				{...ACCESSIBILITY.buttonProps('Debtors Summary Card', 'Opens Customer Debt Book')}
			>
				<View style={[styles.statCard, styles.debtorsCard]}>
					<View style={styles.statHeader}>
						<View style={[styles.iconCircle, { backgroundColor: COLORS.warningBg }]}>
							<MaterialCommunityIcons name="book-open-variant" size={14} color={COLORS.warning} />
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
								<AntDesign name="right" size={10} color={COLORS.textLight} />
							</View>
						</View>
					)}
				</View>
			</TouchableWithoutFeedback>

			{/* 4. Expenses Card */}
			<TouchableWithoutFeedback {...ACCESSIBILITY.buttonProps('Expenses Summary Card')}>
				<View style={[styles.statCard, styles.expensesCard]}>
					<View style={styles.statHeader}>
						<View style={[styles.iconCircle, { backgroundColor: COLORS.dangerBg }]}>
							<Entypo name="arrow-bold-up" size={14} color={COLORS.danger} />
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
		backgroundColor: COLORS.surface,
		borderRadius: LAYOUT.borderRadiusMd,
		padding: 14,
		width: '48.5%',
		borderWidth: 1,
		borderColor: COLORS.borderSubtle,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
		elevation: 1,
	},
	incomeCard: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
	invoiceCard: { borderLeftWidth: 3, borderLeftColor: COLORS.info },
	debtorsCard: { borderLeftWidth: 3, borderLeftColor: COLORS.warning },
	expensesCard: { borderLeftWidth: 3, borderLeftColor: COLORS.danger },

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
		...TYPOGRAPHY.captionBold,
		color: COLORS.textMuted,
		flex: 1,
	},
	statValue: {
		...TYPOGRAPHY.h2,
		fontSize: 17,
		color: COLORS.textPrimary,
		letterSpacing: -0.3,
	},
	hiddenTextValue: {
		...TYPOGRAPHY.h2,
		fontSize: 16,
		color: COLORS.textLight,
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
		...TYPOGRAPHY.captionBold,
		color: COLORS.textMuted,
	},
	skeletonBox: {
		height: 24,
		width: '60%',
		backgroundColor: COLORS.border,
		borderRadius: 4,
	},
});
