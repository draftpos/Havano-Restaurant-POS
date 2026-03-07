import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCartStore } from "@/stores/useCartStore";
import Keyboard from "../ui/Keyboard";
import OnScreenKeyboard from "../ui/OnScreenKeyboard";
import { useItemPreparationRemark } from "@/hooks";
import { addRemark, searchPreparationRemarks } from "@/lib/utils";

import { useState } from "react";
const UpdateCartDialog = () => {
  const updateCartItem = useCartStore((state) => state.updateCartItem);
  const selectedItem = useCartStore((state) => state.selectedCartItem);
  const isOpen = useCartStore((state) => state.isUpdateDialogOpen);
  const closeUpdateDialog = useCartStore((state) => state.closeUpdateDialog);

  const { prepRemarks: prepRemarkOptions, remarks: remarkOptions, setRemarks, isLoading: remarksLoading } = useItemPreparationRemark(selectedItem?.name);

  const [showRemarkSuggestions, setShowRemarkSuggestions] = useState(false);
  const [searchableRemarks, setSearchableRemarks] = useState([]);
  const [remarkSearchTerm, setRemarkSearchTerm] = useState("");


  const [showRemarkKeyboard, setShowRemarkKeyboard] = useState(false);
  const [showQuantityKeyboard, setShowQuantityKeyboard] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      price: "",
      quantity: "",
      remark: "",
      preparation_remark: "",
      preparation_remark_free: "",
    },
  });

  const quantityValue = watch("quantity");
  const remarkValue = watch("remark");


  useEffect(() => {
    if (selectedItem) {
      reset({
        price: selectedItem.price ?? "",
        quantity: "",
        remark: selectedItem.remark ?? "",
        preparation_remark: selectedItem.preparation_remark ?? "",
        preparation_remark_free: selectedItem.preparation_remark_free ?? "",
      });
    } else {
      reset({ price: "", quantity: "", remark: "", preparation_remark: "", preparation_remark_free: "" });
    }
  }, [selectedItem, reset]);

