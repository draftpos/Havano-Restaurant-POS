import { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { useCartStore } from "@/stores/useCartStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { negativeStock, getPharmacyUserSettings } from "@/lib/utils";
import {
  useCustomers,
  useTransactionTypes,
  useFilteredMenuItems,
  useMenuNavigation,
  useSortedCategories,
  useCategoryColors,
  useCategoryCounts,
} from "@/hooks";

const MenuContext = createContext(null);

export function MenuProvider({ children }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [target, setTarget] = useState("menu");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [allowNegativeStock, setAllowNegativeStock] = useState(null);
  const [pharmacySettings, setPharmacySettings] = useState({ pharmacy_activated: false, is_cashier_only: false });
  const { menuItems, fetchMenuItems, menuCategories, fetchMenuCategories } = useMenuStore();

  useEffect(() => {
    getPharmacyUserSettings().then(setPharmacySettings);
  }, []);

  useEffect(() => {
    let cancelled = false;
    negativeStock()
      .then((value) => {
        if (!cancelled) setAllowNegativeStock(Boolean(value));
      })
      .catch(() => {
        if (!cancelled) setAllowNegativeStock(false);
      });
    return () => { cancelled = true; };
  }, []);


  const menuGridRef = useRef(null);

  const {
    cart,
    removeFromCart,
    openUpdateDialog,
    activeOrderId,
    activeTableId,
    activeWaiterId,
    activeQuotationId,
    clearCart,
    customerName,
    orderType,
    selectedCategory,
    setSelectedCategory,
    customer,
    transactionType,
    setCustomer,
    setTransactionType,
    addToCart,
  } = useCartStore();

  const categories = useSortedCategories(menuCategories);
  const categoryColors = useCategoryColors(categories);
  const categoryCounts = useCategoryCounts(categories, menuItems);

  const visibleCategories = useMemo(
    () =>
      categories.filter((c) => {
        const count = categoryCounts[c.name];
        return count === undefined || count > 0;
      }),
    [categories, categoryCounts]
  );

  useEffect(() => {
    fetchMenuCategories();
  }, [fetchMenuCategories]);

  useEffect(() => {
    if (!visibleCategories.length) {
      setSelectedCategory(null);
      return;
    }

    setSelectedCategory((prev) => {
      if (prev?.id && visibleCategories.some((c) => c.name === prev.id)) {
        return prev;
      }
      const first = visibleCategories[0];
      return { id: first.name, name: first.category_name };
    });
  }, [visibleCategories, setSelectedCategory]);

  const selectedCategoryId = selectedCategory?.id;

  const { customers, loadingCustomers, fetchCustomers } = useCustomers();
  const availableTransactionTypes = useTransactionTypes(
    transactionType,
    setTransactionType
  );

  const hidePharmacyForCashier = pharmacySettings.pharmacy_activated && pharmacySettings.is_cashier_only;
  const filteredItems = useFilteredMenuItems(
    menuItems,
    searchTerm,
    selectedCategoryId,
    hidePharmacyForCashier
  );


  const { currentIndex, setCurrentIndex } = useMenuNavigation({
    NUMBER_OF_COLUMNS: 5,
    items: filteredItems,
    target,
    setTarget,
    visibleCategories,
    menuGridRef
  });

  return (
    <MenuContext.Provider
      value={{
        menuItems,
        fetchMenuItems,
        selectedCategoryId,
        customer,
        transactionType,
        setCustomer,
        setTransactionType,
        searchTerm,
        setSearchTerm,
        customers,
        loadingCustomers,
        fetchCustomers,
        availableTransactionTypes,
        filteredItems,
        currentIndex,
        setCurrentIndex,
        target,
        setTarget,
        cart,
        removeFromCart,
        openUpdateDialog,
        activeOrderId,
        activeTableId,
        activeQuotationId,
        clearCart,
        categories,
        categoryColors,
        categoryCounts,
        visibleCategories,
        selectedCategory,
        setSelectedCategory,
        orderType,
        activeWaiterId,
        customerName,
        addToCart,
        selectedAgent,
        setSelectedAgent,
        menuGridRef,
        allowNegativeStock,
        pharmacySettings,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export const useMenuContext = () => useContext(MenuContext);
