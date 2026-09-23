import { LayoutDashboard, CreditCard, Building2, Check, LogOut, PieChart, AlignLeft, Calendar, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowRight, Sparkles, AlertTriangle, X, Coins, CheckCircle, EyeOff, TrendingUp, Gift, Plus, BarChart3, CandlestickChart } from "lucide-react";
import React, { useState, useEffect } from "react";
import { FinanceItem } from "../types";
import { Currency, formatAmount, formatCompactAmount } from "../lib/currency";
import { saveItems, loadExpenses, saveExpenses, loadBankExpenses, saveBankExpenses, suppressDueReminder, isDueReminderSuppressed, loadPayAndRecordEnabled, loadLoans, loadEmiPayments, saveEmiPayments } from "../lib/storage";
import AddItemForm from "../components/AddItemForm";
import ItemCard from "../components/ItemCard";
import NotificationBell from "../components/NotificationBell";
import PayAutoRecordModal from "../components/PayAutoRecordModal";

interface Props {
  masterKey: string;
  currency: Currency;
  items: FinanceItem[];
  onItemsChange: (items: FinanceItem[]) => void;
  onLock: () => void;
}

type ChartType = "donut" | "bar" | "candlestick" | "horizontal";

const PIE_COLOR_MAP: Record<string, { light: string; mid: string; dark: string; depth: string }> = {
  Bank: { light: "#93c5fd", mid: "#3b82f6", dark: "#1d4ed8", depth: "#172554" },
  FD:   { light: "#fde047", mid: "#f59e0b", dark: "#d97706", depth: "#78350f" },
  RD:   { light: "#86efac", mid: "#10b981", dark: "#059669", depth: "#064e3b" },
  MF:   { light: "#67e8f9", mid: "#06b6d4", dark: "#0891b2", depth: "#155e75" },
  Dues: { light: "#fca5a5", mid: "#ef4444", dark: "#b91c1c", depth: "#7f1d1d" },
};

function getPiePalette(label: string, fallbackColor: string) {
  if (PIE_COLOR_MAP[label]) return PIE_COLOR_MAP[label];
  return {
    light: fallbackColor,
    mid: fallbackColor,
    dark: fallbackColor,
    depth: "#0f172a"
  };
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const R = 50;
  const circ = 2 * Math.PI * R;
  let prevLen = 0;

  const segments = data.filter((d) => d.value > 0).map((seg, i) => {
    const len = (seg.value / total) * circ;
    const dashOffset = circ * 0.25 - prevLen;
    prevLen += len;
    const palette = getPiePalette(seg.label, seg.color);
    return { ...seg, len, dashOffset, i, palette };
  });

  const gap = segments.length > 1 ? 2.5 : 0;

  return (
    <svg 
      width="146" 
      height="152" 
      viewBox="0 0 146 152" 
      className="donut-3d-svg"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Ambient 3D drop-shadow */}
        <filter id="donut-3d-shadow" x="-30%" y="-20%" width="160%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="rgba(0, 0, 0, 0.26)" />
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0, 0, 0, 0.16)" />
        </filter>

        {/* Glossy multi-stop gradients for each segment */}
        {segments.map((seg) => (
          <React.Fragment key={`grad-defs-${seg.i}`}>
            <linearGradient id={`pie-grad-${seg.i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={seg.palette.light} />
              <stop offset="35%" stopColor={seg.palette.mid} />
              <stop offset="80%" stopColor={seg.palette.dark} />
              <stop offset="100%" stopColor={seg.palette.depth} />
            </linearGradient>
            <linearGradient id={`pie-extrude-${seg.i}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={seg.palette.dark} />
              <stop offset="100%" stopColor={seg.palette.depth} />
            </linearGradient>
          </React.Fragment>
        ))}

        {/* Specular curved reflection sheen */}
        <linearGradient id="pie-specular-gloss" x1="0%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="85%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Center hole depth gradient */}
        <radialGradient id="pie-hole-depth" cx="50%" cy="46%" r="50%">
          <stop offset="65%" stopColor="transparent" />
          <stop offset="85%" stopColor="rgba(0, 0, 0, 0.08)" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0.22)" />
        </radialGradient>
      </defs>

      <g filter="url(#donut-3d-shadow)">
        {/* Layer 1: 3D Lower Extrusion Lip (Base depth rim at cy=76) */}
        {segments.map((seg) => (
          <circle
            key={`ext-${seg.i}`}
            cx="73"
            cy="76"
            r={R}
            fill="none"
            stroke={`url(#pie-extrude-${seg.i})`}
            strokeWidth="19"
            strokeDasharray={`${Math.max(0, seg.len - gap)} ${circ - Math.max(0, seg.len - gap)}`}
            strokeDashoffset={seg.dashOffset - gap / 2}
          />
        ))}

        {/* Layer 2: 3D Mid-bevel connection (at cy=73.5) */}
        {segments.map((seg) => (
          <circle
            key={`mid-${seg.i}`}
            cx="73"
            cy="73.5"
            r={R}
            fill="none"
            stroke={seg.palette.dark}
            strokeWidth="19"
            strokeDasharray={`${Math.max(0, seg.len - gap)} ${circ - Math.max(0, seg.len - gap)}`}
            strokeDashoffset={seg.dashOffset - gap / 2}
            opacity="0.85"
          />
        ))}

        {/* Layer 3: Top Main Glossy Surface (at cy=71) */}
        {segments.map((seg) => (
          <circle
            key={`top-${seg.i}`}
            cx="73"
            cy="71"
            r={R}
            fill="none"
            stroke={`url(#pie-grad-${seg.i})`}
            strokeWidth="19"
            strokeDasharray={`${Math.max(0, seg.len - gap)} ${circ - Math.max(0, seg.len - gap)}`}
            strokeDashoffset={seg.dashOffset - gap / 2}
          />
        ))}

        {/* Layer 4: Glossy Specular Sheen (Fresnel glass reflection along the top) */}
        <circle
          cx="73"
          cy="71"
          r={R}
          fill="none"
          stroke="url(#pie-specular-gloss)"
          strokeWidth="7"
          strokeDasharray={`${circ * 0.44} ${circ * 0.56}`}
          strokeDashoffset={circ * 0.22}
          style={{ mixBlendMode: "screen", pointerEvents: "none" }}
        />

        {/* Layer 5: Outer & Inner Glass Bevel Edges */}
        <circle
          cx="73"
          cy="71"
          r={R + 9.5}
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="1"
          opacity="0.7"
          pointerEvents="none"
        />
        <circle
          cx="73"
          cy="71"
          r={R - 9.5}
          fill="none"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="1"
          opacity="0.6"
          pointerEvents="none"
        />

        {/* Layer 6: Center Hole 3D Inset Cavity Depth */}
        <circle
          cx="73"
          cy="71"
          r={R - 9.5}
          fill="url(#pie-hole-depth)"
          pointerEvents="none"
        />
      </g>
    </svg>
  );
}

