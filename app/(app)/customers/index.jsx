import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	SectionList,
	ActivityIndicator,
	Alert,
	SafeAreaView,
	Modal,
	FlatList,
	Dimensions,
	RefreshControl,
	TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

const TABS = [
	{ id: 'all', label: 'All' },
	{ id: 'existing', label: 'Existing' },
	{ id: 'potential', label: 'Potential' }
];

export default function CustomersScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { selectedStore, userInfo, switchSelectedBranch } = useContext(AuthContext);
	const [activeTab, setActiveTab] = useState('all');
	const [expandedId, setExpandedId] = useState(null);
	const [branchModalVisible, setBranchModalVisible] = useState(false);
	const [messageModalVisible, setMessageModalVisible] = useState(false);
	const [selectedCustomer, setSelectedCustomer] = useState(null);
	const [customMsg, setCustomMsg] = useState('');

	const {
		data: customers = [],
		isLoading,
		refetch,
		isRefetching
	} = useQuery({
		queryKey: ['customers', selectedStore?._id, activeTab],
		queryFn: async () => {
			const typeQuery = activeTab !== 'all' ? `?type=${activeTab}` : '';
			const res = await axiosInstance.get(`/customers/${selectedStore._id}${typeQuery}`);
			return res.data.data || [];
		},
		enabled: !!selectedStore?._id,
	});

	const messageMutation = useMutation({
		mutationFn: async (payload) => {
			return await axiosInstance.post(`/customers/${selectedStore._id}/message`, payload);
		},
		onSuccess: () => {
			Alert.alert('Success', 'Message sent!');
			setMessageModalVisible(false);
			setCustomMsg('');
		},
		onError: () => {
			Alert.alert('Error', 'Failed to send message');
		}
	});

	const syncMutation = useMutation({
		mutationFn: async () => {
			return await axiosInstance.post(`/customers/${selectedStore._id}/sync`, {});
		},
		onSuccess: (res) => {
			Alert.alert('Success', res.data.message);
			queryClient.invalidateQueries({ queryKey: ['customers', selectedStore._id] });
		},
		onError: () => {
			Alert.alert('Error', 'Failed to sync customers');
		}
	});

	const handleOpenMessageModal = (customer) => {
		setSelectedCustomer(customer);
		setMessageModalVisible(true);
	};

	const handleSendMessage = () => {
		if (!customMsg.trim()) {
			Alert.alert('Empty Message', 'Please type a message to send.');
			return;
		}

		messageMutation.mutate({
			customerIds: [selectedCustomer._id],
			templateName: 'promotional_update',
			variables: [selectedCustomer.name, customMsg, selectedStore.name]
		});
	};

	const groupedCustomers = useMemo(() => {
		const groups = customers.reduce((acc, customer) => {
			const firstLetter = (customer.name || 'Anonymous').charAt(0).toUpperCase();
			const groupKey = /^[A-Z]/.test(firstLetter) ? firstLetter : '#';
			if (!acc[groupKey]) acc[groupKey] = [];
			acc[groupKey].push(customer);
			return acc;
		}, {});

		return Object.keys(groups)
			.sort()
			.map(letter => ({
				title: letter,
				data: groups[letter].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
			}));
	}, [customers]);

	const handleSync = () => {
		Alert.alert(
			'Sync Customers',
			'This will analyze your past orders to add missing customers. It may take a moment.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Sync Now',
					onPress: () => syncMutation.mutate()
				}
			]
		);
	};

	const getInitials = (name) => {
		if (!name) return '?';
		const parts = name.split(' ');
		if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
		return name.substring(0, 2).toUpperCase();
	};

	const renderCustomer = ({ item }) => {
		const isExpanded = expandedId === item._id;

		return (
			<View style={[styles.card, isExpanded && styles.cardExpanded]}>
				<TouchableOpacity
					style={styles.cardHeader}
					onPress={() => setExpandedId(isExpanded ? null : item._id)}
					activeOpacity={0.7}
				>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>{getInitials(item.name)}</Text>
					</View>
					<View style={styles.mainInfo}>
						<Text style={styles.nameText}>{item.name}</Text>
						<Text style={styles.phoneText}>{item.whatsappNumber}</Text>
					</View>
					<View style={styles.headerRight}>
						<View style={[styles.badge, item.type === 'existing' ? styles.badgeExisting : styles.badgePotential]}>
							<Text style={[styles.badgeText, item.type === 'existing' ? styles.badgeTextExisting : styles.badgeTextPotential]}>
								{item.type.charAt(0).toUpperCase()}
							</Text>
						</View>
						<Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
					</View>
				</TouchableOpacity>

				{isExpanded && (
					<View style={styles.expandedContent}>
						<View style={styles.detailsGrid}>
							<View style={styles.detailItem}>
								<Text style={styles.detailLabel}>Total Orders</Text>
								<Text style={styles.detailValue}>{item.totalOrders || 0}</Text>
							</View>
							<View style={styles.detailItem}>
								<Text style={styles.detailLabel}>Total Spent</Text>
								<Text style={styles.detailValue}>₦{(item.totalSpent || 0).toLocaleString()}</Text>
							</View>
							{item.lastOrderDate && (
								<View style={styles.detailItemFull}>
									<Text style={styles.detailLabel}>Last Order</Text>
									<Text style={styles.detailValue}>
										{new Date(item.lastOrderDate).toLocaleDateString()}
									</Text>
								</View>
							)}
						</View>

						{item.notes ? (
							<View style={styles.notesBox}>
								<Text style={styles.detailLabel}>Notes</Text>
								<Text style={styles.notesText}>{item.notes}</Text>
							</View>
						) : null}

						<View style={styles.actionRow}>
							<TouchableOpacity
								style={styles.actionBtn}
								onPress={() => router.push(`/(app)/customers/${item._id}`)}
							>
								<Feather name="edit-2" size={16} color="#4B5563" />
								<Text style={styles.actionBtnText}>Full Details</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[styles.actionBtn, styles.actionBtnPrimary]}
								onPress={() => handleOpenMessageModal(item)}
							>
								<MaterialIcons name="whatsapp" size={18} color="#FFF" />
								<Text style={[styles.actionBtnText, { color: '#FFF' }]}>Message</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}
			</View>
		);
	};

	// Branch selection logic
	const allStores = userInfo?.stores || [];
	const currentStoreObj = allStores.find(s => String(s._id) === String(selectedStore?._isBranch ? selectedStore._storeId : selectedStore?._id));
	const branches = currentStoreObj?.branches || [];

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" backgroundColor="#fff" />
			{/* Header */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
						<Feather name="arrow-left" size={24} color="#111827" />
					</TouchableOpacity>
					<View>
						<Text style={styles.headerTitle}>Customers</Text>
						<TouchableOpacity
							style={styles.branchSelector}
							onPress={() => setBranchModalVisible(true)}
						>
							<Text style={styles.branchSelectorText}>
								{selectedStore?.name || 'Main Branch'}
							</Text>
							<Feather name="chevron-down" size={14} color="#065637" />
						</TouchableOpacity>
					</View>
				</View>

				<TouchableOpacity onPress={handleSync} disabled={syncMutation.isPending} style={styles.syncBtn}>
					{syncMutation.isPending ? (
						<ActivityIndicator size="small" color="#065637" />
					) : (
						<MaterialIcons name="sync" size={24} color="#065637" />
					)}
				</TouchableOpacity>
			</View>

			{/* Tabs */}
			<View style={styles.tabContainer}>
				{TABS.map(tab => (
					<TouchableOpacity
						key={tab.id}
						style={[styles.tab, activeTab === tab.id && styles.activeTab]}
						onPress={() => setActiveTab(tab.id)}
					>
						<Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
							{tab.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* List */}
			{isLoading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color="#065637" />
				</View>
			) : (
				<SectionList
					sections={groupedCustomers}
					keyExtractor={(item) => item._id}
					renderItem={renderCustomer}
					renderSectionHeader={({ section: { title } }) => (
						<View style={styles.sectionHeader}>
							<Text style={styles.sectionTitle}>{title}</Text>
						</View>
					)}
					refreshControl={
						<RefreshControl
							refreshing={isRefetching}
							onRefresh={refetch}
							tintColor="#065637"
						/>
					}
					contentContainerStyle={styles.listContent}
					stickySectionHeadersEnabled={true}
					ListEmptyComponent={() => (
						<View style={styles.emptyContainer}>
							<Feather name="users" size={48} color="#D1D5DB" />
							<Text style={styles.emptyText}>No customers found.</Text>
						</View>
					)}
				/>
			)}

			<TouchableOpacity
				style={styles.fab}
				onPress={() => router.push('/(app)/customers/new')}
			>
				<Feather name="plus" size={24} color="#FFF" />
			</TouchableOpacity>

			{/* Branch Selector Modal */}
			<Modal
				visible={branchModalVisible}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setBranchModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Switch Branch</Text>
							<TouchableOpacity onPress={() => setBranchModalVisible(false)}>
								<Feather name="x" size={24} color="#374151" />
							</TouchableOpacity>
						</View>

						<FlatList
							data={branches}
							keyExtractor={(item) => item._id}
							renderItem={({ item }) => {
								const isSelected = selectedStore?._id === item._id;
								return (
									<TouchableOpacity
										style={[styles.modalItem, isSelected && styles.modalItemSelected]}
										onPress={() => {
											switchSelectedBranch(item._id, currentStoreObj._id);
											setBranchModalVisible(false);
										}}
									>
										<Text style={[styles.modalItemText, isSelected && styles.modalItemSelectedText]}>
											{item.name || item.branchKey}
										</Text>
										{isSelected && <Feather name="check" size={20} color="#065637" />}
									</TouchableOpacity>
								);
							}}
							ListEmptyComponent={
								<Text style={styles.emptyListText}>No other branches found.</Text>
							}
						/>
					</View>
				</View>
			</Modal>

			{/* Message Composer Modal */}
			<Modal
				visible={messageModalVisible}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setMessageModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Compose Message</Text>
							<TouchableOpacity onPress={() => setMessageModalVisible(false)}>
								<Feather name="x" size={24} color="#374151" />
							</TouchableOpacity>
						</View>

						<View style={styles.templatePreview}>
							<Text style={styles.previewLabel}>Template Preview:</Text>
							<Text style={styles.previewText}>
								Hello <Text style={styles.previewHighlight}>{selectedCustomer?.name || 'Customer'}</Text>! We hope you're having a great day. We're reaching out from <Text style={styles.previewHighlight}>{selectedStore?.name}</Text> with a quick update for you:{"\n\n"}
								{customMsg || '...'}{"\n\n"}
								<Text style={styles.previewMuted}>Thank you for being a valued customer!</Text>
							</Text>
						</View>

						<TextInput
							style={styles.composerInput}
							multiline
							placeholder="Type your personal message here..."
							value={customMsg}
							onChangeText={setCustomMsg}
							autoFocus
						/>

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
									<Text style={styles.sendBtnText}>Send to {selectedCustomer?.name}</Text>
								</>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: 40 },
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
	headerLeft: { flexDirection: 'row', alignItems: 'center' },
	backBtn: { marginRight: 12, padding: 4 },
	headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
	branchSelector: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
	branchSelectorText: { fontSize: 13, color: '#065637', fontWeight: '600', marginRight: 4 },
	syncBtn: { padding: 8 },

	tabContainer: {
		flexDirection: 'row',
		backgroundColor: '#FFF',
		paddingHorizontal: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6'
	},
	tab: {
		flex: 1,
		paddingVertical: 12,
		alignItems: 'center',
		borderBottomWidth: 2,
		borderBottomColor: 'transparent'
	},
	activeTab: { borderBottomColor: '#065637' },
	tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
	activeTabText: { color: '#065637', fontWeight: '600' },

	listContent: { paddingBottom: 100 },
	sectionHeader: {
		backgroundColor: '#F3F4F6',
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280' },

	card: {
		backgroundColor: '#FFF',
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	cardExpanded: { backgroundColor: '#F9FAFB' },
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
	},
	avatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#E5E7EB',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	avatarText: { fontSize: 16, fontWeight: '700', color: '#4B5563' },
	mainInfo: { flex: 1 },
	nameText: { fontSize: 16, fontWeight: '700', color: '#111827' },
	phoneText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
	headerRight: { flexDirection: 'row', alignItems: 'center' },

	badge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
	badgeExisting: { backgroundColor: '#DEF7EC' },
	badgePotential: { backgroundColor: '#FEF08A' },
	badgeText: { fontSize: 10, fontWeight: '800' },
	badgeTextExisting: { color: '#03543F' },
	badgeTextPotential: { color: '#854D0E' },

	expandedContent: {
		paddingHorizontal: 16,
		paddingBottom: 20,
		paddingTop: 4,
	},
	detailsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		backgroundColor: '#FFF',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	detailItem: { width: '50%', marginBottom: 12 },
	detailItemFull: { width: '100%' },
	detailLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
	detailValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
	notesBox: { marginTop: 16, backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
	notesText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

	actionRow: { flexDirection: 'row', marginTop: 20, gap: 12 },
	actionBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		paddingVertical: 10,
		gap: 8,
	},
	actionBtnPrimary: {
		backgroundColor: '#25D366', // WhatsApp Green
		borderColor: '#25D366',
	},
	actionBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },

	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	emptyContainer: { alignItems: 'center', marginTop: 100 },
	emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 12 },
	fab: {
		position: 'absolute',
		bottom: 24,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#065637',
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 4,
	},

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
	modalCard: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
	modalItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6'
	},
	modalItemSelected: { backgroundColor: '#F0FDF4', marginHorizontal: -24, paddingHorizontal: 24 },
	modalItemText: { fontSize: 16, color: '#374151' },
	modalItemSelectedText: { color: '#065637', fontWeight: '700' },
	emptyListText: { textAlign: 'center', marginTop: 20, color: '#9CA3AF' },

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

