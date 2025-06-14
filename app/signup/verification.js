import React, {
	useContext,
	useState,
	useEffect,
} from 'react';
import {
	View,
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
	resendText: {
		color: 'green',
		textAlign: 'center',
	},
});

const CELL_COUNT = 4;

export default function VerificationScreen() {
	const router = useRouter();
	const [code, setCode] = useState('');
	const { verifyCode, verifyPhoneNumber } =
		useContext(AuthContext);
	const { phoneNumber } = useLocalSearchParams();
	const ref = useBlurOnFulfill({
		value: code,
		cellCount: CELL_COUNT,
	});
	const [props, getCellOnLayoutHandler] =
		useClearByFocusCell({
			value: code,
			setValue: setCode,
		});
	const [timer, setTimer] = useState(60);
	const [canResend, setCanResend] = useState(false);

	useEffect(() => {
		if (timer > 0) {
			const interval = setInterval(() => {
				setTimer((prev) => prev - 1);
			}, 1000);
			return () => clearInterval(interval);
		} else {
			setCanResend(true);
		}
	}, [timer]);

	const handleResendCode = async () => {
		try {
			const response = await verifyPhoneNumber(phoneNumber);
			console.log(response);

			if (
				response.message ===
				'Verification code sent via WhatsApp'
			) {
				ToastAndroid.show(
					`Code sent to ${phoneNumber}`,
					ToastAndroid.SHORT,
				);
				setTimer(60);
				setCanResend(false);
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
		}
	};

	const handleNext = async () => {
		if (!code) {
			ToastAndroid.show(
				'Please enter a valid code.',
				ToastAndroid.SHORT,
			);
			return;
		}

		try {
			const response = await verifyCode(phoneNumber, code);
			if (response.message === 'Phone number verified') {
				router.push({
					pathname: '/signup/business-name',
					params: { phoneNumber },
				});
				ToastAndroid.show(
					'Phone number verified',
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
					className="bg-[#065637] my-3 px-4 py-4 rounded-lg"
				>
					<Text className="text-white text-center text-xl font-semibold">
						Verify
					</Text>
				</TouchableOpacity>
			</View>
			{!canResend ? (
				<Text
					style={{ fontSize: 16 }}
					className="text-center mt-3"
				>
					Resend code in {timer}s
				</Text>
			) : (
				<View
					style={{
						justifyContent: 'center',
						alignItems: 'center',
						flexDirection: 'row',
						marginTop: 10,
						marginBottom: 10,
					}}
				>
					<Text style={{ fontSize: 16 }}>
						Not gotten the verification code?{' '}
					</Text>
					<TouchableOpacity onPress={handleResendCode}>
						<Text
							style={{
								color: 'green',
								textAlign: 'center',
								fontSize: 16,
								fontWeight: 'bold',
							}}
						>
							Resend code
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}
