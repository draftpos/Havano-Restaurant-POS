from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import nowdate, getdate, flt, cint, now_datetime
from frappe import _
import json

class HaPosInvoice(Document):
   pass

@frappe.whitelist()
def create_sales_invoice(customer, items, price_list=None):
    """Create a new sales invoice"""
    import json
    
    # Debug prints
    print("SAVING INVOICE --------------------------")
    print("Price List:", price_list)
    print("Customer:", customer)
    print("Items:", items)
    
    # Parse items if it's a JSON string (might come as string from JS)
    if isinstance(items, str):
        items = json.loads(items)
    
    # Create a new sales invoice
    invoice = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": customer,
        "price_list": price_list or frappe.db.get_single_value("Selling Settings", "selling_price_list"),
        "items": []
    })
    
    # Add items to the invoice
    for item_data in items:
        invoice.append("items", {
            "item_code": item_data.get("item_code"),
            "qty": item_data.get("qty"),
            "rate": item_data.get("rate")
        })
    
    # Insert and submit the invoice
    invoice.insert()
    invoice.submit()


    # payment_summary = frappe.new_doc("Ha Pos Payment Summary")
    # payment_summary.customer = customer
    # payment_summary.sales_invoice_link = invoice
    # payment_summary.payment_method = "1100 - Cash In Hand - ESH"
    # payment_summary.account = "1100 - Cash In Hand - ESH"
    # payment_summary.amount = 400.3 
    # payment_summary.user = user

    # payment_summary.insert()
        
    return {
        "name": invoice.name,
        "total": invoice.grand_total,
        "posting_date": invoice.posting_date
    }