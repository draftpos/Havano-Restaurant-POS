import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/useCartStore";

export const useMenuNavigation = ({ NUMBER_OF_COLUMNS, items }) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [target, setTarget] = useState("menu");
	const addToCart = useCartStore((state) => state.addToCart);
	const numberOfItems = items.length;

	const handleSelectItem = (index) => {
		const selectedItem = items[index];
		if (selectedItem) {
			addToCart({
				name: selectedItem.name,
				item_name: selectedItem.item_name,
				custom_menu_category: selectedItem.custom_menu_category,
				quantity: 1,
				price: selectedItem.standard_rate ?? selectedItem.price ?? 0,
				standard_rate: selectedItem.standard_rate ?? selectedItem.price ?? 0,
				remark: "",
			});
		}
	};

	const handleMenuNavigation = (event) => {
		if (currentIndex === -1) return;

		switch (event.key) {
			case "ArrowUp":
				if (currentIndex - NUMBER_OF_COLUMNS >= 0) {
					setCurrentIndex(currentIndex - NUMBER_OF_COLUMNS);
				}
				break;

			case "ArrowDown":
				if (currentIndex + NUMBER_OF_COLUMNS < numberOfItems) {
					setCurrentIndex(currentIndex + NUMBER_OF_COLUMNS);
				}
				break;

			case "ArrowLeft":
				if (currentIndex % NUMBER_OF_COLUMNS !== 0) {
					setCurrentIndex(currentIndex - 1);
				}
				break;

			case "ArrowRight":
				if (
					(currentIndex + 1) % NUMBER_OF_COLUMNS !== 0 &&
					currentIndex + 1 < numberOfItems
				) {
					setCurrentIndex(currentIndex + 1);
				}
				break;

			case "Enter":
				handleSelectItem(currentIndex);
				break;

			default:
				break;
		}
	};

	useEffect(() => {
		if (numberOfItems === 0) {
			setCurrentIndex(-1);
		} else if (currentIndex === -1 || currentIndex >= numberOfItems) {
			setCurrentIndex(0);
		}
	}, [numberOfItems, currentIndex]);

	useEffect(() => {
		const handleKeyDown = (event) => {
			if (target === "menu") {
				handleMenuNavigation(event);
			} else if (target === "cart") {
                // Future implementation for cart navigation
            }
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [currentIndex, NUMBER_OF_COLUMNS, numberOfItems, target]);

	return { currentIndex, setCurrentIndex, target, setTarget };
};
