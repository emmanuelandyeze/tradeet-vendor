import React, { useState } from 'react';
import {
	View,
	TextInput,
	Button,
	Text,
	StyleSheet,
	Platform,
	TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
	CodeField,
	Cursor,
	useBlurOnFulfill,
	useClearByFocusCell,
} from 'react-native-confirmation-code-field';

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
	const ref = useBlurOnFulfill({
		value,
		cellCount: CELL_COUNT,
	});
	const [props, getCellOnLayoutHandler] =
		useClearByFocusCell({
			value,
			setValue,
		});

	const handleNext = () => {
		// Navigate to the name and password screen
		router.push('/signup/name-password');
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
