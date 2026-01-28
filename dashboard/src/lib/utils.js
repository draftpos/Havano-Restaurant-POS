import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

import { auth, call, db } from "./frappeClient";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

let defaultCurrency = "USD";
const MAX_ORDER_RETRY_ATTEMPTS = 2; // Reduced from 3 for faster failure on low-spec systems

// Simple in-memory cache for frequently accessed data
const cache = {
  companyData: null,
  paymentMethods: null,
  cacheTime: 5 * 60 * 1000, // 5 minutes
  lastUpdate: 0
};

export async function login(username, password){
  try{
    const res = await auth.loginWithUsernamePassword({
      username,
      password
    })
    // Clear cache on login
    cache.companyData = null;
    cache.paymentMethods = null;
    return res
 }catch(err){
  console.error("Login failed: ", err)
  throw err
 }
}

export async function logout(){
  try{
    const res = await auth.logout()
    // Clear cache on logout
    cache.companyData = null;
    cache.paymentMethods = null;
    return res
  }catch(err){
    console.error("Logout failed: ", err)
    throw err
  }
}

/**
 * Retries an async action multiple times before failing.
 * Optimized for low-spec systems with faster retry intervals.
 * @template T
 * @param {() => Promise<T>} action
 * @param {string} description
 * @param {number} attempts
 * @returns {Promise<T>}
 */
async function attemptWithRetries(action, description, attempts = MAX_ORDER_RETRY_ATTEMPTS) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await action();
    } catch (err) {
      lastError = err;
      // Only log on final attempt to reduce console noise
      if (attempt === attempts) {
        console.error(`${description} failed after ${attempts} attempts:`, err);
      }
      // Fast retry for low-spec systems (no delay on first retry, minimal on subsequent)
      if (attempt < attempts) {
        await new Promise(resolve => setTimeout(resolve, attempt * 100)); // 100ms, 200ms delays
      }
    }
  }
  throw lastError;
}

