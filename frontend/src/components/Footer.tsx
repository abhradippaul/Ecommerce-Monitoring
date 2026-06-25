"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface FooterProps {
  text: string;
}

export function Footer({ text }: FooterProps) {
  return (
    <footer className="border-t border-slate-200/60 bg-white/40 py-6 text-center text-[10px] text-slate-500 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>{text}</span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-indigo-500" /> Powered by HashiCorp Vault.
        </span>
      </div>
    </footer>
  );
}
