"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { authenticatedFetch } from "@/lib/api";
import { uploadAvatarAndGetPreview, uploadFileToS3, getItemServiceBaseUrl, getItemServicePreviewPresignedUrl } from "@/lib/fileService";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/ui/toast";
import {
  Package,
  DollarSign,
  Layers,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  Tag,
  FileText,
  Truck,
  ShieldCheck,
  Scale,
  Image as ImageIcon,
  Ruler,
  Palette,
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

const itemFormSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }).trim(),
  sku: z.string().min(1, { message: "SKU is required." }).trim(),
  category: z.string().min(1, { message: "Category is required." }).trim(),
  brand: z.string().min(1, { message: "Brand is required." }).trim(),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }).trim(),
  price: z.number({ invalid_type_error: "Price must be a number." }).positive({ message: "Price must be a positive number." }),
  discountPrice: z.number().nonnegative({ message: "Discount price must be non-negative." }).nullable().optional(),
  quantity: z.number({ invalid_type_error: "Quantity must be a number." }).int().nonnegative({ message: "Quantity must be non-negative." }),
  images: z.string().trim().optional(),
  weight: z.number().positive({ message: "Weight must be a positive number." }).nullable().optional(),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  shippingCharges: z.number().nonnegative({ message: "Shipping charges must be non-negative." }).nullable().optional(),
  returnPolicy: z.string().nullable().optional(),
  warrantyInfo: z.string().nullable().optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface UploadingImage {
  id: string;
  file?: File;
  previewUrl: string;
  s3Url?: string;
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
}

