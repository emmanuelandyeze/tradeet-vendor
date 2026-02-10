// components/AddProduct.js
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
	KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadToCloudinary } from '../utils/cloudinary';
import axiosInstance from '../utils/axiosInstance';
// Keep Picker for Currency/Simple selections if needed,
// but we'll try to use custom UI where possible for better look.
import { Picker } from '@react-native-picker/picker';

const COLORS = {
	primary: '#065637',
	primaryLight: '#E8F5E9',
	secondary: '#F3F4F6',
	text: '#1F2937',
	textLight: '#6B7280',
	border: '#E5E7EB',
	white: '#FFFFFF',
	danger: '#EF4444',
	inputBg: '#F9FAFB',
};

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

	const [isFeatured, setIsFeatured] = useState(
		initialProduct?.isFeatured === true ||
		initialProduct?.isFeatured === 'true' ||
		false,
	);

	// Option Groups (Replaces Variants & AddOns)
	const [optionGroups, setOptionGroups] = useState(() => {
		const g = initialProduct?.optionGroups;
		if (Array.isArray(g)) return g;
		// Backward compatibility migration (optional, purely visual)
		const mig = [];
		if (initialProduct?.variants?.length) {
			mig.push({
				name: 'Variants',
				minSelection: 1,
				maxSelection: 1,
				options: initialProduct.variants.map(v => ({ name: v.name, price: v.price }))
			});
		}
		if (initialProduct?.addOns?.length) {
			mig.push({
				name: 'Add-ons',
				minSelection: 0,
				maxSelection: null, // unlimited
				options: initialProduct.addOns.map(a => ({ name: a.name, price: a.price }))
			});
		}
		return mig;
	});

	// Category Modal
	const [isAddCategoryModalVisible, setIsAddCategoryModalVisible] = useState(false);
	const [isCategoryPickerVisible, setIsCategoryPickerVisible] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');
	const [creatingCategory, setCreatingCategory] = useState(false);

	// Images
	const [images, setImages] = useState(() => {
		if (initialProduct) {
			if (Array.isArray(initialProduct.images)) return initialProduct.images.slice();
			if (initialProduct.thumbnail) return [initialProduct.thumbnail];
			if (initialProduct.image) return [initialProduct.image];
		}
		return [];
	});
	const [imagePickerVisible, setImagePickerVisible] = useState(false);
	const [uploadingImages, setUploadingImages] = useState(false);

	// Pricing
	const [price, setPrice] = useState(
		initialProduct?.price !== undefined ? String(initialProduct.price) : '',
	);
	const [currency, setCurrency] = useState(initialProduct?.currency || 'NGN');
	const [compareAtPrice, setCompareAtPrice] = useState(
		initialProduct?.compareAtPrice !== undefined ? String(initialProduct.compareAtPrice) : '',
	);

	// Order Constraints
	const [minOrderQuantity, setMinOrderQuantity] = useState(
		initialProduct?.minOrderQuantity !== undefined ? String(initialProduct.minOrderQuantity) : '1',
	);
	const [minOrderValue, setMinOrderValue] = useState(
		initialProduct?.minOrderValue !== undefined ? String(initialProduct.minOrderValue) : '',
	);

	// Type Specific
	const [inventoryCount, setInventoryCount] = useState(
		initialProduct?.physical?.inventoryCount ?? initialProduct?.inventoryCount ?? '',
	);
	const [sku, setSku] = useState(
		initialProduct?.physical?.sku ?? initialProduct?.sku ?? '',
	);
	const [weightKg, setWeightKg] = useState(
		initialProduct?.physical?.weightKg ?? '',
	);

	const [downloadUrl, setDownloadUrl] = useState(
		initialProduct?.digital?.files?.[0]?.url ??
		initialProduct?.digital?.downloadUrl ??
		initialProduct?.downloadUrl ??
		'',
	);

	const [durationMinutes, setDurationMinutes] = useState(
		initialProduct?.service?.durationMinutes ?? initialProduct?.durationMinutes ?? 60,
	);
	const [capacity, setCapacity] = useState(initialProduct?.service?.capacity ?? 1);
	const [bookingWindowDays, setBookingWindowDays] = useState(
		initialProduct?.service?.bookingWindowDays ?? 365,
	);
	const [availability, setAvailability] = useState(() => {
		if (initialProduct?.service?.availability) {
			const av = {};
			weekdays.forEach((d) => {
				const dayData = initialProduct.service.availability[d];
				if (!dayData) {
					av[d] = { closed: true, open: '09:00', close: '17:00' };
				} else {
					if (dayData.closed) {
						av[d] = { closed: true, open: '09:00', close: '17:00' };
					} else {
						const openMin = dayData.startMinutes ?? null;
						const closeMin = dayData.endMinutes ?? null;
						const minutesToHM = (m) => {
							if (m === null || m === undefined) return '09:00';
							if (typeof m === 'string' && m.includes(':')) return m;
							const mm = Number(m);
							const hh = Math.floor(mm / 60);
							const mins = mm % 60;
							return `${String(hh).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
						};
						av[d] = { closed: false, open: minutesToHM(openMin), close: minutesToHM(closeMin) };
					}
				}
			});
			return av;
		} else {
			const base = {};
			weekdays.forEach((d) => (base[d] = { closed: false, open: '09:00', close: '17:00' }));
			return base;
		}
	});

	// Effects
	useEffect(() => {
		let mounted = true;
		async function loadCategories() {
			try {
				const res = await axiosInstance.get(`/category/${storeId}?branchId=${branchId}`);
				const catData = Array.isArray(res.data) ? res.data : res.data.categories || res.data.result || [];
				if (mounted && Array.isArray(catData)) {
					setCategoryList(catData);
					if (!selectedCategory && catData.length > 0) setSelectedCategory(catData[0]._id);
				}
			} catch (err) {
				console.warn('Could not load categories', err);
			}
		}
		if (storeId) loadCategories();
		return () => (mounted = false);
	}, [storeId]);

	useEffect(() => {
		if (initialProduct?.type) setType(initialProduct.type);
	}, [initialProduct]);

	// Image handlers
	const pickImageFromGallery = async () => {
		try {
			const res = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				quality: 0.9,
			});
			if (!res.canceled && res.assets?.[0]?.uri) {
				const asset = res.assets[0];
				if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
					return Alert.alert('File Too Large', 'Please upload an image smaller than 10MB.');
				}
				setImages((prev) => [...prev, asset.uri]);
			}
		} finally {
			setImagePickerVisible(false);
		}
	};

	const takePhoto = async () => {
		try {
			const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.9 });
			if (!res.canceled && res.assets?.[0]?.uri) {
				const asset = res.assets[0];
				if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
					return Alert.alert('File Too Large', 'Please take a photo smaller than 10MB.');
				}
				setImages((prev) => [...prev, asset.uri]);
			}
		} finally {
			setImagePickerVisible(false);
		}
	};

	const removeImageAt = (index) => setImages((prev) => prev.filter((_, i) => i !== index));

	const pickDocument = async () => {
		try {
			const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
			if (res.canceled === false || (res.assets && res.assets.length > 0)) {
				const asset = res.assets ? res.assets[0] : res;

				if (asset.size && asset.size > 10 * 1024 * 1024) {
					return Alert.alert('File Too Large', 'Please upload a file smaller than 10MB.');
				}

				setDownloadUrl(asset.uri);
				Alert.alert('File Selected', `Selected: ${asset.name}`);
			}
		} catch (err) {
			console.error('pickDocument error', err);
		}
	};

	// Service Helpers
	const setDayClosed = (day, closed) =>
		setAvailability((prev) => ({ ...prev, [day]: { ...prev[day], closed } }));
	const setDayOpenTime = (day, hhmm) =>
		setAvailability((prev) => ({ ...prev, [day]: { ...prev[day], open: hhmm } }));
	const setDayCloseTime = (day, hhmm) =>
		setAvailability((prev) => ({ ...prev, [day]: { ...prev[day], close: hhmm } }));

	const hhmmToMinutes = (s) => {
		if (!s || typeof s !== 'string') return null;
		const [hh, mm] = s.split(':').map((x) => parseInt(x, 10));
		if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
		return hh * 60 + mm;
	};

	// Upload
	const uploadAllImages = async () => {
		setUploadingImages(true);
		try {
			const resultUrls = [];
			for (const uri of images) {
				if (!uri) continue;
				if (String(uri).startsWith('http')) {
					resultUrls.push(uri);
				} else {
					const resp = await uploadToCloudinary(uri, 'image');
					if (resp?.secure_url || resp?.url) resultUrls.push(resp.secure_url || resp.url);
					else throw new Error('Image upload failed');
				}
			}

			let finalDownloadUrl = downloadUrl;
			if (type === 'digital' && downloadUrl && !downloadUrl.startsWith('http')) {
				const resp = await uploadToCloudinary(downloadUrl, 'raw', 'digital_product');
				if (resp?.secure_url || resp?.url) finalDownloadUrl = resp.secure_url || resp.url;
				else throw new Error('File upload failed');
			}
			return { images: resultUrls, downloadUrl: finalDownloadUrl };
		} finally {
			setUploadingImages(false);
		}
	};

	const createCategory = async () => {
		if (!storeId) return Alert.alert('Error', 'Store information missing. Please restart or select a store.');
		if (!newCategoryName.trim()) return Alert.alert('Validation', 'Category name is required');

		setCreatingCategory(true);
		try {
			const resp = await axiosInstance.post(`/category/${storeId}`, { name: newCategoryName, branchId });
			const created = resp.data?._id ? resp.data : resp.data?.category || resp.data?.result;

			if (created) {
				setCategoryList((prev) => [...prev, created]);
				setSelectedCategory(created._id);
			} else {
				// Fallback generic reload
				const refetch = await axiosInstance.get(`/category/${storeId}`);
				setCategoryList(refetch.data?.categories || refetch.data || []);
			}
			setNewCategoryName('');
			setIsAddCategoryModalVisible(false);
		} catch (err) {
			console.error('Category create error', err);
			const msg = err.response?.data?.message || err.message || 'Failed to create category';
			Alert.alert('Error', msg);
		} finally {
			setCreatingCategory(false);
		}
	};

	// Save
	const handleSave = async () => {
		if (!title.trim()) return Alert.alert('Validation', 'Title is required');
		if (!selectedCategory) return Alert.alert('Validation', 'Select a category');

		let uploadedImages = [];
		let finalDownloadUrl = downloadUrl;

		try {
			const result = await uploadAllImages();
			uploadedImages = result.images;
			finalDownloadUrl = result.downloadUrl;
		} catch (err) {
			return Alert.alert('Upload Error', 'Failed to upload assets.');
		}

		const payload = {
			brand: storeId,
			branchId,
			type,
			title: title.trim(),
			description: description.trim(),
			category: selectedCategory,
			currency,
			images: uploadedImages,
			isFeatured: !!isFeatured,
		};

		if (compareAtPrice && !isNaN(Number(compareAtPrice))) payload.compareAtPrice = Number(compareAtPrice);

		// Order Constraints
		payload.minOrderQuantity = Number(minOrderQuantity) || 1;
		if (minOrderValue && !isNaN(Number(minOrderValue))) payload.minOrderValue = Number(minOrderValue);

		// Clean Option Groups
		const cleanOptions = (opts) => opts.map(o => ({
			name: o.name.trim(),
			price: Number(o.price) || 0
		})).filter(o => o.name);

		const cleanGroups = optionGroups.map(g => ({
			name: g.name.trim(),
			minSelection: Number(g.minSelection) || 0,
			maxSelection: g.maxSelection ? Number(g.maxSelection) : null,
			options: cleanOptions(g.options || [])
		})).filter(g => g.name && g.options.length > 0);

		if (cleanGroups.length) payload.optionGroups = cleanGroups;



		if (type === 'physical') {
			if (!price) return Alert.alert('Validation', 'Price is required');
			payload.price = Number(price);
			payload.physical = {
				inventoryCount: Number(inventoryCount) || 0,
				sku: sku || undefined,
				weightKg: Number(weightKg) || undefined,
			};
		} else if (type === 'digital') {
			payload.price = Number(price) || 0;
			payload.digital = {
				files: finalDownloadUrl ? [{ url: finalDownloadUrl }] : [],
			};
		} else if (type === 'service') {
			if (!durationMinutes) return Alert.alert('Validation', 'Duration is required');
			payload.price = Number(price) || 0;
			payload.service = {
				durationMinutes: Number(durationMinutes),
				capacity: Number(capacity) || 1,
				bookingWindowDays: Number(bookingWindowDays) || 365,
				availability: {},
			};
			weekdays.forEach(d => {
				const day = availability[d];
				if (!day || day.closed) {
					payload.service.availability[d] = { closed: true };
				} else {
					const start = hhmmToMinutes(day.open);
					const end = hhmmToMinutes(day.close);
					if (start !== null && end !== null && end > start) {
						payload.service.availability[d] = { startMinutes: start, endMinutes: end, closed: false };
					} else {
						payload.service.availability[d] = { closed: true };
					}
				}
			});
		}

		try {
			if (initialProduct?._id) await updateProduct(initialProduct._id, payload);
			else await onAddProduct(payload, storeId);
		} catch (err) {
			Alert.alert('Save Error', err?.message || 'Failed to save');
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			enabled={false}
			style={{ flex: 1 }}
			keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
		>
			<ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
				{/* Images */}
				<Section title="Gallery">
					<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
						<TouchableOpacity style={styles.addPhotoBtn} onPress={() => setImagePickerVisible(true)}>
							<Ionicons name="camera-outline" size={28} color={COLORS.primary} />
							<Text style={styles.addPhotoText}>Add Photo</Text>
						</TouchableOpacity>
						{images.map((img, i) => (
							<View key={i} style={styles.imageWrapper}>
								<Image source={{ uri: img }} style={styles.thumbImage} />
								<TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImageAt(i)}>
									<Ionicons name="close" size={12} color="#fff" />
								</TouchableOpacity>
							</View>
						))}
					</ScrollView>
				</Section>

				{/* Basic Details */}
				<Section title="Basic Info">
					<Label text="Product Type" />
					<TypeSelector type={type} setType={setType} />

					<Label text="Product Title" />
					<Input value={title} onChangeText={setTitle} placeholder="e.g. Cotton T-Shirt" />

					<Label text="Description" />
					<Input value={description} onChangeText={setDescription} placeholder="Describe your product..." multiline />

					<Label text="Category" />
					<TouchableOpacity style={styles.selectBtn} onPress={() => setIsCategoryPickerVisible(true)}>
						<Text style={styles.selectBtnText}>{categoryList.find(c => c._id === selectedCategory)?.name || 'Select Category'}</Text>
						<Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
					</TouchableOpacity>

					<View style={styles.switchRow}>
						<Text style={styles.switchLabel}>Feature on Homepage</Text>
						<Switch
							trackColor={{ false: "#E5E7EB", true: COLORS.primaryLight }}
							thumbColor={isFeatured ? COLORS.primary : "#f4f3f4"}
							value={isFeatured}
							onValueChange={setIsFeatured}
						/>
					</View>
				</Section>

				{/* Pricing */}
				<Section title="Pricing">
					<View style={styles.row}>
						<View style={{ flex: 1, marginRight: 8 }}>
							<Label text="Price" />
							<View style={styles.priceInputWrap}>
								<Text style={styles.currencyPrefix}>{currency}</Text>
								<TextInput
									style={styles.priceInput}
									value={price}
									onChangeText={t => setPrice(t.replace(/[^0-9.]/g, ''))}
									keyboardType="numeric"
									placeholder="0.00"
								/>
							</View>
						</View>
						<View style={{ flex: 1, marginLeft: 8 }}>
							<Label text="Compare At (Optional)" />
							<View style={styles.priceInputWrap}>
								<Text style={styles.currencyPrefix}>{currency}</Text>
								<TextInput
									style={styles.priceInput}
									value={compareAtPrice}
									onChangeText={t => setCompareAtPrice(t.replace(/[^0-9.]/g, ''))}
									keyboardType="numeric"
									placeholder="0.00"
								/>
							</View>
						</View>
					</View>
				</Section>

				{/* Order Restrictions */}
				<Section title="Order Rules">
					<View style={styles.row}>
						<View style={{ flex: 1, marginRight: 8 }}>
							<Label text="Min Order Qty" />
							<Input
								value={minOrderQuantity}
								onChangeText={t => setMinOrderQuantity(t.replace(/[^0-9]/g, ''))}
								keyboardType="numeric"
								placeholder="1"
							/>
						</View>
						<View style={{ flex: 1, marginLeft: 8 }}>
							<Label text="Min Order Value" />
							<View style={styles.priceInputWrap}>
								<Text style={styles.currencyPrefix}>{currency}</Text>
								<TextInput
									style={styles.priceInput}
									value={minOrderValue}
									onChangeText={t => setMinOrderValue(t.replace(/[^0-9.]/g, ''))}
									keyboardType="numeric"
									placeholder="0.00"
								/>
							</View>
						</View>
					</View>
				</Section>

				{/* Type Specific */}
				{type === 'physical' && (
					<Section title="Inventory & Shipping">
						<View style={styles.row}>
							<View style={{ flex: 1, marginRight: 8 }}>
								<Label text="Stock" />
								<Input value={String(inventoryCount)} onChangeText={t => setInventoryCount(t.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="0" />
							</View>
							<View style={{ flex: 1, marginLeft: 8 }}>
								<Label text="Weight (kg)" />
								<Input value={String(weightKg)} onChangeText={t => setWeightKg(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" placeholder="0.0" />
							</View>
						</View>
						<Label text="SKU (Optional)" />
						<Input value={sku} onChangeText={setSku} placeholder="Product SKU" />
					</Section>
				)}

				{type === 'digital' && (
					<Section title="Digital File">
						<TouchableOpacity style={styles.fileUploadBtn} onPress={pickDocument}>
							<View style={styles.fileIconCircle}>
								<Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.fileUploadTitle}>
									{downloadUrl && !downloadUrl.startsWith('http') ? 'File Selected' : 'Upload File'}
								</Text>
								<Text style={styles.fileUploadSub} numberOfLines={1}>
									{downloadUrl ? downloadUrl.split('/').pop() : 'PDF, eBook, Zip, etc.'}
								</Text>
							</View>
							<Ionicons name="cloud-upload-outline" size={24} color={COLORS.textLight} />
						</TouchableOpacity>

						<View style={styles.dividerWithText}><Text style={styles.dividerText}>OR</Text></View>

						<Label text="External URL" />
						<Input value={downloadUrl} onChangeText={setDownloadUrl} placeholder="https://example.com/file" />
					</Section>
				)}

				{type === 'service' && (
					<>
						<Section title="Service Details">
							<View style={styles.row}>
								<View style={{ flex: 1, marginRight: 8 }}>
									<Label text="Duration (min)" />
									<Input value={String(durationMinutes)} onChangeText={t => setDurationMinutes(t.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
								</View>
								<View style={{ flex: 1, marginLeft: 8 }}>
									<Label text="Capacity" />
									<Input value={String(capacity)} onChangeText={t => setCapacity(t.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
								</View>
							</View>
							<Label text="Booking Window (Days)" />
							<Input value={String(bookingWindowDays)} onChangeText={t => setBookingWindowDays(t.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
						</Section>

						<Section title="Availability">
							{weekdays.map(d => (
								<View key={d} style={styles.dayRow}>
									<View style={{ flex: 1 }}>
										<Text style={styles.dayName}>{d}</Text>
									</View>
									<View style={{ flex: 2, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
										{availability[d].closed ? (
											<Text style={styles.closedText}>Closed</Text>
										) : (
											<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
												<TextInput style={styles.tinyInput} value={availability[d].open} onChangeText={t => setDayOpenTime(d, t)} placeholder="09:00" />
												<Text>-</Text>
												<TextInput style={styles.tinyInput} value={availability[d].close} onChangeText={t => setDayCloseTime(d, t)} placeholder="17:00" />
											</View>
										)}
										<Switch
											style={{ marginLeft: 8, transform: [{ scale: 0.8 }] }}
											trackColor={{ false: "#E5E7EB", true: COLORS.primaryLight }}
											thumbColor={!availability[d].closed ? COLORS.primary : "#f4f3f4"}
											value={!availability[d].closed}
											onValueChange={v => setDayClosed(d, !v)}
										/>
									</View>
								</View>
							))}
						</Section>
					</>
				)}

				{/* Option Groups */}
				<Section title="Product Options">
					<Text style={styles.sectionSubtitle}>
						Create groups like "Sizes", "Colors", or "Toppings".
					</Text>

					{optionGroups.map((group, gIndex) => (
						<View key={gIndex} style={styles.groupCard}>
							<View style={styles.groupHeader}>
								<Input
									style={{ flex: 1, marginBottom: 0, fontWeight: 'bold' }}
									placeholder="Group Name (e.g. Size, Color)"
									value={group.name}
									onChangeText={t => {
										const n = [...optionGroups]; n[gIndex].name = t; setOptionGroups(n);
									}}
								/>
								<TouchableOpacity onPress={() => setOptionGroups(prev => prev.filter((_, i) => i !== gIndex))} style={styles.removeGroupBtn}>
									<Ionicons name="trash-outline" size={20} color={COLORS.danger} />
								</TouchableOpacity>
							</View>

							<View style={styles.groupControls}>
								<View style={styles.controlRow}>
									<Text style={styles.controlLabel}>Required?</Text>
									<Switch
										value={group.minSelection > 0}
										onValueChange={v => {
											const n = [...optionGroups];
											n[gIndex].minSelection = v ? 1 : 0;
											setOptionGroups(n);
										}}
										trackColor={{ false: "#E5E7EB", true: COLORS.primaryLight }}
										thumbColor={group.minSelection > 0 ? COLORS.primary : "#f4f3f4"}
									/>
								</View>
								<View style={styles.controlRow}>
									<Text style={styles.controlLabel}>Allow Multiple?</Text>
									<Switch
										value={!group.maxSelection || group.maxSelection > 1}
										onValueChange={v => {
											const n = [...optionGroups];
											// If true (allow multiple), set to null (unlimited) or high number. 
											// If false (single), max is 1.
											n[gIndex].maxSelection = v ? null : 1;
											setOptionGroups(n);
										}}
										trackColor={{ false: "#E5E7EB", true: COLORS.primaryLight }}
										thumbColor={(!group.maxSelection || group.maxSelection > 1) ? COLORS.primary : "#f4f3f4"}
									/>
								</View>
							</View>

							<View style={styles.optionsList}>
								{group.options?.map((opt, oIndex) => (
									<View key={oIndex} style={styles.variantRow}>
										<Input
											style={{ flex: 2, marginBottom: 0 }}
											placeholder="Option Name"
											value={opt.name}
											onChangeText={t => {
												const n = [...optionGroups];
												n[gIndex].options[oIndex].name = t;
												setOptionGroups(n);
											}}
										/>
										<Input
											style={{ flex: 1, marginLeft: 8, marginBottom: 0 }}
											placeholder="Price"
											value={String(opt.price || '')}
											onChangeText={t => {
												const n = [...optionGroups];
												n[gIndex].options[oIndex].price = t.replace(/[^0-9.]/g, '');
												setOptionGroups(n);
											}}
											keyboardType="numeric"
										/>
										<TouchableOpacity
											onPress={() => {
												const n = [...optionGroups];
												n[gIndex].options = n[gIndex].options.filter((_, i) => i !== oIndex);
												setOptionGroups(n);
											}}
											style={styles.removeIconBtn}
										>
											<Ionicons name="close-circle-outline" size={24} color={COLORS.textLight} />
										</TouchableOpacity>
									</View>
								))}
								<TouchableOpacity
									style={styles.addSimpleBtn}
									onPress={() => {
										const n = [...optionGroups];
										if (!n[gIndex].options) n[gIndex].options = [];
										n[gIndex].options.push({ name: '', price: '' });
										setOptionGroups(n);
									}}
								>
									<Ionicons name="add" size={16} color={COLORS.primary} />
									<Text style={styles.addSimpleText}>Add Option</Text>
								</TouchableOpacity>
							</View>
						</View>
					))}

					<TouchableOpacity style={styles.addMoreBtn} onPress={() => setOptionGroups([...optionGroups, { name: '', minSelection: 0, maxSelection: 1, options: [] }])}>
						<Ionicons name="add-circle" size={24} color={COLORS.primary} />
						<Text style={[styles.addMoreText, { fontSize: 16, fontWeight: '600' }]}>Add Option Group</Text>
					</TouchableOpacity>
				</Section>

				<TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading || uploadingImages}>
					{loading || uploadingImages ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.saveBtnText}>{initialProduct ? 'Update Product' : 'Create Product'}</Text>
					)}
				</TouchableOpacity>
			</ScrollView>

			{/* Category Picker Modal */}
			<Modal visible={isCategoryPickerVisible} animationType="slide" transparent onRequestClose={() => setIsCategoryPickerVisible(false)}>
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsCategoryPickerVisible(false)}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Select Category</Text>
							<TouchableOpacity onPress={() => {
								setIsCategoryPickerVisible(false);
								setTimeout(() => setIsAddCategoryModalVisible(true), 500);
							}}>
								<Text style={{ color: COLORS.primary, fontWeight: '600' }}>+ Create New</Text>
							</TouchableOpacity>
						</View>
						<FlatList
							data={categoryList}
							keyExtractor={i => i._id}
							renderItem={({ item }) => (
								<TouchableOpacity style={styles.catItem} onPress={() => { setSelectedCategory(item._id); setIsCategoryPickerVisible(false); }}>
									<Text style={[styles.catItemText, selectedCategory === item._id && { color: COLORS.primary, fontWeight: '700' }]}>
										{item.name}
									</Text>
									{selectedCategory === item._id && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
								</TouchableOpacity>
							)}
							ListEmptyComponent={<Text style={{ padding: 20, textAlign: 'center', color: '#999' }}>No categories found.</Text>}
						/>
						<TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsCategoryPickerVisible(false)}>
							<Text style={styles.modalCloseText}>Close</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>

			{/* Add Category Modal */}
			<Modal visible={isAddCategoryModalVisible} animationType="fade" transparent onRequestClose={() => setIsAddCategoryModalVisible(false)}>
				<View style={styles.centeredModal}>
					<View style={styles.dialogCard}>
						<Text style={styles.dialogTitle}>New Category</Text>
						<TextInput
							style={styles.dialogInput}
							placeholder="Category Name"
							value={newCategoryName}
							onChangeText={setNewCategoryName}
							autoFocus
						/>
						<View style={styles.dialogActions}>
							<TouchableOpacity onPress={() => setIsAddCategoryModalVisible(false)} style={styles.dialogBtn}>
								<Text style={styles.dialogBtnText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={createCategory} disabled={creatingCategory} style={[styles.dialogBtn, { backgroundColor: COLORS.primary }]}>
								{creatingCategory ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.dialogBtnText, { color: '#fff' }]}>Create</Text>}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Image Picker Modal */}
			<Modal visible={imagePickerVisible} transparent animationType="slide" onRequestClose={() => setImagePickerVisible(false)}>
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setImagePickerVisible(false)}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Add Photo</Text>
						<TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
							<Ionicons name="camera-outline" size={24} color={COLORS.text} />
							<Text style={styles.modalOptionText}>Take Photo</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.modalOption} onPress={pickImageFromGallery}>
							<Ionicons name="images-outline" size={24} color={COLORS.text} />
							<Text style={styles.modalOptionText}>Choose from Gallery</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.modalOption, { borderBottomWidth: 0 }]} onPress={() => setImagePickerVisible(false)}>
							<Text style={{ color: COLORS.danger, fontWeight: '600' }}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>
		</KeyboardAvoidingView>
	);
};

// Helper Components
const Section = ({ title, children, style }) => (
	<View style={[styles.card, style]}>
		{title && <Text style={styles.cardTitle}>{title}</Text>}
		{children}
	</View>
);

const Label = ({ text }) => <Text style={styles.label}>{text}</Text>;

const Input = ({ style, multiline, ...props }) => (
	<TextInput
		style={[styles.input, multiline && styles.textArea, style]}
		placeholderTextColor="#9CA3AF"
		multiline={multiline}
		{...props}
	/>
);

const TypeSelector = ({ type, setType }) => (
	<View style={styles.segmentContainer}>
		{['physical', 'digital', 'service'].map((t) => (
			<TouchableOpacity
				key={t}
				style={[styles.segmentBtn, type === t && styles.segmentBtnActive]}
				onPress={() => setType(t)}
			>
				<Text style={[styles.segmentText, type === t && styles.segmentTextActive]}>
					{t.charAt(0).toUpperCase() + t.slice(1)}
				</Text>
			</TouchableOpacity>
		))}
	</View>
);

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F3F4F6' },
	screenTitle: { fontSize: 24, fontWeight: '800', margin: 20, marginBottom: 10, color: COLORS.text },
	card: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 20,
		marginHorizontal: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 5,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: COLORS.text },
	label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 4 },
	input: {
		backgroundColor: COLORS.inputBg,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 12,
		padding: 12,
		marginBottom: 16,
		fontSize: 15,
		color: COLORS.text,
	},
	sectionSubtitle: {
		fontSize: 13,
		color: COLORS.textLight,
		marginBottom: 12,
		fontStyle: 'italic',
	},
	groupCard: {
		backgroundColor: '#F9FAFB',
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#E5E7EB',
	},
	groupHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 8,
	},
	removeGroupBtn: {
		padding: 8,
	},
	groupControls: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
		paddingHorizontal: 4,
	},
	controlRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	controlLabel: {
		fontSize: 13,
		color: COLORS.text,
		fontWeight: '600',
	},
	optionsList: {
		borderTopWidth: 1,
		borderTopColor: '#E5E7EB',
		paddingTop: 12,
	},
	addSimpleBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 4,
	},
	addSimpleText: {
		color: COLORS.primary,
		fontWeight: '600',
		fontSize: 14,
		marginLeft: 4,
	},

	textArea: { height: 100, textAlignVertical: 'top' },

	// Segment Control
	segmentContainer: {
		flexDirection: 'row',
		backgroundColor: COLORS.inputBg,
		borderRadius: 12,
		padding: 4,
		marginBottom: 16,
	},
	segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
	segmentBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
	segmentText: { color: COLORS.textLight, fontWeight: '600', fontSize: 13 },
	segmentTextActive: { color: COLORS.primary, fontWeight: '700' },

	// Select Button
	selectBtn: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: COLORS.inputBg,
		borderWidth: 1,
		borderColor: COLORS.border,
		padding: 14,
		borderRadius: 12,
		marginBottom: 16,
	},
	selectBtnText: { fontSize: 16, color: COLORS.text },

	// Images
	addPhotoBtn: {
		width: 100,
		height: 100,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: COLORS.border,
		borderStyle: 'dashed',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
		backgroundColor: '#FAFAFA',
	},
	addPhotoText: { marginTop: 8, fontSize: 12, color: COLORS.primary, fontWeight: '600' },
	imageWrapper: { position: 'relative', marginRight: 12 },
	thumbImage: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#eee' },
	removeImageBtn: {
		position: 'absolute',
		top: -6,
		right: -6,
		backgroundColor: COLORS.danger,
		width: 22,
		height: 22,
		borderRadius: 11,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: '#fff',
	},

	// Pricing
	row: { flexDirection: 'row' },
	priceInputWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLORS.inputBg,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		marginBottom: 16,
	},
	currencyPrefix: { fontSize: 16, fontWeight: '600', color: COLORS.textLight, marginRight: 8 },
	priceInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: COLORS.text },

	// File Upload
	fileUploadBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLORS.primaryLight,
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.primary,
		borderStyle: 'dashed',
	},
	fileIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
	fileUploadTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
	fileUploadSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
	dividerWithText: { alignItems: 'center', marginVertical: 16 },
	dividerText: { color: COLORS.textLight, fontWeight: '600', fontSize: 12 },

	// Switches
	switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
	switchLabel: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
	switchLabelSmall: { fontSize: 14, color: COLORS.textLight, marginRight: 8 },

	// Service
	dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	dayName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
	tinyInput: {
		backgroundColor: COLORS.inputBg,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 8,
		paddingVertical: 4,
		paddingHorizontal: 8,
		width: 60,
		textAlign: 'center',
		fontSize: 14,
	},
	closedText: { color: COLORS.textLight, fontSize: 14, marginRight: 8 },

	// Variants
	variantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
	removeIconBtn: { marginLeft: 8, padding: 8, justifyContent: 'center' },
	addMoreBtn: { flexDirection: 'row', alignItems: 'center', padding: 8 },
	addMoreText: { color: COLORS.primary, fontWeight: '600', marginLeft: 4 },

	// Modals
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
	modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
	modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
	catItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between' },
	catItemText: { fontSize: 16, color: COLORS.text },
	modalCloseBtn: { marginTop: 20, paddingVertical: 14, backgroundColor: COLORS.secondary, borderRadius: 12, alignItems: 'center' },
	modalCloseText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
	modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	modalOptionText: { fontSize: 16, marginLeft: 16, color: COLORS.text },

	centeredModal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
	dialogCard: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 24 },
	dialogTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
	dialogInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 20 },
	dialogActions: { flexDirection: 'row', gap: 12 },
	dialogBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.secondary },
	dialogBtnText: { fontWeight: '600', color: COLORS.text },

	// Main Save
	saveBtn: {
		backgroundColor: COLORS.primary,
		margin: 16,
		paddingVertical: 16,
		borderRadius: 16,
		alignItems: 'center',
		shadowColor: COLORS.primary,
		shadowOpacity: 0.3,
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 8,
		elevation: 4,
	},
	saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

export default AddProduct;
