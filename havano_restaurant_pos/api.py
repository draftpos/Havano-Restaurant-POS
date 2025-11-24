import frappe
from frappe import _
from frappe.utils import flt
from datetime import datetime



@frappe.whitelist()
def get_customers():
    """Get all active customers"""
    customers = frappe.get_all(
        "Customer",
        fields=["name", "customer_name"],
        filters={"disabled": 0},
        order_by="customer_name",
    )
    return customers


@frappe.whitelist()
def create_customer(customer_name, mobile_no=None):
    """Create a new customer.
    
    Args:
        customer_name: Customer name (required)
        mobile_no: Mobile number (optional)
    """
    try:
        if not customer_name or not customer_name.strip():
            return {
                "success": False,
                "message": "Customer name is required",
            }
        
        # Check if customer with same name already exists
        existing = frappe.db.exists("Customer", {"customer_name": customer_name.strip()})
        if existing:
            return {
                "success": True,
                "message": "Customer already exists",
                "customer": existing,
            }
        
        # Create new customer
        customer = frappe.new_doc("Customer")
        customer.customer_name = customer_name.strip()
        customer.customer_type = "Company"
        customer.customer_group = frappe.db.get_single_value("Selling Settings", "customer_group") or "All Customer Groups"
        customer.territory = frappe.db.get_single_value("Selling Settings", "territory") or "All Territories"
        
        customer.insert(ignore_permissions=True)
        
        # Create contact with mobile number if provided
        if mobile_no and mobile_no.strip():
            contact = frappe.new_doc("Contact")
            contact.is_primary_contact = 1
            contact.company_name = customer_name.strip()
            contact.append("links", {
                "link_doctype": "Customer",
                "link_name": customer.name
            })
            contact.append("phone_nos", {
                "phone": mobile_no.strip(),
                "is_primary_mobile_no": 1
            })
            contact.insert(ignore_permissions=True)
            # Set the primary contact on customer
            frappe.db.set_value("Customer", customer.name, "customer_primary_contact", contact.name)
            frappe.db.set_value("Customer", customer.name, "mobile_no", mobile_no.strip())
        
        frappe.db.commit()
        
        return {
            "success": True,
            "message": "Customer created successfully",
            "customer": customer.name,
            "customer_name": customer.customer_name,
        }
    
    except Exception as e:
        title = "Error creating customer"
        frappe.log_error(frappe.get_traceback(), title)
        return {
            "success": False,
            "message": "Failed to create customer",
            "details": str(e),
        }


@frappe.whitelist()
def get_price_lists():
    """Get all selling price lists"""
    price_lists = frappe.get_all(
        "Price List",
        fields=["name", "price_list_name"],
        filters={"enabled": 1, "selling": 1},
        order_by="name",
    )
    return price_lists


@frappe.whitelist()
def search_items(search_term=None):
    """Search for items by name or code"""
    filters = {"disabled": 0}

    if search_term:
        filters["item_name"] = ["like", f"%{search_term}%"]

    items = frappe.get_all(
        "Item",
        fields=[
            "name",
            "item_code",
            "item_name",
            "description",
            "stock_uom",
            "standard_rate",
        ],
        filters=filters,
        order_by="item_name",
        limit=20,
    )
    return items


@frappe.whitelist()
def get_number_of_items(category=None):
    """Get the number of items in a category"""
    item_group = frappe.db.get_single_value("Sample Pos Settings", "menu_item_group")
    if category:
        return frappe.db.count(
            "Item",
            {"disabled": 0, "item_group": item_group, "custom_menu_category": category},
        )
    else:
        return frappe.db.count("Item", {"disabled": 0, "item_group": item_group})


@frappe.whitelist()
def create_order_from_cart(payload):
    """Create an order from the cart"""
    try:
        if isinstance(payload, str):
            import json

            payload = frappe.parse_json(payload)

        def safe(value):
            if not value:
                return ""
            return str(value)[:140]

        order = frappe.new_doc("HA Order")
        order.order_type = safe(payload.get("order_type"))
        order.customer_name = safe(payload.get("customer_name"))
        order.table = safe(payload.get("table"))
        order.waiter = safe(payload.get("waiter"))
        order.payment_status = "Unpaid"

        for item in payload.get("order_items", []):
            order.append(
                "order_items",
                {
                    "menu_item": safe(item.get("name")),
                    "qty": item.get("quantity"),
                    "rate": item.get("price"),
                    "amount": (item.get("price") or 0) * (item.get("quantity") or 0),
                    "preparation_remark": safe(item.get("remark")),
                },
            )

        order.save(ignore_permissions=True)

        if order.order_type == "Take Away":
            order.create_invoice()

        frappe.db.commit()

        table_name = payload.get("table")
        if table_name and order.order_type == "Dine In":
            table = frappe.get_doc("HA Table", table_name)
            table.assigned_waiter = safe(payload.get("waiter"))
            table.customer_name = safe(payload.get("customer_name"))
            table.save(ignore_permissions=True)
            frappe.db.commit()

        return {
            "success": True,
            "message": "Order created successfully",
            "order_id": order.name,
        }

    except Exception as e:
        frappe.log_error(f"Error creating order: {frappe.get_traceback()}")
        return {
            "success": False,
            "message": "Failed to create order",
            "details": str(e),
        }


