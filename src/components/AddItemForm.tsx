import { LayoutDashboard, CreditCard, Building2, Calendar, TrendingUp, RefreshCw, ClipboardList, Plus } from "lucide-react";
import React, { useState } from "react";
import { FinanceItem } from "../types";
import { encryptData, decryptData } from "../lib/crypto";
import { Currency, formatAmount } from "../lib/currency";
import { generateId } from "../lib/utils";

type ItemType = FinanceItem["type"];

interface Props {
  masterKey: string;
  currency: Currency;
  onAdd: (item: FinanceItem) => void;
  allowedTypes?: ItemType[];
  defaultType?: ItemType;
  buttonLabel?: string;
  fab?: boolean;
  startOpen?: boolean;
  // Edit mode
  initialValues?: FinanceItem;
  onSave?: (item: FinanceItem) => void;
  onCancel?: () => void;
}

const TYPE_OPTIONS: { key: ItemType; icon: React.ReactNode; label: string }[] = [
  { key: "bank",     icon: <Building2 size={20} />, label: "Bank" },
  { key: "card",     icon: <CreditCard size={20} />, label: "Card" },
  { key: "fd",       icon: <TrendingUp size={16} />, label: "FD" },
  { key: "rd",       icon: <Calendar size={16} />, label: "RD" },
  { key: "mf",       icon: <LayoutDashboard size={20} />, label: "Mutual Fund" },
  { key: "paylater", icon: <RefreshCw size={16} />, label: "Pay Later" },
  { key: "other",    icon: <ClipboardList size={16} />, label: "Other" },
];

