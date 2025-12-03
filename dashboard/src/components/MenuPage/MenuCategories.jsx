import { useEffect, useMemo } from "react";

import { useMenuStore } from "@/stores/useMenuStore";
import { useCartStore } from "@/stores/useCartStore";

import { useSortedCategories } from "@/hooks/useSortedCategories";
import { useCategoryColors } from "@/hooks/useCategoryColors";
import { useCategoryCounts } from "@/hooks/useCategoryCounts";


const MenuCategories = () => {
  const { menuCategories, fetchMenuCategories } = useMenuStore();
  const selectedCategory = useCartStore((s) => s.selectedCategory);
  const setSelectedCategory = useCartStore((s) => s.setSelectedCategory);

  const categories = useSortedCategories(menuCategories);
  const categoryColors = useCategoryColors(categories);
  const categoryCounts = useCategoryCounts(categories);

  const visibleCategories = useMemo(
    () =>
      categories.filter((c) => {
        const count = categoryCounts[c.name];
        return count === undefined || count > 0;
      }),
    [categories, categoryCounts]
  );

  useEffect(() => {
    fetchMenuCategories();
  }, [fetchMenuCategories]);

  useEffect(() => {
    if (!visibleCategories.length) {
      setSelectedCategory(null);
      return;
    }

    setSelectedCategory((prev) => {
      if (prev?.id && visibleCategories.some((c) => c.name === prev.id)) {
        return prev;
      }
      const first = visibleCategories[0];
      return { id: first.name, name: first.category_name };
    });
  }, [visibleCategories, setSelectedCategory]);

  return (

        <div className="overflow-y-auto scrollbar-hide">
          <p className="text-xl text-black mb-2">Categories</p>
          <div className="grid grid-cols-1 gap-4">
            {visibleCategories.map((category) => (
              <div
                key={category.name}
                style={{ backgroundColor: categoryColors[category.name] }}
                className={`h-18 flex flex-col justify-between py-2 px-4 rounded-lg cursor-pointer ${
                  selectedCategory?.id === category.name
                    ? "ring-2 ring-white"
                    : ""
                }`}
                onClick={() =>
                  setSelectedCategory({
                    id: category.name,
                    name: category.category_name,
                  })
                }
              >
                <div className="flex justify-between items-center gap-2">
                  <h1 className="text-sm text-white font-bold">
                    {category.category_name}
                  </h1>

                  {selectedCategory?.id === category.name && (
                    <div className="border-2 border-white p-1 rounded-full">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-200">
                  {categoryCounts[category.name] ?? 0}{" "}
                  {categoryCounts[category.name] === 1 ? "item" : "items"}
                </p>
              </div>
            ))}
          </div>
        </div>
    //   </DrawerContent>
    // </Drawer>
  );
};

export default MenuCategories;
