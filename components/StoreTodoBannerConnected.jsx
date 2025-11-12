// components/StoreTodoBannerConnected.js
import React, {
	useEffect,
	useState,
	useContext,
	useCallback,
} from 'react';
import { Alert } from 'react-native';
import axiosInstance from '@/utils/axiosInstance';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import StoreTodoBanner from './StoreTodoBanner'; // expects the component you already added

/**
 * This component fetches the store (from context or storeId prop),
 * generates "todo" tasks by checking required fields, and renders
 * StoreTodoBanner with actionable items.
 *
 * Props:
 *   - storeId?: string  // optional override; otherwise uses selectedStore from AuthContext
 *   - refreshIntervalMs?: number // optional polling (not enabled by default)
 */
const StoreTodoBannerConnected = ({
	storeId: storeIdProp,
	refreshIntervalMs,
}) => {
	const router = useRouter();
	const { selectedStore } = useContext(AuthContext);
	const [store, setStore] = useState(selectedStore ?? null);
	const [loading, setLoading] = useState(false);

	const storeId = selectedStore?._id;

	const fetchStore = useCallback(async (id) => {
		if (!id) return;
		setLoading(true);
		try {
			// Your backend endpoint earlier used: GET /stores?id=<id>
			const resp = await axiosInstance.get(
				`/stores?id=${id}`,
			);
			// support both resp.data.store or resp.data
			const s = resp.data?.store ?? resp.data;
			setStore(s);
		} catch (err) {
			console.error(
				'Store fetch error',
				err?.response?.data || err,
			);
			// non-fatal: show nothing but log
		} finally {
			setLoading(false);
		}
	}, []);

	// initial load & whenever selectedStore/storeIdProp changes
	useEffect(() => {
		if (storeId) fetchStore(storeId);
	}, [storeId, fetchStore]);

	console.log(store, 'stores', selectedStore?._id)

	// optional poll to keep tasks fresh
	useEffect(() => {
		if (!refreshIntervalMs || !storeId) return;
		const iv = setInterval(
			() => fetchStore(storeId),
			refreshIntervalMs,
		);
		return () => clearInterval(iv);
	}, [refreshIntervalMs, storeId, fetchStore]);

	// helpers / checks
	const isUrl = (u) =>
		typeof u === 'string' && /^https?:\/\//i.test(u);

	const hasOpeningHours = (oh) => {
		if (!oh || typeof oh !== 'object') return false;
		// consider done if at least one day is open and not closed
		return Object.values(oh).some(
			(d) =>
				d &&
				!d.closed &&
				typeof d.open === 'number' &&
				typeof d.close === 'number',
		);
	};

	const buildTasks = (s) => {
		if (!s) return [];
		const tasks = [];

		// 1. Logo
		if (!isUrl(s.logoUrl)) {
			tasks.push({
				id: 'logo',
				title: 'Add business logo',
				subtitle:
					'Customers recognise your brand by its logo',
				urgent: true,
				progress: s.logoUrl ? 0.0 : 0.0,
				actionLabel: 'Upload logo',
				onPress: () => router.push(`/(app)/setupstore`),
			});
		}

		// 2. Banner
		// if (!isUrl(s.bannerUrl)) {
		// 	tasks.push({
		// 		id: 'banner',
		// 		title: 'Add store banner',
		// 		subtitle:
		// 			'A banner increases click-through on your page',
		// 		urgent: false,
		// 		progress: s.bannerUrl ? 0.0 : 0.0,
		// 		actionLabel: 'Upload banner',
		// 		onPress: () =>
		// 			router.push(`/stores/${s._id}/edit?tab=branding`),
		// 	});
		// }

		// 3. Description
		// if (
		// 	!s.description ||
		// 	String(s.description).trim().length < 20
		// ) {
		// 	tasks.push({
		// 		id: 'description',
		// 		title: 'Complete your store description',
		// 		subtitle:
		// 			'Tell customers what you sell in 1–2 lines',
		// 		urgent: false,
		// 		progress: s.description ? 0.2 : 0.0,
		// 		actionLabel: 'Edit description',
		// 		onPress: () =>
		// 			router.push(`/stores/${s._id}/edit?tab=branding`),
		// 	});
		// }

		// 4. Opening hours
		if (!hasOpeningHours(s?.branch?.openingHours)) {
			tasks.push({
				id: 'hours',
				title: `Set opening hours for ${selectedStore?.name}`,
				subtitle: 'Let customers know when you are open',
				urgent: true,
				progress: 0.0,
				actionLabel: 'Set hours',
				onPress: () => router.push(`/(app)/business-hours`),
			});
		}

		// 5. Store link (slug)
		// if (!s.storeLink || String(s.storeLink).trim() === '') {
		// 	tasks.push({
		// 		id: 'storeLink',
		// 		title: 'Create a store link',
		// 		subtitle:
		// 			'A short, unique link helps promotion and sharing',
		// 		urgent: false,
		// 		progress: 0.0,
		// 		actionLabel: 'Create link',
		// 		onPress: () =>
		// 			router.push(`/stores/${s._id}/edit?tab=branding`),
		// 	});
		// }

		// 6. Verification (admin/store verification)
		// if (!s.isVerified) {
		// 	tasks.push({
		// 		id: 'verify',
		// 		title: 'Verify your store',
		// 		subtitle:
		// 			'Verification builds trust and may increase visibility',
		// 		urgent: s.isVerified === false,
		// 		progress: 0.0,
		// 		actionLabel: 'Verify',
		// 		onPress: () =>
		// 			router.push(`/stores/${s._id}/verify`),
		// 	});
		// }

		// 7. Payment details
		const hasPayment =
			Array.isArray(s.paymentInfo) &&
			s.paymentInfo.length > 0;
		const hasPrimary =
			hasPayment && s.paymentInfo.some((p) => p.isPrimary);
		if (!hasPayment || !hasPrimary) {
			tasks.push({
				id: 'payment',
				title: 'Add payment details',
				subtitle: hasPayment
					? 'Set a primary account for payouts'
					: 'Add a bank account so you can receive payouts',
				urgent: !hasPrimary,
				progress: hasPayment ? 0.5 : 0.0,
				actionLabel: 'Add payment',
				onPress: () =>
					router.push(`/(app)/payment-info`),
			});
		}

		// 8. Location
		// if (
		// 	!s.location ||
		// 	!Array.isArray(s.location.coordinates) ||
		// 	s.location.coordinates.length !== 2
		// ) {
		// 	tasks.push({
		// 		id: 'location',
		// 		title: 'Set store location',
		// 		subtitle:
		// 			'Enable accurate delivery and map display',
		// 		urgent: false,
		// 		progress: 0.0,
		// 		actionLabel: 'Set location',
		// 		onPress: () =>
		// 			router.push(`/stores/${s._id}/edit?tab=location`),
		// 	});
		// }

		// 9. Email / contact
		// if (!s.email || String(s.email).trim() === '') {
		// 	tasks.push({
		// 		id: 'email',
		// 		title: 'Add contact email',
		// 		subtitle: 'Customers need a way to reach you',
		// 		urgent: false,
		// 		progress: 0.0,
		// 		actionLabel: 'Add email',
		// 		onPress: () =>
		// 			router.push(`/stores/${s._id}/edit?tab=branding`),
		// 	});
		// }

		// 10. Category
		// if (!s.category || String(s.category).trim() === '') {
		// 	tasks.push({
		// 		id: 'category',
		// 		title: 'Add a category',
		// 		subtitle: 'Helps customers discover your store',
		// 		urgent: false,
		// 		progress: 0.0,
		// 		actionLabel: 'Choose category',
		// 		onPress: () =>
		// 			router.push(`/stores/${s._id}/edit?tab=branding`),
		// 	});
		// }

		// 11. Reviews (optional)
		// if (s.reviewsEnabled === false) {
		// 	tasks.push({
		// 		id: 'reviews',
		// 		title: 'Enable reviews & ratings',
		// 		subtitle: 'Allow customers to leave feedback',
		// 		urgent: false,
		// 		progress: 0.0,
		// 		actionLabel: 'Enable reviews',
		// 		onPress: () =>
		// 			router.push(`/stores/${s._id}/edit?tab=settings`),
		// 	});
		// }

		// Prioritize: urgent first then by order added
		tasks.sort(
			(a, b) => (b.urgent === true) - (a.urgent === true),
		);

		return tasks;
	};

	const tasks = buildTasks(store);

	// if no tasks to show, return null (no banner)
	if (!tasks || tasks.length === 0) return null;

	return <StoreTodoBanner tasks={tasks} />;
};

export default StoreTodoBannerConnected;
