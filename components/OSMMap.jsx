import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

const OSMMap = ({
	latitude,
	longitude,
	availableRunners,
}) => {
	return (
		<View style={styles.mapContainer}>
			{latitude && longitude && (
				<MapView
					style={styles.map}
					initialRegion={{
						latitude: latitude,
						longitude: longitude,
						latitudeDelta: 0.01,
						longitudeDelta: 0.01,
					}}
					provider={MapView.PROVIDER_OSM} // Use default provider for standard tiles
				>
					{availableRunners.map((runner) => (
						<Marker
							key={runner.id} // Unique key for each marker
							coordinate={{
								latitude: runner.latitude, // Runner's latitude
								longitude: runner.longitude, // Runner's longitude
							}}
							title={runner.name} // Title shown when marker is pressed
							description={`Price: ₦${runner.price}`} // Description shown in the callout
						/>
					))}
				</MapView>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	mapContainer: {
		height: 300, // Adjust height as needed
		width: '100%',
	},
	map: {
		...StyleSheet.absoluteFillObject,
	},
});

export default OSMMap;
