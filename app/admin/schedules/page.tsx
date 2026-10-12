"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiCalendar,
  FiClock,
  FiEdit2,
  FiEye,
  FiFilter,
  FiMapPin,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUser,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiActivity,
  FiTruck,
} from "react-icons/fi";

import { AdminSidebar } from "@/components/SideNavBar/AdminSideNavBar";

const API = "http://localhost:5000/api";
const SCHEDULE_API = `${API}/schedules`;
const ROUTE_API = `${API}/routes`;
const DEPOT_API = `${API}/depots`;

type ScheduleStatus =
  | "SCHEDULED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELAYED"
  | "CANCELLED";

type Route = {
  id: number;
  route_code?: string;
  name?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;
  status?: string;
};

type Depot = {
  id: number;
  depot_code?: string;
  name: string;
  location?: string;
  status?: string;
};

type Schedule = {
  id: number;
  schedule_code: string;
  route_id: number;
  depot_id: number;
  schedule_date: string;
  departure_time: string;
  arrival_time: string;
  status: ScheduleStatus;
  route_code?: string;
  route_name?: string;
  name?: string;
  start_point?: string;
  end_point?: string;
  depot_name?: string;
  created_at?: string;
};

type ScheduleForm = {
  schedule_code: string;
  route_id: string;
  depot_id: string;
  schedule_date: string;
  departure_time: string;
  arrival_time: string;
  status: ScheduleStatus;
};

const emptyForm: ScheduleForm = {
  schedule_code: "",
  route_id: "",
  depot_id: "",
  schedule_date: "",
  departure_time: "",
  arrival_time: "",
  status: "SCHEDULED",
};

function getArray<T>(response: any): T[] {
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.schedules)) return data.schedules;
  if (Array.isArray(data?.routes)) return data.routes;
  if (Array.isArray(data?.depots)) return data.depots;

  return [];
}

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message || error?.response?.data?.error || fallback
  );
}

function getRouteName(route: Route) {
  return (
    route.name || route.route_name || route.route_code || `Route ${route.id}`
  );
}

