// components/FinancialSummaryFilterDropdownWithWeeks.js
import React, { useState, useMemo } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Modal,
	Pressable,
	FlatList,
	useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * FinancialSummaryFilterDropdownWithWeeks
 *
 * Props:
 * - onFilterChange(filter: 'allTime'|'today'|'thisMonth'|'selectedMonth'|'selectedWeek')
 * - onMonthSelect(date: Date)                    // existing
 * - onWeekSelect(range: { start: Date, end: Date, label: string })  // NEW optional
 * - currentFilter (string)
 *
 * Notes:
 * - Weeks are computed as Monday -> Sunday.
 * - If onWeekSelect is not provided, component will call onMonthSelect(weekStart) as a fallback.
 */

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

const formatDateShort = (d) =>
	`${d.getDate()} ${MONTHS[d.getMonth()].substring(0, 3)}`;

const buildYears = (span = 12) => {
	const current = new Date().getFullYear();
	const years = [];
	for (let i = 0; i <= span; i++) years.push(current - i);
	return years;
};

// Return Monday..Sunday ranges for the last `count` weeks, including current week
const getRecentWeeks = (count = 12) => {
	const weeks = [];
	const today = new Date();
	// get Monday of current week
	const day = today.getDay(); // 0 (Sun) - 6 (Sat)
	const diffToMonday = (day + 6) % 7; // 0 if Monday
	const currentMonday = new Date(today);
	currentMonday.setDate(today.getDate() - diffToMonday);
	currentMonday.setHours(0, 0, 0, 0);

	for (let i = 0; i < count; i++) {
		const start = new Date(currentMonday);
		start.setDate(currentMonday.getDate() - i * 7);
		start.setHours(0, 0, 0, 0);
		const end = new Date(start);
		end.setDate(start.getDate() + 6);
		end.setHours(23, 59, 59, 999);

		const label = `${formatDateShort(
			start,
		)} — ${formatDateShort(end)}`;
		weeks.push({ start, end, label });
	}
	return weeks;
};

