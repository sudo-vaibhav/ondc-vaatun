"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { z } from "zod";

// ============================================
// Zod Schemas - Source of Truth for Types
// ============================================

const PEDDetailsSchema = z.object({
  diabetes: z.boolean().default(false),
  bloodPressure: z.boolean().default(false),
  heartAilments: z.boolean().default(false),
  otherHealthIssues: z.boolean().default(false),
});

export const PurchaserInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  relationshipWithProposer: z
    .enum(["self", "spouse", "child", "parent", "other"])
    .default("self"),
  ped: z.enum(["yes", "no"]).default("no"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  panNumber: z.string().optional(),
  pedDetails: PEDDetailsSchema.default({
    diabetes: false,
    bloodPressure: false,
    heartAilments: false,
    otherHealthIssues: false,
  }),
  weight: z.string().optional(),
  height: z.string().optional(),
  coverageAmount: z.string().optional(),
  panIndiaCover: z.boolean().default(false),
  pincode: z
    .string()
    .min(6, "Pincode must be 6 digits")
    .max(6, "Pincode must be 6 digits"),
});

export type PurchaserInfo = z.infer<typeof PurchaserInfoSchema>;
export type PEDDetails = z.infer<typeof PEDDetailsSchema>;

// ============================================
// Default Values
// ============================================

const defaultPurchaserInfo: PurchaserInfo = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  relationshipWithProposer: "self",
  ped: "no",
  dateOfBirth: "",
  panNumber: "",
  pedDetails: {
    diabetes: false,
    bloodPressure: false,
    heartAilments: false,
    otherHealthIssues: false,
  },
  weight: "",
  height: "",
  coverageAmount: "",
  panIndiaCover: false,
  pincode: "",
};

// ============================================
// localStorage Key
// ============================================

const STORAGE_KEY = "ondc-purchaser-info";

// ============================================
// Context Types
// ============================================

interface PurchaserContextValue {
  purchaserInfo: PurchaserInfo;
  updatePurchaserInfo: (info: Partial<PurchaserInfo>) => void;
  setPurchaserInfo: (info: PurchaserInfo) => void;
  clearPurchaserInfo: () => void;
  isInfoComplete: boolean;
  hasStoredInfo: boolean;
}

const PurchaserContext = createContext<PurchaserContextValue | null>(null);

// ============================================
// Hook
// ============================================

export function usePurchaser(): PurchaserContextValue {
  const ctx = useContext(PurchaserContext);
  if (!ctx) {
    throw new Error("usePurchaser must be used within a PurchaserProvider");
  }
  return ctx;
}

// ============================================
// localStorage Helpers
// ============================================

function loadFromStorage(): PurchaserInfo | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const result = PurchaserInfoSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }
    console.warn("[PurchaserContext] Invalid stored data, using defaults");
    return null;
  } catch (error) {
    console.warn("[PurchaserContext] Failed to load from localStorage:", error);
    return null;
  }
}

function saveToStorage(info: PurchaserInfo): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch (error) {
    console.warn("[PurchaserContext] Failed to save to localStorage:", error);
  }
}

function clearStorage(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[PurchaserContext] Failed to clear localStorage:", error);
  }
}

// ============================================
// Validation Helper
// ============================================

function isInfoComplete(info: PurchaserInfo): boolean {
  const requiredFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "dateOfBirth",
    "pincode",
  ] as const;

  for (const field of requiredFields) {
    const value = info[field];
    if (!value || (typeof value === "string" && value.trim() === "")) {
      return false;
    }
  }

  return true;
}

// ============================================
// Provider Component
// ============================================

interface PurchaserProviderProps {
  children: ReactNode;
}

export function PurchaserProvider({ children }: PurchaserProviderProps) {
  const [purchaserInfo, setInfoState] =
    useState<PurchaserInfo>(defaultPurchaserInfo);
  const [hasStoredInfo, setHasStoredInfo] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setInfoState(stored);
      setHasStoredInfo(true);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever purchaserInfo changes (after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveToStorage(purchaserInfo);
    }
  }, [purchaserInfo, isHydrated]);

  const updatePurchaserInfo = useCallback((updates: Partial<PurchaserInfo>) => {
    setInfoState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const setPurchaserInfo = useCallback((info: PurchaserInfo) => {
    setInfoState(info);
    setHasStoredInfo(true);
  }, []);

  const clearPurchaserInfo = useCallback(() => {
    setInfoState(defaultPurchaserInfo);
    setHasStoredInfo(false);
    clearStorage();
  }, []);

  const value: PurchaserContextValue = {
    purchaserInfo,
    updatePurchaserInfo,
    setPurchaserInfo,
    clearPurchaserInfo,
    isInfoComplete: isInfoComplete(purchaserInfo),
    hasStoredInfo,
  };

  return (
    <PurchaserContext.Provider value={value}>
      {children}
    </PurchaserContext.Provider>
  );
}
