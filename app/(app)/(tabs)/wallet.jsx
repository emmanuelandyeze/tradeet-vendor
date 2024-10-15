import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
} from 'react-native';

const WalletScreen = () => {
	const [balance, setBalance] = useState(5000); // Example wallet balance
	const [transactions, setTransactions] = useState([
		{
			id: '1',
			type: 'Withdrawal',
			amount: 1000,
			date: '2024-10-01',
		},
		{
			id: '2',
			type: 'Bonus',
			amount: 500,
			date: '2024-10-02',
		},
		{
			id: '3',
			type: 'Withdrawal',
			amount: 2000,
			date: '2024-10-03',
		},
		{
			id: '4',
			type: 'Bonus',
			amount: 300,
			date: '2024-10-04',
		},
	]);

	const renderTransaction = ({ item }) => (
		<View style={styles.transactionItem}>
			<View>
				<View>
					<Text
						style={{fontWeight: 'bold', fontSize: 18}}
					>
						{item.type}
					</Text>
					<Text style={styles.transactionText}>
						{item.date}
					</Text>
				</View>
			</View>
			<Text
				style={[
					styles.transactionText,
					item.type === 'Withdrawal'
						? styles.withdrawal
						: styles.bonus,
				]}
			>
        {item.type === 'Withdrawal'
						? '-'
						: '+' }₦{item.amount}
			</Text>
		</View>
	);

	return (
		<View style={styles.container}>
			<View
				style={{
					marginBottom: 20,
					backgroundColor: '#fff',
					paddingVertical: 20,
					paddingHorizontal: 20,
				}}
			>
				<Text style={{ fontSize: 20 }}>Wallet</Text>
			</View>
			<View
				style={{
					paddingHorizontal: 20,
				}}
			>
				<View style={styles.walletInfo}>
					<Text style={styles.balanceTitle}>
						Available Balance
					</Text>
					<Text style={styles.balanceAmount}>
						₦{balance?.toLocaleString()}
					</Text>
					<TouchableOpacity
						style={styles.withdrawButton}
						onPress={() =>
							alert(
								'Withdraw functionality to be implemented',
							)
						}
					>
						<Text style={styles.withdrawButtonText}>
							Withdraw Funds
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			<View
				style={{
					paddingHorizontal: 20,
				}}
			>
				<View style={styles.transactionHistory}>
					<Text style={styles.historyTitle}>
						Transaction History
					</Text>
					<FlatList
						data={transactions}
						renderItem={renderTransaction}
						keyExtractor={(item) => item.id}
						showsVerticalScrollIndicator={false}
					/>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f1f1f1',
		paddingTop: 20,
	},
	walletInfo: {
		backgroundColor: '#fff',
		padding: 20,
		borderRadius: 10,
		elevation: 2,
		marginBottom: 20,
	},
	balanceTitle: {
		fontSize: 18,
		fontWeight: 'normal',
		color: '#333',
	},
	balanceAmount: {
		fontSize: 30,
		fontWeight: 'bold',
		color: '#000',
		marginVertical: 10,
	},
	transactionHistory: {
		backgroundColor: '#fff',
		borderRadius: 10,
		elevation: 2,
		padding: 10,
		marginBottom: 20,
	},
	historyTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 10,
	},
	transactionItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: 10,
		borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignItems: 'center',
	},
	transactionText: {
		fontSize: 14,
		color: '#333',
	},
	withdrawal: {
		color: 'red',
	},
	bonus: {
		color: 'green',
	},
	withdrawButton: {
		backgroundColor: '#000',
		padding: 10,
		borderRadius: 5,
    alignItems: 'center',
    marginTop: 14
	},
	withdrawButtonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
});

export default WalletScreen;
