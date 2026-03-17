import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import ShiftDialog from "@/components/ui/ShiftDialog";
import ReprintDialog from "@/components/ui/ReprintDialog";
import CreditNoteDialog from "@/components/ui/CreditNoteDialog";

import Container from "@/components/Shared/Container";
import getNavLinks from "@/navLinks";
import { useCartStore } from "@/stores/useCartStore";
import { formatCurrency, handleCreateOrder, getDefaultCustomer } from "@/lib/utils";
import { useOrderStore } from "@/stores/useOrderStore";
import { isHotelAppInstalled } from "@/lib/utils";

// Dropdown component
function NavDropdown({ label, items, onItemClick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-primary/70 hover:text-primary py-1 font-semibold px-2 transition-colors"
        style={{ background: "none", border: "none" }}
      >
        {label}
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 w-40 bg-white border shadow-lg rounded z-50">
          {items.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                onItemClick(item);
                setOpen(false);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Footer
const Footer = () => {
  const [navLinks, setNavLinks] = useState([]);
  const { startNewTakeAwayOrder, cart, orderType, customerName, customer, activeOrderId, activeTableId, activeWaiterId, transactionType, activeQuotationId, clearCart } = useCartStore();
  const fetchOrders = useOrderStore((state) => state.fetchOrders);
  const fetchTableOrders = useOrderStore((state) => state.fetchTableOrders);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigateTo = useNavigate();

  const cartTotal = cart.reduce((total, item) => {
    const price = item.price ?? item.standard_rate ?? 0;
    const quantity = item.quantity ?? 1;
    return total + (price * quantity);
  }, 0);

  const handleFooterPlaceOrder = async () => {
    if (!cart || cart.length === 0) return;
    setIsSubmitting(true);
    try {
      let selectedCustomer = customerName || customer;
      if (!selectedCustomer) {
        selectedCustomer = await getDefaultCustomer();
        if (!selectedCustomer) { setIsSubmitting(false); return; }
      }
      const payload = {
        order_type: orderType || "Take Away",
        customer_name: selectedCustomer,
        order_items: cart.map((item) => ({
          name: item.name || item.item_name,
          item_code: item.name || item.item_name,
          quantity: item.quantity || 1,
          qty: item.quantity || 1,
          price: item.price || item.standard_rate || 0,
          rate: item.price || item.standard_rate || 0,
          remark: item.remark || "",
        })),
        table: activeTableId || null,
        waiter: activeWaiterId || null,
      };
      if (orderType === "Dine In") {
        const result = await handleCreateOrder(payload);
        if (result && result.success !== false) {
          clearCart();
          await fetchOrders();
          if (activeTableId) await fetchTableOrders(activeTableId);
          navigateTo(activeTableId ? `/tables/${activeTableId}` : "/menu");
        }
      } else {
        navigateTo("/menu");
      }
    } catch (err) {
      console.error("Footer place order error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [reprintDialogOpen, setReprintDialogOpen] = useState(false);
  const [creditNoteDialogOpen, setCreditNoteDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLinks = async () => {
      const links = await getNavLinks();
      setNavLinks(links);
    };
    fetchLinks();
  }, []);

  const handleNavClick = (e, link) => {
    if (link.path === "/menu") {
      e.preventDefault();
      startNewTakeAwayOrder();
      navigate(link.path);
    }
  };

  const handleHotelClick = async (e) => {
    e.preventDefault();
    try {
      const installed = await isHotelAppInstalled();
      if (installed) {
        window.location.href = "/app/hotel-dashboard";
      } else {
        alert("Havano Hotel Management app is not installed.");
      }
    } catch (error) {
      console.error("Error checking hotel app:", error);
      alert("Unable to open Hotel Dashboard. Please contact your administrator.");
    }
  };

  const handleDropdownItemClick = (item) => {
    if (item.name === "Reprint Invoice") setReprintDialogOpen(true);
    else if (item.name === "Credit Note") setCreditNoteDialogOpen(true);
    else if (item.action) item.action();
  };

  return (
    <div>
      <hr className="border border-primary" />
      <Container>
        <div className="py-2 flex items-center justify-between w-full">
          {/* Left icons */}
          <div className="flex items-center gap-2">
            <a
              href="/app"
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
              title="Go to App"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700 hover:text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </a>
            <a
              href="#"
              onClick={handleHotelClick}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
              title="Go to Hotel Dashboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-700 hover:text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </a>
          </div>

          {/* Navigation links */}
          <div className="flex flex-1 justify-evenly">
            {navLinks.map((link) => {
              if (link.name === "CLOSE SHIFT") {
                return (
                  <button
                    key={link.name}
                    onClick={() => setShiftDialogOpen(true)}
                    className="text-primary/70 hover:text-primary py-1 transition-colors font-semibold"
                    style={{ background: "none", border: "none" }}
                  >
                    {link.name}
                  </button>
                );
              }

              if (link.name === "OPTIONS" && link.dropdown) {
                return (
                  <NavDropdown
                    key={link.name}
                    label={link.name}
                    items={link.dropdown}
                    onItemClick={handleDropdownItemClick}
                  />
                );
              }

              if (!link.active) {
                return (
                  <span
                    key={link.name}
                    className="text-gray-400 cursor-not-allowed py-1 opacity-50"
                  >
                    {link.name}
                  </span>
                );
              }

              if (link.name === "Login/Logout") {
                return (
                  <div key="cart-and-login" className="flex items-center gap-3">
                    {/* Login/Logout power icon */}
                    <NavLink
                      to={link.path}
                      end
                      onClick={(e) => handleNavClick(e, link)}
                      className={() => ""}
                      title="Login/Logout"
                    >
                      {({ isActive }) => (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4M6.343 6.343a8 8 0 1011.314 0" />
                          </svg>
                        </div>
                      )}
                    </NavLink>
                    {/* Payment button + Cart Total */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleFooterPlaceOrder}
                        disabled={cart.length === 0 || isSubmitting}
                        className="h-8 px-3 text-sm font-semibold rounded-lg bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                      >
                        {transactionType === "Quotation"
                          ? (activeQuotationId ? "Convert" : "Quotation")
                          : (activeOrderId ? "Update" : "Payment")
                        }
                      </button>
                      <div className="flex items-center justify-center bg-secondary rounded-lg h-8 px-3 min-w-[80px]">
                        <span className="text-sm font-bold text-primary">
                          {cart.length > 0
                            ? formatCurrency(cartTotal)
                            : (activeOrderId ? activeOrderId : "New Order")
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <NavLink
                  key={link.name}
                  to={link.path}
                  end
                  onClick={(e) => handleNavClick(e, link)}
                  className={({ isActive }) =>
                    isActive
                      ? "text-primary font-semibold border-y-2 border-primary py-1 transition-colors"
                      : "text-primary/70 hover:text-primary hover:border-b-2 hover:border-primary py-1 transition-colors"
                  }
                >
                  {link.name}
                </NavLink>
              );
            })}
          </div>

        </div>
      </Container>

      {/* Dialogs */}
      <ShiftDialog
        open={shiftDialogOpen}
        type="close"
        onOpenChange={setShiftDialogOpen}
      />
      <ReprintDialog
        open={reprintDialogOpen}
        onOpenChange={setReprintDialogOpen}
        onReprint={(invoiceNumber) => {
          console.log("Reprinting invoice:", invoiceNumber);
        }}
      />
      <CreditNoteDialog
        open={creditNoteDialogOpen}
        onOpenChange={setCreditNoteDialogOpen}
        onSelectInvoice={(invoiceJson) => {
          console.log("Credit Note selected invoice:", invoiceJson);
          // handle credit note logic here
        }}
      />
    </div>
  );
};

export default Footer;