import { FinanceItem, CardExpense, CardBill, CashbackEntry, RDInstallment, BankExpense, AIOptions, UserProfile, PaymentIntent, LoanEntry, EmiPayment } from "../types";
const ITEMS_KEY         = "finance_items";
const PIN_HASH_KEY      = "finance_pin_hash";
const CURRENCY_KEY      = "finance_currency";
const EXPENSES_KEY      = "finance_expenses";
const BILLS_KEY         = "finance_bills";
const CASHBACKS_KEY     = "finance_cashbacks";
const RD_INSTALL_KEY    = "finance_rd_installments";
const BANK_EXPENSES_KEY = "finance_bank_expenses";
const IDLE_TIMEOUT_KEY  = "finance_idle_timeout_min";
const THEME_KEY         = "finance_theme";
const SECURITY_Q_KEY    = "finance_security_q_idx";
const SECURITY_A_KEY    = "finance_security_a_hash";
const AI_OPTIONS_KEY    = "finance_ai_options";
const PAYMENT_INTENT_KEY = "finance_payment_intents";
const PAY_RECORD_ENABLED_KEY = "finance_pay_record_enabled";
const LOANS_KEY          = "finance_loans";
const EMI_PAYMENTS_KEY   = "finance_emi_payments";

// ── Finance Items ────────────────────────────────────────────────
export function saveItems(items: FinanceItem[]): void {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}
export function loadItems(): FinanceItem[] {
  try { return JSON.parse(localStorage.getItem(ITEMS_KEY) ?? "[]") as FinanceItem[]; }
  catch { return []; }
}

// ── PIN ──────────────────────────────────────────────────────────
export function savePinHash(hash: string): void {
  localStorage.setItem(PIN_HASH_KEY, hash);
}
export function loadPinHash(): string | null {
  return localStorage.getItem(PIN_HASH_KEY);
}

// ── Currency ─────────────────────────────────────────────────────
export function saveCurrency(code: string): void {
  localStorage.setItem(CURRENCY_KEY, code);
}
export function loadCurrency(): string {
  return localStorage.getItem(CURRENCY_KEY) ?? "USD";
}

// ── Card Expenses ─────────────────────────────────────────────────
export function saveExpenses(expenses: CardExpense[]): void {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}
export function loadExpenses(): CardExpense[] {
  try { return JSON.parse(localStorage.getItem(EXPENSES_KEY) ?? "[]") as CardExpense[]; }
  catch { return []; }
}
export function getExpensesForCard(cardId: string): CardExpense[] {
  return loadExpenses().filter((e) => e.cardId === cardId);
}

// ── Card Bills ────────────────────────────────────────────────────
export function saveBills(bills: CardBill[]): void {
  localStorage.setItem(BILLS_KEY, JSON.stringify(bills));
}
export function loadBills(): CardBill[] {
  try { return JSON.parse(localStorage.getItem(BILLS_KEY) ?? "[]") as CardBill[]; }
  catch { return []; }
}

// ── Cashbacks ─────────────────────────────────────────────────────
export function saveCashbacks(entries: CashbackEntry[]): void {
  localStorage.setItem(CASHBACKS_KEY, JSON.stringify(entries));
}
export function loadCashbacks(): CashbackEntry[] {
  try { return JSON.parse(localStorage.getItem(CASHBACKS_KEY) ?? "[]") as CashbackEntry[]; }
  catch { return []; }
}

// ── RD Installments ───────────────────────────────────────────────
export function saveRDInstallments(list: RDInstallment[]): void {
  localStorage.setItem(RD_INSTALL_KEY, JSON.stringify(list));
}
export function loadRDInstallments(): RDInstallment[] {
  try { return JSON.parse(localStorage.getItem(RD_INSTALL_KEY) ?? "[]") as RDInstallment[]; }
  catch { return []; }
}
export function getRDInstallmentsForRD(rdId: string): RDInstallment[] {
  return loadRDInstallments().filter((r) => r.rdId === rdId);
}

// ── Bank Expenses ─────────────────────────────────────────────────
export function saveBankExpenses(expenses: BankExpense[]): void {
  localStorage.setItem(BANK_EXPENSES_KEY, JSON.stringify(expenses));
}
export function loadBankExpenses(): BankExpense[] {
  try { return JSON.parse(localStorage.getItem(BANK_EXPENSES_KEY) ?? "[]") as BankExpense[]; }
  catch { return []; }
}

