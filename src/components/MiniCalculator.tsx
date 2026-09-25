import React, { useState, useCallback, useRef, useEffect } from "react";
import { X, Delete } from "lucide-react";

interface Props {
  onClose: () => void;
}

type Op = "+" | "−" | "×" | "÷" | null;

export default function MiniCalculator({ onClose }: Props) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [fresh, setFresh] = useState(true);          // user just pressed = or op
  const [history, setHistory] = useState("");          // expression line
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (overlayRef.current && e.target === overlayRef.current) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const opSymbol: Record<string, string> = { "+": "+", "−": "−", "×": "×", "÷": "÷" };

  const append = useCallback((ch: string) => {
    setDisplay((d) => {
      if (fresh) { setFresh(false); return ch === "." ? "0." : ch; }
      if (ch === "." && d.includes(".")) return d;
      if (d === "0" && ch !== ".") return ch;
      if (d.length >= 15) return d;
      return d + ch;
    });
  }, [fresh]);

  const chooseOp = useCallback((nextOp: Op) => {
    const cur = parseFloat(display);
    if (prev !== null && op && !fresh) {
      const result = calc(prev, cur, op);
      setDisplay(formatNum(result));
      setPrev(result);
      setHistory(`${formatNum(result)} ${opSymbol[nextOp!]}`);
    } else {
      setPrev(cur);
      setHistory(`${formatNum(cur)} ${opSymbol[nextOp!]}`);
    }
    setOp(nextOp);
    setFresh(true);
  }, [display, prev, op, fresh]);

  const equals = useCallback(() => {
    if (prev === null || !op) return;
    const cur = parseFloat(display);
    const result = calc(prev, cur, op);
    setHistory(`${formatNum(prev)} ${opSymbol[op]} ${formatNum(cur)} =`);
    setDisplay(formatNum(result));
    setPrev(null);
    setOp(null);
    setFresh(true);
  }, [display, prev, op]);

  const clear = () => { setDisplay("0"); setPrev(null); setOp(null); setFresh(true); setHistory(""); };
  const percent = () => { setDisplay(formatNum(parseFloat(display) / 100)); setFresh(true); };
  const negate = () => { setDisplay(formatNum(parseFloat(display) * -1)); };
  const backspace = () => {
    setDisplay((d) => {
      if (fresh) return d;
      if (d.length <= 1 || (d.length === 2 && d.startsWith("-"))) return "0";
      return d.slice(0, -1);
    });
  };

  const buttons: { label: string; type: "num" | "op" | "fn" | "eq" | "del"; action: () => void }[] = [
    { label: "C",  type: "fn",  action: clear },
    { label: "±",  type: "fn",  action: negate },
    { label: "%",  type: "fn",  action: percent },
    { label: "÷",  type: "op",  action: () => chooseOp("÷") },

    { label: "7",  type: "num", action: () => append("7") },
    { label: "8",  type: "num", action: () => append("8") },
    { label: "9",  type: "num", action: () => append("9") },
    { label: "×",  type: "op",  action: () => chooseOp("×") },

    { label: "4",  type: "num", action: () => append("4") },
    { label: "5",  type: "num", action: () => append("5") },
    { label: "6",  type: "num", action: () => append("6") },
    { label: "−",  type: "op",  action: () => chooseOp("−") },

    { label: "1",  type: "num", action: () => append("1") },
    { label: "2",  type: "num", action: () => append("2") },
    { label: "3",  type: "num", action: () => append("3") },
    { label: "+",  type: "op",  action: () => chooseOp("+") },

    { label: "0",  type: "num", action: () => append("0") },
    { label: ".",  type: "num", action: () => append(".") },
    { label: "⌫",  type: "del", action: backspace },
    { label: "=",  type: "eq",  action: equals },
  ];

  // Adjust font size when display is long
  const displayFontSize = display.length > 12 ? "1.6rem" : display.length > 9 ? "2rem" : display.length > 6 ? "2.4rem" : "2.8rem";

  return (
    <div className="calc-overlay" ref={overlayRef}>
      <div className="calc-container">
        {/* Header */}
        <div className="calc-header">
          <span className="calc-header-title">Calculator</span>
          <button className="calc-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Display */}
        <div className="calc-display">
          <div className="calc-history">{history || "\u00A0"}</div>
          <div className="calc-result" style={{ fontSize: displayFontSize }}>{display}</div>
        </div>

        {/* Button Grid */}
        <div className="calc-grid">
          {buttons.map((b) => (
            <button
              key={b.label}
              className={`calc-btn calc-btn-${b.type}${op && b.label === opSymbol[op] ? " calc-btn-active" : ""}`}
              onClick={b.action}
            >
              {b.label === "⌫" ? <Delete size={20} /> : b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function calc(a: number, b: number, op: Op): number {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? 0 : a / b;
    default: return b;
  }
}

function formatNum(n: number): string {
  if (!isFinite(n)) return "Error";
  // Remove floating-point artifacts: round to 10 decimal places
  const r = Math.round(n * 1e10) / 1e10;
  const s = String(r);
  // Cap display at 15 characters
  if (s.length > 15) return r.toPrecision(10);
  return s;
}
