import React, { useState, useMemo, useEffect } from "react";
import { CreditCard, Gift, ArrowRight, CheckCircle, Calendar, ChevronLeft, ChevronRight, AlertTriangle, X, Coins, Receipt, Sparkles, Building2, TrendingUp, RefreshCw, ClipboardList, Gem, Star, EyeOff, Eye, Pin, Hourglass, CheckCircle2, Plus, Calculator } from "lucide-react";
import MiniCalculator from "../components/MiniCalculator";
import { FinanceItem, CardExpense, ExpenseStatus, PaymentApp } from "../types";
import { Currency, formatAmount } from "../lib/currency";
import { loadExpenses, saveExpenses, saveItems, saveCashbacks, loadCashbacks, loadPayAndRecordEnabled } from "../lib/storage";
import CardDetail from "../components/CardDetail";
import ExpenseForm from "../components/ExpenseForm";
import AddItemForm from "../components/AddItemForm";
import SwipeableRow from "../components/SwipeableRow";
import PullToRefresh from "../components/PullToRefresh";
import PayAutoRecordModal from "../components/PayAutoRecordModal";
import { loadCardTemplates, loadAdminConfigFromServer } from "../admin/adminStorage";
import { CardTemplate } from "../admin/adminTypes";

interface Props {
  masterKey: string;
  currency: Currency;
  items: FinanceItem[];
  onItemsChange: (items: FinanceItem[]) => void;
  onReload?: () => void;
  targetCardId?: string | null;
}

type SubTab = "balance" | "expenses" | "newcard";

const MASK = "••••••";



