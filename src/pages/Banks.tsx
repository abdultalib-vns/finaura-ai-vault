import { LayoutDashboard, Building2, CheckCircle, Calendar, ChevronRight, Plus, DollarSign, Coins, TrendingUp, Minus, EyeOff, Eye, ClipboardList, Clock } from "lucide-react";
import React, { useState, useMemo } from "react";
import { FinanceItem, BankExpense } from "../types";
import { Currency, formatAmount, formatCompactAmount } from "../lib/currency";
import { decryptData } from "../lib/crypto";
import { loadBankExpenses, saveBankExpenses, saveItems, loadItems } from "../lib/storage";
import RDDetail from "../components/RDDetail";
import FDDetail from "../components/FDDetail";
import BankExpenseForm from "../components/BankExpenseForm";
import AddItemForm from "../components/AddItemForm";
import SwipeableRow from "../components/SwipeableRow";
import PullToRefresh from "../components/PullToRefresh";

interface Props {
  masterKey: string;
  currency: Currency;
  items: FinanceItem[];
  onItemsChange: (items: FinanceItem[]) => void;
  onReload?: () => void;
}

type SubTab = "overview" | "accounts" | "investments" | "transactions";
type DetailView =
  | { kind: "rd"; item: FinanceItem }
  | { kind: "fd"; item: FinanceItem };

const MASK = "••••••";

