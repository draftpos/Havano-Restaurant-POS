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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Input } from "./input";
import { Label } from "./label";
import { createCustomer } from "@/lib/utils";
import { toast } from "sonner";
import { Textarea } from "./textarea";
import { useMenuContext } from "@/contexts/MenuContext";

export function CreateCustomerDialog({ open, onOpenChange, onCreated, initialCustomerName = "" }) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();
  const {
    fetchSpecies,
    species,
    loadingSpecies,
    fetchBreeds,
    breeds,
    loadingBreeds
  } = useMenuContext();

  React.useEffect(() => {
    if (typeof fetchSpecies === "function") {
      fetchSpecies();
    }
  }, [fetchSpecies]);
  React.useEffect(() => {
    if (typeof fetchBreeds === "function") {
      fetchBreeds();
    }
  }, [fetchBreeds]);

  const [pets, setPets] = useState([]);

  const addPet = () =>
    setPets((p) => [...p, { patient_name: "", species: "", sex: "", date_of_birth: "", breed: "", complaint: "" }]);

  const updatePet = (index, field, value) =>
    setPets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  const removePet = (index) => setPets((prev) => prev.filter((_, i) => i !== index));

  const onSubmit = async (data) => {
    setLoading(true);
      try {
        console.log("Submitting customer data:", data, "pets:", pets);
        const payload = { ...data, pets };
        console.log("Payload for customer creation:", payload);
        const result = await createCustomer(payload);
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
        setPets([]);
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
      setPets([]);
    }
    onOpenChange(isOpen);
  };

  const speciesOptions = Array.isArray(species) ? species : [];
  const breedOptions = Array.isArray(breeds) ? breeds : [];
  const resolveSpeciesValue = (s) => s?.species ?? s?.name ?? s ?? "";
  const resolveBreedValue = (b) => b?.pet_breed ?? b ?? "";

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
              <Label htmlFor="customer_name">
                Owners Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customer_name"
                {...register("customer_name", {
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

              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPet}
                >
                  Add Pet
                </Button>
                <span className="text-sm text-muted-foreground">Add a pet to this customer</span>
              </div>
            </div>

          </div>
          {pets.length > 0 && (
            <div className="mt-4 overflow-auto">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-1">Patient Name</th>
                    <th className="px-2 py-1">Species</th>
                    <th className="px-2 py-1">Sex</th>
                    <th className="px-2 py-1">Date of Birth</th>
                    <th className="px-2 py-1">Breed</th>
                    <th className="px-2 py-1">Complaint</th>
                    <th className="px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pets.map((pet, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">
                        <Input value={pet.patient_name} onChange={(e) => updatePet(idx, "patient_name", e.target.value)} placeholder="Patient Name" />
                      </td>
                    <td className="px-2 py-1">
                        <Select
                          onValueChange={(value) => updatePet(idx, "species", value)}
                          value={pet.species}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Species" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Species</SelectLabel>
                              {speciesOptions.map((s) => (
                                <SelectItem key={resolveSpeciesValue(s)} value={resolveSpeciesValue(s)}>
                                  {s.species}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="px-2 py-1">
                        <Select 
                          onValueChange={(value) => updatePet(idx, "sex", value)}
                          value={pet.sex}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Sex" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Sex</SelectLabel>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select> 
                      </td>
                      <td className="px-2 py-1">
                        <Input type="date" value={pet.date_of_birth} onChange={(e) => updatePet(idx, "date_of_birth", e.target.value)} />
                      </td>
                      <td className="px-2 py-1">

                        <Select
                          onValueChange={(value) => updatePet(idx, "breed", value)}
                          value={pet.breed}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Breed" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Breed</SelectLabel>
                              {breedOptions.map((b,i) => (
                                <SelectItem key={i} value={resolveBreedValue(b)}>
                                  {b.pet_breed}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select> 
                      </td>
                      <td className="px-2 py-1">
                        <Textarea value={pet.complaint} onChange={(e) => updatePet(idx, "complaint", e.target.value)} placeholder="Complaint" />
                      </td>
                      <td className="px-2 py-1">
                        <Button type="button" variant="outline" onClick={() => removePet(idx)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

