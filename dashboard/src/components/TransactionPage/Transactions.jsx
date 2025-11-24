import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import TransactionItemCard from "@/components/TransactionPage/TransactionItemCard";
import { useTransactionStore } from "@/stores/useTransactionStore";

const Transactions = () => {
  const { transactions, selectedCategory, fetchTransactions, loading } = useTransactionStore();
  const [searchTerm, setSearchTerm] = useState("");

  const { setSelectedTransaction } = useTransactionStore();

  useEffect(() => {
    if (selectedCategory?.doctype) {
      fetchTransactions(selectedCategory.doctype);
      // Clear selected transaction when category changes
      setSelectedTransaction(null);
    }
  }, [selectedCategory, fetchTransactions, setSelectedTransaction]);

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const searchFields = [
        transaction.name,
        transaction.customer,
        transaction.status,
      ].filter(Boolean);

      const matchesSearch =
        !term ||
        searchFields.some((field) =>
          field.toLowerCase().includes(term)
        );

      return matchesSearch;
    });
  }, [transactions, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading transactions...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-2xl my-4">{selectedCategory?.name || "Transactions"}</p>
        <div className="flex items-center w-1/3 bg-background px-2 py-1 rounded-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
          <input
            type="text"
            placeholder="Search"
            className="w-full focus:outline-none focus:ring-0 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="text-primary" />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <TransactionItemCard key={transaction.name} transaction={transaction} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No transactions found
          </div>
        )}
      </div>
    </>
  );
};

export default Transactions;

