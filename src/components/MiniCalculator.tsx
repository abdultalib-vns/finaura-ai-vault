import React, { useState, useCallback, useRef, useEffect } from "react";
import { X, Delete, Minimize2, Maximize2, GripHorizontal } from "lucide-react";

interface Props {
  onClose: () => void;
}

type Op = "+" | "−" | "×" | "÷" | null;
type CalcSize = "full" | "compact";

export default function MiniCalculator({ onClose }: Props) {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [fresh, setFresh] = useState(true);
  const [history, setHistory] = useState("");
  const [size, setSize] = useState<CalcSize>("full");

  // ── Drag state ──
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Center on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPos({
      x: Math.max(8, (window.innerWidth - rect.width) / 2),
      y: Math.max(8, (window.innerHeight - rect.height) / 2),
    });
  }, []);

  // Re-center when size changes so it doesn't go off-screen
  useEffect(() => {
    if (!containerRef.current || !pos) return;
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      setPos((p) => p ? { x: Math.min(Math.max(8, p.x), maxX), y: Math.min(Math.max(8, p.y), maxY) } : p);
    });
  }, [size]);

  // ── Pointer-based drag (works on both mouse & touch) ──
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current || !pos) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current || !containerRef.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const rect = containerRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    setPos({
      x: Math.min(Math.max(8, dragState.current.origX + dx), maxX),
      y: Math.min(Math.max(8, dragState.current.origY + dy), maxY),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  // ── Calculator logic ──
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

  const isCompact = size === "compact";

  // Compact mode: only show display + a minimal 4-column grid
  const compactButtons = buttons;

  const displayFontSize = isCompact
    ? (display.length > 10 ? "1.1rem" : "1.4rem")
    : (display.length > 12 ? "1.6rem" : display.length > 9 ? "2rem" : display.length > 6 ? "2.4rem" : "2.8rem");

  return (
    <div
      ref={containerRef}
      className={`calc-floating ${isCompact ? "calc-compact" : ""}`}
      style={pos ? { left: pos.x, top: pos.y } : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
    >
      {/* Draggable Header */}
      <div
        className="calc-drag-header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="calc-drag-grip">
          <GripHorizontal size={14} />
          <span className="calc-header-title">Calculator</span>
        </div>
        <div className="calc-header-actions">
          <button
            className="calc-header-btn"
            onClick={() => setSize(isCompact ? "full" : "compact")}
            title={isCompact ? "Expand" : "Minimize"}
          >
            {isCompact ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
          <button className="calc-header-btn calc-header-btn-close" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Display */}
      <div className={`calc-display ${isCompact ? "calc-display-compact" : ""}`}>
        {!isCompact && <div className="calc-history">{history || "\u00A0"}</div>}
        <div className="calc-result" style={{ fontSize: displayFontSize }}>{display}</div>
      </div>

      {/* Button Grid */}
      <div className={`calc-grid ${isCompact ? "calc-grid-compact" : ""}`}>
        {compactButtons.map((b) => (
          <button
            key={b.label}
            className={`calc-btn calc-btn-${b.type}${op && b.label === opSymbol[op] ? " calc-btn-active" : ""}`}
            onClick={b.action}
          >
            {b.label === "⌫" ? <Delete size={isCompact ? 16 : 20} /> : b.label}
          </button>
        ))}
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
  const r = Math.round(n * 1e10) / 1e10;
  const s = String(r);
  if (s.length > 15) return r.toPrecision(10);
  return s;
}
