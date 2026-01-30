import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { checkStock, negativeStock, getItemUoms } from "@/lib/utils";
import { toast } from "sonner";

import { useMenuContext } from "@/contexts/MenuContext";
import { Card, CardHeader, CardTitle } from "../ui/card";
import UomSelectModal from "../ui/uom";

const MenuItemCard = ({ item, index }) => {
  const [showUomModal, setShowUomModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [dynamicUoms, setDynamicUoms] = useState([]);

  const { currentIndex, setCurrentIndex, target, setTarget } = useMenuContext();
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
  const stockData = await checkStock(item.name);
  const allowNegative = await negativeStock();

  if (!allowNegative && stockData?.stock <= 0) {
    toast.error("Error", { description: `No stock available for ${item.item_name}` });
    return;
  }

  const existingCartItem = cartItems.find((ci) => ci.name === item.name);

  if (existingCartItem) {
    // Already in cart → increment quantity
    addToCart({
      ...existingCartItem,
      quantity: existingCartItem.quantity + 1,
    });
    return;
  }

  // Not in cart → fetch UOMs dynamically
  const fetchedUoms = await getItemUoms(item.name);
  console.log("fetched uoms", fetchedUoms);

  if (!fetchedUoms || fetchedUoms.length === 0) {
    toast.error(`No UOMs found for ${item.item_name}`);
    return;
  }

  if (fetchedUoms.length === 1) {
    // Only one UOM → add directly
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

  // Multiple UOMs → show modal
  setPendingItem(item);
  setDynamicUoms(fetchedUoms);
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
          if (showUomModal) return; // prevent double actions
          handleSelectItem();
          handleAddToCart(); // ✅ async handled inside
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
