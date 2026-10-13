
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiUser,
  FiXCircle,
} from "react-icons/fi";
import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";



const API_URL = "http://localhost:5000/api";

type DriverStatus =
  | "AVAILABLE"
  | "ON_DUTY"
  | "OFF_DUTY"
  | "SUSPENDED"
  | string;

type Driver = {
  id: number;
  employee_no: string;
  name: string;
  phone?: string | null;
  license_no: string;
  license_expiry: string;
  depot_id: number | null;
  depot_name?: string | null;
  depot_code?: string | null;
  working_hours?: number | null;
  status: DriverStatus;
};

type SupervisorUser = {
  id?: number;
  role?: string;
  depot_id?: number | string | null;
  depotId?: number | string | null;
  depot?: {
    id?: number | string | null;
    name?: string;
  };
  depot_name?: string;
  depotName?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      fallback
    );
  }

  return error instanceof Error ? error.message : fallback;
}

function getDateValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatDate(value?: string | null) {
  const date = getDateValue(value);
  if (!date) return "Not provided";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getExpiryState(value?: string | null) {
  const date = getDateValue(value);
  if (!date) return "UNKNOWN";

  const expiry = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(expiry.getTime())) return "UNKNOWN";
  if (expiry < today) return "EXPIRED";

  const days = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  return days <= 30 ? "EXPIRING" : "VALID";
}

