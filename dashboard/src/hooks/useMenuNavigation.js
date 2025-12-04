import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/useCartStore";

export default function useMenuNavigation({ NUMBER_OF_COLUMNS, items, target, setTarget, visibleCategories, handleSubmitOrder }) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const {addToCart, cart, removeFromCart, openUpdateDialog} = useCartStore();
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
				if (currentIndex + NUMBER_OF_COLUMNS >= numberOfItems) {
					setCurrentIndex(numberOfItems - 1);
				}
				break;

			case "ArrowLeft":
				if (currentIndex % NUMBER_OF_COLUMNS !== 0) {
					setCurrentIndex(currentIndex - 1);
				}else{
					setTarget("category");
					setCurrentIndex(0);
				}
				break;

			case "ArrowRight":
				if (
					(currentIndex + 1) % NUMBER_OF_COLUMNS !== 0 &&
					currentIndex + 1 < numberOfItems
				) {
					setCurrentIndex(currentIndex + 1);
				}else{
					if (cart.length > 0) {
						setTarget("cart");
						setCurrentIndex(0);
					}
				}
				break;

			case "Enter":
				handleSelectItem(currentIndex);
				break;

			default:
				break;
		}
	};

	const handleCartNavigation = (event) => {
		switch (event.key) {
			case "ArrowUp":
				if (currentIndex > 0) {
					setCurrentIndex(currentIndex - 1);
				}
				break;

			case "ArrowDown":
				if (currentIndex < cart.length - 1) {
					setCurrentIndex(currentIndex + 1);
				}
				break;
				
			case "ArrowLeft":
				setTarget("menu");
				setCurrentIndex(NUMBER_OF_COLUMNS - 1);
				break;

			case "Delete":
				removeFromCart(cart[currentIndex]);
				setCurrentIndex(currentIndex - 1);
				break;

			case "*":
				openUpdateDialog(cart[currentIndex]);
				break;
			default:
				break;
		}
	}

	const handleCategoryNavigation = (event) => {
		switch (event.key) {
			case "ArrowUp":
				if (currentIndex > 0) {
					setCurrentIndex(currentIndex - 1);
				}
				break;

			case "ArrowDown":
				if (currentIndex < visibleCategories.length - 1) {
					setCurrentIndex(currentIndex + 1);
				}
				break;

			case "ArrowRight":
				setTarget("menu");
				setCurrentIndex(0);
				break;
			
			default:
				break;
		}
	}

	useEffect(() => {
		if (numberOfItems === 0) {
			setCurrentIndex(-1);
		} else if (currentIndex === -1 || currentIndex >= numberOfItems) {
			setCurrentIndex(0);
		}
	}, [numberOfItems, currentIndex]);

	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.shiftKey && event.code === "Digit8") {
				handleSubmitOrder();
			}
			if (target === "menu") {
				handleMenuNavigation(event);
			} else if (target === "cart") {
				handleCartNavigation(event);
            } else if (target === "category") {
				handleCategoryNavigation(event);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [currentIndex, NUMBER_OF_COLUMNS, numberOfItems, target]);

	return { currentIndex, setCurrentIndex};
};
