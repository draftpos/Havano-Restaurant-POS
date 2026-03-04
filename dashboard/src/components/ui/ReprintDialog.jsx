import React, { useState, useRef, useEffect } from "react";
import { get_invoice_json } from "@/lib/utils";
import { toast } from "sonner";
import OptionsDialog from "./OptionsDialog";

const ReprintDialog = ({ open, onOpenChange, onReprint }) => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState("");
  const modalRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      // 🔒 Only close ReprintDialog if OptionsDialog is NOT open
      if (!showOptions && modalRef.current && !modalRef.current.contains(e.target)) {
        onOpenChange(false);
      }
    };

    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange, showOptions]);

  if (!open) return null;

  const printInvoice = async (invoice) => {
    try {
      const json = await get_invoice_json(invoice);
      if (json) {
        const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${invoice}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
      }
    } catch (err) {
      console.error(err);
      toast.error("Invoice print failed!");
    }
  };

  const handleReprint = async () => {
    if (!invoiceNumber.trim()) {
      alert("Please enter an invoice number");
      return;
    }

    try {
      const res = await fetch("/api/method/havano_restaurant_pos.api.get_user_mapping_defaults");
      const userSettings = await res.json();
      const allowed = userSettings?.message?.allowed_reprint_invoice;

      if (allowed) {
        await printInvoice(invoiceNumber);
        typeof onReprint === "function" && onReprint(invoiceNumber);
        setInvoiceNumber("");
        onOpenChange(false);
        
      } else {
        // Not allowed → show OptionsDialog on top
        setPendingInvoice(invoiceNumber);
        setShowOptions(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not process invoice reprint!");
    }
  };

  const handleActualReprint = async (username) => {
    await printInvoice(pendingInvoice);
    // toast.success(`Invoice reprinted by ${username}`);
    typeof onReprint === "function" && onReprint(pendingInvoice);
    setPendingInvoice("");
    setInvoiceNumber("");
    setShowOptions(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setInvoiceNumber("");
    onOpenChange(false);
  };

  return (
    <>
      {/* Reprint Dialog */}
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <div ref={modalRef} className="bg-white p-6 rounded shadow-lg w-[400px]">
          <h2 className="text-xl font-bold mb-4">Reprint Invoice</h2>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Enter Invoice Number"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-bold hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleReprint}
              className="px-4 py-2 bg-green-500 text-white rounded font-bold hover:bg-green-600 transition"
            >
              Reprint
            </button>
          </div>
        </div>
      </div>

      {/* OptionsDialog on top if needed */}
      <OptionsDialog
        open={showOptions}
        onOpenChange={setShowOptions}
        title="Supervisor Authorization Required"
        confirmText="Authorize & Reprint"
        onConfirm={({ username }) => handleActualReprint(username)}
      />
    </>
  );
};

export default ReprintDialog;