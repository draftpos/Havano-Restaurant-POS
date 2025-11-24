from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import flt

class HaPosInvoiceItem(Document):
    pass
    # def validate(self):
    #     self.calculate_amount()
    #     self.calculate_stock_qty()

    # def calculate_amount(self):
    #     """Calculate amount based on quantity and rate"""
    #     if self.qty and self.rate:
    #         self.amount = flt(self.qty) * flt(self.rate)

    # def calculate_stock_qty(self):
    #     """Calculate stock quantity based on conversion factor"""
    #     if self.qty and self.conversion_factor:
    #         self.stock_qty = flt(self.qty) * flt(self.conversion_factor)

    # def onload(self):
    #     """Set default values when loading"""
    #     if not self.conversion_factor:
    #         self.conversion_factor = 1.0