
"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiEdit2,
  FiMenu,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiTruck,
  FiX,
  FiCheckCircle,
  FiTool,
  FiUserCheck,
  FiLoader,
  FiMapPin,
} from "react-icons/fi";

import { AdminSidebar } from "@/components/SideNavBar/AdminSideNavBar";
import { toast, ToastContainer } from "react-toastify";

const API_URL = "http://localhost:5000/api/buses";
const DEPOT_API_URL = "http://localhost:5000/api/depots";

type BusStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "MAINTENANCE"
  | "INACTIVE";

type ServiceType = "Normal" | "Express";

type Depot = {
  id: number;
  name: string;
};

type Bus = {
  id: number;
  registration_no: string;
  capacity: number;
  serviceType: ServiceType;
  mileage: number;
  status: BusStatus;
  depot_id: number | null;
  depot_name?: string;
  created_at?: string;
  updated_at?: string;
};

type BusForm = {
  registration_no: string;
  capacity: string;
  serviceType: ServiceType;
  mileage: string;
  status: BusStatus;
  depot_id: string;
};

const emptyForm: BusForm = {
  registration_no: "",
  capacity: "",
  serviceType: "Normal",
  mileage: "",
  status: "AVAILABLE",
  depot_id: "",
};

export default function BusesPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [buses, setBuses] = useState<Bus[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);

  const [form, setForm] = useState<BusForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [loadingDepots, setLoadingDepots] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");

  /* ---------------------------------------------------------
     AUTH CONFIG
  --------------------------------------------------------- */

  const getAuthConfig = () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") ||
          localStorage.getItem("accessToken") ||
          localStorage.getItem("srmss_token")
        : null;

    if (!token) {
      return {};
    }

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  /* ---------------------------------------------------------
     GET BUSES
  --------------------------------------------------------- */

  const fetchBuses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        API_URL,
        getAuthConfig(),
      );

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setBuses(data);
    } catch (error: any) {
      console.error("Failed to fetch buses:", error);

      setError(
        error?.response?.data?.message ||
          "Failed to load buses from the server.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     GET DEPOTS
  --------------------------------------------------------- */

  const fetchDepots = async () => {
    try {
      setLoadingDepots(true);

      const response = await axios.get(
        DEPOT_API_URL,
        getAuthConfig(),
      );

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setDepots(data);
    } catch (error: any) {
      console.error("Failed to fetch depots:", error);

      setError(
        error?.response?.data?.message ||
          "Failed to load depots.",
      );
    } finally {
      setLoadingDepots(false);
    }
  };

  /* ---------------------------------------------------------
     LOAD DATA
  --------------------------------------------------------- */

  useEffect(() => {
    fetchBuses();
    fetchDepots();
  }, []);

  /* ---------------------------------------------------------
     FILTER
  --------------------------------------------------------- */

 const searchValue = search.toLowerCase().trim();

const filteredBuses = buses.filter((bus) => {
  const matchesSearch =
    String(bus.registration_no ?? "")
      .toLowerCase()
      .includes(searchValue) ||
    String(bus.depot_name ?? "")
      .toLowerCase()
      .includes(searchValue);

  const matchesStatus =
    statusFilter === "ALL" ||
    bus.status === statusFilter;

  const matchesService =
    serviceFilter === "ALL" ||
    bus.serviceType === serviceFilter;

  return (
    matchesSearch &&
    matchesStatus &&
    matchesService
  );
});

  /* ---------------------------------------------------------
     STATISTICS
  --------------------------------------------------------- */

  const totalBuses = buses.length;

  const availableBuses = buses.filter(
    (bus) => bus.status === "AVAILABLE",
  ).length;

  const assignedBuses = buses.filter(
    (bus) => bus.status === "ASSIGNED",
  ).length;

  const maintenanceBuses = buses.filter(
    (bus) => bus.status === "MAINTENANCE",
  ).length;

  /* ---------------------------------------------------------
     ADD MODAL
  --------------------------------------------------------- */

  const openAddModal = () => {
    setEditingBus(null);

    setForm({
      ...emptyForm,
    });

    setError("");
    setShowForm(true);
  };

  /* ---------------------------------------------------------
     EDIT MODAL
  --------------------------------------------------------- */

  const openEditModal = (bus: Bus) => {
    setEditingBus(bus);

    setForm({
      registration_no: bus.registration_no || "",
      capacity: String(bus.capacity ?? ""),
      serviceType: bus.serviceType || "Normal",
      mileage: String(bus.mileage ?? ""),
      status: bus.status || "AVAILABLE",
      depot_id:
        bus.depot_id !== null &&
        bus.depot_id !== undefined
          ? String(bus.depot_id)
          : "",
    });

    setError("");
    setShowForm(true);
  };

  /* ---------------------------------------------------------
     CLOSE MODAL
  --------------------------------------------------------- */

  const closeModal = () => {
    if (saving) return;

    setShowForm(false);
    setEditingBus(null);
    setForm({
      ...emptyForm,
    });
    setError("");
  };

  /* ---------------------------------------------------------
     CREATE / UPDATE
  --------------------------------------------------------- */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (
      !form.registration_no.trim() ||
      !form.capacity ||
      !form.mileage ||
      !form.depot_id
    ) {
      toast.error(
        "Please fill in all required fields, including depot.",
      );
      return;
    }

    const capacity = Number(form.capacity);
    const mileage = Number(form.mileage);
    const depotId = Number(form.depot_id);

    if (capacity <= 0) {
      toast.error("Capacity must be greater than 0.");
      return;
    }

    if (mileage < 0) {
      toast.error("Mileage cannot be negative.");
      return;
    }

    if (!depotId || depotId <= 0) {
      toast.error("Please select a valid depot.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        registration: form.registration_no
          .trim()
          .toUpperCase(),

        capacity,

        serviceType: form.serviceType,

        mileage,

        status: form.status,

        depot_id: depotId,
      };

      /* -----------------------------------------------------
         UPDATE
      ----------------------------------------------------- */

      if (editingBus) {
        const response = await axios.put(
          `${API_URL}/${editingBus.id}`,
          payload,
          getAuthConfig(),
        );

        const updatedBus =
          response.data?.data || {
            ...editingBus,
            registration_no: payload.registration,
            capacity: payload.capacity,
            serviceType: payload.serviceType,
            mileage: payload.mileage,
            status: payload.status,
            depot_id: payload.depot_id,
            depot_name:
              depots.find(
                (depot) =>
                  depot.id === payload.depot_id,
              )?.name || "",
          };

        setBuses((current) =>
          current.map((bus) =>
            bus.id === editingBus.id
              ? updatedBus
              : bus,
          ),
        );

        toast.success("Bus updated successfully.");
      } else {
        /* ---------------------------------------------------
           CREATE
        --------------------------------------------------- */

        const response = await axios.post(
          API_URL,
          payload,
          getAuthConfig(),
        );

        const newBus = response.data?.data;

        if (newBus) {
          setBuses((current) => [
            newBus,
            ...current,
          ]);
        } else {
          await fetchBuses();
        }

        toast.success("Bus added successfully.");
      }

      closeModal();
    } catch (error: any) {
      console.error("Bus save error:", error);

      const message =
        error?.response?.data?.message ||
        "Failed to save bus.";

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------
     DELETE
  --------------------------------------------------------- */

  const deleteBus = async (id: number) => {
    const bus = buses.find(
      (item) => item.id === id,
    );

    if (!bus) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete bus ${bus.registration_no}?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      await axios.delete(
        `${API_URL}/${id}`,
        getAuthConfig(),
      );

      setBuses((current) =>
        current.filter(
          (item) => item.id !== id,
        ),
      );

  toast.success("Bus deleted successfully.");
    } catch (error: any) {
      console.error(
        "Delete bus error:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to delete bus.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* ---------------------------------------------------------
     TOGGLE AVAILABILITY
  --------------------------------------------------------- */

  const toggleAvailability = async (
    bus: Bus,
  ) => {
    if (
      bus.status !== "AVAILABLE" &&
      bus.status !== "INACTIVE"
    ) {
      toast.error(
        "Only available or inactive buses can be activated/deactivated.",
      );

      return;
    }

    const newStatus: BusStatus =
      bus.status === "AVAILABLE"
        ? "INACTIVE"
        : "AVAILABLE";

    try {
      const payload = {
        registration: bus.registration_no,
        capacity: bus.capacity,
        serviceType: bus.serviceType,
        mileage: bus.mileage,
        status: newStatus,
        depot_id: bus.depot_id,
      };

      const response = await axios.put(
        `${API_URL}/${bus.id}`,
        payload,
        getAuthConfig(),
      );

      const updatedBus =
        response.data?.data || {
          ...bus,
          status: newStatus,
        };

      setBuses((current) =>
        current.map((item) =>
          item.id === bus.id
            ? updatedBus
            : item,
        ),
      );
    } catch (error: any) {
      console.error(
        "Failed to update bus status:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to update bus status.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <button
            onClick={() =>
              setMobileOpen(true)
            }
            className="mr-4 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <FiMenu size={22} />
          </button>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Administrator
            </p>

            <p className="font-semibold text-slate-800">
              SRMSS Management Portal
            </p>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Page Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
               <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Bus Management
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage buses, depots, capacity,
                  service type and availability.
                </p>
              </div>

              <button
                onClick={openAddModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                <FiPlus size={18} />
                Add Bus
              </button>
            </div>

            {/* Statistics */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Buses"
                value={totalBuses}
                icon={
                  <FiTruck size={22} />
                }
              />

              <StatCard
                title="Available"
                value={availableBuses}
                icon={
                  <FiCheckCircle size={22} />
                }
              />

              <StatCard
                title="Assigned"
                value={assignedBuses}
                icon={
                  <FiUserCheck size={22} />
                }
              />

              <StatCard
                title="Maintenance"
                value={maintenanceBuses}
                icon={
                  <FiTool size={22} />
                }
              />
            </div>

            {/* Search / Filters */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="relative flex-1">
                  <FiSearch
                    className="absolute left-3.5 top-3.5 text-slate-400"
                    size={18}
                  />

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value,
                      )
                    }
                    placeholder="Search registration number or depot..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <select
                  value={serviceFilter}
                  onChange={(e) =>
                    setServiceFilter(
                      e.target.value,
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                >
                  <option value="ALL">
                    All Service Types
                  </option>

                  <option value="Normal">
                    Normal
                  </option>

                  <option value="Express">
                    Express
                  </option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value,
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                >
                  <option value="ALL">
                    All Statuses
                  </option>

                  <option value="AVAILABLE">
                    Available
                  </option>

                  <option value="ASSIGNED">
                    Assigned
                  </option>

                  <option value="MAINTENANCE">
                    Maintenance
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>
                </select>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Bus Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Registered Buses
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {filteredBuses.length} bus
                      {filteredBuses.length !==
                      1
                        ? "es"
                        : ""}{" "}
                      found
                    </p>
                  </div>

                  <FiTruck
                    className="text-slate-300"
                    size={22}
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center p-16">
                  <FiLoader
                    className="animate-spin text-red-600"
                    size={32}
                  />

                  <p className="mt-4 text-sm text-slate-500">
                    Loading buses...
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Bus
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Depot
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Capacity
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Service Type
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Mileage
                        </th>

                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Status
                        </th>

                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredBuses.length >
                      0 ? (
                        filteredBuses.map(
                          (bus) => (
                            <tr
                              key={bus.id}
                              className="transition hover:bg-slate-50"
                            >
                              {/* Bus */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                    <FiTruck
                                      size={
                                        19
                                      }
                                    />
                                  </div>

                                  <div>
                                    <p className="font-bold text-slate-900">
                                      {
                                        bus.registration_no
                                      }
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      Bus ID #
                                      {
                                        bus.id
                                      }
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Depot */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                    <FiMapPin
                                      size={
                                        16
                                      }
                                    />
                                  </div>

                                  <div>
                                    <p className="font-semibold text-slate-800">
                                      {bus.depot_name ||
                                        "Not Assigned"}
                                    </p>

                                    {bus.depot_id && (
                                      <p className="text-xs text-slate-400">
                                        Depot ID #
                                        {
                                          bus.depot_id
                                        }
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Capacity */}
                              <td className="px-5 py-4 text-sm text-slate-700">
                                <span className="font-semibold">
                                  {
                                    bus.capacity
                                  }
                                </span>{" "}
                                seats
                              </td>

                              {/* Service */}
                              <td className="px-5 py-4">
                                <ServiceBadge
                                  serviceType={
                                    bus.serviceType
                                  }
                                />
                              </td>

                              {/* Mileage */}
                              <td className="px-5 py-4 text-sm font-medium text-slate-700">
                                {Number(
                                  bus.mileage ??
                                    0,
                                ).toLocaleString()}{" "}
                                km
                              </td>

                              {/* Status */}
                              <td className="px-5 py-4">
                                <StatusBadge
                                  status={
                                    bus.status
                                  }
                                />
                              </td>

                              {/* Actions */}
                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      openEditModal(
                                        bus,
                                      )
                                    }
                                    title="Edit bus"
                                    className="rounded-lg border border-slate-200 p-2.5 text-blue-600 transition hover:bg-blue-50"
                                  >
                                    <FiEdit2
                                      size={
                                        17
                                      }
                                    />
                                  </button>

                                  <button
                                    onClick={() =>
                                      toggleAvailability(
                                        bus,
                                      )
                                    }
                                    disabled={
                                      bus.status !==
                                        "AVAILABLE" &&
                                      bus.status !==
                                        "INACTIVE"
                                    }
                                    title={
                                      bus.status ===
                                      "AVAILABLE"
                                        ? "Deactivate bus"
                                        : "Make available"
                                    }
                                    className="rounded-lg border border-slate-200 p-2.5 text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <FiCheckCircle
                                      size={
                                        17
                                      }
                                    />
                                  </button>

                                  <button
                                    onClick={() =>
                                      deleteBus(
                                        bus.id,
                                      )
                                    }
                                    disabled={
                                      deletingId ===
                                      bus.id
                                    }
                                    title="Delete bus"
                                    className="rounded-lg border border-slate-200 p-2.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                  >
                                    {deletingId ===
                                    bus.id ? (
                                      <FiLoader
                                        className="animate-spin"
                                        size={
                                          17
                                        }
                                      />
                                    ) : (
                                      <FiTrash2
                                        size={
                                          17
                                        }
                                      />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ),
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
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
                              Try changing your
                              search or filter.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* -------------------------------------------------------
          ADD / EDIT MODAL
      ------------------------------------------------------- */}

      {showForm && (
        <div className="fixed text-gray-500 inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 text-gray-900">
          <div className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingBus
                    ? "Edit Bus"
                    : "Add New Bus"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingBus
                    ? "Update bus information and depot assignment."
                    : "Enter the details for the new bus."}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <FiX size={21} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-5 p-6">
                {/* Registration */}
                <FormField label="Registration Number">
                  <input
                    value={
                      form.registration_no
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        registration_no:
                          e.target.value,
                      })
                    }
                    placeholder="e.g. NB-4521"
                    className="form-input"
                    required
                  />
                </FormField>

                {/* Capacity / Mileage */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Capacity">
                    <input
                      type="number"
                      min="1"
                      value={form.capacity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          capacity:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. 52"
                      className="form-input"
                      required
                    />
                  </FormField>

                  <FormField label="Mileage (km)">
                    <input
                      type="number"
                      min="0"
                      value={form.mileage}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          mileage:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. 85420"
                      className="form-input"
                      required
                    />
                  </FormField>
                </div>

                {/* Service Type / Depot */}
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Service Type */}
                  <FormField label="Service Type">
                    <select
                      value={
                        form.serviceType
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          serviceType:
                            e.target
                              .value as ServiceType,
                        })
                      }
                      className="form-input"
                    >
                      <option value="Normal">
                        Normal
                      </option>

                      <option value="Express">
                        Express
                      </option>
                    </select>
                  </FormField>

                  {/* Depot */}
                  <FormField label="Depot">
                    <select
                      value={form.depot_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          depot_id:
                            e.target.value,
                        })
                      }
                      className="form-input"
                      required
                      disabled={
                        loadingDepots
                      }
                    >
                      <option value="">
                        {loadingDepots
                          ? "Loading depots..."
                          : "Select Depot"}
                      </option>

                      {depots.map(
                        (depot) => (
                          <option
                            key={depot.id}
                            value={depot.id}
                          >
                            {depot.name}
                          </option>
                        ),
                      )}
                    </select>
                  </FormField>
                </div>

                {/* Status */}
                <FormField label="Status">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status:
                          e.target
                            .value as BusStatus,
                      })
                    }
                    className="form-input"
                  >
                    <option value="AVAILABLE">
                      Available
                    </option>

                    <option value="ASSIGNED">
                      Assigned
                    </option>

                    <option value="MAINTENANCE">
                      Maintenance
                    </option>

                    <option value="INACTIVE">
                      Inactive
                    </option>
                  </select>
                </FormField>

                {/* Selected Depot Info */}
                {form.depot_id && (
                  <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                      <FiMapPin
                        size={17}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-medium text-blue-600">
                        Assigned Depot
                      </p>

                      <p className="text-sm font-bold text-blue-900">
                        {depots.find(
                          (depot) =>
                            depot.id ===
                            Number(
                              form.depot_id,
                            ),
                        )?.name ||
                          "Selected Depot"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loadingDepots ||
                    depots.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving && (
                    <FiLoader
                      className="animate-spin"
                      size={16}
                    />
                  )}

                  {editingBus
                    ? "Update Bus"
                    : "Add Bus"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ToastContainer/>
    </div>
  );
}

/* ---------------------------------------------------------
   STATISTICS CARD
--------------------------------------------------------- */

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

      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------
   SERVICE BADGE
--------------------------------------------------------- */

function ServiceBadge({
  serviceType,
}: {
  serviceType: ServiceType;
}) {
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

/* ---------------------------------------------------------
   STATUS BADGE
--------------------------------------------------------- */

function StatusBadge({
  status,
}: {
  status: BusStatus;
}) {
  const styles: Record<
    BusStatus,
    string
  > = {
    AVAILABLE:
      "bg-green-50 text-green-700",

    ASSIGNED:
      "bg-blue-50 text-blue-700",

    MAINTENANCE:
      "bg-amber-50 text-amber-700",

    INACTIVE:
      "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {String(status || "UNKNOWN").replace(
        "_",
        " ",
      )}
    </span>
  );
}

/* ---------------------------------------------------------
   FORM FIELD
--------------------------------------------------------- */

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