export default function Cards({ masterKey, currency, items, onItemsChange, onReload, targetCardId }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("balance");
  const [selectedCard, setSelectedCard] = useState<FinanceItem | null>(null);
  const [editItem, setEditItem] = useState<FinanceItem | null>(null);
  const [showAmounts, setShowAmounts] = useState(false);
  const [showPaymentApps, setShowPaymentApps] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const payRecordEnabled = loadPayAndRecordEnabled();

  useEffect(() => {
    if (targetCardId) {
      setSubTab("newcard");
    }
  }, [targetCardId]);

  const cardItems = items.filter((i) => i.type === "card" || i.type === "paylater");

  function handleAddCard(item: FinanceItem) {
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
    saveExpenses(loadExpenses().filter((e) => e.cardId !== id));
    onItemsChange(next);
  }

  if (selectedCard) {
    return <CardDetail card={selectedCard} currency={currency} onBack={() => setSelectedCard(null)} items={items} masterKey={masterKey} onItemsChange={onItemsChange} />;
  }

  return (
    <div className="screen">
      <header className="page-header">
        <div className="page-header-row">
          <h2 className="header-title">Cards</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="reveal-toggle"
              onClick={() => setShowCalculator(true)}
              title="Calculator"
              style={{ fontSize: "1.2rem" }}
            >
              <Calculator size={16} />
            </button>
            <button
              type="button"
              className="reveal-toggle"
              onClick={() => setShowCalendar(true)}
              title="Due Dates Calendar"
              style={{ fontSize: "1.2rem" }}
            >
              <Calendar size={16} />
            </button>
            <button
              type="button"
              className="reveal-toggle"
              onClick={() => setShowPaymentApps(true)}
              title="Payment Apps"
              style={{ fontSize: "1.2rem" }}
            >
              <Coins size={20} />
            </button>
            <button
              type="button"
              className="reveal-toggle"
              onClick={() => setShowAmounts((v) => !v)}
              title={showAmounts ? "Hide amounts" : "Reveal amounts"}
            >
              {showAmounts ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </header>

      <div className="main-tabs">
        <button className={`main-tab ${subTab === "balance" ? "active" : ""}`} onClick={() => setSubTab("balance")}>
          <CreditCard size={20} /> Card Balance
        </button>
        <button className={`main-tab ${subTab === "expenses" ? "active" : ""}`} onClick={() => setSubTab("expenses")}>
          <Receipt size={20} /> Card Expenses
        </button>
        <button className={`main-tab ${subTab === "newcard" ? "active" : ""}`} onClick={() => setSubTab("newcard")}>
          <CreditCard size={20} /> Get a Card
        </button>
      </div>

      {subTab === "balance" ? (
        <BalanceView
          items={cardItems}
          currency={currency}
          onSelect={setSelectedCard}
          masterKey={masterKey}
          onAddCard={handleAddCard}
          onEdit={setEditItem}
          onDelete={handleDelete}
          onReload={onReload}
          showAmounts={showAmounts}
          onPayClick={payRecordEnabled ? () => setShowPaymentApps(true) : undefined}
        />
      ) : subTab === "expenses" ? (
        <ExpensesView cards={cardItems} currency={currency} onSelectCard={setSelectedCard} onReload={onReload} showAmounts={showAmounts} />
      ) : (
        <NewCardView targetCardId={targetCardId} />
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

      {/* Payment Apps Popup */}
      {payRecordEnabled && showPaymentApps && (
        <PayAutoRecordModal onClose={() => setShowPaymentApps(false)} />
      )}

      {showCalendar && (
        <CalendarModal cards={cardItems} onClose={() => setShowCalendar(false)} />
      )}

      {showCalculator && (
        <MiniCalculator onClose={() => setShowCalculator(false)} />
      )}
    </div>
  );
}



function BalanceView({ items, currency, onSelect, masterKey, onAddCard, onEdit, onDelete, onReload, showAmounts, onPayClick }: {
  items: FinanceItem[]; currency: Currency; onSelect: (i: FinanceItem) => void;
  masterKey: string; onAddCard: (item: FinanceItem) => void;
  onEdit: (item: FinanceItem) => void; onDelete: (id: string) => void;
  onReload?: () => void; showAmounts: boolean; onPayClick?: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const cards = items.filter((i) => i.type === "card");
  const payLater = items.filter((i) => i.type === "paylater");
  const expenses = loadExpenses();

  const totalLimit = items.reduce((s, i) => s + (i.creditLimit ?? 0), 0);
  const totalOutstanding = items.reduce((sum, c) => {
    const cardExp = expenses.filter((e) => e.cardId === c.id);
    return sum + cardExp
      .filter((e) => e.status === "unpaid" || e.status === "bill_generated_unpaid")
      .reduce((s, e) => s + e.amount, 0);
  }, 0);

  return (
    <>
      {items.length > 0 && (
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value paid-val">{showAmounts ? formatAmount(totalLimit, currency) : MASK}</span>
            <span className="stat-label">Total Limit</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value outstanding">{showAmounts ? formatAmount(totalOutstanding, currency) : MASK}</span>
            <span className="stat-label">Outstanding</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value cashback-val">{items.length}</span>
            <span className="stat-label">Cards</span>
          </div>
        </div>
      )}

      <PullToRefresh onRefresh={onReload ?? (() => {})} className="content">
      {onPayClick && (
        <button className="fab-btn pay-fab-btn" onClick={onPayClick} aria-label="Pay Now" title="Pay Now">
          <Coins size={24} />
        </button>
      )}
      <button className="fab-btn" onClick={() => setShowAddForm(true)} aria-label="Add Card / Pay Later" title="Add Card / Pay Later">
        <Plus size={26} strokeWidth={2.5} />
      </button>

        {showAddForm && (
          <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
            <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
              <AddItemForm
                masterKey={masterKey}
                currency={currency}
                onAdd={(item) => { onAddCard(item); setShowAddForm(false); }}
                allowedTypes={["card", "paylater"]}
                defaultType="card"
                buttonLabel="Add Card / Pay Later"
                startOpen
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        )}

        <CardSection title="Credit / Debit Cards" icon={<CreditCard size={20} />} items={cards}
          currency={currency} expenses={expenses} onSelect={onSelect}
          onEdit={onEdit} onDelete={onDelete} showAmounts={showAmounts} />
        <CardSection title="Pay Later Services" icon={<RefreshCw size={16} />} items={payLater}
          currency={currency} expenses={expenses} onSelect={onSelect}
          onEdit={onEdit} onDelete={onDelete} showAmounts={showAmounts} />

        {items.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon"><CreditCard size={20} /></p>
            <p className="empty-text">No cards yet.</p>
            <p className="empty-sub">Tap + to add your first card.</p>
          </div>
        )}
      </PullToRefresh>
    </>
  );
}

function CardSection({ title, icon, items, currency, expenses, onSelect, onEdit, onDelete, showAmounts }: {
  title: string; icon: React.ReactNode; items: FinanceItem[]; currency: Currency;
  expenses: CardExpense[]; onSelect: (item: FinanceItem) => void;
  onEdit: (item: FinanceItem) => void; onDelete: (id: string) => void;
  showAmounts: boolean;
}) {
  if (items.length === 0) return null;
  const totalLimit = items.reduce((s, i) => s + (i.creditLimit ?? 0), 0);

  return (
    <div className="cards-section">
      <div className="cards-section-header">
        <h3 className="cards-section-title">{icon} {title}</h3>
        {totalLimit > 0 && (
          <span className="cards-section-total">
            Limit: {showAmounts ? formatAmount(totalLimit, currency) : MASK}
          </span>
        )}
      </div>
      {items.map((item) => {
        const cardExp = expenses.filter((e) => e.cardId === item.id);
        const outstanding = cardExp
          .filter((e) => e.status === "unpaid" || e.status === "bill_generated_unpaid")
          .reduce((s, e) => s + e.amount, 0);
        const totalCashback = cardExp.reduce((s, e) => s + e.cashback, 0);
        const limit = item.creditLimit;
        const utilizationPct = limit && limit > 0 ? (outstanding / limit) * 100 : 0;
        const isNearLimit = limit !== undefined && limit > 0 && utilizationPct >= 90;

        return (
          <SwipeableRow key={item.id} item={item} onEdit={onEdit} onDelete={onDelete}>
            <div className={`card-row clickable ${isNearLimit ? "card-row-warn" : ""}`} onClick={() => onSelect(item)}>
              <div className="card-row-left">
                <p className="card-row-name">{item.name}</p>
                <p className="card-row-secret">
                  {showAmounts
                    ? (item.type === "card" && item.lastFour ? `•••• •••• •••• ${item.lastFour}` : "•••• •••• ••••")
                    : "•••• •••• •••• ••••"}
                </p>
                {item.creditLimit !== undefined && showAmounts && (
                  <p className="card-row-secret">Limit: {formatAmount(item.creditLimit, currency)}</p>
                )}
                {isNearLimit && showAmounts && limit !== undefined && (
                  <div className="card-utilization-bar-wrap">
                    <div className="card-utilization-bar">
                      <div
                        className="card-utilization-fill"
                        style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                      />
                      <div className="card-utilization-threshold" />
                    </div>
                    <span className="card-utilization-label">
                      {formatAmount(outstanding, currency)} / {formatAmount(limit, currency)}
                    </span>
                  </div>
                )}
                <div className="card-row-chips">
                  {isNearLimit && (
                    <span className="chip chip-warn"><AlertTriangle size={20} /> {utilizationPct.toFixed(0)}% used</span>
                  )}
                  {showAmounts ? (
                    outstanding > 0 ? (
                      <span className="chip chip-unpaid">Due: {formatAmount(outstanding, currency)}</span>
                    ) : cardExp.length > 0 ? (
                      <span className="chip" style={{ background: "#d1fae5", color: "#065f46" }}>All Clear</span>
                    ) : null
                  ) : (
                    cardExp.length > 0 && (
                      <span className="chip chip-muted">Tap <Eye size={14} style={{display:"inline", verticalAlign:"middle"}}/> to reveal</span>
                    )
                  )}
                  {showAmounts && totalCashback > 0 && (
                    <span className="chip chip-cashback">+{formatAmount(totalCashback, currency)} CB</span>
                  )}
                </div>
              </div>
              <div className="card-row-right">
                <span className="card-row-chevron"><ChevronRight size={16} /></span>
              </div>
            </div>
          </SwipeableRow>
        );
      })}
    </div>
  );
}

function ExpensesView({ cards, currency, onSelectCard, onReload, showAmounts }: {
  cards: FinanceItem[]; currency: Currency; onSelectCard: (c: FinanceItem) => void;
  onReload?: () => void; showAmounts: boolean;
}) {
  const [expenses, setExpenses] = useState<CardExpense[]>(() => loadExpenses());
  const [showForm, setShowForm] = useState(false);
  const [pickerCardId, setPickerCardId] = useState<string>("");
  const [cardChosen, setCardChosen] = useState(false);
  const [filterCardId, setFilterCardId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | ExpenseStatus>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach((e) => {
      if (cardMap.has(e.cardId)) {
        try {
          const d = new Date(e.date + "T00:00:00");
          monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        } catch { /* skip */ }
      }
    });
    return [...monthSet].sort((a, b) => b.localeCompare(a));
  }, [expenses, cardMap]);

  const filtered = useMemo(() => {
    return [...expenses]
      .filter((e) => cardMap.has(e.cardId))
      .filter((e) => filterCardId === "all" ? true : e.cardId === filterCardId)
      .filter((e) => filterStatus === "all" ? true : e.status === filterStatus)
      .filter((e) => {
        if (selectedMonth === "all") return true;
        try {
          const d = new Date(e.date + "T00:00:00");
          const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          return mk === selectedMonth;
        } catch { return true; }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterCardId, filterStatus, selectedMonth, cardMap]);

  const totals = useMemo(() => {
    const cardExp = expenses.filter((e) => cardMap.has(e.cardId));
    return {
      total: cardExp.reduce((s, e) => s + e.amount, 0),
      unpaid: cardExp.filter((e) => e.status === "unpaid" || e.status === "bill_generated_unpaid").reduce((s, e) => s + e.amount, 0),
      cashback: cardExp.reduce((s, e) => s + e.cashback, 0),
    };
  }, [expenses, cardMap]);

  function handleAdd(expense: CardExpense) {
    // Auto-add cashback to Cashback tracker
    if (expense.cashback > 0) {
      const cashbacks = loadCashbacks();
      const card = cardMap.get(expense.cardId);
      cashbacks.push({
        id: `cb-${expense.id}`,
        source: card?.name ?? "Card",
        amount: expense.cashback,
        date: expense.date,
        note: expense.description,
        createdAt: Date.now(),
      });
      saveCashbacks(cashbacks);
    }
    const updated = [expense, ...expenses];
    saveExpenses(updated);
    setExpenses(updated);
    setShowForm(false);
    setCardChosen(false);
    setPickerCardId("");
  }

  function statusInfo(status: ExpenseStatus) {
    switch (status) {
      case "paid": return { label: "Paid", color: "#10b981", bg: "#d1fae5" };
      case "unpaid": return { label: "Unpaid", color: "#f59e0b", bg: "#fef3c7" };
      case "bill_generated_unpaid": return { label: "Bill Due", color: "#ef4444", bg: "#fee2e2" };
      case "bill_generated": return { label: "Billed & Paid", color: "#6366f1", bg: "#ede9fe" };
    }
  }

  if (cards.length === 0) {
    return (
      <PullToRefresh onRefresh={onReload ?? (() => {})} className="content">
        <div className="empty-state">
          <p className="empty-icon"><CreditCard size={20} /></p>
          <p className="empty-text">Add a card first</p>
          <p className="empty-sub">Switch to Card Balance tab to add cards.</p>
        </div>
      </PullToRefresh>
    );
  }

  return (
    <>
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value paid-val">{showAmounts ? formatAmount(totals.total, currency) : MASK}</span>
          <span className="stat-label">Total Spent</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value outstanding">{showAmounts ? formatAmount(totals.unpaid, currency) : MASK}</span>
          <span className="stat-label">Outstanding</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value cashback-val">{showAmounts ? `+${formatAmount(totals.cashback, currency)}` : MASK}</span>
          <span className="stat-label">Cashback</span>
        </div>
      </div>

      <PullToRefresh onRefresh={onReload ?? (() => {})} className="content">
        {/* Step 1: Choose card first */}
        {!showForm && !cardChosen && (
          <button type="button" className="btn-primary" onClick={() => setCardChosen(true)}>+ Add Card Expense</button>
        )}

        {/* Step 2: Card picker shown, user must pick */}
        {cardChosen && !showForm && (
          <div className="expense-form-wrap">
            <h3 className="form-title">Choose a Card</h3>
            <div className="form-group">
              <label>Select Card</label>
              <select className="select-input" value={pickerCardId} onChange={(e) => setPickerCardId(e.target.value)}>
                <option value="">-- Select a card --</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}{c.lastFour ? ` (••${c.lastFour})` : ""}</option>)}
              </select>
            </div>
            {(() => {
              const pickedCard = cardMap.get(pickerCardId);
              const pickedOutstanding = pickerCardId ? expenses
                .filter((e) => e.cardId === pickerCardId && (e.status === "unpaid" || e.status === "bill_generated_unpaid"))
                .reduce((s, e) => s + e.amount, 0) : 0;
              const pickedLimitReached = pickedCard?.creditLimit !== undefined && pickedCard.creditLimit > 0 && pickedOutstanding >= pickedCard.creditLimit;
              return (
                <>
                  {pickedLimitReached && (
                    <p className="limit-reached-hint"><AlertTriangle size={20} /> {pickedCard?.name} has reached its credit limit. Pay dues first.</p>
                  )}
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!pickerCardId || pickedLimitReached}
                      onClick={() => setShowForm(true)}
                    >
                      Continue
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => { setCardChosen(false); setPickerCardId(""); }}>Cancel</button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Step 3: Expense form */}
        {showForm && pickerCardId && (
          <div className="expense-form-wrap">
            <div className="chosen-card-badge">
              <CreditCard size={16} /> {cardMap.get(pickerCardId)?.name ?? "Card"}
              {cardMap.get(pickerCardId)?.lastFour ? ` (••${cardMap.get(pickerCardId)?.lastFour})` : ""}
            </div>
            <ExpenseForm
              cardId={pickerCardId}
              currency={currency}
              onAdd={handleAdd}
              onCancel={() => { setShowForm(false); setCardChosen(false); setPickerCardId(""); }}
              creditLimit={cardMap.get(pickerCardId)?.creditLimit}
              currentOutstanding={expenses
                .filter((e) => e.cardId === pickerCardId && (e.status === "unpaid" || e.status === "bill_generated_unpaid"))
                .reduce((s, e) => s + e.amount, 0)}
            />
          </div>
        )}

        {/* Month & Filters */}
        {expenses.length > 0 && !showForm && !cardChosen && (
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
              <label>Filter by Card</label>
              <select className="select-input" value={filterCardId} onChange={(e) => setFilterCardId(e.target.value)}>
                <option value="all">All Cards</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="filter-chips">
              {(["all", "unpaid", "paid", "bill_generated_unpaid", "bill_generated"] as const).map((f) => (
                <button type="button" key={f} className={`filter-chip ${filterStatus === f ? "active" : ""}`} onClick={() => setFilterStatus(f)}>
                  {f === "all" ? "All" : f === "unpaid" ? <><Hourglass size={16} /> Unpaid</> : f === "paid" ? <><CheckCircle size={20} /> Paid</> : f === "bill_generated_unpaid" ? <><Receipt size={20} /> Bill Due</> : <><CheckCircle2 size={16} /> Billed Paid</>}
                </button>
              ))}
            </div>
          </>
        )}

        {filtered.length === 0 && !showForm && !cardChosen ? (
          <div className="empty-state">
            <p className="empty-icon"><Receipt size={20} /></p>
            <p className="empty-text">{expenses.length === 0 ? "No expenses yet" : "No matches"}</p>
            {expenses.length === 0 && <p className="empty-sub">Tap + Add Card Expense to start tracking</p>}
          </div>
        ) : !showForm && !cardChosen && (
          <ul className="expense-list">
            {filtered.map((exp) => {
              const card = cardMap.get(exp.cardId);
              const si = statusInfo(exp.status);
              return (
                <li key={exp.id} className="expense-item">
                  <div className="expense-item-top">
                    <div className="expense-item-left">
                      <span className="expense-desc">{exp.description}</span>
                      <span className="expense-date">
                        {fmtDate(exp.date)}
                        {exp.dueDate && <> · <span style={{ color: "#ef4444" }}>Due: {fmtDate(exp.dueDate)}</span></>}
                        {card && <> · <span className="exp-card-tag" onClick={() => onSelectCard(card)}>{card.name}</span></>}
                      </span>
                    </div>
                    <div className="expense-item-right">
                      <span className="expense-amount">{showAmounts ? formatAmount(exp.amount, currency) : MASK}</span>
                      {showAmounts && exp.cashback > 0 && <span className="expense-cashback">+{formatAmount(exp.cashback, currency)} CB</span>}
                    </div>
                  </div>
                  <div className="expense-item-bottom">
                    <span className="status-badge" style={{ background: si.bg, color: si.color }}>{si.label}</span>
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

// ── Unified card offer shape used in the detail screen ───────────
interface CardOfferEntry {
  id: string;
  name: string;
  bank: string;
  cardType: string;
  annualFee: string;
  benefits: string;
  minSalary?: string;
  applyUrl?: string;
  imageUrl?: string;
  color: string;
  shortDescription?: string;
  tags?: string;
  awesomeFeatures?: string;
  eligibilityCriteria?: string;
  feesAndCharges?: string;
  importantInformation?: string;
  documentsNeeded?: string;
  stepsToApply?: string;
  featured: boolean;
}

function NewCardView({ targetCardId }: { targetCardId?: string | null }) {
  const [filterType, setFilterType] = useState<"all" | "free" | "paid">("all");
  const [selected, setSelected] = useState<CardOfferEntry | null>(null);
  const [allCards, setAllCards] = useState<CardOfferEntry[]>([]);

  useEffect(() => {
    loadAdminConfigFromServer().finally(() => {
      const templates = loadCardTemplates().filter((t: CardTemplate) => t.active);
      setAllCards(templates.map((t: CardTemplate) => ({
        id: t.id,
        name: t.name,
        bank: t.bank,
        cardType: t.cardType,
        annualFee: t.annualFee,
        benefits: t.benefits,
        minSalary: t.minSalary,
        applyUrl: t.applyUrl,
        imageUrl: t.imageUrl,
        color: t.color,
        shortDescription: t.shortDescription,
        tags: t.tags,
        awesomeFeatures: t.awesomeFeatures,
        eligibilityCriteria: t.eligibilityCriteria,
        feesAndCharges: t.feesAndCharges,
        importantInformation: t.importantInformation,
        documentsNeeded: t.documentsNeeded,
        stepsToApply: t.stepsToApply,
        featured: t.featured,
      })));
    });
  }, []);

  useEffect(() => {
    if (targetCardId && allCards.length > 0) {
      const card = allCards.find(c => c.id === targetCardId);
      if (card) {
        setSelected(card);
      }
    }
  }, [targetCardId, allCards]);

  const featuredCards = allCards.filter((c) => c.featured);
  const filteredCards = allCards.filter((c) => {
    if (filterType === "all") return true;
    if (filterType === "free") return c.annualFee === "Free" || c.annualFee === "free" || c.annualFee === "";
    return c.annualFee !== "Free" && c.annualFee !== "free" && c.annualFee !== "";
  });

  if (selected) {
    return <CardOfferDetail offer={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="content" style={{ paddingBottom: "80px" }}>
      <div className="new-card-hero">
        <span className="new-card-hero-icon" style={{display:'inline-flex', alignItems:'center', justifyContent:'center'}}><CreditCard size={48} strokeWidth={1.5} color="var(--primary)" /></span>
        <h3 className="new-card-hero-title">Get a New Credit Card</h3>
        <p className="new-card-hero-sub">Tap any card to view full details</p>
      </div>

      {/* Featured cards horizontal scroll */}
      {featuredCards.length > 0 && (
        <div className="card-offers-section" style={{ marginBottom: 12 }}>
          <div className="card-offers-header">
            <h3 className="card-offers-title"><Gift size={20} /> Featured Cards</h3>
          </div>
          <div className="card-offers-scroll">
            {featuredCards.map((offer) => (
              <button
                key={offer.id}
                className="card-offer-chip card-offer-chip-btn"
                onClick={() => setSelected(offer)}
              >
                <div className="card-offer-chip-header" style={{ background: offer.color }}>
                  <span className="card-offer-star"><Star size={12} fill="currentColor" /></span>
                  <span className="card-offer-bank">{offer.bank}</span>
                  <span className="card-offer-name">{offer.name}</span>
                </div>
                <div className="card-offer-body">
                  <span className="card-offer-fee">{offer.annualFee === "Free" ? "Free" : `Fee: ${offer.annualFee}`}</span>
                  <p className="card-offer-benefits">{offer.benefits.slice(0, 60)}{offer.benefits.length > 60 ? "…" : ""}</p>
                  <span className="card-offer-tap-hint">Tap for details <ArrowRight size={16} /></span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="filter-chips">
        {(["all", "free", "paid"] as const).map((f) => (
          <button key={f} className={`filter-chip ${filterType === f ? "active" : ""}`} onClick={() => setFilterType(f)}>
            {f === "all" ? "All Cards" : f === "free" ? <><CheckCircle size={16} /> Free</> : <><Gem size={16} /> Premium</>}
          </button>
        ))}
      </div>

      <div className="new-card-list">
        {filteredCards.map((offer) => (
          <div key={offer.id} className="new-card-row" onClick={() => setSelected(offer)}>
            <div className="new-card-row-info">
              <div className="new-card-row-bank">{offer.bank}</div>
              <div className="new-card-row-name">{offer.name}</div>
              <div className="new-card-row-desc">{offer.shortDescription || offer.benefits.slice(0, 60) + "..."}</div>
              {offer.tags && <div className="new-card-row-tag">{offer.tags.split(',')[0].trim()}</div>}
              
              <button 
                className="new-card-row-apply" 
                onClick={(e) => { e.stopPropagation(); if(offer.applyUrl) window.open(offer.applyUrl, "_blank"); }}
              >
                Apply Now
              </button>
            </div>
            <div className="new-card-row-img-wrap">
              {offer.imageUrl && <img src={offer.imageUrl} alt={offer.name} className="new-card-row-img" />}
            </div>
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text3)", fontSize: 14 }}>
          No cards found. Cards can be managed in the Admin Panel.
        </div>
      )}
    </div>
  );
}

const cleanText = (txt: string) => txt.replace(/^[^a-zA-Z0-9(₹$]+/, '').trim();
function CardOfferDetail({ offer, onBack }: { offer: CardOfferEntry; onBack: () => void }) {
  const benefitLines = offer.benefits.split(/[,\n]/).map((b) => b.trim()).filter(Boolean);

  function handleApply() {
    if (offer.applyUrl) window.open(offer.applyUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="card-offer-detail-screen">
      {/* Header */}
      <div className="card-offer-detail-header" style={{ background: offer.color }}>
        <button className="card-offer-detail-back" onClick={onBack} aria-label="Back"><ChevronLeft size={16} /></button>
        <div className="card-offer-detail-header-content">
          <div className="card-offer-detail-bank">{offer.bank}</div>
          <div className="card-offer-detail-name">{offer.name}</div>
          <div className="card-offer-detail-type-badge">
            {offer.cardType?.toUpperCase() ?? "CARD"}
          </div>
        </div>
        {offer.featured && <span className="card-offer-detail-star"><><Star size={12} fill="currentColor" /> Featured</></span>}
      </div>

      {/* Card Image */}
      {offer.imageUrl && (
        <div className="card-offer-detail-image">
          <img src={offer.imageUrl} alt={offer.name} />
        </div>
      )}

      {/* Body */}
      <div className="card-offer-detail-body">
        {offer.awesomeFeatures && (
          <div className="card-offer-detail-section">
            <h3 className="card-offer-detail-section-title">Why is {offer.name} so AWESOME?</h3>
            <ul className="card-offer-detail-list">
              {offer.awesomeFeatures.split('\n').filter(Boolean).map((b, i) => (
                <li key={i}>{cleanText(b)}</li>
              ))}
            </ul>
          </div>
        )}

        {offer.eligibilityCriteria && (
          <div className="card-offer-detail-section">
            <h3 className="card-offer-detail-section-title">Eligibility Criteria</h3>
            <ul className="card-offer-detail-list">
              {offer.eligibilityCriteria.split('\n').filter(Boolean).map((b, i) => (
                <li key={i}>{cleanText(b)}</li>
              ))}
            </ul>
          </div>
        )}

        {offer.feesAndCharges && (
          <div className="card-offer-detail-section">
            <h3 className="card-offer-detail-section-title">Fees & Charges</h3>
            <ul className="card-offer-detail-list">
              {offer.feesAndCharges.split('\n').filter(Boolean).map((b, i) => (
                <li key={i}>{cleanText(b)}</li>
              ))}
            </ul>
          </div>
        )}

        {offer.importantInformation && (
          <div className="card-offer-detail-section">
            <h3 className="card-offer-detail-section-title">Important Information</h3>
            <ul className="card-offer-detail-list">
              {offer.importantInformation.split('\n').filter(Boolean).map((b, i) => (
                <li key={i}>{cleanText(b)}</li>
              ))}
            </ul>
          </div>
        )}

        {offer.documentsNeeded && (
          <div className="card-offer-detail-section">
            <h3 className="card-offer-detail-section-title">Documents Needed</h3>
            <ul className="card-offer-detail-list">
              {offer.documentsNeeded.split('\n').filter(Boolean).map((b, i) => (
                <li key={i}>{cleanText(b)}</li>
              ))}
            </ul>
          </div>
        )}

        {offer.stepsToApply && (
          <div className="card-offer-detail-section">
            <h3 className="card-offer-detail-section-title">Steps to Apply</h3>
            <ul className="card-offer-detail-list">
              {offer.stepsToApply.split('\n').filter(Boolean).map((b, i) => (
                <li key={i}>{cleanText(b)}</li>
              ))}
            </ul>
          </div>
        )}

        {!offer.awesomeFeatures && (
          <div className="card-offer-detail-section">
            <h3 className="card-offer-detail-section-title"><Sparkles size={16} /> Benefits & Features</h3>
            <ul className="card-offer-benefits-list">
              {benefitLines.map((b, i) => (
                <li key={i} className="card-offer-benefit-item">
                  <span className="card-offer-benefit-dot" style={{ background: offer.color }} />
                  <span>{cleanText(b)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Sticky Apply button */}
      <div className="card-offer-detail-footer">
        {offer.applyUrl ? (
          <button
            className="card-offer-detail-apply-btn"
            style={{ background: offer.color }}
            onClick={handleApply}
          >
            Apply Now <ArrowRight size={16} />
          </button>
        ) : (
          <button className="card-offer-detail-apply-btn card-offer-detail-apply-disabled" disabled>
            Apply at Bank Branch
          </button>
        )}
      </div>
    </div>
  );
}

function CalendarModal({ cards, onClose }: { cards: FinanceItem[]; onClose: () => void }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();

  // Find unpaid expenses that have a due date in this month/year
  const dueExpenses = loadExpenses().filter(e => {
    if (!e.dueDate) return false;
    if (e.status !== "unpaid" && e.status !== "bill_generated_unpaid") return false;
    
    // Check if the due date matches the selected month/year
    const expDate = new Date(e.dueDate);
    return expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear;
  });

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: "center" }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "400px", width: "90%", padding: "20px", background: "var(--surface)", borderRadius: "16px", border: "1px solid var(--border)" }}>
        <div className="modal-header">
          <h3 className="modal-title"><Calendar size={16} /> Card Dues Calendar</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <button className="btn-outline" style={{ padding: "4px 8px" }} onClick={() => {
            if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
            else { setSelectedMonth(m => m - 1); }
          }}>◀</button>
          <strong style={{ fontSize: "1.1rem" }}>{new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
          <button className="btn-outline" style={{ padding: "4px 8px" }} onClick={() => {
            if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
            else { setSelectedMonth(m => m + 1); }
          }}>▶</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center", marginBottom: "8px" }}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} style={{ fontSize: "0.75rem", color: "var(--text3)", fontWeight: 600 }}>{day}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dueToday = dueExpenses.filter(e => {
              const expDate = new Date(e.dueDate!);
              return expDate.getDate() === day;
            });

            return (
              <div key={day} style={{
                position: "relative",
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: dueToday.length > 0 ? "rgba(99, 102, 241, 0.15)" : "var(--bg)",
                border: dueToday.length > 0 ? "1px solid var(--primary)" : "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: dueToday.length > 0 ? "bold" : "normal",
                color: dueToday.length > 0 ? "var(--primary)" : "var(--text)"
              }}>
                {day}
                {dueToday.length > 0 && (
                  <div style={{ display: "flex", gap: "2px", position: "absolute", bottom: "4px" }}>
                    {dueToday.map((e, j) => (
                      <div key={j} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--primary)" }} title={cards.find(c => c.id === e.cardId)?.name || "Card"} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
          <h4 style={{ fontSize: "0.9rem", color: "var(--text2)", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>Dues this month</h4>
          {dueExpenses.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--text3)" }}>No pending dues for this month.</p>
          ) : (
            dueExpenses.map(e => {
              const card = cards.find(c => c.id === e.cardId);
              const expDate = new Date(e.dueDate!);
              const suffix = ['11','12','13'].includes(expDate.getDate().toString()) ? 'th' : expDate.getDate().toString().endsWith('1') ? 'st' : expDate.getDate().toString().endsWith('2') ? 'nd' : expDate.getDate().toString().endsWith('3') ? 'rd' : 'th';
              
              return (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", padding: "6px 8px", background: "var(--bg)", borderRadius: "6px" }}>
                  <span>{card ? card.name : "Unknown Card"} <span style={{ opacity: 0.6 }}>({e.description})</span></span>
                  <strong style={{ color: "var(--primary)" }}>Due on {expDate.getDate()}{suffix}</strong>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
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
