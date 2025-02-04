import { Slot, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext'
import {ProductsProvider}from '@/context/ProductsContext'
import Toast from 'react-native-toast-message';

// Import your global CSS file
import "../global.css"

export default function Layout() {
	return (
		<AuthProvider>
			<ProductsProvider>
				<Slot />
				<Toast />
			</ProductsProvider>
		</AuthProvider>
	);
}
