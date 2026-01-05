import React, {
	useState,
	useEffect,
	useContext,
	useCallback,
	useRef, // Import useRef for view shot
} from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Modal,
	Alert,
	FlatList,
	TouchableWithoutFeedback,
	Keyboard,
	Share,
	Image, // Import Share for sharing text
} from 'react-native';
import axios from 'axios';
import {
	useFocusEffect,
} from '@react-navigation/native';
import axiosInstance from '@/utils/axiosInstance';
import { router } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot'; // Import captureRef
import * as Sharing from 'expo-sharing'; // Import expo-sharing

const TransferScreen = () => {
	const { userInfo } = useContext(AuthContext);
	const [banks, setBanks] = useState([]);
	const [selectedBank, setSelectedBank] = useState(null);
	const [accountNumber, setAccountNumber] = useState('');
	const [accountName, setAccountName] = useState('');
	const [amount, setAmount] = useState('');
	const [loading, setLoading] = useState(false);
	const [
		isTransferModalVisible,
		setIsTransferModalVisible,
	] = useState(false);
	const [transferSuccess, setTransferSuccess] =
		useState(false);
	const [walletBalance, setWalletBalance] = useState(0);
	const [recentTransactions, setRecentTransactions] =
		useState([]);
	const [filterModalVisible, setFilterModalVisible] =
		useState(false);
	const [selectedFilterType, setSelectedFilterType] =
		useState('all');

	// New states for searchable bank input
	const [bankSearchTerm, setBankSearchTerm] = useState('');
	const [filteredBanks, setFilteredBanks] = useState([]);
	const [showBankSuggestions, setShowBankSuggestions] =
		useState(false);

	// States for Receipt Modal
	const [isReceiptModalVisible, setIsReceiptModalVisible] =
		useState(false);
	const [
		selectedTransactionForReceipt,
		setSelectedTransactionForReceipt,
	] = useState(null);
	const receiptViewRef = useRef(); // Ref for the receipt view to capture screenshot

	// const navigation = useNavigation(); // Removed/Unused

	const fetchWalletAndTransactions = async () => {
		setLoading(true);
		try {
			const response = await axiosInstance.get(
				`/businesses/wallet/${userInfo?._id}`,
			);
			setWalletBalance(response.data.walletBalance);
			const sortedTransactions =
				response.data.transactions.sort(
					(a, b) => new Date(b.date) - new Date(a.date),
				);
			setRecentTransactions(sortedTransactions);
		} catch (err) {
			console.error(
				'Error fetching wallet balance or transactions:',
				err.message || err,
			);
			Alert.alert('Error', 'Could not fetch wallet data.');
		} finally {
			setLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			fetchWalletAndTransactions();
			getBankNames();
		}, [userInfo]),
	);

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
			Alert.alert(
				'Error',
				'Could not fetch bank list. Please try again.',
			);
		}
	};

	// Effect for filtering banks based on search term
	useEffect(() => {
		if (bankSearchTerm.length > 0) {
			const lowerCaseSearchTerm =
				bankSearchTerm.toLowerCase();
			const results = banks.filter((bank) =>
				bank.name
					.toLowerCase()
					.includes(lowerCaseSearchTerm),
			);
			setFilteredBanks(results);
			setShowBankSuggestions(true);
		} else {
			setFilteredBanks([]);
			setShowBankSuggestions(false);
		}
	}, [bankSearchTerm, banks]);

	// Effect for account verification
	useEffect(() => {
		// Only verify if bank is selected AND account number is 10 digits
		if (accountNumber.length === 10 && selectedBank) {
			verifyAccount();
		} else {
			setAccountName(''); // Clear account name if conditions not met
		}
	}, [accountNumber, selectedBank]); // Depend on both

	const verifyAccount = async () => {
		setLoading(true);
		setAccountName(''); // Clear previous account name
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
					'Verification Failed',
					'Account verification failed. Please check the account number and bank.',
				);
			}
		} catch (error) {
			console.error('Error verifying account:', error);
			Alert.alert(
				'Error',
				error.response?.data?.message ||
				'Account verification failed. Please try again.',
			);
			setAccountName(''); // Clear account name on error
		} finally {
			setLoading(false);
		}
	};

	const handleTransfer = async () => {
		if (!amount || Number(amount) <= 0) {
			Alert.alert(
				'Error',
				'Please enter a valid amount to transfer.',
			);
			return;
		}

		if (Number(amount) > walletBalance) {
			Alert.alert(
				'Insufficient Balance',
				'You do not have enough funds for this transfer.',
			);
			return;
		}

		// Confirm transfer with user
		Alert.alert(
			'Confirm Transfer',
			`You are about to transfer ₦${Number(
				amount,
			).toLocaleString()} to ${accountName} (${selectedBank.name
			}). A fee of ₦${Number(amount) <= 5000 ? '10' : '25'
			} will apply. Do you want to proceed?`,
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Proceed',
					onPress: async () => {
						setLoading(true);
						try {
							const transferFee =
								Number(amount) <= 5000 ? 10 : 25;
							const totalDeduction =
								Number(amount) + transferFee;

							const response = await axiosInstance.post(
								'/orders/process-transfer',
								{
									bankCode: selectedBank.code,
									accountNumber,
									amount: Number(amount),
									accountName,
									storeId: userInfo?._id,
									fee: transferFee,
								},
							);

							if (response.data.success) {
								setTransferSuccess(true);
								setWalletBalance(
									response.data.newWalletBalance,
								);
								const newTransaction = {
									_id:
										response.data.transferDetails?._id ||
										new Date().getTime().toString(), // Fallback ID, ensure string
									description: `Transfer to ${accountName} (${selectedBank.name})`, // More descriptive
									amount: Number(amount),
									type: 'debit',
									date: new Date().toISOString(),
									bankName: selectedBank.name, // Add bank name for receipt
									accountNumber: accountNumber, // Add account number for receipt
									fee: transferFee, // Add fee for receipt
									reference:
										response.data.transferDetails
											?.reference || 'N/A', // Add reference
								};
								setRecentTransactions((prev) =>
									[newTransaction, ...prev].sort(
										(a, b) =>
											new Date(b.date) - new Date(a.date),
									),
								);

								// Reset form fields
								setAccountNumber('');
								setAccountName('');
								setAmount('');
								setSelectedBank(null);
								setBankSearchTerm('');
								setShowBankSuggestions(false);

								setTimeout(() => {
									setTransferSuccess(false);
									setIsTransferModalVisible(false);
								}, 2000);
							} else {
								Alert.alert(
									'Transfer Failed',
									response.data.message ||
									'Transfer failed. Please try again.',
								);
							}
						} catch (error) {
							console.error(
								'Error processing transfer:',
								error,
							);
							Alert.alert(
								'Error',
								error.response?.data?.message ||
								'Transfer failed. Please try again.',
							);
						} finally {
							setLoading(false);
						}
					},
				},
			],
		);
	};

	const handleBankSelect = (bank) => {
		setSelectedBank(bank);
		setBankSearchTerm(bank.name); // Set text input to selected bank name
		setFilteredBanks([]); // Clear filtered banks once selected
		setShowBankSuggestions(false); // Hide suggestions
		Keyboard.dismiss(); // Dismiss keyboard
	};

	const handleTransactionPress = (transaction) => {
		setSelectedTransactionForReceipt(transaction);
		setIsReceiptModalVisible(true);
	};

	const shareReceipt = async () => {
		try {
			const uri = await captureRef(receiptViewRef, {
				format: 'png',
				quality: 1,
			});

			if (!(await Sharing.isAvailableAsync())) {
				Alert.alert(
					'Sharing not available',
					'Sharing is not available on this device.',
				);
				return;
			}

			await Sharing.shareAsync(uri, {
				mimeType: 'image/png',
				dialogTitle: 'Share your receipt',
				UTI: 'public.png',
			});
		} catch (error) {
			console.error('Error sharing receipt:', error);
			Alert.alert('Error', 'Failed to share receipt.');
		}
	};

	const renderTransactionItem = ({ item: transaction }) => (
		<TouchableOpacity
			style={styles.transactionItem}
			onPress={() => handleTransactionPress(transaction)}
		>
			<View style={styles.transactionIcon}>
				<Ionicons
					name={
						transaction.type === 'debit'
							? 'arrow-up-circle-outline'
							: 'arrow-down-circle-outline'
					}
					size={24}
					color={
						transaction.type === 'debit'
							? '#D32F2F'
							: '#4CAF50'
					}
				/>
			</View>
			<View style={styles.transactionDetails}>
				<Text style={styles.transactionRecipient}>
					{transaction.description}
				</Text>
				<Text style={styles.transactionDate}>
					{new Date(transaction.date).toLocaleDateString(
						'en-NG',
						{
							year: 'numeric',
							month: 'short',
							day: 'numeric',
						},
					)}
				</Text>
			</View>
			<Text
				style={[
					styles.transactionAmount,
					{
						color:
							transaction.type === 'debit'
								? '#D32F2F'
								: '#4CAF50',
					},
				]}
			>
				{transaction.type === 'debit' ? '- ' : '+ '}₦
				{transaction.amount.toLocaleString()}
			</Text>
		</TouchableOpacity>
	);

	const filteredTransactions = recentTransactions.filter(
		(transaction) => {
			if (selectedFilterType === 'all') {
				return true;
			}
			return transaction.type === selectedFilterType;
		},
	);

	return (
		<TouchableWithoutFeedback
			onPress={Keyboard.dismiss}
			accessible={false}
		>
			<View style={styles.container}>
				{/* Header Section */}
				<View style={styles.header}>
					<TouchableOpacity
						onPress={() => router.back()}
						style={styles.backButton}
					>
						<Ionicons
							name="arrow-back"
							size={24}
							color="#333"
						/>
					</TouchableOpacity>
					<Text style={styles.headerTitle}>My Wallet</Text>
					<TouchableOpacity
						onPress={() => setFilterModalVisible(true)}
						style={styles.filterButton}
					>
						<Ionicons
							name="filter"
							size={24}
							color="#333"
						/>
					</TouchableOpacity>
				</View>

				{/* Wallet Balance Card */}
				<View style={styles.balanceCard}>
					<Text style={styles.balanceLabel}>
						Current Balance
					</Text>
					<Text style={styles.balanceAmount}>
						₦{walletBalance.toLocaleString()}
					</Text>
					<TouchableOpacity
						style={styles.transferInitiateButton}
						onPress={() => {
							setIsTransferModalVisible(true);
							// Reset modal states when opening
							setAccountNumber('');
							setAccountName('');
							setAmount('');
							setSelectedBank(null);
							setBankSearchTerm('');
							setShowBankSuggestions(false);
						}}
					>
						<Ionicons
							name="send"
							size={20}
							color="#fff"
							style={{ marginRight: 8 }}
						/>
						<Text style={styles.transferInitiateButtonText}>
							Make a Transfer
						</Text>
					</TouchableOpacity>
				</View>

				{/* Recent Transactions Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						Recent Transactions
					</Text>
					{loading ? (
						<ActivityIndicator
							size="large"
							color="#2196F3"
							style={styles.loadingIndicator}
						/>
					) : filteredTransactions.length === 0 ? (
						<Text style={styles.noTransactionsText}>
							No recent transactions found for the selected
							filter.
						</Text>
					) : (
						<FlatList
							data={filteredTransactions}
							keyExtractor={(item) => item._id.toString()}
							renderItem={renderTransactionItem}
							showsVerticalScrollIndicator={false}
							contentContainerStyle={
								styles.transactionsListContent
							}
						/>
					)}
				</View>

				{/* Transfer Modal */}
				<Modal
					visible={isTransferModalVisible}
					transparent={true}
					animationType="slide"
					onRequestClose={() =>
						setIsTransferModalVisible(false)
					}
				>
					<TouchableWithoutFeedback
						onPress={Keyboard.dismiss}
						accessible={false}
					>
						<View style={styles.modalOverlay}>
							<View style={styles.modalContent}>
								<View style={styles.modalHeader}>
									<Text style={styles.modalTitle}>
										New Transfer
									</Text>
									<TouchableOpacity
										onPress={() =>
											setIsTransferModalVisible(false)
										}
									>
										<Ionicons
											name="close-circle-outline"
											size={28}
											color="#888"
										/>
									</TouchableOpacity>
								</View>

								{/* Searchable Bank Input */}
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>
										Select Bank
									</Text>
									<TextInput
										style={styles.textInput}
										placeholder="Search for a bank..."
										placeholderTextColor="#999"
										value={bankSearchTerm}
										onChangeText={(text) => {
											setBankSearchTerm(text);
											setSelectedBank(null); // Clear selected bank if user starts typing
										}}
										onFocus={() =>
											setShowBankSuggestions(true)
										}
									/>
									<View
										style={{
											marginBottom: selectedBank ? 0 : 200,
										}}
									>
										{showBankSuggestions &&
											filteredBanks.length > 0 && (
												<View
													style={
														styles.bankSuggestionsContainer
													}
												>
													<FlatList
														data={filteredBanks}
														keyExtractor={(item) =>
															item.id.toString()
														}
														renderItem={({ item }) => (
															<TouchableOpacity
																style={
																	styles.bankSuggestionItem
																}
																onPress={() =>
																	handleBankSelect(item)
																}
															>
																<Text
																	style={
																		styles.bankSuggestionText
																	}
																>
																	{item.name}
																</Text>
															</TouchableOpacity>
														)}
														nestedScrollEnabled={true}
														keyboardShouldPersistTaps="always"
														style={
															styles.bankSuggestionsList
														}
													/>
												</View>
											)}
									</View>
									{selectedBank && (
										<View
											style={styles.selectedBankDisplay}
										>
											<Ionicons
												name="checkmark-circle-outline"
												size={20}
												color="green"
											/>
											<Text style={styles.selectedBankText}>
												Selected: {selectedBank.name}
											</Text>
										</View>
									)}
								</View>

								{/* Account Number Input */}
								{selectedBank && (
									<View style={styles.inputGroup}>
										<Text style={styles.inputLabel}>
											Account Number
										</Text>
										<TextInput
											style={styles.textInput}
											placeholder="Enter 10-digit account number"
											placeholderTextColor="#999"
											keyboardType="numeric"
											value={accountNumber}
											onChangeText={setAccountNumber}
											maxLength={10}
										/>
									</View>
								)}

								{/* Account Name Display */}
								{loading &&
									accountNumber.length === 10 &&
									selectedBank ? (
									<ActivityIndicator
										color="#2196F3"
										size="small"
										style={{ marginBottom: 10 }}
									/>
								) : accountName ? (
									<View style={styles.accountNameDisplay}>
										<Ionicons
											name="person-circle-outline"
											size={20}
											color="#2E8B57"
										/>
										<Text style={styles.accountNameText}>
											{accountName}
										</Text>
									</View>
								) : null}

								{/* Amount Input */}
								{accountName && (
									<>
										<View style={styles.inputGroup}>
											<Text style={styles.inputLabel}>
												Amount to Transfer
											</Text>
											<TextInput
												style={styles.textInput}
												placeholder="e.g., 5000"
												placeholderTextColor="#999"
												keyboardType="numeric"
												value={amount}
												onChangeText={setAmount}
											/>
										</View>
										{amount > 0 && (
											<Text style={styles.feeText}>
												A transfer fee of{' '}
												<Text style={styles.feeAmount}>
													₦
													{Number(amount) <= 5000
														? '10'
														: '25'}
												</Text>{' '}
												will apply.
											</Text>
										)}
										<TouchableOpacity
											style={[
												styles.transferButton,
												!(
													selectedBank &&
													accountNumber &&
													accountName &&
													amount
												) && styles.transferButtonDisabled,
											]}
											onPress={handleTransfer}
											disabled={
												loading ||
												!selectedBank ||
												!accountNumber ||
												!accountName ||
												!amount
											}
										>
											{loading ? (
												<ActivityIndicator color="white" />
											) : (
												<Text style={styles.buttonText}>
													Confirm Transfer
												</Text>
											)}
										</TouchableOpacity>
									</>
								)}
							</View>
						</View>
					</TouchableWithoutFeedback>
				</Modal>

				{/* Filter Modal */}
				<Modal
					visible={filterModalVisible}
					transparent={true}
					animationType="fade"
					onRequestClose={() =>
						setFilterModalVisible(false)
					}
				>
					<TouchableOpacity
						style={styles.filterModalOverlay}
						activeOpacity={1}
						onPress={() => setFilterModalVisible(false)}
					>
						<View style={styles.filterModalContent}>
							<Text style={styles.filterModalTitle}>
								Filter Transactions
							</Text>
							<TouchableOpacity
								style={[
									styles.filterOption,
									selectedFilterType === 'all' &&
									styles.filterOptionSelected,
								]}
								onPress={() => {
									setSelectedFilterType('all');
									setFilterModalVisible(false);
								}}
							>
								<Text
									style={[
										styles.filterOptionText,
										selectedFilterType === 'all' &&
										styles.filterOptionTextSelected,
									]}
								>
									All Transactions
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.filterOption,
									selectedFilterType === 'credit' &&
									styles.filterOptionSelected,
								]}
								onPress={() => {
									setSelectedFilterType('credit');
									setFilterModalVisible(false);
								}}
							>
								<Text
									style={[
										styles.filterOptionText,
										selectedFilterType === 'credit' &&
										styles.filterOptionTextSelected,
									]}
								>
									Credit Transactions
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.filterOption,
									selectedFilterType === 'debit' &&
									styles.filterOptionSelected,
								]}
								onPress={() => {
									setSelectedFilterType('debit');
									setFilterModalVisible(false);
								}}
							>
								<Text
									style={[
										styles.filterOptionText,
										selectedFilterType === 'debit' &&
										styles.filterOptionTextSelected,
									]}
								>
									Debit Transactions
								</Text>
							</TouchableOpacity>
						</View>
					</TouchableOpacity>
				</Modal>

				{/* Receipt Modal */}
				<Modal
					visible={isReceiptModalVisible}
					transparent={true}
					animationType="slide"
					onRequestClose={() =>
						setIsReceiptModalVisible(false)
					}
				>
					<View style={styles.modalOverlay}>
						<View style={styles.modalContent}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>
									Transaction Receipt
								</Text>
								<TouchableOpacity
									onPress={() =>
										setIsReceiptModalVisible(false)
									}
								>
									<Ionicons
										name="close-circle-outline"
										size={28}
										color="#888"
									/>
								</TouchableOpacity>
							</View>

							{selectedTransactionForReceipt && (
								<View
									ref={receiptViewRef} // Attach ref here
									style={styles.receiptContainer}
								>
									<View>
										<Image
											src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Paystack_Logo.png"
											style={{ width: '41%', height: 22, marginBottom: 20 }}
										/>
									</View>
									<View style={styles.receiptHeader}>
										<Ionicons
											name="checkmark-circle"
											size={40}
											color="#4CAF50"
										/>
										<Text style={styles.receiptStatus}>
											{selectedTransactionForReceipt.type ===
												'debit'
												? 'Transfer Sent'
												: 'Payment Received'}
										</Text>
										<Text style={styles.receiptAmount}>
											₦
											{selectedTransactionForReceipt.amount.toLocaleString()}
										</Text>
									</View>

									<View style={styles.receiptDetailsRow}>
										<Text style={styles.receiptLabel}>
											Description:
										</Text>
										<Text style={styles.receiptValue}>
											{
												selectedTransactionForReceipt.description
											}
										</Text>
									</View>
									{selectedTransactionForReceipt.bankName && (
										<View style={styles.receiptDetailsRow}>
											<Text style={styles.receiptLabel}>
												Bank:
											</Text>
											<Text style={styles.receiptValue}>
												{
													selectedTransactionForReceipt.bankName
												}
											</Text>
										</View>
									)}
									{selectedTransactionForReceipt.accountNumber && (
										<View style={styles.receiptDetailsRow}>
											<Text style={styles.receiptLabel}>
												Account Number:
											</Text>
											<Text style={styles.receiptValue}>
												{
													selectedTransactionForReceipt.accountNumber
												}
											</Text>
										</View>
									)}
									{selectedTransactionForReceipt.fee && (
										<View style={styles.receiptDetailsRow}>
											<Text style={styles.receiptLabel}>
												Transaction Fee:
											</Text>
											<Text style={styles.receiptValue}>
												₦
												{selectedTransactionForReceipt.fee.toLocaleString()}
											</Text>
										</View>
									)}
									<View style={styles.receiptDetailsRow}>
										<Text style={styles.receiptLabel}>
											Date:
										</Text>
										<Text style={styles.receiptValue}>
											{new Date(
												selectedTransactionForReceipt.date,
											).toLocaleDateString('en-NG', {
												year: 'numeric',
												month: 'long',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit',
											})}
										</Text>
									</View>
									<View style={styles.receiptDetailsRow}>
										<Text style={styles.receiptLabel}>
											Reference:
										</Text>
										<Text style={styles.receiptValue}>
											{
												selectedTransactionForReceipt.reference
											}
										</Text>
									</View>

									<Text style={styles.paystackAttribution}>
										Powered by Paystack
									</Text>
								</View>
							)}

							<TouchableOpacity
								style={styles.shareButton}
								onPress={shareReceipt}
							>
								<Ionicons
									name="share-social-outline"
									size={20}
									color="#fff"
									style={{ marginRight: 10 }}
								/>
								<Text style={styles.buttonText}>
									Share Receipt
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>

				{/* Success Notification */}
				{transferSuccess && (
					<View style={styles.notification}>
						<Ionicons
							name="checkmark-circle"
							size={24}
							color="white"
							style={{ marginRight: 10 }}
						/>
						<Text style={styles.notificationText}>
							Transfer Successful!
						</Text>
					</View>
				)}
			</View>
		</TouchableWithoutFeedback>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F0F2F5',
		paddingTop: 40,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		marginBottom: 25,
	},
	backButton: {
		padding: 5,
	},
	headerTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#2C3E50',
	},
	filterButton: {
		padding: 5,
	},
	balanceCard: {
		backgroundColor: '#1E90FF',
		borderRadius: 15,
		padding: 25,
		marginHorizontal: 20,
		marginBottom: 30,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.2,
		shadowRadius: 10,
		elevation: 12,
		alignItems: 'center',
	},
	balanceLabel: {
		fontSize: 16,
		color: '#E0E0E0',
		marginBottom: 8,
		fontWeight: '500',
	},
	balanceAmount: {
		fontSize: 40,
		fontWeight: 'bold',
		color: '#FFFFFF',
		marginBottom: 20,
	},
	transferInitiateButton: {
		backgroundColor: '#007BFF',
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 28,
		borderRadius: 30,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 5,
		elevation: 6,
	},
	transferInitiateButtonText: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: '600',
	},
	section: {
		marginHorizontal: 20,
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#2C3E50',
		marginBottom: 15,
	},
	loadingIndicator: {
		marginTop: 20,
	},
	noTransactionsText: {
		fontSize: 16,
		color: '#777',
		textAlign: 'center',
		marginTop: 10,
		paddingVertical: 20,
		backgroundColor: '#FFFFFF',
		borderRadius: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		elevation: 3,
	},
	transactionsListContent: {
		paddingBottom: 20, // Add padding to the bottom of the list
	},
	transactionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 18,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 5,
	},
	transactionIcon: {
		marginRight: 15,
		backgroundColor: '#E8F5E9',
		padding: 8,
		borderRadius: 20,
	},
	transactionDetails: {
		flex: 1,
	},
	transactionRecipient: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
	},
	transactionDate: {
		fontSize: 13,
		color: '#888',
		marginTop: 3,
	},
	transactionAmount: {
		fontSize: 17,
		fontWeight: 'bold',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: '#FFFFFF',
		padding: 25,
		borderTopLeftRadius: 30,
		borderTopRightRadius: 30,
		maxHeight: '80%',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 30,
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: '#2C3E50',
	},
	inputGroup: {
		marginBottom: 22,
		// The key is to ensure this relative positioning and
		// the zIndex of the suggestions are set correctly.
		position: 'relative',
		zIndex: 1, // Default zIndex for inputs
	},
	inputLabel: {
		fontSize: 15,
		color: '#555',
		marginBottom: 10,
		fontWeight: '600',
	},
	textInput: {
		width: '100%',
		padding: 15,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 10,
		backgroundColor: '#F9F9F9',
		fontSize: 16,
		color: '#333',
		zIndex: 2, // Ensure the text input itself is above the suggestions container's background
	},
	bankSuggestionsContainer: {
		position: 'absolute',
		top: '100%', // Position exactly below the TextInput
		left: 0,
		right: 0,
		backgroundColor: '#FFFFFF',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		maxHeight: 200, // Limit height of suggestions list
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 5,
		elevation: 5,
		marginTop: 5, // Small gap between input and suggestions
		zIndex: 3, // Crucial: ensure this is higher than other elements that might overlap
	},
	bankSuggestionsList: {
		flexGrow: 1, // Allow FlatList to grow
		backgroundColor: '#FFFFFF',
	},
	bankSuggestionItem: {
		paddingVertical: 12,
		paddingHorizontal: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F0F0',
	},
	bankSuggestionText: {
		fontSize: 16,
		color: '#333',
	},
	selectedBankDisplay: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F4EA',
		padding: 10,
		borderRadius: 10,
		marginTop: 10, // Added margin top
		borderWidth: 1,
		borderColor: '#C8E6C9',
	},
	selectedBankText: {
		fontSize: 15,
		color: '#2E8B57',
		fontWeight: '600',
		marginLeft: 8,
	},
	accountNameDisplay: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F4EA',
		padding: 14,
		borderRadius: 10,
		marginBottom: 25,
		borderWidth: 1,
		borderColor: '#C8E6C9',
	},
	accountNameText: {
		fontSize: 16,
		color: '#2E8B57',
		fontWeight: '600',
		marginLeft: 10,
	},
	feeText: {
		fontSize: 14,
		color: '#777',
		textAlign: 'center',
		marginBottom: 30,
	},
	feeAmount: {
		fontWeight: 'bold',
		color: '#333',
	},
	transferButton: {
		backgroundColor: '#007BFF',
		paddingVertical: 16,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		width: '100%',
		marginBottom: 10,
	},
	transferButtonDisabled: {
		backgroundColor: '#A9D9FF',
	},
	buttonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: '700',
	},
	notification: {
		position: 'absolute',
		bottom: 30,
		left: 20,
		right: 20,
		backgroundColor: '#4CAF50',
		padding: 18,
		borderRadius: 12,
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 5,
		elevation: 10,
	},
	notificationText: {
		color: 'white',
		fontSize: 17,
		fontWeight: 'bold',
	},
	filterModalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	filterModalContent: {
		backgroundColor: '#FFFFFF',
		borderRadius: 15,
		padding: 25,
		width: '80%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 10,
		elevation: 10,
	},
	filterModalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#2C3E50',
		marginBottom: 20,
		textAlign: 'center',
	},
	filterOption: {
		paddingVertical: 12,
		paddingHorizontal: 15,
		borderRadius: 8,
		marginBottom: 10,
		backgroundColor: '#F5F5F5',
	},
	filterOptionSelected: {
		backgroundColor: '#E3F2FD',
		borderWidth: 1,
		borderColor: '#90CAF9',
	},
	filterOptionText: {
		fontSize: 16,
		color: '#333',
		textAlign: 'center',
		fontWeight: '500',
	},
	filterOptionTextSelected: {
		color: '#1565C0',
		fontWeight: 'bold',
	},
	// Styles for the Receipt Modal
	receiptContainer: {
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 20,
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 5,
		elevation: 5,
	},
	receiptHeader: {
		alignItems: 'center',
		marginBottom: 20,
		paddingBottom: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	receiptStatus: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#4CAF50',
		marginTop: 10,
	},
	receiptAmount: {
		fontSize: 32,
		fontWeight: 'bold',
		color: '#333',
		marginTop: 5,
	},
	receiptDetailsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	receiptLabel: {
		fontSize: 15,
		color: '#666',
		fontWeight: '500',
	},
	receiptValue: {
		fontSize: 15,
		color: '#333',
		fontWeight: '600',
		textAlign: 'right',
		flexShrink: 1, // Allow text to wrap
		marginLeft: 10,
	},
	paystackAttribution: {
		fontSize: 12,
		color: '#999',
		textAlign: 'center',
		marginTop: 20,
		fontStyle: 'italic',
	},
	shareButton: {
		backgroundColor: '#007BFF',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 15,
		borderRadius: 10,
	},
});

export default TransferScreen;
