import { Search, Check, ArrowLeft, Ban, CheckCircle, Calendar, Receipt, CheckSquare, Square, FileText, AlertTriangle, Hourglass, X, Trash } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { FinanceItem, CardExpense, CardBill, ExpenseStatus } from "../types";
import { Currency, formatAmount } from "../lib/currency";
import { saveExpenses, loadExpenses, saveBills, loadBills, saveCashbacks, loadCashbacks, saveItems, loadLoans, loadEmiPayments } from "../lib/storage";
import { generateId } from "../lib/utils";
import ExpenseForm from "./ExpenseForm";
import BillPaymentSheet from "./BillPaymentSheet";

interface Props {
  card: FinanceItem;
  currency: Currency;
  onBack: () => void;
  items: FinanceItem[];
  masterKey: string;
  onItemsChange: (items: FinanceItem[]) => void;
}

type ExpenseFilter = "all" | "unpaid" | "paid" | "in_statement";
type MainTab = "transactions" | "statements";

function getMonthKey(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } catch { return "unknown"; }
}

function getAvailableMonths(expenses: CardExpense[]): string[] {
  const monthSet = new Set<string>();
  expenses.forEach((e) => monthSet.add(getMonthKey(e.date)));
  return [...monthSet].sort((a, b) => b.localeCompare(a));
}

