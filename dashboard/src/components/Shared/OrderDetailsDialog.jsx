import { useCallback,useEffect, useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { db } from "@/lib/frappeClient";
import { formatCurrency, createTransaction } from "@/lib/utils";

const DEFAULT_DESCRIPTION = "Select an order to view its details.";

const OrderDetailsDialog = ({
  open,
  orderId,
  onClose,
  onEdit,
  onDeleted,
}) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [creatingQuotation, setCreatingQuotation] = useState(false);

  const resetState = useCallback(() => {
    setOrder(null);
    setLoading(false);
    setError(null);
    setDeleting(false);
    setCreatingQuotation(false);
  }, []);

  const enrichOrder = useCallback(async (orderDoc) => {
    let waiterDisplay = orderDoc.waiter || null;
    if (orderDoc.waiter) {
      try {
        const waiterDoc = await db.getDoc("HA Waiter", orderDoc.waiter, {
          fields: ["name", "waiter_name"],
        });
        waiterDisplay =
          waiterDoc.waiter_name || waiterDoc.name || orderDoc.waiter;
      } catch (err) {
        console.warn("Failed to fetch waiter info:", err);
      }
    }

    let tableDisplay = orderDoc.table || null;
    if (orderDoc.table) {
      try {
        const tableDoc = await db.getDoc("HA Table", orderDoc.table, {
          fields: ["name", "table_number"],
        });
        tableDisplay =
          tableDoc.table_number || tableDoc.name || orderDoc.table;
      } catch (err) {
        console.warn("Failed to fetch table info:", err);
      }
    }

    return {
      ...orderDoc,
      waiter_display: waiterDisplay,
      table_display: tableDisplay,
    };
  }, []);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      resetState();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const orderDoc = await db.getDoc("HA Order", orderId, {
        fields: [
          "name",
          "customer_name",
          "table",
          "waiter",
          "order_type",
          "total_price",
          "order_items",
        ],
      });
      const hydratedOrder = await enrichOrder(orderDoc);
      setOrder(hydratedOrder);
    } catch (err) {
      console.error("Order view fetch error:", err);
      setError(err?.message || "Failed to load order details.");
    } finally {
      setLoading(false);
    }
  }, [orderId, enrichOrder, resetState]);

  useEffect(() => {
    if (open) {
      loadOrder();
    } else {
      resetState();
    }
  }, [open, loadOrder, resetState]);

  const handleDelete = async () => {
    if (!orderId || deleting) {
      return;
    }

    setDeleting(true);
    try {
      await db.deleteDoc("HA Order", orderId);
      toast.success("Order deleted", {
        description: `Order ID: ${orderId}`,
        duration: 4000,
      });

      if (typeof onDeleted === "function") {
        await onDeleted(orderId);
      }

      if (typeof onClose === "function") {
        onClose();
      }
    } catch (err) {
      console.error("Order delete error:", err);
      toast.error("Unable to delete order", {
        description: err?.message || "Please try again later.",
        duration: 5000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = async () => {
    if (!orderId || !order) {
      return;
    }

    // If order type is Quotation, create a Quotation instead of editing
    if (order.order_type === "Quotation") {
      setCreatingQuotation(true);
      try {
        // Convert order items to the format expected by createTransaction
        const items = (order.order_items || []).map((item) => ({
          item_code: item.menu_item || item.menu_item_name,
          qty: item.qty ?? item.quantity ?? 1,
          rate: item.rate ?? item.price ?? 0,
        }));

        if (items.length === 0) {
          toast.error("Cannot create quotation", {
            description: "Order has no items.",
            duration: 5000,
          });
          return;
        }

        const customer = order.customer_name || "";
        if (!customer) {
          toast.error("Cannot create quotation", {
            description: "Customer name is required.",
            duration: 5000,
          });
          return;
        }

        const result = await createTransaction("Quotation", customer, items);
        
        if (result && result.success !== false && result.name) {
          if (typeof onClose === "function") {
            onClose();
          }
        } else {
          toast.error("Failed to create quotation", {
            description: result?.message || result?.details || "Please try again later.",
            duration: 5000,
          });
        }
      } catch (err) {
        console.error("Quotation creation error:", err);
        toast.error("Failed to create quotation", {
          description: err?.message || "Please try again later.",
          duration: 5000,
        });
      } finally {
        setCreatingQuotation(false);
      }
      return;
    }

    // For non-quotation orders, use the normal edit flow
    if (typeof onEdit !== "function") {
      return;
    }
    onEdit(orderId);
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const description = (() => {
    if (loading) {
      return "Loading order details...";
    }
    if (error) {
      return "Unable to load order details.";
    }
    if (order) {
      const parts = [
        order.customer_name && `Customer: ${order.customer_name}`,
        order.waiter_display && `Waiter: ${order.waiter_display}`,
        order.table_display && `Table: ${order.table_display}`,
      ].filter(Boolean);
      return parts.length ? parts.join(" • ") : "Order details";
    }
    return DEFAULT_DESCRIPTION;
  })();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && typeof onClose === "function") {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {orderId ? `Order ${orderId}` : "Order Details"}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : order ? (
          <div className="space-y-4">
            <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
              {order.order_items && order.order_items.length > 0 ? (
                <ul className="space-y-3">
                  {order.order_items.map((item) => (
                    <li
                      key={item.name}
                      className="flex justify-between items-start text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {item.menu_item_name || item.menu_item}
                        </span>
                        {item.preparation_remark && (
                          <span className="text-muted-foreground text-xs">
                            Note: {item.preparation_remark}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="block">
                          Qty: {item.qty ?? item.quantity ?? 0}
                        </span>
                        <span className="block">
                          {formatCurrency(item.rate ?? item.price ?? 0)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No items for this order.
                </p>
              )}
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.total_price ?? 0)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {DEFAULT_DESCRIPTION}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || !orderId}
          >
            Delete
          </Button>
          <Button 
            onClick={handleEdit} 
            disabled={!orderId || creatingQuotation}
          >
            {order?.order_type === "Quotation" ? "Create Quotation" : "Edit Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
