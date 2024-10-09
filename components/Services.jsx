import React from 'react';
import {
	View,
	TouchableOpacity,
	Text,
	Image,
	StyleSheet,
} from 'react-native';

const ServiceCard = ({
	icon,
	title,
	onPress,
	backgroundColor,
}) => {
	return (
		<TouchableOpacity
			onPress={onPress}
			style={[styles.card, { backgroundColor }]}
		>
			<View style={styles.cardContent}>
				<Image source={icon} style={styles.icon} />
				<Text style={styles.title}>{title}</Text>
			</View>
		</TouchableOpacity>
	);
};

export default function ServicesSection({ services }) {
	return (
		<View style={styles.container}>
			{services.map((service) => (
				<ServiceCard
					key={service.id}
					icon={service.icon}
					title={service.title}
					backgroundColor={service.backgroundColor} // Pass dynamic background color
					onPress={service.onPress}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	card: {
		borderRadius: 8,
		// shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.5,
		elevation: 1,
		height: 110,
		width: '30%',
		marginBottom: 16,
		padding: 10,
	},
	cardContent: {
		alignItems: 'center',
		justifyContent: 'center',
		height: '100%',
	},
	icon: {
		height: 60,
		width: '100%',
		resizeMode: 'contain', // Maintain aspect ratio
	},
	title: {
		color: 'black', // Equivalent to text-white
		fontSize: 16,
		fontWeight: 'normal',
		marginTop: 8,
		textAlign: 'center',
	},
});
