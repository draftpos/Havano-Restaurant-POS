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
def create_sales_invoice(customer, items, price_list=None, change=None, multi_currency_payments=None):
    """
    Create a Sales Invoice dynamically, handling single or multiple currencies.
    Converts item rates if using a single foreign currency; defaults to USD if multiple currencies.
    """
    import json
    import frappe

    try:
        # --- Get last open shift ---
        last_shift = get_last_open_shift_for_current_user()

        # --- Get POS user defaults ---
        defaults = get_pos_user_defaults()
        if not defaults:
            frappe.throw("Logged-in user is not mapped in HA POS Settings")

        # --- Parse items if JSON string ---
        if isinstance(items, str):
            items = json.loads(items)

        # --- Determine invoice currency and conversion rate ---
        currency = 'USD'
        conversion_rate = 1.0

        if multi_currency_payments and isinstance(multi_currency_payments, dict):
            if len(multi_currency_payments) == 1:
                # Single currency payment → use its currency and rate
                only_payment = list(multi_currency_payments.values())[0]
                currency = only_payment.get('currency', 'USD')
                conversion_rate = float(only_payment.get('rate', 1.0))
            else:
                # Multiple currencies → keep default USD
                currency = 'USD'
                conversion_rate = 1.0

        # --- Create invoice doc ---
        invoice = frappe.get_doc({
            "doctype": "Sales Invoice",
            "customer": customer,
            "cost_center": defaults.get("cost_center"),
            "custom_shift_number": last_shift or "",
            "selling_price_list": defaults.get("price_list") or frappe.db.get_single_value(
                "Selling Settings", "selling_price_list"
            ),
            "custom_change": change,
            "currency": currency,
            "conversion_rate": conversion_rate,
            "items": []
        })

        # --- Add items with proper conversion ---
        for item_data in items:
            uom = item_data.get('uom')
            if isinstance(uom, set):
                uom = next(iter(uom))

            rate = float(item_data.get("rate") or 0)
            qty = float(item_data.get("qty") or 1)

            # Convert rate if invoice currency is not USD
            if currency != 'USD':
                rate = rate * conversion_rate

            invoice.append("items", {
                "item_code": item_data.get("item_code"),
                "qty": qty,
                "rate": rate,
                "cost_center": defaults.get("cost_center"),
                "custom_remarks": item_data.get("remarks") or "",
                "uom": uom
            })

        # --- Insert and submit invoice ---
        invoice.insert(ignore_permissions=True)
        invoice.submit()

        return {
            "success": True,
            "name": invoice.name,
            "total": invoice.grand_total,
            "posting_date": invoice.posting_date,
            "currency": invoice.currency
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
