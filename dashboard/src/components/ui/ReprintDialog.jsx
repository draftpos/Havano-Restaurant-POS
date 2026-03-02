import React, { useState, useRef, useEffect } from "react";
import { get_invoice_json } from "@/lib/utils";

const ReprintDialog = ({ open, onOpenChange, onReprint }) => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const modalRef = useRef();

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  const handleReprint = async () => {
  if (!invoiceNumber.trim()) {
    alert("Please enter an invoice number");
    return;
  }

  try {

    // const settingsRes = await call.get("havano_restaurant_pos.api.get_ha_pos_settings");
    // const canPrint = Boolean(settingsRes?.message?.data?.can_print_invoice);

    // if (!canPrint) {
    //   alert("Printing is disabled in POS settings");
    //   return;
    // }

    // Directly call your whitelisted function
    const json = await get_invoice_json(invoiceNumber);

    if (json) {
      const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${invoiceNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
    }

    typeof onReprint === "function" && onReprint(invoiceNumber);
    setInvoiceNumber("");
    onOpenChange(false);
  } catch (err) {
    console.error("Error triggering invoice download:", err);
    // alert(`Invoice ${invoiceNumber} does not exist or could not be retrieved.`);
  }
};


  const handleCancel = () => {
    setInvoiceNumber("");
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div
        ref={modalRef}
        className="bg-white p-6 rounded shadow-lg w-[400px]"
      >
        {/* Header */}
        <h2 className="text-xl font-bold mb-4">Reprint Invoice</h2>

        {/* Input */}
        <input
          type="text"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          placeholder="Enter Invoice Number"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        {/* Buttons */}
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
  );
};

export default ReprintDialog;