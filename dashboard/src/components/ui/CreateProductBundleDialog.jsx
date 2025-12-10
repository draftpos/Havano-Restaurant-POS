import { useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Input } from "./input";
import { Label } from "./label";
import { useCreateProductBundle } from "@/hooks";
import { useMenuStore } from "@/stores/useMenuStore";
import { toast } from "sonner";
import SelectableQuantityTable from "@/components/MenuPage/SelectTable";

export function CreateProductBundleDialog({ open, onOpenChange, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [tableRows, setTableRows] = useState([
    { id: "1", selectedOption: "", quantity: 0 },
  ]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      new_item: "",
      price: "",
      bundle_items: {},
    },
  });

  const { menuItems, fetchMenuItems } = useMenuStore();

  const {
    createBundle,
    loading: bundleLoading,
    error: bundleError,
  } = useCreateProductBundle();

  const productOptions = menuItems.map((item) => ({
    id: item.name, // Changed from value to id to match SelectableQuantityTable
    label: item.item_name,
    price: item.standard_rate ?? item.price ?? 0,
  }));

  const handlePriceChange = (items) => {
    const itemsArray = Object.entries(items);

    const total = itemsArray.reduce((acc, [key, value]) => {
      const price = productOptions.find((item) => item.id === key)?.price || 0;

      const numericQty = Number(String(value).replace(",", "."));
      const numericPrice = Number(price);

      return acc + numericQty * numericPrice;
    }, 0);

    setTotalPrice(Number(total.toFixed(2)));
  };

  const handleTableChange = (rows) => {
    setTableRows(rows);
    const items = rows.reduce((acc, row) => {
      if (row.selectedOption && row.quantity > 0) {
        acc[row.selectedOption] = row.quantity;
      }
      return acc;
    }, {});

    handlePriceChange(items);
    setValue("bundle_items", items, { shouldValidate: true });
  };

  React.useEffect(() => {
    setValue("price", totalPrice, { shouldValidate: true });
  }, [totalPrice, setValue]);

  const onSubmit = async (data) => {
    const items = tableRows.reduce((acc, row) => {
      if (row.selectedOption && row.quantity > 0) {
        acc[row.selectedOption] = row.quantity;
      }
      return acc;
    }, {});
    setLoading(true);
    try {
      const result = await createBundle(data.new_item, data.price, items);

      if (result && result.success) {
        if (onCreated) {
          onCreated(result.item);
        }
        reset();
        setTableRows([{ id: "1", selectedOption: "", quantity: 0 }]);
        setTotalPrice(0);
        onOpenChange(false);
        toast.success("Item created successfully", {
          duration: 5000,
        });
      } else {
        toast.error("Failed to create item", {
          description: result?.message || "Please try again",
          duration: 5000,
        });
      }
    } catch (err) {
      toast.error("Server Error", {
        description: "Unable to create item. Please try again later.",
        duration: 5000,
      });
      console.error("Item creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      reset();
      setTableRows([{ id: "1", selectedOption: "", quantity: 0 }]);
      setTotalPrice(0);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Item</DialogTitle>
          <DialogDescription>
            Enter item details to create a new item.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new_item">
                Item Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new_item"
                {...register("new_item", {
                  required: "Item name is required",
                })}
                placeholder="Enter Item name"
                className={errors.new_item ? "border-red-500" : ""}
              />
              {errors.new_item && (
                <p className="text-sm text-red-500">
                  {errors.new_item.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">
                Price <span className="text-red-500">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                placeholder="Enter Price"
                className={errors.price ? "border-red-500" : ""}
                value={totalPrice}
                disabled
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Bundle Items</Label>
              <SelectableQuantityTable
                options={productOptions}
                value={tableRows}
                onChange={handleTableChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={bundleLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={bundleLoading}>
              {bundleLoading ? "Creating..." : "Create Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
