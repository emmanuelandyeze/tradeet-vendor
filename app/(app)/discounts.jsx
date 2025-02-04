import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
// import DiscountList from './src/components/DiscountList';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import DiscountList from '@/components/DiscountList';

const Page = () => {
	const { userInfo, checkLoginStatus } =
		useContext(AuthContext); // Replace with actual business ID

    const businessId = userInfo._id

    return (
		<SafeAreaView style={{ flex: 1 }}>
			<StatusBar barStyle="dark-content" />
			<DiscountList businessId={businessId} />
		</SafeAreaView>
	);
};

export default Page;
