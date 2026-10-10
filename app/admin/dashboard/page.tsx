
"use client";

import { AdminSidebar } from "@/components/SideNavBar/AdminSideNavBar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiMap,
  FiMenu,
  FiTruck,
  FiUserCheck,
  FiUsers,
  FiX,
  FiRefreshCw,
  FiLoader,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";

/* =========================================================
   API
========================================================= */

const USERS_API = "http://localhost:5000/api/users";
const BUSES_API = "http://localhost:5000/api/buses";
const ROUTES_API = "http://localhost:5000/api/routes";
const SCHEDULES_API = "http://localhost:5000/api/schedules";

/* =========================================================
   TYPES
========================================================= */

type User = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

type Bus = {
  id: number;
  registration_no?: string;
  status?: string;
};

type OperationalStaff = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

type Route = {
  id: number;
  route_code?: string;
  name?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;
  status?: string;
};

type ScheduleStatus =
  | "SCHEDULED"
  | "RUNNING"
  | "COMPLETED"
  | "CANCELLED";

type Schedule = {
  id: number;
  schedule_code?: string;

  route_id?: number;
  route_code?: string;
  route_name?: string;
  name?: string;
  start_point?: string;
  end_point?: string;

  bus_id?: number | null;
  registration_no?: string | null;

  staff_id?: number | null;
  staff_name?: string | null;

  // Legacy backend support
  driver_id?: number | null;
  driver_name?: string | null;

  depot_id?: number | null;
  depot_name?: string | null;

  service_date?: string;
  departure_time?: string;
  arrival_time?: string;

  status?: ScheduleStatus | string;
};

/* =========================================================
   RESPONSE HELPER
========================================================= */

function extractData(response: any) {
  return (
    response?.data?.data ??
    response?.data?.users ??
    response?.data?.buses ??
    response?.data?.drivers ??
    response?.data?.routes ??
    response?.data?.schedules ??
    response?.data ??
    []
  );
}

