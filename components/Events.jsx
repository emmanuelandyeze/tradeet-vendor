import React from 'react';
import {
	View,
	Text,
	Image,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';

const EventCard = ({
	image,
	name,
	location,
	time,
	onRegister,
}) => {
	return (
		<View style={styles.card}>
			<Image source={{ uri: image }} style={styles.image} />
			<View style={styles.detailsContainer}>
				<Text style={styles.name}>{name}</Text>
				<Text style={styles.location}>📍 {location}</Text>
				<Text style={styles.time}>🕒 {time}</Text>
				<TouchableOpacity
					style={styles.button}
					onPress={onRegister}
				>
					<Text style={styles.buttonText}>
						Register / Buy Ticket
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default function EventsSection({ events }) {
	return (
        <View style={styles.container}>
            <View>
                <Text style={{fontSize: 22, marginBottom: 10, fontWeight: 'bold'}}>Upcoming events near you</Text>
            </View>
			{events.map((event) => (
				<EventCard
					key={event.id}
					image={event.image}
					name={event.name}
					location={event.location}
					time={event.time}
					onRegister={event.onRegister}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		marginBottom: 16,
	},
	image: {
		width: '100%',
		height: 150,
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
		resizeMode: 'cover',
	},
	detailsContainer: {
		padding: 12,
	},
	name: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 4,
	},
	location: {
		fontSize: 14,
		color: '#666',
		marginBottom: 2,
	},
	time: {
		fontSize: 14,
		color: '#666',
		marginBottom: 10,
	},
	button: {
		backgroundColor: '#1E90FF',
		paddingVertical: 10,
		borderRadius: 6,
		alignItems: 'center',
		marginTop: 10,
	},
	buttonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: 'bold',
	},
});
