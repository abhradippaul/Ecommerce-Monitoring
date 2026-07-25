"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, ShoppingCart, User, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authenticatedFetch } from "@/lib/api";

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
  const [user, setUser] = React.useState<{
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
    role?: string;
  } | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user?.avatarUrl) {
      setAvatarPreviewUrl(user.avatarUrl);
    } else {
      setAvatarPreviewUrl(null);
    }
  }, [user?.avatarUrl]);

  const { data: profileData, isLoading: isQueryLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return null;
      const res = await authenticatedFetch(`/api/v1/auth/profile`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      const resData = await res.json();
      return resData.data;
    },
    retry: false,
  });

  React.useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  React.useEffect(() => {
    if (profileData) {
      const mapped = {
        email: profileData.email,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        avatarUrl: profileData.avatarUrl,
        role: profileData.role,
      };
      setUser(mapped);
      localStorage.setItem("user", JSON.stringify(mapped));
      setIsLoaded(true);
    } else if (!isQueryLoading) {
      setIsLoaded(true);
    }
  }, [profileData, isQueryLoading]);

  const handleSignOut = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    window.location.reload();
  };

  return (
    <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-8 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* Brand Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 rounded-xl shadow-lg shadow-indigo-100/50">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-wider text-slate-900 uppercase font-heading flex items-center gap-1.5">
              Ecommerce Monitoring
            </h1>
            <p className="text-[10px] text-slate-600 font-semibold font-mono">
              {isLoaded && user?.role === "seller" ? "seller client" : "buyer client"}
            </p>
          </div>
        </div>

        {/* Optional Actions (For Storefront Home Page) */}
        {showActions && (
          <div className="flex items-center gap-4 animate-fade-in-up">
            {/* Login / Auth link */}
            {!isLoaded ? (
              <div className="flex items-center justify-center h-10 w-24">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                {/* Avatar Display */}
                {avatarPreviewUrl ? (
                  <a href="/profile" className="shrink-0">
                    <img
                      src={avatarPreviewUrl}
                      alt="User Avatar"
                      className="h-9 w-9 rounded-full object-cover border border-slate-200 shadow-sm hover:border-indigo-500 transition-colors"
                    />
                  </a>
                ) : (
                  <a href="/profile" className="shrink-0">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-50 to-indigo-100/50 border border-indigo-200 hover:border-indigo-500 transition-colors flex items-center justify-center text-indigo-650 font-bold text-xs shadow-sm">
                      {user.firstName && user.lastName
                        ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                        : user.email[0].toUpperCase()}
                    </div>
                  </a>
                )}

                <a href="/profile" className="text-right hidden sm:block hover:opacity-80 transition-opacity">
                  <p className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-semibold leading-tight">
                    {user.firstName && user.lastName ? "Welcome" : "Logged in as"}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </p>
                </a>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="bg-red-50/50 border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 text-xs font-semibold rounded-xl shadow-sm h-10 px-4 transition-all duration-300 cursor-pointer ml-1"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                asChild
                className="bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900 text-slate-600 text-xs font-semibold rounded-xl shadow-sm h-10 px-4"
              >
                <a href="/auth/buyer">
                  <User className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Sign In</span>
                </a>
              </Button>
            )}

            {/* Conditional Cart or Post Item Button depending on Role */}
            {user?.role === "seller" ? (
              <Button
                variant="outline"
                asChild
                className="bg-indigo-50 hover:bg-indigo-100 border-indigo-200 hover:border-indigo-300 text-indigo-700 text-xs font-semibold rounded-xl shadow-sm h-10 px-4 flex items-center gap-2 cursor-pointer transition-all duration-300"
              >
                <a href="/seller/post-item">
                  <PlusCircle className="h-4 w-4 text-indigo-650 animate-pulse" />
                  <span>Post Item</span>
                </a>
              </Button>
            ) : (
              /* Cart Button */
              <Button
                variant="outline"
                onClick={() => setIsCartOpen && setIsCartOpen(true)}
                className="bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-indigo-500/20 text-slate-800 text-xs font-semibold rounded-xl shadow-sm h-10 px-4 relative group cursor-pointer"
              >
                <ShoppingCart className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform duration-300 mr-2" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white border-2 border-white shadow-md shadow-indigo-200/50 transition-transform duration-300 ${bounceBadge ? "scale-125 bg-purple-600" : "scale-100"
                    }`}>
                    {cartCount}
                  </span>
                )}
              </Button>
            )}
          </div>
        )}

      </div>
    </header>
  );
}
