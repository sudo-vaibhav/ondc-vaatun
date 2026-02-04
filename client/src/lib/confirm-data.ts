/**
 * Confirm Data Persistence
 *
 * Stores data needed for confirm request in localStorage before
 * user is redirected to BPP payment gateway. Retrieved on payment callback.
 */

export interface ConfirmData {
  transactionId: string;
  bppId: string;
  bppUri: string;
  providerId: string;
  itemId: string;
  parentItemId: string;
  xinputFormId: string;
  submissionId: string;
  addOns?: Array<{ id: string; quantity: number }>;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quoteId: string;
  amount: string;
  quoteBreakup?: Array<{ title: string; price: { currency: string; value: string } }>;
  // Store timestamp to detect stale data
  storedAt: number;
}

const STORAGE_KEY = "ondc_confirm_data";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export function storeConfirmData(data: Omit<ConfirmData, "storedAt">): void {
  const withTimestamp: ConfirmData = {
    ...data,
    storedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp));
}

export function getConfirmData(transactionId: string): ConfirmData | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const data: ConfirmData = JSON.parse(stored);

    // Verify transaction ID matches
    if (data.transactionId !== transactionId) {
      return null;
    }

    // Check if data is stale
    if (Date.now() - data.storedAt > MAX_AGE_MS) {
      clearConfirmData();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function clearConfirmData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
