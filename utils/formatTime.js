export default function formatDateTime(dateString) {
	const date = new Date(dateString); // Create a Date object from the input

	// Get day, month, year, and time components
	const day = date.getDate();
	const monthNames = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec',
	];
	const month = monthNames[date.getMonth()];
	const year = date.getFullYear();

	// Format hours and minutes
	let hours = date.getHours();
	const minutes = date
		.getMinutes()
		.toString()
		.padStart(2, '0'); // Add leading zero
	const ampm = hours >= 12 ? 'pm' : 'am'; // Determine AM/PM
	hours = hours % 12; // Convert to 12-hour format
	hours = hours ? hours : 12; // The hour '0' should be '12'

	// Get the day suffix
	const suffix = (day) => {
		if (day > 3 && day < 21) return 'th'; // General rule for all numbers between 4 and 20
		switch (day % 10) {
			case 1:
				return 'st';
			case 2:
				return 'nd';
			case 3:
				return 'rd';
			default:
				return 'th';
		}
	};

	// Construct the formatted date string
	return `${day}${suffix(
		day,
	)} ${month}, ${year}. ${hours}:${minutes}${ampm}`;
}
