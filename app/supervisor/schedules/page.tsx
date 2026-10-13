"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiActivity,
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiLoader,
  FiMap,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiUser,
  FiX,
} from "react-icons/fi";
import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";

const SCHEDULE_API = "http://localhost:5000/api/schedules";

type ScheduleStatus =
  | "SCHEDULED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELAYED"
  | "CANCELLED";

type Schedule = {
  id: number;
  schedule_code: string;

  route_id?: number;
  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;

  depot_id?: number;
  depot_name?: string;

  schedule_date: string;
  departure_time: string;
  arrival_time: string;

  status: ScheduleStatus;
};

export default function SupervisorSchedulePage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchValue, setSearchValue] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [statusFilter, setStatusFilter] = useState<"ALL" | ScheduleStatus>(
    "ALL",
  );

  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null,
  );

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError("");

      // Get logged-in supervisor
      const storedUser = localStorage.getItem("srmss_user");

      if (!storedUser) {
        setError("Please log in to view schedules.");
        setSchedules([]);
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      const supervisorDepotId = Number(parsedUser.depot_id);

      if (!Number.isInteger(supervisorDepotId) || supervisorDepotId <= 0) {
        setError("Your account is not assigned to a valid depot.");
        setSchedules([]);
        return;
      }

      const response = await axios.get(SCHEDULE_API);

      const data: Schedule[] = response.data?.data || response.data || [];

      // Show only schedules belonging to the supervisor's depot
      const ownDepotSchedules = data.filter(
        (schedule) => Number(schedule.depot_id) === supervisorDepotId,
      );

      setSchedules(ownDepotSchedules);
    } catch (err) {
      console.error("Load schedules error:", err);
      setError("Failed to load schedules.");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  /* =========================
     FORMAT DATE
  ========================= */

  const formatDate = (date: string) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  /* =========================
     FORMAT TIME
  ========================= */

  const formatTime = (time: string) => {
    if (!time) return "-";

    const [hourString, minuteString] = time.split(":");

    const hour = Number(hourString);

    if (Number.isNaN(hour)) {
      return time;
    }

    const period = hour >= 12 ? "PM" : "AM";

    const displayHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${displayHour}:${minuteString || "00"} ${period}`;
  };

  /* =========================
     FILTER
  ========================= */

  const filteredSchedules = useMemo(() => {
    const search = searchValue.toLowerCase().trim();

    return schedules.filter((schedule) => {
      const matchesSearch =
        !search ||
        schedule.schedule_code?.toLowerCase().includes(search) ||
        schedule.route_code?.toLowerCase().includes(search) ||
        schedule.route_name?.toLowerCase().includes(search) ||
        schedule.start_point?.toLowerCase().includes(search) ||
        schedule.end_point?.toLowerCase().includes(search) ||
        schedule.depot_name?.toLowerCase().includes(search);

      const matchesDate = !dateFilter || schedule.schedule_date === dateFilter;

      const matchesStatus =
        statusFilter === "ALL" || schedule.status === statusFilter;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [schedules, searchValue, dateFilter, statusFilter]);

  /* =========================
     STATISTICS
  ========================= */

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

  /* =========================
     STATUS STYLE
  ========================= */

  const getStatusClass = (status: ScheduleStatus) => {
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
    <div className="min-h-screen bg-gray-50">
      <SupervisorSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="lg:ml-72">
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
            onClick={() => void loadSchedules()}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <main className="p-4 sm:p-6">
         <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                       <div>
         
                         <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                           Schedule Management
                         </h1>
         
                         <p className="mt-1 max-w-2xl text-sm text-slate-500">
                            View and monitor depot service schedules
                         </p>
                       </div>
         
                     </div>

          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <FiAlertCircle size={20} />

              <span className="flex-1">{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-500 hover:text-red-700"
              >
                <FiX />
              </button>
            </div>
          )}

          {/* STATISTICS */}

          <div className="mt-6 mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
            <StatCard title="Total" value={stats.total} icon={<FiCalendar />} />

            <StatCard
              title="Scheduled"
              value={stats.scheduled}
              icon={<FiCalendar />}
            />

            <StatCard
              title="Assigned"
              value={stats.assigned}
              icon={<FiTruck />}
            />

            <StatCard
              title="In Progress"
              value={stats.in_progress}
              icon={<FiActivity />}
            />

            <StatCard
              title="Completed"
              value={stats.completed}
              icon={<FiCheckCircle />}
            />

            <StatCard
              title="Delayed"
              value={stats.delayed}
              icon={<FiClock />}
            />
          </div>

          {/* FILTERS */}

          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search schedule, route, bus..."
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "ALL" | ScheduleStatus)
                }
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="ALL">All Statuses</option>

                <option value="SCHEDULED">Scheduled</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="DELAYED">Delayed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Service Schedules
                </h2>

                <p className="text-xs text-gray-500">
                  {filteredSchedules.length} schedule
                  {filteredSchedules.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                  <FiLoader className="animate-spin" />
                  Loading schedules...
                </div>
              </div>
            ) : filteredSchedules.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center">
                <div className="mb-3 rounded-full bg-gray-100 p-4">
                  <FiCalendar size={28} className="text-gray-400" />
                </div>

                <h3 className="font-semibold text-gray-800">
                  No schedules found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Try changing your filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <TableHead>Schedule</TableHead>

                      <TableHead>Route</TableHead>

                      <TableHead>Date</TableHead>

                      <TableHead>Time</TableHead>

                      <TableHead>Depot</TableHead>

                      <TableHead>Status</TableHead>

                      <TableHead>Action</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredSchedules.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-gray-50">
                        {/* SCHEDULE */}

                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">
                            {schedule.schedule_code}
                          </div>

                          <div className="text-xs text-gray-500">
                            ID #{schedule.id}
                          </div>
                        </td>

                        {/* ROUTE */}

                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            <FiMap size={16} className="mt-0.5 text-red-600" />

                            <div>
                              <div className="font-semibold text-gray-900">
                                {schedule.route_code || "-"}
                              </div>

                              <div className="mt-1 text-xs text-gray-500">
                                {schedule.start_point || "-"} →{" "}
                                {schedule.end_point || "-"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* DATE */}

                        <td className="px-5 py-4 text-sm text-gray-700">
                          {formatDate(schedule.schedule_date)}
                        </td>

                        {/* TIME */}

                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {formatTime(schedule.departure_time)}
                          </div>

                          <div className="text-xs text-gray-500">
                            to {formatTime(schedule.arrival_time)}
                          </div>
                        </td>

                        {/* DEPOT */}

                        <td className="px-5 py-4">
                          <div className="text-sm text-gray-800">
                            {schedule.depot_name || "-"}
                          </div>
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              schedule.status,
                            )}`}
                          >
                            {schedule.status}
                          </span>
                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            title="View Schedule"
                            onClick={() => setSelectedSchedule(schedule)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                          >
                            <FiEye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* =========================
          VIEW SCHEDULE MODAL
      ========================= */}

      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Schedule Details
                </h2>

                <p className="text-xs text-gray-500">
                  {selectedSchedule.schedule_code}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* DETAILS */}

            <div className="space-y-5 p-5">
              {/* STATUS */}

              <div className="flex items-center justify-between rounded-xl border bg-gray-50 p-4">
                <div>
                  <p className="text-xs text-gray-500">Current Status</p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedSchedule.status}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                    selectedSchedule.status,
                  )}`}
                >
                  {selectedSchedule.status}
                </span>
              </div>

              {/* ROUTE */}

              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FiMap className="text-red-600" />

                  <h3 className="font-semibold text-gray-900">Route</h3>
                </div>

                <p className="font-semibold text-gray-900">
                  {selectedSchedule.route_code || "-"} -{" "}
                  {selectedSchedule.route_name || "-"}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {selectedSchedule.start_point || "-"} →{" "}
                  {selectedSchedule.end_point || "-"}
                </p>
              </div>

              {/* DATE / TIME */}

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailCard
                  icon={<FiCalendar />}
                  label="Service Date"
                  value={formatDate(selectedSchedule.schedule_date)}
                />

                <DetailCard
                  icon={<FiClock />}
                  label="Service Time"
                  value={`${formatTime(
                    selectedSchedule.departure_time,
                  )} - ${formatTime(selectedSchedule.arrival_time)}`}
                />
              </div>

              <DetailCard
                icon={<FiMap />}
                label="Depot"
                value={selectedSchedule.depot_name || "Not assigned"}
              />

              {/* NOTE */}

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <FiAlertCircle
                    className="mt-0.5 shrink-0 text-blue-600"
                    size={18}
                  />

                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Supervisor Operations
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      Bus and Operational Staff assignment should be handled
                      through the Assignments module. Trip execution and trip
                      status updates are handled during the actual operation.
                    </p>
                  </div>
                </div>
              </div>

              {/* CLOSE */}

              <div className="flex justify-end border-t pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedSchedule(null)}
                  className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   STAT CARD
========================= */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>

          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>

        <div className="rounded-lg bg-red-50 p-3 text-red-600">{icon}</div>
      </div>
    </div>
  );
}

/* =========================
   TABLE HEAD
========================= */

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}

/* =========================
   DETAIL CARD
========================= */

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-gray-500">
        {icon}

        <span className="text-xs font-medium">{label}</span>
      </div>

      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
