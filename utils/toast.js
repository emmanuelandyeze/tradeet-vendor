import { ToastAndroid, Platform, Alert } from 'react-native';

/**
 * A short confirmation or warning, on both platforms.
 *
 * `ToastAndroid` is Android-only, and on iOS React Native swaps in a fallback whose `show()`
 * does nothing but `console.warn`. Every toast in the app was therefore invisible on iOS —
 * including validation failures, which is why actions appeared to do nothing at all when they
 * had in fact been rejected.
 *
 * Android keeps the native toast. iOS gets an alert: heavier, but visible, and these messages
 * are the only feedback the user gets for the action they just took.
 */
export const notify = (message, { title = '', long = false } = {}) => {
	const text = String(message ?? '');
	if (!text) return;

	if (Platform.OS === 'android') {
		ToastAndroid.show(text, long ? ToastAndroid.LONG : ToastAndroid.SHORT);
		return;
	}

	Alert.alert(title, text);
};

export default notify;
