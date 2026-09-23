import React, { useState, useEffect } from "react";
import { LayoutDashboard, ArrowLeft, Calendar, Flag, CheckCircle, Plus, Trash2 } from "lucide-react";
import { FinanceItem, FDInterestEntry } from "../types";
import { Currency, formatAmount } from "../lib/currency";
import { getFDInterestEntriesForFD, saveFDInterestEntries, loadFDInterestEntries } from "../lib/storage";
import { generateId } from "../lib/utils";

interface Props {
  fd: FinanceItem;
  currency: Currency;
  onBack: () => void;
  onInterestUpdate?: (id: string, totalInterest: number) => void;
}

export default function FDDetail({ fd, currency, onBack, onInterestUpdate }: Props) {
  const [entries, setEntries] = useState<FDInterestEntry[]>([]);
  const [month, setMonth] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    setEntries(getFDInterestEntriesForFD(fd.id).sort((a, b) => b.month.localeCompare(a.month)));
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    setMonth(`${d.getFullYear()}-${mm}`);
  }, [fd.id]);

  const now = new Date();
  const maturity = fd.maturityDate ? new Date(fd.maturityDate + "T00:00:00") : null;
  const start    = fd.startDate    ? new Date(fd.startDate + "T00:00:00")    : null;

  const daysLeft = maturity ? Math.ceil((maturity.getTime() - now.getTime()) / 86400000) : null;
  const isMatured = daysLeft !== null && daysLeft <= 0;

  const totalDays = (start && maturity)
    ? Math.ceil((maturity.getTime() - start.getTime()) / 86400000)
    : null;
  const elapsedDays = start
    ? Math.ceil((now.getTime() - start.getTime()) / 86400000)
    : null;
  const progressPct = (totalDays && elapsedDays)
    ? Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))
    : null;

  // Simple interest maturity estimate
  const P = fd.balance;
  const r = fd.interestRate ?? 0;
  let years = 0;
  if (start && maturity) {
    years = (maturity.getTime() - start.getTime()) / (365.25 * 86400000);
  }
  const simpleInterest = (P * r * years) / 100;
  
  // Actual Interest collected from Ledger
  const actualEarnedInterest = entries.reduce((s, e) => s + e.amount, 0);
  const currentTotal = P + actualEarnedInterest;
  const maturityAmount = P + simpleInterest;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!month || isNaN(val) || val <= 0) return;

    const newEntry: FDInterestEntry = {
      id: generateId(),
      fdId: fd.id,
      month,
      amount: val,
      createdAt: Date.now()
    };

    const all = loadFDInterestEntries();
    const nextAll = [newEntry, ...all];
    saveFDInterestEntries(nextAll);

    const nextEntries = [newEntry, ...entries].sort((a, b) => b.month.localeCompare(a.month));
    setEntries(nextEntries);
    setAmount("");

    if (onInterestUpdate) onInterestUpdate(fd.id, actualEarnedInterest + val);
  }

  function handleDelete(id: string) {
    const all = loadFDInterestEntries().filter(e => e.id !== id);
    saveFDInterestEntries(all);

    const nextEntries = entries.filter(e => e.id !== id);
    setEntries(nextEntries);

    const newTotal = nextEntries.reduce((s, e) => s + e.amount, 0);
    if (onInterestUpdate) onInterestUpdate(fd.id, newTotal);
  }

  function formatMonthLabel(yyyyMm: string) {
    try {
      const [y, m] = yyyyMm.split("-");
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    } catch { return yyyyMm; }
  }

  return (
    <div className="screen">
      <header className="detail-header">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <div className="detail-header-info">
          <h2 className="detail-title">{fd.name}</h2>
          <span className="detail-subtitle">Fixed Deposit</span>
        </div>
      </header>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value paid-val">{formatAmount(P, currency)}</span>
          <span className="stat-label">Principal</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value cashback-val">{formatAmount(simpleInterest, currency)}</span>
          <span className="stat-label">Est. Interest</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value cashback-val" style={{ color: "var(--success)" }}>+{formatAmount(actualEarnedInterest, currency)}</span>
          <span className="stat-label">Actual Earned</span>
        </div>
      </div>

      <div className="content">
        {/* Detail chips */}
        <div className="fd-info-row">
          {r > 0 && <span className="fd-info-chip"><LayoutDashboard size={20} /> {r}% p.a. (Simple Interest)</span>}
          {fd.startDate    && <span className="fd-info-chip"><Calendar size={16} /> Started: {fmtDate(fd.startDate)}</span>}
          {fd.maturityDate && <span className="fd-info-chip"><><Flag size={14} /> Matures:</> {fmtDate(fd.maturityDate)}</span>}
        </div>

        {/* Progress / countdown */}
        {progressPct !== null && (
          <div className="fd-card">
            <div className="fd-card-row">
              <span>{isMatured ? <><CheckCircle size={16} /> Matured!</> : `${daysLeft} days to maturity`}</span>
              <span>{Math.round(progressPct)}% elapsed</span>
            </div>
            <div className="rd-progress-bar" style={{ marginTop: 8 }}>
              <div className="rd-progress-fill"
                style={{ width: `${progressPct}%`, background: isMatured ? "#10b981" : "#f59e0b" }} />
            </div>
            {isMatured && (
              <p className="fd-matured-note">This FD has matured. Consider renewing or withdrawing.</p>
            )}
          </div>
        )}

        {/* Breakdown table */}
        <div className="fd-card">
          <h3 className="fd-section-title">Deposit Details</h3>
          <table className="fd-table">
            <tbody>
              <tr><td>Principal</td><td>{formatAmount(P, currency)}</td></tr>
              {r > 0 && <tr><td>Interest Rate</td><td>{r}% p.a.</td></tr>}
              {years > 0 && <tr><td>Tenure</td><td>{years.toFixed(2)} years</td></tr>}
              {simpleInterest > 0 && <tr><td>Est. Total Interest</td><td>{formatAmount(simpleInterest, currency)}</td></tr>}
              {actualEarnedInterest > 0 && <tr><td>Actual Earned Interest</td><td style={{ color: "var(--success)", fontWeight: 500 }}>+{formatAmount(actualEarnedInterest, currency)}</td></tr>}
              <tr className="fd-table-total"><td>Est. Maturity Amount</td><td>{formatAmount(maturityAmount, currency)}</td></tr>
            </tbody>
          </table>
          <p className="fd-disclaimer">* Est. based on simple interest. Use the ledger below for actuals.</p>
        </div>

        {/* Interest Ledger */}
        <div className="fd-card" style={{ marginTop: 16 }}>
          <h3 className="fd-section-title">Interest Inflow Ledger</h3>
          <form style={{ display: "flex", gap: "8px", marginBottom: "20px", alignItems: "center" }} onSubmit={handleAdd}>
            <input
              type="month"
              style={{ flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--border)", background: "rgba(0,0,0,0.2)", color: "var(--text)", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
            <input
              type="number"
              style={{ flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--border)", background: "rgba(0,0,0,0.2)", color: "var(--text)", outline: "none", fontSize: "14px", boxSizing: "border-box" }}
              placeholder="Amount"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <button type="submit" style={{ padding: "12px", borderRadius: "12px", background: "var(--primary)", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}>
              <Plus size={20} />
            </button>
          </form>

          {entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 10px", opacity: 0.6, background: "rgba(0,0,0,0.15)", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <Calendar size={28} style={{ marginBottom: "12px", opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: "14px" }}>No interest logged yet.</p>
            </div>
          ) : (
            <ul className="rd-month-list" style={{ gap: "10px", display: "flex", flexDirection: "column", padding: 0, margin: 0, listStyle: "none" }}>
              {entries.map(e => (
                <li key={e.id} className="rd-month-item paid" style={{ margin: 0, border: "1px solid rgba(16, 185, 129, 0.2)", background: "rgba(16, 185, 129, 0.05)", boxSizing: "border-box", width: "100%" }}>
                  <div className="rd-month-left">
                    <span className="rd-month-label" style={{ fontSize: "15px", fontWeight: 600 }}>{formatMonthLabel(e.month)}</span>
                    <span className="rd-month-amount" style={{ color: "var(--success)", fontSize: "14px", marginTop: "4px" }}>+{formatAmount(e.amount, currency)}</span>
                    <span style={{ fontSize: "11px", opacity: 0.5, marginTop: "6px", display: "block" }}>Logged on {new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button className="icon-btn text-danger" style={{ background: "rgba(239, 68, 68, 0.15)", padding: "10px", borderRadius: "50%", display: "flex" }} onClick={() => handleDelete(e.id)}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch { return d; }
}
