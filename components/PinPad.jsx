import React, { useEffect, useRef, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	ActivityIndicator,
	Animated,
	Vibration,
	Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';

/**
 * The transaction PIN keypad.
 *
 * Deliberately its own keypad rather than a `TextInput`. Three reasons, in order of weight:
 * the system keyboard is what has been covering inputs across this app; a PIN should not pass
 * through the keyboard's autocorrect, clipboard or third-party keyboard layers; and a 4-dot
 * row with big targets reads as "this is your money" in a way a text field does not.
 *
 * Purely presentational — it collects four digits and hands them up. Verification, lockout and
 * every decision about what a wrong PIN means live on the server, where they cannot be skipped
 * by a modified client.
 */

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PinPad({
	visible,
	title = 'Enter your PIN',
	subtitle,
	error, // { message, id } — the id makes a repeated message re-trigger the shake
	busy = false,
	onSubmit,
	onClose,
	onForgot,
}) {
	const [pin, setPin] = useState('');
	const shake = useRef(new Animated.Value(0)).current;

	// A fresh prompt every time, so a half-typed PIN is never left sitting in state.
	useEffect(() => {
		if (visible) setPin('');
	}, [visible]);

	/**
	 * A rejected PIN clears itself and says so physically.
	 *
	 * Keyed on `error.id`, not the message: two identical failures in a row are the common case
	 * ("Incorrect PIN. 3 attempts left."), and depending on the string would make the second one
	 * look like nothing happened at all.
	 */
	useEffect(() => {
		if (!error?.message) return;
		setPin('');
		if (Platform.OS !== 'web') Vibration.vibrate(40);
		Animated.sequence([
			Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
			Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
			Animated.timing(shake, { toValue: 6, duration: 50, useNativeDriver: true }),
			Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
		]).start();
	}, [error?.id, shake]);

	const press = (key) => {
		if (busy) return;
		if (key === 'del') return setPin((p) => p.slice(0, -1));
		if (!key || pin.length >= PIN_LENGTH) return;

		const next = pin + key;
		setPin(next);
		// Submitting on the fourth digit saves a confirm tap the merchant would take anyway.
		if (next.length === PIN_LENGTH) onSubmit(next);
	};

	return (
		<Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
			<View style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
						<Feather name="x" size={22} color={COLORS.textPrimary} />
					</TouchableOpacity>
				</View>

				<View style={styles.top}>
					<View style={styles.lockIcon}>
						<Ionicons name="lock-closed" size={20} color={COLORS.primary} />
					</View>
					<Text style={styles.title}>{title}</Text>
					{!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

					<Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
						{Array.from({ length: PIN_LENGTH }).map((_, i) => (
							<View
								key={i}
								style={[
									styles.dot,
									i < pin.length && styles.dotFilled,
									!!error?.message && styles.dotError,
								]}
							/>
						))}
					</Animated.View>

					<View style={styles.statusSlot}>
						{busy
							? <ActivityIndicator size="small" color={COLORS.primary} />
							: !!error?.message && <Text style={styles.error}>{error.message}</Text>}
					</View>
				</View>

				<View style={styles.keypad}>
					{KEYS.map((key, i) => (
						<TouchableOpacity
							key={i}
							style={[styles.key, !key && styles.keyBlank]}
							onPress={() => press(key)}
							disabled={!key || busy}
							activeOpacity={key ? 0.6 : 1}
						>
							{key === 'del'
								? <Feather name="delete" size={22} color={COLORS.textSecondary} />
								: <Text style={styles.keyText}>{key}</Text>}
						</TouchableOpacity>
					))}
				</View>

				{!!onForgot && (
					<TouchableOpacity onPress={onForgot} style={styles.forgot} hitSlop={10}>
						<Text style={styles.forgotText}>Forgot your PIN?</Text>
					</TouchableOpacity>
				)}
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.surface, paddingTop: 44 },
	header: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8 },
	closeBtn: { padding: 4 },

	top: { alignItems: 'center', paddingHorizontal: 32, flex: 1, justifyContent: 'center' },
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

	dots: { flexDirection: 'row', gap: 18, marginTop: 34 },
	dot: {
		width: 15, height: 15, borderRadius: 8,
		borderWidth: 1.5, borderColor: COLORS.border,
		backgroundColor: 'transparent',
	},
	dotFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
	dotError: { borderColor: COLORS.danger },

	// Fixed height so the keypad never shifts when a message appears or clears.
	statusSlot: { height: 40, justifyContent: 'center', paddingHorizontal: 12 },
	error: { fontSize: 13, color: COLORS.danger, fontWeight: '600', textAlign: 'center' },

	keypad: {
		flexDirection: 'row', flexWrap: 'wrap',
		paddingHorizontal: 28, paddingBottom: 8,
	},
	key: {
		width: '33.33%', height: 68,
		alignItems: 'center', justifyContent: 'center',
	},
	keyBlank: { opacity: 0 },
	keyText: { fontSize: 27, fontWeight: '500', color: COLORS.textPrimary },

	forgot: { alignItems: 'center', paddingVertical: 16, paddingBottom: 30 },
	forgotText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
});
