
"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiBarChart2,
  FiTrendingUp,
  FiTruck,
  FiMap,
  FiDownload,
  FiCalendar,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiMenu,
  FiX,
  FiFileText,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";

import { AdminSidebar } from "@/components/SideNavBar/AdminSideNavBar";

/* =========================================================
   API
========================================================= */

const TRIPS_API = "http://localhost:5000/api/trips";
const ROUTES_API = "http://localhost:5000/api/routes";
const BUSES_API = "http://localhost:5000/api/buses";
const USERS_API = "http://localhost:5000/api/users";
const MAINTENANCE_API = "http://localhost:5000/api/maintenance";

/* =========================================================
   TYPES
========================================================= */

type ReportType =
  | "Trip Performance Report"
  | "Route Performance Report"
  | "Vehicle Utilization Report"
  | "Operational Staff Performance Report"
  | "Maintenance Report";

type Trip = {
  id: number;
  schedule_id?: number;
  assignment_id?: number;
  route_id?: number;
  route_code?: string;
  route_name?: string;
  bus_id?: number;
  registration_no?: string;
  staff_id?: number;
  staff_name?: string;
  driver_id?: number;
  driver_name?: string;
  status?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  scheduled_departure?: string;
  scheduled_arrival?: string;
  delay_minutes?: number;
  created_at?: string;
};

type Route = {
  id: number;
  route_code?: string;
  name?: string;
  route_name?: string;
  status?: string;
};

type Bus = {
  id: number;
  registration_no?: string;
  status?: string;
};

type User = {
  id: number;
  name?: string;
  role?: string;
  status?: string;
};

type Maintenance = {
  id: number;
  bus_id?: number;
  status?: string;
};

type RouteReport = {
  route: string;
  trips: number;
  completed: number;
  delayed: number;
  onTimeRate: number;
};

/* =========================================================
   PAGE
========================================================= */

