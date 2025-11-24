import { ChevronsRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getBgColor } from "@/lib/utils";
import { useTransactionStore } from "@/stores/useTransactionStore";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";

const TransactionCategories = () => {
  const selectedCategory = useTransactionStore((state) => state.selectedCategory);
  const setSelectedCategory = useTransactionStore((state) => state.setSelectedCategory);
  const [categoryColors, setCategoryColors] = useState({});

  const categories = useMemo(() => [
    { name: "Quotation", label: "Quotation", doctype: "Quotation" },
  ], []);

  useEffect(() => {
    if (!categories.length) {
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

    if (!selectedCategory) {
      const firstCategory = categories[0];
      setSelectedCategory({
        id: firstCategory.name,
        name: firstCategory.label,
        doctype: firstCategory.doctype,
      });
    }
  }, [categories, selectedCategory, setSelectedCategory]);

  return (
    <>
      <Drawer>
        <DrawerTrigger className="flex gap-2 items-center text-primary text-lg pb-[2px] hover:pb-0 hover:border-b-2 hover:border-primary cursor-pointer">
          Sales Category
          <ChevronsRight />
        </DrawerTrigger>
        <DrawerContent side="left">
          <DrawerHeader>
            <DrawerTitle>Sales Category</DrawerTitle>
            <DrawerDescription>Select a category</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 mt-2 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-1 gap-4">
              {categories.map((category) => (
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
                      name: category.label,
                      doctype: category.doctype,
                    })
                  }
                >
                  <div className="flex justify-between items-center gap-2">
                    <h1 className="text-2xl text-white font-bold">
                      {category.label}
                    </h1>
                    {selectedCategory?.id === category.name && (
                      <div className="border-2 border-white p-1 rounded-full">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
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

export default TransactionCategories;

