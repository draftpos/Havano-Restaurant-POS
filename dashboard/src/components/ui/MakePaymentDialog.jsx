import React, { useState } from "react";
import { db } from "@/lib/frappeClient";
import PaymentDialog from "@/components/MenuPage/PaymentDialog";

/**
 * Make Payment from Options - user enters invoice number, then payment modal opens.
 * Same flow as hotel payment processing.
 */
const MakePaymentDialog = ({ open, onOpenChange }) => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDoc, setInvoiceDoc] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState("select"); // "select" | "pay"

  const handleSelectInvoice = async () => {
    if (!invoiceNumber.trim()) {
      setError("Please enter an invoice number");
      return;
    }
    setError("");
    try {
      const doc = await db.getDoc("Sales Invoice", invoiceNumber.trim());
      if (doc) {
        setInvoiceDoc(doc);
        setStep("pay");
      } else {
        setError("Invoice not found");
      }
    } catch (err) {
      setError("Invoice not found or invalid");
      console.error(err);
    }
  };

  const handleClose = (isOpen) => {
    if (!isOpen) {
      setStep("select");
      setInvoiceNumber("");
      setInvoiceDoc(null);
      setError("");
    }
    onOpenChange(false);
  };

  return (
    <>
      {step === "select" && open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-[400px]">
            <h2 className="text-xl font-bold mb-4">Make Payment</h2>
            <p className="text-sm text-gray-600 mb-4">Enter the Sales Invoice number to process payment:</p>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. SAL-SINV-2024-00001"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-bold hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectInvoice}
                className="px-4 py-2 bg-green-500 text-white rounded font-bold hover:bg-green-600"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {step === "pay" && invoiceDoc && (
        <PaymentDialog
          open={true}
          onOpenChange={(open) => !open && handleClose(false)}
          cartItems={invoiceDoc.items?.map((item) => ({
            name: item.item_code,
            item_name: item.item_name,
            quantity: item.qty,
            price: item.rate,
            remark: item.custom_preparation_remark_free || item.custom_preparation_remark || "",
          })) || []}
          customer={invoiceDoc.customer_name}
          orderId={null}
          orderPayload={null}
          isExistingTransaction={true}
          transactionDoctype="Sales Invoice"
          transactionName={invoiceDoc.name}
          onPaid={() => handleClose(false)}
        />
      )}
    </>
  );
};

export default MakePaymentDialog;
