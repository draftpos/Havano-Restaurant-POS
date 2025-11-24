import frappe
from frappe.model.document import Document
from frappe.utils import nowdate


class HavanoPOSEntry(Document):
    def validate(self):
        if self.amount and self.amount < 0:
            frappe.throw("Amount cannot be negative.")

        if not self.payment_method:
            frappe.throw("Payment Method is required.")

        # if self.shift_name:
        #     exists = frappe.db.exists(
        #         "Havano POS Shift",  
        #         {"shift_name": self.shift_name}
        #     )
        #     if not exists:
        #         frappe.throw(f"Shift {self.shift_name} does not exist.")






@frappe.whitelist()
def save_pos_entries(payments):
    print("incoming payment list------------------")
    print(payments)
    """
    Insert multiple Havano POS Entry records at once.
    `payments` should be a list of dicts with:
    invoice_number, invoice_date, payment_method, amount, currency, shift_number
    """
    if isinstance(payments, str):
        # if sent as JSON string, parse it
        import json
        payments = json.loads(payments)

    results = []
    for p in payments:
        # ✅ Basic validation
        if not p.get("shift_name"):
            frappe.throw("Shift number is required for POS Entry")
        if not p.get("payment_method"):
            frappe.throw("Payment method is required for POS Entry")
        if not p.get("amount") or float(p.get("amount")) <= 0:
            continue  # skip zero/negative payments

        # Create and insert document
        doc = frappe.get_doc({
            "doctype": "Havano POS Entry",
            "invoice_number": p.get("invoice_number"),
            "invoice_date": p.get("invoice_date") or nowdate(),
            "payment_method": p.get("payment_method"),
            "amount": p.get("amount"),
            "currency": p.get("currency") or "USD",
            "shift_name": p.get("shift_name")
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        results.append(doc.name)

    return {"created": results}














# @frappe.whitelist()
# def send_invoice_to_django_agent(docname):
#     print("send_invoice_to_django_agent   HAS RUN -----------------------------------")
#     import requests, base64

#     pdf_bytes = frappe.get_print("Sales Invoice", docname, "Standard", as_pdf=True)
#     pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")

#     url = "http://127.0.0.1:5002/api/save-invoice"
#     payload = {"name": docname, "pdf": pdf_b64}

#     resp = requests.post(url, json=payload, timeout=15)
#     resp.raise_for_status()
#     return resp.json()





# import frappe, os, base64

# @frappe.whitelist()
# def save_invoice_pdf(docname):
#     # Generate PDF bytes
#     pdf_data = frappe.get_print("Sales Invoice", docname, "Standard", as_pdf=True)

#     # Ensure folder exists
#     folder = frappe.get_site_path("public", "files", "InvoiceFolder")
#     os.makedirs(folder, exist_ok=True)

#     # Save file on server
#     file_path = os.path.join(folder, f"{docname}.pdf")
#     with open(file_path, "wb") as f:
#         f.write(pdf_data)

#     # Return relative URL (browser can open this)
#     return f"/files/InvoiceFolder/{docname}.pdf"


# import frappe, requests, json, os
# from frappe.utils import nowdate, now

# @frappe.whitelist()
# def send_invoice_json_to_agent(docname):
#     # Load Sales Invoice
#     doc = frappe.get_doc("Sales Invoice", docname)

#     # Build JSON structure
#     invoice_json = {
#         "CompanyLogoPath": "/files/logo.png",
#         "CompanyName": frappe.db.get_single_value("Global Defaults", "default_company"),
#         "CompanyAddress": frappe.db.get_value("Company", doc.company, "address") or "",
#         "postcode": "",
#         "waiter_id": "",   # fill if needed
#         "contact": doc.contact_display or "",
#         "CompanyEmail": frappe.db.get_value("Company", doc.company, "email") or "",
#         "TIN": "",   # optional
#         "VATNo": "",
#         "Tel": frappe.db.get_value("Company", doc.company, "phone_no") or "",
#         "InvoiceNo": doc.name,
#         "InvoiceDate": str(doc.posting_date),
#         "CashierName": frappe.session.user,
#         "CustomerName": doc.customer_name,
#         "Customeraddress": doc.customer_address or "",
#         "itemlist": [
#             {
#                 "ProductName": i.item_name,
#                 "productid": i.item_code,
#                 "Qty": float(i.qty),
#                 "Price": float(i.rate),
#                 "Amount": float(i.amount),
#                 "vat": float(i.taxes_and_charges or 0),
#             }
#             for i in doc.items
#         ],
#         "AmountTendered": str(doc.paid_amount or 0),
#         "Change": str((doc.paid_amount or 0) - (doc.grand_total or 0)),
#         "QRCodePath": "",
#         "QRCodePath2": "",
#         "Currency": doc.currency,
#         "Footer": "Thank you for your business!",
#         "MultiCurrencyDetails": [],
#         "DeviceID": frappe.local.site,
#         "FiscalDay": str(nowdate()),
#         "ReceiptNo": doc.name,
#         "CustomerRef": doc.customer or "",
#         "VCode": "",
#         "QRCode": "",
#         "DiscAmt": float(doc.discount_amount or 0),
#         "GrandTotal": float(doc.grand_total or 0),
#         "TaxType": "VAT",
#         "PaymentMode": ",".join([p.mode_of_payment for p in doc.payments]) if doc.payments else "",
#     }

  
#     resp = requests.post(
#         "http://127.0.0.1:5002/api/save-invoice-json",
#         json={"name": docname, "data": invoice_json},
#         timeout=15,
#     )

#     return resp.json()




