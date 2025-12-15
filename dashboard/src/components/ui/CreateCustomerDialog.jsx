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
import { Textarea } from "./textarea";

export function CreateCustomerDialog({ open, onOpenChange, onCreated, initialCustomerName = "" }) {
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
        console.log("Submitting customer data:", data);
        const result = await createCustomer(
          data.customer_name,
          data.mobile_no,
          data.sex, 
          data.breed,
          data.species,
          data.date_of_birth, 
          data.address,
          data.patient_name,
          data.complaint,
          data.physical_exam,
          data.differential_diagnosis,
          data.diagnosis,
          data.treatment,
          data.advice,
          data.follow_up,
          data.history,
          data.follow_up,
          data.email,
                );
              console.log("Customer creation result:", result);

      if (result && result.success) {
        // Call the callback with the new customer
        if (onCreated) {
          onCreated({
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogDescription>
            Enter customer details to create a new customer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4 grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="owners_name">
                Owners Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customer_name"
                {...register("owners_name, mobile_no = null, sex, breed, species, date_of_birth, address, patient_name, complaint, physical_exam, differential_diagnosis, diagnosis, treatment, advice, follow_up,email,breed", {
                  required: "Owners name is required",
                })}
                placeholder="Enter owners name"
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
             <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                type="text"
                {...register("address")}
                placeholder="Enter address (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="patient_name">Patient's Name</Label>
              <Input
                id="patient_name"
                {...register("patient_name")}
                placeholder="Enter patient's name (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                {...register("email")}
                placeholder="Enter email (optional)"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sex">Sex</Label>
              <Input
                id="sex"
                {...register("sex")}
                placeholder="Enter sex (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="species">Species</Label>
              <Input
                id="species"
                {...register("species")}
                placeholder="Enter species (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...register("date_of_birth")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="complaint">Complaint</Label>
              <Textarea
                id="complaint"
                {...register("complaint")}
                placeholder="Enter complaint (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="physical_exam">Physical Exam</Label>
              <Textarea
                id="physical_exam"
                {...register("physical_exam")}
                placeholder="Enter physical exam findings (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="differential_diagnosis">Differential Diagnosis</Label>
              <Textarea
                id="differential_diagnosis"
                {...register("differential_diagnosis")}
                placeholder="Enter differential diagnosis (optional)"
              />
            </div>
                        <div className="grid gap-2">
              <Label htmlFor="treatment">Treatment</Label>
              <Textarea
                id="treatment"
                {...register("treatment")}
                placeholder="Enter treatment (optional)"
              />
            </div>
             
            <div className="grid gap-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Input
                id="diagnosis"
                {...register("diagnosis")}
                placeholder="Enter diagnosis (optional)"
              />
            </div>
           <div className="grid gap-2">
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                {...register("breed")}
                placeholder="Enter Breed"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="advice">Advice</Label>
              <Textarea
                id="advice"
                {...register("advice")}
                placeholder="Enter advice (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="follow_up">Follow Up</Label>
              <Textarea
                id="follow_up"
                {...register("follow_up")}
                placeholder="Enter follow up details (optional)"
              />

            </div>
         <div className="grid gap-2">
              <Label htmlFor="follow_up">Follow Up</Label>
              <Textarea
                id="follow_up"
                {...register("follow_up")}
                placeholder="Enter follow up details (optional)"
              />
              
            </div>
                  <div className="grid gap-2">
              <Label htmlFor="follow_up">History</Label>
              <Textarea
                id="history"
                {...register("history")}
                placeholder="Enter history (optional)"
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

