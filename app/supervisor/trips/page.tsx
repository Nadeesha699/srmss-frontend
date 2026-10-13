
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import axios from "axios";

import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";

const API_URL = "http://localhost:5000/api/trips";

type TripStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "DELAYED"
  | "COMPLETED"
  | "CANCELLED";

type Trip = {
  id: number;
  trip_no?: string;
  tripNo?: string;

  schedule_id?: number;
  schedule_code?: string;

  route_id?: number;
  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;

  bus_id?: number;
  registration_no?: string;
  bus?: string;

  staff_id?: number;
  staff_name?: string;
  operational_staff?: string;

  departure_time?: string;
  arrival_time?: string;

  actual_start_time?: string;
  actual_end_time?: string;

  status: TripStatus;

  delay_minutes?: number;
  delay_reason?: string;

  created_at?: string;
  updated_at?: string;
};

const statusStyles: Record<TripStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 ring-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-200",
  DELAYED: "bg-red-50 text-red-700 ring-red-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

const statusIcons: Record<TripStatus, React.ReactNode> = {
  SCHEDULED: <FiClock size={14} />,
  IN_PROGRESS: <FiActivity size={14} />,
  DELAYED: <FiAlertCircle size={14} />,
  COMPLETED: <FiCheckCircle size={14} />,
  CANCELLED: <FiAlertCircle size={14} />,
};

const formatTime = (value?: string) => {
  if (!value) return "-";

  const parts = value.split(":");

  if (parts.length < 2) return value;

  let hour = Number(parts[0]);
  const minute = parts[1];

  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
};

const getTripNumber = (trip: Trip) => {
  return trip.trip_no || trip.tripNo || `TRP-${trip.id}`;
};

const getBusNumber = (trip: Trip) => {
  return trip.registration_no || trip.bus || "-";
};

const getStaffName = (trip: Trip) => {
  return trip.staff_name || trip.operational_staff || "-";
};

const getRouteName = (trip: Trip) => {
  if (trip.route_name) return trip.route_name;

  if (trip.start_point && trip.end_point) {
    return `${trip.start_point} - ${trip.end_point}`;
  }

  return "-";
};

