import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

import { auth,call, db } from "./frappeClient";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

let defaultCurrency = "USD";
const MAX_ORDER_RETRY_ATTEMPTS = 3;

export async function login(username, password){
  try{
    const res = await auth.loginWithUsernamePassword({
      username,
      password
    })
    return res
 }catch(err){
  console.error("Login failed: ", err)
  throw err
 }
}

export async function logout(){
  try{
    const res = await auth.logout()
    return res
  }catch(err){
    console.error("Logout failed: ", err)
    throw err
  }
}

async function attemptWithRetries(action, description, attempts = MAX_ORDER_RETRY_ATTEMPTS) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await action();
    } catch (err) {
      lastError = err;
      console.error(`${description} failed (attempt ${attempt}/${attempts}):`, err);
      if (attempt === attempts) {
        break;
      }
    }
  }
  throw lastError;
}

async function initDefaultCurrency() {
  try {
    const { message } = await db.getSingleValue("System Settings", "currency");
    if (message) defaultCurrency = message;
  } catch (err) {
    console.warn("Could not fetch default currency:", err);
  }
}

initDefaultCurrency();

export async function getCurrentUserFullName() {
  try {
    const userId = await auth.getLoggedInUser();
    if (!userId || userId === "Guest") {
      return null;
    }

    const userDoc = await db.getDoc("User", userId);
    return (
      userDoc.full_name ||
      [userDoc.first_name, userDoc.last_name].filter(Boolean).join(" ") ||
      userDoc.name ||
      userId
    );
  } catch (err) {
    console.error("Error getting current user info:", err);
    return null;
  }
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: defaultCurrency,
  }).format(amount);
}



export const formatDateTime = (isoString) => {
  const date = new Date(isoString);

  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  return date.toLocaleString("en-US", options);
};

export const getCurrentDateTime = () => {
  const now = new Date();

  // Format time as HH:MM:SS
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const time = `${hours}:${minutes}:${seconds}`;

  // Format date as "Month Day, Year"
  const options = { year: "numeric", month: "long", day: "numeric" };
  const date = now.toLocaleDateString("en-US", options);

  return { date, time };
};

export const getBgColor = () => {
  const colors = [
    "#b73e3e",
    "#5b45b0",
    "#7f167f",
    "#735f32",
    "#1d2569",
    "#285430",
  ];

  return colors[Math.floor(Math.random() * colors.length)];
};

export async function getNumberOfItems(category) {
  try {
    const params = category ? { category } : {};

    const { message } = await call.get(
      "havano_restaurant_pos.api.get_number_of_items",
      params
    );

    return message;
  } catch (error) {
    console.error("Error fetching number of items:", error);
    return 0;
  }
}

export async function getNumberOfOrders(menuItem) {
  if (!menuItem) {
    console.warn("getNumberOfOrders called without a menu item identifier.");
    return 0;
  }

  try {
    const { message } = await call.get(
      "havano_restaurant_pos.api.get_number_of_orders",
      { menu_item: menuItem }
    );
    if (message && typeof message === "object") {
      if (typeof message.count === "number") return message.count;
      if ("count" in message) {
        const parsedCount = Number(message.count);
        if (!Number.isNaN(parsedCount)) return parsedCount;
      }
    }

    const fallback = Number(message);
    return Number.isNaN(fallback) ? 0 : fallback;
  } catch (error) {
    console.error("Error fetching number of orders:", error);
    return 0;
  }
}

export async function markTableAsPaid(table) {
  try {
    const { message } = await call.post(
      "havano_restaurant_pos.api.mark_table_as_paid",
      { table }
    );
    return message;
  } catch (err) {
    console.error("API error:", err);
    throw err;
  }
}


export async function callPost(method, data = {}) {
  try {
    const { message } = await call.post(method, data);
    return message;
  } catch (err) {
    console.error(`POST ${method} failed:`, err);
    throw err;
  }
}

export async function getSamplePosMenuItemGroup() {
  try {
    const { message } = await db.getSingleValue(
      "Sample POS Settings",
      "menu_item_group"
    );
    return message || null;
  } catch (err) {
    console.error("Error fetching Sample POS Settings.menu_item_group:", err);
    return null;
  }
}

/**
 * Get default customer from Settings
 * Tries HA POS Setting first, then Sample POS Settings
 */
export async function getDefaultCustomer() {
  try {
    // Try HA POS Setting first
    try {
      const settings = await db.getDocList("HA POS Setting", {
        fields: ["name", "default_customer"],
        filters: { ha_pos_settings_on: 1 },
        limit: 1,
      });
      if (settings && settings.length > 0 && settings[0].default_customer) {
        return settings[0].default_customer;
      }
    } catch (err) {
      // HA POS Setting might not exist, continue to try Sample POS Settings
    }

    // Try Sample POS Settings
    try {
      const { message } = await db.getSingleValue(
        "Sample POS Settings",
        "default_dine_in_customer"
      );
      if (message) {
        return message;
      }
    } catch (err) {
      console.error("Error fetching default customer from Sample POS Settings:", err);
    }

    return null;
  } catch (err) {
    console.error("Error fetching default customer:", err);
    return null;
  }
}

