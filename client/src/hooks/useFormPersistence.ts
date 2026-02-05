import { useCallback } from "react";

const STORAGE_KEY_PREFIX = "ondc-form-";

interface UseFormPersistenceOptions {
  formId: string;
}

interface UseFormPersistenceReturn<T> {
  getStoredData: () => T | null;
  saveData: (data: T) => void;
  clearData: () => void;
  hasStoredData: () => boolean;
}

/**
 * Hook for persisting form data to localStorage.
 *
 * Usage:
 * - getStoredData(): Retrieve saved form data
 * - saveData(data): Save form data (call on blur per CONTEXT.md)
 * - clearData(): Remove form data (call on submission)
 * - hasStoredData(): Check if any data exists (for resume prompt)
 *
 * Storage key pattern: "ondc-form-{formId}"
 */
export function useFormPersistence<T>({
  formId,
}: UseFormPersistenceOptions): UseFormPersistenceReturn<T> {
  const storageKey = `${STORAGE_KEY_PREFIX}${formId}`;

  /**
   * Retrieve saved form data from localStorage
   */
  const getStoredData = useCallback((): T | null => {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as T) : null;
    } catch (error) {
      console.warn("[FormPersistence] Failed to load:", error);
      return null;
    }
  }, [storageKey]);

  /**
   * Save form data to localStorage (called on blur per CONTEXT.md)
   */
  const saveData = useCallback(
    (data: T) => {
      if (typeof window === "undefined") return;

      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.warn("[FormPersistence] Failed to save:", error);
      }
    },
    [storageKey]
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

  return {
    getStoredData,
    saveData,
    clearData,
    hasStoredData,
  };
}
