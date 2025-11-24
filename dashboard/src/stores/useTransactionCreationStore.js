import { create } from "zustand";

import { db } from "@/lib/frappeClient";
import { getSamplePosMenuItemGroup } from "@/lib/utils";

export const useTransactionCreationStore = create((set) => ({
  cart: [],
  customer: "",
  transactionType: "Sales Invoice", // "Quotation" or "Sales Invoice"
  selectedCategory: null,
  menuItems: [],
  menuCategories: [],
  loading: false,
  error: null,

  setTransactionType: (type) => set({ transactionType: type }),

  setCustomer: (customer) => set({ customer }),

  setSelectedCategory: (category) =>
    set((state) => ({
      selectedCategory:
        typeof category === "function"
          ? category(state.selectedCategory)
          : category,
    })),

  addToCart: (item) =>
    set((state) => {
      const identifier = item.name;
      if (!identifier) {
        console.warn(
          "Attempted to add cart item without a name identifier.",
          item
        );
        return {};
      }

      const existing = state.cart.find(
        (cartItem) => cartItem.name === identifier
      );
      const resolvedPrice = item.price ?? item.standard_rate ?? 0;

      if (existing) {
        return {
          cart: state.cart.map((cartItem) =>
            cartItem.name === identifier
              ? {
                  ...cartItem,
                  quantity: cartItem.quantity + 1,
                  price: cartItem.price ?? resolvedPrice,
                  standard_rate: cartItem.standard_rate ?? resolvedPrice,
                }
              : cartItem
          ),
        };
      }

      return {
        cart: [
          ...state.cart,
          {
            ...item,
            quantity: item.quantity ?? 1,
            price: resolvedPrice,
            standard_rate: resolvedPrice,
          },
        ],
      };
    }),

  updateCartItem: (updatedItem) =>
    set((state) => {
      if (!updatedItem?.name) {
        console.warn(
          "Attempted to update cart item without a name identifier.",
          updatedItem
        );
        return {};
      }
      return {
        cart: state.cart.map((cartItem) =>
          cartItem.name === updatedItem.name
            ? { ...cartItem, ...updatedItem }
            : cartItem
        ),
      };
    }),

  removeFromCart: (itemToRemove) =>
    set((state) => {
      if (!itemToRemove?.name) {
        console.warn(
          "Attempted to remove cart item without a name identifier.",
          itemToRemove
        );
        return {};
      }
      return {
        cart: state.cart.filter(
          (cartItem) => cartItem.name !== itemToRemove.name
        ),
      };
    }),

  clearCart: () => set({ cart: [] }),

  selectedCartItem: null,
  isUpdateDialogOpen: false,

  openUpdateDialog: (item) => {
    if (!item?.name) {
      console.warn(
        "Attempted to open update dialog without a name identifier.",
        item
      );
      return;
    }
    set({
      selectedCartItem: { ...item },
      isUpdateDialogOpen: true,
    });
  },

  closeUpdateDialog: () =>
    set({
      selectedCartItem: null,
      isUpdateDialogOpen: false,
    }),

  // Fetch all menu items
  fetchMenuItems: async () => {
    set({ loading: true, error: null });
    try {
      const menuItemGroup = await getSamplePosMenuItemGroup();
      const data = await db.getDocList("Item", {
        fields: ["name", "standard_rate", "item_name", "custom_menu_category"],
        filters: menuItemGroup ? [["item_group", "=", menuItemGroup]] : [],
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

