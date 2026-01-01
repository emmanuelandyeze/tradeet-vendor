// components/FinancialSummaryFilter.jsx
import React, { useState, useMemo } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Modal,
	Pressable,
	FlatList,
	Dimensions,
	Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

const formatDateShort = (d) =>
	`${d.getDate()} ${MONTHS[d.getMonth()].substring(0, 3)}`;

const buildYears = (span = 5) => {
	const current = new Date().getFullYear();
	const years = [];
	for (let i = 0; i <= span; i++) years.push(current - i);
	return years;
};

const getRecentWeeks = (count = 12) => {
	const weeks = [];
	const today = new Date();
	const day = today.getDay(); // 0 (Sun) - 6 (Sat)
	const diffToMonday = (day + 6) % 7; 
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

		const label = `${formatDateShort(start)} — ${formatDateShort(end)}`;
		weeks.push({ start, end, label });
	}
	return weeks;
};

const FinancialSummaryFilter = ({
	onFilterChange,
	onMonthSelect,
	onWeekSelect,
	currentFilter = 'allTime',
}) => {
	const [visible, setVisible] = useState(false);
	const [tempMonth, setTempMonth] = useState(new Date().getMonth());
	const [tempYear, setTempYear] = useState(new Date().getFullYear());
	const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

	const years = useMemo(() => buildYears(5), []);
	const weeks = useMemo(() => getRecentWeeks(12), []);

	const displayLabel = () => {
		if (currentFilter === 'allTime') return 'All Time';
		if (currentFilter === 'today') return 'Today';
		if (currentFilter === 'thisMonth') return 'This Month';
		if (currentFilter === 'thisWeek') return 'This Week';
		if (currentFilter === 'selectedMonth') return `${MONTHS[tempMonth]?.substring(0, 3)} ${tempYear}`;
		if (currentFilter === 'selectedWeek') {
			return weeks[selectedWeekIndex]?.label || 'Selected Week';
		}
		return 'Filter';
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
		if (onWeekSelect) onWeekSelect(range);
		else onMonthSelect && onMonthSelect(range.start);

		onFilterChange && onFilterChange('selectedWeek');
		close();
	};

	const quickSelect = (filter) => {
		if (filter === 'thisMonth') {
			const now = new Date();
			setTempMonth(now.getMonth());
			setTempYear(now.getFullYear());
		}
		if (filter === 'thisWeek') {
			setSelectedWeekIndex(0);
			applyPickedWeek();
			return;
		}
		onFilterChange && onFilterChange(filter);
		if (filter !== 'selectedMonth') close();
	};

	return (
		<>
			{/* Sleek Pill Trigger */}
			<TouchableOpacity
				onPress={open}
				style={styles.triggerPill}
				activeOpacity={0.7}
			>
				<Feather name="calendar" size={14} color="#6B7280" />
				<Text style={styles.triggerText}>{displayLabel()}</Text>
				<Feather name="chevron-down" size={14} color="#6B7280" />
			</TouchableOpacity>

			<Modal
				visible={visible}
				animationType="fade"
				transparent
				onRequestClose={close}
			>
				<View style={styles.modalOverlay}>
					<Pressable style={styles.backdrop} onPress={close} />

					<View style={styles.sheet}>
						<View style={styles.sheetHeader}>
							<Text style={styles.sheetTitle}>Filter Period</Text>
							<TouchableOpacity onPress={close} style={styles.closeBtn}>
								<Feather name="x" size={20} color="#374151" />
							</TouchableOpacity>
						</View>

						{/* Quick Select Grid */}
						<View style={styles.quickGrid}>
							{['allTime', 'today', 'thisWeek', 'thisMonth'].map((opt) => (
								<TouchableOpacity
									key={opt}
									style={[
										styles.quickOption,
										currentFilter === opt && styles.quickOptionActive
									]}
									onPress={() => quickSelect(opt)}
								>
									<Text style={[
										styles.quickOptionText,
										currentFilter === opt && styles.quickOptionTextActive
									]}>
										{opt.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						<View style={styles.divider} />

						{/* Custom Range Section */}
						<Text style={styles.sectionLabel}>Custom Range</Text>

						{/* Tabs for Month vs Week */}
						{/* Simplified: Just showing both lists cleanly */}

						<View style={styles.customSection}>
							<Text style={styles.subLabel}>Month</Text>
							<View style={styles.pickerRow}>
								<FlatList
									data={MONTHS}
									horizontal
									showsHorizontalScrollIndicator={false}
									keyExtractor={(item) => item}
									renderItem={({ item, index }) => (
										<TouchableOpacity
											style={[
												styles.scrollPill,
												tempMonth === index && styles.scrollPillActive
											]}
											onPress={() => setTempMonth(index)}
										>
											<Text style={[styles.scrollPillText, tempMonth === index && styles.textWhite]}>
												{item.substring(0, 3)}
											</Text>
										</TouchableOpacity>
									)}
								/>
							</View>
							<View style={[styles.pickerRow, { marginTop: 8 }]}>
								<FlatList
									data={years}
									horizontal
									showsHorizontalScrollIndicator={false}
									keyExtractor={(item) => String(item)}
									renderItem={({ item }) => (
										<TouchableOpacity
											style={[
												styles.scrollPill,
												tempYear === item && styles.scrollPillActive
											]}
											onPress={() => setTempYear(item)}
										>
											<Text style={[styles.scrollPillText, tempYear === item && styles.textWhite]}>
												{item}
											</Text>
										</TouchableOpacity>
									)}
								/>
							</View>
							<TouchableOpacity style={styles.applySmallBtn} onPress={applyPickedMonth}>
								<Text style={styles.applySmallText}>Apply Month</Text>
							</TouchableOpacity>
						</View>

						<View style={styles.customSection}>
							<Text style={styles.subLabel}>Week</Text>
							<FlatList
								data={weeks}
								horizontal
								showsHorizontalScrollIndicator={false}
								keyExtractor={(_, i) => String(i)}
								renderItem={({ item, index }) => (
									<TouchableOpacity
										style={[
											styles.weekPill,
											selectedWeekIndex === index && styles.scrollPillActive
										]}
										onPress={() => setSelectedWeekIndex(index)}
									>
										<Text style={[styles.weekPillText, selectedWeekIndex === index && styles.textWhite]}>
											{item.label}
										</Text>
									</TouchableOpacity>
								)}
							/>
							<TouchableOpacity style={styles.applySmallBtn} onPress={applyPickedWeek}>
								<Text style={styles.applySmallText}>Apply Week</Text>
							</TouchableOpacity>
						</View>

					</View>
				</View>
			</Modal>
		</>
	);
};

export default FinancialSummaryFilter;

const styles = StyleSheet.create({
	// Trigger
	triggerPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#F3F4F6',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	triggerText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#4B5563',
	},

	// Modal
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	backdrop: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	sheet: {
		backgroundColor: '#fff',
		width: '100%',
		maxWidth: 400,
		borderRadius: 16,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
		elevation: 5,
	},
	sheetHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
	},
	sheetTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
	},
	closeBtn: {
		padding: 4,
		backgroundColor: '#F3F4F6',
		borderRadius: 20,
	},

	// Quick Select
	quickGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 16,
	},
	quickOption: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: '#F9FAFB',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#F3F4F6',
	},
	quickOptionActive: {
		backgroundColor: '#ECFDF5',
		borderColor: '#065637',
	},
	quickOptionText: {
		fontSize: 13,
		fontWeight: '500',
		color: '#374151',
	},
	quickOptionTextActive: {
		color: '#065637',
		fontWeight: '700',
	},

	divider: {
		height: 1,
		backgroundColor: '#E5E7EB',
		marginVertical: 12,
	},

	sectionLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 12,
	},
	customSection: {
		marginBottom: 16,
	},
	subLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#6B7280',
		marginBottom: 8,
	},
	pickerRow: {
		flexDirection: 'row',
	},
	scrollPill: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: '#F3F4F6',
		borderRadius: 8,
		marginRight: 8,
	},
	scrollPillActive: {
		backgroundColor: '#065637',
	},
	scrollPillText: {
		fontSize: 13,
		color: '#374151',
		fontWeight: '500',
	},
	textWhite: {
		color: '#fff',
	},

	weekPill: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: '#F3F4F6',
		borderRadius: 8,
		marginRight: 8,
		minWidth: 120,
		alignItems: 'center',
	},
	weekPillText: {
		fontSize: 12,
		color: '#374151',
		fontWeight: '500',
	},

	applySmallBtn: {
		marginTop: 8,
		alignSelf: 'flex-start',
		paddingHorizontal: 12,
		paddingVertical: 4,
	},
	applySmallText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#065637',
	},
});
