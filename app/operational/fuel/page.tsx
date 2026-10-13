
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiCalendar,
  FiCheckCircle,
  FiDollarSign,
  FiDroplet,
  FiEdit2,
  FiLoader,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";
import OperationalSidebar from "@/components/SideNavBar/OperationalSidebar";

const API_BASE = "http://localhost:5000/api";
const TRIP_API = `${API_BASE}/trips`;
const FUEL_API = `${API_BASE}/fuel`;

type Trip = {
  id: number;
  trip_no?: string;
  tripNo?: string;
  staff_id?: number;
  bus_id?: number;
  registration_no?: string;
  bus?: string;
  route_name?: string;
  route_code?: string;
  start_point?: string;
  end_point?: string;
  service_date?: string;
  status?: string;
};

type FuelRecord = {
  id: number;
  trip_id?: number | null;
  bus_id: number;
  staff_id?: number;
  recorded_by?: number;
  registration_no?: string;
  trip_no?: string;
  fuel_type?: string;
  quantity_liters?: number;
  liters?: number;
  unit_price?: number;
  total_cost?: number;
  cost?: number;
  odometer_reading?: number;
  mileage?: number;
  fuel_date?: string;
  date?: string;
  notes?: string;
  created_at?: string;
};

type FuelForm = {
  trip_id: string;
  bus_id: string;
  fuel_type: string;
  quantity_liters: string;
  unit_price: string;
  odometer_reading: string;
  fuel_date: string;
  notes: string;
};

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const emptyForm = (): FuelForm => ({
  trip_id: "",
  bus_id: "",
  fuel_type: "DIESEL",
  quantity_liters: "",
  unit_price: "",
  odometer_reading: "",
  fuel_date: today(),
  notes: "",
});

function extractArray<T>(response: any): T[] {
  const body = response?.data;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.rows)) return body.rows;

  return [];
}

function tripNumber(trip: Trip) {
  return trip.trip_no || trip.tripNo || `TRIP-${trip.id}`;
}

function tripRoute(trip: Trip) {
  return (
    trip.route_name ||
    [trip.start_point, trip.end_point].filter(Boolean).join(" → ") ||
    trip.route_code ||
    "Route not specified"
  );
}

