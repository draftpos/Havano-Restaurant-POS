# Copyright (c) 2025, Chipo and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class HAPOSSettings(Document):
	def validate(self):
		# Check if hotel app is installed when enabling room direct bookings
		if self.enable_room_direct_bookings:
			if "havano_hotel_management" not in frappe.get_installed_apps():
				frappe.throw(
					_("Havano Hotel Management app is not installed. Please install it first to enable Room Direct Bookings."),
					title=_("Hotel App Required")
				)


	def before_save(self):
		for row in self.user_mapping:
			# check that cost_center belongs to the selected company
			if row.cost_center:
				cost_center_doc = frappe.get_doc("Cost Center Details", row.cost_center)
				if cost_center_doc.company_name != row.company:
					frappe.throw(
						_("Row {0}: Cost Center '{1}' does not belong to Company '{2}'")
						.format(row.idx, row.cost_center, row.company)
					)
