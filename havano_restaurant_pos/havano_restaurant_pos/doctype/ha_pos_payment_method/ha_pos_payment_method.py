from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import nowdate, getdate, flt, cint, now_datetime
from frappe import _
import json


class HAPOSPaymentMethod(Document):
    def validate(self):
        self.set_currency_from_account()
    
    def set_currency_from_account(self):
        """Set currency based on the account"""
        if self.account:
            account_currency = frappe.db.get_value('Account', self.account, 'account_currency')
            if account_currency:
                self.currency = account_currency
                
        # If no account but mode_of_payment is set, try to get account from mode_of_payment
        elif self.mode_of_payment and not self.account:
            self.set_account_from_mode_of_payment()
    
    def set_account_from_mode_of_payment(self):
        """Set account from mode of payment if not already set"""
        from frappe.model import default_fields
        
        mode_of_payment_accounts = frappe.get_all('Mode of Payment Account',
            filters={'parent': self.mode_of_payment},
            fields=['default_account'],
            order_by='idx'
        )
        
        if mode_of_payment_accounts:
            self.account = mode_of_payment_accounts[0].default_account
            self.set_currency_from_account()
    
    def on_update(self):
        # Ensure currency symbol is updated when currency changes
        if self.currency:
            currency_symbol = frappe.db.get_value('Currency', self.currency, 'symbol')
            if currency_symbol:
                self.db_set('currency_symbol', currency_symbol)