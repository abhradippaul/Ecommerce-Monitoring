"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  User,
  Loader2
} from "lucide-react";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type AuthTab = "login" | "register";

export default function AuthPortal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate server sign-in latency and redirect to storefront homepage /
    setTimeout(() => {
      setIsLoading(false);
      router.push("/");
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#07080d] text-[#a4a9c6] font-sans antialiased selection:bg-indigo-650 selection:text-white overflow-x-hidden relative justify-between">

      {/* Background ambient lighting glows with slow breathing animations */}
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-950/15 rounded-full blur-[150px] pointer-events-none animate-breathe-1" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-purple-950/15 rounded-full blur-[150px] pointer-events-none animate-breathe-2" />

      {/* Header */}
      <Header />

      {/* Portal Container */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 z-10">
        <Card className="w-full max-w-md bg-zinc-900/25 border border-zinc-900 rounded-3xl p-8 shadow-2xl backdrop-blur-lg flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover:border-zinc-800/60">

          {/* Accent border top glow */}
          <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r transition-all duration-500 ${activeTab === "login"
            ? "from-indigo-500 to-purple-500"
            : "from-cyan-500 to-emerald-500"
            }`} />

          {/* Heading */}
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {activeTab === "login" ? "Welcome Back" : "Join Aether Concept"}
            </h2>
            <p className="text-xs text-zinc-500">
              {activeTab === "login"
                ? "Enter your credentials to access your buyer account"
                : "Create a buyer profile to save items and place orders"
              }
            </p>
          </div>

          {/* Form Tabs Switcher */}
          <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-900/80">
            <button
              onClick={() => {
                setActiveTab("login");
                setEmail("");
                setPassword("");
              }}
              className={`flex-grow text-xs font-semibold py-2 rounded-lg transition-all duration-300 capitalize ${activeTab === "login"
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("register");
                setEmail("");
                setPassword("");
                setName("");
              }}
              className={`flex-grow text-xs font-semibold py-2 rounded-lg transition-all duration-300 capitalize ${activeTab === "register"
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
                }`}
            >
              Create Account
            </button>
          </div>

          {/* Input Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {activeTab === "register" && (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-650 z-10" />
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-950/60 border-zinc-900 focus:border-cyan-500/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-650 focus-visible:ring-cyan-500/30 transition-all duration-300"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-650 z-10" />
                <Input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-zinc-950/60 border-zinc-900 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-650 focus-visible:ring-1 transition-all duration-300 ${activeTab === "login"
                    ? "focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/30"
                    : "focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/30"
                    }`}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 block">Password</label>
                {activeTab === "login" && (
                  <button type="button" className="text-[9px] font-mono text-indigo-400 hover:text-indigo-300">
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-650 z-10" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-zinc-950/60 border-zinc-900 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-650 focus-visible:ring-1 transition-all duration-300 ${activeTab === "login"
                    ? "focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/30"
                    : "focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/30"
                    }`}
                  required
                />
              </div>
            </div>

            {/* Checkbox agreement for sign up */}
            {activeTab === "register" && (
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="terms"
                  className="rounded bg-zinc-950 border-zinc-900 text-cyan-600 focus:ring-0 focus:ring-offset-0 mt-0.5"
                  required
                />
                <label htmlFor="terms" className="text-[10px] text-zinc-500 leading-normal">
                  I agree to the terms of service and privacy policy guidelines.
                </label>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 text-xs font-semibold text-white rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 mt-4 active:scale-98 ${activeTab === "login"
                ? "bg-indigo-650 hover:bg-indigo-600 hover:shadow-indigo-600/15"
                : "bg-cyan-600 hover:bg-cyan-500 hover:shadow-cyan-500/15"
                }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{activeTab === "login" ? "Enter Storefront" : "Create Account"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>

          </form>
        </Card>
      </main>

      {/* Footer */}
      <Footer text="Ecommerce Monitoring. Buyer Client Portal." />
    </div>
  );
}
