import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Trash2, ChevronsUpDown } from "lucide-react";

function SearchableSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((opt) => opt.id === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? selectedLabel : "Select an item"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search item..." />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SelectableQuantityTable({ value: rows, onChange, options }) {
  const addRow = () => {
    const newId =
      rows.length > 0
        ? String(Math.max(...rows.map((r) => parseInt(r.id, 10))) + 1)
        : "1";
    onChange([...rows, { id: newId, selectedOption: "", quantity: 0 }]);
  };

  const deleteRow = (id) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  const updateOption = (id, option) => {
    onChange(
      rows.map((row) =>
        row.id === id ? { ...row, selectedOption: option } : row
      )
    );
  };

  const updateQuantity = (id, quantity) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, quantity } : row)));
  };

  // Helper: get options not already selected by other rows
  const getAvailableOptions = (currentId) => {
    const selectedIds = rows
      .filter((r) => r.id !== currentId && r.selectedOption)
      .map((r) => r.selectedOption);
    return options.filter((opt) => !selectedIds.includes(opt.id));
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                Item
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">
                Quantity
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <SearchableSelect
                    value={row.selectedOption}
                    onChange={(value) => updateOption(row.id, value)}
                    options={getAvailableOptions(row.id)}
                  />
                </td>
                <td className="px-6 py-4">
                  <Input
                    type="number"
                    min="0"
                    value={row.quantity}
                    onChange={(e) =>
                      updateQuantity(row.id, parseInt(e.target.value) || 0)
                    }
                    className="text-center"
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="text-destructive hover:text-destructive/80 transition-colors p-2"
                    aria-label="Delete row"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 border-t border-border">
        <Button onClick={addRow} className="w-full" type="button">
          Add Row
        </Button>
      </div>
    </div>
  );
}

export default SelectableQuantityTable;
