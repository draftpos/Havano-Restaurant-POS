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
			name: "TABLES",
			path: "/tables",
			active: isRestMode,
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
			name: "Login/Logout",
			path: "/auth",
			active: true,
		},
	];
};

export default getNavLinks;
