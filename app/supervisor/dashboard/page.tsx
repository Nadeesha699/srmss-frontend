
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiMapPin,
  FiMenu,
  FiRefreshCw,
  FiTruck,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";

import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";

const API_BASE = "http://localhost:5000/api";

const SCHEDULE_API = `${API_BASE}/schedules`;
const BUS_API = `${API_BASE}/buses`;
const USER_API = `${API_BASE}/users`;
const ASSIGNMENT_API = `${API_BASE}/assignments`;
const TRIP_API = `${API_BASE}/trips`;
const DELAY_API = `${API_BASE}/delays`;

type Schedule = {
  id: number;
  schedule_code?: string;
  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;
  service_date?: string;
  departure_time?: string;
  arrival_time?: string;
  status?: string;
};

type Bus = {
  id: number;
  registration_no: string;
  model?: string;
  status?: string;
  depot_id?: number;
  depot_name?: string;
};

type OperationalStaff = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  depot_id?: number;
};

type Assignment = {
  id: number;
  schedule_id: number;
  bus_id: number;
  staff_id: number;
  status?: string;

  schedule_code?: string;
  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;

  registration_no?: string;
  bus?: string;

  staff_name?: string;

  departure_time?: string;
  arrival_time?: string;
};

type Trip = {
  id: number;

  trip_no?: string;
  tripNo?: string;

  schedule_id?: number;
  assignment_id?: number;

  schedule_code?: string;
  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;

  customer_number?: string;

  bus_id?: number;
  registration_no?: string;
  bus?: string;

  staff_id?: number;
  staff_name?: string;

  departure_time?: string;
  arrival_time?: string;

  actual_start_time?: string;
  actual_end_time?: string;

  status?: string;
};

type Delay = {
  id: number;
  trip_id?: number;

  trip_no?: string;
  tripNo?: string;

  route?: string;
  route_name?: string;

  bus?: string;
  registration_no?: string;

  delay_minutes?: number;
  reason?: string;
  description?: string;
  notes?: string;

  created_at?: string;
};

type AlertItem = {
  id: string;
  title: string;
  description: string;
  type: "warning" | "danger" | "success";
};

type DashboardData = {
  schedules: Schedule[];
  buses: Bus[];
  staff: OperationalStaff[];
  assignments: Assignment[];
  trips: Trip[];
  delays: Delay[];
};

