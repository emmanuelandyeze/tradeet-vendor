import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather, Ionicons } from '@expo/vector-icons';
import axiosInstance from '@/utils/axiosInstance';
import { notify } from '@/utils/toast';
import { COLORS } from '@/constants/theme';
import PinPad from '@/components/PinPad';

/**
 * Setting, changing or resetting the transaction PIN.
 *
 * A short wizard over one keypad rather than three fields on a page: at any moment the merchant
 * is being asked for exactly one PIN, and the heading says which. Confirming the new PIN by
 * typing it twice is the point — a PIN nobody can remember locks the merchant out of their own
 * balance, and there is no "show password" affordance to fall back on.
 *
 * Three entry points, all enforced server-side as well; the params only decide what to ask for:
 *   (no param)  first-time setup
 *   ?change=1   knows the current PIN
 *   ?reset=1    forgot it, proves identity with the account password instead
 */

export default function TransactionPinScreen() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { change, reset } = useLocalSearchParams();
	const isReset = reset === '1';
	const isChange = change === '1' && !isReset;

	const [step, setStep] = useState(isReset ? 'password' : isChange ? 'current' : 'new');
	// Which secret we will prove identity with. State, not a param: a merchant who enters via
	// 'change' and then taps 'Forgot your PIN?' switches to the password path mid-flow.
	const [viaPassword, setViaPassword] = useState(isReset);
	const [currentPin, setCurrentPin] = useState('');
	const [password, setPassword] = useState('');
	const [newPin, setNewPin] = useState('');
	const [error, setError] = useState(null);
	const [busy, setBusy] = useState(false);

	const fail = (message) => setError({ message, id: Date.now() });

	const save = async (confirmPin) => {
		setBusy(true);
		setError(null);
		try {
			await axiosInstance.post('/anchor/security/pin', {
				pin: confirmPin,
				...(viaPassword ? { password } : currentPin ? { currentPin } : {}),
			});
			queryClient.invalidateQueries({ queryKey: ['transactionPin'] });
			notify(isChange || isReset ? 'Transaction PIN changed.' : 'Transaction PIN set.', { title: 'Done' });
			router.back();
		} catch (e) {
			/**
			 * Back to whichever secret the server rejected. A bad password or current PIN sends
			 * them to that step; anything else was about the PIN they chose (too weak, wrong
			 * length), so asking them to confirm it again would just fail identically.
			 */
			const message = e?.response?.data?.message || 'Could not save your PIN.';
			fail(message);
			setNewPin('');
			if (/password/i.test(message)) setStep('password');
			else if (/current PIN/i.test(message)) setStep('current');
			else setStep('new');
		} finally {
			setBusy(false);
		}
	};

	const handleSubmit = (pin) => {
		setError(null);

		if (step === 'current') {
			// Not checked here — the server does that when the new PIN is submitted, so a wrong
			// current PIN costs one attempt rather than one per keystroke of guessing.
			setCurrentPin(pin);
			return setStep('new');
		}

		if (step === 'new') {
			setNewPin(pin);
			return setStep('confirm');
		}

		if (pin !== newPin) {
			fail('Those PINs did not match. Start again.');
			setNewPin('');
			return setStep('new');
		}

		save(pin);
	};

	if (step === 'password') {
		return (
			<KeyboardAvoidingView
				style={styles.passwordScreen}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
					<Feather name="x" size={22} color={COLORS.textPrimary} />
				</TouchableOpacity>

				<View style={styles.passwordBody}>
					<View style={styles.lockIcon}>
						<Ionicons name="key-outline" size={20} color={COLORS.primary} />
					</View>
					<Text style={styles.title}>Confirm your password</Text>
					<Text style={styles.subtitle}>
						A PIN cannot be recovered, only replaced. Enter your account password and you can
						choose a new one.
					</Text>

					<TextInput
						style={styles.passwordInput}
						value={password}
						onChangeText={(v) => { setPassword(v); setError(null); }}
						placeholder="Account password"
						placeholderTextColor={COLORS.textLight}
						secureTextEntry
						autoCapitalize="none"
						autoFocus
					/>
					{!!error?.message && <Text style={styles.error}>{error.message}</Text>}

					<TouchableOpacity
						style={[styles.primaryBtn, !password && styles.btnDisabled]}
						disabled={!password || busy}
						onPress={() => setStep('new')}
					>
						{busy
							? <ActivityIndicator color={COLORS.textWhite} />
							: <Text style={styles.primaryBtnText}>Continue</Text>}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		);
	}

	const copy = {
		current: {
			title: 'Enter your current PIN',
			subtitle: 'Confirm it is you before setting a new one.',
		},
		new: {
			title: isChange || isReset ? 'Choose a new PIN' : 'Create your transaction PIN',
			subtitle: 'Four digits you will type before every withdrawal. Avoid 1234, your birth year, or four of the same digit.',
		},
		confirm: {
			title: 'Enter it again',
			subtitle: 'Just to be sure you will remember it.',
		},
	}[step];

	return (
		<View style={styles.container}>
			<PinPad
				visible
				title={copy.title}
				subtitle={copy.subtitle}
				error={error}
				busy={busy}
				onSubmit={handleSubmit}
				onClose={() => router.back()}
				onForgot={step === 'current' ? () => { setError(null); setViaPassword(true); setStep('password'); } : undefined}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.surface },

	passwordScreen: { flex: 1, backgroundColor: COLORS.surface, paddingTop: 44 },
	backBtn: { padding: 20 },
	passwordBody: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 20 },
	lockIcon: {
		width: 46, height: 46, borderRadius: 23,
		backgroundColor: COLORS.primaryLight,
		alignItems: 'center', justifyContent: 'center',
		marginBottom: 18,
	},
	title: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
	subtitle: {
		fontSize: 13, color: COLORS.textMuted, textAlign: 'center',
		marginTop: 8, lineHeight: 19,
	},
	passwordInput: {
		width: '100%',
		borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
		paddingHorizontal: 14, paddingVertical: 14,
		fontSize: 15, color: COLORS.textPrimary,
		marginTop: 28,
	},
	error: { fontSize: 13, color: COLORS.danger, fontWeight: '600', marginTop: 10, textAlign: 'center' },
	primaryBtn: {
		width: '100%', marginTop: 20,
		backgroundColor: COLORS.primary,
		borderRadius: 12, paddingVertical: 16, alignItems: 'center',
	},
	primaryBtnText: { color: COLORS.textWhite, fontSize: 15, fontWeight: '700' },
	btnDisabled: { opacity: 0.5 },
});
