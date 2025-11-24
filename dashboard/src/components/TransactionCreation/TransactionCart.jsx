import { Edit, ShoppingCart, Trash2, Save } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "sonner";

import { formatCurrency, createTransaction } from "@/lib/utils";
import { useTransactionCreationStore } from "@/stores/useTransactionCreationStore";

import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import UpdateCartDialog from "./UpdateCartDialog";

const TransactionCart = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    cart,
    removeFromCart,
    openUpdateDialog,
    transactionType,
    clearCart,
    customer,
    setCustomer: setStoreCustomer,
  } = useTransactionCreationStore();

  const handleSubmit = async () => {
    if (!customer) {
      toast.error("Customer Required", {
        description: "Please select a customer",
        duration: 4000,
      });
      return;
    }

    if (!cart || cart.length === 0) {
      toast.error("Cart Empty", {
        description: "Please add items to the cart",
        duration: 4000,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert cart items to API format
      const items = cart.map((item) => ({
        item_code: item.name,
        qty: item.quantity || 1,
        rate: item.price || item.standard_rate || 0,
      }));

      const result = await createTransaction(transactionType, customer, items);

      if (result && result.success) {
        toast.success(`${transactionType} Created`, {
          description: `${transactionType} ${result.name} created successfully`,
          duration: 4000,
        });

        // Clear cart and navigate back
        clearCart();
        setStoreCustomer("");
        navigate("/transaction");
      } else {
        toast.error("Creation Failed", {
          description: result?.message || `Failed to create ${transactionType}`,
          duration: 5000,
        });
      }
    } catch (err) {
      toast.error("Server Error", {
        description: "Unable to reach the server. Please try again later.",
        duration: 5000,
      });
      console.error("Transaction creation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = cart.reduce((sum, item) => {
    const qty = item.quantity || 1;
    const price = item.price || item.standard_rate || 0;
    return sum + qty * price;
  }, 0);

  return (
    <>
      <Card className="h-[90vh] flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">
            Create {transactionType}
          </CardTitle>
        </CardHeader>
        <hr className="border border-gray-600" />
        <CardContent className="flex-1 overflow-y-auto">
          <p className="text-lg font-bold my-2">Items</p>
          {cart.length > 0 ? (
            <div className="flex flex-col space-y-1">
              {cart.map((item) => (
                <div
                  key={item.name}
                  className="flex justify-between items-center bg-secondary-background py-2 px-4 rounded-sm"
                >
                  <div className="flex gap-4 font-bold">
                    <p>x{item.quantity}</p>
                    <p>{item.item_name || item.name}</p>
                    <i>
                      {formatCurrency(item.price ?? item.standard_rate ?? 0)}
                    </i>
                  </div>
                  <div className="flex items-center">
                    <div
                      className="cursor-pointer hover:bg-background p-2 rounded-sm group"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item);
                      }}
                    >
                      <Trash2
                        size={20}
                        className="text-red-700 group-hover:text-red-400"
                      />
                    </div>
                    <div
                      className="cursor-pointer hover:bg-background p-2 rounded-sm group"
                      onClick={() => openUpdateDialog(item)}
                    >
                      <Edit
                        size={20}
                        className="text-yellow-700 group-hover:text-yellow-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col justify-center items-center gap-2">
                <ShoppingCart size={60} className="text-secondary" />
                <i>Cart is empty</i>
              </div>
            </div>
          )}
        </CardContent>
        <hr className="border border-gray-600" />
        <CardContent>
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-bold">Total:</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(total)}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSubmit}
            size="lg"
            className="w-full flex items-center gap-2"
            disabled={cart.length === 0 || isSubmitting || !customer}
            title={
              !customer
                ? "Select a customer"
                : cart.length === 0
                ? "Add items to your cart first"
                : ""
            }
          >
            <Save size={18} />
            {isSubmitting ? "Creating..." : `Create ${transactionType}`}
          </Button>
        </CardFooter>
      </Card>
      <Toaster richColors duration={4000} position="top-center" />
      <UpdateCartDialog />
    </>
  );
};

export default TransactionCart;

