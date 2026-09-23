import { LayoutDashboard, CreditCard, Building2, Check, ArrowLeft, Calendar, Trash, TrendingUp, RefreshCw, ClipboardList , Pencil, EyeOff, Eye,  } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { FinanceItem } from "../types";
import { decryptData } from "../lib/crypto";
import { Currency, formatAmount } from "../lib/currency";

interface Props {
  item: FinanceItem;
  masterKey: string;
  currency: Currency;
  onDelete: (id: string) => void;
  onEdit: (item: FinanceItem) => void;
}

const TYPE_META: Record<FinanceItem["type"], { label: string; color: string; icon: React.ReactNode }> = {
  bank:     { label: "Bank",        color: "#3b82f6", icon: <Building2 size={20} /> },
  card:     { label: "Card",        color: "#8b5cf6", icon: <CreditCard size={20} /> },
  fd:       { label: "Fixed Dep.",  color: "#f59e0b", icon: <TrendingUp size={16} /> },
  rd:       { label: "Recurring",   color: "#10b981", icon: <Calendar size={16} /> },
  mf:       { label: "Mutual Fund", color: "#06b6d4", icon: <LayoutDashboard size={20} /> },
  paylater: { label: "Pay Later",   color: "#ef4444", icon: <RefreshCw size={16} /> },
  other:    { label: "Other",       color: "#6b7280", icon: <ClipboardList size={16} /> },
};

const REVEAL_W = 140;
const SWIPE_THRESHOLD = 45;

export default function ItemCard({ item, masterKey, currency, onDelete, onEdit }: Props) {
  const [showSensitive, setShowSensitive] = useState(false);
  const [swiped, setSwiped] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startXRef = useRef(0);
  const cardRef = useRef<HTMLLIElement>(null);

  const meta = TYPE_META[item.type] ?? TYPE_META.other;
  const hasSecret = !!item.encryptedSecret && decryptData(item.encryptedSecret, masterKey) !== "";

  const balLabel: Record<FinanceItem["type"], string> = {
    bank: "Balance", card: "Outstanding", fd: "Total Value",
    rd: "Deposited", mf: "Current Value", paylater: "Outstanding", other: "Balance",
  };

  useEffect(() => {
    if (!swiped) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setSwiped(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [swiped]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    startXRef.current = e.clientX;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const dx = e.clientX - startXRef.current;
    if (Math.abs(dx) < 5) return;
    if (dx < -SWIPE_THRESHOLD) setSwiped(true);
    else if (dx > SWIPE_THRESHOLD) {
      setSwiped(false);
      setConfirmDelete(false);
    }
  }

  function handleDelete() {
    if (!confirmDelete) setConfirmDelete(true);
    else {
      onDelete(item.id);
      setSwiped(false);
    }
  }

  function handleEdit() {
    setSwiped(false);
    onEdit(item);
  }

  return (
    <li ref={cardRef} className="item-card" style={{ position: "relative", overflow: "hidden", borderRadius: "var(--radius)" }}>
      <div className="swipe-actions" style={{ opacity: swiped ? 1 : 0, transition: "opacity 0.2s ease" }}>
        <button type="button" className="swipe-btn swipe-edit" onClick={handleEdit}>
          <span className="swipe-icon"><Pencil size={16} /></span>
          <span className="swipe-label">Edit</span>
        </button>
        <button
          type="button"
          className={`swipe-btn swipe-delete ${confirmDelete ? "confirm" : ""}`}
          onClick={handleDelete}
        >
          <span className="swipe-icon">{confirmDelete ? <Check size={16} /> : <Trash size={16} />}</span>
          <span className="swipe-label">{confirmDelete ? "Sure?" : "Delete"}</span>
        </button>
      </div>

      <div
        className="item-card-inner"
        style={{
          transform: swiped ? `translateX(-${REVEAL_W}px)` : "translateX(0)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          background: "var(--surface)",
          display: "flex",
          position: "relative",
          zIndex: 1,
          touchAction: "pan-y",
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <div className="item-card-accent" style={{ background: meta.color }} />
        <div className="item-card-body">
          <div className="item-header">
            <div className="item-header-left">
              <span className="item-type-badge" style={{ background: meta.color + "22", color: meta.color }}>
                {meta.icon} {meta.label}
              </span>
              <h3 className="item-name">{item.name}</h3>
            </div>

            <div className="item-amounts">
              <div className="item-balance-row">
                <div>
                  <span className="item-balance-label">{balLabel[item.type]}</span>
                  <span className="item-balance">
                    {showSensitive ? formatAmount(item.type === "fd" ? item.balance + (item.interestInflow || 0) : item.balance, currency) : "••••••"}
                  </span>
                  {item.creditLimit !== undefined && showSensitive && (
                    <span className="item-limit">Limit: {formatAmount(item.creditLimit, currency)}</span>
                  )}
                  {item.type === "mf" && item.investedAmount !== undefined && showSensitive && (
                    <span className="item-limit">Invested: {formatAmount(item.investedAmount, currency)}</span>
                  )}
                  {item.type === "fd" && item.interestInflow !== undefined && showSensitive && (
                    <span className="item-limit">Principal: {formatAmount(item.balance, currency)} <span style={{color: "var(--success)"}}>| Earned: +{formatAmount(item.interestInflow, currency)}</span></span>
                  )}
                </div>
                <button
                  type="button"
                  className="icon-btn eye-btn"
                  onClick={() => setShowSensitive((v) => !v)}
                  title={showSensitive ? "Hide" : "Show balance"}
                >
                  {showSensitive ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {(item.type === "card" || item.type === "paylater") && item.lastFour && (
            <div className="item-card-number">
              <span className="card-dots">•••• •••• ••••</span>
              <span className="card-last-four">{item.lastFour}</span>
            </div>
          )}

          {(item.type === "fd" || item.type === "rd") && (
            <div className="item-fd-meta">
              {item.interestRate !== undefined && (
                <span className="fd-chip"><LayoutDashboard size={20} /> {item.interestRate}% p.a.</span>
              )}
              {item.startDate && <span className="fd-chip">Start: {fmtDate(item.startDate)}</span>}
              {item.maturityDate && <span className="fd-chip">Matures: {fmtDate(item.maturityDate)}</span>}
              {item.type === "rd" && item.monthlyAmount !== undefined && (
                <span className="fd-chip"><Calendar size={16} /> {formatAmount(item.monthlyAmount, currency)}/mo</span>
              )}
            </div>
          )}

          {(item.type === "bank" || item.type === "other") && hasSecret && (
            <div className="item-secret-row">
              <span className="item-secret-label">{item.type === "bank" ? "Account No." : "Secret"}</span>
              <span className="item-secret">
                {showSensitive ? decryptData(item.encryptedSecret, masterKey) : "•••• •••• ••••"}
              </span>
            </div>
          )}

          <p className="swipe-hint"><ArrowLeft size={16} /> Swipe to edit or delete</p>
        </div>
      </div>
    </li>
  );
}

function fmtDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      day: "numeric", month: "short", year: "2-digit",
    });
  } catch {
    return d;
  }
}
