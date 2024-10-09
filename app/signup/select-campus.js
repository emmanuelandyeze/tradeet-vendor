import React, { useState } from 'react';
import {
	View,
	TextInput,
	Button,
	Text,
	FlatList,
	TouchableOpacity,
	Modal,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function CampusScreen() {
	const router = useRouter();
	const [selectedCampus, setSelectedCampus] = useState(''); // State for selected campus
	const [search, setSearch] = useState('');
	const [showModal, setShowModal] = useState(false);
	const [selectedUniversity, setSelectedUniversity] =
		useState('');

	// List of universities with multiple active
	const universities = [
		{ id: '1', name: 'Yabatech', active: true },
		{ id: '2', name: 'Unilag', active: false },
		{ id: '3', name: 'OAU', active: false },
		{ id: '4', name: 'Uniben', active: false },
		{ id: '5', name: 'UNN', active: false },
		// Add more universities here...
	];

	const handleNext = () => {
		if (selectedCampus) {
			// Navigate to the home screen
			router.push('(tabs)');
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
		<View className="flex-1 justify-center px-4 py-6">
			<Text className="text-3xl font-bold mb-5 pt-10">
				What Campus are you at?
			</Text>
			<TextInput
				value={search}
				onChangeText={setSearch}
				placeholder="Search for your campus"
				className="border py-2 px-4 text-lg rounded mb-4"
			/>
			<Text className="text-xl font-bold mb-4">
				Select Your Campus
			</Text>

			<FlatList
				data={filteredUniversities}
				numColumns={2}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<TouchableOpacity
						className={`flex-1 m-2 p-4 border rounded ${
							item.active
								? selectedCampus === item.name
									? 'border-green-500 shadow-md bg-green-500 text-white' // Highlight selected campus
									: 'border-green-500'
								: 'border-gray-300'
						}`}
						onPress={() => handleUniversityPress(item)}
					>
						<Text
							className={`text-center text-lg ${
								item.active
									? selectedCampus === item.name
										? 'text-white' // Highlight text for selected campus
										: 'text-green-500'
									: 'text-gray-500'
							}`}
						>
							{item.name}
						</Text>
					</TouchableOpacity>
				)}
			/>

			<View className="flex flex-row justify-end items-end">
				<TouchableOpacity
					onPress={handleNext}
					className="bg-green-500 my-3 px-4 py-3 rounded-lg"
				>
					<Text className="text-white text-center text-xl font-semibold">
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
				<View className="flex-1 justify-center items-center bg-slate-200 bg-opacity-0">
					<View className="bg-white px-6 py-10 rounded">
						<Text className="text-3xl text-center mt-4 font-bold mb-0">
							😥
						</Text>
						<Text className="text-3xl text-center mt-4 font-bold mb-4">
							We are currently working on bringing Tradeet
							to {selectedUniversity}
						</Text>
						<Text className="mb-4 text-xl text-center">
							Become a Tradeet ambassador on your campus!
						</Text>

						<TouchableOpacity
							onPress={() => {
								setShowModal(false);
								// Handle 'Join Us Now' button action here
							}}
							className="bg-green-500 py-3 rounded-lg"
						>
							<Text className="text-white font-bold text-center text-xl">
								Join us now!
							</Text>
						</TouchableOpacity>
						<View className="absolute top-2 right-2">
							<TouchableOpacity
								onPress={() => setShowModal(false)}
							>
								<Text className="text-red-700 font-bold text-4xl">
									x
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}
