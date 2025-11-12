import React, { useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Modal,
	Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Assuming you use Expo icons

const { width } = Dimensions.get('window');

const OrderFilterDropdown = ({
	currentFilter,
	onSelectFilter,
	ongoingCount,
	completedCount,
}) => {
	const [modalVisible, setModalVisible] = useState(false);

	const handleFilterSelection = (filterOption) => {
		onSelectFilter(filterOption);
		setModalVisible(false); // Close modal after selection
	};

	const getFilterDisplayName = (filterValue) => {
		switch (filterValue) {
			case 'in progress':
				return `In Progress (${ongoingCount})`;
			case 'completed':
				return `Completed (${completedCount})`;
			case 'all':
				return `All Orders (${
					ongoingCount + completedCount
				})`; // Or total orders
			default:
				return 'Filter Orders';
		}
	};

	return (
		<View style={styles.container}>
			<TouchableOpacity
				onPress={() => setModalVisible(true)}
				style={styles.filterTrigger}
			>
				<Text style={styles.filterTriggerText}>
					{getFilterDisplayName(currentFilter)}
				</Text>
				<Ionicons
					name="filter-outline"
					size={20}
					color="#3C4043"
				/>
			</TouchableOpacity>

			<Modal
				animationType="fade" // Or "slide"
				transparent={true}
				visible={modalVisible}
				onRequestClose={() => setModalVisible(false)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPressOut={() => setModalVisible(false)} // Close modal when touching outside
				>
					<View style={styles.dropdownContainer}>
						<TouchableOpacity
							style={[
								styles.dropdownItem,
								currentFilter === 'in progress' &&
									styles.activeDropdownItem,
							]}
							onPress={() =>
								handleFilterSelection('in progress')
							}
						>
							<Text
								style={[
									styles.dropdownItemText,
									currentFilter === 'in progress' &&
										styles.activeDropdownItemText,
								]}
							>
								In Progress ({ongoingCount})
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.dropdownItem,
								currentFilter === 'completed' &&
									styles.activeDropdownItem,
							]}
							onPress={() =>
								handleFilterSelection('completed')
							}
						>
							<Text
								style={[
									styles.dropdownItemText,
									currentFilter === 'completed' &&
										styles.activeDropdownItemText,
								]}
							>
								Completed ({completedCount})
							</Text>
						</TouchableOpacity>
						
					</View>
				</TouchableOpacity>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {},
	filterTrigger: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
		paddingHorizontal: 0,
		borderRadius: 5,
		backgroundColor: '#fff',
		borderColor: '#ddd',
		// borderWidth: 1,
		gap: 8,
		// Optional shadow for a button-like look
		// shadowColor: '#000',
		// shadowOffset: { width: 0, height: 1 },
		// shadowOpacity: 0.1,
		// shadowRadius: 1,
		// elevation: 1,
	},
	filterTriggerText: {
		fontSize: 14,
		color: '#3C4043',
		fontWeight: '500',
	},
	modalOverlay: {
		flex: 1,
		justifyContent: 'center', // Center the dropdown vertically
		alignItems: 'center', // Center the dropdown horizontally
		backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim background
	},
	dropdownContainer: {
		backgroundColor: '#fff',
		borderRadius: 8,
		padding: 10,
		minWidth: width * 0.5, // Make dropdown at least 50% of screen width
		maxWidth: width * 0.8, // Max width 80% of screen width
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
	dropdownItem: {
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderRadius: 5,
		marginBottom: 5,
	},
	activeDropdownItem: {
		backgroundColor: '#065637',
	},
	dropdownItemText: {
		fontSize: 15,
		color: '#333',
	},
	activeDropdownItemText: {
		color: '#fff',
		fontWeight: 'bold',
	},
});

export default OrderFilterDropdown;
