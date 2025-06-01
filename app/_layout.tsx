import { Slot, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { ProductsProvider } from '@/context/ProductsContext';
import Toast from 'react-native-toast-message';
import * as Linking from 'expo-linking';

// Import your global CSS file
import '../global.css';
import { useEffect } from 'react';

export default function Layout() {
	useEffect(() => {
		const url = Linking.createURL(''); // Should print tradeet://
		console.log('App URL scheme is:', url);
	}, []);
	return (
		<AuthProvider>
			<ProductsProvider>
				<Slot />
				<Toast />
			</ProductsProvider>
		</AuthProvider>
	);
}