export default function SupervisorTripsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [trips, setTrips] = useState<Trip[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | TripStatus
  >("ALL");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

 const loadTrips = async (showRefresh = false) => {
  try {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    // Get logged-in supervisor
    const storedUser = localStorage.getItem("srmss_user");

    if (!storedUser) {
      setError("Please log in to view trips.");
      setTrips([]);
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    const supervisorDepotId = Number(parsedUser.depot_id);

    if (
      !Number.isInteger(supervisorDepotId) ||
      supervisorDepotId <= 0
    ) {
      setError("Your account is not assigned to a valid depot.");
      setTrips([]);
      return;
    }

    // Fetch trips
    const response = await axios.get(API_URL);

    const data = response.data?.data;

    const allTrips = Array.isArray(data)
      ? data
      : Array.isArray(response.data)
        ? response.data
        : [];

    // Filter trips belonging to the supervisor's depot
    const depotTrips = allTrips.filter((trip) => {
      const tripDepotId = Number(
        trip.depot_id ??
        trip.schedule_depot_id ??
        trip.bus_depot_id ??
        trip.schedule?.depot_id ??
        trip.bus?.depot_id
      );

      return tripDepotId === supervisorDepotId;
    });

    setTrips(depotTrips);
  } catch (err) {
    console.error("Failed to load trips:", err);

    setTrips([]);
    setError("Unable to load trips. Please check the trips API.");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useEffect(() => {
    loadTrips();
  }, []);

  const filteredTrips = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return trips.filter((trip) => {
      const tripNumber = getTripNumber(trip);
      const routeName = getRouteName(trip);
      const busNumber = getBusNumber(trip);
      const staffName = getStaffName(trip);

      const matchesSearch =
        !searchValue ||
        tripNumber.toLowerCase().includes(searchValue) ||
        routeName.toLowerCase().includes(searchValue) ||
        (trip.route_code || "").toLowerCase().includes(searchValue) ||
        busNumber.toLowerCase().includes(searchValue) ||
        staffName.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL" ||
        trip.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [trips, search, statusFilter]);

  const totalTrips = trips.length;

  const inProgressTrips = trips.filter(
    (trip) => trip.status === "IN_PROGRESS"
  ).length;

  const delayedTrips = trips.filter(
    (trip) => trip.status === "DELAYED"
  ).length;

  const completedTrips = trips.filter(
    (trip) => trip.status === "COMPLETED"
  ).length;

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
            onClick={() => loadTrips(true)}
              disabled={refreshing}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
          >
            <FiRefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm lg:hidden"
                aria-label="Open menu"
              >
                <FiMenu size={21} />
              </button>

              <div>
                <p className="text-sm font-medium text-red-600">
                  Supervisor Workspace
                </p>

                <h1 className="text-3xl font-bold text-slate-900">
                  Trip Monitoring
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Monitor scheduled, active, delayed and completed trips.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Trips",
                value: totalTrips,
                icon: FiActivity,
                style: "bg-red-50 text-red-600",
              },
              {
                label: "In Progress",
                value: inProgressTrips,
                icon: FiClock,
                style: "bg-amber-50 text-amber-600",
              },
              {
                label: "Delayed",
                value: delayedTrips,
                icon: FiAlertCircle,
                style: "bg-red-50 text-red-600",
              },
              {
                label: "Completed",
                value: completedTrips,
                icon: FiCheckCircle,
                style: "bg-emerald-50 text-emerald-600",
              },
            ].map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        {stat.label}
                      </p>

                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {stat.value}
                      </p>
                    </div>

                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.style}`}
                    >
                      <Icon size={21} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <FiSearch
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search trip, route, bus or operational staff..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "ALL" | TripStatus
                  )
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
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

          {/* Error */}
          {error && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <FiAlertCircle size={18} />

              <span>{error}</span>

              <button
                onClick={() => loadTrips()}
                className="ml-auto font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Trip Table */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                Trips
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Monitor trip execution and operational status.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">
                      Trip
                    </th>

                    <th className="px-5 py-4">
                      Route
                    </th>

                    <th className="px-5 py-4">
                      Bus
                    </th>

                    <th className="px-5 py-4">
                      Operational Staff
                    </th>

                    <th className="px-5 py-4">
                      Departure
                    </th>

                    <th className="px-5 py-4">
                      Arrival
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-16 text-center"
                      >
                        <div className="flex flex-col items-center">
                          <FiRefreshCw
                            size={28}
                            className="animate-spin text-red-500"
                          />

                          <p className="mt-3 font-semibold text-slate-700">
                            Loading trips...
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Fetching trip monitoring data.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrips.map((trip) => (
                      <tr
                        key={trip.id}
                        className="transition hover:bg-slate-50"
                      >
                        {/* Trip */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {getTripNumber(trip)}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {trip.schedule_code || "No schedule"}
                          </p>
                        </td>

                        {/* Route */}
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            <FiMapPin className="mt-0.5 shrink-0 text-red-500" />

                            <div>
                              <p className="font-medium text-slate-700">
                                {getRouteName(trip)}
                              </p>

                              {trip.route_code && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {trip.route_code}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Bus */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <FiTruck className="text-slate-400" />

                            <div>
                              <p className="font-medium">
                                {getBusNumber(trip)}
                              </p>

                              {trip.bus_id && (
                                <p className="text-xs text-slate-400">
                                  Bus ID: {trip.bus_id}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Staff */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <FiUser className="text-slate-400" />

                            <div>
                              <p className="font-medium">
                                {getStaffName(trip)}
                              </p>

                              {trip.staff_id && (
                                <p className="text-xs text-slate-400">
                                  Staff ID: {trip.staff_id}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Departure */}
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatTime(trip.departure_time)}
                        </td>

                        {/* Arrival */}
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatTime(trip.arrival_time)}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                              statusStyles[trip.status] ||
                              statusStyles.SCHEDULED
                            }`}
                          >
                            {statusIcons[trip.status] ||
                              statusIcons.SCHEDULED}

                            {trip.status.replace("_", " ")}
                          </span>

                          {trip.status === "DELAYED" &&
                            trip.delay_minutes !== undefined && (
                              <p className="mt-1 text-xs font-medium text-red-600">
                                {trip.delay_minutes} min delay
                              </p>
                            )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {!loading && filteredTrips.length === 0 && (
              <div className="px-6 py-14 text-center">
                <FiSearch
                  className="mx-auto text-slate-300"
                  size={32}
                />

                <p className="mt-3 font-semibold text-slate-700">
                  No trips found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing your search or status filter.
                </p>
              </div>
            )}

            {/* Footer */}
            {!loading && filteredTrips.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredTrips.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {trips.length}
                  </span>{" "}
                  trips
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

