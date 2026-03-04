import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { validateOverrideUser } from "@/lib/utils";



const OptionsDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Authorization Required",
  confirmText = "Authorize & Reprint",
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const overlayRef = useRef();

  // Close modal only when clicking the overlay
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
 if (overlayRef.current && !overlayRef.current.firstChild.contains(e.target)) {
  onOpenChange(false);
}
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  if (!open) return null;

const handleConfirm = async () => {
  if (!password.trim()) {
    toast.error("Password required");
    return;
  }

  try {
        const response = await validateOverrideUser(password);

        if (response?.authorized) {
        onConfirm?.({ username: "override_user" });
        onOpenChange(false);
        setPassword("");
        } else {
        toast.error("Invalid credentials");
        }
        } catch (err) {
            console.error(err);
            toast.error("Authorization failed");
        }
    };
    const handleCancel = () => {
        setUsername("");
        setPassword("");
        onOpenChange(false);
    };

  return (
  <div
  ref={overlayRef}
  className="fixed inset-0 flex items-center justify-center bg-black/50 z-[9999]"
>
  <div className="bg-white p-6 rounded shadow-lg w-[400px] relative z-[10000]">
        <h2 className="text-xl font-bold mb-4">{title}</h2>

        {/* <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-green-400"
        /> */}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-bold hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptionsDialog;