
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMenu,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiX,
  FiMapPin,
  FiUser,
  FiHash,
} from "react-icons/fi";

import OperationalSidebar from "@/components/SideNavBar/OperationalSidebar";

const API_BASE = "http://localhost:5000/api";
const TRIP_API = `${API_BASE}/trips`;

type TripStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "DELAYED"
  | "COMPLETED"
  | "CANCELLED";

type FilterType = "ALL" | TripStatus;

type Trip = {
  id: number;
  schedule_id?: number;
  schedule_code?: string;
  schedule_date?: string;
  assignment_id?: number;
  assignment_status?: string;
  staff_id?: number | string | null;
  staffId?: number | string | null;
  operational_staff_id?: number | string | null;
  operationalStaffId?: number | string | null;
  route_id?: number;
  route_code?: string;
  route_name?: string;
  origin?: string;
  destination?: string;
  start_point?: string;
  end_point?: string;
  bus_id?: number;
  registration_no?: string;
  bus?: string;
  depot_id?: number;
  depot_name?: string;
  staff_name?: string;
  staff_email?: string;
  departure_time?: string;
  arrival_time?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type LoggedUser = {
  id: number;
  staff_id?: number;
  name?: string;
  email?: string;
  role?: string;
};

function extractArray<T>(response: any): T[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
}

function getUser(): LoggedUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("srmss_user");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || (!parsed.id && !parsed.staff_id)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function getStaffId(user: LoggedUser): number {
  return Number(user.staff_id ?? user.id);
}

function getTripStaffId(trip: Trip): number | null {
  const value =
    trip.staff_id ??
    trip.staffId ??
    trip.operational_staff_id ??
    trip.operationalStaffId;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

function normalizeDate(value?: string): string {
  return value ? value.substring(0, 10) : "";
}

function getTodayDate(): string {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getTripDate(trip: Trip): string {
  return normalizeDate(
    trip.schedule_date ||
      trip.departure_time ||
      trip.actual_start_time ||
      trip.created_at,
  );
}

function getRouteName(trip: Trip): string {
  if (trip.route_name) return trip.route_name;

  const start = trip.start_point || trip.origin;
  const end = trip.end_point || trip.destination;

  if (start && end) return `${start} → ${end}`;

  return trip.route_code || "Route not available";
}

function getBusName(trip: Trip): string {
  return trip.registration_no || trip.bus || "Bus not assigned";
}

function getTripNumber(trip: Trip): string {
  return  `TRIP-${trip.id}`;
}

function getStatus(status?: string): TripStatus {
  const value = String(status || "").toUpperCase();

  if (value === "IN_PROGRESS" || value === "RUNNING" || value === "STARTED") {
    return "IN_PROGRESS";
  }

  if (value === "DELAYED") return "DELAYED";
  if (value === "COMPLETED") return "COMPLETED";
  if (value === "CANCELLED") return "CANCELLED";

  return "SCHEDULED";
}

function formatDate(value?: string | null): string {
  if (!value) return "-";

  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return normalizeDate(value);

  return date.toLocaleDateString("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null): string {
  if (!value) return "--:--";

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.substring(0, 5);
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("en-LK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return value.substring(0, 5);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Not recorded";

  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T");

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AssignedTripsPage() {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterType>("ALL");
  const [dateFilter, setDateFilter] = useState<"TODAY" | "ALL">("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTripId, setUpdatingTripId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadTrips = useCallback(async (staffId: number) => {
    try {
      setError("");

      const response = await axios.get(TRIP_API);
      const allTrips = extractArray<Trip>(response.data);

      console.log("Trips API response:", response.data);
      console.log("Logged-in staff ID:", staffId);

      const staffTrips = allTrips.filter(
        (trip) => getTripStaffId(trip) === Number(staffId),
      );

      console.log("Trips assigned to current staff:", staffTrips.length);
      setTrips(staffTrips);
    } catch (err: any) {
      console.error("Failed to load trips:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load trips. Check that the backend is running and /api/trips is available.",
      );

      setTrips([]);
    }
  }, []);

  useEffect(() => {
    const loggedUser = getUser();

    if (!loggedUser) {
      setError("Operational Staff account information was not found. Please log in again.");
      setLoading(false);
      return;
    }

    const role = String(loggedUser.role || "").toUpperCase();

    if (
      role &&
      !["OPERATIONAL_STAFF", "OPERATIONAL STAFF", "STAFF"].includes(role)
    ) {
      setError("This page is intended for an Operational Staff account.");
      setLoading(false);
      return;
    }

    const staffId = getStaffId(loggedUser);

    if (!Number.isFinite(staffId) || staffId <= 0) {
      setError("The logged-in staff ID is invalid. Please check your user record.");
      setLoading(false);
      return;
    }

    setUser(loggedUser);

    void (async () => {
      setLoading(true);
      await loadTrips(staffId);
      setLoading(false);
    })();
  }, [loadTrips]);

  async function handleRefresh() {
    if (!user) return;

    setRefreshing(true);

    try {
      await loadTrips(getStaffId(user));
    } finally {
      setRefreshing(false);
    }
  }

  async function updateTripStatus(
    trip: Trip,
    nextStatus: "IN_PROGRESS" | "COMPLETED",
  ) {
    if (!user) return;

    try {
      setUpdatingTripId(trip.id);
      setError("");

      const now = new Date().toISOString();

      const payload = {
        status: nextStatus,
        actual_start_time:
          nextStatus === "IN_PROGRESS"
            ? now
            : trip.actual_start_time || null,
        actual_end_time:
          nextStatus === "COMPLETED"
            ? now
            : trip.actual_end_time || null,
      };

      const response = await axios.patch(
        `${TRIP_API}/${trip.id}/status`,
        payload,
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Failed to update trip status",
        );
      }

      setTrips((current) =>
        current.map((item) =>
          item.id === trip.id ? { ...item, ...payload } : item,
        ),
      );

      setSelectedTrip((current) =>
        current?.id === trip.id ? { ...current, ...payload } : current,
      );

      await loadTrips(getStaffId(user));
    } catch (err: any) {
      console.error("Trip status update failed:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to update trip status.",
      );
    } finally {
      setUpdatingTripId(null);
    }
  }

  const filteredTrips = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return trips
      .filter(
        (trip) => dateFilter === "ALL" || getTripDate(trip) === getTodayDate(),
      )
      .filter(
        (trip) =>
          statusFilter === "ALL" || getStatus(trip.status) === statusFilter,
      )
      .filter((trip) => {
        if (!search) return true;

        return [
          getTripNumber(trip),
          trip.schedule_code,
          trip.route_code,
          getRouteName(trip),
          getBusName(trip),
          trip.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) =>
        String(a.departure_time || "").localeCompare(
          String(b.departure_time || ""),
        ),
      );
  }, [trips, searchValue, statusFilter, dateFilter]);

  const todayTrips = useMemo(
    () => trips.filter((trip) => getTripDate(trip) === getTodayDate()),
    [trips],
  );

  const countStatus = (status: TripStatus) =>
    todayTrips.filter((trip) => getStatus(trip.status) === status).length;

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
              <p className="font-semibold text-slate-800">SRMSS Management Portal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || !user}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <div className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Assigned Trips
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  View and manage the trips assigned to you.
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Notice</p>
                  <p className="mt-1 text-sm">{error}</p>
                </div>
              </div>
            )}

            {loading ? (
              <LoadingState />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryCard
                    title="Scheduled"
                    value={countStatus("SCHEDULED")}
                    icon={<FiCalendar />}
                    description="Awaiting departure today"
                  />
                  <SummaryCard
                    title="In Progress"
                    value={countStatus("IN_PROGRESS")}
                    icon={<FiActivity />}
                    description="Currently in progress"
                  />
                  <SummaryCard
                    title="Delayed"
                    value={countStatus("DELAYED")}
                    icon={<FiAlertTriangle />}
                    description="Needs attention"
                  />
                  <SummaryCard
                    title="Completed"
                    value={countStatus("COMPLETED")}
                    icon={<FiCheckCircle />}
                    description="Completed today"
                  />
                </div>

                <div className="mt-6 text-gray-600 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-md">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search trip, route, bus..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                      />
                      {searchValue && (
                        <button
                          type="button"
                          onClick={() => setSearchValue("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                          aria-label="Clear search"
                        >
                          <FiX />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <select
                        value={dateFilter}
                        onChange={(e) =>
                          setDateFilter(e.target.value as "TODAY" | "ALL")
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
                      >
                        <option value="ALL">All Trips</option>
                        <option value="TODAY">Today</option>
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(e) =>
                          setStatusFilter(e.target.value as FilterType)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
                      >
                        <option value="ALL">All Status</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DELAYED">Delayed</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-6">
                    <h2 className="text-lg font-bold text-slate-900">
                      My Assigned Trips
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {filteredTrips.length} trip{filteredTrips.length !== 1 ? "s" : ""} found
                    </p>
                  </div>

                  {filteredTrips.length === 0 ? (
                    <EmptyState
                      hasTrips={trips.length > 0}
                      hasError={Boolean(error)}
                    />
                  ) : (
                    <>
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-left">
                              {[
                                "Trip",
                                "Route",
                                "Bus",
                                "Departure",
                                "Arrival",
                                "Status",
                                "Action",
                              ].map((heading) => (
                                <th
                                  key={heading}
                                  className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500"
                                >
                                  {heading}
                                </th>
                              ))}
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {filteredTrips.map((trip) => {
                              const status = getStatus(trip.status);
                              const updating = updatingTripId === trip.id;

                              return (
                                <tr key={trip.id} className="hover:bg-slate-50">
                                  <td className="px-5 py-4">
                                    <p className="font-semibold text-slate-800">
                                      {getTripNumber(trip)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                      {trip.schedule_code ||
                                        `Schedule #${trip.schedule_id ?? "-"}`}
                                    </p>
                                  </td>

                                  <td className="px-5 py-4">
                                    <p className="font-medium text-slate-800">
                                      {getRouteName(trip)}
                                    </p>
                                    {trip.route_code && (
                                      <p className="mt-1 text-xs text-slate-400">
                                        {trip.route_code}
                                      </p>
                                    )}
                                  </td>

                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                      <FiTruck className="text-slate-400" />
                                      {getBusName(trip)}
                                    </div>
                                  </td>

                                  <td className="px-5 py-4">
                                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                      <FiClock className="text-slate-400" />
                                      {formatTime(trip.departure_time)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                      {formatDate(trip.schedule_date || trip.departure_time)}
                                    </p>
                                  </td>

                                  <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                                    {formatTime(trip.arrival_time)}
                                  </td>

                                  <td className="px-5 py-4">
                                    <StatusBadge status={status} />
                                  </td>

                                  <td className="px-5 py-4">
                                    <div className="flex flex-wrap justify-end gap-2">
                                      {status === "SCHEDULED" && (
                                        <button
                                          type="button"
                                          disabled={updating}
                                          onClick={() =>
                                            updateTripStatus(trip, "IN_PROGRESS")
                                          }
                                          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                        >
                                          <FiPlay />
                                          {updating ? "Starting..." : "Start"}
                                        </button>
                                      )}

                                      {(status === "IN_PROGRESS" ||
                                        status === "DELAYED") && (
                                        <button
                                          type="button"
                                          disabled={updating}
                                          onClick={() =>
                                            updateTripStatus(trip, "COMPLETED")
                                          }
                                          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                        >
                                          <FiCheckCircle />
                                          {updating ? "Updating..." : "Complete"}
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => setSelectedTrip(trip)}
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="divide-y divide-slate-100 md:hidden">
                        {filteredTrips.map((trip) => {
                          const status = getStatus(trip.status);
                          const updating = updatingTripId === trip.id;

                          return (
                            <div key={trip.id} className="p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {getTripNumber(trip)}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-slate-700">
                                    {getRouteName(trip)}
                                  </p>
                                </div>
                                <StatusBadge status={status} />
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-3">
                                <MobileInfo
                                  label="Bus"
                                  value={getBusName(trip)}
                                  icon={<FiTruck />}
                                />
                                <MobileInfo
                                  label="Date"
                                  value={formatDate(trip.schedule_date || trip.departure_time)}
                                  icon={<FiCalendar />}
                                />
                                <MobileInfo
                                  label="Departure"
                                  value={formatTime(trip.departure_time)}
                                  icon={<FiClock />}
                                />
                                <MobileInfo
                                  label="Arrival"
                                  value={formatTime(trip.arrival_time)}
                                  icon={<FiCheckCircle />}
                                />
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {status === "SCHEDULED" && (
                                  <button
                                    type="button"
                                    disabled={updating}
                                    onClick={() =>
                                      updateTripStatus(trip, "IN_PROGRESS")
                                    }
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                                  >
                                    <FiPlay />
                                    {updating ? "Starting..." : "Start Trip"}
                                  </button>
                                )}

                                {(status === "IN_PROGRESS" ||
                                  status === "DELAYED") && (
                                  <button
                                    type="button"
                                    disabled={updating}
                                    onClick={() =>
                                      updateTripStatus(trip, "COMPLETED")
                                    }
                                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                                  >
                                    <FiCheckCircle />
                                    {updating ? "Updating..." : "Complete Trip"}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setSelectedTrip(trip)}
                                  className="flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <FiActivity size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900">Trip Workflow</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Start your trip when you depart, report delays when necessary,
                        and mark the trip as completed when the journey ends.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <WorkflowStep text="Assigned" />
                        <span className="text-slate-300">→</span>
                        <WorkflowStep text="Start Trip" />
                        <span className="text-slate-300">→</span>
                        <WorkflowStep text="Trip Updates" />
                        <span className="text-slate-300">→</span>
                        <WorkflowStep text="Complete" />
                      </div>
                    </div>
                  </div>
                </div> */}
              </>
            )}
          </div>
        </div>
      </main>

      {selectedTrip && (
        <TripDetailsModal
          trip={selectedTrip}
          updating={updatingTripId === selectedTrip.id}
          onClose={() => setSelectedTrip(null)}
          onUpdateStatus={updateTripStatus}
        />
      )}
    </div>
  );
}

function TripDetailsModal({
  trip,
  updating,
  onClose,
  onUpdateStatus,
}: {
  trip: Trip;
  updating: boolean;
  onClose: () => void;
  onUpdateStatus: (
    trip: Trip,
    nextStatus: "IN_PROGRESS" | "COMPLETED",
  ) => Promise<void>;
}) {
  const status = getStatus(trip.status);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed text-gray-600 inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-modal-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">
              Trip Details
            </p>
            <h2
              id="trip-modal-title"
              className="mt-1 text-xl font-bold text-slate-900"
            >
              {getTripNumber(trip)}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close trip details"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
          >
            <FiX size={22} />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Current Status</p>
              <div className="mt-2">
                <StatusBadge status={status} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">Schedule</p>
              <p className="mt-1 font-semibold text-slate-800">
                {trip.schedule_code || `Schedule #${trip.schedule_id ?? "-"}`}
              </p>
            </div>
          </div>

          <section>
            <SectionTitle>Route Information</SectionTitle>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <FiMapPin className="mt-1 shrink-0 text-red-600" />
                <p className="text-lg font-bold text-slate-900">
                  {getRouteName(trip)}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField label="Route Code" value={trip.route_code || "-"} />
                <DetailField label="Route ID" value={trip.route_id ?? "-"} />
                <DetailField
                  label="Start Point"
                  value={trip.start_point || trip.origin || "-"}
                />
                <DetailField
                  label="End Point"
                  value={trip.end_point || trip.destination || "-"}
                />
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>Assignment Information</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <FiTruck />
                  <span className="text-sm">Assigned Bus</span>
                </div>
                <p className="mt-2 font-bold text-slate-900">{getBusName(trip)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Bus ID: {trip.bus_id ?? "-"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <FiUser />
                  <span className="text-sm">Operational Staff</span>
                </div>
                <p className="mt-2 font-bold text-slate-900">
                  {trip.staff_name ||
                    trip.staff_email ||
                    (getTripStaffId(trip) !== null
                      ? `Staff #${getTripStaffId(trip)}`
                      : "Not available")}
                </p>
                {trip.staff_email && trip.staff_name && (
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {trip.staff_email}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <FiHash />
                  <span className="text-sm">Assignment ID</span>
                </div>
                <p className="mt-2 font-bold text-slate-900">
                  {trip.assignment_id ?? "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Assignment status: {trip.assignment_status || "-"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <FiMapPin />
                  <span className="text-sm">Depot</span>
                </div>
                <p className="mt-2 font-bold text-slate-900">
                  {trip.depot_name ||
                    (trip.depot_id ? `Depot #${trip.depot_id}` : "Not available")}
                </p>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>Schedule and Timing</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TimingCard
                label="Trip Date"
                value={formatDate(trip.schedule_date || trip.departure_time)}
                icon={<FiCalendar />}
              />
              <TimingCard
                label="Scheduled Departure"
                value={formatTime(trip.departure_time)}
                icon={<FiClock />}
              />
              <TimingCard
                label="Expected Arrival"
                value={formatTime(trip.arrival_time)}
                icon={<FiClock />}
              />
              <TimingCard
                label="Actual Start"
                value={formatDateTime(trip.actual_start_time)}
                icon={<FiPlay />}
              />
              <TimingCard
                label="Actual Completion"
                value={formatDateTime(trip.actual_end_time)}
                icon={<FiCheckCircle />}
              />
            </div>
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
          {status === "SCHEDULED" && (
            <button
              type="button"
              disabled={updating}
              onClick={() => onUpdateStatus(trip, "IN_PROGRESS")}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <FiPlay />
              {updating ? "Starting..." : "Start Trip"}
            </button>
          )}

          {(status === "IN_PROGRESS" || status === "DELAYED") && (
            <button
              type="button"
              disabled={updating}
              onClick={() => onUpdateStatus(trip, "COMPLETED")}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <FiCheckCircle />
              {updating ? "Updating..." : "Complete Trip"}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
      {children}
    </h3>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function TimingCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 break-words font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: ReactNode;
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

function StatusBadge({ status }: { status: TripStatus }) {
  const styles: Record<TripStatus, string> = {
    SCHEDULED: "bg-yellow-50 text-yellow-700",
    IN_PROGRESS: "bg-blue-50 text-blue-700",
    DELAYED: "bg-red-50 text-red-700",
    COMPLETED: "bg-green-50 text-green-700",
    CANCELLED: "bg-slate-100 text-slate-600",
  };

  const labels: Record<TripStatus, string> = {
    SCHEDULED: "SCHEDULED",
    IN_PROGRESS: "IN PROGRESS",
    DELAYED: "DELAYED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  };

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[11px] font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function MobileInfo({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
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

function WorkflowStep({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
      {text}
    </span>
  );
}

function EmptyState({
  hasTrips,
  hasError,
}: {
  hasTrips: boolean;
  hasError: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <FiCalendar size={24} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-800">
        {hasError
          ? "Unable to display trips"
          : hasTrips
            ? "No matching trips"
            : "No assigned trips found"}
      </h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        {hasError
          ? "Check the error message above and your backend API."
          : hasTrips
            ? "Try changing the search, date, or status filters."
            : "No trips with a matching staff ID were returned. Check your assignments and GET /api/trips response."}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-32 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="mt-6 h-24 rounded-2xl bg-slate-200" />
      <div className="mt-6 h-96 rounded-2xl bg-slate-200" />
    </div>
  );
}

