import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Input } from "./input";
import { CreateCustomerDialog } from "./CreateCustomerDialog";

export function Combobox({
  options = [],
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
  onCreateCustomer,
  onCustomerCreated,
}) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((option) => {
      const label = option.label || option.name || option.customer_name || "";
      const value = option.value || option.name || "";
      return (
        label.toLowerCase().includes(term) ||
        value.toLowerCase().includes(term)
      );
    });
  }, [options, searchTerm]);

  const selectedOption = React.useMemo(() => {
    return options.find(
      (opt) => (opt.value || opt.name) === value
    );
  }, [options, value]);

  const displayValue = selectedOption
    ? selectedOption.label || selectedOption.customer_name || selectedOption.name || value
    : placeholder;

  React.useEffect(() => {
    if (open) {
      setSearchTerm("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2">
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No customers found.
              </p>
              {onCreateCustomer && searchTerm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setCreateDialogOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Create "{searchTerm}"
                </Button>
              )}
            </div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => {
                const optionValue = option.value || option.name;
                const optionLabel = option.label || option.customer_name || option.name;
                const isSelected = value === optionValue;
                return (
                  <div
                    key={optionValue}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => {
                      onValueChange(isSelected ? "" : optionValue);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{optionLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
      {onCreateCustomer && (
        <CreateCustomerDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          initialCustomerName={searchTerm}
          onCustomerCreated={(newCustomer) => {
            if (onCustomerCreated) {
              onCustomerCreated(newCustomer);
            }
            if (onValueChange) {
              onValueChange(newCustomer.value);
            }
            setOpen(false);
            setSearchTerm("");
          }}
        />
      )}
    </Popover>
  );
}

