import { useEffect, useState } from "react";
import { getSpecies} from "@/lib/utils";
import { toast } from "sonner";

export default function useSpecies() {
	const [species, setSpecies] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchSpecies= async () => {
		setLoading(true);
		try {
			const speciesList = await getSpecies();
			setSpecies(speciesList);
		} catch (err) {
			console.error("Error loading species:", err);
			toast.error("Failed to load species", {
				description: "Please try refreshing the page",
				duration: 4000,
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchSpecies();
	}, []);
    
    return { species, loading, fetchSpecies };  
}