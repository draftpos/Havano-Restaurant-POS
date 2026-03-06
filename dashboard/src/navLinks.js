import { isRestaurantMode } from "@/lib/utils";

const getNavLinks = async () => {
  const isRestMode = await isRestaurantMode();

  return [
    {
      name: "HOME",
      path: "/",
      active: isRestMode,
    },
    {
      name: "ORDERS",
      path: "/orders",
      active: isRestMode,
    },
    {
      name: isRestMode ? "TABLES" : "Saved Invoices",
      path: "/tables",
      active: true,
    },
    {
      name: "MENU",
      path: "/menu",
      active: true,
    },
    {
      name: "RETAIL",
      path: "/transaction",
      active: true,
    },
    {
      name: "CLOSE SHIFT",
      path: "",
      active: false,
    },
    {
      name: "OPTIONS",
      path: "",
      active: true,
      dropdown: [
        {
          name: "Reprint Invoice",
          action: () => setReprintDialogOpen(true),
        },
        {
          name: "Credit Note",
          action: () => console.log("Credit Note clicked"),
        },
      ],
    },
    {
      name: "Login/Logout",
      path: "/auth",
      active: true,
    },
  ];
};

export default getNavLinks;