async function initDefaultCurrency() {
  try {
    const { message } = await db.getSingleValue("Global Defaults", "default_currency");
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
export async function getCurrentUser() {
  try {
    const userId = await auth.getLoggedInUser();
    if (!userId || userId === "Guest") {
      return null;
    }

    const userDoc = await db.getDoc("User", userId);
    return userDoc;
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

export async function getNumberOfItems(item_group = null) {
  try {
    const params = item_group ? { item_group } : {};

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

export async function isHotelAppInstalled() {
  try {
    const { message } = await call.get(
      "havano_restaurant_pos.api.is_hotel_app_installed"
    );

    if (typeof message === "boolean") {
      return message;
    }

    if (message && typeof message === "object" && "installed" in message) {
      return Boolean(message.installed);
    }

    return false;
  } catch (error) {
    console.error("Error checking Havano Hotel app installation:", error);
    return false;
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

/**
 * Process table payment - create invoice, payment entry, update orders
 * @param {string} tableId - Table ID
 * @param {Array} orderIds - Array of order IDs
 * @param {number} total - Total amount
 * @param {number} amount - Payment amount
 * @param {string} paymentMethod - Payment method
 * @param {string} note - Payment note
 * @param {Array} paymentBreakdown - Payment breakdown array
 */
export async function processTablePayment(
  tableId,
  orderIds,
  total,
  amount = null,
  paymentMethod = null,
  note = null,
  paymentBreakdown = null
) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.process_table_payment",
        {
          table: tableId,
          order_ids: orderIds,
          total: total,
          amount: amount,
          payment_method: paymentMethod,
          note: note,
          payment_breakdown: paymentBreakdown,
        }
      );
      return message;
    },
    "Process table payment"
  );
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


/**
 * Get default customer from Settings
 */
export async function getDefaultCustomer() {

  try {
    const { message } = await db.getSingleValue("HA POS Settings", "default_customer");
    if (message) {
      return message;
    }
  } catch (err) {
    console.error("Error fetching default customer from HA POS Settings:", err);
    return null;
  }
}

export async function getItemPreparationRemarks(item) {
	return attemptWithRetries(async () => {
		const { message } = await call.get(
			"havano_restaurant_pos.api.get_item_preparation_remarks",
			{ item }
		);
		return message;
	}, "Get item preparation remarks");
}

export async function saveItemPreparationRemark(item, remark) {
	return attemptWithRetries(async () => {
		const { message } = await call.post(
			"havano_restaurant_pos.api.save_item_preparation_remark",
			{ item, remark }
		);
		return message;
	}, "Save item preparation remark");
}

export async function isRestaurantMode() {
  try {
    const { message } = await db.getSingleValue(
      "HA POS Settings",
      "restaurant_mode"
    );
    // Frappe responses can vary by endpoint/version:
    // - message: 0/1
    // - message: "0"/"1"
    // - message: { restaurant_mode: 0/1 }
    if (message && typeof message === "object") {
      return Boolean(message.restaurant_mode);
    }
    if (typeof message === "string") {
      return Boolean(Number(message));
    }
    return Boolean(message);
  } catch (err) {
    console.error("Error fetching HA POS Settings.is_restaurant_mode:", err);
    return false;
  }
  
}

/**
 * Get user transaction type mappings from HA POS Setting
 * Returns array of transaction types available for the current user
 * @returns {Promise<{types: string[], defaultType: string | null}>}
 */
export async function getUserTransactionTypes() {
  try {
    // Get current user
    const currentUser = await auth.getLoggedInUser();
    if (!currentUser || currentUser === "Guest") {
      // If no user, return default options
      return {
        types: ["Sales Invoice", "Quotation"],
        defaultType: "Sales Invoice",
      };
    }

    // Get HA POS Settings (Single doctype) with user_mapping
    const settingsResponse = await call.get("havano_restaurant_pos.api.get_ha_pos_settings");
    const settingDoc = settingsResponse?.message?.data;

    if (!settingDoc) {
      // No settings found, return default
      return {
        types: ["Sales Invoice", "Quotation"],
        defaultType: "Sales Invoice",
      };
    }

    const userMappings = settingDoc.user_mapping || [];

    // Filter mappings for current user and remove duplicates
    const userTypes = userMappings
      .filter((mapping) => mapping.user === currentUser)
      .map((mapping) => mapping.type)
      .filter(Boolean) // Remove any null/undefined
      .filter((type, index, self) => self.indexOf(type) === index); // Remove duplicates

    if (userTypes.length === 0) {
      // No mappings for user, return default
      return {
        types: ["Sales Invoice", "Quotation"],
        defaultType: "Sales Invoice",
      };
    }

    // Return available types and default (first one)
    return {
      types: userTypes,
      defaultType: userTypes[0],
    };
  } catch (err) {
    console.error("Error getting user transaction types:", err);
    // On error, return default
    return {
      types: ["Sales Invoice", "Quotation"],
      defaultType: "Sales Invoice",
    };
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
 * @param {Array} payment_breakdown - Array of {payment_method, amount} objects for multiple payments (optional)
 */
export async function makePaymentForTransaction(doctype, docname, amount = null, payment_method = null, note = null, payment_breakdown = null) {
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
          payment_breakdown,
        }
      );
      return message;
    },
    "Make payment for transaction"
  );
}

/**
 * Create sales invoice and payment entries in background queue.
 * Returns immediately with job ID for async processing.
 * @param {Array} cartItems - Cart items
 * @param {string} customer - Customer name
 * @param {Array} paymentBreakdown - Array of {payment_method, amount} objects (for multi-currency)
 * @param {string} paymentMethod - Single payment method (for regular payment)
 * @param {number} amount - Payment amount
 * @param {string} note - Payment notes
 * @param {Object} orderPayload - Optional order payload for HA Order creation
 */
export async function createInvoiceAndPaymentQueue(
  cartItems,
  customer,
  paymentBreakdown = null,
  paymentMethod = null,
  amount = null,
  note = null,
  orderPayload = null,
  multiCurrencyPayments = null
) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.create_invoice_and_payment_queue",
        {
          cart_items: cartItems,
          customer,
          payment_breakdown: paymentBreakdown,
          payment_method: paymentMethod,
          amount,
          note,
          order_payload: orderPayload,
          multi_currency_payments: multiCurrencyPayments,
        }
      );
      return message;
    },
    "Create invoice and payment"
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
export async function createTransaction(doctype, customer, items, company = null, orderType = null, table = null, waiter = null, customerName = null, agent = null) {
  console.log("Creating transaction:", { doctype, customer, items, company, orderType, table, waiter, customerName, agent });
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
          agent
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

export async function openShift() {
  return attemptWithRetries(async () => {
    const { message } = await call.post("havano_restaurant_pos.api.open_shift", {});
    return message;
  }, "Open shift");
}

export async function closeShift() {
  return attemptWithRetries(async () => {
    const { message } = await call.post("havano_restaurant_pos.api.close_shift", {});
    return message;
  }, "Close shift");
}

export async function fetchTableOrders(table_number) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.get_table_orders",
        { table_number }
      );
      return message; // { total_orders, waiting_time }
    },
    "Fetch table orders"
  );
}
export async function checkStock(itemName) {
  return attemptWithRetries(async () => {
    const { message } = await call.get(
      "havano_restaurant_pos.api.get_stock",
      { item_code: itemName } // pass item_name as param
    );
    return message;
  }, `Check stock for ${itemName}`);
}
export async function addRemark(remark) {
  if (!remark || !remark.trim()) {
    throw new Error("Remark cannot be empty");
  }

  return attemptWithRetries(async () => {
    const { message } = await call.post(
      "havano_restaurant_pos.api.add_remark",
      { remark_text: remark.trim() } // <-- send the remark text here
    );
    return message;
  }, "Add Remark");
}
export async function getSpecies() {
  try {
    const results = await db.getDocList("Species",
  {
    fields: ["species"],
    limit_page_length: 0
  });
    return results || [];
  } catch (err) {
    console.error("Error fetching species:", err);
    return [];
  }
}