export default function Banks({ masterKey, currency, items, onItemsChange, onReload }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [detail, setDetail] = useState<DetailView | null>(null);
  const [editItem, setEditItem] = useState<FinanceItem | null>(null);
  const [showAmounts, setShowAmounts] = useState(false);

  const bankItems = items.filter((i) =>
    i.type === "bank" || i.type === "fd" || i.type === "rd" || i.type === "mf" || i.type === "other"
  );

  function handleBalanceUpdate(id: string, newBalance: number) {
    const updated = items.map((i) => i.id === id ? { ...i, balance: newBalance } : i);
    saveItems(updated);
    onItemsChange(updated);
    if (detail && detail.item.id === id) {
      setDetail({ ...detail, item: { ...detail.item, balance: newBalance } });
    }
  }

  function handleFDInterestUpdate(id: string, totalInterest: number) {
    const updated = items.map((i) => i.id === id ? { ...i, interestInflow: totalInterest } : i);
    saveItems(updated);
    onItemsChange(updated);
    if (detail && detail.item.id === id) {
      setDetail({ ...detail, item: { ...detail.item, interestInflow: totalInterest } });
    }
  }

  function handleAddItem(item: FinanceItem) {
    const updated = [...items, item];
    saveItems(updated);
    onItemsChange(updated);
  }

  function handleEditSave(updated: FinanceItem) {
    const next = items.map((i) => i.id === updated.id ? updated : i);
    saveItems(next);
    onItemsChange(next);
    setEditItem(null);
  }

  function handleDelete(id: string) {
    const next = items.filter((i) => i.id !== id);
    saveItems(next);
    onItemsChange(next);
    if (detail && detail.item.id === id) setDetail(null);
  }

  if (detail?.kind === "rd") {
    return <RDDetail rd={detail.item} currency={currency} onBack={() => setDetail(null)} onBalanceUpdate={handleBalanceUpdate} />;
  }
  if (detail?.kind === "fd") {
    return <FDDetail fd={detail.item} currency={currency} onBack={() => setDetail(null)} onInterestUpdate={handleFDInterestUpdate} />;
  }

  return (
    <div className="screen">
      <header className="page-header">
        <div className="page-header-row">
          <h2 className="header-title">Banks &amp; Investments</h2>
          <button
            type="button"
            className="reveal-toggle"
            onClick={() => setShowAmounts((v) => !v)}
            title={showAmounts ? "Hide amounts" : "Reveal amounts"}
          >
            {showAmounts ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </header>

      <div className="main-tabs">
        <button className={`main-tab ${subTab === "overview" ? "active" : ""}`} onClick={() => setSubTab("overview")}>
          <LayoutDashboard size={20} /> Overview
        </button>
        <button className={`main-tab ${subTab === "accounts" ? "active" : ""}`} onClick={() => setSubTab("accounts")}>
          <Building2 size={20} /> Accounts
        </button>
        <button className={`main-tab ${subTab === "investments" ? "active" : ""}`} onClick={() => setSubTab("investments")}>
          <TrendingUp size={20} /> Invest
        </button>
        <button className={`main-tab ${subTab === "transactions" ? "active" : ""}`} onClick={() => setSubTab("transactions")}>
          <DollarSign size={20} /> Txns
        </button>
      </div>

      {subTab === "overview" && (
        <OverviewTab items={bankItems} currency={currency} showAmounts={showAmounts}
          onSelectFD={(item) => setDetail({ kind: "fd", item })}
          onSelectRD={(item) => setDetail({ kind: "rd", item })} />
      )}

      {subTab === "accounts" && (
        <AccountsTab items={bankItems} masterKey={masterKey} currency={currency}
          onAddItem={handleAddItem} onEdit={setEditItem} onDelete={handleDelete}
          onReload={onReload} showAmounts={showAmounts} />
      )}

      {subTab === "investments" && (
        <InvestmentsTab items={bankItems} currency={currency}
          masterKey={masterKey} onAddItem={handleAddItem}
          onSelectFD={(item) => setDetail({ kind: "fd", item })}
          onSelectRD={(item) => setDetail({ kind: "rd", item })}
          onEdit={setEditItem} onDelete={handleDelete}
          onReload={onReload} showAmounts={showAmounts} />
      )}

      {subTab === "transactions" && (
        <TransactionsTab banks={bankItems} currency={currency} allItems={items}
          onItemsChange={onItemsChange} onReload={onReload} showAmounts={showAmounts} />
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

/* ── OVERVIEW TAB ─────────────────────────────────────────────── */
function OverviewTab({ items, currency, showAmounts, onSelectFD, onSelectRD }: {
  items: FinanceItem[]; currency: Currency; showAmounts: boolean;
  onSelectFD: (i: FinanceItem) => void; onSelectRD: (i: FinanceItem) => void;
}) {
  const banks = items.filter((i) => i.type === "bank");
  const fds = items.filter((i) => i.type === "fd");
  const rds = items.filter((i) => i.type === "rd");
  const mfs = items.filter((i) => i.type === "mf");

  const bankTotal = banks.reduce((s, i) => s + i.balance, 0);
  const fdTotal = fds.reduce((s, i) => s + i.balance, 0);
  const rdTotal = rds.reduce((s, i) => s + i.balance, 0);
  const mfTotal = mfs.reduce((s, i) => s + i.balance, 0);
  const grandTotal = bankTotal + fdTotal + rdTotal + mfTotal;

  // MF gains
  const mfInvested = mfs.reduce((s, i) => s + (i.investedAmount ?? 0), 0);
  const mfGains = mfTotal - mfInvested;

  // Estimated FD interest earned (simple interest based on elapsed time)
  const fdInterestEarned = fds.reduce((sum, fd) => {
    if (!fd.interestRate || !fd.startDate) return sum;
    const start = new Date(fd.startDate + "T00:00:00");
    const elapsed = Math.max(0, (Date.now() - start.getTime()) / (365.25 * 86400000));
    return sum + (fd.balance * (fd.interestRate / 100) * elapsed);
  }, 0);

  // Upcoming maturities (within 90 days)
  const upcomingMaturities = [...fds, ...rds]
    .filter((i) => i.maturityDate)
    .map((i) => {
      const mat = new Date(i.maturityDate! + "T00:00:00");
      const daysLeft = Math.ceil((mat.getTime() - Date.now()) / 86400000);
      return { ...i, daysLeft };
    })
    .filter((i) => i.daysLeft > 0 && i.daysLeft <= 90)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const breakdown = [
    { label: "Bank", value: bankTotal, color: "#3b82f6", icon: <Building2 size={20} /> },
    { label: "FD", value: fdTotal, color: "#f59e0b", icon: <TrendingUp size={16} /> },
    { label: "RD", value: rdTotal, color: "#10b981", icon: <Calendar size={16} /> },
    { label: "MF", value: mfTotal, color: "#06b6d4", icon: <LayoutDashboard size={20} /> },
  ].filter((d) => d.value > 0);

  return (
    <div className="content" style={{ paddingBottom: "80px" }}>
      {/* Net Worth Card */}
      <div className="overview-hero">
        <span className="overview-hero-label"><Coins size={20} /> Total Net Worth</span>
        <span className="overview-hero-amount">{showAmounts ? formatCompactAmount(grandTotal, currency) : MASK}</span>
      </div>

      {/* Quick Stats Grid */}
      <div className="overview-stats-grid">
        <div className="overview-stat-card">
          <span className="overview-stat-icon"><Building2 size={20} /></span>
          <span className="overview-stat-val">{showAmounts ? formatAmount(bankTotal, currency) : MASK}</span>
          <span className="overview-stat-lbl">Bank Balance</span>
          <span className="overview-stat-count">{banks.length} account{banks.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="overview-stat-card">
          <span className="overview-stat-icon"><TrendingUp size={20} /></span>
          <span className="overview-stat-val">{showAmounts ? formatAmount(fdTotal, currency) : MASK}</span>
          <span className="overview-stat-lbl">Fixed Deposits</span>
          <span className="overview-stat-count">{fds.length} FD{fds.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="overview-stat-card">
          <span className="overview-stat-icon"><Calendar size={16} /></span>
          <span className="overview-stat-val">{showAmounts ? formatAmount(rdTotal, currency) : MASK}</span>
          <span className="overview-stat-lbl">Recurring Deposits</span>
          <span className="overview-stat-count">{rds.length} RD{rds.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="overview-stat-card">
          <span className="overview-stat-icon"><LayoutDashboard size={20} /></span>
          <span className="overview-stat-val">{showAmounts ? formatAmount(mfTotal, currency) : MASK}</span>
          <span className="overview-stat-lbl">Mutual Funds</span>
          <span className="overview-stat-count">{mfs.length} fund{mfs.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Interest & Gains */}
      {(fdInterestEarned > 0 || mfGains !== 0) && (
        <div className="overview-gains-section">
          <h3 className="section-title"><LayoutDashboard size={20} /> Returns & Gains</h3>
          {fdInterestEarned > 0 && (
            <div className="gains-row">
              <span><TrendingUp size={16} /> Est. FD Interest Earned</span>
              <span className="gains-val" style={{ color: "#10b981" }}>
                {showAmounts ? `+${formatAmount(fdInterestEarned, currency)}` : MASK}
              </span>
            </div>
          )}
          {mfs.length > 0 && (
            <div className="gains-row">
              <span><LayoutDashboard size={20} /> MF {mfGains >= 0 ? "Gains" : "Loss"}</span>
              <span className="gains-val" style={{ color: mfGains >= 0 ? "#10b981" : "#ef4444" }}>
                {showAmounts ? `${mfGains >= 0 ? "+" : "−"}${formatAmount(Math.abs(mfGains), currency)}` : MASK}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Upcoming Maturities */}
      {upcomingMaturities.length > 0 && (
        <div className="upcoming-section">
          <h3 className="section-title"><Clock size={20} /> Upcoming Maturities</h3>
          {upcomingMaturities.map((item) => (
            <div
              key={item.id}
              className="upcoming-card clickable"
              onClick={() => item.type === "fd" ? onSelectFD(item) : onSelectRD(item)}
            >
              <div className="upcoming-left">
                <span className="upcoming-name">{item.type === "fd" ? <TrendingUp size={16} /> : <Calendar size={16} />} {item.name}</span>
                <span className="upcoming-date">Matures: {fmtDate(item.maturityDate!)}</span>
              </div>
              <div className="upcoming-right">
                <span className={`upcoming-days ${item.daysLeft <= 30 ? "urgent" : ""}`}>
                  {item.daysLeft}d left
                </span>
                <span className="upcoming-amount">{showAmounts ? formatAmount(item.balance, currency) : MASK}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Breakdown Bars */}
      {breakdown.length > 0 && (
        <div className="overview-breakdown">
          <h3 className="section-title"><LayoutDashboard size={20} /> Asset Breakdown</h3>
          {breakdown.map((d) => (
            <div key={d.label} className="asset-bar-row">
              <span className="asset-bar-label">{d.icon} {d.label}</span>
              <div className="asset-bar-track">
                <div className="asset-bar-fill" style={{ width: `${Math.round((d.value / grandTotal) * 100)}%`, background: d.color }} />
              </div>
              <span className="asset-bar-pct">{Math.round((d.value / grandTotal) * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="empty-state">
          <p className="empty-icon"><Building2 size={20} /></p>
          <p className="empty-text">No accounts yet.</p>
          <p className="empty-sub">Switch to Accounts tab to add your first account.</p>
        </div>
      )}
    </div>
  );
}

/* ── ACCOUNTS TAB ─────────────────────────────────────────────── */
function AccountsTab({ items, masterKey, currency, onAddItem, onEdit, onDelete, onReload, showAmounts }: {
  items: FinanceItem[]; masterKey: string; currency: Currency;
  onAddItem: (item: FinanceItem) => void;
  onEdit: (item: FinanceItem) => void; onDelete: (id: string) => void;
  onReload?: () => void; showAmounts: boolean;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const banks = items.filter((i) => i.type === "bank");
  const others = items.filter((i) => i.type === "other");
  const total = banks.reduce((s, i) => s + i.balance, 0);

  return (
    <>
      {banks.length > 0 && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value paid-val">{showAmounts ? formatAmount(total, currency) : MASK}</span>
            <span className="stat-label">Total Bank Balance</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value cashback-val">{banks.length + others.length}</span>
            <span className="stat-label">Accounts</span>
          </div>
        </div>
      )}

      <PullToRefresh onRefresh={onReload ?? (() => {})} className="content">
        <button className="fab-btn" onClick={() => setShowAddForm(true)} aria-label="Add Bank Account" title="Add Bank Account">
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {showAddForm && (
          <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
            <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
              <AddItemForm
                masterKey={masterKey}
                currency={currency}
                onAdd={(item) => { onAddItem(item); setShowAddForm(false); }}
                allowedTypes={["bank", "other"]}
                defaultType="bank"
                buttonLabel="Add Bank Account"
                startOpen
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        )}

        <SimpleSection title="Bank Accounts" icon={<Building2 size={20} />} items={banks}
          masterKey={masterKey} currency={currency} onEdit={onEdit} onDelete={onDelete} showAmounts={showAmounts} />
        <SimpleSection title="Other" icon={<ClipboardList size={16} />} items={others}
          masterKey={masterKey} currency={currency} onEdit={onEdit} onDelete={onDelete} showAmounts={showAmounts} />

        {banks.length === 0 && others.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon"><Building2 size={20} /></p>
            <p className="empty-text">No bank accounts yet.</p>
            <p className="empty-sub">Tap + to add your first account.</p>
          </div>
        )}
      </PullToRefresh>
    </>
  );
}

/* ── INVESTMENTS TAB ──────────────────────────────────────────── */
function InvestmentsTab({ items, currency, masterKey, onAddItem, onSelectFD, onSelectRD, onEdit, onDelete, onReload, showAmounts }: {
  items: FinanceItem[]; currency: Currency; masterKey: string;
  onAddItem: (item: FinanceItem) => void;
  onSelectFD: (i: FinanceItem) => void; onSelectRD: (i: FinanceItem) => void;
  onEdit: (item: FinanceItem) => void; onDelete: (id: string) => void;
  onReload?: () => void; showAmounts: boolean;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const fds = items.filter((i) => i.type === "fd");
  const rds = items.filter((i) => i.type === "rd");
  const mfs = items.filter((i) => i.type === "mf");

  const investTotal = fds.reduce((s, i) => s + i.balance, 0) + rds.reduce((s, i) => s + i.balance, 0) + mfs.reduce((s, i) => s + i.balance, 0);

  return (
    <>
      {(fds.length > 0 || rds.length > 0 || mfs.length > 0) && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value paid-val">{showAmounts ? formatAmount(investTotal, currency) : MASK}</span>
            <span className="stat-label">Total Invested</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value cashback-val">{fds.length + rds.length + mfs.length}</span>
            <span className="stat-label">Investments</span>
          </div>
        </div>
      )}

      <PullToRefresh onRefresh={onReload ?? (() => {})} className="content">
        <button className="fab-btn" onClick={() => setShowAddForm(true)} aria-label="Add Investment" title="Add Investment">
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {showAddForm && (
          <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
            <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
              <AddItemForm
                masterKey={masterKey}
                currency={currency}
                onAdd={(item) => { onAddItem(item); setShowAddForm(false); }}
                allowedTypes={["fd", "rd", "mf"]}
                defaultType="fd"
                buttonLabel="Add Investment"
                startOpen
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        )}

        {fds.length > 0 && (
          <FDSection title="Fixed Deposits" icon={<TrendingUp size={16} />} items={fds}
            currency={currency} onSelect={onSelectFD} onEdit={onEdit} onDelete={onDelete} showAmounts={showAmounts} />
        )}
        {rds.length > 0 && (
          <RDSection title="Recurring Deposits" icon={<Calendar size={16} />} items={rds}
            currency={currency} onSelect={onSelectRD} onEdit={onEdit} onDelete={onDelete} showAmounts={showAmounts} />
        )}
        {mfs.length > 0 && (
          <MFSection title="Mutual Funds" icon={<LayoutDashboard size={20} />} items={mfs}
            currency={currency} onEdit={onEdit} onDelete={onDelete} showAmounts={showAmounts} />
        )}

        {fds.length === 0 && rds.length === 0 && mfs.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon"><TrendingUp size={20} /></p>
            <p className="empty-text">No investments yet.</p>
            <p className="empty-sub">Tap + to add FD, RD, or Mutual Fund.</p>
          </div>
        )}
      </PullToRefresh>
    </>
  );
}

function SimpleSection({ title, icon, items, masterKey, currency, onEdit, onDelete, showAmounts }: { title: React.ReactNode; icon: React.ReactNode; items: FinanceItem[]; masterKey: string; currency: Currency; onEdit: (i: FinanceItem) => void; onDelete: (id: string) => void; showAmounts: boolean }) {
  if (items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.balance, 0);
  return (
    <div className="cards-section">
      <div className="cards-section-header">
        <h3 className="cards-section-title">{icon} {title}</h3>
        <span className="cards-section-total">{showAmounts ? formatAmount(total, currency) : MASK}</span>
      </div>
      {items.map((item) => (
        <SwipeableRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete}>
          <BankRowContent item={item} masterKey={masterKey} currency={currency} showAmounts={showAmounts} />
        </SwipeableRow>
      ))}
    </div>
  );
}

function BankRowContent({ item, masterKey, currency, showAmounts }: {
  item: FinanceItem; masterKey: string; currency: Currency; showAmounts: boolean;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const hasSecret = !!item.encryptedSecret && decryptData(item.encryptedSecret, masterKey) !== "";
  const secretValue = showAmounts && showSecret ? decryptData(item.encryptedSecret, masterKey) : "•••• •••• ••••";

  return (
    <div className="card-row">
      <div className="card-row-left">
        <p className="card-row-name">{item.name}</p>
        {(item.type === "bank" || item.type === "other") && (
          <p className="card-row-secret">{secretValue}</p>
        )}
        {item.type === "mf" && item.investedAmount !== undefined && showAmounts && (
          <p className="card-row-secret">Invested: {formatAmount(item.investedAmount, currency)}</p>
        )}
      </div>
      <div className="card-row-right">
        <p className="card-row-balance">{showAmounts ? formatAmount(item.balance, currency) : MASK}</p>
        {(item.type === "bank" || item.type === "other") && hasSecret && showAmounts && (
          <button
            type="button"
            className="icon-btn sm"
            onClick={(e) => { e.stopPropagation(); setShowSecret((v) => !v); }}
          >
            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function FDSection({ title, icon, items, currency, onSelect, onEdit, onDelete, showAmounts }: { title: string; icon: React.ReactNode; items: FinanceItem[]; currency: Currency; onSelect: (item: FinanceItem) => void; onEdit: (item: FinanceItem) => void; onDelete: (id: string) => void; showAmounts: boolean }) {
  const total = items.reduce((s, i) => s + i.balance, 0);
  return (
    <div className="cards-section">
      <div className="cards-section-header">
        <h3 className="cards-section-title">{icon} {title}</h3>
        <span className="cards-section-total">{showAmounts ? formatAmount(total, currency) : MASK}</span>
      </div>
      {items.map((item) => {
        const maturity = item.maturityDate ? new Date(item.maturityDate + "T00:00:00") : null;
        const daysLeft = maturity ? Math.ceil((maturity.getTime() - Date.now()) / 86400000) : null;
        const isMatured = daysLeft !== null && daysLeft <= 0;
        // Estimated maturity amount (simple interest)
        let estMaturity: number | null = null;
        if (item.interestRate && item.startDate && item.maturityDate) {
          const start = new Date(item.startDate + "T00:00:00");
          const end = new Date(item.maturityDate + "T00:00:00");
          const years = (end.getTime() - start.getTime()) / (365.25 * 86400000);
          estMaturity = item.balance * (1 + (item.interestRate / 100) * years);
        }
        return (
          <SwipeableRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete}>
            <div className="card-row clickable" onClick={() => onSelect(item)}>
              <div className="card-row-left">
                <p className="card-row-name">{item.name}</p>
                <div className="card-row-chips">
                  {item.interestRate !== undefined && (
                    <span className="chip" style={{ background: "#fef3c7", color: "#92400e" }}>{item.interestRate}% p.a.</span>
                  )}
                  {daysLeft !== null && (
                    <span className={`chip ${isMatured ? "chip-free" : "chip-premium"}`}>
                      {isMatured ? <><CheckCircle size={16} /> Matured</> : `${daysLeft}d left`}
                    </span>
                  )}
                </div>
                {estMaturity && showAmounts && (
                  <p className="card-row-secret" style={{ color: "#10b981", fontSize: "0.75rem" }}>
                    Est. maturity: {formatAmount(estMaturity, currency)}
                  </p>
                )}
              </div>
              <div className="card-row-right">
                <p className="card-row-balance">{showAmounts ? formatAmount(item.balance, currency) : MASK}</p>
                <span className="card-row-chevron"><ChevronRight size={16} /></span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
  );
}

function RDSection({ title, icon, items, currency, onSelect, onEdit, onDelete, showAmounts }: { title: string; icon: React.ReactNode; items: FinanceItem[]; currency: Currency; onSelect: (item: FinanceItem) => void; onEdit: (item: FinanceItem) => void; onDelete: (id: string) => void; showAmounts: boolean }) {
  const total = items.reduce((s, i) => s + i.balance, 0);
  return (
    <div className="cards-section">
      <div className="cards-section-header">
        <h3 className="cards-section-title">{icon} {title}</h3>
        <span className="cards-section-total">{showAmounts ? formatAmount(total, currency) : MASK}</span>
      </div>
      {items.map((item) => {
        const maturity = item.maturityDate ? new Date(item.maturityDate + "T00:00:00") : null;
        const start = item.startDate ? new Date(item.startDate + "T00:00:00") : null;
        let progress: number | null = null;
        if (start && maturity) {
          const total = maturity.getTime() - start.getTime();
          const elapsed = Date.now() - start.getTime();
          progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
        }
        return (
          <SwipeableRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete}>
            <div className="card-row clickable" onClick={() => onSelect(item)}>
              <div className="card-row-left">
                <p className="card-row-name">{item.name}</p>
                <div className="card-row-chips">
                  {item.monthlyAmount !== undefined && showAmounts && (
                    <span className="chip" style={{ background: "#ecfdf5", color: "#065f46" }}>
                      {formatAmount(item.monthlyAmount, currency)}/mo
                    </span>
                  )}
                  {item.interestRate !== undefined && (
                    <span className="chip" style={{ background: "#fef3c7", color: "#92400e" }}>{item.interestRate}% p.a.</span>
                  )}
                </div>
                {progress !== null && (
                  <div className="rd-progress-mini">
                    <div className="rd-progress-track">
                      <div className="rd-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="rd-progress-text">{Math.round(progress)}% complete</span>
                  </div>
                )}
              </div>
              <div className="card-row-right">
                <p className="card-row-balance">{showAmounts ? formatAmount(item.balance, currency) : MASK}</p>
                <span className="card-row-chevron"><ChevronRight size={16} /></span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
  );
}

function MFSection({ title, icon, items, currency, onEdit, onDelete, showAmounts }: { title: string; icon: React.ReactNode; items: FinanceItem[]; currency: Currency; onEdit: (item: FinanceItem) => void; onDelete: (id: string) => void; showAmounts: boolean }) {
  const total = items.reduce((s, i) => s + i.balance, 0);
  return (
    <div className="cards-section">
      <div className="cards-section-header">
        <h3 className="cards-section-title">{icon} {title}</h3>
        <span className="cards-section-total">{showAmounts ? formatAmount(total, currency) : MASK}</span>
      </div>
      {items.map((item) => {
        const invested = item.investedAmount ?? 0;
        const gains = item.balance - invested;
        const gainsPercent = invested > 0 ? ((gains / invested) * 100) : 0;
        return (
          <SwipeableRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete}>
            <div className="card-row">
              <div className="card-row-left">
                <p className="card-row-name">{item.name}</p>
                {showAmounts && invested > 0 && (
                  <p className="card-row-secret">Invested: {formatAmount(invested, currency)}</p>
                )}
                {showAmounts && invested > 0 && (
                  <div className="card-row-chips">
                    <span className="chip" style={{
                      background: gains >= 0 ? "#d1fae5" : "#fee2e2",
                      color: gains >= 0 ? "#065f46" : "#991b1b"
                    }}>
                      {gains >= 0 ? "+" : ""}{formatAmount(gains, currency)} ({gainsPercent >= 0 ? "+" : ""}{gainsPercent.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
              <div className="card-row-right">
                <p className="card-row-balance">{showAmounts ? formatAmount(item.balance, currency) : MASK}</p>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
  );
}

/* ── TRANSACTIONS TAB ─────────────────────────────────────────── */
function TransactionsTab({ banks, currency, allItems, onItemsChange, onReload, showAmounts }: {
  banks: FinanceItem[]; currency: Currency;
  allItems: FinanceItem[]; onItemsChange: (items: FinanceItem[]) => void;
  onReload?: () => void; showAmounts: boolean;
}) {
  const [expenses, setExpenses] = useState<BankExpense[]>(() => loadBankExpenses());
  void allItems;
  const [showForm, setShowForm] = useState(false);
  const [filterBankId, setFilterBankId] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "debit" | "credit">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const bankMap = useMemo(() => new Map(banks.map((b) => [b.id, b])), [banks]);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach((e) => {
      if (bankMap.has(e.bankId)) {
        try {
          const d = new Date(e.date + "T00:00:00");
          monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        } catch { /* skip */ }
      }
    });
    return [...monthSet].sort((a, b) => b.localeCompare(a));
  }, [expenses, bankMap]);

  const filtered = useMemo(() => {
    return [...expenses]
      .filter((e) => bankMap.has(e.bankId))
      .filter((e) => filterBankId === "all" ? true : e.bankId === filterBankId)
      .filter((e) => filterType === "all" ? true : e.type === filterType)
      .filter((e) => {
        if (selectedMonth === "all") return true;
        try {
          const d = new Date(e.date + "T00:00:00");
          const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return mk === selectedMonth;
        } catch { return true; }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterBankId, filterType, selectedMonth, bankMap]);

  const totals = useMemo(() => {
    const valid = expenses.filter((e) => bankMap.has(e.bankId));
    return {
      debit: valid.filter((e) => e.type === "debit").reduce((s, e) => s + e.amount, 0),
      credit: valid.filter((e) => e.type === "credit").reduce((s, e) => s + e.amount, 0),
    };
  }, [expenses, bankMap]);

  const currentBankBalance = useMemo(() => {
    if (filterBankId !== "all") {
      const bank = allItems.find(i => i.id === filterBankId);
      return bank ? bank.balance : 0;
    }
    return banks.filter(b => b.type === "bank").reduce((s, b) => s + b.balance, 0);
  }, [filterBankId, allItems, banks]);

  function applyBalanceDelta(bankId: string, delta: number) {
    const current = loadItems();
    const updated = current.map((i) => i.id === bankId ? { ...i, balance: i.balance + delta } : i);
    saveItems(updated);
    onItemsChange(updated);
  }

  function handleAdd(expense: BankExpense) {
    const updated = [expense, ...expenses];
    saveBankExpenses(updated);
    setExpenses(updated);
    const delta = expense.type === "debit" ? -expense.amount : expense.amount;
    applyBalanceDelta(expense.bankId, delta);
    setShowForm(false);
  }

  function handleDeleteExpense(id: string) {
    const expenseToDelete = expenses.find(e => e.id === id);
    if (!expenseToDelete) return;
    
    // Reverse the balance delta
    const reverseDelta = expenseToDelete.type === "debit" ? expenseToDelete.amount : -expenseToDelete.amount;
    applyBalanceDelta(expenseToDelete.bankId, reverseDelta);

    const updated = expenses.filter((e) => e.id !== id);
    saveBankExpenses(updated);
    setExpenses(updated);
  }

  if (banks.length === 0) {
    return (
      <PullToRefresh onRefresh={onReload ?? (() => {})} className="content">
        <div className="empty-state">
          <p className="empty-icon"><Building2 size={20} /></p>
          <p className="empty-text">Add a bank account first</p>
          <p className="empty-sub">Switch to Accounts tab to add accounts.</p>
        </div>
      </PullToRefresh>
    );
  }

  return (
    <>
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value" style={{ color: "#ef4444" }}>{showAmounts ? `−${formatAmount(totals.debit, currency)}` : MASK}</span>
          <span className="stat-label">Debits</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value paid-val">{showAmounts ? `+${formatAmount(totals.credit, currency)}` : MASK}</span>
          <span className="stat-label">Credits</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value" style={{ color: "var(--text)" }}>
            {showAmounts ? formatAmount(currentBankBalance, currency) : MASK}
          </span>
          <span className="stat-label">{filterBankId === "all" ? "Total Balance" : "Bank Balance"}</span>
        </div>
      </div>

      <PullToRefresh onRefresh={onReload ?? (() => {})} className="content">
        {!showForm ? (
          <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>+ Add Bank Transaction</button>
        ) : (
          <BankExpenseForm banks={banks} currency={currency} onAdd={handleAdd} onCancel={() => setShowForm(false)} />
        )}

        {expenses.length > 0 && !showForm && (
          <>
            <div className="form-group">
              <label><Calendar size={16} /> Month</label>
              <select className="select-input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                <option value="all">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{fmtMonth(m)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Filter by Account</label>
              <select className="select-input" value={filterBankId} onChange={(e) => setFilterBankId(e.target.value)}>
                <option value="all">All Accounts</option>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="filter-chips">
              {(["all", "debit", "credit"] as const).map((f) => (
                <button type="button" key={f} className={`filter-chip ${filterType === f ? "active" : ""}`} onClick={() => setFilterType(f)}>
                  {f === "all" ? "All" : f === "debit" ? <><Minus size={16} /> Debit</> : <><Plus size={16} /> Credit</>}
                </button>
              ))}
            </div>
          </>
        )}

        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon"><DollarSign size={20} /></p>
            <p className="empty-text">{expenses.length === 0 ? "No transactions yet" : "No matches"}</p>
            {expenses.length === 0 && <p className="empty-sub">Tap + Add Bank Transaction to start tracking</p>}
          </div>
        ) : (
          <ul className="expense-list">
            {filtered.map((exp) => {
              const bank = bankMap.get(exp.bankId);
              const isDebit = exp.type === "debit";
              return (
                <li key={exp.id} className="expense-item">
                  <div className="expense-item-top">
                    <div className="expense-item-left">
                      <span className="expense-desc">{exp.description}</span>
                      <span className="expense-date">
                        {fmtDate(exp.date)}
                        {bank && <> · <span className="exp-card-tag">{bank.name}</span></>}
                        {exp.category && <> · {exp.category}</>}
                      </span>
                    </div>
                    <div className="expense-item-right">
                      <span className="expense-amount" style={{ color: isDebit ? "#ef4444" : "#10b981" }}>
                        {showAmounts ? `${isDebit ? "−" : "+"}${formatAmount(exp.amount, currency)}` : MASK}
                      </span>
                    </div>
                  </div>
                  <div className="expense-item-bottom">
                    <span className="status-badge" style={isDebit ? { background: "#fee2e2", color: "#991b1b" } : { background: "#d1fae5", color: "#065f46" }}>
                      {isDebit ? "Debit" : "Credit"}
                    </span>
                    <button type="button" className="exp-action-btn del" onClick={() => handleDeleteExpense(exp.id)}>Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PullToRefresh>
    </>
  );
}

function fmtDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function fmtMonth(monthStr: string): string {
  try {
    const [y, m] = monthStr.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  } catch { return monthStr; }
}
