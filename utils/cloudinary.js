// Helper to determine mime type roughly if needed, or rely on device
const getMimeType = (uri) => {
	if (uri.endsWith('.pdf')) return 'application/pdf';
	if (uri.endsWith('.doc')) return 'application/msword';
	if (uri.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
	if (uri.endsWith('.epub')) return 'application/epub+zip';
	return 'image/jpeg'; // default fall back
};

export const uploadToCloudinary = async (fileUri, fileType = 'image', fileName = 'upload') => {
	const data = new FormData();
	const cloudName = 'djcddyzvs';
	const uploadPreset = 'tradeet-vendor';

	// If it's a "raw" file (pdf, doc, etc), utilize 'auto' or 'raw' resource type in URL
	// But standard practice: map "image" -> image/upload, "video" -> video/upload, or "auto" -> auto/upload
	const resourceType = fileType === 'image' ? 'image' : 'auto';

	data.append('file', {
		uri: fileUri,
		type: getMimeType(fileUri),
		name: fileName,
	});
	data.append('upload_preset', uploadPreset);

	try {
		let response = await fetch(
			`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
			{
				method: 'POST',
				body: data,
			},
		);
		let result = await response.json();
		return result;
	} catch (error) {
		console.error('Error uploading file:', error);
		throw error;
	}
};

// Keep for backward compatibility if needed, or refactor consumers
export const uploadImageToCloudinary = (uri) => uploadToCloudinary(uri, 'image', 'image.jpg');
