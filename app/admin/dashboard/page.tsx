"use client";

import { AdminSidebar } from "@/components/SideNavBar/AdminSideNavBar";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import type { ElementType, ReactNode } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiMap,
  FiMenu,
  FiRefreshCw,
  FiTruck,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";

const API = "http://localhost:5000/api";

type RecordItem = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  depot_id?: number | null;
  depot_name?: string;
  manager_id?: number | null;
  registration_no?: string;
  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;
  route_id?: number;
  bus_id?: number | null;
  driver_id?: number | null;
  staff_id?: number | null;
  staff_name?: string;
  driver_name?: string;
  service_date?: string;
  departure_time?: string;
  status_code?: string;
};

type Schedule = RecordItem & {
  status?: string;
};

function getArray(response: any): RecordItem[] {
  const body = response?.data;

  const data =
    body?.data ??
    body?.depots ??
    body?.users ??
    body?.buses ??
    body?.drivers ??
    body?.routes ??
    body?.schedules ??
    body;

  return Array.isArray(data) ? data : [];
}

function statusOf(item: RecordItem) {
  return (item.status || "").toUpperCase();
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(value?: string) {
  if (!value) return "—";

  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) return value;

  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";

  return `${hour % 12 || 12}:${match[2]} ${suffix}`;
}

function displayStatus(status?: string) {
  const normalized = (status || "SCHEDULED").toUpperCase();

  const styles: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-700",
    RUNNING: "bg-amber-50 text-amber-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-red-50 text-red-700",
  };

  return {
    label: normalized.charAt(0) + normalized.slice(1).toLowerCase(),
    className: styles[normalized] || "bg-slate-100 text-slate-600",
  };
}

