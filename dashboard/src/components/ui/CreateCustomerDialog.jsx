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
import { createCustomer } from "@/lib/utils";
import { toast } from "sonner";

export function CreateCustomerDialog({ open, onOpenChange, onCustomerCreated, initialCustomerName = "" }) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await createCustomer(data.customer_name, data.mobile_no);
      
      if (result && result.success) {
        // Call the callback with the new customer
        if (onCustomerCreated) {
          onCustomerCreated({
            name: result.customer,
            customer_name: result.customer_name,
            value: result.customer,
            label: result.customer_name,
          });
        }
        
        reset();
        onOpenChange(false);
      } else {
        toast.error("Failed to Create Customer", {
          description: result?.message || "Please try again",
          duration: 5000,
        });
      }
    } catch (err) {
      toast.error("Server Error", {
        description: "Unable to create customer. Please try again later.",
        duration: 5000,
      });
      console.error("Customer creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open && initialCustomerName) {
      setValue("customer_name", initialCustomerName);
    }
  }, [open, initialCustomerName, setValue]);

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogDescription>
            Enter customer details to create a new customer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customer_name">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customer_name"
                {...register("customer_name", {
                  required: "Customer name is required",
                })}
                placeholder="Enter customer name"
                className={errors.customer_name ? "border-red-500" : ""}
              />
              {errors.customer_name && (
                <p className="text-sm text-red-500">
                  {errors.customer_name.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobile_no">Mobile Number</Label>
              <Input
                id="mobile_no"
                type="tel"
                {...register("mobile_no")}
                placeholder="Enter mobile number (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

