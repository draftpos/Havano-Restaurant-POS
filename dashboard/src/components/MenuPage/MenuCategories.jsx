import { useMenuContext } from "@/contexts/MenuContext";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const MenuCategories = () => {
  const {
    selectedCategory,
    categoryColors,
    categoryCounts,
    visibleCategories,
    setSelectedCategory,
    target,
    setTarget,
    currentIndex,
    setCurrentIndex,
  } = useMenuContext();

  useEffect(() => {
    const handleEnterKey = (event) => {
      if (event.key === "Enter" && target === "category") {
        const category = visibleCategories[currentIndex];
        if (category) {
          setSelectedCategory({
            id: category.name,
            name: category.category_name,
          });
        }
      }
    };

    window.addEventListener("keydown", handleEnterKey);
    return () => {
      window.removeEventListener("keydown", handleEnterKey);
    };
  }, [target, currentIndex]);


  return (
    <div className="overflow-y-auto max-h-[80vh] scrollbar-hide">
      <p className="text-xl text-black mb-2">Categories</p>
      <div className="grid grid-cols-1 gap-4">
        {visibleCategories.map((category, index) => (
          <div
            key={category.name}
            style={{
              backgroundColor:
                target === "category" && index === currentIndex
                  ? "#52e0a0"
                  : categoryColors[category.name],
            }}
            className={cn(
              "relative h-18 flex flex-col justify-between py-2 px-4 rounded-lg cursor-pointer text-white transition-all duration-150 overflow-hidden",

              target === "category" &&
                index === currentIndex &&
                "border-1 border-primary shadow-[0_0_40px_rgba(255,255,255,0.5)]"
            )}
            onClick={() =>{
              if (target === "category" && index === currentIndex) return;
              setSelectedCategory({
                id: category.name,
                name: category.category_name,
              })}
            }
          >
            <div className="flex justify-between items-center gap-2">
              <h1 className="text-sm font-bold">{category.category_name}</h1>

              {selectedCategory?.id === category.name && (
                <div className="border-2 border-white p-1 rounded-full">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              )}
            </div>
            <p className="text-sm">
              {categoryCounts[category.name] ?? 0}{" "}
              {categoryCounts[category.name] === 1 ? "item" : "items"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuCategories;
