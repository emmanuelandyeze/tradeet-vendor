import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {useRouter} from 'expo-router'

const TodoList = ({ businessData, setModalVisible }) => {
    const router = useRouter()
	// Define the to-do items and conditions to check if they are complete
	const todoItems = [
		{
			label: 'Add Business Location',
			isComplete: businessData?.address,
			onPress: () => router.push('/selectLocation'),
		},
		{
			label: 'Add Bank Account Information',
			isComplete: businessData?.paymentInfo?.length > 0,
			onPress: () => setModalVisible(true),
		},
		{
			label: 'Setup Website',
			isComplete: Boolean(businessData?.storeLink),
			onPress: () => router.push('/(app)/setupstore'),
		},
		// {
		// 	label: 'Add store on Tradeet marketplace',
		// 	isComplete: Boolean(businessData?.isVendor),
		// 	onPress: () => router.push('/(app)/setupcampus'),
		// },
		// Add more items as needed
	];

	// Filter out completed tasks
	const incompleteItems = todoItems.filter(
		(item) => !item.isComplete,
	);
	const numTasks = incompleteItems.length;

	return (
		<>
			{/* Show to-do section only if there are incomplete tasks */}
			{numTasks > 0 && (
				<View
					style={{
						marginBottom: 20,
						backgroundColor: '#ddd',
						borderRadius: 10,
						padding: 15,
						shadowColor: '#000',
						shadowOffset: { width: 0, height: 1 },
						shadowOpacity: 0.1,
						shadowRadius: 5,
					}}
				>
					<Text style={styles.sectionTitle}>
						Store To-Do ({numTasks})
					</Text>
					{incompleteItems.map((item, index) => (
						<TouchableOpacity
							key={index}
							onPress={item.onPress}
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								marginVertical: 5,
							}}
						>
							<Ionicons
								name="chevron-forward"
								size={20}
								color="#000"
							/>
							<Text
								style={{
									fontSize: 16,
									color: '#333333',
									textDecorationLine: 'underline',
									fontWeight: 'bold',
								}}
							>
								{item.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			)}
		</>
	);
};

const styles = {
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 10,
	},
};

export default TodoList;
