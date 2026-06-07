"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Upload,
  Library,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    disabled: false,
  },
  {
    title: "Uploads",
    href: "/dashboard/uploads",
    icon: Upload,
    disabled: true,
  },
  {
    title: "Collection",
    href: "/dashboard/collection",
    icon: Library,
    disabled: true,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    disabled: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar px-4 py-6 h-[calc(100vh-64px)] lg:h-[calc(100vh-73px)] sticky top-[64px] lg:top-[73px]">
      <div className="flex-1 space-y-1 mt-6">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted-foreground opacity-50 cursor-not-allowed"
                title="Coming Soon"
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border mt-auto">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
