"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTool,
  FiTruck,
  FiX,
  FiDollarSign,
} from "react-icons/fi";
import OperationalSidebar from "@/components/SideNavBar/OperationalSidebar";

const API_BASE = "http://localhost:5000/api";
const TRIP_API = `${API_BASE}/trips`;
const MAINTENANCE_API = `${API_BASE}/maintenance`;

type Trip = {
  id: number;
  trip_no?: string;
  tripNo?: string;
  staff_id?: number;
  bus_id?: number;
  registration_no?: string;
  bus?: string;
  route_name?: string;
  route_code?: string;
  start_point?: string;
  end_point?: string;
  status?: string;
};

type MaintenanceRecord = {
  id: number;
  trip_id?: number | null;
  bus_id: number;
  maintenance_type: string;
  description?: string;
  service_date: string;
  cost?: number | string;
  status?: string;
  recorded_by?: number | null;
  recorded_by_name?: string;
  registration_no?: string;
  created_at?: string;
  updated_at?: string;
};

type MaintenanceForm = {
  trip_id: string;
  bus_id: string;
  maintenance_type: string;
  description: string;
  service_date: string;
  cost: string;
};

const maintenanceTypes = [
  "Engine",
  "Brakes",
  "Tyres",
  "Electrical",
  "Cooling System",
  "Lights",
  "Doors",
  "Air Conditioning",
  "Other",
];

const emptyForm: MaintenanceForm = {
  trip_id: "",
  bus_id: "",
  maintenance_type: "",
  description: "",
  service_date: new Date().toLocaleDateString("en-CA"),
  cost: "0",
};

function extractArray<T>(response: any): T[] {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(response?.results)) return response.results;

  return [];
}

function getTripNo(trip: Trip) {
  return trip.trip_no || trip.tripNo || `TRIP-${trip.id}`;
}

