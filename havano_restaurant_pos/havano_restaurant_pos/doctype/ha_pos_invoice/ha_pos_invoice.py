from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import nowdate, getdate, flt, cint, now_datetime
from frappe import _
import json

class HaPosInvoice(Document):
   pass



def get_pos_user_defaults():
    user = frappe.session.user

    settings = frappe.get_single("HA POS Settings")

    for row in settings.user_mapping:
        if row.user == user:
            return {
                "cost_center": row.cost_center,
                "price_list": row.price_list,
            }

    return None

def get_last_open_shift_for_current_user():
    current_user = frappe.session.user
    
    shift = frappe.get_all(
        "HA Shift POS",
        filters={
            "user": current_user,
            "status": "Open"
        },
        order_by="shift_start desc",
        limit_page_length=1
    )
    
    if shift:
        return shift[0]  # Last open shift
    else:
        return None      # No open shift found
 

@frappe.whitelist()
def create_sales_invoice(customer, items, price_list=None,change=None):
    """Create a new sales invoice"""
    import json
    import frappe

    try:
               
        last_shift = get_last_open_shift_for_current_user()
        print("Price List:", price_list)
        print("Customer:", customer)
        print("Items:", items)
        print("Change:", change)

        defaults = get_pos_user_defaults()
        if not defaults:
            frappe.throw("Logged-in user is not mapped in HA POS Settings")

        print("Cost center:", defaults.get("cost_center"))

        # Parse items if it's a JSON string (might come as string from JS)
        if isinstance(items, str):
            items = json.loads(items)

        invoice = frappe.get_doc({
            "doctype": "Sales Invoice",
            "customer": customer,
            "cost_center": defaults.get("cost_center"),
            "custom_shift_number": last_shift or "",
            "selling_price_list": defaults.get("price_list") or frappe.db.get_single_value("Selling Settings", "selling_price_list"),
            "custom_change": change,
            "items": []
        })
        
        # Add items
        for item_data in items:
            uom = item_data.get('uom')
            if isinstance(uom, set):
                uom = next(iter(uom))  # get the first item from the set
            invoice.append("items", {
                "item_code": item_data.get("item_code"),
                "qty": item_data.get("qty"),
                "rate": item_data.get("rate"),
                "cost_center": defaults.get("cost_center"),
                "custom_remarks": item_data.get("remarks") or "",
                "uom": uom
            })
        invoice.insert(ignore_permissions=True)
        invoice.submit()

        return {
            "success": True,
            "name": invoice.name,
            "total": invoice.grand_total,
            "posting_date": invoice.posting_date
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Create Sales Invoice Error")
        frappe.msgprint(
            title="Invoice Creation Failed",
            msg=str(e),
            indicator="red"
        )

        return {
            "success": False,
            "error": str(e)
        }