@frappe.whitelist()
def update_order(payload):
    try:
        order = frappe.get_doc("HA Order", payload.get("order_id"))
        order.order_items = []

        for item in payload.get("order_items", []):
            order.append(
                "order_items",
                {
                    "menu_item": item.get("name"),
                    "qty": item.get("quantity"),
                    "rate": item.get("price"),
                    "amount": item.get("price") * item.get("quantity"),
                    "preparation_remark": item.get("remark"),
                },
            )
        order.save()
        frappe.db.commit()

        return {
            "success": True,
            "message": "Order updated successfully",
            "order_id": order.name,
        }

    except Exception as e:
        frappe.log_error(f"Error updating order: {frappe.get_traceback()}")
        return {
            "success": False,
            "message": "Failed to update order",
            "details": str(e),
        }


@frappe.whitelist()
def get_number_of_orders(menu_item):
    try:
        if not menu_item:
            return {"success": False, "message": "Menu item not provided", "count": 0}

        count = frappe.db.count("HA Order Item", {"menu_item": menu_item})
        return {
            "success": True,
            "message": "Number of orders retrieved successfully",
            "count": count,
        }

    except Exception as e:
        frappe.log_error(f"Error getting number of orders: {frappe.get_traceback()}")
        return {
            "success": False,
            "message": "Failed to get number of orders",
            "details": str(e),
        }


@frappe.whitelist()
def mark_table_as_paid(table):
    try:
        default_dine_in_customer = frappe.db.get_single_value(
            "Sample Pos Settings", "default_dine_in_customer"
        )

        default_warehouse = frappe.db.get_single_value(
            "Stock Settings", "default_warehouse"
        )

        orders = frappe.get_all(
            "HA Order",
            filters={"table": table, "order_status": "Open"},
            fields=["name"],
        )

        if not orders:
            frappe.throw(f"No active orders found for table: {table}")

        order_items = []
        for order in orders:
            order_doc = frappe.get_doc("HA Order", order.name)
            for order_item in order_doc.order_items:
                order_items.append(
                    {
                        "menu_item": order_item.menu_item,
                        "qty": order_item.qty,
                        "rate": order_item.rate,
                        "amount": order_item.amount,
                    }
                )

            order_doc.order_status = "Closed"
            order_doc.save(ignore_permissions=True)
            frappe.db.commit()

        merged_items = []
        for item in order_items:
            found = False
            for merged in merged_items:
                if (
                    merged["menu_item"] == item["menu_item"]
                    and merged["rate"] == item["rate"]
                ):
                    merged["qty"] = merged["qty"] + item["qty"]
                    merged["amount"] = merged["qty"] * merged["rate"]
                    found = True
                    break
            if not found:
                merged_items.append(item)
        sales_invoice = frappe.new_doc("Sales Invoice")
        sales_invoice.customer = default_dine_in_customer
        sales_invoice.due_date = frappe.utils.nowdate()
        sales_invoice.update_stock = 1
        sales_invoice.set_warehouse = default_warehouse
        for item in merged_items:
            sales_invoice.append(
                "items",
                {
                    "item_code": item["menu_item"],
                    "qty": item["qty"],
                    "rate": item["rate"],
                    "amount": item["amount"],
                },
            )
        sales_invoice.insert(ignore_permissions=True)
        sales_invoice.submit()
        frappe.db.commit()

        return {
            "success": True,
            "message": "Sales Invoice created successfully",
            "sales_invoice": sales_invoice.name,
        }

    except Exception as e:
        title = f"Error creating sales invoice for {table}"
        frappe.log_error(frappe.get_traceback(), title)

        return {
            "success": False,
            "message": "Failed to create sales invoice",
            "details": str(e),
        }


