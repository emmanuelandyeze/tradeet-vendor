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
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);

    // Ensure we operate on the main store ID if it's a branch
    const storeId = selectedStore?._isBranch ? selectedStore._storeId : selectedStore?._id;
    // Identify if current user is owner (only owner can add/remove)
    const isOwner = selectedStore && userInfo && String(selectedStore.owner || selectedStore.parent?.owner) === String(userInfo._id);

    useEffect(() => {
        if (storeId) {
            fetchManagers();
        }
    }, [storeId]);

    const fetchManagers = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/stores/${storeId}/managers`);
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
            // API expects { phone, name }
            const response = await axiosInstance.post(`/stores/${storeId}/managers`, {
                phone: newPhone.trim(),
                name: newName.trim()
            });
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
                            const response = await axiosInstance.delete(`/stores/${storeId}/managers/${managerId}`);
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
                        <Text style={styles.roleText}>Manager</Text>
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
                                Manage people who have access to your store.
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
                        <Text style={styles.addBtnText}>Add Manager</Text>
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
