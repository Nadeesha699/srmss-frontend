
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertCircle,
  FiCalendar,
  FiDollarSign,
  FiDroplet,
  FiLoader,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiX,
} from "react-icons/fi";
import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";

const API = "http://localhost:5000/api";

type FuelRecord = {
  id: number;
  trip_id?: number | null;
  bus_id: number;
  depot_id?: number | string | null;
  bus_depot_id?: number | string | null;
  staff_id?: number | null;
  recorded_by?: number | null;
  registration_no?: string;
  trip_no?: string;
  fuel_type?: string;
  quantity_liters?: number | string;
  liters?: number | string;
  unit_price?: number | string;
  total_cost?: number | string;
  cost?: number | string;
  odometer_reading?: number | string;
  mileage?: number | string;
  fuel_date?: string;
  date?: string;
  notes?: string;
  recorded_by_name?: string;
  created_at?: string;
};

function extractArray<T>(response: any): T[] {
  const body = response?.data?.data ?? response?.data;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.rows)) return body.rows;

  return [];
}

function recordDate(record: FuelRecord) {
  return record.fuel_date || record.date || record.created_at || "";
}

function recordLiters(record: FuelRecord) {
  return Number(record.quantity_liters ?? record.liters ?? 0);
}

function recordCost(record: FuelRecord) {
  return Number(record.total_cost ?? record.cost ?? 0);
}

function recordMileage(record: FuelRecord) {
  return record.odometer_reading ?? record.mileage ?? "-";
}

function money(value: number) {
  return `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function displayDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toLocaleDateString("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SupervisorFuelRecordsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [depotId, setDepotId] = useState<number | null>(null);
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("srmss_user");

      if (!storedUser) {
        setError("Please log in to view fuel records.");
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

        const response = await axios.get(`${API}/fuel`);

       

        const allRecords = extractArray<FuelRecord>(response);

        

        // Records must include the depot ID of the bus.
        const depotRecords = allRecords.filter((record) => {
          const recordDepotId =
            record.depot_id 

          return (
            recordDepotId !== null &&
            recordDepotId !== undefined &&
            Number(recordDepotId) === depotId
          );
        });

        setRecords(
          depotRecords.sort(
            (a, b) =>
              new Date(recordDate(b) || 0).getTime() -
              new Date(recordDate(a) || 0).getTime()
          )
        );
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Failed to load fuel records. Please check the backend API."
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

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return records;

    return records.filter((record) =>
      [
        record.trip_no,
        record.registration_no,
        record.fuel_type,
        record.notes,
        record.recorded_by_name,
        String(record.bus_id),
        String(record.trip_id ?? ""),
        String(record.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [records, search]);

  const totalLiters = records.reduce(
    (sum, record) => sum + recordLiters(record),
    0
  );

  const totalCost = records.reduce(
    (sum, record) => sum + recordCost(record),
    0
  );

  const statCards = [
    {
      title: "Total Fuel Records",
      value: String(records.length),
      icon: FiDroplet,
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Total Fuel Used",
      value: `${totalLiters.toLocaleString("en-LK", {
        maximumFractionDigits: 2,
      })} L`,
      icon: FiDroplet,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Total Fuel Cost",
      value: money(totalCost),
      icon: FiDollarSign,
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SupervisorSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="min-w-0 lg:ml-72">
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
              Supervisor Portal
            </p>
            <p className="font-semibold text-slate-800">
              SRMSS Management Portal
            </p>
          </div>
        </header>
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-200 p-2 lg:hidden"
                aria-label="Open navigation"
              >
                <FiMenu size={20} />
              </button>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  Depot Management
                </p>
                <h1 className="text-xl font-bold">
                  Fuel Records
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  View fuel consumption and costs for your depot.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={refreshing || depotId === null}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <FiRefreshCw
                className={refreshing ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <FiAlertCircle className="mt-0.5 shrink-0" />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="ml-auto"
                aria-label="Dismiss error"
              >
                <FiX />
              </button>
            </div>
          )}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statCards.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-500">
                        {stat.title}
                      </p>
                      <p className="mt-2 break-words text-2xl font-bold">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
                    >
                      <Icon size={21} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-bold">Depot Fuel History</h2>
              <p className="mt-1 text-sm text-slate-500">
                Fuel records submitted by operational staff.
              </p>
            </div>

            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search bus, trip, fuel type or staff..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-red-500 focus:bg-white"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 p-14 text-sm text-slate-500">
                <FiLoader className="animate-spin" size={20} />
                Loading fuel records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center">
                <FiDroplet className="mx-auto text-3xl text-slate-300" />
                <p className="mt-3 font-semibold">
                  No fuel records found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  There are no matching fuel records for this depot.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1050px] w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Fuel Date",
                        "Trip",
                        "Vehicle",
                        "Recorded By",
                        "Fuel Type",
                        "Quantity",
                        "Unit Price",
                        "Total Cost",
                        "Odometer",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-5 py-4 text-left font-semibold text-slate-600"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          <span className="flex items-center gap-2">
                            <FiCalendar className="text-slate-400" />
                            {displayDate(recordDate(record))}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {record.trip_no ||
                              (record.trip_id
                                ? `Trip #${record.trip_id}`
                                : "Not linked")}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="flex items-center gap-2 font-medium text-slate-800">
                            <FiTruck className="text-slate-400" />
                            {record.registration_no ||
                              `Bus #${record.bus_id}`}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {record.recorded_by_name ||
                            (record.recorded_by
                              ? `Staff #${record.recorded_by}`
                              : record.staff_id
                                ? `Staff #${record.staff_id}`
                                : "-")}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {record.fuel_type || "DIESEL"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-medium">
                          {recordLiters(record).toLocaleString("en-LK", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          L
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {money(Number(record.unit_price || 0))}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                          {money(recordCost(record))}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {Number(recordMileage(record)).toLocaleString(
                            "en-LK"
                          )}{" "}
                          km
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filteredRecords.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-sm text-slate-500">
                Showing {filteredRecords.length} of {records.length} fuel
                records for this depot.
              </div>
            )}
          </section>

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            <strong>View-only access:</strong> Supervisors can review fuel
            records and costs here. Adding or editing fuel records remains an
            Operational Staff function.
          </div>
        </div>
      </main>
    </div>
  );
}
