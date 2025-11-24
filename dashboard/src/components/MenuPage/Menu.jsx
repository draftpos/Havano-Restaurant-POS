import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import MenuItemCard from "@/components/MenuPage/MenuItemCard";
import { useCartStore } from "@/stores/useCartStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { getCustomers } from "@/lib/utils";
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

const Menu = () => {
  const { menuItems, fetchMenuItems } = useMenuStore();
  const selectedCategory = useCartStore((state) => state.selectedCategory);
  const selectedCategoryId = selectedCategory?.id;
  const { customer, transactionType, setCustomer, setTransactionType } = useCartStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  console.log(menuItems);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const customerList = await getCustomers();
        setCustomers(customerList);
      } catch (err) {
        console.error("Error loading customers:", err);
        toast.error("Failed to load customers", {
          description: "Please try refreshing the page",
          duration: 4000,
        });
      } finally {
        setLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, []);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return menuItems.filter((item) => {
      const matchesCategory =
        !selectedCategoryId ||
        selectedCategoryId === "all" ||
        item.custom_menu_category === selectedCategoryId;

      const label = (item.item_name || item.name || "").toLowerCase();
      const matchesSearch = !term || label.includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, searchTerm, selectedCategoryId]);

  return (
    <>
      <NumPad isOpen={false} setIsOpen={() => {}} />
      <div className="flex items-center justify-between gap-4">
        <p className="text-2xl my-4">{selectedCategory?.name || "Menu"}</p>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <Select
            value={transactionType}
            onValueChange={setTransactionType}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Quotation">Quotation</SelectItem>
              <SelectItem value="Sales Invoice">Sales Invoice</SelectItem>
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
            onCreateCustomer={true}
            onCustomerCreated={(newCustomer) => {
              // Add new customer to the list and refresh
              const refreshCustomers = async () => {
                try {
                  const customerList = await getCustomers();
                  setCustomers(customerList);
                } catch (err) {
                  console.error("Error refreshing customers:", err);
                }
              };
              refreshCustomers();
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
        {filteredItems.map((item) => (
          <MenuItemCard key={item.name} item={item} />
        ))}
      </div>
    </>
  );
};

export default Menu;
