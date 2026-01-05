import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    ToastAndroid,
    Linking,
    Modal,
    FlatList
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { StatusBar } from 'expo-status-bar';

const DomainSettingsScreen = () => {
    const router = useRouter();
    const { selectedStore, switchSelectedStore, userInfo } = useContext(AuthContext);
    
    // Derived value: List of "Brands" (stores) the user owns.
    // userInfo.stores contains full store objects.
    const userStores = useMemo(() => {
        if (!userInfo?.stores || !Array.isArray(userInfo.stores)) return [];
        return userInfo.stores;
    }, [userInfo]);

    // The store we are currently editing
    const [targetStore, setTargetStore] = useState(null);
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        const fetchStoreData = async () => {
            if (!selectedStore) {
                setInitialLoading(false);
                return;
            }

            // Always fetch fresh data for the brand
            const brandId = selectedStore._storeId || selectedStore._id;
            try {
                // Endpoint is /stores?id=...
                const response = await axiosInstance.get('/stores', {
                    params: { id: brandId }
                });
                if (response.data?.store) {
                    const s = response.data.store;
                    setTargetStore(s);
                    setDomain(s.customDomain || '');
                }
            } catch (error) {
                console.error("Failed to fetch store details:", error);
                // Fallback to searching in userStores from context if API fails
                const found = userStores.find(s => String(s._id) === String(brandId));
                if (found) {
                    setTargetStore(found);
                    setDomain(found.customDomain || '');
                }
            } finally {
                setInitialLoading(false);
            }
        };

        fetchStoreData();
    }, [selectedStore, userStores]);

    const handleSwitchStore = (store) => {
        setTargetStore(store);
        setDomain(store.customDomain || '');
        setModalVisible(false);
    };

    const handleSave = async () => {
        if (!targetStore?._id) return;
        
        // Basic validation
        const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        if (domain && !domainRegex.test(domain)) {
            Alert.alert('Invalid Domain', 'Please enter a valid domain name (e.g., myshop.com, myshop.com.ng)');
            return;
        }

        setLoading(true);
        try {
            const response = await axiosInstance.put(`/stores/${targetStore._id}`, {
                customDomain: domain
            });

            if (response.data.store) {
                // Update the local targetStore object to reflect changes immediately
                setTargetStore(prev => ({ ...prev, customDomain: domain }));

                // If the updated store is the currently selected one in context, update context
                // Note: switchSelectedStore usually expects a store object.
                // If we are currently on a branch of this store, we might need to be careful.
                // For now, simpler to just toast. The context update might happen on next fetch.

                ToastAndroid.show(`Domain updated for ${targetStore.name}`, ToastAndroid.SHORT);
                 router.back();
            }
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || 'Failed to update domain';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyDNS = async () => {
        if (!domain) return;
        setLoading(true);
        try {
            const response = await axiosInstance.post('/stores/verify-dns', { domain });
            if (response.data.ok) {
                Alert.alert("Success", response.data.message);
            } else {
                Alert.alert("Verification Failed", response.data.message);
            }
        } catch (error) {
            const msg = error.response?.data?.message || 'Verification failed';
            Alert.alert("Error", msg);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        Alert.alert('Info', 'Please copy "custom.tradeet.ng" manually.');
    };


    if (initialLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#065637" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Domain Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Store Selector (only if multiple stores) */}
                {userStores.length > 1 && (
                    <TouchableOpacity
                        style={styles.storeSelector}
                        onPress={() => setModalVisible(true)}
                    >
                        <View>
                            <Text style={styles.selectorLabel}>Configuring for:</Text>
                            <Text style={styles.selectorValue}>{targetStore?.name}</Text>
                        </View>
                        <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                )}

                <View style={styles.card}>
                    <View style={styles.iconHeader}>
                        <Ionicons name="globe-outline" size={40} color="#065637" />
                    </View>
                    <Text style={styles.title}>Connect Your Domain</Text>
                    <Text style={styles.subtitle}>
                        {userStores.length > 1
                            ? `Use a custom domain for ${targetStore?.name} (e.g., yourstore.com).`
                            : "Use your own custom domain (e.g., yourstore.com) instead of the default Tradeet link."
                        }
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Custom Domain</Text>

                        {targetStore?.customDomain && (
                            <View style={styles.connectedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#065637" />
                                <Text style={styles.connectedText}>
                                    Currently connected: <Text style={{ fontWeight: '700' }}>{targetStore.customDomain}</Text>
                                </Text>
                            </View>
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder="e.g. www.mystore.com"
                            value={domain}
                            onChangeText={(text) => setDomain(text.toLowerCase())}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                         <Text style={styles.helperText}>
                            Leave empty to remove custom domain.
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity 
                            style={[styles.saveButton, { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#065637' }]}
                            onPress={handleVerifyDNS}
                            disabled={loading || !domain}
                        >
                            <Text style={[styles.saveButtonText, { color: '#065637' }]}>Verify Connection</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.saveButton, { flex: 1 }]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.instructionCard}>
                    <Text style={styles.instructionTitle}>DNS Configuration</Text>
                    <Text style={styles.instructionText}>
                        To connect your domain, you need to add a <Text style={{fontWeight:'bold'}}>CNAME</Text> record in your domain registrar's DNS settings.
                    </Text>

                    <View style={styles.dnsRecord}>
                        <View style={styles.dnsRow}>
                            <Text style={styles.dnsLabel}>Type</Text>
                            <Text style={styles.dnsValue}>CNAME</Text>
                        </View>
                         <View style={styles.dnsRow}>
                            <Text style={styles.dnsLabel}>Host</Text>
                            <Text style={styles.dnsValue}>@ or www</Text>
                        </View>
                         <View style={styles.dnsRow}>
                            <Text style={styles.dnsLabel}>Value</Text>
                            <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                                <Text style={styles.dnsValueHighlight}>custom.tradeet.ng</Text>
                                <TouchableOpacity onPress={copyToClipboard}>
                                    <Ionicons name="copy-outline" size={16} color="#007BFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.noteText}>
                        Example: If your domain is <Text style={{fontStyle:'italic'}}>example.com</Text>, create a CNAME record for <Text style={{fontStyle:'italic'}}>www</Text> pointing to <Text style={{fontStyle:'italic'}}>custom.tradeet.ng</Text>.
                    </Text>
                     <Text style={[styles.noteText, {marginTop: 8}]}>
                        Note: DNS propagation may take up to 24-48 hours.
                    </Text>
                </View>
            </ScrollView>

            {/* Store Selection Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Business</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={userStores}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.storeOption,
                                        targetStore?._id === item._id && styles.storeOptionSelected
                                    ]}
                                    onPress={() => handleSwitchStore(item)}
                                >
                                    <Text style={[
                                        styles.storeOptionText,
                                        targetStore?._id === item._id && styles.storeOptionTextSelected
                                    ]}>{item.name}</Text>
                                    {targetStore?._id === item._id && (
                                        <Ionicons name="checkmark" size={20} color="#065637" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginLeft: 16,
    },
    content: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconHeader: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        alignSelf: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1A1A1A',
    },
    helperText: {
        fontSize: 12,
        color: '#888',
        marginTop: 6,
    },
    saveButton: {
        backgroundColor: '#065637',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    instructionCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    instructionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    instructionText: {
        fontSize: 14,
        color: '#444',
        marginBottom: 16,
        lineHeight: 20,
    },
    dnsRecord: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
    },
    dnsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        borderBottomWidth:1,
        borderBottomColor: '#eee',
        paddingBottom: 8,
    },
    dnsLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    dnsValue: {
        fontSize: 14,
        color: '#1A1A1A',
        fontWeight: '600',
        fontFamily: 'monospace',
    },
    dnsValueHighlight: {
        fontSize: 14,
        color: '#007BFF',
        fontWeight: '700',
        fontFamily: 'monospace',
    },
    noteText: {
        fontSize: 12,
        color: '#888',
        lineHeight: 18,
    },
    storeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    selectorLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    selectorValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '60%',
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
        color: '#1A1A1A',
    },
    storeOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    storeOptionSelected: {
        backgroundColor: '#F0FDF4',
        marginHorizontal: -12,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderBottomWidth: 0,
    },
    storeOptionText: {
        fontSize: 16,
        color: '#333',
    },
    storeOptionTextSelected: {
        color: '#065637',
        fontWeight: '600',
    },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    connectedText: {
        color: '#065637',
        fontSize: 13,
        marginLeft: 6,
    },
});

export default DomainSettingsScreen;
