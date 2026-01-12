// contexts/ProductsContext.js
import React, {
	createContext,
	useState,
	useEffect,
	useContext,
} from 'react';
import axiosInstance from '@/utils/axiosInstance';
import { AuthContext } from '@/context/AuthContext';

// Create Products Context
const ProductsContext = createContext();

// Helper to normalize server list shapes
function normalizeListResponse(resp) {
	// handle common response shapes:
	// { items: [...] } | { products: [...] } | [...]
	if (!resp) return [];
	if (Array.isArray(resp)) return resp;
	if (resp.items && Array.isArray(resp.items))
		return resp.items;
	if (resp.products && Array.isArray(resp.products))
		return resp.products;
	// fallback: server might return { data: [...] } but axios already unwraps data
	return [];
}

// Products Provider
const ProductsProvider = ({ children }) => {
	const { selectedStore } = useContext(AuthContext);

	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Fetch all products by storeId (optionally filtered by branchId)
	// signature: fetchProductsByStore(storeId, branchId = null, opts = { page, q, limit })
	const fetchProductsByStore = async (
		storeId,
		branchId = null,
		opts = {},
	) => {
		setLoading(true);
		setError(null);
		try {
			const params = {
				...((opts.page && { page: opts.page }) || {}),
				...((opts.limit && { limit: opts.limit }) || {}),
				...(opts.q ? { q: opts.q } : {}),
				...(branchId ? { branchId } : {}),
			};

			// endpoint: GET /catalog/stores/:storeId/private?branchId=...
			const response = await axiosInstance.get(
				`/catalog/stores/${storeId}/private`,
				{ params },
			);

			// normalize response: prefer { items, total, page, perPage } if present
			const data = response.data;
			// if API returns array directly, we keep that; otherwise return structured object
			if (Array.isArray(data)) {
				setProducts(data);
				setLoading(false);
				return {
					items: data,
					total: data.length,
					page: opts.page || 1,
					perPage: opts.limit || data.length,
				};
			}

			const items = data.items ?? data; // support both shapes
			setProducts(items);
			setLoading(false);
			return data;
		} catch (err) {
			setError(
				err.response?.data?.message ||
				err.message ||
				'Failed to fetch product',
			);
			setLoading(false);
			throw err;
		}
	};

	/**
	 * addProduct
	 * - productData: body or FormData (if uploading images)
	 * - storeId optional override (branch-aware). If omitted uses selectedStore._id
	 */
	const addProduct = async (
		productData,
		storeId = null,
	) => {
		setLoading(true);
		setError(null);

		const resolvedStoreId = storeId || selectedStore?._id;
		if (!resolvedStoreId) {
			const e = new Error('No store/branch selected');
			setError(e.message);
			setLoading(false);
			throw e;
		}

		try {
			const resp = await axiosInstance.post(
				`/catalog/stores/${resolvedStoreId}`,
				productData,
			);

			// server may return the created item as resp.data.item or resp.data
			const created =
				resp?.data?.item ?? resp?.data ?? null;
			if (!created) {
				const e = new Error('Invalid response from server');
				setError(e.message);
				setLoading(false);
				throw e;
			}

			// append to list
			setProducts((prev) =>
				Array.isArray(prev)
					? [...prev, created]
					: [created],
			);
			setLoading(false);
			return created;
		} catch (err) {
			const msg =
				err.response?.data?.message ||
				err.message ||
				'Failed to add product';
			setError(msg);
			setLoading(false);
			throw err;
		}
	};

	/**
	 * updateProduct
	 * - id: product id
	 * - updatedProductData: body or FormData
	 * Note: endpoint kept as /catalog/:id (matches your server routes). No storeId needed.
	 */
	const updateProduct = async (id, updatedProductData) => {
		setLoading(true);
		setError(null);
		try {
			const resp = await axiosInstance.put(
				`/catalog/${id}`,
				updatedProductData,
			);

			const updatedItem =
				resp?.data?.item ?? resp?.data ?? null;

			if (!updatedItem) {
				throw new Error('Invalid response from server');
			}

			setProducts((prev) => {
				if (!Array.isArray(prev)) return [updatedItem];
				return prev.map((product) => {
					if (String(product._id) === String(id)) {
						// Preserve populated category if ID matches
						if (
							typeof updatedItem.category === 'string' &&
							product.category &&
							product.category._id === updatedItem.category
						) {
							updatedItem.category = product.category;
						}
						return updatedItem;
					}
					return product;
				});
			});

			setLoading(false);
			return updatedItem;
		} catch (err) {
			console.error('updateProduct error', err);
			const msg =
				err?.response?.data?.message ||
				err?.message ||
				'Failed to update product';
			setError(msg);
			setLoading(false);
			throw err;
		}
	};

	/**
	 * deleteProduct (by product id)
	 */
	const deleteProduct = async (id) => {
		setLoading(true);
		setError(null);
		try {
			await axiosInstance.delete(`/catalog/${id}`);
			setProducts((prev) =>
				Array.isArray(prev)
					? prev.filter((p) => String(p._id) !== String(id))
					: [],
			);
			setLoading(false);
			return true;
		} catch (err) {
			const msg =
				err.response?.data?.message ||
				err.message ||
				'Failed to delete product';
			setError(msg);
			setLoading(false);
			throw err;
		}
	};

	/**
	 * updateVariant / deleteVariant / updateAddon / deleteAddon
	 * - These operate at product level. We'll keep the endpoints you had but adapt mapping.
	 * - If your backend endpoints differ, adjust the paths accordingly.
	 */
	const updateVariant = async (
		productId,
		variantId,
		updatedVariant,
	) => {
		setLoading(true);
		setError(null);
		try {
			// endpoint may differ; adjust if your server uses /catalog/:productId/variants/:variantId
			const resp = await axiosInstance.put(
				`/catalog/${productId}/variants/${variantId}`,
				updatedVariant,
			);
			const updatedProduct =
				resp?.data?.item ?? resp?.data ?? null;
			if (!updatedProduct)
				throw new Error('Invalid response');
			setProducts((prev) =>
				prev.map((p) =>
					String(p._id) === String(productId)
						? updatedProduct
						: p,
				),
			);
			setLoading(false);
			return updatedProduct;
		} catch (err) {
			const msg =
				err?.response?.data?.message ||
				err?.message ||
				'Failed to update variant';
			setError(msg);
			setLoading(false);
			throw err;
		}
	};

	const deleteVariant = async (productId, variantId) => {
		setLoading(true);
		setError(null);
		try {
			await axiosInstance.delete(
				`/catalog/${productId}/variants/${variantId}`,
			);
			setProducts((prev) =>
				prev.map((p) => {
					if (String(p._id) !== String(productId)) return p;
					return {
						...p,
						variants: (p.variants || []).filter(
							(v) => String(v._id) !== String(variantId),
						),
					};
				}),
			);
			setLoading(false);
			return true;
		} catch (err) {
			const msg =
				err?.response?.data?.message ||
				err?.message ||
				'Failed to delete variant';
			setError(msg);
			setLoading(false);
			throw err;
		}
	};

	const updateAddon = async (
		productId,
		addonId,
		updatedAddon,
	) => {
		setLoading(true);
		setError(null);
		try {
			const resp = await axiosInstance.put(
				`/catalog/${productId}/addons/${addonId}`,
				updatedAddon,
			);
			const updatedProduct =
				resp?.data?.item ?? resp?.data ?? null;
			if (!updatedProduct)
				throw new Error('Invalid response');
			setProducts((prev) =>
				prev.map((p) =>
					String(p._id) === String(productId)
						? updatedProduct
						: p,
				),
			);
			setLoading(false);
			return updatedProduct;
		} catch (err) {
			const msg =
				err?.response?.data?.message ||
				err?.message ||
				'Failed to update add-on';
			setError(msg);
			setLoading(false);
			throw err;
		}
	};

	const deleteAddon = async (productId, addonId) => {
		setLoading(true);
		setError(null);
		try {
			await axiosInstance.delete(
				`/catalog/${productId}/addons/${addonId}`,
			);
			setProducts((prev) =>
				prev.map((p) => {
					if (String(p._id) !== String(productId)) return p;
					return {
						...p,
						addOns: (p.addOns || []).filter(
							(a) => String(a._id) !== String(addonId),
						),
					};
				}),
			);
			setLoading(false);
			return true;
		} catch (err) {
			const msg =
				err?.response?.data?.message ||
				err?.message ||
				'Failed to delete add-on';
			setError(msg);
			setLoading(false);
			throw err;
		}
	};

	// Auto-fetch when selectedStore (branch) changes
	useEffect(() => {
		(async () => {
			if (!selectedStore || !selectedStore._id) {
				// clear products if no selection
				setProducts([]);
				return;
			}
			try {
				await fetchProductsByStore(selectedStore._id);
			} catch (e) {
				// error already handled in fetchProductsByStore
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedStore?._id]);

	// Context value with state and actions
	const value = {
		products,
		loading,
		error,
		fetchProductsByStore,
		addProduct,
		updateProduct,
		deleteProduct,
		updateVariant,
		deleteVariant,
		updateAddon,
		deleteAddon,
		setProducts, // exposed for local manipulations if needed
	};

	return (
		<ProductsContext.Provider value={value}>
			{children}
		</ProductsContext.Provider>
	);
};

export { ProductsContext, ProductsProvider };
