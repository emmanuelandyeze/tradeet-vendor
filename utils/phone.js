/**
 * Extracts the national phone number (without country calling code or leading zero)
 * from react-native-phone-number-input state so signup, login, and password reset
 * send a consistent identifier to the backend.
 */
export function extractNationalPhoneNumber({
	phone = '',
	formattedValue = '',
	callingCode = '',
}) {
	let value = String(formattedValue || phone || '').trim();
	if (callingCode && value.startsWith(`+${callingCode}`)) {
		value = value.substring(`+${callingCode}`.length);
	} else if (value.startsWith('+234')) {
		value = value.substring(4);
	}
	if (value.startsWith('0')) {
		value = value.substring(1);
	}
	return value;
}
