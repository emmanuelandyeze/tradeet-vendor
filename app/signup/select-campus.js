import React, { useContext, useState } from 'react';
import {
	View,
	TextInput,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
	StyleSheet,
	ToastAndroid,
} from 'react-native';
import {
	useLocalSearchParams,
	useRouter,
} from 'expo-router';
import { AuthContext } from '@/context/AuthContext';

export default function CampusScreen() {
	const router = useRouter();
	const [selectedCampus, setSelectedCampus] = useState(''); // State for selected campus
	const [search, setSearch] = useState('');
	const [showModal, setShowModal] = useState(false);
	const [selectedUniversity, setSelectedUniversity] =
		useState('');
	const { phoneNumber } = useLocalSearchParams();
	const { completeCampusProfile } = useContext(AuthContext);

	// List of universities with multiple active
	const universities = [
		{ id: '1', name: 'Yabatech', active: true },
		{ id: '2', name: 'LUTH', active: true },
		{ id: '3', name: 'Unilag', active: true },
		{ id: '4', name: 'Uniben', active: false },
		{ id: '5', name: 'UNN', active: false },
		{ id: '6', name: 'OAU', active: false },
		// Add more universities here...
	];

	const handleNext = async () => {
		if (selectedCampus) {
			// Navigate to the home screen
			try {
				const profile = {
					phone: phoneNumber,
					campus: selectedCampus,
				};
				console.log(profile);

				const response = await completeCampusProfile(
					profile,
				);
				if (
					response.message === 'Profile setup completed'
				) {
					router.push('(tabs)');
					ToastAndroid.show(
						`Great job!`,
						ToastAndroid.LONG,
					);
					setLoading(false);
				} else {
					ToastAndroid.show(
						response.message,
						ToastAndroid.SHORT,
					);
					setLoading(false);
				}
			} catch (error) {
				ToastAndroid.show(
					'An error occurred. Please try again.',
					ToastAndroid.SHORT,
				);
				console.error('Error completing profile:', error);
				setLoading(false);
			}
		} else {
			alert('Please select a campus');
		}
	};

	const handleUniversityPress = (university) => {
		if (university.active) {
			setSelectedCampus(university.name); // Set selected campus if active
		} else {
			setSelectedUniversity(university.name);
			setShowModal(true); // Show modal for inactive campuses
		}
	};

	// Filter universities based on search
	const filteredUniversities = universities.filter((uni) =>
		uni.name.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>
				What Campus are you at?
			</Text>
			<TextInput
				value={search}
				onChangeText={setSearch}
				placeholder="Search for your campus"
				style={styles.searchInput}
			/>
			<Text style={styles.subtitle}>
				Select Your Campus
			</Text>

			<FlatList
				data={filteredUniversities}
				numColumns={2}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={[
							styles.campusButton,
							item.active
								? selectedCampus === item.name
									? styles.selectedCampus
									: styles.activeCampus
								: styles.inactiveCampus,
						]}
						onPress={() => handleUniversityPress(item)}
					>
						<Text
							style={[
								styles.campusText,
								item.active
									? selectedCampus === item.name
										? styles.selectedCampusText
										: styles.activeCampusText
									: styles.inactiveCampusText,
							]}
						>
							{item.name}
						</Text>
					</TouchableOpacity>
				)}
			/>

			<View style={styles.footer}>
				<TouchableOpacity
					onPress={handleNext}
					style={styles.continueButton}
				>
					<Text style={styles.continueButtonText}>
						Continue
					</Text>
				</TouchableOpacity>
			</View>

			{/* Modal for inactive campuses */}
			<Modal
				visible={showModal}
				transparent={true}
				animationType="slide"
			>
				<View style={styles.modalBackground}>
					<View style={styles.modalContent}>
						<Text style={styles.modalEmoji}>😥</Text>
						<Text style={styles.modalTitle}>
							We are currently working on bringing Tradeet
							to {selectedUniversity}
						</Text>
						<Text style={styles.modalSubtitle}>
							Become a Tradeet ambassador on your campus!
						</Text>

						<TouchableOpacity
							onPress={() => {
								setShowModal(false);
								// Handle 'Join Us Now' button action here
							}}
							style={styles.joinButton}
						>
							<Text style={styles.joinButtonText}>
								Join us now!
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setShowModal(false)}
							style={styles.closeButton}
						>
							<Text style={styles.closeButtonText}>x</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 16,
		paddingTop: 38,
	},
	title: {
		fontSize: 26,
		fontWeight: 'bold',
		marginBottom: 20,
	},
	searchInput: {
		borderWidth: 1,
		padding: 10,
		fontSize: 16,
		borderRadius: 8,
		marginBottom: 20,
	},
	subtitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	campusButton: {
		flex: 1,
		margin: 10,
		padding: 20,
		borderRadius: 8,
		borderWidth: 2,
		alignItems: 'center',
	},
	activeCampus: {
		borderColor: 'green',
	},
	selectedCampus: {
		borderColor: 'green',
		backgroundColor: 'green',
	},
	inactiveCampus: {
		borderColor: 'gray',
	},
	campusText: {
		fontSize: 16,
	},
	activeCampusText: {
		color: 'green',
	},
	selectedCampusText: {
		color: 'white',
	},
	inactiveCampusText: {
		color: 'gray',
	},
	footer: {
		alignItems: 'flex-end',
		marginTop: 20,
	},
	continueButton: {
		backgroundColor: 'green',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
	},
	continueButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold',
	},
	modalBackground: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		backgroundColor: 'white',
		padding: 30,
		borderRadius: 10,
		width: '80%',
		alignItems: 'center',
	},
	modalEmoji: {
		fontSize: 40,
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginVertical: 15,
		textAlign: 'center',
	},
	modalSubtitle: {
		fontSize: 18,
		textAlign: 'center',
		marginBottom: 20,
	},
	joinButton: {
		backgroundColor: 'green',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 8,
		marginBottom: 20,
	},
	joinButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold',
	},
	closeButton: {
		position: 'absolute',
		top: 10,
		right: 10,
	},
	closeButtonText: {
		color: 'red',
		fontSize: 28,
		fontWeight: 'bold',
	},
});
