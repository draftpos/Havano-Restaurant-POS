import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/useCartStore";
import Keyboard from "../ui/Keyboard";
import OnScreenKeyboard from "../ui/OnScreenKeyboard";
import { useItemPreparationRemark } from "@/hooks";
import { addRemark } from "@/lib/utils";

const UpdateCartDialog = () => {
  const updateCartItem = useCartStore((state) => state.updateCartItem);
  const selectedItem = useCartStore((state) => state.selectedCartItem);
  const isOpen = useCartStore((state) => state.isUpdateDialogOpen);
  const closeUpdateDialog = useCartStore((state) => state.closeUpdateDialog);
  const { prepRemarks: prepRemarkOptions, remarks: remarkOptions, setRemarks } = useItemPreparationRemark(selectedItem?.name);
  const [showRemarkSuggestions, setShowRemarkSuggestions] = useState(false);
  const [showRemarkKeyboard, setShowRemarkKeyboard] = useState(false);
  const [showQuantityKeyboard, setShowQuantityKeyboard] = useState(true);
  const [discountChecked, setDiscountChecked] = useState(false);
  const [discountPct, setDiscountPct] = useState(0);
  const [priceDisabled, setPriceDisabled] = useState(true);
  const [allowDiscount, setAllowDiscount] = useState(true);
  const [outOfRange, setOutOfRange] = useState(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm({
    defaultValues: { price: "", quantity: "", remark: "" },
  });

  const quantityValue = watch("quantity");
  const remarkValue = watch("remark");

  useEffect(() => {
    if (selectedItem) {
      reset({ price: selectedItem.price ?? "", quantity: "", remark: selectedItem.remark ?? "" });
      fetch("/api/method/havano_restaurant_pos.api.get_ha_pos_settings", { credentials: "include" })
        .then(r => r.json()).then(d => { setAllowDiscount(d?.message?.data?.allow_discount === 1); }).catch(() => {});
      setDiscountChecked(false);
      setDiscountPct(0);
      setPriceDisabled(true);
    } else {
      reset({ price: "", quantity: "", remark: "" });
    }
  }, [selectedItem, reset]);

  const handleDiscountToggle = async (checked) => {
    setDiscountChecked(checked);
    if (checked && selectedItem?.name) {
      try {
        const qty = watch("quantity") || selectedItem?.quantity || 1;
        const itemCode = selectedItem.item_code || selectedItem.name;
        const res = await fetch(
          `/api/method/havano_restaurant_pos.api.get_pricing_rule_for_item?item_code=${encodeURIComponent(itemCode)}&qty=${qty}`,
          { credentials: "include" }
        );
        const data = await res.json();
        const result = data?.message;
        if (result?.success) {
          const pct = result.discount_percentage;
          setDiscountPct(pct);
          setOutOfRange(null);
          const originalPrice = selectedItem.standard_rate ?? selectedItem.price ?? 0;
          setValue("price", parseFloat((originalPrice - (originalPrice * pct / 100)).toFixed(2)));
        } else if (result?.out_of_range) {
          setDiscountPct(0);
          setOutOfRange({ min: result.min_qty, max: result.max_qty });
          setValue("price", selectedItem?.standard_rate ?? selectedItem?.price ?? "");
        } else {
          setDiscountPct(0);
          setOutOfRange(null);
          setValue("price", selectedItem?.standard_rate ?? selectedItem?.price ?? "");
        }
      } catch (err) {
        console.error("Failed to fetch pricing rules:", err);
      }
      setPriceDisabled(false);
    } else {
      setValue("price", selectedItem?.price ?? selectedItem?.standard_rate ?? "");
      setPriceDisabled(true);
      setDiscountPct(0);
      setOutOfRange(null);
    }
  };

  // Re-check pricing rule when quantity changes while discount is checked
  useEffect(() => {
    if (discountChecked && selectedItem?.name) {
      handleDiscountToggle(true);
    }
  }, [quantityValue]);

  const handleConfirm = handleSubmit(async ({ price, quantity, remark, newRemark }) => {
    if (!selectedItem?.name) return;
    updateCartItem({ ...selectedItem, price: Number(price), quantity: Number(quantity), remark });
    if (newRemark?.trim()) {
      try {
        await addRemark(newRemark.trim());
        setRemarks((prev) => prev.includes(newRemark.trim()) ? prev : [...prev, newRemark.trim()]);
        setValue("remark", newRemark.trim());
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
    return () => document.removeEventListener("keydown", handleEnter);
  });

  return (
    <>
      <style>{`
        .update-cart-dialog-content { max-width: 80rem !important; width: 95% !important; max-height: 90vh !important; overflow-y: auto !important; overflow-x: hidden !important; }
        @media (min-width: 768px) { .update-cart-dialog-content { width: 85% !important; } }
        @media (min-width: 1024px) { .update-cart-dialog-content { width: 75% !important; } }
        @media (min-width: 1280px) { .update-cart-dialog-content { width: 65% !important; } }
        .update-cart-keyboard-box { background-color: #f9fafb !important; padding: 1rem !important; border-radius: 0.5rem !important; }
        .update-cart-keyboard-container { width: 100% !important; }
        @media (min-width: 640px) { .update-cart-keyboard-container { width: 32rem !important; min-width: 32rem !important; } }
        .update-cart-keyboard-box .grid button, .update-cart-keyboard-box button[type="button"] { font-size: 1.5rem !important; padding-top: 1.25rem !important; padding-bottom: 1.25rem !important; }
        .update-cart-dialog-content::-webkit-scrollbar { width: 8px; }
        .update-cart-dialog-content::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .update-cart-dialog-content::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
        .update-cart-dialog-content::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          closeUpdateDialog();
          setShowRemarkKeyboard(false);
          setShowQuantityKeyboard(true);
          setDiscountChecked(false);
          setPriceDisabled(true);
          setDiscountPct(0);
        }
      }}>
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
              <div className="flex-1 bg-gray-50 p-4 rounded-lg min-w-0">
                <form onSubmit={handleConfirm} className="space-y-4">

                  {/* Price and Quantity side by side */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Price</label>
                      <Input disabled={priceDisabled} type="number" step="0.01" min="0" {...register("price")} className="w-full" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Quantity</label>
                      <Input type="number" min="1" {...register("quantity")} className="w-full"
                        onFocus={() => { setShowRemarkKeyboard(false); setShowQuantityKeyboard(true); }} />
                    </div>
                  </div>

                  {/* Discount Checkbox */}
                  <div className="flex items-center gap-3 py-2 px-3 bg-white rounded-lg border">
                    <input type="checkbox" id="discount-checkbox" checked={discountChecked} disabled={!allowDiscount}
                      onChange={(e) => handleDiscountToggle(e.target.checked)}
                      className={`w-4 h-4 accent-slate-900 ${!allowDiscount ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`} />
                    <label htmlFor="discount-checkbox" className={`text-sm font-medium select-none flex-1 ${!allowDiscount ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                      Apply Discount
                    </label>
                    {discountChecked && discountPct > 0 && (
                      <span className="text-green-600 font-semibold text-sm">{discountPct}% off</span>
                    )}
                    {discountChecked && discountPct === 0 && outOfRange && (
                      <span className="text-orange-500 text-sm">Qty must be {outOfRange.min}–{outOfRange.max}</span>
                    )}
                    {discountChecked && discountPct === 0 && !outOfRange && (
                      <span className="text-red-500 text-sm">No active rule found</span>
                    )}
                  </div>

                  {/* Preparation Remark */}
                  <div className="relative mb-4">
                    <label className="block text-sm font-medium mb-1">Preparation Remark</label>
                    <div className="relative">
                      <Input {...register("remark")} value={remarkValue || ""}
                        onChange={(e) => setValue("remark", e.target.value)}
                        onFocus={() => setShowRemarkSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowRemarkSuggestions(false), 150)}
                        placeholder="Select or type a preparation remark..." className="w-full pr-10" />
                      <button type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                        onMouseDown={(e) => { e.preventDefault(); setShowRemarkSuggestions(true); setRemarks([...prepRemarkOptions]); }}>▼</button>
                      {showRemarkSuggestions && Array.isArray(remarkOptions) && remarkOptions.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {remarkOptions.map((item) => (
                            <button key={item} type="button"
                              onMouseDown={() => { setValue("remark", item, { shouldDirty: true }); setShowRemarkSuggestions(false); }}
                              className="block w-full text-left px-3 py-2 hover:bg-gray-100">{item}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* New Remark */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">New Remark</label>
                    <div className="flex gap-2">
                      <Input {...register("newRemark")} placeholder="Type a new preparation remark..."
                        className="w-full" value={watch("newRemark") || ""}
                        onChange={(e) => setValue("newRemark", e.target.value)} />
                      <Button type="button" variant={showRemarkKeyboard ? "default" : "outline"}
                        onClick={() => setShowRemarkKeyboard((prev) => !prev)}>
                        {showRemarkKeyboard ? "Hide Keyboard" : "Show Keyboard"}
                      </Button>
                    </div>
                    {showRemarkKeyboard && (
                      <div className="mt-2 bg-gray-50 p-4 rounded-lg">
                        <OnScreenKeyboard value={watch("newRemark") || ""} setValue={(val) => setValue("newRemark", val)} />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => {
                      setShowRemarkKeyboard(false); setShowQuantityKeyboard(true);
                      setDiscountChecked(false); setPriceDisabled(true); setDiscountPct(0);
                      closeUpdateDialog(); reset();
                    }} className="flex-1">Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-1">OK</Button>
                  </div>
                </form>
              </div>

              {/* Keyboard */}
              {showQuantityKeyboard && (
                <div className="w-full sm:w-[32rem] update-cart-keyboard-container flex-shrink-0">
                  <div className="bg-gray-50 p-4 rounded-lg update-cart-keyboard-box">
                    <Keyboard value={String(quantityValue || "")}
                      setValue={(val) => setValue("quantity", val === "" ? "" : String(val), { shouldValidate: true })}
                      min={1} max={999} presets={[]} className="w-full" buttonClass="text-2xl py-5" />
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