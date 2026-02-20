import { useState } from "react";
import { call } from "@/lib/frappeClient";
import { useCartStore } from "@/stores/useCartStore";
import { getDefaultCustomer } from "@/lib/utils";
import { createInvoiceAndPaymentQueue, get_invoice_json, savePaymentsToShift } from "@/lib/utils";

function useMultiCurrencyPayment() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(false);

    let customer = useCartStore((state) => state.customer);
	const { selectedReceipt } = useCartStore();
    

	const submitPayment = async ({ payments, cartItems, orderPayload }) => {
		setLoading(true);
		setError(null);
		setSuccess(false);


		try {
			// Validate cart items
			if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
				throw new Error("No items in cart: Cannot create invoice without items.");
			}
			
			// Ensure customer is set
			if (!customer) {
				customer = await getDefaultCustomer();
				if (!customer) {
					throw new Error("Customer is required. Please select a customer or configure a default customer in Settings.");
				}
			}
			
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
			// console.log("mmmmetods" + payments)

			// Create invoice and payment in queue (invoice created first, then payment entries)
			const res = await createInvoiceAndPaymentQueue(
				cartItems,
				customer,
				null, // payment_breakdown (not used for multi-currency)
				null, // payment_method (not used for multi-currency)
				null, // amount (calculated from payments)
				null, // note
				orderPayload,
				cleanedPayments // multi_currency_payments
			);
			try {
				await savePaymentsToShift(cleanedPayments);
			} catch (err) {
				console.error("Failed to save payments to shift:", err);
			}

			if (!res?.success) {
				// Include details in the error message for better debugging
				const errorMsg = res?.details 
					? `${res?.message || "Payment failed"}: ${res?.details}`
					: res?.message || "Payment failed";
				const error = new Error(errorMsg);
				error.details = res?.details;
				error.errors = res?.errors;
				throw error;
			}

			setSuccess(true);
			if (res.sales_invoice) {
				try {
					const settingsRes = await call.get("havano_restaurant_pos.api.get_ha_pos_settings");
					const canPrint = Boolean(settingsRes?.message?.data?.can_print_invoice);
					if (canPrint) {
						const json = await get_invoice_json(res.sales_invoice);
						const data = { ...(json || {}), ReceiptType: selectedReceipt || "" };
						const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
						const blobUrl = URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.href = blobUrl;
						a.download = `${res.sales_invoice}.txt`;
						document.body.appendChild(a);
						a.click();
						document.body.removeChild(a);
						setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
					}
				} catch (err) {
					console.error("Error triggering invoice download:", err);
				}
			}
			return res;

			
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