export async function callPut(endpoint, data = {}) {
  try {
    const { data: response } = await db.axios.put(endpoint, data);
    return response.message || response;
  } catch (err) {
    console.error(`PUT ${endpoint} failed:`, err);
    throw err;
  }
}

export async function handleCreateOrder(payload) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.create_order_from_cart",
        {
          payload,
        }
      );
      return message;
    },
    "Create order"
  );
}

export async function handleUpdateOrder(payload) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post("havano_restaurant_pos.api.update_order", {
        payload,
      });
      return message;
    },
    "Update order"
  );
}

/**
 * Create a sales invoice by calling the server-side helper.
 * Expects `customer` (string) and `items` (array of {item_code, qty, rate})
 */
export async function createSalesInvoice(customer, items, price_list = null) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.havano_restaurant_pos.doctype.ha_pos_invoice.ha_pos_invoice.create_sales_invoice",
        {
          customer,
          items: JSON.stringify(items),
          price_list: price_list,
        }
      );
      return message;
    },
    "Create sales invoice"
  );
}

/**
 * Create order, sales invoice and payment entry in a single API call.
 * Sends full `payload` (order payload) and optional `amount`, `payment_method`, `note`.
 */
export async function createOrderAndPay(payload, amount = null, payment_method = null, note = null) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.create_order_and_payment",
        {
          payload,
          amount,
          payment_method,
          note,
        }
      );
      return message;
    },
    "Create order and payment"
  );
}

/**
 * Make payment for an existing Sales Invoice or Quotation.
 * @param {string} doctype - "Sales Invoice" or "Quotation"
 * @param {string} docname - Name of the document
 * @param {number} amount - Payment amount (optional)
 * @param {string} payment_method - Mode of payment (optional)
 * @param {string} note - Payment notes (optional)
 */
export async function makePaymentForTransaction(doctype, docname, amount = null, payment_method = null, note = null) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.make_payment_for_transaction",
        {
          doctype,
          docname,
          amount,
          payment_method,
          note,
        }
      );
      return message;
    },
    "Make payment for transaction"
  );
}

/**
 * Convert a Quotation to Sales Invoice.
 * @param {string} quotationName - Name of the Quotation
 */
export async function convertQuotationToSalesInvoice(quotationName) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.convert_quotation_to_sales_invoice",
        {
          quotation_name: quotationName,
        }
      );
      return message;
    },
    "Convert Quotation to Sales Invoice"
  );
}

/**
 * Update quotation with new items and convert to Sales Invoice, then create payment and HA Order.
 * @param {string} quotationName - Name of the Quotation
 * @param {Array} items - Array of items with item_code, qty, rate
 * @param {string} customer - Customer ID
 * @param {string} orderType - Order type for HA Order
 * @param {string} table - Table ID (optional)
 * @param {string} waiter - Waiter ID (optional)
 * @param {string} customerName - Customer display name (optional)
 */
export async function convertQuotationToSalesInvoiceFromCart(quotationName, items, customer, orderType, table, waiter, customerName) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.convert_quotation_to_sales_invoice_from_cart",
        {
          quotation_name: quotationName,
          items,
          customer,
          order_type: orderType,
          table: table || null,
          waiter: waiter || null,
          customer_name: customerName || customer,
        }
      );
      return message;
    },
    "Convert Quotation to Sales Invoice from Cart"
  );
}

/**
 * Create a Sales Invoice or Quotation.
 * @param {string} doctype - "Sales Invoice" or "Quotation"
 * @param {string} customer - Customer name
 * @param {Array} items - Array of items with item_code, qty, rate
 * @param {string} company - Company name (optional)
 * @param {string} orderType - Order type for HA Order (optional)
 * @param {string} table - Table ID for HA Order (optional)
 * @param {string} waiter - Waiter ID for HA Order (optional)
 * @param {string} customerName - Customer display name for HA Order (optional)
 */
export async function createTransaction(doctype, customer, items, company = null, orderType = null, table = null, waiter = null, customerName = null) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.create_transaction",
        {
          doctype,
          customer,
          items,
          company,
          order_type: orderType,
          table: table,
          waiter: waiter,
          customer_name: customerName,
        }
      );
      return message;
    },
    `Create ${doctype}`
  );
}

/**
 * Fetch all active customers.
 */
export async function getCustomers() {
  try {
    const { message } = await call.get("havano_restaurant_pos.api.get_customers");
    return message || [];
  } catch (err) {
    console.error("Error fetching customers:", err);
    return [];
  }
}

/**
 * Create a new customer.
 * @param {string} customerName - Customer name (required)
 * @param {string} mobileNo - Mobile number (optional)
 */
export async function createCustomer(customerName, mobileNo = null) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.create_customer",
        {
          customer_name: customerName,
          mobile_no: mobileNo,
        }
      );
      return message;
    },
    "Create Customer"
  );
}
