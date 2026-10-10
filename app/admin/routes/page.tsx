"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiPlus,
  FiSearch,
  FiMapPin,
  FiEdit2,
  FiTrash2,
  FiMenu,
  FiX,
  FiCheckCircle,
  FiMap,
  FiPower,
  FiRefreshCw,
  FiAlertCircle,
  FiClock,
} from "react-icons/fi";

import { AdminSidebar } from "@/components/SideNavBar/AdminSideNavBar";

import {
  getAllRoutes,
  createRoute,
  updateRoute,
  deleteRoute as deleteRouteApi,
  updateRouteStatus,
} from "@/services/routesService";

/* =========================================================
   TYPES
========================================================= */

type RouteStatus = "ACTIVE" | "INACTIVE";

type TransportRoute = {
  id: number;
  route_code: string;
  name: string;
  start_point: string;
  end_point: string;
  distance_km: number;
  estimated_duration: number;
  number_of_stops: number;
  status: RouteStatus;
  created_at?: string;
  updated_at?: string;
};

/* =========================================================
   FORM
========================================================= */

type RouteForm = {
  route_code: string;
  name: string;
  start_point: string;
  end_point: string;
  distance_km: string;
  estimated_duration: string;
  number_of_stops: string;
  status: RouteStatus;
};

const emptyForm: RouteForm = {
  route_code: "",
  name: "",
  start_point: "",
  end_point: "",
  distance_km: "",
  estimated_duration: "",
  number_of_stops: "",
  status: "ACTIVE",
};

/* =========================================================
   PAGE
========================================================= */

