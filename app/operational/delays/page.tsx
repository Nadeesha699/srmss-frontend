
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiX,
} from "react-icons/fi";
import OperationalSidebar from "@/components/SideNavBar/OperationalSidebar";

const API_BASE = "http://localhost:5000/api";
const TRIP_API = `${API_BASE}/trips`;
const DELAY_API = `${API_BASE}/delays`;

type Trip = {
  id: number;
  trip_no?: string;
  tripNo?: string;
  schedule_id?: number;
  schedule_code?: string;
  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;
  bus_id?: number;
  registration_no?: string;
  bus?: string;
  staff_id?: number;
  status?: string;
  departure_time?: string;
  arrival_time?: string;
  service_date?: string;
};

type Delay = {
  id: number;
  trip_id: number;
  delay_minutes: number;
  reason?: string;
  notes?: string;
  recorded_by?: number;
  recorded_by_name?: string;
  recorded_at?: string;
  trip_status?: string;
};

type DelayForm = {
  trip_id: string;
  delay_minutes: string;
  reason: string;
  description: string;
};

type LoggedInUser = {
  id?: number;
  role?: string;
  name?: string;
};

const delayReasons = [
  "Traffic Congestion",
  "Passenger Delay",
  "Vehicle Issue",
  "Weather",
  "Road Closure",
  "Operational Issue",
  "Other",
];

const terminalStatuses = ["COMPLETED", "CANCELLED"];

function extractArray<T>(response: any): T[] {
  const body = response?.data;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.data?.results)) return body.data.results;

  return [];
}

function getTripNo(trip: Trip) {
  return trip.trip_no || trip.tripNo || `TRIP-${trip.id}`;
}

function getRoute(trip: Trip) {
  if (trip.route_name) return trip.route_name;

  const points = [trip.start_point, trip.end_point]
    .filter(Boolean)
    .join(" → ");

  return points || trip.route_code || "Route not available";
}

