import CryptoJS from "crypto-js";
import {
  loadItems, loadExpenses, loadBills, loadCashbacks,
  loadRDInstallments, loadBankExpenses,
  saveItems, saveExpenses, saveBills, saveCashbacks,
  saveRDInstallments, saveBankExpenses,
  loadPinHash, savePinHash, loadVeloAIUsage, saveVeloAIUsage,
  loadCurrency, saveCurrency, loadIdleTimeout, saveIdleTimeout,
  loadTheme, saveTheme, loadSecurityQuestion, saveSecurityQuestion,
  loadSecurityAnswerHash, saveSecurityAnswerHash,
  loadUserProfile, saveUserProfile,
  loadLoans, saveLoans, loadEmiPayments, saveEmiPayments
} from "./storage";
import { hashPin } from "./crypto";

export interface SyncPayload {
  version: 1;
  syncedAt: number;
  items: any[];
  expenses: any[];
  bills: any[];
  cashbacks: any[];
  rdInstallments: any[];
  bankExpenses: any[];
  veloAIUsage?: { date: string; count: number };
  userProfile?: any;
  currency?: string;
  idleTimeout?: number;
  theme?: "light" | "dark";
  pinHash?: string | null;
  securityQuestion?: number | null;
  securityAnswerHash?: string | null;
  loans?: any[];
  emiPayments?: any[];
}

// ── Verify PIN ──────────────────────────────────────────────────
export function verifySyncPin(pin: string): boolean {
  const hash = loadPinHash();
  if (!hash) return false;
  return hashPin(pin) === hash;
}

// ── Generate encrypted sync payload ─────────────────────────────
export function generateSyncPayload(pin: string): string {
  const payload: SyncPayload = {
    version: 1,
    syncedAt: Date.now(),
    items: loadItems(),
    expenses: loadExpenses(),
    bills: loadBills(),
    cashbacks: loadCashbacks(),
    rdInstallments: loadRDInstallments(),
    bankExpenses: loadBankExpenses(),
    veloAIUsage: loadVeloAIUsage(),
    userProfile: loadUserProfile(),
    currency: loadCurrency(),
    idleTimeout: loadIdleTimeout(),
    theme: loadTheme(),
    pinHash: loadPinHash(),
    securityQuestion: loadSecurityQuestion(),
    securityAnswerHash: loadSecurityAnswerHash(),
    loans: loadLoans(),
    emiPayments: loadEmiPayments()
  };

  const json = JSON.stringify(payload);
  const encrypted = CryptoJS.AES.encrypt(json, pin).toString();
  return encrypted;
}

// ── Helper to safely parse API responses ──────────────────────────
async function fetchJson(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type");
  
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("API route not found. If testing locally, you must run 'vercel dev' instead of 'npm run dev' to use serverless functions.");
  }
  
  const json = await res.json();
  return { res, json };
}

// ── Initialize Sync Session (Receiver) ──────────────────────────
export async function initSyncSession(): Promise<string> {
  const { res, json } = await fetchJson("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "init" }),
  });

  if (!res.ok) throw new Error(json.error || "Failed to initialize sync session.");
  return json.code;
}

// ── Poll for Sync Data (Receiver) ───────────────────────────────
export async function pollSyncData(code: string): Promise<string | null> {
  const { res, json } = await fetchJson("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "poll", code }),
  });
  
  if (res.status === 202) {
    return null; // Pending
  }
  
  if (!res.ok) throw new Error(json.error || "Polling failed.");
  return json.data;
}

// ── Upload encrypted data to relay (Sender) ─────────────────────
export async function uploadSyncData(code: string, encryptedData: string): Promise<void> {
  const { res, json } = await fetchJson("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "upload", code, data: encryptedData }),
  });

  if (!res.ok) throw new Error(json.error || "Upload failed.");
}

// ── Decrypt and import sync payload ─────────────────────────────
export function importSyncPayload(encryptedData: string, pin: string): SyncPayload {
  let decrypted: string;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, pin);
    decrypted = bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    throw new Error("Decryption failed. The PIN may be incorrect.");
  }

  if (!decrypted) {
    throw new Error("Decryption failed. The PIN you entered does not match the sender's PIN.");
  }

  let payload: SyncPayload;
  try {
    payload = JSON.parse(decrypted);
  } catch {
    throw new Error("Could not parse decrypted data. The file may be corrupted.");
  }

  if (!payload.items || !Array.isArray(payload.items)) {
    throw new Error("Invalid sync data — missing items.");
  }

  // Import everything
  saveItems(payload.items);
  if (Array.isArray(payload.expenses)) saveExpenses(payload.expenses);
  if (Array.isArray(payload.bills)) saveBills(payload.bills);
  if (Array.isArray(payload.cashbacks)) saveCashbacks(payload.cashbacks);
  if (Array.isArray(payload.rdInstallments)) saveRDInstallments(payload.rdInstallments);
  if (Array.isArray(payload.bankExpenses)) saveBankExpenses(payload.bankExpenses);
  if (Array.isArray(payload.loans)) saveLoans(payload.loans);
  if (Array.isArray(payload.emiPayments)) saveEmiPayments(payload.emiPayments);
  
  if (payload.veloAIUsage) saveVeloAIUsage(payload.veloAIUsage);
  if (payload.userProfile) saveUserProfile(payload.userProfile);
  if (payload.currency) saveCurrency(payload.currency);
  if (payload.idleTimeout !== undefined) saveIdleTimeout(payload.idleTimeout);
  if (payload.theme) {
    saveTheme(payload.theme);
    if (payload.theme === "dark") document.documentElement.classList.add("dark-mode");
    else document.documentElement.classList.remove("dark-mode");
  }
  if (payload.pinHash) savePinHash(payload.pinHash);
  if (payload.securityQuestion !== undefined) saveSecurityQuestion(payload.securityQuestion as number);
  if (payload.securityAnswerHash) saveSecurityAnswerHash(payload.securityAnswerHash);

  return payload;
}
