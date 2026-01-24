import { create } from "zustand";

import { db } from "@/lib/frappeClient";

export const useCartStore = create((set) => ({
  cart: [],
  orderType: "Take Away",
  activeTableId: null,
  activeWaiterId: null,
  activeOrderId: null,
  customerName: "",
  customer: "", // Customer ID/name for transactions
  transactionType: "Sales Invoice", // "Quotation" or "Sales Invoice"
  selectedCategory: null,
  selectedCartItem: null,
  isUpdateDialogOpen: false,

  setCustomer: (customer) => set({ customer }),
  setTransactionType: (type) => set({ transactionType: type }),
  selectedReceipt: "default-receipt",
  setSelectedReceipt: (val) => set({ selectedReceipt: val }),

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
            standard_rate: item.standard_rate ?? resolvedPrice,
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

  loadCartFromOrder: async (order_id) => {
    const order = await db.getDoc("HA Order", order_id, {
      fields: [
        "name",
        "order_type",
        "customer_name",
        "table",
        "waiter",
        "order_items",
      ],
    });

    set({
      cart: order.order_items.map((item) => ({
        name: item.menu_item,
        item_name: item.menu_item_name,
        quantity: item.qty,
        price: item.rate ?? 0,
        standard_rate: item.rate ?? 0,
        remark: item.preparation_remark ?? "",
      })),
    });
  },

  loadCartFromQuotation: async (quotation_name) => {
    const quotation = await db.getDoc("Quotation", quotation_name, {
      fields: [
        "name",
        "party_name",
        "customer_name",
        "items",
      ],
    });

    set({
      cart: quotation.items.map((item) => ({
        name: item.item_code,
        item_name: item.item_name || item.item_code,
        quantity: item.qty || 1,
        price: item.rate || 0,
        standard_rate: item.rate || 0,
      })),
      customer: quotation.party_name || quotation.customer_name,
      customerName: quotation.customer_name || quotation.party_name,
      transactionType: "Quotation",
      activeQuotationId: quotation_name,
    });
  },

  activeQuotationId: null,

  setSelectedCategory: (category) =>
    set((state) => ({
      selectedCategory:
        typeof category === "function"
          ? category(state.selectedCategory)
          : category,
    })),

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

  startTableOrder: (tableId, waiterId, activeOrderId = null, customerName = "") => {
    set({
      orderType: "Dine In",
      activeTableId: tableId,
      activeWaiterId: waiterId,
      activeOrderId: activeOrderId,
      customerName,
    });
  },

  startNewTakeAwayOrder: () => {
    set({
      orderType: "Take Away",
      activeTableId: null,
      activeWaiterId: null,
      activeOrderId: null,
      customerName: "",
    });
  },
}));
