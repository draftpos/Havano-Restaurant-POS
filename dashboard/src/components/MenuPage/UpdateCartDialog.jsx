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

import { useState } from "react";
const UpdateCartDialog = () => {
  const updateCartItem = useCartStore((state) => state.updateCartItem);
  const selectedItem = useCartStore((state) => state.selectedCartItem);
  const isOpen = useCartStore((state) => state.isUpdateDialogOpen);
  const closeUpdateDialog = useCartStore((state) => state.closeUpdateDialog);

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
    },
  });

  const quantityValue = watch("quantity");
  const remarkValue = watch("remark");

  // Populate form when item changes
  useEffect(() => {
    if (selectedItem) {
      reset({
        price: selectedItem.price ?? "",
        quantity: "", // Always start with empty quantity so users can type their desired value
        remark: selectedItem.remark ?? "",
      });
    } else {
      reset({ price: "", quantity: "", remark: "" });
    }
  }, [selectedItem, reset]);

  const handleConfirm = handleSubmit(({ price, quantity, remark }) => {
    if (!selectedItem?.name) return;
    updateCartItem({
      ...selectedItem,
      price: Number(price),
      quantity: Number(quantity),
      remark,
    });
    setShowRemarkKeyboard(false);
    setShowQuantityKeyboard(true);
    closeUpdateDialog();
  });

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
        <DialogContent 
          className="p-4 rounded-xl bg-white shadow-lg w-full max-w-7xl update-cart-dialog-content"
        >
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
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <Input disabled type="number" step="0.01" min="0" {...register("price")} className="w-full" />
                </div>
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Preparation Remark</label>
                  <div className="flex gap-2 mb-2">
                    <Textarea
                      {...register("remark")}
                      value={remarkValue || ""}
                      onChange={(e) => setValue("remark", e.target.value)}
                      placeholder="Add a preparation remark..."
                      rows={4}
                      className="w-full flex-1"
                    />
                    <Button
                      type="button"
                      variant={showRemarkKeyboard ? "default" : "outline"}
                      onClick={() => {
                        const newState = !showRemarkKeyboard;
                        setShowRemarkKeyboard(newState);
                        setShowQuantityKeyboard(!newState);
                      }}
                      className="whitespace-nowrap"
                    >
                      {showRemarkKeyboard ? "Hide Keyboard" : "Show Keyboard"}
                    </Button>
                  </div>
                  {showRemarkKeyboard && (
                    <div className="mt-2 bg-gray-50 p-4 rounded-lg">
                      <OnScreenKeyboard
                        value={remarkValue || ""}
                        setValue={val => setValue("remark", val)}
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
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
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
                    setValue={val => {
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
