export interface FinanceItem {
  id: string;
  name: string;
  balance: number;
  encryptedSecret: string;
  lastFour?: string;
  type: "bank" | "card" | "fd" | "rd" | "mf" | "paylater" | "other";
  createdAt: number;
  // Card / Pay Later
  creditLimit?: number;
  // FD / RD
  interestRate?: number;
  startDate?: string;
  maturityDate?: string;
  // RD specific
  monthlyAmount?: number;
  // MF
  investedAmount?: number;
}

export type NavTab = "dashboard" | "cards" | "banks" | "cashback" | "loans" | "settings";

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export type ExpenseStatus =
  | "paid"
  | "unpaid"
  | "bill_generated_unpaid"
  | "bill_generated";

export interface CardExpense {
  id: string;
  cardId: string;
  description: string;
  amount: number;
  date: string;
  dueDate?: string;
  status: ExpenseStatus;
  cashback: number;
  billId?: string;
  createdAt: number;
}

export interface PaymentApp {
  name: string;
  icon: string;
  url: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  description: string;
  sourceAccountId: string;
  sourceType: "bank" | "card" | "fd" | "rd" | "mf" | "paylater" | "other";
  status: "pending" | "completed" | "cancelled";
  createdAt: number;
}

export interface CreditCardOffer {
  name: string;
  bank: string;
  type: "free" | "paid";
  annualFee?: string;
  benefits: string;
  url: string;
}

export interface CardBill {
  id: string;
  cardId: string;
  month: string;
  expenseIds: string[];
  totalAmount: number;
  totalCashback: number;
  status: "unpaid" | "paid";
  generatedAt: number;
  paidAt?: number;
  dueDate?: string;
  paidViaBankId?: string;
  paidViaBankName?: string;
}

export interface CashbackEntry {
  id: string;
  source: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: number;
}

export interface RDInstallment {
  id: string;
  rdId: string;
  month: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
}

export interface BankExpense {
  id: string;
  bankId: string;             // FinanceItem.id (bank/fd/rd/mf/other)
  description: string;
  amount: number;
  date: string;
  type: "debit" | "credit";   // outflow vs inflow
  category?: string;
  createdAt: number;
}

export interface AIOptions {
  provider: "none" | "gemini" | "openrouter" | "groq" | "veloai";
  geminiKey: string;
  openRouterKey: string;
  openRouterModel: string;
  groqKey: string;
  groqModel: string;
}

export interface UserProfile {
  name: string;
  email: string;
  photo: string;
}

export interface TaxEntry {
  name: string;       // e.g. "IGST", "CGST", "SGST", "VAT", "GST"
  percentage: number;  // e.g. 9 for 9%
}

export interface LoanEntry {
  id: string;
  type: "loan" | "credit_card";
  name: string;
  lender: string;               // Bank / NBFC / Card name
  principalAmount: number;
  tenureMonths: number;
  interestRate: number;          // annual %
  monthlyEmi: number;            // user-defined EMI amount
  taxes: TaxEntry[];
  totalPayable: number;          // computed: principal + interest + taxes
  startDate: string;             // YYYY-MM
  notes?: string;
  createdAt: number;
  cardId?: string;               // FinanceItem.id — links credit_card loan to a card
  dueDay?: number;               // day-of-month for EMI due date (1–28, default 1)
}

export interface EmiPayment {
  id: string;
  loanId: string;
  monthIndex: number;           // 1-based
  monthLabel: string;           // e.g. "Jan 2026"
  amount: number;
  paid: boolean;
  paidDate?: string;
  note?: string;
}