export default function DashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [depots, setDepots] = useState<RecordItem[]>([]);
  const [users, setUsers] = useState<RecordItem[]>([]);
  const [buses, setBuses] = useState<RecordItem[]>([]);
  const [drivers, setDrivers] = useState<RecordItem[]>([]);
  const [routes, setRoutes] = useState<RecordItem[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const loadDashboard = useCallback(async () => {
    setError("");

    const endpoints = [
      { url: `${API}/depots`, set: setDepots },
      { url: `${API}/users`, set: setUsers },
      { url: `${API}/buses`, set: setBuses },
      { url: `${API}/drivers`, set: setDrivers },
      { url: `${API}/routes`, set: setRoutes },
      { url: `${API}/schedules`, set: setSchedules },
    ] as const;

    const results = await Promise.allSettled(
      endpoints.map((item) => axios.get(item.url)),
    );

    let failures = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        endpoints[index].set(getArray(result.value));
      } else {
        failures++;
        console.log(`Failed to load ${endpoints[index].url}`, result.reason);
      }
    });

    if (failures > 0) {
      setError(
        `${failures} data source(s) could not be loaded. Check the corresponding backend API endpoints.`,
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const todaySchedules = useMemo(() => {
    return schedules
      .filter((item) => item.service_date?.slice(0, 10) === todayString())
      .sort((a, b) =>
        (a.departure_time || "").localeCompare(b.departure_time || ""),
      );
  }, [schedules]);

  const activeDepots = depots.filter(
    (item) => statusOf(item) === "ACTIVE",
  ).length;

  const activeUsers = users.filter(
    (item) => statusOf(item) === "ACTIVE",
  ).length;

  const supervisors = users.filter(
    (item) => item.role?.toUpperCase() === "SUPERVISOR",
  );

  const operationalStaff = users.filter((item) =>
    ["OPERATIONAL_STAFF", "OPERATIONAL STAFF"].includes(
      item.role?.toUpperCase() || "",
    ),
  );

  const availableBuses = buses.filter((item) =>
    ["AVAILABLE", "ACTIVE", "OPERATIONAL"].includes(statusOf(item)),
  ).length;

  const assignedBuses = buses.filter(
    (item) => statusOf(item) === "ASSIGNED",
  ).length;

  const maintenanceBuses = buses.filter(
    (item) => statusOf(item) === "MAINTENANCE",
  ).length;

  const inactiveBuses = buses.filter((item) =>
    ["INACTIVE", "OUT_OF_SERVICE"].includes(statusOf(item)),
  ).length;

  const scheduledCount = schedules.filter(
    (item) => statusOf(item) === "SCHEDULED",
  ).length;

  const runningCount = schedules.filter(
    (item) => statusOf(item) === "RUNNING",
  ).length;

  const completedCount = schedules.filter(
    (item) => statusOf(item) === "COMPLETED",
  ).length;

  const cancelledCount = schedules.filter(
    (item) => statusOf(item) === "CANCELLED",
  ).length;

  function routeName(schedule: Schedule) {
    if (schedule.route_name) return schedule.route_name;

    const route = routes.find((item) => item.id === schedule.route_id);

    if (route) {
      return (
        route.route_name ||
        route.name ||
        `${route.start_point || "Start"} → ${route.end_point || "End"}`
      );
    }

    return "Route not available";
  }

  function busName(schedule: Schedule) {
    const bus = buses.find((item) => item.id === schedule.bus_id);

    return bus?.registration_no || schedule.registration_no || "Not assigned";
  }

  function driverName(schedule: Schedule) {
    const driver = drivers.find((item) => item.id === schedule.driver_id);

    return schedule.driver_name || driver?.name || "Not assigned";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <button
            type="button"
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
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-red-600">
                  SYSTEM OVERVIEW
                </p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
                  Administrator Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Manage depots, users, fleet resources, routes, schedules and
                  system reports from one place.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                <FiActivity />
                System overview
              </div>
            </div>

            {error && (
              <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <FiAlertCircle className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    Some dashboard data is unavailable
                  </p>
                  <p className="mt-1 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Main statistics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                title="Total Depots"
                value={loading ? "—" : String(depots.length)}
                description={`${activeDepots} active depots`}
                icon={FiBriefcase}
                href="/admin/depots"
              />

              <StatCard
                title="Total Buses"
                value={loading ? "—" : String(buses.length)}
                description={`${availableBuses} available vehicles`}
                icon={FiTruck}
                href="/admin/buses"
              />

              <StatCard
                title="Registered Routes"
                value={loading ? "—" : String(routes.length)}
                description="Configured transport routes"
                icon={FiMap}
                href="/admin/routes"
              />

              <StatCard
                title="System Users"
                value={loading ? "—" : String(users.length)}
                description={`${activeUsers} active accounts`}
                icon={FiUsers}
                href="/admin/users"
              />

              <StatCard
                title="Drivers"
                value={loading ? "—" : String(drivers.length)}
                description="Registered vehicle drivers"
                icon={FiUserCheck}
                href="/admin/drivers"
              />

              <StatCard
                title="Today's Schedules"
                value={loading ? "—" : String(todaySchedules.length)}
                description={`${runningCount} trips currently running`}
                icon={FiCalendar}
                href="/admin/schedules"
              />
            </div>

            {/* Quick management */}
            <section className="mt-8">
              <SectionHeading
                title="Quick Management"
                subtitle="Access the main administrator functions."
              />

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <QuickAction
                  href="/admin/depots"
                  title="Manage Depots"
                  description="Locations and depot supervisors"
                  icon={<FiBriefcase />}
                />
                <QuickAction
                  href="/admin/users"
                  title="Manage Users"
                  description="Accounts, roles and access"
                  icon={<FiUsers />}
                />
                <QuickAction
                  href="/admin/buses"
                  title="Manage Fleet"
                  description="Vehicle details and availability"
                  icon={<FiTruck />}
                />
                <QuickAction
                  href="/admin/drivers"
                  title="Manage Drivers"
                  description="Driver records and licences"
                  icon={<FiUserCheck />}
                />
                <QuickAction
                  href="/admin/routes"
                  title="Manage Routes"
                  description="Route details and endpoints"
                  icon={<FiMap />}
                />
                <QuickAction
                  href="/admin/schedules"
                  title="Manage Schedules"
                  description="Plan and manage services"
                  icon={<FiCalendar />}
                />
                <QuickAction
                  href="/admin/reports"
                  title="View Reports"
                  description="Operational reports and summaries"
                  icon={<FiBarChart2 />}
                />
              </div>
            </section>

            {/* Today's schedules */}
            <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <SectionHeading
                  title="Today's Schedules"
                  subtitle="Review the planned services for today."
                />

                <Link
                  href="/admin/schedules"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  All schedules <FiArrowRight />
                </Link>
              </div>

              {loading ? (
                <div className="py-16 text-center text-sm text-slate-500">
                  Loading schedule information...
                </div>
              ) : todaySchedules.length === 0 ? (
                <div className="mt-5 rounded-xl bg-slate-50 px-4 py-12 text-center">
                  <FiCalendar className="mx-auto text-3xl text-slate-400" />
                  <p className="mt-3 font-semibold text-slate-700">
                    No schedules for today
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Create or review schedules to plan services.
                  </p>
                  <Link
                    href="/admin/schedules"
                    className="mt-4 inline-flex items-center gap-2 font-semibold text-red-600"
                  >
                    Manage schedules <FiArrowRight />
                  </Link>
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-3 py-3">Route</th>
                        <th className="px-3 py-3">Bus</th>
                        <th className="px-3 py-3">Driver</th>
                        <th className="px-3 py-3">Departure</th>
                        <th className="px-3 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {todaySchedules.slice(0, 8).map((item) => {
                        const status = displayStatus(item.status);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-3 py-4">
                              <p className="font-semibold text-slate-800">
                                {routeName(item)}
                              </p>
                              {item.route_code && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {item.route_code}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-4 text-sm text-slate-600">
                              {busName(item)}
                            </td>
                            <td className="px-3 py-4 text-sm text-slate-600">
                              {driverName(item)}
                            </td>
                            <td className="px-3 py-4 text-sm text-slate-600">
                              {formatTime(item.departure_time)}
                            </td>
                            <td className="px-3 py-4">
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
            </section>

            {/* Schedule status */}
            <section className="mt-8">
              <SectionHeading
                title="Schedule Overview"
                subtitle="Current status of all recorded schedules."
              />

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Scheduled"
                  value={scheduledCount}
                  icon={<FiCalendar />}
                  color="blue"
                  loading={loading}
                />
                <MetricCard
                  title="Running"
                  value={runningCount}
                  icon={<FiClock />}
                  color="amber"
                  loading={loading}
                />
                <MetricCard
                  title="Completed"
                  value={completedCount}
                  icon={<FiCheckCircle />}
                  color="green"
                  loading={loading}
                />
                <MetricCard
                  title="Cancelled"
                  value={cancelledCount}
                  icon={<FiX />}
                  color="red"
                  loading={loading}
                />
              </div>
            </section>

            {/* Fleet status */}
            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <SectionHeading
                  title="Fleet Availability"
                  subtitle="Distribution of registered buses by status."
                />

                <div className="mt-6 space-y-5">
                  <StatusBar
                    label="Available"
                    value={availableBuses}
                    total={buses.length}
                    color="bg-emerald-500"
                  />
                  <StatusBar
                    label="Assigned"
                    value={assignedBuses}
                    total={buses.length}
                    color="bg-blue-500"
                  />
                  <StatusBar
                    label="Maintenance"
                    value={maintenanceBuses}
                    total={buses.length}
                    color="bg-amber-500"
                  />
                  <StatusBar
                    label="Inactive"
                    value={inactiveBuses}
                    total={buses.length}
                    color="bg-red-500"
                  />
                </div>

                <Link
                  href="/admin/buses"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-red-600"
                >
                  Manage fleet <FiArrowRight />
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <SectionHeading
                  title="People & Depots"
                  subtitle="A summary of users and depot management."
                />

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MiniStat
                    label="Active users"
                    value={loading ? "—" : activeUsers}
                  />
                  <MiniStat
                    label="Supervisors"
                    value={loading ? "—" : supervisors.length}
                  />
                  <MiniStat
                    label="Operational staff"
                    value={loading ? "—" : operationalStaff.length}
                  />
                  <MiniStat
                    label="Active depots"
                    value={loading ? "—" : activeDepots}
                  />
                </div>

                <div className="mt-5 rounded-xl border border-slate-100 p-4">
                  <div className="flex items-start gap-3">
                    <FiBriefcase className="mt-1 text-red-600" size={20} />
                    <div>
                      <p className="font-semibold text-slate-800">
                        Depot administration
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Manage depot details and assign supervisors through the
                        depot management page.
                      </p>
                      <Link
                        href="/admin/depots"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-600"
                      >
                        Manage depots <FiArrowRight />
                      </Link>
                    </div>
                  </div>
                </div>

                <Link
                  href="/admin/users"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red-600"
                >
                  Manage user accounts <FiArrowRight />
                </Link>
              </div>
            </section>

            {/* Reports */}
            <section className="mt-8 flex flex-col justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-white/10 p-3">
                  <FiFileText size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">System Reports</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Review fleet, route and schedule summaries.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/reports"
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold hover:bg-red-700"
              >
                Open reports <FiArrowRight />
              </Link>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  description: string;
  icon: ElementType;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-950">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
          <Icon size={22} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-red-600">
        View details <FiArrowRight />
      </div>
    </Link>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-red-200 hover:bg-red-50/50"
    >
      <div className="rounded-lg bg-slate-100 p-3 text-slate-600 group-hover:bg-red-100 group-hover:text-red-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <FiArrowRight className="mt-1 shrink-0 text-slate-400 group-hover:text-red-600" />
    </Link>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  color: "blue" | "amber" | "green" | "red";
  loading: boolean;
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`rounded-lg p-2 ${styles[color]}`}>{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-extrabold text-slate-950">
        {loading ? "—" : value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? Math.min((value / total) * 100, 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-800">
          {value}
          <span className="ml-1 text-xs font-normal text-slate-400">
            ({Math.round(percentage)}%)
          </span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
