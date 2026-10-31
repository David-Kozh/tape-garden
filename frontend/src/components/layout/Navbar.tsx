"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, Library, ShoppingBag, UserCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { NavDrawer } from "@/components/layout/NavDrawer";

export function Navbar() {
  const { user, role, loading } = useAuth();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const isGallery = pathname === "/gallery" || pathname === "/gallery/";

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border/50 bg-white/10 px-3 pb-2 pt-1.5 md:px-12 flex justify-between items-center transition-all duration-300 relative">
      <div className="flex items-center gap-3 md:gap-4 z-10">
        {/* Unified Navigation Drawer Trigger */}
        <NavDrawer />

        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-15 h-10 sm:w-16 sm:h-12 rounded-lg bg-zinc-100/0 border border-brand-secondary-500/0 flex items-center justify-center transition-all duration-300 group-hover:bg-brand-accent-500/0 group-hover:border-brand-accent-500/0 overflow-hidden p-0.5">
            <Image
              src="/logo.svg"
              alt="Tape Garden Logo"
              width={128}
              height={128}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="hidden md:inline text-[22px] lg:text-[26px] transition-all">
            <span className="font-semibold text-brand-grey group-hover:opacity-80 transition-opacity">Tape </span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-grey to-brand-primary-900 group-hover:opacity-80 transition-opacity">Garden</span>
          </span>
        </Link>
      </div>

      {/* Gallery Heading on Mobile */}
      {isGallery && (
        <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none select-none">
          <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight text-muted-foreground">
            Gallery
          </h1>
        </div>
      )}

      <nav className="flex items-center gap-4 md:gap-6 text-brand-grey text-sm z-10">
        {!loading && !user && (
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/login"
              className="text-sm font-semibold text-brand-primary-500 hover:text-brand-primary-400 transition-colors flex items-center gap-1"
            >
              Login
              <ArrowRight className="w-3 h-3" />
            </Link>
            <div className="h-5 w-[1px] bg-muted-foreground/60" />
          </div>
        )}

        {!loading && user && role === "producer" && (
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href={`/producers/${user.uid}`}
              aria-label="View profile"
              className="relative group flex items-center justify-center"
            >
              <UserCircle className="w-5 h-5 text-muted-foreground group-hover:text-emerald-700 transition-colors" />
            </Link>
            <div className="h-5 w-[1px] bg-muted-foreground/60" />
          </div>
        )}

        {!loading && user && role === "buyer" && (
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/dashboard/collection"
              aria-label="My collection"
              className="relative group flex items-center justify-center"
            >
              <Library className="w-5 h-5 text-muted-foreground group-hover:text-emerald-700 transition-colors" />
            </Link>
            <div className="h-5 w-[1px] bg-muted-foreground/60" />
          </div>
        )}

        {/* Cart Icon */}
        <Link
          href="/checkout"
          aria-label="Shopping cart"
          className="relative group flex items-center justify-center"
        >
          <ShoppingBag className="w-5 h-5 text-muted-foreground group-hover:text-emerald-700 transition-colors" />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-md">
              {itemCount}
            </span>
          )}
        </Link>
      </nav>
    </header>
  );
}
