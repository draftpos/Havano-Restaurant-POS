import { useState, useEffect, useMemo } from "react";
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
import { cn, formatCurrency, fetchUserShiftPayments, updateUserShiftPayments } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useForm, useWatch } from "react-hook-form";
import { DevTool } from "@hookform/devtools";
import { useCurrencyExchange, useMultiCurrencyPayment } from "@/hooks";
import { toast, Toaster } from "sonner";
import { useCartStore } from "@/stores/useCartStore";
import { db, call } from "@/lib/frappeClient";
import { useNavigate } from "react-router-dom";


export default function MultiCurrencyDialog({
  open,
  onOpenChange,
  total,
  setPaymentDialogOpenState,
  cartItems = [],
  orderPayload = null,
}) {
  const BASE_TOTAL = total || 0;
  const { exchangeRates: defaultExchangeRates } = useCurrencyExchange();

  const [ratesAtOpen, setRatesAtOpen] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]); // Store payment methods with mode info
  const [activeCurrency, setActiveCurrency] = useState(null);
  const { submitPayment, loading, error, success } = useMultiCurrencyPayment();
  const clearCart = useCartStore((state) => state.clearCart);
  const [loadingRates, setLoadingRates] = useState(true);
  
  // Get cart items from store if not provided as prop
  const cartStoreItems = useCartStore((state) => state.cart || []);
  const navigate = useNavigate();
  // Format cart items to ensure they have the right structure
  const itemsToUse = useMemo(() => {
    const items = cartItems && cartItems.length > 0 ? cartItems : cartStoreItems;
    if (!items || items.length === 0) {
      return [];
    }
    // Ensure items are in the correct format for the API
    const formattedItems = items.map(item => ({
      name: item.name || item.item_code || item.item_name,
      item_code: item.item_code || item.name || item.item_name,
      item_name: item.item_name || item.name,
      quantity: item.quantity || item.qty || 1,
      qty: item.qty || item.quantity || 1,
      price: item.price || item.rate || item.standard_rate || 0,
      rate: item.rate || item.price || item.standard_rate || 0,
    }));
    // console.log("MultiCurrencyDialog: Formatted cart items", formattedItems);
    return formattedItems;
  }, [cartItems, cartStoreItems]);

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
  const [expectedPayments, setExpectedPayments] = useState({});
  useEffect(() => {
    if (!open) return;

    const loadShiftPayments = async () => {
      try {
        const shiftPayments = await fetchUserShiftPayments();
        setExpectedPayments(shiftPayments); // ✅ THIS WAS THE BUG
        // console.log("Fetched user shift payments:", shiftPayments);
      } catch (err) {
        // console.error("Error fetching user shift payments:", err);
        setExpectedPayments({});
      }
    };

    loadShiftPayments();
  }, [open]);


  // Fetch exchange rates from selected payment methods
  useEffect(() => {
    const fetchPaymentMethodRates = async () => {
      if (!open) return;
      
      setLoadingRates(true);
      try {
        // Get default currency from Global Defaults
        const { message: defaultCurrency } = await db.getSingleValue("Global Defaults", "default_currency");
        const systemCurrency = defaultCurrency || "USD";

        // Get HA POS Settings document (Single doctype)
        const settingsResponse = await call.get("havano_restaurant_pos.api.get_ha_pos_settings");
        const doc = settingsResponse?.message?.data;
        
        // Get all selected payment methods (show all regardless of currency)
        const selectedMethods = doc?.selected_payment_methods || [];
        
        // Build payment methods list with mode, currency, and exchange rate
        const methodsList = [];
        const rates = {};
        const addedKeys = new Set(); // Track added keys to avoid duplicates
        
        // Always add Cash with default currency first
        const cashKey = `Cash_${systemCurrency}`;
        methodsList.push({
          key: cashKey,
          mode: "Cash",
          currency: systemCurrency,
          exchangeRate: 1.0,
          currencySymbol: systemCurrency
        });
        rates[cashKey] = 1.0;
        addedKeys.add(cashKey);
  
        // Process each selected payment method
        selectedMethods.forEach((method) => {
          if (method.mode_of_payment && method.currency && method.exchange_rate) {
            const currency = method.currency;
            const exchangeRate = parseFloat(method.exchange_rate) || 1.0;
            
            // Use mode_of_payment + currency as unique key
            const key = `${method.mode_of_payment}_${currency}`;
            
            // Only add if not already added (avoid duplicates)
            if (!addedKeys.has(key)) {
              methodsList.push({
                key: key,
                mode: method.mode_of_payment,
                currency: currency,
                exchangeRate: exchangeRate,
                currencySymbol: method.currency_symbol || currency
              });
              
              rates[key] = exchangeRate;
              addedKeys.add(key);
            }
          }
        });
        // If no other payment methods found, add default exchange rates
        if (methodsList.length === 1 && defaultExchangeRates && Object.keys(defaultExchangeRates).length > 0) {
          Object.keys(defaultExchangeRates).forEach(currency => {
            // Skip if it's the default currency (already added as Cash)
            if (currency === systemCurrency) return;
            
            const key = `Cash_${currency}`;
            if (!addedKeys.has(key)) {
              methodsList.push({
                key: key,
                mode: "Cash",
                currency: currency,
                exchangeRate: defaultExchangeRates[currency],
                currencySymbol: currency
              });
              rates[key] = defaultExchangeRates[currency];
              addedKeys.add(key);
            }
          });
        }

        setPaymentMethods(methodsList);
        setRatesAtOpen(rates);

        reset({
          payments: methodsList.reduce((acc, method) => {
            acc[method.key] = "";
            return acc;
          }, {}),
        });

        // Set first payment method as active
        const firstMethod = methodsList[0];
        if (firstMethod) {
          setActiveCurrency(firstMethod.key);
        }
      } catch (error) {
        // console.error("Error fetching payment method rates:", error);
        // Fall back to default exchange rates
        if (defaultExchangeRates && Object.keys(defaultExchangeRates).length > 0) {
          const fallbackMethods = Object.keys(defaultExchangeRates).map(currency => ({
            key: `Cash_${currency}`,
            mode: "Cash",
            currency: currency,
            exchangeRate: defaultExchangeRates[currency],
            currencySymbol: currency
          }));
          const fallbackRates = {};
          fallbackMethods.forEach(method => {
            fallbackRates[method.key] = method.exchangeRate;
          });
          
          setPaymentMethods(fallbackMethods);
          setRatesAtOpen(fallbackRates);
          reset({
            payments: fallbackMethods.reduce((acc, method) => {
              acc[method.key] = "";
              return acc;
            }, {}),
          });
          
          if (fallbackMethods[0]) {
            setActiveCurrency(fallbackMethods[0].key);
          }
        }
      } finally {
        setLoadingRates(false);
      }
    };

    fetchPaymentMethodRates();
  }, [open, defaultExchangeRates, reset]);

  const payments =
    useWatch({
      control,
      name: "payments",
    }) || {};