const FinancialSummaryFilterDropdownWithWeeks = ({
	onFilterChange,
	onMonthSelect,
	onWeekSelect, // optional
	currentFilter = 'allTime',
}) => {
	const { width } = useWindowDimensions();
	const compact = width < 360;

	const [visible, setVisible] = useState(false);
	const [tempMonth, setTempMonth] = useState(
		new Date().getMonth(),
	);
	const [tempYear, setTempYear] = useState(
		new Date().getFullYear(),
	);
	const [selectedWeekIndex, setSelectedWeekIndex] =
		useState(0);

	const years = useMemo(() => buildYears(12), []);
	const weeks = useMemo(() => getRecentWeeks(16), []); // show last 16 weeks

	// display label depending on filter
	const displayLabel = () => {
		if (currentFilter === 'allTime') return 'All time';
		if (currentFilter === 'today') return 'Today';
		if (currentFilter === 'thisMonth') {
			const d = new Date();
			return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
		}
		if (currentFilter === 'selectedMonth') {
			return `${MONTHS[tempMonth]} ${tempYear}`;
		}
		if (currentFilter === 'selectedWeek') {
			const w = weeks[selectedWeekIndex] || weeks[0];
			return w ? w.label : 'Selected week';
		}
		return 'Select period';
	};

	const open = () => setVisible(true);
	const close = () => setVisible(false);

	const applyPickedMonth = () => {
		const chosen = new Date(tempYear, tempMonth, 1);
		onMonthSelect && onMonthSelect(chosen);
		onFilterChange && onFilterChange('selectedMonth');
		close();
	};

	const applyPickedWeek = () => {
		const range = weeks[selectedWeekIndex];
		if (!range) return;
		// Prefer the dedicated week callback if available
		if (onWeekSelect) {
			onWeekSelect(range);
		} else {
			// fallback: call onMonthSelect with week start so existing handlers still get a Date
			onMonthSelect && onMonthSelect(range.start);
		}
		onFilterChange && onFilterChange('selectedWeek');
		close();
	};

	const quickSelect = (filter) => {
		// If selecting thisMonth, set temp values to current month/year
		if (filter === 'thisMonth') {
			const now = new Date();
			setTempMonth(now.getMonth());
			setTempYear(now.getFullYear());
		}
		// If selecting thisWeek, set selectedWeekIndex to 0 (current week)
		if (filter === 'thisWeek') {
			setSelectedWeekIndex(0);
			// immediately apply this week (common quick action)
			applyPickedWeek();
			return;
		}
		onFilterChange && onFilterChange(filter);
		if (filter !== 'selectedMonth') close();
	};

	return (
		<>
			<TouchableOpacity
				activeOpacity={0.85}
				onPress={open}
				style={[
					styles.card,
					compact ? styles.cardCompact : styles.cardRegular,
				]}
			>
				<View style={styles.left}>
					<Ionicons
						name="filter-outline"
						size={18}
						color="#065637"
					/>
					<Text style={styles.title}>Filter</Text>
				</View>

				<View style={styles.right}>
					<Text
						style={styles.selectionText}
						numberOfLines={1}
					>
						{displayLabel()}
					</Text>
					<Ionicons
						name="chevron-down-outline"
						size={18}
						color="#333"
					/>
				</View>
			</TouchableOpacity>

			<Modal
				visible={visible}
				animationType="slide"
				transparent
				onRequestClose={close}
			>
				<View style={styles.modalOverlay}>
					<Pressable
						style={styles.backdrop}
						onPress={close}
					/>

					<View
						style={[
							styles.sheet,
							compact ? { padding: 12 } : { padding: 18 },
						]}
					>
						<Text style={styles.modalTitle}>
							Choose period
						</Text>

						{/* Quick options */}
						<View style={styles.quickRow}>
							<TouchableOpacity
								style={[
									styles.pill,
									currentFilter === 'allTime' &&
										styles.pillActive,
								]}
								onPress={() => quickSelect('allTime')}
							>
								<Text
									style={[
										styles.pillText,
										currentFilter === 'allTime' &&
											styles.pillTextActive,
									]}
								>
									All time
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.pill,
									currentFilter === 'today' &&
										styles.pillActive,
								]}
								onPress={() => quickSelect('today')}
							>
								<Text
									style={[
										styles.pillText,
										currentFilter === 'today' &&
											styles.pillTextActive,
									]}
								>
									Today
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.pill,
									currentFilter === 'thisMonth' &&
										styles.pillActive,
								]}
								onPress={() => quickSelect('thisMonth')}
							>
								<Text
									style={[
										styles.pillText,
										currentFilter === 'thisMonth' &&
											styles.pillTextActive,
									]}
								>
									This month
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.pill,
									currentFilter === 'thisWeek' &&
										styles.pillActive,
								]}
								onPress={() => quickSelect('thisWeek')}
							>
								<Text
									style={[
										styles.pillText,
										currentFilter === 'thisWeek' &&
											styles.pillTextActive,
									]}
								>
									This week
								</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.divider} />

						{/* Month + Year picker */}
						<Text style={styles.sectionTitle}>
							Pick month
						</Text>
						<View style={styles.monthPickerWrap}>
							{/* Months - horizontal */}
							<FlatList
								data={MONTHS}
								keyExtractor={(m) => m}
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={{
									paddingVertical: 6,
								}}
								renderItem={({ item, index }) => {
									const active = index === tempMonth;
									return (
										<TouchableOpacity
											onPress={() => setTempMonth(index)}
											style={[
												styles.monthItem,
												active && styles.monthItemActive,
											]}
										>
											<Text
												style={[
													styles.monthText,
													active && styles.monthTextActive,
												]}
											>
												{item.substring(0, 3)}
											</Text>
										</TouchableOpacity>
									);
								}}
							/>

							{/* Years - vertical list */}
							<View style={styles.yearListWrap}>
								<FlatList
									data={years}
									keyExtractor={(y) => String(y)}
									showsVerticalScrollIndicator={false}
									style={{ maxHeight: 160 }}
									renderItem={({ item }) => {
										const active = item === tempYear;
										return (
											<TouchableOpacity
												onPress={() => setTempYear(item)}
												style={[
													styles.yearItem,
													active && styles.yearItemActive,
												]}
											>
												<Text
													style={[
														styles.yearText,
														active && styles.yearTextActive,
													]}
												>
													{item}
												</Text>
											</TouchableOpacity>
										);
									}}
								/>
							</View>
						</View>

						{/* Week picker */}
						<View style={{ marginTop: 14 }}>
							<Text style={styles.sectionTitle}>
								Pick week (Mon → Sun)
							</Text>

							<FlatList
								data={weeks}
								keyExtractor={(_, idx) => String(idx)}
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={{
									paddingVertical: 6,
								}}
								renderItem={({ item, index }) => {
									const active =
										index === selectedWeekIndex;
									return (
										<TouchableOpacity
											onPress={() =>
												setSelectedWeekIndex(index)
											}
											style={[
												styles.weekItem,
												active && styles.weekItemActive,
											]}
										>
											<Text
												style={[
													styles.weekText,
													active && styles.weekTextActive,
												]}
												numberOfLines={1}
											>
												{item.label}
											</Text>
										</TouchableOpacity>
									);
								}}
							/>
						</View>

						{/* Actions */}
						<View style={styles.actionRow}>
							<TouchableOpacity
								style={styles.btnGhost}
								onPress={() => {
									// Reset both month and week pickers to current
									const now = new Date();
									setTempMonth(now.getMonth());
									setTempYear(now.getFullYear());
									setSelectedWeekIndex(0);
								}}
							>
								<Text style={styles.btnGhostText}>
									Reset
								</Text>
							</TouchableOpacity>

							<View
								style={{ flexDirection: 'row', gap: 10 }}
							>
								<TouchableOpacity
									style={styles.btnCancel}
									onPress={close}
								>
									<Text style={styles.btnCancelText}>
										Cancel
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={styles.btnApply}
									onPress={applyPickedWeek}
								>
									<Text style={styles.btnApplyText}>
										Apply week
									</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={styles.btnApply}
									onPress={applyPickedMonth}
								>
									<Text style={styles.btnApplyText}>
										Apply month
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			</Modal>
		</>
	);
};