export default function AddItemForm({
  masterKey, currency, onAdd, allowedTypes, defaultType, buttonLabel, fab, startOpen,
  initialValues, onSave, onCancel,
}: Props) {
  const isEditMode = !!initialValues;

  const visibleOptions = allowedTypes && allowedTypes.length > 0
    ? TYPE_OPTIONS.filter((t) => allowedTypes.includes(t.key))
    : TYPE_OPTIONS;
  const initialType: ItemType = initialValues?.type ?? defaultType ?? visibleOptions[0]?.key ?? "bank";

  const [open, setOpen] = useState(isEditMode || !!startOpen);
  const [type, setType]         = useState<ItemType>(initialType);
  const [name, setName]         = useState(initialValues?.name ?? "");
  const [balance, setBalance]   = useState(initialValues ? String(initialValues.balance) : "");
  const [secret, setSecret]     = useState(() => {
    if (!initialValues) return "";
    if (initialValues.type === "bank" || initialValues.type === "other") {
      try { return decryptData(initialValues.encryptedSecret, masterKey) || ""; }
      catch { return ""; }
    }
    return "";
  });
  const [lastFour, setLastFour]       = useState(initialValues?.lastFour ?? "");
  const [creditLimit, setCreditLimit] = useState(initialValues?.creditLimit !== undefined ? String(initialValues.creditLimit) : "");
  const [interestRate, setInterestRate] = useState(initialValues?.interestRate !== undefined ? String(initialValues.interestRate) : "");
  const [startDate, setStartDate]     = useState(initialValues?.startDate ?? "");
  const [maturityDate, setMaturityDate] = useState(initialValues?.maturityDate ?? "");
  const [monthlyAmount, setMonthlyAmount] = useState(initialValues?.monthlyAmount !== undefined ? String(initialValues.monthlyAmount) : "");
  const [investedAmount, setInvestedAmount] = useState(initialValues?.investedAmount !== undefined ? String(initialValues.investedAmount) : "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required."); return; }

    let bal = parseFloat(balance);
    if (type === "rd" && !balance && monthlyAmount) bal = 0;
    if (isNaN(bal)) { setError("Enter a valid amount."); return; }

    if ((type === "card" || type === "paylater") && lastFour && !/^\d{1,4}$/.test(lastFour)) {
      setError("Last 4 digits must be numbers only."); return;
    }

    const item: FinanceItem = {
      id: initialValues?.id ?? generateId(),
      name: name.trim(),
      balance: bal,
      encryptedSecret: encryptData(
        type === "bank" || type === "other" ? secret : "",
        masterKey
      ),
      lastFour: (type === "card" || type === "paylater") ? lastFour.slice(-4) || undefined : undefined,
      type,
      createdAt: initialValues?.createdAt ?? Date.now(),
      creditLimit:    (type === "card" || type === "paylater") && creditLimit ? parseFloat(creditLimit) || undefined : undefined,
      interestRate:   (type === "fd" || type === "rd") && interestRate ? parseFloat(interestRate) || undefined : undefined,
      startDate:      (type === "fd" || type === "rd") ? startDate || undefined : undefined,
      maturityDate:   (type === "fd" || type === "rd") ? maturityDate || undefined : undefined,
      monthlyAmount:  type === "rd" && monthlyAmount ? parseFloat(monthlyAmount) || undefined : undefined,
      investedAmount: type === "mf" && investedAmount ? parseFloat(investedAmount) || undefined : undefined,
    };

    if (isEditMode && onSave) {
      onSave(item);
    } else {
      onAdd(item);
    }
    if (!isEditMode) reset();
  }

  function reset() {
    setType(initialType); setName(""); setBalance(""); setSecret("");
    setLastFour(""); setCreditLimit(""); setInterestRate("");
    setStartDate(""); setMaturityDate(""); setMonthlyAmount("");
    setInvestedAmount(""); setError(""); setOpen(false);
  }

  function handleCancel() {
    if (onCancel) onCancel();
    else reset();
  }

  if (!open && !isEditMode) {
    if (fab) {
      return (
        <button
          className="fab-btn"
          onClick={() => setOpen(true)}
          aria-label={buttonLabel ?? "Add Entry"}
          title={buttonLabel ?? "Add Entry"}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      );
    }
    return (
      <button className="add-btn" onClick={() => setOpen(true)}>
        {buttonLabel ?? "+ Add Entry"}
      </button>
    );
  }

  const balanceLabel: Record<ItemType, string> = {
    bank:     "Current Balance",
    card:     "Outstanding Balance",
    fd:       "Principal Amount",
    rd:       "Total Deposited So Far",
    mf:       "Current Value",
    paylater: "Outstanding Balance",
    other:    "Balance / Value",
  };

  const namePlaceholder: Record<ItemType, string> = {
    bank:     "e.g. ICICI Bank, SBI",
    card:     "e.g. HDFC Visa Platinum",
    fd:       "e.g. ICICI FD – 7.5%",
    rd:       "e.g. SBI RD",
    mf:       "e.g. Mirae Asset Large Cap",
    paylater: "e.g. Amazon Pay Later",
    other:    "e.g. Cash, PayPal",
  };

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <h3 className="form-title">{isEditMode ? "Edit Entry" : "New Entry"}</h3>
      {error && <p className="form-error">{error}</p>}

      {/* Type selector — only for add mode or if multiple types allowed */}
      {!isEditMode && visibleOptions.length > 1 && (
        <div className="form-group">
          <label>Type</label>
          <div className="type-tabs type-tabs-wrap">
            {visibleOptions.map((t) => (
              <button key={t.key} type="button"
                className={`type-tab ${type === t.key ? "active" : ""}`}
                onClick={() => setType(t.key)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Name */}
      <div className="form-group">
        <label>Name</label>
        <input type="text" placeholder={namePlaceholder[type]}
          value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      {/* RD: monthly amount */}
      {type === "rd" && (
        <div className="form-group">
          <label>Monthly Installment ({currency.code})</label>
          <input type="number" step="0.01" min="0" placeholder="e.g. 10000"
            value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} />
          {monthlyAmount && !isNaN(parseFloat(monthlyAmount)) && (
            <span className="input-hint">{formatAmount(parseFloat(monthlyAmount), currency)} / month</span>
          )}
        </div>
      )}

      {/* MF: invested amount */}
      {type === "mf" && (
        <div className="form-group">
          <label>Amount Invested ({currency.code})</label>
          <input type="number" step="0.01" min="0" placeholder="Original invested"
            value={investedAmount} onChange={(e) => setInvestedAmount(e.target.value)} />
        </div>
      )}

      {/* Balance */}
      <div className="form-group">
        <label>{balanceLabel[type]} ({currency.code})</label>
        <input type="number" step="0.01" placeholder="0.00"
          value={balance} onChange={(e) => setBalance(e.target.value)} />
        {balance && !isNaN(parseFloat(balance)) && (
          <span className="input-hint">{formatAmount(parseFloat(balance), currency)}</span>
        )}
      </div>

      {/* Credit Limit */}
      {(type === "card" || type === "paylater") && (
        <div className="form-group">
          <label>Credit Limit ({currency.code})</label>
          <input type="number" step="0.01" min="0" placeholder="e.g. 50000"
            value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
          {creditLimit && !isNaN(parseFloat(creditLimit)) && (
            <span className="input-hint">Limit: {formatAmount(parseFloat(creditLimit), currency)}</span>
          )}
        </div>
      )}

      {/* Last 4 digits */}
      {(type === "card" || type === "paylater") && (
        <div className="form-group">
          <label>Last 4 Digits <span className="label-badge">Optional</span></label>
          <input type="text" inputMode="numeric" maxLength={4} placeholder="e.g. 4321"
            value={lastFour}
            onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          {lastFour.length === 4 && <span className="input-hint">•••• •••• •••• {lastFour}</span>}
        </div>
      )}

      {/* Interest Rate */}
      {(type === "fd" || type === "rd") && (
        <div className="form-group">
          <label>Interest Rate (% p.a.) <span className="label-badge">Optional</span></label>
          <input type="number" step="0.01" min="0" max="100" placeholder="e.g. 7.5"
            value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
        </div>
      )}

      {/* Start Date — stacked vertically to avoid cramping */}
      {(type === "fd" || type === "rd") && (
        <div className="form-group">
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
      )}

      {/* Maturity / End Date */}
      {(type === "fd" || type === "rd") && (
        <div className="form-group">
          <label>{type === "rd" ? "Maturity Date" : "Maturity Date"}</label>
          <input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
        </div>
      )}

      {/* Account number for bank */}
      {type === "bank" && (
        <div className="form-group">
          <label>Account Number <span className="label-badge">Encrypted</span></label>
          <input type="text" placeholder="Stored encrypted"
            value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" data-lpignore="true" data-1p-ignore style={{ WebkitTextSecurity: 'disc' } as any} />
        </div>
      )}

      {/* Notes for other */}
      {type === "other" && (
        <div className="form-group">
          <label>Notes / Secret <span className="label-badge">Encrypted</span></label>
          <input type="text" placeholder="e.g. password, PIN, notes"
            value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" data-lpignore="true" data-1p-ignore style={{ WebkitTextSecurity: 'disc' } as any} />
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {isEditMode ? "Update" : "Save"}
        </button>
        <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
      </div>
    </form>
  );
}
