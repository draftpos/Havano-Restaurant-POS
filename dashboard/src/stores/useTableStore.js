import { create } from "zustand";

import { db } from "@/lib/frappeClient";
import TableDetails from "@/pages/TableDetails";

export const useTableStore = create((set) => ({
	tables: [],
	floors: [],
	tableDetails: {},
	loadingTables: false,
	loadingFloors: false,
	loadingTableDetails: false,
	errorTables: null,
	errorFloors: null,
	errorTableDetails: null,

	fetchTables: async () => {
		set({ loadingTables: true, errorTables: null });
		try {
			const data = await db.getDocList("HA Table", {
				fields: ["name", "table_number", "capacity", "status", "floor"],
			});
			set({ tables: data, loadingTables: false });
		} catch (err) {
			console.error("Table fetch error:", err);
			set({ errorTables: err.message, loadingTables: false });
		}
	},

	fetchFloors: async () => {
		set({ loadingFloors: true, errorFloors: null });
		try {
			const data = await db.getDocList("HA Floor", {
				fields: ["name", "floor_name"],
			});
			set({ floors: data, loadingFloors: false });
		} catch (err) {
			console.error("Floor fetch error:", err);
			set({ errorFloors: err.message, loadingFloors: false });
		}
	},

	fetchTableDetails: async (tableName) => {
		set({ loadingTableDetails: true, errorTableDetails: null });
		try {
			const data = await db.getDoc("HA Table", tableName, {
				fields: [
					"name",
					"table_number",
					"capacity",
					"status",
					"floor",
					"assigned_waiter",
					"customer_name",
				],
			});
			set({ tableDetails: data, loadingTableDetails: false });
		} catch (err) {
			console.error("Table details fetch error:", err);
			set({ errorTableDetails: err.message, loadingTableDetails: false });
		}
	},
}));
