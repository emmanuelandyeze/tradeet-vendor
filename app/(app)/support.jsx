import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	FlatList,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	SafeAreaView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const SupportChatScreen = () => {
	const [message, setMessage] = useState('');
	const [chatMessages, setChatMessages] = useState([
		{
			id: '1',
			sender: 'support',
			text: 'Hello! How can I help you today?',
		},
		{
			id: '2',
			sender: 'user',
			text: 'I have a question about my order.',
		},
	]);

	const handleSendMessage = () => {
		if (message.trim()) {
			const newMessage = {
				id: (chatMessages.length + 1).toString(),
				sender: 'user',
				text: message,
			};
			setChatMessages([...chatMessages, newMessage]);
			setMessage('');
		}
	};

	const renderMessage = ({ item }) => (
		<View
			style={[
				styles.messageContainer,
				item.sender === 'user'
					? styles.userMessage
					: styles.supportMessage,
			]}
		>
			<Text
				style={[
					item.sender === 'user'
						? styles.userMessageText
						: styles.supportMessageText,
				]}
			>
				{item.text}
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				style={styles.inner}
				behavior={
					Platform.OS === 'ios' ? 'padding' : 'height'
				}
				keyboardVerticalOffset={50} // Adjust this value based on your bottom navigation height
			>
				<View style={styles.header}>
					<Text style={styles.headerText}>
						Support Chat
					</Text>
				</View>

				<FlatList
					data={chatMessages}
					renderItem={renderMessage}
					keyExtractor={(item) => item.id}
					// inverted // Display the latest messages at the bottom
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.chatList}
				/>

				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="Type your message..."
						value={message}
						onChangeText={setMessage}
					/>
					<TouchableOpacity
						style={styles.sendButton}
						onPress={handleSendMessage}
					>
						<Ionicons name="send" size={24} color="#fff" />
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f1f1f1',
		paddingTop: 20,
	},
	inner: {
		flex: 1,
		paddingBottom: 0, // Additional padding to prevent overlap with bottom navigation
	},
	header: {
		backgroundColor: '#fff',
		padding: 15,
		alignItems: 'center',
	},
	headerText: {
		color: '#000',
		fontSize: 20,
		fontWeight: 'bold',
	},
	chatList: {
		paddingBottom: 10,
		paddingHorizontal: 10,
		paddingTop: 10,
	},
	messageContainer: {
		maxWidth: '80%',
		padding: 10,
		borderRadius: 10,
		marginVertical: 5,
		paddingHorizontal: 10,
	},
	userMessage: {
		backgroundColor: 'green',
		alignSelf: 'flex-end',
		color: 'white',
	},
	supportMessage: {
		backgroundColor: '#fff',
		alignSelf: 'flex-start',
		borderColor: '#ccc',
		borderWidth: 1,
	},
	userMessageText: {
		color: '#fff',
	},
	supportMessageText: {
		color: '#333',
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#ccc',
	},
	input: {
		flex: 1,
		padding: 10,
		borderRadius: 20,
		backgroundColor: '#f1f1f1',
		marginRight: 10,
	},
	sendButton: {
		backgroundColor: 'green',
		padding: 10,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
});

export default SupportChatScreen;
