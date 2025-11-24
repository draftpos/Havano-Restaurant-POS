import React from "react";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
];
const PRESETS = ["10", "20", "50", "100", "CLR"];

export default function Keyboard({ value, onChange, setValue, min = 0, max = null, disabled = false, className = "", buttonClass = "", presets = PRESETS }) {
  // Handle key press
  const handleKey = (key) => {
    if (disabled) return;
    let newValue = value?.toString() || "";
    if (key === "⌫") {
      newValue = newValue.slice(0, -1);
    } else if (key === ".") {
      if (!newValue.includes(".")) newValue += ".";
    } else {
      // If value is empty or "0", replace it instead of appending
      if (newValue === "" || newValue === "0") {
        newValue = key;
      } else {
        newValue += key;
      }
    }
    // Remove leading zeros
    if (/^0[0-9]/.test(newValue)) newValue = newValue.replace(/^0+/, "");
    // Validate min/max
    let num = parseFloat(newValue);
    if (isNaN(num)) num = "";
    if (min !== null && num !== "" && num < min) return;
    if (max !== null && num !== "" && num > max) return;
    const changeFn = onChange || setValue;
    if (typeof changeFn === "function") {
      changeFn(newValue);
    } else {
      console.warn("Keyboard: no change handler provided");
    }
  };

  const handlePreset = (key) => {
    if (disabled) return;
    const changeFn = onChange || setValue;
    if (key === "CLR") {
      if (typeof changeFn === "function") {
        changeFn("");
      }
      return;
    }
    // add preset numeric value to existing value
    const add = parseFloat(key) || 0;
    let current = value?.toString() || "";
    let currNum = parseFloat(current) || 0;
    const newNum = currNum + add;
    if (typeof changeFn === "function") {
      // keep integer if possible, else two decimals
      changeFn(String(Number.isInteger(newNum) ? newNum : Number(newNum.toFixed(2))));
    }
  };

  return (
    <div className={`${className}`}>
      <div className={`grid grid-cols-3 gap-2 p-2 bg-gray-100 rounded-t-lg`}>
        {KEYS.flat().map((key, i) => (
          <button
            key={key + i}
            type="button"
            className={`text-xl font-bold py-4 rounded bg-white shadow hover:bg-blue-100 active:bg-blue-200 transition ${buttonClass}`}
            onClick={() => handleKey(key)}
            disabled={disabled}
          >
            {key}
          </button>
        ))}
      </div>
      {presets && presets.length > 0 && (
        <div className="flex gap-2 p-2 bg-gray-100 rounded-b-lg">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              className={`flex-1 text-lg font-semibold py-2 rounded bg-white shadow hover:bg-blue-100 active:bg-blue-200 transition ${buttonClass}`}
              onClick={() => handlePreset(p)}
              disabled={disabled}
            >
              {p === "CLR" ? "Clear" : p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
