import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

export default function LoadingScreen() {
	// Create a reference for the animated value
	const pulseValue = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		// Loop the pulse animation
		Animated.loop(
			Animated.sequence([
				Animated.timing(pulseValue, {
					toValue: 1.2, // Scale up
					duration: 500,
					useNativeDriver: true,
				}),
				Animated.timing(pulseValue, {
					toValue: 1, // Scale back to original size
					duration: 500,
					useNativeDriver: true,
				}),
			]),
		).start();
	}, [pulseValue]);

	return (
		<View className="flex-1 justify-center items-center bg-white">
			<Animated.View
				style={{
					transform: [{ scale: pulseValue }],
				}}
			>
				<Animated.Image
					source={require('../assets/images/icon.png')} // Your spinner image path
					style={{
						width: 50,
						height: 50,
                        transform: [{ scale: pulseValue }],
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        borderRadius: 50,
                        padding: 10,
                        justifyContent: 'center',
                        alignItems: 'center',
                        elevation: 5,
                    
					}}
				/>
			</Animated.View>
			<Text className="text-lg font-bold mt-8">
				Loading, please wait...
			</Text>
		</View>
	);
}
