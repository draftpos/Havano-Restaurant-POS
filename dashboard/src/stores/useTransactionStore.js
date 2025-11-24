import { create } from "zustand";

import { db } from "@/lib/frappeClient";

export const useTransactionStore = create((set) => ({
  transactions: [],
  selectedCategory: {
    id: "Sales Invoice",
    name: "Sales Invoice",
    doctype: "Sales Invoice",
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

  fetchTransactions: async (doctype) => {
    set({ loading: true, error: null });
    try {
      // Quotation uses transaction_date, Sales Invoice uses posting_date
      const dateField = doctype === "Quotation" ? "transaction_date" : "posting_date";
      
      // Quotation uses party_name for customer, Sales Invoice uses customer
      const customerField = doctype === "Quotation" ? "party_name" : "customer";
      const fields = doctype === "Quotation" 
        ? ["name", "party_name", "customer_name", "grand_total", "status", dateField, "currency"]
        : ["name", "customer", "grand_total", "status", dateField, "currency"];
      
      const data = await db.getDocList(doctype, {
        fields: fields,
        orderBy: {
          field: dateField,
          order: "desc",
        },
        limit: 100,
      });
      
      // Map the data to a consistent format
      const mappedData = data.map((item) => ({
        ...item,
        posting_date: item[dateField] || item.posting_date || item.transaction_date,
        // For Quotation, use customer_name if available, otherwise party_name
        customer: doctype === "Quotation" 
          ? (item.customer_name || item.party_name || "")
          : (item.customer || ""),
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
      const doc = await db.getDoc(doctype, transactionName);
      const itemsField = doctype === "Sales Invoice" ? "items" : "items";
      const items = doc[itemsField] || [];
      set({ transactionItems: items, loadingItems: false });
    } catch (err) {
      console.error("Transaction items fetch error:", err);
      set({ error: err.message, loadingItems: false });
    }
  },
}));

