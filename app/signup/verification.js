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
	ActivityIndicator,
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
import Toast from 'react-native-toast-message'; // Import Toast

// Adjusted StyleSheet to complement Tailwind, focusing on CodeField specifics
const styles = StyleSheet.create({
	codeFieldRoot: {
		marginTop: 30,
		justifyContent: 'space-between',
		width: '80%',
		alignSelf: 'center',
	},
	cell: {
		width: 55, // Slightly larger cells
		height: 55,
		lineHeight: 50, // Center text vertically
		fontSize: 28, // Larger font for digits
		borderWidth: 2,
		borderRadius: 10, // Rounded corners for cells
		borderColor: '#E2E8F0', // Tailwind's gray-200 equivalent
		textAlign: 'center',
		backgroundColor: '#F8FAFC', // Tailwind's gray-50 equivalent
		overflow: 'hidden', // Ensures rounded corners clip content
		color: '#1F2937', // Darker text color (Tailwind gray-800)
	},
	focusCell: {
		borderColor: '#065637', // Accent color for focus (matching button)
		backgroundColor: '#FFFFFF', // White background when focused
	},
});

const CELL_COUNT = 4; // Assuming a 4-digit code

export default function VerificationScreen() {
	const router = useRouter();
	const [code, setCode] = useState('');
	const { verifyCode, verifyPhoneNumber } =
		useContext(AuthContext);
	const { phoneNumber } = useLocalSearchParams(); // This phoneNumber should be the local one (without +234)

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
	const [loadingVerify, setLoadingVerify] = useState(false); // Loading for verify button
	const [loadingResend, setLoadingResend] = useState(false); // Loading for resend button

	// Effect for the resend timer
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

	// Centralized toast function
	const showToast = (type, message) => {
		Toast.show({
			type: type,
			text1: message,
			position: 'top',
			visibilityTime: 3000,
			autoHide: true,
		});
	};

	const handleResendCode = async () => {
		if (loadingResend) return; // Prevent multiple clicks while loading

		setLoadingResend(true);
		try {
			// Ensure you send the correct format to verifyPhoneNumber
			// If the backend expects the national number, `phoneNumber` from params is likely correct.
			const response = await verifyPhoneNumber(phoneNumber); // Use the phoneNumber from params

			if (
				response &&
				response.message ===
					'Verification code sent via WhatsApp'
			) {
				showToast(
					'success',
					`New code sent to ${phoneNumber}.`,
				);
				setTimer(60); // Reset timer
				setCanResend(false); // Disable resend until timer runs out
				setCode(''); // Clear code field
			} else {
				const errorMessage =
					response?.message ||
					'Failed to resend code. Please try again.';
				showToast('error', errorMessage);
			}
		} catch (error) {
			console.error(
				'Error resending verification code:',
				error,
			);
			showToast(
				'error',
				'An error occurred while trying to resend the code. Please try again.',
			);
		} finally {
			setLoadingResend(false); // Stop loading
		}
	};

	const handleNext = async () => {
		if (loadingVerify) return; // Prevent multiple clicks while loading

		// Client-side validation: Check if code is entered and has correct length
		if (!code.trim() || code.length !== CELL_COUNT) {
			showToast(
				'error',
				`Please enter the ${CELL_COUNT}-digit code.`,
			);
			return;
		}

		setLoadingVerify(true); // Start loading

		try {
			const response = await verifyCode(phoneNumber, code); // Pass phoneNumber and code
			if (
				response &&
				response.message === 'Phone verified'
			) {
				showToast(
					'success',
					'Phone number verified successfully!',
				);
				router.push({
					pathname: '/signup/business-name',
					params: { phoneNumber }, // Pass phoneNumber to the next screen
				});
			} else {
				const errorMessage =
					response?.message ||
					'Verification failed. Please check the code and try again.';
				showToast('error', errorMessage);
			}
		} catch (error) {
			console.error('Error verifying code:', error);
			showToast(
				'error',
				'An error occurred during verification. Please try again.',
			);
		} finally {
			setLoadingVerify(false); // Stop loading
		}
	};

	return (
		<View className="flex-1 justify-center px-5 bg-white">
			<Text className="text-3xl font-bold mb-5 text-gray-800">
				Enter Verification Code
			</Text>
			<Text className="text-lg text-gray-700">
				A {CELL_COUNT}-digit verification code has been sent
				to your WhatsApp number:{' '}
				<Text className="font-semibold text-gray-900">
					{phoneNumber}
				</Text>
				. Please enter it here.
			</Text>

			<View className="w-full my-8">
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
								// Add additional styling for filled cells if desired
								symbol && { borderColor: '#065637' }, // Filled cell border color
							]}
							onLayout={getCellOnLayoutHandler(index)}
						>
							{symbol || (isFocused ? <Cursor /> : null)}
						</Text>
					)}
				/>
			</View>

			<TouchableOpacity
				onPress={handleNext}
				className={`bg-[#065637] my-3 px-4 py-4 rounded-lg ${
					loadingVerify ? 'opacity-70' : ''
				}`}
				disabled={loadingVerify}
			>
				{loadingVerify ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text className="text-white text-center text-xl font-semibold">
						Verify
					</Text>
				)}
			</TouchableOpacity>

			{!canResend ? (
				<Text
					style={{ fontSize: 16 }}
					className="text-center mt-3 text-gray-600"
				>
					Resend code in {timer}s
				</Text>
			) : (
				<View className="flex flex-row justify-center items-center mt-4">
					<Text className="text-base text-gray-700">
						Didn't get the code?{' '}
					</Text>
					<TouchableOpacity
						onPress={handleResendCode}
						disabled={loadingResend}
					>
						{loadingResend ? (
							<ActivityIndicator
								color="#065637"
								size="small"
							/>
						) : (
							<Text className="text-[#065637] font-bold text-base">
								Resend code
							</Text>
						)}
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}
