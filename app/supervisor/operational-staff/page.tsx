"use client";

import { useEffect, useMemo, useState } from "react";
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

const USER_API = "http://localhost:5000/api/users";
const ASSIGNMENT_API = "http://localhost:5000/api/assignments";

type StaffStatus =
  | "ACTIVE"
  | "AVAILABLE"
  | "ON_DUTY"
  | "OFF_DUTY"
  | "INACTIVE"
  | "SUSPENDED";

type Staff = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  status: StaffStatus | string;
  depot_id?: number;
  depot_name?: string;
  created_at?: string;
  updated_at?: string;
};

type Assignment = {
  id: number;
  schedule_id: number;
  bus_id: number;
  staff_id: number;
  assigned_by?: number;

  status?: string;

  schedule_code?: string;

  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;

  registration_no?: string;
  bus?: string;

  staff_name?: string;

  departure_time?: string;
  arrival_time?: string;
};

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",

  AVAILABLE: "bg-blue-50 text-blue-700 ring-blue-200",

  ON_DUTY: "bg-amber-50 text-amber-700 ring-amber-200",

  OFF_DUTY: "bg-slate-100 text-slate-600 ring-slate-200",

  INACTIVE: "bg-slate-100 text-slate-600 ring-slate-200",

  SUSPENDED: "bg-red-50 text-red-700 ring-red-200",
};

