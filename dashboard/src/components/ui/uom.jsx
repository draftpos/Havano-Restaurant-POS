import { useState } from "react";

export default function UomSelectModal({ uoms = [], onSelect, onClose }) {
  const [selected, setSelected] = useState(null);

  const getGridStyle = () => {
    if (uoms.length === 1) {
      return {
        gridTemplateColumns: "1fr",
        justifyItems: "center"
      };
    }

    if (uoms.length === 2) {
      return {
        gridTemplateColumns: "1fr 1fr"
      };
    }

    return {
      gridTemplateColumns: "1fr 1fr"
    };
  };

  return (
    <>
      <div className="uom-backdrop">
        <div className="uom-modal">
          <h3 className="uom-title">Select UOM</h3>

          <div className="uom-grid" style={getGridStyle()}>
            {uoms.map((uom) => (
              <button
                key={uom}
                className={`uom-btn ${selected === uom ? "selected" : ""}`}
                onClick={() => {
                  setSelected(uom);
                  onSelect?.(uom);
                }}
              >
                {uom}
              </button>
            ))}
          </div>

          <button className="uom-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Component-scoped styles */}
      <style>{`
        .uom-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .uom-modal {
          background: #fff;
          width: 360px;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .uom-title {
          text-align: center;
          margin-bottom: 16px;
        }

        .uom-grid {
          display: grid;
          gap: 12px;
          margin-bottom: 20px;
        }

        .uom-btn {
          min-width: 120px;
          padding: 14px 10px;
          border-radius: 8px;
          border: 1px solid #2e7d32;
          background: #4caf50;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .uom-btn:hover {
          background: #43a047;
        }

        .uom-btn.selected {
          background: #2e7d32;
        }

        .uom-close {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          border: none;
          background: #eee;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
