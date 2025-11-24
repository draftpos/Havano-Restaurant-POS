import { Edit, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { useTransactionStore } from "@/stores/useTransactionStore";
import { useCartStore } from "@/stores/useCartStore";

import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";

const TransactionDetails = () => {
  const navigate = useNavigate();
  const { selectedTransaction, transactionItems, loadingItems, selectedCategory } = useTransactionStore();
  const { loadCartFromQuotation, clearCart } = useCartStore();

  const handleEdit = () => {
    if (selectedTransaction) {
      const name = selectedTransaction.name;
      // Open Quotation form in new tab
      const url = `/app/quotation/${encodeURIComponent(name)}`;
      window.open(url, '_blank');
    }
  };

  const handleConvertToSalesInvoice = async () => {
    if (!selectedTransaction) {
      return;
    }

    try {
      // Clear cart and load quotation items
      clearCart();
      await loadCartFromQuotation(selectedTransaction.name);
      
      // Navigate to menu page
      navigate("/menu");
    } catch (error) {
      console.error("Error loading quotation to menu:", error);
      alert("Failed to load quotation to menu page");
    }
  };

  if (!selectedTransaction) {
    return (
      <Card className="max-h-[90vh] flex flex-col sticky top-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            Transaction Details
          </CardTitle>
        </CardHeader>
        <hr className="border border-gray-600" />
        <CardContent className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>Select a transaction to view details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-h-[90vh] flex flex-col sticky top-4">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {selectedTransaction.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {selectedTransaction.customer || "N/A"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleConvertToSalesInvoice}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              <FileText size={16} />
              Convert to Sales Invoice
            </Button>
            <Button
              onClick={handleEdit}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Edit size={16} />
              Edit
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <hr className="border border-gray-600" />
      <CardContent className="flex-1 overflow-y-auto">
        <p className="text-lg font-bold my-2">Order Details</p>
        {loadingItems ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading items...</p>
          </div>
        ) : transactionItems.length > 0 ? (
          <div className="flex flex-col space-y-1">
            {transactionItems.map((item, index) => (
              <div
                key={item.name || index}
                className="flex justify-between items-center bg-secondary-background py-2 px-4 rounded-sm"
              >
                <div className="flex gap-4 font-bold">
                  <p>x{item.qty || item.quantity || 1}</p>
                  <p>{item.item_name || item.item_code || "N/A"}</p>
                  <i>
                    {formatCurrency(item.rate || item.price || item.amount || 0)}
                  </i>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency((item.qty || item.quantity || 1) * (item.rate || item.price || item.amount || 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col justify-center items-center gap-2">
              <p className="text-gray-500">No items found</p>
            </div>
          </div>
        )}
      </CardContent>
      <hr className="border border-gray-600" />
      <CardContent>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">Total:</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(selectedTransaction.grand_total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionDetails;

