import { Tabs } from 'expo-router';
import React, { useState } from 'react';

import { AnimatedTabIcon } from '@/components/navigation/AnimatedTabIcon';
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
				tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
				headerShown: false,
				tabBarShowLabel: true,
				tabBarHideOnKeyboard: true,
				tabBarStyle: {
					backgroundColor: '#ffffff',
					height: 84, // Taller for modern feel + home indicator
					paddingBottom: 24, // Safe area spacing
					paddingTop: 12,
					borderTopWidth: 0,
					elevation: 8, // Soft shadow for separation
					shadowColor: '#000',
					shadowOffset: {
						width: 0,
						height: -2, // Shadow moves UP for docked bar
					},
					shadowOpacity: 0.05,
					shadowRadius: 10,
				},
				tabBarLabelStyle: {
					fontSize: 10,
					fontWeight: '600',
					marginBottom: 0,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Home',
					tabBarIcon: ({ color, focused }) => (
						<AnimatedTabIcon
							name={focused ? 'home' : 'home-outline'}
							color={color}
							size={24}
							focused={focused}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="orders"
				options={{
					title: 'Orders',
					tabBarIcon: ({ color, focused }) => (
						<AnimatedTabIcon
							name={
								focused ? 'file-tray-full' : 'file-tray-full-outline'
							}
							color={color}
							size={24}
							focused={focused}
						/>
					),
				}}
			/>
			{/* <Tabs.Screen
				name="customers"
				options={{
					title: 'Customers',
					tabBarIcon: ({ color, focused }) => (
						<AnimatedTabIcon
							name={
								focused ? 'people' : 'people-outline'
							}
							color={color}
							size={22}
                            focused={focused}
						/>
					),
				}}
			/> */}
			<Tabs.Screen
				name="products"
				options={{
					title: 'Catalogue',
					tabBarIcon: ({ color, focused }) => (
						<AnimatedTabIcon
							name={
								focused
									? 'cube'
									: 'cube-outline'
							}
							color={color}
							size={24}
							focused={focused}
						/>
					),
				}}
			/>

			<Tabs.Screen
				name="marketing"
				options={{
					title: 'Marketing',
					tabBarIcon: ({ color, focused }) => (
						<AnimatedTabIcon
							name={
								focused ? 'megaphone' : 'megaphone-outline'
							}
							color={color}
							size={24}
							focused={focused}
						/>
					),
				}}
			/>

			<Tabs.Screen
				name="settings"
				options={{
					title: 'More',
					tabBarIcon: ({ color, focused }) => (
						<AnimatedTabIcon
							name={
								focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline'
							}
							color={color}
							size={24}
							focused={focused}
						/>
					),
				}}
			/>
		</Tabs>
	);
}