export default function CardDetail({ card, currency, onBack, items, masterKey, onItemsChange }: Props) {
  const [expenses, setExpenses] = useState<CardExpense[]>(() =>
    loadExpenses().filter((e) => e.cardId === card.id)
  );
  const [bills, setBills] = useState<CardBill[]>(() =>
    loadBills().filter((b) => b.cardId === card.id)
  );
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<ExpenseFilter>("all");
  const [mainTab, setMainTab] = useState<MainTab>("transactions");
  const [editingExpense, setEditingExpense] = useState<CardExpense | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedForBill, setSelectedForBill] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [payingBill, setPayingBill] = useState<CardBill | null>(null);
  const [payingExpense, setPayingExpense] = useState<CardExpense | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);

  const bankItems = items.filter((i) => i.type === "bank");

  const allExpenses = loadExpenses();
  const allBills = loadBills();

  const derivedEmis = useMemo(() => {
    const loans = loadLoans().filter((l) => l.cardId === card.id);
    const emiPayments = loadEmiPayments();
    const result: (CardExpense & { isEmi: true })[] = [];
    
    loans.forEach(loan => {
      const emis = emiPayments.filter(p => p.loanId === loan.id);
      emis.forEach(emi => {
        let dStr = new Date().toISOString().split("T")[0];
        try {
          const [monStr, yearStr] = emi.monthLabel.split(" ");
          const mIdx = new Date(Date.parse(monStr + " 1, 2012")).getMonth() + 1;
          const dayStr = String(loan.dueDay || 1).padStart(2, "0");
          dStr = `${yearStr}-${String(mIdx).padStart(2, "0")}-${dayStr}`;
        } catch {}

        result.push({
          id: `emi-${emi.id}`,
          cardId: card.id,
          description: `EMI: ${loan.name} (#${emi.monthIndex})`,
          amount: emi.amount,
          date: emi.paidDate || dStr,
          status: emi.paid ? "paid" : "unpaid",
          cashback: 0,
          createdAt: Date.now(),
          isEmi: true,
        });
      });
    });
    return result;
  }, [card.id]);

  const combinedExpenses = useMemo(() => [...expenses, ...derivedEmis], [expenses, derivedEmis]);
  const availableMonths = useMemo(() => getAvailableMonths(combinedExpenses), [combinedExpenses]);

  // ── Stats (Excluding EMIs to prevent double counting) ──────────
  const totalOutstanding = expenses
    .filter((e) => e.status === "unpaid" || e.status === "bill_generated_unpaid")
    .reduce((s, e) => s + e.amount, 0);

  const totalCashback = expenses.reduce((s, e) => s + e.cashback, 0);
  const totalPaid = expenses
    .filter((e) => e.status === "paid" || e.status === "bill_generated")
    .reduce((s, e) => s + e.amount, 0);

  const unpaidExpenses = expenses.filter((e) => e.status === "unpaid");
  const hasUnpaid = unpaidExpenses.length > 0;

  // ── Filtered list (Including EMIs) ─────────────────────────────
  const filtered = useMemo(() => {
    let sorted = [...combinedExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (selectedMonth !== "all") {
      sorted = sorted.filter((e) => getMonthKey(e.date) === selectedMonth);
    }
    if (filter === "all") return sorted;
    if (filter === "unpaid") return sorted.filter((e) => e.status === "unpaid");
    if (filter === "paid") return sorted.filter((e) => e.status === "paid");
    if (filter === "in_statement") return sorted.filter((e) => e.status === "bill_generated" || e.status === "bill_generated_unpaid");
    return sorted;
  }, [expenses, filter, selectedMonth]);

  const sortedBills = [...bills].sort((a, b) => b.generatedAt - a.generatedAt);

  function persistExpenses(updated: CardExpense[]) {
    const rest = loadExpenses().filter((e) => e.cardId !== card.id);
    saveExpenses([...rest, ...updated]);
    setExpenses(updated);
  }

  function persistBills(updated: CardBill[]) {
    const rest = loadBills().filter((b) => b.cardId !== card.id);
    saveBills([...rest, ...updated]);
    setBills(updated);
  }

  // ── Add Expense ─────────────────────────────────────────────────
  function handleAddExpense(expense: CardExpense) {
    // Auto-add cashback to the Cashback tracker
    if (expense.cashback > 0) {
      const cashbacks = loadCashbacks();
      const existing = cashbacks.find((c) => c.id === `cb-${expense.id}`);
      if (!existing) {
        cashbacks.push({
          id: `cb-${expense.id}`,
          source: card.name,
          amount: expense.cashback,
          date: expense.date,
          note: expense.description,
          createdAt: Date.now(),
        });
        saveCashbacks(cashbacks);
      }
    }
    const updated = [expense, ...expenses];
    persistExpenses(updated);
    setShowForm(false);
  }

  // ── Edit Expense ───────────────────────────────────────────────
  function handleEditExpense(expense: CardExpense) {
    // Update cashback entry
    const cashbacks = loadCashbacks();
    const cbIdx = cashbacks.findIndex((c) => c.id === `cb-${expense.id}`);
    if (expense.cashback > 0) {
      if (cbIdx >= 0) {
        cashbacks[cbIdx] = { ...cashbacks[cbIdx], amount: expense.cashback, date: expense.date, note: expense.description, source: card.name };
      } else {
        cashbacks.push({ id: `cb-${expense.id}`, source: card.name, amount: expense.cashback, date: expense.date, note: expense.description, createdAt: Date.now() });
      }
    } else if (cbIdx >= 0) {
      cashbacks.splice(cbIdx, 1);
    }
    saveCashbacks(cashbacks);

    const updated = expenses.map((e) => e.id === expense.id ? expense : e);
    persistExpenses(updated);
    setEditingExpense(null);
  }

  // ── Mark expense as paid directly ──────────────────────────────
  function markExpensePaid(id: string, bankId: string, bankName: string) {
    const updated = expenses.map((e) =>
      e.id === id ? { ...e, status: "paid" as ExpenseStatus } : e
    );
    persistExpenses(updated);

    // Deduct amount from the bank account balance
    const exp = expenses.find((e) => e.id === id);
    if (exp) {
      const updatedItems = items.map((item) =>
        item.id === bankId
          ? { ...item, balance: item.balance - exp.amount }
          : item
      );
      saveItems(updatedItems);
      onItemsChange(updatedItems);
    }
  }

  // ── Delete expense ─────────────────────────────────────────────
  function deleteExpense(id: string) {
    // Remove associated cashback
    const cashbacks = loadCashbacks().filter((c) => c.id !== `cb-${id}`);
    saveCashbacks(cashbacks);
    const updated = expenses.filter((e) => e.id !== id);
    persistExpenses(updated);
  }

  const isGeneratingRef = useRef(false);

  // ── Generate Statement ─────────────────────────────────────────
  function generateStatement(expenseIds: string[]) {
    if (isGeneratingRef.current) return;
    
    const toBill = expenses.filter((e) => expenseIds.includes(e.id) && e.status === "unpaid");
    if (toBill.length === 0) return;

    isGeneratingRef.current = true;

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 21);

    const bill: CardBill = {
      id: generateId(),
      cardId: card.id,
      month,
      expenseIds: toBill.map((e) => e.id),
      totalAmount: toBill.reduce((s, e) => s + e.amount, 0),
      totalCashback: toBill.reduce((s, e) => s + e.cashback, 0),
      status: "unpaid",
      generatedAt: Date.now(),
      dueDate: dueDate.toISOString().split("T")[0],
    };

    const billExpenseIds = new Set(toBill.map((e) => e.id));
    const updatedExpenses = expenses.map((e) =>
      billExpenseIds.has(e.id)
        ? { ...e, status: "bill_generated_unpaid" as ExpenseStatus, billId: bill.id }
        : e
    );

    persistBills([bill, ...bills]);
    persistExpenses(updatedExpenses);
    setSelectMode(false);
    setSelectedForBill(new Set());
    setMainTab("statements");
    
    // Release lock after state updates
    setTimeout(() => {
      isGeneratingRef.current = false;
    }, 100);
  }

  // ── Delete Statement ───────────────────────────────────────────
  function handleConfirmDelete() {
    if (!deletingBillId) return;
    const id = deletingBillId;
    const bill = bills.find(b => b.id === id);
    if (!bill) {
      setDeletingBillId(null);
      return;
    }

    // Revert expenses to unpaid
    const updatedExpenses = expenses.map(e => {
      if (e.billId === id) {
        const { billId, ...rest } = e;
        return { ...rest, status: "unpaid" as ExpenseStatus };
      }
      return e;
    });

    const updatedBills = bills.filter(b => b.id !== id);
    
    persistExpenses(updatedExpenses);
    persistBills(updatedBills);
    setDeletingBillId(null);
  }

  // ── Pay Statement ──────────────────────────────────────────────
  function payStatement(billId: string, bankId: string, bankName: string) {
    const updatedBills = bills.map((b) =>
      b.id === billId
        ? { ...b, status: "paid" as const, paidAt: Date.now(), paidViaBankId: bankId, paidViaBankName: bankName }
        : b
    );
    const updatedExpenses = expenses.map((e) =>
      e.billId === billId ? { ...e, status: "bill_generated" as ExpenseStatus } : e
    );
    persistBills(updatedBills);
    persistExpenses(updatedExpenses);

    // Deduct amount from the bank account balance
    const bill = bills.find((b) => b.id === billId);
    if (bill) {
      const updatedItems = items.map((item) =>
        item.id === bankId
          ? { ...item, balance: item.balance - bill.totalAmount }
          : item
      );
      saveItems(updatedItems);
      onItemsChange(updatedItems);
    }
  }

  // ── Toggle selection ───────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedForBill((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllUnpaid() {
    setSelectedForBill(new Set(unpaidExpenses.map(e => e.id)));
  }

  // ── Status display ─────────────────────────────────────────────
  function statusInfo(status: ExpenseStatus) {
    switch (status) {
      case "paid": return { label: "Paid", color: "#10b981", bg: "#d1fae5" };
      case "unpaid": return { label: "Unpaid", color: "#f59e0b", bg: "#fef3c7" };
      case "bill_generated_unpaid": return { label: "In Statement", color: "#ef4444", bg: "#fee2e2" };
      case "bill_generated": return { label: "Cleared", color: "#6366f1", bg: "#ede9fe" };
    }
  }

  const selectedTotal = [...selectedForBill].reduce((sum, id) => {
    const exp = expenses.find(e => e.id === id);
    return sum + (exp?.amount || 0);
  }, 0);

  // ── Edit form overlay ─────────────────────────────────────────
  if (editingExpense) {
    return (
      <div className="screen">
        <header className="detail-header">
          <button className="back-btn" onClick={() => setEditingExpense(null)}><ArrowLeft size={16} /> Back</button>
          <div className="detail-header-info">
            <h2 className="detail-title">Edit Expense</h2>
          </div>
        </header>
        <div className="content">
          <ExpenseForm
            cardId={card.id}
            currency={currency}
            onAdd={handleEditExpense}
            onCancel={() => setEditingExpense(null)}
            initialValues={editingExpense}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      {/* Header */}
      <header className="detail-header">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={16} /> Back</button>
        <div className="detail-header-info">
          <h2 className="detail-title">{card.name}</h2>
          {card.lastFour && (
            <span className="detail-subtitle">•••• {card.lastFour}</span>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value outstanding">{formatAmount(totalOutstanding, currency)}</span>
          <span className="stat-label">Outstanding</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value paid-val">{formatAmount(totalPaid, currency)}</span>
          <span className="stat-label">Total Paid</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value cashback-val">+{formatAmount(totalCashback, currency)}</span>
          <span className="stat-label">Cashback</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="main-tabs">
        <button
          className={`main-tab ${mainTab === "transactions" ? "active" : ""}`}
          onClick={() => { setMainTab("transactions"); setSelectMode(false); setSelectedForBill(new Set()); }}
        >
          <Receipt size={14} /> Transactions ({expenses.length})
        </button>
        <button
          className={`main-tab ${mainTab === "statements" ? "active" : ""}`}
          onClick={() => { setMainTab("statements"); setSelectMode(false); setSelectedForBill(new Set()); }}
        >
          <FileText size={14} /> Statements ({bills.length})
        </button>
      </div>

      <div className="content" style={{ paddingBottom: selectMode ? 140 : undefined }}>
        {/* ── TRANSACTIONS TAB ── */}
        {mainTab === "transactions" && (
          <>
            {/* Month Filter */}
            {availableMonths.length > 0 && !showForm && (
              <div className="form-group">
                <label><Calendar size={16} /> Month</label>
                <select className="select-input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                  <option value="all">All Months</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{formatMonth(m)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="expense-actions">
              {!showForm && (() => {
                const limitReached = card.creditLimit !== undefined && card.creditLimit > 0 && totalOutstanding >= card.creditLimit;
                return (
                  <>
                    <button
                      className="btn-primary add-expense-btn"
                      onClick={() => !limitReached && setShowForm(true)}
                      disabled={limitReached}
                      title={limitReached ? "Credit limit reached — pay outstanding dues first" : ""}
                    >
                      {limitReached ? <><Ban size={16} /> Limit Reached</> : "+ Add Expense"}
                    </button>
                    {limitReached && (
                      <p className="limit-reached-hint">Pay your outstanding dues to add more expenses.</p>
                    )}
                  </>
                );
              })()}

              {/* Generate Statement button */}
              {hasUnpaid && !showForm && !selectMode && (
                <button className="btn-outline generate-stmt-btn" onClick={() => { setSelectMode(true); selectAllUnpaid(); }}>
                  <Receipt size={16} /> Generate Statement ({unpaidExpenses.length} unpaid)
                </button>
              )}

              {/* Selection mode hint */}
              {selectMode && (
                <div className="select-mode-hint">
                  <span>Tap expenses to select/deselect for this statement</span>
                  <button className="select-hint-link" onClick={selectAllUnpaid}>Select All</button>
                </div>
              )}
            </div>

            {showForm && (
              <ExpenseForm
                cardId={card.id}
                currency={currency}
                onAdd={handleAddExpense}
                onCancel={() => setShowForm(false)}
                creditLimit={card.creditLimit}
                currentOutstanding={totalOutstanding}
              />
            )}

            {/* Filters */}
            {!showForm && expenses.length > 0 && (
              <div className="filter-chips">
                {(["all", "unpaid", "paid", "in_statement"] as ExpenseFilter[]).map((f) => (
                  <button
                    key={f}
                    className={`filter-chip ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? "All" : f === "unpaid" ? <><Hourglass size={14} /> Unpaid</> : f === "paid" ? <><CheckCircle size={14} /> Paid</> : <><FileText size={14} /> In Statement</>}
                  </button>
                ))}
              </div>
            )}

            {/* Expense List */}
            {filtered.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">{expenses.length === 0 ? <Receipt size={24} /> : <Search size={24} />}</p>
                <p className="empty-text">
                  {expenses.length === 0 ? "No transactions yet" : `No ${filter === "in_statement" ? "statement" : filter} transactions`}
                </p>
                {expenses.length === 0 && (
                  <p className="empty-sub">Tap + Add Expense to track your spending</p>
                )}
              </div>
            ) : (
              <ul className="expense-list">
                {filtered.map((exp: any) => {
                  const si = statusInfo(exp.status);
                  const isSelectable = selectMode && exp.status === "unpaid" && !exp.isEmi;
                  const isSelected = selectedForBill.has(exp.id);
                  return (
                    <li
                      key={exp.id}
                      className={`expense-item ${isSelectable ? "selectable" : ""} ${isSelected ? "selected" : ""} ${exp.isEmi ? "is-emi-row" : ""}`}
                      onClick={isSelectable ? () => toggleSelect(exp.id) : undefined}
                    >
                      <div className="expense-item-top">
                        {isSelectable && (
                          <span className="select-checkbox">{isSelected ? <CheckSquare size={16} /> : <Square size={16} />}</span>
                        )}
                        <div className="expense-item-left">
                          <span className="expense-desc">{exp.description}</span>
                          <span className="expense-date">
                            {formatDate(exp.date)}
                            {exp.dueDate && <> · <span style={{ color: "#ef4444" }}>Due: {formatDate(exp.dueDate)}</span></>}
                          </span>
                        </div>
                        <div className="expense-item-right">
                          <span className="expense-amount">{formatAmount(exp.amount, currency)}</span>
                          {exp.cashback > 0 && (
                            <span className="expense-cashback">+{formatAmount(exp.cashback, currency)} CB</span>
                          )}
                          {exp.isEmi && <span className="expense-cashback" style={{ color: "var(--primary)", borderColor: "var(--primary)", fontWeight: 600 }}>EMI</span>}
                        </div>
                      </div>
                      <div className="expense-item-bottom">
                        <span
                          className="status-badge"
                          style={{ background: si.bg, color: si.color }}
                        >
                          {si.label}
                        </span>
                        {!selectMode && !exp.isEmi && (
                          <div className="expense-item-actions">
                            {exp.status === "unpaid" && (
                              <button
                                className="exp-action-btn pay"
                                onClick={() => setPayingExpense(exp)}
                              >
                                Mark Paid
                              </button>
                            )}
                            <button
                              className="exp-action-btn edit"
                              onClick={() => setEditingExpense(exp)}
                            >
                              Edit
                            </button>
                            <button
                              className="exp-action-btn del"
                              onClick={() => deleteExpense(exp.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                        {!selectMode && exp.isEmi && (
                          <div className="expense-item-actions">
                            <span style={{ fontSize: "0.75rem", color: "var(--text2)" }}>Manage in Loans</span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {/* ── STATEMENTS TAB ── */}
        {mainTab === "statements" && (
          <>
            {bills.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon"><FileText size={24} /></p>
                <p className="empty-text">No statements yet</p>
                <p className="empty-sub">Add unpaid expenses and tap "Generate Statement" to create one</p>
              </div>
            ) : (
              <ul className="statement-list">
                {sortedBills.map((bill) => {
                  const billExpenses = expenses.filter((e) => bill.expenseIds.includes(e.id));
                  const isPaid = bill.status === "paid";
                  return (
                    <li key={bill.id} className={`statement-card ${isPaid ? "paid" : "unpaid"}`}>
                      {/* Statement Header */}
                      <div className="statement-header">
                        <div className="statement-header-left">
                          <span className="statement-month">{formatMonth(bill.month)}</span>
                          <span
                            className="statement-status-badge"
                            style={
                              isPaid
                                ? { background: "#d1fae5", color: "#10b981" }
                                : { background: "#fee2e2", color: "#ef4444" }
                            }
                          >
                            {isPaid ? <><Check size={12} /> Paid</> : <><AlertTriangle size={12} /> Unpaid</>}
                          </span>
                        </div>
                        <span className="statement-total">{formatAmount(bill.totalAmount, currency)}</span>
                      </div>

                      {/* Statement Meta */}
                      <div className="statement-meta">
                        <span className="statement-meta-item">
                          <Receipt size={12} /> {bill.expenseIds.length} transaction{bill.expenseIds.length !== 1 ? "s" : ""}
                        </span>
                        {bill.dueDate && !isPaid && (
                          <span className="statement-meta-item statement-due">
                            <Calendar size={12} /> Due: {formatDate(bill.dueDate)}
                          </span>
                        )}
                        {bill.totalCashback > 0 && (
                          <span className="statement-meta-item statement-cashback">
                            +{formatAmount(bill.totalCashback, currency)} cashback
                          </span>
                        )}
                        {bill.paidAt && (
                          <span className="statement-meta-item">
                            <Check size={12} /> Paid on {new Date(bill.paidAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Inline Expense List — always visible */}
                      <div className="statement-expenses">
                        <div className="statement-expenses-header">Included Transactions</div>
                        <ul className="statement-expense-list">
                          {billExpenses.length > 0 ? billExpenses.map((e) => (
                            <li key={e.id} className="statement-expense-row">
                              <div className="statement-expense-info">
                                <span className="statement-expense-desc">{e.description}</span>
                                <span className="statement-expense-date">{formatDate(e.date)}</span>
                              </div>
                              <span className="statement-expense-amt">{formatAmount(e.amount, currency)}</span>
                            </li>
                          )) : (
                            <li className="statement-expense-row" style={{ opacity: 0.5, justifyContent: "center" }}>
                              <span>Expenses removed</span>
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Actions */}
                      <div className="statement-actions" style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                        {!isPaid && (
                          <button className="btn-primary statement-pay-btn" onClick={() => setPayingBill(bill)} style={{ flex: 1 }}>
                            <CheckCircle size={16} /> Mark Statement Paid
                          </button>
                        )}
                        <button className="btn-outline statement-delete-btn" onClick={() => setDeletingBillId(bill.id)} style={{ flex: isPaid ? 1 : 0, padding: isPaid ? "13px 20px" : "8px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", borderColor: "var(--danger, #ef4444)", color: "var(--danger, #ef4444)" }}>
                          <Trash size={16} /> {isPaid ? "Delete Statement" : ""}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      {/* ── Bill Payment Sheet ── */}
      {(payingBill || payingExpense) && (
        <BillPaymentSheet
          amount={payingBill ? payingBill.totalAmount : (payingExpense?.amount || 0)}
          label={payingBill ? "Statement Amount" : "Expense Amount"}
          card={card}
          bankItems={bankItems}
          currency={currency}
          masterKey={masterKey}
          onConfirm={(bankId, bankName) => {
            if (payingBill) {
              payStatement(payingBill.id, bankId, bankName);
            } else if (payingExpense) {
              markExpensePaid(payingExpense.id, bankId, bankName);
            }
          }}
          onClose={() => {
            setPayingBill(null);
            setPayingExpense(null);
          }}
        />
      )}

      {/* ── Sticky Selection Bar ── */}
      {selectMode && (
        <div className="select-bar">
          <div className="select-bar-info">
            <span className="select-bar-count">{selectedForBill.size} selected</span>
            <span className="select-bar-total">{formatAmount(selectedTotal, currency)}</span>
          </div>
          <div className="select-bar-actions">
            <button
              className="btn-primary select-bar-generate"
              disabled={selectedForBill.size === 0}
              onClick={() => generateStatement([...selectedForBill])}
            >
              <Receipt size={16} /> Generate
            </button>
            <button className="btn-secondary select-bar-cancel" onClick={() => { setSelectMode(false); setSelectedForBill(new Set()); }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {/* ── Delete Statement Modal ── */}
      {deletingBillId && (
        <div className="modal-overlay" onClick={() => setDeletingBillId(null)} style={{ zIndex: 2000 }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="form-title">Delete Statement</h3>
              <button className="modal-close" onClick={() => setDeletingBillId(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: "0 20px 20px" }}>
              <p style={{ margin: "16px 0", color: "var(--text2)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                Are you sure you want to delete this statement? All included expenses will become unpaid again.
              </p>
              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button className="btn-secondary" onClick={() => setDeletingBillId(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleConfirmDelete} style={{ flex: 1, background: "var(--danger, #ef4444)", color: "#fff", border: "none" }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return dateStr; }
}

function formatMonth(monthStr: string): string {
  try {
    const [y, m] = monthStr.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  } catch { return monthStr; }
}