@frappe.whitelist()
def create_order_and_payment(payload, amount=None, payment_method=None, note=None):
    """Create order, create sales invoice and create a payment entry in one call.

    Expects `payload` (dict or JSON string) which matches create_order_from_cart payload.
    Optional `amount` will be used as the paid amount for Payment Entry; otherwise invoice total is used.
    """

    try:
        if isinstance(payload, str):
            payload = frappe.parse_json(payload)

        # 1) Prepare items and customer
        items = []
        total = 0
        for item in payload.get("order_items", []):
            item_code = item.get("name") or item.get("item_code") or item.get("item_name")
            qty = item.get("quantity") or item.get("qty") or 1
            rate = item.get("price") or item.get("rate") or 0
            items.append({"item_code": item_code, "qty": qty, "rate": rate})
            try:
                total += float(qty) * float(rate)
            except Exception:
                total += 0

        customer = payload.get("customer_name") or frappe.db.get_single_value(
            "Sample Pos Settings", "default_dine_in_customer"
        ) or ""

        # 2) Create payment entry first
        company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value(
            "Global Defaults", "default_company"
        )
        paid_amount = float(amount) if amount is not None else total
        company_currency = frappe.get_value("Company", company, "default_currency")
        paid_from_account = frappe.get_value("Company", company, "default_receivable_account")
        paid_to_account = frappe.get_value("Company", company, "default_cash_account") or paid_from_account
        if not paid_from_account or not paid_to_account:
            return {
                "success": False,
                "message": "Missing company accounts",
                "details": "Company is missing default receivable or cash account. Please configure company defaults.",
            }
        def get_account_currency(account, default_currency):
            if not account:
                return default_currency
            try:
                acc_currency = frappe.get_value("Account", account, "account_currency")
                return acc_currency or default_currency
            except Exception:
                return default_currency
        paid_from_currency = get_account_currency(paid_from_account, company_currency)
        paid_to_currency = get_account_currency(paid_to_account, company_currency)
        source_exchange_rate = 1.0
        target_exchange_rate = 1.0
        received_amount = paid_amount
        if paid_from_currency != paid_to_currency:
            try:
                from erpnext.setup.utils import get_exchange_rate
                target_exchange_rate = get_exchange_rate(
                    paid_from_currency, paid_to_currency, frappe.utils.nowdate()
                )
                received_amount = paid_amount * target_exchange_rate
            except Exception as e:
                frappe.log_error(
                    f"Could not get exchange rate for {paid_from_currency} -> {paid_to_currency}: {str(e)}",
                    "Payment Entry Exchange Rate"
                )
                target_exchange_rate = 1.0
                received_amount = paid_amount

        try:
            payment_entry = frappe.new_doc("Payment Entry")
            payment_entry.payment_type = "Receive"
            payment_entry.party_type = "Customer"
            payment_entry.party = customer
            payment_entry.company = company
            payment_entry.posting_date = frappe.utils.nowdate()
            payment_entry.paid_from = paid_from_account
            payment_entry.paid_to = paid_to_account
            payment_entry.paid_from_account_currency = paid_from_currency
            payment_entry.paid_to_account_currency = paid_to_currency
            payment_entry.paid_amount = paid_amount
            payment_entry.received_amount = received_amount
            payment_entry.source_exchange_rate = source_exchange_rate
            payment_entry.target_exchange_rate = target_exchange_rate
            payment_entry.reference_no = None
            payment_entry.reference_date = frappe.utils.nowdate()
            payment_entry.remarks = note or "POS Payment"
            payment_entry.mode_of_payment = payment_method or "Cash"
            payment_entry.insert(ignore_permissions=True)
            payment_entry.submit()
            frappe.db.commit()
        except Exception as e:
            title = "Error creating payment entry"
            frappe.log_error(frappe.get_traceback(), title)
            return {
                "success": False,
                "message": "Failed to create payment entry",
                "details": str(e),
            }

        # 3) Only if payment entry succeeded, create HA Order and Sales Invoice
        try:
            def safe(value):
                if not value:
                    return ""
                return str(value)[:140]
            order = frappe.new_doc("HA Order")
            order.order_type = safe(payload.get("order_type"))
            order.customer_name = safe(payload.get("customer_name"))
            order.table = safe(payload.get("table"))
            order.waiter = safe(payload.get("waiter"))
            order.payment_status = "Paid"
            for item in payload.get("order_items", []):
                order.append(
                    "order_items",
                    {
                        "menu_item": safe(item.get("name")),
                        "qty": item.get("quantity"),
                        "rate": item.get("price"),
                        "amount": (item.get("price") or 0) * (item.get("quantity") or 0),
                        "preparation_remark": safe(item.get("remark")),
                    },
                )
            order.save(ignore_permissions=True)
            frappe.db.commit()
            order_id = order.name
            table_name = payload.get("table")
            if table_name and order.order_type == "Dine In":
                table = frappe.get_doc("HA Table", table_name)
                table.assigned_waiter = safe(payload.get("waiter"))
                table.customer_name = safe(payload.get("customer_name"))
                table.save(ignore_permissions=True)
                frappe.db.commit()
            from havano_restaurant_pos.havano_restaurant_pos.doctype.ha_pos_invoice.ha_pos_invoice import (
                create_sales_invoice,
            )
            inv = create_sales_invoice(customer, items)
            return {
                "success": True,
                "message": "Order, invoice and payment created",
                "order_id": order_id,
                "sales_invoice": inv.get("name") if isinstance(inv, dict) else inv,
                "payment_entry": payment_entry.name,
            }
        except Exception as e:
            title = "Error creating order/invoice after payment"
            frappe.log_error(frappe.get_traceback(), title)
            return {
                "success": False,
                "message": "Failed to create order/invoice after payment",
                "details": str(e),
            }

    except Exception as e:
        title = "Error in create_order_and_payment"
        frappe.log_error(frappe.get_traceback(), title)
        return {
            "success": False,
            "message": "Failed to process payment/order",
            "details": str(e),
        }


@frappe.whitelist()
def convert_quotation_to_sales_invoice(quotation_name):
    """Convert a Quotation to Sales Invoice.
    
    Args:
        quotation_name: Name of the Quotation to convert
    """
    try:
        # Check if quotation exists and is submitted
        quotation = frappe.get_doc("Quotation", quotation_name)
        
        if quotation.docstatus != 1:
            return {
                "success": False,
                "message": "Quotation must be submitted before converting to Sales Invoice",
            }
        
        # Check if already converted
        existing_invoice = frappe.get_all(
            "Sales Invoice",
            filters={"quotation_no": quotation_name},
            fields=["name"],
            limit=1
        )
        
        if existing_invoice:
            return {
                "success": True,
                "message": "Quotation already converted to Sales Invoice",
                "sales_invoice": existing_invoice[0].name,
            }
        
        # Import the conversion function
        from erpnext.selling.doctype.quotation.quotation import make_sales_invoice
        
        # Convert quotation to sales invoice
        sales_invoice = make_sales_invoice(quotation_name)
        
        # Save and submit the sales invoice
        sales_invoice.insert(ignore_permissions=True)
        sales_invoice.submit()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": "Quotation converted to Sales Invoice successfully",
            "sales_invoice": sales_invoice.name,
        }
    
    except Exception as e:
        title = "Error converting Quotation to Sales Invoice"
        frappe.log_error(frappe.get_traceback(), title)
        return {
            "success": False,
            "message": "Failed to convert Quotation to Sales Invoice",
            "details": str(e),
        }


