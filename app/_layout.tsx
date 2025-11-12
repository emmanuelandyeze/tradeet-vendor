import {
	Slot,
	Stack,
	Redirect,
	useRouter,
	usePathname,
} from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
	AuthProvider,
	AuthContext,
} from '@/context/AuthContext';
import { ProductsProvider } from '@/context/ProductsContext';
import Toast from 'react-native-toast-message';
import * as Linking from 'expo-linking';

import '../global.css';

// Import the specific font hook from expo-google-fonts
import { useFonts} from 'expo-font'; // useFonts is from expo-font, SplashScreen is also often imported from there
import {
	Inter_400Regular,
	Inter_500Medium,
	Inter_700Bold,
	Inter_800ExtraBold,
} from '@expo-google-fonts/inter'; // Import specific weights

import { useEffect, useCallback, useContext } from 'react';
import { SplashScreen } from 'expo-router';

// Prevent the splash screen from auto-hiding
// SplashScreen.preventAutoHideAsync();

export default function Layout() {
	// Use the Inter font hook
	// You list the specific font styles (weights) you want to load
	const [fontsLoaded, fontError] = useFonts({
		Inter_400Regular,
		Inter_500Medium, // Corresponds to 'Medium' weight
		Inter_700Bold, // Corresponds to 'Bold' weight
		Inter_800ExtraBold, // Corresponds to 'Extra Bold' weight
		// Add other weights if needed, e.g., Inter_300Light, Inter_600SemiBold
	});

	useEffect(() => {
		const url = Linking.createURL('');
		console.log('App URL scheme is:', url);
	}, []);

	const onLayoutRootView = useCallback(async () => {
		if (fontsLoaded || fontError) {
			await SplashScreen.hideAsync();
		}
	}, [fontsLoaded, fontError]);

	if (!fontsLoaded && !fontError) {
		return null; // Splash screen remains visible
	}

	if (fontError) {
		console.error('Error loading fonts:', fontError);
		return (
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<Text>Error loading app resources.</Text>
			</View>
		);
	}

	return (
		<View style={{ flex: 1 }} onLayout={onLayoutRootView}>
			<AuthProvider>
				<AuthWrapper>
					<ProductsProvider>
						<Slot />
						<Toast />
					</ProductsProvider>
				</AuthWrapper>
			</AuthProvider>
			<StatusBar style="auto" />
		</View>
	);
}

function AuthWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	const { isLoading, getRedirectPath } =
		useContext(AuthContext);
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (!isLoading) {
			const redirectPath = getRedirectPath();
			if (redirectPath && pathname !== redirectPath) {
				router.replace(redirectPath);
			} else if (
				!redirectPath &&
				!pathname.startsWith('/(app)')
			) {
				// Optional: If authenticated but not in the protected group, redirect to home
				router.replace('/(app)');
			}
		}
	}, [isLoading, router, getRedirectPath]);

	if (isLoading) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return children;
}
