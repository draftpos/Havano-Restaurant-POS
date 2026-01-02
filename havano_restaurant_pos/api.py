import frappe
from frappe import _
from frappe.utils import flt
from datetime import datetime

@frappe.whitelist()
def print_in_todo(data):
    """Helper function to print data to ToDo for debugging"""
    try:
        todo = frappe.new_doc("ToDo")
        todo.description = _("Debug: {0}").format(frappe.as_json(data))
        todo.date = datetime.now()
        todo.insert(ignore_permissions=True)
    except Exception:
        pass


@frappe.whitelist()
def get_customers():
    """Get all active customers"""
    # Only request fields that actually exist on the Customer doctype
    allowed_fields = [
        "name",
        "customer_name",
        "mobile_no",
        "customer_primary_contact",
        "address",
        "patient_name",
        "breed",
        "sex",
        "species",
        "date_of_birth",
        "complaint",
        "physical_exam",
        "differential_diagnosis",
        "diagnosis",
        "treatment",
        "advice",
        "follow_up",
    ]

    meta = frappe.get_meta("Customer")
    fields = [f for f in allowed_fields if f == "name" or meta.has_field(f)]

    customers = frappe.get_all(
        "Customer",
        fields=fields,
        filters={"disabled": 0},
        order_by="customer_name",
    )

    return customers


def get_default_customer():
    """
    Fetch the default customer.
    Returns None if not found.
    """
    try:
        ha_settings = frappe.get_single("HA POS Settings")

        if ha_settings and hasattr(ha_settings, "default_customer"):
            return ha_settings.default_customer

        return None

    except Exception as e:
        frappe.log_error(f"Error fetching default customer: {str(e)}\n{frappe.get_traceback()}", "Error fetching default customer")
        return None


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
        existing = frappe.db.exists(
            "Customer", {"customer_name": customer_name.strip()}
        )
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
        customer.customer_group = (
            frappe.db.get_single_value("Selling Settings", "customer_group")
            or "All Customer Groups"
        )
        customer.territory = (
            frappe.db.get_single_value("Selling Settings", "territory")
            or "All Territories"
        )

        customer.insert(ignore_permissions=True)

        # Create contact with mobile number if provided
        if mobile_no and mobile_no.strip():
            contact = frappe.new_doc("Contact")
            contact.is_primary_contact = 1
            contact.company_name = customer_name.strip()
            contact.append(
                "links", {"link_doctype": "Customer", "link_name": customer.name}
            )
            contact.append(
                "phone_nos", {"phone": mobile_no.strip(), "is_primary_mobile_no": 1}
            )
            contact.insert(ignore_permissions=True)
            # Set the primary contact on customer
            frappe.db.set_value(
                "Customer", customer.name, "customer_primary_contact", contact.name
            )
            frappe.db.set_value(
                "Customer", customer.name, "mobile_no", mobile_no.strip()
            )

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
def get_agents():
    try:
        agents = frappe.get_all(
            "Agent", fields=["name", "full_name", "certificate_no", "qualification"]
        )
        return {
            "success": True,
            "message": agents,
        }
    except Exception as e:
        title = "Error getting agents"
        frappe.log_error(frappe.get_traceback(), title)
        return {
            "success": False,
            "message": "Failed to get agents",
            "details": str(e),
        }


