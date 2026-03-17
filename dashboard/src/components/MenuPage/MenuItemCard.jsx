import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { checkStock, getItemUoms, negativeStock, getItemVariants } from "@/lib/utils";
import { toast } from "sonner";

import { useMenuContext } from "@/contexts/MenuContext";
import { Card, CardHeader, CardTitle } from "../ui/card";
import UomSelectModal from "../ui/uom";
import VariantSelectModal from "../ui/VariantSelectModal";

const MenuItemCard = ({ item, index }) => {
  const [showUomModal, setShowUomModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [dynamicUoms, setDynamicUoms] = useState([]);
  const [addingItemName, setAddingItemName] = useState(null);

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantsToShow, setVariantsToShow] = useState([]);

  const { currentIndex, setCurrentIndex, target, setTarget, allowNegativeStock } = useMenuContext();
  const addToCart = useCartStore((state) => state.addToCart);

  const isActive = currentIndex === index && target === "menu";

  const getPrice = (baseItem, uom) => {
    return (
      baseItem?.prices_by_uom?.[uom] ??
      baseItem?.standard_rate ??
      baseItem?.price ??
      0
    );
  };

  const handleAddToCart = async () => {
    if (addingItemName === item.name) return;
    setAddingItemName(item.name);

    try {
      // Stock check
      if (allowNegativeStock === false) {
        const stockData = await checkStock(item.name);
        if (stockData?.stock <= 0) {
          toast.error("Error", { description: `No stock available for ${item.item_name}` });
          return;
        }
      } else if (allowNegativeStock === null) {
        const [stockData, allowNegative] = await Promise.all([checkStock(item.name), negativeStock()]);
        if (!allowNegative && stockData?.stock <= 0) {
          toast.error("Error", { description: `No stock available for ${item.item_name}` });
          return;
        }
      }

      // Already in cart
      const currentCart = useCartStore.getState().cart || [];
      const existingCartItem = currentCart.find((ci) => ci.name === item.name);
      if (existingCartItem) {
        addToCart({ ...existingCartItem, quantity: existingCartItem.quantity + 1 });
        return;
      }

      // Fetch UOMs
      const fetchedUoms = await getItemUoms(item.name);
      if (!fetchedUoms || fetchedUoms.length === 0) {
        toast.error(`No UOMs found for ${item.item_name}`);
        return;
      }

      // Multiple UOMs → show modal
      if (fetchedUoms.length > 1) {
        setPendingItem(item);
        setDynamicUoms(fetchedUoms);
        setShowUomModal(true);
        return;
      }

      // Fetch Variants
      const fetchedVariantsRaw = await getItemVariants(item.name);
      const fetchedVariants = Array.isArray(fetchedVariantsRaw)
        ? fetchedVariantsRaw
        : fetchedVariantsRaw
        ? [fetchedVariantsRaw]
        : [];

      if (fetchedVariants.length > 0) {
        setPendingItem(item);
        setVariantsToShow(fetchedVariants);
        setShowVariantModal(true);
        return;
      }

      // ✅ SINGLE UOM → add directly
      const uom = fetchedUoms[0];
      const price = getPrice(item, uom);

      addToCart({
        name: item.name,
        item_name: item.item_name,
        custom_menu_category: item.custom_menu_category,
        quantity: 1,
        uom,
        price,
        standard_rate: price,
        remark: "No stock override",
      });

    } catch (err) {
      toast.error("Could not add item", { description: err?.message || "Please try again." });
    } finally {
      setAddingItemName(null);
    }
  };

  // ✅ UOM select
  const handleUomSelect = (selected) => {
    if (!pendingItem) return;

    const uom = selected.stock_uom || selected;
    const price = getPrice(pendingItem, uom);

    addToCart({
      name: selected.name || pendingItem.name,
      item_name: selected.item_name || pendingItem.item_name,
      custom_menu_category: pendingItem.custom_menu_category,
      quantity: 1,
      uom,
      price,
      standard_rate: price,
      remark: "No stock override",
    });

    setShowUomModal(false);
    setPendingItem(null);
    setDynamicUoms([]);
  };

  const handleSelectItem = () => {
    setCurrentIndex(index);
    setTarget("menu");
  };

  const imageUrl = item.image
    ? item.image.startsWith("/")
      ? item.image
      : `/${item.image}`
    : null;

  return (
    <>
      <Card
        data-index={index}
        onClick={() => {
          if (showUomModal) return;
          handleSelectItem();
          handleAddToCart();
        }}
        className={cn(
          "menu-item cursor-pointer rounded-lg border shadow-sm transition transform hover:shadow-md hover:scale-[1.02] active:scale-[0.98] active:bg-gray-50 py-2 gap-2",
          isActive && "border-primary bg-primary/10",
          addingItemName === item.name && "pointer-events-none opacity-70"
        )}
      >
        <CardHeader className="flex flex-col items-center gap-2 px-3 py-1 w-full">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={item.item_name}
              className="w-full aspect-square object-cover rounded-md flex-shrink-0"
            />
          )}
          <CardTitle className="break-words text-center whitespace-normal text-sm leading-tight w-full">
            {item.item_name}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* UOM Modal */}
      {showUomModal && (
        <UomSelectModal
          uoms={dynamicUoms}
          onSelect={handleUomSelect}
          onClose={() => {
            setShowUomModal(false);
            setPendingItem(null);
            setDynamicUoms([]);
          }}
        />
      )}

      {/* Variant Modal */}
      {showVariantModal && (
        <VariantSelectModal
          variants={variantsToShow}
          onSelect={(variant) => {
            const uom = variant.stock_uom || variant;
            const price = getPrice(pendingItem, uom);

            addToCart({
              name: variant.name || pendingItem.name,
              item_name: variant.item_name || pendingItem.item_name,
              custom_menu_category: pendingItem.custom_menu_category,
              quantity: 1,
              uom,
              price,
              standard_rate: price,
              remark: "No stock override",
            });

            setShowVariantModal(false);
            setPendingItem(null);
            setVariantsToShow([]);
          }}
          onClose={() => {
            setShowVariantModal(false);
            setPendingItem(null);
            setVariantsToShow([]);
          }}
        />
      )}
    </>
  );
};

export default MenuItemCard;