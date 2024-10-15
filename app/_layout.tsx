import { Slot, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext'
import Toast from 'react-native-toast-message';

// Import your global CSS file
import "../global.css"

export default function Layout() {
	return (
		<AuthProvider>
			<Slot />
			<Toast />
		</AuthProvider>
	);
}
