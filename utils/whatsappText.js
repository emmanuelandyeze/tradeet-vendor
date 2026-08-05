/**
 * WhatsApp rejects template parameters containing newlines, tabs, or more than 4 consecutive
 * spaces, and there is no substitute character that renders as a line break. Line breaks can
 * only live in the approved template's own text.
 *
 * Keep this in sync with sanitizeTemplateParam() in tradeet-server/services/whatsappServices.js —
 * the server applies the same transform, this is here so the composer preview is honest about
 * what the customer will actually receive.
 */
export const sanitizeTemplateParam = (value) => {
	if (value === null || value === undefined) return '';

	const lines = String(value)
		.replace(/\r\n?/g, '\n')
		.replace(/\t/g, ' ')
		.split('\n')
		.map(line => line.replace(/ {2,}/g, ' ').trim())
		.filter(Boolean);

	return lines
		.reduce((acc, line) => {
			if (!acc) return line;
			const joiner = /[.!?,;:—–-]$/.test(acc) ? ' ' : '. ';
			return acc + joiner + line;
		}, '')
		.trim();
};

/** True when the merchant typed line breaks that will be flattened on send. */
export const willBeReflowed = (value) => {
	const raw = String(value || '');
	return /[\n\t]|\s{5,}/.test(raw.trim());
};
