import React, { useContext, useState } from 'react';
import {
	TouchableOpacity,
	Text,
	StyleSheet,
	View,
} from 'react-native';
import UpgradeOptionsModal from './UpgradeOptionsModal';
import { AuthContext } from '@/context/AuthContext';

const UpgradeButton = ({ businessData, getBusinessInfo }) => {
	const [modalVisible, setModalVisible] = useState(false);
	const { userInfo, checkLoginStatus } =
		useContext(AuthContext);

	const handleUpgradeClick = () => {
		setModalVisible(true);
	};

	return (
		<>
			{businessData?.plan.name !== 'Pro' && (
				<View
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
                        gap: 3,
					}}
				>
					<Text style={{fontSize: 16, color: 'white'}}>
						You are currently on the {businessData?.plan?.name} plan.
					</Text>
					<TouchableOpacity
						style={styles.upgradeButton}
						onPress={handleUpgradeClick}
					>
						<Text style={styles.buttonText}>
							Upgrade Plan
						</Text>
					</TouchableOpacity>
				</View>
			)}

			<UpgradeOptionsModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				getBusinessInfo={getBusinessInfo}
				setModalVisible={setModalVisible}
			/>
		</>
	);
};

const styles = StyleSheet.create({
	upgradeButton: {
		marginVertical: 3,
	},
	buttonText: {
		color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textDecorationLine: 'underline'
	},
});

export default UpgradeButton;
