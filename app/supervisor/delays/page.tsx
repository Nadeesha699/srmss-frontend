
"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertCircle,
  FiClock,
  FiEdit2,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiUser,
  FiX,
  FiMapPin,
} from "react-icons/fi";

import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";

const DELAY_API = "http://localhost:5000/api/delays";
const TRIP_API = "http://localhost:5000/api/trips";

type Trip = {
  id: number;
  trip_no?: string;
  tripNo?: string;

  schedule_code?: string;

  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;

  registration_no?: string;
  bus?: string;

  staff_name?: string;
  operational_staff?: string;

  departure_time?: string;
  arrival_time?: string;

  status?: string;
};

type Delay = {
  id: number;

  trip_id: number;

  trip_no?: string;
  tripNo?: string;

  route_name?: string;
  route?: string;

  route_code?: string;

  registration_no?: string;
  bus?: string;

  staff_name?: string;
  operational_staff?: string;

  delay_minutes: number;

  reason: string;

  description?: string;
  notes?: string;

  reported_by?: number;
  reporter_name?: string;

  created_at?: string;
  recorded_at?: string;
};

type DelayForm = {
  trip_id: string;
  delay_minutes: string;
  reason: string;
  description: string;
};

const reasons = [
  "Traffic Congestion",
  "Passenger Delay",
  "Vehicle Issue",
  "Weather",
  "Road Closure",
  "Operational Issue",
  "Other",
];

const getTripNo = (trip: Trip) =>
  trip.trip_no || trip.tripNo || `TRP-${trip.id}`;

const getDelayTripNo = (delay: Delay) =>
  delay.trip_no || delay.tripNo || `TRP-${delay.trip_id}`;

const getRoute = (trip: Trip) => {
  if (trip.route_name) return trip.route_name;

  if (trip.start_point && trip.end_point) {
    return `${trip.start_point} - ${trip.end_point}`;
  }

  return "-";
};

const getDelayRoute = (delay: Delay) => {
  if (delay.route_name) return delay.route_name;
  if (delay.route) return delay.route;

  return "-";
};

const getBus = (trip: Trip) =>
  trip.registration_no || trip.bus || "-";

const getDelayBus = (delay: Delay) =>
  delay.registration_no || delay.bus || "-";

const getStaff = (trip: Trip) =>
  trip.staff_name || trip.operational_staff || "-";

const getDelayStaff = (delay: Delay) =>
  delay.staff_name || delay.operational_staff || "-";

