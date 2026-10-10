
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiDroplet,
  FiLogOut,
  FiRefreshCw,
  FiTool,
  FiUser,
  FiX,
} from "react-icons/fi";

interface OperationalSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    label: "Dashboard",
    href: "/operational/dashboard",
    icon: FiActivity,
  },
  {
    label: "Assigned Trips",
    href: "/operational/trips",
    icon: FiCalendar,
  },
  {
    label: "Trip Updates",
    href: "/operational/trips/update",
    icon: FiRefreshCw,
  },
  {
    label: "Report Delays",
    href: "/operational/delays",
    icon: FiAlertTriangle,
  },
  {
    label: "Fuel Records",
    href: "/operational/fuel",
    icon: FiDroplet,
  },
  {
    label: "Maintenance",
    href: "/operational/maintenance",
    icon: FiTool,
  },
  {
    label: "My Profile",
    href: "/operational/profile",
    icon: FiUser,
  },
];

export default function OperationalSidebar({
  mobileOpen,
  onClose,
}: OperationalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("srmss_user");
    localStorage.removeItem("srmss_token");

    onClose();
    router.replace("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col bg-slate-950 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/operational/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-lg font-bold text-white shadow-lg shadow-red-950/30">
              O
            </div>

            <div>
              <p className="font-bold tracking-wide text-white">SRMSS</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Operational Staff
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
          >
            <FiX size={21} />
          </button>
        </div>

        {/* Staff information */}
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 font-bold text-white">
              O
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                Operational Staff
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Depot Operations
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            Operations
          </p>

          <nav aria-label="Operational navigation" className="mt-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              // Prevent Assigned Trips from being active on Trip Updates.
              const active =
                pathname === item.href ||
                (item.href !== "/operational/trips" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-red-600 text-white shadow-lg shadow-red-950/30"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-slate-500 group-hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                  </div>

                  <span>{item.label}</span>

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <FiLogOut size={19} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

