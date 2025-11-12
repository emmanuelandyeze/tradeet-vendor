import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const categories = [
  'Fashion & Accessories',
  'Electronics & Gadgets',
  'Foodstuff / Grocery Stores',
  'Cosmetics & Skincare',
  'Furniture & Home Decor',
  'General Merchandise',
  'Restaurants & Eateries',
  'Home Cooking / Meal Delivery',
  'Snacks & Pastries',
  'Smoothies & Drinks',
  'Catering Services',
  'Salons & Barbershops',
  'Makeup Artists (MUAs)',
  'Skincare Clinics',
  'Spa & Wellness',
  'Cleaning Services',
  'Plumbing & Repairs',
  'Electrical Services',
  'Event Planning & Rentals',
  'Photography & Videography',
  'Tailoring & Fashion Design',
  'Graphic Design',
  'Web & App Development',
  'Content Creation',
  'Social Media Management',
  'Copywriting',
  'Virtual Assistant',
  'Parcel Delivery',
  'Errand Services',
  'Dispatch Rider Network',
  'Tutors & Home Lessons',
  'Skill Training',
  'Online Courses / Digital Products',
  'Pharmacies',
  'Fitness Coaches / Gyms',
  'Herbal Remedies',
  'Health Food Sellers',
  'POS Operators',
  'Cooperatives / Esusu',
  'Microloan / Credit',
  'Investment / Savings',
  'Handmade Jewelry',
  'Artisans (Woodwork, Pottery)',
  'Gift Boxes / Custom Gifts',
  'DIY Creators',
  'Poultry & Livestock',
  'Fresh Farm Produce',
  'Agro Processing',
  'Agricultural Tools',
];

const CategoryDropdown = ({ selectedCategory, setSelectedCategory }) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={{ margin: 0 }}>
      {/* <Text style={styles.label}>Business Category</Text> */}

      <Pressable
        onPress={() => setModalVisible(true)}
        style={styles.dropdown}
      >
        <Text style={styles.dropdownText}>
          {selectedCategory || 'Choose a category'}
        </Text>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select Business Category</Text>

          <FlatList
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(item);
                  setModalVisible(false);
                }}
                style={styles.categoryItem}
              >
                <Text style={styles.categoryText}>{item}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
          />

          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default CategoryDropdown;

const styles = StyleSheet.create({
  label: {
    marginBottom: 5,
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#f9f9f9',
  },
  dropdownText: {
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  categoryItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  categoryText: {
    fontSize: 16,
    color: '#222',
  },
  closeButton: {
    marginTop: 20,
    alignSelf: 'center',
    padding: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
