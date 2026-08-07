import React, { useContext, useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	SectionList,
	ActivityIndicator,
	RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { COLORS } from '@/constants/theme';

/**
 * Everything that has moved through the account — money in and money out, in one list.
 *
 * They live in two collections server-side (`AnchorPayment`, `AnchorWithdrawal`) because they
 * are genuinely different records with different lifecycles, but a merchant does not think in
 * those terms. They think "what happened to my money", so the two are merged and sorted by
 * time here rather than shown as separate tabs.
 */

const naira = (n) =>
	`₦${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FILTERS = [
	{ id: 'all', label: 'All' },
	{ id: 'in', label: 'Money in' },
	{ id: 'out', label: 'Money out' },
];

/** Withdrawals can sit in several states; incoming money is either pending or settled. */
const STATUS_STYLE = {
	settled: { label: 'Received', color: COLORS.success, bg: COLORS.successBg },
	completed: { label: 'Sent', color: COLORS.success, bg: COLORS.successBg },
	pending: { label: 'Pending', color: COLORS.warning, bg: COLORS.warningBg },
	processing: { label: 'Sending', color: COLORS.warning, bg: COLORS.warningBg },
	failed: { label: 'Failed', color: COLORS.danger, bg: COLORS.dangerBg },
	reversed: { label: 'Reversed', color: COLORS.danger, bg: COLORS.dangerBg },
};

/** "Today" / "Yesterday" / "12 Aug 2026" — merchants navigate by day, not by timestamp. */
const dayLabel = (iso) => {
	const d = new Date(iso);
	const today = new Date();
	const yesterday = new Date(Date.now() - 86400000);
	const same = (a, b) => a.toDateString() === b.toDateString();
	if (same(d, today)) return 'Today';
	if (same(d, yesterday)) return 'Yesterday';
	return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const timeLabel = (iso) =>
	new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export default function PaymentHistoryScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { selectedStore } = useContext(AuthContext);
	const storeId = selectedStore?._isBranch ? selectedStore._storeId : selectedStore?._id;

	const [filter, setFilter] = useState('all');
	const [expandedId, setExpandedId] = useState(null);

	const paymentsQuery = useQuery({
		queryKey: ['anchorPayments', storeId, 'all'],
		queryFn: async () =>
			(await axiosInstance.get(`/anchor/${storeId}/payments`, { params: { status: 'all', limit: 100 } })).data.data,
		enabled: !!storeId,
		staleTime: 0,
	});

	const withdrawalsQuery = useQuery({
		queryKey: ['anchorWithdrawals', storeId],
		queryFn: async () =>
			(await axiosInstance.get(`/anchor/${storeId}/withdrawals`, { params: { limit: 100 } })).data.data,
		enabled: !!storeId,
		staleTime: 0,
	});

	const loading = paymentsQuery.isLoading || withdrawalsQuery.isLoading;
	const refreshing = paymentsQuery.isRefetching || withdrawalsQuery.isRefetching;

	const refresh = () => {
		queryClient.invalidateQueries({ queryKey: ['anchorPayments', storeId] });
		queryClient.invalidateQueries({ queryKey: ['anchorWithdrawals', storeId] });
		queryClient.invalidateQueries({ queryKey: ['anchorAccount', storeId] });
	};

	const sections = useMemo(() => {
		const inflow = (paymentsQuery.data || []).map((p) => ({
			key: `in-${p.id}`,
			direction: 'in',
			amount: p.amount,
			status: p.status,
			title: p.payerName || 'Bank transfer',
			subtitle: p.payerBank || null,
			note: p.narration || null,
			at: p.paidAt,
		}));

		const outflow = (withdrawalsQuery.data || []).map((w) => ({
			key: `out-${w.id}`,
			direction: 'out',
			amount: w.amount,
			status: w.status,
			title: w.accountName || 'Withdrawal',
			subtitle: [w.bankName, w.accountNumber].filter(Boolean).join(' · ') || null,
			note: w.failureReason || null,
			at: w.createdAt,
		}));

		const rows = [...inflow, ...outflow]
			.filter((r) => filter === 'all' || r.direction === filter)
			.sort((a, b) => new Date(b.at) - new Date(a.at));

		const grouped = rows.reduce((acc, row) => {
			const day = dayLabel(row.at);
			(acc[day] = acc[day] || []).push(row);
			return acc;
		}, {});

		return Object.entries(grouped).map(([title, data]) => ({ title, data }));
	}, [paymentsQuery.data, withdrawalsQuery.data, filter]);

	const renderRow = ({ item }) => {
		const isIn = item.direction === 'in';
		const badge = STATUS_STYLE[item.status] || STATUS_STYLE.pending;
		const open = expandedId === item.key;

		return (
			<TouchableOpacity
				style={styles.row}
				activeOpacity={0.7}
				onPress={() => setExpandedId(open ? null : item.key)}
			>
				<View style={styles.rowTop}>
					<View style={[styles.icon, { backgroundColor: isIn ? COLORS.successBg : COLORS.surfaceSubtle }]}>
						<Feather
							name={isIn ? 'arrow-down-left' : 'arrow-up-right'}
							size={16}
							color={isIn ? COLORS.success : COLORS.textSecondary}
						/>
					</View>

					<View style={{ flex: 1 }}>
						<Text style={styles.title} numberOfLines={1}>{item.title}</Text>
						<Text style={styles.meta}>
							{[item.subtitle, timeLabel(item.at)].filter(Boolean).join(' · ')}
						</Text>
					</View>

					<View style={{ alignItems: 'flex-end' }}>
						<Text style={[styles.amount, isIn ? styles.amountIn : styles.amountOut]}>
							{isIn ? '+' : '−'}{naira(item.amount)}
						</Text>
						<View style={[styles.badge, { backgroundColor: badge.bg }]}>
							<Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
						</View>
					</View>
				</View>

				{open && (
					<View style={styles.detail}>
						<DetailRow label={isIn ? 'From' : 'To'} value={item.title} />
						{item.subtitle ? <DetailRow label="Bank" value={item.subtitle} /> : null}
						<DetailRow label="Amount" value={naira(item.amount)} />
						<DetailRow label="Status" value={badge.label} />
						<DetailRow
							label="Date"
							value={new Date(item.at).toLocaleString('en-GB', {
								day: '2-digit', month: 'short', year: 'numeric',
								hour: '2-digit', minute: '2-digit',
							})}
						/>
						{item.note ? (
							<DetailRow label={isIn ? 'Narration' : 'Reason'} value={item.note} />
						) : null}
					</View>
				)}
			</TouchableOpacity>
		);
	};

	return (
		<View style={styles.container}>
			<StatusBar style="dark" />
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
					<Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>History</Text>
				<View style={{ width: 32 }} />
			</View>

			<View style={styles.filterRow}>
				{FILTERS.map((f) => (
					<TouchableOpacity
						key={f.id}
						style={[styles.filter, filter === f.id && styles.filterActive]}
						onPress={() => setFilter(f.id)}
					>
						<Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
							{f.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={COLORS.primary} />
				</View>
			) : (
				<SectionList
					sections={sections}
					keyExtractor={(item) => item.key}
					renderItem={renderRow}
					renderSectionHeader={({ section }) => (
						<Text style={styles.sectionHeader}>{section.title}</Text>
					)}
					contentContainerStyle={styles.listContent}
					stickySectionHeadersEnabled={false}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
					}
					ListEmptyComponent={
						<View style={styles.empty}>
							<Feather name="inbox" size={26} color={COLORS.textLight} />
							<Text style={styles.emptyText}>
								{filter === 'out' ? 'No withdrawals yet.' : 'Nothing here yet.'}
							</Text>
						</View>
					}
				/>
			)}
		</View>
	);
}

const DetailRow = ({ label, value }) => (
	<View style={styles.detailRow}>
		<Text style={styles.detailLabel}>{label}</Text>
		<Text style={styles.detailValue}>{value}</Text>
	</View>
);

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 40 },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	header: {
		flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
		backgroundColor: COLORS.surface,
		paddingHorizontal: 16, paddingVertical: 14,
		borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
	},
	backBtn: { padding: 4, width: 32 },
	headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

	filterRow: {
		flexDirection: 'row', gap: 8,
		paddingHorizontal: 16, paddingVertical: 12,
		backgroundColor: COLORS.surface,
		borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
	},
	filter: {
		paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
		borderWidth: 1, borderColor: COLORS.border,
	},
	filterActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
	filterText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
	filterTextActive: { color: COLORS.textWhite, fontWeight: '700' },

	listContent: { padding: 16, paddingBottom: 40 },
	sectionHeader: {
		fontSize: 11.5, fontWeight: '700', color: COLORS.textMuted,
		letterSpacing: 0.6, marginTop: 14, marginBottom: 8,
	},

	row: {
		backgroundColor: COLORS.surface,
		borderRadius: 12, padding: 14, marginBottom: 10,
		borderWidth: 1, borderColor: COLORS.borderSubtle,
	},
	rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	icon: {
		width: 34, height: 34, borderRadius: 17,
		alignItems: 'center', justifyContent: 'center',
	},
	title: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
	meta: { fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },
	amount: { fontSize: 14.5, fontWeight: '700' },
	amountIn: { color: COLORS.success },
	amountOut: { color: COLORS.textPrimary },
	badge: {
		paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4,
	},
	badgeText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 },

	detail: {
		marginTop: 14, paddingTop: 12,
		borderTopWidth: 1, borderTopColor: COLORS.borderSubtle,
	},
	detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 16 },
	detailLabel: { fontSize: 12, color: COLORS.textMuted },
	detailValue: { fontSize: 12.5, color: COLORS.textPrimary, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

	empty: { alignItems: 'center', paddingVertical: 50 },
	emptyText: { fontSize: 13.5, color: COLORS.textMuted, marginTop: 10 },
});
