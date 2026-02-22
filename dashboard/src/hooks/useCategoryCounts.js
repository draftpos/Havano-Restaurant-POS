import { useMemo } from "react";

/**
 * Compute category item counts from menuItems so the count always matches
 * the displayed items (same filters: custom_do_not_show_in_pos, disabled, etc.)
 */
export default function useCategoryCounts(categories, menuItems = []) {
	return useMemo(() => {
		if (!categories?.length || !menuItems?.length) return {};
		const counts = {};
		for (const cat of categories) {
			counts[cat.name] = menuItems.filter(
				(item) => (item.item_group || "") === cat.name
			).length;
		}
		return counts;
	}, [categories, menuItems]);
}
