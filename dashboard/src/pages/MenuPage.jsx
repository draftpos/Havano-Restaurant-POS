import { useEffect, useState } from "react";
import { isRestaurantMode } from "@/lib/utils";
import Cart from "@/components/MenuPage/Cart";
import Menu from "@/components/MenuPage/Menu";
import MenuCategories from "@/components/MenuPage/MenuCategories";
import Container from "@/components/Shared/Container";
import { useCartStore } from "@/stores/useCartStore";
import { useNavigate } from "react-router-dom";
import { MenuProvider } from "@/contexts/MenuContext";

const MenuPage = () => {
  const navigate = useNavigate();
  const { startNewTakeAwayOrder, activeTableId } = useCartStore();
  const isDineInSelected = Boolean(activeTableId);

  const [isRestMode, setIsRestMode] = useState(false);
  const [loadingMode, setLoadingMode] = useState(true);

  const { selectedReceipt, setSelectedReceipt } = useCartStore();

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

  const handleTakeAwayClick = () => {
    startNewTakeAwayOrder();
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
  <div className="col-span-6">
    <div className="flex items-center gap-4 justify-between">
      {/* Left: Dine In / Take Away */}
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
      </div>

      {/* Right: new receipt options */}
      <div className="flex items-center gap-2">
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
</div>

    </div>

    {/* Menu goes inside col-span-6 */}
    <Menu />
  </div>

  {/* Right cart */}
  <div className="col-span-2">
    <Cart />
  </div>
</div>

       
      </Container>
    </MenuProvider>
  );
};

export default MenuPage;
