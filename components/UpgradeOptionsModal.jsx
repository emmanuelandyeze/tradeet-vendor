import React from 'react';
import {
	View,
	Text,
	Modal,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';
import PricingTable from './PricingTable'


const UpgradeOptionsModal = ({ visible, onClose, getBusinessInfo, setModalVisible }) => {

	return (
		<Modal
			transparent={true}
			animationType="slide"
			visible={visible}
			onRequestClose={onClose}
		>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContent}>
					<PricingTable getBusinessInfo={ getBusinessInfo} setPayModalVisible={setModalVisible} />

					<TouchableOpacity
						onPress={onClose}
						style={styles.closeButton}
					>
						<Text style={styles.closeButtonText}>
							Close
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modalOverlay: {
		// flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalContent: {
		backgroundColor: 'white',
		paddingBottom: 0,
		borderRadius: 10,
		width: '90%',
		alignItems: 'center',
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 20,
	},
	planContainer: {
		marginBottom: 20,
		padding: 15,
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		width: '100%',
		alignItems: 'center',
	},
	planName: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 5,
	},
	planPrice: {
		fontSize: 16,
		color: '#888',
		marginBottom: 10,
	},
	planDescription: {
		fontSize: 14,
		color: '#555',
		marginBottom: 15,
		textAlign: 'center',
	},
	payButton: {
		backgroundColor: '#4CAF50',
		paddingVertical: 8,
		paddingHorizontal: 20,
		borderRadius: 5,
	},
	buttonText: {
		color: 'white',
		fontSize: 16,
	},
	closeButton: {
		marginTop: 20,
		position: 'absolute',
		top: 5,
		right:20
	},
	closeButtonText: {
		color: 'red',
		fontSize: 18,
		fontWeight: 'bold'
	},
});

export default UpgradeOptionsModal;
