# Copyright (c) 2025, showline and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class HAOrder(Document):

    def before_save(self):
        self.calculate_total_amount()

    def on_cancel(self):
        if self.sales_invoice:
            frappe.delete_doc("Sales Invoice", self.sales_invoice)

    def on_trash(self):
        self.delete_linked_child_rows()

    def delete_linked_child_rows(self):
        linked_rows = frappe.get_all(
            "HA Table Order", filters={"order": self.name}, fields=["name", "parent"]
        )

        for row in linked_rows:
            parent_doc = frappe.get_doc("HA Table", row.parent)

            parent_doc.set(
                "table_order", [d for d in parent_doc.table_order if d.name != row.name]
            )

            parent_doc.save(ignore_permissions=True)

        frappe.db.commit()

        frappe.logger().info(
            f"✅ Cleaned up {len(linked_rows)} linked child rows for Order {self.name}"
        )

    def calculate_total_amount(self):
        total_amount = 0
        for item in self.order_items:
            total_amount += item.amount
        self.total_price = total_amount

    def create_invoice(self):
        sales_invoice = frappe.new_doc("Sales Invoice")
        default_take_away_customer = frappe.db.get_single_value(
            "Sample Pos Settings", "default_take_away_customer"
        )

        default_warehouse = frappe.db.get_single_value(
            "Stock Settings", "default_warehouse"
        )

        sales_invoice.update_stock = 1
        sales_invoice.set_warehouse = default_warehouse

        sales_invoice.customer = default_take_away_customer

        for item in self.order_items:
            sales_invoice.append(
                "items",
                {
                    "item_code": item.menu_item,
                    "qty": item.qty,
                    "rate": item.rate,
                    "amount": item.amount,
                },
            )
        sales_invoice.due_date = frappe.utils.nowdate()
        sales_invoice.insert()
        sales_invoice.submit()
        self.order_status = "Closed"
        # Submit order if not already submitted
        if self.docstatus == 0:
            self.submit()
        else:
            self.save(ignore_permissions=True)

        frappe.db.commit()


@frappe.whitelist()
def mark_as_paid(docname, sales_invoice=None):
    doc = frappe.get_doc("HA Order", docname)
    if doc.payment_status != "Unpaid":
        frappe.throw("This payment is already marked as Paid.")

    try:
        payment_entry = generate_payment_entry_from_sales_invoice(sales_invoice)
        doc.payment_entry = payment_entry.name
        doc.payment_status = "Paid"
        doc.save(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in mark_as_paid")
        frappe.errprint(f"Error marking as paid: {str(e)}")


def generate_payment_entry_from_sales_invoice(sales_invoice):
    sales_invoice_doc = frappe.get_doc("Sales Invoice", sales_invoice)
    customer_doc = frappe.get_doc("Customer", sales_invoice_doc.customer)
    default_account = frappe.db.get_single_value(
        "Sample Pos Settings", "default_account"
    )
    default_account_doc = frappe.get_doc("Account", default_account)
    try:
        payment_entry = frappe.new_doc("Payment Entry")
        payment_entry.payment_type = "Receive"
        payment_entry.posting_date = sales_invoice_doc.posting_date
        payment_entry.mode_of_payment = "Cash"
        payment_entry.party_type = "Customer"
        payment_entry.party = customer_doc.name
        payment_entry.party_name = customer_doc.customer_name
        payment_entry.paid_amount = sales_invoice_doc.grand_total
        payment_entry.received_amount = sales_invoice_doc.grand_total
        payment_entry.source_exchange_rate = 1
        payment_entry.target_exchange_rate = 1
        payment_entry.paid_to = default_account
        payment_entry.paid_to_account_currency = default_account_doc.account_currency
        payment_entry.cost_center = frappe.db.get_value(
            "Company", "Havano", "cost_center"
        )
        payment_entry.append(
            "references",
            {
                "reference_doctype": "Sales Invoice",
                "reference_name": sales_invoice,
                "allocated_amount": sales_invoice_doc.grand_total,
            },
        )

        payment_entry.insert()
        payment_entry.submit()
        return payment_entry
    except Exception as e:
        frappe.throw(str(e))
