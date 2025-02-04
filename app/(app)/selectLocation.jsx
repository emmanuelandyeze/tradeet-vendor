import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import StoreLocationPicker from '../../components/StoreLocationPicker';

const selectLocation = () => {
  return (
		<View style={{flex: 1}}>
			<StoreLocationPicker />
		</View>
	);
}

export default selectLocation

const styles = StyleSheet.create({})