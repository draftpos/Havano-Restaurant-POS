// // Child table events
// frappe.ui.form.on('Ha Pos Invoice Item', {
// 	qty: function(frm, cdt, cdn) {
// 		calculate_amount(frm, cdt, cdn);
// 		frm.events.calculate_totals(frm);
// 	},
	
// 	rate: function(frm, cdt, cdn) {
// 		calculate_amount(frm, cdt, cdn);
// 		frm.events.calculate_totals(frm);
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
// 					fieldname: ['item_name', 'description', 'stock_uom', 'default_warehouse']
// 				},
// 				callback: function(r) {
// 					if (r.message) {
// 						row.item_name = r.message.item_name;
// 						row.uom = r.message.stock_uom;
// 						row.description = r.message.description;
// 						if (!row.warehouse) {
// 							row.warehouse = r.message.default_warehouse;
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



