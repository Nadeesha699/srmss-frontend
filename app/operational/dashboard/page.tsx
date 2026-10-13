"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDroplet,
  FiMapPin,
  FiMenu,
  FiRefreshCw,
  FiTool,
  FiTruck,
  FiUser,
} from "react-icons/fi";

import OperationalSidebar from "@/components/SideNavBar/OperationalSidebar";

const API_BASE = "http://localhost:5000/api";

const TRIP_API = `${API_BASE}/trips`;
const ASSIGNMENT_API = `${API_BASE}/assignments`;
const DELAY_API = `${API_BASE}/delays`;
const BUS_API = `${API_BASE}/buses`;
const MAINTENANCE_API = `${API_BASE}/maintenance`;
const DEPOT_API = `${API_BASE}/depots`;

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
  created_at?: string;
};

type Assignment = {
  id: number;
  schedule_id?: number;
  bus_id?: number;
  staff_id?: number;
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
  reported_by?: number;
  created_at?: string;
};

type Bus = {
  id: number;
  registration_no?: string;
  status?: string;
  maintenance_status?: string;
  depot_id?: number;
  depot_name?: string;
};

type Maintenance = {
  id: number;
  bus_id?: number;
  status?: string;
  maintenance_status?: string;
  next_service_date?: string;
};

type Depot = {
  id: number;
  name?: string;
  depot_code?: string;
  location?: string;
};

type LoggedUser = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  depot_id?: number | string | null;
  depot_name?: string;
  depot?: {
    id?: number;
    name?: string;
  };
};

function extractArray<T>(response: any): T[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data?.results)) {
    return response.data.results;
  }
  return [];
}

function getUserFromStorage(): LoggedUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("srmss_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDate(value?: string) {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value.substring(0, 10);
}

function getTripDate(trip: Trip) {
  return normalizeDate(
    trip.actual_start_time || trip.departure_time || trip.created_at,
  );
}

function getTripRoute(trip: Trip) {
  if (trip.route_name) return trip.route_name;

  if (trip.start_point && trip.end_point) {
    return `${trip.start_point} → ${trip.end_point}`;
  }

  return trip.route_code || "Route not available";
}

function getTripBus(trip: Trip) {
  return trip.registration_no || trip.bus || "Bus not assigned";
}

