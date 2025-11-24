import frappe
from frappe.model.document import Document
from frappe.utils import nowdate, flt

class HavanoPOSShift(Document):
    def autoname(self):
        self.name = frappe.model.naming.make_autoname("SHIFT-.YYYY.-.#####")
        self.shift_number = self.name

    def before_save(self):
        self.calculate_totals()
        self.calculate_difference()

    def calculate_totals(self):
        """Aggregate totals from Havano POS Entries linked to this shift."""
        entries = frappe.get_all(
            "Havano POS Entry",
            filters={"shift_name": self.name},
            fields=["amount", "payment_method"]
        )

        self.total_invoices = len(entries)

        # Reset child table
        self.set("payments", [])

        payment_totals = {}
        for entry in entries:
            method = entry.payment_method or "Unknown"
            payment_totals[method] = payment_totals.get(method, 0) + (entry.amount or 0)

        for method, total in payment_totals.items():
            self.append("payments", {
                "payment_method": method,
                "amount": total
            })

    def calculate_difference(self):
        """Calculate difference between expected closing and actual closing."""
        expected = (self.opening_amount or 0) + sum(p.amount for p in self.payments)
        closing = self.closing_amount or 0
        self.difference = closing - expected




import frappe
from frappe.utils import nowdate, flt

@frappe.whitelist()
def open_shift(openingAmount=None):
    """Mark a shift as open and set opening amount."""

    # Check if there is already an open shift
    existing_open = frappe.db.exists("Havano POS Shift", {"status": "open"})
    if existing_open:
        frappe.throw("You cannot open a new shift while another shift is still open.")

    # Make sure openingAmount is safely converted to a number
    opening_amount_value = flt(openingAmount) if openingAmount else 0

    # Create new shift document
    doc = frappe.new_doc("Havano POS Shift")
    doc.status = "open"
    doc.opening_amount = opening_amount_value
    doc.shift_date = nowdate()

    # Save the document ignoring user permissions
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": doc.name,
        "status": doc.status,
        "opening_amount": doc.opening_amount
    }




@frappe.whitelist()
def close_shift(shift_name: str, closing_amount: float = 0, payments: list | str = None):
    """Mark a shift as closed, save payments, and calculate totals/difference."""
    print("closing shift data -------------------------")
    print(shift_name)
    print(closing_amount)
    print(payments)
    if not frappe.db.exists("Havano POS Shift", shift_name):
        frappe.throw(f"Shift {shift_name} not found")

    if isinstance(payments, str):
        import json
        payments = json.loads(payments)

    doc = frappe.get_doc("Havano POS Shift", shift_name)
    doc.status = "closed"

    # Save closing amount
    if closing_amount:
        doc.closing_amount = closing_amount

    # Reset payments child table
    doc.set("payments", [])

    # Add payments from UI
    if payments:
        for p in payments:
            if not p.get("payment_method"):
                continue
            amount = float(p.get("amount") or 0)
            doc.append("payments", {
                "payment_method": p["payment_method"],
                "amount": amount
            })

    # Recalculate totals
    doc.calculate_totals()
    doc.calculate_difference()

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": doc.name,
        "status": doc.status,
        "closing_amount": doc.closing_amount,
        "difference": doc.difference,
        "total_invoices": doc.total_invoices,
        "payments": [{"method": p.payment_method, "amount": p.amount} for p in doc.payments],
    }
