import React, { useContext, useState } from 'react';
import {
	View,
	TextInput,
	Button,
	Text,
	StyleSheet,
	Platform,
	TouchableOpacity,
	ToastAndroid,
} from 'react-native';
import {
	useLocalSearchParams,
	useRouter,
} from 'expo-router';
import {
	CodeField,
	Cursor,
	useBlurOnFulfill,
	useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { AuthContext } from '@/context/AuthContext';

const styles = StyleSheet.create({
	root: { flex: 1, padding: 20 },
	title: { textAlign: 'center', fontSize: 30 },
	codeFieldRoot: {
		marginTop: 20,
	},
	cell: {
		width: 50,
		height: 50,
		lineHeight: 38,
		fontSize: 24,
		borderWidth: 2,
		borderColor: '#00000030',
		textAlign: 'center',
		marginRight: 20,
		paddingTop: 10,
	},
	focusCell: {
		borderColor: '#000',
	},
});

const CELL_COUNT = 4;

export default function VerificationScreen() {
	const router = useRouter();
	const [code, setCode] = useState('');
	const [value, setValue] = useState('');
	const { verifyResetOtp } = useContext(AuthContext);
	const { phone } = useLocalSearchParams();
	const ref = useBlurOnFulfill({
		value,
		cellCount: CELL_COUNT,
	});
	const [props, getCellOnLayoutHandler] =
		useClearByFocusCell({
			value,
			setValue,
		});

	const handleNext = async () => {
		// Validate phone number format here
		if (!code) {
			ToastAndroid.show(
				'Please enter a valid code.',
				ToastAndroid.SHORT,
			);
			return;
		}

		try {
			const response = await verifyResetOtp(phone, code);

			if (
				response.message ===
				'OTP verified. Proceed to reset password.'
			) {
				router.push({
					pathname: '/change-password/reset-password',
                    params: { phone, otp: code },
				});
				ToastAndroid.show(
					`OTP verified. Proceed to reset password.`,
					ToastAndroid.SHORT,
				);
			} else {
				ToastAndroid.show(
					response.message,
					ToastAndroid.SHORT,
				);
			}
		} catch (error) {
			ToastAndroid.show(
				'An error occurred. Please try again.',
				ToastAndroid.SHORT,
			);
			console.error('Error verifying phone number:', error);
		}
	};

	return (
		<View className="flex-1 justify-center px-5">
			<Text className="text-3xl font-bold mb-5">
				Enter Verification Code
			</Text>
			<Text className="text-lg">
				A verification code has been sent to your WhatsApp
				number, please enter it here.
			</Text>
			<View className="mx-auto mb-5">
				<CodeField
					ref={ref}
					{...props}
					// Use `caretHidden={false}` when users can't paste a text value, because context menu doesn't appear
					value={code}
					onChangeText={setCode}
					cellCount={CELL_COUNT}
					rootStyle={styles.codeFieldRoot}
					keyboardType="number-pad"
					textContentType="oneTimeCode"
					autoComplete={Platform.select({
						android: 'sms-otp',
						default: 'one-time-code',
					})}
					testID="my-code-input"
					renderCell={({ index, symbol, isFocused }) => (
						<Text
							key={index}
							style={[
								styles.cell,
								isFocused && styles.focusCell,
							]}
							onLayout={getCellOnLayoutHandler(index)}
						>
							{symbol || (isFocused ? <Cursor /> : null)}
						</Text>
					)}
				/>
			</View>
			<View className="flex flex-row justify-center items-end">
				<TouchableOpacity
					onPress={handleNext}
					className="bg-green-500 my-3 px-4 py-3 rounded-lg"
				>
					<Text className="text-white text-center text-xl font-semibold">
						Verify
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
