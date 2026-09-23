import { useState } from "react";
import { Landmark, CreditCard, Plus, ChevronDown, ChevronUp, Check, X, Trash2, Edit3, Calculator, Calendar, Percent, FileText, Building2 } from "lucide-react";
import { LoanEntry, EmiPayment, TaxEntry, Currency, FinanceItem } from "../types";
import { formatAmount } from "../lib/currency";
import { loadLoans, saveLoans, loadEmiPayments, saveEmiPayments, getEmiPaymentsForLoan } from "../lib/storage";
import { generateId } from "../lib/utils";

interface Props {
  currency: Currency;
  items: FinanceItem[];
}

type LoanTab = "loan" | "credit_card";

// Currency-based tax suggestions
function getDefaultTaxes(currencyCode: string): TaxEntry[] {
  switch (currencyCode) {
    case "INR":
      return [
        { name: "CGST", percentage: 9 },
        { name: "SGST", percentage: 9 },
      ];
    case "GBP":
      return [{ name: "VAT", percentage: 20 }];
    case "AUD":
      return [{ name: "GST", percentage: 10 }];
    case "SGD":
      return [{ name: "GST", percentage: 9 }];
    case "CAD":
      return [{ name: "GST", percentage: 5 }];
    case "EUR":
      return [{ name: "VAT", percentage: 19 }];
    default:
      return [];
  }
}

function computeEmiSchedule(loan: LoanEntry): { monthLabel: string; monthIndex: number }[] {
  const [y, m] = loan.startDate.split("-").map(Number);
  const schedule: { monthLabel: string; monthIndex: number }[] = [];
  for (let i = 0; i < loan.tenureMonths; i++) {
    const d = new Date(y, m - 1 + i, 1);
    const label = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    schedule.push({ monthLabel: label, monthIndex: i + 1 });
  }
  return schedule;
}

function calculateTotalInterest(principal: number, annualRate: number, months: number): number {
  if (annualRate <= 0 || months <= 0) return 0;
  const r = annualRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return emi * months - principal;
}