export default function SupervisorDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [data, setData] = useState<DashboardData>({
    schedules: [],
    buses: [],
    staff: [],
    assignments: [],
    trips: [],
    delays: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        schedulesResponse,
        busesResponse,
        usersResponse,
        assignmentsResponse,
        tripsResponse,
        delaysResponse,
      ] = await Promise.all([
        axios.get(SCHEDULE_API),
        axios.get(BUS_API),
        axios.get(USER_API),
        axios.get(ASSIGNMENT_API),
        axios.get(TRIP_API),
        axios.get(DELAY_API),
      ]);

      const schedules = extractArray<Schedule>(
        schedulesResponse.data
      );

      const buses = extractArray<Bus>(
        busesResponse.data
      );

      const users = extractArray<OperationalStaff>(
        usersResponse.data
      );

      const assignments = extractArray<Assignment>(
        assignmentsResponse.data
      );

      const trips = extractArray<Trip>(
        tripsResponse.data
      );

      const delays = extractArray<Delay>(
        delaysResponse.data
      );

      const operationalStaff = users.filter(
        (user) =>
          String(user.role || "").toUpperCase() ===
          "OPERATIONAL_STAFF"
      );

      setData({
        schedules,
        buses,
        staff: operationalStaff,
        assignments,
        trips,
        delays,
      });
    } catch (err: any) {
      console.error("Supervisor dashboard error:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load dashboard information."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const today = getTodayDate();

  const todaySchedules = useMemo(() => {
    return data.schedules.filter((schedule) => {
      if (!schedule.service_date) return false;

      return normalizeDate(schedule.service_date) === today;
    });
  }, [data.schedules, today]);

  const todayTrips = useMemo(() => {
    return data.trips.filter((trip) => {
      const date =
        getTripDate(trip) ||
        getScheduleDate(trip, data.schedules);

      return !date || normalizeDate(date) === today;
    });
  }, [data.trips, data.schedules, today]);

  const activeTrips = useMemo(() => {
    return todayTrips.filter((trip) => {
      const status = String(
        trip.status || ""
      ).toUpperCase();

      return [
        "RUNNING",
        "IN_PROGRESS",
        "ONGOING",
        "STARTED",
        "DELAYED",
      ].includes(status);
    });
  }, [todayTrips]);

  const availableBuses = useMemo(() => {
    return data.buses.filter((bus) => {
      const status = String(
        bus.status || ""
      ).toUpperCase();

      return [
        "AVAILABLE",
        "ACTIVE",
        "READY",
      ].includes(status);
    });
  }, [data.buses]);

  const activeAssignments = useMemo(() => {
    return data.assignments.filter((assignment) => {
      const status = String(
        assignment.status || ""
      ).toUpperCase();

      return ![
        "CANCELLED",
        "COMPLETED",
        "CLOSED",
      ].includes(status);
    });
  }, [data.assignments]);

  const assignedBusIds = useMemo(() => {
    return new Set(
      activeAssignments.map(
        (assignment) => Number(assignment.bus_id)
      )
    );
  }, [activeAssignments]);

  const assignedStaffIds = useMemo(() => {
    return new Set(
      activeAssignments.map(
        (assignment) => Number(assignment.staff_id)
      )
    );
  }, [activeAssignments]);

  const actuallyAvailableBuses = useMemo(() => {
    return availableBuses.filter(
      (bus) => !assignedBusIds.has(Number(bus.id))
    );
  }, [availableBuses, assignedBusIds]);

  const availableStaff = useMemo(() => {
    return data.staff.filter((staff) => {
      const status = String(
        staff.status || ""
      ).toUpperCase();

      const statusAvailable = [
        "AVAILABLE",
        "ACTIVE",
        "OFF_DUTY",
      ].includes(status);

      return (
        statusAvailable &&
        !assignedStaffIds.has(Number(staff.id))
      );
    });
  }, [data.staff, assignedStaffIds]);

  const delayedTrips = useMemo(() => {
    return todayTrips.filter((trip) => {
      const status = String(
        trip.status || ""
      ).toUpperCase();

      return status === "DELAYED";
    });
  }, [todayTrips]);

  const completedTrips = useMemo(() => {
    return todayTrips.filter((trip) => {
      const status = String(
        trip.status || ""
      ).toUpperCase();

      return [
        "COMPLETED",
        "COMPLETE",
        "FINISHED",
      ].includes(status);
    });
  }, [todayTrips]);

  const onTimeRate = useMemo(() => {
    if (todayTrips.length === 0) return 0;

    const nonDelayed = todayTrips.filter((trip) => {
      const status = String(
        trip.status || ""
      ).toUpperCase();

      return ![
        "DELAYED",
      ].includes(status);
    }).length;

    return Math.round(
      (nonDelayed / todayTrips.length) * 100
    );
  }, [todayTrips]);

  const busUtilization = useMemo(() => {
    if (data.buses.length === 0) return 0;

    return Math.min(
      100,
      Math.round(
        (activeAssignments.filter(
          (assignment) =>
            assignment.bus_id !== undefined
        ).length /
          data.buses.length) *
          100
      )
    );
  }, [data.buses, activeAssignments]);

  const staffUtilization = useMemo(() => {
    if (data.staff.length === 0) return 0;

    return Math.min(
      100,
      Math.round(
        (activeAssignments.filter(
          (assignment) =>
            assignment.staff_id !== undefined
        ).length /
          data.staff.length) *
          100
      )
    );
  }, [data.staff, activeAssignments]);

  const liveTrips = useMemo(() => {
    const running = todayTrips.filter((trip) => {
      const status = String(
        trip.status || ""
      ).toUpperCase();

      return [
        "RUNNING",
        "IN_PROGRESS",
        "ONGOING",
        "STARTED",
        "DELAYED",
      ].includes(status);
    });

    if (running.length > 0) {
      return running.slice(0, 5);
    }

    return todayTrips.slice(0, 5);
  }, [todayTrips]);

  const alerts = useMemo<AlertItem[]>(() => {
    const result: AlertItem[] = [];

    delayedTrips.slice(0, 3).forEach((trip) => {
      result.push({
        id: `delay-${trip.id}`,
        title: "Trip delayed",
        description:
          getTripRoute(trip) || "Scheduled trip",
        type: "warning",
      });
    });

    data.delays.slice(0, 2).forEach((delay) => {
      const minutes = Number(
        delay.delay_minutes || 0
      );

      result.push({
        id: `recorded-delay-${delay.id}`,
        title:
          minutes > 30
            ? "Major delay reported"
            : "Delay reported",
        description:
          delay.reason ||
          delay.description ||
          "Operational delay requires attention.",
        type:
          minutes > 30
            ? "danger"
            : "warning",
      });
    });

    const maintenanceBuses = data.buses.filter((bus) => {
      const status = String(
        bus.status || ""
      ).toUpperCase();

      return [
        "MAINTENANCE",
        "UNDER_MAINTENANCE",
        "SERVICE",
      ].includes(status);
    });

    if (maintenanceBuses.length > 0) {
      result.push({
        id: "maintenance",
        title: "Bus maintenance",
        description: `${maintenanceBuses.length} bus${
          maintenanceBuses.length === 1 ? "" : "es"
        } unavailable`,
        type: "danger",
      });
    }

    if (availableStaff.length > 0) {
      result.push({
        id: "staff-available",
        title: "Operational staff available",
        description: `${availableStaff.length} staff member${
          availableStaff.length === 1 ? "" : "s"
        } ready for assignment`,
        type: "success",
      });
    }

    return result.slice(0, 5);
  }, [
    delayedTrips,
    data.delays,
    data.buses,
    availableStaff,
  ]);

  const stats = [
    {
      title: "Today's Trips",
      value: todaySchedules.length || todayTrips.length,
      icon: FiCalendar,
      description: "Scheduled for today",
    },
    {
      title: "Active Trips",
      value: activeTrips.length,
      icon: FiMapPin,
      description: "Currently running",
    },
    {
      title: "Available Buses",
      value: actuallyAvailableBuses.length,
      icon: FiTruck,
      description: "Ready for assignment",
    },
    {
      title: "Available Staff",
      value: availableStaff.length,
      icon: FiUserCheck,
      description: "Ready for duty",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <SupervisorSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="mr-4 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <FiMenu size={22} />
          </button>

          <div className="flex min-w-0 items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Supervisor
              </p>

              <p className="font-semibold text-slate-800">
                SRMSS Management Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiRefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="text-sm font-semibold text-red-600">
                    Operations Overview
                  </p>

                  <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    Supervisor Dashboard
                  </h1>

                  <p className="mt-2 text-slate-500">
                    Monitor today's schedules, trips, buses and operational staff.
                  </p>
                </div>

                <div
                  className={`flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    activeTrips.length > 0
                      ? "border border-green-100 bg-green-50 text-green-700"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      activeTrips.length > 0
                        ? "bg-green-500"
                        : "bg-slate-400"
                    }`}
                  />

                  {activeTrips.length > 0
                    ? "Operations Running"
                    : "No Active Trips"}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <FiAlertTriangle
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

            {/* Loading */}
            {loading ? (
              <DashboardLoader />
            ) : (
              <>
                {/* Statistics */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                      <div
                        key={stat.title}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-500">
                              {stat.title}
                            </p>

                            <p className="mt-2 text-3xl font-bold text-slate-950">
                              {stat.value}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {stat.description}
                            </p>
                          </div>

                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <Icon size={21} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Main Content */}
                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  {/* Live Trips */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Live Trip Monitor
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Current scheduled and active trips
                        </p>
                      </div>

                      <Link
                        href="/supervisor/trips"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 transition hover:text-red-700"
                      >
                        View all
                        <FiArrowRight size={15} />
                      </Link>
                    </div>

                    <div className="mt-6 space-y-3">
                      {liveTrips.length === 0 ? (
                        <EmptyState
                          icon={<FiMapPin />}
                          title="No trips available"
                          description="There are no trips to display for today."
                        />
                      ) : (
                        liveTrips.map((trip) => (
                          <div
                            key={trip.id}
                            className="flex flex-col gap-4 rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50 md:flex-row md:items-center"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              <FiMapPin size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800">
                                {getTripRoute(trip)}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {trip.registration_no ||
                                  trip.bus ||
                                  "Bus not assigned"}

                                <span className="mx-2 text-slate-300">
                                  •
                                </span>

                                {trip.staff_name ||
                                  "Staff not assigned"}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-4 md:justify-end">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-slate-800">
                                  {formatTime(
                                    trip.departure_time
                                  )}
                                </p>

                                <p className="text-xs text-slate-400">
                                  Departure
                                </p>
                              </div>

                              <StatusBadge
                                status={getTripStatus(
                                  trip
                                )}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Alerts */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <FiAlertTriangle size={19} />
                      </div>

                      <div>
                        <h2 className="font-bold text-slate-900">
                          Operational Alerts
                        </h2>

                        <p className="text-xs text-slate-500">
                          Requires attention
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {alerts.length === 0 ? (
                        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                          <div className="flex items-start gap-3">
                            <FiCheckCircle
                              className="mt-0.5 shrink-0 text-green-600"
                              size={18}
                            />

                            <div>
                              <p className="text-sm font-semibold text-green-800">
                                No operational alerts
                              </p>

                              <p className="mt-1 text-xs text-green-700">
                                Current operations require no immediate attention.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <Alert
                            key={alert.id}
                            title={alert.title}
                            description={alert.description}
                            type={alert.type}
                          />
                        ))
                      )}
                    </div>

                    <Link
                      href="/supervisor/delays"
                      className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Manage Delays
                      <FiArrowRight size={17} />
                    </Link>
                  </div>
                </div>

                {/* Resource Overview */}
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <ResourceCard
                    title="Bus Utilization"
                    value={`${busUtilization}%`}
                    progress={busUtilization}
                    icon={<FiTruck />}
                  />

                  <ResourceCard
                    title="Staff Utilization"
                    value={`${staffUtilization}%`}
                    progress={staffUtilization}
                    icon={<FiUsers />}
                  />

                  <ResourceCard
                    title="On-Time Performance"
                    value={`${onTimeRate}%`}
                    progress={onTimeRate}
                    icon={<FiClock />}
                  />
                </div>

                {/* Today's Summary */}
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <SummaryCard
                    title="Completed Trips"
                    value={completedTrips.length}
                    description="Trips completed today"
                    icon={<FiCheckCircle />}
                    iconClass="bg-green-50 text-green-600"
                  />

                  <SummaryCard
                    title="Delayed Trips"
                    value={delayedTrips.length}
                    description="Trips currently delayed"
                    icon={<FiAlertTriangle />}
                    iconClass="bg-amber-50 text-amber-600"
                  />

                  <SummaryCard
                    title="Active Assignments"
                    value={activeAssignments.length}
                    description="Bus and staff assignments"
                    icon={<FiTruck />}
                    iconClass="bg-blue-50 text-blue-600"
                  />
                </div>

                {/* Quick Actions */}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Quick Operations
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Quickly access common supervisor tasks.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <QuickAction
                      href="/supervisor/schedules"
                      icon={<FiCalendar />}
                      title="Schedules"
                      description="View today's schedules"
                    />

                    <QuickAction
                      href="/supervisor/assignments"
                      icon={<FiTruck />}
                      title="Assignments"
                      description="Assign buses and staff"
                    />

                    <QuickAction
                      href="/supervisor/trips"
                      icon={<FiMapPin />}
                      title="Trip Monitoring"
                      description="Monitor active trips"
                    />

                    <QuickAction
                      href="/supervisor/delays"
                      icon={<FiClock />}
                      title="Delays"
                      description="Review operational delays"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function extractArray<T>(response: any): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  return [];
}

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDate(value?: string) {
  if (!value) return "";

  return String(value).substring(0, 10);
}

function getTripDate(trip: Trip) {
  const possibleDates = [
    trip.actual_start_time,
    trip.departure_time,
  ];

  for (const value of possibleDates) {
    if (
      value &&
      /^\d{4}-\d{2}-\d{2}/.test(value)
    ) {
      return value;
    }
  }

  return undefined;
}

function getScheduleDate(
  trip: Trip,
  schedules: Schedule[]
) {
  if (!trip.schedule_id) return undefined;

  const schedule = schedules.find(
    (item) =>
      Number(item.id) ===
      Number(trip.schedule_id)
  );

  return schedule?.service_date;
}

function getTripRoute(trip: Trip) {
  if (
    trip.start_point &&
    trip.end_point
  ) {
    return `${trip.start_point} → ${trip.end_point}`;
  }

  if (trip.route_name) {
    return trip.route_name;
  }

  if (trip.route_code) {
    return trip.route_code;
  }

  return "Route not available";
}

function formatTime(value?: string) {
  if (!value) return "--:--";

  const text = String(value);

  if (/^\d{2}:\d{2}/.test(text)) {
    return text.substring(0, 5);
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getTripStatus(
  trip: Trip
): "ON TIME" | "DELAYED" | "RUNNING" {
  const status = String(
    trip.status || ""
  ).toUpperCase();

  if (
    [
      "DELAYED",
      "DELAY",
    ].includes(status)
  ) {
    return "DELAYED";
  }

  if (
    [
      "RUNNING",
      "IN_PROGRESS",
      "ONGOING",
      "STARTED",
    ].includes(status)
  ) {
    return "RUNNING";
  }

  return "ON TIME";
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

function DashboardLoader() {
  return (
    <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-center gap-3">
        <FiLoader
          size={30}
          className="animate-spin text-red-600"
        />

        <p className="text-sm font-medium text-slate-500">
          Loading supervisor dashboard...
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Status Badge                                                               */
/* -------------------------------------------------------------------------- */

function StatusBadge({
  status,
}: {
  status: "ON TIME" | "DELAYED" | "RUNNING";
}) {
  const styles: Record<
    "ON TIME" | "DELAYED" | "RUNNING",
    string
  > = {
    "ON TIME": "bg-green-50 text-green-700",
    DELAYED: "bg-amber-50 text-amber-700",
    RUNNING: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Alert                                                                      */
/* -------------------------------------------------------------------------- */

function Alert({
  title,
  description,
  type,
}: {
  title: string;
  description: string;
  type: "warning" | "danger" | "success";
}) {
  const styles = {
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    success: "bg-green-50 text-green-600",
  };

  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles[type]}`}
        >
          {type === "success" ? (
            <FiCheckCircle size={16} />
          ) : (
            <FiAlertTriangle size={16} />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">
            {title}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Resource Card                                                               */
/* -------------------------------------------------------------------------- */

function ResourceCard({
  title,
  value,
  progress,
  icon,
}: {
  title: string;
  value: string;
  progress: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
            {icon}
          </div>

          <p className="text-sm font-semibold text-slate-700">
            {title}
          </p>
        </div>

        <span className="font-bold text-slate-900">
          {value}
        </span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-red-600 transition-all"
          style={{
            width: `${Math.min(
              100,
              Math.max(0, progress)
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Summary Card                                                                */
/* -------------------------------------------------------------------------- */

function SummaryCard({
  title,
  value,
  description,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty State                                                                 */
/* -------------------------------------------------------------------------- */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {icon}
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-700">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Quick Action                                                                */
/* -------------------------------------------------------------------------- */

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 p-4 transition hover:border-red-200 hover:bg-red-50/40"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            {title}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

