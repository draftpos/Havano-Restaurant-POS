import { useEffect, useState } from "react";
import { getBreeds } from "@/lib/utils";
import { toast } from "sonner";

export default function useBreeds() {
	const [breeds, setBreeds] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchBreeds = async () => {
		setLoading(true);
		try {
			const breedList = await getBreeds();
			setBreeds(breedList);
		} catch (err) {
			console.error("Error loading breeds:", err);
			toast.error("Failed to load breeds", {
				description: "Please try refreshing the page",
				duration: 4000,
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBreeds();
	}, []);

	return { breeds, loading, fetchBreeds };
}