// ── Idle Timeout (minutes; 0 = never) ─────────────────────────────
export function loadIdleTimeout(): number {
  const v = localStorage.getItem(IDLE_TIMEOUT_KEY);
  if (v === null) return 2;            // default: 2 minutes
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 2;
}
export function saveIdleTimeout(minutes: number): void {
  localStorage.setItem(IDLE_TIMEOUT_KEY, String(minutes));
}

// ── Theme (light / dark) ───────────────────────────────────────────
export function loadTheme(): "light" | "dark" {
  const v = localStorage.getItem(THEME_KEY);
  if (v === "dark" || v === "light") return v;
  return "light";  // default: light mode
}
export function saveTheme(theme: "light" | "dark"): void {
  localStorage.setItem(THEME_KEY, theme);
}

// ── Security Question ──────────────────────────────────────────────
export function saveSecurityQuestion(idx: number): void {
  localStorage.setItem(SECURITY_Q_KEY, String(idx));
}
export function loadSecurityQuestion(): number | null {
  const v = localStorage.getItem(SECURITY_Q_KEY);
  if (v === null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
export function saveSecurityAnswerHash(hash: string): void {
  localStorage.setItem(SECURITY_A_KEY, hash);
}
export function loadSecurityAnswerHash(): string | null {
  return localStorage.getItem(SECURITY_A_KEY);
}
export function hasSecurityQuestion(): boolean {
  return localStorage.getItem(SECURITY_Q_KEY) !== null &&
         localStorage.getItem(SECURITY_A_KEY) !== null;
}

// ── Clear All ─────────────────────────────────────────────────────
export function clearAll(): void {
  [ITEMS_KEY, PIN_HASH_KEY, CURRENCY_KEY, EXPENSES_KEY, BILLS_KEY,
   CASHBACKS_KEY, RD_INSTALL_KEY, BANK_EXPENSES_KEY,
   "finance_bio_cred_id", "finance_bio_enc_pin", "finance_bio_prf_salt",
   IDLE_TIMEOUT_KEY, THEME_KEY, SECURITY_Q_KEY, SECURITY_A_KEY, PAYMENT_INTENT_KEY,
   LOANS_KEY, EMI_PAYMENTS_KEY,
   "finance_session_token", "finance_session_ts"]
    .forEach((k) => localStorage.removeItem(k));
}

// ── AI Options ───────────────────────────────────────────────────
export function saveAIOptions(opts: AIOptions): void {
  localStorage.setItem(AI_OPTIONS_KEY, JSON.stringify(opts));
}
export function loadAIOptions(): AIOptions {
  try {
    const raw = localStorage.getItem(AI_OPTIONS_KEY);
    if (!raw) return { provider: "none", geminiKey: "", openRouterKey: "", openRouterModel: "google/gemini-flash-1.5", groqKey: "", groqModel: "llama-3.1-8b-instant" };
    const parsed = JSON.parse(raw);
    return {
      provider: parsed.provider || "none",
      geminiKey: parsed.geminiKey || "",
      openRouterKey: parsed.openRouterKey || "",
      openRouterModel: parsed.openRouterModel || "google/gemini-flash-1.5",
      groqKey: parsed.groqKey || "",
      groqModel: parsed.groqModel || "llama-3.1-8b-instant"
    };
  } catch {
    return { provider: "none", geminiKey: "", openRouterKey: "", openRouterModel: "google/gemini-flash-1.5", groqKey: "", groqModel: "llama-3.1-8b-instant" };
  }
}

// ── VeloAI Limits ───────────────────────────────────────────────────
const VELOAI_USAGE_KEY = "finance_veloai_usage";

export function loadVeloAIUsage() { try { const raw = localStorage.getItem(VELOAI_USAGE_KEY); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; } }
export function saveVeloAIUsage(usage: { date: string, count: number }) { localStorage.setItem(VELOAI_USAGE_KEY, JSON.stringify(usage)); }

export function checkVeloAILimit(): boolean {
  try {
    const raw = localStorage.getItem(VELOAI_USAGE_KEY);
    const today = new Date().toISOString().split("T")[0];
    if (!raw) return true;
    const usage = JSON.parse(raw);
    if (usage.date !== today) return true;
    return usage.count < 10;
  } catch (e) {
    return true;
  }
}

export function incrementVeloAIUsage(): void {
  try {
    const raw = localStorage.getItem(VELOAI_USAGE_KEY);
    const today = new Date().toISOString().split("T")[0];
    let usage = { date: today, count: 0 };
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) usage.count = parsed.count;
    }
    usage.count += 1;
    localStorage.setItem(VELOAI_USAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    // Ignore errors
  }
}

export function getVeloAIUsageCount(): number {
  try {
    const raw = localStorage.getItem(VELOAI_USAGE_KEY);
    const today = new Date().toISOString().split("T")[0];
    if (!raw) return 0;
    const usage = JSON.parse(raw);
    if (usage.date !== today) return 0;
    return usage.count;
  } catch (e) {
    return 0;
  }
}

// ── Dashboard Due Reminders ─────────────────────────────────────────
const SUPPRESSED_DUES_KEY = "finance_suppressed_dues";

export function suppressDueReminder(cardId: string, dueDate: string, expenseIdsStr: string): void {
  try {
    const raw = localStorage.getItem(SUPPRESSED_DUES_KEY);
    const suppressed = raw ? JSON.parse(raw) : {};
    suppressed[`${cardId}_${dueDate}`] = expenseIdsStr;
    localStorage.setItem(SUPPRESSED_DUES_KEY, JSON.stringify(suppressed));
  } catch (e) {}
}

export function isDueReminderSuppressed(cardId: string, dueDate: string, expenseIdsStr: string): boolean {
  try {
    const raw = localStorage.getItem(SUPPRESSED_DUES_KEY);
    if (!raw) return false;
    const suppressed = JSON.parse(raw);
    return suppressed[`${cardId}_${dueDate}`] === expenseIdsStr;
  } catch (e) {
    return false;
  }
}

// ── User Profile ────────────────────────────────────────────────
const USER_PROFILE_KEY = "finance_user_profile";

export function loadUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

// ── Payment Intents ─────────────────────────────────────────────
export function savePaymentIntents(intents: PaymentIntent[]): void {
  localStorage.setItem(PAYMENT_INTENT_KEY, JSON.stringify(intents));
}

export function loadPaymentIntents(): PaymentIntent[] {
  try {
    const raw = localStorage.getItem(PAYMENT_INTENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ── Pay & Record Feature Toggle ─────────────────────────────────
export function loadPayAndRecordEnabled(): boolean {
  try {
    const raw = localStorage.getItem(PAY_RECORD_ENABLED_KEY);
    if (raw === null) return true; // enabled by default
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

export function savePayAndRecordEnabled(enabled: boolean): void {
  localStorage.setItem(PAY_RECORD_ENABLED_KEY, JSON.stringify(enabled));
}

// ── Loans & EMIs ──────────────────────────────────────────────────
export function saveLoans(loans: LoanEntry[]): void {
  localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
}
export function loadLoans(): LoanEntry[] {
  try { return JSON.parse(localStorage.getItem(LOANS_KEY) ?? "[]") as LoanEntry[]; }
  catch { return []; }
}

export function saveEmiPayments(payments: EmiPayment[]): void {
  localStorage.setItem(EMI_PAYMENTS_KEY, JSON.stringify(payments));
}
export function loadEmiPayments(): EmiPayment[] {
  try { return JSON.parse(localStorage.getItem(EMI_PAYMENTS_KEY) ?? "[]") as EmiPayment[]; }
  catch { return []; }
}
export function getEmiPaymentsForLoan(loanId: string): EmiPayment[] {
  return loadEmiPayments().filter((p) => p.loanId === loanId);
}

// ── Persistent Session ────────────────────────────────────────────
const SESSION_TOKEN_KEY  = "finance_session_token";
const SESSION_TS_KEY     = "finance_session_ts";

export function saveSessionToken(encryptedKey: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, encryptedKey);
  localStorage.setItem(SESSION_TS_KEY, String(Date.now()));
}

export function loadSessionToken(): { token: string; timestamp: number } | null {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  const ts = localStorage.getItem(SESSION_TS_KEY);
  if (!token || !ts) return null;
  const timestamp = parseInt(ts, 10);
  if (!Number.isFinite(timestamp)) return null;
  return { token, timestamp };
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_TS_KEY);
}
