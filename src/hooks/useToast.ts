import { useState, useCallback } from "react";
import type { ToastState } from "@/lib/types";

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "error") => {
      setToast({ message, type });
    },
    [],
  );

  const clearToast = useCallback(() => setToast(null), []);

  return { toast, showToast, clearToast };
}
