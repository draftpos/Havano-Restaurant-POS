import { formatCurrency } from "@/lib/utils";
import { useTransactionCreationStore } from "@/stores/useTransactionCreationStore";

import { Card, CardHeader, CardTitle } from "../ui/card";

const TransactionItemCard = ({ item }) => {
  const addToCart = useTransactionCreationStore((state) => state.addToCart);

  const handleAddToCart = () => {
    addToCart({
      name: item.name,
      item_name: item.item_name,
      custom_menu_category: item.custom_menu_category,
      quantity: 1,
      price: item.standard_rate ?? item.price ?? 0,
      standard_rate: item.standard_rate ?? item.price ?? 0,
    });
  };

  return (
    <Card
      onClick={handleAddToCart}
      className="cursor-pointer rounded-lg border shadow-sm transition transform hover:shadow-md hover:scale-[1.02] active:scale-[0.98] active:bg-gray-50"
    >
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{item.item_name}</CardTitle>
        <i>{formatCurrency(item.standard_rate)}</i>
      </CardHeader>
    </Card>
  );
};

export default TransactionItemCard;

