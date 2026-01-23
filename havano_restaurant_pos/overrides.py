"""
Override for ERPNext trial balance currency conversion fix.

This module fixes the issue where trial balance was multiplying instead of dividing
when converting amounts from account currency to presentation currency.

Issue: When converting ZWG amounts back to USD in trial balance, it was multiplying
431.60 ZWG by exchange rate (33.2) to get 14,329.12 instead of dividing to get 13 USD.

Fix: Use debit_in_account_currency/credit_in_account_currency when account currency
differs from presentation currency, and convert FROM account currency TO presentation currency.
"""

import frappe
from frappe.utils import flt


# Flag to track if fix has been applied
_fix_applied = False


@frappe.whitelist()
def verify_trial_balance_fix():
    """
    Verify that the trial balance fix has been applied correctly.
    Returns status information about the fix.
    """
    try:
        from erpnext.accounts.report import utils as erpnext_utils
        import sys
        
        result = {
            "fix_applied": _fix_applied,
            "function_exists": hasattr(erpnext_utils, 'convert_to_presentation_currency'),
            "modules_checked": []
        }
        
        # Check if modules have the fixed function
        modules_to_check = [
            'erpnext.accounts.report.trial_balance.trial_balance',
            'erpnext.accounts.report.financial_statements',
        ]
        
        for module_name in modules_to_check:
            if module_name in sys.modules:
                module = sys.modules[module_name]
                has_function = hasattr(module, 'convert_to_presentation_currency')
                result["modules_checked"].append({
                    "module": module_name,
                    "loaded": True,
                    "has_function": has_function
                })
            else:
                result["modules_checked"].append({
                    "module": module_name,
                    "loaded": False,
                    "has_function": False
                })
        
        return result
    except Exception as e:
        return {
            "error": str(e),
            "fix_applied": _fix_applied
        }


