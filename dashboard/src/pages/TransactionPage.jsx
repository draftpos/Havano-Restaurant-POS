import Transactions from "@/components/TransactionPage/Transactions";
import TransactionDetails from "@/components/TransactionPage/TransactionDetails";
import Container from "@/components/Shared/Container";
import { useTransactionStore } from "@/stores/useTransactionStore";
import { useEffect } from "react";

const TransactionPage = () => {
  const { selectedCategory, setSelectedCategory } = useTransactionStore();

  // Ensure Quotation is selected on mount
  useEffect(() => {
    if (selectedCategory?.doctype !== "Quotation") {
      setSelectedCategory({
        id: "Quotation",
        name: "Quotation",
        doctype: "Quotation",
      });
    }
  }, [selectedCategory, setSelectedCategory]);

  return (
    <Container>
      <div className="grid grid-cols-7 gap-4 relative z-0">
        <div className="col-span-5">
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

