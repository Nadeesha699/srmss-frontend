"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiBarChart2,
  FiCalendar,
  FiFileText,
  FiLogOut,
  FiMap,
  FiTruck,
  FiUsers,
  FiUserCheck,
  FiUser,
  FiMapPin,
  FiX,
} from "react-icons/fi";

interface AdminSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: FiBarChart2,
  },
  {
    label: "Depots",
    href: "/admin/depots",
    icon: FiMapPin,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: FiUsers,
  },
  {
    label: "Buses",
    href: "/admin/buses",
    icon: FiTruck,
  },
  {
    label: "Drivers",
    href: "/admin/drivers",
    icon: FiUserCheck,
  },
  {
    label: "Routes",
    href: "/admin/routes",
    icon: FiMap,
  },
  {
    label: "Schedules",
    href: "/admin/schedules",
    icon: FiCalendar,
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: FiFileText,
  },
  {
    label: "My Profile",
    href: "/admin/profile",
    icon: FiUser,
  },
];

export function AdminSidebar({ mobileOpen, onClose }: AdminSidebarProps) {
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
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-slate-950 shadow-2xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <Link
            href="/admin/dashboard"
            onClick={onClose}
            className="flex items-center gap-3"
          >
              <img
            src="/logo-red.png"
            alt="SRMSS Logo"
            className="h-10 w-10 rounded-xl object-contain"
          />

            {/* Logo Text */}
            <div>
              <p className="font-bold tracking-wide text-white">SRMSS</p>

              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                Admin Portal
              </p>
            </div>
          </Link>

          {/* Mobile Close */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <FiX size={21} />
          </button>
        </div>
        {/* User Profile */}
        <div className="border-b border-white/10 px-5 py-5">
          {/* Admin Account */}
          <div className="mb-3 rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                A
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  Administrator
                </p>

                <p className="truncate text-xs text-slate-500">System Admin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            Management
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

        {/* Bottom Section */}
        <div className="border-t border-white/10 p-4">
          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 transition group-hover:bg-red-500/10">
              <FiLogOut size={18} />
            </div>

            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