const formatStatus = (status: string) => {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getRoute = (assignment: Assignment) => {
  if (assignment.route_name) {
    return assignment.route_name;
  }

  if (assignment.start_point && assignment.end_point) {
    return `${assignment.start_point} - ${assignment.end_point}`;
  }

  return assignment.route_code || "-";
};

const getBus = (assignment: Assignment) => {
  return assignment.registration_no || assignment.bus || "-";
};

const formatTime = (value?: string) => {
  if (!value) return "-";

  const parts = value.split(":");

  if (parts.length < 2) return value;

  let hour = Number(parts[0]);
  const minute = parts[1];

  if (Number.isNaN(hour)) return value;

  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
};

export default function SupervisorOperationalStaffPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [staff, setStaff] = useState<Staff[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<"ALL" | StaffStatus>("ALL");

  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const loadData = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [staffResponse, assignmentResponse] = await Promise.all([
        axios.get(USER_API, {
          params: {
            role: "OPERATIONAL_STAFF",
          },
        }),
        axios.get(ASSIGNMENT_API),
      ]);

      const staffData = staffResponse.data?.data;
      const assignmentData = assignmentResponse.data?.data;

      const staffRows = Array.isArray(staffData)
        ? staffData
        : Array.isArray(staffResponse.data)
          ? staffResponse.data
          : [];

      const assignmentRows = Array.isArray(assignmentData)
        ? assignmentData
        : Array.isArray(assignmentResponse.data)
          ? assignmentResponse.data
          : [];

      /*
       * Safety filter in case the backend does not
       * apply the role query parameter.
       */
      setStaff(
        staffRows.filter((user: Staff) => user.role === "OPERATIONAL_STAFF"),
      );

      setAssignments(assignmentRows);
    } catch (err) {
      console.error("Failed to load operational staff:", err);

      setError("Unable to load operational staff. Please check the API.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /*
   * Get active assignment for a staff member.
   */
  const getStaffAssignment = (staffId: number) => {
    return assignments.find(
      (assignment) =>
        assignment.staff_id === staffId &&
        assignment.status !== "CANCELLED" &&
        assignment.status !== "COMPLETED",
    );
  };

  const filteredStaff = useMemo(() => {
    const value = search.toLowerCase().trim();

    return staff.filter((member) => {
      const matchesSearch =
        !value ||
        member.name.toLowerCase().includes(value) ||
        (member.email || "").toLowerCase().includes(value) ||
        (member.phone || "").toLowerCase().includes(value) ||
        (member.depot_name || "").toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "ALL" || member.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [staff, search, statusFilter]);

  const totalStaff = staff.length;

  const availableStaff = staff.filter(
    (member) => member.status === "AVAILABLE" || member.status === "ACTIVE",
  ).length;

  const onDutyStaff = staff.filter(
    (member) => member.status === "ON_DUTY",
  ).length;

  const inactiveStaff = staff.filter(
    (member) =>
      member.status === "OFF_DUTY" ||
      member.status === "INACTIVE" ||
      member.status === "SUSPENDED",
  ).length;

  const getAssignedCount = (staffId: number) => {
    return assignments.filter(
      (assignment) =>
        assignment.staff_id === staffId &&
        assignment.status !== "CANCELLED" &&
        assignment.status !== "COMPLETED",
    ).length;
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
          {/* Page Header */}
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
                  Operational Staff
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Monitor operational staff and their current assignments.
                </p>
              </div>
            </div>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {/* Statistics */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Staff",
                value: totalStaff,
                icon: FiUser,
                style: "bg-red-50 text-red-600",
              },
              {
                label: "Available",
                value: availableStaff,
                icon: FiCheckCircle,
                style: "bg-emerald-50 text-emerald-600",
              },
              {
                label: "On Duty",
                value: onDutyStaff,
                icon: FiActivity,
                style: "bg-amber-50 text-amber-600",
              },
              {
                label: "Inactive",
                value: inactiveStaff,
                icon: FiAlertCircle,
                style: "bg-slate-100 text-slate-600",
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
                      <p className="text-sm text-slate-500">{stat.label}</p>

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
                  placeholder="Search name, email, phone or depot..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "ALL" | StaffStatus)
                }
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              >
                <option value="ALL">All Status</option>

                <option value="ACTIVE">Active</option>

                <option value="AVAILABLE">Available</option>

                <option value="ON_DUTY">On Duty</option>

                <option value="OFF_DUTY">Off Duty</option>

                <option value="INACTIVE">Inactive</option>

                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          </div>

          {/* Staff List */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">Operational Staff</h2>

              <p className="mt-1 text-sm text-slate-500">
                Staff available for operational assignments.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px]">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">Staff</th>

                    <th className="px-5 py-4">Contact</th>

                    <th className="px-5 py-4">Depot</th>

                    <th className="px-5 py-4">Current Assignment</th>

                    <th className="px-5 py-4">Status</th>

                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
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
                      const assignment = getStaffAssignment(member.id);

                      const assignedCount = getAssignedCount(member.id);

                      return (
                        <tr
                          key={member.id}
                          className="transition hover:bg-slate-50"
                        >
                          {/* Staff */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 font-bold text-red-600">
                                {member.name.charAt(0).toUpperCase()}
                              </div>

                              <div>
                                <p className="font-semibold text-slate-900">
                                  {member.name}
                                </p>

                                <p className="text-xs text-slate-500">
                                  Staff ID: {member.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              {member.email && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <FiMail
                                    size={14}
                                    className="text-slate-400"
                                  />

                                  {member.email}
                                </div>
                              )}

                              {member.phone && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <FiPhone
                                    size={14}
                                    className="text-slate-400"
                                  />

                                  {member.phone}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Depot */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <FiMapPin className="text-slate-400" />

                              {member.depot_name || "Assigned Depot"}
                            </div>
                          </td>

                          {/* Assignment */}
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

                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                  <FiTruck size={13} />

                                  {getBus(assignment)}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-slate-500">
                                  No active assignment
                                </p>

                                {assignedCount > 0 && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    {assignedCount} active assignment
                                    {assignedCount !== 1 ? "s" : ""}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                                statusStyles[member.status] ||
                                "bg-slate-100 text-slate-600 ring-slate-200"
                              }`}
                            >
                              {member.status === "ON_DUTY" ? (
                                <FiActivity size={13} />
                              ) : member.status === "AVAILABLE" ||
                                member.status === "ACTIVE" ? (
                                <FiCheckCircle size={13} />
                              ) : (
                                <FiClock size={13} />
                              )}

                              {formatStatus(member.status)}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="px-5 py-4">
                            <button
                              onClick={() => setSelectedStaff(member)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
                  Try changing your search or status filter.
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
                  operational staff
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Staff Details Modal */}
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
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* Profile */}
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600">
                  {selectedStaff.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <p className="font-bold text-slate-900">
                    {selectedStaff.name}
                  </p>

                  <p className="text-sm text-slate-500">Operational Staff</p>

                  <p className="mt-1 text-xs text-slate-400">
                    Staff ID: {selectedStaff.id}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="text-xs text-slate-500">Current Status</p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {formatStatus(selectedStaff.status)}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                    statusStyles[selectedStaff.status] ||
                    "bg-slate-100 text-slate-600 ring-slate-200"
                  }`}
                >
                  {formatStatus(selectedStaff.status)}
                </span>
              </div>

              {/* Contact */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FiMail size={16} />

                    <span className="text-xs">Email</span>
                  </div>

                  <p className="mt-2 break-all text-sm font-medium text-slate-700">
                    {selectedStaff.email || "Not available"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FiPhone size={16} />

                    <span className="text-xs">Phone</span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {selectedStaff.phone || "Not available"}
                  </p>
                </div>
              </div>

              {/* Depot */}
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <FiMapPin size={16} />

                  <span className="text-xs">Depot</span>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {selectedStaff.depot_name || "Assigned Depot"}
                </p>
              </div>

              {/* Current assignment */}
              {(() => {
                const assignment = getStaffAssignment(selectedStaff.id);

                if (!assignment) {
                  return (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                      <FiTruck className="mx-auto text-slate-300" size={25} />

                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        No active assignment
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        This staff member is currently not assigned to a trip.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                      Current Assignment
                    </p>

                    <p className="mt-2 font-bold text-slate-900">
                      {assignment.schedule_code ||
                        `Schedule #${assignment.schedule_id}`}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {getRoute(assignment)}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs text-slate-400">Bus</p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {getBus(assignment)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs text-slate-400">Departure</p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatTime(assignment.departure_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
