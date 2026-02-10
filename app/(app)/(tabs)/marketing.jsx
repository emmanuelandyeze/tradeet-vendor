import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Share,
    Alert,
    SafeAreaView,
    Image,
    Linking
} from 'react-native';
import { AuthContext } from '@/context/AuthContext';
import Clipboard from '@react-native-clipboard/clipboard';
import { Feather } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MarketingScreen = () => {
    const { selectedStore, userInfo } = useContext(AuthContext);
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [whatsappLink, setWhatsappLink] = useState('');

    const insets = useSafeAreaInsets();
    const headerTopPadding = Math.max(insets.top, 20) + 10;

    // Tradeet's Official Number
    const phoneNumber = '2348141898230';

    useEffect(() => {
        if (selectedStore && userInfo) {
            // Resolve actual store (parent) if selectedStore is a branch
            let targetStore = selectedStore;
            if (selectedStore._isBranch && selectedStore._storeId) {
                targetStore = userInfo.stores.find(s => s._id === selectedStore._storeId) || selectedStore;
            }

            // Set default message to trigger "DIRECT_SHOP" intent
            const defaultMsg = `I want to shop at ${targetStore.name}`;
            setWhatsappMessage(defaultMsg);

            // Generate Short Link using store slug or fallback to name-based slug
            const slug = targetStore.slug || targetStore.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            setWhatsappLink(`https://tradeet.ng/chat/${slug}`);
        }
    }, [selectedStore, userInfo]);

    const copyToClipboard = async () => {
        if (!whatsappLink) return;
        Clipboard.setString(whatsappLink);
        Alert.alert('Copied', 'WhatsApp link copied to clipboard!');
    };

    const shareLink = async () => {
        if (!whatsappLink) return;
        try {
            await Share.share({
                message: `Order from ${selectedStore?.name} here: ${whatsappLink}`,
                url: whatsappLink, // iOS
                title: 'Order Link'
            });
        } catch (error) {
            Alert.alert('Error', 'Could not share link.');
        }
    };

    const openPreview = () => {
        if (whatsappLink) {
            Linking.openURL(whatsappLink).catch(() => {
                Alert.alert('Error', 'Could not open WhatsApp.');
            });
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />



            <View style={[styles.header, { paddingTop: headerTopPadding }]}>
                <Text style={styles.headerTitle}>Marketing</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Intro Card */}
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <FontAwesome name="whatsapp" size={40} color="#25D366" />
                    </View>
                    <Text style={styles.cardTitle}>WhatsApp Store Link</Text>
                    <Text style={styles.cardSubtitle}>
                        Share this link with your customers. When they click it, they will be taken directly to your WhatsApp with a pre-filled message to start an order.
                    </Text>
                </View>

                {/* Configuration Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Link Configuration</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number (Tradeet Platform)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: '#E5E7EB', color: '#6B7280' }]}
                            value={phoneNumber}
                            editable={false}
                        />
                        <Text style={styles.helperText}>This is our official bot number that handles your store interactions.</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Trigger Message</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: '#E5E7EB', color: '#6B7280' }]}
                            value={whatsappMessage}
                            editable={false}
                            multiline
                            numberOfLines={3}
                        />
                        <Text style={styles.helperText}>This is the text that will be sent to the bot to identify your store.</Text>
                    </View>
                </View>

                {/* Action Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Your Link</Text>
                    <View style={styles.linkContainer}>
                        <Text style={styles.linkText} numberOfLines={1}>{whatsappLink}</Text>
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={copyToClipboard}>
                            <Feather name="copy" size={20} color="#2563EB" />
                            <Text style={styles.outlineButtonText}>Copy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={shareLink}>
                            <Feather name="share-2" size={20} color="#FFF" />
                            <Text style={styles.primaryButtonText}>Share</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.previewButton} onPress={openPreview}>
                        <Text style={styles.previewText}>Test Link on WhatsApp</Text>
                        <Feather name="external-link" size={16} color="#2563EB" />
                    </TouchableOpacity>
                </View>

                {/* Future Marketing Features Placeholder */}
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Feather name="trending-up" size={24} color="#F59E0B" />
                        <Text style={[styles.cardTitle, { marginBottom: 0, marginLeft: 10 }]}>Boost Your Sales</Text>
                    </View>
                    <Text style={styles.cardSubtitle}>
                        More marketing tools like Flyers, QR Codes, and Campaign Managers are coming soon!
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    header: {
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,

        borderBottomColor: '#E5E7EB',
        // paddingTop: handled inline
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    helperText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    linkContainer: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    linkText: {
        color: '#4B5563',
        fontSize: 14,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    primaryButton: {
        backgroundColor: '#2563EB',
    },
    outlineButton: {
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    primaryButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    outlineButtonText: {
        color: '#2563EB',
        fontWeight: '600',
        fontSize: 14,
    },
    previewButton: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
    },
    previewText: {
        color: '#2563EB',
        fontSize: 14,
        fontWeight: '500'
    }
});

export default MarketingScreen;