function money(value?: number) {
  return `LKR ${Number(value || 0).toLocaleString("en-LK", {
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
  return record.odometer_reading ?? record.mileage ?? 0;
}

export default function OperationalStaffFuelRecordsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(
    null
  );
  const [form, setForm] = useState<FuelForm>(emptyForm());

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("srmss_user");

      if (!storedUser) {
        setError("Please log in to access fuel records.");
        setLoading(false);
        return;
      }

      const user = JSON.parse(storedUser);
      const id = Number(user.id);

      if (!Number.isInteger(id) || id <= 0) {
        setError("The logged-in user ID is invalid. Please log in again.");
        setLoading(false);
        return;
      }

      setUserId(id);
    } catch {
      setError("Unable to read your login information.");
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (userId === null) return;

    try {
      setLoading(true);
      setError("");

      const [tripResponse, fuelResponse] = await Promise.all([
        axios.get(TRIP_API),
        axios.get(FUEL_API),
      ]);

      setTrips(extractArray<Trip>(tripResponse));
      setFuelRecords(extractArray<FuelRecord>(fuelResponse));
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to load fuel records. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId !== null) {
      loadData();
    }
  }, [userId, loadData]);

  // Frontend filtering is for display only.
  // Enforce record ownership in the backend as well.
  const myTrips = useMemo(
    () =>
      trips.filter(
        (trip) => Number(trip.staff_id) === userId
      ),
    [trips, userId]
  );

  const myRecords = useMemo(() => {
    return fuelRecords
      .filter(
        (record) =>
          Number(record.staff_id ?? record.recorded_by) === userId
      )
      .sort(
        (a, b) =>
          new Date(recordDate(b) || 0).getTime() -
          new Date(recordDate(a) || 0).getTime()
      );
  }, [fuelRecords, userId]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return myRecords;

    return myRecords.filter((record) =>
      [
        record.trip_no,
        record.registration_no,
        record.fuel_type,
        record.notes,
        String(record.bus_id),
        String(record.trip_id ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [myRecords, search]);

  const totalLiters = myRecords.reduce(
    (sum, record) => sum + recordLiters(record),
    0
  );

  const totalCost = myRecords.reduce(
    (sum, record) => sum + recordCost(record),
    0
  );

  const openAddModal = (trip?: Trip) => {
    setError("");
    setSuccess("");
    setEditingRecord(null);

    setForm({
      ...emptyForm(),
      trip_id: trip ? String(trip.id) : "",
      bus_id: trip?.bus_id ? String(trip.bus_id) : "",
    });

    setModalOpen(true);
  };

  const openEditModal = (record: FuelRecord) => {
    setError("");
    setSuccess("");
    setEditingRecord(record);

    setForm({
      trip_id: record.trip_id ? String(record.trip_id) : "",
      bus_id: String(record.bus_id || ""),
      fuel_type: record.fuel_type || "DIESEL",
      quantity_liters: String(recordLiters(record) || ""),
      unit_price: String(
        record.unit_price ??
          (recordLiters(record) > 0
            ? recordCost(record) / recordLiters(record)
            : "")
      ),
      odometer_reading: String(recordMileage(record) || ""),
      fuel_date: recordDate(record).slice(0, 10) || today(),
      notes: record.notes || "",
    });

    setModalOpen(true);
  };

  const handleTripChange = (tripId: string) => {
    const trip = myTrips.find((item) => item.id === Number(tripId));

    setForm((previous) => ({
      ...previous,
      trip_id: tripId,
      bus_id: trip?.bus_id ? String(trip.bus_id) : "",
    }));
  };

  const submitFuel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.bus_id || !form.fuel_date || !form.quantity_liters) {
      setError("Bus, fuel quantity and fuel date are required.");
      return;
    }

    const busId = Number(form.bus_id);
    const quantity = Number(form.quantity_liters);
    const unitPrice = Number(form.unit_price || 0);
    const odometer = Number(form.odometer_reading || 0);

    if (!Number.isInteger(busId) || busId <= 0) {
      setError("Enter a valid bus ID.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Fuel quantity must be greater than zero.");
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("Unit price cannot be negative.");
      return;
    }

    if (!Number.isFinite(odometer) || odometer < 0) {
      setError("Odometer reading cannot be negative.");
      return;
    }

    if (userId === null) {
      setError("Your login session could not be identified.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        trip_id: form.trip_id ? Number(form.trip_id) : null,
        bus_id: busId,
        staff_id: userId,
        fuel_type: form.fuel_type,
        fuel_date: form.fuel_date,
        quantity_liters: quantity,
        unit_price: unitPrice,
        total_cost: Number((quantity * unitPrice).toFixed(2)),
        odometer_reading: odometer,
        notes: form.notes.trim() || null,
      };

      if (editingRecord) {
        await axios.put(
          `${FUEL_API}/${editingRecord.id}`,
          payload
        );
        setSuccess("Fuel record updated successfully.");
      } else {
        await axios.post(FUEL_API, payload);
        setSuccess("Fuel record created successfully.");
      }

      setModalOpen(false);
      setEditingRecord(null);
      setForm(emptyForm());

      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Failed to save fuel record. Please check the backend."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <OperationalSidebar
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
              Operational Staff
            </p>
            <p className="font-semibold text-slate-800">
              SRMSS Management Portal
            </p>
          </div>
           <button
                         onClick={loadData}
              disabled={loading || userId === null}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
         

              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Fuel Records
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Record and monitor fuel usage for operational vehicles.
                </p>
              </div>
            </div>

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

          {success && !modalOpen && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <FiCheckCircle />
              {success}
              <button
                type="button"
                onClick={() => setSuccess("")}
                className="ml-auto"
                aria-label="Dismiss success message"
              >
                <FiX />
              </button>
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              title="Fuel Records"
              value={String(myRecords.length)}
              icon={<FiDroplet />}
              color="blue"
            />

            <StatCard
              title="Total Fuel"
              value={`${totalLiters.toLocaleString("en-LK", {
                maximumFractionDigits: 2,
              })} L`}
              icon={<FiDroplet />}
              color="green"
            />

            <StatCard
              title="Total Cost"
              value={money(totalCost)}
              icon={<FiDollarSign />}
              color="red"
            />
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search trip, bus, fuel type or notes..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <button
              type="button"
              onClick={() => openAddModal()}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              <FiPlus size={18} />
              Add Fuel Record
            </button>
          </div>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-bold text-slate-900">
                Fuel History
              </h2>
              <p className="text-xs text-slate-500">
                {filteredRecords.length} record(s)
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-3 p-14 text-sm text-slate-500">
                <FiLoader className="animate-spin" size={20} />
                Loading fuel records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <FiDroplet size={25} />
                </div>
                <p className="font-semibold text-slate-800">
                  No fuel records found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Add a fuel record or change your search.
                </p>
                <button
                  type="button"
                  onClick={() => openAddModal()}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <FiPlus />
                  Add Fuel Record
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[950px] w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Fuel Date",
                        "Trip",
                        "Vehicle",
                        "Fuel Type",
                        "Quantity",
                        "Unit Price",
                        "Total Cost",
                        "Action",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className={`whitespace-nowrap px-5 py-4 font-semibold text-slate-600 ${
                            heading === "Action"
                              ? "text-right"
                              : "text-left"
                          }`}
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
                          <p className="font-semibold text-slate-900">
                            {record.trip_no ||
                              (record.trip_id
                                ? `Trip #${record.trip_id}`
                                : "Not linked")}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <FiTruck className="text-slate-400" />
                            <span className="font-medium text-slate-800">
                              {record.registration_no ||
                                `Bus #${record.bus_id}`}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {record.fuel_type || "DIESEL"}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                          {recordLiters(record).toLocaleString("en-LK", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          L
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {money(record.unit_price)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                          {money(recordCost(record))}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <FiEdit2 />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <form
            onSubmit={submitFuel}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingRecord ? "Edit Fuel Record" : "Add Fuel Record"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the vehicle fuel details below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close modal"
              >
                <FiX size={20} />
              </button>
            </div>

            {success && (
              <div className="mx-5 mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Trip (optional)
                </label>
                <select
                  value={form.trip_id}
                  onChange={(event) => handleTripChange(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-red-500"
                >
                  <option value="">No trip linked</option>
                  {myTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {tripNumber(trip)} — {tripRoute(trip)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Only trips returned for your staff ID appear here.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Bus ID *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.bus_id}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      bus_id: event.target.value,
                      trip_id: "",
                    }))
                  }
                  placeholder="Enter bus ID"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Selecting a trip fills its bus ID automatically.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Fuel Type *
                </label>
                <select
                  required
                  value={form.fuel_type}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      fuel_type: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-red-500"
                >
                  <option value="DIESEL">Diesel</option>
                  <option value="PETROL">Petrol</option>
                  <option value="ELECTRIC">Electric</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Fuel Date *
                </label>
                <input
                  type="date"
                  required
                  max={today()}
                  value={form.fuel_date}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      fuel_date: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Quantity (Liters) *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={form.quantity_liters}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      quantity_liters: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Unit Price (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      unit_price: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Odometer Reading (km)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.odometer_reading}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      odometer_reading: event.target.value,
                    }))
                  }
                  placeholder="Current mileage"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Calculated Total Cost
                </label>
                <div className="flex min-h-[46px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-900">
                  {money(
                    Number(form.quantity_liters || 0) *
                      Number(form.unit_price || 0)
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Enter fuel or vehicle observations..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <FiCheckCircle />
                )}
                {saving
                  ? "Saving..."
                  : editingRecord
                    ? "Update Record"
                    : "Save Record"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "red";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${styles[color]}`}
      >
        {icon}
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 break-words text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}