def apply_trial_balance_fix():
    """
    Apply fix to convert_to_presentation_currency function in erpnext.accounts.report.utils
    
    This fix ensures that when converting from account currency (e.g., ZWG) to presentation 
    currency (e.g., USD), the system uses debit_in_account_currency/credit_in_account_currency
    and converts FROM account currency TO presentation currency, rather than incorrectly
    converting from presentation currency to company currency.
    
    This patch also updates modules that have already imported the function.
    """
    global _fix_applied
    
    if _fix_applied:
        return
    
    try:
        # Import here to ensure ERPNext is loaded
        from erpnext.accounts.report import utils as erpnext_utils
        import sys
        
        # Check if functions exist
        if not hasattr(erpnext_utils, 'convert_to_presentation_currency'):
            return
        if not hasattr(erpnext_utils, 'convert'):
            return
        
        # Store original functions
        original_convert = erpnext_utils.convert
        original_get_rate_as_at = erpnext_utils.get_rate_as_at
        
        def fixed_get_rate_as_at(date, from_currency, to_currency):
            """
            Fixed get_rate_as_at that handles inverse rates correctly.
            The issue: If rate stored is "USD to ZWG = 33.2" (1 USD = 33.2 ZWG),
            then get_exchange_rate(ZWG, USD) might return 0.0301 (1/33.2).
            But for conversion, we need 33.2, not 0.0301.
            
            Solution: If we get a small rate (< 1.0), check if inverse exists and use that.
            """
            # Try to get the direct rate first
            rate = original_get_rate_as_at(date, from_currency, to_currency)
            
            if from_currency != to_currency and rate:
                # If rate is less than 1.0, it might be the inverse of what we need
                # Example: If we need ZWG to USD rate and get 0.0301, 
                # check if USD to ZWG rate exists (33.2) and use that instead
                if 0 < rate < 1.0:
                    try:
                        from erpnext.setup.utils import get_exchange_rate
                        # Try to get the inverse rate (to_currency to from_currency)
                        inverse_rate = get_exchange_rate(to_currency, from_currency, date)
                        if inverse_rate and inverse_rate > 1.0:
                            # We found the inverse rate which is larger
                            # Use the inverse rate directly (don't divide by it again)
                            # Because: if 1 USD = 33.2 ZWG, then to convert ZWG to USD, divide by 33.2
                            rate = inverse_rate
                            # Cache the corrected rate
                            erpnext_utils.__exchange_rates[f"{from_currency}-{to_currency}@{date}"] = rate
                    except Exception:
                        pass
                # Also handle case where rate is 1, 0, or None (not found)
                elif not rate or rate == 1 or rate == 0:
                    try:
                        from erpnext.setup.utils import get_exchange_rate
                        # Try to get the inverse rate
                        inverse_rate = get_exchange_rate(to_currency, from_currency, date)
                        if inverse_rate and inverse_rate != 1 and inverse_rate != 0:
                            # Use the inverse rate directly
                            rate = inverse_rate
                            # Cache the corrected rate
                            erpnext_utils.__exchange_rates[f"{from_currency}-{to_currency}@{date}"] = rate
                    except Exception:
                        pass
            
            return rate or 1
        
        def fixed_convert(value, from_, to, date):
            """
            Fixed convert function that correctly handles exchange rate direction.
            The exchange rate means: 1 from_currency = rate to_currency
            So to convert from_currency to to_currency: divide by rate
            """
            rate = fixed_get_rate_as_at(date, from_, to)
            # The rate means: 1 from_currency = rate to_currency
            # So to convert from_currency to to_currency: divide by rate
            converted_value = flt(value) / (rate or 1)
            return converted_value
        
        def fixed_convert_to_presentation_currency(gl_entries, currency_info, filters=None):
            """
            Fixed version of convert_to_presentation_currency that correctly converts
            from account currency to presentation currency.
            
            The fix ensures:
            - When account currency != presentation currency, use debit_in_account_currency
              and convert FROM account currency TO presentation currency
            - When account currency == presentation currency, use account currency values directly
            """
            converted_gl_list = []
            presentation_currency = currency_info["presentation_currency"]
            company_currency = currency_info["company_currency"]

            account_currencies = list(set(entry["account_currency"] for entry in gl_entries))
            exchange_gain_or_loss = False

            if filters and isinstance(filters.get("account"), list):
                account_filter = filters.get("account")
                gain_loss_account = frappe.db.get_value("Company", filters.company, "exchange_gain_loss_account")

                exchange_gain_or_loss = len(account_filter) == 1 and account_filter[0] == gain_loss_account

            for entry in gl_entries:
                debit = flt(entry["debit"])
                credit = flt(entry["credit"])
                debit_in_account_currency = flt(entry["debit_in_account_currency"])
                credit_in_account_currency = flt(entry["credit_in_account_currency"])
                account_currency = entry["account_currency"]

                if (
                    len(account_currencies) == 1
                    and account_currency == presentation_currency
                    and not exchange_gain_or_loss
                ) and not (filters and filters.get("show_amount_in_company_currency")):
                    entry["debit"] = debit_in_account_currency
                    entry["credit"] = credit_in_account_currency
                else:
                    date = currency_info["report_date"]
                    # If account currency is different from presentation currency,
                    # convert from account currency to presentation currency
                    if account_currency != presentation_currency:
                        converted_debit_value = fixed_convert(
                            debit_in_account_currency, account_currency, presentation_currency, date
                        )
                        # converted_debit_value = debit_in_account_currency
                        converted_credit_value = fixed_convert(
                            credit_in_account_currency, account_currency, presentation_currency, date
                        )
                    else:
                        # Account currency matches presentation currency, use account currency values directly
                        converted_debit_value = debit_in_account_currency
                        converted_credit_value = credit_in_account_currency

                    if entry.get("debit"):
                        entry["debit"] = converted_debit_value

                    if entry.get("credit"):
                        entry["credit"] = converted_credit_value

                converted_gl_list.append(entry)

            return converted_gl_list
        
        # Replace all three functions in the module
        erpnext_utils.get_rate_as_at = fixed_get_rate_as_at
        erpnext_utils.convert = fixed_convert
        erpnext_utils.convert_to_presentation_currency = fixed_convert_to_presentation_currency
        
        # Also update modules that have already imported these functions
        # This is important because Python creates references at import time
        modules_to_update = [
            'erpnext.accounts.report.trial_balance.trial_balance',
            'erpnext.accounts.report.financial_statements',
            'erpnext.accounts.report.general_ledger.general_ledger',
            'erpnext.accounts.report.consolidated_financial_statement.consolidated_financial_statement',
        ]
        
        updated_count = 0
        for module_name in modules_to_update:
            if module_name in sys.modules:
                module = sys.modules[module_name]
                if hasattr(module, 'convert_to_presentation_currency'):
                    module.convert_to_presentation_currency = fixed_convert_to_presentation_currency
                    updated_count += 1
                if hasattr(module, 'convert'):
                    module.convert = fixed_convert
                    updated_count += 1
                if hasattr(module, 'get_rate_as_at'):
                    module.get_rate_as_at = fixed_get_rate_as_at
                    updated_count += 1
        
        _fix_applied = True
        
        # Verify the fix was applied
        if (erpnext_utils.convert_to_presentation_currency == fixed_convert_to_presentation_currency and
            erpnext_utils.convert == fixed_convert and
            erpnext_utils.get_rate_as_at == fixed_get_rate_as_at):
            # Log success (using print for console, or you can use frappe.logger().info() if needed)
            print(f"✓ Trial Balance Fix Applied: Updated {updated_count} function references in {len(modules_to_update)} modules")
        else:
            frappe.log_error(
                "Trial balance fix may not have been applied correctly. Function replacement failed.",
                "Trial Balance Fix Warning"
            )
        
    except ImportError:
        # ERPNext not installed or not loaded yet - this is OK
        pass
    except Exception as e:
        frappe.log_error(
            f"Error applying trial balance fix: {str(e)}\n{frappe.get_traceback()}",
            "Trial Balance Fix Error"
        )
