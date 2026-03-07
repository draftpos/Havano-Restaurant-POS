# Copyright (c) 2025, Havano Restaurant Pos and contributors
# For license information, please see license.txt

import frappe


def execute():
	"""Add pharmacy custom fields to Quotation Item and Sales Invoice Item"""
	pharmacy_fields = [
		{
			"dt": "Quotation Item",
			"fieldname": "custom_preparation_remark",
			"fieldtype": "Link",
			"label": "Preparation Remark",
			"options": "Preparation Remark",
			"insert_after": "rate",
		},
		{
			"dt": "Quotation Item",
			"fieldname": "custom_preparation_remark_free",
			"fieldtype": "Data",
			"label": "Preparation Remark (Free Hand)",
			"insert_after": "custom_preparation_remark",
		},
		{
			"dt": "Sales Invoice Item",
			"fieldname": "custom_preparation_remark",
			"fieldtype": "Link",
			"label": "Preparation Remark",
			"options": "Preparation Remark",
			"insert_after": "rate",
		},
		{
			"dt": "Sales Invoice Item",
			"fieldname": "custom_preparation_remark_free",
			"fieldtype": "Data",
			"label": "Preparation Remark (Free Hand)",
			"insert_after": "custom_preparation_remark",
		},
	]
	for field in pharmacy_fields:
		if not frappe.db.exists("Custom Field", {"dt": field["dt"], "fieldname": field["fieldname"]}):
			cf = frappe.new_doc("Custom Field")
			cf.dt = field["dt"]
			cf.fieldname = field["fieldname"]
			cf.fieldtype = field["fieldtype"]
			cf.label = field["label"]
			cf.insert_after = field["insert_after"]
			if "options" in field:
				cf.options = field["options"]
			cf.insert(ignore_permissions=True)
	frappe.db.commit()
