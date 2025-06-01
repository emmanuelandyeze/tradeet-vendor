import { Tabs } from 'expo-router';
import React, { useState } from 'react';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import LoadingScreen from '@/components/LoadingScreen';

export default function TabLayout() {
	const colorScheme = useColorScheme();
	const [loading, setLoading] = useState(false);

	if (loading) return <LoadingScreen />;

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor:
					Colors[colorScheme ?? 'light'].tint,
				headerShown: false,
				tabBarShowLabel: true,
				tabBarStyle: {
					paddingBottom: 20,
					height: 74,
					paddingTop: 10,
					backgroundColor: '#fff',
				},
				tabBarLabelStyle: {
					fontSize: 12,
					marginTop: 10,
					fontWeight: 'bold',
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Home',
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={focused ? 'home' : 'home-outline'}
							color={color}
							size={24}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="orders"
				options={{
					title: 'Orders',
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={
								focused ? 'newspaper' : 'newspaper-outline'
							}
							color={color}
							size={24}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="products"
				options={{
					title: 'Catalogue',
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={
								focused
									? 'file-tray-stacked'
									: 'file-tray-stacked-outline'
							}
							color={color}
							size={24}
						/>
					),
				}}
			/>

			<Tabs.Screen
				name="settings"
				options={{
					title: 'Settings',
					tabBarIcon: ({ color, focused }) => (
						<TabBarIcon
							name={
								focused ? 'settings' : 'settings-outline'
							}
							color={color}
							size={24}
						/>
					),
				}}
			/>
		</Tabs>
	);
}
