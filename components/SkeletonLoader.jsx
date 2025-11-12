import React from 'react';
import { View, StyleSheet } from 'react-native';

const SkeletonLoader = () => {
	return (
		<View style={styles.container}>
			<View
				style={{
					// flexDirection: 'row',
					width: '100%',
                    paddingHorizontal: 10,
                    paddingTop: 10
				}}
			>
				{/* <View
					style={{
						width: 70,
						height: 70,
						borderRadius: 35,
						backgroundColor: '#e0e0e0',
						marginBottom: 10,
					}} 
				/> */}
				<View
					style={{
						height: 40,
						backgroundColor: '#e0e0e0',
						marginBottom: 10,
						borderRadius: 4,
					}}
				/>
			</View>
			<View
				style={{
					flexDirection: 'row',
					justifyContent: 'space-between',
					paddingHorizontal: 10,
					marginTop: 10,
				}}
			>
				<View
					style={{
						height: 100,
						backgroundColor: '#e0e0e0',
						marginBottom: 10,
						borderRadius: 4,
						width: '45%',
					}}
				/>
				<View
					style={{
						height: 100,
						backgroundColor: '#e0e0e0',
						marginBottom: 10,
						borderRadius: 4,
						width: '45%',
					}}
				/>
			</View>
			<View
				style={{
					flexDirection: 'row',
					justifyContent: 'space-between',
					paddingHorizontal: 10,
					marginTop: 10,
				}}
			>
				<View
					style={{
						height: 100,
						backgroundColor: '#e0e0e0',
						marginBottom: 10,
						borderRadius: 4,
						width: '45%',
					}}
				/>
				<View
					style={{
						height: 100,
						backgroundColor: '#e0e0e0',
						marginBottom: 10,
						borderRadius: 4,
						width: '45%',
					}}
				/>
			</View>
			<View
				style={{
					height: 150,
					backgroundColor: '#e0e0e0',
					marginBottom: 10,
					borderRadius: 4,
					marginHorizontal: 10,
					marginTop: 10,
				}}
			/>
			<View
				style={{
					height: 150,
					backgroundColor: '#e0e0e0',
					marginBottom: 10,
					borderRadius: 4,
					marginHorizontal: 10,
					marginTop: 10,
				}}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 10,
		paddingVertical: 40,
        flex: 1,
        backgroundColor: '#fff'
	},
	skeletonItem: {
		height: 40,
		backgroundColor: '#e0e0e0',
		marginBottom: 10,
		borderRadius: 4,
    },
    skeletonProfileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#e0e0e0',
        marginBottom: 10,
    }
});

export default SkeletonLoader;
