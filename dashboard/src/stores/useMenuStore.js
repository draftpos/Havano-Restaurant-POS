import { create } from "zustand";

import { db } from "@/lib/frappeClient";
import { getSamplePosMenuItemGroup } from "@/lib/utils";

export const useMenuStore = create((set) => ({
  menuItems: [],
  menuCategories: [],
  loading: false,
  error: null,

  // Fetch all menu items
  fetchMenuItems: async () => {
    set({ loading: true, error: null });
    try {
      const menuItemGroup = await getSamplePosMenuItemGroup();
      const data = await db.getDocList("Item", {
			fields: ["name", "standard_rate", "item_name", "custom_menu_category"],
			filters: menuItemGroup
				? [
						["item_group", "=", menuItemGroup],
						["disabled", "=", 0],
				  ]
				: [],
			limit: 0,
		});
      set({ menuItems: data, loading: false });
    } catch (err) {
      console.error("Fetch error:", err);
      set({ error: err.message, loading: false });
    }
  },

  fetchMenuCategories: async () => {
    set({ loading: true, error: null });
    try {
      const data = await db.getDocList("HA Menu Category", {
        fields: ["name", "category_name"],
      });
      set({ menuCategories: data, loading: false });
    } catch (err) {
      console.error("Fetch error:", err);
      set({ error: err.message, loading: false });
    }
  },
}));