export async function getBreeds() {
  try {
    const results = await db.getDocList("Pet Breed", {
      fields: ["pet_breed"],
      limit_page_length: 0,
    });
    return results || [];
  } catch (err) {
    console.error("Error fetching breeds:", err);
    return [];
  }
}

/**
 * Create a new customer.
 * @param {string} customerName - Customer name (required)
 * @param {string} mobileNo - Mobile number (optional)
 */
export async function createCustomer(payload = {}) {
  console.log("Creating customer with payload:", payload);
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.create_customer",
        {"customer_name": payload.customer_name,"mobile_no": payload.mobile_no}
      );
      return message;
    },
    "Create Customer"
  );
}

/**
 * Create agent.
 * @param {string} full_name - full name (required) 
 * @param {string} certificate_no - certificate number (optional)
 * @param {string} qualification -  qualification (optional)
 */
export async function createAgent(full_name, certificate_no = null, qualification = null) {
	return attemptWithRetries(async () => {
		const { message } = await call.post("havano_restaurant_pos.api.create_agent", {
      full_name,
      certificate_no,
      qualification
		});
		return message;
	}, "Create agent");
}

/**
 * Get agents.
 * @return {Array} List of agents
 */
export async function getAgents() {
  return attemptWithRetries(async () => {
    const { message } = await call.get("havano_restaurant_pos.api.get_agents");
    return message;
  }, "Get agents");
}

/**
 * Get a invoice data.
 * @param {string} invoice_name 
 */
export async function get_invoice_json(invoice_name) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.get_invoice_json",
        {
          invoice_name: invoice_name,
        }
      );
      return message;
    },
    "get invoice json"
  );
}

/**
 * Create a new customer.
 * @param {string} quote_number - Customer name (required)
 */
export async function generate_quotation_json(quote_number) {
  return attemptWithRetries(
    async () => {
      const { message } = await call.post(
        "havano_restaurant_pos.api.generate_quotation_json",
        {
          quote_id: quote_number,
        }
      );
      return message;
    },
    "get invoice json"
  );
}

export async function createProductBundle(new_item, price, items){
  return attemptWithRetries(
    async () => {
      const {message} = await call.post("havano_restaurant_pos.api.create_product_bundle", {
			new_item,
			price,
			items,
		});
      return message;
    },
    "Create product bundle"
  );
}

export function transformCartToItems(cart = []) {
	return cart.map((item) => ({
		item_code: item.name || item.item_name,
		qty: item.quantity || 1,
		rate: item.price ?? item.standard_rate ?? 0,
	}));
}

export function calculateCartTotal(cart = []) {
	return cart.reduce((total, item) => {
		const price = item.price ?? item.standard_rate ?? 0;
		const quantity = item.quantity ?? 1;
		return total + price * quantity;
	}, 0);
}
