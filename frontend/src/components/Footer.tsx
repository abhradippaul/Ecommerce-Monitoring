"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface FooterProps {
  text: string;
}

export function Footer({ text }: FooterProps) {
  return (
    <footer className="border-t border-zinc-900/60 bg-zinc-950/30 py-6 text-center text-[10px] text-zinc-650 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>{text}</span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-indigo-500" /> Powered by HashiCorp Vault.
        </span>
      </div>
    </footer>
  );
}
