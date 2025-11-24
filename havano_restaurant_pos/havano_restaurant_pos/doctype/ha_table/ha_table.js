// Copyright (c) 2025, showline and contributors
// For license information, please see license.txt

frappe.ui.form.on("HA Table", {
  refresh: function (frm) {
    frm.set_df_property("table_order", "cannot_add_rows", true);
  },
});
