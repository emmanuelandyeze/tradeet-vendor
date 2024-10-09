import React from 'react';
import { View, Text, TextInput, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Header ({
	profileImage,
	campus,
	onSearch,
	name
}) {
	return (
		<View
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'flex-start',
				paddingTop: 45,
				paddingBottom: 15,
				paddingLeft: 20,
				paddingRight: 20,
				backgroundColor: '#fff',
				flexDirection: 'row',
				zIndex: 100,
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
			}}
		>
			<View className="flex flex-row gap-2">
				<Image
					source={{ uri: profileImage }}
					className="w-10 h-10 rounded-full"
					style={{
						marginBottom: 4,
						resizeMode: 'contain',
						height: 50,
						width: 50,
						borderRadius: 50
					}}
				/>
				<View className="flex flex-col gap-1 items-start">
					<View>
						<Text className="text-xl font-bold">
							Welcome back, {name}
						</Text>
					</View>
					<View className="flex flex-row gap-1 items-center">
						<Ionicons
							name="location-outline"
							size={16}
							color="gray"
						/>
						<Text style={{color: 'gray'}} className="text-lg text-gray-200 font-bold">
							{campus}
						</Text>
					</View>
				</View>
			</View>
			<View>
				<Ionicons
					name="notifications-outline"
					size={24}
					color="gray"
				/>
			</View>
		</View>
	);
};
