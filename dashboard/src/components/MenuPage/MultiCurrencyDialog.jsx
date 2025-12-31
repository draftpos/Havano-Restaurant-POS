import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Keyboard from "@/components/ui/Keyboard";
import { cn, formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useForm, useWatch } from "react-hook-form";
import { DevTool } from "@hookform/devtools";
import { useCurrencyExchange, useMultiCurrencyPayment } from "@/hooks";
import { toast, Toaster } from "sonner";
import { useCartStore } from "@/stores/useCartStore";

export default function MultiCurrencyDialog({
  open,
  onOpenChange,
  total,
  setPaymentDialogOpenState,
}) {
  const BASE_TOTAL = total || 0;
  const { exchangeRates } = useCurrencyExchange();

  const [ratesAtOpen, setRatesAtOpen] = useState(null);
  const [activeCurrency, setActiveCurrency] = useState(null);
  const { submitPayment, loading, error, success } = useMultiCurrencyPayment();
  const clearCart = useCartStore((state) => state.clearCart);

  const { register, watch, setValue, reset, setFocus, control, handleSubmit } =
    useForm({
      defaultValues: {
        payments: {},
      },
    });

  useEffect(() => {
    if (error) toast.error(error);
    if (success) toast.success("Payment successful");
  }, [error, success]);

  useEffect(() => {
    if (open && exchangeRates) {
      setRatesAtOpen(exchangeRates);

      reset({
        payments: Object.keys(exchangeRates).reduce((acc, currency) => {
          acc[currency] = "";
          return acc;
        }, {}),
      });
    }
  }, [open, exchangeRates, reset]);

  const payments =
    useWatch({
      control,
      name: "payments",
    }) || {};

  const currencies = ratesAtOpen ? Object.keys(ratesAtOpen) : [];

  const getBaseValue = (paid, currency) => {
    if (!ratesAtOpen) return 0;

    const amount = Number(paid);
    if (isNaN(amount) || amount === 0) return 0;

    return amount / ratesAtOpen[currency];
  };

  const totalPaidInBase = currencies.reduce((sum, currency) => {
    const paid = Number(payments[currency] || 0);
    return sum + getBaseValue(paid, currency);
  }, 0);

  const remainingBase = Math.max(BASE_TOTAL - totalPaidInBase, 0);
  const changeBase = Math.max(totalPaidInBase - BASE_TOTAL, 0);
  const isPaid = totalPaidInBase >= BASE_TOTAL;

  const getAmountDue = (currency) => {
    if (!ratesAtOpen) return 0;
    return remainingBase * ratesAtOpen[currency];
  };
  return (
    <>
      <style>{`
        .payment-dialog-content {
          max-width: 80rem !important;
          width: 95% !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
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
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <form>
          <DialogContent className="p-4 rounded-xl bg-white shadow-lg max-w-[80rem] min-w-[80%] max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col h-full">
              <DialogHeader className="mb-3">
                <DialogTitle className="text-lg font-semibold">
                  Make Payment
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Multi-currency payment dialog
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* LEFT PANEL */}
                <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div className="flex justify-between align-center gap-4">
                      <div className="flex-1 bg-card border-1 rounded-lg p-2">
                        <p className="text-gray-500 font-bold text-sm">
                          GRAND TOTAL (BASE)
                        </p>
                        <h2 className="text-2xl font-bold">
                          {formatCurrency(BASE_TOTAL)}
                        </h2>
                        <p className="text-gray-500 text-xs">Total Items: 8</p>
                      </div>
                      <div
                        className={cn(
                          "flex-1 border-1 rounded-lg p-2",
                          isPaid
                            ? "bg-green-100 border-green-600"
                            : "border-red-600 bg-red-100"
                        )}
                      >
                        <p
                          className={cn(
                            "font-bold text-sm",
                            isPaid ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {isPaid ? "RETURN" : "BALANCE DUE"}
                        </p>
                        <h2
                          className={cn(
                            "text-2xl font-bold",
                            isPaid ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {isPaid
                            ? formatCurrency(changeBase)
                            : formatCurrency(remainingBase)}
                        </h2>
                        <p
                          className={cn(
                            "text-xs",
                            isPaid ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {isPaid
                            ? "Amount to return to customer"
                            : "Amount still owed by customer"}
                        </p>
                      </div>
                    </div>

                    <>
                      <label className="block text-sm font-medium">
                        Currency Payment Breakdown
                      </label>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>CURRENCY</TableHead>
                            <TableHead>RATE</TableHead>
                            <TableHead>AMOUNT DUE</TableHead>
                            <TableHead>PAID (INPUT)</TableHead>
                            <TableHead>BASE VAL</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currencies.map((currency) => {
                            const paid = Number(payments[currency] || 0);
                            const rate = ratesAtOpen[currency];

                            return (
                              <TableRow key={currency}>
                                <TableCell>{currency}</TableCell>
                                <TableCell>{rate.toFixed(4)}</TableCell>

                                <TableCell>
                                  {getAmountDue(currency).toFixed(4)}
                                </TableCell>

                                <TableCell>
                                  <Input
                                    {...register(`payments.${currency}`)}
                                    onFocus={() => setActiveCurrency(currency)}
                                  />
                                </TableCell>

                                <TableCell>
                                  {getBaseValue(paid, currency).toFixed(4)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </>
                  </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="payment-keyboard-container flex-shrink-0">
                  <div className="payment-keyboard-box">
                    <Keyboard
                      value={payments[activeCurrency]}
                      setValue={(val) => {
                        setValue(`payments.${activeCurrency}`, val, {
                          shouldDirty: true,
                          shouldTouch: true,
                        });
                      }}
                    />

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => onOpenChange && onOpenChange(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        type="submit"
                        disabled={loading || !isPaid}
                        onClick={handleSubmit(async (data) => {
                          try {
                            await submitPayment({
                              payments: data.payments,
                            });

                            onOpenChange(false);
                            setPaymentDialogOpenState(false);
                            clearCart();
                          } catch (err) {
                            // prevent uncaught promise rejection
                            console.error("Error submitting payment:", err);
                          }
                        })}
                      >
                        {loading ? "Processing..." : "Make Payment"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </form>
        <Toaster
          richColors
          duration={4000}
          position="top-center"
          style={{ zIndex: 9999 }}
        />
      </Dialog>
      {/* <DevTool control={control} /> */}
    </>
  );
}