export default function RoutesPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [routes, setRoutes] =
    useState<TransportRoute[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [showForm, setShowForm] = useState(false);

  const [editingRoute, setEditingRoute] =
    useState<TransportRoute | null>(null);

  const [form, setForm] =
    useState<RouteForm>(emptyForm);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");

  /* =========================================================
     GET ALL ROUTES
  ========================================================= */

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAllRoutes();

      const routeData =
        response.data?.data ??
        response.data ??
        [];

      setRoutes(
        Array.isArray(routeData)
          ? routeData
          : []
      );
    } catch (err: any) {
      console.error(
        "Failed to load routes:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to load routes from the server."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchRoutes();
  }, []);

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredRoutes = useMemo(() => {
    const searchValue =
      search.toLowerCase().trim();

    return routes.filter((route) => {
      const matchesSearch =
        route.name
          ?.toLowerCase()
          .includes(searchValue) ||
        route.route_code
          ?.toLowerCase()
          .includes(searchValue) ||
        route.start_point
          ?.toLowerCase()
          .includes(searchValue) ||
        route.end_point
          ?.toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL" ||
        route.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    routes,
    search,
    statusFilter,
  ]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const totalRoutes = routes.length;

  const activeRoutes = routes.filter(
    (route) =>
      route.status === "ACTIVE"
  ).length;

  const inactiveRoutes = routes.filter(
    (route) =>
      route.status === "INACTIVE"
  ).length;

  const totalStops = routes.reduce(
    (total, route) =>
      total +
      Number(route.number_of_stops || 0),
    0
  );

  /* =========================================================
     ADD
  ========================================================= */

  const openAddModal = () => {
    setEditingRoute(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  /* =========================================================
     EDIT
  ========================================================= */

  const openEditModal = (
    route: TransportRoute
  ) => {
    setEditingRoute(route);

    setForm({
      route_code:
        route.route_code || "",

      name:
        route.name || "",

      start_point:
        route.start_point || "",

      end_point:
        route.end_point || "",

      distance_km:
        route.distance_km !== null &&
        route.distance_km !== undefined
          ? String(route.distance_km)
          : "",

      estimated_duration:
        route.estimated_duration !== null &&
        route.estimated_duration !== undefined
          ? String(route.estimated_duration)
          : "",

      number_of_stops:
        route.number_of_stops !== null &&
        route.number_of_stops !== undefined
          ? String(route.number_of_stops)
          : "",

      status:
        route.status || "ACTIVE",
    });

    setError("");
    setShowForm(true);
  };

  /* =========================================================
     CLOSE
  ========================================================= */

  const closeModal = () => {
    if (saving) return;

    setShowForm(false);
    setEditingRoute(null);
    setForm(emptyForm);
    setError("");
  };

  /* =========================================================
     FORMAT DURATION
  ========================================================= */

  const formatDuration = (
    minutes: number | null | undefined
  ) => {
    const totalMinutes = Number(minutes || 0);

    if (totalMinutes <= 0) {
      return "Not specified";
    }

    const hours = Math.floor(
      totalMinutes / 60
    );

    const remainingMinutes =
      totalMinutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours} hr${
        hours !== 1 ? "s" : ""
      }`;
    }

    return `${hours} hr${
      hours !== 1 ? "s" : ""
    } ${remainingMinutes} min`;
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (
      !form.route_code.trim() ||
      !form.name.trim() ||
      !form.start_point.trim() ||
      !form.end_point.trim() ||
      !form.distance_km ||
      !form.estimated_duration ||
      !form.number_of_stops
    ) {
      setError(
        "Please fill in all required fields."
      );

      return;
    }

    if (
      Number(form.distance_km) <= 0 ||
      Number(form.estimated_duration) <= 0 ||
      Number(form.number_of_stops) <= 0
    ) {
      setError(
        "Distance, estimated duration and number of stops must be greater than zero."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        route_code:
          form.route_code
            .trim()
            .toUpperCase(),

        name:
          form.name.trim(),

        start_point:
          form.start_point.trim(),

        end_point:
          form.end_point.trim(),

        distance_km:
          Number(form.distance_km),

        estimated_duration:
          Number(
            form.estimated_duration
          ),

        number_of_stops:
          Number(
            form.number_of_stops
          ),

        status:
          form.status,
      };

      if (editingRoute) {
        await updateRoute(
          editingRoute.id,
          payload
        );
      } else {
        await createRoute(payload);
      }

      await fetchRoutes();

      setShowForm(false);
      setEditingRoute(null);
      setForm(emptyForm);
    } catch (err: any) {
      console.error(
        "Failed to save route:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to save route."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteRoute = async (
    id: number
  ) => {
    const route = routes.find(
      (item) => item.id === id
    );

    if (!route) return;

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${route.route_code} - ${route.name}?`
      );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await deleteRouteApi(id);

      setRoutes((current) =>
        current.filter(
          (item) => item.id !== id
        )
      );
    } catch (err: any) {
      console.error(
        "Failed to delete route:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to delete route."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     TOGGLE STATUS
  ========================================================= */

  const toggleRouteStatus = async (
    route: TransportRoute
  ) => {
    const newStatus: RouteStatus =
      route.status === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE";

    try {
      setError("");

      await updateRouteStatus(
        route.id,
        newStatus
      );

      setRoutes((current) =>
        current.map((item) =>
          item.id === route.id
            ? {
                ...item,
                status: newStatus,
              }
            : item
        )
      );
    } catch (err: any) {
      console.error(
        "Failed to update route status:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to update route status."
      );
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() =>
          setMobileOpen(false)
        }
      />

      <main className="lg:pl-72 text-gray-900">

        {/* HEADER */}

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

            {/* PAGE HEADER */}

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Route Management
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Create and manage
                  public transport
                  routes.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={fetchRoutes}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <FiRefreshCw
                    size={17}
                    className={
                      loading
                        ? "animate-spin"
                        : ""
                    }
                  />

                  Refresh
                </button>

                <button
                  onClick={openAddModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700"
                >
                  <FiPlus size={18} />

                  Create Route
                </button>
              </div>
            </div>

            {/* ERROR */}

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <FiAlertCircle
                  className="mt-0.5 shrink-0"
                  size={19}
                />

                <div className="flex-1">
                  <p className="font-semibold">
                    Something went wrong
                  </p>

                  <p className="mt-1 text-sm">
                    {error}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setError("")
                  }
                  className="rounded-lg p-1 hover:bg-red-100"
                >
                  <FiX size={18} />
                </button>
              </div>
            )}

            {/* STATISTICS */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <StatCard
                title="Total Routes"
                value={totalRoutes}
                icon={
                  <FiMap size={22} />
                }
              />

              <StatCard
                title="Active Routes"
                value={activeRoutes}
                icon={
                  <FiCheckCircle
                    size={22}
                  />
                }
              />

              <StatCard
                title="Inactive Routes"
                value={inactiveRoutes}
                icon={
                  <FiPower size={22} />
                }
              />

              <StatCard
                title="Total Stops"
                value={totalStops}
                icon={
                  <FiMapPin
                    size={22}
                  />
                }
              />

            </div>

            {/* SEARCH */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row">

                <div className="relative flex-1">
                  <FiSearch
                    className="absolute left-3.5 top-3.5 text-slate-400"
                    size={18}
                  />

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Search route, code, start or destination..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50"
                >
                  <option value="ALL">
                    All Statuses
                  </option>

                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>
                </select>

              </div>
            </div>

            {/* ROUTES */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between">

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Registered Routes
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {filteredRoutes.length}{" "}
                      route
                      {filteredRoutes.length !==
                      1
                        ? "s"
                        : ""}{" "}
                      found
                    </p>
                  </div>

                  <FiMap
                    className="text-slate-300"
                    size={23}
                  />

                </div>
              </div>

              <div className="grid gap-4 p-5 lg:grid-cols-2">

                {loading ? (
                  <div className="col-span-full flex items-center justify-center py-16">
                    <FiRefreshCw
                      size={28}
                      className="animate-spin text-red-600"
                    />

                    <span className="ml-3 text-sm text-slate-500">
                      Loading routes...
                    </span>
                  </div>
                ) : filteredRoutes.length >
                  0 ? (
                  filteredRoutes.map(
                    (route) => (
                      <div
                        key={route.id}
                        className="rounded-2xl border border-slate-200 p-5 transition hover:border-red-200 hover:shadow-md"
                      >

                        {/* ROUTE HEADER */}

                        <div className="flex items-start justify-between gap-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                              <FiMapPin
                                size={20}
                              />
                            </div>

                            <div>
                              <p className="text-xs font-bold text-red-600">
                                {route.route_code}
                              </p>

                              <h3 className="font-bold text-slate-900">
                                {route.name}
                              </h3>
                            </div>

                          </div>

                          <StatusBadge
                            status={
                              route.status
                            }
                          />

                        </div>

                        {/* PATH */}

                        <div className="mt-5 rounded-xl bg-slate-50 p-4">

                          <div className="flex items-center gap-3">

                            <div className="flex flex-col items-center">

                              <div className="h-3 w-3 rounded-full border-2 border-red-600 bg-white" />

                              <div className="my-1 h-8 border-l-2 border-dashed border-slate-300" />

                              <div className="h-3 w-3 rounded-full bg-red-600" />

                            </div>

                            <div className="flex flex-1 flex-col justify-between gap-5">

                              <div>
                                <p className="text-xs text-slate-500">
                                  Start
                                </p>

                                <p className="font-semibold text-slate-800">
                                  {route.start_point}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-500">
                                  Destination
                                </p>

                                <p className="font-semibold text-slate-800">
                                  {route.end_point}
                                </p>
                              </div>

                            </div>

                          </div>

                        </div>

                        {/* INFORMATION */}

                        <div className="my-5 grid grid-cols-2 gap-4">

                          <Info
                            label="Distance"
                            value={`${Number(
                              route.distance_km
                            ).toFixed(1)} km`}
                          />

                          <Info
                            label="Stops"
                            value={`${Number(
                              route.number_of_stops
                            )} stops`}
                          />

                          <Info
                            label="Estimated Duration"
                            value={formatDuration(
                              route.estimated_duration
                            )}
                          />

                          <Info
                            label="Route Code"
                            value={
                              route.route_code
                            }
                          />

                        </div>

                        {/* ACTIONS */}

                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">

                          <button
                            onClick={() =>
                              openEditModal(
                                route
                              )
                            }
                            title="Edit route"
                            className="rounded-lg border border-slate-200 p-2.5 text-blue-600 transition hover:bg-blue-50"
                          >
                            <FiEdit2
                              size={17}
                            />
                          </button>

                          <button
                            onClick={() =>
                              toggleRouteStatus(
                                route
                              )
                            }
                            title={
                              route.status ===
                              "ACTIVE"
                                ? "Deactivate route"
                                : "Activate route"
                            }
                            className="rounded-lg border border-slate-200 p-2.5 text-emerald-600 transition hover:bg-emerald-50"
                          >
                            <FiCheckCircle
                              size={17}
                            />
                          </button>

                          <button
                            onClick={() =>
                              deleteRoute(
                                route.id
                              )
                            }
                            disabled={
                              deletingId ===
                              route.id
                            }
                            title="Delete route"
                            className="rounded-lg border border-slate-200 p-2.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId ===
                            route.id ? (
                              <FiRefreshCw
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <FiTrash2
                                size={17}
                              />
                            )}
                          </button>

                        </div>

                      </div>
                    )
                  )
                ) : (
                  <div className="col-span-full px-5 py-12 text-center">

                    <FiMap
                      className="mx-auto text-slate-300"
                      size={38}
                    />

                    <p className="mt-3 font-semibold text-slate-700">
                      No routes found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Try changing your
                      search or status
                      filter.
                    </p>

                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </main>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 text-gray-900">

          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingRoute
                    ? "Edit Route"
                    : "Create New Route"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingRoute
                    ? "Update route information."
                    : "Enter the details for the new route."}
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <FiX size={21} />
              </button>

            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit}>

              <div className="space-y-5 p-6">

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* CODE + NAME */}

                <div className="grid gap-5 sm:grid-cols-2">

                  <FormField label="Route Code">
                    <input
                      value={
                        form.route_code
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          route_code:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. R-001"
                      className="form-input"
                      required
                    />
                  </FormField>

                  <FormField label="Route Name">
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          name:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. Colombo - Kandy"
                      className="form-input"
                      required
                    />
                  </FormField>

                </div>

                {/* START + END */}

                <div className="grid gap-5 sm:grid-cols-2">

                  <FormField label="Starting Point">
                    <input
                      value={
                        form.start_point
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          start_point:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. Colombo"
                      className="form-input"
                      required
                    />
                  </FormField>

                  <FormField label="Destination">
                    <input
                      value={
                        form.end_point
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          end_point:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. Kandy"
                      className="form-input"
                      required
                    />
                  </FormField>

                </div>

                {/* DISTANCE + STOPS */}

                <div className="grid gap-5 sm:grid-cols-2">

                  <FormField label="Distance (km)">
                    <input
                      type="number"
                      min="0.1"
                      step="0.01"
                      value={
                        form.distance_km
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          distance_km:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. 115.50"
                      className="form-input"
                      required
                    />
                  </FormField>

                  <FormField label="Number of Stops">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        form.number_of_stops
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          number_of_stops:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. 8"
                      className="form-input"
                      required
                    />
                  </FormField>

                </div>

                {/* DURATION + STATUS */}

                <div className="grid gap-5 sm:grid-cols-2">

                  <FormField label="Estimated Duration (minutes)">
                    <div className="relative">
                      <FiClock
                        className="absolute left-3 top-3.5 text-slate-400"
                        size={17}
                      />

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          form.estimated_duration
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            estimated_duration:
                              e.target.value,
                          })
                        }
                        placeholder="e.g. 210"
                        className="form-input pl-10"
                        required
                      />
                    </div>

                    {form.estimated_duration &&
                      Number(
                        form.estimated_duration
                      ) > 0 && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          =
                          {" "}
                          {formatDuration(
                            Number(
                              form.estimated_duration
                            )
                          )}
                        </p>
                      )}
                  </FormField>

                  <FormField label="Status">
                    <select
                      value={
                        form.status
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          status:
                            e.target
                              .value as RouteStatus,
                        })
                      }
                      className="form-input"
                    >
                      <option value="ACTIVE">
                        Active
                      </option>

                      <option value="INACTIVE">
                        Inactive
                      </option>
                    </select>
                  </FormField>

                </div>

              </div>

              {/* FOOTER */}

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
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <FiRefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {editingRoute
                    ? "Update Route"
                    : "Create Route"}
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

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: RouteStatus;
}) {
  const styles: Record<
    RouteStatus,
    string
  > = {
    ACTIVE:
      "bg-green-50 text-green-700",

    INACTIVE:
      "bg-slate-100 text-slate-600",
  };

  const labels: Record<
    RouteStatus,
    string
  > = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status]
      }`}
    >
      {labels[status]}
    </span>
  );
}

/* =========================================================
   INFO
========================================================= */

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

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