const handleConfirm = handleSubmit(async ({ price, quantity, remark, newRemark, preparation_remark, preparation_remark_free }) => {
  if (!selectedItem?.name) return;

  const freeHand = preparation_remark_free || newRemark || "";
  const displayRemark = freeHand || remark || "";

  updateCartItem({
    ...selectedItem,
    price: Number(price),
    quantity: Number(quantity),
    remark: displayRemark,
    preparation_remark: freeHand ? null : (preparation_remark || null),
    preparation_remark_free: freeHand || "",
  });

  // If new remark exists
  if (newRemark?.trim()) {
    try {
      await addRemark(newRemark.trim());
      setRemarks((prev) => {
        // Add new remark only if it's not already in the list
        if (!prev.includes(newRemark.trim())) return [...prev, newRemark.trim()];
        return prev;
      });
      setValue("remark", newRemark.trim()); // auto-select it in the searchable field
    } catch (err) {
      console.error("Failed to add new remark:", err);
    }
  }

  setShowRemarkKeyboard(false);
  setShowQuantityKeyboard(true);
  closeUpdateDialog();
});

  useEffect(() => {
    function handleEnter(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (!quantityValue) return;
        handleConfirm();
      }
    }
    document.addEventListener("keydown", handleEnter);
    return () => {
      document.removeEventListener("keydown", handleEnter);
    };
  })

  return (
    <>
      <style>{`
        .update-cart-dialog-content {
          max-width: 80rem !important;
          width: 95% !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        @media (min-width: 768px) {
          .update-cart-dialog-content {
            width: 85% !important;
          }
        }
        @media (min-width: 1024px) {
          .update-cart-dialog-content {
            width: 75% !important;
          }
        }
        @media (min-width: 1280px) {
          .update-cart-dialog-content {
            width: 65% !important;
          }
        }
        .update-cart-keyboard-box {
          background-color: #f9fafb !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
        }
        .update-cart-keyboard-container {
          width: 100% !important;
        }
        @media (min-width: 640px) {
          .update-cart-keyboard-container {
            width: 32rem !important;
            min-width: 32rem !important;
          }
        }
        .update-cart-keyboard-box .grid button,
        .update-cart-keyboard-box button[type="button"] {
          font-size: 1.5rem !important;
          padding-top: 1.25rem !important;
          padding-bottom: 1.25rem !important;
        }
        .update-cart-dialog-content::-webkit-scrollbar {
          width: 8px;
        }
        .update-cart-dialog-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .update-cart-dialog-content::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        .update-cart-dialog-content::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeUpdateDialog();
            setShowRemarkKeyboard(false);
            setShowQuantityKeyboard(true);
          }
        }}
      >
        <DialogContent className="p-4 rounded-xl bg-white shadow-lg w-full max-w-7xl update-cart-dialog-content">
          <div className="flex flex-col h-full">
            <DialogHeader className="mb-3 flex-shrink-0">
              {selectedItem?.name && (
                <DialogTitle className="text-lg font-semibold">
                  {selectedItem.item_name || selectedItem.name}
                </DialogTitle>
              )}
            </DialogHeader>
            <div className="flex flex-col sm:flex-row gap-4 flex-1 min-h-0">
              {/* Left side - Form fields */}
              <div className="flex-1 bg-gray-50 p-4 rounded-lg min-w-0">
                <form onSubmit={handleConfirm} className="space-y-4">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Price
                    </label>
                    <Input
                      disabled
                      type="number"
                      step="0.01"
                      min="0"
                      {...register("price")}
                      className="w-full"
                    />
                  </div>
                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      min="1"
                      {...register("quantity")}
                      className="w-full"
                      onFocus={() => {
                        setShowRemarkKeyboard(false);
                        setShowQuantityKeyboard(true);
                      }}
                    />
                  </div>
                  {/* Preparation Remark */}

{/* Searchable Remark Field with Dropdown Arrow */}
<div className="relative mb-4">
  <label className="block text-sm font-medium mb-1">Preparation Remark</label>
  <div className="relative">
    <Input
      {...register("remark")}
      value={remarkValue || ""}
      onChange={async (e) => {
        const v = e.target.value;
        setValue("remark", v);
        setRemarkSearchTerm(v);
        if (v.length >= 1) {
          const results = await searchPreparationRemarks(v);
          setSearchableRemarks(Array.isArray(results) ? results : []);
        }
      }}
      onFocus={() => setShowRemarkSuggestions(true)}
      onBlur={() => setTimeout(() => setShowRemarkSuggestions(false), 150)}
      placeholder="Search by code or description..."
      className="w-full pr-10"
    />

    {/* Dropdown Arrow - load searchable remarks on click */}
    <button
      type="button"
      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
      onMouseDown={async (e) => {
        e.preventDefault();
        setShowRemarkSuggestions(true);
        const results = await searchPreparationRemarks(remarkSearchTerm || "");
        setSearchableRemarks(Array.isArray(results) ? results : []);
      }}
    >
      ▼
    </button>

    {/* Suggestions Box - search by remark_code or description */}
    {showRemarkSuggestions && (
      <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
        {searchableRemarks.length > 0 ? (
          searchableRemarks.map((r) => {
            const displayText = r.description || r.remark_code || r.name;
            const selectVal = r.description || r.name;
            return (
              <button
                key={r.name}
                type="button"
                onMouseDown={() => {
                  setValue("remark", displayText, { shouldDirty: true });
                  setValue("preparation_remark", r.name, { shouldDirty: true });
                  setValue("preparation_remark_free", "", { shouldDirty: true });
                  setShowRemarkSuggestions(false);
                }}
                className="block w-full text-left px-3 py-2 hover:bg-gray-100"
              >
                {r.remark_code ? `[${r.remark_code}] ` : ""}{displayText}
              </button>
            );
          })
        ) : (
          Array.isArray(remarkOptions) && remarkOptions.length > 0 && remarkOptions.map((item) => (
            <button
              key={item}
              type="button"
              onMouseDown={() => {
                setValue("remark", item, { shouldDirty: true });
                setShowRemarkSuggestions(false);
              }}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100"
            >
              {item}
            </button>
          ))
        )}
      </div>
    )}
  </div>
</div>

{/* Regular New Remark Field with Keyboard */}
<div className="mb-4">
  <label className="block text-sm font-medium mb-1">New Remark</label>
  <div className="flex gap-2">
    <Input
      {...register("newRemark")}
      placeholder="Type a new preparation remark..."
      className="w-full max-w-150"
      value={watch("newRemark") || ""}
      onChange={(e) => setValue("newRemark", e.target.value)}
    />
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={showRemarkKeyboard ? "default" : "outline"}
        onClick={() => setShowRemarkKeyboard((prev) => !prev)}
      >
        {showRemarkKeyboard ? "Hide Keyboard" : "Show Keyboard"}
      </Button>
    </div>
  </div>

  {showRemarkKeyboard && (
    <div className="mt-2 bg-gray-50 p-4 rounded-lg">
      <OnScreenKeyboard
        value={watch("newRemark") || ""}
        setValue={(val) => setValue("newRemark", val)}
      />
    </div>
  )}
</div>


                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowRemarkKeyboard(false);
                        setShowQuantityKeyboard(true);
                        closeUpdateDialog();
                        reset();
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      OK
                    </Button>
                  </div>
                </form>
              </div>

              {/* Right side - Keyboards */}
              {showQuantityKeyboard && (
                <div className="w-full sm:w-[32rem] update-cart-keyboard-container flex-shrink-0">
                  <div className="bg-gray-50 p-4 rounded-lg update-cart-keyboard-box">
                    <Keyboard
                      value={String(quantityValue || "")}
                      setValue={(val) => {
                        const numVal = val === "" ? "" : String(val);
                        setValue("quantity", numVal, { shouldValidate: true });
                      }}
                      min={1}
                      max={999}
                      presets={[]}
                      className="w-full"
                      buttonClass="text-2xl py-5"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpdateCartDialog;
