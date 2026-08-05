import React, { useState, useEffect, useContext } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	ScrollView,
	ActivityIndicator,
	Alert,
	SafeAreaView,
	Modal,
	KeyboardAvoidingView,
	Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { sanitizeTemplateParam, willBeReflowed } from '@/utils/whatsappText';
import { Feather, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function CustomerDetailScreen() {
	const { id } = useLocalSearchParams();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { selectedStore, userToken } = useContext(AuthContext);

	// Editable fields
	const [name, setName] = useState('');
	const [notes, setNotes] = useState('');
	const [messageModalVisible, setMessageModalVisible] = useState(false);
	const [customMsg, setCustomMsg] = useState('');

	const { data: customer, isLoading, error } = useQuery({
		queryKey: ['customer', selectedStore?._id, id],
		queryFn: async () => {
			const res = await axiosInstance.get(`/customers/${selectedStore._id}/${id}`);
			return res.data.data;
		},
		enabled: !!selectedStore?._id && !!id,
	});

	useEffect(() => {
		if (customer) {
			setName(customer.name || '');
			setNotes(customer.notes || '');
		}
	}, [customer]);

	const updateMutation = useMutation({
		mutationFn: async (payload) => {
			return await axiosInstance.put(`/customers/${selectedStore._id}/${id}`, payload);
		},
		onSuccess: () => {
			Alert.alert('Success', 'Customer details updated');
			queryClient.invalidateQueries({ queryKey: ['customer', selectedStore._id, id] });
			queryClient.invalidateQueries({ queryKey: ['customers', selectedStore._id] });
		},
		onError: (error) => {
			Alert.alert('Error', error?.response?.data?.message || 'Failed to update customer');
		}
	});

	const messageMutation = useMutation({
		mutationFn: async (payload) => {
			const res = await axiosInstance.post(`/customers/${selectedStore._id}/message`, payload);
			return res.data;
		},
		onSuccess: (data) => {
			// The server reports per-customer delivery — don't claim success if nothing went out.
			if (!data?.successCount) {
				Alert.alert('Not sent', data?.message || 'The message could not be delivered.');
				return;
			}
			Alert.alert('Sent', data.message || 'Message sent!');
			setMessageModalVisible(false);
			setCustomMsg('');
		},
		onError: (error) => {
			Alert.alert('Not sent', error?.response?.data?.message || 'Failed to send message');
		}
	});

	const handleSave = () => {
		updateMutation.mutate({ notes, name });
	};

	const handleSendMessage = () => {
		if (!customMsg.trim()) {
			Alert.alert('Empty Message', 'Please type a message to send.');
			return;
		}

		// Order must match the approved template: {{1}} name, {{2}} message, {{3}} store.
		// fullMessage keeps the line breaks — the server switches to the button template and
		// delivers this verbatim when the customer taps through.
		messageMutation.mutate({
			customerIds: [id],
			templateName: 'promotional_update',
			variables: [customer.name, sanitizeTemplateParam(customMsg), selectedStore.name],
			fullMessage: customMsg.trim()
		});
	};

	if (isLoading) {
		return (
			<SafeAreaView style={styles.center}>
				<ActivityIndicator size="large" color="#065637" />
			</SafeAreaView>
		);
	}

	if (!customer) {
		return (
			<SafeAreaView style={styles.center}>
				<Feather name="user-x" size={40} color="#D1D5DB" />
				<Text style={styles.errorText}>
					{error?.response?.data?.message || 'Customer not found'}
				</Text>
				<TouchableOpacity onPress={() => router.back()}>
					<Text style={styles.saveBtn}>Go back</Text>
				</TouchableOpacity>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" />
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
					<Feather name="arrow-left" size={24} color="#111827" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Customer Profile</Text>
				<TouchableOpacity onPress={handleSave} disabled={updateMutation.isPending}>
					{updateMutation.isPending ? <ActivityIndicator size="small" color="#065637" /> : <Text style={styles.saveBtn}>Save</Text>}
				</TouchableOpacity>
			</View>

			<ScrollView contentContainerStyle={styles.content}>
				{/* Top Card */}
				<View style={styles.card}>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : 'C'}</Text>
					</View>

					<Text style={styles.label}>Name</Text>
					<TextInput
						style={styles.nameInput}
						value={name}
						onChangeText={setName}
						placeholder="Customer Name"
					/>

					<View style={styles.infoRow}>
						<Feather name="phone" size={16} color="#6B7280" />
						<Text style={styles.infoText}>{customer.whatsappNumber}</Text>
					</View>
				</View>

				{/* Actions */}
				<View style={styles.actionsRow}>
					<TouchableOpacity style={styles.whatsappBtn} onPress={() => setMessageModalVisible(true)} disabled={messageMutation.isPending}>
						{messageMutation.isPending ? (
							<ActivityIndicator size="small" color="#FFF" />
						) : (
							<>
								<FontAwesome name="whatsapp" size={20} color="#FFF" />
								<Text style={styles.whatsappBtnText}>Compose Template</Text>
							</>
						)}
					</TouchableOpacity>
				</View>

				{/* Stats */}
				{customer.type === 'existing' && (
					<View style={styles.statsCard}>
						<Text style={styles.sectionTitle}>Order History</Text>
						<View style={styles.statsGrid}>
							<View style={styles.statBox}>
								<Text style={styles.statNumber}>{customer.totalOrders}</Text>
								<Text style={styles.statLabel}>Total Orders</Text>
							</View>
							<View style={styles.statBox}>
								<Text style={styles.statNumber}>₦{(customer.totalSpent || 0).toLocaleString()}</Text>
								<Text style={styles.statLabel}>Total Spent</Text>
							</View>
						</View>
					</View>
				)}

				{/* Notes */}
				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Internal Notes</Text>
					<TextInput
						style={styles.notesInput}
						multiline
						numberOfLines={4}
						placeholder="Add details about preferences, interactions, etc..."
						value={notes}
						onChangeText={setNotes}
					/>
				</View>

			</ScrollView>

			{/* Message Composer Modal */}
			<Modal
				visible={messageModalVisible}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setMessageModalVisible(false)}
			>
				<KeyboardAvoidingView
					style={styles.modalOverlay}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<View style={styles.modalCard}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Compose Message</Text>
							<TouchableOpacity onPress={() => setMessageModalVisible(false)}>
								<Feather name="x" size={24} color="#374151" />
							</TouchableOpacity>
						</View>

						<ScrollView keyboardShouldPersistTaps="handled">
							<View style={styles.templatePreview}>
								<Text style={styles.previewLabel}>Exactly what they'll receive:</Text>
								<Text style={styles.previewText}>
									Hello <Text style={styles.previewHighlight}>{customer.name}</Text>! We hope you're having a great day. We're reaching out from <Text style={styles.previewHighlight}>{selectedStore?.name}</Text> with a quick update for you:{"\n\n"}
									{sanitizeTemplateParam(customMsg) || '...'}{"\n\n"}
									<Text style={styles.previewMuted}>Thank you for being a valued customer!</Text>
								</Text>
							</View>

							<TextInput
								style={styles.composerInput}
								multiline
								placeholder="Type your personal message here..."
								value={customMsg}
								onChangeText={setCustomMsg}
								maxLength={700}
								autoFocus
							/>

							{willBeReflowed(customMsg) && (
								<Text style={styles.reflowNote}>
									WhatsApp can't put line breaks in a promotional template, so this arrives as
									one paragraph with a <Text style={{ fontWeight: '700' }}>View full message</Text> button.
									One tap and they get your version exactly as you typed it.
								</Text>
							)}

							<TouchableOpacity
								style={[styles.sendBtn, messageMutation.isPending && styles.sendBtnDisabled]}
								onPress={handleSendMessage}
								disabled={messageMutation.isPending}
							>
								{messageMutation.isPending ? (
									<ActivityIndicator size="small" color="#FFF" />
								) : (
									<>
										<MaterialIcons name="send" size={20} color="#FFF" />
										<Text style={styles.sendBtnText}>Send to {customer.name}</Text>
									</>
								)}
							</TouchableOpacity>
						</ScrollView>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: 40 },
	center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
	errorText: { fontSize: 15, color: '#6B7280' },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFF',
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6'
	},
	backBtn: { padding: 4 },
	headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
	saveBtn: { fontSize: 16, fontWeight: '600', color: '#065637' },
	content: { padding: 16 },
	card: {
		backgroundColor: '#FFF',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	avatar: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: '#DEF7EC',
		justifyContent: 'center',
		alignItems: 'center',
		alignSelf: 'center',
		marginBottom: 16
	},
	avatarText: { fontSize: 24, fontWeight: '700', color: '#03543F' },
	label: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
	nameInput: { fontSize: 20, fontWeight: '700', color: '#111827', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 8, marginBottom: 16 },
	infoRow: { flexDirection: 'row', alignItems: 'center' },
	infoText: { fontSize: 16, color: '#4B5563', marginLeft: 8 },
	actionsRow: { flexDirection: 'row', marginBottom: 16 },
	whatsappBtn: {
		flex: 1,
		backgroundColor: '#25D366',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		borderRadius: 8,
		gap: 8
	},
	whatsappBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
	statsCard: {
		backgroundColor: '#FFF',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
	},
	sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
	statsGrid: { flexDirection: 'row', gap: 12 },
	statBox: { flex: 1, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 8, alignItems: 'center' },
	statNumber: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
	statLabel: { fontSize: 12, color: '#6B7280' },
	notesInput: {
		backgroundColor: '#F9FAFB',
		borderRadius: 8,
		padding: 12,
		minHeight: 100,
		textAlignVertical: 'top',
		color: '#111827'
	},
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalCard: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
	templatePreview: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, marginBottom: 16 },
	previewLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 },
	previewText: { fontSize: 15, color: '#374151', lineHeight: 22 },
	previewHighlight: { color: '#065637', fontWeight: '700' },
	previewMuted: { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' },
	composerInput: { 
		backgroundColor: '#F9FAFB', 
		borderWidth: 1, 
		borderColor: '#E5E7EB', 
		borderRadius: 12, 
		padding: 16, 
		fontSize: 16, 
		minHeight: 120, 
		textAlignVertical: 'top',
		marginBottom: 20
	},
	reflowNote: {
		fontSize: 12,
		color: '#854D0E',
		backgroundColor: '#FEF9C3',
		borderRadius: 8,
		padding: 10,
		lineHeight: 17,
		marginTop: -8,
		marginBottom: 16
	},
	sendBtn: {
		backgroundColor: '#065637', 
		borderRadius: 12, 
		paddingVertical: 16, 
		flexDirection: 'row', 
		alignItems: 'center', 
		justifyContent: 'center', 
		gap: 8 
	},
	sendBtnDisabled: { opacity: 0.6 },
	sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
