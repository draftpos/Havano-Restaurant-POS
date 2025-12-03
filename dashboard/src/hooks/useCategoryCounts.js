import { useEffect, useState } from "react";
import { getNumberOfItems } from "@/lib/utils";

export function useCategoryCounts(categories) {
	const [counts, setCounts] = useState({});

	useEffect(() => {
		if (!categories.length) return;

		let cancelled = false;

		async function load() {
			const entries = await Promise.all(
				categories.map(async (cat) => {
					const count = await getNumberOfItems(cat.name);
					return [cat.name, count];
				})
			);

			if (!cancelled) {
				setCounts(Object.fromEntries(entries));
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [categories]);

	return counts;
}
