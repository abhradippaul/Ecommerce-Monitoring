"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Lock,
  Mail,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Camera,
  Phone,
  Building2,
  MapPin,
  Globe,
  ShoppingBag,
  FileText,
  ArrowLeft
} from "lucide-react";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type AuthTab = "login" | "register";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: z.string().min(1, { message: "Password is required." }),
});

const registerSchema = z.object({
  sellerName: z.string().min(3, { message: "Seller name must be at least 3 characters." }).trim(),
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters." }).trim(),
  email: z.string().email({ message: "Invalid email address." }).trim(),
  phoneNumber: z.string().min(5, { message: "Phone number must be at least 5 digits." }).trim(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Confirm password is required." }),
  streetAddress: z.string().min(3, { message: "Street address is required." }).trim(),
  city: z.string().min(2, { message: "City is required." }).trim(),
  stateProvince: z.string().min(2, { message: "State/Province is required." }).trim(),
  postalCode: z.string().min(2, { message: "Postal code is required." }).trim(),
  country: z.string().min(2, { message: "Country is required." }).trim(),
  storeName: z.string().min(2, { message: "Store name must be at least 2 characters." }).trim(),
  storeDescription: z.string().min(10, { message: "Store description must be at least 10 characters." }).trim(),
  storeLogoUrl: z.string().trim().optional(),
  avatarUrl: z.string().trim().optional(),
  terms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms."
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPortal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Store Logo Upload States
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Status Messages
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      sellerName: "",
      businessName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      streetAddress: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      country: "",
      storeName: "",
      storeDescription: "",
      storeLogoUrl: "",
      avatarUrl: "",
      terms: false,
    },
  });

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local Preview
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
    setIsUploadingLogo(true);
    setError("");

    try {
      const fileNameParts = file.name.split(".");
      const ext = fileNameParts[fileNameParts.length - 1].toLowerCase();
      if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
        throw new Error("Invalid file type. Only jpg, jpeg, png, and webp are allowed.");
      }

      // 1. Get presigned URL
      const response = await fetch(`/api/v1/auth/user/avatar-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileExtension: ext, role: "seller" }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to generate upload URL");
      }

      const { presignedUrl, fileName } = result.data;

      // 2. Upload file directly to S3 via XMLHttpRequest to track progress
      setUploadProgress(0);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentage);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network upload error occurred."));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload aborted."));
        });

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // 3. Set the S3 filename key into the form values
      registerForm.setValue("storeLogoUrl", fileName);
      registerForm.setValue("avatarUrl", fileName);
      setSuccess("Store logo uploaded successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to upload store logo");
      setLogoPreview(null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const nextStep = async () => {
    setError("");
    if (currentStep === 1) {
      const isValid = await registerForm.trigger(["sellerName", "businessName", "email", "phoneNumber"]);
      if (isValid) setCurrentStep(2);
    } else if (currentStep === 2) {
      const isValid = await registerForm.trigger(["storeName", "storeDescription", "storeLogoUrl"]);
      if (isValid) setCurrentStep(3);
    }
  };

  const prevStep = () => {
    setError("");
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onLoginSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Login failed");
      }

      setSuccess("Login successful! Redirecting...");
      if (result.data?.access_token) {
        localStorage.setItem("access_token", result.data.access_token);
      }
      if (result.data?.refresh_token) {
        localStorage.setItem("refresh_token", result.data.refresh_token);
      }
      localStorage.setItem("user", JSON.stringify({ email: values.email, role: "seller" }));

      setTimeout(() => {
        router.push("/");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (values: RegisterValues) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    const { terms, confirmPassword, sellerName, ...registrationData } = values;

    // Helper: Split full name into first and last name
    const nameParts = sellerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Helper: Auto generate unique username from email/name
    const username = `${sellerName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      ...registrationData,
      firstName,
      lastName,
      username,
      role: "seller"
    };

    try {
      const response = await fetch(`/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Registration failed");
      }

      setSuccess("Seller account registered! Switching to sign in...");
      setTimeout(() => {
        setActiveTab("login");
        setCurrentStep(1);
        setSuccess("");
        loginForm.setValue("email", values.email);
        registerForm.reset();
        setLogoPreview(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    setError("");
    setSuccess("");
    setCurrentStep(1);
    loginForm.reset();
    registerForm.reset();
    setLogoPreview(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa] text-slate-800 font-sans antialiased selection:bg-indigo-600 selection:text-white overflow-x-hidden relative justify-between">

      {/* Background ambient lighting glows */}
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none animate-breathe-1" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[120px] pointer-events-none animate-breathe-2" />

      {/* Header */}
      <Header />

      {/* Portal Container */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 z-10">
        <Card className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-100/80 flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover:border-slate-300/80">

          {/* Accent border top glow */}
          <div className={`absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r transition-all duration-500 ${activeTab === "login"
            ? "from-indigo-500 to-purple-500"
            : "from-cyan-500 to-emerald-500"
            }`} />

          {/* Heading */}
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {activeTab === "login" ? "Welcome Back (Seller)" : "Join as Seller"}
            </h2>
            <p className="text-xs text-slate-605">
              {activeTab === "login"
                ? "Enter your credentials to access your seller account"
                : "Create a seller profile to list products and track sales"
              }
            </p>
          </div>

          {/* Form Tabs Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
            <button
              type="button"
              onClick={() => handleTabChange("login")}
              className={`flex-grow text-xs font-semibold py-2 rounded-lg transition-all duration-300 capitalize ${activeTab === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("register")}
              className={`flex-grow text-xs font-semibold py-2 rounded-lg transition-all duration-300 capitalize ${activeTab === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Create Account
            </button>
          </div>

          {/* Step Progress Indicator (For Registration Only) */}
          {activeTab === "register" && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${currentStep >= 1 ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}>1</span>
                <span className="text-[10px] font-semibold text-slate-600">Info</span>
              </div>
              <div className="h-[1px] flex-grow mx-3 bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${currentStep >= 2 ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}>2</span>
                <span className="text-[10px] font-semibold text-slate-600">Store</span>
              </div>
              <div className="h-[1px] flex-grow mx-3 bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${currentStep >= 3 ? "bg-cyan-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}>3</span>
                <span className="text-[10px] font-semibold text-slate-600">Address</span>
              </div>
            </div>
          )}

          {/* Status Alerts */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs transition-all animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs transition-all animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span className="leading-snug">{success}</span>
            </div>
          )}

          {/* Input Fields */}
          {activeTab === "login" ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">

                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                          <Input
                            placeholder="name@domain.com"
                            className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-1 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/30 transition-all duration-300"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Password</FormLabel>
                        <button type="button" className="text-[10px] font-semibold font-sans text-indigo-650 hover:text-indigo-855">
                          Forgot?
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-1 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/30 transition-all duration-300"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 text-xs font-semibold text-white rounded-xl shadow-md transition-all duration-300 flex items-center justify-center gap-2 mt-4 active:scale-98 bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/10 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Storefront</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>

              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">

                {/* STEP 1: Seller & Business Info */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">

                    <FormField
                      control={registerForm.control}
                      name="sellerName"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Seller Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                              <Input
                                placeholder="John Doe"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Business Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                              <Input
                                placeholder="Aether Concept Ltd"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Email Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                              <Input
                                type="email"
                                placeholder="seller@domain.com"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Phone Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                              <Input
                                placeholder="+1 234 567 890"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs py-2 px-5 rounded-xl shadow-md transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Next Step</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Store Details */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">

                    {/* Store Logo Widget */}
                    <FormField
                      control={registerForm.control}
                      name="storeLogoUrl"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-center justify-center space-y-2 mb-2">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 font-semibold block text-center">Store Logo</FormLabel>
                          <FormControl>
                            <div className="relative group cursor-pointer w-20 h-20 rounded-full border-2 border-dashed border-slate-300 hover:border-cyan-500 transition-all duration-300 flex items-center justify-center overflow-hidden bg-slate-50 shadow-inner">
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                onChange={handleLogoChange}
                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                disabled={isUploadingLogo}
                              />
                              {logoPreview ? (
                                <img
                                  src={logoPreview}
                                  alt="Store Logo"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-cyan-600 transition-colors">
                                  <Camera className="h-6 w-6" />
                                  <span className="text-[8px] mt-1 font-bold uppercase tracking-wider">Logo</span>
                                </div>
                              )}

                              {isUploadingLogo && (
                                <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center z-10 p-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-white mb-1" />
                                  <span className="text-[9px] font-bold text-white font-mono">{uploadProgress}%</span>
                                </div>
                              )}
                            </div>
                          </FormControl>

                          {isUploadingLogo && (
                            <div className="w-full max-w-[180px] space-y-1.5 mt-1 transition-all mx-auto">
                              <div className="flex justify-between items-center text-[9px] font-medium font-sans">
                                <span className="text-slate-500">Uploading logo...</span>
                                <span className="text-cyan-600 font-mono font-bold">{uploadProgress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-200 ease-out rounded-full"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="storeName"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Store Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <ShoppingBag className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                              <Input
                                placeholder="Aether Store"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="storeDescription"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Store Description</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                              <Input
                                placeholder="High quality designer items and home goods."
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2 flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs py-2 px-5 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back</span>
                      </Button>
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs py-2 px-5 rounded-xl shadow-md transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Next Step</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Address Details & Security */}
                {currentStep === 3 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">

                    <FormField
                      control={registerForm.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Street Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                              <Input
                                placeholder="123 Market St"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={registerForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">City</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                                <Input
                                  placeholder="San Francisco"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="stateProvince"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">State/Province</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                                <Input
                                  placeholder="CA"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={registerForm.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Postal Code</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                                <Input
                                  placeholder="94103"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Country</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                                <Input
                                  placeholder="United States"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 z-10" />
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50 transition-all duration-300"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="terms"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-1 pt-1">
                          <div className="flex items-start gap-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded bg-white border-slate-300 text-cyan-600 focus:ring-0 focus:ring-offset-0 mt-0.5"
                              />
                            </FormControl>
                            <FormLabel className="text-[10px] text-slate-655 leading-normal cursor-pointer font-sans select-none font-semibold">
                              I agree to the terms of service and privacy policy guidelines.
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2 flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs py-2 px-5 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Back</span>
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs py-2 px-5 rounded-xl shadow-md transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <span>Create Account</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

              </form>
            </Form>
          )}
        </Card>
      </main>

      {/* Footer */}
      <Footer text="Ecommerce Monitoring. Seller Client Portal." />
    </div>
  );
}
