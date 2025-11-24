import React, { useState } from "react";

const ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "⌫"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "\\"],
  ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
];

export default function OnScreenKeyboard({
  value = "",
  onChange,
  setValue,
  disabled = false,
  className = "",
}) {
  const [shiftActive, setShiftActive] = useState(false);
  const [capsActive, setCapsActive] = useState(false);

  const handleKey = (key) => {
    if (disabled) return;

    const changeFn = onChange || setValue;
    if (typeof changeFn !== "function") {
      console.warn("OnScreenKeyboard: no change handler provided");
      return;
    }

    let newValue = value || "";

    if (key === "⌫") {
      newValue = newValue.slice(0, -1);
    } else if (key === "⇧") {
      setShiftActive(!shiftActive);
      return;
    } else if (key === "⇪") {
      setCapsActive(!capsActive);
      return;
    } else if (key === "Space") {
      newValue += " ";
    } else if (key === "Enter") {
      newValue += "\n";
    } else if (key === "Tab") {
      newValue += "\t";
    } else {
      // Apply shift or caps transformation
      let keyToAdd = key;
      if (shiftActive || capsActive) {
        keyToAdd = key.toUpperCase();
      } else {
        keyToAdd = key.toLowerCase();
      }
      newValue += keyToAdd;

      // Reset shift after key press
      if (shiftActive) {
        setShiftActive(false);
      }
    }

    changeFn(newValue);
  };

  const getKeyDisplay = (key) => {
    if (key === "⌫") return "⌫ Backspace";
    if (key === "⇧") return "⇧ Shift";
    if (key === "⇪") return "⇪ Caps";
    if (key === "Space") return "Space";
    if (key === "Enter") return "Enter";
    if (key === "Tab") return "Tab";

    // Apply shift or caps for letter keys
    if (/^[a-z]$/.test(key)) {
      if (shiftActive || capsActive) {
        return key.toUpperCase();
      }
      return key.toLowerCase();
    }

    // Handle shift symbols (for US keyboard)
    const shiftMap = {
      "1": "!",
      "2": "@",
      "3": "#",
      "4": "$",
      "5": "%",
      "6": "^",
      "7": "&",
      "8": "*",
      "9": "(",
      "0": ")",
      "-": "_",
      "=": "+",
      "[": "{",
      "]": "}",
      ";": ":",
      "'": '"',
      "\\": "|",
      ",": "<",
      ".": ">",
      "/": "?",
    };

    if (shiftActive && shiftMap[key]) {
      return shiftMap[key];
    }

    return key;
  };

  return (
    <div className={`${className} bg-gray-200 p-2 rounded-lg`}>
      {/* Character input display */}
      <div className="bg-white p-3 rounded mb-3 text-sm text-gray-700 min-h-12 max-h-20 overflow-y-auto border border-gray-300 whitespace-pre-wrap break-words">
        {value || "Click keys to type..."}
      </div>

      {/* Keyboard rows */}
      <div className="space-y-1">
        {ROWS.map((row, rowIdx) => (
          <div key={`row-${rowIdx}`} className="flex gap-1 justify-center">
            {rowIdx === 0 && (
              <button
                type="button"
                onClick={() => handleKey("⇪")}
                className={`px-2 py-2 rounded text-xs font-semibold transition ${
                  capsActive
                    ? "bg-red-500 text-white"
                    : "bg-gray-400 text-white hover:bg-gray-500"
                }`}
                disabled={disabled}
              >
                ⇪
              </button>
            )}

            {row.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKey(key)}
                className={`px-3 py-2 rounded text-sm font-semibold transition ${
                  key === "⌫"
                    ? "bg-red-500 text-white hover:bg-red-600 flex-1"
                    : "bg-white border border-gray-400 hover:bg-gray-100"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={disabled}
              >
                {getKeyDisplay(key)}
              </button>
            ))}

            {rowIdx === 0 && (
              <button
                type="button"
                onClick={() => handleKey("⌫")}
                className="px-2 py-2 rounded text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition"
                disabled={disabled}
              >
                ⌫
              </button>
            )}
          </div>
        ))}

        {/* Bottom row: Shift, Space, Enter */}
        <div className="flex gap-1 justify-center">
          <button
            type="button"
            onClick={() => handleKey("⇧")}
            className={`px-3 py-2 rounded text-sm font-semibold transition ${
              shiftActive
                ? "bg-blue-500 text-white"
                : "bg-gray-400 text-white hover:bg-gray-500"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={disabled}
          >
            ⇧ Shift
          </button>

          <button
            type="button"
            onClick={() => handleKey("Space")}
            className="flex-1 px-3 py-2 rounded text-sm font-semibold bg-white border border-gray-400 hover:bg-gray-100 transition"
            disabled={disabled}
          >
            Space
          </button>

          <button
            type="button"
            onClick={() => handleKey("Enter")}
            className="px-6 py-2 rounded text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition"
            disabled={disabled}
          >
            Enter
          </button>
        </div>

        {/* Symbol row */}
        <div className="flex gap-1 justify-center flex-wrap">
          {["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "="].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => {
                const changeFn = onChange || setValue;
                if (typeof changeFn === "function") {
                  changeFn((value || "") + sym);
                }
              }}
              className="px-2 py-1 rounded text-xs font-semibold bg-yellow-200 border border-yellow-400 hover:bg-yellow-300 transition"
              disabled={disabled}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
