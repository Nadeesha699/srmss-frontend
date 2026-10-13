
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FiBarChart2,
  FiTrendingUp,
  FiTruck,
  FiMap,
  FiDownload,
  FiCalendar,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiMenu,
  FiX,
  FiFileText,
  FiRefreshCw,
  FiAlertCircle,
  FiActivity,
} from "react-icons/fi";

import { AdminSidebar } from "@/components/SideNavBar/AdminSideNavBar";

const API = "http://localhost:5000/api";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100";

type ReportType =
  | "Trip Performance Report"
  | "Route Performance Report"
  | "Vehicle Utilization Report"
  | "Operational Staff Performance Report"
  | "Maintenance Report";

type Trip = {
  id: number;
  schedule_id?: number;
  assignment_id?: number;
  route_id?: number;
  route_code?: string;
  route_name?: string;
  bus_id?: number;
  registration_no?: string;
  staff_id?: number;
  staff_name?: string;
  driver_id?: number;
  driver_name?: string;
  status?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  scheduled_departure?: string;
  scheduled_arrival?: string;
  delay_minutes?: number;
  created_at?: string;
};

type Route = {
  id: number;
  route_code?: string;
  name?: string;
  route_name?: string;
  status?: string;
};

type Bus = {
  id: number;
  registration_no?: string;
  status?: string;
};

type User = {
  id: number;
  name?: string;
  role?: string;
  status?: string;
};

type Maintenance = {
  id: number;
  bus_id?: number;
  status?: string;
  maintenance_date?: string;
  created_at?: string;
};

type RouteReport = {
  route: string;
  trips: number;
  completed: number;
  delayed: number;
  onTimeRate: number;
};

const REPORT_TYPES: ReportType[] = [
  "Trip Performance Report",
  "Route Performance Report",
  "Vehicle Utilization Report",
  "Operational Staff Performance Report",
  "Maintenance Report",
];

const normaliseList = <T,>(response: any): T[] => {
  const data = response?.data?.data ?? response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const upper = (value?: string) => String(value ?? "").toUpperCase();

const isCompleted = (trip: Trip) =>
  ["COMPLETED", "COMPLETE", "FINISHED"].includes(upper(trip.status));

const isDelayed = (trip: Trip) =>
  Number(trip.delay_minutes ?? 0) > 0 ||
  ["DELAYED", "LATE"].includes(upper(trip.status));

const getTripDate = (trip: Trip) =>
  trip.actual_start_time ||
  trip.scheduled_departure ||
  trip.created_at ||
  "";

function formatDate(date: string) {
  if (!date) return "N/A";
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDefaultDates() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);

  const iso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;

  return { from: iso(first), to: iso(today) };
}

