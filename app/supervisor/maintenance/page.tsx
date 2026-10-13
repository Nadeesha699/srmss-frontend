
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiTool,
  FiTruck,
  FiXCircle,
} from "react-icons/fi";
import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";

const API = "http://localhost:5000/api";
const MAINTENANCE_API = `${API}/maintenance`;

type MaintenanceRecord = {
  id: number;
  trip_id?: number | null;
  bus_id: number;
  depot_id?: number | string | null;
  bus_depot_id?: number | string | null;
  maintenance_type: string;
  description?: string;
  service_date: string;
  cost?: number | string;
  status?: string;
  recorded_by?: number | null;
  recorded_by_name?: string;
  registration_no?: string;
  created_at?: string;
};

const STATUSES = [
  "REPORTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function extractArray<T>(response: any): T[] {
  const payload = response?.data?.data ?? response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;

  return [];
}

function normalizeStatus(status?: string) {
  return String(status || "REPORTED").trim().toUpperCase();
}

function formatStatus(status?: string) {
  return normalizeStatus(status).replaceAll("_", " ");
}

function statusClass(status?: string) {
  switch (normalizeStatus(status)) {
    case "COMPLETED":
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "CANCELLED":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200";
  }
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

export default function SupervisorMaintenancePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [depotId, setDepotId] = useState<number | null>(null);

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Get the logged-in supervisor's depot.
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("srmss_user");

      if (!storedUser) {
        setError("Please log in to access maintenance management.");
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const id = Number(user.depot_id);

      if (!Number.isInteger(id) || id <= 0) {
        setError("Your supervisor account has no valid depot assigned.");
        setLoading(false);
        return;
      }

      setDepotId(id);
    } catch {
      setError("Unable to read your supervisor account.");
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (depotId === null) return;

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setError("");
        setSuccess("");


        const response = await axios.get(MAINTENANCE_API);

        const allRecords = extractArray<MaintenanceRecord>(response);

        // The backend must return the depot ID for each maintenance record.
        const depotRecords = allRecords.filter((record) => {
          const recordDepotId = record.depot_id 

          return (
            recordDepotId !== null &&
            recordDepotId !== undefined &&
            Number(recordDepotId) === depotId
          );
        });

        setRecords(depotRecords);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load maintenance reports. Please check the backend API."
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
      void loadData();
    }
  }, [depotId, loadData]);

  // Supervisor updates an existing maintenance report.
  const updateStatus = async (
    record: MaintenanceRecord,
    newStatus: string
  ) => {
    const currentStatus = normalizeStatus(record.status);

    if (newStatus === currentStatus) return;

    const allowed = STATUSES.includes(newStatus);

    if (!allowed) {
      setError("Invalid maintenance status.");
      return;
    }

    try {
      setUpdatingId(record.id);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("srmss_token");

      const response = await axios.patch(
        `${MAINTENANCE_API}/${record.id}/status`,
        { status: newStatus },
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        }
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Failed to update maintenance status."
        );
      }

      // Update the page immediately after a successful response.
      setRecords((previous) =>
        previous.map((item) =>
          item.id === record.id
            ? { ...item, status: newStatus }
            : item
        )
      );

      setSuccess(
        `Maintenance report #${record.id} updated to ${formatStatus(newStatus)}.`
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update maintenance status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records
      .filter((record) => {
        const searchableText = [
          record.registration_no,
          record.maintenance_type,
          record.description,
          record.recorded_by_name,
          String(record.bus_id),
          String(record.trip_id ?? ""),
          String(record.id),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query || searchableText.includes(query);

        const matchesStatus =
          statusFilter === "ALL" ||
          normalizeStatus(record.status) === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at || b.service_date).getTime() -
          new Date(a.created_at || a.service_date).getTime()
      );
  }, [records, search, statusFilter]);

  const openIssues = records.filter((record) =>
    ["REPORTED", "PENDING", "IN_PROGRESS"].includes(
      normalizeStatus(record.status)
    )
  ).length;

  const completedIssues = records.filter((record) =>
    ["COMPLETED", "RESOLVED"].includes(
      normalizeStatus(record.status)
    )
  ).length;

  const totalCost = records.reduce(
    (total, record) => total + Number(record.cost || 0),
    0
  );

  const statCards = [
    {
      label: "Total Reports",
      value: records.length,
      icon: FiTool,
      iconStyle: "bg-red-50 text-red-600",
    },
    {
      label: "Open Issues",
      value: openIssues,
      icon: FiAlertCircle,
      iconStyle: "bg-amber-50 text-amber-600",
    },
    {
      label: "Completed",
      value: completedIssues,
      icon: FiCheckCircle,
      iconStyle: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Maintenance Cost",
      value: `LKR ${totalCost.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: FiTruck,
      iconStyle: "bg-blue-50 text-blue-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SupervisorSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="min-h-screen lg:ml-72">
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
            onClick={() => void loadData()}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Maintenance Reports
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Review vehicle maintenance issues reported by your depot staff
              and update their progress.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <p className="flex-1">{error}</p>
              <button
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <FiXCircle />
              </button>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <FiCheckCircle className="mt-0.5 shrink-0" />
              <p className="flex-1">{success}</p>
              <button
                onClick={() => setSuccess("")}
                aria-label="Dismiss success"
              >
                <FiXCircle />
              </button>
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
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-2 break-words text-2xl font-bold">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconStyle}`}
                    >
                      <Icon size={21} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
            <div className="relative flex-1">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bus, issue, staff member or report ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-red-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="font-bold">Depot Maintenance Records</h3>
              <p className="mt-1 text-sm text-slate-500">
                Select a new status in a report to update its progress.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 p-12 text-slate-500">
                <FiRefreshCw className="animate-spin" />
                Loading maintenance reports...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center">
                <FiTool className="mx-auto text-3xl text-slate-300" />
                <p className="mt-3 font-semibold">
                  No maintenance reports found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Try changing your search or status filter.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRecords.map((record) => {
                  const currentStatus = normalizeStatus(record.status);
                  const isUpdating = updatingId === record.id;

                  return (
                    <article
                      key={record.id}
                      className="p-5 transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <FiTool size={21} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-slate-900">
                                {record.maintenance_type}
                              </h4>
                              <span className="text-xs text-slate-400">
                                Report #{record.id}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(currentStatus)}`}
                              >
                                {formatStatus(currentStatus)}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <FiTruck />
                                {record.registration_no ||
                                  `Bus #${record.bus_id}`}
                              </span>

                              {record.trip_id && (
                                <span>
                                  Trip #{record.trip_id}
                                </span>
                              )}

                              <span className="flex items-center gap-1.5">
                                <FiClock />
                                {formatDate(record.service_date)}
                              </span>
                            </div>

                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                              {record.description ||
                                "No description provided."}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                              <p className="text-slate-500">
                                Reported by:{" "}
                                <span className="font-medium text-slate-700">
                                  {record.recorded_by_name ||
                                    (record.recorded_by
                                      ? `Staff #${record.recorded_by}`
                                      : "Unknown")}
                                </span>
                              </p>

                              <p className="text-slate-500">
                                Cost:{" "}
                                <span className="font-semibold text-slate-800">
                                  LKR{" "}
                                  {Number(record.cost || 0).toLocaleString(
                                    "en-LK",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }
                                  )}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="w-full xl:w-56 xl:shrink-0">
                          <label
                            htmlFor={`status-${record.id}`}
                            className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500"
                          >
                            Update Status
                          </label>

                          <select
                            id={`status-${record.id}`}
                            value={STATUSES.includes(currentStatus)
                              ? currentStatus
                              : "REPORTED"}
                            disabled={isUpdating}
                            onChange={(event) =>
                              void updateStatus(record, event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 disabled:cursor-wait disabled:opacity-60"
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {formatStatus(status)}
                              </option>
                            ))}
                          </select>

                          {isUpdating && (
                            <p className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                              <FiRefreshCw className="animate-spin" />
                              Updating status...
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {!loading && filteredRecords.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-sm text-slate-500">
                Showing {filteredRecords.length} of {records.length} depot
                maintenance reports.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