function formatDate(date: string) {
  if (!date) return "—";

  const normalized = date.includes("T") ? date.split("T")[0] : date;
  const parts = normalized.split("-");

  if (parts.length !== 3) return normalized;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(time: string) {
  if (!time) return "—";

  const value = time.substring(0, 5);
  const [hours, minutes] = value.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AdminSchedulesPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<Schedule | null>(null);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [scheduleResponse, routeResponse, depotResponse] =
        await Promise.all([
          axios.get(SCHEDULE_API),
          axios.get(ROUTE_API),
          axios.get(DEPOT_API),
        ]);

      setSchedules(getArray<Schedule>(scheduleResponse));
      setRoutes(getArray<Route>(routeResponse));
      setDepots(getArray<Depot>(depotResponse));
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to load schedules. Check that the backend APIs are running.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const routeMap = useMemo(() => {
    return new Map(routes.map((route) => [Number(route.id), route]));
  }, [routes]);

  const depotMap = useMemo(() => {
    return new Map(depots.map((depot) => [Number(depot.id), depot]));
  }, [depots]);

  const getScheduleRoute = (schedule: Schedule) => {
    const route = routeMap.get(Number(schedule.route_id));

    return (
      schedule.route_name ||
      schedule.name ||
      (route ? getRouteName(route) : `Route ${schedule.route_id}`)
    );
  };

  const getScheduleDepot = (schedule: Schedule) => {
    return (
      schedule.depot_name ||
      depotMap.get(Number(schedule.depot_id))?.name ||
      `Depot ${schedule.depot_id}`
    );
  };

  const filteredSchedules = useMemo(() => {
    const query = search.trim().toLowerCase();

    return schedules.filter((schedule) => {
      const route = routeMap.get(Number(schedule.route_id));
      const depot = depotMap.get(Number(schedule.depot_id));

      const searchable = [
        schedule.schedule_code,
        schedule.route_code,
        schedule.route_name,
        schedule.name,
        route?.route_code,
        route?.name,
        route?.route_name,
        route?.start_point,
        route?.end_point,
        schedule.depot_name,
        depot?.name,
        depot?.depot_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus =
        statusFilter === "ALL" || schedule.status === statusFilter;
      const normalizedDate = schedule.schedule_date?.split("T")[0];
      const matchesDate = !dateFilter || normalizedDate === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [schedules, search, statusFilter, dateFilter, routeMap, depotMap]);

  const stats = useMemo(() => {
    return {
      total: schedules.length,
      scheduled: schedules.filter((item) => item.status === "SCHEDULED").length,
      assigned: schedules.filter((item) => item.status === "ASSIGNED").length,
      in_progress: schedules.filter((item) => item.status === "IN_PROGRESS")
        .length,
      completed: schedules.filter((item) => item.status === "COMPLETED").length,
      delayed: schedules.filter((item) => item.status === "DELAYED").length,
    };
  }, [schedules]);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setError("");
    setNotice("");

    setForm({
      ...emptyForm,
      schedule_code: `SCH-${new Date().getFullYear()}-${String(
        schedules.length + 1,
      ).padStart(3, "0")}`,
      schedule_date: getLocalDate(),
    });

    setModalOpen(true);
  };

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setError("");
    setNotice("");

    setForm({
      schedule_code: schedule.schedule_code || "",
      route_id: String(schedule.route_id ?? ""),
      depot_id: String(schedule.depot_id ?? ""),
      schedule_date: schedule.schedule_date?.split("T")[0] || "",
      departure_time: schedule.departure_time?.substring(0, 5) || "",
      arrival_time: schedule.arrival_time?.substring(0, 5) || "",
      status: schedule.status || "SCHEDULED",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingSchedule(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.schedule_code.trim()) {
      setError("Please enter a schedule code.");
      return;
    }

    if (!form.route_id) {
      setError("Please select a route.");
      return;
    }

    if (!form.depot_id) {
      setError("Please select a depot.");
      return;
    }

    if (!form.schedule_date || !form.departure_time || !form.arrival_time) {
      setError("Please complete the date and both times.");
      return;
    }

    if (form.arrival_time <= form.departure_time) {
      setError(
        "Arrival time must be later than departure time. Overnight schedules need separate date handling.",
      );
      return;
    }

    const duplicateCode = schedules.some(
      (item) =>
        item.schedule_code.toLowerCase() ===
          form.schedule_code.trim().toLowerCase() &&
        item.id !== editingSchedule?.id,
    );

    if (duplicateCode) {
      setError("This schedule code already exists.");
      return;
    }

    const payload = {
      schedule_code: form.schedule_code.trim(),
      route_id: Number(form.route_id),
      depot_id: Number(form.depot_id),
      schedule_date: form.schedule_date,
      departure_time: form.departure_time,
      arrival_time: form.arrival_time,
      status: form.status,
    };

    setSaving(true);

    try {
      if (editingSchedule) {
        await axios.put(`${SCHEDULE_API}/${editingSchedule.id}`, payload);
        setNotice("Schedule updated successfully.");
      } else {
        await axios.post(SCHEDULE_API, payload);
        setNotice("Schedule created successfully.");
      }

      setModalOpen(false);
      setEditingSchedule(null);
      setForm(emptyForm);

      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          editingSchedule
            ? "Unable to update the schedule."
            : "Unable to create the schedule.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (schedule: Schedule) => {
    const confirmed = window.confirm(
      `Delete ${schedule.schedule_code}? Only delete schedules that have no assignment or trip history.`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await axios.delete(`${SCHEDULE_API}/${schedule.id}`);
      setNotice(`${schedule.schedule_code} was deleted.`);
      await loadData();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to delete this schedule. It may have assignment or trip records.",
        ),
      );
    }
  };

  const statusClass = (status: ScheduleStatus) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";

      case "ASSIGNED":
        return "bg-purple-50 text-purple-700 ring-1 ring-purple-200";

      case "IN_PROGRESS":
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";

      case "DELAYED":
        return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";

      case "CANCELLED":
        return "bg-red-50 text-red-700 ring-1 ring-red-200";

      default:
        return "bg-gray-50 text-gray-700 ring-1 ring-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-100 lg:hidden"
                aria-label="Open navigation"
              >
                <FiMenu size={20} />
              </button>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">
                  SRMSS Management Portal
                </p>
                <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                  Schedule Management
                </h1>
                <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                  Create and manage public transport service schedules.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 sm:px-4"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <FiAlertCircle className="mt-0.5 shrink-0" size={18} />
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <FiX />
              </button>
            </div>
          )}

          {notice && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <FiCheckCircle className="mt-0.5 shrink-0" size={18} />
              <p className="flex-1">{notice}</p>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                <FiX />
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Schedules"
              value={stats.total}
              icon={<FiCalendar />}
              description="All saved schedules"
              iconClass="bg-slate-100 text-slate-700"
            />
            <StatCard
              title="Scheduled"
              value={stats.scheduled}
              icon={<FiCalendar />}
              description="Schedules awaiting assignment"
              iconClass="bg-blue-100 text-blue-700"
            />

            <StatCard
              title="Assigned"
              value={stats.assigned}
              icon={<FiTruck />}
              description="Schedules with bus and driver assigned"
              iconClass="bg-purple-100 text-purple-700"
            />

            <StatCard
              title="In Progress"
              value={stats.in_progress}
              icon={<FiActivity />}
              description="Trips currently in progress"
              iconClass="bg-amber-100 text-amber-700"
            />

            <StatCard
              title="Completed"
              value={stats.completed}
              icon={<FiCheckCircle />}
              description="Successfully completed trips"
              iconClass="bg-emerald-100 text-emerald-700"
            />

            <StatCard
              title="Delayed"
              value={stats.delayed}
              icon={<FiClock />}
              description="Schedules with reported delays"
              iconClass="bg-orange-100 text-orange-700"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-lg font-bold">Service schedules</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Manage route, depot, date, departure and arrival times.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
              >
                <FiPlus size={18} />
                Create Schedule
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative xl:col-span-2">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search schedule, route or depot..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="relative">
                <FiFilter
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-red-500"
                >
                  <option value="ALL">All statuses</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  aria-label="Filter by date"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-red-500"
                />
              </div>
            </div>

            {(search || statusFilter !== "ALL" || dateFilter) && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                <span>
                  Showing {filteredSchedules.length} of {schedules.length}{" "}
                  schedules
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                    setDateFilter("");
                  }}
                  className="font-semibold text-red-600 hover:text-red-700"
                >
                  Clear filters
                </button>
              </div>
            )}

            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-bold">Schedule</th>
                    <th className="px-5 py-4 font-bold">Route</th>
                    <th className="px-5 py-4 font-bold">Depot</th>
                    <th className="px-5 py-4 font-bold">Date</th>
                    <th className="px-5 py-4 font-bold">Departure / Arrival</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                    <th className="px-5 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-14 text-center text-slate-500"
                      >
                        <FiRefreshCw
                          className="mx-auto mb-3 animate-spin"
                          size={22}
                        />
                        Loading schedules...
                      </td>
                    </tr>
                  ) : filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-14 text-center">
                        <FiCalendar
                          className="mx-auto mb-3 text-slate-300"
                          size={30}
                        />
                        <p className="font-semibold text-slate-700">
                          No schedules found
                        </p>
                        <p className="mt-1 text-slate-500">
                          Create a schedule or change your search filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((schedule) => {
                      const route = routeMap.get(Number(schedule.route_id));

                      return (
                        <tr key={schedule.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-900">
                              {schedule.schedule_code}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              ID: {schedule.id}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {getScheduleRoute(schedule)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {route?.start_point ||
                                schedule.start_point ||
                                "—"}
                              {" → "}
                              {route?.end_point || schedule.end_point || "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <FiMapPin className="shrink-0 text-slate-400" />
                              <span>{getScheduleDepot(schedule)}</span>
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            {formatDate(schedule.schedule_date)}
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <p className="font-semibold text-slate-800">
                              {formatTime(schedule.departure_time)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Arrival: {formatTime(schedule.arrival_time)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(
                                schedule.status,
                              )}`}
                            >
                              {schedule.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <ActionButton
                                label="View details"
                                onClick={() => {
                                  setViewingSchedule(schedule);
                                  setViewOpen(true);
                                }}
                              >
                                <FiEye />
                              </ActionButton>

                              {schedule.status === "SCHEDULED" && (
                                <ActionButton
                                  label="Edit schedule"
                                  onClick={() => openEditModal(schedule)}
                                >
                                  <FiEdit2 />
                                </ActionButton>
                              )}

                              <ActionButton
                                label="Delete schedule"
                                onClick={() => handleDeleteSchedule(schedule)}
                                danger
                              >
                                <FiTrash2 />
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Schedules displayed: {filteredSchedules.length}</span>
              <span>SRMSS · Schedule Management</span>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-3 text-blue-700 shadow-sm">
                <FiUser size={20} />
              </div>
              <div>
                <h3 className="font-bold text-blue-950">
                  What happens after a schedule is created?
                </h3>
                <p className="mt-2 text-sm leading-6 text-blue-900">
                  The Depot Supervisor uses the Assignments module to assign an
                  available bus, a qualified driver, and Operational Staff to
                  the schedule. Operational Staff are not drivers; drivers are
                  managed separately in the Drivers module.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-xl font-bold">
                  {editingSchedule ? "Edit Schedule" : "Create Schedule"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the service schedule details below.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <FiX size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Schedule Code" required>
                  <input
                    required
                    maxLength={50}
                    value={form.schedule_code}
                    onChange={(event) =>
                      setForm({ ...form, schedule_code: event.target.value })
                    }
                    placeholder="SCH-2026-001"
                    className="form-control"
                  />
                </FormField>

                <FormField label="Service Date" required>
                  <input
                    required
                    type="date"
                    value={form.schedule_date}
                    onChange={(event) =>
                      setForm({ ...form, schedule_date: event.target.value })
                    }
                    className="form-control"
                  />
                </FormField>

                <FormField label="Route" required>
                  <select
                    required
                    value={form.route_id}
                    onChange={(event) =>
                      setForm({ ...form, route_id: event.target.value })
                    }
                    className="form-control"
                  >
                    <option value="">Select route</option>
                    {routes
                      .filter(
                        (route) =>
                          !route.status ||
                          ["ACTIVE", "AVAILABLE"].includes(
                            route.status.toUpperCase(),
                          ),
                      )
                      .map((route) => (
                        <option key={route.id} value={route.id}>
                          {route.route_code
                            ? `${route.route_code} - ${getRouteName(route)}`
                            : getRouteName(route)}
                        </option>
                      ))}
                  </select>
                  {routes.length === 0 && (
                    <p className="mt-1 text-xs text-red-600">
                      No routes found. Create a route first.
                    </p>
                  )}
                </FormField>

                <FormField label="Depot" required>
                  <select
                    required
                    value={form.depot_id}
                    onChange={(event) =>
                      setForm({ ...form, depot_id: event.target.value })
                    }
                    className="form-control"
                  >
                    <option value="">Select depot</option>
                    {depots
                      .filter(
                        (depot) =>
                          !depot.status ||
                          ["ACTIVE", "AVAILABLE"].includes(
                            depot.status.toUpperCase(),
                          ),
                      )
                      .map((depot) => (
                        <option key={depot.id} value={depot.id}>
                          {depot.depot_code
                            ? `${depot.depot_code} - ${depot.name}`
                            : depot.name}
                        </option>
                      ))}
                  </select>
                  {depots.length === 0 && (
                    <p className="mt-1 text-xs text-red-600">
                      No depots found. Create a depot first.
                    </p>
                  )}
                </FormField>

                <FormField label="Departure Time" required>
                  <input
                    required
                    type="time"
                    value={form.departure_time}
                    onChange={(event) =>
                      setForm({ ...form, departure_time: event.target.value })
                    }
                    className="form-control"
                  />
                </FormField>

                <FormField label="Arrival Time" required>
                  <input
                    required
                    type="time"
                    value={form.arrival_time}
                    onChange={(event) =>
                      setForm({ ...form, arrival_time: event.target.value })
                    }
                    className="form-control"
                  />
                </FormField>

                {/* <FormField label="Status" required>
                  <select
                    required
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as ScheduleStatus,
                      })
                    }
                    className="form-control"
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DELAYED">Delayed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </FormField> */}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                The Depot Supervisor assigns the bus, driver and Operational
                Staff after the schedule is created. Creating a schedule does
                not automatically assign these resources.
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={
                    saving || routes.length === 0 || depots.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <FiRefreshCw className="animate-spin" />
                  ) : (
                    <FiPlus />
                  )}
                  {saving
                    ? "Saving..."
                    : editingSchedule
                      ? "Save Changes"
                      : "Create Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewOpen && viewingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                  Schedule details
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {viewingSchedule.schedule_code}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close details"
              >
                <FiX size={21} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Current status</span>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClass(
                    viewingSchedule.status,
                  )}`}
                >
                  {viewingSchedule.status}
                </span>
              </div>

              <DetailRow
                icon={<FiMapPin />}
                label="Route"
                value={getScheduleRoute(viewingSchedule)}
              />
              <DetailRow
                icon={<FiMapPin />}
                label="Depot"
                value={getScheduleDepot(viewingSchedule)}
              />
              <DetailRow
                icon={<FiCalendar />}
                label="Service date"
                value={formatDate(viewingSchedule.schedule_date)}
              />
              <DetailRow
                icon={<FiClock />}
                label="Departure"
                value={formatTime(viewingSchedule.departure_time)}
              />
              <DetailRow
                icon={<FiClock />}
                label="Arrival"
                value={formatTime(viewingSchedule.arrival_time)}
              />

              <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Bus, driver and Operational Staff assignments are managed by the
                Depot Supervisor in the Assignments module.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setViewOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewOpen(false);
                    openEditModal(viewingSchedule);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <FiEdit2 />
                  Edit Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .form-control {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          background: white;
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
        }

        .form-control:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 2px #fee2e2;
        }
      `}</style>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
  iconClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>
        <div className={`rounded-xl p-3 text-xl ${iconClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg border p-2 transition ${
        danger
          ? "border-red-100 text-red-600 hover:bg-red-50"
          : "border-slate-200 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-slate-100 p-2 text-slate-600">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}
