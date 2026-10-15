
"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiEdit2,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiTruck,
  FiMapPin,
  FiPhone,
  FiX,
  FiCalendar,
  FiClock,
  FiCreditCard,
} from "react-icons/fi";

import { AdminSidebar } from "@/components/SideNavBar/AdminSideNavBar";
import { toast, ToastContainer } from "react-toastify";
import Swal from "sweetalert2";

const API_URL = "http://localhost:5000/api";

type DriverStatus = "AVAILABLE" | "ON_DUTY" | "OFF_DUTY" | "SUSPENDED";

type Driver = {
  id: number;
  employee_no: string;
  name: string;
  phone: string | null;
  license_no: string;
  license_expiry: string;
  depot_id: number | null;
  depot_name?: string | null;
  depot_code?: string | null;
  working_hours: number | null;
  status: DriverStatus | string;
  created_at?: string;
};

type Depot = {
  id: number;
  depot_code: string;
  name: string;
  location: string;
  status: string;
};

type DriverForm = {
  employee_no: string;
  name: string;
  phone: string;
  license_no: string;
  license_expiry: string;
  depot_id: string;
  working_hours: string;
  status: DriverStatus;
};

const emptyForm: DriverForm = {
  employee_no: "",
  name: "",
  phone: "",
  license_no: "",
  license_expiry: "",
  depot_id: "",
  working_hours: "0",
  status: "AVAILABLE",
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
  return value ? value.slice(0, 10) : "";
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

export default function DriversPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingDepots, setLoadingDepots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState<DriverForm>({ ...emptyForm });

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("srmss_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/drivers`, {
        headers: getHeaders(),
      });

      const data = response.data?.data ?? response.data;

      if (!Array.isArray(data)) {
        throw new Error("Invalid drivers response from the server.");
      }

      setDrivers(data);
    } catch (err) {
      console.log("Fetch drivers error:", err);
      setError(getErrorMessage(err, "Failed to load drivers."));
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const fetchDepots = useCallback(async () => {
    try {
      setLoadingDepots(true);

      const response = await axios.get(`${API_URL}/depots`, {
        headers: getHeaders(),
      });

      const data = response.data?.data ?? response.data;

      if (!Array.isArray(data)) {
        throw new Error("Invalid depots response from the server.");
      }

      setDepots(data);
    } catch (err) {
      console.log("Fetch depots error:", err);
      setError(getErrorMessage(err, "Failed to load depots."));
    } finally {
      setLoadingDepots(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    void fetchDrivers();
    void fetchDepots();
  }, [fetchDrivers, fetchDepots]);

  const filteredDrivers = useMemo(() => {
    const query = search.toLowerCase().trim();

    return drivers.filter((driver) => {
      const matchesSearch =
        !query ||
        driver.employee_no?.toLowerCase().includes(query) ||
        driver.name?.toLowerCase().includes(query) ||
        driver.phone?.toLowerCase().includes(query) ||
        driver.license_no?.toLowerCase().includes(query) ||
        driver.depot_name?.toLowerCase().includes(query) ||
        driver.depot_code?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        driver.status?.toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [drivers, search, statusFilter]);

  const availableDrivers = drivers.filter(
    (driver) => driver.status?.toUpperCase() === "AVAILABLE",
  ).length;

  const onDutyDrivers = drivers.filter(
    (driver) => driver.status?.toUpperCase() === "ON_DUTY",
  ).length;

  const suspendedDrivers = drivers.filter(
    (driver) => driver.status?.toUpperCase() === "SUSPENDED",
  ).length;

  const openCreateModal = () => {
    setEditingDriver(null);
    setForm({ ...emptyForm });
    setShowModal(true);

    if (depots.length === 0) void fetchDepots();
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);

    const status = driver.status?.toUpperCase();

    setForm({
      employee_no: driver.employee_no || "",
      name: driver.name || "",
      phone: driver.phone || "",
      license_no: driver.license_no || "",
      license_expiry: getDateValue(driver.license_expiry),
      depot_id:
        driver.depot_id !== null && driver.depot_id !== undefined
          ? String(driver.depot_id)
          : "",
      working_hours:
        driver.working_hours !== null && driver.working_hours !== undefined
          ? String(driver.working_hours)
          : "0",
      status:
        status === "ON_DUTY" ||
        status === "OFF_DUTY" ||
        status === "SUSPENDED"
          ? status
          : "AVAILABLE",
    });

    setShowModal(true);

    if (depots.length === 0) void fetchDepots();
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingDriver(null);
    setForm({ ...emptyForm });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !form.employee_no.trim() ||
      !form.name.trim() ||
      !form.license_no.trim() ||
      !form.license_expiry
    ) {
      toast.error("Please complete all required driver fields.");
      return;
    }

    if (!form.depot_id) {
      toast.error("Please select a depot for this driver.");
      return;
    }

    const expiryDate = new Date(`${form.license_expiry}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(expiryDate.getTime())) {
      toast.error("Please enter a valid licence expiry date.");
      return;
    }

    if (expiryDate < today) {
      toast.error("The driving licence has expired. Enter a valid expiry date.");
      return;
    }

    const workingHours = Number(form.working_hours);

    if (
      form.working_hours.trim() === "" ||
      !Number.isFinite(workingHours) ||
      workingHours < 0
    ) {
      toast.error("Working hours must be zero or greater.");
      return;
    }

    const payload = {
      employee_no: form.employee_no.trim(),
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      license_no: form.license_no.trim(),
      license_expiry: form.license_expiry,
      depot_id: Number(form.depot_id),
      working_hours: workingHours,
      status: form.status,
    };

    try {
      setSaving(true);

      if (editingDriver) {
        await axios.put(`${API_URL}/drivers/${editingDriver.id}`, payload, {
          headers: getHeaders(),
        });
        toast.success("Driver updated successfully.");
      } else {
        await axios.post(`${API_URL}/drivers`, payload, {
          headers: getHeaders(),
        });
        toast.success("Driver created successfully.");
      }

      await fetchDrivers();

      setShowModal(false);
      setEditingDriver(null);
      setForm({ ...emptyForm });
    } catch (err) {
      console.log("Save driver error:", err);
      toast.error(getErrorMessage(err, "Failed to save driver."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (driver: Driver) => {
    const result = await Swal.fire({
      title: "Delete Route?",
      text: `Are you sure you want to delete driver ${driver.name} (${driver.employee_no})?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    
    if (!result.isConfirmed) return;

    try {
      setDeletingId(driver.id);

      await axios.delete(`${API_URL}/drivers/${driver.id}`, {
        headers: getHeaders(),
      });

      setDrivers((current) =>
        current.filter((item) => item.id !== driver.id),
      );

      toast.success("Driver deleted successfully.");
    } catch (err) {
      console.log("Delete driver error:", err);
      toast.error(
        getErrorMessage(
          err,
          "Failed to delete driver. The driver may be assigned to an existing trip.",
        ),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (
    driver: Driver,
    status: DriverStatus,
  ) => {
    if (driver.status?.toUpperCase() === status) return;

    try {
      setStatusUpdatingId(driver.id);

      await axios.patch(
        `${API_URL}/drivers/${driver.id}/status`,
        { status },
        { headers: getHeaders() },
      );

      setDrivers((current) =>
        current.map((item) =>
          item.id === driver.id ? { ...item, status } : item,
        ),
      );
    } catch (err) {
      console.log("Update driver status error:", err);
      toast.error(getErrorMessage(err, "Failed to update driver status."));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="mr-4 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation"
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

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div>

                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                   Driver Management
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Register drivers, manage licence details, and assign drivers to depots.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                <FiPlus size={18} />
                Add Driver
              </button>
            </div>

            {error && (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-3">
                  <FiAlertCircle className="shrink-0 text-red-600" size={20} />
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void fetchDrivers();
                    void fetchDepots();
                  }}
                  className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Drivers"
                value={drivers.length}
                icon={<FiTruck />}
              />
              <StatCard
                title="Available"
                value={availableDrivers}
                icon={<FiCheckCircle />}
              />
              <StatCard
                title="On Duty"
                value={onDutyDrivers}
                icon={<FiClock />}
              />
              <StatCard
                title="Suspended"
                value={suspendedDrivers}
                icon={<FiAlertCircle />}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                    placeholder="Search employee number, driver, licence or depot..."
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl text-gray-500 border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  aria-label="Filter by driver status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="ON_DUTY">On Duty</option>
                  <option value="OFF_DUTY">Off Duty</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    void fetchDrivers();
                    void fetchDepots();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <FiRefreshCw size={17} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Registered Drivers
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
              <div className="mt-4 grid gap-5 xl:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <DriverSkeleton key={item} />
                ))}
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <FiTruck className="mx-auto mb-4 text-slate-400" size={40} />
                <h3 className="font-semibold text-slate-900">
                  No drivers found
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try changing your search or filters, or add a driver.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-5 xl:grid-cols-2">
                {filteredDrivers.map((driver) => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    deleting={deletingId === driver.id}
                    statusUpdating={statusUpdatingId === driver.id}
                    onEdit={() => openEditModal(driver)}
                    onDelete={() => void handleDelete(driver)}
                    onStatusChange={(status) =>
                      void handleStatusChange(driver, status)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed text-gray-500 inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingDriver ? "Edit Driver" : "Register Driver"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingDriver
                    ? "Update driver and licence information."
                    : "Add a driver to the SRMSS system."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close modal"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Employee Number"
                  placeholder="e.g. DRV-001"
                  value={form.employee_no}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, employee_no: value }))
                  }
                />

                <FormField
                  label="Driver Name"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, name: value }))
                  }
                />

                <FormField
                  label="Phone Number"
                  placeholder="Enter phone number"
                  value={form.phone}
                  required={false}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, phone: value }))
                  }
                />

                <FormField
                  label="Driving Licence Number"
                  placeholder="Enter licence number"
                  value={form.license_no}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, license_no: value }))
                  }
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Licence Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.license_expiry}
                    min={new Date().toLocaleDateString("en-CA")}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        license_expiry: e.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Assigned Depot <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.depot_id}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        depot_id: e.target.value,
                      }))
                    }
                    required
                    disabled={loadingDepots}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingDepots ? "Loading depots..." : "Select depot"}
                    </option>
                    {depots
                      .filter(
                        (depot) =>
                          depot.status?.toUpperCase() === "ACTIVE" ||
                          (editingDriver && depot.id === editingDriver.depot_id),
                      )
                      .map((depot) => (
                        <option key={depot.id} value={depot.id}>
                          {depot.depot_code} — {depot.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Working Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.working_hours}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        working_hours: e.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Driver Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        status: e.target.value as DriverStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_DUTY">On Duty</option>
                    <option value="OFF_DUTY">Off Duty</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {form.depot_id && (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <FiMapPin className="mt-0.5 shrink-0 text-red-600" size={18} />
                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        Selected Depot
                      </p>
                      <p className="mt-1 text-sm text-red-800">
                        {(() => {
                          const depot = depots.find(
                            (item) => item.id === Number(form.depot_id),
                          );
                          return depot
                            ? `${depot.depot_code} — ${depot.name}`
                            : "Depot selected";
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <FiRefreshCw className="animate-spin" size={16} />}
                  {editingDriver ? "Save Changes" : "Register Driver"}
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

function DriverCard({
  driver,
  deleting,
  statusUpdating,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  driver: Driver;
  deleting: boolean;
  statusUpdating: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: DriverStatus) => void;
}) {
  const status = driver.status?.toUpperCase();

  const statusClass =
    status === "AVAILABLE"
      ? "bg-green-50 text-green-700"
      : status === "ON_DUTY"
        ? "bg-blue-50 text-blue-700"
        : status === "SUSPENDED"
          ? "bg-red-50 text-red-700"
          : "bg-slate-100 text-slate-600";

  const expiryState = getExpiryState(driver.license_expiry);

  const expiryClass =
    expiryState === "EXPIRED"
      ? "text-red-600"
      : expiryState === "EXPIRING"
        ? "text-amber-600"
        : expiryState === "VALID"
          ? "text-emerald-700"
          : "text-slate-500";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-red-100 hover:shadow-md">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <FiTruck size={22} />
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                {driver.employee_no}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}>
                {driver.status?.replaceAll("_", " ")}
              </span>
            </div>

            <h2 className="truncate font-bold text-slate-900">{driver.name}</h2>
            <p className="mt-1 text-xs text-slate-500">Driver ID: #{driver.id}</p>
          </div>
        </div>

        <div className="ml-3 flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            title="Edit driver"
            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
          >
            <FiEdit2 size={17} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            title="Delete driver"
            className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            {deleting ? (
              <FiRefreshCw className="animate-spin" size={17} />
            ) : (
              <FiTrash2 size={17} />
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <InfoItem icon={<FiPhone />} label="Phone" value={driver.phone || "Not provided"} />
        <InfoItem icon={<FiCreditCard />} label="Licence Number" value={driver.license_no || "Not provided"} />
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
          value={driver.depot_name || driver.depot_code || "No depot assigned"}
        />
        <InfoItem
          icon={<FiClock />}
          label="Working Hours"
          value={`${driver.working_hours ?? 0} hours`}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-400">Update status</p>
          <p className="mt-1 text-xs text-slate-500">
            Change the driver's current availability.
          </p>
        </div>

        <select
          value={
            status === "ON_DUTY" ||
            status === "OFF_DUTY" ||
            status === "SUSPENDED"
              ? status
              : "AVAILABLE"
          }
          onChange={(e) => onStatusChange(e.target.value as DriverStatus)}
          disabled={statusUpdating}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-red-500 disabled:opacity-50"
          aria-label={`Change status for ${driver.name}`}
        >
          <option value="AVAILABLE">Available</option>
          <option value="ON_DUTY">On Duty</option>
          <option value="OFF_DUTY">Off Duty</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  valueClass = "text-slate-800",
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
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

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-red-100 hover:shadow-md">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
      />
    </div>
  );
}

function DriverSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
      <div className="animate-pulse">
        <div className="mb-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-200" />
          <div className="flex-1">
            <div className="mb-2 h-3 w-24 rounded bg-slate-200" />
            <div className="h-5 w-40 rounded bg-slate-200" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item}>
              <div className="mb-2 h-3 w-20 rounded bg-slate-200" />
              <div className="h-4 w-32 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
