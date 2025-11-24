import frappe


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