function getRoute(trip: Trip) {
  return (
    trip.route_name ||
    [trip.start_point, trip.end_point].filter(Boolean).join(" → ") ||
    trip.route_code ||
    "Route not available"
  );
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.substring(0, 10);
  }

  return date.toLocaleDateString("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status?: string) {
  switch ((status || "REPORTED").toUpperCase()) {
    case "COMPLETED":
    case "RESOLVED":
      return "bg-green-100 text-green-700";

    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700";

    case "CANCELLED":
      return "bg-red-100 text-red-700";

    case "REPORTED":
    case "PENDING":
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default function OperationalStaffMaintenancePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MaintenanceForm>(emptyForm);

  useEffect(() => {
    const storedUser = localStorage.getItem("srmss_user");

    if (!storedUser) {
      setError("Logged-in operational staff user was not found.");
      setLoading(false);
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      const id = Number(user.id);

      if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Invalid user ID");
      }

      setUserId(id);
    } catch {
      setError("Unable to read the logged-in user.");
      setLoading(false);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [tripResponse, maintenanceResponse] = await Promise.all([
        axios.get(TRIP_API),
        axios.get(MAINTENANCE_API),
      ]);

      setTrips(extractArray<Trip>(tripResponse));
      setRecords(extractArray<MaintenanceRecord>(maintenanceResponse));
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load maintenance records. Check your backend API.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId !== null) {
      void loadData();
    }
  }, [userId]);

  // Show only trips assigned to the logged-in operational staff member.
  const myTrips = useMemo(() => {
    if (userId === null) return [];

    return trips.filter((trip) => Number(trip.staff_id) === userId);
  }, [trips, userId]);

  // The database uses recorded_by, not staff_id.
  const myRecords = useMemo(() => {
    if (userId === null) return [];

    return records
      .filter((record) => Number(record.recorded_by) === userId)
      .sort(
        (a, b) =>
          new Date(b.created_at || b.service_date).getTime() -
          new Date(a.created_at || a.service_date).getTime(),
      );
  }, [records, userId]);

  const filteredRecords = useMemo(() => {
    const value = search.toLowerCase().trim();

    return myRecords.filter((record) => {
      const matchesSearch =
        !value ||
        [
          record.registration_no,
          record.maintenance_type,
          record.description,
          String(record.bus_id),
          String(record.trip_id || ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(value);

      const matchesStatus =
        statusFilter === "ALL" ||
        (record.status || "REPORTED").toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [myRecords, search, statusFilter]);

  const openModal = (trip?: Trip) => {
    setError("");
    setSuccess("");

    setForm({
      ...emptyForm,
      service_date: new Date().toLocaleDateString("en-CA"),
      trip_id: trip ? String(trip.id) : "",
      bus_id: trip?.bus_id ? String(trip.bus_id) : "",
    });

    setModalOpen(true);
  };

  const handleTripChange = (tripId: string) => {
    const trip = myTrips.find((item) => item.id === Number(tripId));

    setForm((previous) => ({
      ...previous,
      trip_id: tripId,
      bus_id: trip?.bus_id ? String(trip.bus_id) : "",
    }));
  };

  const submitMaintenance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (userId === null) {
      setError("Logged-in user was not found.");
      return;
    }

    if (
      !form.bus_id ||
      !form.maintenance_type ||
      !form.description.trim() ||
      !form.service_date
    ) {
      setError(
        "Bus, maintenance type, description and service date are required.",
      );
      return;
    }

    const busId = Number(form.bus_id);
    const cost = Number(form.cost);

    if (!Number.isInteger(busId) || busId <= 0) {
      setError("Enter a valid bus ID.");
      return;
    }

    if (!Number.isFinite(cost) || cost < 0) {
      setError("Enter a valid maintenance cost.");
      return;
    }

    try {
      setSaving(true);

      // These field names match maintenance.model.js.
      const payload = {
        trip_id: form.trip_id ? Number(form.trip_id) : null,
        bus_id: Number(form.bus_id),
        maintenance_type: form.maintenance_type,
        description: form.description || null,
        service_date: form.service_date,
        cost: Number(form.cost || 0),
        status: "REPORTED",
        recorded_by: userId,
      };

      const response = await axios.post(MAINTENANCE_API, payload);

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Failed to submit maintenance report.",
        );
      }

      setModalOpen(false);
      setForm(emptyForm);
      setSuccess("Maintenance report submitted successfully.");

      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to submit maintenance report.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openIssues = myRecords.filter(
    (record) =>
      !["COMPLETED", "RESOLVED", "CANCELLED"].includes(
        (record.status || "REPORTED").toUpperCase(),
      ),
  ).length;

  const completedIssues = myRecords.filter((record) =>
    ["COMPLETED", "RESOLVED"].includes((record.status || "").toUpperCase()),
  ).length;

  const totalCost = myRecords.reduce(
    (total, record) => total + Number(record.cost || 0),
    0,
  );

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
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Maintenance</h1>
              <p className="text-sm text-slate-500">
                Report vehicle problems and track maintenance records.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <FiCheckCircle className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FiTool />
              </div>
              <p className="text-sm text-slate-500">My Reports</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {myRecords.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <FiAlertCircle />
              </div>
              <p className="text-sm text-slate-500">Open Issues</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {openIssues}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <FiCheckCircle />
              </div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {completedIssues}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <FiDollarSign />
              </div>
              <p className="text-sm text-slate-500">Recorded Cost</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                LKR{" "}
                {totalCost.toLocaleString("en-LK", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bus, trip or maintenance type..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-red-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <button
              onClick={() => openModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              <FiPlus />
              Report Issue
            </button>
          </div>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-bold text-slate-900">
                My Maintenance Reports
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Reports recorded by your operational staff account.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12 text-slate-500">
                <FiLoader className="mr-2 animate-spin" />
                Loading maintenance records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center">
                <FiTool className="mx-auto mb-3 text-3xl text-slate-300" />
                <p className="font-medium text-slate-700">
                  No maintenance records found.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Report a vehicle problem to create your first record.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <div key={record.id} className="p-5 hover:bg-slate-50">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                          <FiTool />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                              {record.maintenance_type}
                            </h3>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(record.status)}`}
                            >
                              {(record.status || "PENDING").replaceAll(
                                "_",
                                " ",
                              )}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <FiTruck />
                              {record.registration_no ||
                                `Bus #${record.bus_id}`}
                            </span>

                            {record.trip_id && (
                              <span className="flex items-center gap-1.5">
                                <FiCalendar />
                                Trip #{record.trip_id}
                              </span>
                            )}

                            <span className="flex items-center gap-1.5">
                              <FiClock />
                              {formatDate(record.service_date)}
                            </span>
                          </div>

                          <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {record.description || "No description provided."}
                          </p>

                          <p className="mt-2 text-sm font-medium text-slate-700">
                            Recorded cost: LKR{" "}
                            {Number(record.cost || 0).toLocaleString("en-LK", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* <section className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex gap-3">
              <FiAlertCircle className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <h3 className="font-bold text-blue-900">
                  Maintenance reporting workflow
                </h3>
                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Operational Staff report vehicle problems and record
                  maintenance information. Reports are initially marked Pending.
                  The responsible supervisor or authorized maintenance team
                  should review the report and update its status through their
                  management workflow.
                </p>
              </div>
            </div>
          </section> */}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={submitMaintenance}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Report Maintenance Issue
                </h2>
                <p className="text-sm text-slate-500">
                  Record the vehicle, problem and service information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100"
                aria-label="Close form"
              >
                <FiX />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Assigned Trip (optional)
                </label>

                <select
                  value={form.trip_id}
                  onChange={(event) => handleTripChange(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                >
                  <option value="">No specific trip</option>

                  {myTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {getTripNo(trip)} — {getRoute(trip)} — {getBus(trip)}
                    </option>
                  ))}
                </select>

                {myTrips.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    No assigned trips were found. You can enter the bus ID below
                    if you are reporting a depot vehicle issue.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Bus ID *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.bus_id}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        bus_id: event.target.value,
                      }))
                    }
                    placeholder="Enter bus ID"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Maintenance Type *
                  </label>
                  <select
                    required
                    value={form.maintenance_type}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        maintenance_type: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                  >
                    <option value="">Select type</option>
                    {maintenanceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Service / Report Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.service_date}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        service_date: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold">
                    Cost (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        cost: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Problem Description *
                </label>
                <textarea
                  rows={5}
                  required
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the vehicle problem or maintenance performed..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                />
              </div>

              <p className="text-xs text-slate-500">
                New reports are submitted with Pending status. The status should
                be updated by the authorized management team.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? <FiLoader className="animate-spin" /> : <FiTool />}
                {saving ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
