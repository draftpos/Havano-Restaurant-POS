import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { checkStock, getItemUoms, negativeStock } from "@/lib/utils";
import { toast } from "sonner";

import { useMenuContext } from "@/contexts/MenuContext";
import { Card, CardHeader, CardTitle } from "../ui/card";
import UomSelectModal from "../ui/uom";

const MenuItemCard = ({ item, index }) => {
  const [showUomModal, setShowUomModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [dynamicUoms, setDynamicUoms] = useState([]);
  const [addingItemName, setAddingItemName] = useState(null);

  const { currentIndex, setCurrentIndex, target, setTarget, allowNegativeStock } = useMenuContext();
  const addToCart = useCartStore((state) => state.addToCart);
  const cartItems = useCartStore((state) => state.cart || []);

  const itemsToUse = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return [];
    return cartItems.map((ci) => ({
      name: ci.name || ci.item_code || ci.item_name,
      item_code: ci.item_code || ci.name || ci.item_name,
      item_name: ci.item_name || ci.name,
      quantity: ci.quantity || ci.qty || 1,
      qty: ci.qty || ci.quantity || 1,
      price: ci.price || ci.rate || ci.standard_rate || 0,
      rate: ci.rate || ci.price || ci.standard_rate || 0,
      uom: ci.uom || null,
    }));
  }, [cartItems]);

  const isActive = currentIndex === index && target === "menu";

const handleAddToCart = async () => {
  // Prevent double-add: only one add-in-progress per item at a time
  if (addingItemName === item.name) return;
  setAddingItemName(item.name);

  try {
    // can_use_negative_stock is loaded once on menu open (MenuContext). Only check stock when negative not allowed.
    if (allowNegativeStock === false) {
      const stockData = await checkStock(item.name);
      if (stockData?.stock <= 0) {
        toast.error("Error", { description: `No stock available for ${item.item_name}` });
        return;
      }
    } else if (allowNegativeStock === null) {
      // Not yet loaded: one-time fallback so we don't add when stock is 0
      const [stockData, allowNegative] = await Promise.all([
        checkStock(item.name),
        negativeStock(),
      ]);
      if (!allowNegative && stockData?.stock <= 0) {
        toast.error("Error", { description: `No stock available for ${item.item_name}` });
        return;
      }
    }
    // allowNegativeStock === true: skip stock check entirely

    // Use fresh cart from store in case another add completed while we awaited
    const currentCart = useCartStore.getState().cart || [];
    const existingCartItem = currentCart.find((ci) => ci.name === item.name);

    if (existingCartItem) {
      addToCart({
        ...existingCartItem,
        quantity: existingCartItem.quantity + 1,
      });
      return;
    }

    // Not in cart → fetch UOMs (single call)
    const fetchedUoms = await getItemUoms(item.name);

    if (!fetchedUoms || fetchedUoms.length === 0) {
      toast.error(`No UOMs found for ${item.item_name}`);
      return;
    }

    // Re-check cart after fetch; user might have added same item via another click
    const cartAfterFetch = useCartStore.getState().cart || [];
    const existingNow = cartAfterFetch.find((ci) => ci.name === item.name);
    if (existingNow) {
      addToCart({ ...existingNow, quantity: existingNow.quantity + 1 });
      return;
    }

    if (fetchedUoms.length === 1) {
      addToCart({
        name: item.name,
        item_name: item.item_name,
        custom_menu_category: item.custom_menu_category,
        quantity: 1,
        uom: fetchedUoms[0],
        price: item.standard_rate ?? item.price ?? 0,
        standard_rate: item.standard_rate ?? item.price ?? 0,
        remark: "No stock override",
      });
      return;
    }

    setPendingItem(item);
    setDynamicUoms(fetchedUoms);
    setShowUomModal(true);
  } catch (err) {
    toast.error("Could not add item", {
      description: err?.message || "Please try again.",
    });
  } finally {
    setAddingItemName(null);
  }
};


  const handleUomSelect = (uom) => {
    if (!pendingItem) return;

    addToCart({
      name: pendingItem.name,
      item_name: pendingItem.item_name,
      custom_menu_category: pendingItem.custom_menu_category,
      quantity: 1,
      uom,
      price: pendingItem.standard_rate ?? pendingItem.price ?? 0,
      standard_rate: pendingItem.standard_rate ?? pendingItem.price ?? 0,
      remark: "No stock override",
    });

    setShowUomModal(false);
    setPendingItem(null);
  };

  const handleSelectItem = () => {
    setCurrentIndex(index);
    setTarget("menu");
  };

  return (
    <>
      <Card
        data-index={index}
        onClick={() => {
          if (showUomModal) return; // prevent double actions
          handleSelectItem();
          handleAddToCart(); // ✅ async handled inside
        }}
        className={cn(
          "menu-item cursor-pointer rounded-lg border shadow-sm transition transform hover:shadow-md hover:scale-[1.02] active:scale-[0.98] active:bg-gray-50 py-2 gap-2",
          isActive && "border-primary bg-primary/10",
          addingItemName === item.name && "pointer-events-none opacity-70"
        )}
      >
        <CardHeader className="flex items-start justify-between px-3 py-1">
          <CardTitle className="break-words whitespace-normal text-sm leading-tight">
            {item.item_name}
          </CardTitle>
        </CardHeader>
      </Card>

      {showUomModal && (
        <UomSelectModal
          uoms={dynamicUoms}
          onSelect={handleUomSelect}
          onClose={() => {
            setShowUomModal(false);
            setPendingItem(null);
          }}
        />
      )}
    </>
  );
};

export default MenuItemCard;
