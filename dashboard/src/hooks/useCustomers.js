import { useEffect, useState } from "react";
import { getCustomers} from "@/lib/utils";
import { toast } from "sonner";

export default function useCustomers() {
	const [customers, setCustomers] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchCustomers = async () => {
		setLoading(true);
		try {
			const customerList = await getCustomers();
			setCustomers(customerList);
		} catch (err) {
			console.error("Error loading customers:", err);
			toast.error("Failed to load customers", {
				description: "Please try refreshing the page",
				duration: 4000,
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchCustomers();
	}, []);

	return { customers, loading, fetchCustomers };
}



