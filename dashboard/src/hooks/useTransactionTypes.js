import { useEffect, useState } from "react";
import { getUserTransactionTypes, getPharmacyUserSettings } from "@/lib/utils";

export default function useTransactionTypes(currentType, setTransactionType) {
	const [availableTypes, setAvailableTypes] = useState(["Sales Invoice", "Quotation"]);

	useEffect(() => {
		const fetchTypes = async () => {
			try {
				const [txTypes, pharmacySettings] = await Promise.all([
					getUserTransactionTypes(),
					getPharmacyUserSettings(),
				]);
				const { types, defaultType } = txTypes;
				setAvailableTypes(types);

				// Pharmacist with pharmacy activated: default to Quotation (retail POS)
				let effectiveDefault = defaultType;
				if (pharmacySettings.pharmacy_activated && pharmacySettings.is_pharmacist && types.includes("Quotation")) {
					effectiveDefault = "Quotation";
				}

				if (effectiveDefault && (!currentType || !types.includes(currentType))) {
					setTransactionType(effectiveDefault);
				}
			} catch (err) {
				console.error("Error loading transaction types:", err);
			}
		};
		fetchTypes();
	}, [currentType, setTransactionType]);

	return availableTypes;
}
