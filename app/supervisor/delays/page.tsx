"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertCircle,
  FiClock,
  FiEdit2,
  FiMapPin,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiUser,
  FiX,
} from "react-icons/fi";

import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";
import { toast, ToastContainer } from "react-toastify";

const API = "http://localhost:5000/api";
const DELAY_API = `${API}/delays`;
const TRIP_API = `${API}/trips`;

type DelayStatus = "REPORTED" | "IN_PROGRESS" | "RESOLVED";

type Trip = {
  id: number;
  depot_id?: number;
  trip_no?: string;
  schedule_code?: string;
  route_code?: string;
  route_name?: string;
  route?: string;
  start_point?: string;
  end_point?: string;
  registration_no?: string;
  bus?: string;
  staff_name?: string;
  operational_staff?: string;
  status?: string;
};

type Delay = {
  id: number;
  trip_id: number;
  depot_id?: number;
  delay_minutes: number;
  reason?: string;
  description?: string;
  notes?: string;
  recorded_by?: number;
  recorded_by_name?: string;
  recorded_at?: string;
  created_at?: string;
  trip_status?: string;
  registration_no?: string;
  bus?: string;
  staff_name?: string;
  operational_staff?: string;
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

const getArray = <T,>(response: any): T[] => {
  const data = response?.data?.data ?? response?.data;
  return Array.isArray(data) ? data : [];
};

const getTripNo = (trip: Trip) => trip.trip_no || `TRP-${trip.id}`;

const getDelayTripNo = (delay: Delay) => `TRP-${delay.trip_id}`;

const getRoute = (trip: Trip) =>
  trip.route_name ||
  trip.route ||
  (trip.start_point && trip.end_point
    ? `${trip.start_point} - ${trip.end_point}`
    : "-");

const getBus = (trip: Trip) => trip.registration_no || trip.bus || "-";

const getDelayBus = (delay: Delay) => delay.registration_no || delay.bus || "-";

const getStaff = (trip: Trip) =>
  trip.staff_name || trip.operational_staff || "-";

const getDelayStaff = (delay: Delay) =>
  delay.staff_name || delay.operational_staff || "-";

const formatDateTime = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-LK", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export default function SupervisorDelaysPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [depotId, setDepotId] = useState<number | null>(null);

  const [delays, setDelays] = useState<Delay[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingDelay, setEditingDelay] = useState<Delay | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<DelayForm>({
    trip_id: "",
    delay_minutes: "",
    reason: "Traffic Congestion",
    description: "",
  });

  // Read the signed-in supervisor's depot.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("srmss_user");

      if (!raw) {
        setError("Please log in again.");
        setLoading(false);
        return;
      }

      const user = JSON.parse(raw);
      const id = Number(user.depot_id);

      if (!Number.isInteger(id) || id <= 0) {
        setError("Your account does not have a valid depot assigned.");
        setLoading(false);
        return;
      }

      setDepotId(id);
    } catch {
      setError("Unable to read your account. Please log in again.");
      setLoading(false);
    }
  }, []);

  // GET /api/delays calls Delay.findAll() in the backend.
  const loadData = useCallback(
    async (refresh = false) => {
      if (depotId === null) return;

      try {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        setError("");

        const token = localStorage.getItem("srmss_token");
        const config = token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : {};

        const [delayResponse, tripResponse] = await Promise.all([
          axios.get(DELAY_API, config),
          axios.get(TRIP_API, config),
        ]);

        const allDelays = getArray<Delay>(delayResponse);
        const allTrips = getArray<Trip>(tripResponse);

        // UI filtering only. The backend must enforce depot access too.
        setDelays(
          allDelays.filter((delay) => Number(delay.depot_id) === depotId),
        );

        setTrips(allTrips.filter((trip) => Number(trip.depot_id) === depotId));
      } catch (err: any) {
        console.log("Failed to load delay data:", err);
        setError(
          err?.response?.data?.message ||
            "Unable to load delay information. Check your API and login.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [depotId],
  );

  useEffect(() => {
    if (depotId !== null) {
      loadData();
    }
  }, [depotId, loadData]);

  const filteredDelays = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return delays;

    return delays.filter((delay) =>
      [
        getDelayTripNo(delay),
        getDelayBus(delay),
        getDelayStaff(delay),
        delay.reason || "",
        delay.description || delay.notes || "",
        String(delay.delay_minutes),
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [delays, search]);

  const totalDelay = delays.reduce(
    (total, delay) => total + Number(delay.delay_minutes || 0),
    0,
  );

  const averageDelay = delays.length
    ? Math.round(totalDelay / delays.length)
    : 0;

  const availableTrips = useMemo(
    () =>
      trips.filter((trip) => {
        const status = (trip.status || "").toUpperCase();

        return (
          ["SCHEDULED", "IN_PROGRESS", "DELAYED"].includes(status) ||
          (editingDelay !== null && trip.id === editingDelay.trip_id)
        );
      }),
    [trips, editingDelay],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <SupervisorSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="min-h-screen lg:pl-72">
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
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing || depotId === null}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Delay Management
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Record and monitor delay reports for your depot.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <FiAlertCircle size={18} />
              <span>{error}</span>
              {depotId !== null && (
                <button
                  onClick={() => loadData(true)}
                  className="ml-auto font-semibold underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                title: "Recorded Delays",
                value: delays.length,
                icon: <FiAlertCircle size={21} />,
                color: "bg-red-50 text-red-600",
              },
              {
                title: "Total Delay",
                value: `${totalDelay} min`,
                icon: <FiClock size={21} />,
                color: "bg-amber-50 text-amber-600",
              },
              {
                title: "Average Delay",
                value: `${averageDelay} min`,
                icon: <FiClock size={21} />,
                color: "bg-blue-50 text-blue-600",
              },
            ].map((stat) => (
              <div
                key={stat.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{stat.title}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}
                  >
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-gray-600 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative">
              <FiSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search trip, route, bus, staff, reason or status..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
              <FiRefreshCw
                className="mx-auto animate-spin text-red-500"
                size={30}
              />
              <p className="mt-3 font-semibold text-slate-700">
                Loading delays...
              </p>
            </div>
          ) : filteredDelays.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
              <FiSearch className="mx-auto text-slate-300" size={32} />
              <p className="mt-3 font-semibold text-slate-700">
                No delays found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try another search or record a delay.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {filteredDelays.map((delay) => (
                <article
                  key={delay.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                        <FiAlertCircle size={21} />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900">
                          {getDelayTripNo(delay)}
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-red-50 p-3">
                      <p className="text-xs text-red-500">Delay Duration</p>
                      <p className="mt-1 font-bold text-red-600">
                        {delay.delay_minutes} minutes
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Reason</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {delay.reason || "-"}
                      </p>
                    </div>
                  </div>

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
                      {formatDateTime(delay.recorded_at || delay.created_at)}
                    </span>
                  </div>

                  {(delay.description || delay.notes) && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      <span className="font-semibold">Description: </span>
                      {delay.description || delay.notes}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
