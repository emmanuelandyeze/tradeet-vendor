import {
	Slot,
	Stack,
	Redirect,
	useRouter,
	usePathname,
	useSegments,
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
import { useFonts } from 'expo-font'; // useFonts is from expo-font, SplashScreen is also often imported from there
import {
	HankenGrotesk_400Regular,
	HankenGrotesk_500Medium,
	HankenGrotesk_700Bold,
	HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk'; // Import specific weights

import { useEffect, useCallback, useContext } from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function Layout() {
	// Use the Inter font hook
	// You list the specific font styles (weights) you want to load
	const [fontsLoaded, fontError] = useFonts({
		HankenGrotesk_400Regular,
		HankenGrotesk_500Medium, // Corresponds to 'Medium' weight
		HankenGrotesk_700Bold, // Corresponds to 'Bold' weight
		HankenGrotesk_800ExtraBold, // Corresponds to 'Extra Bold' weight
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
						<Stack screenOptions={{ headerShown: false }} />
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
	const segments = useSegments();

	useEffect(() => {
		if (!isLoading) {
			const redirectPath = getRedirectPath();
			const inAuthGroup = segments[0] === '(app)';

			// Define public routes that don't require authentication
			const isPublicRoute =
				pathname === '/login' ||
				pathname.startsWith('/signup') ||
				pathname.startsWith('/forgot-password');

			if (redirectPath === '/login') {
				// User is not logged in
				// Only redirect to login if they are attempting to access a protected route (not public)
				if (!isPublicRoute) {
					router.replace('/login');
				}
			} else if (redirectPath && pathname !== redirectPath) {
				// User is logged in but needs to complete profile (e.g. /signup/business-name)
				router.replace(redirectPath);
			} else if (!redirectPath && !inAuthGroup) {
				// User is fully authenticated but not in the protected group, redirect to home
				// Also prevent redirect if they are explicitly navigating to public routes (optional, but good for UX if they want to logout/switch)
				// For now, we enforce redirect to '/' if they are authorized
				router.replace('/');
			}
		}
	}, [isLoading, router, getRedirectPath, segments, pathname]);

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
