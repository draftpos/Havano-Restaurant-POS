import Cart from "@/components/MenuPage/Cart";
import Menu from "@/components/MenuPage/Menu";
import MenuCategories from "@/components/MenuPage/MenuCategories";
import Container from "@/components/Shared/Container";
import { useCartStore } from "@/stores/useCartStore";
import { useNavigate } from "react-router-dom";

const MenuPage = () => {
  const navigate = useNavigate();
  const { startNewTakeAwayOrder, activeTableId } = useCartStore();
  const isDineInSelected = Boolean(activeTableId);

  const handleDineInClick = () => {
    navigate("/tables");
  };

  const handleTakeAwayClick = () => {
    startNewTakeAwayOrder();
  };

  return (
    <Container>
      <div className="grid grid-cols-7 gap-4 relative z-0">
        <div className="col-span-5">
          <div className="flex items-center gap-4">
            <MenuCategories />
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="order-type"
                  value="dine-in"
                  checked={isDineInSelected}
                  className="peer sr-only"
                  onChange={() => {}}
                  onClick={handleDineInClick}
                />
                <span className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 transition-colors peer-checked:border-slate-900 peer-checked:bg-slate-900 peer-checked:text-white">
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
                <span className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 transition-colors peer-checked:border-slate-900 peer-checked:bg-slate-900 peer-checked:text-white">
                  Take Away
                </span>
              </label>
            </div>
          </div>
          <Menu />
        </div>
        <div className="col-span-2">
          <Cart />
        </div>
      </div>
    </Container>
  );
};

export default MenuPage;
