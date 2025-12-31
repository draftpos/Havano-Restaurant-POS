// Copyright (c) 2025, Chipo and contributors
// For license information, please see license.txt

frappe.ui.form.on("HA POS Payment Method", {
	mode_of_payment: function(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (row.mode_of_payment) {
			frappe.call({
				method: "havano_restaurant_pos.havano_restaurant_pos.doctype.ha_pos_payment_method.ha_pos_payment_method.get_currency_and_exchange_rate",
				args: {
					mode_of_payment: row.mode_of_payment
				},
				callback: function(r) {
					if (r.message) {
						console.log(r.message);
						frappe.model.set_value(cdt, cdn, "currency", r.message.currency || "");
						frappe.model.set_value(cdt, cdn, "currency_symbol", r.message.currency_symbol || "");
						frappe.model.set_value(cdt, cdn, "exchange_rate", r.message.exchange_rate || 1);
					}
				}
			});
		} else {
			// Clear fields if mode_of_payment is cleared
			frappe.model.set_value(cdt, cdn, "currency", "");
			frappe.model.set_value(cdt, cdn, "currency_symbol", "");
			frappe.model.set_value(cdt, cdn, "exchange_rate", 1);
		}
	}
});

