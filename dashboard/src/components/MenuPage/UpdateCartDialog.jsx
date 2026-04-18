import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/stores/useCartStore";
import Keyboard from "../ui/Keyboard";
import OnScreenKeyboard from "../ui/OnScreenKeyboard";
import { useItemPreparationRemark } from "@/hooks";
import { addRemark, formatCurrency } from "@/lib/utils";

const UpdateCartDialog = () => {
  const updateCartItem = useCartStore((state) => state.updateCartItem);
  const selectedItem = useCartStore((state) => state.selectedCartItem);
  const isOpen = useCartStore((state) => state.isUpdateDialogOpen);
  const closeUpdateDialog = useCartStore((state) => state.closeUpdateDialog);

  const { prepRemarks: prepRemarkOptions, remarks: remarkOptions, setRemarks } =
    useItemPreparationRemark(selectedItem?.name);

  const [showRemarkSuggestions, setShowRemarkSuggestions] = useState(false);
  const [showRemarkKeyboard, setShowRemarkKeyboard] = useState(false);
  const [showQuantityKeyboard, setShowQuantityKeyboard] = useState(true);

  // Discount state
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountRule, setDiscountRule] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountMode, setDiscountMode] = useState(null); // null | "cash" | "percent"
  const [cashTotal, setCashTotal] = useState("");
  const [percentValue, setPercentValue] = useState("");
  const [cashError, setCashError] = useState("");
  const [showSupervisorDialog, setShowSupervisorDialog] = useState(false);
  const [supervisorPin, setSupervisorPin] = useState("");
  const [supervisorError, setSupervisorError] = useState("");
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const [discountApproved, setDiscountApproved] = useState(false);
  const [pendingDiscountMode, setPendingDiscountMode] = useState(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } =
    useForm({ defaultValues: { quantity: "", remark: "" } });

  const quantityValue = watch("quantity");
  const remarkValue = watch("remark");

  const originalUnitPrice = selectedItem?._originalPrice
    ?? selectedItem?.price
    ?? selectedItem?.standard_rate
    ?? 0;

  const currentQty = parseInt(quantityValue) || selectedItem?.quantity || 1;
  const originalTotal = originalUnitPrice * currentQty;

  // Reset on item change
  useEffect(() => {
    if (selectedItem) {
      reset({
        quantity: selectedItem.quantity ?? 1,
        remark: selectedItem.remark ?? "",
      });
      setDiscountMode(null);
      setCashTotal("");
      setPercentValue("");
      setDiscountRule(null);
      setCashError("");
      setDiscountApproved(false);
      setShowSupervisorDialog(false);
      setSupervisorPin("");
      setSupervisorError("");
    } else {
      reset({ quantity: "", remark: "" });
    }
  }, [selectedItem, reset]);

  // Load discount config from discount app
  useEffect(() => {
    if (!isOpen || !selectedItem?.name) return;
    setDiscountLoading(true);

    fetch("/api/method/discount.api.check_discount_enabled", {
      headers: { "X-Frappe-CSRF-Token": window.csrf_token || "fetch" },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.message?.enabled) {
          setDiscountEnabled(true);
          return fetch(
            `/api/method/discount.api.get_item_discount?item_code=${encodeURIComponent(selectedItem.name)}`,
            { headers: { "X-Frappe-CSRF-Token": window.csrf_token || "fetch" } }
          )
            .then((r) => r.json())
            .then((rd) => {
              setDiscountRule(rd.message || null);
              if (rd.message?.has_discount) {
                setPercentValue(String(rd.message.discount_value));
              }
            });
        } else {
          setDiscountEnabled(false);
        }
      })
      .catch(() => setDiscountEnabled(false))
      .finally(() => setDiscountLoading(false));
  }, [isOpen, selectedItem?.name]);

  // Computed values
  const pct = Math.min(parseFloat(percentValue) || 0, discountRule?.max_discount || 100);
  const percentUnitPrice = discountRule?.has_discount
    ? discountRule.discount_type === "Percentage"
      ? originalUnitPrice * (1 - pct / 100)
      : Math.max(0, originalUnitPrice - (parseFloat(percentValue) || 0))
    : originalUnitPrice;

  const percentTotal = percentUnitPrice * currentQty;
  const cashTotalNum = parseFloat(cashTotal) || 0;

  const finalUnitPrice = discountMode === "cash"
    ? (parseFloat(cashTotal) || originalUnitPrice)
    : discountMode === "percent"
    ? percentUnitPrice
    : originalUnitPrice;

  const finalTotal = discountMode === "cash"
    ? finalUnitPrice * currentQty
    : discountMode === "percent"
    ? percentTotal
    : originalTotal;

  const savedAmount = originalTotal - finalTotal;

  // Check if user needs supervisor approval before applying discount
  const requestDiscount = async (mode) => {
    const res = await fetch("/api/method/discount.api.check_user_discount_permission", {
      headers: { "X-Frappe-CSRF-Token": window.csrf_token || "fetch" },
    });
    const data = await res.json();
    const perm = data.message;

    if (!perm?.has_permission) {
      // User not allowed to add discount at all
      setSupervisorError("You do not have permission to apply discounts.");
      setShowSupervisorDialog(true);
      setPendingDiscountMode(mode);
      return;
    }

    if (perm?.requires_approval) {
      // Needs supervisor approval
      setSupervisorPin("");
      setSupervisorError("");
      setPendingDiscountMode(mode);
      setShowSupervisorDialog(true);
    } else {
      // No approval needed
      setDiscountApproved(true);
      setDiscountMode(mode);
    }
  };

  // Clear pin when supervisor dialog opens to prevent autofill
  useEffect(() => {
    if (showSupervisorDialog) {
      setSupervisorPin("");
      setSupervisorError("");
      setTimeout(() => setSupervisorPin(""), 100);
      setTimeout(() => setSupervisorPin(""), 300);
      setTimeout(() => setSupervisorPin(""), 500);
      setTimeout(() => setSupervisorPin(""), 800);
    }
  }, [showSupervisorDialog]);

  const handleSupervisorApprove = async () => {
    if (!supervisorPin) {
      setSupervisorError("Please enter the supervisor PIN.");
      return;
    }
    setSupervisorLoading(true);
    try {
      const res = await fetch("/api/method/discount.api.validate_supervisor_pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": window.csrf_token || "fetch",
        },
        body: JSON.stringify({ pin: supervisorPin }),
      });
      const data = await res.json();
      if (data.message?.valid) {
        setDiscountApproved(true);
        setDiscountMode(pendingDiscountMode);
        setShowSupervisorDialog(false);
        setSupervisorPin("");
        setSupervisorError("");
      } else {
        setSupervisorError(data.message?.message || "Invalid PIN. Please try again.");
      }
    } catch (err) {
      setSupervisorError("Error validating PIN. Please try again.");
    } finally {
      setSupervisorLoading(false);
    }
  };

  // Submit
  const handleConfirm = handleSubmit(async ({ quantity, remark, newRemark }) => {
    if (!selectedItem?.name) return;

    updateCartItem({
      ...selectedItem,
      price: finalUnitPrice,
      standard_rate: finalUnitPrice,
      quantity: Number(quantity) || 1,
      remark,
      _originalPrice: originalUnitPrice,
      _hasDiscount: discountMode !== null,
      _discountMode: discountMode,
    });

    // Log discount to discount app
    if (discountMode) {
      try {
        await fetch("/api/method/discount.api.save_discount_log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Frappe-CSRF-Token": window.csrf_token || "fetch",
          },
          body: JSON.stringify({
            item_code: selectedItem.name,
            item_name: selectedItem.item_name || selectedItem.name,
            quantity: Number(quantity) || 1,
            original_price: originalUnitPrice,
            final_price: finalUnitPrice,
            discount_mode: discountMode,
            discount_amount: savedAmount,
            cart_total: originalTotal,
            grand_total: finalTotal,
          }),
        });
      } catch (err) {
        console.warn("Could not save discount log:", err);
      }
    }

    if (newRemark?.trim()) {
      try {
        await addRemark(newRemark.trim());
        setRemarks((prev) =>
          prev.includes(newRemark.trim()) ? prev : [...prev, newRemark.trim()]
        );
        setValue("remark", newRemark.trim());
      } catch (err) {
        console.error("Failed to add remark:", err);
      }
    }

    setShowRemarkKeyboard(false);
    setShowQuantityKeyboard(true);
    closeUpdateDialog();
  });

  useEffect(() => {
    function handleEnter(e) {
      if (e.key === "Enter") {
        e.preventDefault();
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
        .update-cart-dialog-content {
          max-width: 80rem !important; width: 95% !important;
          max-height: 90vh !important; overflow-y: auto !important; overflow-x: hidden !important;
        }
        @media (min-width: 768px) { .update-cart-dialog-content { width: 85% !important; } }
        @media (min-width: 1024px) { .update-cart-dialog-content { width: 75% !important; } }
        @media (min-width: 1280px) { .update-cart-dialog-content { width: 65% !important; } }
        .update-cart-keyboard-box { background-color: #f9fafb !important; padding: 1rem !important; border-radius: 0.5rem !important; }
        .update-cart-keyboard-container { width: 100% !important; }
        @media (min-width: 640px) { .update-cart-keyboard-container { width: 32rem !important; min-width: 32rem !important; } }
        .update-cart-keyboard-box .grid button,
        .update-cart-keyboard-box button[type="button"] { font-size: 1.5rem !important; padding-top: 1.25rem !important; padding-bottom: 1.25rem !important; }
        .update-cart-dialog-content::-webkit-scrollbar { width: 8px; }
        .update-cart-dialog-content::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .update-cart-dialog-content::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
        .update-cart-dialog-content::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeUpdateDialog();
            setShowRemarkKeyboard(false);
            setShowQuantityKeyboard(true);
            setDiscountMode(null);
          }
        }}
      >
        <DialogContent className="p-4 rounded-xl bg-white shadow-lg w-full max-w-7xl update-cart-dialog-content">
          <div className="flex flex-col h-full">

            {/* Header - item name + quantity + original price */}
            <DialogHeader className="mb-3 flex-shrink-0">
              {selectedItem?.name && (
                <DialogTitle className="text-lg font-semibold">
                  {selectedItem.item_name || selectedItem.name}
                  <div className="flex gap-4 mt-1 text-sm font-normal text-gray-500">
                    <span>Qty: <b className="text-primary">{selectedItem.quantity || 1}</b></span>
                    <span>Unit Price: <b className="text-primary">{formatCurrency(originalUnitPrice)}</b></span>
                    <span>Total: <b className="text-primary">{formatCurrency(originalTotal)}</b></span>
                  </div>
                </DialogTitle>
              )}
            </DialogHeader>

            <div className="flex flex-col sm:flex-row gap-4 flex-1 min-h-0">
              {/* Left - Form */}
              <div className="flex-1 bg-gray-50 p-4 rounded-lg min-w-0 space-y-4">

                {/* Price display */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Price (per unit)
                    {discountMode === "cash" && <span className="ml-2 text-xs text-blue-600">— Cash Discount (editable total below)</span>}
                    {discountMode === "percent" && <span className="ml-2 text-xs text-green-600">— Percentage Discount Applied</span>}
                  </label>
                  <Input
                    type="number" step="0.01" min="0"
                    disabled
                    value={finalUnitPrice.toFixed(2)}
                    className={`w-full ${discountMode === "cash" ? "bg-blue-50 text-blue-700 font-bold" : discountMode === "percent" ? "bg-green-50 text-green-700 font-bold" : "bg-gray-100"}`}
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <Input
                    type="number" min="1"
                    {...register("quantity")}
                    className="w-full"
                    onFocus={(e) => { e.target.select(); setShowRemarkKeyboard(false); setShowQuantityKeyboard(true); }}
                    onClick={(e) => e.target.select()}
                  />
                </div>



                {/* ── Discount Section ── */}
                {discountEnabled && (
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-3 space-y-3">
                    <p className="text-sm font-bold text-gray-700">Apply Discount</p>

                    {discountLoading ? (
                      <p className="text-xs text-gray-400 animate-pulse">Checking discount rules...</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Amount Discount - only show when item has pricing rule */}
                          {discountRule?.has_discount && (
                            <button
                              type="button"
                              onClick={() => {
                                if (discountMode === "cash") {
                                  setDiscountMode(null);
                                  setCashTotal("");
                                } else {
                                  requestDiscount("cash");
                                  setCashTotal("");
                                }
                              }}
                              className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-colors ${
                                discountMode === "cash"
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-blue-600 border-blue-300 hover:border-blue-600"
                              }`}
                            >
                              $ Amount Discount
                              <span className="block text-xs font-normal">
                                {discountRule.rule_name} · max {discountRule.max_discount}%
                              </span>
                            </button>
                          )}

                          {/* Percentage Discount - only show if item has a pricing rule */}
                          {discountRule?.has_discount && (
                            <button
                              type="button"
                              onClick={() => {
                                if (discountMode === "percent") {
                                  setDiscountMode(null);
                                } else {
                                  requestDiscount("percent");
                                }
                              }}
                              className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-colors ${
                                discountMode === "percent"
                                  ? "bg-green-600 text-white border-green-600"
                                  : "bg-white text-green-600 border-green-300 hover:border-green-600"
                              }`}
                            >
                              Percentage Discount
                              <span className="block text-xs font-normal">
                                {discountRule.rule_name} · {discountRule.min_discount}%–{discountRule.max_discount}%
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Cash discount input - editable total */}
                        {discountMode === "cash" && (
                          <div className="space-y-2">
                            <label className="text-xs text-gray-600 font-medium">
                              New Price Per Unit
                            </label>
                            <Input
                              type="number" step="0.01" min="0"
                              max={originalUnitPrice}
                              value={cashTotal}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const minPrice = discountRule?.max_discount
                                  ? originalUnitPrice * (1 - discountRule.max_discount / 100)
                                  : 0;
                                setCashTotal(e.target.value);
                                if (e.target.value !== "" && val < minPrice) {
                                  setCashError(`Price too low. Min allowed: ${formatCurrency(minPrice)} (max ${discountRule.max_discount}% discount)`);
                                } else if (e.target.value !== "" && val > originalUnitPrice) {
                                  setCashError(`Price cannot exceed original price: ${formatCurrency(originalUnitPrice)}`);
                                } else {
                                  setCashError("");
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => e.target.select()}
                              placeholder={`Original: ${originalUnitPrice.toFixed(2)}`}
                              className={`w-full ${cashError ? "border-red-400 focus:ring-red-400" : "border-blue-300 focus:ring-blue-400"}`}
                              autoFocus
                            />
                            {discountRule?.max_discount > 0 && !cashError && (
                              <p className="text-xs text-gray-400">
                                Min allowed: {formatCurrency(originalUnitPrice * (1 - discountRule.max_discount / 100))}
                                {" · "}Max discount: {discountRule.max_discount}%
                              </p>
                            )}
                            {cashError && (
                              <p className="text-xs text-red-500 font-medium">{cashError}</p>
                            )}
                            {cashTotal !== "" && parseFloat(cashTotal) >= 0 && (
                              <p className="text-xs text-gray-400">
                                Unit: {formatCurrency(parseFloat(cashTotal) || 0)} · Original: {formatCurrency(originalUnitPrice)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* % discount input - only shown when rule exists */}
                        {discountMode === "percent" && discountRule?.has_discount && (
                          <div className="space-y-1">
                            <label className="text-xs text-gray-600 font-medium">
                              Discount % (range: {discountRule.min_discount}% – {discountRule.max_discount}%)
                            </label>
                            <Input
                              type="number" step="0.1"
                              min={discountRule.min_discount}
                              max={discountRule.max_discount}
                              value={percentValue}
                              onChange={(e) => setPercentValue(e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onClick={(e) => e.target.select()}
                              className="w-full border-green-300 focus:ring-green-400"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Rule: {discountRule.rule_name}</span>
                              {discountRule.description && <span className="italic">{discountRule.description}</span>}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Preparation Remark */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">Preparation Remark</label>
                  <div className="relative">
                    <Input
                      {...register("remark")}
                      value={remarkValue || ""}
                      onChange={(e) => setValue("remark", e.target.value)}
                      onFocus={() => setShowRemarkSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowRemarkSuggestions(false), 150)}
                      placeholder="Select or type a preparation remark..."
                      className="w-full pr-10"
                    />
                    <button type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                      onMouseDown={(e) => { e.preventDefault(); setShowRemarkSuggestions(true); setRemarks([...prepRemarkOptions]); }}>
                      ▼
                    </button>
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
                <div>
                  <label className="block text-sm font-medium mb-1">New Remark</label>
                  <div className="flex gap-2">
                    <Input {...register("newRemark")} placeholder="Type a new preparation remark..."
                      className="w-full" value={watch("newRemark") || ""}
                      onChange={(e) => setValue("newRemark", e.target.value)} />
                    <Button type="button" variant={showRemarkKeyboard ? "default" : "outline"}
                      onClick={() => setShowRemarkKeyboard((prev) => !prev)}>
                      {showRemarkKeyboard ? "Hide" : "Keyboard"}
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
                    closeUpdateDialog(); reset();
                  }} className="flex-1">Cancel</Button>
                  <Button type="submit" onClick={handleConfirm} disabled={isSubmitting || !!cashError} className="flex-1">OK</Button>
                </div>

              </div>

              {/* Right - Keyboard */}
              {showQuantityKeyboard && (
                <div className="w-full sm:w-[32rem] update-cart-keyboard-container flex-shrink-0">
                  <div className="bg-gray-50 p-4 rounded-lg update-cart-keyboard-box">
                    <Keyboard
                      value={String(quantityValue || "")}
                      setValue={(val) => setValue("quantity", val === "" ? "" : String(val), { shouldValidate: true })}
                      min={1} max={999} presets={[]} className="w-full" buttonClass="text-2xl py-5"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Supervisor Approval Dialog - inside DialogContent */}
          {showSupervisorDialog && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                <div className="bg-primary px-6 py-4">
                  <h2 className="text-lg font-bold text-white">Supervisor Approval Required</h2>
                  <p className="text-xs text-white/70 mt-0.5">Discount requires supervisor authorization</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    {/* Prevent browser autofill */}
                    <input type="text" style={{display:"none"}} />
                    <input type="password" style={{display:"none"}} />
                    <label className="block text-sm font-medium mb-1">Supervisor PIN</label>
                    <input
                      type="password"
                      value={supervisorPin}
                      onChange={(e) => { setSupervisorPin(e.target.value); setSupervisorError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (!supervisorLoading && supervisorPin) handleSupervisorApprove(); } }}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.target.select()}
                      placeholder="Enter PIN"
                      autoComplete="off"
                      autoCorrect="off"
                      autoSave="off"
                      data-lpignore="true"
                      data-form-type="other"
                      name="supervisor-pin-field"
                      className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg font-bold tracking-widest focus:outline-none focus:border-primary"
                      autoFocus />
                  </div>
                  {supervisorError && (
                    <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 text-center">{supervisorError}</p>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => { setShowSupervisorDialog(false); setSupervisorPin(""); setSupervisorError(""); setPendingDiscountMode(null); }}
                      className="flex-1 h-11 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:border-gray-400 transition-colors">Cancel</button>
                    <button onClick={handleSupervisorApprove} disabled={supervisorLoading || !supervisorPin}
                      className="flex-[2] h-11 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors disabled:opacity-40">
                      {supervisorLoading ? "Verifying..." : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpdateCartDialog;
