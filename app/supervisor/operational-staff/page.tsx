
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiMail,
  FiMapPin,
  FiMenu,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiUser,
  FiX,
} from "react-icons/fi";

import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";

const API = "http://localhost:5000/api";

type Staff = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  depot_id?: number | string | null;
  depot_name?: string;
};

type Assignment = {
  id: number;
  schedule_id: number;
  bus_id: number;
  driver_id?: number;
  staff_id?: number | string | null;
  assigned_by?: number;
  status?: string;

  schedule_code?: string;
  schedule_date?: string;
  departure_time?: string;
  arrival_time?: string;

  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;

  registration_no?: string;
  bus_status?: string;
  depot_id?: number | string;

  staff_name?: string;
  staff_email?: string;
  trip_status?: string;
};

function getArray<T>(response: any): T[] {
  const payload = response?.data?.data ?? response?.data;
  return Array.isArray(payload) ? payload : [];
}

function normalizeStatus(status?: string) {
  return String(status || "UNKNOWN").trim().toUpperCase();
}

function formatStatus(status?: string) {
  return normalizeStatus(status)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getRoute(assignment: Assignment) {
  return (
    assignment.route_name ||
    (assignment.start_point && assignment.end_point
      ? `${assignment.start_point} - ${assignment.end_point}`
      : assignment.route_code || "Route not available")
  );
}

function getBus(assignment: Assignment) {
  return assignment.registration_no || `Bus #${assignment.bus_id}`;
}

function formatTime(value?: string) {
  if (!value) return "-";

  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;

  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

function getAssignmentStatus(assignment: Assignment) {
  return normalizeStatus(assignment.trip_status || assignment.status);
}

function isActiveAssignment(assignment: Assignment) {
  return ![
    "CANCELLED",
    "COMPLETED",
    "ABORTED",
    "REJECTED",
  ].includes(getAssignmentStatus(assignment));
}

function getStatusClass(status?: string) {
  switch (normalizeStatus(status)) {
    case "ACTIVE":
    case "AVAILABLE":
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "ON_DUTY":
    case "IN_PROGRESS":
    case "RUNNING":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "SCHEDULED":
    case "ASSIGNED":
    case "DELAYED":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "INACTIVE":
    case "CANCELLED":
    case "ABORTED":
    case "SUSPENDED":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

export default function SupervisorOperationalStaffPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [depotId, setDepotId] = useState<number | null>(null);

  const [staff, setStaff] = useState<Staff[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Read the currently logged-in supervisor's depot.
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("srmss_user");

      if (!rawUser) {
        setError("Please log in again.");
        setLoading(false);
        return;
      }

      const user = JSON.parse(rawUser);
      const id = Number(user.depot_id);

      if (!Number.isInteger(id) || id <= 0) {
        setError("Your supervisor account has no valid depot assigned.");
        setLoading(false);
        return;
      }

      setDepotId(id);
    } catch {
      setError("Unable to read your account. Please log in again.");
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(
    async (refresh = false) => {
      if (depotId === null) return;

      try {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        setError("");

        const token = localStorage.getItem("srmss_token");

        const config = {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        };

        const [staffResponse, assignmentResponse] = await Promise.all([
          axios.get(`${API}/users`, {
            ...config,
            params: {
              role: "OPERATIONAL_STAFF",
              depot_id: depotId,
            },
          }),
          axios.get(`${API}/assignments`, config),
        ]);


        const allStaff = getArray<Staff>(staffResponse);
        const allAssignments = getArray<Assignment>(assignmentResponse);

        // Restrict staff to the logged-in supervisor's depot.
        const depotStaff = allStaff.filter(
          (member) =>
            normalizeStatus(member.role) === "OPERATIONAL_STAFF" &&
            Number(member.depot_id) === depotId
        );

        const staffIds = new Set(
          depotStaff.map((member) => Number(member.id))
        );

        // Keep active assignments, including IN_PROGRESS and DELAYED trips.
        const depotAssignments = allAssignments.filter(
          (assignment) =>
            assignment.staff_id !== null &&
            assignment.staff_id !== undefined &&
            staffIds.has(Number(assignment.staff_id)) &&
            isActiveAssignment(assignment) &&
            (!assignment.depot_id ||
              Number(assignment.depot_id) === depotId)
        );

        console.log(depotAssignments)

        setStaff(depotStaff);
        setAssignments(depotAssignments);

        setSelectedStaff((current) => {
          if (!current) return null;

          return (
            depotStaff.find(
              (member) => Number(member.id) === Number(current.id)
            ) || null
          );
        });
      } catch (err: any) {
        console.error("Failed to load operational staff:", err);

        setError(
          err?.response?.data?.message ||
            "Unable to load operational staff. Check your users and assignments APIs."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [depotId]
  );

  useEffect(() => {
    if (depotId !== null) {
      loadData();
    }
  }, [depotId, loadData]);

  const getStaffAssignments = (staffId: number) =>
    assignments.filter(
      (assignment) =>
        Number(assignment.staff_id) === Number(staffId) &&
        isActiveAssignment(assignment)
    );

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();

    return staff.filter((member) => {
      const matchesSearch =
        !query ||
        String(member.name || "").toLowerCase().includes(query) ||
        String(member.email || "").toLowerCase().includes(query) ||
        String(member.phone || "").toLowerCase().includes(query) ||
        String(member.depot_name || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        normalizeStatus(member.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [staff, search, statusFilter]);

  const activeStaff = staff.filter(
    (member) => normalizeStatus(member.status) === "ACTIVE"
  ).length;

  const inactiveStaff = staff.filter(
    (member) => normalizeStatus(member.status) === "INACTIVE"
  ).length;

  const onDutyAssignments = assignments.filter((assignment) =>
    ["IN_PROGRESS", "RUNNING"].includes(getAssignmentStatus(assignment))
  ).length;

  const statCards = [
    {
      label: "Total Staff",
      value: staff.length,
      icon: FiUser,
      color: "bg-red-50 text-red-600",
    },
    {
      label: "Active Staff",
      value: activeStaff,
      icon: FiCheckCircle,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Inactive Staff",
      value: inactiveStaff,
      icon: FiClock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Active Assignments",
      value: assignments.length,
      icon: FiTruck,
      color: "bg-blue-50 text-blue-600",
    },
  ];

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
            <FiRefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
               <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                   Operational Staff
              </h1>
             <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  View staff and their current assignments in your depot.
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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}
                    >
                      <Icon size={21} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-gray-600 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <FiSearch
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search staff by name, email, phone or depot..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              >
                <option value="ALL">All Staff Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                Depot Operational Staff
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Staff members, status, and active assignments.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">Staff</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Assignment</th>
                    <th className="px-5 py-4">Staff Status</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <FiRefreshCw
                          size={28}
                          className="mx-auto animate-spin text-red-500"
                        />
                        <p className="mt-3 font-semibold text-slate-700">
                          Loading operational staff...
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((member) => {
                      const staffAssignments = getStaffAssignments(member.id);
                      const assignment = staffAssignments[0];

                      return (
                        <tr
                          key={member.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 font-bold text-red-600">
                                {String(member.name || "?")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {member.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Staff ID: {member.id}
                                </p>
                                {member.depot_name && (
                                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                    <FiMapPin size={12} />
                                    {member.depot_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="flex items-center gap-2 text-sm text-slate-600">
                              <FiMail className="shrink-0 text-slate-400" />
                              {member.email || "-"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            {assignment ? (
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {assignment.schedule_code ||
                                    `Schedule #${assignment.schedule_id}`}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {getRoute(assignment)}
                                </p>
                                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                  <FiTruck size={13} />
                                  {getBus(assignment)}
                                </p>
                                <span
                                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusClass(
                                    getAssignmentStatus(assignment)
                                  )}`}
                                >
                                  {formatStatus(getAssignmentStatus(assignment))}
                                </span>
                                {staffAssignments.length > 1 && (
                                  <p className="mt-1 text-xs text-blue-600">
                                    +{staffAssignments.length - 1} more active
                                    assignments
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">
                                No active assignment
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${getStatusClass(
                                member.status
                              )}`}
                            >
                              {formatStatus(member.status)}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <button
                              onClick={() => setSelectedStaff(member)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && filteredStaff.length === 0 && (
              <div className="px-6 py-14 text-center">
                <FiSearch className="mx-auto text-slate-300" size={32} />
                <p className="mt-3 font-semibold text-slate-700">
                  No operational staff found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Check your depot assignment or change the search filters.
                </p>
              </div>
            )}

            {!loading && filteredStaff.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {filteredStaff.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">
                    {staff.length}
                  </span>{" "}
                  staff members in this depot.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  In-progress assignments: {onDutyAssignments}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedStaff && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  Operational Staff
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedStaff.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close details"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600">
                  {String(selectedStaff.name || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    {selectedStaff.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    Operational Staff · ID {selectedStaff.id}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-1">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FiMail size={16} />
                    <span className="text-xs">Email</span>
                  </div>
                  <p className="mt-2 break-all text-sm font-medium text-slate-700">
                    {selectedStaff.email || "Not available"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <FiMapPin size={16} />
                  <span className="text-xs">Depot</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {selectedStaff.depot_name || `Depot #${depotId}`}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Staff Status</p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${getStatusClass(
                    selectedStaff.status
                  )}`}
                >
                  {formatStatus(selectedStaff.status)}
                </span>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-slate-900">
                  Active Assignments
                </h3>

                {getStaffAssignments(selectedStaff.id).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
                    <FiTruck className="mx-auto text-slate-300" size={25} />
                    <p className="mt-2 text-sm text-slate-600">
                      No active assignments
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getStaffAssignments(selectedStaff.id).map(
                      (assignment) => (
                        <div
                          key={assignment.id}
                          className="rounded-xl border border-red-100 bg-red-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-900">
                                {assignment.schedule_code ||
                                  `Schedule #${assignment.schedule_id}`}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {getRoute(assignment)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getStatusClass(
                                getAssignmentStatus(assignment)
                              )}`}
                            >
                              {formatStatus(getAssignmentStatus(assignment))}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-white p-3">
                              <p className="text-xs text-slate-400">Bus</p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {getBus(assignment)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-white p-3">
                              <p className="text-xs text-slate-400">
                                Departure
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {formatTime(assignment.departure_time)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-white p-3">
                              <p className="text-xs text-slate-400">Arrival</p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {formatTime(assignment.arrival_time)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-white p-3">
                              <p className="text-xs text-slate-400">
                                Assignment ID
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                #{assignment.id}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setSelectedStaff(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
