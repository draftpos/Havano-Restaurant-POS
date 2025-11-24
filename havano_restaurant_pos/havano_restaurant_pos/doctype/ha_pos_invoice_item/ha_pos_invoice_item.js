// frappe.ui.form.on('Ha Pos Invoice Item', {
// 	qty: function(frm, cdt, cdn) {
// 		calculate_amount(frm, cdt, cdn);
// 		calculate_stock_qty(frm, cdt, cdn);
// 	},
	
// 	rate: function(frm, cdt, cdn) {
// 		calculate_amount(frm, cdt, cdn);
// 	},
	
// 	conversion_factor: function(frm, cdt, cdn) {
// 		calculate_stock_qty(frm, cdt, cdn);
// 	},
	
// 	item_code: function(frm, cdt, cdn) {
// 		let row = locals[cdt][cdn];
// 		if (row.item_code) {
// 			// Fetch item details
// 			frappe.call({
// 				method: 'frappe.client.get_value',
// 				args: {
// 					doctype: 'Item',
// 					filters: { name: row.item_code },
// 					fieldname: ['item_name', 'description', 'stock_uom', 'default_warehouse', 'last_purchase_rate']
// 				},
// 				callback: function(r) {
// 					if (r.message) {
// 						row.item_name = r.message.item_name;
// 						row.uom = r.message.stock_uom;
// 						row.description = r.message.description;
// 						if (!row.warehouse) {
// 							row.warehouse = r.message.default_warehouse;
// 						}
// 						if (!row.rate) {
// 							row.rate = r.message.last_purchase_rate || 0;
// 						}
// 						if (!row.conversion_factor) {
// 							row.conversion_factor = 1.0;
// 						}
// 						frm.refresh_field('items');
// 					}
// 				}
// 			});
// 		}
// 	}
// });

// function calculate_amount(frm, cdt, cdn) {
// 	let row = locals[cdt][cdn];
// 	if (row.qty && row.rate) {
// 		row.amount = flt(row.qty) * flt(row.rate);
// 		frm.refresh_field('amount', cdn);
// 	}
// }

// function calculate_stock_qty(frm, cdt, cdn) {
// 	let row = locals[cdt][cdn];
// 	if (row.qty && row.conversion_factor) {
// 		row.stock_qty = flt(row.qty) * flt(row.conversion_factor);
// 		frm.refresh_field('stock_qty', cdn);
// 	}
// }



