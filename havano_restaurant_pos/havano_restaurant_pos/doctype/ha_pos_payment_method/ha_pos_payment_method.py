from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.utils import nowdate, getdate, flt, cint, now_datetime
from frappe import _
import json


class HAPOSPaymentMethod(Document):
    def validate(self):
        self.set_currency_from_account()
        self.set_exchange_rate()
    
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
    
    def set_exchange_rate(self):
        """Set exchange rate based on currency"""
        if not self.currency:
            self.exchange_rate = 1.0
            return
            
        # Get company currency from system settings or default company
        company_currency = frappe.get_cached_value("Company", frappe.defaults.get_user_default("Company"), "default_currency") or \
                          frappe.get_single_value("System Settings", "currency")
        
        if not company_currency or self.currency == company_currency:
            self.exchange_rate = 1.0
            return
        
        # Try to get latest exchange rate
        try:
            from erpnext.setup.utils import get_exchange_rate
            self.exchange_rate = get_exchange_rate(self.currency, company_currency, nowdate())
        except Exception:
            # If exchange rate not found, default to 1
            self.exchange_rate = 1.0
    
    def on_update(self):
        # Ensure currency symbol is updated when currency changes
        if self.currency:
            currency_symbol = frappe.db.get_value('Currency', self.currency, 'symbol')
            if currency_symbol:
                self.db_set('currency_symbol', currency_symbol)


@frappe.whitelist()
def get_currency_and_exchange_rate(mode_of_payment):
    """Get currency and exchange rate for a mode of payment"""
    result = {
        "currency": "",
        "currency_symbol": "",
        "exchange_rate": 1.0
    }
    
    if not mode_of_payment:
        return result
    
    # Get default account from Mode of Payment Account
    mode_of_payment_accounts = frappe.get_all('Mode of Payment Account',
        filters={'parent': mode_of_payment},
        fields=['default_account'],
        order_by='idx',
        limit=1
    )
    
    if not mode_of_payment_accounts or not mode_of_payment_accounts[0].default_account:
        return result
    
    default_account = mode_of_payment_accounts[0].default_account
    
    # Get currency from account
    account_currency = frappe.db.get_value('Account', default_account, 'account_currency')
    if not account_currency:
        return result
    
    result["currency"] = account_currency
    
    # Get currency symbol
    currency_symbol = frappe.db.get_value('Currency', account_currency, 'symbol')
    if currency_symbol:
        result["currency_symbol"] = currency_symbol
    
    # Get company currency
    company_currency = frappe.get_cached_value("Company", frappe.defaults.get_user_default("Company"), "default_currency") or \
                      frappe.get_single_value("System Settings", "currency")
    
    # Get exchange rate if currency is different from company currency
    if company_currency and account_currency != company_currency:
        try:
            from erpnext.setup.utils import get_exchange_rate
            from frappe.utils import nowdate
            result["exchange_rate"] = get_exchange_rate(account_currency, company_currency, nowdate())
        except Exception:
            # Default to 1 if exchange rate not found
            result["exchange_rate"] = 1.0
    else:
        result["exchange_rate"] = 1.0
    
    return result