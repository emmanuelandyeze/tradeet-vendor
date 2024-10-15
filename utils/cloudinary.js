export const uploadImageToCloudinary = async (imageUri) => {
	const data = new FormData();
	const cloudName = 'djcddyzvs'; // Replace with your Cloudinary cloud name
	const uploadPreset = 'tradeet-vendor'; // Replace with your Cloudinary upload preset

	data.append('file', {
		uri: imageUri,
		type: 'image/jpeg', // or other image type
		name: 'upload.jpg',
	});
	data.append('upload_preset', uploadPreset);

	try {
		let response = await fetch(
			`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
			{
				method: 'POST',
				body: data,
			},
		);
		let result = await response.json();
		return result;
	} catch (error) {
		console.error('Error uploading image:', error);
	}
};
