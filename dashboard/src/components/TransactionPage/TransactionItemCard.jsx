import { formatCurrency } from "@/lib/utils";
import { useTransactionStore } from "@/stores/useTransactionStore";

import { Card, CardHeader, CardTitle, CardDescription } from "../ui/card";

const TransactionItemCard = ({ transaction }) => {
  const { setSelectedTransaction, selectedCategory, fetchTransactionItems, selectedTransaction } = useTransactionStore();
  const isSelected = selectedTransaction?.name === transaction.name;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    const statusColors = {
      Draft: "bg-gray-500",
      Submitted: "bg-blue-500",
      Paid: "bg-green-500",
      Unpaid: "bg-yellow-500",
      Overdue: "bg-red-500",
      Cancelled: "bg-gray-400",
    };
    return statusColors[status] || "bg-gray-500";
  };

  const handleClick = () => {
    setSelectedTransaction(transaction);
    if (selectedCategory?.doctype && transaction.name) {
      fetchTransactionItems(selectedCategory.doctype, transaction.name);
    }
  };

  return (
    <Card 
      className={`cursor-pointer rounded-lg border shadow-sm transition transform hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
        isSelected ? "ring-2 ring-primary bg-primary/5" : "active:bg-gray-50"
      }`}
      onClick={handleClick}
    >
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base">{transaction.name}</CardTitle>
        <div className="text-right">
          <i className="text-sm">{formatCurrency(transaction.grand_total)}</i>
          {transaction.status && (
            <span
              className={`block mt-1 px-1.5 py-0.5 text-xs text-white rounded ${getStatusColor(
                transaction.status
              )}`}
            >
              {transaction.status}
            </span>
          )}
        </div>
      </CardHeader>
    </Card>
  );
};

export default TransactionItemCard;

