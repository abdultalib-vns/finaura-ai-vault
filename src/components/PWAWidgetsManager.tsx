import React, { useEffect, useState } from "react";
import { X, Lock, Shield, ArrowRight, Download, Calendar, DollarSign, Wallet, AlertTriangle } from "lucide-react";
import { FinanceItem, Currency } from "../types";
import { loadExpenses, loadLoans, loadEmiPayments } from "../lib/storage";
import { formatAmount } from "../lib/currency";
import PayAutoRecordModal from "./PayAutoRecordModal";

interface Props {
  masterKey: string | null;
  currency: Currency;
  items: FinanceItem[];
  onRequireBackup: () => void; // Trigger backup
}

export default function PWAWidgetsManager({ masterKey, currency, items, onRequireBackup }: Props) {
  const [activeWidget, setActiveWidget] = useState<string | null>(null);

  useEffect(() => {
    // Check URL search params for widget
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const w = params.get("widget");
      if (w) {
        setActiveWidget(w);
        // Remove widget from URL so it doesn't persist on reload unexpectedly
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  if (!activeWidget) return null;

  const close = () => setActiveWidget(null);

  return (
    <>
      {activeWidget === "savings" && <SavingsWidget onClose={close} items={items} currency={currency} />}
      {activeWidget === "upcoming" && <UpcomingWidget onClose={close} items={items} currency={currency} />}
      {activeWidget === "backup" && <BackupWidget onClose={close} onTriggerBackup={onRequireBackup} masterKey={masterKey} />}
      {activeWidget === "pay" && <PayAutoRecordModal onClose={close} />}
    </>
  );
}

// ── Widget 1: Savings & Dues ──
function SavingsWidget({ onClose, items, currency }: { onClose: () => void, items: FinanceItem[], currency: Currency }) {
  const bankTotal = items.filter(i => i.type === "bank").reduce((sum, i) => sum + i.balance, 0);
  const fdTotal = items.filter(i => i.type === "fd").reduce((sum, i) => sum + i.balance, 0);
  const rdTotal = items.filter(i => i.type === "rd").reduce((sum, i) => sum + i.balance, 0);
  
  const totalSavings = bankTotal + fdTotal + rdTotal;
  
  const expenses = loadExpenses();
  const unpaidCardDues = expenses.filter(e => e.status === "unpaid").reduce((sum, e) => sum + e.amount, 0);

  const loans = loadLoans();
  const emiPayments = loadEmiPayments();
  const outstandingLoanDues = loans.reduce((sum, l) => {
    const paidSum = emiPayments.filter(e => e.loanId === l.id && e.paid).reduce((s, e) => s + e.amount, 0);
    return sum + (l.totalPayable - paidSum);
  }, 0);

  return (
    <div className="pwa-widget-overlay">
      <div className="pwa-widget-card" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white" }}>
        <button className="pwa-widget-close" onClick={onClose}><X size={20} /></button>
        <div className="pwa-widget-header">
          <Wallet size={24} />
          <h3>Financial Overview</h3>
        </div>
        
        <div className="pwa-widget-section">
          <div className="pwa-widget-label">Total Savings</div>
          <div className="pwa-widget-value" style={{ fontSize: "2.4rem" }}>{formatAmount(totalSavings, currency)}</div>
        </div>
        
        <div className="pwa-widget-row">
          <div className="pwa-widget-subbox" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="pwa-widget-label">Card Dues</div>
            <div className="pwa-widget-subval">{formatAmount(unpaidCardDues, currency)}</div>
          </div>
          <div className="pwa-widget-subbox" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="pwa-widget-label">Loan Dues</div>
            <div className="pwa-widget-subval">{formatAmount(outstandingLoanDues, currency)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Widget 2: Upcoming Bills ──
function UpcomingWidget({ onClose, items, currency }: { onClose: () => void, items: FinanceItem[], currency: Currency }) {
  const expenses = loadExpenses();
  const pendingBills = expenses
    .filter(e => e.status === "unpaid" && !!e.dueDate)
    .sort((a, b) => new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime())
    .slice(0, 5); // next 5

  const loans = loadLoans();
  const today = new Date();
  const nextLoanEMIs = loans.map(l => {
    // simplified assumption: next emi is roughly 1 month from now or this month
    return { name: l.name, amount: l.monthlyEmi, day: l.dueDay || 1 }; // placeholder logic
  }).slice(0, 3);

  return (
    <div className="pwa-widget-overlay">
      <div className="pwa-widget-card" style={{ background: "var(--surface)", color: "var(--text)" }}>
        <button className="pwa-widget-close" style={{ color: "var(--text)" }} onClick={onClose}><X size={20} /></button>
        <div className="pwa-widget-header" style={{ color: "var(--accent)" }}>
          <Calendar size={24} />
          <h3>Upcoming Dues</h3>
        </div>
        
        <div style={{ marginTop: "16px", maxHeight: "60vh", overflowY: "auto" }}>
          {pendingBills.length === 0 && nextLoanEMIs.length === 0 && (
            <p style={{ color: "var(--text2)", textAlign: "center", padding: "20px 0" }}>No upcoming dues!</p>
          )}

          {pendingBills.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text2)", fontSize: "0.85rem", textTransform: "uppercase" }}>Card Bills</div>
              {pendingBills.map(b => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "var(--surface2)", borderRadius: "10px", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{b.description}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--danger)" }}>Due: {new Date(b.dueDate as string).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{formatAmount(b.amount, currency)}</div>
                </div>
              ))}
            </div>
          )}
          
          {nextLoanEMIs.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: "8px", color: "var(--text2)", fontSize: "0.85rem", textTransform: "uppercase" }}>Loan EMIs</div>
              {nextLoanEMIs.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "var(--surface2)", borderRadius: "10px", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{l.name} EMI</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{formatAmount(l.amount, currency)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Widget 3: 1-Click Backup ──
function BackupWidget({ onClose, onTriggerBackup, masterKey }: { onClose: () => void, onTriggerBackup: () => void, masterKey: string | null }) {
  // If master key is already present in session, just trigger
  // If not, ask for it.
  
  return (
    <div className="pwa-widget-overlay">
      <div className="pwa-widget-card" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", color: "white", textAlign: "center" }}>
        <button className="pwa-widget-close" onClick={onClose}><X size={20} /></button>
        <Shield size={48} style={{ margin: "0 auto 16px", opacity: 0.9 }} />
        <h2 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>Secure Backup</h2>
        <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "24px", fontSize: "0.95rem" }}>
          Instantly backup your encrypted vault to your device.
        </p>
        
        <button 
          onClick={() => {
            onTriggerBackup();
            setTimeout(onClose, 1000);
          }}
          style={{
            background: "white",
            color: "#4f46e5",
            border: "none",
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            fontSize: "1.1rem",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}
        >
          <Download size={20} />
          {masterKey ? "Download Backup Now" : "Unlock & Backup"}
        </button>
      </div>
    </div>
  );
}
