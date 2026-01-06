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

    // Filter & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

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
                businessId: storeId,
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
                <Ionicons name="checkmark-circle" size={20} color="#065637" />
            )}
        </TouchableOpacity>
    );

    const filteredExpenses = expenses.filter(exp => {
        const matchesSearch = (exp.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (exp.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || exp.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const filterOptions = ['All', ...categories];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header Section */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.push('/(tabs)')}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Expenses</Text>
                    <TouchableOpacity
                        style={styles.createButtonHeader}
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
                        <Text style={styles.createButtonText}>Add Expense</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filter Section */}
            <View style={styles.filterSection}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search expenses..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {filterOptions.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
                            onPress={() => setCategoryFilter(cat)}
                        >
                            <Text style={[styles.filterText, categoryFilter === cat && styles.filterTextActive]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Main Content Area */}
            {expensesLoading ? (
                <View style={[styles.centerContainer, { marginTop: 40 }]}>
                    <ActivityIndicator size="large" color="#065637" />
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchExpenses}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : filteredExpenses.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
                    </View>
                    <Text style={styles.emptyTitle}>No Expenses Found</Text>
                    <Text style={styles.emptySubtitle}>
                        {searchQuery ? "Try adjusting your search or filters." : "Record your business expenses to track your spending."}
                    </Text>
                    {!searchQuery && (
                        <TouchableOpacity
                            style={styles.createButtonLarge}
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
                            <Text style={styles.createButtonLargeText}>Record Expense</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <ExpenseTable
                    expenses={filteredExpenses}
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
                                    placeholderTextColor="#9CA3AF"
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
                                    placeholderTextColor="#9CA3AF"
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
        paddingTop: Platform.OS === 'android' ? 30 : 40,
        backgroundColor: '#F9FAFB',
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    createButtonHeader: {
        backgroundColor: '#065637',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },

    // Filters
    filterSection: {
        backgroundColor: '#fff',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        marginHorizontal: 16,
        marginTop: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        height: 40,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
        height: '100%',
    },
    filterScroll: {
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterChipActive: {
        backgroundColor: '#ECFDF5',
        borderColor: '#10B981',
    },
    filterText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#059669',
        fontWeight: '600',
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
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    createButtonLarge: {
        backgroundColor: '#065637',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%',
    },
    createButtonLargeText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2563EB',
    },
    retryButtonText: {
        color: '#2563EB',
        fontWeight: '600',
    },

    // Modal
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
        color: '#111827',
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
        color: '#1F2937',
        minWidth: 100,
        textAlign: 'center',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: '#111827',
    },
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    errorTextSmall: {
        color: '#EF4444',
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
        fontSize: 15,
        color: '#111827',
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
        backgroundColor: '#ECFDF5',
    },
    categoryText: {
        fontSize: 15,
        color: '#1F2937',
    },
    categoryTextSelected: {
        fontWeight: '600',
        color: '#059669',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#065637',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ExpensesScreen;