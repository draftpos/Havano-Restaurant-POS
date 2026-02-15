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
