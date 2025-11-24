// Copyright (c) 2025, showline and contributors
// For license information, please see license.txt

frappe.ui.form.on("HA Order", {
	refresh: function (frm) {
		showMarkAsPaidButton(frm);
	},

	calculate_totals: function (frm) {
		let total = 0;
		(frm.doc.order_items || []).forEach((item) => {
			total += item.amount || 0;
		});
		frm.set_value("total_price", total);
	},
});

function showMarkAsPaidButton(frm) {
	if (frm.doc.docstatus === 1 && frm.doc.payment_status === "Unpaid") {
		frm.add_custom_button("Mark as Paid", () => {
			frappe.call({
				method: "havano_restaurant_pos.havano_restaurant_pos.doctype.ha_order.ha_order.mark_as_paid",
				args: {
					docname: frm.doc.name,
					sales_invoice: frm.doc.sales_invoice || null,
				},
				callback: function (r) {
					if (!r.exc) {
						frappe.msgprint(__("Payment marked as Paid."));
						frm.reload_doc();
					}
				},
			});
		}).addClass("btn-success");
	}
}

frappe.ui.form.on("HA Order Item", {
	qty: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		row.amount = (row.rate || 0) * (row.qty || 0);
		frm.refresh_field("order_items");
		frm.trigger("calculate_totals");
	},
});
