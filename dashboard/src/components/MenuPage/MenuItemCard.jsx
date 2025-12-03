import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";

import { Card, CardHeader, CardTitle } from "../ui/card";

const MenuItemCard = ({ item, index , currentIndex, setCurrentIndex, target }) => {
  const addToCart = useCartStore((state) => state.addToCart);
  const isActive = currentIndex === index && target === "menu";

  const handleAddToCart = () => {
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
  }
  return (
    <>
      <Card
        data-index={index}
        onClick={() => {
          handleSelectItem() ;
          handleAddToCart();
        }}
        className={
          cn(
            "menu-item cursor-pointer rounded-lg border shadow-sm transition transform hover:shadow-md hover:scale-[1.02] active:scale-[0.98] active:bg-gray-50", isActive && "border-primary bg-primary/10"
          )
        }
      >
        <CardHeader className="flex items-center justify-between">
          <CardTitle>{item.item_name}</CardTitle>
          <i>{formatCurrency(item.standard_rate)}</i>
        </CardHeader>
      </Card>
    </>
  );
};

export default MenuItemCard;