export default function PostItemPage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSeller, setIsSeller] = useState(false);
  const { toast } = useToast();

  // Media upload states
  const [mediaList, setMediaList] = useState<UploadingImage[]>([]);

  // Category states
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      brand: "",
      description: "",
      price: 0,
      discountPrice: null,
      quantity: 0,
      images: "",
      weight: null,
      color: "",
      size: "",
      material: "",
      shippingCharges: null,
      returnPolicy: "",
      warrantyInfo: "",
    },
  });

  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return null;
      const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE 
        ? (process.env.NEXT_PUBLIC_AUTH_SERVICE.startsWith("http") 
            ? process.env.NEXT_PUBLIC_AUTH_SERVICE 
            : `http://${process.env.NEXT_PUBLIC_AUTH_SERVICE}`)
        : "http://localhost:3002";
      const res = await authenticatedFetch(`${AUTH_SERVICE_URL}/api/v1/auth/profile`);
      if (!res.ok) throw new Error("Failed to authenticate");
      const resData = await res.json();
      return resData.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (profileData) {
      if (profileData.role === "seller") {
        setIsSeller(true);
      }
      setIsAuthChecking(false);
    } else if (profileData === null || (!isLoadingProfile && !profileData)) {
      setIsAuthChecking(false);
    }
  }, [profileData, isLoadingProfile]);

  // Multi-image upload handlers
  const uploadSingleFile = async (file: File, id: string) => {
    try {
      const fileNameParts = file.name.split(".");
      const ext = fileNameParts[fileNameParts.length - 1].toLowerCase();
      if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
        throw new Error("Invalid file type. Only jpg, jpeg, png, and webp are allowed.");
      }

      setMediaList((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, status: "uploading" as const, progress: 0 } : img
        )
      );

      // 1. Directly fetch presigned upload URL from Item-Service
      const ITEM_SERVICE_URL = getItemServiceBaseUrl();
      const presignedRes = await fetch(`${ITEM_SERVICE_URL}/presigned-url?fileExtension=${encodeURIComponent(ext)}`);
      
      const presignedData = await presignedRes.json();
      if (!presignedRes.ok || !presignedData.data?.uploadUrl) {
        throw new Error(presignedData.error || presignedData.message || "Failed to get presigned upload URL");
      }

      const { fileName: key, uploadUrl } = presignedData.data;

      // 2. Direct binary upload to S3 via presigned PUT URL
      await uploadFileToS3(uploadUrl, file, (percentage) => {
        setMediaList((prev) =>
          prev.map((img) =>
            img.id === id ? { ...img, progress: percentage } : img
          )
        );
      });

      // 3. Get preview presigned URL from Item-Service
      const { preview_url: previewUrl } = await getItemServicePreviewPresignedUrl(key);

      // Update state to success with preview URL or key
      setMediaList((prev) => {
        const next = prev.map((img) =>
          img.id === id ? { ...img, status: "success" as const, s3Url: key, previewUrl, progress: 100 } : img
        );
        // Sync with form value (use previewUrl if available, else s3Url)
        const urls = next
          .filter((m) => m.status === "success" && (m.previewUrl || m.s3Url))
          .map((m) => m.previewUrl || m.s3Url!)
          .join(", ");
        form.setValue("images", urls, { shouldValidate: true });
        return next;
      });

    } catch (err: any) {
      console.error("Upload error for file:", file.name, err);
      toast(`Upload error for file: ${file.name}`, "error");
      setMediaList((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, status: "error" as const } : img
        )
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newMediaItems: UploadingImage[] = files.map((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        id,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "idle" as const,
        progress: 0,
      };
    });

    setMediaList((prev) => [...prev, ...newMediaItems]);

    // Start uploads concurrently
    newMediaItems.forEach((item) => {
      if (item.file) {
        uploadSingleFile(item.file, item.id);
      }
    });
  };

  const deleteImage = (id: string) => {
    setMediaList((prev) => {
      const next = prev.filter((img) => img.id !== id);
      const urls = next
        .filter((m) => m.status === "success" && (m.previewUrl || m.s3Url))
        .map((m) => m.previewUrl || m.s3Url!)
        .join(", ");
      form.setValue("images", urls, { shouldValidate: true });
      return next;
    });
  };

  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const isGateway = typeof window !== "undefined" && (window.location.port === "" || window.location.port === "80");
      const CATEGORIES_URL = isGateway 
        ? "/api/v1/items/categories" 
        : "http://localhost:3001/api/v1/items/categories";
      
      const response = await fetch(CATEGORIES_URL);
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const result = await response.json();
      return (result.data || []) as { _id?: string; name: string }[];
    },
  });


  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const isGateway = typeof window !== "undefined" && (window.location.port === "" || window.location.port === "80");
      const ITEM_SERVICE_URL = isGateway 
        ? "/api/v1/items" 
        : "http://localhost:3001/api/v1/items";

      const response = await authenticatedFetch(ITEM_SERVICE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to create item");
      }
      return result.data;
    },
    onSuccess: () => {
      toast("Product posted successfully! Redirecting to catalog...", "success");
      form.reset();
      setMediaList([]);
      setTimeout(() => {
        router.push("/catalog");
      }, 1500);
    },
    onError: (err: any) => {
      toast(err.message || "An unexpected error occurred", "error");
    }
  });

  const onSubmit = async (values: ItemFormValues) => {
    const payload = {
      name: values.name,
      sku: values.sku || null,
      category: values.category || null,
      brand: values.brand || null,
      description: values.description || null,
      price: Number(values.price),
      discountPrice: values.discountPrice !== null && values.discountPrice !== undefined ? Number(values.discountPrice) : null,
      quantity: Number(values.quantity),
      images: values.images
        ? values.images.split(/[\n,]+/).map(url => url.trim()).filter(Boolean)
        : [],
      weight: values.weight !== null && values.weight !== undefined ? Number(values.weight) : null,
      dimensions: null,
      color: values.color || null,
      size: values.size || null,
      material: values.material || null,
      shippingCharges: values.shippingCharges !== null && values.shippingCharges !== undefined ? Number(values.shippingCharges) : null,
      returnPolicy: values.returnPolicy || null,
      warrantyInfo: values.warrantyInfo || null,
    };

    createProductMutation.mutate(payload);
  };

  if (isAuthChecking) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8f9fa] justify-between">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-500 font-mono">Validating credentials...</p>
          </div>
        </main>
        <Footer text="Ecommerce Monitoring. Seller Portal." />
      </div>
    );
  }

  if (!isSeller) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8f9fa] justify-between">
        <Header />
        <main className="flex-grow flex items-center justify-center px-6">
          <Card className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-100/80 text-center flex flex-col items-center gap-5">
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-500">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                You must be logged in as a verified Seller to post items to the inventory.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full pt-2">
              <Button
                onClick={() => router.push("/auth/seller")}
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-750 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Go to Seller Portal
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="w-full py-2.5 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"
              >
                Go to Homepage
              </Button>
            </div>
          </Card>
        </main>
        <Footer text="Ecommerce Monitoring. Seller Portal." />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa] text-slate-800 font-sans antialiased selection:bg-indigo-600 selection:text-white overflow-x-hidden relative justify-between">
      
      {/* Background Glows */}
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none animate-breathe-1" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[120px] pointer-events-none animate-breathe-2" />

      {/* Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 z-10">
        <Card className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-100/80 flex flex-col gap-6 relative overflow-hidden transition-all duration-300 hover:border-slate-300/80">
          
          {/* Top accent glow line */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-indigo-500 to-purple-500" />

          {/* Heading */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="p-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/50 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="space-y-0.5">
              <h2 className="text-md font-bold tracking-tight text-slate-900">Post New Product</h2>
              <p className="text-[10px] text-slate-500 font-mono font-semibold">Catalog & Inventory Management</p>
            </div>
          </div>



          {/* Item details Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Column 1: Primary Info & Media */}
                <div className="space-y-6">
                  
                  {/* Primary Info Block */}
                  <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-750 flex items-center gap-2">
                      <Package className="h-4 w-4 text-indigo-600" />
                      <span>Primary Information</span>
                    </h3>

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Product Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Premium Wireless Headphones"
                              className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">SKU</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Tag className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                              <Input
                                placeholder="TECH-WHP-001"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
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
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5 relative">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Category</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Layers className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                                <button
                                  type="button"
                                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                  className="w-full bg-white border border-slate-300 text-left text-slate-950 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/35 transition-all duration-300 flex items-center justify-between h-[38px] cursor-pointer"
                                >
                                  <span>{field.value || "Select Category"}</span>
                                  <span className="text-slate-400 text-[10px]">▼</span>
                                </button>
                                
                                {isCategoryDropdownOpen && (
                                  <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2.5 space-y-1.5 animate-in fade-in duration-100 flex flex-col overflow-x-hidden">
                                    <div className="text-[9px] uppercase font-mono tracking-wider text-slate-400 px-2 py-0.5 font-bold">
                                      Select Category
                                    </div>
                                    
                                    {/* Scrollable list of categories */}
                                    <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1 flex flex-col">
                                      {categories.length === 0 ? (
                                        <div className="text-slate-400 text-[10px] px-2 py-1">No categories found</div>
                                      ) : (
                                        categories.map((cat) => (
                                          <button
                                            key={cat._id || cat.name}
                                            type="button"
                                            onClick={() => {
                                              field.onChange(cat.name);
                                              setIsCategoryDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all shrink-0 ${
                                              field.value === cat.name
                                                ? "bg-indigo-50 text-indigo-750 font-semibold"
                                                : "hover:bg-slate-50 text-slate-700"
                                            }`}
                                          >
                                            {cat.name}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                    

                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Brand</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                                <Input
                                  placeholder="Sony"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
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
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Description</FormLabel>
                          <FormControl>
                            <textarea
                              rows={4}
                              placeholder="Enter details of this product, features, specifications..."
                              className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl p-3 text-xs focus-visible:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/35 transition-all duration-300 resize-none font-sans"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>

                  {/* Product Media Block */}
                  <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-750 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-indigo-600" />
                      <span>Product Media</span>
                    </h3>

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      id="product-images-upload"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {/* Dropzone Area */}
                    <label
                      htmlFor="product-images-upload"
                      className="border-2 border-dashed border-slate-200 hover:border-indigo-500/50 bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 group"
                    >
                      <div className="p-3 bg-indigo-50 text-indigo-650 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-800">Upload Product Images</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Click to choose multiple files (JPG, PNG, WEBP)</p>
                      </div>
                    </label>

                    {/* Image Preview Gallery */}
                    {mediaList.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        {mediaList.map((img) => (
                          <div
                            key={img.id}
                            className="relative aspect-square border border-slate-200 rounded-xl overflow-hidden bg-slate-50 group shadow-sm flex items-center justify-center"
                          >
                            <img
                              src={img.previewUrl}
                              alt="Upload preview"
                              className="w-full h-full object-cover"
                            />
                            
                            {/* Upload Overlay */}
                            {img.status === "uploading" && (
                              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 p-2">
                                <Loader2 className="h-4 w-4 animate-spin text-white" />
                                <span className="text-[9px] font-bold text-white font-mono">{img.progress}%</span>
                              </div>
                            )}

                            {/* Error Overlay */}
                            {img.status === "error" && (
                              <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center p-2 text-center text-white">
                                <AlertCircle className="h-4 w-4 mb-0.5" />
                                <span className="text-[8px] font-bold">Failed</span>
                              </div>
                            )}

                            {/* Hover Controls (Delete) */}
                            {img.status !== "uploading" && (
                              <button
                                type="button"
                                onClick={() => deleteImage(img.id)}
                                className="absolute top-1.5 right-1.5 p-1 bg-black/50 hover:bg-red-650 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-sm"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}


                    {/* Hidden Form Field for Form Validation */}
                    <FormField
                      control={form.control}
                      name="images"
                      render={({ field }) => (
                        <FormItem className="space-y-0.5">
                          <FormControl>
                            <input type="hidden" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                </div>

                {/* Column 2: Pricing, Stock, Specs & Policies */}
                <div className="space-y-6">
                  
                  {/* Pricing & Stock Block */}
                  <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-750 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-indigo-600" />
                      <span>Pricing & Stock</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Price (USD)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="99.99"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                                  value={field.value !== undefined && field.value !== null ? field.value : ""}
                                  onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="discountPrice"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Discount Price (USD)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="79.99"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                                  value={field.value !== null && field.value !== undefined ? field.value : ""}
                                  onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Stock Quantity</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Layers className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                              <Input
                                type="number"
                                placeholder="150"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                                value={field.value !== undefined && field.value !== null ? field.value : ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>

                  {/* Specifications Block */}
                  <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-750 flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-indigo-600" />
                      <span>Specifications</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Weight (kg)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Scale className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.35"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                                  value={field.value !== null && field.value !== undefined ? field.value : ""}
                                  onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="size"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Size</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Ruler className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                                <Input
                                  placeholder="e.g. Medium / One Size"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                                  {...field}
                                  value={field.value || ""}
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
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Color</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Palette className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                                <Input
                                  placeholder="e.g. Matte Black"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="material"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Material</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Tag className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                                <Input
                                  placeholder="e.g. Memory Foam, Leather"
                                  className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>


                  </div>

                  {/* Shipping & Policies Block */}
                  <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-750 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-indigo-600" />
                      <span>Shipping & Policy</span>
                    </h3>

                    <FormField
                      control={form.control}
                      name="shippingCharges"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Shipping Charges (USD)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="5.99"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                                value={field.value !== null && field.value !== undefined ? field.value : ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="returnPolicy"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Return Policy</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                              <Input
                                placeholder="e.g. 30 Days Return"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                                {...field}
                                value={field.value || ""}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="warrantyInfo"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[10px] uppercase font-mono tracking-wider text-slate-700 block font-semibold">Warranty Information</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                              <Input
                                placeholder="e.g. 1 Year Limited Warranty"
                                className="w-full bg-white border-slate-300 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50 transition-all duration-300"
                                {...field}
                                value={field.value || ""}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>

                </div>

              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={createProductMutation.isPending}
                className="w-full py-3.5 px-4 text-xs font-semibold text-white rounded-xl shadow-md transition-all duration-300 flex items-center justify-center gap-2 mt-6 active:scale-[0.99] bg-indigo-600 hover:bg-indigo-750 hover:shadow-indigo-650/10 cursor-pointer"
              >
                {createProductMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Publishing Product...</span>
                  </>
                ) : (
                  <>
                    <span>Post Product to Catalog</span>
                    <PlusCircle className="h-4 w-4" />
                  </>
                )}
              </Button>

            </form>
          </Form>

        </Card>
      </main>

      {/* Footer */}
      <Footer text="Ecommerce Monitoring. Seller Portal." />
    </div>
  );
}
