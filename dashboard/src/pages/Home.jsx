import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Clock from "@/components/HomePage/Clock";
import OrdersList from "@/components/HomePage/OrdersList";
import Container from "@/components/Shared/Container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatCurrency,
  getCurrentUserFullName,
  getNumberOfOrders,
} from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { useMenuStore } from "@/stores/useMenuStore";

const Home = () => {
  const navigate = useNavigate();
  const { startNewTakeAwayOrder, addToCart, clearCart } = useCartStore();
  const { menuItems, fetchMenuItems } = useMenuStore();
  const [userName, setUserName] = useState(null);
  const [popularItems, setPopularItems] = useState([]);


  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  useEffect(() => {
    const loadUserName = async () => {
      try {
        const name = await getCurrentUserFullName();
        if (name) {
          setUserName(name);
        }
      } catch (err) {
        console.error("Failed to load user name:", err);
      }
    };

    loadUserName();
  }, []);

  useEffect(() => {
    if (!menuItems || menuItems.length === 0) {
      setPopularItems([]);
      return;
    }

    let isCancelled = false;

    const loadPopularItems = async () => {
      try {
        const entries = await Promise.all(
          menuItems.map(async (item) => {
            try {
              const count = await getNumberOfOrders(item.name);
              return { ...item, orderCount: count };
            } catch (err) {
              console.error("Failed to fetch order count:", err);
              return { ...item, orderCount: 0 };
            }
          })
        );

        const sorted = entries.sort(
          (a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0)
        );

        if (!isCancelled) {
          setPopularItems(sorted.slice(0, 10));
        }
      } catch (err) {
        console.error("Failed to load order counts:", err);
      }
    };

    loadPopularItems();

    return () => {
      isCancelled = true;
    };
  }, [menuItems]);

  const handlePopularItemClick = (item) => {
    if (!item?.name) {
      return;
    }

    startNewTakeAwayOrder();
    clearCart();
    addToCart({
      ...item,
      quantity: 1,
      price: item.price ?? item.standard_rate ?? 0,
      standard_rate: item.standard_rate ?? item.price ?? 0,
    });
    navigate("/menu");
  };

  const noOrdersYet =
    popularItems.length > 0 &&
    popularItems.every((item) => (item.orderCount ?? 0) === 0);

  return (
    <div className="bg-secondary-background">
      <Container>
        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h1 className="text-xl font-bold">Hello, {userName || "Havano"}</h1>
                <p className="text-xs text-gray-500">
                  Give your customers the best service
                </p>
              </div>
              <div>
                <Clock />
              </div>
            </div>
            <div className="flex items-center gap-4 py-8">
              <Button size="lg" onClick={() => navigate("/tables")}>
                DINE IN
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  startNewTakeAwayOrder();
                  navigate("/menu")}}
                className="border-primary/30 shadow-sm hover:shadow-md"
              >
                TAKE AWAY
              </Button>
            </div>
            <div className="space-y-4">
              <Card className="px-4 h-[65vh]">
                <CardContent>
                  <OrdersList />
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="col-span-2">
            <Card className="px-4 h-full">
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Popular Menu Items</CardTitle>
                <CardAction>
                  <Button variant="link" onClick={() => {clearCart(); navigate("/menu")}}>
                    View All
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {popularItems.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No menu items available yet.
                    </p>
                  ) : (
                    <>
                      {noOrdersYet && (
                        <div className="text-xs text-gray-400 bg-secondary-background/70 border border-dashed border-gray-600 rounded-md p-3">
                          No orders have been placed yet. Click a menu item below
                          to start an order with it pre-filled in your cart.
                        </div>
                      )}
                      {popularItems.map((item, index) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handlePopularItemClick(item)}
                          className="w-full flex items-center justify-between bg-secondary-background rounded-md py-2 px-4 transition hover:bg-secondary-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:cursor-pointer"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="p-2 h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                              <p className="text-lg font-bold text-white">
                                {index + 1}
                              </p>
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="font-medium break-words whitespace-normal">{item.item_name}</p>
                              <p className="text-xs text-gray-500">
                                Orders: {item.orderCount ?? 0}
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold">
                            {formatCurrency(item.standard_rate)}
                          </p>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Home;
