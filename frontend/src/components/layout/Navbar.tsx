"use client";

import Link from "next/link";
import { CassetteTape, ArrowRight, Shield, ShoppingCart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export function Navbar() {
  const { user, role, loading, logout } = useAuth();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b border-zinc-900/50 bg-[#08080a]/60 px-6 py-4 md:px-12 flex justify-between items-center transition-all duration-300">
      <Link href="/" className="flex items-center gap-3 group cursor-pointer">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-500/20 group-hover:scale-105">
          <CassetteTape className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent group-hover:from-white group-hover:to-zinc-200">
          Tape Garden
        </span>
      </Link>

      <nav className="flex items-center gap-6">
        <Link href="/#explore" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
          Explore
        </Link>
        <Link href="/#backroom" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-400/80" />
          Back Room
        </Link>

        <div className="h-4 w-[1px] bg-zinc-800/80" />

        {/* Cart Icon */}
        <Link href="/checkout" className="relative group flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-md">
              {itemCount}
            </span>
          )}
        </Link>

        <div className="h-4 w-[1px] bg-zinc-800/80" />

        {loading ? (
          <div className="w-12 h-4 bg-zinc-900 animate-pulse rounded" />
        ) : user ? (
          <div className="flex items-center gap-5">
            {role === "admin" && (
              <Link href="/admin/users" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                Admin Portal
              </Link>
            )}
            {role === "producer" && (
              <Link href="/dashboard" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                Dashboard
              </Link>
            )}
            {role === "buyer" && (
              <Link href="/purchases" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                My Purchases
              </Link>
            )}
            <button
              onClick={logout}
              className="text-xs font-semibold text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
          >
            Enter
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </nav>
    </header>
  );
}
