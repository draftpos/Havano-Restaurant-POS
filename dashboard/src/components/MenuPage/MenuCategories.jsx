import { ChevronsRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getBgColor, getNumberOfItems } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { useMenuStore } from "@/stores/useMenuStore";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";

const MenuCategories = () => {
  const { menuCategories, fetchMenuCategories } = useMenuStore();
  const [categoryColors, setCategoryColors] = useState({});
  const [categoryCounts, setCategoryCounts] = useState({});
  const selectedCategory = useCartStore((state) => state.selectedCategory);
  const setSelectedCategory = useCartStore((state) => state.setSelectedCategory);

  const categories = useMemo(() => {
    if (!menuCategories) {
      return [];
    }
    return [...menuCategories].sort((a, b) => {
      const labelA = a.category_name || a.name || "";
      const labelB = b.category_name || b.name || "";
      return labelA.localeCompare(labelB, undefined, { sensitivity: "base" });
    });
  }, [menuCategories]);
  const visibleCategories = useMemo(
    () =>
      categories.filter((category) => {
        const count = categoryCounts[category.name];
        return count === undefined || count > 0;
      }),
    [categories, categoryCounts]
  );

  useEffect(() => {
    fetchMenuCategories();
  }, [fetchMenuCategories]);

  useEffect(() => {
    if (!categories.length) {
      setSelectedCategory(null);
      return;
    }

    setCategoryColors((prevColors) => {
      const nextColors = { ...prevColors };
      categories.forEach((category) => {
        if (!nextColors[category.name]) {
          nextColors[category.name] = getBgColor();
        }
      });
      return nextColors;
    });
    if (!visibleCategories.length) {
      setSelectedCategory(null);
      return;
    }

    setSelectedCategory((prevSelected) => {
      if (
        prevSelected &&
        prevSelected.id &&
        visibleCategories.some((category) => category.name === prevSelected.id)
      ) {
        return prevSelected;
      }
      const firstCategory = visibleCategories[0];
      return {
        id: firstCategory.name,
        name: firstCategory.category_name,
      };
    });
  }, [categories, visibleCategories, setSelectedCategory]);

  useEffect(() => {
    if (!categories.length) {
      return;
    }

    let isCancelled = false;

    const loadCounts = async () => {
      const entries = await Promise.all(
        categories.map(async (category) => {
          const count = await getNumberOfItems(category.name);
          return [category.name, count];
        })
      );

      if (!isCancelled) {
        setCategoryCounts((prevCounts) => ({
          ...prevCounts,
          ...Object.fromEntries(entries),
        }));
      }
    };

    loadCounts();

    return () => {
      isCancelled = true;
    };
  }, [categories]);

  return (
    <>
      <Drawer>
        <DrawerTrigger className="flex gap-2 items-center text-primary text-lg pb-[2px] hover:pb-0 hover:border-b-2 hover:border-primary cursor-pointer">
          Menu Categories
          <ChevronsRight />
        </DrawerTrigger>
        <DrawerContent side="left">
          <DrawerHeader>
            <DrawerTitle>Menu Categories</DrawerTitle>
            <DrawerDescription>Select a category</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 mt-2 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-1 gap-4">
              {visibleCategories.map((category) => (
                <div
                  key={category.name}
                  style={{ backgroundColor: categoryColors[category.name] }}
                  className={`flex flex-col p-4 rounded-lg h-[100px] cursor-pointer ${
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
                    <h1 className="text-2xl text-white font-bold">
                      {category.category_name}
                    </h1>
                    {selectedCategory?.id === category.name && (
                      <div className="border-2 border-white p-1 rounded-full">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 mt-4">
                      {categoryCounts[category.name] ?? 0} {
                        categoryCounts[category.name] === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MenuCategories;
