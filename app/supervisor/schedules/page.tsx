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
  | "RUNNING"
  | "COMPLETED"
  | "CANCELLED";

type Schedule = {
  id: number;
  schedule_code: string;

  route_id?: number;
  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;

  bus_id?: number;
  registration_no?: string;

  driver_id?: number;
  driver_name?: string;

  depot_id?: number;
  depot_name?: string;

  service_date: string;
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

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | ScheduleStatus
  >("ALL");

  const [selectedSchedule, setSelectedSchedule] =
    useState<Schedule | null>(null);

  /* =========================
     LOAD SCHEDULES
  ========================= */

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(SCHEDULE_API);

      const data: Schedule[] =
        response.data?.data ||
        response.data ||
        [];

      setSchedules(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load schedules.");
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

    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* =========================
     FORMAT TIME
  ========================= */

  const formatTime = (time: string) => {
    if (!time) return "-";

    const [hourString, minuteString] =
      time.split(":");

    const hour = Number(hourString);

    if (Number.isNaN(hour)) {
      return time;
    }

    const period = hour >= 12 ? "PM" : "AM";

    const displayHour =
      hour % 12 === 0 ? 12 : hour % 12;

    return `${displayHour}:${
      minuteString || "00"
    } ${period}`;
  };

  /* =========================
     FILTER
  ========================= */

  const filteredSchedules = useMemo(() => {
    const search =
      searchValue.toLowerCase().trim();

    return schedules.filter((schedule) => {
      const matchesSearch =
        !search ||
        schedule.schedule_code
          ?.toLowerCase()
          .includes(search) ||
        schedule.route_code
          ?.toLowerCase()
          .includes(search) ||
        schedule.route_name
          ?.toLowerCase()
          .includes(search) ||
        schedule.start_point
          ?.toLowerCase()
          .includes(search) ||
        schedule.end_point
          ?.toLowerCase()
          .includes(search) ||
        schedule.registration_no
          ?.toLowerCase()
          .includes(search) ||
        schedule.depot_name
          ?.toLowerCase()
          .includes(search);

      const matchesDate =
        !dateFilter ||
        schedule.service_date === dateFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        schedule.status === statusFilter;

      return (
        matchesSearch &&
        matchesDate &&
        matchesStatus
      );
    });
  }, [
    schedules,
    searchValue,
    dateFilter,
    statusFilter,
  ]);

  /* =========================
     STATISTICS
  ========================= */

  const stats = useMemo(() => {
    return {
      total: schedules.length,

      scheduled: schedules.filter(
        (item) => item.status === "SCHEDULED"
      ).length,

      running: schedules.filter(
        (item) => item.status === "RUNNING"
      ).length,

      completed: schedules.filter(
        (item) => item.status === "COMPLETED"
      ).length,

      cancelled: schedules.filter(
        (item) => item.status === "CANCELLED"
      ).length,
    };
  }, [schedules]);

  /* =========================
     STATUS STYLE
  ========================= */

  const getStatusClass = (
    status: ScheduleStatus
  ) => {
    switch (status) {
      case "SCHEDULED":
        return "border-blue-200 bg-blue-50 text-blue-700";

      case "RUNNING":
        return "border-orange-200 bg-orange-50 text-orange-700";

      case "COMPLETED":
        return "border-green-200 bg-green-50 text-green-700";

      case "CANCELLED":
        return "border-red-200 bg-red-50 text-red-700";

      default:
        return "border-gray-200 bg-gray-50 text-gray-700";
    }
  };

  /* =========================
     PAGE
  ========================= */

  return (
    <div className="min-h-screen bg-gray-50">
      <SupervisorSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="lg:ml-72">
        {/* HEADER */}

        <header className="sticky top-0 z-30 border-b bg-white">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
              >
                <FiMenu size={22} />
              </button>

              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Schedule Management
                </h1>

                <p className="hidden text-xs text-gray-500 sm:block">
                  View and monitor depot service schedules
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadSchedules}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw
                className={
                  loading ? "animate-spin" : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {/* ERROR */}

          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <FiAlertCircle size={20} />

              <span className="flex-1">
                {error}
              </span>

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

          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard
              title="Total"
              value={stats.total}
              icon={<FiCalendar />}
            />

            <StatCard
              title="Scheduled"
              value={stats.scheduled}
              icon={<FiClock />}
            />

            <StatCard
              title="Running"
              value={stats.running}
              icon={<FiActivity />}
            />

            <StatCard
              title="Completed"
              value={stats.completed}
              icon={<FiCheckCircle />}
            />

            <StatCard
              title="Cancelled"
              value={stats.cancelled}
              icon={<FiAlertCircle />}
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
                  onChange={(e) =>
                    setSearchValue(e.target.value)
                  }
                  placeholder="Search schedule, route, bus..."
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) =>
                    setDateFilter(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "ALL"
                      | ScheduleStatus
                  )
                }
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="ALL">
                  All Statuses
                </option>

                <option value="SCHEDULED">
                  Scheduled
                </option>

                <option value="RUNNING">
                  Running
                </option>

                <option value="COMPLETED">
                  Completed
                </option>

                <option value="CANCELLED">
                  Cancelled
                </option>
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
                  {filteredSchedules.length !== 1
                    ? "s"
                    : ""}{" "}
                  found
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
                  <FiCalendar
                    size={28}
                    className="text-gray-400"
                  />
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
                      <TableHead>
                        Schedule
                      </TableHead>

                      <TableHead>
                        Route
                      </TableHead>

                      <TableHead>
                        Date
                      </TableHead>

                      <TableHead>
                        Time
                      </TableHead>

                      <TableHead>
                        Bus
                      </TableHead>

                      <TableHead>
                        Depot
                      </TableHead>

                      <TableHead>
                        Status
                      </TableHead>

                      <TableHead>
                        Action
                      </TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredSchedules.map(
                      (schedule) => (
                        <tr
                          key={schedule.id}
                          className="hover:bg-gray-50"
                        >
                          {/* SCHEDULE */}

                          <td className="px-5 py-4">
                            <div className="font-semibold text-gray-900">
                              {
                                schedule.schedule_code
                              }
                            </div>

                            <div className="text-xs text-gray-500">
                              ID #{schedule.id}
                            </div>
                          </td>

                          {/* ROUTE */}

                          <td className="px-5 py-4">
                            <div className="flex items-start gap-2">
                              <FiMap
                                size={16}
                                className="mt-0.5 text-red-600"
                              />

                              <div>
                                <div className="font-semibold text-gray-900">
                                  {
                                    schedule.route_code ||
                                    "-"
                                  }
                                </div>

                                <div className="text-xs text-gray-500">
                                  {
                                    schedule.route_name ||
                                    "-"
                                  }
                                </div>

                                <div className="mt-1 text-xs text-gray-500">
                                  {
                                    schedule.start_point ||
                                    "-"
                                  }{" "}
                                  →{" "}
                                  {
                                    schedule.end_point ||
                                    "-"
                                  }
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* DATE */}

                          <td className="px-5 py-4 text-sm text-gray-700">
                            {formatDate(
                              schedule.service_date
                            )}
                          </td>

                          {/* TIME */}

                          <td className="px-5 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {formatTime(
                                schedule.departure_time
                              )}
                            </div>

                            <div className="text-xs text-gray-500">
                              to{" "}
                              {formatTime(
                                schedule.arrival_time
                              )}
                            </div>
                          </td>

                          {/* BUS */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-800">
                              <FiTruck className="text-red-600" />

                              {schedule.registration_no ||
                                "Not assigned"}
                            </div>
                          </td>

                          {/* DEPOT */}

                          <td className="px-5 py-4">
                            <div className="text-sm text-gray-800">
                              {schedule.depot_name ||
                                "-"}
                            </div>
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                schedule.status
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
                              onClick={() =>
                                setSelectedSchedule(
                                  schedule
                                )
                              }
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                            >
                              <FiEye size={18} />
                            </button>
                          </td>
                        </tr>
                      )
                    )}
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
                  {
                    selectedSchedule.schedule_code
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSchedule(null)
                }
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
                  <p className="text-xs text-gray-500">
                    Current Status
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedSchedule.status}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                    selectedSchedule.status
                  )}`}
                >
                  {selectedSchedule.status}
                </span>
              </div>

              {/* ROUTE */}

              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FiMap className="text-red-600" />

                  <h3 className="font-semibold text-gray-900">
                    Route
                  </h3>
                </div>

                <p className="font-semibold text-gray-900">
                  {selectedSchedule.route_code ||
                    "-"}{" "}
                  -{" "}
                  {selectedSchedule.route_name ||
                    "-"}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {selectedSchedule.start_point ||
                    "-"}{" "}
                  →{" "}
                  {selectedSchedule.end_point ||
                    "-"}
                </p>
              </div>

              {/* DATE / TIME */}

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailCard
                  icon={<FiCalendar />}
                  label="Service Date"
                  value={formatDate(
                    selectedSchedule.service_date
                  )}
                />

                <DetailCard
                  icon={<FiClock />}
                  label="Service Time"
                  value={`${formatTime(
                    selectedSchedule.departure_time
                  )} - ${formatTime(
                    selectedSchedule.arrival_time
                  )}`}
                />
              </div>

              {/* BUS / STAFF */}

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailCard
                  icon={<FiTruck />}
                  label="Bus"
                  value={
                    selectedSchedule.registration_no ||
                    "Not assigned"
                  }
                />

                <DetailCard
                  icon={<FiUser />}
                  label="Operational Staff"
                  value={
                    selectedSchedule.driver_name ||
                    "Not assigned"
                  }
                />
              </div>

              {/* DEPOT */}

              <DetailCard
                icon={<FiMap />}
                label="Depot"
                value={
                  selectedSchedule.depot_name ||
                  "Not assigned"
                }
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
                      Bus and Operational Staff
                      assignment should be handled
                      through the Assignments module.
                      Trip execution and trip status
                      updates are handled during the
                      actual operation.
                    </p>
                  </div>
                </div>
              </div>

              {/* CLOSE */}

              <div className="flex justify-end border-t pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSchedule(null)
                  }
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
          <p className="text-xs font-medium text-gray-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {value}
          </p>
        </div>

        <div className="rounded-lg bg-red-50 p-3 text-red-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================
   TABLE HEAD
========================= */

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
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

        <span className="text-xs font-medium">
          {label}
        </span>
      </div>

      <p className="text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}