@frappe.whitelist()
def convert_quotation_to_sales_invoice_from_cart(quotation_name, items, customer, order_type=None, table=None, waiter=None, customer_name=None):
    """Update quotation with new items (if changed), convert to Sales Invoice, create payment and HA Order.
    
    Args:
        quotation_name: Name of the Quotation
        items: List of items with item_code, qty, rate
        customer: Customer ID
        order_type: Order type for HA Order (optional, defaults to "Take Away")
        table: Table ID for HA Order (optional)
        waiter: Waiter ID for HA Order (optional)
        customer_name: Customer display name for HA Order (optional)
    """
    try:
        # Parse items if it's a JSON string
        if isinstance(items, str):
            import json
            items = frappe.parse_json(items)
        
        # Validate inputs
        if not quotation_name:
            return {
                "success": False,
                "message": "Quotation name is required",
            }
        
        if not items or not isinstance(items, (list, tuple)):
            return {
                "success": False,
                "message": "Items list is required and must be a list",
            }
        
        if not customer:
            return {
                "success": False,
                "message": "Customer is required",
            }
        
        # Validate quotation exists
        if not frappe.db.exists("Quotation", quotation_name):
            return {
                "success": False,
                "message": "Quotation not found",
                "details": f"Quotation {quotation_name} does not exist",
            }
        
        # Initialize variables
        items_changed = False
        sales_invoice_name = None
        
        # Note: We don't check for existing conversions here because ERPNext doesn't
        # store a direct quotation_no field in Sales Invoice. We'll proceed with conversion
        # and handle any issues through error handling.
        
        # Get the quotation
        quotation = frappe.get_doc("Quotation", quotation_name)
        
        # Validate quotation state
        if quotation.status == "Lost":
            return {
                "success": False,
                "message": "Cannot convert a Lost quotation to Sales Invoice",
                "details": f"Quotation {quotation_name} has status 'Lost'",
            }
        
        # Check if items have changed by comparing current items with quotation items
        current_items = set()
        for item in items:
            item_code = item.get("item_code") or item.get("name")
            if not item_code:
                continue
            try:
                qty = float(item.get("qty") or item.get("quantity") or 1)
                rate = float(item.get("rate") or item.get("price") or 0)
                current_items.add((item_code, qty, rate))
            except (ValueError, TypeError):
                continue  # Skip invalid items
        
        quotation_items = set()
        for item in quotation.items:
            if item.item_code:
                quotation_items.add((item.item_code, float(item.qty or 1), float(item.rate or 0)))
        
        items_changed = current_items != quotation_items
        
        # Update quotation if items changed
        if items_changed:
            # If quotation is submitted, cancel it first to allow modification
            if quotation.docstatus == 1:
                try:
                    quotation.cancel()
                    frappe.db.commit()
                    # Reload the quotation after cancel
                    quotation = frappe.get_doc("Quotation", quotation_name)
                except Exception as cancel_err:
                    # If cancel fails, try to proceed anyway (might be draft)
                    frappe.log_error(f"Warning: Could not cancel quotation: {frappe.get_traceback()}")
                    if quotation.docstatus == 1:
                        # If still submitted and can't cancel, we can't update
                        return {
                            "success": False,
                            "message": "Cannot update quotation. It may be linked to other documents or already converted.",
                            "details": str(cancel_err),
                        }
            
            # Clear and update items
            quotation.items = []
            for item in items:
                item_code = item.get("item_code") or item.get("name")
                if not item_code:
                    continue  # Skip items without item_code
                
                # Validate item exists
                if not frappe.db.exists("Item", item_code):
                    return {
                        "success": False,
                        "message": f"Item {item_code} does not exist",
                        "details": f"Please check that item {item_code} exists in the system",
                    }
                
                try:
                    qty = float(item.get("qty") or item.get("quantity") or 1)
                    rate = float(item.get("rate") or item.get("price") or 0)
                except (ValueError, TypeError):
                    return {
                        "success": False,
                        "message": f"Invalid quantity or rate for item {item_code}",
                        "details": f"Quantity: {item.get('qty')}, Rate: {item.get('rate')}",
                    }
                
                quotation.append("items", {
                    "item_code": item_code,
                    "qty": qty,
                    "rate": rate,
                })
            
            quotation.set_missing_values()
            quotation.calculate_taxes_and_totals()
            quotation.save(ignore_permissions=True)
            frappe.db.commit()
        
        # Ensure quotation is submitted
        if quotation.docstatus != 1:
            try:
                quotation.submit()
                frappe.db.commit()
            except Exception as submit_quotation_err:
                error_msg = str(submit_quotation_err)
                error_type = type(submit_quotation_err).__name__
                frappe.log_error(f"Quotation submit error: {frappe.get_traceback()}", "Quotation Submit Error")
                return {
                    "success": False,
                    "message": f"Failed to submit quotation: {error_msg}",
                    "details": error_msg,
                    "error_type": error_type,
                }
        
        # Import the conversion function
        from erpnext.selling.doctype.quotation.quotation import make_sales_invoice
        
        # Convert quotation to sales invoice
        try:
            sales_invoice = make_sales_invoice(quotation_name)
            if not sales_invoice:
                return {
                    "success": False,
                    "message": "Failed to convert quotation to sales invoice",
                    "details": "make_sales_invoice returned None or empty",
                }
        except Exception as convert_err:
            error_msg = str(convert_err)
            error_type = type(convert_err).__name__
            frappe.log_error(f"Conversion error: {frappe.get_traceback()}", "Convert Quotation Error")
            return {
                "success": False,
                "message": f"Failed to convert quotation to sales invoice: {error_msg}",
                "details": error_msg,
                "error_type": error_type,
            }
        
        # Save and submit the sales invoice
        try:
            sales_invoice.insert(ignore_permissions=True)
            frappe.db.commit()
        except Exception as insert_err:
            error_msg = str(insert_err)
            error_type = type(insert_err).__name__
            frappe.log_error(f"Insert error: {frappe.get_traceback()}", "Sales Invoice Insert Error")
            return {
                "success": False,
                "message": f"Failed to save sales invoice: {error_msg}",
                "details": error_msg,
                "error_type": error_type,
            }
        
        try:
            sales_invoice.submit()
            frappe.db.commit()
            sales_invoice_name = sales_invoice.name
        except Exception as submit_err:
            error_msg = str(submit_err)
            error_type = type(submit_err).__name__
            frappe.log_error(f"Submit error: {frappe.get_traceback()}", "Sales Invoice Submit Error")
            # Try to get the invoice name even if submit failed
            sales_invoice_name = sales_invoice.name if hasattr(sales_invoice, 'name') else None
            return {
                "success": False,
                "message": f"Failed to submit sales invoice: {error_msg}",
                "details": error_msg,
                "error_type": error_type,
                "sales_invoice": sales_invoice_name,  # Return invoice name if it was created
            }
        
        # Create HA Order
        def safe(value):
            if not value:
                return ""
            return str(value)[:140]
        
        try:
            ha_order = frappe.new_doc("HA Order")
            ha_order.order_type = safe(order_type) or "Take Away"
            ha_order.customer_name = safe(customer_name) or customer
            ha_order.table = safe(table) or ""
            ha_order.waiter = safe(waiter) or ""
            ha_order.payment_status = "Unpaid"
            ha_order.sales_invoice = sales_invoice_name
            
            # Add items to HA Order
            for item in items:
                item_code = item.get("item_code") or item.get("name")
                if not item_code:
                    continue  # Skip items without item_code
                try:
                    qty = float(item.get("qty") or item.get("quantity") or 1)
                    rate = float(item.get("rate") or item.get("price") or 0)
                except (ValueError, TypeError):
                    qty = 1
                    rate = 0
                
                ha_order.append("order_items", {
                    "menu_item": safe(item_code),
                    "qty": qty,
                    "rate": rate,
                    "amount": qty * rate,
                })
            
            ha_order.save(ignore_permissions=True)
            ha_order_id = ha_order.name
            
            # Update table if Dine In
            if table and ha_order.order_type == "Dine In":
                try:
                    table_doc = frappe.get_doc("HA Table", table)
                    table_doc.assigned_waiter = safe(waiter)
                    table_doc.customer_name = safe(customer_name) or customer
                    table_doc.save(ignore_permissions=True)
                except Exception as e:
                    frappe.log_error(f"Error updating table: {frappe.get_traceback()}")
            
            frappe.db.commit()
            
            return {
                "success": True,
                "message": "Quotation converted to Sales Invoice successfully",
                "sales_invoice": sales_invoice_name,
                "order_id": ha_order_id,
                "quotation_updated": items_changed,
            }
        except Exception as ha_order_err:
            frappe.log_error(f"Error creating HA Order: {frappe.get_traceback()}")
            return {
                "success": False,
                "message": "Failed to create HA Order",
                "details": f"HA Order creation error: {str(ha_order_err)}",
            }
    
    except Exception as e:
        title = "Error converting Quotation to Sales Invoice from Cart"
        error_traceback = frappe.get_traceback()
        frappe.log_error(error_traceback, title)
        
        # Get the full error information
        error_message = str(e)
        error_type = type(e).__name__
        error_lower = error_message.lower()
        
        # Log to console for debugging
        frappe.errprint(f"ERROR in convert_quotation_to_sales_invoice_from_cart:")
        frappe.errprint(f"  Type: {error_type}")
        frappe.errprint(f"  Message: {error_message}")
        frappe.errprint(f"  Traceback: {error_traceback}")
        
        # Provide more specific error messages
        if "cannot cancel" in error_lower or "already cancelled" in error_lower:
            return {
                "success": False,
                "message": "Cannot update quotation. It may be linked to other documents.",
                "details": error_message,
                "error_type": error_type,
            }
        elif "docstatus" in error_lower or "submitted" in error_lower or "not draft" in error_lower:
            return {
                "success": False,
                "message": "Quotation cannot be modified. Please check if it's already converted or has dependencies.",
                "details": error_message,
                "error_type": error_type,
            }
        elif "validation" in error_lower or "mandatory" in error_lower or "required" in error_lower:
            return {
                "success": False,
                "message": "Validation error. Please check all required fields are filled.",
                "details": error_message,
                "error_type": error_type,
            }
        elif "permission" in error_lower or "access" in error_lower:
            return {
                "success": False,
                "message": "Permission denied. Please check your user permissions.",
                "details": error_message,
                "error_type": error_type,
            }
        else:
            # Return the actual error message so user can see what went wrong
            return {
                "success": False,
                "message": f"Failed to convert Quotation to Sales Invoice: {error_message}",
                "details": error_message,
                "error_type": error_type,
                "traceback": error_traceback if frappe.conf.developer_mode else None,
            }


