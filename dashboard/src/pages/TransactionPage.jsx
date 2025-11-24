import Transactions from "@/components/TransactionPage/Transactions";
import TransactionDetails from "@/components/TransactionPage/TransactionDetails";
import Container from "@/components/Shared/Container";
import { useTransactionStore } from "@/stores/useTransactionStore";

const TransactionPage = () => {
  const { selectedCategory, setSelectedCategory } = useTransactionStore();
  const isSalesInvoiceSelected = selectedCategory?.doctype === "Sales Invoice";

  const handleSalesInvoiceClick = () => {
    setSelectedCategory({
      id: "Sales Invoice",
      name: "Sales Invoice",
      doctype: "Sales Invoice",
    });
  };

  const handleQuotationClick = () => {
    setSelectedCategory({
      id: "Quotation",
      name: "Quotation",
      doctype: "Quotation",
    });
  };


  return (
    <Container>
      <div className="grid grid-cols-7 gap-4 relative z-0">
        <div className="col-span-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="transaction-type"
                  value="quotation"
                  checked={!isSalesInvoiceSelected}
                  className="peer sr-only"
                  onChange={() => {}}
                  onClick={handleQuotationClick}
                />
                <span className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 transition-colors peer-checked:border-slate-900 peer-checked:bg-slate-900 peer-checked:text-white">
                  Quotation
                </span>
              </label>
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="transaction-type"
                  value="sales-invoice"
                  checked={isSalesInvoiceSelected}
                  className="peer sr-only"
                  onChange={() => {}}
                  onClick={handleSalesInvoiceClick}
                />
                <span className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 transition-colors peer-checked:border-slate-900 peer-checked:bg-slate-900 peer-checked:text-white">
                  Sales Invoice
                </span>
              </label>
            </div>
          </div>
          <Transactions />
        </div>
        <div className="col-span-2">
          <TransactionDetails />
        </div>
      </div>
    </Container>
  );
};

export default TransactionPage;

