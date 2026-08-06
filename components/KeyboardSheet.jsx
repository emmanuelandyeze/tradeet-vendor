import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';

/**
 * Current on-screen keyboard height, from the keyboard event itself.
 *
 * Expo SDK 54 turns on Android edge-to-edge, and under it the window no longer resizes when
 * the keyboard opens. That is what broke KeyboardAvoidingView across the app: it waits for a
 * resize that never comes, so bottom sheets stayed put and the keyboard covered the input and
 * the submit button. Reading `endCoordinates.height` works either way, because it is the
 * keyboard reporting its own size rather than us inferring it from the layout.
 *
 * iOS gets the `will` events so the sheet moves with the keyboard animation; Android only
 * emits `did`, so it lands a frame later — still correct, just less smooth.
 */
export const useKeyboardHeight = () => {
	const [height, setHeight] = useState(0);

	useEffect(() => {
		const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
		const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

		const onShow = Keyboard.addListener(showEvent, (e) =>
			setHeight(e?.endCoordinates?.height ?? 0),
		);
		const onHide = Keyboard.addListener(hideEvent, () => setHeight(0));

		return () => {
			onShow.remove();
			onHide.remove();
		};
	}, []);

	return height;
};

/**
 * Drop-in replacement for the full-screen overlay `View` that backs a bottom sheet.
 *
 * The overlay is `justifyContent: 'flex-end'`, so padding the bottom by the keyboard height
 * lifts the sheet by exactly that much and nothing else moves. Pass `onPress` to keep
 * tap-outside-to-close — taps on the sheet itself do not bubble through.
 *
 * Usage:
 *   <Modal visible={x} transparent animationType="slide" onRequestClose={close}>
 *     <KeyboardSheet style={styles.modalOverlay} onPress={close}>
 *       <View style={styles.modalContent}>…</View>
 *     </KeyboardSheet>
 *   </Modal>
 */
const KeyboardSheet = ({ style, children, onPress, ...rest }) => {
	const keyboardHeight = useKeyboardHeight();
	const composed = [style, keyboardHeight > 0 && { paddingBottom: keyboardHeight }];

	if (onPress) {
		return (
			<Pressable style={composed} onPress={onPress} {...rest}>
				{/* Absorbs taps so pressing inside the sheet does not dismiss it. */}
				<Pressable onPress={() => { }} style={{ width: '100%' }}>
					{children}
				</Pressable>
			</Pressable>
		);
	}

	return (
		<View style={composed} {...rest}>
			{children}
		</View>
	);
};

export default KeyboardSheet;
