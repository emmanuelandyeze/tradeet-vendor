import React, { useState, useEffect, useContext } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
    Modal,
    Alert
} from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import axiosInstance from '@/utils/axiosInstance';
import { router } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';

const TransferScreen = () => {
    const { userInfo, checkLoginStatus } =
			useContext(AuthContext);
	const [banks, setBanks] = useState([]);
	const [selectedBank, setSelectedBank] = useState('');
	const [accountNumber, setAccountNumber] = useState('');
	const [accountName, setAccountName] = useState('');
	const [amount, setAmount] = useState('');
	const [loading, setLoading] = useState(false);
	const [showDrawer, setShowDrawer] = useState(false);
	const [transferSuccess, setTransferSuccess] =
		useState(false);
	const navigation = useNavigation();

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
			setBanks(response.data.data);
		} catch (error) {
			console.error('Error fetching bank list:', error);
		}
	};

	// Automatically verify account when 10 digits are entered
	useEffect(() => {
		if (accountNumber.length === 10 && selectedBank) {
			verifyAccount();
		}
	}, [accountNumber, selectedBank]);

	// Handle account verification
	const verifyAccount = async () => {
		setLoading(true);
		try {
			const response = await axios.get(
				`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${selectedBank.code}`,
				{
					headers: {
						Authorization: `Bearer sk_live_4278f83a52a6159480e39eadc370d7d3f6080250`,
					},
				},
			);
			const data = response.data.data;
			if (response.data.status === true) {
				setAccountName(data.account_name);
			} else {
				Alert.alert(
					'Error',
					'Account verification failed. Please try again',
				);
			}
		} catch (error) {
			console.error('Error verifying account:', error);
			Alert.alert('Error', 'Account verification failed');
		} finally {
			setLoading(false);
		}
	};

	// Handle transfer
	const handleTransfer = async () => {
		if (!amount) {
			Alert.alert('Error', 'Please enter an amount');
			return;
		}

		setLoading(true);
        try {
            const transferFee = amount <= 5000 ? 10 : 25;
            const transferAmount = Number(amount);
			// Simulate API call to process transfer
			const response = await axiosInstance.post(
				'/orders/process-transfer', // Replace with your server endpoint
				{
					bankCode: selectedBank.code,
					accountNumber,
					amount: transferAmount,
                    accountName,
                    storeId: userInfo?._id
				}
            );
            
            console.log(response.data)

			if (response.data.success) {
				setTransferSuccess(true);
				setTimeout(() => {
					setTransferSuccess(false);
					router.back(); // Navigate back after successful transfer
				}, 3000);
			} else {
				Alert.alert(
					'Error',
					'Transfer failed. Please try again',
				);
			}
		} catch (error) {
			console.error('Error processing transfer:', error);
			Alert.alert('Error', 'Transfer failed');
		} finally {
			setLoading(false);
		}
	};

	// Fetch banks on component mount
	useEffect(() => {
		getBankNames();
	}, []);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Make a Transfer</Text>

			{/* Bank Picker */}
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

			{/* Account Number Input */}
			<TextInput
				style={[styles.input, { marginBottom: 5 }]}
				placeholder="Account Number"
				keyboardType="numeric"
				value={accountNumber}
				onChangeText={(text) => setAccountNumber(text)}
				maxLength={10}
			/>

			{/* Account Name Display */}
			{accountName && (
				<View style={styles.accountNameContainer}>
					<Text style={styles.accountNameText}>
						{accountName}
					</Text>
				</View>
			)}

			{/* Continue Button */}
			{accountName && (
				<TouchableOpacity
					style={styles.continueButton}
					onPress={() => setShowDrawer(true)}
				>
					<Text style={styles.buttonText}>Continue</Text>
				</TouchableOpacity>
			)}

			{/* Bottom Drawer for Amount Input */}
			<Modal
				visible={showDrawer}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowDrawer(false)}
			>
				<View style={styles.drawerOverlay}>
					<View style={styles.drawerContent}>
						<Text style={styles.drawerTitle}>
							Enter Amount
						</Text>
						<TextInput
							style={styles.amountInput}
							placeholder="Amount"
							keyboardType="numeric"
							value={amount}
							onChangeText={setAmount}
						/>
						{amount > 0 && (
							<Text style={{marginBottom: 10, fontSize: 16, fontWeight: 'bold'}}>
								You will be charged
								{amount <= 5000 ? ' ₦10' : ' ₦25'} for this
								transfer.
							</Text>
						)}
						<TouchableOpacity
							style={styles.transferButton}
							onPress={handleTransfer}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="white" />
							) : (
								<Text style={styles.buttonText}>
									Transfer
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Success Notification */}
			{transferSuccess && (
				<View style={styles.notification}>
					<Text style={styles.notificationText}>
						Transfer Successful!
					</Text>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
        paddingHorizontal: 20,
        paddingTop: 45,
		backgroundColor: '#f5f5f5',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
		color: '#333',
	},
	input: {
		width: '100%',
		padding: 15,
		marginBottom: 15,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 10,
		backgroundColor: '#fff',
	},
	accountNameContainer: {
		marginBottom: 15,
	},
	accountNameText: {
		fontSize: 18,
        color: 'green',
        fontWeight: 'bold'
	},
	continueButton: {
		backgroundColor: '#4CAF50',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
	},
	drawerOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	drawerContent: {
		backgroundColor: 'white',
		padding: 20,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	drawerTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
	},
	amountInput: {
		width: '100%',
		padding: 15,
		marginBottom: 5,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 10,
		backgroundColor: '#fff',
	},
	transferButton: {
		backgroundColor: '#2196F3',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
	},
	buttonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: 'bold',
	},
	notification: {
		position: 'absolute',
		bottom: 20,
		left: 20,
		right: 20,
		backgroundColor: '#4CAF50',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
	},
	notificationText: {
		color: 'white',
		fontSize: 16,
		fontWeight: 'bold',
	},
});

export default TransferScreen;
