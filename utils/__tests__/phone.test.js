import { extractNationalPhoneNumber } from '../phone';

describe('extractNationalPhoneNumber', () => {
	it('strips +234 and leading 0 when user enters 07034343002', () => {
		expect(
			extractNationalPhoneNumber({
				phone: '07034343002',
				formattedValue: '+23407034343002',
				callingCode: '234',
			}),
		).toBe('7034343002');
	});

	it('preserves 10-digit national number when user enters 7034343002', () => {
		expect(
			extractNationalPhoneNumber({
				phone: '7034343002',
				formattedValue: '+2347034343002',
				callingCode: '234',
			}),
		).toBe('7034343002');
	});

	it('falls back to raw phone and strips leading zero when formattedValue is empty', () => {
		expect(
			extractNationalPhoneNumber({
				phone: '07034343002',
				formattedValue: '',
				callingCode: '234',
			}),
		).toBe('7034343002');
	});
});
