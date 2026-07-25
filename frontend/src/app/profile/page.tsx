"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authenticatedFetch } from "@/lib/api";
import { uploadAvatarAndGetPreview, getPreviewPresignedUrl, UserRole } from "@/lib/fileService";
import { useToast } from "@/components/ui/toast";
import {
  User,
  Building2,
  MapPin,
  Camera,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Edit2,
  Save,
  X
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

const profileFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20).trim(),
  email: z.string().email("Invalid email address").trim(),
  phoneNumber: z.string().trim(),
  businessName: z.string().trim().optional(),
  streetAddress: z.string().trim().optional(),
  city: z.string().trim().optional(),
  stateProvince: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().optional(),
  storeName: z.string().trim().optional(),
  storeDescription: z.string().trim().optional(),
  storeLogoUrl: z.string().trim().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function ProfilePageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Avatar Upload States
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profileDetailed"],
    queryFn: async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return null;
      const res = await authenticatedFetch(`/api/v1/auth/profile/detailed`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      const resData = await res.json();
      return resData.data;
    },
    retry: false,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      email: "",
      phoneNumber: "",
      businessName: "",
      streetAddress: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      country: "",
      storeName: "",
      storeDescription: "",
      storeLogoUrl: "",
    },
  });

  // Reset form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username || "",
        email: profile.email || "",
        phoneNumber: profile.phoneNumber || "",
        businessName: profile.businessName || "",
        streetAddress: profile.streetAddress || "",
        city: profile.city || "",
        stateProvince: profile.stateProvince || "",
        postalCode: profile.postalCode || "",
        country: profile.country || "",
        storeName: profile.storeName || "",
        storeDescription: profile.storeDescription || "",
        storeLogoUrl: profile.storeLogoUrl || "",
      });
      if (profile.avatarUrl) {
        if (profile.avatarUrl.startsWith("http")) {
          setAvatarPreview(profile.avatarUrl);
        } else {
          getPreviewPresignedUrl(profile.avatarUrl)
            .then((res) => setAvatarPreview(res.preview_url))
            .catch(() => setAvatarPreview(profile.avatarUrl));
        }
      }
    }
  }, [profile, form]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setIsUploadingAvatar(true);

    try {
      const fileNameParts = file.name.split(".");
      const ext = fileNameParts[fileNameParts.length - 1].toLowerCase();
      if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
        throw new Error("Invalid file type. Only jpg, jpeg, png, and webp are allowed.");
      }

      // Upload via File-Service & get preview presigned URL from File-Service
      const { fileName, previewUrl } = await uploadAvatarAndGetPreview({
        file,
        role: (profile.role || "buyer") as UserRole,
        onProgress: (progress) => setUploadProgress(progress),
      });

      // Update UI preview URL returned from File-Service
      setAvatarPreview(previewUrl);

      // Update avatarUrl in backend
      const userId = profile.user_id || profile._id || profile.id;
      const updateResponse = await authenticatedFetch(`/api/v1/auth/profile/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatarUrl: fileName }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to save avatar configuration");
      }

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.avatarUrl = previewUrl;
          localStorage.setItem("user", JSON.stringify(parsed));
          window.dispatchEvent(new Event("storage"));
        } catch {
          // ignore
        }
      }

      toast("Profile photo updated successfully!", "success");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profileDetailed"] });
    } catch (err: any) {
      toast(err.message || "Failed to upload photo", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE
        ? (process.env.NEXT_PUBLIC_AUTH_SERVICE.startsWith("http")
          ? process.env.NEXT_PUBLIC_AUTH_SERVICE
          : `http://${process.env.NEXT_PUBLIC_AUTH_SERVICE}`)
        : "http://localhost:3002";

      const response = await authenticatedFetch(`${AUTH_SERVICE_URL}/api/v1/auth/profile/${profile.user_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to update profile");
      }
      return result.data;
    },
    onSuccess: () => {
      toast("Profile updated successfully!", "success");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profileDetailed"] });
    },
    onError: (err: any) => {
      toast(err.message || "Failed to update profile", "error");
    }
  });

  const onSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8f9fa] justify-between">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-500 font-mono">Loading profile details...</p>
          </div>
        </main>
        <Footer text="Ecommerce Monitoring. User Portal." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8f9fa] justify-between">
        <Header />
        <main className="flex-grow flex items-center justify-center px-6">
          <Card className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-100/80 text-center flex flex-col items-center gap-5">
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">Sign In Required</h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Please log in to your account to view and update your profile details.
              </p>
            </div>
            <Button
              onClick={() => router.push("/auth/buyer")}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Sign In Page
            </Button>
          </Card>
        </main>
        <Footer text="Ecommerce Monitoring. User Portal." />
      </div>
    );
  }

  const isSeller = profile.role === "seller";

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa] text-slate-800 font-sans antialiased selection:bg-indigo-600 selection:text-white overflow-x-hidden relative justify-between">

      {/* Background ambient lighting glows */}
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none animate-breathe-1" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[120px] pointer-events-none animate-breathe-2" />

      {/* Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 z-10">
        <Card className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-100/80 flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover:border-slate-300/80">

          {/* Top accent glow line */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-indigo-500 to-purple-500" />

          {/* Title Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="p-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {profile.firstName} {profile.lastName}
                </h2>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className={`text-[9px] uppercase font-mono tracking-wider font-bold px-2 py-0.5 rounded ${isSeller ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                    {profile.role}
                  </span>
                  {profile.createdAt && (
                    <span className="text-[10px] text-slate-450 font-mono font-medium">Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Profile</span>
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      form.reset();
                    }}
                    className="border-slate-200 hover:bg-slate-50 text-slate-650 font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={updateProfileMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <div className="flex flex-col md:flex-row gap-8">

                {/* Left Panel: Profile Picture & Metadata */}
                <div className="flex flex-col items-center shrink-0 w-full md:w-48 gap-4">
                  <div className="relative group w-32 h-32 rounded-full border-2 border-slate-200 overflow-hidden shadow-inner flex items-center justify-center bg-slate-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                      disabled={isUploadingAvatar}
                    />
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-slate-400 font-bold text-xl uppercase">
                        {profile.firstName?.[0] || profile.email?.[0]}
                      </div>
                    )}

                    {/* Hover Upload Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <Camera className="h-6 w-6" />
                      <span className="text-[8px] uppercase tracking-wider font-bold mt-1">Upload</span>
                    </div>

                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center z-10 p-2">
                        <Loader2 className="h-5 w-5 animate-spin text-white mb-1" />
                        <span className="text-[9px] font-bold text-white font-mono">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-800">@{form.watch("username")}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{profile.email}</p>
                  </div>
                </div>

                {/* Right Panel: Fields Grid */}
                <div className="flex-grow space-y-6">

                  {/* Personal & Contact Details */}
                  <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-750 flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-650" />
                      <span>Personal & Contact Information</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* First name & Last name are READ-ONLY */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block font-semibold">First Name</label>
                        <Input
                          value={profile.firstName || ""}
                          disabled
                          className="w-full bg-slate-100 border-slate-200 text-slate-550 rounded-xl px-4 py-2.5 text-xs cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block font-semibold">Last Name</label>
                        <Input
                          value={profile.lastName || ""}
                          disabled
                          className="w-full bg-slate-100 border-slate-200 text-slate-550 rounded-xl px-4 py-2.5 text-xs cursor-not-allowed"
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Username</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="username"
                                disabled={!isEditing}
                                className={`w-full text-slate-900 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300 ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300"
                                  }`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Email Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="email@domain.com"
                                disabled={!isEditing}
                                className={`w-full text-slate-900 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300 ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300"
                                  }`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5 sm:col-span-2">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+1 234 567 890"
                                disabled={!isEditing}
                                className={`w-full text-slate-900 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300 ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300"
                                  }`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Business & Store Details (Sellers Only) */}
                  {isSeller && (
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-750 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-650" />
                        <span>Business & Storefront Details</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="businessName"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Business Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Acme Business Ltd"
                                  disabled={!isEditing}
                                  className={`w-full text-slate-900 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300 ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300"
                                    }`}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="storeName"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Store Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Acme Digital Store"
                                  disabled={!isEditing}
                                  className={`w-full text-slate-900 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300 ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300"
                                    }`}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="storeDescription"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5 sm:col-span-2">
                              <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Store Description</FormLabel>
                              <FormControl>
                                <textarea
                                  rows={3}
                                  placeholder="Enter your store tagline, descriptions..."
                                  disabled={!isEditing}
                                  className={`w-full text-slate-900 rounded-xl p-3 text-xs focus-visible:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/35 transition-all duration-300 resize-none font-sans ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border border-slate-300"
                                    }`}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Address Details (Buyers & Sellers) */}
                  <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-750 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-650" />
                      <span>Address Information</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5 sm:col-span-2">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Street Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="123 Shopping Way"
                                disabled={!isEditing}
                                className={`w-full text-slate-900 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300 ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300"
                                  }`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">City</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="New York"
                                disabled={!isEditing}
                                className={`w-full text-slate-900 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300 ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300"
                                  }`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stateProvince"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">State / Province</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="NY"
                                disabled={!isEditing}
                                className={`w-full text-slate-900 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300 ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300"
                                  }`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Postal Code</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="10001"
                                disabled={!isEditing}
                                className={`w-full text-slate-900 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300 ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300"
                                  }`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Country</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="United States"
                                disabled={!isEditing}
                                className={`w-full text-slate-900 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300 ${!isEditing ? "bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed" : "bg-white border-slate-300"
                                  }`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                </div>

              </div>

            </form>
          </Form>

        </Card>
      </main>

      {/* Footer */}
      <Footer text="Ecommerce Monitoring. User Portal." />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen bg-[#f8f9fa] justify-between">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-550 font-mono">Loading...</p>
          </div>
        </main>
        <Footer text="Ecommerce Monitoring. User Portal." />
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}
