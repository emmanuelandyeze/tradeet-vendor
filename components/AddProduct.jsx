// components/AddProduct.js
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Image,
	ScrollView,
	Modal,
	Switch,
	ActivityIndicator,
	Alert,
	Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { uploadImageToCloudinary } from '../utils/cloudinary';
import axiosInstance from '../utils/axiosInstance';
import { Picker } from '@react-native-picker/picker';

const weekdays = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
];

const AddProduct = ({ 
	onAddProduct,
	initialProduct,
	storeId,
	branchId,
	loading,
	isServiceBasedStore = false,
	updateProduct,
}) => {
	// Generic product state (unified)
	const [type, setType] = useState(
		initialProduct?.type ||
			(isServiceBasedStore ? 'service' : 'physical'),
	); // 'physical' | 'digital' | 'service'
	const [title, setTitle] = useState(
		initialProduct?.title || initialProduct?.name || '',
	);
	const [description, setDescription] = useState(
		initialProduct?.description || '',
	);
	const [categoryList, setCategoryList] = useState([]);
	const [selectedCategory, setSelectedCategory] = useState(
		initialProduct?.category?._id ||
			initialProduct?.category ||
			null,
	);

	// NEW: isFeatured
	const [isFeatured, setIsFeatured] = useState(
		initialProduct?.isFeatured === true ||
			initialProduct?.isFeatured === 'true' ||
			false,
	);

	// Variants & AddOns state (store price as string for inputs)
	const [variants, setVariants] = useState(() => {
		const v = initialProduct?.variants;
		if (!Array.isArray(v)) return [];
		return v.map((x) => ({
			name: x?.name || '',
			price: x?.price !== undefined ? String(x.price) : '',
		}));
	});
	const [addOns, setAddOns] = useState(() => {
		const a = initialProduct?.addOns || initialProduct?.addOns;
		if (!Array.isArray(a)) return [];
		return a.map((x) => ({
			name: x?.name || '',
			price: x?.price !== undefined ? String(x.price) : '',
			compulsory: x?.compulsory === true || x?.compulsory === 'true' || false,
		}));
	});

	// Add category modal
	const [
		isAddCategoryModalVisible,
		setIsAddCategoryModalVisible,
	] = useState(false);
	const [newCategoryName, setNewCategoryName] =
		useState('');
	const [creatingCategory, setCreatingCategory] =
		useState(false);

	// Images (store local URIs or remote urls). We'll upload non-http URIs on save.
	const [images, setImages] = useState(() => {
		if (initialProduct) {
			if (Array.isArray(initialProduct.images))
				return initialProduct.images.slice();
			if (initialProduct.thumbnail)
				return [initialProduct.thumbnail];
			if (initialProduct.image)
				return [initialProduct.image];
		}
		return [];
	});
	const [imagePickerVisible, setImagePickerVisible] =
		useState(false);
	const [uploadingImages, setUploadingImages] =
		useState(false);

	// common pricing fields
	const [price, setPrice] = useState(
		initialProduct?.price !== undefined
			? String(initialProduct.price)
			: '',
	);
	const [currency, setCurrency] = useState(
		initialProduct?.currency || 'NGN',
	);
	const [compareAtPrice, setCompareAtPrice] = useState(
		initialProduct?.compareAtPrice !== undefined
			? String(initialProduct.compareAtPrice)
			: '',
	);

	// physical-specific
	const [inventoryCount, setInventoryCount] = useState(
		initialProduct?.physical?.inventoryCount ??
			initialProduct?.inventoryCount ??
			'',
	);
	const [sku, setSku] = useState(
		initialProduct?.physical?.sku ??
			initialProduct?.sku ??
			'',
	);
	const [weightKg, setWeightKg] = useState(
		initialProduct?.physical?.weightKg ?? '',
	);

	// digital-specific
	const [downloadUrl, setDownloadUrl] = useState(
		initialProduct?.digital?.files?.[0]?.url ??
			initialProduct?.digital?.downloadUrl ??
			initialProduct?.downloadUrl ??
			'',
	);

	// service-specific
	const [durationMinutes, setDurationMinutes] = useState(
		initialProduct?.service?.durationMinutes ??
			initialProduct?.durationMinutes ??
			60,
	);
	const [capacity, setCapacity] = useState(
		initialProduct?.service?.capacity ?? 1,
	);
	const [bookingWindowDays, setBookingWindowDays] =
		useState(
			initialProduct?.service?.bookingWindowDays ?? 365,
		);
	// availability: internal representation: { Monday: { closed: bool, open: '09:00', close: '17:00' }, ... }
	const [availability, setAvailability] = useState(() => {
		if (initialProduct?.service?.availability) {
			const av = {};
			weekdays.forEach((d) => {
				const dayData =
					initialProduct.service.availability[d];
				if (!dayData)
					av[d] = {
						closed: true,
						open: '09:00',
						close: '17:00',
					};
				else {
					if (dayData.closed)
						av[d] = {
							closed: true,
							open: '09:00',
							close: '17:00',
						};
					else {
						const openMin =
							dayData.startMinutes ?? null;
						const closeMin =
							dayData.endMinutes ?? null;
						const minutesToHM = (m) => {
							if (m === null || m === undefined)
								return '09:00';
							if (typeof m === 'string' && m.includes(':'))
								return m;
							const mm = Number(m);
							const hh = Math.floor(mm / 60);
							const mins = mm % 60;
							return `${String(hh).padStart(
								2,
								'0',
							)}:${String(mins).padStart(2, '0')}`;
						};
						av[d] = {
							closed: false,
							open: minutesToHM(openMin),
							close: minutesToHM(closeMin),
						};
					}
				}
			});
			return av;
		} else {
			const base = {};
			weekdays.forEach(
				(d) =>
					(base[d] = {
						closed: false,
						open: '09:00',
						close: '17:00',
					}))
			return base;
		}
	})

	// fetch categories on mount
	useEffect(() => {
		let mounted = true;
		async function loadCategories() {
			try {
				const res = await axiosInstance.get(
					`/category/${storeId}?branchId=${branchId}`,
				);
				// Expecting res.data to be array of categories. If your backend wraps, adapt accordingly.
				const categories = Array.isArray(res.data)
					? res.data
					: res.data.categories || res.data.result || [];
				if (mounted && Array.isArray(categories)) {
					setCategoryList(categories);
					if (!selectedCategory && categories.length > 0)
						setSelectedCategory(categories[0]._id);
				}
			} catch (err) {
				console.warn(
					'Could not load categories',
					err?.response?.data || err,
				);
			}
		}
		if (storeId) loadCategories();
		return () => (mounted = false);
	}, [storeId]);

	useEffect(() => {
		// If an initial product changes type, sync internal type
		if (initialProduct?.type) setType(initialProduct.type);
	}, [initialProduct]);

	// ---------- image picker helpers ----------
	const pickImageFromGallery = async () => {
		try {
			const res = await ImagePicker.launchImageLibraryAsync(
				{
					mediaTypes: ImagePicker.MediaTypeOptions.Images,
					allowsEditing: true,
					quality: 0.9,
				},
			);
			if (
				!res.canceled &&
				res.assets &&
				res.assets.length > 0
			) {
				const uri = res.assets[0].uri;
				setImages((prev) => [...prev, uri]);
			}
		} catch (err) {
			console.error('pickImage error', err);
		} finally {
			setImagePickerVisible(false);
		}
	};

	const takePhoto = async () => {
		try {
			const res = await ImagePicker.launchCameraAsync({
				allowsEditing: true,
				quality: 0.9,
			});
			if (
				!res.canceled &&
				res.assets &&
				res.assets.length > 0
			) {
				const uri = res.assets[0].uri;
				setImages((prev) => [...prev, uri]);
			}
		} catch (err) {
			console.error('camera error', err);
		} finally {
			setImagePickerVisible(false);
		}
	};

	const removeImageAt = (index) => {
		setImages((prev) => prev.filter((_, i) => i !== index));
	};

	// ---------- service availability helpers ----------
	const setDayClosed = (day, closed) =>
		setAvailability((prev) => ({
			...prev,
			[day]: { ...prev[day], closed },
		}));
	const setDayOpenTime = (day, hhmm) =>
		setAvailability((prev) => ({
			...prev,
			[day]: { ...prev[day], open: hhmm },
		}));
	const setDayCloseTime = (day, hhmm) =>
		setAvailability((prev) => ({
			...prev,
			[day]: { ...prev[day], close: hhmm },
		}));

	const hhmmToMinutes = (s) => {
		if (!s || typeof s !== 'string') return null;
		const [hh, mm] = s
			.split(':')
			.map((x) => parseInt(x, 10));
		if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
		return hh * 60 + mm;
	};

	// ---------- upload images (client-side) ----------
	const uploadAllImages = async () => {
		setUploadingImages(true);
		try {
			const resultUrls = [];
			for (const uri of images) {
				if (!uri) continue;
				if (String(uri).startsWith('http')) {
					resultUrls.push(uri);
				} else {
					const resp = await uploadImageToCloudinary(uri);
					if (resp && (resp.secure_url || resp.url))
						resultUrls.push(resp.secure_url || resp.url);
					else throw new Error('Image upload failed');
				}
			}
			return resultUrls;
		} finally {
			setUploadingImages(false);
		}
	};

	// ---------- create category (inline) ----------
	const createCategory = async () => {
		const name = newCategoryName?.trim();
		if (!name)
			return Alert.alert(
				'Validation',
				'Category name is required',
			);
		if (!storeId)
			return Alert.alert('Error', 'Missing store ID');
		setCreatingCategory(true);
		try {
			const resp = await axiosInstance.post(
				`/category/${storeId}`,
				{ name, branchId },
			);
			// Expect backend to return created category object. Adjust if your backend wraps differently.
			const created =
				resp.data && resp.data._id
					? resp.data
					: resp.data.category || resp.data.result || null;
			if (!created) {
				// If server returns the whole list, pick last item or re-fetch
				const refetch = await axiosInstance.get(
					`/category/${storeId}`,
				);
				const list = Array.isArray(refetch.data)
					? refetch.data
					: refetch.data.categories || [];
				setCategoryList(list);
				if (list.length > 0)
					setSelectedCategory(list[list.length - 1]._id);
			} else {
				setCategoryList((prev) => [...prev, created]);
				setSelectedCategory(created._id);
			}
			setNewCategoryName('');
			setIsAddCategoryModalVisible(false);
		} catch (err) {
			console.error(
				'createCategory error',
				err?.response?.data || err,
			);
			Alert.alert(
				'Error',
				err?.response?.data?.message ||
					'Failed to create category',
			);
		} finally {
			setCreatingCategory(false);
		}
	};

	// ---------- Variants/Add-ons helpers ----------
	const addVariant = () =>
		setVariants((prev) => [...prev, { name: '', price: '' }]);
	const updateVariant = (index, field, value) =>
		setVariants((prev) =>
			prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
		);
	const removeVariant = (index) =>
		setVariants((prev) => prev.filter((_, i) => i !== index));

	const addAddOn = () =>
		setAddOns((prev) => [
			...prev,
			{ name: '', price: '', compulsory: false },
		]);
	const updateAddOn = (index, field, value) =>
		setAddOns((prev) =>
			prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
		);
	const removeAddOn = (index) =>
		setAddOns((prev) => prev.filter((_, i) => i !== index));

	// ---------- final save handler ----------
	const handleSave = async () => {
		if (!title.trim())
			return Alert.alert('Validation', 'Title is required');
		if (!selectedCategory)
			return Alert.alert('Validation', 'Select a category');

		let uploadedUrls = [];
		try {
			uploadedUrls = await uploadAllImages();
		} catch (err) {
			console.error('uploadAllImages error', err);
			return Alert.alert(
				'Upload Error',
				'Image upload failed. Try again.',
			);
		}

		const payload = {
			brand: storeId,
			branchId,
			type,
			title: title.trim(),
			description: description.trim(),
			category: selectedCategory,
			currency,
			images: uploadedUrls,
			isFeatured: !!isFeatured,
		};

		if (compareAtPrice && !isNaN(Number(compareAtPrice)))
			payload.compareAtPrice = Number(compareAtPrice);

		// attach variants/addOns if present (clean them)
		if (Array.isArray(variants) && variants.length > 0) {
			const cleaned = variants
				.map((v) => {
					const name = (v.name || '').trim();
					const priceNum =
						v.price !== '' && !isNaN(Number(v.price))
							? Number(v.price)
							: NaN;
					if (!name || Number.isNaN(priceNum)) return null;
					return { name, price: priceNum };
				})
				.filter(Boolean);
			if (cleaned.length > 0) payload.variants = cleaned;
		}

		if (Array.isArray(addOns) && addOns.length > 0) {
			const cleaned = addOns
				.map((a) => {
					const name = (a.name || '').trim();
					const priceNum =
						a.price !== '' && !isNaN(Number(a.price))
							? Number(a.price)
							: NaN;
					const compulsory = !!a.compulsory;
					if (!name || Number.isNaN(priceNum)) return null;
					return { name, price: priceNum, compulsory };
				})
				.filter(Boolean);
			if (cleaned.length > 0) payload.addOns = cleaned;
		}

		if (type === 'physical') {
			if (!price || isNaN(Number(price)))
				return Alert.alert(
					'Validation',
					'Valid price required',
				);

			payload.price = Number(price);
			payload.physical = {
				inventoryCount:
					inventoryCount !== '' ? Number(inventoryCount) : 0,
				sku: sku || undefined,
				weightKg: weightKg ? Number(weightKg) : undefined,
			};
		} else if (type === 'digital') {
			payload.price = price ? Number(price) : 0;
			payload.digital = {
				files: downloadUrl ? [{ url: downloadUrl }] : [],
			};
		} else if (type === 'service') {
			if (
				!durationMinutes ||
				isNaN(Number(durationMinutes)) ||
				Number(durationMinutes) <= 0
			)
				return Alert.alert(
					'Validation',
					'Service duration (minutes) is required',
				);
			if (
				!capacity ||
				isNaN(Number(capacity)) ||
				Number(capacity) <= 0
			)
				return Alert.alert(
					'Validation',
					'Service capacity is required',
				);

			payload.price = price ? Number(price) : 0;
			payload.service = {
				durationMinutes: Number(durationMinutes),
				capacity: Number(capacity),
				bookingWindowDays: Number(bookingWindowDays) || 365,
				availability: {},
			};

			weekdays.forEach((d) => {
				const day = availability[d];
				if (!day || day.closed) {
					payload.service.availability[d] = {
						closed: true,
					};
				} else {
					const startMinutes = hhmmToMinutes(day.open);
					const endMinutes = hhmmToMinutes(day.close);
					if (
						startMinutes === null ||
						endMinutes === null ||
						endMinutes <= startMinutes
					) {
						payload.service.availability[d] = {
							closed: true,
						};
					} else {
						payload.service.availability[d] = {
							startMinutes,
							endMinutes,
							closed: false,
						};
					}
				}
			});
		}

		try {
			if (initialProduct && initialProduct._id) {
				await updateProduct(initialProduct._id, payload);
			} else {
				await onAddProduct(payload, storeId);
			}
		} catch (err) {
			console.error('onAddProduct error', err);
			Alert.alert(
				'Save Error',
				err?.message || 'Failed to save item',
			);
		}
	};

	const formatCurrency = (v) => {
		try {
			const n = Number(v);
			return isNaN(n) ? v : n.toLocaleString();
		} catch {
			return v;
		}
	};

	return (
		<ScrollView
			style={styles.container}
			showsVerticalScrollIndicator={false}
		>
			<Text style={styles.title}>
				{initialProduct
					? 'Edit item'
					: `Add ${
							isServiceBasedStore ? 'Service' : 'Product'
					  }`}
			</Text>

			{/* Image section */}
			<View style={styles.sectionContainer}>
				<Text style={styles.label}>Images</Text>
				<FlatList
					data={images}
					horizontal
					keyExtractor={(_, i) => `img-${i}`}
					renderItem={({ item, index }) => (
						<View
							style={{
								marginRight: 12,
								alignItems: 'center',
							}}
						>
							<Image
								source={{ uri: item }}
								style={{
									width: 120,
									height: 120,
									borderRadius: 8,
								}}
							/>
							<TouchableOpacity
								onPress={() => removeImageAt(index)}
								style={{ marginTop: 6 }}
							>
								<Text style={{ color: '#dc3545' }}>
									Remove
								</Text>
							</TouchableOpacity>
						</View>
					)}
					ListFooterComponent={() => (
						<TouchableOpacity
							onPress={() => setImagePickerVisible(true)}
							style={{
								width: 120,
								height: 120,
								borderRadius: 8,
								backgroundColor: '#eef6ff',
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<Ionicons
								name="camera"
								size={28}
								color="#007BFF"
							/>
							<Text
								style={{ color: '#007BFF', marginTop: 6 }}
							>
								Add
							</Text>
						</TouchableOpacity>
					)}
					showsHorizontalScrollIndicator={false}
				/>
				{uploadingImages && (
					<View style={{ marginTop: 8 }}>
						<ActivityIndicator
							size="small"
							color="#007BFF"
						/>
						<Text style={{ color: '#666', marginTop: 6 }}>
							Uploading images...
						</Text>
					</View>
				)}
			</View>

			{/* Image picker modal */}
			<Modal
				visible={imagePickerVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setImagePickerVisible(false)}
			>
				<View style={styles.centeredModalView}>
					<View style={styles.modalContent}>
						<TouchableOpacity
							style={styles.modalOptionButton}
							onPress={takePhoto}
						>
							<Text style={styles.modalOptionText}>
								Take a photo
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.modalOptionButton}
							onPress={pickImageFromGallery}
						>
							<Text style={styles.modalOptionText}>
								Choose from gallery
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.modalOptionButton,
								styles.modalCancelButton,
							]}
							onPress={() => setImagePickerVisible(false)}
						>
							<Text style={styles.modalCancelButtonText}>
								Cancel
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Basic details */}
			<View style={styles.sectionContainer}>
				<Text style={styles.sectionTitle}>
					Basic details
				</Text>

				<Text style={styles.label}>Type</Text>
				<View
					style={{
						borderWidth: 1,
						borderColor: '#ced4da',
						borderRadius: 10,
						overflow: 'hidden',
						marginBottom: 12,
					}}
				>
					<Picker
						selectedValue={type}
						onValueChange={(v) => setType(v)}
					>
						<Picker.Item
							label="Physical product"
							value="physical"
						/>
						<Picker.Item
							label="Digital product"
							value="digital"
						/>
						<Picker.Item
							label="Service / Booking"
							value="service"
						/>
					</Picker>
				</View>

				<Text style={styles.label}>Title</Text>
				<TextInput
					style={styles.input}
					placeholder="e.g., T-shirt, Logo design"
					value={title}
					onChangeText={setTitle}
				/>

				<Text style={styles.label}>Description</Text>
				<TextInput
					style={[styles.input, styles.descriptionInput]}
					placeholder="Describe your item"
					value={description}
					onChangeText={setDescription}
					multiline
				/>

				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<Text style={styles.label}>Category</Text>
					<TouchableOpacity
						onPress={() =>
							setIsAddCategoryModalVisible(true)
						}
						style={{ padding: 6 }}
					>
						<Text
							style={{
								color: '#007BFF',
								fontWeight: '700',
							}}
						>
							+ Create category
						</Text>
					</TouchableOpacity>
				</View>

				<View
					style={{
						borderWidth: 1,
						borderColor: '#ced4da',
						borderRadius: 10,
						overflow: 'hidden',
					}}
				>
					<Picker
						selectedValue={selectedCategory}
						onValueChange={(v) => {
							setSelectedCategory(v);
						}}
					>
						{categoryList.length === 0 && (
							<Picker.Item
								label="No categories — create one"
								value={null}
							/>
						)}
						{categoryList.map((c) => (
							<Picker.Item
								key={c._id}
								label={c.name}
								value={c._id}
							/>
						))}
					</Picker>
				</View>

				{/* NEW: Is Featured */}
				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginTop: 12,
					}}
				>
					<Text style={[styles.label, { marginBottom: 0 }]}>
						Featured
					</Text>
					<View style={{ flexDirection: 'row', alignItems: 'center' }}>
						<Text style={{ marginRight: 8 }}>
							{isFeatured ? 'Yes' : 'No'}
						</Text>
						<Switch
							value={!!isFeatured}
							onValueChange={(v) => setIsFeatured(v)}
						/>
					</View>
				</View>
			</View>

			{/* Pricing & currency */}
			<View style={styles.sectionContainer}>
				<Text style={styles.sectionTitle}>Pricing</Text>

				<Text style={styles.label}>Currency</Text>
				<View
					style={{
						borderWidth: 1,
						borderColor: '#ced4da',
						borderRadius: 10,
						overflow: 'hidden',
						marginBottom: 12,
					}}
				>
					<Picker
						selectedValue={currency}
						onValueChange={(v) => setCurrency(v)}
					>
						<Picker.Item
							label="Nigerian Naira (NGN)"
							value="NGN"
						/>
					</Picker>
				</View>

				<Text style={styles.label}>Price</Text>
				<TextInput
					style={styles.input}
					placeholder="e.g., 5000"
					keyboardType="numeric"
					value={price}
					onChangeText={(t) =>
						setPrice(t.replace(/[^0-9.]/g, ''))
					}
				/>

				<Text style={styles.label}>
					Compare at price (optional)
				</Text>
				<TextInput
					style={styles.input}
					placeholder="e.g., 6000"
					keyboardType="numeric"
					value={compareAtPrice}
					onChangeText={(t) =>
						setCompareAtPrice(t.replace(/[^0-9.]/g, ''))
					}
				/>
			</View>

			{/* Variants */}
			<View style={styles.sectionContainer}>
				<Text style={styles.sectionTitle}>Variants</Text>
				<Text style={{ color: '#6b7280', marginBottom: 8 }}>
					(optional) Add product variants (e.g., Small, Medium)
				</Text>
				{variants.map((v, idx) => (
					<View
						key={`variant-${idx}`}
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							marginBottom: 8,
							gap: 8,
						}}
					>
						<TextInput
							style={[styles.input, { flex: 2 }]}
							placeholder="Name (e.g., Small)"
							value={v.name}
							onChangeText={(t) =>
								updateVariant(idx, 'name', t)
							}
						/>
						<TextInput
							style={[styles.input, { flex: 1 }]}
							placeholder="Price"
							keyboardType="numeric"
							value={v.price}
							onChangeText={(t) =>
								updateVariant(
									idx,
									'price',
									t.replace(/[^0-9.]/g, ''),
								)
							}
						/>
						<TouchableOpacity
							onPress={() => removeVariant(idx)}
						>
							<Text style={{ color: '#dc3545' }}>
								Remove
							</Text>
						</TouchableOpacity>
					</View>
				))}
				<TouchableOpacity
					onPress={addVariant}
					style={[styles.buttonPrimary, { alignSelf: 'flex-start' }]}
				>
					<Text style={styles.buttonPrimaryText}>
						Add variant
					</Text>
				</TouchableOpacity>
			</View>

			{/* Add-ons */}
			<View style={styles.sectionContainer}>
				<Text style={styles.sectionTitle}>Add-ons</Text>
				<Text style={{ color: '#6b7280', marginBottom: 8 }}>
					(optional) Extra options customers can pick
				</Text>
				{addOns.map((a, idx) => (
					<View
						key={`addon-${idx}`}
						style={{
							marginBottom: 8,
						}}
					>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								gap: 8,
							}}
						>
							<TextInput
								style={[styles.input, { flex: 2 }]}
								placeholder="Name (e.g., Gift wrap)"
								value={a.name}
								onChangeText={(t) =>
									updateAddOn(idx, 'name', t)
								}
							/>
							<TextInput
								style={[styles.input, { flex: 1 }]}
								placeholder="Price"
								keyboardType="numeric"
								value={a.price}
								onChangeText={(t) =>
									updateAddOn(
										idx,
										'price',
										t.replace(/[^0-9.]/g, ''),
									)
								}
							/>
							<TouchableOpacity
								onPress={() => removeAddOn(idx)}
							>
								<Text style={{ color: '#dc3545' }}>
									Remove
								</Text>
							</TouchableOpacity>
						</View>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'flex-end',
								alignItems: 'center',
								marginTop: 6,
							}}
						>
							<Text style={{ marginRight: 8 }}>
								Compulsory
							</Text>
							<Switch
								value={!!a.compulsory}
								onValueChange={(v) =>
									updateAddOn(idx, 'compulsory', v)
								}
							/>
						</View>
					</View>
				))}
				<TouchableOpacity
					onPress={addAddOn}
					style={[styles.buttonPrimary, { alignSelf: 'flex-start' }]}
				>
					<Text style={styles.buttonPrimaryText}>
						Add add-on
					</Text>
				</TouchableOpacity>
			</View>

			{/* conditional sections */}
			{type === 'physical' && (
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>
						Physical product details
					</Text>

					<Text style={styles.label}>Inventory count</Text>
					<TextInput
						style={styles.input}
						placeholder="e.g., 100"
						keyboardType="numeric"
						value={String(inventoryCount)}
						onChangeText={(t) =>
							setInventoryCount(t.replace(/[^0-9]/g, ''))
						}
					/>

					<Text style={styles.label}>SKU (optional)</Text>
					<TextInput
						style={styles.input}
						placeholder="SKU"
						value={sku}
						onChangeText={setSku}
					/>

					<Text style={styles.label}>
						Weight (kg) (optional)
					</Text>
					<TextInput
						style={styles.input}
						placeholder="e.g., 0.3"
						keyboardType="numeric"
						value={String(weightKg)}
						onChangeText={(t) =>
							setWeightKg(t.replace(/[^0-9.]/g, ''))
						}
					/>
				</View>
			)}

			{type === 'digital' && (
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>
						Digital product details
					</Text>

					<Text style={styles.label}>
						Download File URL (optional)
					</Text>
					<TextInput
						style={styles.input}
						placeholder="https://..."
						value={downloadUrl}
						onChangeText={setDownloadUrl}
					/>
				</View>
			)}

			{type === 'service' && (
				<View style={styles.sectionContainer}>
					<Text style={styles.sectionTitle}>
						Service / Booking
					</Text>

					<Text style={styles.label}>
						Duration (minutes)
					</Text>
					<TextInput
						style={styles.input}
						value={String(durationMinutes)}
						keyboardType="numeric"
						onChangeText={(t) =>
							setDurationMinutes(t.replace(/[^0-9]/g, ''))
						}
					/>

					<Text style={styles.label}>
						Capacity (number of concurrent bookings)
					</Text>
					<TextInput
						style={styles.input}
						value={String(capacity)}
						keyboardType="numeric"
						onChangeText={(t) =>
							setCapacity(t.replace(/[^0-9]/g, ''))
						}
					/>

					<Text style={styles.label}>
						Booking window (days ahead customers can book)
					</Text>
					<TextInput
						style={styles.input}
						value={String(bookingWindowDays)}
						keyboardType="numeric"
						onChangeText={(t) =>
							setBookingWindowDays(t.replace(/[^0-9]/g, ''))
						}
					/>

					<Text
						style={[styles.sectionTitle, { marginTop: 12 }]}
					>
						Weekly Availability
					</Text>
					{weekdays.map((d) => {
						const day = availability[d];
						return (
							<View key={d} style={{ marginBottom: 8 }}>
								<View
									style={{
										flexDirection: 'row',
										justifyContent: 'space-between',
										alignItems: 'center',
									}}
								>
									<Text style={{ fontWeight: '700' }}>
										{d}
									</Text>
									<View
										style={{
											flexDirection: 'row',
											alignItems: 'center',
										}}
									>
										<Text style={{ marginRight: 8 }}>
											{day.closed
												? 'Closed'
												: `${day.open} - ${day.close}`}
										</Text>
										<Switch
											value={!day.closed}
											onValueChange={(v) =>
												setDayClosed(d, !v)
											}
										/>
									</View>
								</View>

								{!day.closed && (
									<View
										style={{
											flexDirection: 'row',
											marginTop: 6,
											gap: 8,
										}}
									>
										<TextInput
											style={[styles.input, { flex: 1 }]}
											value={day.open}
											onChangeText={(t) =>
												setDayOpenTime(d, t)
											}
											placeholder="09:00"
										/>
										<TextInput
											style={[styles.input, { flex: 1 }]}
											value={day.close}
											onChangeText={(t) =>
												setDayCloseTime(d, t)
											}
											placeholder="17:00"
										/>
									</View>
								)}
							</View>
						);
					})}
				</View>
			)}

			{/* save */}
			<TouchableOpacity
				style={styles.saveButton}
				onPress={handleSave}
				disabled={loading || uploadingImages}
			>
				{loading || uploadingImages ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text style={styles.saveButtonText}>
						{initialProduct ? 'Update item' : 'Add item'}
					</Text>
				)}
			</TouchableOpacity>

			{/* Add category modal */}
			<Modal
				visible={isAddCategoryModalVisible}
				animationType="slide"
				transparent
				onRequestClose={() =>
					setIsAddCategoryModalVisible(false)
				}
			>
				<View style={styles.centeredModalView}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>
							Create Category
						</Text>
						<TextInput
							placeholder="Category name"
							style={styles.textInput}
							value={newCategoryName}
							onChangeText={setNewCategoryName}
						/>
						<View
							style={{
								flexDirection: 'row',
								marginTop: 12,
							}}
						>
							<TouchableOpacity
								style={[
									styles.buttonSecondary,
									{ flex: 1 },
								]}
								onPress={() =>
									setIsAddCategoryModalVisible(false)
								}
							>
								<Text style={styles.buttonSecondaryText}>
									Cancel
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.buttonPrimary,
									{ flex: 1, marginLeft: 10 },
								]}
								onPress={createCategory}
								disabled={creatingCategory}
							>
								{creatingCategory ? (
									<ActivityIndicator color="#fff" />
								) : (
									<Text style={styles.buttonPrimaryText}>
										Create
									</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
		backgroundColor: '#f4f6f8',
		flex: 1,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		marginBottom: 18,
		textAlign: 'center',
		color: '#1f2937',
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 8,
		color: '#374151',
	},
	input: {
		borderWidth: 1,
		borderColor: '#e6e9ee',
		backgroundColor: '#fff',
		padding: 12,
		borderRadius: 10,
		marginBottom: 12,
	},
	descriptionInput: {
		height: 110,
		textAlignVertical: 'top',
	},
	sectionContainer: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 14,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOpacity: 0.04,
		shadowRadius: 6,
		elevation: 2,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 8,
		color: '#111827',
	},
	centeredModalView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.5)',
	},
	modalContent: {
		width: '85%',
		backgroundColor: 'white',
		borderRadius: 12,
		padding: 18,
		alignItems: 'center',
	},
	modalOptionButton: {
		width: '100%',
		paddingVertical: 14,
		borderRadius: 10,
		backgroundColor: '#eef6ff',
		borderWidth: 1,
		borderColor: '#cfe9ff',
		alignItems: 'center',
		marginBottom: 12,
	},
	modalOptionText: { color: '#0b6fbf', fontWeight: '700' },
	modalCancelButton: {
		backgroundColor: '#ffeef0',
		borderColor: '#ffd6db',
	},
	modalCancelButtonText: {
		color: '#b02a37',
		fontWeight: '700',
	},

	saveButton: {
		backgroundColor: '#10b981',
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: 'center',
		marginVertical: 20,
	},
	saveButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},

	modalTitle: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 12,
	},
	textInput: {
		borderWidth: 1,
		borderColor: '#e6e9ee',
		backgroundColor: '#fff',
		padding: 12,
		borderRadius: 10,
		width: '100%',
	},
	buttonPrimary: {
		paddingVertical: 12,
		paddingHorizontal: 25,
		borderRadius: 10,
		backgroundColor: '#28a745',
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonPrimaryText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
	},
	buttonSecondary: {
		paddingVertical: 12,
		paddingHorizontal: 25,
		borderRadius: 10,
		backgroundColor: '#6c757d',
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonSecondaryText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '600',
	},
});

export default AddProduct;