const getVariance = (paid, key) => {
  const expected = Number(expectedPayments?.[key] || 0);
  const submitted = Number(paid || 0);
  return submitted - expected;
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
                  Close Shift
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Multi-currency payment dialog
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* LEFT PANEL */}
                <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-4">
                    
                    <>
                      <label className="block text-sm font-medium">
                        Currency Payment Breakdown
                      </label>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>MODE</TableHead>
                            <TableHead>CURRENCY</TableHead>
                            <TableHead>EXPECTED</TableHead>
                            <TableHead>SUBMITTED</TableHead>
                            <TableHead>VARIANCE</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentMethods.map((method) => {
                            const paid = Number(payments[method.key] || 0);
                            const rate = ratesAtOpen[method.key];

                            return (
                              <TableRow key={method.key}>
                                <TableCell className="font-medium">{method.mode}</TableCell>
                                <TableCell>{method.currency}</TableCell>
                                <TableCell>
                                {(expectedPayments[method.key] || 0).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    {...register(`payments.${method.key}`)}
                                    onFocus={() => setActiveCurrency(method.key)}
                                    disabled={loadingRates}
                                  />
                                </TableCell>
                               <TableCell>
                              {getVariance(paid, method.key).toFixed(4)}
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
                      value={payments[activeCurrency] || ""}
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
                        onClick={handleSubmit(async () => {
                          const tableData = paymentMethods.map((method) => {
                            const submitted = Number(payments[method.key] || 0);
                            const expected = Number(expectedPayments?.[method.key] || 0);
                            const variance = submitted - expected;

                            return {
                              mode: method.mode,
                              currency: method.currency,
                              expected: expected.toFixed(2),
                              submitted: submitted.toFixed(2),
                              variance: variance.toFixed(2),
                            };
                          });

                          // console.log("=== Modal Payment Table Data ===");
                          // console.table(tableData);
                          // Call the wrapper function
                          try {
                            await updateUserShiftPayments(tableData);
                            toast.success("Shift payments updated successfully!");
                            onOpenChange(false)
                          } catch (err) {
                            // console.error("Error updating shift payments:", err);
                            toast.error("Failed to update shift payments!");
                          }
                         window.location.href = "/dashboard";
                        })}
                      >
                        Close Shift
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
