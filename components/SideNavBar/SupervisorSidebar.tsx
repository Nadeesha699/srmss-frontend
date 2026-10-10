"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiBarChart2,
  FiCalendar,
  FiClock,
  FiLogOut,
  FiMapPin,
  FiTruck,
  FiUser,
  FiUserCheck,
  FiX,
} from "react-icons/fi";

interface SupervisorSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    label: "Dashboard",
    href: "/supervisor/dashboard",
    icon: FiBarChart2,
  },
  {
    label: "Schedules",
    href: "/supervisor/schedules",
    icon: FiCalendar,
  },
  {
    label: "Assignments",
    href: "/supervisor/assignments",
    icon: FiTruck,
  },
  {
    label: "Trip Monitoring",
    href: "/supervisor/trips",
    icon: FiMapPin,
  },
  {
    label: "Delays",
    href: "/supervisor/delays",
    icon: FiClock,
  },
  {
    label: "Operational Staff",
    href: "/supervisor/operational-staff",
    icon: FiUserCheck,
  },
  {
    label: "My Profile",
    href: "/supervisor/profile",
    icon: FiUser,
  },
];

export default function SupervisorSidebar({
  mobileOpen,
  onClose,
}: SupervisorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("srmss_user");
    localStorage.removeItem("srmss_token");
    router.push("/login");
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-950 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/supervisor/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-lg font-bold text-white shadow-lg shadow-red-950/30">
              S
            </div>

            <div>
              <p className="font-bold tracking-wide text-white">SRMSS</p>

              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Supervisor
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <FiX size={21} />
          </button>
        </div>

        {/* User Profile */}
        <div className="border-b border-white/10 px-5 py-5">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 font-bold text-white">
              S
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                Depot Supervisor
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                Operations Management
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            Operations
          </p>

          <nav className="mt-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-red-600 text-white shadow-lg shadow-red-950/30"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
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

        {/* Supervisor Account */}
        <div className="border-t border-white/10 p-4">
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
