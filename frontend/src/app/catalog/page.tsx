"use client";

import React, { useState, useEffect } from "react";
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
  Grid
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  sales: number;
  gradient: string;
  icon: React.ReactNode;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function CatalogPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [bounceBadge, setBounceBadge] = useState(false);

  const INITIAL_ITEMS: Product[] = [
    { 
      id: "item_1", 
      name: "Aether Pro Wireless", 
      category: "Electronics", 
      price: 299.99, 
      quantity: 45, 
      sales: 188,
      gradient: "from-indigo-600 via-indigo-700 to-purple-800",
      icon: <Headphones className="h-8 w-8 text-white/90" />
    },
    { 
      id: "item_2", 
      name: "Tactile Core Keyboard", 
      category: "Computer", 
      price: 149.50, 
      quantity: 30, 
      sales: 112,
      gradient: "from-cyan-500 via-teal-600 to-emerald-700",
      icon: <Keyboard className="h-8 w-8 text-white/90" />
    },
    { 
      id: "item_3", 
      name: "Nomad Canvas Pack", 
      category: "Accessories", 
      price: 180.00, 
      quantity: 85, 
      sales: 94,
      gradient: "from-amber-500 via-orange-600 to-rose-700",
      icon: <Briefcase className="h-8 w-8 text-white/90" />
    },
    { 
      id: "item_4", 
      name: "Ergo Posture Seat", 
      category: "Furniture", 
      price: 349.00, 
      quantity: 12, 
      sales: 43,
      gradient: "from-rose-500 via-purple-600 to-indigo-800",
      icon: <Grid className="h-8 w-8 text-white/90" />
    },
    { 
      id: "item_5", 
      name: "Thermal Smart Flask", 
      category: "Lifestyle", 
      price: 45.00, 
      quantity: 150, 
      sales: 256,
      gradient: "from-emerald-500 via-teal-600 to-indigo-900",
      icon: <Coffee className="h-8 w-8 text-white/90" />
    },
    { 
      id: "item_6", 
      name: "Aether Active Watch", 
      category: "Electronics", 
      price: 199.00, 
      quantity: 0, 
      sales: 137,
      gradient: "from-fuchsia-600 via-pink-600 to-rose-700",
      icon: <Watch className="h-8 w-8 text-white/90" />
    },
  ];

  const [products, setProducts] = useState<Product[]>(INITIAL_ITEMS);

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

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa] text-slate-800 font-sans antialiased selection:bg-indigo-600 selection:text-white overflow-x-hidden relative justify-between">
      
      {/* Ambient background glows */}
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none animate-breathe-1" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-purple-100/40 rounded-full blur-[120px] pointer-events-none animate-breathe-2" />

      {/* Inline Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 rounded-xl shadow-lg shadow-indigo-100/50">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-wider text-slate-900 uppercase font-heading flex items-center gap-1.5">
                Aether <span className="text-xs text-indigo-600 font-mono lowercase font-normal">concept</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">Curated Essentials & Hardware</p>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2.5 px-4.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-indigo-500/20 text-slate-800 text-xs font-semibold rounded-xl shadow-sm transition-all duration-350 relative group cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform duration-300" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white border-2 border-white shadow-md shadow-indigo-200/50 transition-transform duration-300 ${
                bounceBadge ? "scale-125 bg-purple-600" : "scale-100"
              }`}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-8 py-12 space-y-12 z-10">
        <section className="text-center space-y-4 max-w-xl mx-auto">
          <span className="text-[9px] tracking-[0.2em] font-mono text-indigo-700 uppercase font-bold bg-indigo-50 border border-indigo-200 px-3.5 py-1.5 rounded-full inline-block">
            Summer Collection 2026
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-heading">
            Design for the Modern Workspace
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            Explore our curated line of tactile mechanical interfaces, high-fidelity audio equipment, and ergonomic workspace accessories.
          </p>
        </section>

        {/* Checkout Alert */}
        <div className={`transition-all duration-500 ease-out overflow-hidden ${
          checkoutSuccess ? "max-h-40 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-4"
        }`}>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-4.5 rounded-2xl flex items-center gap-4 shadow-md shadow-slate-100/50">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
              <Check className="h-4 w-4 animate-bounce" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block">Checkout Completed Successfully</span>
              <span className="text-xs text-emerald-700 mt-0.5 block">Your order has been logged and queued for dispatch.</span>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {products.map((product) => {
            const isOutOfStock = product.quantity === 0;
            return (
              <div
                key={product.id}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-indigo-550/20 transition-all duration-350 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-100/80 flex flex-col justify-between group shadow-sm"
              >
                <div className={`aspect-[16/10] bg-gradient-to-tr ${product.gradient} p-6 relative flex items-center justify-center overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none transition-transform duration-500 group-hover:scale-125" />
                  
                  <div className="z-10 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out">
                    {product.icon}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200/60">
                      {product.category}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        isOutOfStock 
                          ? "bg-red-500" 
                          : product.quantity < 15 
                          ? "bg-amber-500 animate-pulse" 
                          : "bg-emerald-500"
                      }`} />
                      <span className={`text-[10px] font-mono font-medium ${
                        isOutOfStock 
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
                    
                    <button
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                        isOutOfStock
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:shadow-indigo-200/20"
                      }`}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {isOutOfStock ? "Out of Stock" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* Cart Slider */}
      <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ease-out ${
        isCartOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}>
        <div 
          onClick={() => setIsCartOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-all" 
        />

        <div className={`w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col justify-between shadow-2xl p-6 relative transition-transform duration-300 ease-out z-10 ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-md font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                Your Shopping Cart
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors duration-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-24 text-center text-slate-400 italic text-sm">
                  No items added to cart yet.
                </div>
              ) : (
                cart.map((item) => (
                  <div 
                    key={item.product.id} 
                    className="bg-slate-50/50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between animate-fade-in-up"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.product.name}</h4>
                      <span className="text-[10px] text-slate-455 font-mono">${item.product.price.toFixed(2)} each</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-1">
                        <button
                          onClick={() => updateCartQty(item.product.id, -1)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-850 transition-colors duration-200 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 font-mono text-xs text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(item.product.id, 1)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-850 transition-colors duration-200 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold font-mono text-slate-900 w-16 text-right">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Subtotal</span>
              <span className="text-md font-bold font-mono text-slate-900">${cartTotal.toFixed(2)}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`flex-grow py-3 text-xs font-semibold rounded-xl shadow-md transition-all duration-300 text-center active:scale-98 cursor-pointer ${
                  cart.length === 0
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                Checkout Purchase
              </button>
              <button
                onClick={() => setIsCartOpen(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/40 py-6 text-center text-[10px] text-slate-500 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Aether E-Commerce Concept Storefront. Buyer Client Sandbox.</span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-550" /> Powered by HashiCorp Vault.
          </span>
        </div>
      </footer>
    </div>
  );
}
