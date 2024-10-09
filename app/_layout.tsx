import { Slot, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import your global CSS file
import "../global.css"

export default function Layout() {
	return (
		<View style={{ flex: 1 }}>
			<StatusBar
				backgroundColor="#fff"
				style="dark"
				translucent={true}
			/>
			<Slot />
		</View>
	);
}
