import { formatCurrency } from "@/lib/utils";
import { useTransactionCreationStore } from "@/stores/useTransactionCreationStore";

import { Card, CardHeader, CardTitle } from "../ui/card";

const getItemImageUrl = (image) => {
  if (!image) return null;
  return image.startsWith("/") ? image : `/${image}`;
};

const TransactionItemCard = ({ item }) => {
  const addToCart = useTransactionCreationStore((state) => state.addToCart);
  const imageUrl = getItemImageUrl(item.image);

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
      <CardHeader className="flex flex-col items-center gap-2">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={item.item_name}
            className="w-10 h-10 object-cover rounded-md flex-shrink-0"
          />
        )}
        <CardTitle className="text-sm text-center w-full">{item.item_name}</CardTitle>
        <i className="text-center">{formatCurrency(item.standard_rate)}</i>
      </CardHeader>
    </Card>
  );
};

export default TransactionItemCard;