const styles = StyleSheet.create({
	card: {
		width: '100%',
		borderRadius: 6,
		backgroundColor: '#fff',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		// shadowColor: '#000',
		// shadowOffset: { width: 0, height: 6 },
		// shadowOpacity: 0.06,
		// shadowRadius: 16,
		elevation: 1,
	},
	cardCompact: {
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	cardRegular: {
		paddingVertical: 12,
		paddingHorizontal: 16,
	},

	left: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	title: {
		fontSize: 15,
		fontWeight: '700',
		color: '#065637',
	},

	right: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	selectionText: {
		color: '#333',
		fontSize: 14,
		fontWeight: '600',
		maxWidth: 180,
	},

	modalOverlay: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.35)',
	},
	backdrop: { flex: 1 },

	sheet: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.06,
		shadowRadius: 12,
		elevation: 8,
	},

	modalTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0b513d',
		marginBottom: 10,
	},

	quickRow: {
		flexDirection: 'row',
		gap: 10,
		marginBottom: 12,
	},

	pill: {
		backgroundColor: '#F1FBF5',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: 'transparent',
	},
	pillActive: { backgroundColor: '#065637' },
	pillText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#065637',
	},
	pillTextActive: { color: '#fff' },

	divider: {
		height: 1,
		backgroundColor: '#EFEFEF',
		marginVertical: 12,
	},

	sectionTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#333',
		marginBottom: 8,
	},

	monthPickerWrap: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 12,
	},

	monthItem: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: '#fff',
		marginRight: 8,
		borderWidth: 1,
		borderColor: '#F0F0F0',
	},
	monthItemActive: {
		backgroundColor: '#065637',
		borderColor: '#065637',
	},
	monthText: {
		fontWeight: '700',
		color: '#333',
		fontSize: 13,
	},
	monthTextActive: { color: '#fff' },

	yearListWrap: {
		width: 110,
		backgroundColor: '#FAFAFA',
		borderRadius: 10,
		paddingVertical: 6,
		paddingHorizontal: 6,
		borderWidth: 1,
		borderColor: '#F0F0F0',
	},
	yearItem: {
		paddingVertical: 8,
		paddingHorizontal: 8,
		borderRadius: 8,
		marginVertical: 2,
		alignItems: 'center',
	},
	yearItemActive: { backgroundColor: '#065637' },
	yearText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#333',
	},
	yearTextActive: { color: '#fff' },

	weekItem: {
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: '#fff',
		marginRight: 8,
		borderWidth: 1,
		borderColor: '#F0F0F0',
		minWidth: 120,
		alignItems: 'center',
		justifyContent: 'center',
	},
	weekItemActive: {
		backgroundColor: '#065637',
		borderColor: '#065637',
	},
	weekText: {
		fontWeight: '700',
		color: '#333',
		fontSize: 13,
	},
	weekTextActive: { color: '#fff' },

	actionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 14,
	},

	btnGhost: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: '#fff',
	},
	btnGhostText: { color: '#065637', fontWeight: '700' },

	btnCancel: {
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 8,
		backgroundColor: '#F7F7F7',
	},
	btnCancelText: { color: '#333', fontWeight: '700' },

	btnApply: {
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 8,
		backgroundColor: '#065637',
	},
	btnApplyText: { color: '#fff', fontWeight: '800' },
});

export default FinancialSummaryFilterDropdownWithWeeks;