@frappe.whitelist()
def create_transaction(doctype, customer, items, company=None, order_type=None, table=None, waiter=None, customer_name=None):
    """Create a Sales Invoice or Quotation from items.
    Also creates HA Order for Sales Invoice.
    
    Args:
        doctype: "Sales Invoice" or "Quotation"
        customer: Customer name (Customer ID)
        items: List of items with item_code, qty, rate
        company: Company name (optional, will use default if not provided)
        order_type: Order type for HA Order (optional, defaults to "Take Away")
        table: Table ID for HA Order (optional)
        waiter: Waiter ID for HA Order (optional)
        customer_name: Customer display name for HA Order (optional)
    """
    try:
        if doctype not in ["Sales Invoice", "Quotation"]:
            return {
                "success": False,
                "message": f"Invalid doctype: {doctype}. Must be 'Sales Invoice' or 'Quotation'",
            }
        
        if not customer:
            return {
                "success": False,
                "message": "Customer is required",
            }
        
        if not items or len(items) == 0:
            return {
                "success": False,
                "message": "At least one item is required",
            }
        
        # Get company
        if not company:
            company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value(
                "Global Defaults", "default_company"
            )
        
        if not company:
            return {
                "success": False,
                "message": "Company is required. Please set a default company.",
            }
        
        # Create the document
        doc = frappe.new_doc(doctype)
        doc.customer = customer
        doc.company = company
        
        # For Quotation, set quotation_to and transaction_date
        if doctype == "Quotation":
            doc.quotation_to = "Customer"
            doc.party_name = customer
            doc.transaction_date = frappe.utils.today()
        
        # For Sales Invoice, set posting_date
        if doctype == "Sales Invoice":
            doc.posting_date = frappe.utils.today()
        
        # Add items
        for item in items:
            item_code = item.get("item_code") or item.get("name")
            qty = float(item.get("qty") or item.get("quantity") or 1)
            rate = float(item.get("rate") or item.get("price") or 0)
            
            doc.append("items", {
                "item_code": item_code,
                "qty": qty,
                "rate": rate,
            })
        
        # Set missing values and calculate totals
        doc.set_missing_values()
        doc.calculate_taxes_and_totals()
        
        # Save the document
        doc.insert(ignore_permissions=True)
        
        # For Sales Invoice, create HA Order and submit invoice
        ha_order_id = None
        if doctype == "Sales Invoice":
            # Create HA Order
            def safe(value):
                if not value:
                    return ""
                return str(value)[:140]
            
            ha_order = frappe.new_doc("HA Order")
            ha_order.order_type = safe(order_type) or "Take Away"
            ha_order.customer_name = safe(customer_name) or customer
            ha_order.table = safe(table) or ""
            ha_order.waiter = safe(waiter) or ""
            ha_order.payment_status = "Unpaid"
            ha_order.sales_invoice = doc.name  # Link to Sales Invoice
            
            # Add items to HA Order
            for item in items:
                item_code = item.get("item_code") or item.get("name")
                qty = float(item.get("qty") or item.get("quantity") or 1)
                rate = float(item.get("rate") or item.get("price") or 0)
                
                ha_order.append("order_items", {
                    "menu_item": safe(item_code),
                    "qty": qty,
                    "rate": rate,
                    "amount": qty * rate,
                })
            
            ha_order.save(ignore_permissions=True)
            ha_order_id = ha_order.name
            
            # Submit Sales Invoice
            doc.submit()
            
            # Update table if Dine In
            if table and ha_order.order_type == "Dine In":
                try:
                    table_doc = frappe.get_doc("HA Table", table)
                    table_doc.assigned_waiter = safe(waiter)
                    table_doc.customer_name = safe(customer_name) or customer
                    table_doc.save(ignore_permissions=True)
                except Exception as e:
                    frappe.log_error(f"Error updating table: {frappe.get_traceback()}")
        
        frappe.db.commit()
        
        return {
            "success": True,
            "message": f"{doctype} created successfully",
            "name": doc.name,
            "order_id": ha_order_id,  # Return HA Order ID if created
        }
    
    except Exception as e:
        title = f"Error creating {doctype}"
        frappe.log_error(frappe.get_traceback(), title)
        return {
            "success": False,
            "message": f"Failed to create {doctype}",
            "details": str(e),
        }


