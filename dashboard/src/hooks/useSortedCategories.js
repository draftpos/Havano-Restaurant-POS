import { useMemo } from "react";

export function useSortedCategories(menuCategories) {
	return useMemo(() => {
		if (!menuCategories) return [];
		return [...menuCategories].sort((a, b) => {
			const labelA = a.category_name || a.name || "";
			const labelB = b.category_name || b.name || "";
			return labelA.localeCompare(labelB, undefined, { sensitivity: "base" });
		});
	}, [menuCategories]);
}
