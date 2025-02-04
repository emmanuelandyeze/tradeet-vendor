// socket.js
import { io } from 'socket.io-client';

// Create the socket connection and export it
const socket = io('http://192.168.1.159:5000'); // Use your server's WebSocket URL

// Handle events you want to listen to at a global level
socket.on('connect', () => {
	console.log('Connected to server with ID:', socket.id);
});

socket.on('disconnect', () => {
	console.log('Disconnected from server');
});

// Export the socket so it can be used in other components
export default socket;