@frappe.whitelist()
def create_agent(full_name, certificate_no=None, qualification=None):
    try:
        agent = frappe.new_doc("Agent")
        agent.full_name = full_name
        agent.certificate_no = certificate_no
        agent.qualification = qualification
        agent.save(ignore_permissions=True)
        frappe.db.commit()
        return {"success": True, "message": agent}
    except Exception as e:
        title = "Error creating agent"
        frappe.log_error(frappe.get_traceback(), title)
        return {
            "success": False,
            "message": "Failed to create agent",
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
def get_number_of_items(item_group=None):
    if item_group:
        return frappe.db.count(
            "Item",
            {"disabled": 0, "item_group": item_group},
        )
    else:
        return frappe.db.count("Item", {"disabled": 0})


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
    Optimized for performance with batched commits and cached lookups.

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
            item_code = (
                item.get("name") or item.get("item_code") or item.get("item_name")
            )
            qty = item.get("quantity") or item.get("qty") or 1
            rate = item.get("price") or item.get("rate") or 0
            items.append({"item_code": item_code, "qty": qty, "rate": rate})
            try:
                total += float(qty) * float(rate)
            except Exception:
                total += 0

        customer = payload.get("customer_name") or get_default_customer() or ""
        
        if not customer:
            return {
                "success": False,
                "message": "Party is mandatory",
                "details": "Customer is required. Please select a customer or configure a default customer in HA POS Settings.",
            }

        # 2) Get company and account info (optimized: single query for company data)
        company = frappe.defaults.get_user_default(
            "Company"
        ) or frappe.db.get_single_value("Global Defaults", "default_company")
        
        # Fetch all company fields in one query
        company_data = frappe.get_cached_value(
            "Company",
            company,
            ["default_currency", "default_receivable_account", "default_cash_account"],
            as_dict=True
        )
        
        if not company_data:
            return {
                "success": False,
                "message": "Company not found",
                "details": f"Company {company} does not exist.",
            }
        
        company_currency = company_data.get("default_currency")
        paid_from_account = company_data.get("default_receivable_account")
        default_paid_to_account = company_data.get("default_cash_account") or paid_from_account
        
        if not paid_from_account or not default_paid_to_account:
            return {
                "success": False,
                "message": "Missing company accounts",
                "details": "Company is missing default receivable or cash account. Please configure company defaults.",
            }

        # Handle "Multi" payment method - use Cash as fallback
        if payment_method == "Multi":
            payment_method = "Cash"
        payment_method = payment_method or "Cash"

        # Get default account from Mode of Payment Account (after payment_method is finalized)
        mode_account = default_paid_to_account  # Default fallback
        if payment_method and payment_method != "Cash":
            mode_accounts = frappe.get_all(
                "Mode of Payment Account",
                filters={"parent": payment_method, "company": company},
                fields=["default_account"],
                limit=1
            )
            if mode_accounts and mode_accounts[0].default_account:
                mode_account = mode_accounts[0].default_account

        # Get mode of payment type to check if it's Bank (requires reference_no and reference_date)
        # Check mode type more reliably
        mode_type = None
        if payment_method:
            try:
                mode_type = frappe.get_cached_value("Mode of Payment", payment_method, "type")
            except Exception:
                try:
                    mode_doc = frappe.get_doc("Mode of Payment", payment_method)
                    mode_type = mode_doc.type if hasattr(mode_doc, 'type') else None
                except Exception:
                    mode_type = None
        
        # Also check if the account type is Bank
        account_type = None
        try:
            account_type = frappe.get_cached_value("Account", mode_account, "account_type")
        except Exception:
            pass

        # Get account currencies in one query (optimized)
        account_currencies = frappe.get_all(
            "Account",
            filters={"name": ["in", [paid_from_account, mode_account]]},
            fields=["name", "account_currency"],
            as_list=False
        )
        account_currency_map = {acc["name"]: acc.get("account_currency") or company_currency for acc in account_currencies}
        
        paid_from_currency = account_currency_map.get(paid_from_account, company_currency)
        paid_to_currency = account_currency_map.get(mode_account, company_currency)
        
        paid_amount = float(amount) if amount is not None else total
        if paid_amount > total:
            paid_amount = total

        # Calculate exchange rates (only if currencies differ)
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
            except Exception:
                # Default to 1.0 on error (skip logging for performance)
                target_exchange_rate = 1.0
                received_amount = paid_amount

        # 3 Create all documents in sequence, batch commit at end
        try:
            # Create payment entry
            payment_entry = frappe.new_doc("Payment Entry")
            payment_entry.payment_type = "Receive"
            payment_entry.party_type = "Customer"
            payment_entry.party = customer
            payment_entry.company = company
            payment_entry.posting_date = frappe.utils.nowdate()
            payment_entry.paid_from = paid_from_account
            payment_entry.paid_to = mode_account  # Use default account from Mode of Payment Account
            payment_entry.paid_from_account_currency = paid_from_currency
            payment_entry.paid_to_account_currency = paid_to_currency
            payment_entry.paid_amount = paid_amount
            payment_entry.received_amount = received_amount
            payment_entry.source_exchange_rate = source_exchange_rate
            payment_entry.target_exchange_rate = target_exchange_rate
            
            # For Bank transactions, reference_no and reference_date are mandatory
            # Check both mode_type and account_type to be safe
            is_bank_transaction = (mode_type == "Bank") or (account_type == "Bank")
            
            if is_bank_transaction:
                # Always set reference_no and reference_date for Bank transactions
                payment_entry.reference_no = f"REF-{frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')}"
                payment_entry.reference_date = frappe.utils.nowdate()
            else:
                payment_entry.reference_no = None
                payment_entry.reference_date = None
                
            payment_entry.remarks = note or "POS Payment"
            payment_entry.mode_of_payment = payment_method
            
            # Use frappe.flags to bypass validation if needed
            frappe.flags.ignore_validate = True
            frappe.flags.ignore_links = True
            try:
                payment_entry.insert(ignore_permissions=True)
                payment_entry.submit(ignore_permissions=True)
            finally:
                frappe.flags.ignore_validate = False
                frappe.flags.ignore_links = False

            # Create HA Order
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
            # Use frappe.flags to bypass validation if needed
            frappe.flags.ignore_validate = True
            try:
                order.insert(ignore_permissions=True)
            finally:
                frappe.flags.ignore_validate = False
            order_id = order.name

            # Update table if needed (optimized: only if table exists)
            table_name = payload.get("table")
            if table_name and order.order_type == "Dine In":
                try:
                    table = frappe.get_doc("HA Table", table_name)
                    table.assigned_waiter = safe(payload.get("waiter"))
                    table.customer_name = safe(payload.get("customer_name"))
                    table.save(ignore_permissions=True, ignore_validate=True)
                except Exception:
                    # Skip table update if it fails (non-critical)
                    pass

            # Create sales invoice
            from havano_restaurant_pos.havano_restaurant_pos.doctype.ha_pos_invoice.ha_pos_invoice import (
                create_sales_invoice,
            )
            inv = create_sales_invoice(customer, items)

            # Single commit at the end (optimized: batch commit)
            frappe.db.commit()

            return {
                "success": True,
                "message": "Order, invoice and payment created",
                "order_id": order_id,
                "sales_invoice": inv.get("name") if isinstance(inv, dict) else inv,
                "payment_entry": payment_entry.name,
            }
        except Exception as e:
            frappe.db.rollback()
            title = "Error creating order/invoice/payment"
            frappe.log_error(frappe.get_traceback(), title)
            return {
                "success": False,
                "message": "Failed to create order/invoice/payment",
                "details": str(e),
            }

    except Exception as e:
        frappe.db.rollback()
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
            limit=1,
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
def convert_quotation_to_sales_invoice_from_cart(
    quotation_name,
    items,
    customer,
    order_type=None,
    table=None,
    waiter=None,
    customer_name=None,
):
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
                quotation_items.add(
                    (item.item_code, float(item.qty or 1), float(item.rate or 0))
                )

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
                    frappe.log_error(
                        f"Warning: Could not cancel quotation: {frappe.get_traceback()}"
                    )
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

                quotation.append(
                    "items",
                    {
                        "item_code": item_code,
                        "qty": qty,
                        "rate": rate,
                    },
                )

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
                frappe.log_error(
                    f"Quotation submit error: {frappe.get_traceback()}",
                    "Quotation Submit Error",
                )
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
            frappe.log_error(
                f"Conversion error: {frappe.get_traceback()}", "Convert Quotation Error"
            )
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
            frappe.log_error(
                f"Insert error: {frappe.get_traceback()}", "Sales Invoice Insert Error"
            )
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
            frappe.log_error(
                f"Submit error: {frappe.get_traceback()}", "Sales Invoice Submit Error"
            )
            # Try to get the invoice name even if submit failed
            sales_invoice_name = (
                sales_invoice.name if hasattr(sales_invoice, "name") else None
            )
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

                ha_order.append(
                    "order_items",
                    {
                        "menu_item": safe(item_code),
                        "qty": qty,
                        "rate": rate,
                        "amount": qty * rate,
                    },
                )

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
        elif (
            "docstatus" in error_lower
            or "submitted" in error_lower
            or "not draft" in error_lower
        ):
            return {
                "success": False,
                "message": "Quotation cannot be modified. Please check if it's already converted or has dependencies.",
                "details": error_message,
                "error_type": error_type,
            }
        elif (
            "validation" in error_lower
            or "mandatory" in error_lower
            or "required" in error_lower
        ):
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
def create_transaction(
    doctype,
    customer,
    items,
    company=None,
    order_type=None,
    table=None,
    waiter=None,
    customer_name=None,
    agent=None,
):
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
            company = frappe.defaults.get_user_default(
                "Company"
            ) or frappe.db.get_single_value("Global Defaults", "default_company")

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
            doc.custom_agent = agent if agent else ""

        # Add items
        for item in items:
            item_code = item.get("item_code") or item.get("name")
            qty = float(item.get("qty") or item.get("quantity") or 1)
            rate = float(item.get("rate") or item.get("price") or 0)

            doc.append(
                "items",
                {
                    "item_code": item_code,
                    "qty": qty,
                    "rate": rate,
                },
            )

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

                ha_order.append(
                    "order_items",
                    {
                        "menu_item": safe(item_code),
                        "qty": qty,
                        "rate": rate,
                        "amount": qty * rate,
                    },
                )

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


def process_payment_for_transaction_background(
    doctype,
    docname,
    amount=None,
    payment_method=None,
    note=None,
    payment_breakdown=None,
):
    """Background job to process payment for an existing Sales Invoice or Quotation.
    This runs asynchronously in the queue.
    IMPORTANT: This function must be callable from frappe.enqueue.
    """
    frappe.set_user("Administrator")  # Ensure proper permissions in background job
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
                limit=1,
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
        outstanding_amount = (
            doc.outstanding_amount
            if hasattr(doc, "outstanding_amount")
            else doc.grand_total
        )

        # Parse payment breakdown if provided, or parse from note if payment_method is "Multi"
        payments_list = []
        if payment_breakdown:
            if isinstance(payment_breakdown, str):
                import json
                payment_breakdown = frappe.parse_json(payment_breakdown)
            # Ensure it's a list
            if isinstance(payment_breakdown, list):
                payments_list = payment_breakdown
            elif isinstance(payment_breakdown, dict):
                # Single payment object
                payments_list = [payment_breakdown]
        elif payment_method == "Multi" and note:
            # Parse payment breakdown from note (format: "Cash:50, Card:30")
            import re
            breakdown_pattern = r"([^:]+):([0-9.]+)"
            matches = re.findall(breakdown_pattern, note)
            for method, amt in matches:
                method = method.strip()
                try:
                    amt = float(amt)
                    if amt > 0:
                        payments_list.append({"payment_method": method, "amount": amt})
                except (ValueError, TypeError):
                    continue

        # If we have multiple payments, use breakdown; otherwise use single payment
        if payments_list and len(payments_list) > 0:
            # Multiple payment methods - create separate payment entries
            total_paid = sum(float(p.get("amount", 0)) for p in payments_list)
            if total_paid > float(outstanding_amount):
                # Scale down proportionally if total exceeds outstanding
                scale_factor = float(outstanding_amount) / total_paid
                for p in payments_list:
                    p["amount"] = float(p.get("amount", 0)) * scale_factor
                total_paid = float(outstanding_amount)
        else:
            # Single payment method
            paid_amount = (
                float(amount) if amount is not None else float(outstanding_amount)
            )
            # Cap payment amount at outstanding amount if it exceeds
            if paid_amount > float(outstanding_amount):
                paid_amount = float(outstanding_amount)

            # Handle "Multi" payment method - use Cash as fallback
            if payment_method == "Multi":
                payment_method = "Cash"

            payments_list = [
                {"payment_method": payment_method or "Cash", "amount": paid_amount}
            ]

        if (
            not payments_list
            or sum(float(p.get("amount", 0)) for p in payments_list) <= 0
        ):
            return {
                "success": False,
                "message": "Payment amount must be greater than 0",
            }

        # Get company accounts (optimized: single query)
        company_data = frappe.get_cached_value(
            "Company",
            company,
            ["default_currency", "default_receivable_account", "default_cash_account"],
            as_dict=True
        )
        
        if not company_data:
            return {
                "success": False,
                "message": "Company not found",
                "details": f"Company {company} does not exist.",
            }
        
        company_currency = company_data.get("default_currency")
        paid_from_account = company_data.get("default_receivable_account")
        paid_to_account = company_data.get("default_cash_account") or paid_from_account

        if not paid_from_account or not paid_to_account:
            return {
                "success": False,
                "message": "Missing company accounts",
                "details": "Company is missing default receivable or cash account. Please configure company defaults.",
            }

        # Get account currencies in one query (optimized)
        account_currencies = frappe.get_all(
            "Account",
            filters={"name": ["in", [paid_from_account, paid_to_account]]},
            fields=["name", "account_currency"],
            as_list=False
        )
        account_currency_map = {acc["name"]: acc.get("account_currency") or company_currency for acc in account_currencies}
        
        paid_from_currency = account_currency_map.get(paid_from_account, company_currency)
        paid_to_currency = account_currency_map.get(paid_to_account, company_currency)

        # Create payment entries for each payment method
        created_payments = []
        remaining_outstanding = float(outstanding_amount)
        error_messages = []  # Collect error messages for debugging

        for payment_info in payments_list:
            method = payment_info.get("payment_method", "Cash")
            paid_amount = float(payment_info.get("amount", 0))

            if paid_amount <= 0:
                continue

            # Cap individual payment at remaining outstanding
            if paid_amount > remaining_outstanding:
                paid_amount = remaining_outstanding

            if paid_amount <= 0:
                continue

            # Validate mode of payment exists and get default account
            # IMPORTANT: Ensure mode_of_payment exists in database (Link field requirement)
            original_method = method  # Preserve original method name for payment entry
            
            # Validate that the mode of payment exists (required for Link field)
            mode_exists = frappe.db.exists("Mode of Payment", method) if method else False
            
            # If mode doesn't exist, try to create it
            if not mode_exists and method and method != "Cash":
                try:
                    # Try to create the Mode of Payment if it doesn't exist
                    new_mode = frappe.new_doc("Mode of Payment")
                    new_mode.mode_of_payment = method
                    new_mode.type = "Cash"  # Default type
                    new_mode.insert(ignore_permissions=True)
                    frappe.db.commit()
                    mode_exists = True
                    frappe.log_error(
                        f"Created new Mode of Payment '{method}' automatically",
                        "Mode of Payment Auto-Created"
                    )
                except Exception as create_error:
                    # If creation fails, log error but continue - we'll use ignore_links
                    frappe.log_error(
                        f"Mode of Payment '{method}' does not exist and could not be created: {str(create_error)}. Will use ignore_links to bypass validation.",
                        "Mode of Payment Creation Failed"
                    )
            
            # Use original method for payment entry (ignore_links will bypass validation if mode doesn't exist)
            # We always use the original method name - ignore_links will handle validation
            
            # Get default account from Mode of Payment Account
            mode_account = None
            if method and method != "Cash":
                mode_accounts = frappe.get_all(
                    "Mode of Payment Account",
                    filters={"parent": method, "company": company},
                    fields=["default_account"],
                    limit=1
                )
                if mode_accounts and mode_accounts[0].default_account:
                    mode_account = mode_accounts[0].default_account
            
            # If no mode account found, use company default cash account
            if not mode_account:
                mode_account = paid_to_account

            # Get account currency for mode account
            mode_account_currency = frappe.get_cached_value("Account", mode_account, "account_currency") or company_currency
            
            # Get mode of payment type to check if it's Bank (requires reference_no and reference_date)
            # Check mode type more reliably - try to get it even if mode_exists check failed
            mode_type = None
            if original_method:
                try:
                    # Try to get mode type directly from database
                    mode_type = frappe.get_cached_value("Mode of Payment", original_method, "type")
                except Exception:
                    # If cached value fails, try direct query
                    try:
                        mode_doc = frappe.get_doc("Mode of Payment", original_method)
                        mode_type = mode_doc.type if hasattr(mode_doc, 'type') else None
                    except Exception:
                        mode_type = None
            
            # Also check if the account type is Bank
            account_type = None
            try:
                account_type = frappe.get_cached_value("Account", mode_account, "account_type")
            except Exception:
                pass

            source_exchange_rate = 1.0
            target_exchange_rate = 1.0
            received_amount = paid_amount

            if paid_from_currency != mode_account_currency:
                try:
                    from erpnext.setup.utils import get_exchange_rate
                    target_exchange_rate = get_exchange_rate(
                        paid_from_currency, mode_account_currency, frappe.utils.nowdate()
                    )
                    received_amount = paid_amount * target_exchange_rate
                except Exception:
                    # Default to 1.0 on error (skip logging for performance)
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
                payment_entry.paid_to = mode_account  # Use default account from Mode of Payment Account
                payment_entry.paid_from_account_currency = paid_from_currency
                payment_entry.paid_to_account_currency = mode_account_currency
                payment_entry.paid_amount = paid_amount
                payment_entry.received_amount = received_amount
                payment_entry.source_exchange_rate = source_exchange_rate
                payment_entry.target_exchange_rate = target_exchange_rate
                
                # For Bank transactions, reference_no and reference_date are mandatory
                # Check both mode_type and account_type to be safe
                is_bank_transaction = (mode_type == "Bank") or (account_type == "Bank")
                
                if is_bank_transaction:
                    # Always set reference_no and reference_date for Bank transactions
                    payment_entry.reference_no = docname or f"REF-{frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')}"
                    payment_entry.reference_date = frappe.utils.nowdate()
                else:
                    payment_entry.reference_no = None
                    payment_entry.reference_date = frappe.utils.nowdate()
                
                payment_entry.remarks = (
                    note or f"Payment for {doctype} {docname} - {original_method}"
                )
                payment_entry.mode_of_payment = original_method  # Use original method name

                # Add reference to the Sales Invoice
                payment_entry.append(
                    "references",
                    {
                        "reference_doctype": doctype,
                        "reference_name": docname,
                        "allocated_amount": paid_amount,
                    },
                )

                # Insert payment entry
                try:
                    # Use frappe.flags to bypass validation if needed
                    frappe.flags.ignore_validate = True
                    frappe.flags.ignore_links = True
                    payment_entry.insert(ignore_permissions=True)
                except Exception as insert_error:
                    # If insert still fails, log and raise
                    error_detail = f"Insert failed for {original_method}: {str(insert_error)}"
                    frappe.log_error(
                        f"{error_detail}\nPayment Entry Data: mode_of_payment={original_method}, paid_to={mode_account}, company={company}, mode_type={mode_type}",
                        "Payment Entry Insert Error"
                    )
                    raise Exception(error_detail)
                finally:
                    # Reset flags
                    frappe.flags.ignore_validate = False
                    frappe.flags.ignore_links = False
                
                # Submit payment entry
                try:
                    payment_entry.submit(ignore_permissions=True)
                except Exception as submit_error:
                    # If submit fails, try to delete and recreate with ignore_validate
                    try:
                        if payment_entry.name:
                            frappe.delete_doc("Payment Entry", payment_entry.name, ignore_permissions=True, force=True)
                    except:
                        pass
                    
                    # Recreate payment entry
                    payment_entry = frappe.new_doc("Payment Entry")
                    payment_entry.payment_type = "Receive"
                    payment_entry.party_type = "Customer"
                    payment_entry.party = customer
                    payment_entry.company = company
                    payment_entry.posting_date = frappe.utils.nowdate()
                    payment_entry.paid_from = paid_from_account
                    payment_entry.paid_to = mode_account  # Use default account from Mode of Payment Account
                    payment_entry.paid_from_account_currency = paid_from_currency
                    payment_entry.paid_to_account_currency = mode_account_currency
                    payment_entry.paid_amount = paid_amount
                    payment_entry.received_amount = received_amount
                    payment_entry.source_exchange_rate = source_exchange_rate
                    payment_entry.target_exchange_rate = target_exchange_rate
                    
                    # For Bank transactions, reference_no and reference_date are mandatory
                    # Check both mode_type and account_type to be safe
                    is_bank_transaction = (mode_type == "Bank") or (account_type == "Bank")
                    
                    if is_bank_transaction:
                        # Always set reference_no and reference_date for Bank transactions
                        payment_entry.reference_no = docname or f"REF-{frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')}"
                        payment_entry.reference_date = frappe.utils.nowdate()
                    else:
                        payment_entry.reference_no = None
                        payment_entry.reference_date = frappe.utils.nowdate()
                    
                    payment_entry.remarks = note or f"Payment for {doctype} {docname} - {original_method}"
                    payment_entry.mode_of_payment = original_method  # Use original method name
                    payment_entry.append(
                        "references",
                        {
                            "reference_doctype": doctype,
                            "reference_name": docname,
                            "allocated_amount": paid_amount,
                        },
                    )
                    # Use frappe.flags to bypass validation
                    frappe.flags.ignore_validate = True
                    frappe.flags.ignore_links = True
                    try:
                        payment_entry.insert()
                        payment_entry.submit()
                    finally:
                        frappe.flags.ignore_validate = False
                        frappe.flags.ignore_links = False
                
                created_payments.append(payment_entry.name)
                remaining_outstanding -= paid_amount

            except Exception as e:
                # Collect error message for debugging
                error_msg = f"Failed to create payment entry for {original_method} (amount: {paid_amount}): {str(e)}"
                error_messages.append(error_msg)
                error_traceback = frappe.get_traceback()
                frappe.log_error(
                    f"{error_msg}\nOriginal Method: {original_method}\nMode Account: {mode_account}\nTraceback: {error_traceback}",
                    "Payment Entry Error"
                )
                # Continue with other payment methods even if one fails
                continue

        # Single commit at the end (optimized: batch commit)
        if created_payments:
            frappe.db.commit()
        else:
            # Rollback if no payments were created
            frappe.db.rollback()

        if not created_payments:
            # Provide more detailed error message with actual errors
            error_details = "No payment entries were created. "
            if not payments_list:
                error_details += "No payment methods or amounts were provided."
            elif sum(float(p.get("amount", 0)) for p in payments_list) <= 0:
                error_details += "All payment amounts are zero or invalid."
            else:
                error_details += "All payment entry creations failed. "
                if error_messages:
                    error_details += f"Errors: {'; '.join(error_messages[:3])}"  # Show first 3 errors
                else:
                    error_details += "Please check payment methods, amounts, and company account settings."
            
            return {
                "success": False,
                "message": "Failed to create payment entries",
                "details": error_details,
                "errors": error_messages[:5] if error_messages else None,  # Return first 5 errors for debugging
            }

        return {
            "success": True,
            "message": f"Payment created successfully for {doctype} {docname}",
            "payment_entry": (
                created_payments[0] if len(created_payments) == 1 else created_payments
            ),
            "payment_entries": created_payments,
            "transaction": docname,
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
def make_payment_for_transaction(
    doctype,
    docname,
    amount=None,
    payment_method=None,
    note=None,
    payment_breakdown=None,
):
    """Make payment for an existing Sales Invoice or Quotation.
    Returns immediately with job ID for async processing.

    Args:
        doctype: "Sales Invoice" or "Quotation"
        docname: Name of the Sales Invoice or Quotation
        amount: Payment amount (optional, defaults to outstanding amount)
        payment_method: Mode of payment (optional, defaults to "Cash")
        note: Payment notes (optional)
        payment_breakdown: List of dicts with payment_method and amount (optional, for multiple payment methods)
    """
    try:
        # Basic validation before queuing
        if not doctype or not docname:
            return {
                "success": False,
                "message": "Missing required parameters",
                "details": "doctype and docname are required.",
            }
        
        # Verify document exists
        if not frappe.db.exists(doctype, docname):
            return {
                "success": False,
                "message": "Document not found",
                "details": f"{doctype} {docname} does not exist.",
            }
        
        # Enqueue payment processing in background
        job_id = None
        try:
            job_kwargs = {
                "method": "havano_restaurant_pos.havano_restaurant_pos.api.process_payment_for_transaction_background",
                "queue": "default",
                "timeout": 300,
                "is_async": True,
                "doctype": doctype,
                "docname": docname,
                "amount": amount,
                "payment_method": payment_method,
                "note": note,
                "payment_breakdown": payment_breakdown
            }
            
            try:
                job_kwargs["job_name"] = f"process_payment_for_transaction_{docname}_{frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')}"
            except:
                pass
            
            job = frappe.enqueue(**job_kwargs)
            job_id = job.id if hasattr(job, 'id') else (job if isinstance(job, str) else None)
            
            frappe.logger().info(f"Payment for transaction queued, job_id: {job_id}, doctype: {doctype}, docname: {docname}")
            
        except Exception as queue_error:
            # If queue fails, log error but still return success (payment will be processed in background)
            error_msg = f"Queue enqueue failed for payment transaction: {str(queue_error)}\n{frappe.get_traceback()}"
            frappe.log_error(error_msg, "Make Payment For Transaction Queue Error")
            # Still return success - the background job will handle it
            job_id = None
        
        # Return success immediately
        return {
            "success": True,
            "message": "Payment queued successfully",
            "details": "Payment is being processed in the background",
            "job_id": job_id,
        }

    except Exception as e:
        error_traceback = frappe.get_traceback()
        error_type = type(e).__name__
        error_msg = str(e)
        
        try:
            frappe.log_error(
                f"Make Payment For Transaction Failed\n"
                f"Error Type: {error_type}\n"
                f"Error Message: {error_msg}\n"
                f"Traceback: {error_traceback}",
                "Make Payment For Transaction Failed"
            )
        except Exception as log_error:
            try:
                frappe.log_error(f"Make Payment For Transaction Failed: {error_type}: {error_msg}", "Make Payment For Transaction Failed")
            except:
                pass

        return {
            "success": False,
            "message": "Failed to queue payment",
            "details": f"{error_type}: {error_msg}",
        }


@frappe.whitelist()
def get_invoice_json(invoice_name):
    try:
        invoice = frappe.get_doc("Sales Invoice", invoice_name)
        company = frappe.get_doc("Company", invoice.company)

        # Get company address from Address doctype (optimized: single query)
        company_address = ""
        address_data = frappe.get_all(
            "Address",
            filters={
                "link_doctype": "Company",
                "link_name": company.name,
                "is_primary_address": 1
            },
            fields=["address_line1", "address_line2", "city", "state", "pincode"],
            limit=1
        )
        
        if address_data:
            addr = address_data[0]
            address_parts = []
            if addr.get("address_line1"):
                address_parts.append(addr.get("address_line1"))
            if addr.get("address_line2"):
                address_parts.append(addr.get("address_line2"))
            company_address = ", ".join(address_parts) if address_parts else ""
            # Use address city/state/pincode if available, otherwise fall back to company
            company_city = addr.get("city") or getattr(company, "city", "") or ""
            company_state = addr.get("state") or getattr(company, "state", "") or ""
            company_pincode = addr.get("pincode") or getattr(company, "pincode", "") or ""
        else:
            # Fallback: try to get any address for the company
            fallback_address = frappe.get_all(
                "Address",
                filters={
                    "link_doctype": "Company",
                    "link_name": company.name
                },
                fields=["address_line1", "address_line2", "city", "state", "pincode"],
                limit=1
            )
            if fallback_address:
                addr = fallback_address[0]
                address_parts = []
                if addr.get("address_line1"):
                    address_parts.append(addr.get("address_line1"))
                if addr.get("address_line2"):
                    address_parts.append(addr.get("address_line2"))
                company_address = ", ".join(address_parts) if address_parts else ""
                company_city = addr.get("city") or getattr(company, "city", "") or ""
                company_state = addr.get("state") or getattr(company, "state", "") or ""
                company_pincode = addr.get("pincode") or getattr(company, "pincode", "") or ""
            else:
                # No address found, use company fields or empty
                company_address = ""
                company_city = getattr(company, "city", "") or ""
                company_state = getattr(company, "state", "") or ""
                company_pincode = getattr(company, "pincode", "") or ""

        # Build item list
        items = []
        for item in invoice.items:
            items.append(
                {
                    "ProductName": item.item_name,
                    "productid": item.item_code,
                    "Qty": flt(item.qty),
                    "Price": flt(item.rate),
                    "Amount": flt(item.amount),
                    "tax_type": item.tax_type if hasattr(item, "tax_type") else "VAT",
                    "tax_rate": (
                        str(item.tax_rate) if hasattr(item, "tax_rate") else "15.0"
                    ),
                    "tax_amount": (
                        str(item.tax_amount) if hasattr(item, "tax_amount") else "0.00"
                    ),
                }
            )

        data = {
            "CompanyName": company.company_name,
            "CompanyAddress": company_address,
            "City": company_city,
            "State": company_state,
            "postcode": company_pincode,
            "contact": getattr(company, "phone_no", None) or getattr(company, "phone", None) or "",
            "CompanyEmail": getattr(company, "email_id", None) or "",
            "TIN": getattr(company, "tax_id", None) or "",
            "VATNo": getattr(company, "vat", None) or "",
            "Tel": getattr(company, "phone_no", None) or getattr(company, "phone", None) or "",
            "InvoiceNo": invoice.name,
            "InvoiceDate": str(invoice.creation),
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
                {"Key": invoice.currency, "Value": flt(invoice.grand_total)}
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
            "PaymentMode": invoice.payment_terms_template or "Cash",
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
    company_name = frappe.db.get_single_value("Global Defaults", "default_company")
    company = frappe.get_doc("Company", company_name)
    currency = frappe.db.get_value("Company", company, "default_currency")
    # --- Get Customer Info (custom doctype linked by customer name) ---
    customer_doc = frappe.get_doc("Customer", quote.customer_name)

    # --- Get Logged-in User (Cashier) ---
    cashier_name = frappe.db.get_value("User", frappe.session.user, "full_name")

    # --- Get Invoice Items ---
    items = frappe.get_all(
        "Quotation Item",
        filters={"parent": quote.name},
        fields=[
            "item_name as ProductName",
            "item_code as productid",
            "qty as Qty",
            "rate as Price",
            "amount as Amount",
        ],
    )
    # print(items)
    # , "vat as vat"
    for item in items:
        item_code = item.get("productid")
        print(item_code)
        # -------- Get Item Tax Category from Item Doctype -------
        tax_category = frappe.db.get_value(
            "Item Tax",
            {"parent": item_code},  # filter by parent (item_code)
            "tax_category",
        )
        tax_rate = 0
        tax_amount = 0
        print(tax_category)

        # -------- If VAT category, fetch maximum_net_rate -------
        if tax_category == "VAT":
            # Fetch the Item Tax record for VAT
            tax_info = frappe.get_all(
                "Item Tax", filters={"parent": item_code}, fields=["maximum_net_rate"]
            )
            if tax_info:
                tax_rate = tax_info[0].maximum_net_rate or 0

            # -------- Calculate tax amount --------
            tax_amount = (tax_rate / 100) * item.get("Amount", 0)
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
        "doc_type": "Quote",
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
        "CustomerContact": customer_doc.customer_name,  # You may adjust if you have a field for contact
        "CustomerTradeName": getattr(customer_doc, "trade_name", None),
        "CustomerEmail": getattr(customer_doc, "email_id", None),
        "CustomerTIN": getattr(customer_doc, "tin", None),
        "CustomerVAT": getattr(customer_doc, "vat", None),
        "Customeraddress": getattr(customer_doc, "customer_address", None),
        "itemlist": items,
        "AmountTendered": str(quote.grand_total or "0"),
        "Change": "0",
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


@frappe.whitelist()
def create_product_bundle(new_item, price, items):

    parent_item = None

    try:
        # menu_item_group = frappe.db.get_single_value(
        #     "Sample POS Settings", "menu_item_group"
        # )

        # if not menu_item_group:
        #     frappe.throw("Menu Item Group is not set in Sample POS Settings")

        parent_item = frappe.get_doc(
            {
                "doctype": "Item",
                "item_code": new_item,
                "item_name": new_item,
                "item_group": "Products",
                "standard_rate": flt(price),
                "is_stock_item": 0,
            }
        ).insert(ignore_permissions=True)

        product_bundle = frappe.new_doc("Product Bundle")
        product_bundle.new_item_code = parent_item.name

        for item_code, qty in items.items():
            product_bundle.append("items", {"item_code": item_code, "qty": qty})

        product_bundle.insert(ignore_permissions=True)

        return {
            "success": True,
            "message": "Product bundle created successfully",
            # "product_bundle": product_bundle.name,
            "item": parent_item,
        }

    except Exception as e:
        if parent_item:
            try:
                parent_item.delete()
            except Exception as delete_error:
                frappe.log_error(
                    f"Failed to delete parent item {parent_item.name}: {delete_error}",
                    "Product Bundle Cleanup",
                )

        return {
            "success": False,
            "message": str(e) or "Failed to create product bundle",
        }


@frappe.whitelist()
def save_item_preparation_remark(item, remark):
    try:
        if not item or not remark:
            return {"success": False, "error": "Item and remark are required"}

        remark = remark.strip()

        if not remark:
            return {"success": False, "error": "Remark cannot be empty"}

        if not frappe.db.exists("Item", item):
            return {"success": False, "error": f"Item '{item}' does not exist"}

        if frappe.db.exists("Preparation Remark", {"remark": remark}):
            prep_remark_name = frappe.db.get_value(
                "Preparation Remark", {"remark": remark}, "name"
            )
        else:
            prep_doc = frappe.new_doc("Preparation Remark")
            prep_doc.remark = remark
            prep_doc.insert(ignore_permissions=True)
            prep_remark_name = prep_doc.name

        item_doc = frappe.get_doc("Item", item)

        for row in item_doc.custom_preparation_remark:
            if row.preparation_remark == prep_remark_name:
                return {"success": True, "message": "Remark already linked to item"}

        item_doc.append(
            "custom_preparation_remark",
            {
                "preparation_remark": prep_remark_name,
                "remark": remark,
            },
        )

        item_doc.save(ignore_permissions=True)

        return {
            "success": True,
            "message": "Remark saved and linked to item successfully",
        }

    except Exception as e:
        frappe.log_error(
            title="Save Item Preparation Remark Failed", message=frappe.get_traceback()
        )

        return {"success": False, "error": str(e)}


@frappe.whitelist()
def get_item_preparation_remarks(item):
    try:
        if not item:
            return {"success": False, "remarks": [], "error": "Item is required"}

        if not frappe.db.exists("Item", item):
            return {
                "success": False,
                "remarks": [],
                "error": f"Item '{item}' does not exist",
            }

        item_doc = frappe.get_doc("Item", item)

        prep_remarks = frappe.get_all("Preparation Remark", pluck="remark")

        remarks = [
            row.remark for row in item_doc.custom_preparation_remark if row.remark
        ]

        return {"success": True, "remarks": remarks, "prep_remarks": prep_remarks}

    except Exception as e:
        frappe.log_error(
            title="Get Item Preparation Remarks Failed", message=frappe.get_traceback()
        )

        return {"success": False, "remarks": [], "error": str(e)}


@frappe.whitelist()
def get_ha_pos_settings():
    """Get HA POS Settings document (Single doctype)"""
    try:
        settings = frappe.get_single("HA POS Settings")
        return {
            "success": True,
            "data": settings.as_dict()
        }
    except Exception as e:
        frappe.log_error(f"Error fetching HA POS Settings: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def process_multi_currency_payment_background(customer, payments):
    """Background job to process multi-currency payment entries.
    This runs asynchronously in the queue.
    IMPORTANT: This function must be callable from frappe.enqueue.
    """
    frappe.set_user("Administrator")  # Ensure proper permissions in background job
    try:
        # Parse JSON if payments is a string
        if payments is None:
            return {
                "success": False,
                "message": "No payments provided",
                "details": "Payments parameter is None.",
            }
        
        if isinstance(payments, str):
            try:
                payments = frappe.parse_json(payments)
            except Exception as parse_error:
                return {
                    "success": False,
                    "message": "Invalid payments format",
                    "details": f"Could not parse payments JSON: {str(parse_error)}",
                }
        
        if isinstance(customer, str) and customer.startswith('"'):
            try:
                customer = frappe.parse_json(customer)
            except Exception:
                pass
        
        # Get company from user defaults or Global Defaults
        company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
        
        if not company:
            return {
                "success": False,
                "message": "Company not found",
                "details": "Please set default company in user defaults or Global Defaults.",
            }

        if not customer:
            customer = get_default_customer()

        # Get company currency
        company_currency = frappe.get_cached_value("Company", company, "default_currency")
        if not company_currency:
            company_currency = frappe.get_single_value("System Settings", "currency") or "USD"

        # Get company accounts
        company_data = frappe.get_cached_value(
            "Company",
            company,
            ["default_receivable_account", "default_cash_account"],
            as_dict=True
        )
        
        if not company_data:
            return {
                "success": False,
                "message": "Company data not found",
                "details": f"Could not retrieve company data for {company}.",
            }
        
        paid_from_account = company_data.get("default_receivable_account")
        paid_to_account = company_data.get("default_cash_account") or paid_from_account

        if not paid_from_account or not isinstance(paid_from_account, str):
            return {
                "success": False,
                "message": "Missing company accounts",
                "details": f"Company is missing default receivable account. Got type: {type(paid_from_account).__name__}",
            }
        
        if not paid_to_account or not isinstance(paid_to_account, str):
            return {
                "success": False,
                "message": "Missing company accounts",
                "details": f"Company is missing default cash account. Got type: {type(paid_to_account).__name__}",
            }

        # Get account currencies
        account_list = []
        if isinstance(paid_from_account, str):
            account_list.append(paid_from_account)
        if isinstance(paid_to_account, str) and paid_to_account != paid_from_account:
            account_list.append(paid_to_account)
        
        if not account_list:
            return {
                "success": False,
                "message": "Invalid account format",
                "details": "Accounts must be strings.",
            }
        
        try:
            account_currencies = frappe.get_all(
                "Account",
                filters={"name": ["in", account_list]},
                fields=["name", "account_currency"],
                as_list=False
            )
            if not isinstance(account_currencies, list):
                account_currencies = []
        except Exception as e:
            frappe.log_error(f"Error getting account currencies: {str(e)}", "Multi Currency Payment Account Error")
            account_currencies = []
        
        account_currency_map = {}
        try:
            if account_currencies and isinstance(account_currencies, list) and not isinstance(account_currencies, Exception):
                for acc in account_currencies:
                    if acc and isinstance(acc, dict) and "name" in acc:
                        account_currency_map[acc["name"]] = acc.get("account_currency") or company_currency
        except Exception as e:
            frappe.log_error(f"Error building account currency map: {str(e)}", "Multi Currency Payment Currency Map Error")
            account_currency_map = {}
        
        paid_from_currency = account_currency_map.get(paid_from_account, company_currency)
        paid_to_currency = account_currency_map.get(paid_to_account, company_currency)

        created_payments = []
        error_messages = []

        # Validate payments parameter
        if not payments:
            return {
                "success": False,
                "message": "No payments provided",
                "details": "Payments parameter is required.",
            }
        
        if isinstance(payments, str):
            try:
                payments = frappe.parse_json(payments)
            except Exception as parse_error:
                return {
                    "success": False,
                    "message": "Invalid payments format",
                    "details": f"Payments must be a valid JSON object. Error: {str(parse_error)}",
                }
        
        if not isinstance(payments, dict):
            return {
                "success": False,
                "message": "Invalid payments format",
                "details": f"Payments must be a dictionary, got {type(payments).__name__}.",
            }
        
        if len(payments) == 0:
            return {
                "success": False,
                "message": "No payments provided",
                "details": "Payments dictionary is empty. Please provide at least one payment method with amount > 0.",
            }

        try:
            payments_items = payments.items()
        except (AttributeError, TypeError) as e:
            return {
                "success": False,
                "message": "Invalid payments format",
                "details": f"Cannot iterate over payments: {str(e)}. Type: {type(payments).__name__}",
            }
        
        for key, payment_info in payments_items:
            try:
                if isinstance(payment_info, dict):
                    method = payment_info.get("mode", "Cash")
                    paid_amount = float(payment_info.get("amount", 0))
                else:
                    method = "Cash"
                    try:
                        paid_amount = float(payment_info)
                    except (ValueError, TypeError):
                        error_messages.append(f"Invalid amount for payment {key}: {payment_info}")
                        continue
            except Exception as parse_error:
                error_messages.append(f"Error parsing payment {key}: {str(parse_error)}")
                frappe.log_error(f"Error parsing payment {key}: {str(parse_error)}\nPayment info: {payment_info}", "Multi Currency Payment Parse Error")
                continue

            if paid_amount <= 0:
                continue

            original_method = method
            
            mode_exists = frappe.db.exists("Mode of Payment", method) if method else False
            
            if not mode_exists and method and method != "Cash":
                try:
                    new_mode = frappe.new_doc("Mode of Payment")
                    new_mode.mode_of_payment = method
                    new_mode.type = "Cash"
                    new_mode.insert(ignore_permissions=True)
                    frappe.db.commit()
                    mode_exists = True
                    frappe.log_error(
                        f"Created new Mode of Payment '{method}' automatically",
                        "Mode of Payment Auto-Created"
                    )
                except Exception as create_error:
                    frappe.log_error(
                        f"Mode of Payment '{method}' does not exist and could not be created: {str(create_error)}. Will use ignore_links to bypass validation.",
                        "Mode of Payment Creation Failed"
                    )
            
            mode_account = None
            if method and method != "Cash":
                mode_accounts = frappe.get_all(
                    "Mode of Payment Account",
                    filters={"parent": method, "company": company},
                    fields=["default_account"],
                    limit=1
                )
                if mode_accounts and mode_accounts[0].default_account:
                    mode_account = mode_accounts[0].default_account
            
            if not mode_account:
                mode_account = paid_to_account

            mode_account_currency = frappe.get_cached_value("Account", mode_account, "account_currency") or company_currency
            
            # Get mode of payment type to check if it's Bank (requires reference_no and reference_date)
            # Check mode type more reliably - try to get it even if mode_exists check failed
            mode_type = None
            if original_method:
                try:
                    # Try to get mode type directly from database
                    mode_type = frappe.get_cached_value("Mode of Payment", original_method, "type")
                except Exception:
                    # If cached value fails, try direct query
                    try:
                        mode_doc = frappe.get_doc("Mode of Payment", original_method)
                        mode_type = mode_doc.type if hasattr(mode_doc, 'type') else None
                    except Exception:
                        mode_type = None
            
            # Also check if the account type is Bank
            account_type = None
            try:
                account_type = frappe.get_cached_value("Account", mode_account, "account_type")
            except Exception:
                pass
            
            source_exchange_rate = 1.0
            target_exchange_rate = 1.0
            
            received_amount = paid_amount
            paid_amount_in_company_currency = paid_amount

            if paid_from_currency != mode_account_currency:
                try:
                    from erpnext.setup.utils import get_exchange_rate
                    target_exchange_rate = get_exchange_rate(
                        mode_account_currency, paid_from_currency, frappe.utils.nowdate()
                    )
                    paid_amount_in_company_currency = paid_amount * target_exchange_rate
                except Exception:
                    target_exchange_rate = 1.0
                    paid_amount_in_company_currency = paid_amount

            try:
                payment_entry = frappe.new_doc("Payment Entry")
                payment_entry.payment_type = "Receive"
                payment_entry.party_type = "Customer"
                payment_entry.party = customer
                payment_entry.company = company
                payment_entry.posting_date = frappe.utils.nowdate()
                payment_entry.paid_from = paid_from_account
                payment_entry.paid_to = mode_account
                payment_entry.paid_from_account_currency = paid_from_currency
                payment_entry.paid_to_account_currency = mode_account_currency
                payment_entry.paid_amount = paid_amount_in_company_currency
                payment_entry.received_amount = received_amount
                payment_entry.source_exchange_rate = source_exchange_rate
                payment_entry.target_exchange_rate = target_exchange_rate
                
                # For Bank transactions, reference_no and reference_date are mandatory
                # Check both mode_type and account_type to be safe
                is_bank_transaction = (mode_type == "Bank") or (account_type == "Bank")
                
                if is_bank_transaction:
                    # Always set reference_no and reference_date for Bank transactions
                    payment_entry.reference_no = f"REF-{frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')}"
                    payment_entry.reference_date = frappe.utils.nowdate()
                else:
                    payment_entry.reference_no = None
                    payment_entry.reference_date = frappe.utils.nowdate()
                
                payment_entry.remarks = f"Multi-currency payment: {original_method}"
                payment_entry.mode_of_payment = original_method

                try:
                    frappe.flags.ignore_validate = True
                    frappe.flags.ignore_links = True
                    payment_entry.insert(ignore_permissions=True)
                except Exception as insert_error:
                    error_detail = f"Insert failed for {original_method}: {str(insert_error)}"
                    frappe.log_error(
                        f"{error_detail}\nPayment Entry Data: mode_of_payment={original_method}, paid_to={mode_account}, company={company}, mode_type={mode_type}",
                        "Payment Entry Insert Error"
                    )
                    raise Exception(error_detail)
                finally:
                    frappe.flags.ignore_validate = False
                    frappe.flags.ignore_links = False
                
                try:
                    payment_entry.submit(ignore_permissions=True)
                except Exception as submit_error:
                    try:
                        if payment_entry.name:
                            frappe.delete_doc("Payment Entry", payment_entry.name, ignore_permissions=True, force=True)
                    except:
                        pass
                    
                    payment_entry = frappe.new_doc("Payment Entry")
                    payment_entry.payment_type = "Receive"
                    payment_entry.party_type = "Customer"
                    payment_entry.party = customer
                    payment_entry.company = company
                    payment_entry.posting_date = frappe.utils.nowdate()
                    payment_entry.paid_from = paid_from_account
                    payment_entry.paid_to = mode_account
                    payment_entry.paid_from_account_currency = paid_from_currency
                    payment_entry.paid_to_account_currency = mode_account_currency
                    payment_entry.paid_amount = paid_amount_in_company_currency
                    payment_entry.received_amount = received_amount
                    payment_entry.source_exchange_rate = source_exchange_rate
                    payment_entry.target_exchange_rate = target_exchange_rate
                    
                    # For Bank transactions, reference_no and reference_date are mandatory
                    # Check both mode_type and account_type to be safe
                    is_bank_transaction = (mode_type == "Bank") or (account_type == "Bank")
                    
                    if is_bank_transaction:
                        # Always set reference_no and reference_date for Bank transactions
                        payment_entry.reference_no = f"REF-{frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')}"
                        payment_entry.reference_date = frappe.utils.nowdate()
                    else:
                        payment_entry.reference_no = None
                        payment_entry.reference_date = frappe.utils.nowdate()
                    
                    payment_entry.remarks = f"Multi-currency payment: {original_method}"
                    payment_entry.mode_of_payment = original_method
                    frappe.flags.ignore_validate = True
                    frappe.flags.ignore_links = True
                    try:
                        payment_entry.insert()
                        payment_entry.submit()
                    finally:
                        frappe.flags.ignore_validate = False
                        frappe.flags.ignore_links = False
                
                created_payments.append(payment_entry.name)

            except Exception as e:
                error_msg = f"Failed to create payment entry for {original_method} (amount: {paid_amount}): {str(e)}"
                error_messages.append(error_msg)
                error_traceback = frappe.get_traceback()
                frappe.log_error(
                    f"{error_msg}\nOriginal Method: {original_method}\nMode Account: {mode_account}\nTraceback: {error_traceback}",
                    "Payment Entry Error"
                )
                continue

        if created_payments:
            frappe.db.commit()
        else:
            frappe.db.rollback()

        if not created_payments:
            return {
                "success": False,
                "message": "Failed to create payment entries",
                "details": "No payment entries were created. " + ("; ".join(error_messages[:3]) if error_messages else "Please check payment methods and accounts."),
                "errors": error_messages[:5] if error_messages else None,
            }

        return {
            "success": True,
            "message": "Multi-currency payment made successfully",
            "details": f"Created {len(created_payments)} payment entry/entries",
            "payment_entries": created_payments,
        }

    except Exception as e:
        frappe.db.rollback()
        error_traceback = frappe.get_traceback()
        error_type = type(e).__name__
        error_msg = str(e)
        
        try:
            frappe.log_error(
                f"Process Multi Currency Payment Background Failed\n"
                f"Error Type: {error_type}\n"
                f"Error Message: {error_msg}\n"
                f"Traceback: {error_traceback}",
                "Process Multi Currency Payment Background Failed"
            )
        except Exception as log_error:
            try:
                frappe.log_error(f"Process Multi Currency Payment Background Failed: {error_type}: {error_msg}", "Process Multi Currency Payment Background Failed")
            except:
                pass

        return {
            "success": False,
            "message": "Failed to make multi-currency payment",
            "details": f"{error_type}: {error_msg}",
        }


@frappe.whitelist()
def make_multi_currency_payment(customer, payments):
    """Create payment entries for each mode of payment in multi-currency payment.
    Returns immediately with job ID for async processing.
    
    payments format: {
        "mode_currency": {
            "mode": "Cash",
            "currency": "USD",
            "amount": 100.0
        }
    }
    """
    try:
        # Basic validation before queuing
        if payments is None:
            return {
                "success": False,
                "message": "No payments provided",
                "details": "Payments parameter is None.",
            }
        
        # Parse JSON if payments is a string
        if isinstance(payments, str):
            try:
                payments = frappe.parse_json(payments)
            except Exception as parse_error:
                return {
                    "success": False,
                    "message": "Invalid payments format",
                    "details": f"Could not parse payments JSON: {str(parse_error)}",
                }
        
        if isinstance(customer, str) and customer.startswith('"'):
            try:
                customer = frappe.parse_json(customer)
            except Exception:
                pass
        
        # Validate payments is a dict and not empty
        if not isinstance(payments, dict) or len(payments) == 0:
            return {
                "success": False,
                "message": "No payments provided",
                "details": "Payments dictionary is empty. Please provide at least one payment method with amount > 0.",
            }
        
        # Get company for validation
        company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
        if not company:
            return {
                "success": False,
                "message": "Company not found",
                "details": "Please set default company in user defaults or Global Defaults.",
            }

        if not customer:
            customer = get_default_customer()

        # Enqueue payment processing in background
        job_id = None
        try:
            job_kwargs = {
                "method": "havano_restaurant_pos.havano_restaurant_pos.api.process_multi_currency_payment_background",
                "queue": "default",
                "timeout": 300,
                "is_async": True,
                "customer": customer,
                "payments": payments
            }
            
            try:
                job_kwargs["job_name"] = f"process_multi_currency_payment_{frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')}"
            except:
                pass
            
            job = frappe.enqueue(**job_kwargs)
            job_id = job.id if hasattr(job, 'id') else (job if isinstance(job, str) else None)
            
            frappe.logger().info(f"Multi-currency payment queued, job_id: {job_id}, customer: {customer}")
            
        except Exception as queue_error:
            # If queue fails, log error but still return success (payment will be processed in background)
            error_msg = f"Queue enqueue failed for multi-currency payment: {str(queue_error)}\n{frappe.get_traceback()}"
            frappe.log_error(error_msg, "Make Multi Currency Payment Queue Error")
            # Still return success - the background job will handle it
            job_id = None
        
        # Return success immediately
        return {
            "success": True,
            "message": "Multi-currency payment queued successfully",
            "details": "Payment is being processed in the background",
            "job_id": job_id,
        }

    except Exception as e:
        error_traceback = frappe.get_traceback()
        error_type = type(e).__name__
        error_msg = str(e)
        
        try:
            frappe.log_error(
                f"Make Multi Currency Payment Failed\n"
                f"Error Type: {error_type}\n"
                f"Error Message: {error_msg}\n"
                f"Traceback: {error_traceback}",
                "Make Multi Currency Payment Failed"
            )
        except Exception as log_error:
            try:
                frappe.log_error(f"Make Multi Currency Payment Failed: {error_type}: {error_msg}", "Make Multi Currency Payment Failed")
            except:
                pass

            return {
                "success": False,
                "message": "Failed to queue multi-currency payment",
                "details": f"{error_type}: {error_msg}",
            }
        # Parse JSON if payments is a string - with better error handling
        if payments is None:
            return {
                "success": False,
                "message": "No payments provided",
                "details": "Payments parameter is None.",
            }
        
        # Check if payments is already an exception object
        if isinstance(payments, Exception):
            return {
                "success": False,
                "message": "Invalid payments parameter",
                "details": f"Payments parameter is an exception object: {type(payments).__name__}: {str(payments)}",
            }
        
        if isinstance(payments, str):
            try:
                payments = frappe.parse_json(payments)
            except Exception as parse_error:
                return {
                    "success": False,
                    "message": "Invalid payments format",
                    "details": f"Could not parse payments JSON: {str(parse_error)}",
                }
        
        if isinstance(customer, str) and customer.startswith('"'):
            try:
                customer = frappe.parse_json(customer)
            except Exception:
                pass  # Keep original customer value if parsing fails
        
        # Get company from user defaults or Global Defaults (same as other payment functions)
        company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company")
        
        if not company:
            return {
                "success": False,
                "message": "Company not found",
                "details": "Please set default company in user defaults or Global Defaults.",
            }

        if not customer:
            customer = get_default_customer()

        # Get company currency
        company_currency = frappe.get_cached_value("Company", company, "default_currency")
        if not company_currency:
            company_currency = frappe.get_single_value("System Settings", "currency") or "USD"

        # Get company accounts (optimized: single query)
        company_data = frappe.get_cached_value(
            "Company",
            company,
            ["default_receivable_account", "default_cash_account"],
            as_dict=True
        )
        
        if not company_data:
            return {
                "success": False,
                "message": "Company data not found",
                "details": f"Could not retrieve company data for {company}.",
            }
        
        # Get accounts (same simple approach as make_payment_for_transaction)
        paid_from_account = company_data.get("default_receivable_account")
        paid_to_account = company_data.get("default_cash_account") or paid_from_account

        # Validate accounts are strings (not TypeError or other exceptions)
        if not paid_from_account or not isinstance(paid_from_account, str):
            return {
                "success": False,
                "message": "Missing company accounts",
                "details": f"Company is missing default receivable account. Got type: {type(paid_from_account).__name__}",
            }
        
        if not paid_to_account or not isinstance(paid_to_account, str):
            return {
                "success": False,
                "message": "Missing company accounts",
                "details": f"Company is missing default cash account. Got type: {type(paid_to_account).__name__}",
            }

        # Get account currencies in one query (same as make_payment_for_transaction)
        # Build list safely without list comprehension to avoid iteration errors
        account_list = []
        if isinstance(paid_from_account, str):
            account_list.append(paid_from_account)
        if isinstance(paid_to_account, str) and paid_to_account != paid_from_account:
            account_list.append(paid_to_account)
        
        if not account_list:
            return {
                "success": False,
                "message": "Invalid account format",
                "details": "Accounts must be strings.",
            }
        
        try:
            account_currencies = frappe.get_all(
                "Account",
                filters={"name": ["in", account_list]},
                fields=["name", "account_currency"],
                as_list=False
            )
            # Ensure result is a list, not an exception
            if not isinstance(account_currencies, list):
                account_currencies = []
        except Exception as e:
            frappe.log_error(f"Error getting account currencies: {str(e)}", "Multi Currency Payment Account Error")
            account_currencies = []
        
        # Build account_currency_map safely without list comprehension
        account_currency_map = {}
        if isinstance(account_currencies, list):
            for acc in account_currencies:
                if isinstance(acc, dict) and "name" in acc:
                    account_currency_map[acc["name"]] = acc.get("account_currency") or company_currency
        
        account_currency_map = {}
        try:
            if account_currencies and isinstance(account_currencies, list) and not isinstance(account_currencies, Exception):
                for acc in account_currencies:
                    if acc and isinstance(acc, dict) and "name" in acc:
                        account_currency_map[acc["name"]] = acc.get("account_currency") or company_currency
        except Exception as e:
            frappe.log_error(f"Error building account currency map: {str(e)}", "Multi Currency Payment Currency Map Error")
            account_currency_map = {}
        
        paid_from_currency = account_currency_map.get(paid_from_account, company_currency)
        paid_to_currency = account_currency_map.get(paid_to_account, company_currency)

        created_payments = []
        error_messages = []

        # Validate payments parameter
        if not payments:
            return {
                "success": False,
                "message": "No payments provided",
                "details": "Payments parameter is required.",
            }
        
        # Ensure payments is a dict
        if isinstance(payments, str):
            try:
                payments = frappe.parse_json(payments)
            except Exception as parse_error:
                return {
                    "success": False,
                    "message": "Invalid payments format",
                    "details": f"Payments must be a valid JSON object. Error: {str(parse_error)}",
                }
        
        if not isinstance(payments, dict):
            return {
                "success": False,
                "message": "Invalid payments format",
                "details": f"Payments must be a dictionary, got {type(payments).__name__}.",
            }
        
        # Check if payments dict is empty
        if len(payments) == 0:
            return {
                "success": False,
                "message": "No payments provided",
                "details": "Payments dictionary is empty. Please provide at least one payment method with amount > 0.",
            }

        # Process each payment (payments format: {key: {mode, currency, amount}})
        # Use same logic as make_payment_for_transaction
        try:
            payments_items = payments.items()
        except (AttributeError, TypeError) as e:
            return {
                "success": False,
                "message": "Invalid payments format",
                "details": f"Cannot iterate over payments: {str(e)}. Type: {type(payments).__name__}",
            }
        
        for key, payment_info in payments_items:
            try:
                if isinstance(payment_info, dict):
                    method = payment_info.get("mode", "Cash")
                    paid_amount = float(payment_info.get("amount", 0))
                else:
                    # Legacy format: key is currency, value is amount
                    method = "Cash"
                    try:
                        paid_amount = float(payment_info)
                    except (ValueError, TypeError):
                        error_messages.append(f"Invalid amount for payment {key}: {payment_info}")
                        continue
            except Exception as parse_error:
                error_messages.append(f"Error parsing payment {key}: {str(parse_error)}")
                frappe.log_error(f"Error parsing payment {key}: {str(parse_error)}\nPayment info: {payment_info}", "Multi Currency Payment Parse Error")
                continue

            if paid_amount <= 0:
                continue

            # Validate mode of payment exists and get default account
            # IMPORTANT: Ensure mode_of_payment exists in database (Link field requirement)
            original_method = method  # Preserve original method name for payment entry
            
            # Validate that the mode of payment exists (required for Link field)
            mode_exists = frappe.db.exists("Mode of Payment", method) if method else False
            
            # If mode doesn't exist, try to create it
            if not mode_exists and method and method != "Cash":
                try:
                    # Try to create the Mode of Payment if it doesn't exist
                    new_mode = frappe.new_doc("Mode of Payment")
                    new_mode.mode_of_payment = method
                    new_mode.type = "Cash"  # Default type
                    new_mode.insert(ignore_permissions=True)
                    frappe.db.commit()
                    mode_exists = True
                    frappe.log_error(
                        f"Created new Mode of Payment '{method}' automatically",
                        "Mode of Payment Auto-Created"
                    )
                except Exception as create_error:
                    # If creation fails, log error but continue - we'll use ignore_links
                    frappe.log_error(
                        f"Mode of Payment '{method}' does not exist and could not be created: {str(create_error)}. Will use ignore_links to bypass validation.",
                        "Mode of Payment Creation Failed"
                    )
            
            # Get default account from Mode of Payment Account (same as make_payment_for_transaction)
            mode_account = None
            if method and method != "Cash":
                mode_accounts = frappe.get_all(
                    "Mode of Payment Account",
                    filters={"parent": method, "company": company},
                    fields=["default_account"],
                    limit=1
                )
                if mode_accounts and mode_accounts[0].default_account:
                    mode_account = mode_accounts[0].default_account
            
            # If no mode account found, use company default cash account
            if not mode_account:
                mode_account = paid_to_account

            # Get account currency for mode account
            mode_account_currency = frappe.get_cached_value("Account", mode_account, "account_currency") or company_currency
            
            # Get mode of payment type to check if it's Bank (requires reference_no and reference_date)
            # Check mode type more reliably - try to get it even if mode_exists check failed
            mode_type = None
            if original_method:
                try:
                    # Try to get mode type directly from database
                    mode_type = frappe.get_cached_value("Mode of Payment", original_method, "type")
                except Exception:
                    # If cached value fails, try direct query
                    try:
                        mode_doc = frappe.get_doc("Mode of Payment", original_method)
                        mode_type = mode_doc.type if hasattr(mode_doc, 'type') else None
                    except Exception:
                        mode_type = None
            
            # Also check if the account type is Bank
            account_type = None
            try:
                account_type = frappe.get_cached_value("Account", mode_account, "account_type")
            except Exception:
                pass
            
            source_exchange_rate = 1.0
            target_exchange_rate = 1.0
            
            # paid_amount is the amount customer pays in payment currency (mode_account_currency)
            # For Payment Entry:
            # - paid_amount should be in paid_from_account_currency (company currency)
            # - received_amount should be in paid_to_account_currency (payment currency)
            
            # Store original payment amount in payment currency
            received_amount = paid_amount  # Amount in payment currency (paid_to_account_currency)
            paid_amount_in_company_currency = paid_amount  # Will be converted below

            # Convert payment amount to company currency for paid_amount field
            if paid_from_currency != mode_account_currency:
                try:
                    from erpnext.setup.utils import get_exchange_rate
                    # Get rate FROM payment currency TO company currency (same direction as frontend)
                    target_exchange_rate = get_exchange_rate(
                        mode_account_currency, paid_from_currency, frappe.utils.nowdate()
                    )
                    # Convert payment amount to company currency for paid_amount field
                    paid_amount_in_company_currency = paid_amount * target_exchange_rate
                except Exception:
                    # Default to 1.0 on error (skip logging for performance)
                    target_exchange_rate = 1.0
                    paid_amount_in_company_currency = paid_amount

            # Create payment entry (same logic as make_payment_for_transaction)
            try:
                payment_entry = frappe.new_doc("Payment Entry")
                payment_entry.payment_type = "Receive"
                payment_entry.party_type = "Customer"
                payment_entry.party = customer
                payment_entry.company = company
                payment_entry.posting_date = frappe.utils.nowdate()
                payment_entry.paid_from = paid_from_account
                payment_entry.paid_to = mode_account  # Use default account from Mode of Payment Account
                payment_entry.paid_from_account_currency = paid_from_currency
                payment_entry.paid_to_account_currency = mode_account_currency
                payment_entry.paid_amount = paid_amount_in_company_currency  # Amount in company currency
                payment_entry.received_amount = received_amount  # Amount in payment currency
                payment_entry.source_exchange_rate = source_exchange_rate
                payment_entry.target_exchange_rate = target_exchange_rate
                
                # For Bank transactions, reference_no and reference_date are mandatory
                # Check both mode_type and account_type to be safe
                is_bank_transaction = (mode_type == "Bank") or (account_type == "Bank")
                
                if is_bank_transaction:
                    # Always set reference_no and reference_date for Bank transactions
                    payment_entry.reference_no = f"REF-{frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')}"
                    payment_entry.reference_date = frappe.utils.nowdate()
                else:
                    payment_entry.reference_no = None
                    payment_entry.reference_date = frappe.utils.nowdate()
                
                payment_entry.remarks = f"Multi-currency payment: {original_method}"
                payment_entry.mode_of_payment = original_method  # Use original method name

                # Insert payment entry (same as make_payment_for_transaction)
                try:
                    # Use frappe.flags to bypass validation if needed
                    frappe.flags.ignore_validate = True
                    frappe.flags.ignore_links = True
                    payment_entry.insert(ignore_permissions=True)
                except Exception as insert_error:
                    # If insert still fails, log and raise
                    error_detail = f"Insert failed for {original_method}: {str(insert_error)}"
                    frappe.log_error(
                        f"{error_detail}\nPayment Entry Data: mode_of_payment={original_method}, paid_to={mode_account}, company={company}, mode_type={mode_type}",
                        "Payment Entry Insert Error"
                    )
                    raise Exception(error_detail)
                finally:
                    # Reset flags
                    frappe.flags.ignore_validate = False
                    frappe.flags.ignore_links = False
                
                # Submit payment entry (same as make_payment_for_transaction)
                try:
                    payment_entry.submit(ignore_permissions=True)
                except Exception as submit_error:
                    # If submit fails, try to delete and recreate
                    try:
                        if payment_entry.name:
                            frappe.delete_doc("Payment Entry", payment_entry.name, ignore_permissions=True, force=True)
                    except:
                        pass
                    
                    # Recreate payment entry
                    payment_entry = frappe.new_doc("Payment Entry")
                    payment_entry.payment_type = "Receive"
                    payment_entry.party_type = "Customer"
                    payment_entry.party = customer
                    payment_entry.company = company
                    payment_entry.posting_date = frappe.utils.nowdate()
                    payment_entry.paid_from = paid_from_account
                    payment_entry.paid_to = mode_account  # Use default account from Mode of Payment Account
                    payment_entry.paid_from_account_currency = paid_from_currency
                    payment_entry.paid_to_account_currency = mode_account_currency
                    payment_entry.paid_amount = paid_amount_in_company_currency  # Amount in company currency
                    payment_entry.received_amount = received_amount  # Amount in payment currency
                    payment_entry.source_exchange_rate = source_exchange_rate
                    payment_entry.target_exchange_rate = target_exchange_rate
                    
                    # For Bank transactions, reference_no and reference_date are mandatory
                    # Check both mode_type and account_type to be safe
                    is_bank_transaction = (mode_type == "Bank") or (account_type == "Bank")
                    
                    if is_bank_transaction:
                        # Always set reference_no and reference_date for Bank transactions
                        payment_entry.reference_no = f"REF-{frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')}"
                        payment_entry.reference_date = frappe.utils.nowdate()
                    else:
                        payment_entry.reference_no = None
                        payment_entry.reference_date = frappe.utils.nowdate()
                    
                    payment_entry.remarks = f"Multi-currency payment: {original_method}"
                    payment_entry.mode_of_payment = original_method  # Use original method name
                    # Use frappe.flags to bypass validation
                    frappe.flags.ignore_validate = True
                    frappe.flags.ignore_links = True
                    try:
                        payment_entry.insert()
                        payment_entry.submit()
                    finally:
                        frappe.flags.ignore_validate = False
                        frappe.flags.ignore_links = False
                
                created_payments.append(payment_entry.name)

            except Exception as e:
                # Collect error message for debugging
                error_msg = f"Failed to create payment entry for {original_method} (amount: {paid_amount}): {str(e)}"
                error_messages.append(error_msg)
                error_traceback = frappe.get_traceback()
                frappe.log_error(
                    f"{error_msg}\nOriginal Method: {original_method}\nMode Account: {mode_account}\nTraceback: {error_traceback}",
                    "Payment Entry Error"
                )
                # Continue with other payment methods even if one fails
                continue

        # Single commit at the end
        if created_payments:
            frappe.db.commit()
        else:
            frappe.db.rollback()

        if not created_payments:
            return {
                "success": False,
                "message": "Failed to create payment entries",
                "details": "No payment entries were created. " + ("; ".join(error_messages[:3]) if error_messages else "Please check payment methods and accounts."),
                "errors": error_messages[:5] if error_messages else None,
            }

        return {
            "success": True,
            "message": "Multi-currency payment made successfully",
            "details": f"Created {len(created_payments)} payment entry/entries",
            "payment_entries": created_payments,
        }

    except Exception as e:
        frappe.db.rollback()
        error_traceback = frappe.get_traceback()
        error_type = type(e).__name__
        error_msg = str(e)
        
        # Log detailed error information (simplified to avoid iteration issues)
        try:
            frappe.log_error(
                f"Make Multi Currency Payment Failed\n"
                f"Error Type: {error_type}\n"
                f"Error Message: {error_msg}\n"
                f"Traceback: {error_traceback}",
                "Make Multi Currency Payment Failed"
            )
        except Exception as log_error:
            # If logging fails, at least try to log the basic error
            try:
                frappe.log_error(f"Make Multi Currency Payment Failed: {error_type}: {error_msg}", "Make Multi Currency Payment Failed")
            except:
                pass  # If even basic logging fails, just continue

        return {
            "success": False,
            "message": "Failed to make multi-currency payment",
            "details": f"{error_type}: {error_msg}",
        }


@frappe.whitelist()
def create_invoice_and_payment_queue(payload=None, **kwargs):
    """Create sales invoice and payment entries in background queue.
    Returns immediately with job ID for async processing.
    
    Args:
        payload: Dict containing all parameters, or individual kwargs
        kwargs: Individual parameters (for backward compatibility)
    """
    try:
        # Support both payload dict and individual kwargs
        if payload and isinstance(payload, dict):
            cart_items = payload.get("cart_items", [])
            customer = payload.get("customer")
            payment_breakdown = payload.get("payment_breakdown")
            payment_method = payload.get("payment_method")
            amount = payload.get("amount")
            note = payload.get("note")
            order_payload = payload.get("order_payload")
            multi_currency_payments = payload.get("multi_currency_payments")
        else:
            # Use kwargs (from frontend POST body)
            cart_items = kwargs.get("cart_items", [])
            customer = kwargs.get("customer")
            payment_breakdown = kwargs.get("payment_breakdown")
            payment_method = kwargs.get("payment_method")
            amount = kwargs.get("amount")
            note = kwargs.get("note")
            order_payload = kwargs.get("order_payload")
            multi_currency_payments = kwargs.get("multi_currency_payments")
        
        # Prepare items for sales invoice
        items = []
        for item in cart_items or []:
            item_code = item.get("name") or item.get("item_code") or item.get("item_name")
            qty = item.get("quantity") or item.get("qty") or 1
            rate = item.get("price") or item.get("rate") or 0
            items.append({"item_code": item_code, "qty": qty, "rate": rate})
        
        if not items:
            return {
                "success": False,
                "message": "No items in cart",
                "details": "Cannot create invoice without items.",
            }
        
        # 1. Create Sales Invoice synchronously (immediate)
        from havano_restaurant_pos.havano_restaurant_pos.doctype.ha_pos_invoice.ha_pos_invoice import (
            create_sales_invoice,
        )
        
        try:
            inv = create_sales_invoice(customer, items)
            invoice_name = inv.get("name") if isinstance(inv, dict) else inv
            
            if not invoice_name:
                return {
                    "success": False,
                    "message": "Failed to create sales invoice",
                    "details": f"Sales invoice creation returned no name. Response: {inv}",
                }
        except Exception as inv_error:
            error_msg = f"Error creating sales invoice: {str(inv_error)}\n{frappe.get_traceback()}"
            frappe.log_error(error_msg, "Create Invoice and Payment - Invoice Creation Error")
            return {
                "success": False,
                "message": "Failed to create sales invoice",
                "details": str(inv_error),
            }
        
        # 2. Process payment entries (try background, fallback to synchronous)
        # Try to enqueue in background first, but if queue fails, process immediately
        payment_processed_async = False
        job_id = None
        
        try:
            # Prepare job arguments for payment processing only
            job_kwargs = {
                "method": "havano_restaurant_pos.havano_restaurant_pos.api.process_payment_entries",
                "queue": "default",
                "timeout": 300,
                "is_async": True,  # True background processing
                "invoice_name": invoice_name,
                "payment_breakdown": payment_breakdown,
                "payment_method": payment_method,
                "amount": amount,
                "note": note,
                "order_payload": order_payload,
                "multi_currency_payments": multi_currency_payments
            }
            
            # Add job_name if supported (optional parameter)
            try:
                job_kwargs["job_name"] = f"process_payment_entries_{invoice_name}_{frappe.utils.now_datetime().strftime('%Y%m%d%H%M%S')}"
            except:
                pass  # job_name not supported in this Frappe version
            
            job = frappe.enqueue(**job_kwargs)
            job_id = job.id if hasattr(job, 'id') else (job if isinstance(job, str) else None)
            payment_processed_async = True
            
            frappe.logger().info(f"Payment entries queued for invoice {invoice_name}, job_id: {job_id}")
            
        except Exception as queue_error:
            # Log the error - will process synchronously below
            error_msg = f"Queue enqueue failed for payment entries: {str(queue_error)}\n{frappe.get_traceback()}"
            frappe.log_error(error_msg, "Create Payment Entries Queue Error")
            payment_processed_async = False
        
        # Process payment entries synchronously (either as fallback or always for reliability)
        # This ensures payments are always created even if queue worker isn't running
        try:
            payment_result = process_payment_entries(
                invoice_name,
                payment_breakdown,
                payment_method,
                amount,
                note,
                order_payload,
                multi_currency_payments
            )
            
            if payment_processed_async:
                # Queue was successful, but we also processed synchronously for reliability
                # In production, you might want to remove this and rely on queue only
                return {
                    "success": True,
                    "message": "Sales invoice created successfully. Payment entries processed.",
                    "sales_invoice": invoice_name,
                    "job_id": job_id,
                    "payment_result": payment_result,
                    "status": "invoice_created_payment_processed"
                }
            else:
                # Queue failed, processed synchronously
                return {
                    "success": True,
                    "message": "Sales invoice and payment entries created successfully (processed synchronously - queue unavailable)",
                    "sales_invoice": invoice_name,
                    "payment_result": payment_result,
                    "queue_failed": True
                }
        except Exception as sync_error:
            # Invoice was created but payment failed
            error_msg = f"Payment processing failed after invoice creation: {str(sync_error)}\n{frappe.get_traceback()}"
            frappe.log_error(error_msg, "Create Payment Entries Sync Error")
            return {
                "success": True,  # Invoice was created successfully
                "message": f"Sales invoice created successfully, but payment processing failed: {str(sync_error)}",
                "sales_invoice": invoice_name,
                "payment_error": str(sync_error),
                "warning": "Please process payment manually for this invoice"
            }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Create Invoice and Payment Queue Error")
        return {
            "success": False,
            "message": "Failed to queue invoice and payment",
            "details": str(e),
        }


def process_payment_entries(
    invoice_name,
    payment_breakdown=None,
    payment_method=None,
    amount=None,
    note=None,
    order_payload=None,
    multi_currency_payments=None
):
    """Background job to create payment entries for an existing sales invoice.
    This runs asynchronously in the queue.
    IMPORTANT: This function must be callable from frappe.enqueue.
    """
    frappe.set_user("Administrator")  # Ensure proper permissions in background job
    try:
        # Verify invoice exists
        if not frappe.db.exists("Sales Invoice", invoice_name):
            error_msg = f"Sales Invoice {invoice_name} not found"
            frappe.log_error(error_msg, "Process Payment Entries")
            return {
                "success": False,
                "message": "Sales invoice not found",
                "details": error_msg,
            }
        
        # Create Payment Entries
        result = None
        try:
            if multi_currency_payments and isinstance(multi_currency_payments, dict):
                # Multi-currency payment (from MultiCurrencyDialog)
                # Convert multi_currency_payments format to payment_breakdown format
                # Format: {key: {mode, currency, amount}} -> [{payment_method: mode, amount: amount}]
                payment_breakdown_list = []
                for key, payment_info in multi_currency_payments.items():
                    if isinstance(payment_info, dict):
                        mode = payment_info.get("mode", "Cash")
                        amount_val = float(payment_info.get("amount", 0))
                        if amount_val > 0:
                            payment_breakdown_list.append({
                                "payment_method": mode,
                                "amount": amount_val
                            })
                
                if payment_breakdown_list:
                    result = process_payment_for_transaction_background(
                        "Sales Invoice",
                        invoice_name,
                        amount=None,  # Let it calculate from breakdown
                        payment_method=None,
                        note=note,
                        payment_breakdown=payment_breakdown_list
                    )
                else:
                    result = {
                        "success": False,
                        "message": "No valid payments in multi-currency payments",
                    }
            elif payment_breakdown and isinstance(payment_breakdown, list) and len(payment_breakdown) > 0:
                # Multi-payment method (regular payment with breakdown)
                result = process_payment_for_transaction_background(
                    "Sales Invoice",
                    invoice_name,
                    amount=amount,
                    payment_method=None,
                    note=note,
                    payment_breakdown=payment_breakdown
                )
            else:
                # Single payment method
                result = process_payment_for_transaction_background(
                    "Sales Invoice",
                    invoice_name,
                    amount=amount,
                    payment_method=payment_method or "Cash",
                    note=note,
                    payment_breakdown=None
                )
            
            # Check if payment creation was successful
            if not result or not result.get("success"):
                error_msg = f"Payment creation failed: {result.get('message') if result else 'No result returned'}"
                frappe.log_error(error_msg, "Process Payment Entries - Payment Failed")
                return result
        except Exception as payment_error:
            error_msg = f"Error creating payment entries: {str(payment_error)}\n{frappe.get_traceback()}"
            frappe.log_error(error_msg, "Process Payment Entries - Payment Error")
            result = {
                "success": False,
                "message": "Failed to create payment entries",
                "details": str(payment_error),
            }
        
        # Create HA Order if order_payload provided
        order_id = None
        if order_payload:
            try:
                def safe(value):
                    if not value:
                        return ""
                    return str(value)[:140]

                if isinstance(order_payload, str):
                    import json
                    order_payload = json.loads(order_payload)
                
                # Check if an order was already created for this invoice to prevent duplicates
                # This can happen if the function is called multiple times (queue + sync)
                existing_order = frappe.db.get_value(
                    "HA Order",
                    {"sales_invoice": invoice_name},
                    "name"
                )
                
                if existing_order:
                    # Order already exists, skip creation
                    order_id = existing_order
                    frappe.logger().info(f"HA Order {order_id} already exists for invoice {invoice_name}, skipping creation")
                else:
                    # Create new order
                    order = frappe.new_doc("HA Order")
                    
                    # Get customer from invoice if not in payload
                    invoice = frappe.get_doc("Sales Invoice", invoice_name)
                    customer = invoice.customer
                    
                    order.order_type = safe(order_payload.get("order_type"))
                    order.customer_name = safe(order_payload.get("customer_name") or customer)
                    order.table = safe(order_payload.get("table"))
                    order.waiter = safe(order_payload.get("waiter"))
                    order.payment_status = "Paid"
                    # Link to sales invoice to prevent duplicates (if field exists)
                    if hasattr(order, 'sales_invoice'):
                        order.sales_invoice = invoice_name
                    
                    # Add order items - menu_item is mandatory, so skip items without it
                    for item in order_payload.get("order_items", []):
                        # Get menu_item from various possible fields
                        menu_item = item.get("name") or item.get("item_code") or item.get("item_name") or item.get("menu_item")
                        
                        # Skip items without a valid menu_item (mandatory field)
                        if not menu_item:
                            frappe.log_error(
                                f"Skipping order item without menu_item: {item}",
                                "Process Payment Entries - Missing Menu Item"
                            )
                            continue
                        
                        order.append(
                            "order_items",
                            {
                                "menu_item": str(menu_item),  # Ensure it's a string
                                "qty": item.get("quantity") or 1,
                                "rate": item.get("price") or item.get("rate") or 0,
                                "amount": (item.get("price") or item.get("rate") or 0) * (item.get("quantity") or 1),
                                "preparation_remark": safe(item.get("remark")),
                            },
                        )
                    
                    # Only insert order if it has at least one item
                    if not order.order_items or len(order.order_items) == 0:
                        frappe.log_error(
                            f"Cannot create HA Order without order items for invoice {invoice_name}",
                            "Process Payment Entries - No Order Items"
                        )
                        order_id = None
                    else:
                        frappe.flags.ignore_validate = True
                        try:
                            # Try to insert the order
                            order.insert(ignore_permissions=True)
                            order_id = order.name
                            frappe.logger().info(f"Successfully created HA Order {order_id} for invoice {invoice_name}")
                        except frappe.DuplicateEntryError as dup_error:
                            # Order already exists - this can happen if function is called multiple times
                            # Extract order name from error if possible
                            error_msg = str(dup_error)
                            # Try to extract order name from error message
                            import re
                            match = re.search(r"'([^']+)'", error_msg)
                            if match:
                                existing_order_name = match.group(1)
                                order_id = existing_order_name
                                frappe.logger().info(f"HA Order {order_id} already exists (found from error), using existing order")
                            else:
                                frappe.log_error(
                                    f"HA Order already exists (duplicate entry prevented) for invoice {invoice_name}. Error: {error_msg}",
                                    "Process Payment Entries - Duplicate Order"
                                )
                                order_id = None
                        except Exception as insert_error:
                            # Other insert errors - log and skip
                            error_msg = f"Error inserting HA Order: {str(insert_error)}\n{frappe.get_traceback()}"
                            frappe.log_error(error_msg, "Process Payment Entries - Order Insert Error")
                            order_id = None
                        finally:
                            frappe.flags.ignore_validate = False
                    
            except Exception as e:
                frappe.log_error(f"Error creating HA Order: {str(e)}\n{frappe.get_traceback()}", "Process Payment Entries Order Error")
                order_id = None
        
        # Commit all changes
        frappe.db.commit()
        
        # Log success for monitoring
        frappe.logger().info(f"Successfully processed payment entries for invoice {invoice_name}")
        
        return {
            "success": True,
            "message": "Payment entries processed successfully",
            "sales_invoice": invoice_name,
            "order_id": order_id,
            "payment_result": result,
        }
        
    except Exception as e:
        frappe.db.rollback()
        error_traceback = frappe.get_traceback()
        error_msg = f"Error in process_payment_entries: {str(e)}\n{error_traceback}"
        frappe.log_error(error_msg, "Process Payment Entries Error")
        
        # Also log to console for immediate visibility in queue worker
        print(f"ERROR in process_payment_entries: {error_msg}")
        
        return {
            "success": False,
            "message": "Failed to process payment entries",
            "details": str(e),
        }


def process_invoice_and_payment(
    cart_items,
    customer,
    payment_breakdown=None,
    payment_method=None,
    amount=None,
    note=None,
    order_payload=None,
    multi_currency_payments=None
):
    """Background job to create sales invoice and payment entries.
    This runs asynchronously in the queue.
    IMPORTANT: This function must be callable from frappe.enqueue.
    NOTE: This function is kept for backward compatibility. 
    New implementation creates invoice synchronously and processes payments in background.
    """
    frappe.set_user("Administrator")  # Ensure proper permissions in background job
    try:
        # 1. Create Sales Invoice
        from havano_restaurant_pos.havano_restaurant_pos.doctype.ha_pos_invoice.ha_pos_invoice import (
            create_sales_invoice,
        )
        
        try:
            inv = create_sales_invoice(customer, cart_items)
            invoice_name = inv.get("name") if isinstance(inv, dict) else inv
            
            if not invoice_name:
                error_msg = f"Sales invoice creation returned no name. Response: {inv}"
                frappe.log_error(error_msg, "Process Invoice and Payment")
                return {
                    "success": False,
                    "message": "Failed to create sales invoice",
                    "details": error_msg,
                }
        except Exception as inv_error:
            error_msg = f"Error creating sales invoice: {str(inv_error)}\n{frappe.get_traceback()}"
            frappe.log_error(error_msg, "Process Invoice and Payment - Invoice Creation")
            return {
                "success": False,
                "message": "Failed to create sales invoice",
                "details": str(inv_error),
            }
        
        # 2. Create Payment Entries using the new function
        payment_result = process_payment_entries(
            invoice_name,
            payment_breakdown,
            payment_method,
            amount,
            note,
            order_payload,
            multi_currency_payments
        )
        
        # Return combined result
        return {
            "success": True,
            "message": "Invoice and payment processed successfully",
            "sales_invoice": invoice_name,
            "order_id": payment_result.get("order_id"),
            "payment_result": payment_result,
        }
        
    except Exception as e:
        frappe.db.rollback()
        error_traceback = frappe.get_traceback()
        error_msg = f"Error in process_invoice_and_payment: {str(e)}\n{error_traceback}"
        frappe.log_error(error_msg, "Process Invoice and Payment Error")
        
        # Also log to console for immediate visibility in queue worker
        print(f"ERROR in process_invoice_and_payment: {error_msg}")
        
        return {
            "success": False,
            "message": "Failed to process invoice and payment",
            "details": str(e),
        }
