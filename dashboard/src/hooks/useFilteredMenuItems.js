import { useMemo } from "react";

function matchesSearch(item, term) {
	if (!term) return true;

	const itemName = (item.item_name || "").toLowerCase();
	const name = (item.name || "").toLowerCase();
	const matchesName = itemName.includes(term) || name.includes(term);

	const barcodes = item.barcodes || [];
	const matchesBarcode = barcodes.some(
		(b) => b && String(b).trim().toLowerCase() === term
	);

	return matchesName || matchesBarcode;
}

export function filterMenuItemsByTerm(menuItems, searchTerm, selectedCategoryId) {
	const term = (searchTerm || "").trim().toLowerCase();

	const initialFilteredItems = menuItems.filter((item) => {
		const matchesCategory =
			!selectedCategoryId ||
			selectedCategoryId === "all" ||
			item.item_group === selectedCategoryId;

		return matchesCategory && matchesSearch(item, term);
	});

	if (initialFilteredItems.length === 0) {
		return menuItems.filter((item) => matchesSearch(item, term));
	}

	return initialFilteredItems;
}

export default function useFilteredMenuItems(menuItems, searchTerm, selectedCategoryId) {
	return useMemo(
		() => filterMenuItemsByTerm(menuItems, searchTerm, selectedCategoryId),
		[menuItems, searchTerm, selectedCategoryId]
	);
}
