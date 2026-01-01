import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    StyleSheet,
    Alert,
    ScrollView,
    ToastAndroid,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
import ExpenseTable from '../../../components/ExpenseTable';

const ExpensesScreen = () => {
    const { userInfo, selectedStore } = useContext(AuthContext);
    const router = useRouter();

    const [expenses, setExpenses] = useState([]);
    const [expensesLoading, setExpensesLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [isCreatingExpense, setIsCreatingExpense] = useState(false);
    const [error, setError] = useState(null);

    const [newExpense, setNewExpense] = useState({
        title: '',
        category: 'Inventory',
        amount: '',
        description: '',
    });

    const [validationErrors, setValidationErrors] = useState({});
    const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);

    const categories = [
        'Inventory',
        'Utilities',
        'Rent',
        'Salaries',
        'Marketing',
        'Miscellaneous',
        'Travel',
        'Supplies',
        'Software',
        'Legal Fees',
        'Consulting',
        'Repairs & Maintenance',
    ];

    useEffect(() => {
        if (selectedStore) {
            fetchExpenses();
        }
    }, [selectedStore]);

    const fetchExpenses = async () => {
        if (!selectedStore?._id) return;

        setExpensesLoading(true);
        setError(null);
        try {
            // Using parent store ID if it's a branch, or the store ID itself
            const storeId = selectedStore.parent || selectedStore._id;
            const response = await axiosInstance.get(`/expenses/${storeId}`);
            setExpenses(response.data.expenses);
        } catch (err) {
            console.error('Error fetching expenses:', err);
            setError(err.message || 'Failed to fetch expenses.');
        } finally {
            setExpensesLoading(false);
        }
    };

    const validateForm = () => {
        let errors = {};
        let isValid = true;

        if (!newExpense.title.trim()) {
            errors.title = 'Expense name is required';
            isValid = false;
        }
        if (!newExpense.category) {
            errors.category = 'Category is required';
            isValid = false;
        }
        if (!newExpense.amount.trim()) {
            errors.amount = 'Amount is required';
            isValid = false;
        } else if (isNaN(Number(newExpense.amount)) || Number(newExpense.amount) <= 0) {
            errors.amount = 'Enter a valid amount';
            isValid = false;
        }

        setValidationErrors(errors);
        return isValid;
    };

    const handleCreateExpense = async () => {
        if (!validateForm()) {
            return;
        }

        setIsCreatingExpense(true);
        try {
            const storeId = selectedStore.parent || selectedStore._id;
            const branchId = selectedStore.parent ? selectedStore._id : null;

            await axiosInstance.post('/expenses/create', {
                ...newExpense,
                amount: Number(newExpense.amount),
                businessId: storeId, // Backend maps this to storeId
                branchId,
                createdBy: userInfo?._id
            });
            ToastAndroid.show('Expense saved successfully', ToastAndroid.SHORT);
            fetchExpenses();
            setNewExpense({
                title: '',
                category: 'Inventory',
                amount: '',
                description: '',
            });
            setValidationErrors({});
            setModalVisible(false);
        } catch (error) {
            console.error('Error creating expense:', error);
            const errorMessage = error.response?.data?.message || 'Failed to save expense';
            ToastAndroid.show(errorMessage, ToastAndroid.LONG);
        } finally {
            setIsCreatingExpense(false);
        }
    };

    const renderCategoryItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.categoryItem,
                newExpense.category === item && styles.categoryItemSelected
            ]}
            onPress={() => {
                setNewExpense({ ...newExpense, category: item });
                setCategoryDropdownVisible(false);
                setValidationErrors(prev => ({ ...prev, category: undefined }));
            }}
        >
            <Text style={[
                styles.categoryText,
                newExpense.category === item && styles.categoryTextSelected
            ]}>{item}</Text>
            {newExpense.category === item && (
                <Ionicons name="checkmark-circle" size={20} color="#007BFF" />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header Section */}
            <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Expenses</Text>
                </View>
                {expenses?.length > 0 && (
                    <TouchableOpacity
                        style={styles.addButtonHeader}
                        onPress={() => {
                            setNewExpense({
                                title: '',
                                category: 'Inventory',
                                amount: '',
                                description: '',
                            });
                            setValidationErrors({});
                            setModalVisible(true);
                        }}
                    >
                        <Ionicons name="add" size={24} color="#fff" />
                        <Text style={styles.addButtonHeaderText}>New</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Main Content Area */}
            {expensesLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                </View>
            ) : error ? (
                    <View style={styles.centerContainer}>
                        <View style={styles.errorIconContainer}>
                            <Ionicons name="alert-outline" size={32} color="#DC3545" />
                        </View>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchExpenses}>
                            <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : expenses.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="receipt-outline" size={64} color="#007BFF" />
                            </View>
                            <Text style={styles.emptyTitle}>No Expenses Yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Record your business expenses to track your spending and calculate your net profit.
                    </Text>
                    <TouchableOpacity
                                style={styles.createButtonLarge}
                                onPress={() => {
                            setModalVisible(true);
                                    setValidationErrors({});
                        }}
                    >
                                <Text style={styles.createButtonLargeText}>Record First Expense</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ExpenseTable
                    expenses={expenses}
                    userInfo={userInfo}
                    fetchExpenses={fetchExpenses}
                />
            )}

            {/* Create Expense Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderBar}>
                            <Text style={styles.modalTitle}>New Expense</Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={styles.closeModalButton}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>

                            <View style={styles.formSection}>
                                <Text style={styles.label}>Amount</Text>
                                <View style={[styles.amountInputContainer, validationErrors.amount && styles.inputError]}>
                                    <Text style={styles.currencySymbol}>₦</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="0.00"
                                        placeholderTextColor="#ccc"
                                        value={newExpense.amount}
                                        keyboardType="numeric"
                                        onChangeText={(text) => {
                                            setNewExpense({ ...newExpense, amount: text });
                                            setValidationErrors(prev => ({ ...prev, amount: undefined }));
                                        }}
                                        autoFocus={false}
                                    />
                                </View>
                                {validationErrors.amount && (
                                    <Text style={styles.errorTextSmall}>{validationErrors.amount}</Text>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Name</Text>
                                <TextInput
                                    style={[styles.input, validationErrors.title && styles.inputError]}
                                    placeholder="What did you pay for?"
                                    placeholderTextColor="#999"
                                    value={newExpense.title}
                                    onChangeText={(text) => {
                                        setNewExpense({ ...newExpense, title: text });
                                        setValidationErrors(prev => ({ ...prev, title: undefined }));
                                    }}
                                />
                                {validationErrors.title && (
                                    <Text style={styles.errorTextSmall}>{validationErrors.title}</Text>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Category</Text>
                                <TouchableOpacity
                                    style={[styles.input, styles.dropdownTrigger, validationErrors.category && styles.inputError]}
                                    onPress={() => setCategoryDropdownVisible(!categoryDropdownVisible)}
                                >
                                    <Text style={styles.inputText}>{newExpense.category}</Text>
                                    <Feather name={categoryDropdownVisible ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                                </TouchableOpacity>

                                {categoryDropdownVisible && (
                                    <View style={styles.dropdownContainer}>
                                        <FlatList
                                            data={categories}
                                            renderItem={renderCategoryItem}
                                            keyExtractor={(item) => item}
                                            scrollEnabled={true}
                                            nestedScrollEnabled={true}
                                            style={{ maxHeight: 200 }}
                                        />
                                    </View>
                                )}
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Description (Optional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Add notes..."
                                    placeholderTextColor="#999"
                                    value={newExpense.description}
                                    multiline
                                    numberOfLines={3}
                                    onChangeText={(text) => setNewExpense({ ...newExpense, description: text })}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleCreateExpense}
                                disabled={isCreatingExpense}
                            >
                                {isCreatingExpense ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save Expense</Text>
                                )}
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    backButton: {
        padding: 4,
        marginLeft: -4,
    },
    addButtonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 100,
        gap: 4,
    },
    addButtonHeaderText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EAF4FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    createButtonLarge: {
        backgroundColor: '#007BFF',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: "#007BFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    createButtonLargeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    errorIconContainer: {
        marginBottom: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#007BFF',
    },
    retryButtonText: {
        color: '#007BFF',
        fontWeight: '600',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        paddingBottom: 20,
    },
    modalHeaderBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    closeModalButton: {
        padding: 4,
        backgroundColor: '#f5f5f5',
        borderRadius: 50,
    },
    formScroll: {
        padding: 24,
    },
    formSection: {
        marginBottom: 24,
        alignItems: 'center',
        marginBottom: 32,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 8,
        width: '80%',
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
        marginRight: 8,
    },
    amountInput: {
        fontSize: 40,
        fontWeight: '700',
        color: '#1A1A1A',
        minWidth: 100,
        textAlign: 'center',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
        marginBottom: 8,
        marginLeft: 4,
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
    inputError: {
        borderColor: '#DC3545',
        backgroundColor: '#FEF2F2',
    },
    errorTextSmall: {
        color: '#DC3545',
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    inputText: {
        fontSize: 16,
        color: '#1A1A1A',
    },
    dropdownContainer: {
        marginTop: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        maxHeight: 200,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    categoryItemSelected: {
        backgroundColor: '#F0F7FF',
    },
    categoryText: {
        fontSize: 16,
        color: '#333333',
    },
    categoryTextSelected: {
        fontWeight: '600',
        color: '#007BFF',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ExpensesScreen;