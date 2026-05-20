"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from "lucide-react";

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Form Status
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const validateForm = () => {
    let isValid = true;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email address is required");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
    }

    // Validate password
    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setStatus("loading");
    setStatusMessage("Authenticating server credentials...");

    // Simulate Server Authentication API request
    setTimeout(() => {
      if (email === "admin@monitor.io" || email.includes("@")) {
        setStatus("success");
        setStatusMessage("Authentication successful. Redirecting to cluster...");
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setStatus("error");
        setStatusMessage("Invalid credentials. Please verify server access token.");
      }
    }, 1800);
  };

  return (
    <div className="w-full max-w-md space-y-8 relative z-20">

      {/* Form Card */}
      <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-xl shadow-zinc-200/30 dark:shadow-none backdrop-blur-md rounded-2xl overflow-visible">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg font-semibold">Sign In</CardTitle>
          <CardDescription className="text-xs">
            Provide authorization details matching your node cluster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoginSubmit} className="space-y-4">

            {/* Form Alert Message */}
            {status !== "idle" && (
              <div
                className={`p-3 rounded-lg flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-300 ${status === "loading"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    : status === "success"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-destructive/10 text-destructive dark:text-destructive/90 border border-destructive/20"
                  }`}
              >
                {status === "loading" && <RefreshCw className="size-4 animate-spin text-zinc-500 shrink-0 mt-0.5" />}
                {status === "success" && <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />}
                {status === "error" && <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />}
                <span className="font-medium">{statusMessage}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="email" className="text-xs text-zinc-600 dark:text-zinc-300">
                  Security Email
                </Label>
                {emailError && (
                  <span className="text-[10px] text-destructive font-medium animate-pulse">{emailError}</span>
                )}
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-zinc-400 dark:text-zinc-500" />
                <Input
                  id="email"
                  type="text"
                  placeholder="admin@monitor.io"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  disabled={status === "loading" || status === "success"}
                  className="pl-9 h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs text-zinc-600 dark:text-zinc-300">
                  Access Token / Password
                </Label>
                <a
                  href="#forgot"
                  onClick={(e) => e.preventDefault()}
                  className="text-[10px] text-indigo-500 dark:text-indigo-400 hover:underline hover:text-indigo-600"
                >
                  Forgot Token?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-zinc-400 dark:text-zinc-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  disabled={status === "loading" || status === "success"}
                  className="pl-9 pr-9 h-9 text-xs border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={status === "loading" || status === "success"}
                  className="absolute right-3 top-2.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-[10px] text-destructive font-medium mt-1 animate-pulse">{passwordError}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={status === "loading" || status === "success"}
                className="size-3.5 rounded border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              <Label
                htmlFor="remember"
                className="text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer select-none font-normal"
              >
                Remember authorization for this browser session
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={status === "loading" || status === "success"}
              className="w-full h-9 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20 dark:shadow-none transition-all hover:scale-[1.01] active:scale-100 disabled:opacity-75 disabled:pointer-events-none mt-2"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="size-3.5 animate-spin" />
                  Authorizing Server Security Link...
                </span>
              ) : status === "success" ? (
                <span className="flex items-center gap-1.5">
                  Success
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Authorize Access
                  <ArrowRight className="size-3.5 group-hover/button:translate-x-0.5 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          {/* Developer Test Credentials tip */}
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Dev Tip: Use <strong className="text-zinc-600 dark:text-zinc-300 font-semibold">admin@monitor.io</strong> with any 6+ char password to authenticate.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Alternative Auth / SSO */}
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-[#09090b] px-2 text-zinc-400 dark:text-zinc-500">
              Or Access Agent API via SSO
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            type="button"
            className="h-9 text-xs rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            onClick={() => {
              setEmail("admin@monitor.io");
              setPassword("password123");
            }}
          >
            GitHub Security Key
          </Button>
          <Button
            variant="outline"
            type="button"
            className="h-9 text-xs rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            onClick={() => {
              setEmail("admin@monitor.io");
              setPassword("password123");
            }}
          >
            Local Dev Key
          </Button>
        </div>
      </div>
    </div>
  );
}
