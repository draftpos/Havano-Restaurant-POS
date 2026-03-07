import { create } from "zustand";

import { db } from "@/lib/frappeClient";
export const useMenuStore = create((set) => ({
  menuItems: [],
  menuCategories: [],
  productBundles: [],
  loading: false,
  error: null,

  // Fetch all menu items
fetchMenuItems: async () => {
  set({ loading: true, error: null });
  try {
    const res = await fetch("/api/method/havano_restaurant_pos.api.get_menu_items_with_user_prices", {
      method: "GET",
      credentials: "include",
    });

    const data = await res.json();
    const pricedItems = data?.message;

    if (!res.ok) {
      throw new Error(data?.exc_type || data?.message || "Failed to load menu items");
    }

    // keep only parents - ensure we have an array
    const parentItems = Array.isArray(pricedItems)
      ? pricedItems.filter((item) => !item?.variant_of)
      : [];

    set({ menuItems: parentItems, loading: false });
    } catch (err) {
      console.error("Fetch error:", err);
      set({ error: err.message, loading: false });
    }
  },

  fetchProductBundles: async () => {
    set({ loading: true, error: null });
    try {
      const data = await db.getDocList("Product Bundle", {
        fields: ["name", "new_item_code"],
        limit: 0,
      });
      set({ productBundles: data, loading: false });
    } catch (err) {
      console.error("Fetch error:", err);
      set({ error: err.message, loading: false });
    }
  },

  fetchMenuCategories: async () => {
    set({ loading: true, error: null });
    try {
      let item_groups = [];
      try {
        item_groups = await db.getDocList("Item Group", {
          fields: ["name", "item_group_name", "custom_do_not_show_in_pos"],
        });
      } catch (fieldErr) {
        item_groups = await db.getDocList("Item Group", {
          fields: ["name", "item_group_name"],
        });
      }
      const data = (Array.isArray(item_groups) ? item_groups : [])
        .filter((group) => !group?.custom_do_not_show_in_pos)
        .map((group) => ({
          name: group.name,
          category_name: group.item_group_name,
        }));
      set({ menuCategories: data, loading: false });
    } catch (err) {
      console.error("Fetch error:", err);
      set({ menuCategories: [], loading: false, error: err.message });
    }
  },
}));
