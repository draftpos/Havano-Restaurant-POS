frappe.ui.form.on("Havano Restaurant Pos", {
	mode_of_payment: function (frm, cdt, cdn) {
		let row = frappe.get_doc(cdt, cdn);

		if (!row.mode_of_payment) return;

		// 1. Fetch the first account linked to this Mode of Payment
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Mode of Payment Account",
				filters: { parent: row.mode_of_payment },
				fields: ["default_account"],
				limit: 1,
			},
			callback: function (r) {
				if (r.message && r.message.length > 0) {
					let account = r.message[0].default_account;

					if (account) {
						// 2. Get the account currency
						frappe.db.get_value("Account", account, "account_currency").then((res) => {
							if (res.message && res.message.account_currency) {
								let currency = res.message.account_currency;
								frappe.model.set_value(cdt, cdn, "currency", currency);

								// 3. Fetch the symbol from Currency
								frappe.db
									.get_value("Currency", currency, "symbol")
									.then((res2) => {
										if (res2.message && res2.message.symbol) {
											frappe.model.set_value(
												cdt,
												cdn,
												"currency_symbol",
												res2.message.symbol
											);
										}
									});

								// 4. Fetch the latest exchange rate for that currency
								frappe.call({
									method: "frappe.client.get_list",
									args: {
										doctype: "Currency Exchange",
										filters: { from_currency: currency },
										fields: ["name"],
										limit: 1,
										order_by: "date desc",
									},
									callback: function (ex) {
										if (ex.message && ex.message.length > 0) {
											frappe.model.set_value(
												cdt,
												cdn,
												"exchange_rate",
												ex.message[0].name
											);
										}
									},
								});
							}
						});
					}
				}
			},
		});
	},
});