export default function ReportsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [reportType, setReportType] = useState<ReportType>(
    "Trip Performance Report"
  );

  const [fromDate, setFromDate] = useState("2026-10-01");
  const [toDate, setToDate] = useState("2026-10-06");

  const [generatedReport, setGeneratedReport] = useState("");

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadReportsData = async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const results = await Promise.allSettled([
        axios.get(TRIPS_API),
        axios.get(ROUTES_API),
        axios.get(BUSES_API),
        axios.get(USERS_API),
        axios.get(MAINTENANCE_API),
      ]);

      const [tripsResult, routesResult, busesResult, usersResult, maintenanceResult] =
        results;

      if (tripsResult.status === "fulfilled") {
        setTrips(
          tripsResult.value.data?.data ||
            tripsResult.value.data ||
            []
        );
      }

      if (routesResult.status === "fulfilled") {
        setRoutes(
          routesResult.value.data?.data ||
            routesResult.value.data ||
            []
        );
      }

      if (busesResult.status === "fulfilled") {
        setBuses(
          busesResult.value.data?.data ||
            busesResult.value.data ||
            []
        );
      }

      if (usersResult.status === "fulfilled") {
        setUsers(
          usersResult.value.data?.data ||
            usersResult.value.data ||
            []
        );
      }

      if (maintenanceResult.status === "fulfilled") {
        setMaintenance(
          maintenanceResult.value.data?.data ||
            maintenanceResult.value.data ||
            []
        );
      }

      const failedRequests = results.filter(
        (result) => result.status === "rejected"
      ).length;

      if (failedRequests === results.length) {
        setError(
          "Unable to load report data. Please make sure the backend is running."
        );
      } else if (failedRequests > 0) {
        setError(
          `${failedRequests} report data source(s) could not be loaded.`
        );
      }
    } catch (err) {
      console.error("Reports loading error:", err);
      setError("Failed to load report data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, []);

  /* =========================================================
     FILTER TRIPS BY DATE
  ========================================================= */

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const date =
        trip.actual_start_time ||
        trip.scheduled_departure ||
        trip.created_at;

      if (!date) {
        return true;
      }

      const tripDate = date.substring(0, 10);

      return tripDate >= fromDate && tripDate <= toDate;
    });
  }, [trips, fromDate, toDate]);

  /* =========================================================
     TRIP STATISTICS
  ========================================================= */

  const totalTrips = filteredTrips.length;

  const completedTrips = filteredTrips.filter((trip) =>
    ["COMPLETED", "COMPLETE", "FINISHED"].includes(
      String(trip.status || "").toUpperCase()
    )
  ).length;

  const delayedTrips = filteredTrips.filter(
    (trip) =>
      Number(trip.delay_minutes || 0) > 0 ||
      ["DELAYED", "LATE"].includes(
        String(trip.status || "").toUpperCase()
      )
  ).length;

  const onTimeTrips = Math.max(
    completedTrips - delayedTrips,
    0
  );

  const onTimeRate =
    completedTrips > 0
      ? Math.round((onTimeTrips / completedTrips) * 100)
      : 0;

  /* =========================================================
     BUS STATISTICS
  ========================================================= */

  const activeBuses = buses.filter((bus) =>
    ["ACTIVE", "AVAILABLE", "IN_SERVICE"].includes(
      String(bus.status || "").toUpperCase()
    )
  ).length;

  const maintenanceBuses = buses.filter((bus) =>
    ["MAINTENANCE", "UNDER_MAINTENANCE"].includes(
      String(bus.status || "").toUpperCase()
    )
  ).length;

  const availableBuses = buses.filter((bus) =>
    ["AVAILABLE", "ACTIVE"].includes(
      String(bus.status || "").toUpperCase()
    )
  ).length;

  const assignedBuses = Math.max(
    activeBuses - availableBuses,
    0
  );

  const vehicleUtilization =
    buses.length > 0
      ? Math.round((activeBuses / buses.length) * 100)
      : 0;

  /* =========================================================
     USER / OPERATIONAL STAFF STATISTICS
  ========================================================= */

  const operationalStaff = users.filter(
    (user) =>
      String(user.role || "").toUpperCase() ===
      "OPERATIONAL_STAFF"
  );

  const activeOperationalStaff = operationalStaff.filter(
    (user) =>
      !user.status ||
      ["ACTIVE", "AVAILABLE"].includes(
        String(user.status).toUpperCase()
      )
  ).length;

  /* =========================================================
     ROUTE STATISTICS
  ========================================================= */

  const activeRoutes = routes.filter(
    (route) =>
      !route.status ||
      String(route.status).toUpperCase() === "ACTIVE"
  ).length;

  const routeReports = useMemo<RouteReport[]>(() => {
    return routes.map((route) => {
      const routeTrips = filteredTrips.filter(
        (trip) =>
          trip.route_id === route.id ||
          trip.route_code === route.route_code
      );

      const completed = routeTrips.filter((trip) =>
        ["COMPLETED", "COMPLETE", "FINISHED"].includes(
          String(trip.status || "").toUpperCase()
        )
      ).length;

      const delayed = routeTrips.filter(
        (trip) =>
          Number(trip.delay_minutes || 0) > 0 ||
          ["DELAYED", "LATE"].includes(
            String(trip.status || "").toUpperCase()
          )
      ).length;

      const onTime =
        completed > 0
          ? Math.round(
              ((completed - delayed) / completed) * 100
            )
          : 0;

      return {
        route: `${route.route_code || "Route"} - ${
          route.name || route.route_name || "Unnamed Route"
        }`,
        trips: routeTrips.length,
        completed,
        delayed,
        onTimeRate: Math.max(onTime, 0),
      };
    });
  }, [routes, filteredTrips]);

  /* =========================================================
     WEEKLY / DAILY PERFORMANCE
  ========================================================= */

  const weeklyTrips = useMemo(() => {
    const days = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ];

    const grouped: Record<
      string,
      { completed: number; delayed: number }
    > = {};

    days.forEach((day) => {
      grouped[day] = {
        completed: 0,
        delayed: 0,
      };
    });

    filteredTrips.forEach((trip) => {
      const date =
        trip.actual_start_time ||
        trip.scheduled_departure ||
        trip.created_at;

      if (!date) return;

      const day = days[new Date(date).getDay()];

      const isCompleted = [
        "COMPLETED",
        "COMPLETE",
        "FINISHED",
      ].includes(
        String(trip.status || "").toUpperCase()
      );

      const isDelayed =
        Number(trip.delay_minutes || 0) > 0 ||
        ["DELAYED", "LATE"].includes(
          String(trip.status || "").toUpperCase()
        );

      if (isCompleted) {
        grouped[day].completed++;
      }

      if (isDelayed) {
        grouped[day].delayed++;
      }
    });

    return [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ].map((day) => ({
      day,
      completed: grouped[day].completed,
      delayed: grouped[day].delayed,
    }));
  }, [filteredTrips]);

  /* =========================================================
     REPORT GENERATION
  ========================================================= */

  const generateReport = () => {
    if (!fromDate || !toDate) {
      alert("Please select both start and end dates.");
      return;
    }

    if (fromDate > toDate) {
      alert("Start date cannot be later than end date.");
      return;
    }

    setGeneratedReport(
      `${reportType} generated for ${formatDate(
        fromDate
      )} to ${formatDate(toDate)}.`
    );
  };

  /* =========================================================
     EXPORT
  ========================================================= */

  const exportReport = () => {
    const reportContent = [
      "SRMSS - Reports & Analytics",
      "========================================",
      `Report Type: ${reportType}`,
      `From: ${fromDate}`,
      `To: ${toDate}`,
      "",
      "TRIP PERFORMANCE",
      "----------------------------------------",
      `Total Trips: ${totalTrips}`,
      `Completed Trips: ${completedTrips}`,
      `Delayed Trips: ${delayedTrips}`,
      `On-Time Trips: ${onTimeTrips}`,
      `On-Time Rate: ${onTimeRate}%`,
      "",
      "FLEET",
      "----------------------------------------",
      `Total Buses: ${buses.length}`,
      `Active Buses: ${activeBuses}`,
      `Available Buses: ${availableBuses}`,
      `Maintenance Buses: ${maintenanceBuses}`,
      `Vehicle Utilization: ${vehicleUtilization}%`,
      "",
      "OPERATIONAL STAFF",
      "----------------------------------------",
      `Total Operational Staff: ${operationalStaff.length}`,
      `Active Operational Staff: ${activeOperationalStaff}`,
      "",
      "ROUTES",
      "----------------------------------------",
      `Total Routes: ${routes.length}`,
      `Active Routes: ${activeRoutes}`,
      "",
      "ROUTE PERFORMANCE",
      "----------------------------------------",
      ...routeReports.map(
        (route) =>
          `${route.route}, Trips: ${route.trips}, Completed: ${route.completed}, Delayed: ${route.delayed}, On-Time: ${route.onTimeRate}%`
      ),
      "",
      `Generated: ${new Date().toLocaleString()}`,
    ].join("\n");

    const blob = new Blob([reportContent], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `srmss-${reportType
      .toLowerCase()
      .replaceAll(" ", "-")}-${fromDate}-${toDate}.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        <main className="lg:pl-72">
          <div className="flex min-h-screen items-center justify-center">
            <div className="flex items-center gap-3 text-slate-600">
              <FiRefreshCw
                className="animate-spin text-red-600"
                size={22}
              />
              Loading reports...
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="lg:pl-72">
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
            type="button"
            onClick={() => loadReportsData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-red-600">
                  Administration
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                  Reports & Analytics
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  Monitor transport performance, fleet utilization,
                  routes and operational activity.
                </p>
              </div>

              <button
                type="button"
                onClick={exportReport}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                <FiDownload size={18} />
                Export Report
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <FiAlertCircle
                  className="mt-0.5 shrink-0"
                  size={18}
                />

                <div>
                  <p className="font-semibold">
                    Some report data is unavailable
                  </p>

                  <p className="mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Main Statistics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportCard
                title="Total Trips"
                value={totalTrips.toLocaleString()}
                change="Live"
                icon={<FiMap size={20} />}
              />

              <ReportCard
                title="Completed Trips"
                value={completedTrips.toLocaleString()}
                change={
                  totalTrips > 0
                    ? `${Math.round(
                        (completedTrips / totalTrips) * 100
                      )}%`
                    : "0%"
                }
                icon={<FiTrendingUp size={20} />}
              />

              <ReportCard
                title="Vehicle Utilization"
                value={`${vehicleUtilization}%`}
                change={`${buses.length} buses`}
                icon={<FiTruck size={20} />}
              />

              <ReportCard
                title="On-Time Rate"
                value={`${onTimeRate}%`}
                change={`${onTimeTrips} on time`}
                icon={<FiBarChart2 size={20} />}
              />
            </div>

            {/* Secondary Statistics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SmallStat
                title="Delayed Trips"
                value={delayedTrips}
                icon={<FiClock />}
                iconClass="bg-amber-50 text-amber-600"
              />

              <SmallStat
                title="Active Buses"
                value={activeBuses}
                icon={<FiTruck />}
                iconClass="bg-blue-50 text-blue-600"
              />

              <SmallStat
                title="Operational Staff"
                value={activeOperationalStaff}
                icon={<FiUsers />}
                iconClass="bg-green-50 text-green-600"
              />

              <SmallStat
                title="Active Routes"
                value={activeRoutes}
                icon={<FiCheckCircle />}
                iconClass="bg-red-50 text-red-600"
              />
            </div>

            {/* Analytics */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Weekly Trip Performance */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Trip Performance
                    </h2>

                    <p className="text-sm text-slate-500">
                      Completed vs delayed trips
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-3 text-red-600">
                    <FiBarChart2 size={21} />
                  </div>
                </div>

                {totalTrips === 0 ? (
                  <div className="flex h-72 items-center justify-center text-sm text-slate-400">
                    No trip data available for this period.
                  </div>
                ) : (
                  <div className="relative flex h-72 items-end gap-2 border-b border-l border-slate-200 px-3 pb-8 pt-4 sm:gap-4">
                    {weeklyTrips.map((item) => {
                      const maxValue = Math.max(
                        ...weeklyTrips.map((x) =>
                          Math.max(
                            x.completed,
                            x.delayed,
                            1
                          )
                        )
                      );

                      return (
                        <div
                          key={item.day}
                          className="flex h-full flex-1 items-end justify-center gap-1"
                        >
                          <div
                            className="w-full max-w-8 rounded-t-md bg-red-500 transition hover:bg-red-600"
                            style={{
                              height: `${
                                (item.completed /
                                  maxValue) *
                                100
                              }%`,
                              minHeight:
                                item.completed > 0
                                  ? "4px"
                                  : "0",
                            }}
                            title={`${item.completed} completed`}
                          />

                          <div
                            className="w-full max-w-8 rounded-t-md bg-slate-300 transition hover:bg-slate-400"
                            style={{
                              height: `${
                                (item.delayed /
                                  maxValue) *
                                100
                              }%`,
                              minHeight:
                                item.delayed > 0
                                  ? "4px"
                                  : "0",
                            }}
                            title={`${item.delayed} delayed`}
                          />

                          <span className="absolute translate-y-[145px] text-xs text-slate-500">
                            {item.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-5 text-xs text-slate-600">
                  <Legend
                    className="bg-red-500"
                    label="Completed"
                  />

                  <Legend
                    className="bg-slate-300"
                    label="Delayed"
                  />
                </div>
              </div>

              {/* Vehicle Utilization */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Vehicle Utilization
                    </h2>

                    <p className="text-sm text-slate-500">
                      Current fleet utilization
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-3 text-red-600">
                    <FiTruck size={21} />
                  </div>
                </div>

                <div className="space-y-6">
                  <Progress
                    label="Active / In Service"
                    value={
                      buses.length > 0
                        ? Math.round(
                            (activeBuses /
                              buses.length) *
                              100
                          )
                        : 0
                    }
                  />

                  <Progress
                    label="Available"
                    value={
                      buses.length > 0
                        ? Math.round(
                            (availableBuses /
                              buses.length) *
                              100
                          )
                        : 0
                    }
                  />

                  <Progress
                    label="Maintenance"
                    value={
                      buses.length > 0
                        ? Math.round(
                            (maintenanceBuses /
                              buses.length) *
                              100
                          )
                        : 0
                    }
                  />
                </div>

                <div className="mt-8 rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Overall Utilization
                      </p>

                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {vehicleUtilization}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-50 p-3 text-green-600">
                      <FiTrendingUp size={21} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Route Performance */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Route Performance
                  </h2>

                  <p className="text-sm text-slate-500">
                    Performance summary by transport route
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-3 text-red-600">
                  <FiMap size={21} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Route
                      </th>

                      <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total Trips
                      </th>

                      <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Completed
                      </th>

                      <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Delayed
                      </th>

                      <th className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        On-Time Rate
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {routeReports.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-10 text-center text-sm text-slate-400"
                        >
                          No route performance data available.
                        </td>
                      </tr>
                    ) : (
                      routeReports.map((route) => (
                        <tr
                          key={route.route}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="p-4 font-semibold text-slate-800">
                            {route.route}
                          </td>

                          <td className="p-4 text-slate-600">
                            {route.trips}
                          </td>

                          <td className="p-4">
                            <span className="font-semibold text-green-600">
                              {route.completed}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className="font-semibold text-amber-600">
                              {route.delayed}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-red-500"
                                  style={{
                                    width: `${route.onTimeRate}%`,
                                  }}
                                />
                              </div>

                              <span className="text-sm font-semibold text-slate-700">
                                {route.onTimeRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Generate Reports */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Generate Reports
                  </h2>

                  <p className="text-sm text-slate-500">
                    Select a report type and reporting period.
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-3 text-red-600">
                  <FiCalendar size={21} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Report Type
                  </label>

                  <select
                    value={reportType}
                    onChange={(event) =>
                      setReportType(
                        event.target.value as ReportType
                      )
                    }
                    className={inputClass}
                  >
                    <option>
                      Trip Performance Report
                    </option>

                    <option>
                      Route Performance Report
                    </option>

                    <option>
                      Vehicle Utilization Report
                    </option>

                    <option>
                      Operational Staff Performance Report
                    </option>

                    <option>
                      Maintenance Report
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    From Date
                  </label>

                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) =>
                      setFromDate(event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    To Date
                  </label>

                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) =>
                      setToDate(event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <button
                  type="button"
                  onClick={generateReport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 md:col-span-3"
                >
                  <FiFileText size={18} />
                  Generate Report
                </button>
              </div>

              {generatedReport && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  <FiCheckCircle
                    className="mt-0.5 shrink-0"
                    size={18}
                  />

                  <div>
                    <p className="font-semibold">
                      Report generated successfully
                    </p>

                    <p className="mt-1">
                      {generatedReport}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setGeneratedReport("")}
                    className="ml-auto rounded-lg p-1 text-green-600 hover:bg-green-100"
                    aria-label="Close message"
                  >
                    <FiX size={17} />
                  </button>
                </div>
              )}
            </div>

            {/* Report Summary */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-red-50 p-3 text-red-600">
                  <FiBarChart2 size={20} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Performance Summary
                  </h2>

                  <p className="text-sm text-slate-500">
                    Current operational overview
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SummaryItem
                  label="Trip Completion"
                  value={
                    totalTrips > 0
                      ? `${Math.round(
                          (completedTrips /
                            totalTrips) *
                            100
                        )}%`
                      : "0%"
                  }
                  description="Trips successfully completed"
                  icon={<FiCheckCircle />}
                />

                <SummaryItem
                  label="Fleet Efficiency"
                  value={`${vehicleUtilization}%`}
                  description="Current vehicle utilization"
                  icon={<FiTruck />}
                />

                <SummaryItem
                  label="Service Reliability"
                  value={`${onTimeRate}%`}
                  description="Trips operating on time"
                  icon={<FiClock />}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100";

function ReportCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          {icon}
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-600">
          <FiTrendingUp size={12} />
          {change}
        </span>
      </div>

      <p className="text-sm text-slate-500">{title}</p>

      <h3 className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </h3>
    </div>
  );
}

function SmallStat({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl p-3 ${iconClass}`}>
          {icon}
        </div>

        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function Progress({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-slate-700">
          {label}
        </span>

        <span className="font-semibold text-slate-900">
          {value}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-red-500 transition-all"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function Legend({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-3 w-3 rounded-sm ${className}`}
      />

      <span>{label}</span>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">
          {label}
        </p>

        <span className="text-green-600">{icon}</span>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function formatDate(date: string) {
  const parsedDate = new Date(`${date}T00:00:00`);

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

