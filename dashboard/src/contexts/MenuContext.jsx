import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useCartStore } from "@/stores/useCartStore";
import { useMenuStore } from "@/stores/useMenuStore";
import { useOrderStore } from "@/stores/useOrderStore";
import {
  useCustomers,
  useTransactionTypes,
  useFilteredMenuItems,
  useMenuNavigation,
  useCartSubmission,
  useSortedCategories,
  useCategoryColors,
  useCategoryCounts
} from "@/hooks";

const MenuContext = createContext(null);

export function MenuProvider({ children }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [target, setTarget] = useState("menu");
  const { menuItems, fetchMenuItems, menuCategories, fetchMenuCategories } = useMenuStore();
  const { fetchOrders, fetchTableOrders } = useOrderStore();

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
  } = useCartStore();

  const categories = useSortedCategories(menuCategories);
  const categoryColors = useCategoryColors(categories);
  const categoryCounts = useCategoryCounts(categories);

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

    const { handleSubmitOrder, isSubmitting, paymentState, setPaymentState } =
      useCartSubmission({
        cart,
        transactionType,
        customer,
        orderType,
        activeTableId,
        activeWaiterId,
        customerName,
        activeQuotationId,
        clearCart,
        fetchOrders,
        fetchTableOrders,
      });

  const selectedCategoryId = selectedCategory?.id;

  const { customers, loadingCustomers, fetchCustomers } = useCustomers();

  const availableTransactionTypes = useTransactionTypes(
    transactionType,
    setTransactionType
  );

  const filteredItems = useFilteredMenuItems(
    menuItems,
    searchTerm,
    selectedCategoryId
  );

  const { currentIndex, setCurrentIndex } = useMenuNavigation({
    NUMBER_OF_COLUMNS: 5,
    items: filteredItems,
    target,
    setTarget,
    visibleCategories,
    handleSubmitOrder
  });

  return (
    <MenuContext.Provider
      value={{
        menuItems,
        fetchMenuItems,
        selectedCategory,
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
        handleSubmitOrder,
        isSubmitting,
        paymentState,
        setPaymentState,
        categories,
        categoryColors,
        categoryCounts,
        visibleCategories,
        selectedCategory,
        setSelectedCategory,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export const useMenuContext = () => useContext(MenuContext);
