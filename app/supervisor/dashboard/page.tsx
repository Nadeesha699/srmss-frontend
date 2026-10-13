"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

const DEPOT_API = `${API_BASE}/depots`;
const SCHEDULE_API = `${API_BASE}/schedules`;
const BUS_API = `${API_BASE}/buses`;
const USER_API = `${API_BASE}/users`;
const ASSIGNMENT_API = `${API_BASE}/assignments`;
const TRIP_API = `${API_BASE}/trips`;
const DELAY_API = `${API_BASE}/delays`;

type Depot = {
  id: number;
  name: string;
  depot_code?: string;
};

type Schedule = {
  id: number;
  depot_id?: number;
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
  depot_id?: number;
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
  depot_id?: number;
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
};

type Delay = {
  id: number;
  depot_id?: number;
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

const EMPTY_DATA: DashboardData = {
  schedules: [],
  buses: [],
  staff: [],
  assignments: [],
  trips: [],
  delays: [],
};

export default function SupervisorDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [supervisorDepotId, setSupervisorDepotId] = useState<number | null>(
    null,
  );
  const [supervisorDepotName, setSupervisorDepotName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      const storedUser = localStorage.getItem("srmss_user");

      if (!storedUser) {
        throw new Error(
          "Your login session was not found. Please log in again.",
        );
      }

      const currentUser = JSON.parse(storedUser);
      const depotId = Number(currentUser.depot_id ?? currentUser.depotId);

      if (!Number.isInteger(depotId) || depotId <= 0) {
        throw new Error(
          "No depot is assigned to your account. Please contact the administrator.",
        );
      }

      setSupervisorDepotId(depotId);

      const [
        depotsResponse,
        schedulesResponse,
        busesResponse,
        usersResponse,
        assignmentsResponse,
        tripsResponse,
        delaysResponse,
      ] = await Promise.all([
        axios.get(DEPOT_API),
        axios.get(SCHEDULE_API),
        axios.get(BUS_API),
        axios.get(USER_API),
        axios.get(ASSIGNMENT_API),
        axios.get(TRIP_API),
        axios.get(DELAY_API),
      ]);

      const depots = extractArray<Depot>(depotsResponse.data);
      const allSchedules = extractArray<Schedule>(schedulesResponse.data);
      const allBuses = extractArray<Bus>(busesResponse.data);
      const allUsers = extractArray<OperationalStaff>(usersResponse.data);
      const allAssignments = extractArray<Assignment>(assignmentsResponse.data);
      const allTrips = extractArray<Trip>(tripsResponse.data);
      const allDelays = extractArray<Delay>(delaysResponse.data);

      const depot = depots.find((item) => Number(item.id) === depotId);

      setSupervisorDepotName(
        depot?.name ||
          currentUser.depot_name ||
          currentUser.depotName ||
          `Depot #${depotId}`,
      );

      // Buses belonging to this depot.
      const depotBuses = allBuses.filter(
        (bus) => Number(bus.depot_id) === depotId,
      );
      const depotBusIds = new Set(depotBuses.map((bus) => Number(bus.id)));

      // Operational staff belonging to this depot.
      const depotStaff = allUsers.filter((user) => {
        const role = String(user.role || "")
          .toUpperCase()
          .replace(/[\s-]+/g, "_");

        return (
          ["OPERATIONAL_STAFF", "OPERATIONAL"].includes(role) &&
          Number(user.depot_id) === depotId
        );
      });
      const depotStaffIds = new Set(
        depotStaff.map((staff) => Number(staff.id)),
      );

      // Resolve assignments through their depot, bus, or staff relationship.
      const depotAssignments = allAssignments.filter(
        (assignment) =>
          Number(assignment.depot_id) === depotId ||
          depotBusIds.has(Number(assignment.bus_id)) ||
          depotStaffIds.has(Number(assignment.staff_id)),
      );

      const depotAssignmentIds = new Set(
        depotAssignments.map((assignment) => Number(assignment.id)),
      );
      const depotScheduleIds = new Set(
        depotAssignments.map((assignment) => Number(assignment.schedule_id)),
      );

      const depotSchedules = allSchedules.filter(
        (schedule) =>
          Number(schedule.depot_id) === depotId ||
          depotScheduleIds.has(Number(schedule.id)),
      );
      const depotScheduleIdsSet = new Set(
        depotSchedules.map((schedule) => Number(schedule.id)),
      );

      // Resolve trips through their depot, bus, assignment, or schedule.
      const depotTrips = allTrips.filter(
        (trip) =>
          Number(trip.depot_id) === depotId ||
          depotBusIds.has(Number(trip.bus_id)) ||
          depotAssignmentIds.has(Number(trip.assignment_id)) ||
          depotScheduleIdsSet.has(Number(trip.schedule_id)),
      );
      const depotTripIds = new Set(depotTrips.map((trip) => Number(trip.id)));

      const depotDelays = allDelays.filter(
        (delay) =>
          Number(delay.depot_id) === depotId ||
          depotTripIds.has(Number(delay.trip_id)),
      );

      setData({
        schedules: depotSchedules,
        buses: depotBuses,
        staff: depotStaff,
        assignments: depotAssignments,
        trips: depotTrips,
        delays: depotDelays,
      });
    } catch (err: unknown) {
      console.error("Supervisor dashboard error:", err);

      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            "Unable to load dashboard information. Check that your backend APIs are running.",
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard information.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const today = getTodayDate();

  const todaySchedules = useMemo(
    () =>
      data.schedules.filter(
        (schedule) =>
          schedule.service_date &&
          normalizeDate(schedule.service_date) === today,
      ),
    [data.schedules, today],
  );

  const todayTrips = useMemo(
    () =>
      data.trips.filter((trip) => {
        const date = getTripDate(trip) || getScheduleDate(trip, data.schedules);

        return date ? normalizeDate(date) === today : true;
      }),
    [data.trips, data.schedules, today],
  );

  const activeTrips = useMemo(
    () =>
      todayTrips.filter((trip) =>
        ["RUNNING", "IN_PROGRESS", "ONGOING", "STARTED", "DELAYED"].includes(
          normalizeStatus(trip.status),
        ),
      ),
    [todayTrips],
  );

  const availableBuses = useMemo(
    () =>
      data.buses.filter((bus) =>
        ["AVAILABLE", "ACTIVE", "READY"].includes(normalizeStatus(bus.status)),
      ),
    [data.buses],
  );

  const activeAssignments = useMemo(
    () =>
      data.assignments.filter(
        (assignment) =>
          !["CANCELLED", "COMPLETED", "CLOSED"].includes(
            normalizeStatus(assignment.status),
          ),
      ),
    [data.assignments],
  );

  const assignedBusIds = useMemo(
    () =>
      new Set(
        activeAssignments
          .filter((item) => item.bus_id != null)
          .map((item) => Number(item.bus_id)),
      ),
    [activeAssignments],
  );

  const assignedStaffIds = useMemo(
    () =>
      new Set(
        activeAssignments
          .filter((item) => item.staff_id != null)
          .map((item) => Number(item.staff_id)),
      ),
    [activeAssignments],
  );

  const actuallyAvailableBuses = useMemo(
    () => availableBuses.filter((bus) => !assignedBusIds.has(Number(bus.id))),
    [availableBuses, assignedBusIds],
  );

  const availableStaff = useMemo(
    () =>
      data.staff.filter((staff) => {
        const status = normalizeStatus(staff.status);
        return (
          ["AVAILABLE", "ACTIVE", "OFF_DUTY"].includes(status) &&
          !assignedStaffIds.has(Number(staff.id))
        );
      }),
    [data.staff, assignedStaffIds],
  );

  const delayedTrips = useMemo(
    () =>
      todayTrips.filter((trip) => normalizeStatus(trip.status) === "DELAYED"),
    [todayTrips],
  );

  const completedTrips = useMemo(
    () =>
      todayTrips.filter((trip) =>
        ["COMPLETED", "COMPLETE", "FINISHED"].includes(
          normalizeStatus(trip.status),
        ),
      ),
    [todayTrips],
  );

  const onTimeRate = useMemo(() => {
    if (todayTrips.length === 0) return 0;

    const notDelayed = todayTrips.filter(
      (trip) => normalizeStatus(trip.status) !== "DELAYED",
    ).length;

    return Math.round((notDelayed / todayTrips.length) * 100);
  }, [todayTrips]);

  const busUtilization = useMemo(() => {
    if (data.buses.length === 0) return 0;

    const assignedBuses = new Set(
      activeAssignments
        .filter((item) => item.bus_id != null)
        .map((item) => Number(item.bus_id)),
    );

    return Math.min(
      100,
      Math.round((assignedBuses.size / data.buses.length) * 100),
    );
  }, [data.buses, activeAssignments]);

  const staffUtilization = useMemo(() => {
    if (data.staff.length === 0) return 0;

    const assignedStaff = new Set(
      activeAssignments
        .filter((item) => item.staff_id != null)
        .map((item) => Number(item.staff_id)),
    );

    return Math.min(
      100,
      Math.round((assignedStaff.size / data.staff.length) * 100),
    );
  }, [data.staff, activeAssignments]);

  const liveTrips = useMemo(() => {
    const running = todayTrips.filter((trip) =>
      ["RUNNING", "IN_PROGRESS", "ONGOING", "STARTED", "DELAYED"].includes(
        normalizeStatus(trip.status),
      ),
    );

    return (running.length > 0 ? running : todayTrips).slice(0, 5);
  }, [todayTrips]);

  const alerts = useMemo<AlertItem[]>(() => {
    const result: AlertItem[] = [];

    delayedTrips.slice(0, 3).forEach((trip) => {
      result.push({
        id: `delay-${trip.id}`,
        title: "Trip delayed",
        description: getTripRoute(trip),
        type: "warning",
      });
    });

    data.delays.slice(0, 2).forEach((delay) => {
      const minutes = Number(delay.delay_minutes || 0);

      result.push({
        id: `recorded-delay-${delay.id}`,
        title: minutes > 30 ? "Major delay reported" : "Delay reported",
        description:
          delay.reason ||
          delay.description ||
          "Operational delay requires attention.",
        type: minutes > 30 ? "danger" : "warning",
      });
    });

    const maintenanceBuses = data.buses.filter((bus) =>
      ["MAINTENANCE", "UNDER_MAINTENANCE", "SERVICE"].includes(
        normalizeStatus(bus.status),
      ),
    );

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
  }, [delayedTrips, data.delays, data.buses, availableStaff]);

  const stats = [
    {
      title: "Today's Schedules",
      value: todaySchedules.length,
      icon: FiCalendar,
      description: "For your assigned depot",
    },
    {
      title: "Active Trips",
      value: activeTrips.length,
      icon: FiMapPin,
      description: "Currently running or delayed",
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
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
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
              Supervisor
            </p>
            <p className="font-semibold text-slate-800">
              SRMSS Management Portal
            </p>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-1.5 bg-red-600" />
              <div className="flex flex-col justify-between gap-5 p-6 md:flex-row md:items-center md:p-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-red-600">
                    Depot Operations
                  </p>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                    Supervisor Dashboard
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    Monitor schedules, trips, assignments, buses and operational
                    staff for your assigned depot.
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
                      {supervisorDepotName || "Loading depot..."}
                    </p>
                    {supervisorDepotId !== null && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Depot ID: {supervisorDepotId}
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
                  <p className="font-semibold">Dashboard data unavailable</p>
                  <p className="mt-1 text-sm">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadDashboard(true)}
                    className="mt-2 text-sm font-semibold underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <DashboardLoader />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                      <div
                        key={stat.title}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
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

                {/* Live trips and alerts */}
                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Live Trip Monitor
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Trips associated with your depot
                        </p>
                      </div>
                      <Link
                        href="/supervisor/trips"
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-red-600 hover:text-red-700"
                      >
                        View all <FiArrowRight size={15} />
                      </Link>
                    </div>

                    <div className="mt-6 space-y-3">
                      {liveTrips.length === 0 ? (
                        <EmptyState
                          icon={<FiMapPin />}
                          title="No trips available"
                          description="No trips were found for your depot today."
                        />
                      ) : (
                        liveTrips.map((trip) => (
                          <div
                            key={trip.id}
                            className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
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
                                <span className="mx-2 text-slate-300">•</span>
                                {trip.staff_name || "Staff not assigned"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                Trip{" "}
                                {trip.trip_no || trip.tripNo || `#${trip.id}`}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                              <div className="text-right">
                                <p className="text-sm font-semibold text-slate-800">
                                  {formatTime(trip.departure_time)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  Departure
                                </p>
                              </div>
                              <StatusBadge status={getTripStatus(trip)} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <FiAlertTriangle size={19} />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900">
                          Operational Alerts
                        </h2>
                        <p className="text-xs text-slate-500">
                          Your depot requires attention
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
                                No current issues have been reported.
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
                      Manage Delays <FiArrowRight size={17} />
                    </Link>
                  </section>
                </div>

                {/* Utilization */}
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

                {/* Today's summary */}
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
                    description="Trips delayed today"
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

                {/* Depot resource counts */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Depot Resource Overview
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Resources assigned to{" "}
                      {supervisorDepotName || "your depot"}.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <ResourceCount
                      label="Total Buses"
                      value={data.buses.length}
                      icon={<FiTruck />}
                    />
                    <ResourceCount
                      label="Operational Staff"
                      value={data.staff.length}
                      icon={<FiUsers />}
                    />
                    <ResourceCount
                      label="Total Assignments"
                      value={data.assignments.length}
                      icon={<FiUserCheck />}
                    />
                  </div>
                </section>

                {/* Quick actions */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    Quick Operations
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Access common tasks for your assigned depot.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <QuickAction
                      href="/supervisor/schedules"
                      icon={<FiCalendar />}
                      title="Schedules"
                      description="View depot schedules"
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
                      description="Monitor depot trips"
                    />
                    <QuickAction
                      href="/supervisor/delays"
                      icon={<FiClock />}
                      title="Delays"
                      description="Review reported delays"
                    />
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

/* Helpers */

function extractArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];

  if (response && typeof response === "object") {
    const value = response as {
      data?: unknown;
      results?: unknown;
    };

    if (Array.isArray(value.data)) return value.data as T[];

    if (value.data && typeof value.data === "object") {
      const nested = value.data as { data?: unknown };
      if (Array.isArray(nested.data)) return nested.data as T[];
    }

    if (Array.isArray(value.results)) return value.results as T[];
  }

  return [];
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(value?: string) {
  return value ? String(value).substring(0, 10) : "";
}

function normalizeStatus(value?: string) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function getTripDate(trip: Trip) {
  for (const value of [trip.actual_start_time, trip.departure_time]) {
    if (value && /^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  }
  return undefined;
}

function getScheduleDate(trip: Trip, schedules: Schedule[]) {
  if (!trip.schedule_id) return undefined;

  return schedules.find(
    (schedule) => Number(schedule.id) === Number(trip.schedule_id),
  )?.service_date;
}

function getTripRoute(trip: Trip) {
  if (trip.start_point && trip.end_point) {
    return `${trip.start_point} → ${trip.end_point}`;
  }
  return trip.route_name || trip.route_code || "Route not available";
}

function formatTime(value?: string) {
  if (!value) return "--:--";

  const text = String(value);
  if (/^\d{2}:\d{2}/.test(text)) return text.substring(0, 5);

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getTripStatus(
  trip: Trip,
): "ON TIME" | "DELAYED" | "RUNNING" | "COMPLETED" | "SCHEDULED" {
  const status = normalizeStatus(trip.status);

  if (["DELAYED", "DELAY"].includes(status)) return "DELAYED";
  if (["RUNNING", "IN_PROGRESS", "ONGOING", "STARTED"].includes(status)) {
    return "RUNNING";
  }
  if (["COMPLETED", "COMPLETE", "FINISHED"].includes(status)) {
    return "COMPLETED";
  }
  if (["SCHEDULED", "PENDING", "PLANNED"].includes(status)) {
    return "SCHEDULED";
  }

  return "ON TIME";
}

/* Loading */

function DashboardLoader() {
  return (
    <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-center gap-3">
        <FiLoader size={30} className="animate-spin text-red-600" />
        <p className="text-sm font-medium text-slate-500">
          Loading your depot dashboard...
        </p>
      </div>
    </div>
  );
}

/* Status badge */

function StatusBadge({
  status,
}: {
  status: "ON TIME" | "DELAYED" | "RUNNING" | "COMPLETED" | "SCHEDULED";
}) {
  const styles: Record<typeof status, string> = {
    "ON TIME": "bg-green-50 text-green-700",
    DELAYED: "bg-amber-50 text-amber-700",
    RUNNING: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-slate-100 text-slate-700",
    SCHEDULED: "bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

/* Alert */

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
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-1 break-words text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

/* Resource card */

function ResourceCard({
  title,
  value,
  progress,
  icon,
}: {
  title: string;
  value: string;
  progress: number;
  icon: ReactNode;
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
  iconClass,
}: {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
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
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  );
}


function ResourceCount({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}



function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}


function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-slate-200 p-4 transition hover:border-red-200 hover:bg-red-50/40"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}