function calculateStandardEmi(principal: number, annualRate: number, months: number): number {
  if (months <= 0) return 0;
  if (annualRate <= 0) return principal / months;
  const r = annualRate / 12 / 100;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export default function Loans({ currency, items }: Props) {
  const [activeTab, setActiveTab] = useState<LoanTab>("loan");
  const [loans, setLoans] = useState<LoanEntry[]>(() => loadLoans());
  const [emiPayments, setEmiPayments] = useState<EmiPayment[]>(() => loadEmiPayments());
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  const [editingLoan, setEditingLoan] = useState<LoanEntry | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formLender, setFormLender] = useState("");
  const [formPrincipal, setFormPrincipal] = useState("");
  const [formTenure, setFormTenure] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formEmi, setFormEmi] = useState("");
  const [formStartDate, setFormStartDate] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const [formTaxes, setFormTaxes] = useState<TaxEntry[]>([]);
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");

  const filtered = loans.filter(l => l.type === activeTab);

  // Summary stats
  const totalPrincipal = filtered.reduce((s, l) => s + l.principalAmount, 0);
  const totalPayable = filtered.reduce((s, l) => s + l.totalPayable, 0);
  const paidEmis = filtered.reduce((s, l) => {
    const payments = emiPayments.filter(p => p.loanId === l.id && p.paid);
    return s + payments.reduce((sum, p) => sum + p.amount, 0);
  }, 0);
  const remainingPayable = totalPayable - paidEmis;

  function persistLoans(updated: LoanEntry[]) {
    saveLoans(updated);
    setLoans(updated);
  }

  function persistEmiPayments(updated: EmiPayment[]) {
    saveEmiPayments(updated);
    setEmiPayments(updated);
  }

  function resetForm() {
    setFormName("");
    setFormLender("");
    setFormPrincipal("");
    setFormTenure("");
    setFormRate("");
    setFormEmi("");
    setFormStartDate(() => {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
    });
    setFormTaxes([]);
    setFormNotes("");
    setFormError("");
    setEditingLoan(null);
  }

  function openAddForm() {
    resetForm();
    setFormTaxes(getDefaultTaxes(currency.code));
    setShowAddForm(true);
  }

  function openEditForm(loan: LoanEntry) {
    setEditingLoan(loan);
    setFormName(loan.name);
    setFormLender(loan.lender);
    setFormPrincipal(String(loan.principalAmount));
    setFormTenure(String(loan.tenureMonths));
    setFormRate(String(loan.interestRate));
    setFormEmi(String(loan.monthlyEmi));
    setFormStartDate(loan.startDate);
    setFormTaxes([...loan.taxes]);
    setFormNotes(loan.notes || "");
    setFormError("");
    setShowAddForm(true);
  }

  function handleAutoCalcEmi() {
    const p = parseFloat(formPrincipal);
    const r = parseFloat(formRate);
    const m = parseInt(formTenure);
    if (isNaN(p) || isNaN(m) || m <= 0) return;
    const emi = calculateStandardEmi(p, isNaN(r) ? 0 : r, m);
    setFormEmi(emi.toFixed(2));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) { setFormError("Loan name is required."); return; }
    if (!formLender.trim()) { setFormError("Lender / Bank is required."); return; }
    const principal = parseFloat(formPrincipal);
    if (isNaN(principal) || principal <= 0) { setFormError("Enter a valid principal amount."); return; }
    const tenure = parseInt(formTenure);
    if (isNaN(tenure) || tenure <= 0) { setFormError("Enter valid tenure in months."); return; }
    const rate = parseFloat(formRate);
    if (isNaN(rate) || rate < 0) { setFormError("Enter a valid interest rate."); return; }
    
    let emi = parseFloat(formEmi);
    if (isNaN(emi) || emi <= 0) {
      emi = calculateStandardEmi(principal, isNaN(rate) ? 0 : rate, tenure);
      if (isNaN(emi) || emi <= 0) {
        setFormError("Enter a valid monthly EMI."); return;
      }
    }

    const totalInterest = calculateTotalInterest(principal, rate, tenure);
    const taxAmount = formTaxes.reduce((s, t) => s + (totalInterest * t.percentage / 100), 0);
    const totalPayable = principal + totalInterest + taxAmount;
    
    let cardId: string | undefined;
    if (activeTab === "credit_card") {
      const matchedCard = items.find(i => i.name === formLender.trim() && (i.type === "card" || i.type === "paylater"));
      if (matchedCard) cardId = matchedCard.id;
    }

    if (editingLoan) {
      // Update existing
      const updated = loans.map(l => l.id === editingLoan.id ? {
        ...l,
        name: formName.trim(),
        lender: formLender.trim(),
        principalAmount: principal,
        tenureMonths: tenure,
        interestRate: rate,
        monthlyEmi: emi,
        taxes: formTaxes.filter(t => t.name.trim()),
        totalPayable,
        startDate: formStartDate,
        notes: formNotes.trim() || undefined,
        cardId,
      } : l);
      persistLoans(updated);
    } else {
      // Create new
      const loan: LoanEntry = {
        id: generateId(),
        type: activeTab,
        name: formName.trim(),
        lender: formLender.trim(),
        principalAmount: principal,
        tenureMonths: tenure,
        interestRate: rate,
        monthlyEmi: emi,
        taxes: formTaxes.filter(t => t.name.trim()),
        totalPayable,
        startDate: formStartDate,
        notes: formNotes.trim() || undefined,
        createdAt: Date.now(),
        cardId,
      };
      persistLoans([loan, ...loans]);

      // Auto-generate EMI schedule
      const schedule = computeEmiSchedule(loan);
      const newPayments: EmiPayment[] = schedule.map(s => ({
        id: generateId(),
        loanId: loan.id,
        monthIndex: s.monthIndex,
        monthLabel: s.monthLabel,
        amount: emi,
        paid: false,
      }));
      persistEmiPayments([...emiPayments, ...newPayments]);
    }

    resetForm();
    setShowAddForm(false);
  }

  function deleteLoan(id: string) {
    persistLoans(loans.filter(l => l.id !== id));
    persistEmiPayments(emiPayments.filter(p => p.loanId !== id));
    if (expandedLoan === id) setExpandedLoan(null);
  }

  function toggleEmiPaid(paymentId: string) {
    const updated = emiPayments.map(p =>
      p.id === paymentId ? { ...p, paid: !p.paid, paidDate: !p.paid ? new Date().toISOString().split("T")[0] : undefined } : p
    );
    persistEmiPayments(updated);
  }

  function updateEmiAmount(paymentId: string, amount: number) {
    const updated = emiPayments.map(p =>
      p.id === paymentId ? { ...p, amount } : p
    );
    persistEmiPayments(updated);
  }

  function updateEmiNote(paymentId: string, note: string) {
    const updated = emiPayments.map(p =>
      p.id === paymentId ? { ...p, note: note || undefined } : p
    );
    persistEmiPayments(updated);
  }

  function addTaxRow() {
    setFormTaxes([...formTaxes, { name: "", percentage: 0 }]);
  }

  function updateTax(index: number, field: "name" | "percentage", value: string) {
    const updated = [...formTaxes];
    if (field === "name") updated[index] = { ...updated[index], name: value };
    else updated[index] = { ...updated[index], percentage: parseFloat(value) || 0 };
    setFormTaxes(updated);
  }

  function removeTax(index: number) {
    setFormTaxes(formTaxes.filter((_, i) => i !== index));
  }

  // Compute live preview
  const previewPrincipal = parseFloat(formPrincipal) || 0;
  const previewRate = parseFloat(formRate) || 0;
  const previewTenure = parseInt(formTenure) || 0;
  const previewInterest = calculateTotalInterest(previewPrincipal, previewRate, previewTenure);
  const previewTaxAmt = formTaxes.reduce((s, t) => s + (previewInterest * t.percentage / 100), 0);
  const previewTotal = previewPrincipal + previewInterest + previewTaxAmt;

  return (
    <div className="screen">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h2 className="header-title"><Landmark size={20} /> Loans & EMIs</h2>
            <span className="desktop-header-subtitle">Track Loan Repayments & EMI Schedules</span>
          </div>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="loans-tab-bar">
        <button
          type="button"
          className={`loans-tab-btn ${activeTab === "loan" ? "active" : ""}`}
          onClick={() => { setActiveTab("loan"); setShowAddForm(false); }}
        >
          <Landmark size={16} /> EMIs on Loans
        </button>
        <button
          type="button"
          className={`loans-tab-btn ${activeTab === "credit_card" ? "active" : ""}`}
          onClick={() => { setActiveTab("credit_card"); setShowAddForm(false); }}
        >
          <CreditCard size={16} /> EMIs on Credit Card
        </button>
      </div>

      {/* KPI Summary */}
      <div className="loans-kpi-grid desktop-kpi-grid">
        <div className="summary-card blue desktop-kpi-card">
          <div className="desktop-kpi-header">
            <span className="summary-lbl">Total Principal</span>
            <span className="desktop-kpi-trend neutral">All {activeTab === "loan" ? "Loans" : "Card EMIs"}</span>
          </div>
          <span className="summary-val tabular-nums">{formatAmount(totalPrincipal, currency)}</span>
        </div>

        <div className="summary-card red desktop-kpi-card">
          <div className="desktop-kpi-header">
            <span className="summary-lbl">Total Payable</span>
            <span className="desktop-kpi-trend negative">With Interest</span>
          </div>
          <span className="summary-val tabular-nums">{formatAmount(totalPayable, currency)}</span>
        </div>

        <div className="summary-card green desktop-kpi-card">
          <div className="desktop-kpi-header">
            <span className="summary-lbl">Paid So Far</span>
            <span className="desktop-kpi-trend positive">Completed</span>
          </div>
          <span className="summary-val tabular-nums">{formatAmount(paidEmis, currency)}</span>
        </div>

        <div className="summary-card slate desktop-kpi-card">
          <div className="desktop-kpi-header">
            <span className="summary-lbl">Remaining</span>
            <span className="desktop-kpi-trend neutral">Balance</span>
          </div>
          <span className="summary-val tabular-nums">{formatAmount(Math.max(0, remainingPayable), currency)}</span>
        </div>
      </div>

      <div className="content">
        {/* Add button */}
        <div className="section-header desktop-action-header">
          <h3 className="section-title">{activeTab === "loan" ? "Your Loans" : "Credit Card EMIs"}</h3>
          {!showAddForm && (
            <button type="button" className="btn-primary desktop-header-btn" onClick={openAddForm}>
              <Plus size={16} /> Add {activeTab === "loan" ? "Loan" : "Card EMI"}
            </button>
          )}
        </div>

        {/* Add / Edit Form */}
        {showAddForm && (
          <form className="expense-form desktop-card" onSubmit={handleSubmit}>
            <h3 className="form-title">{editingLoan ? "Edit" : "Add"} {activeTab === "loan" ? "Loan" : "Credit Card EMI"}</h3>
            {formError && <p className="form-error">{formError}</p>}

            <div className="form-row">
              <div className="form-group flex-1">
                <label><FileText size={14} /> {activeTab === "loan" ? "Loan Name" : "EMI Description"}</label>
                <input type="text" placeholder={activeTab === "loan" ? "e.g. Home Loan, Car Loan" : "e.g. iPhone 16, Laptop EMI"}
                  value={formName} onChange={e => setFormName(e.target.value)} autoFocus />
              </div>
              <div className="form-group flex-1">
                <label><Building2 size={14} /> {activeTab === "loan" ? "Lender / Bank" : "Card Name"}</label>
                {activeTab === "loan" ? (
                  <input type="text" placeholder="e.g. SBI, HDFC Bank"
                    value={formLender} onChange={e => setFormLender(e.target.value)} />
                ) : (
                  <select value={formLender} onChange={e => setFormLender(e.target.value)}>
                    <option value="" disabled>Select a saved card</option>
                    {items.filter(i => i.type === "card" || i.type === "paylater").map(c => (
                      <option key={c.id} value={c.name}>{c.name} {c.lastFour ? `(•• ${c.lastFour})` : ""}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>Principal Amount ({currency.code})</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  value={formPrincipal} onChange={e => setFormPrincipal(e.target.value)} />
              </div>
              <div className="form-group flex-1">
                <label><Calendar size={14} /> Tenure (Months)</label>
                <input type="number" min="1" step="1" placeholder="e.g. 12, 24, 36"
                  value={formTenure} onChange={e => setFormTenure(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label><Percent size={14} /> Annual Interest Rate (%)</label>
                <input type="number" step="0.01" min="0" placeholder="e.g. 8.5"
                  value={formRate} onChange={e => setFormRate(e.target.value)} />
              </div>
              <div className="form-group flex-1">
                <label><Calendar size={14} /> Start Month</label>
                <input type="month" value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
              </div>
            </div>

            {/* Taxes */}
            <div className="form-group">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Taxes on Interest <span className="label-badge">Optional</span></span>
                <button type="button" className="btn-link" onClick={addTaxRow} style={{ fontSize: "0.8rem" }}>+ Add Tax</button>
              </label>
              {formTaxes.length > 0 && (
                <div className="loan-tax-rows">
                  {formTaxes.map((tax, i) => (
                    <div key={i} className="loan-tax-row">
                      <input type="text" placeholder="Tax name (e.g. CGST)" value={tax.name}
                        onChange={e => updateTax(i, "name", e.target.value)} className="loan-tax-name" />
                      <input type="number" step="0.01" min="0" placeholder="%" value={tax.percentage || ""}
                        onChange={e => updateTax(i, "percentage", e.target.value)} className="loan-tax-pct" />
                      <button type="button" className="loan-tax-del" onClick={() => removeTax(i)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly EMI with auto-calc */}
            <div className="form-group">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Monthly EMI ({currency.code})</span>
                <button type="button" className="btn-link" onClick={handleAutoCalcEmi} style={{ fontSize: "0.8rem" }}>
                  <Calculator size={12} /> Auto Calculate
                </button>
              </label>
              <input type="number" step="0.01" min="0" placeholder="0.00"
                value={formEmi} onChange={e => setFormEmi(e.target.value)} />
            </div>

            {/* Live Preview */}
            {previewPrincipal > 0 && previewTenure > 0 && (
              <div className="loan-preview">
                <div className="loan-preview-row">
                  <span>Principal</span>
                  <span className="tabular-nums">{formatAmount(previewPrincipal, currency)}</span>
                </div>
                <div className="loan-preview-row">
                  <span>Total Interest</span>
                  <span className="tabular-nums">{formatAmount(previewInterest, currency)}</span>
                </div>
                {formTaxes.filter(t => t.percentage > 0).map((t, i) => (
                  <div key={i} className="loan-preview-row">
                    <span>{t.name} ({t.percentage}%)</span>
                    <span className="tabular-nums">{formatAmount(previewInterest * t.percentage / 100, currency)}</span>
                  </div>
                ))}
                <div className="loan-preview-row loan-preview-total">
                  <span>Total Payable</span>
                  <span className="tabular-nums">{formatAmount(previewTotal, currency)}</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Notes <span className="label-badge">Optional</span></label>
              <input type="text" placeholder="e.g. Processing fee waived"
                value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">{editingLoan ? "Update" : "Save"} {activeTab === "loan" ? "Loan" : "Card EMI"}</button>
              <button type="button" className="btn-secondary" onClick={() => { setShowAddForm(false); resetForm(); }}>Cancel</button>
            </div>
          </form>
        )}

        {/* Loan Cards */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">{activeTab === "loan" ? <Landmark size={20} /> : <CreditCard size={20} />}</p>
            <p className="empty-text">No {activeTab === "loan" ? "loans" : "credit card EMIs"} added yet.</p>
            <p className="empty-sub">Tap the button above to start tracking your {activeTab === "loan" ? "loan repayments" : "card EMI payments"}.</p>
          </div>
        ) : (
          <ul className="expense-list">
            {filtered.map(loan => {
              const payments = emiPayments.filter(p => p.loanId === loan.id).sort((a, b) => a.monthIndex - b.monthIndex);
              const paidCount = payments.filter(p => p.paid).length;
              const paidAmount = payments.filter(p => p.paid).reduce((s, p) => s + p.amount, 0);
              const isExpanded = expandedLoan === loan.id;
              const progress = loan.tenureMonths > 0 ? Math.round((paidCount / loan.tenureMonths) * 100) : 0;

              return (
                <li key={loan.id} className="loan-card desktop-card">
                  {/* Loan Header */}
                  <div className="loan-card-header" onClick={() => setExpandedLoan(isExpanded ? null : loan.id)}>
                    <div className="loan-card-info">
                      <div className="loan-card-icon" style={{ background: activeTab === "loan" ? "var(--primary-light)" : "#f3e8ff", color: activeTab === "loan" ? "var(--primary)" : "#8b5cf6" }}>
                        {activeTab === "loan" ? <Landmark size={18} /> : <CreditCard size={18} />}
                      </div>
                      <div className="loan-card-text">
                        <span className="loan-card-name">{loan.name}</span>
                        <div className="loan-card-meta">
                          <span className="loan-meta-chip lender">{loan.lender}</span>
                          <span className="loan-meta-chip terms">{loan.tenureMonths} mos @ {loan.interestRate}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="loan-card-right">
                      <div className="loan-card-amount-block">
                        <span className="loan-card-amount-lbl">Monthly EMI</span>
                        <span className="loan-card-amount tabular-nums">{formatAmount(loan.monthlyEmi, currency)}<span className="loan-card-per">/mo</span></span>
                      </div>
                      <div className="loan-card-expand-icon">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="loan-progress-wrap">
                    <div className="loan-progress-bar">
                      <div className="loan-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="loan-progress-info">
                      <div className="loan-progress-stat left">
                        <span className="loan-stat-title">EMIs Paid</span>
                        <span className="loan-stat-val tabular-nums">{paidCount}/{loan.tenureMonths} <span className="loan-stat-pct">({progress}%)</span></span>
                      </div>
                      <div className="loan-progress-stat right">
                        <span className="loan-stat-title">Repaid / Total</span>
                        <span className="loan-stat-val tabular-nums">{formatAmount(paidAmount, currency)} <span className="loan-stat-total">/ {formatAmount(loan.totalPayable, currency)}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: EMI Schedule */}
                  {isExpanded && (
                    <div className="loan-expanded">
                      {/* Loan Details Summary */}
                      <div className="loan-detail-grid">
                        <div className="loan-detail-item">
                          <span className="loan-detail-label">Principal</span>
                          <span className="loan-detail-value tabular-nums">{formatAmount(loan.principalAmount, currency)}</span>
                        </div>
                        <div className="loan-detail-item">
                          <span className="loan-detail-label">Interest</span>
                          <span className="loan-detail-value tabular-nums">{formatAmount(loan.totalPayable - loan.principalAmount - loan.taxes.reduce((s, t) => s + (calculateTotalInterest(loan.principalAmount, loan.interestRate, loan.tenureMonths) * t.percentage / 100), 0), currency)}</span>
                        </div>
                        {loan.taxes.map((t, i) => (
                          <div key={i} className="loan-detail-item">
                            <span className="loan-detail-label">{t.name} ({t.percentage}%)</span>
                            <span className="loan-detail-value tabular-nums">{formatAmount(calculateTotalInterest(loan.principalAmount, loan.interestRate, loan.tenureMonths) * t.percentage / 100, currency)}</span>
                          </div>
                        ))}
                        <div className="loan-detail-item loan-detail-total">
                          <span className="loan-detail-label">Total Payable</span>
                          <span className="loan-detail-value tabular-nums">{formatAmount(loan.totalPayable, currency)}</span>
                        </div>
                      </div>

                      {loan.notes && (
                        <div className="loan-note-display">
                          <FileText size={12} /> {loan.notes}
                        </div>
                      )}

                      {/* Actions (Above EMI Schedule) */}
                      <div className="loan-card-actions">
                        <button type="button" className="btn-outline loan-action-btn" onClick={() => openEditForm(loan)}>
                          <Edit3 size={14} /> Edit
                        </button>
                        <button type="button" className="btn-outline loan-action-btn del" onClick={() => deleteLoan(loan.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>

                      {/* EMI Schedule List */}
                      <h4 className="loan-emi-heading">EMI Schedule</h4>
                      <div className="loan-emi-list">
                        {payments.map(p => (
                          <div key={p.id} className={`loan-emi-row ${p.paid ? "paid" : ""}`}>
                            <div className="loan-emi-left">
                              <button
                                type="button"
                                className={`loan-emi-check ${p.paid ? "checked" : ""}`}
                                onClick={() => toggleEmiPaid(p.id)}
                              >
                                {p.paid && <Check size={12} />}
                              </button>
                              <div className="loan-emi-info">
                                <span className="loan-emi-month">{p.monthLabel}</span>
                                <span className="loan-emi-sub">EMI #{p.monthIndex}{p.paidDate ? ` · Paid ${p.paidDate}` : ""}</span>
                              </div>
                            </div>
                            <div className="loan-emi-right">
                              <input
                                type="number"
                                className="loan-emi-amount-input tabular-nums"
                                value={p.amount}
                                onChange={e => updateEmiAmount(p.id, parseFloat(e.target.value) || 0)}
                                step="0.01"
                                min="0"
                              />
                              <input
                                type="text"
                                className="loan-emi-note-input"
                                placeholder="Note"
                                value={p.note || ""}
                                onChange={e => updateEmiNote(p.id, e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
