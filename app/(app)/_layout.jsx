import { Text } from 'react-native';
import { Redirect, Slot, Stack } from 'expo-router';
import { useContext, useEffect } from 'react';
import { AuthContext } from '@/context/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
// import { useLinkingContext } from 'expo-router/build/link/linking-context';
// import linking from '@/linking'

export default function AppLayout() {
    const { user, isLoading } = useContext(AuthContext);
    // const isLoading = true

	// You can keep the splash screen open, or render a loading screen like we do here.
	if (isLoading) {
		return <LoadingScreen />;
	}

	// Only require authentication within the (app) group's layout as users
	// need to be able to access the (auth) group and sign in again.
	if (!user) {
		// On web, static rendering will stop here as the user is not authenticated
		// in the headless Node process that the pages are rendered in.
		return <Redirect href="/signup" />;
	}

	

	// This layout can be deferred because it's not the root layout.
	return <Slot />;
}
