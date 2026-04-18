import { useEffect, useState } from "react";
import { isRestaurantMode } from "@/lib/utils";
import Cart from "@/components/MenuPage/Cart";
import Menu from "@/components/MenuPage/Menu";
import MenuCategories from "@/components/MenuPage/MenuCategories";
import Container from "@/components/Shared/Container";
import { useCartStore } from "@/stores/useCartStore";
import { useNavigate } from "react-router-dom";
import { MenuProvider } from "@/contexts/MenuContext";
import { db, call } from "@/lib/frappeClient";

const MenuPage = () => {
  const navigate = useNavigate();
  const { startNewTakeAwayOrder, activeTableId } = useCartStore();
  const isDineInSelected = Boolean(activeTableId);

  const [isRestMode, setIsRestMode] = useState(false);
  const [loadingMode, setLoadingMode] = useState(true);

  const { selectedReceipt, setSelectedReceipt } = useCartStore();
  const [hideDineTakeAway, setHideDineTakeAway] = useState(false);

  useEffect(() => {
    const checkMode = async () => {
      const result = await isRestaurantMode();
      setIsRestMode(Boolean(result));
      setLoadingMode(false);
    };

    checkMode();
  }, []);

  const handleDineInClick = () => {
    navigate("/tables");
  };
  useEffect(() => {
  const loadSettings = async () => {
  const settingsResponse = await call.get("havano_restaurant_pos.api.get_ha_pos_settings");
    const doc = settingsResponse?.message?.data;
    console.log("HA POS Settings loaded:", doc);

    if (doc) {
      setHideDineTakeAway(!!doc.hide_dinetakeaway);
    }
  };

  loadSettings();
}, []);

  const handleTakeAwayClick = () => {
    startNewTakeAwayOrder();
  };

  const [laybySaving, setLaybySaving] = useState(false);

  const handleLaybyClick = async () => {
    const { cartItems, activeCustomer, activePosProfile } = useCartStore.getState();

    if (!cartItems || cartItems.length === 0) {
      alert("Cart is empty. Add items before creating a Layby.");
      return;
    }

    setLaybySaving(true);
    try {
      const items = cartItems.map((item) => ({
        item_code: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount,
        warehouse: item.warehouse || "",
        discount_percentage: item.discount_percentage || 0,
      }));

      const res = await call.post("discount.api.layby.create_layby_sales_order", {
        items: JSON.stringify(items),
        customer: activeCustomer || null,
        pos_profile: activePosProfile || null,
      });

      const order = res?.message;
      if (order?.name) {
        const lines = [
          "=============================",
          "         LAYBY RECEIPT",
          "=============================",
          `Order     : ${order.name}`,
          `Date      : ${new Date().toLocaleString()}`,
          `Customer  : ${activeCustomer || "Walk-in Customer"}`,
          "-----------------------------",
          ...items.map((i) => `${i.item_name} x${i.qty}  @ ${i.rate}  = ${i.amount}`),
          "-----------------------------",
          `TOTAL     : ${order.currency} ${order.total}`,
          "=============================",
          "Thank you for your Layby!",
          "=============================",
        ].join("\n");

        const blob = new Blob([lines], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Layby-${order.name}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        alert(`Layby created successfully!\nOrder: ${order.name}\nTotal: ${order.currency} ${order.total}`);
        startNewTakeAwayOrder();
      } else {
        alert("Failed to create Layby. Please try again.");
      }
    } catch (err) {
      console.error("Layby error:", err);
      alert("Error creating Layby: " + (err?.message || "Unknown error"));
    } finally {
      setLaybySaving(false);
    }
  };

  if (loadingMode) {
    return null;
  }

  return (
    <MenuProvider>
      <Container>
        <div className="grid grid-cols-9 gap-4 relative z-0">
  {/* Left categories */}
  <div className="col-span-1 border-r pr-4">
    <MenuCategories />
  </div>

  {/* Middle content: buttons + menu */}
  <div className="col-span-5 min-w-0">
    <div className="flex items-center gap-4 justify-between">
      {/* Left: Dine In / Take Away */}
      {!hideDineTakeAway && (


      <div className="flex items-center gap-2">
        <label
          className={`${!isRestMode ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          onClick={(e) => {
            if (!isRestMode) {
              console.info(
                "[HA POS] Dine In clicked, but Restaurant Mode is disabled in HA POS Settings."
              );
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            handleDineInClick();
          }}
        >
          <input
            type="radio"
            name="order-type"
            value="dine-in"
            checked={isDineInSelected}
            className="peer sr-only"
            onChange={() => {}}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
          <span className="rounded-full border px-3 py-1 text-sm font-medium transition-colors peer-checked:bg-slate-900 peer-checked:text-white">
            Dine In
          </span>
        </label>

        <label className="cursor-pointer">
          <input
            type="radio"
            name="order-type"
            value="take-away"
            checked={!isDineInSelected}
            className="peer sr-only"
            onChange={() => {}}
            onClick={handleTakeAwayClick}
          />
          <span className="rounded-full border px-3 py-1 text-sm font-medium transition-colors peer-checked:bg-slate-900 peer-checked:text-white">
            Take Away
          </span>
        </label>

        <button
          onClick={handleLaybyClick}
          disabled={laybySaving}
          className="rounded-full border px-3 py-1 text-sm font-medium transition-colors bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {laybySaving ? "Saving..." : "Layby"}
        </button>
      </div>
      )}

      {/* Right: new receipt options */}
      {/* <div className="flex items-center gap-2">
        {["Default Receipt", "Prebill", "Table Order", "Prebill Payment"].map((label) => {
          const value = label.toLowerCase().replace(/\s+/g, "-");
          return (
            <label key={label} className="cursor-pointer">
             <input
              type="radio"
              name="receipt-type"
              value={value}
              className="peer sr-only"
              checked={selectedReceipt === value}
              onChange={() => setSelectedReceipt(value)}
            />
              <span className="rounded-full border px-3 py-1 text-sm font-medium transition-colors peer-checked:bg-slate-900 peer-checked:text-white">
                {label}
              </span>
            </label>
          );
        })}
</div> */}

    </div>

    {/* Menu goes inside col-span-6 */}
    <Menu />
  </div>

  {/* Right cart */}
  <div className="col-span-3 min-w-0">
    <Cart />
  </div>
</div>

       
      </Container>
    </MenuProvider>
  );
};

export default MenuPage;
