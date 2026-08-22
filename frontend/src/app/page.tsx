"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  ShoppingBag,
  Sparkles,
  X,
  Minus,
  Plus,
  Check,
  Headphones,
  Keyboard,
  Briefcase,
  Coffee,
  Watch,
  Grid,
  Search,
  SlidersHorizontal,
  Loader2
} from "lucide-react";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  sales: number;
  gradient: string;
  icon: React.ReactNode;
  images?: string[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

const getProductVisuals = (category: string, name: string, index: number) => {
  const normalizedCat = (category || "").toLowerCase();
  const normalizedName = (name || "").toLowerCase();

  const gradients = [
    "from-indigo-600 via-indigo-700 to-purple-800",
    "from-cyan-500 via-teal-600 to-emerald-700",
    "from-amber-500 via-orange-600 to-rose-700",
    "from-rose-500 via-purple-600 to-indigo-800",
    "from-emerald-500 via-teal-600 to-indigo-900",
    "from-fuchsia-600 via-pink-600 to-rose-700",
    "from-blue-600 via-indigo-650 to-violet-750",
    "from-violet-500 via-purple-650 to-pink-700",
  ];

  const gradient = gradients[index % gradients.length];

  let icon = <ShoppingBag className="h-8 w-8 text-white/90" />;
  if (normalizedCat.includes("electronic") || normalizedName.includes("headphone") || normalizedName.includes("watch")) {
    if (normalizedName.includes("watch")) {
      icon = <Watch className="h-8 w-8 text-white/90" />;
    } else {
      icon = <Headphones className="h-8 w-8 text-white/90" />;
    }
  } else if (normalizedCat.includes("computer") || normalizedName.includes("keyboard") || normalizedName.includes("mouse")) {
    icon = <Keyboard className="h-8 w-8 text-white/90" />;
  } else if (normalizedCat.includes("access") || normalizedName.includes("pack") || normalizedName.includes("pad")) {
    icon = <Briefcase className="h-8 w-8 text-white/90" />;
  } else if (normalizedCat.includes("furnit") || normalizedName.includes("seat") || normalizedName.includes("desk")) {
    icon = <Grid className="h-8 w-8 text-white/90" />;
  } else if (normalizedCat.includes("life") || normalizedName.includes("flask") || normalizedName.includes("cup")) {
    icon = <Coffee className="h-8 w-8 text-white/90" />;
  }

  return { gradient, icon };
};

function CatalogPageContent() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [bounceBadge, setBounceBadge] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedCategory = searchParams.get("category") || "All";
  const sortBy = searchParams.get("sortBy") || "default";

  const setSelectedCategory = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (category === "All") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const setSortBy = (sortOption: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortOption === "default") {
      params.delete("sortBy");
    } else {
      params.set("sortBy", sortOption);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // sentinelRef is defined below as a callback ref to handle conditional mount lifecycle

  const {
    data: dbProductsData,
    isLoading: isLoadingProducts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["products", selectedCategory, sortBy],
    queryFn: async ({ pageParam = 1 }) => {
      const isGateway = typeof window !== "undefined" && (window.location.port === "" || window.location.port === "80");
      const categoryParam = selectedCategory !== "All" ? `&category=${encodeURIComponent(selectedCategory)}` : "";
      const sortParam = sortBy !== "default" ? `&sortBy=${encodeURIComponent(sortBy)}` : "";
      const ITEMS_URL = isGateway 
        ? `/api/v1/items?page=${pageParam}&limit=6${categoryParam}${sortParam}` 
        : `http://localhost:3001/api/v1/items?page=${pageParam}&limit=6${categoryParam}${sortParam}`;
      
      const response = await fetch(ITEMS_URL);
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const result = await response.json();
      return result.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.hasNextPage) {
        return lastPage.page + 1;
      }
      return undefined;
    }
  });

  const dbProducts = React.useMemo(() => {
    return dbProductsData ? dbProductsData.pages.flatMap((page) => page.items || []) : [];
  }, [dbProductsData]);

  const observerRef = React.useRef<IntersectionObserver | null>(null);

  const sentinelRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  const { data: dbCategories = [], isLoading: isLoadingCategories } = useQuery({
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
      return result.data || [];
    }
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (dbProducts.length > 0) {
      const mapped = dbProducts.map((item: any, index: number) => {
        const visuals = getProductVisuals(item.category || "Lifestyle", item.name, index);
        return {
          id: item._id || item.id,
          name: item.name,
          category: item.category || "Lifestyle",
          price: item.price,
          quantity: item.quantity,
          sales: item.sales || Math.floor((item.price * 3) % 200),
          gradient: visuals.gradient,
          icon: visuals.icon,
          images: item.images || [],
        };
      });
      setProducts(mapped);
    }
  }, [dbProducts]);

  const filteredProducts = products
    .filter((product) => {
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

  useEffect(() => {
    if (cart.length === 0) return;
    setBounceBadge(true);
    const t = setTimeout(() => setBounceBadge(false), 300);
    return () => clearTimeout(t);
  }, [cart]);

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            const maxStock = products.find((p) => p.id === productId)?.quantity || 999;
            if (nextQty > maxStock) return item;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    setProducts((prevProducts) => {
      return prevProducts.map((p) => {
        const cartItem = cart.find((item) => item.product.id === p.id);
        if (cartItem) {
          return {
            ...p,
            quantity: Math.max(0, p.quantity - cartItem.quantity),
            sales: p.sales + cartItem.quantity,
          };
        }
        return p;
      });
    });

    setCart([]);
    setIsCartOpen(false);
    setCheckoutSuccess(true);
    setTimeout(() => setCheckoutSuccess(false), 4500);
  };

  const isLoading = isLoadingProducts || isLoadingCategories;

  if (isLoading && products.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-[#f8f9fa] justify-between">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-500 font-mono">Loading product catalog...</p>
          </div>
        </main>
        <Footer text="Ecommerce Monitoring. Buyer Client Sandbox." />
      </div>
    );
  }

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  const categoriesList = ["All", ...dbCategories.map((c: any) => c.name)];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa] text-slate-800 font-sans antialiased selection:bg-indigo-600 selection:text-white overflow-x-hidden relative justify-between">
      
      {/* Background ambient lighting glows with slow breathing animations */}
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none animate-breathe-1" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[120px] pointer-events-none animate-breathe-2" />

      {/* Header */}
      <Header
        showActions
        cartCount={cartCount}
        setIsCartOpen={setIsCartOpen}
        bounceBadge={bounceBadge}
      />

      {/* Main Container */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-8 py-12 space-y-12 z-10">
        <section className="text-center space-y-4 max-w-xl mx-auto">
          <Badge variant="outline" className="text-[9px] tracking-[0.2em] font-mono text-indigo-700 uppercase font-bold bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-full inline-block">
            Summer Collection 2026
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-heading">
            Design for the Modern Workspace
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            Explore our curated line of tactile mechanical interfaces, high-fidelity audio equipment, and ergonomic workspace accessories.
          </p>
        </section>

        {/* Checkout Alert */}
        <div className={`transition-all duration-500 ease-out overflow-hidden ${checkoutSuccess ? "max-h-40 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-4"}`}>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4.5 rounded-2xl flex items-center gap-4 shadow-md shadow-slate-100/50">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
              <Check className="h-4 w-4 animate-bounce" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block">Checkout Completed Successfully</span>
              <span className="text-xs text-emerald-700 mt-0.5 block">Your order has been logged and queued for dispatch.</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/50 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="relative flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer min-w-[140px]"
              >
                <option value="default">Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="sales-desc">Best Sellers</option>
              </select>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold mr-1 shrink-0">Categories:</span>
            {categoriesList.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-4 py-1.5 rounded-xl font-semibold transition-all duration-300 shrink-0 cursor-pointer border ${
                    isActive
                      ? "bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-200"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/60"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Products Display */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white border border-slate-200 rounded-3xl shadow-sm max-w-md mx-auto space-y-4">
            <div className="p-4 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl">
              <SlidersHorizontal className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">No Products Found</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                We couldn't find any products matching your search query or selected filters. Try adjusting your selections.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCategory("All");
                setSearchQuery("");
                setSortBy("default");
              }}
              className="text-xs font-semibold py-2 px-4 border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.quantity === 0;
                return (
                  <Card
                    key={product.id}
                    className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-indigo-550/20 transition-all duration-350 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-100/80 flex flex-col justify-between group"
                  >
                    <div className={`aspect-[16/10] bg-gradient-to-tr ${product.gradient} relative flex items-center justify-center overflow-hidden`}>
                      {product.images && product.images.length > 0 && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]" />
                          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none transition-transform duration-500 group-hover:scale-125" />

                          <div className="z-10 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out">
                            {product.icon}
                          </div>
                        </>
                      )}
                    </div>

                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200/60">
                          {product.category}
                        </Badge>
                        <span className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${isOutOfStock
                            ? "bg-red-500"
                            : product.quantity < 15
                              ? "bg-amber-500 animate-pulse"
                              : "bg-emerald-500"
                            }`} />
                          <span className={`text-[10px] font-mono font-medium ${isOutOfStock
                            ? "text-red-500"
                            : product.quantity < 15
                              ? "text-amber-600"
                              : "text-slate-500"
                            }`}>
                            {isOutOfStock ? "Sold Out" : product.quantity < 15 ? `Only ${product.quantity} left` : "In stock"}
                          </span>
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors duration-300">
                          {product.name}
                        </h3>
                        <p className="text-[10px] text-slate-450 font-mono mt-1">SKU: {product.id}</p>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                        <span className="text-base font-bold text-slate-900 font-mono">${product.price.toFixed(2)}</span>

                        <Button
                          onClick={() => addToCart(product)}
                          disabled={isOutOfStock}
                          className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${isOutOfStock
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-200/20"
                            }`}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            {/* Intersection Observer Sentinel / Scroll Trigger */}
            {(hasNextPage || isFetchingNextPage) && (
              <div ref={sentinelRef} className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-[10px] font-semibold text-slate-500 font-mono">Loading more products...</span>
              </div>
            )}

            {!hasNextPage && (
              <div className="text-center py-10 border-t border-slate-100 mt-6">
                <span className="text-[10px] font-semibold text-slate-400 font-mono">You've viewed all products</span>
              </div>
            )}
          </>
        )}
      </main>

      {/* Cart Sliding Panel */}
      <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ease-out ${isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div
          onClick={() => setIsCartOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all"
        />

        <div className={`w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col justify-between shadow-2xl p-6 relative transition-transform duration-300 ease-out z-10 ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                Your Shopping Cart
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCartOpen(false)}
                className="hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-24 text-center text-slate-400 italic text-sm">
                  No items added to cart yet.
                </div>
              ) : (
                cart.map((item) => (
                  <Card
                    key={item.product.id}
                    className="bg-slate-50/50 border-slate-200 p-4 rounded-2xl flex items-center justify-between animate-fade-in-up"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.product.name}</h4>
                      <span className="text-[10px] text-slate-450 font-mono">${item.product.price.toFixed(2)} each</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => updateCartQty(item.product.id, -1)}
                          className="hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="px-2 font-mono text-xs text-slate-800">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => updateCartQty(item.product.id, 1)}
                          className="hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      <span className="text-xs font-bold font-mono text-slate-900 w-16 text-right">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-550 font-medium">Subtotal</span>
              <span className="text-md font-bold font-mono text-slate-900">${cartTotal.toFixed(2)}</span>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`flex-grow py-3 text-xs font-semibold rounded-xl shadow-md transition-all duration-300 text-center active:scale-98 cursor-pointer ${cart.length === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  }`}
              >
                Checkout Purchase
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsCartOpen(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer text="Ecommerce Monitoring. Buyer Client Sandbox." />
    </div>
  );
}

export default function CatalogPage() {
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
        <Footer text="Ecommerce Monitoring. Buyer Client Sandbox." />
      </div>
    }>
      <CatalogPageContent />
    </Suspense>
  );
}
