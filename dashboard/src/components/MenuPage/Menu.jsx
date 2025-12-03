import { Search } from "lucide-react";
import { useState, useEffect } from "react";

import MenuItemCard from "@/components/MenuPage/MenuItemCard";
import { useCartStore } from "@/stores/useCartStore";
import { useMenuStore } from "@/stores/useMenuStore";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Combobox } from "../ui/combobox";
import { toast } from "sonner";

import NumPad from "./UpdateCartDialog";
import { useCustomers } from "@/hooks/useCustomers";
import { useTransactionTypes } from "@/hooks/useTransactionTypes";
import { useFilteredMenuItems } from "@/hooks/useFilteredMenuItems";
import { useMenuNavigation } from "@/hooks/useMenuNavigation";

const Menu = () => {
  const { menuItems, fetchMenuItems } = useMenuStore();
  const selectedCategory = useCartStore((state) => state.selectedCategory);
  const selectedCategoryId = selectedCategory?.id;
  const { customer, transactionType, setCustomer, setTransactionType } =
    useCartStore();

  const [searchTerm, setSearchTerm] = useState("");

  const {
    customers,
    loading: loadingCustomers,
    fetchCustomers,
  } = useCustomers();
  const availableTransactionTypes = useTransactionTypes(
    transactionType,
    setTransactionType
  );
  const filteredItems = useFilteredMenuItems(
    menuItems,
    searchTerm,
    selectedCategoryId
  );

  const { currentIndex, setCurrentIndex, target } = useMenuNavigation({
    NUMBER_OF_COLUMNS: 5,
    items: filteredItems,
  });

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  return (
    <>
      <NumPad isOpen={false} setIsOpen={() => {}} />
      <div className="flex items-center justify-between gap-4">
        <p className="text-2xl my-4">{selectedCategory?.name || "Menu"}</p>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <Select
            value={transactionType}
            onValueChange={setTransactionType}
            disabled={availableTransactionTypes.length === 0}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              {availableTransactionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Combobox
            options={customers.map((cust) => ({
              value: cust.name,
              name: cust.name,
              customer_name: cust.customer_name,
              label: cust.customer_name || cust.name,
            }))}
            value={customer}
            onValueChange={setCustomer}
            placeholder={loadingCustomers ? "Loading..." : "Select customer"}
            searchPlaceholder="Search customers..."
            disabled={loadingCustomers}
            className="w-[200px]"
            onCreateCustomer
            onCustomerCreated={(newCustomer) => {
              fetchCustomers();
              setCustomer(newCustomer.value);
            }}
          />

          <div className="flex items-center w-1/3 bg-background px-2 py-1 rounded-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
            <input
              type="text"
              placeholder="Search"
              className="w-full focus:outline-none focus:ring-0 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="text-primary" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {filteredItems.map((item, index) => (
          <MenuItemCard 
            key={item.name} 
            item={item} 
            index={index}
            target={target}
            currentIndex={currentIndex} 
            setCurrentIndex={setCurrentIndex} />
        ))}
      </div>
    </>
  );
};

export default Menu;
