import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    Image
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Entypo, Feather, Ionicons } from '@expo/vector-icons';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';

export default function TeamManagement() {
    const router = useRouter();
    const { selectedStore, userInfo } = useContext(AuthContext);

    const [managers, setManagers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [activeBranchId, setActiveBranchId] = useState(null); // null means Global Brand Managers
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);

    // Ensure we operate on the main store ID if it's a branch
    const brandId = selectedStore?._isBranch ? selectedStore._storeId : selectedStore?._id;
    // Identify if current user is owner (only owner can add/remove)
    const isOwner = React.useMemo(() => {
        if (!selectedStore || !userInfo) {
            console.log('[DEBUG-TEAM] No store/user', { hasStore: !!selectedStore, hasUser: !!userInfo });
            return false;
        }
        const myId = String(userInfo._id);
        const currentBrandId = String(brandId);
        
        // 1. Direct check on selectedStore (Handles case where it's a full Store object)
        const directOwnerId = selectedStore.owner?._id || selectedStore.owner;
        if (directOwnerId && String(directOwnerId) === myId) return true;
        
        // 2. Parent check if branch (Handles case where branch has parent object populated)
        const parentOwnerId = selectedStore.parent?.owner?._id || selectedStore.parent?.owner;
        if (parentOwnerId && String(parentOwnerId) === myId) return true;
        
        // 3. Search in userInfo.stores (Most reliable if stores are populated in AuthContext)
        if (userInfo.stores && Array.isArray(userInfo.stores)) {
            const store = userInfo.stores.find(s => String(s._id) === currentBrandId);
            if (store) {
                const storeOwnerId = store.owner?._id || store.owner;
                if (String(storeOwnerId) === myId) return true;
            } else {
                console.log('[DEBUG-TEAM] Brand ID not found in user stores', { brandId: currentBrandId, storeCount: userInfo.stores.length });
            }
        } else {
            console.log('[DEBUG-TEAM] userInfo.stores missing or not an array');
        }
        
        console.log('[DEBUG-TEAM] Ownership failed for', { myId, currentBrandId, directOwnerId, parentOwnerId });
        return false;
    }, [selectedStore, userInfo, brandId]);

    useEffect(() => {
        if (brandId) {
            fetchBranches();
            fetchManagers();
        }
    }, [brandId, activeBranchId]);

    const fetchBranches = async () => {
        try {
            const response = await axiosInstance.get(`/stores/${brandId}/branches`);
            setBranches(response.data.branches || []);
        } catch (error) {
            console.log('Error fetching branches:', error);
        }
    };

    const fetchManagers = async () => {
        try {
            setLoading(true);
            const targetId = activeBranchId || brandId;
            const response = await axiosInstance.get(`/stores/${targetId}/managers`);
            console.log(`[DEBUG-TEAM] Fetched ${response.data.managers?.length || 0} managers for ${targetId}`);
            setManagers(response.data.managers || []);
        } catch (error) {
            console.log('Error fetching managers:', error);
            Alert.alert('Error', 'Failed to load team members');
        } finally {
            setLoading(false);
        }
    };

    const addManager = async () => {
        if (!newPhone.trim()) {
            Alert.alert('Validation', 'Please enter a phone number');
            return;
        }
        try {
            setAdding(true);
            const targetId = activeBranchId || brandId;
            const response = await axiosInstance.post(`/stores/${targetId}/managers`, {
                phone: newPhone.trim(),
                name: newName.trim()
            });
            console.log(`[DEBUG-TEAM] Added manager. New count: ${response.data.managers?.length || 0}`);
            setManagers(response.data.managers || []);
            setNewPhone('');
            setNewName('');
            setModalVisible(false);
            Alert.alert('Success', 'Manager added successfully. They will receive login details via WhatsApp.');
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to add manager';
            Alert.alert('Error', msg);
        } finally {
            setAdding(false);
        }
    };

    const removeManager = async (managerId) => {
        Alert.alert(
            'Remove Manager',
            'Are you sure you want to remove this manager?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const targetId = activeBranchId || brandId;
                            const response = await axiosInstance.delete(`/stores/${targetId}/managers/${managerId}`);
                            setManagers(response.data.managers || []);
                        } catch (error) {
                            const msg = error.response?.data?.message || 'Failed to remove manager';
                            Alert.alert('Error', msg);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.memberCard}>
            <View style={styles.memberInfo}>
                {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                ) : (
                    <View style={styles.placeholderAvatar}>
                        <Text style={styles.placeholderText}>
                            {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                        </Text>
                    </View>
                )}
                <View>
                    <Text style={styles.memberName}>{item.name || 'Unknown'}</Text>
                    <Text style={styles.memberEmail}>{item.phone || item.email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{item.branchRole ? `Branch ${item.branchRole}` : 'Store Manager'}</Text>
                    </View>
                </View>
            </View>

            {isOwner && (
                <TouchableOpacity
                    onPress={() => removeManager(item._id)}
                    style={styles.removeBtn}
                >
                    <Feather name="trash-2" size={18} color="#EF4444" />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderBranchSelector = () => {
        if (branches.length === 0) return null;

        return (
            <View style={styles.branchSelectorContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[{ _id: null, name: 'Global Team' }, ...branches]}
                    keyExtractor={item => item._id || 'global'}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.branchChip,
                                activeBranchId === item._id && styles.activeBranchChip
                            ]}
                            onPress={() => setActiveBranchId(item._id)}
                        >
                            <Text style={[
                                styles.branchChipText,
                                activeBranchId === item._id && styles.activeBranchChipText
                            ]}>
                                {item.name}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.branchSelectorContent}
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color="#111" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Team Management</Text>
                <View style={{ width: 40 }} />
            </View>

            {renderBranchSelector()}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#065637" />
                </View>
            ) : (
                <FlatList
                    contentContainerStyle={styles.listContent}
                    data={managers}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <Text style={styles.subTitle}>
                                Manage people who have access to your {activeBranchId ? 'specific branch' : 'entire store'}.
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Feather name="users" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No managers added yet.</Text>
                        </View>
                    }
                />
            )}

            {isOwner && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => setModalVisible(true)}
                    >
                        <Feather name="plus" size={20} color="#fff" />
                        <Text style={styles.addBtnText}>Add {activeBranchId ? 'Branch ' : ''}Manager</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Add Manager Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Shop Manager</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Feather name="x" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>Manager Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. John Doe"
                            value={newName}
                            onChangeText={setNewName}
                        />

                        <Text style={styles.modalLabel}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 08012345678"
                            value={newPhone}
                            onChangeText={setNewPhone}
                            keyboardType="phone-pad"
                        />

                        <TouchableOpacity
                            style={styles.modalAddBtn}
                            onPress={addManager}
                            disabled={adding}
                        >
                            {adding ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalAddBtnText}>Add Manager</Text>
                            )}
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    listHeader: {
        marginBottom: 20,
    },
    subTitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
    },
    placeholderAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    memberEmail: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    roleBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#059669',
        textTransform: 'uppercase',
    },
    removeBtn: {
        padding: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingBottom: 40,
    },
    addBtn: {
        backgroundColor: '#065637',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        color: '#9CA3AF',
        fontSize: 15,
    },
    // Branch Selector
    branchSelectorContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    branchSelectorContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    branchChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 8,
    },
    activeBranchChip: {
        backgroundColor: '#065637',
        borderColor: '#065637',
    },
    branchChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4B5563',
    },
    activeBranchChipText: {
        color: '#fff',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        marginBottom: 20,
    },
    modalAddBtn: {
        backgroundColor: '#065637',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalAddBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
