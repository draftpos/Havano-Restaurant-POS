import { useState } from "react";
import { call } from "@/lib/frappeClient";
import { useCartStore } from "@/stores/useCartStore";
import { getDefaultCustomer } from "@/lib/utils";

function useMultiCurrencyPayment() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(false);

    let customer = useCartStore((state) => state.customer);
    

	const submitPayment = async ({ payments }) => {
		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			// 🔹 Remove zero / empty payments
			// Payments can be either {key: amount} or {key: {mode, currency, amount}}
			const cleanedPayments = {};
			Object.entries(payments || {}).forEach(([key, value]) => {
				if (value && typeof value === 'object' && 'amount' in value) {
					// Format: {mode, currency, amount}
					if (Number(value.amount) > 0) {
						cleanedPayments[key] = value;
					}
				} else {
					// Format: direct amount value
					if (Number(value) > 0) {
						cleanedPayments[key] = value;
					}
				}
			});

			// Check if we have any payments after cleaning
			if (Object.keys(cleanedPayments).length === 0) {
				throw new Error("No valid payments provided. Please enter payment amounts.");
			}

			const res = await call.post("havano_restaurant_pos.api.make_multi_currency_payment", {
				customer,
				payments: cleanedPayments,
			});

			const data = res?.message;

			if (!data?.success) {
				// Include details in the error message for better debugging
				const errorMsg = data?.details 
					? `${data?.message || "Payment failed"}: ${data?.details}`
					: data?.message || "Payment failed";
				const error = new Error(errorMsg);
				error.details = data?.details;
				error.errors = data?.errors;
				throw error;
			}

			setSuccess(true);
			return data;
		} catch (err) {
            console.error("Error in submitPayment:", err);  
			const msg = err?.details || err?.message || err?.response?.message || "Something went wrong";

			setError(msg);
			throw err;
		} finally {
			setLoading(false);
		}
	};

	return {
		submitPayment,
		loading,
		error,
		success,
	};
}
export default useMultiCurrencyPayment;