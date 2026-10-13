"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

import {
  FiEdit2,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiTruck,
  FiX,
  FiMenu,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiMail,
} from "react-icons/fi";

import axios from "axios";

import { AdminSidebar } from "@/components/SideNavBar/AdminSideNavBar";

import {
  changeDepotStatus,
  createDepot,
  deleteDepot,
  getAllDepots,
  updateDepot,
} from "@/services/depotServices";

const API_URL = "http://localhost:5000/api";

type DepotStatus = "ACTIVE" | "INACTIVE";

type Supervisor = {
  id: number;
  name: string;
  email: string;
  status?: string;
  role?: string;
};

type Depot = {
  id: number;

  depot_code: string;
  name: string;
  location: string;

  manager_id: number | null;
  supervisor_name?: string;
  supervisor_email?: string;

  total_buses?: number;
  total_operational_staff?: number;

  status: DepotStatus;

  created_at?: string;
  updated_at?: string;
};

type DepotForm = {
  depot_code: string;
  name: string;
  location: string;
  manager_id: string;
  status: DepotStatus;
};

export default function DepotsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [depots, setDepots] = useState<Depot[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [editingDepot, setEditingDepot] = useState<Depot | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const [error, setError] = useState("");

  const [form, setForm] = useState<DepotForm>({
    depot_code: "",
    name: "",
    location: "",
    manager_id: "",
    status: "ACTIVE",
  });

  const fetchDepots = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAllDepots();

      const responseData = response.data;

      const depotData = Array.isArray(responseData)
        ? responseData
        : responseData?.data;

      if (!Array.isArray(depotData)) {
        throw new Error("Invalid depot response.");
      }

      setDepots(depotData);
    } catch (err: any) {
      console.error("Fetch depots error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load depots.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     GET SUPERVISORS
  ========================================================= */

  const fetchSupervisors = async () => {
    try {
      setLoadingSupervisors(true);

      const response = await axios.get(`${API_URL}/users`);

      const responseData = response.data;

      const users = Array.isArray(responseData)
        ? responseData
        : responseData?.data;

      if (!Array.isArray(users)) {
        throw new Error("Invalid users response.");
      }

      const supervisorUsers = users.filter(
        (user: Supervisor) =>
          user.role?.toUpperCase() === "SUPERVISOR" &&
          user.status?.toUpperCase() !== "SUSPENDED" &&
          user.status?.toUpperCase() !== "INACTIVE",
      );

      setSupervisors(supervisorUsers);
    } catch (err: any) {
      console.error("Fetch supervisors error:", err);

      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load supervisors.",
      );
    } finally {
      setLoadingSupervisors(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchDepots();
    fetchSupervisors();
  }, []);

  /* =========================================================
     SEARCH + FILTER
  ========================================================= */

  const filteredDepots = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return depots.filter((depot) => {
      const matchesSearch =
        !searchValue ||
        depot.name?.toLowerCase().includes(searchValue) ||
        depot.depot_code?.toLowerCase().includes(searchValue) ||
        depot.location?.toLowerCase().includes(searchValue) ||
        depot.supervisor_name?.toLowerCase().includes(searchValue) ||
        depot.supervisor_email?.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL" || depot.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [depots, search, statusFilter]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const totalBuses = depots.reduce(
    (total, depot) => total + Number(depot.total_buses || 0),
    0,
  );

  const totalOperationalStaff = depots.reduce(
    (total, depot) => total + Number(depot.total_operational_staff || 0),
    0,
  );

  const activeDepots = depots.filter(
    (depot) => depot.status === "ACTIVE",
  ).length;

  const inactiveDepots = depots.filter(
    (depot) => depot.status === "INACTIVE",
  ).length;

  /* =========================================================
     CREATE MODAL
  ========================================================= */

  const openCreateModal = () => {
    setEditingDepot(null);

    setForm({
      depot_code: "",
      name: "",
      location: "",
      manager_id: "",
      status: "ACTIVE",
    });

    setError("");
    setShowModal(true);

    if (supervisors.length === 0) {
      fetchSupervisors();
    }
  };

  /* =========================================================
     EDIT MODAL
  ========================================================= */

  const openEditModal = (depot: Depot) => {
    setEditingDepot(depot);

    setForm({
      depot_code: depot.depot_code || "",

      name: depot.name || "",

      location: depot.location || "",

      manager_id: depot.manager_id?.toString() || "",

      status: depot.status || "ACTIVE",
    });

    setError("");
    setShowModal(true);

    if (supervisors.length === 0) {
      fetchSupervisors();
    }
  };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingDepot(null);
  };

  /* =========================================================
     CREATE / UPDATE
  ========================================================= */

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !form.depot_code.trim() ||
      !form.name.trim() ||
      !form.location.trim() ||
      !form.manager_id
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    const supervisorId = Number(form.manager_id);

    if (!Number.isInteger(supervisorId) || supervisorId <= 0) {
      alert("Please select a valid supervisor.");
      return;
    }

    const selectedSupervisor = supervisors.find(
      (supervisor) => supervisor.id === supervisorId,
    );

    if (!selectedSupervisor) {
      alert("Please select a valid supervisor.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        depot_code: form.depot_code.trim(),

        name: form.name.trim(),

        location: form.location.trim(),

        manager_id: supervisorId,

        status: form.status,
      };

      if (editingDepot) {
        await updateDepot(editingDepot.id, payload);

        alert("Depot updated successfully.");
      } else {
        await createDepot(payload);

        alert("Depot created successfully.");
      }

      await fetchDepots();

      setShowModal(false);
      setEditingDepot(null);
    } catch (err: any) {
      console.error("Save depot error:", err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to save depot.";

      alert(message);
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     TOGGLE STATUS
  ========================================================= */

  const toggleStatus = async (depot: Depot) => {
    const newStatus: DepotStatus =
      depot.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      setStatusUpdatingId(depot.id);

      await changeDepotStatus(depot.id, newStatus);

      setDepots((current) =>
        current.map((item) =>
          item.id === depot.id
            ? {
                ...item,
                status: newStatus,
              }
            : item,
        ),
      );
    } catch (err: any) {
      console.error("Status update error:", err);

      alert(err?.response?.data?.message || "Failed to update depot status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteDepotHandle = async (depot: Depot) => {
    const busCount = Number(depot.total_buses || 0);

    const staffCount = Number(depot.total_operational_staff || 0);

    if (busCount > 0 || staffCount > 0) {
      alert(
        "This depot has buses or operational staff assigned. Deactivate the depot instead of deleting it.",
      );

      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${depot.name}?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(depot.id);

      await deleteDepot(depot.id);

      setDepots((current) => current.filter((item) => item.id !== depot.id));

      alert("Depot deleted successfully.");
    } catch (err: any) {
      console.error("Delete depot error:", err);

      alert(err?.response?.data?.message || "Failed to delete depot.");
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

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

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* PAGE HEADER */}

            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                    SRMSS
                  </span>

                  <span className="text-xs font-medium text-slate-400">
                    Administration
                  </span>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Transport Depots
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Manage transport depots, supervisors and depot resources
                  within SRMSS.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                <FiPlus size={18} />
                Create Depot
              </button>
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <FiAlertCircle
                    className="mt-0.5 shrink-0 text-red-600"
                    size={20}
                  />

                  <div>
                    <p className="font-semibold text-red-800">
                      Unable to load depot data
                    </p>

                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchDepots}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <FiRefreshCw size={15} />
                  Retry
                </button>
              </div>
            )}

            {/* =================================================
                STATISTICS
            ================================================= */}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                title="Total Depots"
                value={depots.length}
                icon={<FiMapPin />}
              />

              <StatCard
                title="Active Depots"
                value={activeDepots}
                icon={<FiCheckCircle />}
              />

              <StatCard
                title="Inactive Depots"
                value={inactiveDepots}
                icon={<FiAlertCircle />}
              />

              <StatCard
                title="Total Buses"
                value={totalBuses}
                icon={<FiTruck />}
              />

              <StatCard
                title="Operational Staff"
                value={totalOperationalStaff}
                icon={<FiUsers />}
              />
            </div>

            {/* =================================================
                SEARCH
            ================================================= */}

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
                    placeholder="Search depot, code, location or supervisor..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                >
                  <option value="ALL">All Status</option>

                  <option value="ACTIVE">Active</option>

                  <option value="INACTIVE">Inactive</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    fetchDepots();
                    fetchSupervisors();
                  }}
                  disabled={loading || loadingSupervisors}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiRefreshCw
                    className={
                      loading || loadingSupervisors ? "animate-spin" : ""
                    }
                    size={17}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* =================================================
                RESULTS HEADER
            ================================================= */}

            <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Registered Depots
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Showing {filteredDepots.length} of {depots.length} depots
                </p>
              </div>

              {search || statusFilter !== "ALL" ? (
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
              ) : null}
            </div>

            {/* =================================================
                LOADING
            ================================================= */}

            {loading ? (
              <div className="mt-4 grid gap-5 xl:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <DepotSkeleton key={item} />
                ))}
              </div>
            ) : filteredDepots.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <FiMapPin className="mx-auto mb-4 text-slate-400" size={40} />

                <h3 className="font-semibold text-slate-900">
                  No depots found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing your search or create a new depot.
                </p>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <FiPlus />
                  Create Depot
                </button>
              </div>
            ) : (
              /* =================================================
                 DEPOT CARDS
              ================================================= */

              <div className="mt-4 grid gap-5 xl:grid-cols-2">
                {filteredDepots.map((depot) => (
                  <div
                    key={depot.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-red-200 hover:shadow-md"
                  >
                    {/* CARD HEADER */}

                    <div className="flex items-start justify-between border-b border-slate-100 p-5">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                          <FiMapPin size={23} />
                        </div>

                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-red-600">
                              {depot.depot_code}
                            </span>

                            <StatusBadge status={depot.status} />
                          </div>

                          <h2 className="truncate font-bold text-slate-900">
                            {depot.name}
                          </h2>
                        </div>
                      </div>

                      <div className="ml-3 flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(depot)}
                          className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                          title="Edit depot"
                        >
                          <FiEdit2 size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteDepotHandle(depot)}
                          disabled={deletingId === depot.id}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Delete depot"
                        >
                          {deletingId === depot.id ? (
                            <FiRefreshCw className="animate-spin" size={17} />
                          ) : (
                            <FiTrash2 size={17} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* DETAILS */}

                    <div className="grid gap-5 p-5 sm:grid-cols-2">
                      <Detail
                        icon={<FiMapPin />}
                        label="Location"
                        value={depot.location}
                      />

                      <Detail
                        icon={<FiUsers />}
                        label="Supervisor"
                        value={depot.supervisor_name || "-"}
                      />

                      <Detail
                        icon={<FiMail />}
                        label="Supervisor Email"
                        value={depot.supervisor_email || "-"}
                      />

                      <Detail
                        icon={<FiTruck />}
                        label="Buses"
                        value={`${Number(depot.total_buses || 0)} buses`}
                      />

                      <Detail
                        icon={<FiUsers />}
                        label="Operational Staff"
                        value={`${Number(
                          depot.total_operational_staff || 0,
                        )} staff`}
                      />

                      <Detail
                        icon={<FiUsers />}
                        label="Supervisor ID"
                        value={depot.manager_id ? `#${depot.manager_id}` : "-"}
                      />
                    </div>

                    {/* FOOTER */}

                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4">
                      <div className="text-sm">
                        <span className="text-slate-500">Depot ID: </span>

                        <span className="font-semibold text-slate-900">
                          #{depot.id}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleStatus(depot)}
                        disabled={statusUpdatingId === depot.id}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          depot.status === "ACTIVE"
                            ? "bg-white text-slate-700 hover:bg-slate-100"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                      >
                        {statusUpdatingId === depot.id && (
                          <FiRefreshCw className="animate-spin" size={13} />
                        )}

                        {depot.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* =====================================================
          CREATE / EDIT MODAL
      ===================================================== */}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingDepot ? "Edit Depot" : "Create New Depot"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingDepot
                    ? "Update depot information and supervisor."
                    : "Add a new transport depot to SRMSS."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                aria-label="Close modal"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* DEPOT CODE */}

                <FormField
                  label="Depot Code"
                  placeholder="DPT-004"
                  value={form.depot_code}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      depot_code: value,
                    }))
                  }
                />

                {/* DEPOT NAME */}

                <FormField
                  label="Depot Name"
                  placeholder="Enter depot name"
                  value={form.name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                />

                {/* LOCATION */}

                <FormField
                  label="Location"
                  placeholder="e.g. Colombo"
                  value={form.location}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      location: value,
                    }))
                  }
                />

                {/* SUPERVISOR */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Supervisor
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <select
                    value={form.manager_id}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        manager_id: e.target.value,
                      }))
                    }
                    disabled={loadingSupervisors}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50 disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingSupervisors
                        ? "Loading supervisors..."
                        : supervisors.length === 0
                          ? "No supervisors available"
                          : "Select Supervisor"}
                    </option>

                    {supervisors.map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.name} — {supervisor.email}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1.5 text-xs text-slate-400">
                    The selected supervisor is linked through users.id.
                  </p>
                </div>

                {/* STATUS */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        status: e.target.value as DepotStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  >
                    <option value="ACTIVE">Active</option>

                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              {/* EDIT INFORMATION */}

              {editingDepot && (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <FiUsers
                      className="mt-0.5 shrink-0 text-blue-600"
                      size={18}
                    />

                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        Current Supervisor
                      </p>

                      <p className="mt-1 text-sm text-blue-700">
                        {editingDepot.supervisor_name || "Not assigned"}
                      </p>

                      {editingDepot.manager_id && (
                        <p className="mt-1 text-xs text-blue-600">
                          User ID: #{editingDepot.manager_id}
                        </p>
                      )}

                      {editingDepot.supervisor_email && (
                        <p className="mt-1 text-xs text-blue-600">
                          {editingDepot.supervisor_email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* WORKFLOW INFO */}

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  SRMSS Workflow
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="rounded-lg bg-white px-3 py-2">Depot</span>

                  <span className="text-slate-400">→</span>

                  <span className="rounded-lg bg-white px-3 py-2">Routes</span>

                  <span className="text-slate-400">→</span>

                  <span className="rounded-lg bg-white px-3 py-2">
                    Schedules
                  </span>

                  <span className="text-slate-400">→</span>

                  <span className="rounded-lg bg-white px-3 py-2">
                    Assignments
                  </span>

                  <span className="text-slate-400">→</span>

                  <span className="rounded-lg bg-white px-3 py-2">Trips</span>
                </div>
              </div>

              {/* BUTTONS */}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving || loadingSupervisors || supervisors.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <FiRefreshCw className="animate-spin" size={16} />}

                  {editingDepot ? "Save Changes" : "Create Depot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

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

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }: { status: DepotStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
        status === "ACTIVE"
          ? "bg-green-50 text-green-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

/* =========================================================
   DETAIL
========================================================= */

function Detail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>

        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        <span className="ml-1 text-red-500">*</span>
      </label>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        required
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
      />
    </div>
  );
}

/* =========================================================
   LOADING SKELETON
========================================================= */

function DepotSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse">
        <div className="flex items-center gap-4 border-b border-slate-100 p-5">
          <div className="h-12 w-12 rounded-xl bg-slate-200" />

          <div className="flex-1">
            <div className="mb-2 h-3 w-20 rounded bg-slate-200" />

            <div className="h-5 w-48 rounded bg-slate-200" />
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine />
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="h-5 w-full rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

function SkeletonLine() {
  return (
    <div>
      <div className="mb-2 h-3 w-20 rounded bg-slate-200" />

      <div className="h-4 w-32 rounded bg-slate-200" />
    </div>
  );
}
