import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTransactionCreationStore } from "@/stores/useTransactionCreationStore";
import Keyboard from "../ui/Keyboard";
import OnScreenKeyboard from "../ui/OnScreenKeyboard";

const UpdateCartDialog = () => {
  const updateCartItem = useTransactionCreationStore((state) => state.updateCartItem);
  const selectedItem = useTransactionCreationStore((state) => state.selectedCartItem);
  const isOpen = useTransactionCreationStore((state) => state.isUpdateDialogOpen);
  const closeUpdateDialog = useTransactionCreationStore((state) => state.closeUpdateDialog);

  const [showRemarkKeyboard, setShowRemarkKeyboard] = useState(false);
  const [showQuantityKeyboard, setShowQuantityKeyboard] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
  } = useForm();

  useEffect(() => {
    if (selectedItem) {
      reset({
        quantity: selectedItem.quantity || 1,
        remark: selectedItem.remark || "",
      });
      setShowQuantityKeyboard(true);
      setShowRemarkKeyboard(false);
    }
  }, [selectedItem, reset]);

  const onSubmit = (data) => {
    if (selectedItem) {
      updateCartItem({
        ...selectedItem,
        quantity: parseInt(data.quantity) || 1,
        remark: data.remark || "",
      });
    }
    closeUpdateDialog();
  };

  const handleOpenChange = (open) => {
    if (!open) {
      closeUpdateDialog();
      setShowRemarkKeyboard(false);
      setShowQuantityKeyboard(false);
    }
  };

  const quantityValue = watch("quantity");

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
        .update-cart-keyboard-box .grid button,
        .update-cart-keyboard-box button[type="button"] {
          font-size: 1.5rem !important;
          padding-top: 1.25rem !important;
          padding-bottom: 1.25rem !important;
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="p-4 rounded-xl bg-white shadow-lg w-full max-w-7xl update-cart-dialog-content">
          <DialogHeader>
            <DialogTitle>Update Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
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
              <div>
                <label className="block text-sm font-medium mb-2">Preparation Remark</label>
                <div className="flex gap-2">
                  <Textarea
                    {...register("remark")}
                    className="flex-1"
                    rows={3}
                    placeholder="Add preparation remarks..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newState = !showRemarkKeyboard;
                      setShowRemarkKeyboard(newState);
                      setShowQuantityKeyboard(!newState);
                    }}
                  >
                    {showRemarkKeyboard ? "Hide Keyboard" : "Show Keyboard"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Update</Button>
                <Button type="button" variant="outline" onClick={closeUpdateDialog} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
            <div className="w-full sm:w-[32rem] flex-shrink-0">
              <div className="bg-gray-50 p-4 rounded-lg update-cart-keyboard-box">
                {showQuantityKeyboard && (
                  <Keyboard
                    value={String(quantityValue || 1)}
                    setValue={(v) => setValue("quantity", v)}
                    className="w-full"
                    buttonClass="text-2xl py-5"
                  />
                )}
                {showRemarkKeyboard && (
                  <OnScreenKeyboard
                    value={watch("remark") || ""}
                    setValue={(v) => setValue("remark", v)}
                    className="w-full"
                  />
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpdateCartDialog;

