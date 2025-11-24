import { FrappeApp } from "frappe-js-sdk";

export const frappe = new FrappeApp();

// Expose common modules
export const db = frappe.db();      // For CRUD (DocType APIs)
export const call = frappe.call();  // For whitelisted methods
export const auth = frappe.auth();  // For login/logout/session

