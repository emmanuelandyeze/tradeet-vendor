import React, { useState, useEffect } from 'react'; // Added useEffect
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const FinancialSummaryFilter = ({
	onFilterChange,
	onMonthSelect,
	currentFilter,
}) => {
	const [showMonthPicker, setShowMonthPicker] =
		useState(false);
	const [selectedDate, setSelectedDate] = useState(
		new Date(),
	);

	// Use useEffect to log changes to selectedDate and currentFilter for debugging
	useEffect(() => {
		// console.log('FinancialSummaryFilter: selectedDate changed to', selectedDate.toISOString());
		// console.log('FinancialSummaryFilter: currentFilter changed to', currentFilter);
	}, [selectedDate, currentFilter]);

	const handleDateChange = (event, pickedDate) => {
		// On Android, 'set' event type indicates a successful selection.
		// On iOS, 'set' is also typically for selection, but the picker remains open by default.
		// 'dismissed' means the user cancelled the picker.
		if (event.type === 'set') {
			const newDate = pickedDate || selectedDate; // Use pickedDate if available, otherwise current state
			setSelectedDate(newDate); // Update internal state
			onMonthSelect(newDate); // Pass the new date up to the parent
			setShowMonthPicker(false); // Hide the picker after selection (especially important for Android)
		} else if (
			event.type === 'dismissed' ||
			Platform.OS === 'android'
		) {
			// For Android, if it's not 'set', consider it dismissed or done.
			// For iOS, only dismiss if explicitly dismissed.
			setShowMonthPicker(false);
		}
	};

	const displaySelectedMonth = () => {
		// If the currentFilter is 'selectedMonth', display that month.
		// Otherwise, display a generic "Select Month" or the current month.
		if (currentFilter === 'selectedMonth') {
			return selectedDate.toLocaleString('default', {
				month: 'long',
				year: 'numeric',
			});
		}
		return 'Select Month'; // Or, for example, new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
	};

	return (
		<View style={styles.container}>
			<View style={styles.filterButtonsContainer}>
				<TouchableOpacity
					style={[
						styles.filterButton,
						currentFilter === 'allTime' &&
							styles.activeFilterButton,
					]}
					onPress={() => {
						onFilterChange('allTime');
						setSelectedDate(new Date()); // Reset selectedDate for consistency
					}}
				>
					<Text
						style={[
							styles.filterButtonText,
							currentFilter === 'allTime' &&
								styles.activeFilterButtonText,
						]}
					>
						All Time
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.filterButton,
						currentFilter === 'today' &&
							styles.activeFilterButton,
					]}
					onPress={() => {
						onFilterChange('today');
						setSelectedDate(new Date()); // Reset selectedDate for consistency
					}}
				>
					<Text
						style={[
							styles.filterButtonText,
							currentFilter === 'today' &&
								styles.activeFilterButtonText,
						]}
					>
						Today
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[
						styles.filterButton,
						currentFilter === 'thisMonth' &&
							styles.activeFilterButton,
					]}
					onPress={() => {
						onFilterChange('thisMonth');
						setSelectedDate(new Date()); // Reset selectedDate for consistency
					}}
				>
					<Text
						style={[
							styles.filterButtonText,
							currentFilter === 'thisMonth' &&
								styles.activeFilterButtonText,
						]}
					>
						This Month
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.filterButton,
						currentFilter === 'selectedMonth' &&
							styles.activeFilterButton,
					]}
					onPress={() => {
						setShowMonthPicker(true);
						// No need to call onFilterChange here, as onMonthSelect will handle setting 'selectedMonth'
					}}
				>
					<Text
						style={[
							styles.filterButtonText,
							currentFilter === 'selectedMonth' &&
								styles.activeFilterButtonText,
						]}
					>
						{displaySelectedMonth()}
					</Text>
					<Ionicons
						name="calendar-outline"
						size={18}
						color={
							currentFilter === 'selectedMonth'
								? '#fff'
								: '#333'
						}
					/>
				</TouchableOpacity>
			</View>

			{showMonthPicker && (
				<DateTimePicker
					value={selectedDate}
					mode="date" // We only care about month and year, but 'date' mode is standard.
					display={
						Platform.OS === 'ios' ? 'inline' : 'default'
					} // 'inline' for iOS gives a clearer monthly view
					onChange={handleDateChange}
					maximumDate={new Date()} // Prevent selecting future months
				/>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 15,
	},
	filterButtonsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 0,
	},
	filterButton: {
		paddingVertical: 4,
		paddingHorizontal: 15,
		borderRadius: 20,
		backgroundColor: '#f0f0f0',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	activeFilterButton: {
		backgroundColor: '#065637',
	},
	filterButtonText: {
		color: '#333',
		fontSize: 13,
		fontWeight: '500',
	},
	activeFilterButtonText: {
		color: '#fff',
	},
});

export default FinancialSummaryFilter;