/* =========================================================
   DATE HELPERS
========================================================= */

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(time?: string) {
  if (!time) return "-";

  const parts = time.split(":");

  if (parts.length < 2) {
    return time;
  }

  const hour = Number(parts[0]);
  const minute = parts[1];

  if (Number.isNaN(hour)) {
    return time;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [staff, setStaff] = useState<OperationalStaff[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD DASHBOARD DATA
  ======================================================= */

  const loadDashboard = async () => {
    try {
      setError("");

      const [
        usersResponse,
        busesResponse,
        routesResponse,
        schedulesResponse,
      ] = await Promise.all([
        axios.get(USERS_API),
        axios.get(BUSES_API),
        axios.get(ROUTES_API),
        axios.get(SCHEDULES_API),
      ]);

      const usersData = extractData(usersResponse);
      const busesData = extractData(busesResponse);
      const routesData = extractData(routesResponse);
      const schedulesData = extractData(schedulesResponse);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setBuses(Array.isArray(busesData) ? busesData : []);
      setRoutes(Array.isArray(routesData) ? routesData : []);
      setSchedules(
        Array.isArray(schedulesData) ? schedulesData : []
      );
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError(
        "Unable to load dashboard data. Please check that the backend API is running."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  /* =======================================================
     TODAY'S SCHEDULES
  ======================================================= */

  const todaysSchedules = useMemo(() => {
    const today = getTodayDate();

    return schedules
      .filter((schedule) => {
        if (!schedule.service_date) {
          return false;
        }

        return schedule.service_date.slice(0, 10) === today;
      })
      .sort((a, b) => {
        return (
          (a.departure_time || "").localeCompare(
            b.departure_time || ""
          )
        );
      });
  }, [schedules]);

  /* =======================================================
     STATS
  ======================================================= */

  const totalUsers = users.length;

  const totalBuses = buses.length;

  const totalRoutes = routes.length;

  const totalStaff = staff.length;

  const activeBuses = buses.filter((bus) => {
    const status = bus.status?.toUpperCase();

    return (
      status === "ACTIVE" ||
      status === "AVAILABLE" ||
      status === "OPERATIONAL"
    );
  }).length;

  const maintenanceBuses = buses.filter((bus) => {
    return bus.status?.toUpperCase() === "MAINTENANCE";
  }).length;

  const inactiveBuses = buses.filter((bus) => {
    const status = bus.status?.toUpperCase();

    return (
      status === "INACTIVE" ||
      status === "OUT_OF_SERVICE"
    );
  }).length;

  const availableStaff = staff.filter((person) => {
    const status = person.status?.toUpperCase();

    return (
      status === "ACTIVE" ||
      status === "AVAILABLE" ||
      status === "VERIFIED"
    );
  }).length;

  const activeSchedules = schedules.filter((schedule) => {
    return schedule.status === "SCHEDULED";
  }).length;

  const runningSchedules = schedules.filter((schedule) => {
    return schedule.status === "RUNNING";
  }).length;

  const cancelledSchedules = schedules.filter((schedule) => {
    return schedule.status === "CANCELLED";
  }).length;

  /* =======================================================
     SCHEDULE STATUS
  ======================================================= */

  const getScheduleStatus = (schedule: Schedule) => {
    const status = schedule.status?.toUpperCase();

    if (status === "CANCELLED") {
      return {
        label: "Cancelled",
        className: "bg-red-50 text-red-700",
      };
    }

    if (status === "RUNNING") {
      return {
        label: "Running",
        className: "bg-blue-50 text-blue-700",
      };
    }

    if (status === "COMPLETED") {
      return {
        label: "Completed",
        className: "bg-green-50 text-green-700",
      };
    }

    return {
      label: "Scheduled",
      className: "bg-green-50 text-green-700",
    };
  };

  /* =======================================================
     ROUTE NAME
  ======================================================= */

  const getRouteName = (schedule: Schedule) => {
    if (
      schedule.route_name &&
      schedule.route_name.trim()
    ) {
      return schedule.route_name;
    }

    if (schedule.name && schedule.name.trim()) {
      return schedule.name;
    }

    const route = routes.find(
      (item) => item.id === schedule.route_id
    );

    if (route) {
      return (
        route.name ||
        route.route_name ||
        `${route.start_point || "-"} - ${
          route.end_point || "-"
        }`
      );
    }

    if (
      schedule.start_point ||
      schedule.end_point
    ) {
      return `${schedule.start_point || "-"} - ${
        schedule.end_point || "-"
      }`;
    }

    return "Unknown Route";
  };

  /* =======================================================
     STAFF NAME
  ======================================================= */

  const getStaffName = (schedule: Schedule) => {
    if (
      schedule.staff_name &&
      schedule.staff_name.trim()
    ) {
      return schedule.staff_name;
    }

    // Temporary compatibility with old backend
    if (
      schedule.driver_name &&
      schedule.driver_name.trim()
    ) {
      return schedule.driver_name;
    }

    if (schedule.staff_id) {
      const person = staff.find(
        (item) => item.id === schedule.staff_id
      );

      if (person?.name) {
        return person.name;
      }
    }

    return "Not assigned";
  };

  /* =======================================================
     BUS
  ======================================================= */

  const getBusNumber = (schedule: Schedule) => {
    if (
      schedule.registration_no &&
      schedule.registration_no.trim()
    ) {
      return schedule.registration_no;
    }

    if (schedule.bus_id) {
      const bus = buses.find(
        (item) => item.id === schedule.bus_id
      );

      if (bus?.registration_no) {
        return bus.registration_no;
      }
    }

    return "Not assigned";
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* ===================================================
          MAIN
      =================================================== */}

      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center">
            <button
              onClick={() => setMobileOpen(true)}
              className="mr-4 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <FiMenu size={22} />
            </button>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Administrator
              </p>

              <p className="font-semibold text-slate-800">
                SRMSS Management Portal
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={
                refreshing ? "animate-spin" : ""
              }
            />

            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="mb-8">
              <p className="text-sm font-semibold text-red-600">
                Operations Overview
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                Good morning, Administrator
              </h1>

              <p className="mt-2 text-slate-500">
                Monitor and manage the SRMSS transport
                operation from one place.
              </p>
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <FiAlertCircle
                  className="mt-0.5 shrink-0"
                  size={19}
                />

                <div>
                  <p className="font-semibold">
                    Dashboard data unavailable
                  </p>

                  <p className="mt-1 text-sm">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* =================================================
                MAIN STATS
            ================================================= */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DashboardStat
                title="Total Users"
                value={loading ? "..." : String(totalUsers)}
                icon={FiUsers}
                description="Registered system users"
                href="/admin/users"
              />

              <DashboardStat
                title="Total Buses"
                value={loading ? "..." : String(totalBuses)}
                icon={FiTruck}
                description={`${activeBuses} active vehicles`}
                href="/admin/buses"
              />

              <DashboardStat
                title="Routes"
                value={loading ? "..." : String(totalRoutes)}
                icon={FiMap}
                description="Registered routes"
                href="/admin/routes"
              />
            </div>

            {/* =================================================
                TODAY'S SCHEDULES + QUICK MANAGEMENT
            ================================================= */}

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              {/* Today's Schedules */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Today&apos;s Schedules
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Planned transport operations for
                      today
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <FiCalendar size={21} />
                  </div>
                </div>

                {loading ? (
                  <div className="flex min-h-[260px] items-center justify-center">
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <FiLoader
                        className="animate-spin"
                        size={20}
                      />

                      Loading schedules...
                    </div>
                  </div>
                ) : todaysSchedules.length === 0 ? (
                  <div className="mt-6 flex min-h-[220px] flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
                    <div className="rounded-full bg-white p-4 text-slate-400 shadow-sm">
                      <FiCalendar size={25} />
                    </div>

                    <p className="mt-3 font-semibold text-slate-700">
                      No schedules for today
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      There are no planned schedules for
                      the current date.
                    </p>

                    <Link
                      href="/admin/schedules"
                      className="mt-4 text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                      Create a schedule
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-left">
                          <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Route
                          </th>

                          <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Bus
                          </th>

                          <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Operational Staff
                          </th>

                          <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Time
                          </th>

                          <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {todaysSchedules
                          .slice(0, 6)
                          .map((schedule) => {
                            const status =
                              getScheduleStatus(
                                schedule
                              );

                            return (
                              <tr
                                key={schedule.id}
                                className="transition hover:bg-slate-50"
                              >
                                <td className="py-4">
                                  <div className="font-semibold text-slate-800">
                                    {getRouteName(
                                      schedule
                                    )}
                                  </div>

                                  {schedule.route_code && (
                                    <div className="mt-1 text-xs text-slate-400">
                                      {
                                        schedule.route_code
                                      }
                                    </div>
                                  )}
                                </td>

                                <td className="py-4">
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <FiTruck
                                      size={14}
                                    />

                                    {getBusNumber(
                                      schedule
                                    )}
                                  </div>
                                </td>

                                <td className="py-4">
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <FiUserCheck
                                      size={14}
                                    />

                                    {getStaffName(
                                      schedule
                                    )}
                                  </div>
                                </td>

                                <td className="py-4">
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <FiClock
                                      size={14}
                                    />

                                    {formatTime(
                                      schedule.departure_time
                                    )}
                                  </div>
                                </td>

                                <td className="py-4">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                                  >
                                    {status.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}

                <Link
                  href="/admin/schedules"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red-600 transition hover:text-red-700"
                >
                  View all schedules
                  <FiArrowRight size={16} />
                </Link>
              </div>

              {/* Quick Management */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Quick Management
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Frequently used administrator actions.
                </p>

                <div className="mt-6 space-y-3">
                  <QuickAction
                    href="/admin/users"
                    icon={<FiUsers />}
                    title="Manage Users"
                  />

                  <QuickAction
                    href="/admin/buses"
                    icon={<FiTruck />}
                    title="Manage Buses"
                  />

                  <QuickAction
                    href="/admin/routes"
                    icon={<FiMap />}
                    title="Manage Routes"
                  />

                  <QuickAction
                    href="/admin/schedules"
                    icon={<FiCalendar />}
                    title="Manage Schedules"
                  />
                </div>
              </div>
            </div>

            {/* =================================================
                SCHEDULE OVERVIEW
            ================================================= */}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Schedule Overview
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Current schedule status across the
                    system.
                  </p>
                </div>

                <Link
                  href="/admin/schedules"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  Manage schedules
                  <FiArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Scheduled"
                  value={
                    loading
                      ? "..."
                      : String(activeSchedules)
                  }
                  icon={<FiCalendar />}
                />

                <Metric
                  label="Running"
                  value={
                    loading
                      ? "..."
                      : String(runningSchedules)
                  }
                  icon={<FiClock />}
                />

                <Metric
                  label="Cancelled"
                  value={
                    loading
                      ? "..."
                      : String(cancelledSchedules)
                  }
                  icon={<FiX />}
                />
              </div>
            </div>

            {/* =================================================
                SYSTEM OVERVIEW
            ================================================= */}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div>
                  <h2 className="font-bold text-slate-900">
                    System Overview
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Current resource availability.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />

                  System Operational
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Active Buses"
                  value={
                    loading
                      ? "..."
                      : String(activeBuses)
                  }
                  icon={<FiTruck />}
                />

                <Metric
                  label="Operational Staff"
                  value={
                    loading
                      ? "..."
                      : String(availableStaff)
                  }
                  icon={<FiUserCheck />}
                />

                <Metric
                  label="Registered Routes"
                  value={
                    loading
                      ? "..."
                      : String(totalRoutes)
                  }
                  icon={<FiMap />}
                />
              </div>
            </div>

            {/* =================================================
                FLEET + STAFF STATUS
            ================================================= */}

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* Fleet Status */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Fleet Status
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Current vehicle availability
                    </p>
                  </div>

                  <FiTruck
                    className="text-red-600"
                    size={22}
                  />
                </div>

                <div className="mt-6 space-y-4">
                  <StatusRow
                    label="Active"
                    value={activeBuses}
                    total={totalBuses}
                    type="success"
                  />

                  <StatusRow
                    label="Maintenance"
                    value={maintenanceBuses}
                    total={totalBuses}
                    type="warning"
                  />

                  <StatusRow
                    label="Inactive"
                    value={inactiveBuses}
                    total={totalBuses}
                    type="danger"
                  />
                </div>
              </div>

              {/* Operational Staff Status */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Operational Staff
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Current staff availability
                    </p>
                  </div>

                  <FiUserCheck
                    className="text-red-600"
                    size={22}
                  />
                </div>

                <div className="mt-6 space-y-4">
                  <StatusRow
                    label="Available"
                    value={availableStaff}
                    total={totalStaff}
                    type="success"
                  />

                  <StatusRow
                    label="On Duty"
                    value={Math.max(
                      totalStaff - availableStaff,
                      0
                    )}
                    total={totalStaff}
                    type="warning"
                  />

                  <StatusRow
                    label="Inactive"
                    value={Math.max(
                      totalStaff -
                        availableStaff -
                        Math.max(
                          totalStaff - availableStaff,
                          0
                        ),
                      0
                    )}
                    total={totalStaff}
                    type="danger"
                  />
                </div>
              </div>
            </div>

            {/* =================================================
                FOOTER
            ================================================= */}

            <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row">
              <p>
                SRMSS Management Portal
              </p>

              <div className="flex items-center gap-2">
                <FiCheckCircle
                  className="text-green-500"
                  size={14}
                />

                Connected to backend
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD STAT
========================================================= */

function DashboardStat({
  title,
  value,
  icon: Icon,
  description,
  href,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
          <Icon size={21} />
        </div>
      </div>
    </Link>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  href,
  icon,
  title,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-slate-100 p-4 transition hover:border-red-100 hover:bg-red-50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-red-100 group-hover:text-red-600">
          {icon}
        </div>

        <span className="text-sm font-semibold text-slate-700">
          {title}
        </span>
      </div>

      <FiArrowRight
        className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-red-600"
        size={17}
      />
    </Link>
  );
}

/* =========================================================
   METRIC
========================================================= */

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {label}
        </p>

        <span className="text-slate-400">
          {icon}
        </span>
      </div>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   STATUS ROW
========================================================= */

function StatusRow({
  label,
  value,
  total,
  type,
}: {
  label: string;
  value: number;
  total: number;
  type: "success" | "warning" | "danger";
}) {
  const colors = {
    success: "bg-green-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };

  const percentage =
    total > 0
      ? Math.min(
          Math.round((value / total) * 100),
          100
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${colors[type]}`}
          />

          <span className="text-sm font-medium text-slate-700">
            {label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">
            {value}
          </span>

          <span className="text-xs text-slate-400">
            {percentage}%
          </span>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${colors[type]}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

