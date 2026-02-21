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
        # Return docname string only - get_all returns list of dicts, Link fields need string
        s = shift[0]
        return s.get("name") if isinstance(s, dict) else s
    return None

@frappe.whitelist()
def create_sales_invoice(customer, items, price_list=None, change=None, multi_currency_payments=None, insert_only=False):
    """
    Create a Sales Invoice dynamically, handling single or multiple currencies.
    Converts item rates if using a single foreign currency; defaults to USD if multiple currencies.
    If insert_only=True, only inserts (no submit) - caller must submit later.
    """
    import json
    import frappe

    try:

        def get_usd_exchange_rate(to_currency):
            """Return exchange rate from USD to the given currency"""
            if not to_currency or to_currency.upper() == "USD":
                return 1.0

            rate = frappe.db.get_value(
                "Currency Exchange",
                {"from_currency": "USD", "to_currency": to_currency.upper()},
                "exchange_rate"
            )
            if not rate:
                frappe.throw(f"No exchange rate found for USD → {to_currency.upper()}")
            return float(rate)
        # --- Get last open shift ---
        last_shift = get_last_open_shift_for_current_user()

        # --- Get POS user defaults ---
        defaults = get_pos_user_defaults()
        if not defaults:
            frappe.throw("Logged-in user is not mapped in HA POS Settings")

        # --- Parse items if JSON string ---
        if isinstance(items, str):
            items = json.loads(items)

        # --- Merge duplicate items (same item_code, rate, uom) to reduce validation work ---
        merged = {}
        for i in items:
            ic = i.get("item_code") or i.get("menu_item")
            if not ic:
                continue
            uom = i.get("uom")
            if isinstance(uom, set):
                uom = next(iter(uom)) if uom else None
            rate = float(i.get("rate") or 0)
            qty = float(i.get("qty") or 1)
            key = (str(ic), rate, uom or "")
            if key not in merged:
                merged[key] = {"item_code": ic, "qty": qty, "rate": rate, "remarks": i.get("remarks") or "", "uom": uom}
            else:
                merged[key]["qty"] += qty
        items = list(merged.values())

        # --- Pre-fetch item details in bulk (single query) to speed up validation ---
        unique_item_codes = list({i.get("item_code") for i in items if i.get("item_code")})
        item_details_map = {}
        if unique_item_codes:
            item_rows = frappe.get_all(
                "Item",
                filters={"name": ["in", unique_item_codes]},
                fields=["name", "item_name", "stock_uom", "description"],
                limit_page_length=0,
            )
            item_details_map = {r["name"]: r for r in item_rows}
            # Warm cache so get_item_details hits cache instead of DB
            for code in unique_item_codes:
                try:
                    frappe.get_cached_doc("Item", code)
                except Exception:
                    pass

        # --- Determine invoice currency and conversion rate ---
        currency = 'USD'
        conversion_rate = 1.0

        if multi_currency_payments and isinstance(multi_currency_payments, dict):
            if len(multi_currency_payments) == 1:
                # Single currency payment → use its currency and rate
                only_payment = list(multi_currency_payments.values())[0]
                rate=get_usd_exchange_rate(only_payment.get('currency', 'USD'))
                currency = only_payment.get('currency', 'USD')
                conversion_rate = rate
            else:
                # Multiple currencies → keep default USD
                currency = 'USD'
                conversion_rate = 1.0

        # --- Create invoice doc ---
        # is_pos=0: we process payments via Payment Entry separately. POS invoices require payments on doc.
        invoice = frappe.get_doc({
            "doctype": "Sales Invoice",
            "is_pos": 0,
            "customer": customer,
            "cost_center": defaults.get("cost_center"),
            "custom_shift_number": last_shift or "",
            "selling_price_list": defaults.get("price_list") or frappe.db.get_single_value(
                "Selling Settings", "selling_price_list"
            ),
            "custom_change": change,
            "currency": currency,
            "ignore_pricing_rule": 1,  # Skip pricing rule lookup - rates come from cart
            "items": []
        })

        # --- Add items with proper conversion (use pre-fetched details to reduce validation work) ---
        for item_data in items:
            uom = item_data.get("uom")
            if isinstance(uom, set):
                uom = next(iter(uom))

            rate = float(item_data.get("rate") or 0)
            qty = float(item_data.get("qty") or 1)
            item_code = item_data.get("item_code")
            details = item_details_map.get(item_code, {})

            # Convert rate if invoice currency is not USD
            if currency != "USD":
                rate = rate * conversion_rate

            invoice.append("items", {
                "item_code": item_code,
                "item_name": details.get("item_name"),
                "qty": qty,
                "rate": rate,
                "cost_center": defaults.get("cost_center"),
                "custom_remarks": item_data.get("remarks") or "",
                "uom": uom or details.get("stock_uom"),
            })

        # --- Insert (and optionally submit) invoice ---
        invoice.insert(ignore_permissions=True)
        if not insert_only:
            frappe.flags.havano_pos_invoice = True
            try:
                invoice.submit()
            finally:
                frappe.flags.pop("havano_pos_invoice", None)

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