function formatTime(value?: string) {
  if (!value) return "--:--";

  // SQL TIME values commonly arrive as HH:mm:ss.
  if (/^\d{2}:\d{2}/.test(value)) {
    return value.substring(0, 5);
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("en-LK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return value;
}

function getTripStatus(trip: Trip): string {
  const status = String(trip.status || "").toUpperCase();

  if (["IN_PROGRESS", "RUNNING", "ONGOING", "STARTED"].includes(status)) {
    return "IN_PROGRESS";
  }

  if (["DELAYED", "DELAY"].includes(status)) return "DELAYED";
  if (["COMPLETED", "COMPLETE", "FINISHED"].includes(status)) {
    return "COMPLETED";
  }
  if (status === "CANCELLED") return "CANCELLED";

  return "SCHEDULED";
}

function isActiveTrip(trip: Trip) {
  return ["IN_PROGRESS", "DELAYED"].includes(getTripStatus(trip));
}

export default function OperationalDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<LoggedUser | null>(null);

  const [depotId, setDepotId] = useState<number | null>(null);
  const [depotName, setDepotName] = useState("");
  const [depotLocation, setDepotLocation] = useState("");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [delays, setDelays] = useState<Delay[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = getUserFromStorage();

    setUser(storedUser);

    const id = Number(storedUser?.depot_id ?? storedUser?.depot?.id);

    if (Number.isFinite(id) && id > 0) {
      setDepotId(id);
    }

    const savedDepotName =
      storedUser?.depot_name || storedUser?.depot?.name || "";

    if (savedDepotName) setDepotName(savedDepotName);

    void loadDashboard(storedUser);
  }, []);

  async function loadDashboard(loggedUser: LoggedUser | null = user) {
    try {
      setError("");

      if (!loggedUser?.id) {
        setTrips([]);
        setAssignments([]);
        setDelays([]);
        setBuses([]);
        setMaintenance([]);
        setError("Operational Staff account information was not found.");
        return;
      }

      setLoading(true);

      const currentDepotId = Number(
        loggedUser.depot_id ?? loggedUser.depot?.id,
      );

      if (Number.isFinite(currentDepotId) && currentDepotId > 0) {
        setDepotId(currentDepotId);
      }

      const [
        tripsResponse,
        assignmentsResponse,
        delaysResponse,
        busesResponse,
        maintenanceResponse,
      ] = await Promise.all([
        axios.get(TRIP_API),
        axios.get(ASSIGNMENT_API),
        axios.get(DELAY_API),
        axios.get(BUS_API),
        axios.get(MAINTENANCE_API).catch(() => ({ data: [] })),
      ]);

      const allTrips = extractArray<Trip>(tripsResponse.data);
      const allAssignments = extractArray<Assignment>(assignmentsResponse.data);
      const allDelays = extractArray<Delay>(delaysResponse.data);
      const allBuses = extractArray<Bus>(busesResponse.data);
      const allMaintenance = extractArray<Maintenance>(
        maintenanceResponse.data,
      );

      // Keep trips and assignments for the logged-in staff member.
      const staffTrips = allTrips.filter(
        (trip) => Number(trip.staff_id) === Number(loggedUser.id),
      );

      const staffAssignments = allAssignments.filter(
        (assignment) => Number(assignment.staff_id) === Number(loggedUser.id),
      );

      const staffDelays = allDelays.filter(
        (delay) => Number(delay.reported_by) === Number(loggedUser.id),
      );

      // Limit fleet information to the logged-in staff member's depot.
      const depotBuses =
        Number.isFinite(currentDepotId) && currentDepotId > 0
          ? allBuses.filter((bus) => Number(bus.depot_id) === currentDepotId)
          : [];

      setTrips(staffTrips);
      setAssignments(staffAssignments);
      setDelays(staffDelays);
      setBuses(depotBuses);
      setMaintenance(
        allMaintenance.filter((item) =>
          depotBuses.some((bus) => Number(bus.id) === Number(item.bus_id)),
        ),
      );

      // Resolve the depot banner name if localStorage only has depot_id.
      if (Number.isFinite(currentDepotId) && currentDepotId > 0) {
        const storedName = loggedUser.depot_name || loggedUser.depot?.name;

        if (storedName) {
          setDepotName(storedName);
        } else {
          try {
            const depotResponse = await axios.get(
              `${DEPOT_API}/${currentDepotId}`,
            );

            const payload = depotResponse.data?.data ?? depotResponse.data;

            const depot: Depot = payload?.depot ?? payload;

            if (depot?.name) setDepotName(depot.name);
            if (depot?.location) setDepotLocation(depot.location);
          } catch {
            // The ID remains visible even if the name lookup fails.
            setDepotName("");
          }
        }
      } else {
        setDepotName("");
        setDepotLocation("");
      }
    } catch (err: any) {
      console.error("Operational dashboard error:", err);
      setError(
        err?.response?.data?.message ||
          "Unable to load operational dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }


  const today = getTodayDate();

  const todayTrips = useMemo(
    () => trips.filter((trip) => getTripDate(trip) === today),
    [trips, today],
  );

  const assignedTrips = todayTrips.length;

  const activeTrips = todayTrips.filter(isActiveTrip).length;

  const completedTrips = todayTrips.filter(
    (trip) => getTripStatus(trip) === "COMPLETED",
  ).length;

  const pendingTrips = todayTrips.filter(
    (trip) => getTripStatus(trip) === "SCHEDULED",
  ).length;

  const delayedTrips = todayTrips.filter(
    (trip) => getTripStatus(trip) === "DELAYED",
  );

  const activeAssignments = assignments.filter((assignment) => {
    const status = String(assignment.status || "").toUpperCase();

    return !["CANCELLED", "COMPLETED", "CLOSED"].includes(status);
  });

  const completionRate =
    assignedTrips > 0 ? Math.round((completedTrips / assignedTrips) * 100) : 0;

  const finishedTrips = todayTrips.filter((trip) =>
    ["COMPLETED", "DELAYED"].includes(getTripStatus(trip)),
  );

  const onTimeTrips = todayTrips.filter(
    (trip) => getTripStatus(trip) === "COMPLETED",
  );

  const onTimeRate =
    finishedTrips.length > 0
      ? Math.round((onTimeTrips.length / finishedTrips.length) * 100)
      : 0;

  const availableBuses = buses.filter((bus) =>
    ["AVAILABLE", "ACTIVE", "READY"].includes(
      String(bus.status || "").toUpperCase(),
    ),
  );

  const maintenanceDueBuses = buses.filter((bus) => {
    const status = String(bus.status || "").toUpperCase();
    const maintenanceStatus = String(
      bus.maintenance_status || "",
    ).toUpperCase();

    return (
      ["MAINTENANCE", "UNDER_MAINTENANCE"].includes(status) ||
      ["DUE", "OVERDUE"].includes(maintenanceStatus)
    );
  });

  const maintenanceAlerts = maintenance.filter((item) =>
    ["DUE", "OVERDUE", "PENDING"].includes(
      String(item.status || item.maintenance_status || "").toUpperCase(),
    ),
  );

  const vehicleAvailability =
    buses.length > 0
      ? Math.round((availableBuses.length / buses.length) * 100)
      : 0;

  const liveTrips = todayTrips.filter(isActiveTrip);

  const recentTrips = [...todayTrips]
    .sort((a, b) =>
      String(a.departure_time || "").localeCompare(
        String(b.departure_time || ""),
      ),
    )
    .slice(0, 5);

  const recentDelays = [...delays]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    )
    .slice(0, 3);

  const firstName = user?.name?.split(" ")[0] || "Operational Staff";

  return (
    <div className="min-h-screen bg-slate-50">
      <OperationalSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="mr-4 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <FiMenu size={22} />
            </button>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Operational Staff
              </p>
              <p className="font-semibold text-slate-800">
                SRMSS Management Portal
              </p>
            </div>
          </div>

        </header>

        <div className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
             <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 bg-red-600" />
              <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center md:p-8">
                <div>
                   <p className="text-sm font-semibold text-red-600">
                 Depot Operations
                  </p>
                  <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
                   Operational Staff Dashboard
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Monitor your assigned trips and operational activities.
                  </p>
                </div>

                <div className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 md:w-auto md:min-w-64">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                    <FiMapPin size={23} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Your Assigned Depot
                    </p>
                    <p className="mt-1 truncate text-lg font-bold text-slate-900">
                      {depotName || "Loading depot..."}
                    </p>
                    {depotId !== null && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Depot ID: {depotId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <FiAlertTriangle className="mt-0.5 shrink-0" size={19} />
                <div>
                  <p className="font-semibold">Dashboard information</p>
                  <p className="mt-1 text-sm">{error}</p>
                </div>
              </div>
            )}

            {loading ? (
              <DashboardSkeleton />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    title="Assigned Trips"
                    value={assignedTrips}
                    icon={<FiCalendar />}
                    description="Today's trips"
                  />
                  <StatCard
                    title="Active Trips"
                    value={activeTrips}
                    icon={<FiActivity />}
                    description="Currently running or delayed"
                  />
                  <StatCard
                    title="Completed Trips"
                    value={completedTrips}
                    icon={<FiCheckCircle />}
                    description="Completed today"
                  />
                  <StatCard
                    title="Pending Trips"
                    value={pendingTrips}
                    icon={<FiClock />}
                    description="Awaiting departure"
                  />
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 p-6">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Today&apos;s Assigned Trips
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Trips assigned to your account
                        </p>
                      </div>
                      <Link
                        href="/operational/trips"
                        className="flex items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700"
                      >
                        View All <FiArrowRight />
                      </Link>
                    </div>

                    {recentTrips.length === 0 ? (
                      <EmptyState
                        icon={<FiCalendar />}
                        title="No trips assigned today"
                        description="There are no trips assigned to you for today."
                      />
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {recentTrips.map((trip) => (
                          <div
                            key={trip.id}
                            className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-slate-800">
                                  {getTripRoute(trip)}
                                </h3>
                                {(trip.trip_no || trip.tripNo) && (
                                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                    {trip.trip_no || trip.tripNo}
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <FiTruck />
                                  {getTripBus(trip)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FiClock />
                                  Depart: {formatTime(trip.departure_time)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FiCheckCircle />
                                  Arrive: {formatTime(trip.arrival_time)}
                                </span>
                              </div>
                            </div>

                            <StatusBadge status={getTripStatus(trip)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900">
                      Quick Actions
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Common operational tasks
                    </p>

                    <div className="mt-5 space-y-3">
                      <QuickAction
                        href="/operational/trips"
                        icon={<FiActivity />}
                        title="Update Trip Status"
                        description="Start or complete a trip"
                      />
                      <QuickAction
                        href="/operational/fuel"
                        icon={<FiDroplet />}
                        title="Record Fuel"
                        description="Add fuel consumption"
                      />
                      <QuickAction
                        href="/operational/maintenance"
                        icon={<FiTool />}
                        title="Record Maintenance"
                        description="Record vehicle maintenance"
                      />
                    </div>
                  </section>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <PerformanceCard
                    title="Trip Completion"
                    value={`${completionRate}%`}
                    progress={completionRate}
                    icon={<FiCheckCircle />}
                  />
                  <PerformanceCard
                    title="On-Time Performance"
                    value={`${onTimeRate}%`}
                    progress={onTimeRate}
                    icon={<FiClock />}
                  />
                  <PerformanceCard
                    title="Vehicle Availability"
                    value={`${vehicleAvailability}%`}
                    progress={vehicleAvailability}
                    icon={<FiTruck />}
                  />
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <SummaryCard
                    title="Active Assignments"
                    value={activeAssignments.length}
                    description="Current assignments"
                    icon={<FiCalendar />}
                  />
                  <SummaryCard
                    title="Delayed Trips"
                    value={delayedTrips.length}
                    description="Trips requiring attention today"
                    icon={<FiAlertTriangle />}
                  />
                  <SummaryCard
                    title="Available Depot Buses"
                    value={availableBuses.length}
                    description={`Of ${buses.length} buses in your depot`}
                    icon={<FiTruck />}
                  />
                </div>

                <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 p-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
                        <h2 className="text-lg font-bold text-slate-900">
                          Live Trip Monitor
                        </h2>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Your currently active trips
                      </p>
                    </div>
                    <Link
                      href="/operational/trips"
                      className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                      Manage
                    </Link>
                  </div>

                  {liveTrips.length === 0 ? (
                    <EmptyState
                      icon={<FiActivity />}
                      title="No active trips"
                      description="You currently have no trips in progress."
                    />
                  ) : (
                    <div className="grid gap-4 p-5 md:grid-cols-2">
                      {liveTrips.map((trip) => (
                        <div
                          key={trip.id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-800">
                                {getTripRoute(trip)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {trip.schedule_code || "Trip assignment"}
                              </p>
                            </div>
                            <StatusBadge status={getTripStatus(trip)} />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <MiniInfo
                              icon={<FiTruck />}
                              label="Bus"
                              value={getTripBus(trip)}
                            />
                            <MiniInfo
                              icon={<FiClock />}
                              label="Departure"
                              value={formatTime(trip.departure_time)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <FiAlertTriangle size={19} />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900">
                        Operational Alerts
                      </h2>
                      <p className="text-xs text-slate-500">
                        Items requiring attention
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {delayedTrips.length > 0 ? (
                      <Alert
                        title="Trip delayed"
                        description={`${delayedTrips.length} of your trips are delayed today.`}
                        type="warning"
                      />
                    ) : (
                      <Alert
                        title="Trips on schedule"
                        description="No delayed trips are currently assigned to you."
                        type="success"
                      />
                    )}

                    {maintenanceDueBuses.length > 0 ||
                    maintenanceAlerts.length > 0 ? (
                      <Alert
                        title="Maintenance due"
                        description="A vehicle in your depot requires maintenance attention."
                        type="danger"
                      />
                    ) : (
                      <Alert
                        title="Vehicles ready"
                        description="No maintenance alerts were found for your depot buses."
                        type="success"
                      />
                    )}

                    {recentDelays.length > 0 ? (
                      <Alert
                        title="Recent delay reports"
                        description={`${recentDelays.length} recent delay report(s) recorded by you.`}
                        type="warning"
                      />
                    ) : (
                      <Alert
                        title="No recent reports"
                        description="No recent delay reports were found for your account."
                        type="success"
                      />
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DepotInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-red-600 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status).toUpperCase();

  const styles: Record<string, string> = {
    IN_PROGRESS: "bg-blue-50 text-blue-700",
    RUNNING: "bg-blue-50 text-blue-700",
    DELAYED: "bg-red-50 text-red-700",
    SCHEDULED: "bg-yellow-50 text-yellow-700",
    COMPLETED: "bg-green-50 text-green-700",
    CANCELLED: "bg-slate-100 text-slate-600",
  };

  const labels: Record<string, string> = {
    IN_PROGRESS: "IN PROGRESS",
    RUNNING: "RUNNING",
    DELAYED: "DELAYED",
    SCHEDULED: "SCHEDULED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  };

  return (
    <span
      className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
        styles[normalized] || "bg-slate-100 text-slate-600"
      }`}
    >
      {labels[normalized] || normalized}
    </span>
  );
}

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
      className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-red-300 hover:bg-red-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
    </Link>
  );
}

function PerformanceCard({
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
          <p className="text-sm font-semibold text-slate-700">{title}</p>
        </div>
        <span className="font-bold text-slate-900">{value}</span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-red-600 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-center gap-1 text-xs text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

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
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles[type]}`}
        >
          {type === "success" ? <FiCheckCircle /> : <FiAlertTriangle />}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-36 rounded-2xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-32 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="h-96 rounded-2xl bg-slate-200 lg:col-span-2" />
        <div className="h-96 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}
