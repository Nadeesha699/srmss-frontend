
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMenu,
  FiMessageSquare,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiX,
} from "react-icons/fi";

import OperationalSidebar from "@/components/SideNavBar/OperationalSidebar";

const API_BASE = "http://localhost:5000/api";
const TRIP_API = `${API_BASE}/trips`;
const DELAY_API = `${API_BASE}/delays`;

type TripStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "DELAYED"
  | "COMPLETED"
  | "CANCELLED";

type StatusFilter = "ALL" | TripStatus;

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

type Delay = {
  id: number;
  trip_id?: number;
  delay_minutes?: number;
  reason?: string;
  notes?: string;
  reported_by?: number;
  created_at?: string;
};

type LoggedUser = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
};

type DelayForm = {
  delay_minutes: string;
  reason: string;
  description: string;
};

const delayReasons = [
  "Traffic Congestion",
  "Passenger Delay",
  "Vehicle Issue",
  "Weather",
  "Road Closure",
  "Other",
];

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
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeStatus(status?: string): TripStatus {
  const value = String(status || "").toUpperCase();

  if (["RUNNING", "STARTED", "IN_PROGRESS"].includes(value)) {
    return "IN_PROGRESS";
  }

  if (value === "DELAYED") return "DELAYED";
  if (value === "COMPLETED") return "COMPLETED";
  if (value === "CANCELLED") return "CANCELLED";

  return "SCHEDULED";
}

function getTripNumber(trip: Trip) {
  return `TRIP-${trip.id}`;
}

function getRoute(trip: Trip) {
  if (trip.route_name) return trip.route_name;

  if (trip.start_point && trip.end_point) {
    return `${trip.start_point} → ${trip.end_point}`;
  }

  return trip.route_code || "Route not available";
}

function getBus(trip: Trip) {
  return trip.registration_no || trip.bus || "Bus not assigned";
}

