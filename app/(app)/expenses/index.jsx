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
    ActivityIndicator, // Make sure this is imported
    KeyboardAvoidingView, // Added for better keyboard handling
    Platform // To check OS for KeyboardAvoidingView behavior
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import axiosInstance from '@/utils/axiosInstance';
// Assuming ExpenseTable is a component you have, or will create
import ExpenseTable from '../../../components/ExpenseTable';

const ExpensesScreen = () => {
    const { userInfo } = useContext(AuthContext);
    const router = useRouter();

    const [expenses, setExpenses] = useState([]);
    const [expensesLoading, setExpensesLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [isCreatingExpense, setIsCreatingExpense] = useState(false);
    const [error, setError] = useState(null);

    const [newExpense, setNewExpense] = useState({
        title: '',
        category: 'Inventory', // Default category
        amount: '',
        description: '',
    });

    // State for input validation errors
    const [validationErrors, setValidationErrors] = useState({});

    const businessId = userInfo?._id;

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
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        setExpensesLoading(true);
        setError(null);
        try {
            const response = await axiosInstance.get(`/expenses/${userInfo?._id}`);
            setExpenses(response.data.expenses);
        } catch (err) {
            console.error('Error fetching expenses:', err);
            setError(err.message || 'Failed to fetch expenses. Please try again.');
        } finally {
            setExpensesLoading(false);
        }
    };

    const validateForm = () => {
        let errors = {};
        let isValid = true;

        if (!newExpense.title.trim()) {
            errors.title = 'Expense name is required.';
            isValid = false;
        }
        if (!newExpense.category || newExpense.category === 'Select Category') { // Added check for default placeholder
            errors.category = 'Category is required.';
            isValid = false;
        }
        if (!newExpense.amount.trim()) {
            errors.amount = 'Amount is required.';
            isValid = false;
        } else if (isNaN(Number(newExpense.amount)) || Number(newExpense.amount) <= 0) {
            errors.amount = 'Please enter a valid amount (must be a positive number).';
            isValid = false;
        }

        setValidationErrors(errors);
        return isValid;
    };

    const handleCreateExpense = async () => {
        if (!validateForm()) {
            ToastAndroid.show('Please correct the errors in the form.', ToastAndroid.LONG);
            return;
        }

        setIsCreatingExpense(true);
        try {
            await axiosInstance.post('/expenses/create', {
                ...newExpense,
                amount: Number(newExpense.amount),
                businessId,
            });
            ToastAndroid.show('Expense recorded successfully!', ToastAndroid.SHORT);
            fetchExpenses();
            setNewExpense({
                title: '',
                category: 'Inventory', // Reset to a sensible default or empty
                amount: '',
                description: '',
            });
            setValidationErrors({}); // Clear validation errors on success
            setModalVisible(false);
        } catch (error) {
            console.error('Error creating expense:', error);
            ToastAndroid.show('Failed to record expense. Please try again.', ToastAndroid.LONG);
        } finally {
            setIsCreatingExpense(false);
        }
    };

    const renderCategoryItem = ({ item }) => (
        <TouchableOpacity
            style={styles.categoryItem}
            onPress={() => {
                setNewExpense({ ...newExpense, category: item });
                setCategoryDropdownVisible(false);
                setValidationErrors(prev => ({ ...prev, category: undefined })); // Clear category error
            }}
        >
            <Text style={styles.categoryText}>{item}</Text>
            {newExpense.category === item && (
                <Ionicons name="checkmark-circle" size={20} color="#007BFF" />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Expenses</Text>
                {expenses?.length > 0 && (
                    <TouchableOpacity
                        style={styles.recordExpenseHeaderButton}
                        onPress={() => {
                            setNewExpense({
                                title: '',
                                category: 'Inventory',
                                amount: '',
                                description: '',
                            });
                            setValidationErrors({}); // Clear errors when opening
                            setModalVisible(true);
                        }}
                    >
                        <Text style={styles.recordExpenseHeaderText}>Record Expense</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Main Content Area */}
            {expensesLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                    <Text style={styles.loadingText}>Loading Expenses...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={30} color="#DC3545" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchExpenses}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : expenses.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <Ionicons name="cash-outline" size={80} color="#CCC" />
                    <Text style={styles.emptyStateText}>No expenses recorded yet.</Text>
                    <Text style={styles.emptyStateSubtitle}>
                        Start by adding your first business expense.
                    </Text>
                    <TouchableOpacity
                        style={styles.createExpenseButton}
                        onPress={() => {
                            setNewExpense({
                                title: '',
                                category: 'Inventory',
                                amount: '',
                                description: '',
                            });
                            setValidationErrors({}); // Clear errors when opening
                            setModalVisible(true);
                        }}
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.createExpenseButtonText}>Record New Expense</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ExpenseTable
                    expenses={expenses}
                    userInfo={userInfo}
                    fetchExpenses={fetchExpenses}
                />
            )}

            {/* Record Expense Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide" // Keeping slide as requested, but fade also works well
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.keyboardAvoidingContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Record New Expense</Text>
                                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                                        <Ionicons name="close-circle" size={30} color="#999" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Expense Name</Text>
                                    <TextInput
                                        style={[styles.input, validationErrors.title && styles.inputError]}
                                        placeholder="e.g., Office Supplies"
                                        placeholderTextColor="#A0A0A0"
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

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Category</Text>
                                    <TouchableOpacity
                                        style={[styles.dropdownButton, validationErrors.category && styles.inputError]}
                                        onPress={() =>
                                            setCategoryDropdownVisible(!categoryDropdownVisible)
                                        }
                                    >
                                        <Text style={[
                                            styles.dropdownButtonText,
                                            newExpense.category === 'Select Category' && { color: '#A0A0A0' } // Placeholder style
                                        ]}>
                                            {newExpense.category || 'Select Category'}
                                        </Text>
                                        <Feather
                                            name={categoryDropdownVisible ? "chevron-up" : "chevron-down"}
                                            size={20}
                                            color="#777"
                                        />
                                    </TouchableOpacity>
                                    {validationErrors.category && (
                                        <Text style={styles.errorTextSmall}>{validationErrors.category}</Text>
                                    )}
                                    {categoryDropdownVisible && (
                                        <FlatList
                                            data={categories}
                                            renderItem={renderCategoryItem}
                                            keyExtractor={(item) => item}
                                            style={styles.dropdownList}
                                            nestedScrollEnabled={true} // Important for scrollable FlatList inside ScrollView
                                        />
                                    )}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Amount (NGN)</Text>
                                    <TextInput
                                        style={[styles.input, validationErrors.amount && styles.inputError]}
                                        placeholder="e.g., 5000.00"
                                        placeholderTextColor="#A0A0A0"
                                        value={newExpense.amount}
                                        onChangeText={(text) => {
                                            setNewExpense({ ...newExpense, amount: text.replace(/[^0-9.]/g, '') });
                                            setValidationErrors(prev => ({ ...prev, amount: undefined }));
                                        }}
                                        keyboardType="numeric"
                                    />
                                    {validationErrors.amount && (
                                        <Text style={styles.errorTextSmall}>{validationErrors.amount}</Text>
                                    )}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Description (Optional)</Text>
                                    <TextInput
                                        style={[styles.input, styles.descriptionInput]}
                                        placeholder="Brief details about the expense, e.g., Purchase for Q3 inventory"
                                        placeholderTextColor="#A0A0A0"
                                        value={newExpense.description}
                                        onChangeText={(text) =>
                                            setNewExpense({ ...newExpense, description: text })
                                        }
                                        multiline
                                        numberOfLines={4}
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleCreateExpense}
                                    style={styles.submitButton}
                                    disabled={isCreatingExpense}
                                >
                                    {isCreatingExpense ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Record Expense</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
        padding: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 45,
        paddingBottom: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBEB',
    },
    backButton: {
        padding: 5,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#2C3E50',
        flex: 1,
    },
    recordExpenseHeaderButton: {
        backgroundColor: '#007BFF',
        paddingVertical: 9,
        paddingHorizontal: 18,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordExpenseHeaderText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#6C757D',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#DC3545',
        textAlign: 'center',
        marginBottom: 15,
    },
    retryButton: {
        backgroundColor: '#007BFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        // backgroundColor: '#FFFFFF',
        // borderRadius: 15,
        // margin: 20,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 5 },
        // shadowOpacity: 0.05,
        // shadowRadius: 10,
        // elevation: 3,
    },
    emptyStateText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#34495E',
        marginTop: 20,
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        fontSize: 16,
        color: '#7F8C8D',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
    },
    createExpenseButton: {
        backgroundColor: '#28A745',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
    },
    createExpenseButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },

    // --- Modal Specific Styles ---
    keyboardAvoidingContainer: {
        flex: 1,
        justifyContent: 'center', // Center content vertically
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Slightly lighter overlay
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        padding: 25,
        borderRadius: 15, // Slightly less rounded for a crisp look
        width: '90%',
        maxHeight: '80%', // Reduced max height to prevent over-stretching on larger screens
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 }, // Adjusted shadow
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20, // Slightly less space
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5', // Lighter separator
    },
    modalTitle: {
        fontSize: 24, // Slightly smaller title font for better fit
        fontWeight: '700',
        color: '#2C3E50',
    },
    inputGroup: {
        marginBottom: 18, // Adjusted spacing
    },
    inputLabel: {
        fontSize: 16, // Adjusted label font size
        fontWeight: '600',
        color: '#34495E',
        marginBottom: 6, // Reduced space below label
    },
    input: {
        borderWidth: 1,
        borderColor: '#D8DCE6',
        borderRadius: 10, // Slightly less rounded inputs
        padding: 14, // Adjusted padding
        fontSize: 15, // Adjusted font size
        color: '#333333',
        backgroundColor: '#FFFFFF', // Pure white background for inputs
        elevation: 1, // Subtle shadow for inputs
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    inputError: {
        borderColor: '#E74C3C',
        borderWidth: 2,
    },
    errorTextSmall: {
        color: '#E74C3C',
        fontSize: 12, // Slightly smaller error text
        marginTop: 4,
        marginLeft: 5,
    },
    descriptionInput: {
        minHeight: 90, // Adjusted height
        textAlignVertical: 'top',
        lineHeight: 20,
    },
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D8DCE6',
        borderRadius: 10,
        padding: 14,
        backgroundColor: '#FFFFFF',
        elevation: 1, // Subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    dropdownButtonText: {
        fontSize: 15,
        color: '#333333',
        flex: 1,
    },
    dropdownList: {
        borderWidth: 1,
        borderColor: '#D8DCE6',
        borderRadius: 10,
        maxHeight: 180, // Adjusted max height
        backgroundColor: '#FFFFFF',
        marginTop: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    categoryItem: {
        padding: 14, // Adjusted padding
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0', // Slightly more visible separator
        flexDirection: 'row', // Align checkmark
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryText: {
        fontSize: 15,
        color: '#333333',
    },
    submitButton: {
        backgroundColor: '#007BFF',
        paddingVertical: 15, // Adjusted padding
        borderRadius: 10, // Adjusted border radius
        alignItems: 'center',
        marginTop: 20, // Adjusted margin
        shadowColor: '#007BFF',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.25, // Adjusted shadow
        shadowRadius: 8,
        elevation: 8,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});

export default ExpensesScreen;