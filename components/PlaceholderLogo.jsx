import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const PlaceholderLogo = ({ name }) => {

    const generateDarkColor = () => {
			const r = Math.floor(Math.random() * 128); // Red (0-127)
			const g = Math.floor(Math.random() * 128); // Green (0-127)
			const b = Math.floor(Math.random() * 128); // Blue (0-127)
			return `rgb(${r}, ${g}, ${b})`;
    };
    
	// Generate initials from the user's name
	const initials = name
		? name
				.split(' ')
				.slice(0, 2)
				.map((word) => word[0].toUpperCase())
				.join('')
		: '';

	const darkColor = generateDarkColor();

	return (
		<View
			style={{
				backgroundColor: 'green',
				height: 50,
				width: 50,
				borderRadius: 10,
				justifyContent: 'center',
				alignItems: 'center',
				elevation: 3,
				borderWidth: 1,
				borderColor: '#fff'
			}}
		>
			<Text
				style={{
					color: 'white',
					fontSize: 24,
					fontWeight: 'bold',
				}}
			>
				{initials}
			</Text>
		</View>
	);
};

export default PlaceholderLogo

const styles = StyleSheet.create({})