function getStaffId(trip: Trip) {
  return (
    trip.staff_id ??
    trip.staffId ??
    trip.operational_staff_id ??
    trip.operationalStaffId
  );
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.substring(0, 10);

  return date.toLocaleDateString("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value?: string) {
  if (!value) return "--:--";

  // MySQL TIME values often arrive as "HH:mm:ss".
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.substring(0, 5);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value.substring(0, 5);

  return date.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export default function TripUpdatesPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [delays, setDelays] = useState<Delay[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTripId, setUpdatingTripId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [delayForm, setDelayForm] = useState<DelayForm>({
    delay_minutes: "",
    reason: "",
    description: "",
  });
  const [savingDelay, setSavingDelay] = useState(false);

  const loadData = useCallback(async (staffId: number) => {
    try {
      setError("");

      const [tripsResponse, delaysResponse] = await Promise.all([
        axios.get(TRIP_API),
        axios.get(DELAY_API),
      ]);

      const allTrips = extractArray<Trip>(tripsResponse.data);
      const allDelays = extractArray<Delay>(delaysResponse.data);

      const staffTrips = allTrips.filter(
        (trip) => Number(getStaffId(trip)) === Number(staffId)
      );

      const staffDelays = allDelays.filter(
        (delay) => Number(delay.reported_by) === Number(staffId)
      );

      setTrips(staffTrips);
      setDelays(staffDelays);
    } catch (err: any) {
      console.error("Failed to load trip data:", err);
      setError(
        getErrorMessage(err, "Failed to load trip update information.")
      );
    }
  }, []);

  useEffect(() => {
    const loggedUser = getUser();
    setUser(loggedUser);

    if (!loggedUser?.id) {
      setError("Operational Staff account information was not found. Please sign in again.");
      setLoading(false);
      return;
    }

    loadData(loggedUser.id).finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    if (!user?.id) return;

    setRefreshing(true);

    try {
      await loadData(user.id);
    } finally {
      setRefreshing(false);
    }
  }

  async function updateTrip(
    trip: Trip,
    status: "IN_PROGRESS" | "COMPLETED"
  ) {
    if (!user?.id) {
      setError("Your login session could not be identified. Please sign in again.");
      return;
    }

    if (status === "IN_PROGRESS" && normalizeStatus(trip.status) !== "SCHEDULED") {
      setError("Only scheduled trips can be started.");
      return;
    }

    if (
      status === "COMPLETED" &&
      !["IN_PROGRESS", "DELAYED"].includes(normalizeStatus(trip.status))
    ) {
      setError("Only trips in progress or delayed trips can be completed.");
      return;
    }

    try {
      setUpdatingTripId(trip.id);
      setError("");
      setNotice("");

      const now = new Date().toISOString();

      const payload = {
        status,
        actual_start_time:
          status === "IN_PROGRESS"
            ? trip.actual_start_time || now
            : trip.actual_start_time || null,
        actual_end_time:
          status === "COMPLETED"
            ? now
            : trip.actual_end_time || null,
      };

      await axios.patch(`${TRIP_API}/${trip.id}/status`, payload);

      setNotice(
        status === "IN_PROGRESS"
          ? `${getTripNumber(trip)} started successfully.`
          : `${getTripNumber(trip)} completed successfully.`
      );

      await loadData(user.id);
    } catch (err: any) {
      console.error("Trip update failed:", err);
      setError(getErrorMessage(err, "Unable to update trip status."));
    } finally {
      setUpdatingTripId(null);
    }
  }

  function openDelayModal(trip: Trip) {
    setError("");
    setNotice("");
    setSelectedTrip(trip);
    setDelayForm({
      delay_minutes: "",
      reason: "",
      description: "",
    });
    setDelayModalOpen(true);
  }

  function closeDelayModal() {
    if (savingDelay) return;
    setDelayModalOpen(false);
    setSelectedTrip(null);
  }

  async function submitDelay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTrip || !user?.id) {
      setError("Unable to identify the selected trip or logged-in staff member.");
      return;
    }

    const delayMinutes = Number(delayForm.delay_minutes);

    if (!Number.isFinite(delayMinutes) || delayMinutes <= 0) {
      setError("Please enter a valid delay duration greater than zero.");
      return;
    }

    if (!delayForm.reason) {
      setError("Please select a delay reason.");
      return;
    }

    if (
      !["IN_PROGRESS", "DELAYED"].includes(
        normalizeStatus(selectedTrip.status)
      )
    ) {
      setError("A delay can only be reported for a trip in progress or already delayed.");
      return;
    }

    try {
      setSavingDelay(true);
      setError("");
      setNotice("");

      await axios.post(DELAY_API, {
        trip_id: selectedTrip.id,
        delay_minutes: delayMinutes,
        reason: delayForm.reason,
        notes: delayForm.description.trim() || null,
        reported_by: user.id,
      });

      // The delay record has been saved. Update the trip status next.
      try {
        await axios.patch(`${TRIP_API}/${selectedTrip.id}/status`, {
          status: "DELAYED",
          actual_start_time: selectedTrip.actual_start_time || null,
          actual_end_time: selectedTrip.actual_end_time || null,
        });

        setNotice(`Delay recorded for ${getTripNumber(selectedTrip)}.`);
      } catch (statusError: any) {
        console.error("Delay saved, but trip status update failed:", statusError);

        setNotice(
          "The delay report was saved, but the trip status could not be updated. Please refresh and check the trip."
        );
      }

      setDelayModalOpen(false);
      setSelectedTrip(null);
      await loadData(user.id);
    } catch (err: any) {
      console.error("Delay report failed:", err);
      setError(getErrorMessage(err, "Unable to record the delay."));
    } finally {
      setSavingDelay(false);
    }
  }

  const filteredTrips = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return trips
      .filter((trip) => {
        if (statusFilter === "ALL") return true;
        return normalizeStatus(trip.status) === statusFilter;
      })
      .filter((trip) => {
        if (!search) return true;

        const searchableText = [
          getTripNumber(trip),
          trip.schedule_code,
          trip.route_code,
          trip.route_name,
          trip.start_point,
          trip.end_point,
          getBus(trip),
          trip.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(search);
      })
      .slice()
      .sort((a, b) => {
        const first = a.departure_time || a.actual_start_time || "";
        const second = b.departure_time || b.actual_start_time || "";
        return first.localeCompare(second);
      });
  }, [trips, searchValue, statusFilter]);

  const scheduledCount = trips.filter(
    (trip) => normalizeStatus(trip.status) === "SCHEDULED"
  ).length;

  const inProgressCount = trips.filter(
    (trip) => normalizeStatus(trip.status) === "IN_PROGRESS"
  ).length;

  const delayedCount = trips.filter(
    (trip) => normalizeStatus(trip.status) === "DELAYED"
  ).length;

  const completedCount = trips.filter(
    (trip) => normalizeStatus(trip.status) === "COMPLETED"
  ).length;

  const cancelledCount = trips.filter(
    (trip) => normalizeStatus(trip.status) === "CANCELLED"
  ).length;

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
              className="mr-4 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
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
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </header>

        <div className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                 Trip Updates
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Start trips, report delays, and update the progress of your assigned trips.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">Action required</p>
                  <p className="mt-1 text-sm">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="ml-auto rounded p-1 hover:bg-red-100"
                  aria-label="Dismiss error"
                >
                  <FiX />
                </button>
              </div>
            )}

            {notice && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                <FiCheckCircle className="mt-0.5 shrink-0" />
                <p className="text-sm">{notice}</p>
                <button
                  type="button"
                  onClick={() => setNotice("")}
                  className="ml-auto rounded p-1 hover:bg-green-100"
                  aria-label="Dismiss message"
                >
                  <FiX />
                </button>
              </div>
            )}

            {loading ? (
              <LoadingState />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <SummaryCard
                    title="Scheduled"
                    value={scheduledCount}
                    description="Ready to start"
                    icon={<FiCalendar />}
                  />
                  <SummaryCard
                    title="In Progress"
                    value={inProgressCount}
                    description="Currently running"
                    icon={<FiActivity />}
                  />
                  <SummaryCard
                    title="Delayed"
                    value={delayedCount}
                    description="Delay reported"
                    icon={<FiAlertTriangle />}
                  />
                  <SummaryCard
                    title="Completed"
                    value={completedCount}
                    description="Successfully completed"
                    icon={<FiCheckCircle />}
                  />
                  <SummaryCard
                    title="Cancelled"
                    value={cancelledCount}
                    description="Cancelled trips"
                    icon={<FiX />}
                  />
                </div>

                <div className="mt-6 text-gray-600 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-md">
                      <FiSearch
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search trip, route, bus..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                      />
                      {searchValue && (
                        <button
                          type="button"
                          onClick={() => setSearchValue("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                          aria-label="Clear search"
                        >
                          <FiX />
                        </button>
                      )}
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value as StatusFilter)
                      }
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="ALL">All Status</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DELAYED">Delayed</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Showing {filteredTrips.length} of {trips.length} assigned trips
                  </p>
                </div>

                <div className="mt-6">
                  {filteredTrips.length === 0 ? (
                    <EmptyState
                      hasTrips={trips.length > 0}
                      onClear={() => {
                        setSearchValue("");
                        setStatusFilter("ALL");
                      }}
                    />
                  ) : (
                    <div className="grid gap-5 xl:grid-cols-2">
                      {filteredTrips.map((trip) => (
                        <TripUpdateCard
                          key={trip.id}
                          trip={trip}
                          status={normalizeStatus(trip.status)}
                          updating={updatingTripId === trip.id}
                          onStart={() => updateTrip(trip, "IN_PROGRESS")}
                          onComplete={() => updateTrip(trip, "COMPLETED")}
                          onDelay={() => openDelayModal(trip)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <FiAlertTriangle />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          My Recent Delay Reports
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Delays reported by you
                        </p>
                      </div>
                    </div>
                  </div>

                  {delays.length === 0 ? (
                    <div className="p-8 text-center">
                      <FiCheckCircle className="mx-auto text-green-500" size={28} />
                      <p className="mt-3 font-semibold text-slate-800">
                        No delay reports
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        You have not reported any delays.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {delays
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.created_at || 0).getTime() -
                            new Date(a.created_at || 0).getTime()
                        )
                        .slice(0, 5)
                        .map((delay) => (
                          <div
                            key={delay.id}
                            className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold text-slate-800">
                                {`Trip #${delay.trip_id ?? "—"}`}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {delay.reason || "Delay reported"}
                              </p>
                              {( delay.notes) && (
                                <p className="mt-1 text-xs text-slate-400">
                                  { delay.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                                {delay.delay_minutes || 0} min
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDateTime(delay.created_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="font-bold text-slate-900">Trip Update Workflow</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep trip statuses updated throughout the journey.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <WorkflowStep text="SCHEDULED" active />
                    <span className="text-slate-300">→</span>
                    <WorkflowStep text="START TRIP" />
                    <span className="text-slate-300">→</span>
                    <WorkflowStep text="IN PROGRESS" />
                    <span className="text-slate-300">→</span>
                    <WorkflowStep text="COMPLETE" />
                  </div>

                  <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <FiMessageSquare className="mt-0.5 shrink-0 text-amber-600" />
                      <p className="text-sm leading-6 text-amber-800">
                        If a trip is delayed, use <strong>Report Delay</strong>.
                        Your supervisor can then monitor the recorded delay.
                      </p>
                    </div>
                  </div>
                </div> */}
              </>
            )}
          </div>
        </div>
      </main>

      {delayModalOpen && selectedTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDelayModal();
          }}
        >
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Report Trip Delay
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {getTripNumber(selectedTrip)} · {getRoute(selectedTrip)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDelayModal}
                disabled={savingDelay}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close modal"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={submitDelay} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Delay Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={delayForm.delay_minutes}
                  onChange={(event) =>
                    setDelayForm((current) => ({
                      ...current,
                      delay_minutes: event.target.value,
                    }))
                  }
                  placeholder="Example: 20"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Reason
                </label>
                <select
                  value={delayForm.reason}
                  onChange={(event) =>
                    setDelayForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  required
                >
                  <option value="">Select delay reason</option>
                  {delayReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description{" "}
                  <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={delayForm.description}
                  onChange={(event) =>
                    setDelayForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe what caused the delay..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDelayModal}
                  disabled={savingDelay}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDelay}
                  className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingDelay && <FiRefreshCw className="animate-spin" />}
                  {savingDelay ? "Reporting..." : "Report Delay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TripUpdateCard({
  trip,
  status,
  updating,
  onStart,
  onComplete,
  onDelay,
}: {
  trip: Trip;
  status: TripStatus;
  updating: boolean;
  onStart: () => void;
  onComplete: () => void;
  onDelay: () => void;
}) {
  const canStart = status === "SCHEDULED";
  const canReportDelay = status === "IN_PROGRESS" || status === "DELAYED";
  const canComplete = status === "IN_PROGRESS" || status === "DELAYED";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {getTripNumber(trip)}
            </h2>
            <StatusBadge status={status} />
          </div>

          <p className="mt-2 break-words text-base font-semibold text-slate-700">
            {getRoute(trip)}
          </p>

          {trip.schedule_code && (
            <p className="mt-1 text-xs text-slate-400">
              Schedule: {trip.schedule_code}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <FiActivity size={20} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoBox icon={<FiTruck />} label="Bus" value={getBus(trip)} />
        <InfoBox
          icon={<FiCalendar />}
          label="Date"
          value={formatDate(trip.departure_time)}
        />
        <InfoBox
          icon={<FiClock />}
          label="Departure"
          value={formatTime(trip.departure_time)}
        />
        <InfoBox
          icon={<FiCheckCircle />}
          label="Arrival"
          value={formatTime(trip.arrival_time)}
        />
      </div>

      {(trip.actual_start_time || trip.actual_end_time) && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {trip.actual_start_time && (
              <div>
                <p className="text-xs font-medium text-slate-400">Actual Start</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {formatDateTime(trip.actual_start_time)}
                </p>
              </div>
            )}
            {trip.actual_end_time && (
              <div>
                <p className="text-xs font-medium text-slate-400">Actual End</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {formatDateTime(trip.actual_end_time)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        {canStart && (
          <button
            type="button"
            onClick={onStart}
            disabled={updating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            <FiPlay />
            {updating ? "Starting..." : "Start Trip"}
          </button>
        )}

        {canReportDelay && (
          <button
            type="button"
            onClick={onDelay}
            disabled={updating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 sm:flex-none"
          >
            <FiAlertTriangle />
            Report Delay
          </button>
        )}

        {canComplete && (
          <button
            type="button"
            onClick={onComplete}
            disabled={updating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50 sm:flex-none"
          >
            <FiCheckCircle />
            {updating ? "Completing..." : "Complete Trip"}
          </button>
        )}

        {status === "COMPLETED" && (
          <div className="flex w-full items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <FiCheckCircle />
            Trip completed successfully.
          </div>
        )}

        {status === "CANCELLED" && (
          <div className="flex w-full items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
            <FiX />
            This trip has been cancelled.
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-700">
        {value}
      </p>
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
      className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({
  text,
  active = false,
}: {
  text: string;
  active?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
        active ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
      }`}
    >
      {text}
    </span>
  );
}

function EmptyState({
  hasTrips,
  onClear,
}: {
  hasTrips: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <FiCalendar size={25} />
      </div>
      <h3 className="mt-4 font-bold text-slate-800">
        {hasTrips ? "No matching trips" : "No assigned trips found"}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {hasTrips
          ? "Try changing your search text or status filter."
          : "Trips assigned to your Operational Staff account will appear here. If you expect trips, check the staff ID returned by the trips API."}
      </p>
      {hasTrips && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-32 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="mt-6 h-20 rounded-2xl bg-slate-200" />
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-72 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

