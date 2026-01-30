import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { checkStock, negativeStock } from "@/lib/utils";
import { toast } from "sonner";
import { useMemo } from "react";


import { useMenuContext } from "@/contexts/MenuContext";
import { Card, CardHeader, CardTitle } from "../ui/card";
import UomSelectModal from "../ui/uom";

const MenuItemCard = ({ item, index }) => {
  const [showUomModal, setShowUomModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);

  const { currentIndex, setCurrentIndex, target, setTarget } = useMenuContext();
  const addToCart = useCartStore((state) => state.addToCart);
  const cartItems = useCartStore((state) => state.cart || []);

  const itemsToUse = useMemo(() => {
  if (!cartItems || cartItems.length === 0) {
    return [];
  }

  const formattedItems = cartItems.map((item) => ({
    name: item.name || item.item_code || item.item_name,
    item_code: item.item_code || item.name || item.item_name,
    item_name: item.item_name || item.name,
    quantity: item.quantity || item.qty || 1,
    qty: item.qty || item.quantity || 1,
    price: item.price || item.rate || item.standard_rate || 0,
    rate: item.rate || item.price || item.standard_rate || 0,
    uom: item.uom || null,
  }));

  return formattedItems;
}, [cartItems]);

  // 🔥 Optional: watch cart items


  const isActive = currentIndex === index && target === "menu";
const handleAddToCart = async () => {
  const stockData = await checkStock(item.name);
  const allowNegative = await negativeStock();

  if (!allowNegative && stockData?.stock <= 0) {
    toast.error("Error", {
      description: `No stock available for ${item.item_name}`,
    });
    return;
  }

  // SAFELY get cart items
  const existingCartItem = (cartItems || []).find((ci) => ci.name === item.name);

  if (existingCartItem) {
    // Already in cart → just increment quantity
    addToCart({
      ...existingCartItem,
      quantity: existingCartItem.quantity + 1,
    });
    return;
  }

  // Not in cart → ask for UOM
  setPendingItem(item);
  setShowUomModal(true);
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
          if (showUomModal) return; // 🔒 prevent double actions
          handleSelectItem();
          handleAddToCart();
        }}
        className={cn(
          "menu-item cursor-pointer rounded-lg border shadow-sm transition transform hover:shadow-md hover:scale-[1.02] active:scale-[0.98] active:bg-gray-50 py-2 gap-2",
          isActive && "border-primary bg-primary/10"
        )}
      >
        <CardHeader className="flex items-start justify-between px-3 py-1">
          <CardTitle className="break-words whitespace-normal text-sm leading-tight">
            {item.item_name}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* 🔥 UOM MODAL */}
      {showUomModal && (
        <UomSelectModal
          uoms={["Each", "Box", "Carton", "Pallet"]}
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
