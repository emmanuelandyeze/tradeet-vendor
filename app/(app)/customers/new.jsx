import React, { useState, useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	Alert,
	SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function NewCustomerScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { selectedStore, userToken } = useContext(AuthContext);

	const [name, setName] = useState('');
	const [whatsappNumber, setWhatsappNumber] = useState('');
	const [notes, setNotes] = useState('');

	const addCustomerMutation = useMutation({
		mutationFn: async (customerData) => {
			return await axiosInstance.post(`/customers/${selectedStore._id}`, customerData);
		},
		onSuccess: () => {
			Alert.alert('Success', 'Potential customer added successfully');
			queryClient.invalidateQueries({ queryKey: ['customers', selectedStore._id] });
			router.back();
		},
		onError: (error) => {
			const msg = error.response?.data?.message || 'Failed to add customer';
			Alert.alert('Error', msg);
		}
	});

	const handleSave = () => {
		if (!name.trim() || !whatsappNumber.trim()) {
			Alert.alert('Required', 'Name and WhatsApp number are required.');
			return;
		}

		addCustomerMutation.mutate({ name, whatsappNumber, notes });
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" />
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
					<Feather name="x" size={24} color="#111827" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Add Customer</Text>
				<View style={{ width: 24 }} />
			</View>

			<View style={styles.content}>
				<Text style={styles.description}>
					Add a potential customer lead. They will be marked as "Potential" until they make a purchase.
				</Text>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>Name *</Text>
					<TextInput
						style={styles.input}
						placeholder="Customer Name"
						value={name}
						onChangeText={setName}
					/>
				</View>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>WhatsApp Number *</Text>
					<TextInput
						style={styles.input}
						placeholder="e.g. 2348012345678"
						keyboardType="phone-pad"
						value={whatsappNumber}
						onChangeText={setWhatsappNumber}
					/>
				</View>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>Notes (Optional)</Text>
					<TextInput
						style={[styles.input, styles.textArea]}
						placeholder="Add details about what they are looking for..."
						multiline
						numberOfLines={4}
						value={notes}
						onChangeText={setNotes}
					/>
				</View>

				<TouchableOpacity
					style={[styles.saveBtn, addCustomerMutation.isPending && styles.saveBtnDisabled]}
					onPress={handleSave}
					disabled={addCustomerMutation.isPending}
				>
					{addCustomerMutation.isPending ? (
						<ActivityIndicator size="small" color="#FFF" />
					) : (
						<Text style={styles.saveBtnText}>Save Customer</Text>
					)}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#FFF', paddingTop: 40 },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6'
	},
	backBtn: { padding: 4 },
	headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
	content: { padding: 16 },
	description: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20 },
	inputGroup: { marginBottom: 20 },
	label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
	input: {
		backgroundColor: '#F9FAFB',
		borderWidth: 1,
		borderColor: '#E5E7EB',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 16,
		color: '#111827'
	},
	textArea: { minHeight: 100, textAlignVertical: 'top' },
	saveBtn: {
		backgroundColor: '#065637',
		borderRadius: 8,
		paddingVertical: 16,
		alignItems: 'center',
		marginTop: 12
	},
	saveBtnDisabled: { opacity: 0.7 },
	saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' }
});
