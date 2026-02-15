import { Edit, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast,Toaster } from "sonner";
import { cn } from "@/lib/utils";

import { useMenuContext } from "@/contexts/MenuContext";

import { 
  formatCurrency,
  createTransaction, 
  getDefaultCustomer, 
  convertQuotationToSalesInvoiceFromCart,
  generate_quotation_json,
  handleCreateOrder
} from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { useOrderStore } from "@/stores/useOrderStore";

import Clock from "../HomePage/Clock";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import UpdateCartDialog from "./UpdateCartDialog";
import PaymentDialog from "./PaymentDialog";

const Cart = () => {
  const { target, currentIndex, setTarget, selectedAgent } = useMenuContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const fetchOrders = useOrderStore((state) => state.fetchOrders);
  const fetchTableOrders = useOrderStore((state) => state.fetchTableOrders);
  const {
    cart,
    removeFromCart,
    openUpdateDialog,
    activeOrderId,
    activeTableId,
    activeWaiterId,
    customerName,
    orderType,
    transactionType,
    customer,
    activeQuotationId,
    clearCart,
  } = useCartStore();

  useEffect(() => {
    const handleKeyBoardSubmitOrder = (event) => {
      if (event.key === "F10") {
        event.preventDefault();
        handleSubmitOrder(cart);
      }
    }
    window.addEventListener("keydown", handleKeyBoardSubmitOrder);
    return () => {
      window.removeEventListener("keydown", handleKeyBoardSubmitOrder);
    }
  })


 async function handleSubmitOrder(cart) {
    console.log("🔵 handleSubmitOrder called");
    console.log("  orderTypes:", orderType);
    console.log("  transactionType:", transactionType);
    console.log("  activeOrderId:", activeOrderId);
    console.log("  cart:", cart);

    if (!cart || cart.length === 0) {
      console.log("  ❌ Cart is empty, returning");
      return;
    }

    if (cart.some(item => item.price <= 0)) {
      toast.error("Invalid item price", {
        description: "One or more items have invalid prices. Please update item prices before proceeding.",
        duration: 5000,
      });
      return;
    }

    // If transactionType is Quotation, handle quotation update and conversion
    if (transactionType === "Quotation") {
      if (!customer) {
        toast.error("Customer required", {
          description: "Please select a customer before creating a quotation.",
          duration: 5000,
        });
        return;
      }

      setIsSubmitting(true);
      try {
        // Convert cart items to the format expected by API
        const items = cart.map((item) => ({
          item_code: item.name || item.item_name,
          qty: item.quantity || 1,
          rate: item.price || item.standard_rate || 0,
        }));

        // If activeQuotationId exists, update quotation and convert to sales invoice
        if (activeQuotationId) {
          const result = await convertQuotationToSalesInvoiceFromCart(
            activeQuotationId,
            items,
            customer,
            orderType || "Take Away",
            activeTableId || null,
            activeWaiterId || null,
            customerName || customer
          );
          
          if (result && result.success !== false && result.sales_invoice) { 
            console.log("🔵 Quotation converted to Sales Invoice:", result.sales_invoice);
            setPaymentState({
              open: true,
              orderId: null,
              items: cart,
              payload: null,
              isExistingTransaction: true,
              transactionDoctype: "Sales Invoice",
              transactionName: result.sales_invoice,
            });
          } else {
            // Log the full result for debugging
            console.error("Convert quotation failed:", result);
            
            // Build a comprehensive error message
            let errorMessage = result?.message || "Failed to convert quotation";
            if (result?.details) {
              errorMessage += `: ${result.details}`;
            }
            if (result?.error_type) {
              errorMessage += ` (${result.error_type})`;
            }
            
            toast.error("Failed to convert quotation", {
              description: errorMessage,
              duration: 8000, // Longer duration to read the error
            });
          }
        } else {
          // Create new quotation
          const result = await createTransaction("Quotation", customer, items);
          
          if (result && result.success !== false && result.name) {
            console.log("QUote created here bro" + result.name);
             try {
                  const res = await generate_quotation_json(result.name);
                  console.log("Quote JSON returned from backend:", res);
            
                  // Convert JSON to string
                  const jsonStr = JSON.stringify(res, null, 2); // pretty-print with 2 spaces
            
                  // Create a blob
                  const blob = new Blob([jsonStr], { type: "text/plain" });
            
                  // Create a download link
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = `${result.name}.txt`; // name the file as invoice name
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (error) {
                  console.error("Error fetching invoice JSON:", error);
                }

            toast.success("Quotation created successfully", {
              description: `Quotation ID: ${result.name}`,
              duration: 4000,
            });
            
            clearCart();
            
            // Refresh orders if needed
            try {
              await fetchOrders();
              if (activeTableId) {
                await fetchTableOrders(activeTableId);
              }
            } catch (refreshErr) {
              console.error("Failed to refresh orders:", refreshErr);
            }
          } else {
            toast.error("Failed to create quotation", {
              description: result?.message || result?.details || "Please try again later.",
              duration: 5000,
            });
          }
        }
      } catch (err) {
        console.error("Quotation error:", err);
        toast.error("Failed to process quotation", {
          description: err?.message || "Please try again later.",
          duration: 5000,
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    
    // Place Order (F10) - For Dine In, create order directly without payment dialog
    // For other order types, open payment dialog
    setIsSubmitting(true);
    try {
      // Get customer - use selected customer or get default
      let selectedCustomer = customerName || customer;
      if (!selectedCustomer) {
        selectedCustomer = await getDefaultCustomer();
        if (!selectedCustomer) {
          toast.error("Customer required", {
            description: "Please select a customer or configure a default customer in Settings.",
            duration: 5000,
          });
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        order_type: orderType || "Take Away",
        customer_name: selectedCustomer,
        order_items: cart.map((item) => ({
          name: item.name || item.item_name,
          item_code: item.name || item.item_name,
          quantity: item.quantity || 1,
          qty: item.quantity || 1,
          price: item.price || item.standard_rate || 0,
          rate: item.price || item.standard_rate || 0,
          remark: item.remark || "",
        })),
        table: activeTableId || null,
        waiter: activeWaiterId || null,
        agent: selectedAgent || null,
      };

      // For Dine In orders, create order directly without payment dialog
      if (orderType === "Dine In") {
        try {
          const result = await handleCreateOrder(payload);
          
          if (result && result.success !== false) {
            console.log("order-------------------"+result.order_id);
            window.open(
  `/api/method/havano_restaurant_pos.api.download_order_json_by_order_id?order_id=${result.order_id}`,
  "_blank"
);
            toast.success("Order created successfully", {
              description: result.order_id ? `Order ID: ${result.order_id}` : "Order placed",
              duration: 4000,
            });
            
            clearCart();
            
            // Refresh orders
            try {
              await fetchOrders();
              if (activeTableId) {
                await fetchTableOrders(activeTableId);
              }
            } catch (refreshErr) {
              console.error("Failed to refresh orders:", refreshErr);
            }
            
            // Navigate to table details if we have a table
            if (activeTableId) {
              navigate(`/tables/${activeTableId}`);
            }
          } else {
            toast.error("Failed to create order", {
              description: result?.message || result?.details || "Please try again later.",
              duration: 5000,
            });
          }
        } catch (orderErr) {
          console.error("Error creating order:", orderErr);
          toast.error("Failed to create order", {
            description: orderErr?.message || "Please try again later.",
            duration: 5000,
          });
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      // For non-Dine In orders, open payment dialog
      setPaymentState({
        open: true,
        orderId: null,
        items: cart,
        payload: payload,
        isExistingTransaction: false,
        transactionDoctype: null,
        transactionName: null,
      });
    } catch (err) {
      console.error("Error preparing payment:", err);
      toast.error("Failed to prepare payment", {
        description: err?.message || "Please try again later.",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [paymentState, setPaymentState] = useState({ 
    open: false, 
    orderId: null, 
    items: [], 
    payload: null,
    isExistingTransaction: false,
    transactionDoctype: null,
    transactionName: null,
  });

  useEffect(() => {
    if (paymentState.open) {
      setTarget("payment");
    }else{
      setTarget("menu");
    }
  }, [paymentState.open]);

  const handlePaymentPaid = async (invoiceResp) => {
    // After payment / invoice created, clear cart and refresh orders
    try {
      clearCart();
      // Refresh orders list
      try {
        await fetchOrders();
        if (activeTableId) {
          await fetchTableOrders(activeTableId);
        }
      } catch (err) {
        console.error("Failed to refresh orders:", err);
      }
      
      // If payment was made for an existing transaction (like converted quotation to sales invoice),
      // refresh the page to update status
      if (paymentState.isExistingTransaction) {
        window.location.reload();
        return;
      }
      
      // Navigate if Dine In, otherwise stay on current page
      if (activeTableId) {
        navigate(`/tables/${activeTableId}`);
      }
    } finally {
      setPaymentState({ 
        open: false, 
        orderId: null, 
        items: [], 
        payload: null,
        isExistingTransaction: false,
        transactionDoctype: null,
        transactionName: null,
      });
    }
  };

  return (
    <>
      <Card className="h-[90vh] flex flex-col">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <Clock />
            {activeOrderId ? (
              <h1 className="text-2xl font-bold text-primary">
                {activeOrderId}
              </h1>
            ) : (
              <h1 className="text-2xl font-bold text-primary">New Order</h1>
            )}
          </CardTitle>
        </CardHeader>
        <hr className="border border-gray-600" />
        <CardContent className="flex-1 overflow-y-auto">
          <div className="flex justify-between items-center my-2">
            <p className="text-lg font-bold">Order Details</p>
            {cart.length > 0 && (
              <p className="text-lg font-bold text-primary">
                Total: {formatCurrency(
                  cart.reduce((total, item) => {
                    const price = item.price ?? item.standard_rate ?? 0;
                    const quantity = item.quantity ?? 1;
                    return total + (price * quantity);
                  }, 0)
                )}
              </p>
            )}
          </div>
         {
           cart.length ? (
             <div className="space-y-1">
               {cart.map((item, index) => {
                 const isActive = currentIndex === index && target === "cart";

                 return (
                   <div
                     key={item.name}
                     className={cn(
                       "flex justify-between gap-2 bg-secondary-background p-2 rounded min-w-0",
                       isActive && "border-2 border-primary bg-primary/10"
                     )}
                   >
                     <div className="flex gap-2 font-bold min-w-0 flex-1 text-sm">
                       <p className="shrink-0">x{item.quantity}</p>
                       <p className="min-w-0 flex-1 break-words whitespace-normal text-xs">
                         {item.item_name || item.name}
                       </p>
                       <i className="shrink-0">
                         {formatCurrency(item.price ?? item.standard_rate ?? 0)}
                       </i>
                     </div>

                     <div className="flex shrink-0">
                       <Trash2
                         onClick={() => removeFromCart(item)}
                         className="cursor-pointer text-red-600"
                       />
                       <Edit
                         onClick={() => openUpdateDialog(item)}
                         className="cursor-pointer text-yellow-600 ml-2"
                       />
                     </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center gap-2">
               <ShoppingCart size={60} className="text-secondary" />
               <i>Cart is empty</i>
             </div>
           )
         }
        </CardContent>
        <hr className="border border-gray-600" />
        <CardFooter>
          <Button
            onClick={() => handleSubmitOrder(cart)}
            size="lg"
            className="w-full"
            disabled={cart.length === 0 || isSubmitting}
            title={cart.length === 0 ? "Add items to your cart first" : ""}
          >
            {transactionType === "Quotation" 
              ? (activeQuotationId ? "Convert to Sales Invoice" : "Create Quotation (F10)")
              : (activeOrderId ? "Update Order" : "Place Order (F10)")
            }
          </Button>
        </CardFooter>
      </Card>
      <Toaster richColors duration={4000} position="top-center" />
      <UpdateCartDialog />
      <PaymentDialog
        open={paymentState.open}
        onOpenChange={(open) => setPaymentState((s) => ({ ...s, open }))}
        cartItems={paymentState.items}
        customer={customerName}
        orderId={paymentState.orderId}
        orderPayload={paymentState.payload}
        isExistingTransaction={paymentState.isExistingTransaction}
        transactionDoctype={paymentState.transactionDoctype}
        transactionName={paymentState.transactionName}
        onPaid={handlePaymentPaid}
      />
    </>
  );
};

export default Cart;
 