import { create } from "zustand";

import { db } from "@/lib/frappeClient";

export const useTransactionStore = create((set) => ({
  transactions: [],
  selectedCategory: {
    id: "Quotation",
    name: "Quotation",
    doctype: "Quotation",
  },
  selectedTransaction: null,
  transactionItems: [],
  loading: false,
  loadingItems: false,
  error: null,

  setSelectedCategory: (category) => set({ 
    selectedCategory: category, 
    transactions: [], 
    selectedTransaction: null, 
    transactionItems: [] 
  }),
  setSelectedTransaction: (transaction) => set({ selectedTransaction: transaction }),

  fetchTransactions: async (doctype, dateFilter = null) => {
    set({ loading: true, error: null });
    try {
      // Only handle Quotation now
      const dateField = "transaction_date";
      const fields = ["name", "party_name", "customer_name", "grand_total", "status", dateField, "currency", "creation"];
      
      // Build filters - Frappe uses array format for filters
      const filters = [];
      if (dateFilter) {
        // Filter by date - use transaction_date for Quotation
        filters.push([dateField, "=", dateFilter]);
      }
      
      const data = await db.getDocList("Quotation", {
        fields: fields,
        filters: filters.length > 0 ? filters : undefined,
        orderBy: {
          field: "creation",
          order: "desc",
        },
        limit: 100,
      });
      
      // Map the data to a consistent format
      const mappedData = data.map((item) => ({
        ...item,
        posting_date: item.transaction_date || item.posting_date,
        // For Quotation, use customer_name if available, otherwise party_name
        customer: item.customer_name || item.party_name || "",
      }));
      
      set({ transactions: mappedData, loading: false });
    } catch (err) {
      console.error("Transaction fetch error:", err);
      set({ error: err.message, loading: false });
    }
  },

  fetchTransactionItems: async (doctype, transactionName) => {
    set({ loadingItems: true, error: null });
    try {
      const doc = await db.getDoc("Quotation", transactionName);
      const items = doc.items || [];
      set({ transactionItems: items, loadingItems: false });
    } catch (err) {
      console.error("Transaction items fetch error:", err);
      set({ error: err.message, loadingItems: false });
    }
  },
}));

