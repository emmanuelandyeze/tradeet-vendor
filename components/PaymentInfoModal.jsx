import React, { useState, useEffect } from 'react';
import {
	Modal,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
} from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';

const PaymentInfoModal = ({ visible, onClose, onSave }) => {
	const [banks, setBanks] = useState([]);
	const [selectedBank, setSelectedBank] = useState('');
	const [accountNumber, setAccountNumber] = useState('');
	const [accountName, setAccountName] = useState('');
	const [loading, setLoading] = useState(false);

	// Fetch list of banks from Paystack
	const getBankNames = async () => {
		try {
			const response = await axios.get(
				'https://api.paystack.co/bank',
				{
					headers: {
						Authorization: `Bearer sk_live_4278f83a52a6159480e39eadc370d7d3f6080250`, // Replace with your secret key
					},
				},
			);
			const banks = response.data.data;
			setBanks(banks);
		} catch (error) {
			console.error('Error fetching bank list:', error); 
		}
    };
    
    // console.log(banks)
    // console.log(selectedBank);

	// Handle account verification
	const verifyAccount = async () => {
		if (!selectedBank || !accountNumber) {
			Alert.alert(
				'Error',
				'Please select a bank and enter an account number',
			);
			return;
		}

        setLoading(true);
        

		try {
			const response = await axios.get(
				`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${selectedBank.code}`,
				{
					headers: {
						Authorization: `Bearer sk_live_4278f83a52a6159480e39eadc370d7d3f6080250`,
					}
				},
            );
            
            const data = response.data.data;
            // console.log(data);
			if (response.data.status === true) {
				setAccountName(data.account_name);
			} else {
				Alert.alert('Error', 'Account verification failed. Please try again');
			}
		} catch (error) {
			console.error('Error verifying account:', error);
			Alert.alert('Error', 'Account verification failed');
		} finally {
			setLoading(false);
		}
	};

	// Save payment info
	const handleSave = () => {
		if (!accountName) {
			Alert.alert('Error', 'Account not verified');
			return;
		}
		onSave({ selectedBank, accountNumber, accountName });
		onClose(); // Close the modal after saving
	};

	// Fetch banks when modal is visible
	useEffect(() => {
		if (visible) {
			getBankNames();
		}
	}, [visible]);

	return (
		<Modal
			transparent={true}
			visible={visible}
			onRequestClose={onClose}
		>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContent}>
					<Text style={styles.title}>
						Add Payment Information
					</Text>

					<Picker
						selectedValue={selectedBank}
						onValueChange={(itemValue) =>
							setSelectedBank(itemValue)
						}
						style={styles.input}
					>
						<Picker.Item label="Select Bank" value="" />
						{banks?.map((bank) => (
							<Picker.Item
								key={bank.id}
								label={bank.name}
								value={bank}
							/>
						))}
					</Picker>

					<TextInput
						style={styles.input}
						placeholder="Account Number"
						keyboardType="numeric"
						value={accountNumber}
						onChangeText={setAccountNumber}
					/>

					<TextInput
						style={styles.input}
						placeholder="Account Name"
						value={accountName}
						editable={false}
					/>

					<TouchableOpacity
						style={styles.verifyButton}
						onPress={verifyAccount}
						disabled={loading}
					>
						<Text style={styles.buttonText}>
							{loading ? 'Verifying...' : 'Verify Account'}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.saveButton}
						onPress={handleSave}
					>
						<Text style={styles.buttonText}>Save</Text>
					</TouchableOpacity>

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
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: 'white',
		padding: 20,
		borderRadius: 10,
		width: '80%',
		alignItems: 'center',
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 20,
	},
	input: {
		width: '100%',
		padding: 10,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 5,
	},
	verifyButton: {
		backgroundColor: '#4CAF50',
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 5,
		marginBottom: 10,
	},
	saveButton: {
		backgroundColor: '#4CAF50',
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 5,
		marginBottom: 10,
	},
	closeButton: {
		marginTop: 10,
	},
	buttonText: {
		color: 'white',
		fontSize: 16,
	},
	closeButtonText: {
		color: '#888',
		fontSize: 16,
	},
});

export default PaymentInfoModal;
