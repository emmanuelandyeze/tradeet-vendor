import { Stack } from 'expo-router';

export default function CustomersLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="new" options={{ headerShown: false, presentation: 'modal' }} />
			<Stack.Screen name="[id]" options={{ headerShown: false }} />
		</Stack>
	);
}
