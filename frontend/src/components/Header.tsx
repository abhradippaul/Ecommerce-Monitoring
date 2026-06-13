"use client";

import React from "react";
import { ShoppingBag, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  showActions?: boolean;
  cartCount?: number;
  setIsCartOpen?: (open: boolean) => void;
  bounceBadge?: boolean;
}

export function Header({
  showActions = false,
  cartCount = 0,
  setIsCartOpen,
  bounceBadge = false
}: HeaderProps) {
  return (
    <header className="border-b border-zinc-900/60 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-40 px-8 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-650 rounded-xl shadow-lg shadow-indigo-900/35">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-wider text-white uppercase font-heading flex items-center gap-1.5">
              Ecommerce Monitoring
            </h1>
            <p className="text-[10px] text-zinc-500 font-medium font-mono">buyer client</p>
          </div>
        </div>

        {/* Optional Actions (For Storefront Home Page) */}
        {showActions && (
          <div className="flex items-center gap-4 animate-fade-in-up">
            {/* Login / Auth link */}
            <Button
              variant="outline"
              asChild
              className="bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 hover:text-white text-zinc-400 text-xs font-semibold rounded-xl shadow-sm h-10 px-4"
            >
              <a href="/auth/buyer">
                <User className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Sign In</span>
              </a>
            </Button>

            {/* Cart Button */}
            <Button
              variant="outline"
              onClick={() => setIsCartOpen && setIsCartOpen(true)}
              className="bg-zinc-900/40 border-zinc-800 hover:border-indigo-500/30 hover:bg-zinc-900/80 text-white text-xs font-semibold rounded-xl shadow-sm h-10 px-4 relative group"
            >
              <ShoppingCart className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform duration-300 mr-2" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white border-2 border-[#07080d] shadow-md shadow-indigo-600/30 transition-transform duration-300 ${
                  bounceBadge ? "scale-125 bg-purple-600" : "scale-100"
                }`}>
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        )}

      </div>
    </header>
  );
}
