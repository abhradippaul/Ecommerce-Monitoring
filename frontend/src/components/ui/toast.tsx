"use client";

import React from "react";
import { toast as sonnerToast } from "sonner";

type ToastType = "success" | "error" | "info" | "warning";

export const toast = (message: string, type: ToastType = "info") => {
  if (type === "success") {
    sonnerToast.success(message);
  } else if (type === "error") {
    sonnerToast.error(message);
  } else if (type === "warning") {
    sonnerToast.warning(message);
  } else {
    sonnerToast(message);
  }
};

export function useToast() {
  return { toast };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