export default function ReportsPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reportType, setReportType] = useState<ReportType>(
    "Trip Performance Report"
  );
  const [dates] = useState(getDefaultDates);
  const [fromDate, setFromDate] = useState(dates.from);
  const [toDate, setToDate] = useState(dates.to);
  const [generatedReport, setGeneratedReport] = useState("");
  const [reporting, setReporting] = useState(false);

  const loadReportsData = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const endpoints = [
        `${API}/trips`,
        `${API}/routes`,
        `${API}/buses`,
        `${API}/users`,
        `${API}/maintenance`,
      ];

      const results = await Promise.allSettled(
        endpoints.map((url) => axios.get(url))
      );

      const setters = [
        setTrips,
        setRoutes,
        setBuses,
        setUsers,
        setMaintenance,
      ];

      const names = ["trips", "routes", "buses", "users", "maintenance"];
      let failed = 0;

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          setters[index](normaliseList<any>(result.value));
        } else {
          failed++;
          console.error(`Failed to load ${names[index]}:`, result.reason);
        }
      });

      if (failed === results.length) {
        setError(
          "Unable to load report data. Check that your Express backend is running."
        );
      } else if (failed > 0) {
        setError(
          `${failed} data source(s) could not be loaded. Some reports may be incomplete.`
        );
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load report data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReportsData();
  }, [loadReportsData]);

  const filteredTrips = useMemo(() => {
    if (!fromDate || !toDate || fromDate > toDate) return [];

    return trips.filter((trip) => {
      const date = getTripDate(trip).slice(0, 10);
      return date && date >= fromDate && date <= toDate;
    });
  }, [trips, fromDate, toDate]);

  const totalTrips = filteredTrips.length;
  const completedTrips = filteredTrips.filter(isCompleted).length;
  const delayedTrips = filteredTrips.filter(isDelayed).length;

  const onTimeTrips = filteredTrips.filter(
    (trip) => isCompleted(trip) && !isDelayed(trip)
  ).length;

  const onTimeRate =
    completedTrips > 0
      ? Math.round((onTimeTrips / completedTrips) * 100)
      : 0;

  const activeBuses = buses.filter((bus) =>
    ["ACTIVE", "AVAILABLE", "IN_SERVICE", "ASSIGNED"].includes(
      upper(bus.status)
    )
  ).length;

  const availableBuses = buses.filter((bus) =>
    ["AVAILABLE", "ACTIVE"].includes(upper(bus.status))
  ).length;

  const maintenanceBuses = buses.filter((bus) =>
    ["MAINTENANCE", "UNDER_MAINTENANCE"].includes(upper(bus.status))
  ).length;

  const vehicleUtilization =
    buses.length > 0
      ? Math.round((activeBuses / buses.length) * 100)
      : 0;

  const operationalStaff = users.filter((user) =>
    ["OPERATIONAL_STAFF", "OPERATIONAL STAFF", "STAFF"].includes(
      upper(user.role)
    )
  );

  const activeOperationalStaff = operationalStaff.filter((user) =>
    ["ACTIVE", "AVAILABLE"].includes(upper(user.status))
  ).length;

  const activeRoutes = routes.filter(
    (route) => !route.status || upper(route.status) === "ACTIVE"
  ).length;

  const routeReports = useMemo<RouteReport[]>(() => {
    return routes.map((route) => {
      const routeTrips = filteredTrips.filter(
        (trip) =>
          (trip.route_id != null &&
            Number(trip.route_id) === Number(route.id)) ||
          (trip.route_code != null &&
            route.route_code != null &&
            trip.route_code === route.route_code)
      );

      const completed = routeTrips.filter(isCompleted).length;
      const delayed = routeTrips.filter(isDelayed).length;
      const onTime = routeTrips.filter(
        (trip) => isCompleted(trip) && !isDelayed(trip)
      ).length;

      return {
        route: `${route.route_code || `Route ${route.id}`} - ${
          route.name || route.route_name || "Unnamed Route"
        }`,
        trips: routeTrips.length,
        completed,
        delayed,
        onTimeRate:
          completed > 0 ? Math.round((onTime / completed) * 100) : 0,
      };
    });
  }, [routes, filteredTrips]);

  const weeklyTrips = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return days.map((day, index) => {
      const matching = filteredTrips.filter((trip) => {
        const date = getTripDate(trip);
        if (!date) return false;

        const weekday = new Date(date).getDay();
        return (weekday + 6) % 7 === index;
      });

      return {
        day,
        completed: matching.filter(isCompleted).length,
        delayed: matching.filter(isDelayed).length,
      };
    });
  }, [filteredTrips]);

  const generateReport = () => {
    if (!fromDate || !toDate) {
      alert("Please select both reporting dates.");
      return;
    }

    if (fromDate > toDate) {
      alert("The start date cannot be later than the end date.");
      return;
    }

    if (loading || refreshing || reporting) {
      alert("Please wait until report data has finished loading.");
      return;
    }

    setReporting(true);

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const red: [number, number, number] = [185, 28, 28];
      const dark: [number, number, number] = [20, 27, 43];
      const gray: [number, number, number] = [100, 116, 139];

      let columns: string[] = [];
      let rows: (string | number)[][] = [];
      let metrics: { label: string; value: string }[] = [];
      let description = "";

      switch (reportType) {
        case "Trip Performance Report":
          description = "Trip completion, delays and service reliability";
          metrics = [
            { label: "TOTAL TRIPS", value: String(totalTrips) },
            { label: "COMPLETED", value: String(completedTrips) },
            { label: "DELAYED", value: String(delayedTrips) },
            { label: "ON-TIME RATE", value: `${onTimeRate}%` },
          ];
          columns = [
            "Trip ID",
            "Route",
            "Bus",
            "Driver / Staff",
            "Status",
            "Delay (min)",
            "Departure",
            "Arrival",
          ];
          rows = filteredTrips.map((trip) => [
            trip.id,
            trip.route_code || trip.route_name || trip.route_id || "N/A",
            trip.registration_no || trip.bus_id || "N/A",
            trip.driver_name || trip.staff_name || "N/A",
            trip.status || "N/A",
            Number(trip.delay_minutes || 0),
            trip.actual_start_time || trip.scheduled_departure || "N/A",
            trip.actual_end_time || trip.scheduled_arrival || "N/A",
          ]);
          break;

        case "Route Performance Report":
          description = "Transport service activity by route";
          metrics = [
            { label: "TOTAL ROUTES", value: String(routes.length) },
            { label: "ACTIVE ROUTES", value: String(activeRoutes) },
            { label: "TOTAL TRIPS", value: String(totalTrips) },
            { label: "ON-TIME RATE", value: `${onTimeRate}%` },
          ];
          columns = [
            "Route",
            "Total Trips",
            "Completed",
            "Delayed",
            "On-Time Rate",
          ];
          rows = routeReports.map((route) => [
            route.route,
            route.trips,
            route.completed,
            route.delayed,
            `${route.onTimeRate}%`,
          ]);
          break;

        case "Vehicle Utilization Report":
          description = "Fleet status and vehicle availability";
          metrics = [
            { label: "TOTAL BUSES", value: String(buses.length) },
            { label: "ACTIVE / ASSIGNED", value: String(activeBuses) },
            { label: "AVAILABLE", value: String(availableBuses) },
            { label: "UTILIZATION", value: `${vehicleUtilization}%` },
          ];
          columns = ["Bus ID", "Registration Number", "Current Status"];
          rows = buses.map((bus) => [
            bus.id,
            bus.registration_no || "N/A",
            bus.status || "N/A",
          ]);
          break;

        case "Operational Staff Performance Report":
          description = "Operational staff account status overview";
          metrics = [
            { label: "TOTAL STAFF", value: String(operationalStaff.length) },
            { label: "ACTIVE STAFF", value: String(activeOperationalStaff) },
            {
              label: "OTHER STATUS",
              value: String(
                operationalStaff.length - activeOperationalStaff
              ),
            },
            {
              label: "COMPLETED TRIPS",
              value: String(completedTrips),
            },
          ];
          columns = ["Staff ID", "Staff Name", "Role", "Account Status"];
          rows = operationalStaff.map((user) => [
            user.id,
            user.name || "N/A",
            user.role || "OPERATIONAL_STAFF",
            user.status || "UNKNOWN",
          ]);
          break;

        case "Maintenance Report":
          description = "Vehicle maintenance record overview";
          metrics = [
            {
              label: "MAINTENANCE RECORDS",
              value: String(maintenance.length),
            },
            {
              label: "BUSES IN MAINTENANCE",
              value: String(maintenanceBuses),
            },
            { label: "TOTAL BUSES", value: String(buses.length) },
            {
              label: "REPORT PERIOD",
              value: `${fromDate} to ${toDate}`,
            },
          ];
          columns = ["Record ID", "Bus Registration", "Status", "Date"];
          rows = maintenance
            .filter((record) => {
              const date = (
                record.maintenance_date ||
                record.created_at ||
                ""
              ).slice(0, 10);

              // Until records have dates, retain them but mark the date N/A.
              return !date || (date >= fromDate && date <= toDate);
            })
            .map((record) => [
              record.id,
              buses.find((bus) => bus.id === record.bus_id)
                ?.registration_no ||
                (record.bus_id ? `Bus ${record.bus_id}` : "N/A"),
              record.status || "N/A",
              record.maintenance_date || record.created_at || "N/A",
            ]);
          metrics[0].value = String(rows.length);
          break;
      }

      const reportId = `SRMSS-${Date.now().toString().slice(-8)}`;
      const generatedAt = new Date().toLocaleString("en-GB");

      // Branded report banner.
      doc.setFillColor(...dark);
      doc.rect(0, 0, pageWidth, 42, "F");
      doc.setFillColor(...red);
      doc.rect(0, 0, 5, 42, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(23);
      doc.text("SRMSS", margin, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      doc.text("SMART ROUTE MANAGEMENT SYSTEM", margin, 22);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text("MANAGEMENT REPORT", pageWidth - margin, 15, {
        align: "right",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(226, 232, 240);
      doc.text(reportId, pageWidth - margin, 22, { align: "right" });

      // Report title and date range.
      doc.setTextColor(...dark);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(reportType, margin, 53);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...gray);
      doc.text(description, margin, 60);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text("REPORTING PERIOD", pageWidth - margin, 51, {
        align: "right",
      });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gray);
      doc.text(
        `${formatDate(fromDate)} - ${formatDate(toDate)}`,
        pageWidth - margin,
        58,
        { align: "right" }
      );

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 65, pageWidth - margin, 65);

      // KPI summary cards.
      const gap = 5;
      const cardWidth =
        (pageWidth - margin * 2 - gap * (metrics.length - 1)) /
        metrics.length;

      metrics.forEach((metric, index) => {
        const x = margin + index * (cardWidth + gap);
        const y = 71;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, cardWidth, 22, 2, 2, "FD");

        doc.setFillColor(...red);
        doc.rect(x, y, 1.5, 22, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...gray);
        doc.text(metric.label, x + 5, y + 7);

        doc.setFontSize(13);
        doc.setTextColor(...dark);
        const value = doc.splitTextToSize(metric.value, cardWidth - 10);
        doc.text(value[0], x + 5, y + 16);
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text("DETAILED RECORDS", margin, 104);

      autoTable(doc, {
        startY: 109,
        head: [columns],
        body:
          rows.length > 0
            ? rows.map((row) => row.map((value) => String(value)))
            : [["No records found for this report."]],
        margin: { left: margin, right: margin, bottom: 19 },
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 3,
          textColor: dark,
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: red,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          cellPadding: 4,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: () => {
          doc.setDrawColor(226, 232, 240);
          doc.line(
            margin,
            pageHeight - 13,
            pageWidth - margin,
            pageHeight - 13
          );

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...gray);
          doc.text("SRMSS | Management Reports", margin, pageHeight - 7);
          doc.text(generatedAt, pageWidth / 2, pageHeight - 7, {
            align: "center",
          });
          doc.text(
            `Page ${doc.getNumberOfPages()}`,
            pageWidth - margin,
            pageHeight - 7,
            { align: "right" }
          );
        },
      });

      const filename = `SRMSS-${reportType
        .toLowerCase()
        .replaceAll(" ", "-")}-${fromDate}-${toDate}.pdf`;

      doc.save(filename);

      setGeneratedReport(
        `${reportType} was generated for ${formatDate(
          fromDate
        )} to ${formatDate(toDate)}.`
      );
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Unable to generate the PDF. Please try again.");
    } finally {
      setReporting(false);
    }
  };

  const exportReport = () => generateReport();

  const maxChartValue = Math.max(
    1,
    ...weeklyTrips.flatMap((day) => [day.completed, day.delayed])
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AdminSidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <main className="flex min-h-screen items-center justify-center lg:pl-72">
          <div className="flex items-center gap-3 text-slate-600">
            <FiRefreshCw className="animate-spin text-red-600" size={22} />
            Loading reports...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
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
          </div>

          <button
            onClick={() => void loadReportsData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
               <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Reports & Analytics
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Review trip performance, fleet utilization, route
                  reliability and operational records.
                </p>
              </div>

            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <FiAlertCircle className="mt-0.5 shrink-0" size={18} />
                <div>
                  <p className="font-semibold">Report data warning</p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-red-50 p-3 text-red-600">
                  <FiCalendar size={21} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">
                    Reporting Period
                  </h2>
                  <p className="text-sm text-slate-500">
                    Choose dates to filter trip and route statistics.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => void loadReportsData(true)}
                    disabled={refreshing}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <FiRefreshCw
                      className={refreshing ? "animate-spin" : ""}
                    />
                    Refresh Data
                  </button>
                </div>
              </div>

              {fromDate && toDate && fromDate > toDate && (
                <p className="mt-3 text-sm text-red-600">
                  Start date cannot be later than end date.
                </p>
              )}
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportCard
                title="Total Trips"
                value={totalTrips.toLocaleString()}
                subtitle="Selected period"
                icon={<FiMap size={20} />}
              />
              <ReportCard
                title="Completed Trips"
                value={completedTrips.toLocaleString()}
                subtitle={`${totalTrips ? Math.round((completedTrips / totalTrips) * 100) : 0}% of all trips`}
                icon={<FiTrendingUp size={20} />}
              />
              <ReportCard
                title="Vehicle Utilization"
                value={`${vehicleUtilization}%`}
                subtitle={`${buses.length} buses in fleet`}
                icon={<FiTruck size={20} />}
              />
              <ReportCard
                title="On-Time Rate"
                value={`${onTimeRate}%`}
                subtitle={`${onTimeTrips} completed on time`}
                icon={<FiBarChart2 size={20} />}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SmallStat
                title="Delayed Trips"
                value={delayedTrips}
                icon={<FiClock />}
                iconClass="bg-amber-50 text-amber-600"
              />
              <SmallStat
                title="Active / Assigned Buses"
                value={activeBuses}
                icon={<FiTruck />}
                iconClass="bg-blue-50 text-blue-600"
              />
              <SmallStat
                title="Operational Staff"
                value={activeOperationalStaff}
                icon={<FiUsers />}
                iconClass="bg-green-50 text-green-600"
              />
              <SmallStat
                title="Active Routes"
                value={activeRoutes}
                icon={<FiCheckCircle />}
                iconClass="bg-red-50 text-red-600"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Weekly Trip Performance
                    </h2>
                    <p className="text-sm text-slate-500">
                      Completed and delayed trips by weekday
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-3 text-red-600">
                    <FiBarChart2 size={21} />
                  </div>
                </div>

                {totalTrips === 0 ? (
                  <div className="flex h-60 items-center justify-center text-sm text-slate-400">
                    No trip records for this reporting period.
                  </div>
                ) : (
                  <div className="flex h-60 items-end gap-2 border-b border-l border-slate-200 px-2 pb-2 pt-4 sm:gap-4">
                    {weeklyTrips.map((item) => (
                      <div
                        key={item.day}
                        className="flex h-full min-w-0 flex-1 flex-col justify-end"
                      >
                        <div className="flex h-full items-end justify-center gap-1">
                          <div
                            className="w-full max-w-7 rounded-t-md bg-red-500"
                            style={{
                              height: `${(item.completed / maxChartValue) * 90}%`,
                              minHeight: item.completed ? 4 : 0,
                            }}
                            title={`${item.completed} completed`}
                          />
                          <div
                            className="w-full max-w-7 rounded-t-md bg-slate-300"
                            style={{
                              height: `${(item.delayed / maxChartValue) * 90}%`,
                              minHeight: item.delayed ? 4 : 0,
                            }}
                            title={`${item.delayed} delayed`}
                          />
                        </div>
                        <span className="mt-3 text-center text-xs text-slate-500">
                          {item.day}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-5 text-xs text-slate-600">
                  <Legend className="bg-red-500" label="Completed" />
                  <Legend className="bg-slate-300" label="Delayed" />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Fleet Overview
                    </h2>
                    <p className="text-sm text-slate-500">
                      Current bus status distribution
                    </p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-3 text-red-600">
                    <FiTruck size={21} />
                  </div>
                </div>

                <div className="space-y-6">
                  <Progress
                    label="Active / Assigned"
                    value={
                      buses.length
                        ? Math.round((activeBuses / buses.length) * 100)
                        : 0
                    }
                  />
                  <Progress
                    label="Available"
                    value={
                      buses.length
                        ? Math.round((availableBuses / buses.length) * 100)
                        : 0
                    }
                  />
                  <Progress
                    label="Maintenance"
                    value={
                      buses.length
                        ? Math.round((maintenanceBuses / buses.length) * 100)
                        : 0
                    }
                  />
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Total buses</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {buses.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">
                      In maintenance
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {maintenanceBuses}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 p-6">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Route Performance
                  </h2>
                  <p className="text-sm text-slate-500">
                    Performance summary for the selected period
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 p-3 text-red-600">
                  <FiMap size={21} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Route",
                        "Total Trips",
                        "Completed",
                        "Delayed",
                        "On-Time Rate",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="p-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routeReports.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-10 text-center text-sm text-slate-400"
                        >
                          No routes available.
                        </td>
                      </tr>
                    ) : (
                      routeReports.map((route) => (
                        <tr key={route.route} className="hover:bg-slate-50">
                          <td className="p-4 font-semibold text-slate-800">
                            {route.route}
                          </td>
                          <td className="p-4 text-slate-600">
                            {route.trips}
                          </td>
                          <td className="p-4 font-semibold text-green-600">
                            {route.completed}
                          </td>
                          <td className="p-4 font-semibold text-amber-600">
                            {route.delayed}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-red-500"
                                  style={{
                                    width: `${route.onTimeRate}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-slate-700">
                                {route.onTimeRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">
                    Generate & Export Reports
                  </h2>
                  <p className="text-sm text-slate-500">
                    Select a report category to create a professional PDF.
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 p-3 text-red-600">
                  <FiFileText size={21} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-3">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) =>
                      setReportType(e.target.value as ReportType)
                    }
                    className={inputClass}
                  >
                    {REPORT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-sm text-slate-500">From</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {formatDate(fromDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">To</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {formatDate(toDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Records in report</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {reportType === "Trip Performance Report"
                      ? filteredTrips.length
                      : reportType === "Route Performance Report"
                        ? routeReports.length
                        : reportType === "Vehicle Utilization Report"
                          ? buses.length
                          : reportType ===
                              "Operational Staff Performance Report"
                            ? operationalStaff.length
                            : maintenance.length}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={generateReport}
                  disabled={reporting || refreshing || fromDate > toDate}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-3"
                >
                  {reporting ? (
                    <FiRefreshCw className="animate-spin" size={18} />
                  ) : (
                    <FiDownload size={18} />
                  )}
                  {reporting
                    ? "Generating PDF..."
                    : "Generate & Download PDF"}
                </button>
              </div>

              {generatedReport && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  <FiCheckCircle className="mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="font-semibold">Report generated</p>
                    <p className="mt-1">{generatedReport}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneratedReport("")}
                    className="ml-auto rounded-lg p-1 hover:bg-green-100"
                    aria-label="Dismiss notification"
                  >
                    <FiX size={17} />
                  </button>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-red-50 p-3 text-red-600">
                  <FiActivity size={21} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">
                    Performance Summary
                  </h2>
                  <p className="text-sm text-slate-500">
                    Operational overview for the selected period
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SummaryItem
                  label="Trip Completion"
                  value={`${totalTrips ? Math.round((completedTrips / totalTrips) * 100) : 0}%`}
                  description="Completed trips divided by all trips"
                  icon={<FiCheckCircle />}
                />
                <SummaryItem
                  label="Fleet Utilization"
                  value={`${vehicleUtilization}%`}
                  description="Active or assigned buses divided by fleet"
                  icon={<FiTruck />}
                />
                <SummaryItem
                  label="Service Reliability"
                  value={`${onTimeRate}%`}
                  description="Completed trips without recorded delays"
                  icon={<FiClock />}
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function ReportCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          {icon}
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          SRMSS
        </span>
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <h3 className="mt-1 text-2xl font-bold text-slate-900">{value}</h3>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function SmallStat({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl p-3 ${iconClass}`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Progress({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const safeValue = Math.max(0, Math.min(value, 100));

  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{safeValue}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-red-500 transition-all"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function Legend({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-sm ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <span className="text-red-600">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
