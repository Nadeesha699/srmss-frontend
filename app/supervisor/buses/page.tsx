
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiCheckCircle,
  FiLoader,
  FiMapPin,
  FiMenu,
  FiRefreshCw,
  FiSearch,
  FiTool,
  FiTruck,
  FiUserCheck,
  FiXCircle,
} from "react-icons/fi";
import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";



const API_URL = "http://localhost:5000/api/buses";

type BusStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "MAINTENANCE"
  | "INACTIVE";

type Bus = {
  id: number;
  registration_no: string;
  capacity: number;
  serviceType?: string;
  service_type?: string;
  mileage: number;
  status: BusStatus;
  depot_id: number | null;
  depot_name?: string;
};

type SupervisorUser = {
  id?: number;
  role?: string;
  depot_id?: number | string | null;
  depotId?: number | string | null;
  depot?: {
    id?: number | string;
  };
};

export default function SupervisorBusesPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [depotId, setDepotId] = useState<number | null>(null);
  const [depotName, setDepotName] = useState("");

  const getAuthConfig = () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("srmss_token") ||
          localStorage.getItem("token") ||
          localStorage.getItem("accessToken")
        : null;

    return token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};
  };

  const fetchBuses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const storedUser =
        typeof window !== "undefined"
          ? localStorage.getItem("srmss_user")
          : null;

      if (!storedUser) {
        setError("Please log in again to view depot buses.");
        setBuses([]);
        return;
      }

      let user: SupervisorUser;

      try {
        user = JSON.parse(storedUser);
      } catch {
        setError("Your login information is invalid. Please log in again.");
        setBuses([]);
        return;
      }

      const rawDepotId =
        user.depot_id ?? user.depotId ?? user.depot?.id;

      const parsedDepotId =
        rawDepotId !== null &&
        rawDepotId !== undefined &&
        String(rawDepotId).trim() !== ""
          ? Number(rawDepotId)
          : null;

      if (!parsedDepotId || !Number.isFinite(parsedDepotId)) {
        setDepotId(null);
        setBuses([]);
        setError(
          "No depot is assigned to your Supervisor account. Contact the Administrator."
        );
        return;
      }

      setDepotId(parsedDepotId);

      const response = await axios.get(
        API_URL,
        getAuthConfig()
      );

      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      // Only display buses belonging to this Supervisor's depot.
      const depotBuses = data.filter(
        (bus: Bus) => Number(bus.depot_id) === parsedDepotId
      );

      setBuses(depotBuses);

      setDepotName(
        depotBuses.find((bus: Bus) => bus.depot_name)?.depot_name || ""
      );
    } catch (err: any) {
      console.error("Failed to load buses:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load buses. Please try again."
      );

      setBuses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  const filteredBuses = useMemo(() => {
    const query = search.toLowerCase().trim();

    return buses.filter((bus) => {
      const serviceType = bus.serviceType || bus.service_type || "";

      const matchesSearch =
        String(bus.registration_no || "")
          .toLowerCase()
          .includes(query) ||
        String(bus.depot_name || "")
          .toLowerCase()
          .includes(query) ||
        String(bus.id).includes(query);

      const matchesStatus =
        statusFilter === "ALL" || bus.status === statusFilter;

      const matchesService =
        serviceFilter === "ALL" || serviceType === serviceFilter;

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [buses, search, statusFilter, serviceFilter]);

  const available = buses.filter(
    (bus) => bus.status === "AVAILABLE"
  ).length;

  const assigned = buses.filter(
    (bus) => bus.status === "ASSIGNED"
  ).length;

  const maintenance = buses.filter(
    (bus) => bus.status === "MAINTENANCE"
  ).length;

  const inactive = buses.filter(
    (bus) => bus.status === "INACTIVE"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <SupervisorSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="lg:pl-72">
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
            onClick={fetchBuses}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
               <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                 Depot Bus Overview
              </h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  View buses, availability, capacity, and service types for your depot.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <FiXCircle className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Buses"
                value={buses.length}
                icon={<FiTruck size={22} />}
              />
              <StatCard
                title="Available"
                value={available}
                icon={<FiCheckCircle size={22} />}
              />
              <StatCard
                title="Assigned"
                value={assigned}
                icon={<FiUserCheck size={22} />}
              />
              <StatCard
                title="In Maintenance"
                value={maintenance + inactive}
                icon={<FiTool size={22} />}
              />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="relative flex-1">
                  <FiSearch
                    className="absolute left-3.5 top-3.5 text-slate-400"
                    size={18}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search registration number or bus ID..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-red-500"
                >
                  <option value="ALL">All Service Types</option>
                  <option value="Normal">Normal</option>
                  <option value="Express">Express</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-red-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Registered Depot Buses
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredBuses.length} bus
                    {filteredBuses.length === 1 ? "" : "es"} found
                  </p>
                </div>
                <FiTruck className="text-slate-300" size={23} />
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-16">
                  <FiLoader className="animate-spin text-red-600" size={32} />
                  <p className="mt-4 text-sm text-slate-500">
                    Loading depot buses...
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px]">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Bus",
                          "Depot",
                          "Capacity",
                          "Service Type",
                          "Mileage",
                          "Status",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredBuses.length > 0 ? (
                        filteredBuses.map((bus) => (
                          <tr
                            key={bus.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                  <FiTruck size={19} />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {bus.registration_no}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Bus ID #{bus.id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <FiMapPin className="text-blue-600" />
                                <span className="text-sm text-slate-700">
                                  {bus.depot_name || `Depot #${bus.depot_id}`}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-700">
                              <span className="font-semibold">
                                {bus.capacity}
                              </span>{" "}
                              seats
                            </td>

                            <td className="px-5 py-4">
                              <ServiceBadge
                                serviceType={
                                  bus.serviceType || bus.service_type || "Normal"
                                }
                              />
                            </td>

                            <td className="px-5 py-4 text-sm font-medium text-slate-700">
                              {Number(bus.mileage || 0).toLocaleString()} km
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge status={bus.status} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-12 text-center"
                          >
                            <FiTruck
                              className="mx-auto text-slate-300"
                              size={35}
                            />
                            <p className="mt-3 font-semibold text-slate-700">
                              No buses found
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Try changing your search or filters.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ServiceBadge({ serviceType }: { serviceType: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        serviceType === "Express"
          ? "bg-blue-50 text-blue-700"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {serviceType}
    </span>
  );
}

function StatusBadge({ status }: { status: BusStatus }) {
  const styles: Record<BusStatus, string> = {
    AVAILABLE: "bg-green-50 text-green-700",
    ASSIGNED: "bg-blue-50 text-blue-700",
    MAINTENANCE: "bg-amber-50 text-amber-700",
    INACTIVE: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {String(status || "UNKNOWN").replaceAll("_", " ")}
    </span>
  );
}
