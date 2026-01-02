import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import MultiCurrencyDialog from "./MultiCurrencyDialog";
import Keyboard from "@/components/ui/Keyboard";
import { Textarea } from "@/components/ui/textarea";
import { createInvoiceAndPaymentQueue, makePaymentForTransaction, get_invoice_json } from "@/lib/utils";
import { db, call } from "@/lib/frappeClient";

export default function PaymentDialog({
  open,
  onOpenChange,
  onPaid,
  cartItems = [],
  customer = "",
  orderId = null,
  orderPayload = null,
  isExistingTransaction = false,
  transactionDoctype = null,
  transactionName = null,
}) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [activeMethod, setActiveMethod] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [note, setNote] = useState("");
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [total, setTotal] = useState(0);
  const [openMultiCurrencyDialog, setOpenMultiCurrencyDialog] = useState(false);

  

  // Fetch payment methods from HA POS Setting
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      setLoadingPaymentMethods(true);
      try {
        // Get default currency from Global Defaults
        const { message: defaultCurrency } = await db.getSingleValue("Global Defaults", "default_currency");
        const systemCurrency = defaultCurrency || "USD";

        // Get HA POS Settings document (Single doctype)
        const settingsResponse = await call.get("havano_restaurant_pos.api.get_ha_pos_settings");
        const doc = settingsResponse?.message?.data;
        console.log("HA POS Settings document:", doc);

        let methods = [];
        
        if (doc && doc.selected_payment_methods && doc.selected_payment_methods.length > 0) {
          // Filter payment methods to only include those with currency matching default currency
          // But always include Cash regardless of currency
          const filteredMethods = doc.selected_payment_methods
            .filter((item) => {
              // Always include Cash, or include if currency matches default currency
              return item.mode_of_payment === "Cash" || item.currency === systemCurrency;
            })
            .map((item) => item.mode_of_payment)
            .filter((method) => method); // Remove any null/undefined values

          methods = filteredMethods;
        }

        // Always include Cash as default, whether in selected methods or not
        if (!methods.includes("Cash")) {
          methods.unshift("Cash"); // Add Cash at the beginning
        } else {
          // Move Cash to the beginning if it exists
          methods = methods.filter((m) => m !== "Cash");
          methods.unshift("Cash");
        }

        if (methods.length > 0) {
          setPaymentMethods(methods);
          setActiveMethod("Cash"); // Always set Cash as default active method
          setPaymentAmounts(methods.reduce((acc, m) => ({ ...acc, [m]: "" }), {}));
        } else {
          // Fallback to Cash only if no methods found
          const defaultMethods = ["Cash"];
          setPaymentMethods(defaultMethods);
          setActiveMethod("Cash");
          setPaymentAmounts(defaultMethods.reduce((acc, m) => ({ ...acc, [m]: "" }), {}));
        }
      } catch (error) {
        console.error("Error fetching payment methods:", error);
        // Fallback to Cash only on error
        const defaultMethods = ["Cash"];
        setPaymentMethods(defaultMethods);
        setActiveMethod("Cash");
        setPaymentAmounts(defaultMethods.reduce((acc, m) => ({ ...acc, [m]: "" }), {}));
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    const t = (cartItems || []).reduce((acc, it) => {
      const qty = Number(it.quantity || it.qty || 1) || 0;
      const rate = Number(it.price || it.rate || it.standard_rate || 0) || 0;
      return acc + qty * rate;
    }, 0);
    setTotal(Number(t.toFixed(2)));
    // reset payment amounts when cart changes
    if (paymentMethods.length > 0) {
      setPaymentAmounts(paymentMethods.reduce((acc, m) => ({ ...acc, [m]: "" }), {}));
      setActiveMethod(paymentMethods[0]);
    }
  }, [cartItems, paymentMethods]);

  const setPaymentAmount = (method, val) => {
    // Allow users to enter any value (including values greater than total)
    // The capping will happen when creating the payment entry
    setPaymentAmounts((s) => ({ ...s, [method]: String(val) }));
  };

  const sumPayments = () => {
    return Object.values(paymentAmounts).reduce((acc, v) => {
      const n = parseFloat(v) || 0;
      return acc + n;
    }, 0);
  };

  // Calculate payment status
  const paymentStatus = useMemo(() => {
    const paid = sumPayments();
    const diff = paid - total;
    return {
      paid,
      diff,
      hasDue: diff < 0,
      hasReturn: diff > 0,
    };
  }, [paymentAmounts, total]);

  async function handlePay (){
    let paidTotal = sumPayments();
    
    // Get payment breakdown for multiple methods (optimized: single pass)
    const paymentEntries = Object.entries(paymentAmounts)
      .filter(([k, v]) => parseFloat(v) > 0);
    
    let paymentBreakdown = paymentEntries.map(([k, v]) => ({
      payment_method: k,
      amount: parseFloat(v) || 0
    }));

    // Cap payment amounts at total if total exceeds invoice total
    if (paidTotal > total && paymentBreakdown.length > 0) {
      // Scale down proportionally if total exceeds
      const scaleFactor = total / paidTotal;
      paymentBreakdown = paymentBreakdown.map(p => ({
        ...p,
        amount: p.amount * scaleFactor
      }));
      paidTotal = total;
    }

    // Create breakdown note (optimized: single pass)
    const breakdown = paymentBreakdown
      .map(p => `${p.payment_method}:${p.amount.toFixed(2)}`)
      .join(", ");

    const payment_method = paymentBreakdown.length > 1 ? "Multi" : (paymentBreakdown[0]?.payment_method || "Cash");

    const fullNote = note ? `${note} | ${breakdown}` : breakdown;

    // Immediately show success and close dialog (optimistic UI)
    if (typeof onPaid === "function") {
      onPaid({ success: true, message: "Payment processing..." });
    }
    if (typeof onOpenChange === "function") {
      onOpenChange(false);
    }

    // Process payment in background (fire and forget)
    (async () => {
      try {
        if (isExistingTransaction && transactionDoctype && transactionName) {
          // Only fetch invoice JSON if needed (optimized: conditional)
          try {
            const invoiceJson = await get_invoice_json(transactionName);
            console.log("Invoice JSON returned from backend:", invoiceJson);

            // Convert JSON to string
            const jsonStr = JSON.stringify(invoiceJson, null, 2);

            // Create a blob and download (optimized: async download)
            const blob = new Blob([jsonStr], { type: "text/plain" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${transactionName}.txt`;
            document.body.appendChild(link);
            link.click();
            // Cleanup asynchronously (non-blocking)
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(link.href);
            }, 0);
          } catch (error) {
            console.error("Error fetching invoice JSON:", error);
            // Continue with payment even if JSON fetch fails
          }

          // Make payment for existing Sales Invoice or Quotation (background)
          await makePaymentForTransaction(
            transactionDoctype,
            transactionName,
            paidTotal > 0 ? paidTotal : null,
            payment_method,
            fullNote,
            paymentBreakdown.length > 0 ? paymentBreakdown : null
          );
        } else {
          // Create new order and payment using queue (sales invoice and payment created in background)
          const payload =
            orderPayload ||
            ({
              order_type: "Take Away",
              customer_name: customer || (orderPayload && orderPayload.customer_name) || "",
              order_items: cartItems,
            });

          // Ensure customer is set
          const finalCustomer = payload.customer_name || customer;
          if (!finalCustomer) {
            console.error("Customer is required");
            return;
          }

          // Use queue system for async processing (background)
          await createInvoiceAndPaymentQueue(
            cartItems,
            finalCustomer,
            paymentBreakdown.length > 0 ? paymentBreakdown : null,
            paymentBreakdown.length === 1 ? payment_method : null,
            paidTotal > 0 ? paidTotal : null,
            fullNote,
            payload
          );
        }
      } catch (err) {
        // Log error but don't block user (payment already shown as successful)
        console.error("Payment processing error (background):", err);
      }
    })();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (paymentStatus.hasDue) return;
        handlePay();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatus.hasDue])

  return (
    <>
      <style>{`
        .payment-dialog-content {
          max-width: 80rem !important;
          width: 95% !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        @media (min-width: 768px) {
          .payment-dialog-content {
            width: 85% !important;
          }
        }
        @media (min-width: 1024px) {
          .payment-dialog-content {
            width: 75% !important;
          }
        }
        @media (min-width: 1280px) {
          .payment-dialog-content {
            width: 65% !important;
          }
        }
        .payment-keyboard-box {
          background-color: #f9fafb !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
        }
        .payment-keyboard-container {
          width: 100% !important;
        }
        @media (min-width: 640px) {
          .payment-keyboard-container {
            width: 32rem !important;
            min-width: 32rem !important;
          }
        }
        .payment-keyboard-box .grid button,
        .payment-keyboard-box button[type="button"] {
          font-size: 1.5rem !important;
          padding-top: 1.25rem !important;
          padding-bottom: 1.25rem !important;
        }
        .payment-dialog-content::-webkit-scrollbar {
          width: 8px;
        }
        .payment-dialog-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .payment-dialog-content::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        .payment-dialog-content::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
      <MultiCurrencyDialog
        open={openMultiCurrencyDialog}
        onOpenChange={setOpenMultiCurrencyDialog}
        setPaymentDialogOpenState={onOpenChange}
        total={total}
        cartItems={cartItems}
        orderPayload={orderPayload}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-4 rounded-xl bg-white shadow-lg w-full max-w-7xl payment-dialog-content">
          <div className="flex flex-col h-full">
            <DialogHeader className="mb-3 flex-shrink-0">
              <DialogTitle className="text-lg font-semibold">
                Make Payment
              </DialogTitle>
              <DialogDescription className="sr-only">
                Enter payment amount and select payment method
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col sm:flex-row gap-4 flex-1 min-h-0">
              <div className="flex-1 bg-gray-50 p-4 rounded-lg min-w-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium">Total</label>
                      <div className="text-2xl font-bold">
                        ${total?.toFixed(2) || "0.00"}
                      </div>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2 p-0"
                      onClick={() => setOpenMultiCurrencyDialog(true)}
                    >
                      Split Payment / Multi-Currency
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium">
                      Payments
                    </label>
                    <div className="space-y-2 mt-2">
                      {paymentMethods.map((m) => (
                        <div
                          key={m}
                          className={`flex items-center gap-2 p-2 border rounded-lg transition-colors ${
                            activeMethod === m
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                              : "border-gray-300 bg-white hover:border-gray-400"
                          }`}
                        >
                          <div
                            className={`w-28 font-medium ${
                              activeMethod === m
                                ? "text-blue-700"
                                : "text-gray-700"
                            }`}
                          >
                            {m}
                          </div>
                          <input
                            inputMode="decimal"
                            className={`flex-1 p-2 border rounded ${
                              activeMethod === m
                                ? "border-blue-400 bg-white ring-1 ring-blue-300 focus:ring-2 focus:ring-blue-400"
                                : "border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                            }`}
                            value={paymentAmounts[m]}
                            onFocus={() => setActiveMethod(m)}
                            onChange={(e) =>
                              setPaymentAmount(m, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Change</label>
                    <div
                      className={`text-xl font-bold ${
                        paymentStatus.hasDue
                          ? "text-red-600"
                          : paymentStatus.hasReturn
                          ? "text-green-600"
                          : ""
                      }`}
                    >
                      {paymentStatus.diff >= 0
                        ? `Return ${paymentStatus.diff.toFixed(2)}`
                        : `Due -${Math.abs(paymentStatus.diff).toFixed(2)}`}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange && onOpenChange(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePay}
                      disabled={paymentStatus.hasDue}
                      className="flex-1"
                    >
                      Make Payment
                    </Button>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-[32rem] payment-keyboard-container flex-shrink-0">
                <div className="bg-gray-50 p-4 rounded-lg payment-keyboard-box">
                  <Keyboard
                    value={paymentAmounts[activeMethod]}
                    setValue={(v) => setPaymentAmount(activeMethod, v)}
                    className="w-full"
                    buttonClass="text-2xl py-5"
                  />

                  <div className="mt-3">
                    <label className="block text-sm font-medium">Note</label>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note"
                      rows={3}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