export default function SupervisorDriversPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [depotId, setDepotId] = useState<number | null>(null);
  const [depotName, setDepotName] = useState("My Depot");

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const storedUser = localStorage.getItem("srmss_user");
      const token =
        localStorage.getItem("srmss_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken");

      if (!storedUser) {
        throw new Error("Supervisor session not found. Please log in again.");
      }

      let user: SupervisorUser;

      try {
        user = JSON.parse(storedUser) as SupervisorUser;
      } catch {
        throw new Error("Invalid user session. Please log in again.");
      }

      const currentDepotId = Number(
        user.depot_id ?? user.depotId ?? user.depot?.id,
      );

      if (!Number.isInteger(currentDepotId) || currentDepotId <= 0) {
        throw new Error(
          "Your account has no assigned depot. Please contact the Administrator.",
        );
      }

      setDepotId(currentDepotId);
      setDepotName(
        user.depot_name ||
          user.depotName ||
          user.depot?.name ||
          "My Depot",
      );

      const response = await axios.get(`${API_URL}/drivers`, {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : undefined,
      });

      const data = response.data?.data ?? response.data;

      if (!Array.isArray(data)) {
        throw new Error("Invalid drivers response from the server.");
      }

      // Display only drivers assigned to this Supervisor's depot.
      const depotDrivers = (data as Driver[]).filter(
        (driver) => Number(driver.depot_id) === currentDepotId,
      );

      setDrivers(depotDrivers);
    } catch (err) {
      console.error("Fetch depot drivers error:", err);
      setError(getErrorMessage(err, "Failed to load depot drivers."));
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDrivers();
  }, [fetchDrivers]);

  const filteredDrivers = useMemo(() => {
    const query = search.toLowerCase().trim();

    return drivers.filter((driver) => {
      const matchesSearch =
        !query ||
        driver.employee_no?.toLowerCase().includes(query) ||
        driver.name?.toLowerCase().includes(query) ||
        driver.phone?.toLowerCase().includes(query) ||
        driver.license_no?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        driver.status?.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [drivers, search, statusFilter]);

  const availableCount = drivers.filter(
    (driver) => driver.status?.toUpperCase() === "AVAILABLE",
  ).length;

  const onDutyCount = drivers.filter(
    (driver) => driver.status?.toUpperCase() === "ON_DUTY",
  ).length;

  const suspendedCount = drivers.filter(
    (driver) => driver.status?.toUpperCase() === "SUSPENDED",
  ).length;

  const expiredLicences = drivers.filter(
    (driver) => getExpiryState(driver.license_expiry) === "EXPIRED",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <SupervisorSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="lg:pl-72">
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
           <button
            onClick={fetchDrivers}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                    SRMSS
                  </span>
                  <span className="text-xs text-slate-400">
                    Depot Operations
                  </span>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Depot Driver Overview
                </h1>

                <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <FiMapPin className="shrink-0 text-red-500" />
                  {depotName} · View drivers assigned to your depot
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                <FiAlertCircle
                  className="mt-0.5 shrink-0 text-red-600"
                  size={20}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">
                    Unable to load drivers
                  </p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <button
                    type="button"
                    onClick={() => void fetchDrivers()}
                    className="mt-3 text-sm font-semibold text-red-700 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Drivers"
                value={drivers.length}
                icon={<FiTruck />}
                description="Drivers assigned to this depot"
              />
              <StatCard
                title="Available"
                value={availableCount}
                icon={<FiCheckCircle />}
                description="Currently available"
              />
              <StatCard
                title="On Duty"
                value={onDutyCount}
                icon={<FiClock />}
                description="Currently on duty"
              />
              <StatCard
                title="Suspended"
                value={suspendedCount}
                icon={<FiXCircle />}
                description="Currently suspended"
              />
            </div>

            {expiredLicences > 0 && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <FiAlertCircle className="mt-0.5 text-amber-600" size={20} />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Licence expiry alert
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    {expiredLicences} driver
                    {expiredLicences === 1 ? " has" : "s have"} an expired
                    driving licence. Please notify the Administrator.
                  </p>
                </div>
              </div>
            )}

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="relative flex-1">
                  <FiSearch
                    className="absolute left-3 top-3.5 text-slate-400"
                    size={19}
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search driver, employee number, phone or licence..."
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500"
                  aria-label="Filter drivers by status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_DUTY">On Duty</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </section>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Registered Depot Drivers
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing {filteredDrivers.length} of {drivers.length} drivers
                </p>
              </div>

              {(search || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                  className="text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  Clear filters
                </button>
              )}
            </div>

            {loading ? (
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <FiTruck
                  className="mx-auto mb-4 text-slate-400"
                  size={40}
                />
                <h3 className="font-semibold text-slate-900">
                  No drivers found
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {drivers.length === 0
                    ? "There are no drivers assigned to your depot, or the API did not return matching depot information."
                    : "Try changing your search or status filter."}
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {filteredDrivers.map((driver) => (
                  <DriverCard key={driver.id} driver={driver} />
                ))}
              </div>
            )}

            <p className="mt-6 text-xs text-slate-400">
              Driver records are view-only for Supervisors. Contact the
              Administrator to change driver details or records.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function DriverCard({ driver }: { driver: Driver }) {
  const status = driver.status?.toUpperCase() || "UNKNOWN";
  const expiryState = getExpiryState(driver.license_expiry);

  const statusClass =
    status === "AVAILABLE"
      ? "bg-emerald-50 text-emerald-700"
      : status === "ON_DUTY"
        ? "bg-blue-50 text-blue-700"
        : status === "SUSPENDED"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-600";

  const expiryClass =
    expiryState === "EXPIRED"
      ? "text-red-600"
      : expiryState === "EXPIRING"
        ? "text-amber-600"
        : expiryState === "VALID"
          ? "text-emerald-700"
          : "text-slate-500";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-red-100 hover:shadow-md">
      <div className="flex items-start gap-4 border-b border-slate-100 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <FiUser size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
              {driver.employee_no || `DRV-${driver.id}`}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}
            >
              {status.replaceAll("_", " ")}
            </span>
          </div>
          <h3 className="break-words font-bold text-slate-900">
            {driver.name}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Driver ID: #{driver.id}
          </p>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <InfoItem
          icon={<FiUser />}
          label="Phone"
          value={driver.phone || "Not provided"}
        />
        <InfoItem
          icon={<FiTruck />}
          label="Licence Number"
          value={driver.license_no || "Not provided"}
        />
        <InfoItem
          icon={<FiCalendar />}
          label="Licence Expiry"
          value={formatDate(driver.license_expiry)}
          valueClass={expiryClass}
          hint={
            expiryState === "EXPIRED"
              ? "Expired"
              : expiryState === "EXPIRING"
                ? "Expires within 30 days"
                : undefined
          }
        />
        <InfoItem
          icon={<FiMapPin />}
          label="Assigned Depot"
          value={driver.depot_name || driver.depot_code || "Current depot"}
        />
        <InfoItem
          icon={<FiClock />}
          label="Working Hours"
          value={`${driver.working_hours ?? 0} hours`}
        />
      </div>
    </article>
  );
}

function InfoItem({
  icon,
  label,
  value,
  valueClass = "text-slate-800",
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`mt-1 break-words text-sm font-semibold ${valueClass}`}>
          {value || "-"}
        </p>
        {hint && (
          <p className="mt-1 text-xs font-medium text-amber-600">{hint}</p>
        )}
      </div>
    </div>
  );
}
