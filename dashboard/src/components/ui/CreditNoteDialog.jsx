import React, { useState, useEffect, useRef } from "react";
import { get_invoice_json } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { toast } from "sonner";

const CreditNoteDialog = ({ open, onOpenChange }) => {
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const modalRef = useRef();
  const addToCart = useCartStore((state) => state.addToCart);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onOpenChange(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  // Fetch latest 3 invoices
  useEffect(() => {
    if (!open) return;
    fetch("/api/method/havano_restaurant_pos.api.get_latest_invoices")
      .then((res) => res.json())
      .then((data) => {
        const arr = Array.isArray(data?.message) ? data.message : [];
        setInvoices(arr);
        setFiltered(arr);
      })
      .catch((err) => {
        console.error("Error fetching latest invoices:", err);
        setInvoices([]);
        setFiltered([]);
      });
  }, [open]);

  // Filter invoices as user types
  useEffect(() => {
    if (!Array.isArray(invoices)) return;
    if (search.trim() === "") {
      setFiltered(invoices);
    } else {
      setFiltered(
        invoices.filter((inv) =>
          inv.sales_invoice?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, invoices]);

  if (!open) return null;

  const handleSelect = async (invoiceName) => {
    console.log("Selected invoice:", invoiceName);
    try {
      const json = await get_invoice_json(invoiceName);
      const items = Array.isArray(json?.items) ? json.items : [];

      if (!items.length) {
        toast.error("No items found in this invoice");
        return;
      }

      // Add each item to cart
      items.forEach((item) => {
        addToCart({
          name: item.item_code || item.item_name,
          item_name: item.item_name,
          custom_menu_category: item.custom_menu_category || "General",
          quantity: item.qty || 1,
          uom: item.uom || "Unit",
          price: item.rate || item.price || 0,
          standard_rate: item.rate || item.price || 0,
          remark: `From invoice ${invoiceName}`,
        });
      });

      toast.success(`${items.length} item(s) added from invoice ${invoiceName}`);
      setSearch("");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(`Invoice ${invoiceName} could not be loaded`);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div ref={modalRef} className="bg-white p-6 rounded shadow-lg w-[400px]">
        <h2 className="text-xl font-bold mb-4">Create Credit Note</h2>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Invoice"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        <ul className="max-h-40 overflow-y-auto mb-4 border border-gray-200 rounded">
          {(Array.isArray(filtered) ? filtered : []).map((inv) => (
            <li
              key={inv.sales_invoice}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(inv.sales_invoice)}
            >
              {inv.sales_invoice} - {inv.customer || "N/A"}
            </li>
          ))}
          {(Array.isArray(filtered) ? filtered : []).length === 0 && (
            <li className="px-3 py-2 text-gray-400">No invoices found</li>
          )}
        </ul>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setSearch("");
              onOpenChange(false);
            }}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-bold hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditNoteDialog;