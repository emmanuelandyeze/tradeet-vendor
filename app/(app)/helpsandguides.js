import React, { useState } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	TextInput,
	StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HelpsAndGuidesScreen = () => {
	const [searchQuery, setSearchQuery] = useState('');
	const [activeSection, setActiveSection] = useState(null);

	const helpSections = [
		{
			title: 'Getting Started',
			icon: 'person-circle-outline',
			topics: [
				{
					question: 'How do I sign up for an account?',
					answer:
						'Open the app, tap "Sign Up," enter your details, and verify your email or phone number.',
				},
				{
					question: 'What if I forget my password?',
					answer:
						'Tap "Forgot Password" on the login screen, and follow the instructions to reset it.',
				},
				{
					question: 'How do I upgrade my subscription?',
					answer:
						'Go to "Settings" > "Subscription" and follow the prompts for payment.',
				},
			],
		},
		{
			title: 'Managing Your Store',
			icon: 'storefront-outline',
			topics: [
				{
					question: 'How do I add a product?',
					answer:
						'Go to "Products" > "Add Product," fill in details, and add photos.',
				},
				{
					question: 'How can I edit product details?',
					answer:
						'Go to "Products," select the product, and tap "Edit" to update info.',
				},
				{
					question: 'How can I track inventory levels?',
					answer:
						'Go to "Inventory" > "Manage Stock" to view current stock levels and receive low-stock alerts.',
				},
			],
		},
		{
			title: 'Handling Orders',
			icon: 'receipt-outline',
			topics: [
				{
					question: 'How do I view recent orders?',
					answer:
						'Open the "Orders" tab to see a list of all pending, completed, and canceled orders.',
				},
				{
					question:
						'How do I update the status of an order?',
					answer:
						'Select an order, tap "Update Status," and choose the appropriate status: "Processing," "Shipped," or "Completed".',
				},
				{
					question:
						'How can I enable real-time tracking for orders?',
					answer:
						'Go to "Settings" > "Order Tracking" to enable tracking for Pro plan users.',
				},
			],
		},
		{
			title: 'Payment & Billing',
			icon: 'cash-outline',
			topics: [
				{
					question:
						'What payment options are available for customers?',
					answer:
						'Tradeet supports bank transfers, card payments, and cash on delivery. Enable preferred methods under "Settings" > "Payment Options".',
				},
				{
					question:
						'How do I view and manage my subscription payments?',
					answer:
						'Go to "Settings" > "Subscription" > "Manage Billing" to view transaction history or set up auto-renewal.',
				},
				{
					question: 'How do I handle refunds?',
					answer:
						'Open "Orders," select the relevant order, and tap "Issue Refund".',
				},
			],
		},
		{
			title: 'Marketing & Customer Engagement',
			icon: 'megaphone-outline',
			topics: [
				{
					question: 'How can I create a discount code?',
					answer:
						'Go to "Marketing" > "Discounts," tap "Create New," set discount amount, expiration date, and applicable products.',
				},
				{
					question:
						'How do I enable WhatsApp for my store?',
					answer:
						'Go to "Settings" > "Communication" > "WhatsApp," enter your business number, and enable integration.',
				},
				{
					question: 'How do I manage customer reviews?',
					answer:
						'Open "Reviews" to view all feedback. You can flag inappropriate reviews if necessary.',
				},
			],
		},
		{
			title: 'Analytics and Reporting',
			icon: 'analytics-outline',
			topics: [
				{
					question:
						'What insights does the sales dashboard provide?',
					answer:
						'View total sales, top-selling products, customer demographics, and revenue growth by day, week, or month.',
				},
				{
					question:
						'How do I track individual product performance?',
					answer:
						'Go to "Analytics" > "Product Performance" for sales per product and engagement levels.',
				},
				{
					question:
						'How do I view website traffic sources?',
					answer:
						'In "Analytics" > "Traffic," Pro users can see customer sources like social media, search engines, and direct visits.',
				},
			],
		},
		{
			title: 'Account Settings & Security',
			icon: 'settings-outline',
			topics: [
				{
					question:
						'How can I update my profile information?',
					answer:
						'Go to "Account" > "Profile," and edit personal information, contact details, and business name.',
				},
				{
					question: 'How do I change my password?',
					answer:
						'Under "Account" > "Security," tap "Change Password," enter the current and new password, and save.',
				},
				{
					question:
						'How do I set up two-factor authentication?',
					answer:
						'Go to "Account" > "Security," enable two-factor authentication, and follow the prompts.',
				},
			],
		},
	];

	const toggleSection = (section) => {
		setActiveSection(
			activeSection === section ? null : section,
		);
	};

	return (
		<View style={styles.container}>
			<TextInput
				style={styles.searchBar}
				placeholder="Search guides..."
				value={searchQuery}
				onChangeText={(text) => setSearchQuery(text)}
			/>

			<ScrollView style={styles.content}>
				{helpSections.map((section, index) => (
					<View key={index}>
						<TouchableOpacity
							style={styles.sectionHeader}
							onPress={() => toggleSection(index)}
						>
							<Ionicons
								name={section.icon}
								size={24}
								color="#4CAF50"
							/>
							<Text style={styles.sectionTitle}>
								{section.title}
							</Text>
							<Ionicons
								name={
									activeSection === index
										? 'chevron-up'
										: 'chevron-down'
								}
								size={24}
								color="#777"
							/>
						</TouchableOpacity>

						{!activeSection !== index && (
							<View style={styles.sectionContent}>
								{section.topics.map((topic, idx) => (
									<View key={idx} style={styles.topic}>
										<Text style={styles.question}>
											{topic.question}
										</Text>
										<Text style={styles.answer}>
											{topic.answer}
										</Text>
									</View>
								))}
							</View>
						)}
					</View>
				))}
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		paddingHorizontal: 10,
		paddingTop: 26,
	},
	searchBar: {
		backgroundColor: '#fff',
		padding: 10,
		borderRadius: 10,
		marginVertical: 10,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	content: {
		marginTop: 10,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 15,
		backgroundColor: '#ffffff',
		borderRadius: 8,
		marginBottom: 10,
		elevation: 1,
	},
	sectionTitle: {
		flex: 1,
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginLeft: 10,
	},
	sectionContent: {
		paddingVertical: 10,
		paddingHorizontal: 15,
		backgroundColor: '#fafafa',
		borderRadius: 8,
		marginBottom: 15,
	},
	topic: {
		marginBottom: 12,
	},
	question: {
		fontSize: 16,
		fontWeight: '500',
		color: '#333',
	},
	answer: {
		fontSize: 14,
		color: '#555',
		marginTop: 5,
	},
});

export default HelpsAndGuidesScreen;
