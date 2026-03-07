# Copyright (c) 2025, Havano Restaurant Pos and contributors
# For license information, please see license.txt

import frappe


def execute():
	"""Migrate Preparation Remark: copy remark to description for existing records."""
	try:
		if frappe.db.table_exists("tabPreparation Remark"):
			columns = [c.get("Field") for c in frappe.db.sql("DESCRIBE `tabPreparation Remark`", as_dict=True)]
			if "remark" in columns and "description" not in columns:
				frappe.db.sql("""
					ALTER TABLE `tabPreparation Remark`
					ADD COLUMN `description` VARCHAR(140) DEFAULT NULL
				""")
				frappe.db.sql("""
					UPDATE `tabPreparation Remark`
					SET description = LEFT(remark, 140)
					WHERE remark IS NOT NULL AND remark != ''
				""")
				frappe.db.commit()
	except Exception as e:
		frappe.log_error(frappe.get_traceback(), "Preparation Remark Migration")
