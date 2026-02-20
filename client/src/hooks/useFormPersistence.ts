import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY_PREFIX = "ondc-form-";
const DEFAULT_DEBOUNCE_MS = 500;

interface UseFormPersistenceOptions {
  formId: string;
  debounceMs?: number;
}

interface StoredFormData<T> {
  formData: T;
  currentStep: number;
  savedAt: number;
}

interface UseFormPersistenceReturn<T> {
  getStoredData: () => { formData: T; currentStep: number } | null;
  saveData: (data: T, currentStep: number) => void;
  debouncedSave: (data: T, currentStep: number) => void;
  clearData: () => void;
  hasStoredData: () => boolean;
}

/**
 * Hook for persisting form data and current step to localStorage.
 *
 * Usage:
 * - getStoredData(): Retrieve saved form data + step
 * - saveData(data, step): Save form data and current step
 * - clearData(): Remove form data (call on submission)
 * - hasStoredData(): Check if any data exists (for resume prompt)
 *
 * Storage key pattern: "ondc-form-{formId}"
 */
export function useFormPersistence<T>({
  formId,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseFormPersistenceOptions): UseFormPersistenceReturn<T> {
  const storageKey = `${STORAGE_KEY_PREFIX}${formId}`;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Retrieve saved form data and step from localStorage
   */
  const getStoredData = useCallback((): {
    formData: T;
    currentStep: number;
  } | null => {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored);

      // Handle legacy format (plain form data without wrapper)
      if (parsed && !("formData" in parsed)) {
        return { formData: parsed as T, currentStep: 0 };
      }

      const { formData, currentStep } = parsed as StoredFormData<T>;
      return { formData, currentStep };
    } catch (error) {
      console.warn("[FormPersistence] Failed to load:", error);
      return null;
    }
  }, [storageKey]);

  /**
   * Save form data and current step to localStorage
   */
  const saveData = useCallback(
    (data: T, currentStep: number) => {
      if (typeof window === "undefined") return;

      try {
        const payload: StoredFormData<T> = {
          formData: data,
          currentStep,
          savedAt: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (error) {
        console.warn("[FormPersistence] Failed to save:", error);
      }
    },
    [storageKey],
  );

  /**
   * Remove form data from localStorage
   */
  const clearData = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn("[FormPersistence] Failed to clear:", error);
    }
  }, [storageKey]);

  /**
   * Check if any data exists (for resume prompt)
   */
  const hasStoredData = useCallback(() => {
    return getStoredData() !== null;
  }, [getStoredData]);

  /**
   * Debounced save - call on every change (e.g., watch callback).
   * Coalesces rapid updates into a single localStorage write.
   */
  const debouncedSave = useCallback(
    (data: T, currentStep: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        saveData(data, currentStep);
      }, debounceMs);
    },
    [saveData, debounceMs],
  );

  return {
    getStoredData,
    saveData,
    debouncedSave,
    clearData,
    hasStoredData,
  };
}