@frappe.whitelist()
def make_payment_for_transaction(doctype, docname, amount=None, payment_method=None, note=None):
    """Make payment for an existing Sales Invoice or Quotation.
    
    Args:
        doctype: "Sales Invoice" or "Quotation"
        docname: Name of the Sales Invoice or Quotation
        amount: Payment amount (optional, defaults to outstanding amount)
        payment_method: Mode of payment (optional, defaults to "Cash")
        note: Payment notes (optional)
    """
    try:
        # Get the document
        doc = frappe.get_doc(doctype, docname)
        
        # For Quotation, we need to convert it to Sales Invoice first
        if doctype == "Quotation":
            # Check if quotation has been converted to Sales Invoice
            linked_invoices = frappe.get_all(
                "Sales Invoice",
                filters={"quotation_no": docname},
                fields=["name"],
                limit=1
            )
            if linked_invoices:
                # Use the linked Sales Invoice
                doc = frappe.get_doc("Sales Invoice", linked_invoices[0].name)
                doctype = "Sales Invoice"
                docname = doc.name
            else:
                return {
                    "success": False,
                    "message": "Quotation must be converted to Sales Invoice before payment. Please use the Edit button to convert it first.",
                }
        
        # Get company and customer info
        company = doc.company
        customer = doc.customer
        
        if not customer:
            return {
                "success": False,
                "message": "Customer not found in document",
            }
        
        # Calculate outstanding amount
        outstanding_amount = doc.outstanding_amount if hasattr(doc, 'outstanding_amount') else doc.grand_total
        
        # Use provided amount or outstanding amount
        paid_amount = float(amount) if amount is not None else float(outstanding_amount)
        
        if paid_amount <= 0:
            return {
                "success": False,
                "message": "Payment amount must be greater than 0",
            }
        
        # Get company accounts
        company_currency = frappe.get_value("Company", company, "default_currency")
        paid_from_account = frappe.get_value("Company", company, "default_receivable_account")
        paid_to_account = frappe.get_value("Company", company, "default_cash_account") or paid_from_account
        
        if not paid_from_account or not paid_to_account:
            return {
                "success": False,
                "message": "Missing company accounts",
                "details": "Company is missing default receivable or cash account. Please configure company defaults.",
            }
        
        def get_account_currency(account, default_currency):
            if not account:
                return default_currency
            try:
                acc_currency = frappe.get_value("Account", account, "account_currency")
                return acc_currency or default_currency
            except Exception:
                return default_currency
        
        paid_from_currency = get_account_currency(paid_from_account, company_currency)
        paid_to_currency = get_account_currency(paid_to_account, company_currency)
        source_exchange_rate = 1.0
        target_exchange_rate = 1.0
        received_amount = paid_amount
        
        if paid_from_currency != paid_to_currency:
            try:
                from erpnext.setup.utils import get_exchange_rate
                target_exchange_rate = get_exchange_rate(
                    paid_from_currency, paid_to_currency, frappe.utils.nowdate()
                )
                received_amount = paid_amount * target_exchange_rate
            except Exception as e:
                frappe.log_error(
                    f"Could not get exchange rate for {paid_from_currency} -> {paid_to_currency}: {str(e)}",
                    "Payment Entry Exchange Rate"
                )
                target_exchange_rate = 1.0
                received_amount = paid_amount
        
        # Create payment entry
        try:
            payment_entry = frappe.new_doc("Payment Entry")
            payment_entry.payment_type = "Receive"
            payment_entry.party_type = "Customer"
            payment_entry.party = customer
            payment_entry.company = company
            payment_entry.posting_date = frappe.utils.nowdate()
            payment_entry.paid_from = paid_from_account
            payment_entry.paid_to = paid_to_account
            payment_entry.paid_from_account_currency = paid_from_currency
            payment_entry.paid_to_account_currency = paid_to_currency
            payment_entry.paid_amount = paid_amount
            payment_entry.received_amount = received_amount
            payment_entry.source_exchange_rate = source_exchange_rate
            payment_entry.target_exchange_rate = target_exchange_rate
            payment_entry.reference_no = None
            payment_entry.reference_date = frappe.utils.nowdate()
            payment_entry.remarks = note or f"Payment for {doctype} {docname}"
            payment_entry.mode_of_payment = payment_method or "Cash"
            
            # Add reference to the Sales Invoice
            payment_entry.append(
                "references",
                {
                    "reference_doctype": doctype,
                    "reference_name": docname,
                    "allocated_amount": paid_amount,
                },
            )
            
            payment_entry.insert(ignore_permissions=True)
            payment_entry.submit()
            frappe.db.commit()
            
            return {
                "success": True,
                "message": f"Payment created successfully for {doctype} {docname}",
                "payment_entry": payment_entry.name,
                "transaction": docname,
            }
        except Exception as e:
            title = "Error creating payment entry"
            frappe.log_error(frappe.get_traceback(), title)
            return {
                "success": False,
                "message": "Failed to create payment entry",
                "details": str(e),
            }
    
    except Exception as e:
        title = "Error in make_payment_for_transaction"
        frappe.log_error(frappe.get_traceback(), title)
        return {
            "success": False,
            "message": "Failed to process payment",
            "details": str(e),
        }




