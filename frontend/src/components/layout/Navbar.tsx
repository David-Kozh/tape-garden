"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, ShoppingCart, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, role, loading, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b border-zinc-400/60 bg-white/10 px-6 py-4 md:px-12 flex justify-between items-center transition-all duration-300">
      <Link href="/" className="flex items-center gap-3 group cursor-pointer">
        <div className="w-18 h-12 rounded-lg bg-zinc-100/30 border border-emerald-500/20 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-200/30 overflow-hidden p-0.5">
          <Image
            src="/logo.svg"
            alt="Tape Garden Logo"
            width={128}
            height={128}
            className="w-full h-full object-contain"
          />
        </div>
        <span className="font-bold text-xl lg:text-2xl tracking-tight bg-gradient-to-r from-zinc-800 to-emerald-800 bg-clip-text text-transparent group-hover:text-emerald-600 transition-all">
          Tape Garden
        </span>
      </Link>

      <nav className="flex items-center gap-6 text-zinc-700 text-sm lg:text-md">
        <Link href="/#explore" className=" font-medium hover:text-emerald-700 transition-colors">
          Explore
        </Link>


        <div className="h-5 w-[1px] bg-zinc-400" />

        {/* Cart Icon */}
        {itemCount > 0 && (
          <>
            <Link href="/checkout" className="relative group flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-zinc-500 group-hover:text-emerald-700 transition-colors" />
              <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-md">
                {itemCount}
              </span>
            </Link>
            <div className="h-5 w-[1px] bg-zinc-400" />
          </>
        )}

        {loading ? (
          <div className="w-12 h-4 bg-zinc-200 animate-pulse rounded" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center p-2 -mr-2 rounded-md hover:bg-zinc-200/50 transition-colors focus:outline-none cursor-pointer">
              <Menu className="w-5 h-5 text-zinc-700" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border-zinc-200/60 shadow-lg backdrop-blur-md">
              {role === "admin" && (
                <DropdownMenuItem onClick={() => router.push("/admin/users")} className="cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100">
                  <span className="w-full font-medium text-zinc-700">
                    Admin Portal
                  </span>
                </DropdownMenuItem>
              )}
              {role === "producer" && (
                <>
                  <DropdownMenuItem onClick={() => router.push("/dashboard")} className="cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100">
                    <span className="w-full font-medium text-zinc-700">
                      Dashboard
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/#backroom")} className="cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100">
                    <span className="w-full font-medium text-zinc-700">
                      Back Room
                    </span>
                  </DropdownMenuItem>
                </>
              )}
              {role === "buyer" && (
                <DropdownMenuItem onClick={() => router.push("/dashboard/collection")} className="cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100">
                  <span className="w-full font-medium text-zinc-700">
                    My Purchases
                  </span>
                </DropdownMenuItem>
              )}
              {role && <DropdownMenuSeparator className="bg-zinc-200/60" />}
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-red-600 font-medium hover:text-red-700 focus:text-red-700 hover:bg-red-50 focus:bg-red-50"
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            href="/login"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-600 transition-colors flex items-center gap-1"
          >
            Login
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </nav>
    </header>
  );
}
