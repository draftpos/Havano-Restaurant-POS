import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { checkStock } from "@/lib/utils";
import { toast, Toaster } from "sonner";

import { useMenuContext } from "@/contexts/MenuContext";

import { Card, CardHeader, CardTitle, CardFooter } from "../ui/card";

const MenuItemCard = ({ item, index }) => {
  const { currentIndex, setCurrentIndex, target, setTarget } = useMenuContext();

  const addToCart = useCartStore((state) => state.addToCart);
  const isActive = currentIndex === index && target === "menu";

  const handleAddToCart = async () => {
  const stockData = await checkStock(item.name);
  if (stockData?.stock <= 0) {
      toast.error("Error", { description: `No stock available for ${item.item_name}` });
      console.log("No stock found for", item.item_name);
      return; // stop adding
  }
    addToCart({
      name: item.name,
      item_name: item.item_name,
      custom_menu_category: item.custom_menu_category,
      quantity: 1,
      price: item.standard_rate ?? item.price ?? 0,
      standard_rate: item.standard_rate ?? item.price ?? 0,
      remark: "",
    });
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
    </>
  );
};

export default MenuItemCard;
