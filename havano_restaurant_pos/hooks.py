app_name = "havano_restaurant_pos"
app_title = "Havano Restaurant Pos"
app_publisher = "Chipo"
app_description = "Restaurant POS"
app_email = "chipohameja@gmail.com"
app_license = "mit"

# Apps
# ------------------
website_route_rules = [
    {"from_route": "/dashboard/<path:subpath>", "to_route": "/dashboard"},
    {"from_route": "/menu", "to_route": "/dashboard"},
    {"from_route": "/tables", "to_route": "/dashboard"},
    {"from_route": "/orders", "to_route": "/dashboard"},
]

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "havano_restaurant_pos",
# 		"logo": "/assets/havano_restaurant_pos/logo.png",
# 		"title": "Havano Restaurant Pos",
# 		"route": "/havano_restaurant_pos",
# 		"has_permission": "havano_restaurant_pos.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/havano_restaurant_pos/css/havano_restaurant_pos.css"
# app_include_js = "/assets/havano_restaurant_pos/js/havano_restaurant_pos.js"

# include js, css files in header of web template
# web_include_css = "/assets/havano_restaurant_pos/css/havano_restaurant_pos.css"
# web_include_js = "/assets/havano_restaurant_pos/js/havano_restaurant_pos.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "havano_restaurant_pos/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "havano_restaurant_pos/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "havano_restaurant_pos.utils.jinja_methods",
# 	"filters": "havano_restaurant_pos.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "havano_restaurant_pos.install.before_install"
# after_install = "havano_restaurant_pos.install.after_install"
after_migrate = ["havano_restaurant_pos.overrides.apply_trial_balance_fix"]

# Uninstallation
# ------------

# before_uninstall = "havano_restaurant_pos.uninstall.before_uninstall"
# after_uninstall = "havano_restaurant_pos.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "havano_restaurant_pos.utils.before_app_install"
# after_app_install = "havano_restaurant_pos.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "havano_restaurant_pos.utils.before_app_uninstall"
# after_app_uninstall = "havano_restaurant_pos.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "havano_restaurant_pos.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    # "*": {
    # 	"on_update": "method",
    # 	"on_cancel": "method",
    # 	"on_trash": "method"
    # }
    "Item Price": {
        "after_insert": "havano_restaurant_pos.doc_events.update_standard_rate",
        "on_update": "havano_restaurant_pos.doc_events.update_standard_rate",
    }
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"havano_restaurant_pos.tasks.all"
# 	],
# 	"daily": [
# 		"havano_restaurant_pos.tasks.daily"
# 	],
# 	"hourly": [
# 		"havano_restaurant_pos.tasks.hourly"
# 	],
# 	"weekly": [
# 		"havano_restaurant_pos.tasks.weekly"
# 	],
# 	"monthly": [
# 		"havano_restaurant_pos.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "havano_restaurant_pos.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "havano_restaurant_pos.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "havano_restaurant_pos.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["havano_restaurant_pos.utils.before_request"]
# after_request = ["havano_restaurant_pos.utils.after_request"]
before_request = ["havano_restaurant_pos.overrides.apply_trial_balance_fix"]

# Job Events
# ----------
# before_job = ["havano_restaurant_pos.utils.before_job"]
# after_job = ["havano_restaurant_pos.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"havano_restaurant_pos.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# fixtures = [
#     {
#         "dt": "Custom Field",
#         "filters": [
#             ["name", "in", [
#                 "Quotation-custom_ordered"
#             ]]
#         ]
#     },
#     {
#         "dt": "Client Script",
#         "filters": [
#             ["module", "=", "Havano Restaurant Pos"]
#         ]
#     }
# ]
fixtures = [
    {
        "dt": "Custom Field",
        "filters": [
            ["name", "in", [
                "Quotation-custom_ordered",
                "Sales Invoice Item-custom_is_kitchen_item",
                "Sales Invoice-custom_shift_number",
                "Item-custom_is_order_item_1",
                "Item-custom_is_order_item_2",
                "Item-custom_is_order_item_3",
                "Item-custom_is_order_item_4",
                "Item-custom_is_order_item_5",
                "Item-custom_is_order_item_6",
                "Payment Entry-custom_shift",
          
            ]]
        ]
    },
    {
        "dt": "Client Script",
        "filters": [
            ["name", "in", ["print invoice"]]
        ]
    }
]