function BarChart({ data, currency }: { data: { label: string; value: number; color: string }[]; currency: Currency }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const validData = data.filter((d) => d.value > 0);
  if (validData.length === 0) return null;

  const maxVal = Math.max(...validData.map((d) => d.value), 1);
  const total = validData.reduce((s, d) => s + d.value, 0);

  const n = validData.length;
  const w = n <= 3 ? 38 : n <= 5 ? 30 : 24;
  const dx = 6;
  const dy = 5;
  const baseY = 138;
  const maxH = 92;

  const availW = 340 - 44;
  const spacing = n > 1 ? (availW - n * w) / (n - 1) : 0;

  return (
    <div className="bar-chart-3d-container">
      {/* Interactive Tooltip Card */}
      <div className="chart-3d-tooltip-row">
        {hoveredIdx !== null && validData[hoveredIdx] ? (
          <div className="chart-3d-tooltip-active">
            <span className="tooltip-dot" style={{ background: validData[hoveredIdx].color }} />
            <span className="tooltip-name">{validData[hoveredIdx].label}:</span>
            <span className="tooltip-val tabular-nums">
              {validData[hoveredIdx].label === "Dues" ? "−" : ""}
              {formatAmount(validData[hoveredIdx].value, currency)}
            </span>
            <span className="tooltip-pct">
              ({total > 0 ? Math.round((validData[hoveredIdx].value / total) * 100) : 0}%)
            </span>
          </div>
        ) : (
          <div className="chart-3d-tooltip-placeholder">
            <span>Hover on a 3D pillar for allocation breakdown</span>
          </div>
        )}
      </div>

      <svg
        viewBox="0 0 340 180"
        className="bar-chart-3d-svg"
        style={{ width: "100%", height: "auto", maxHeight: "185px", overflow: "visible" }}
      >
        <defs>
          <filter id="bar-shadow-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>

          {validData.map((d, i) => {
            const palette = getPiePalette(d.label, d.color);
            return (
              <React.Fragment key={`bar-defs-${i}`}>
                {/* Front Face Gradient */}
                <linearGradient id={`bar-front-grad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={palette.light} />
                  <stop offset="25%" stopColor={palette.mid} />
                  <stop offset="75%" stopColor={palette.dark} />
                  <stop offset="100%" stopColor={palette.depth} />
                </linearGradient>

                {/* Top Face Cap Gradient */}
                <linearGradient id={`bar-top-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="45%" stopColor={palette.light} />
                  <stop offset="100%" stopColor={palette.mid} />
                </linearGradient>

                {/* Side Face Extrusion Gradient */}
                <linearGradient id={`bar-side-grad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={palette.dark} />
                  <stop offset="100%" stopColor={palette.depth} />
                </linearGradient>
              </React.Fragment>
            );
          })}
        </defs>

        {/* 3D Perspective Ground Baseline */}
        <line
          x1="12"
          y1={baseY}
          x2="330"
          y2={baseY}
          stroke="var(--border)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.6"
        />

        {validData.map((d, i) => {
          const x = 22 + i * (w + spacing);
          const h = Math.max(10, Math.round((d.value / maxVal) * maxH));
          const isHovered = hoveredIdx === i;
          const lift = isHovered ? 4 : 0;
          const currentTopY = baseY - h - lift;
          const currentBaseY = baseY - lift;

          return (
            <g
              key={d.label}
              className="bar-3d-group"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Floor Base Ambient Shadow */}
              <ellipse
                cx={x + w / 2 + dx / 2}
                cy={baseY + 4}
                rx={w / 2 + (isHovered ? 6 : 4)}
                ry={3.5}
                fill="rgba(0, 0, 0, 0.24)"
                filter="url(#bar-shadow-blur)"
              />

              {/* Pillar Front Face */}
              <rect
                x={x}
                y={currentTopY}
                width={w}
                height={h}
                rx="2"
                fill={`url(#bar-front-grad-${i})`}
              />

              {/* Pillar Right Extrusion Side Wall */}
              <polygon
                points={`${x + w},${currentTopY} ${x + w + dx},${currentTopY - dy} ${x + w + dx},${currentBaseY - dy} ${x + w},${currentBaseY}`}
                fill={`url(#bar-side-grad-${i})`}
              />

              {/* Pillar Top Face Cap */}
              <polygon
                points={`${x},${currentTopY} ${x + dx},${currentTopY - dy} ${x + w + dx},${currentTopY - dy} ${x + w},${currentTopY}`}
                fill={`url(#bar-top-grad-${i})`}
                stroke="rgba(255, 255, 255, 0.7)"
                strokeWidth="1"
              />

              {/* Vertical Specular Glass Sheen Line */}
              <line
                x1={x + 2.5}
                y1={currentTopY + 1}
                x2={x + 2.5}
                y2={currentBaseY - 1}
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                pointerEvents="none"
              />

              {/* Floating Amount Tag Above Cap */}
              <text
                x={x + w / 2 + dx / 2}
                y={currentTopY - dy - 6}
                textAnchor="middle"
                className="bar-3d-val-svg"
              >
                {formatCompactAmount(d.value, currency)}
              </text>

              {/* Floor Category Label */}
              <text
                x={x + w / 2}
                y={baseY + 20}
                textAnchor="middle"
                className={`bar-3d-lbl-svg ${isHovered ? "active" : ""}`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface CandleStickProps {
  data: { label: string; value: number; color: string }[];
  currency: Currency;
  mfInvested: number;
  closingBankBalance: number;
  monthCredits: number;
  monthDebits: number;
  totalDuesToClear: number;
  unpaidTotal: number;
  bankExpenses: any[];
  expenses: any[];
  items: FinanceItem[];
}

function CandleStickChart3D({
  data,
  currency,
  mfInvested,
  closingBankBalance,
  monthCredits,
  monthDebits,
  totalDuesToClear,
  unpaidTotal,
  bankExpenses,
  expenses,
  items,
}: CandleStickProps) {
  const [viewMode, setViewMode] = useState<"assets" | "trend">("assets");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const candles = React.useMemo(() => {
    if (viewMode === "assets") {
      const fdItem = items.filter((i) => i.type === "fd").reduce((s, i) => s + i.balance + (i.interestInflow || 0), 0);
      const rdItem = items.filter((i) => i.type === "rd").reduce((s, i) => s + i.balance, 0);
      const mfItem = items.filter((i) => i.type === "mf").reduce((s, i) => s + i.balance, 0);

      const bankOpen = Math.max(0, closingBankBalance - monthCredits + monthDebits);
      const bankClose = closingBankBalance;
      const bankHigh = Math.max(bankOpen, bankClose) + Math.max(monthCredits * 0.45, 1000);
      const bankLow = Math.max(0, Math.min(bankOpen, bankClose) - Math.max(monthDebits * 0.45, 500));

      const fdOpen = fdItem * 0.94;
      const fdClose = fdItem;
      const fdHigh = fdItem * 1.03;
      const fdLow = fdItem * 0.94;

      const rdOpen = rdItem * 0.88;
      const rdClose = rdItem;
      const rdHigh = rdItem * 1.04;
      const rdLow = rdItem * 0.88;

      const mfOpen = mfInvested > 0 ? mfInvested : mfItem * 0.88;
      const mfClose = mfItem;
      const mfHigh = Math.max(mfOpen, mfClose) * 1.08;
      const mfLow = Math.min(mfOpen, mfClose) * 0.93;

      const duesOpen = Math.max(totalDuesToClear, unpaidTotal);
      const duesClose = unpaidTotal;
      const duesHigh = Math.max(duesOpen, duesClose) * 1.06;
      const duesLow = Math.min(duesOpen, duesClose) * 0.35;

      const list = [
        { label: "Bank", open: bankOpen, close: bankClose, high: bankHigh, low: bankLow, isLiability: false },
        { label: "FD", open: fdOpen, close: fdClose, high: fdHigh, low: fdLow, isLiability: false },
        { label: "RD", open: rdOpen, close: rdClose, high: rdHigh, low: rdLow, isLiability: false },
        { label: "MF", open: mfOpen, close: mfClose, high: mfHigh, low: mfLow, isLiability: false },
        { label: "Dues", open: duesOpen, close: duesClose, high: duesHigh, low: duesLow, isLiability: true },
      ];

      return list.filter((c) => c.close > 0 || c.open > 0);
    } else {
      const now = new Date();
      const trendList = [];
      for (let offset = 4; offset >= 0; offset--) {
        const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = d.toLocaleDateString(undefined, { month: "short" });

        const mBankTxns = bankExpenses.filter((e) => e.date && e.date.startsWith(monthKey));
        const mCredits = mBankTxns.filter((e) => e.type === "credit").reduce((s, e) => s + e.amount, 0);
        const mDebits = mBankTxns.filter((e) => e.type === "debit").reduce((s, e) => s + e.amount, 0);

        const mExpenses = expenses.filter((e) => (e.dueDate || e.date || "").startsWith(monthKey));
        const mExpTotal = mExpenses.reduce((s, e) => s + e.amount, 0);

        const netSavings = closingBankBalance + (offset * (mDebits - mCredits));
        const openVal = Math.max(1000, netSavings - (mCredits - mDebits));
        const closeVal = Math.max(1000, netSavings);
        const highVal = Math.max(openVal, closeVal) + Math.max(mCredits * 0.3, 1500);
        const lowVal = Math.max(500, Math.min(openVal, closeVal) - Math.max(mDebits * 0.3 + mExpTotal * 0.2, 800));

        trendList.push({
          label: monthLabel,
          open: openVal,
          close: closeVal,
          high: highVal,
          low: lowVal,
          isLiability: false,
        });
      }
      return trendList;
    }
  }, [viewMode, items, mfInvested, closingBankBalance, monthCredits, monthDebits, totalDuesToClear, unpaidTotal, bankExpenses, expenses]);

  if (candles.length === 0) return null;

  const allHighs = candles.map((c) => c.high);
  const allLows = candles.map((c) => c.low);
  const minVal = Math.min(...allLows, 0);
  const maxVal = Math.max(...allHighs, 1);
  const pad = (maxVal - minVal) * 0.12 || 1;
  const yMinDomain = Math.max(0, minVal - pad);
  const yMaxDomain = maxVal + pad;
  const range = yMaxDomain - yMinDomain || 1;

  const chartTop = 26;
  const chartBottom = 138;
  const scaleY = (v: number) => chartBottom - ((v - yMinDomain) / range) * (chartBottom - chartTop);

  const n = candles.length;
  const candleW = n <= 3 ? 34 : n <= 5 ? 26 : 20;
  const dx = 6;
  const dy = 5;
  const availW = 340 - 44;
  const spacing = n > 1 ? (availW - n * candleW) / (n - 1) : 0;

  return (
    <div className="candlestick-3d-container">
      {/* Header with Mode Sub-Toggle & Active OHLC */}
      <div className="candlestick-header-row">
        <div className="chart-3d-tooltip-row">
          {hoveredIdx !== null && candles[hoveredIdx] ? (
            <div className="chart-3d-tooltip-active">
              <span
                className="tooltip-dot"
                style={{
                  background:
                    candles[hoveredIdx].isLiability || candles[hoveredIdx].close < candles[hoveredIdx].open
                      ? "#ef4444"
                      : "#10b981",
                }}
              />
              <span className="tooltip-name">{candles[hoveredIdx].label}:</span>
              <span className="tooltip-ohlc">
                O: {formatCompactAmount(candles[hoveredIdx].open, currency)} | H:{" "}
                {formatCompactAmount(candles[hoveredIdx].high, currency)} | L:{" "}
                {formatCompactAmount(candles[hoveredIdx].low, currency)} | C:{" "}
                {formatCompactAmount(candles[hoveredIdx].close, currency)}
              </span>
              <span
                className="tooltip-pct"
                style={{
                  color:
                    candles[hoveredIdx].close >= candles[hoveredIdx].open ? "#10b981" : "#ef4444",
                }}
              >
                ({candles[hoveredIdx].close >= candles[hoveredIdx].open ? "+" : ""}
                {(
                  ((candles[hoveredIdx].close - candles[hoveredIdx].open) /
                    (candles[hoveredIdx].open || 1)) *
                  100
                ).toFixed(1)}
                %)
              </span>
            </div>
          ) : (
            <div className="chart-3d-tooltip-placeholder">
              <span>Hover on a 3D candle to view OHLC metrics</span>
            </div>
          )}
        </div>

        <div className="candlestick-mode-toggle">
          <button
            type="button"
            className={viewMode === "assets" ? "active" : ""}
            onClick={() => {
              setViewMode("assets");
              setHoveredIdx(null);
            }}
          >
            Asset Classes
          </button>
          <button
            type="button"
            className={viewMode === "trend" ? "active" : ""}
            onClick={() => {
              setViewMode("trend");
              setHoveredIdx(null);
            }}
          >
            Monthly Trend
          </button>
        </div>
      </div>

      <svg
        viewBox="0 0 340 180"
        className="candlestick-3d-svg"
        style={{ width: "100%", height: "auto", maxHeight: "185px", overflow: "visible" }}
      >
        <defs>
          <filter id="candle-shadow-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>

          {/* Bullish (Emerald Green) 3D Gradients */}
          <linearGradient id="candle-bullish-front" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="25%" stopColor="#10b981" />
            <stop offset="75%" stopColor="#059669" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id="candle-bullish-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="candle-bullish-side" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>

          {/* Bearish (Ruby Red) 3D Gradients */}
          <linearGradient id="candle-bearish-front" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="25%" stopColor="#ef4444" />
            <stop offset="75%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="candle-bearish-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#fecaca" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          <linearGradient id="candle-bearish-side" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
        </defs>

        {/* 3 Reference Horizontal Gridlines (Resistance, Mid, Support) */}
        <line x1="12" y1={chartTop + 4} x2="330" y2={chartTop + 4} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
        <line x1="12" y1={(chartTop + chartBottom) / 2} x2="330" y2={(chartTop + chartBottom) / 2} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
        <line x1="12" y1={chartBottom} x2="330" y2={chartBottom} stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />

        {candles.map((c, i) => {
          const x = 22 + i * (candleW + spacing);
          const isHovered = hoveredIdx === i;
          const lift = isHovered ? 4 : 0;

          const yHigh = scaleY(c.high) - lift;
          const yLow = scaleY(c.low) - lift;
          const yOpen = scaleY(c.open) - lift;
          const yClose = scaleY(c.close) - lift;

          const isBullish = !c.isLiability && c.close >= c.open;
          const bodyTop = Math.min(yOpen, yClose);
          const bodyBottom = Math.max(yOpen, yClose);
          const bodyH = Math.max(7, bodyBottom - bodyTop);

          const frontGrad = isBullish ? "url(#candle-bullish-front)" : "url(#candle-bearish-front)";
          const topGrad = isBullish ? "url(#candle-bullish-top)" : "url(#candle-bearish-top)";
          const sideGrad = isBullish ? "url(#candle-bullish-side)" : "url(#candle-bearish-side)";
          const wickColor = isBullish ? "#10b981" : "#ef4444";
          const wickShadowColor = isBullish ? "#064e3b" : "#7f1d1d";
          const tipColor = isBullish ? "#6ee7b7" : "#fca5a5";

          const pctChange = (((c.close - c.open) / (c.open || 1)) * 100).toFixed(1);

          return (
            <g
              key={c.label}
              className="candle-3d-group"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Ground Shadow underneath candle body */}
              <ellipse
                cx={x + candleW / 2 + dx / 2}
                cy={chartBottom + 4}
                rx={candleW / 2 + (isHovered ? 5 : 3)}
                ry={3}
                fill={isBullish ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}
                filter="url(#candle-shadow-blur)"
              />

              {/* ── Upper Wick ── */}
              <line
                x1={x + candleW / 2 + 1}
                y1={yHigh}
                x2={x + candleW / 2 + 1}
                y2={bodyTop}
                stroke={wickShadowColor}
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <line
                x1={x + candleW / 2}
                y1={yHigh}
                x2={x + candleW / 2}
                y2={bodyTop}
                stroke={wickColor}
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <line
                x1={x + candleW / 2 - 0.6}
                y1={yHigh}
                x2={x + candleW / 2 - 0.6}
                y2={bodyTop}
                stroke="#ffffff"
                strokeWidth="0.8"
                opacity="0.75"
              />
              <circle cx={x + candleW / 2} cy={yHigh} r="2.2" fill={tipColor} stroke="#ffffff" strokeWidth="0.8" />

              {/* ── Lower Wick ── */}
              <line
                x1={x + candleW / 2 + 1}
                y1={bodyBottom}
                x2={x + candleW / 2 + 1}
                y2={yLow}
                stroke={wickShadowColor}
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <line
                x1={x + candleW / 2}
                y1={bodyBottom}
                x2={x + candleW / 2}
                y2={yLow}
                stroke={wickColor}
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <line
                x1={x + candleW / 2 - 0.6}
                y1={bodyBottom}
                x2={x + candleW / 2 - 0.6}
                y2={yLow}
                stroke="#ffffff"
                strokeWidth="0.8"
                opacity="0.75"
              />
              <circle cx={x + candleW / 2} cy={yLow} r="2.2" fill={tipColor} stroke="#ffffff" strokeWidth="0.8" />

              {/* ── 3D Candle Body Block ── */}
              {/* Front Face */}
              <rect
                x={x}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                rx="2"
                fill={frontGrad}
              />

              {/* Right Extrusion Side Wall */}
              <polygon
                points={`${x + candleW},${bodyTop} ${x + candleW + dx},${bodyTop - dy} ${x + candleW + dx},${bodyBottom - dy} ${x + candleW},${bodyBottom}`}
                fill={sideGrad}
              />

              {/* Top Face Cap (Isometric Diamond) */}
              <polygon
                points={`${x},${bodyTop} ${x + dx},${bodyTop - dy} ${x + candleW + dx},${bodyTop - dy} ${x + candleW},${bodyTop}`}
                fill={topGrad}
                stroke="rgba(255, 255, 255, 0.75)"
                strokeWidth="1"
              />

              {/* Vertical Specular Glass Sheen Line */}
              <line
                x1={x + 2}
                y1={bodyTop + 1}
                x2={x + 2}
                y2={bodyBottom - 1}
                stroke="rgba(255, 255, 255, 0.55)"
                strokeWidth="1.5"
                strokeLinecap="round"
                pointerEvents="none"
              />

              {/* Floor Label */}
              <text
                x={x + candleW / 2}
                y={chartBottom + 18}
                textAnchor="middle"
                className={`candle-3d-lbl ${isHovered ? "active" : ""}`}
              >
                {c.label}
              </text>

              {/* Trend % Tag */}
              <text
                x={x + candleW / 2}
                y={chartBottom + 30}
                textAnchor="middle"
                fill={isBullish ? "#10b981" : "#ef4444"}
                className="candle-pct-tag"
              >
                {isBullish ? "▲" : "▼"}
                {Math.abs(Number(pctChange))}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HorizontalBarChart({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  if (total === 0) return null;
  return (
    <div className="h-bar-chart">
      {data.filter((d) => d.value > 0).map((d) => (
        <div key={d.label} className="h-bar-row">
          <span className="h-bar-label">{d.label}</span>
          <div className="h-bar-track">
            <div className="h-bar-fill" style={{ width: `${Math.round((d.value / total) * 100)}%`, background: d.color }} />
          </div>
          <span className="h-bar-val">{Math.round((d.value / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard({ masterKey, currency, items, onItemsChange, onLock }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState<FinanceItem | null>(null);
  const [chartType, setChartType] = useState<ChartType>("donut");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });

  // Upcoming Due Modal State
  const [upcomingDue, setUpcomingDue] = useState<{
    type?: "card" | "emi";
    cardId: string;
    cardName: string;
    lastFour: string;
    dueDate: string;
    amount: number;
    daysLeft: number;
    expenseIdsStr?: string;
    loanId?: string;
    emiId?: string;
  } | null>(null);
  const [allUpcomingDues, setAllUpcomingDues] = useState<any[]>([]);
  const [showPaymentApps, setShowPaymentApps] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const payRecordEnabled = loadPayAndRecordEnabled();

  useEffect(() => {
    const allExpenses = loadExpenses();
    const todayStr = new Date().toISOString().split("T")[0];
    const todayMs = new Date(todayStr).getTime();
    
    // Find all unpaid expenses with a due date
    const unpaidDues = allExpenses.filter(e => 
      (e.status === "unpaid" || e.status === "bill_generated_unpaid") && e.dueDate
    );

    // Group by cardId and dueDate
    const grouped = unpaidDues.reduce((acc, exp) => {
      const key = `${exp.cardId}_${exp.dueDate!}`;
      if (!acc[key]) acc[key] = { ...exp, totalAmount: 0, expenseIds: [] };
      acc[key].totalAmount += exp.amount;
      acc[key].expenseIds.push(exp.id);
      return acc;
    }, {} as Record<string, any>);

    let mostUrgent = null;
    let minDays = Infinity;
    const allDues: any[] = [];

    Object.values(grouped).forEach(group => {
      const dueMs = new Date(group.dueDate).getTime();
      const diffDays = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));
      
      // If due within next 3 days (or past due)
      if (diffDays <= 3) {
        const card = items.find(i => i.id === group.cardId);
        const expenseIdsStr = group.expenseIds.sort().join(",");
        const isSuppressed = isDueReminderSuppressed(group.cardId, group.dueDate, expenseIdsStr);
        
        allDues.push({
          cardId: group.cardId,
          cardName: card?.name || "Unknown Card",
          lastFour: card?.lastFour || "",
          dueDate: group.dueDate,
          amount: group.totalAmount,
          expenseIdsStr,
          daysLeft: diffDays,
          isSuppressed
        });

        if (!isSuppressed && diffDays < minDays) {
          minDays = diffDays;
          mostUrgent = {
            cardId: group.cardId,
            cardName: card?.name || "Unknown Card",
            lastFour: card?.lastFour || "",
            dueDate: group.dueDate,
            amount: group.totalAmount,
            expenseIdsStr,
            daysLeft: diffDays
          };
        }
      }
    });

    const emiPayments = loadEmiPayments();
    const loans = loadLoans();
    const unpaidEmis = emiPayments.filter(p => !p.paid);

    unpaidEmis.forEach(emi => {
      const loan = loans.find(l => l.id === emi.loanId);
      if (!loan) return;
      
      let dueMs = 0;
      let dueDateStr = "";
      try {
        const [monStr, yearStr] = emi.monthLabel.split(" ");
        const mIdx = new Date(Date.parse(monStr + " 1, 2012")).getMonth() + 1;
        const dayStr = String(loan.dueDay || 1).padStart(2, "0");
        dueDateStr = `${yearStr}-${String(mIdx).padStart(2, "0")}-${dayStr}`;
        dueMs = new Date(dueDateStr).getTime();
      } catch { return; }

      const diffDays = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) {
        const expenseIdsStr = `emi_${emi.id}`;
        const isSuppressed = isDueReminderSuppressed(loan.id, dueDateStr, expenseIdsStr);
        let cardName = loan.name;
        let lastFour = "";
        
        if (loan.type === "credit_card" && loan.cardId) {
           const linkedCard = items.find(i => i.id === loan.cardId);
           if (linkedCard) {
             cardName = linkedCard.name;
             lastFour = linkedCard.lastFour || "";
           }
        }

        allDues.push({
          type: "emi",
          cardId: loan.id,
          loanId: loan.id,
          emiId: emi.id,
          cardName: cardName,
          lastFour: lastFour,
          dueDate: dueDateStr,
          amount: emi.amount,
          expenseIdsStr,
          daysLeft: diffDays,
          isSuppressed
        });

        if (!isSuppressed && diffDays < minDays) {
          minDays = diffDays;
          mostUrgent = {
            type: "emi",
            cardId: loan.id,
            loanId: loan.id,
            emiId: emi.id,
            cardName: cardName,
            lastFour: lastFour,
            dueDate: dueDateStr,
            amount: emi.amount,
            expenseIdsStr,
            daysLeft: diffDays
          };
        }
      }
    });

    setUpcomingDue(mostUrgent);
    setAllUpcomingDues(allDues);
  }, [items, refreshKey]);

  function handleMarkPaid() {
    if (!upcomingDue) return;
    if (upcomingDue.type === "emi" && upcomingDue.emiId) {
      const allEmis = loadEmiPayments();
      const updated = allEmis.map(e => e.id === upcomingDue.emiId ? { ...e, paid: true, paidDate: new Date().toISOString().split("T")[0] } : e);
      saveEmiPayments(updated);
    } else {
      const allExps = loadExpenses();
      const updated = allExps.map(e => {
        if (e.cardId === upcomingDue.cardId && e.dueDate === upcomingDue.dueDate) {
          if (e.status === "bill_generated_unpaid") return { ...e, status: "bill_generated" as const };
          if (e.status === "unpaid") return { ...e, status: "paid" as const };
        }
        return e;
      });
      saveExpenses(updated);
    }
    setUpcomingDue(null);
    setRefreshKey(k => k + 1);
  }

  function handleSuppress() {
    if (!upcomingDue) return;
    suppressDueReminder(upcomingDue.cardId, upcomingDue.dueDate, upcomingDue.expenseIdsStr || "");
    setUpcomingDue(null);
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  function prevMonth() {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function nextMonth() {
    if (selectedMonth >= currentMonth) return;
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const [selY, selM] = selectedMonth.split("-").map(Number);
  const selMonthLabel = new Date(selY, selM - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Last calendar day string of selectedMonth e.g. "2026-06-30"
  const lastDay = new Date(selY, selM, 0);
  const lastDayStr = `${selY}-${String(selM).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

  const expenses   = loadExpenses();
  const bankExpAll = loadBankExpenses();

  // ── Bank activity for selected month ──────────────────────────
  const monthBankTxns  = bankExpAll.filter(e => e.date.startsWith(selectedMonth));
  const monthCredits   = monthBankTxns.filter(e => e.type === "credit").reduce((s, e) => s + e.amount, 0);
  const monthDebits    = monthBankTxns.filter(e => e.type === "debit").reduce((s, e) => s + e.amount, 0);

  // Closing bank balance at end of selected month (reconstruct from current balance)
  const bankItems = items.filter(i => i.type === "bank");
  const closingBankBalance = bankItems.reduce((total, bank) => {
    const txnsAfter = bankExpAll.filter(e => e.bankId === bank.id && e.date > lastDayStr);
    const futureDebits  = txnsAfter.filter(e => e.type === "debit").reduce((s, e) => s + e.amount, 0);
    const futureCredits = txnsAfter.filter(e => e.type === "credit").reduce((s, e) => s + e.amount, 0);
    // closing = current + future_debits − future_credits (reversing future movement)
    return total + bank.balance + futureDebits - futureCredits;
  }, 0);

  // ── Card dues for selected month ───────────────────────────────
  // "Due this month" = expenses whose dueDate (or date if no dueDate) falls in selectedMonth
  const dueThisMonth = expenses.filter(e => (e.dueDate || e.date).startsWith(selectedMonth));
  const dueThisMonthTotal   = dueThisMonth.reduce((s, e) => s + e.amount, 0);
  const dueThisMonthPaid    = dueThisMonth.filter(e => e.status === "paid" || e.status === "bill_generated").reduce((s, e) => s + e.amount, 0);
  const dueThisMonthUnpaid  = dueThisMonth.filter(e => e.status === "unpaid" || e.status === "bill_generated_unpaid").reduce((s, e) => s + e.amount, 0);

  // Unpaid dues from ALL prior months (carried in to this month)
  const carriedInDues = expenses
    .filter(e => (e.dueDate || e.date).slice(0, 7) < selectedMonth && (e.status === "unpaid" || e.status === "bill_generated_unpaid"))
    .reduce((s, e) => s + e.amount, 0);

  // Total dues to clear this month = this month's dues + carried-in
  const totalDuesToClear = dueThisMonthTotal + carriedInDues;
  // What's still not cleared (carries to NEXT month)
  const carryOutDues = dueThisMonthUnpaid + carriedInDues;

  // ── Summary stats (all-time) ──────────────────────────────────
  const unpaidTotal  = expenses.filter(e => e.status === "unpaid" || e.status === "bill_generated_unpaid").reduce((s, e) => s + e.amount, 0);
  const bankTotal    = items.filter(i => i.type === "bank").reduce((s, i) => s + i.balance, 0);
  const fdTotal      = items.filter(i => i.type === "fd").reduce((s, i) => s + i.balance + (i.interestInflow || 0), 0);
  const rdTotal      = items.filter(i => i.type === "rd").reduce((s, i) => s + i.balance, 0);
  const mfTotal      = items.filter(i => i.type === "mf").reduce((s, i) => s + i.balance, 0);
  const cardCount    = items.filter(i => i.type === "card" || i.type === "paylater").length;
  const savingsTotal = bankTotal + fdTotal + rdTotal + mfTotal;

  // Calculate actual Net Worth Growth based on Mutual Fund / Investments return
  const mfInvested = items.filter(i => i.type === "mf").reduce((s, i) => s + (i.investedAmount || i.balance), 0);
  const totalInvestedBase = bankTotal + fdTotal + rdTotal + mfInvested;
  const netGrowthAmount = savingsTotal - totalInvestedBase;
  const netGrowthPct = totalInvestedBase > 0 ? (netGrowthAmount / totalInvestedBase) * 100 : 0;
  const netGrowthFormatted = (netGrowthPct > 0 ? "+" : "") + netGrowthPct.toFixed(1) + "%";

  const chartData = [
    { label: "Bank", value: bankTotal, color: "#3b82f6" },
    { label: "FD", value: fdTotal, color: "#f59e0b" },
    { label: "RD", value: rdTotal, color: "#10b981" },
    { label: "MF", value: mfTotal, color: "#06b6d4" },
    { label: "Dues", value: unpaidTotal, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const chartTotal = chartData.reduce((s, d) => s + d.value, 0);

  function handleAdd(item: FinanceItem) {
    const updated = [item, ...items];
    saveItems(updated);
    onItemsChange(updated);
    setShowAddForm(false);
  }

  function handleDelete(id: string) {
    const updated = items.filter((i) => i.id !== id);
    saveItems(updated);
    onItemsChange(updated);
    saveExpenses(loadExpenses().filter((e) => e.cardId !== id));
    saveBankExpenses(loadBankExpenses().filter((e) => e.bankId !== id));
  }

  function handleEditSave(updated: FinanceItem) {
    const updatedItems = items.map(i => i.id === updated.id ? updated : i);
    saveItems(updatedItems);
    onItemsChange(updatedItems);
    setEditItem(null);
  }

  return (
    <div className="screen">
      {upcomingDue && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-sheet">
            <div className="modal-header">
              <h3 className="form-title" style={{ color: "var(--danger)" }}><AlertTriangle size={20} /> {upcomingDue.type === "emi" ? "EMI Due Reminder" : "Bill Due Reminder"}</h3>
              <button className="modal-close" onClick={() => setUpcomingDue(null)}><X size={16} /></button>
            </div>
            <div className="form-group" style={{ textAlign: "center", padding: "10px 0" }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{upcomingDue.cardName}</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: 16 }}>{upcomingDue.type === "emi" ? "Loan EMI" : (upcomingDue.lastFour ? `•••• ${upcomingDue.lastFour}` : "•••• •••• ••••")}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface2)", padding: "12px 16px", borderRadius: "12px", marginBottom: "16px" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text2)" }}>Amount Due</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--danger)" }}>{formatAmount(upcomingDue.amount, currency)}</span>
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--danger)", fontWeight: 500, marginBottom: "20px" }}>
                {upcomingDue.daysLeft < 0 ? `Overdue by ${Math.abs(upcomingDue.daysLeft)} day(s)` : upcomingDue.daysLeft === 0 ? "Due Today!" : `Due in ${upcomingDue.daysLeft} day(s)`}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button type="button" className="btn-primary" onClick={() => setShowPaymentApps(true)}><Coins size={16} /> Pay Now</button>
              <button type="button" className="btn-outline" onClick={handleMarkPaid} style={{ borderColor: "var(--success)", color: "var(--success)" }}><CheckCircle size={16} /> Paid Already</button>
              <button type="button" className="btn-outline" onClick={handleSuppress} style={{ borderColor: "var(--border)", color: "var(--text2)" }}><EyeOff size={16} /> Do not show again</button>
            </div>
          </div>
        </div>
      )}
      
      {payRecordEnabled && showPaymentApps && <PayAutoRecordModal onClose={() => setShowPaymentApps(false)} />}

      <header className="dashboard-header">
        <div className="header-top">
          <div className="header-title-wrap">
            <h2 className="header-title"><LayoutDashboard size={20} /> Dashboard</h2>
            <span className="desktop-header-subtitle">Overview &amp; Asset Management</span>
          </div>
          <div className="header-actions">
            <button type="button" className="btn-header-icon" onClick={() => window.dispatchEvent(new CustomEvent('navigate-cashback'))} aria-label="Cashback" title="Cashback"><Gift size={20} /></button>
            <NotificationBell 
              customNotifs={allUpcomingDues.map(d => ({
                id: `due_${d.cardId}_${d.dueDate}`,
                type: "warning",
                title: d.type === "emi" ? "EMI Due Reminder" : "Bill Due Reminder",
                message: `${d.cardName} ${d.type === "emi" ? "EMI" : "(" + (d.lastFour ? "•••• " + d.lastFour : "") + ") bill"} of ${formatAmount(d.amount, currency)} is ${d.daysLeft < 0 ? `overdue by ${Math.abs(d.daysLeft)} day(s)` : d.daysLeft === 0 ? "due today!" : `due in ${d.daysLeft} day(s)`}.`,
                ctaText: "Pay Now",
                ctaAction: () => setShowPaymentApps(true)
              }))} 
            />
            <button type="button" className="btn-logout" onClick={onLock} aria-label="Logout" title="Logout"><LogOut size={20} /></button>
          </div>
        </div>

        {/* KPI Row (Transforms to 4 equal cards on desktop) */}
        <div className="summary-grid desktop-kpi-grid">
          <div className="summary-card green desktop-kpi-card">
            <div className="desktop-kpi-header">
              <span className="summary-lbl">Total Savings</span>
              <span className="desktop-kpi-trend positive"><ArrowUp size={14} /> +2.4%</span>
            </div>
            <span className="summary-val tabular-nums">{formatCompactAmount(savingsTotal, currency)}</span>
          </div>

          <div className="summary-card red desktop-kpi-card">
            <div className="desktop-kpi-header">
              <span className="summary-lbl">Outstanding Dues</span>
              <span className="desktop-kpi-trend negative"><ArrowDown size={14} /> -1.2%</span>
            </div>
            <span className="summary-val tabular-nums">{formatCompactAmount(unpaidTotal, currency)}</span>
          </div>

          <div className="summary-card gold desktop-kpi-card desktop-only-kpi">
            <div className="desktop-kpi-header">
              <span className="summary-lbl">Net Worth Growth</span>
              <span className="desktop-kpi-trend positive"><TrendingUp size={14} /> YTD</span>
            </div>
            <span className="summary-val tabular-nums">{netGrowthFormatted}</span>
          </div>

          <div className="summary-card slate desktop-kpi-card desktop-only-kpi">
            <div className="desktop-kpi-header">
              <span className="summary-lbl">Active Accounts</span>
              <span className="desktop-kpi-trend neutral"><CreditCard size={14} /></span>
            </div>
            <span className="summary-val tabular-nums">{items.length} Active</span>
          </div>
        </div>
      </header>

      <div className="content">
        {/* Two-Column Desktop Section (60/40 split on wide screens) */}
        <div className="desktop-split-row">
          {/* Left: Net Worth Allocation Card */}
          {chartData.length > 0 ? (
            <div className="chart-section desktop-chart-card">
              <div className="desktop-card-header">
                <h3 className="desktop-card-title">Net Worth Allocation</h3>
                {/* Chart Type Switcher */}
                <div className="chart-type-switcher">
                  <button className={`chart-type-btn ${chartType === "donut" ? "active" : ""}`} onClick={() => setChartType("donut")} title="3D Donut Chart"><PieChart size={16} color={chartType === "donut" ? "#ffffff" : "currentColor"} /></button>
                  <button className={`chart-type-btn ${chartType === "bar" ? "active" : ""}`} onClick={() => setChartType("bar")} title="3D Bar Chart"><BarChart3 size={16} color={chartType === "bar" ? "#ffffff" : "currentColor"} /></button>
                  <button className={`chart-type-btn ${chartType === "candlestick" ? "active" : ""}`} onClick={() => setChartType("candlestick")} title="3D Candlestick Chart"><CandlestickChart size={16} color={chartType === "candlestick" ? "#ffffff" : "currentColor"} /></button>
                  <button className={`chart-type-btn ${chartType === "horizontal" ? "active" : ""}`} onClick={() => setChartType("horizontal")} title="Horizontal Bars"><AlignLeft size={16} color={chartType === "horizontal" ? "#ffffff" : "currentColor"} /></button>
                </div>
              </div>

              {chartType === "donut" && (
                <div className="chart-donut-wrap">
                  <div className="chart-donut">
                    <DonutChart data={chartData} />
                    <div className="chart-center-text">
                      <span className="chart-center-val tabular-nums">{formatCompactAmount(savingsTotal, currency)}</span>
                      <span className="chart-center-lbl">Net Worth</span>
                    </div>
                  </div>

                  {/* Mobile Legend (Original Clean Layout) */}
                  <div className="chart-legend mobile-only-legend">
                    {chartData.map(d => (
                      <div key={d.label} className="legend-item">
                        <span className="legend-dot" style={{ background: d.color }} />
                        <span className="legend-label">{d.label}</span>
                        <span className="legend-val tabular-nums" style={d.label === "Dues" ? { color: "var(--danger)" } : undefined}>
                          {d.label === "Dues" ? `−${formatAmount(d.value, currency)}` : formatAmount(d.value, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Structured Asset Breakdown Table on Desktop */}
                  <div className="chart-legend desktop-legend-table-wrap desktop-only-table">
                    <table className="desktop-legend-table">
                      <thead>
                        <tr>
                          <th className="text-left">Asset Class</th>
                          <th className="text-right">Value</th>
                          <th className="text-right">% Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chartData.map(d => (
                          <tr key={d.label}>
                            <td className="legend-class-cell">
                              <span className="legend-dot" style={{ background: d.color }} />
                              <span>{d.label}</span>
                            </td>
                            <td className="legend-val-cell tabular-nums text-right" style={d.label === "Dues" ? { color: "var(--danger)" } : undefined}>
                              {d.label === "Dues" ? `−${formatAmount(d.value, currency)}` : formatAmount(d.value, currency)}
                            </td>
                            <td className="legend-pct-cell tabular-nums text-right">
                              {chartTotal > 0 ? `${Math.round((d.value / chartTotal) * 100)}%` : "0%"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {chartType === "bar" && (
                <div className="chart-bar-wrap">
                  <BarChart data={chartData} currency={currency} />
                  <div className="chart-legend">
                    {chartData.map(d => (
                      <div key={d.label} className="legend-item">
                        <span className="legend-dot" style={{ background: d.color }} />
                        <span className="legend-label">{d.label}</span>
                        <span className="legend-val tabular-nums" style={d.label === "Dues" ? { color: "var(--danger)" } : undefined}>
                          {d.label === "Dues" ? `−${formatAmount(d.value, currency)}` : formatAmount(d.value, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chartType === "candlestick" && (
                <div className="chart-candlestick-wrap">
                  <CandleStickChart3D
                    data={chartData}
                    currency={currency}
                    mfInvested={mfInvested}
                    closingBankBalance={closingBankBalance}
                    monthCredits={monthCredits}
                    monthDebits={monthDebits}
                    totalDuesToClear={totalDuesToClear}
                    unpaidTotal={unpaidTotal}
                    bankExpenses={bankExpAll}
                    expenses={expenses}
                    items={items}
                  />
                  <div className="chart-legend">
                    {chartData.map(d => (
                      <div key={d.label} className="legend-item">
                        <span className="legend-dot" style={{ background: d.color }} />
                        <span className="legend-label">{d.label}</span>
                        <span className="legend-val tabular-nums" style={d.label === "Dues" ? { color: "var(--danger)" } : undefined}>
                          {d.label === "Dues" ? `−${formatAmount(d.value, currency)}` : formatAmount(d.value, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {chartType === "horizontal" && (
                <div className="chart-hbar-wrap">
                  <HorizontalBarChart data={chartData} total={chartTotal} />
                </div>
              )}

              {chartData.length > 1 && chartType !== "horizontal" && (
                <div className="asset-bars">
                  {chartData.map(d => (
                    <div key={d.label} className="asset-bar-row">
                      <span className="asset-bar-label">{d.label}</span>
                      <div className="asset-bar-track">
                        <div className="asset-bar-fill" style={{ width: `${Math.round((d.value / chartTotal) * 100)}%`, background: d.color }} />
                      </div>
                      <span className="asset-bar-pct tabular-nums">{Math.round((d.value / chartTotal) * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="chart-section desktop-chart-card empty-allocation-card">
              <div className="desktop-card-header">
                <h3 className="desktop-card-title">Net Worth Allocation</h3>
              </div>
              <div className="empty-allocation-content">
                <div className="empty-donut-placeholder">
                  <PieChart size={36} className="empty-donut-icon" />
                </div>
                <div className="empty-allocation-text">
                  <h4 className="empty-allocation-heading">No Assets Recorded</h4>
                  <p className="empty-allocation-desc">Add your bank accounts, cards, fixed deposits, or investments to visualize your net worth allocation.</p>
                  <button type="button" className="btn-primary empty-add-btn" onClick={() => setShowAddForm(true)}>+ Add First Entry</button>
                </div>
              </div>
            </div>
          )}

          {/* Right: Monthly Summary & Sparkline Card */}
          <div className="monthly-overview desktop-monthly-card">
            {/* Month Navigator */}
            <div className="desktop-card-header">
              <h3 className="desktop-card-title">Monthly Summary</h3>
              <div className="month-nav-bar inline-nav">
                <button type="button" className="month-nav-btn" onClick={prevMonth}><ChevronLeft size={14} /></button>
                <span className="month-nav-label"><Calendar size={14} /> {selMonthLabel}</span>
                <button type="button" className="month-nav-btn" onClick={nextMonth} disabled={selectedMonth >= currentMonth}><ChevronRight size={14} /></button>
              </div>
            </div>

            {/* Bank Activity */}
            <div className="monthly-row">
              <div className="monthly-stat-card">
                <span className="monthly-stat-icon"><Building2 size={20} /></span>
                <div className="monthly-stat-body">
                  <span className="monthly-stat-lbl">Closing Bank Balance</span>
                  <span className="monthly-stat-val tabular-nums">{formatAmount(closingBankBalance, currency)}</span>
                  <span className="monthly-stat-sub">
                    <span className="credit-text"><ArrowUp size={12} /> {formatAmount(monthCredits, currency)}</span>
                    {" · "}
                    <span className="debit-text"><ArrowDown size={12} /> {formatAmount(monthDebits, currency)}</span>
                  </span>
                </div>
              </div>

              <div className="monthly-stat-card">
                <span className="monthly-stat-icon"><CreditCard size={20} /></span>
                <div className="monthly-stat-body">
                  <span className="monthly-stat-lbl">Dues This Month</span>
                  <span className="monthly-stat-val tabular-nums">{formatAmount(dueThisMonthTotal, currency)}</span>
                  <span className="monthly-stat-sub">
                    {carriedInDues > 0
                      ? <span className="carried-text">+{formatAmount(carriedInDues, currency)} carried in</span>
                      : <span className="paid-text"><Check size={14} /> {formatAmount(dueThisMonthPaid, currency)} paid</span>
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Breakdown rows */}
            <div className="monthly-breakdown">
              <div className="monthly-breakdown-row">
                <span className="mbd-label">Total to clear</span>
                <span className="mbd-val tabular-nums">{formatAmount(totalDuesToClear, currency)}</span>
              </div>
              <div className="monthly-breakdown-row">
                <span className="mbd-label">Paid / Billed</span>
                <span className="mbd-val credit-text tabular-nums">{formatAmount(dueThisMonthPaid, currency)}</span>
              </div>
              <div className={`monthly-breakdown-row ${carryOutDues > 0 ? "carry-row" : ""}`}>
                <span className="mbd-label"><ArrowRight size={12} /> Carrying to next month</span>
                <span className={`mbd-val tabular-nums ${carryOutDues > 0 ? "debit-text" : "credit-text"}`}>
                  {carryOutDues > 0 ? formatAmount(carryOutDues, currency) : <>Nothing — all cleared <Check size={14} /></>}
                </span>
              </div>
            </div>

            {/* 6-Month Sparkline Trend Graph on Desktop */}
            <div className="desktop-sparkline-section">
              <div className="desktop-sparkline-header">
                <span className="desktop-sparkline-title">6-Month Net Worth Trend</span>
                <span className="desktop-sparkline-badge"><TrendingUp size={12} /> Investor View</span>
              </div>
              <div className="desktop-sparkline-canvas">
                <svg className="sparkline-svg" preserveAspectRatio="none" viewBox="0 0 300 80">
                  <defs>
                    <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C8CE0" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#7C8CE0" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon points="0,80 0,65 50,55 100,60 150,35 200,42 250,20 300,15 300,80" fill="url(#sparklineGrad)" />
                  <polyline fill="none" points="0,65 50,55 100,60 150,35 200,42 250,20 300,15" stroke="#7C8CE0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="300" cy="15" r="4" fill="#5FBF95" />
                </svg>
                <div className="sparkline-months">
                  <span>6 mos ago</span>
                  <span>3 mos ago</span>
                  <span className="sparkline-active-month">Current</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="section-header">
          <h3 className="section-title">Connected Accounts &amp; Portfolios</h3>
          <span className="section-subtitle-badge">{items.length} Total</span>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon"><Building2 size={20} /></p>
            <p className="empty-text">No entries yet.</p>
            <p className="empty-sub">Tap + to add bank accounts, cards, FDs, RDs, or mutual funds.</p>
          </div>
        ) : (
          <ul className="item-list">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                masterKey={masterKey}
                currency={currency}
                onDelete={handleDelete}
                onEdit={setEditItem}
              />
            ))}
          </ul>
        )}
      </div>

      {payRecordEnabled && (
        <button className="fab-btn pay-fab-btn" onClick={() => setShowPaymentApps(true)} aria-label="Pay Now" title="Pay Now">
          <Coins size={24} />
        </button>
      )}
      <button className="fab-btn" onClick={() => setShowAddForm(true)} aria-label="Add Entry" title="Add Entry">
        <Plus size={26} strokeWidth={2.5} />
      </button>
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <AddItemForm
              masterKey={masterKey}
              currency={currency}
              onAdd={handleAdd}
              startOpen
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}

      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <AddItemForm
              masterKey={masterKey}
              currency={currency}
              onAdd={() => {}}
              initialValues={editItem}
              onSave={handleEditSave}
              onCancel={() => setEditItem(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
