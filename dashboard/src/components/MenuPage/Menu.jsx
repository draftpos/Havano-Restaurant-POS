import { Search, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";

import MenuItemCard from "@/components/MenuPage/MenuItemCard";
import { useMenuContext } from "@/contexts/MenuContext";

import { useAgents, useRooms } from "@/hooks";
import { isRoomDirectBookingsEnabled } from "@/lib/utils";
import ShiftDialog from "@/components/ui/ShiftDialog"; // adjust path if needed
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Combobox } from "../ui/combobox";
import { getUserSettings } from "@/lib/utils";

import NumPad from "./UpdateCartDialog";
import { Button } from "../ui/button";
import { toast, Toaster } from "sonner";

import { CreateProductBundleDialog } from "../ui/CreateProductBundleDialog";


const Menu = () => {
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftType, setShiftType] = useState("open"); // "open", "continue", "close"
  const [hasActiveShift, setHasActiveShift] = useState(true);
  const [roomBookingsEnabled, setRoomBookingsEnabled] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const {
    fetchMenuItems,
    selectedCategory,
    customer,
    transactionType,
    setTransactionType,
    setCustomer,
    searchTerm,
    setSearchTerm,
    customers,
    loading: loadingCustomers,
    fetchCustomers,
    availableTransactionTypes,
    filteredItems,
    addToCart,
    selectedAgent,
    setSelectedAgent,
    target,
    setTarget,
    menuGridRef,
    currentIndex,
  } = useMenuContext();

  const {
		agents,
		isFetchingAgents,
		fetchAgents,
	} = useAgents();

  const { rooms, loading: loadingRooms, fetchRooms } = useRooms();

  const [openMixDialog, setOpenMixDialog] = useState(false);
  
  const searchInputRef = useRef(null);

   useEffect(() => {
     if (target === "menu") {
       requestAnimationFrame(() => {
         menuGridRef.current?.scrollTo({
           top: 0,
           behavior: "smooth",
         });
       });
     }
   }, [target]);

  
  useEffect(() => {
    async function checkUserSettings() {
      const userSettings = await getUserSettings();

      // If empty, user is not mapped
      if (!userSettings || userSettings.length === 0) {
          toast.error("Error: No user settings found for this user");
        }
    }

    checkUserSettings();
  }, []); // run once on mount


  useEffect(() => {
    if (!openMixDialog) {
      searchInputRef.current?.focus();
    }
  }, [openMixDialog]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  useEffect(() => {
    const checkRoomBookings = async () => {
      const enabled = await isRoomDirectBookingsEnabled();
      setRoomBookingsEnabled(Boolean(enabled));
    };
    checkRoomBookings();
  }, []);

  useEffect(() => {
    if (selectedRoom && selectedRoom.customer) {
      setCustomer(selectedRoom.customer);
    }
  }, [selectedRoom, setCustomer]);

  useEffect(() => {
    const handleF3Click = (event) => {
      if (event.key === "F3") {
        event.preventDefault();
        setOpenMixDialog(true);
      }
    };
    window.addEventListener("keydown", handleF3Click);
    return () => {
      window.removeEventListener("keydown", handleF3Click);
    }
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown" && target === "menu") {
        e.preventDefault();

        menuGridRef.current?.scrollBy({
          top: 150, // scroll amount
          behavior: "smooth",
        });
      }

      if (e.key === "ArrowUp" && target === "menu") {
        e.preventDefault();

        menuGridRef.current?.scrollBy({
          top: -150,
          behavior: "smooth",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [target]);

  useEffect(() => {
    const handleF1Click = (event) => {
      if (event.key === "F1") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchTerm("");
        setTarget("menu");
      }
    };
    window.addEventListener("keydown", handleF1Click);
    return () => {
      window.removeEventListener("keydown", handleF1Click);
    };
  }, []);

  useEffect(() => {
    if (openMixDialog){
      setTarget("");
    }else{
      setTarget("menu");
    }
  }, [openMixDialog])

useEffect(() => {
  const fetchShiftStatus = async () => {
    try {
      const res = await fetch("/api/method/havano_restaurant_pos.api.get_user_shift_status", {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();
      // console.log("Shift status response:", data);

      const status = data.message?.status || "open";
      setShiftType(status);

      // show dialog only if user can open or continue shift
      if (status === "open" || status === "continue") {
        setShiftDialogOpen(true);
      } else {
        setShiftDialogOpen(false); // shift is recent, no need to force
      }

    } catch (err) {
      console.error("Failed to fetch shift status:", err);
    }
  };

  fetchShiftStatus();
}, []);


  
  return (
    <>
      <NumPad isOpen={false} setIsOpen={() => {}} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-between min-w-0">
        <p className="text-2xl my-4 shrink-0">{selectedCategory?.name || "Menu"}</p>

        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1 justify-end">
          <Button
            variant={"outline"}
            onClick={() => setOpenMixDialog(true)}
            className="w-[100px] font-extrabold"
          >
            Mix (F3)
          </Button>

          <Select
            value={transactionType}
            onValueChange={setTransactionType}
            disabled={availableTransactionTypes.length === 0}
            onOpenChange={(open) => {
              if (!open && target === "menu") {
                requestAnimationFrame(() => {
                  searchInputRef.current?.focus();
                });
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              {availableTransactionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Combobox
            type="agent"
            options={agents.map((agent) => ({
              value: agent.name,
              name: agent.name,
              label: agent.full_name,
            }))}
            value={selectedAgent}
            onValueChange={setSelectedAgent}
            placeholder={
              isFetchingAgents ? "Loading agents..." : "Select agent"
            }
            searchPlaceholder="Search agent..."
            disabled={isFetchingAgents}
            className="w-[200px]"
            onCreate
            onCreated={(newAgent) => {
              fetchAgents();
              setSelectedAgent(newAgent.value);
            }}
            onOpenChange={(open) => {
              if (!open && target === "menu") {
                requestAnimationFrame(() => {
                  searchInputRef.current?.focus();
                });
              }
            }}
          />
          <Combobox
            type="customer"
            options={customers.map((cust) => ({
              value: cust.name,
              name: cust.name,
              customer_name: cust.customer_name,
              label: cust.customer_name || cust.name,
            }))}
            value={customer}
            onValueChange={(value) => {
              setCustomer(value);
              // Clear room selection when customer is manually changed
              if (value && selectedRoom) {
                setSelectedRoom(null);
              }
            }}
            placeholder={loadingCustomers ? "Loading..." : "Select customer"}
            searchPlaceholder="Search customers..."
            disabled={loadingCustomers}
            className="w-[200px]"
            onCreate
            onCreated={(newCustomer) => {
              fetchCustomers();
              setCustomer(newCustomer.value);
            }}
            onOpenChange={(open) => {
              if (!open && target === "menu") {
                requestAnimationFrame(() => {
                  searchInputRef.current?.focus();
                });
              }
            }}
          />
          {roomBookingsEnabled && (
            <Combobox
              type="room"
              options={rooms.map((room) => ({
                value: room.name,
                name: room.name,
                label: `Room ${room.room_number}${room.guest_name ? ` - ${room.guest_name}` : ""}`,
                room_number: room.room_number,
                customer: room.customer,
                customer_name: room.customer_name,
              }))}
              value={selectedRoom?.name || ""}
              onValueChange={(value) => {
                if (value) {
                  const room = rooms.find((r) => r.name === value);
                  if (room) {
                    setSelectedRoom(room);
                    if (room.customer) {
                      setCustomer(room.customer);
                    }
                  }
                } else {
                  setSelectedRoom(null);
                }
              }}
              placeholder={loadingRooms ? "Loading..." : "Select room"}
              searchPlaceholder="Search rooms..."
              disabled={loadingRooms}
              className="w-[200px]"
              onOpenChange={(open) => {
                if (open) {
                  fetchRooms();
                }
                if (!open && target === "menu") {
                  requestAnimationFrame(() => {
                    searchInputRef.current?.focus();
                  });
                }
              }}
            />
          )}
          <div className="flex items-center bg-background px-2 py-1 rounded-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
            <input
              type="text"
              ref={searchInputRef}
              autoFocus
              placeholder="Search"
              className="w-[200px] focus:outline-none focus:ring-0 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredItems.length > 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  const index = Math.min(currentIndex, filteredItems.length - 1);
                  if (index < 0) return;
                  const item = filteredItems[index];
                  addToCart({
                    name: item.name,
                    item_name: item.item_name,
                    custom_menu_category: item.custom_menu_category,
                    quantity: 1,
                    price: item.standard_rate ?? item.price ?? 0,
                    standard_rate: item.standard_rate ?? item.price ?? 0,
                    remark: "",
                  });
                }
              }}
              onBlur={(e) => {
                // if (target !== "menu") return;

                const nextFocused = e.relatedTarget;

                // If focus is moving to a button / select / combobox, do nothing
                if (
                  nextFocused &&
                  nextFocused.closest(
                    "[data-radix-select-trigger], [data-combobox], button, input"
                  )
                ) {
                  return;
                }

                setTimeout(() => {
                  searchInputRef.current?.focus();
                }, 0);
              }}
            />
            {searchTerm.length > 0 ? (
              <X
                className="text-primary cursor-pointer"
                onClick={() => setSearchTerm("")}
              />
            ) : (
              <Search className="text-primary" />
            )}
          </div>
        </div>
      </div>

      <div
        ref={menuGridRef}
        className="grid grid-cols-5 gap-4 max-h-[80vh] overflow-y-auto scrollbar p-4"
      >
        {filteredItems.map((item, index) => (
          <MenuItemCard key={item.name} item={item} index={index} />
        ))}
      </div>

      <CreateProductBundleDialog
        open={openMixDialog}
        onOpenChange={setOpenMixDialog}
        onCreated={(item) => {
          addToCart(item);
          setOpenMixDialog(false);
        }}
      />
      <ShiftDialog
      open={shiftDialogOpen}
      type={shiftType}
      onOpenChange={setShiftDialogOpen}
      // onShiftAction={(action, msg) => console.log(action, msg)}
    />
    </>
  );
};


export default Menu;