@frappe.whitelist()
def get_invoice_json(invoice_name):
    try:
        invoice = frappe.get_doc("Sales Invoice", invoice_name)

        company = frappe.get_doc("Company", invoice.company)

        # Build item list
        items = []
        for item in invoice.items:
            items.append({
                "ProductName": item.item_name,
                "productid": item.item_code,
                "Qty": flt(item.qty),
                "Price": flt(item.rate),
                "Amount": flt(item.amount),
                "tax_type": item.tax_type if hasattr(item, "tax_type") else "VAT",
                "tax_rate": str(item.tax_rate) if hasattr(item, "tax_rate") else "15.0",
                "tax_amount": str(item.tax_amount) if hasattr(item, "tax_amount") else "0.00"
            })

        data = {
            "CompanyName": company.company_name,
            "CompanyAddress": company.default_address or "",
            "City": company.city or "",
            "State": company.state or "",
            "postcode": company.pincode or "",
            "contact": company.phone or "",
            "CompanyEmail": company.email_id or "",
            "TIN": company.tax_id or "",
            "VATNo": company.vat or "",
            "Tel": company.phone or "",
            "InvoiceNo": invoice.name,
            "InvoiceDate":str(invoice.creation),
            "CashierName": invoice.owner,
            "CustomerName": invoice.customer_name,
            "CustomerContact": invoice.contact_display or invoice.customer_name,
            "CustomerTradeName": getattr(invoice, "customer_trade_name", None),
            "CustomerEmail": invoice.contact_email or None,
            "CustomerTIN": getattr(invoice, "tax_id", None),
            "CustomerVAT": getattr(invoice, "vat_number", None),
            "Customeraddress": invoice.customer_address or None,
            "itemlist": items,
            "AmountTendered": str(invoice.paid_amount),
            "Change": str(invoice.outstanding_amount),
            "Currency": invoice.currency,
            "Footer": "Thank you for your purchase!",
            "MultiCurrencyDetails": [
                {
                    "Key": invoice.currency,
                    "Value": flt(invoice.grand_total)
                }
            ],
            "DeviceID": getattr(invoice, "device_id", "None"),
            "DeviceSerial": getattr(invoice, "device_serial", ""),
            "FiscalDay": "",
            "ReceiptNo": "",
            "CustomerRef": getattr(invoice, "customer_ref", "None"),
            "VCode": "",
            "QRCode": "",
            "DiscAmt": str(flt(invoice.discount_amount)),
            "Subtotal": flt(invoice.base_net_total),
            "TotalVat": str(flt(invoice.total_taxes_and_charges)),
            "GrandTotal": flt(invoice.grand_total),
            "TaxType": "Standard VAT",
            "PaymentMode": invoice.payment_terms_template or "Cash"
        }
        print(data)

        return data

    except frappe.DoesNotExistError:
        frappe.throw("Sales Invoice {0} does not exist".format(invoice_name))
    except Exception as e:
        frappe.throw("Error generating invoice JSON: {0}".format(str(e)))


