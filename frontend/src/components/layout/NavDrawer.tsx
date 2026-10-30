"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Compass,
  LayoutDashboard,
  Upload,
  Library,
  Settings,
  Shield,
  Sparkles,
  Info,
  LogIn,
  LogOut,
  ShoppingCart,
  UserCircle,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { FeedbackModal } from "@/components/dashboard/FeedbackModal";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";

export function NavDrawer() {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { user, role, loading, logout } = useAuth();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  const handleLinkClick = () => {
    setOpen(false);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/");
  };

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/gallery") {
      return pathname === "/gallery" || pathname.startsWith("/gallery/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  if (loading) {
    return <div className="w-8 h-8 bg-zinc-200 animate-pulse rounded-md" />;
  }

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen} swipeDirection="right" modal="trap-focus">
        <DrawerTrigger
          className="flex items-center justify-center p-2 -ml-2 -mr-2 rounded-md hover:bg-zinc-200/50 transition-colors focus:outline-none cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-brand-grey" />
        </DrawerTrigger>

        <DrawerContent className="w-[85%] max-w-sm sm:w-96 border-l border-border/50 text-brand-black flex flex-col justify-between">
          <div>
            {/* Header */}
            <DrawerHeader className="p-0 pb-5 border-b border-border/40 pr-8">
              <Link
                href="/"
                onClick={handleLinkClick}
                className="flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-10 h-8 rounded-lg bg-zinc-100/40 border border-brand-secondary-500/20 flex items-center justify-center transition-all duration-300 group-hover:bg-brand-accent-500/30 group-hover:border-brand-accent-500/50 overflow-hidden p-0.5">
                  <Image
                    src="/logo.svg"
                    alt="Tape Garden Logo"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <DrawerTitle className="font-lexend font-extrabold text-base tracking-tight text-transparent bg-gradient-to-r from-brand-secondary-500 to-brand-primary-500 bg-clip-text">
                    Tape Garden
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-brand-grey/70">
                    Curated Beats & Sample Packs
                  </DrawerDescription>
                </div>
              </Link>

              {user && (
                <div className="mt-4 p-2.5 rounded-lg bg-white/40 border border-border/30 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-primary-500/15 text-brand-primary-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {user.displayName
                      ? user.displayName.substring(0, 2)
                      : user.email
                        ? user.email.substring(0, 2)
                        : "U"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-brand-black truncate">
                      {user.displayName || user.email}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-brand-grey/70 truncate">
                        {user.email}
                      </span>
                      {role && (
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-primary-500/20 text-brand-primary-700">
                          {role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DrawerHeader>

            {/* Navigation Links */}
            <div className="py-4 space-y-6">
              {/* General Discovery Links */}
              <div className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-brand-grey/60">
                  Discover
                </span>
                <div className="mt-1 space-y-1">
                  <Link
                    href="/gallery"
                    onClick={handleLinkClick}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/gallery")
                      ? "bg-brand-primary-500 text-white shadow-sm"
                      : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                      }`}
                  >
                    <Compass className="w-5 h-5 shrink-0" />
                    <span>Explore</span>
                  </Link>

                  {itemCount > 0 && (
                    <Link
                      href="/checkout"
                      onClick={handleLinkClick}
                      className={`flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/checkout")
                        ? "bg-brand-primary-500 text-white shadow-sm"
                        : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="w-5 h-5 shrink-0" />
                        <span>Cart</span>
                      </div>
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-xs">
                        {itemCount}
                      </span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Authenticated user sections */}
              {user ? (
                <>
                  {/* Admin Portal section if admin */}
                  {role === "admin" && (
                    <div className="space-y-1">
                      <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-brand-grey/60">
                        Administration
                      </span>
                      <div className="mt-1 space-y-1">
                        <Link
                          href="/admin/users"
                          onClick={handleLinkClick}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/admin")
                            ? "bg-brand-primary-500 text-white shadow-sm"
                            : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                            }`}
                        >
                          <Shield className="w-5 h-5 shrink-0" />
                          <span>Admin Portal</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Dashboard / Creator Studio Links - Producers only */}
                  {role === "producer" && (
                    <div className="space-y-1">
                      <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-brand-grey/60">
                        Creator Studio
                      </span>
                      <div className="mt-1 space-y-1">
                        <Link
                          href="/dashboard"
                          onClick={handleLinkClick}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/dashboard")
                            ? "bg-brand-primary-500 text-white shadow-sm"
                            : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                            }`}
                        >
                          <LayoutDashboard className="w-5 h-5 shrink-0" />
                          <span>Overview</span>
                        </Link>
                        <Link
                          href="/dashboard/uploads"
                          onClick={handleLinkClick}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/dashboard/uploads")
                            ? "bg-brand-primary-500 text-white shadow-sm"
                            : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                            }`}
                        >
                          <Upload className="w-5 h-5 shrink-0" />
                          <span>Uploads</span>
                        </Link>
                        <Link
                          href="/dashboard/collection"
                          onClick={handleLinkClick}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/dashboard/collection")
                            ? "bg-brand-primary-500 text-white shadow-sm"
                            : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                            }`}
                        >
                          <Library className="w-5 h-5 shrink-0" />
                          <span>Collection</span>
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          onClick={handleLinkClick}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/dashboard/settings")
                            ? "bg-brand-primary-500 text-white shadow-sm"
                            : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                            }`}
                        >
                          <Settings className="w-5 h-5 shrink-0" />
                          <span>Settings</span>
                        </Link>
                        <Link
                          href={`/producers/${user.uid}`}
                          onClick={handleLinkClick}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive(`/producers/${user.uid}`)
                            ? "bg-brand-primary-500 text-white shadow-sm"
                            : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                            }`}
                        >
                          <UserCircle className="w-5 h-5 shrink-0" />
                          <span>View Profile</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            setFeedbackOpen(true);
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium rounded-lg transition-colors text-brand-black hover:bg-white/60 hover:text-brand-primary-600 cursor-pointer"
                        >
                          <MessageSquare className="w-5 h-5 shrink-0" />
                          <span>Leave Feedback</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Buyer Account Links */}
                  {role === "buyer" && (
                    <div className="space-y-1">
                      <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-brand-grey/60">
                        My Account
                      </span>
                      <div className="mt-1 space-y-1">
                        <Link
                          href="/dashboard/collection"
                          onClick={handleLinkClick}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/dashboard/collection")
                            ? "bg-brand-primary-500 text-white shadow-sm"
                            : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                            }`}
                        >
                          <Library className="w-5 h-5 shrink-0" />
                          <span>My Purchases</span>
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          onClick={handleLinkClick}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/dashboard/settings")
                            ? "bg-brand-primary-500 text-white shadow-sm"
                            : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                            }`}
                        >
                          <Settings className="w-5 h-5 shrink-0" />
                          <span>Settings</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Guest Links */
                <div className="space-y-1">
                  <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-brand-grey/60">
                    Join Tape Garden
                  </span>
                  <div className="mt-1 space-y-1">
                    <Link
                      href="/apply"
                      onClick={handleLinkClick}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/apply")
                        ? "bg-brand-primary-500 text-white shadow-sm"
                        : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                        }`}
                    >
                      <Sparkles className="w-5 h-5 shrink-0" />
                      <span>Apply as Producer</span>
                    </Link>
                    <Link
                      href="/about"
                      onClick={handleLinkClick}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isItemActive("/about")
                        ? "bg-brand-primary-500 text-white shadow-sm"
                        : "text-brand-black hover:bg-white/60 hover:text-brand-primary-600"
                        }`}
                    >
                      <Info className="w-5 h-5 shrink-0" />
                      <span>About Us</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer with Sign Out / Log In */}
          <DrawerFooter className="p-0 pt-4 border-t border-border/40 mt-auto">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-semibold rounded-lg text-red-600 hover:text-red-700 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>Sign Out</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={handleLinkClick}
                className="flex items-center justify-center gap-2 px-3 py-2.5 w-full text-sm font-semibold rounded-lg bg-brand-primary-500 text-white hover:bg-brand-primary-600 shadow-sm transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>Log In</span>
              </Link>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      {user && role === "producer" && (
        <FeedbackModal
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          showTrigger={false}
        />
      )}
    </>
  );
}
