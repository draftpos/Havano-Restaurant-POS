import React, { useState } from "react";
import { openShift } from "../../lib/utils";
import PaymentDialog from "./MultiCurrencyDialog"; // import your payment modal

const ShiftDialog = ({ open, type, onOpenChange, onShiftAction, cartItems }) => {
  const [openPayment, setOpenPayment] = useState(false);

  if (!open) return null;

  let title = "";
  let buttons = [];

  switch (type) {
    case "open":
      title = "Open Shift";
      buttons = [{ label: "Open Shift", action: "open", color: "green" }];
      break;

    case "continue":
      title = "Shift In Progress";
      buttons = [
        { label: "Continue Shift", action: "continue", color: "blue" },
        { label: "Close Shift", action: "close", color: "red" },
        { label: "Cancel", action: "cancel", color: "gray" },
      ];
      break;

    case "close":
      title = "Close Shift";
      buttons = [
        { label: "Confirm Close", action: "close", color: "red" },
        { label: "Cancel", action: "cancel", color: "gray" },
      ];
      break;

    default:
      title = "Shift";
      buttons = [{ label: "Cancel", action: "cancel", color: "gray" }];
  }

  return (
    <>
      {/* Payment Dialog */}
      <PaymentDialog
        open={openPayment}
        onOpenChange={setOpenPayment}
        onPaid={(data) => {
          // console.log("Payment done:", data);
          setOpenPayment(false);
          onOpenChange(false); // close shift dialog too
        }}
        cartItems={cartItems}
      />

      {/* Shift Dialog */}
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <div className="bg-white p-6 rounded shadow-lg w-[400px]">
          <h2 className="text-xl font-bold mb-4">{title}</h2>
          <div className={`flex ${buttons.length > 1 ? "gap-4" : "justify-center"}`}>
            {buttons.map((btn) => (
              <button
                key={btn.label}
                onClick={async () => {
                  if (btn.action === "cancel") {
                    onOpenChange(false);
                  } else if (btn.action === "open") {
                    try {
                      const data = await openShift();
                      // console.log("Shift opened:", data);
                      typeof onShiftAction === "function" && onShiftAction("open", data.message);
                      onOpenChange(false);
                      window.location.href = "/dashboard";
                    } catch (err) {
                      console.error("Failed to open shift:", err);
                      alert("Could not open shift. Check console.");
                    }
                  } else if (btn.action === "close") {
                    setOpenPayment(true);
                  } else {
                    onOpenChange(false);
                    typeof onShiftAction === "function" && onShiftAction(btn.action, `${btn.label} clicked`);
                  }
                }}
                className={`px-4 py-2 rounded font-bold ${
                  btn.color === "green"
                    ? "bg-green-500 text-white"
                    : btn.color === "red"
                    ? "bg-red-500 text-white"
                    : btn.color === "blue"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-black"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ShiftDialog;