@frappe.whitelist()
def generate_quotation_json(quote_id):
    # --- Get Invoice ---
    quote = frappe.get_doc("Quotation", quote_id)

    # --- Get Company Info ---
    company_name = frappe.db.get_single_value('Global Defaults', 'default_company')
    company = frappe.get_doc("Company", company_name)
    currency = frappe.db.get_value('Company', company, 'default_currency')
    # --- Get Customer Info (custom doctype linked by customer name) ---
    customer_doc = frappe.get_doc("Customer", quote.customer_name)

    # --- Get Logged-in User (Cashier) ---
    cashier_name = frappe.db.get_value("User", frappe.session.user, "full_name")

    # --- Get Invoice Items ---
    items = frappe.get_all(
        "Quotation Item",
        filters={"parent": quote.name},
        fields=["item_name as ProductName", "item_code as productid", "qty as Qty",
                "rate as Price", "amount as Amount"]
    )
    #print(items)
    #, "vat as vat"
    for item in items:
        item_code = item.get("productid")
        print(item_code)
        # -------- Get Item Tax Category from Item Doctype -------
        tax_category = frappe.db.get_value(
            "Item Tax",
            {"parent": item_code},   # filter by parent (item_code)
            "tax_category"
        )
        tax_rate = 0
        tax_amount = 0
        print(tax_category)

        # -------- If VAT category, fetch maximum_net_rate -------
        if tax_category == "VAT":
            # Fetch the Item Tax record for VAT
            tax_info = frappe.get_all(
                "Item Tax",
                filters={"parent": item_code},
                fields=["maximum_net_rate"]
            )
            if tax_info:
                tax_rate = tax_info[0].maximum_net_rate or 0

            # -------- Calculate tax amount --------
            tax_amount = (tax_rate/100) *  item.get("Amount", 0)
            tax_amount = float(f"{tax_amount:.2f}")

        # Add new fields to item
        item["tax_rate"] = tax_rate
        item["tax_amount"] = tax_amount
        
    # --- Build JSON Data ---
    date_str = str(quote.creation)
    dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S.%f")
    # Format to yyyy-MM-dd
    formatted_date = dt.strftime("%Y-%m-%d")
    data = {
        "doc_type":"Quote",
        "CompanyName": company.company_name,
        "CompanyAddress": company.custom_company_email or "",
        "City": company.city or "",
        "State": company.state or "",
        "postcode": company.custom_post_code or "",
        "contact": company.custom_contact_number or "",
        "CompanyEmail": company.custom_company_email or "",
        "TIN": company.custom_tin or "",
        "VATNo": company.vat or "",
        "Tel": company.custom_contact_number or "",

        "InvoiceNo": quote.name,
        "InvoiceDate": str(formatted_date),
        "CashierName": cashier_name,

        "CustomerName": customer_doc.customer_name,
        "CustomerContact": customer_doc.customer_name,   # You may adjust if you have a field for contact
        "CustomerTradeName": getattr(customer_doc, "trade_name", None),
        "CustomerEmail": getattr(customer_doc, "email_id", None),
        "CustomerTIN": getattr(customer_doc, "tin", None),
        "CustomerVAT": getattr(customer_doc, "vat", None),
        "Customeraddress": getattr(customer_doc, "customer_address", None),

        "itemlist": items,

        "AmountTendered": str(quote.grand_total or "0"),
        "Change":  "0",
        "Currency": currency or "USD",
        "Footer": "Thank you for your support!",



        "DiscAmt": "0.0",
        "Subtotal": quote.grand_total,
        "TotalVat": "0.00",
        "GrandTotal": quote.grand_total,
        "TaxType": "Standard VAT",
        "PaymentMode": "Cash",
    }

    return data