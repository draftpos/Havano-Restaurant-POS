import { useEffect, useState } from "react";
import { getBgColor } from "@/lib/utils";

export function useCategoryColors(categories) {
	const [colors, setColors] = useState({});

	useEffect(() => {
		setColors((prev) => {
			const next = { ...prev };
			categories.forEach((category) => {
				if (!next[category.name]) {
					next[category.name] = getBgColor();
				}
			});
			return next;
		});
	}, [categories]);

	return colors;
}
