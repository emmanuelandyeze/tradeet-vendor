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
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const StatsGrid = ({
	loading,
	viewValues,
	totalIncomeAmount,
	totalInvoiceAmount,
	unpaidInvoicesCount,
	totalPendingAmount,
	totalExpensesAmount,
	onInvoicePress,
}) => {
	const router = useRouter();

	return (
		<View style={styles.statsContainer}>
			{/* Income Card */}
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
					) : (
						<Text
							style={
								viewValues ? styles.statValue : styles.blurredText
							}
						>
							₦{totalIncomeAmount?.toLocaleString() || '0'}
						</Text>
					)}
				</View>
			</TouchableWithoutFeedback>

			{/* Invoices Card */}
			<TouchableWithoutFeedback onPress={onInvoicePress}>
				<View style={[styles.statCard, styles.invoiceCard]}>
					<View style={styles.statHeader}>
						<View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
							<AntDesign name="filetext1" size={14} color="#1565C0" />
						</View>
						<Text style={styles.statLabel}>Invoices</Text>
					</View>
					{loading ? (
						<View style={styles.skeletonBox} />
					) : (
						<View>
							<Text
								style={
									viewValues ? styles.statValue : styles.blurredText
								}
							>
								₦{totalInvoiceAmount?.toLocaleString() || '0'}
							</Text>
							<View style={styles.subTextContainer}>
								<Text style={styles.subText}>
									{unpaidInvoicesCount} unpaid
								</Text>
								<AntDesign name="right" size={10} color="#9CA3AF" />
							</View>
						</View>
					)}
				</View>
			</TouchableWithoutFeedback>

			{/* Outstanding Card */}
			<TouchableWithoutFeedback>
				<View style={[styles.statCard, styles.outstandingCard]}>
					<View style={styles.statHeader}>
						<View style={[styles.iconCircle, { backgroundColor: '#F3F4F6' }]}>
							<AntDesign name="minuscircleo" size={14} color="#4B5563" />
						</View>
						<Text style={styles.statLabel}>Outstanding</Text>
					</View>
					{loading ? (
						<View style={styles.skeletonBox} />
					) : (
						<Text
							style={
								viewValues ? styles.statValue : styles.blurredText
							}
						>
							₦{totalPendingAmount?.toLocaleString() || '0'}
						</Text>
					)}
				</View>
			</TouchableWithoutFeedback>

			{/* Expenses Card */}
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
					) : (
						<Text
							style={
								viewValues ? styles.statValue : styles.blurredText
							}
						>
							₦{totalExpensesAmount?.toLocaleString() || '0'}
						</Text>
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
		gap: 12,
		marginBottom: 16,
	},
	statCard: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		width: (width - 44) / 2, // Accounting for margins (16*2 outer padding + 12 gap)
		// Subtle shadow
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
		borderWidth: 1,
		borderColor: '#F3F4F6',
	},
	// accent borders (optional - keeps original color coding but subtler)
	incomeCard: { borderLeftWidth: 3, borderLeftColor: '#065637' },
	invoiceCard: { borderLeftWidth: 3, borderLeftColor: '#1565C0' },
	outstandingCard: { borderLeftWidth: 3, borderLeftColor: '#4B5563' },
	expensesCard: { borderLeftWidth: 3, borderLeftColor: '#DC2626' },

	statHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 12,
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
		color: '#6B7280',
		fontWeight: '600',
		flex: 1,
	},
	statValue: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		letterSpacing: -0.5,
	},
	blurredText: {
		fontSize: 18,
		fontWeight: '700',
		color: 'transparent',
		backgroundColor: '#E5E7EB',
		borderRadius: 4,
		overflow: 'hidden',
		width: '70%',
		height: 24,
	},
	subTextContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 6,
	},
	subText: {
		fontSize: 11,
		color: '#6B7280',
		fontWeight: '500',
	},
	skeletonBox: {
		height: 24,
		width: '60%',
		backgroundColor: '#E5E7EB',
		borderRadius: 4,
	},
});