function getBus(trip: Trip) {
  return (
    trip.registration_no ||
    trip.bus ||
    (trip.bus_id ? `Bus #${trip.bus_id}` : "Bus not assigned")
  );
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00`
      : value
  );

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "-";

  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

function normalizeStatus(status?: string) {
  return (status || "SCHEDULED").toUpperCase();
}

function getStatusClass(status?: string) {
  switch (normalizeStatus(status)) {
    case "DELAYED":
      return "bg-red-100 text-red-700";
    case "IN_PROGRESS":
    case "RUNNING":
      return "bg-blue-100 text-blue-700";
    case "COMPLETED":
      return "bg-green-100 text-green-700";
    case "CANCELLED":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default function OperationalStaffReportDelaysPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [delays, setDelays] = useState<Delay[]>([]);
  const [userId, setUserId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState<DelayForm>({
    trip_id: "",
    delay_minutes: "",
    reason: "",
    description: "",
  });

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("srmss_user");

      if (!storedUser) {
        setError("Please log in to view your assigned trips.");
        setLoading(false);
        return;
      }

      const user: LoggedInUser = JSON.parse(storedUser);
      const id = Number(user.id);

      if (!Number.isFinite(id) || id <= 0) {
        setError("The logged-in user ID is invalid. Please log in again.");
        setLoading(false);
        return;
      }

      setUserId(id);
    } catch {
      setError("Unable to read your logged-in user. Please log in again.");
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [tripResponse, delayResponse] = await Promise.all([
        axios.get(TRIP_API),
        axios.get(DELAY_API),
      ]);

      setTrips(extractArray<Trip>(tripResponse));
      setDelays(extractArray<Delay>(delayResponse));
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load trips and delay reports. Check that your backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId !== null) {
      void loadData();
    }
  }, [userId, loadData]);

  // This assumes GET /trips returns staff_id for each assigned trip.
  const myTrips = useMemo(() => {
    if (userId === null) return [];

    return trips.filter(
      (trip) => Number(trip.staff_id) === userId
    );
  }, [trips, userId]);

  const reportableTrips = useMemo(
    () =>
      myTrips.filter(
        (trip) =>
          !terminalStatuses.includes(normalizeStatus(trip.status))
      ),
    [myTrips]
  );

  const filteredTrips = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return myTrips;

    return myTrips.filter((trip) =>
      [
        getTripNo(trip),
        getRoute(trip),
        getBus(trip),
        trip.schedule_code,
        trip.route_code,
        trip.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [myTrips, search]);

  // The backend uses recorded_by and recorded_at.
  const myDelays = useMemo(() => {
    if (userId === null) return [];

    return delays
      .filter(
        (delay) => Number(delay.recorded_by) === userId
      )
      .sort(
        (a, b) =>
          new Date(b.recorded_at || 0).getTime() -
          new Date(a.recorded_at || 0).getTime()
      );
  }, [delays, userId]);

  const openModal = (trip?: Trip) => {
    setError("");
    setSuccess("");

    setForm({
      trip_id: trip ? String(trip.id) : "",
      delay_minutes: "",
      reason: "",
      description: "",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const submitDelay = async () => {
    setError("");
    setSuccess("");

    if (!form.trip_id || !form.delay_minutes || !form.reason) {
      setError("Please select a trip, delay duration and reason.");
      return;
    }

    const minutes = Number(form.delay_minutes);

    if (!Number.isInteger(minutes) || minutes <= 0) {
      setError("Delay minutes must be a positive whole number.");
      return;
    }

    if (userId === null) {
      setError("Your logged-in user was not found. Please log in again.");
      return;
    }

    const selectedTrip = reportableTrips.find(
      (trip) => trip.id === Number(form.trip_id)
    );

    if (!selectedTrip) {
      setError("Please select a valid assigned trip.");
      return;
    }

    try {
      setSaving(true);

      // Match the backend Delay model field names.
      await axios.post(DELAY_API, {
        trip_id: selectedTrip.id,
        delay_minutes: minutes,
        reason: form.reason,
        notes: form.description.trim() || null,
        recorded_by: userId,
      });

      setModalOpen(false);
      setForm({
        trip_id: "",
        delay_minutes: "",
        reason: "",
        description: "",
      });

      setSuccess("Delay report submitted successfully.");

      // Refresh the list after saving the report.
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to submit delay report. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <OperationalSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="lg:ml-72">
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
              Operational Staff
            </p>
            <p className="font-semibold text-slate-800">
              SRMSS Management Portal
            </p>
          </div>
           <button
             onClick={() => void loadData()}
              disabled={loading}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
       

              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Report Delays
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Report delays and operational problems on assigned trips.
                </p>
              </div>
            </div>

          </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <FiX />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <FiCheckCircle />
              <span className="flex-1">{success}</span>
              <button
                type="button"
                aria-label="Dismiss success message"
                onClick={() => setSuccess("")}
              >
                <FiX />
              </button>
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FiTruck size={20} />
              </div>
              <p className="text-sm text-slate-500">Assigned Trips</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {myTrips.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <FiAlertTriangle size={20} />
              </div>
              <p className="text-sm text-slate-500">My Delay Reports</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {myDelays.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <FiCheckCircle size={20} />
              </div>
              <p className="text-sm text-slate-500">Completed Trips</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {
                  myTrips.filter(
                    (trip) =>
                      normalizeStatus(trip.status) === "COMPLETED"
                  ).length
                }
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search trip, route, bus or status..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <button
              type="button"
              onClick={() => openModal()}
              disabled={reportableTrips.length === 0 || loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <FiPlus />
              Report Delay
            </button>
          </div>

          <section className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-bold text-slate-900">
                My Assigned Trips
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select an assigned trip to submit an operational delay report.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12 text-slate-500">
                <FiLoader className="mr-2 animate-spin" />
                Loading trips...
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="p-12 text-center">
                <FiTruck className="mx-auto mb-3 text-3xl text-slate-300" />
                <p className="font-medium text-slate-700">
                  No assigned trips found.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Trips assigned to your operational staff account will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTrips.map((trip) => {
                  const isTerminal = terminalStatuses.includes(
                    normalizeStatus(trip.status)
                  );

                  return (
                    <div
                      key={trip.id}
                      className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                          <FiTruck size={22} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                              {getTripNo(trip)}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                trip.status
                              )}`}
                            >
                              {normalizeStatus(trip.status)}
                            </span>
                          </div>

                          <p className="mt-1 font-medium text-slate-700">
                            {getRoute(trip)}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <FiTruck />
                              {getBus(trip)}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <FiClock />
                              {formatTime(trip.departure_time)} -{" "}
                              {formatTime(trip.arrival_time)}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <FiCalendar />
                              {formatDate(trip.service_date)}
                            </span>

                            <span>
                              {trip.schedule_code || "No schedule code"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isTerminal && (
                        <button
                          type="button"
                          onClick={() => openModal(trip)}
                          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          <FiAlertTriangle />
                          Report Delay
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-bold text-slate-900">
                Recent Delay Reports
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Delay reports submitted by your account.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-10 text-slate-500">
                <FiLoader className="mr-2 animate-spin" />
                Loading reports...
              </div>
            ) : myDelays.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No delay reports submitted yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myDelays.map((delay) => (
                  <div key={delay.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {`Trip #${delay.trip_id}`}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {delay.reason || "Other"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Report #{delay.id}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                          {delay.delay_minutes ?? 0} min
                        </span>
                        <span className="text-xs text-slate-400">
                          {delay.recorded_at
                            ? new Date(delay.recorded_at).toLocaleString(
                                "en-LK"
                              )
                            : "-"}
                        </span>
                      </div>
                    </div>

                    {delay.notes && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                        {delay.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delay-modal-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2
                  id="delay-modal-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Report Trip Delay
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the delay information for your assigned trip.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label
                  htmlFor="trip_id"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Assigned Trip <span className="text-red-500">*</span>
                </label>

                <select
                  id="trip_id"
                  value={form.trip_id}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      trip_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">Select trip</option>
                  {reportableTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {getTripNo(trip)} - {getRoute(trip)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="delay_minutes"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Delay Duration (minutes){" "}
                  <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="delay_minutes"
                    type="number"
                    min="1"
                    step="1"
                    value={form.delay_minutes}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        delay_minutes: event.target.value,
                      }))
                    }
                    placeholder="Example: 20"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="delay_reason"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Delay Reason <span className="text-red-500">*</span>
                </label>

                <select
                  id="delay_reason"
                  value={form.reason}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      reason: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                >
                  <option value="">Select reason</option>
                  {delayReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="delay_description"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Additional Notes
                </label>

                <textarea
                  id="delay_description"
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the delay or operational issue..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <p className="text-xs text-slate-500">
                Submit factual information about the delay. The report will be
                recorded under your logged-in account.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void submitDelay()}
                disabled={saving || loading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving && <FiLoader className="animate-spin" />}
                {saving ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

