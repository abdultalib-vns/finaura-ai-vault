import { customAlert, customConfirm } from "../components/CustomAlert";
import type { FinanceItem, CardExpense, CardBill, CashbackEntry, RDInstallment, BankExpense, LoanEntry, EmiPayment } from "../types";
import {
  loadItems, loadExpenses, loadBills, loadCashbacks, loadRDInstallments, loadBankExpenses,
  saveItems, saveExpenses, saveBills, saveCashbacks, saveRDInstallments, saveBankExpenses,
  loadPinHash,
  loadVeloAIUsage, saveVeloAIUsage,
  loadLoans, saveLoans, loadEmiPayments, saveEmiPayments,
} from "./storage";
import { hashPin } from "./crypto";

export interface VaultBackup {
  version: 1;
  exportedAt: number;
  items: FinanceItem[];
  expenses: CardExpense[];
  bills: CardBill[];
  cashbacks: CashbackEntry[];
  rdInstallments: RDInstallment[];
  bankExpenses: BankExpense[];
  veloAIUsage?: { date: string, count: number };
  loans?: LoanEntry[];
  emiPayments?: EmiPayment[];
}

export function verifyPin(pin: string): boolean {
  const hash = loadPinHash();
  if (!hash) return false;
  return hashPin(pin) === hash;
}

export async function exportVault(pin: string): Promise<void> {
  if (!verifyPin(pin)) throw new Error("Incorrect PIN.");
  const backup: VaultBackup = {
    version: 1,
    exportedAt: Date.now(),
    items: loadItems(),
    expenses: loadExpenses(),
    bills: loadBills(),
    cashbacks: loadCashbacks(),
    rdInstallments: loadRDInstallments(),
    bankExpenses: loadBankExpenses(),
    veloAIUsage: loadVeloAIUsage(),
    loans: loadLoans(),
    emiPayments: loadEmiPayments(),
  };
  const json = JSON.stringify(backup, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `FinAura-backup-${date}.fvbackup`;

  // Try using the modern File System Access API (supported on desktop Chrome/Edge)
  if ('showDirectoryPicker' in window) {
    try {
      // Request user to pick a base directory (e.g., Downloads)
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      
      // Get or create the 'FinAura' folder inside the chosen directory
      const finAuraDir = await dirHandle.getDirectoryHandle('FinAura', { create: true });
      
      // Create the backup file inside the 'FinAura' folder
      const fileHandle = await finAuraDir.getFileHandle(fileName, { create: true });
      
      // Write the backup data
      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      
      return; // Successfully saved via API
    } catch (err) {
      console.warn("Directory picker failed or was cancelled.", err);
    }
  } else {
      customAlert("Note: Automatic folder creation (FinAura/) is not supported on this device/browser. The file will be saved to your default Downloads folder.");
  }

  // Fallback: Traditional download (for mobile browsers or if picker was cancelled)
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FinAura/${fileName}`; // Attempt relative path (most browsers will flatten to FinAura_FinAura-backup...)
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Direct export for automated daily backup reminders.
 * Generates and downloads the encrypted vault backup without prompting for PIN.
 */
export async function exportVaultDirect(): Promise<string> {
  const backup: VaultBackup = {
    version: 1,
    exportedAt: Date.now(),
    items: loadItems(),
    expenses: loadExpenses(),
    bills: loadBills(),
    cashbacks: loadCashbacks(),
    rdInstallments: loadRDInstallments(),
    bankExpenses: loadBankExpenses(),
    veloAIUsage: loadVeloAIUsage(),
    loans: loadLoans(),
    emiPayments: loadEmiPayments(),
  };
  const json = JSON.stringify(backup, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `FinAura-backup-${date}.fvbackup`;

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return fileName;
}

export async function importVault(file: File, pin: string): Promise<VaultBackup> {
  if (!verifyPin(pin)) throw new Error("Incorrect PIN.");
  const text = await file.text();
  let data: VaultBackup;
  try {
    data = JSON.parse(text) as VaultBackup;
  } catch {
    throw new Error("Invalid backup file — could not parse JSON.");
  }
  if (!data.items || !Array.isArray(data.items)) {
    throw new Error("Backup file is missing items data.");
  }
  saveItems(data.items);
  if (Array.isArray(data.expenses)) saveExpenses(data.expenses);
  if (Array.isArray(data.bills)) saveBills(data.bills);
  if (Array.isArray(data.cashbacks)) saveCashbacks(data.cashbacks);
  if (Array.isArray(data.rdInstallments)) saveRDInstallments(data.rdInstallments);
  if (Array.isArray(data.bankExpenses)) saveBankExpenses(data.bankExpenses);
  if (data.veloAIUsage) saveVeloAIUsage(data.veloAIUsage);
  if (Array.isArray(data.loans)) saveLoans(data.loans);
  if (Array.isArray(data.emiPayments)) saveEmiPayments(data.emiPayments);
  return data;
}
