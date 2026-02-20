import frappe


def sales_invoice_before_submit(doc, method):
    """HA POS invoices use Payment Entry, not invoice.payments. Ensure is_pos=0 to skip POS validation."""
    if frappe.flags.get("havano_pos_invoice"):
        doc.is_pos = 0


def sales_invoice_on_submit(doc, method):
    """If can_print_invoice is enabled in HA POS Settings, notify client to trigger invoice download."""
    try:
        can_print = frappe.db.get_single_value("HA POS Settings", "can_print_invoice")
        if can_print and doc.docstatus == 1:
            frappe.publish_realtime(
                "havano_download_invoice",
                {"invoice_name": doc.name},
                user=frappe.session.user,
            )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "HA POS: sales_invoice_on_submit")


def update_standard_rate(doc, method):
    """
    Updates the Item's standard_rate when the Item Price
    for 'Standard Selling' price list is updated.
    """
    try:
        if doc.price_list == "Standard Selling":
            if not doc.item_code:
                frappe.throw("Item Code is missing in Item Price document")

            item = frappe.get_doc("Item", doc.item_code)

            item.standard_rate = doc.price_list_rate

            item.flags.ignore_validate = True
            item.flags.ignore_permissions = True
            item.save()


    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in update_standard_rate")
        frappe.throw(f"Error updating Item Standard Rate: {e}")
