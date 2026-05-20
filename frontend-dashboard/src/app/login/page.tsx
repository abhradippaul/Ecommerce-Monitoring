"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/login/login-form";
import { ClusterMonitor } from "@/components/login/cluster-monitor";
import { Activity, Sun, Moon } from "lucide-react";

export default function LoginPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Keep track of mount state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <Activity className="size-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative min-h-screen w-full flex flex-col md:flex-row overflow-hidden bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50 transition-colors duration-300">

      {/* 1. TOP FLOATING THEME TOGGLER */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full shadow-sm bg-white dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 transition-all hover:scale-105"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="size-4 text-amber-400 animate-pulse" />
          ) : (
            <Moon className="size-4 text-indigo-600" />
          )}
        </Button>
      </div>

      {/* 2. LEFT PANE: LOGIN FORM CONTROLLER */}
      <div className="w-full md:w-[45%] flex flex-col justify-center items-center px-6 py-12 md:px-12 xl:px-16 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/20 backdrop-blur-3xl relative z-10">

        {/* Decorative ambient background lights */}
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 dark:bg-indigo-600/10 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-emerald-500/5 dark:bg-emerald-600/5 blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md space-y-8 relative z-20">

          {/* Logo & Header */}
          <div className="flex flex-col items-center md:items-start space-y-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 dark:shadow-indigo-900/30 text-white">
              <Activity className="size-5 animate-pulse" />
            </div>
            <div className="space-y-1.5 text-center md:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                NodeJS Server Monitor
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Enter your administrative credentials to access metrics dashboard
              </p>
            </div>
          </div>

          {/* Form */}
          <LoginForm onSuccess={() => console.log("Login Success!")} />

          {/* Footer Rights */}
          <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500">
            NodeJS Cluster Monitor and Dashboard Client. Secure link active. Copyright © 2026.
          </p>
        </div>
      </div>

      {/* 3. RIGHT PANE: CLUSTER DASHBOARD VISUALIZER */}
      <ClusterMonitor />

    </div>
  );
}