const formatDateTime = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function SupervisorDelaysPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [delays, setDelays] = useState<Delay[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingDelay, setEditingDelay] =
    useState<Delay | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState<DelayForm>({
    trip_id: "",
    delay_minutes: "",
    reason: "Traffic Congestion",
    description: "",
  });

  const loadData = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [delayResponse, tripResponse] =
        await Promise.all([
          axios.get(DELAY_API),
          axios.get(TRIP_API),
        ]);

      const delayData = delayResponse.data?.data;
      const tripData = tripResponse.data?.data;

      setDelays(
        Array.isArray(delayData)
          ? delayData
          : Array.isArray(delayResponse.data)
          ? delayResponse.data
          : []
      );

      setTrips(
        Array.isArray(tripData)
          ? tripData
          : Array.isArray(tripResponse.data)
          ? tripResponse.data
          : []
      );
    } catch (err) {
      console.error("Failed to load delay data:", err);

      setError(
        "Unable to load delay information. Please check the API."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDelays = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return delays;

    return delays.filter((delay) => {
      return (
        getDelayTripNo(delay)
          .toLowerCase()
          .includes(value) ||
        getDelayRoute(delay)
          .toLowerCase()
          .includes(value) ||
        getDelayBus(delay)
          .toLowerCase()
          .includes(value) ||
        getDelayStaff(delay)
          .toLowerCase()
          .includes(value) ||
        delay.reason.toLowerCase().includes(value) ||
        String(delay.delay_minutes).includes(value)
      );
    });
  }, [delays, search]);

  const totalDelay = useMemo(() => {
    return delays.reduce(
      (total, delay) =>
        total + Number(delay.delay_minutes || 0),
      0
    );
  }, [delays]);

  const averageDelay = delays.length
    ? Math.round(totalDelay / delays.length)
    : 0;

  /*
   * Only active trips should normally be available
   * for recording a new delay.
   */
  const availableTrips = useMemo(() => {
    const delayedTripIds = new Set(
      delays.map((delay) => delay.trip_id)
    );

    return trips.filter((trip) => {
      const activeStatus =
        trip.status === "SCHEDULED" ||
        trip.status === "IN_PROGRESS" ||
        trip.status === "DELAYED";

      /*
       * When editing, keep the current trip selectable.
       */
      if (
        editingDelay &&
        trip.id === editingDelay.trip_id
      ) {
        return true;
      }

      return activeStatus && !delayedTripIds.has(trip.id);
    });
  }, [trips, delays, editingDelay]);

  const openAddModal = () => {
    setEditingDelay(null);

    setForm({
      trip_id: "",
      delay_minutes: "",
      reason: "Traffic Congestion",
      description: "",
    });

    setShowModal(true);
  };

  const openEditModal = (delay: Delay) => {
    setEditingDelay(delay);

    setForm({
      trip_id: String(delay.trip_id),
      delay_minutes: String(delay.delay_minutes),
      reason: delay.reason,
      description:
        delay.description || delay.notes || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingDelay(null);
  };

  const saveDelay = async () => {
    if (!form.trip_id) {
      alert("Please select a trip.");
      return;
    }

    if (!form.delay_minutes) {
      alert("Please enter the delay duration.");
      return;
    }

    const minutes = Number(form.delay_minutes);

    if (!Number.isFinite(minutes) || minutes <= 0) {
      alert("Delay minutes must be greater than 0.");
      return;
    }

    if (!form.reason) {
      alert("Please select a delay reason.");
      return;
    }

    try {
      setSaving(true);

      const userData = localStorage.getItem("srmss_user");

      let currentUser: {
        id?: number;
      } | null = null;

      if (userData) {
        try {
          currentUser = JSON.parse(userData);
        } catch {
          currentUser = null;
        }
      }

      const payload = {
        trip_id: Number(form.trip_id),
        delay_minutes: minutes,
        reason: form.reason,
        description: form.description,
        reported_by: currentUser?.id || null,
      };

      if (editingDelay) {
        await axios.put(
          `${DELAY_API}/${editingDelay.id}`,
          payload
        );

        alert("Delay updated successfully.");
      } else {
        await axios.post(DELAY_API, payload);

        alert("Delay recorded successfully.");
      }

      closeModal();

      await loadData(true);
    } catch (err: any) {
      console.error("Failed to save delay:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to save delay.";

      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SupervisorSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="min-h-screen lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="mr-4 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
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
          {/* Page header */}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm lg:hidden"
              >
                <FiMenu size={21} />
              </button>

              <div>
                <p className="text-sm font-medium text-red-600">
                  Supervisor Workspace
                </p>

                <h1 className="text-3xl font-bold text-slate-900">
                  Delay Management
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Record and monitor delays reported during trips.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <FiRefreshCw
                  size={17}
                  className={
                    refreshing ? "animate-spin" : ""
                  }
                />

                <span className="hidden sm:inline">
                  Refresh
                </span>
              </button>

              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700"
              >
                <FiPlus size={18} />

                <span className="hidden sm:inline">
                  Record Delay
                </span>
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Recorded Delays
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {delays.length}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <FiAlertCircle size={21} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Total Delay
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {totalDelay} min
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <FiClock size={21} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    Average Delay
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {averageDelay} min
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FiClock size={21} />
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <FiAlertCircle size={18} />

              <span>{error}</span>

              <button
                onClick={() => loadData()}
                className="ml-auto font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Search */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <FiSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by trip, route, bus, operational staff or reason..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          {/* Delay cards */}
          {loading ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <FiRefreshCw
                className="mx-auto animate-spin text-red-500"
                size={30}
              />

              <p className="mt-3 font-semibold text-slate-700">
                Loading delays...
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Fetching delay records.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {filteredDelays.map((delay) => (
                <div
                  key={delay.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                        <FiAlertCircle size={21} />
                      </div>

                      <div>
                        <p className="font-bold text-slate-900">
                          {getDelayTripNo(delay)}
                        </p>

                        <p className="text-sm text-slate-500">
                          {getDelayRoute(delay)}
                        </p>

                        {delay.route_code && (
                          <p className="mt-1 text-xs text-slate-400">
                            {delay.route_code}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => openEditModal(delay)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                      aria-label="Edit delay"
                    >
                      <FiEdit2 size={17} />
                    </button>
                  </div>

                  {/* Delay information */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-xs text-red-500">
                        Delay
                      </p>

                      <p className="mt-1 font-bold text-red-600">
                        {delay.delay_minutes} minutes
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        Reason
                      </p>

                      <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                        {delay.reason}
                      </p>
                    </div>
                  </div>

                  {/* Bus + staff */}
                  <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
                    <span className="flex items-center gap-2">
                      <FiTruck className="text-slate-400" />

                      {getDelayBus(delay)}
                    </span>

                    <span className="flex items-center gap-2">
                      <FiUser className="text-slate-400" />

                      {getDelayStaff(delay)}
                    </span>

                    <span className="flex items-center gap-2">
                      <FiClock className="text-slate-400" />

                      {formatDateTime(
                        delay.created_at ||
                          delay.recorded_at
                      )}
                    </span>
                  </div>

                  {/* Notes */}
                  {(delay.description || delay.notes) && (
                    <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                      <span className="font-semibold">
                        Notes:{" "}
                      </span>

                      {delay.description ||
                        delay.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && filteredDelays.length === 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
              <FiSearch
                className="mx-auto text-slate-300"
                size={32}
              />

              <p className="mt-3 font-semibold text-slate-700">
                No delays found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or record a new delay.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingDelay
                    ? "Edit Delay"
                    : "Record Trip Delay"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Select a trip and record its delay information.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Trip */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Trip
                </label>

                <select
                  value={form.trip_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      trip_id: e.target.value,
                    })
                  }
                  disabled={!!editingDelay}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100"
                >
                  <option value="">
                    Select trip
                  </option>

                  {availableTrips.map((trip) => (
                    <option
                      key={trip.id}
                      value={trip.id}
                    >
                      {getTripNo(trip)} —{" "}
                      {getRoute(trip)} —{" "}
                      {getBus(trip)}
                    </option>
                  ))}
                </select>

                {availableTrips.length === 0 &&
                  !editingDelay && (
                    <p className="mt-2 text-xs text-amber-600">
                      No eligible trips are currently available.
                    </p>
                  )}
              </div>

              {/* Selected trip details */}
              {form.trip_id && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  {(() => {
                    const selectedTrip = trips.find(
                      (trip) =>
                        trip.id ===
                        Number(form.trip_id)
                    );

                    if (!selectedTrip) return null;

                    return (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-red-500">
                            Route
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <FiMapPin className="text-red-500" />

                            <p className="text-sm font-semibold text-slate-800">
                              {getRoute(selectedTrip)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-red-500">
                            Bus
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <FiTruck className="text-red-500" />

                            <p className="text-sm font-semibold text-slate-800">
                              {getBus(selectedTrip)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-red-500">
                            Operational Staff
                          </p>

                          <div className="mt-1 flex items-center gap-2">
                            <FiUser className="text-red-500" />

                            <p className="text-sm font-semibold text-slate-800">
                              {getStaff(selectedTrip)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Delay minutes */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Delay Minutes
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.delay_minutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      delay_minutes: e.target.value,
                    })
                  }
                  placeholder="e.g. 20"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Delay Reason
                </label>

                <select
                  value={form.reason}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reason: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                >
                  {reasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter additional information about the delay..."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={saveDelay}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && (
                  <FiRefreshCw
                    size={16}
                    className="animate-spin"
                  />
                )}

                {editingDelay
                  ? "Update Delay"
                  : "Save Delay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

