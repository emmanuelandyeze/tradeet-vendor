import React, {
	createContext,
	useState,
	useContext,
	useEffect,
} from 'react';
import axios from 'axios';
import axiosInstance from '@/utils/axiosInstance';

// Create Products Context
const ProductsContext = createContext();

// Products Provider
const ProductsProvider = ({ children }) => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Fetch all products by storeId
	const fetchProductsByStore = async (storeId) => {
		setLoading(true);
		try {
			const response = await axiosInstance.get(
				`/products/store/${storeId}`,
			);
			setProducts(response.data);
			setLoading(false);
		} catch (err) {
			setError(
				err.response?.data?.message ||
					'Failed to fetch products',
			);
			setLoading(false);
		}
	};

	// Add a new product
	const addProduct = async (productData) => {
		setLoading(true);
		try {
			const response = await axiosInstance.post(
				'/products',
				productData,
			);
			// console.log(response);
			setProducts([...products, response.data]);
			setLoading(false);
		} catch (err) {
			setError(
				err.response?.data?.message ||
					'Failed to add product',
			);
			setLoading(false);
		}
	};

	// Update a product by ID
	const updateProduct = async (id, updatedProductData) => {
		setLoading(true);
		try {
			const response = await axiosInstance.put(
				`/products/${id}`,
				updatedProductData,
			);
			setProducts(
				products.map((product) =>
					product._id === id ? response.data : product,
				),
			);
			setLoading(false);
		} catch (err) {
			setError(
				err.response?.data?.message ||
					'Failed to update product',
			);
			setLoading(false);
		}
	};

	// Delete a product by ID
	const deleteProduct = async (id) => {
		setLoading(true);
		try {
			await axiosInstance.delete(`/products/${id}`);
			setProducts(
				products.filter((product) => product._id !== id),
			);
			setLoading(false);
		} catch (err) {
			setError(
				err.response?.data?.message ||
					'Failed to delete product',
			);
			setLoading(false);
		}
	};

	// Update a variant in a product
	const updateVariant = async (
		productId,
		variantId,
		updatedVariant,
	) => {
		setLoading(true);
		try {
			const response = await axiosInstance.put(
				`/products/${productId}/variants/${variantId}`,
				updatedVariant,
			);
			const updatedProducts = products.map((product) =>
				product._id === productId ? response.data : product,
			);
			setProducts(updatedProducts);
			setLoading(false);
		} catch (err) {
			setError(
				err.response?.data?.message ||
					'Failed to update variant',
			);
			setLoading(false);
		}
	};

	// Delete a variant in a product
	const deleteVariant = async (productId, variantId) => {
		setLoading(true);
		try {
			await axiosInstance.delete(
				`/products/${productId}/variants/${variantId}`,
			);
			const updatedProducts = products.map((product) => {
				if (product._id === productId) {
					return {
						...product,
						variants: product.variants.filter(
							(variant) => variant._id !== variantId,
						),
					};
				}
				return product;
			});
			setProducts(updatedProducts);
			setLoading(false);
		} catch (err) {
			setError(
				err.response?.data?.message ||
					'Failed to delete variant',
			);
			setLoading(false);
		}
	};

	// Update an add-on in a product
	const updateAddon = async (
		productId,
		addonId,
		updatedAddon,
	) => {
		setLoading(true);
		try {
			const response = await axiosInstance.put(
				`/products/${productId}/addons/${addonId}`,
				updatedAddon,
			);
			const updatedProducts = products.map((product) =>
				product._id === productId ? response.data : product,
			);
			setProducts(updatedProducts);
			setLoading(false);
		} catch (err) {
			setError(
				err.response?.data?.message ||
					'Failed to update add-on',
			);
			setLoading(false);
		}
	};

	// Delete an add-on in a product
	const deleteAddon = async (productId, addonId) => {
		setLoading(true);
		try {
			await axiosInstance.delete(
				`/products/${productId}/addons/${addonId}`,
			);
			const updatedProducts = products.map((product) => {
				if (product._id === productId) {
					return {
						...product,
						addOns: product.addOns.filter(
							(addon) => addon._id !== addonId,
						),
					};
				}
				return product;
			});
			setProducts(updatedProducts);
			setLoading(false);
		} catch (err) {
			setError(
				err.response?.data?.message ||
					'Failed to delete add-on',
			);
			setLoading(false);
		}
	};

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
		setProducts,
	};

	return (
		<ProductsContext.Provider value={value}>
			{children}
		</ProductsContext.Provider>
	);
};

export { ProductsContext, ProductsProvider };
