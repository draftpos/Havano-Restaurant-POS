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

export function filterMenuItemsByTerm(menuItems, searchTerm, selectedCategoryId, hidePharmacyItems = false) {
	const term = (searchTerm || "").trim().toLowerCase();

	let items = menuItems;
	if (hidePharmacyItems) {
		items = menuItems.filter((item) => !item.custom_pharmacy);
	}

	const initialFilteredItems = items.filter((item) => {
		const matchesCategory =
			!selectedCategoryId ||
			selectedCategoryId === "all" ||
			item.item_group === selectedCategoryId;

		return matchesCategory && matchesSearch(item, term);
	});

	if (initialFilteredItems.length === 0) {
		return items.filter((item) => matchesSearch(item, term));
	}

	return initialFilteredItems;
}

export default function useFilteredMenuItems(menuItems, searchTerm, selectedCategoryId, hidePharmacyItems = false) {
	return useMemo(
		() => filterMenuItemsByTerm(menuItems, searchTerm, selectedCategoryId, hidePharmacyItems),
		[menuItems, searchTerm, selectedCategoryId, hidePharmacyItems]
	);
}
