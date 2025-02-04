import axios from 'axios';
import axiosInstance from '@/utils/axiosInstance';

// Get all discounts for a business
export const getDiscounts = async (businessId) => {
	try {
		const response = await axiosInstance.get(
			`/discounts/${businessId}`,
		);
		return response.data;
	} catch (error) {
		throw error;
	}
};

// Create a discount
export const createDiscount = async (discountData) => {
	try {
		const response = await axiosInstance.post(
			'/discounts',
			discountData,
		);
		return response.data;
	} catch (error) {
		throw error;
	}
};

// Update a discount
export const updateDiscount = async (
	discountId,
	discountData,
) => {
	try {
		const response = await axiosInstance.put(
			`/discounts/${discountId}`,
			discountData,
		);
		return response.data;
	} catch (error) {
		throw error;
	}
};

// Delete a discount
export const deleteDiscount = async (discountId) => {
	try {
		const response = await axiosInstance.delete(
			`/discounts/${discountId}`,
		);
		return response.data;
	} catch (error) {
		throw error;
	}
};
