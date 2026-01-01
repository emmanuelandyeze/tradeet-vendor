import React, { useState, useContext, useEffect } from 'react';
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
    Linking
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';

const DomainSettingsScreen = () => {
    const router = useRouter();
    const { selectedStore, switchSelectedStore } = useContext(AuthContext);
    
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        if (selectedStore) {
            setDomain(selectedStore.customDomain || '');
            setInitialLoading(false);
        }
    }, [selectedStore]);

    const handleSave = async () => {
        if (!selectedStore?._id) return;
        
        // Basic validation
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        if (domain && !domainRegex.test(domain)) {
            Alert.alert('Invalid Domain', 'Please enter a valid domain name (e.g., myshop.com)');
            return;
        }

        setLoading(true);
        try {
            const response = await axiosInstance.put(`/stores/${selectedStore._id}`, {
                customDomain: domain
            });

            if (response.data.store) {
                 // Update local context store data if needed, or just let the refresh handle it
                 // Ideally switchSelectedStore updates the context
                 await switchSelectedStore(response.data.store); 
                 ToastAndroid.show('Domain settings updated', ToastAndroid.SHORT);
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

    const copyToClipboard = async () => {
        await Clipboard.setStringAsync('custom.tradeet.ng');
        ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
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
                <View style={styles.card}>
                    <View style={styles.iconHeader}>
                        <Ionicons name="globe-outline" size={40} color="#065637" />
                    </View>
                    <Text style={styles.title}>Connect Your Domain</Text>
                    <Text style={styles.subtitle}>
                        Use your own custom domain (e.g., yourstore.com) instead of the default Tradeet link.
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Custom Domain</Text>
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

                    <TouchableOpacity 
                        style={styles.saveButton} 
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
});

export default DomainSettingsScreen;
