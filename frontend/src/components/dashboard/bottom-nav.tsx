// DEPRECATED: Navigation has been consolidated into the unified Navbar Drawer.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV_ITEMS } from "@/components/dashboard/sidebar";

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useAuth();

  const isItemActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navItems =
    role === "buyer"
      ? DASHBOARD_NAV_ITEMS.filter((item) => item.roles.includes("buyer"))
      : DASHBOARD_NAV_ITEMS;

  return (
    <nav
      aria-label="Dashboard mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/85 pb-[env(safe-area-inset-bottom)] shadow-lg"
    >
      <div className="flex items-center justify-around h-16 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = isItemActive(item.href);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <Button
                key={item.href}
                variant="ghost"
                size="icon"
                disabled
                className="h-11 w-11 rounded-xl opacity-50 cursor-not-allowed text-muted-foreground"
                title={`${item.title} (Coming Soon)`}
                aria-label={`${item.title} (Coming Soon)`}
              >
                <Icon className="h-5 w-5" />
                <span className="sr-only">{item.title}</span>
              </Button>
            );
          }

          return (
            <Button
              key={item.href}
              render={<Link href={item.href} />}
              variant={isActive ? "default" : "ghost"}
              size="icon"
              className={`relative h-11 w-11 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-black/5 hover:text-sidebar-foreground"
              }`}
              aria-label={item.title}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="sr-only">{item.title}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
