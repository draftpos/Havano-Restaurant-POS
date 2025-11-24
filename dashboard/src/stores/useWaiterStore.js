import { create } from "zustand";

import { db } from "@/lib/frappeClient";

export const useWaiterStore = create((set) => ({
  waiters: [],
  loadingWaiters: false,
  errorWaiters: null,

  fetchWaiters: async () => {
    set({ loadingWaiters: true, errorWaiters: null });
    try {
      const data = await db.getDocList("HA Waiter", {
        fields: ["name", "waiter_name"],
      });
      set({ waiters: data, loadingWaiters: false });
    } catch (err) {
      console.error("Waiter fetch error:", err);
      set({ errorWaiters: err.message, loadingWaiters: false });
    }
  },
}));
