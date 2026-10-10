"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiActivity,
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiDatabase,
  FiMap,
  FiShield,
  FiTool,
  FiTruck,
  FiUsers,
  FiZap,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE = "http://localhost:5000/api";

const BUS_API = `${API_BASE}/buses/`;
const ROUTE_API = `${API_BASE}/routes/`;
const USER_API = `${API_BASE}/users/`;
const TRIP_API = `${API_BASE}/trips/`;

/* =========================================================
   TYPES
========================================================= */

type DashboardData = {
  buses: number;
  routes: number;
  operationalStaff: number;
  todayTrips: number;
  completedTrips: number;
  performance: number;
};

type ApiListResponse<T> = {
  success?: boolean;
  data?: T[];
};

type Bus = {
  id: number;
  registration_no?: string;
  status?: string;
  depot_id?: number;
};

type Route = {
  id: number;
  route_code?: string;
  route_name?: string;
  status?: string;
};

type User = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

type Trip = {
  id: number;
  trip_no?: string;
  schedule_id?: number;
  service_date?: string;
  trip_date?: string;
  date?: string;
  status?: string;
  created_at?: string;
};

/* =========================================================
   HOME PAGE
========================================================= */

export default function LandingPage() {
  const [dashboard, setDashboard] = useState<DashboardData>({
    buses: 0,
    routes: 0,
    operationalStaff: 0,
    todayTrips: 0,
    completedTrips: 0,
    performance: 0,
  });

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  /* =========================================================
     LOAD DASHBOARD DATA
  ========================================================= */

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setApiError(false);

      const results = await Promise.allSettled([
        axios.get<ApiListResponse<Bus>>(BUS_API),
        axios.get<ApiListResponse<Route>>(ROUTE_API),
        axios.get<ApiListResponse<User>>(USER_API),
        axios.get<ApiListResponse<Trip>>(TRIP_API),
      ]);

      const [busesResult, routesResult, usersResult, tripsResult] = results;

      if (busesResult.status === "fulfilled") {
        console.log("✅ BUSES:", busesResult.value.data);
      } else {
        console.error(
          "❌ BUSES ERROR:",
          busesResult.reason?.response?.data || busesResult.reason,
        );
      }

      if (routesResult.status === "fulfilled") {
        console.log("✅ ROUTES:", routesResult.value.data);
      } else {
        console.error(
          "❌ ROUTES ERROR:",
          routesResult.reason?.response?.data || routesResult.reason,
        );
      }

      if (usersResult.status === "fulfilled") {
        console.log("✅ USERS:", usersResult.value.data);
      } else {
        console.error(
          "❌ USERS ERROR:",
          usersResult.reason?.response?.data || usersResult.reason,
        );
      }

      if (tripsResult.status === "fulfilled") {
        console.log("✅ TRIPS:", tripsResult.value.data);
      } else {
        console.error(
          "❌ TRIPS ERROR:",
          tripsResult.reason?.response?.data || tripsResult.reason,
        );
      }

      const buses =
        busesResult.status === "fulfilled"
          ? busesResult.value.data?.data || []
          : [];

      const routes =
        routesResult.status === "fulfilled"
          ? routesResult.value.data?.data || []
          : [];

      const users =
        usersResult.status === "fulfilled"
          ? usersResult.value.data?.data || []
          : [];

      const trips =
        tripsResult.status === "fulfilled"
          ? tripsResult.value.data?.data || []
          : [];

      console.log(buses);

      /* -------------------------------------------------------
         ACTIVE BUSES
      ------------------------------------------------------- */

      const activeBuses = buses.filter(
        (bus) =>
          bus.status === "ACTIVE" ||
          bus.status === "AVAILABLE" ||
          bus.status === "IN_SERVICE",
      );

      /* -------------------------------------------------------
         ACTIVE ROUTES
      ------------------------------------------------------- */

      const activeRoutes = routes.filter((route) => route.status === "ACTIVE");

      /* -------------------------------------------------------
         OPERATIONAL STAFF
      ------------------------------------------------------- */

      const operationalStaff = users.filter(
        (user) => user.role === "OPERATIONAL_STAFF",
      );

      /* -------------------------------------------------------
         TODAY
      ------------------------------------------------------- */

      const today = new Date();

      const todayString = today.toISOString().split("T")[0];

      const todayTrips = trips.filter((trip) => {
        const tripDate =
          trip.service_date || trip.trip_date || trip.date || trip.created_at;

        if (!tripDate) {
          return false;
        }

        return String(tripDate).substring(0, 10) === todayString;
      });

      /* -------------------------------------------------------
         COMPLETED TRIPS
      ------------------------------------------------------- */

      const completedTrips = todayTrips.filter(
        (trip) => trip.status === "COMPLETED",
      );

      /* -------------------------------------------------------
         PERFORMANCE
      ------------------------------------------------------- */

      const performance =
        todayTrips.length > 0
          ? Math.round((completedTrips.length / todayTrips.length) * 100)
          : 0;

      setDashboard({
        buses: activeBuses.length > 0 ? activeBuses.length : buses.length,

        routes: activeRoutes.length > 0 ? activeRoutes.length : routes.length,

        operationalStaff: operationalStaff.length,

        todayTrips: todayTrips.length,

        completedTrips: completedTrips.length,

        performance,
      });
    } catch (error) {
      console.error("Failed to load SRMSS dashboard data:", error);

      setApiError(true);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     PERFORMANCE LABEL
  ========================================================= */

  const getPerformanceLabel = () => {
    if (loading) {
      return "Loading";
    }

    if (dashboard.performance >= 90) {
      return "Excellent";
    }

    if (dashboard.performance >= 70) {
      return "Good";
    }

    if (dashboard.performance > 0) {
      return "Needs Attention";
    }

    return "No Data";
  };

  const getPerformanceClass = () => {
    if (dashboard.performance >= 90) {
      return "text-green-400";
    }

    if (dashboard.performance >= 70) {
      return "text-yellow-400";
    }

    return "text-red-400";
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* =========================================================
          NAVIGATION
      ========================================================= */}

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          {/* Logo */}

          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-lg font-black text-white shadow-lg shadow-red-100">
              S
            </div>

            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-950">
                SRMSS
              </h1>

              <p className="hidden text-[11px] font-medium text-slate-500 sm:block">
                Smart Route Management & Scheduling
              </p>
            </div>
          </Link>

          {/* Navigation */}

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 transition hover:text-red-600"
            >
              Features
            </a>

            <a
              href="#roles"
              className="text-sm font-medium text-slate-600 transition hover:text-red-600"
            >
              Roles
            </a>

            <a
              href="#benefits"
              className="text-sm font-medium text-slate-600 transition hover:text-red-600"
            >
              Benefits
            </a>
          </nav>

          {/* Login */}

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-100 transition hover:bg-red-700"
          >
            Login
            <FiArrowRight />
          </Link>
        </div>
      </header>

      {/* =========================================================
          API ERROR
      ========================================================= */}

      {apiError && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 text-sm text-amber-800">
              <FiAlertCircle />

              <span>Live system statistics are currently unavailable.</span>
            </div>

            <button
              type="button"
              onClick={loadDashboardData}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
            >
              <FiRefreshCw />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="relative overflow-hidden bg-white">
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-red-50 blur-3xl" />

        <div className="absolute -bottom-40 -left-40 h-[450px] w-[450px] rounded-full bg-slate-100 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
          {/* Hero Content */}

          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Smart Public Transport Management
            </div>

            <h2 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Smarter routes.
              <span className="block text-red-600">Better operations.</span>
            </h2>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
              SRMSS is a centralized transport management platform designed to
              help public transport depots manage routes, schedules, buses,
              operational staff and daily operations from one system.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-7 py-3.5 font-bold text-white shadow-xl shadow-red-200 transition hover:-translate-y-0.5 hover:bg-red-700"
              >
                Login to SRMSS
                <FiArrowRight />
              </Link>

              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Explore Platform
                <FiChevronRight />
              </a>
            </div>

            {/* Trust Points */}

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
              <TrustPoint text="Centralized Management" />

              <TrustPoint text="Role-Based Access" />

              <TrustPoint text="Real-Time Operations" />
            </div>
          </div>

          {/* Dashboard Visual */}

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-red-100/50 blur-2xl" />

            <div className="relative rounded-[2rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-200/80">
              <div className="overflow-hidden rounded-[1.5rem] bg-slate-950">
                {/* Dashboard Header */}

                <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-red-400">
                      SRMSS DASHBOARD
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-white">
                      Depot Overview
                    </h3>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600">
                    <FiActivity className="text-white" />
                  </div>
                </div>

                {/* Stats */}

                <div className="grid grid-cols-2 gap-3 p-5">
                  <DashboardStat
                    value={loading ? "..." : dashboard.buses.toLocaleString()}
                    label="Active Buses"
                    icon={<FiTruck />}
                  />

                  <DashboardStat
                    value={loading ? "..." : dashboard.routes.toLocaleString()}
                    label="Active Routes"
                    icon={<FiMap />}
                  />

                  <DashboardStat
                    value={
                      loading
                        ? "..."
                        : dashboard.operationalStaff.toLocaleString()
                    }
                    label="Operational Staff"
                    icon={<FiUsers />}
                  />

                  <DashboardStat
                    value={
                      loading ? "..." : dashboard.todayTrips.toLocaleString()
                    }
                    label="Today's Trips"
                    icon={<FiClock />}
                  />
                </div>

                {/* Performance */}

                <div className="mx-5 mb-5 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">
                        Operational Performance
                      </p>

                      <p className="mt-1 text-xl font-bold text-white">
                        {loading ? "..." : `${dashboard.performance}%`}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                      <FiBarChart2 className="text-green-400" />
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-700"
                      style={{
                        width: `${dashboard.performance}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-[11px] text-slate-500">
                    <span>{dashboard.completedTrips} completed today</span>

                    <span className={getPerformanceClass()}>
                      {getPerformanceLabel()}
                    </span>
                  </div>
                </div>

                {/* Live Status */}

                <div className="border-t border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />

                    <span className="text-xs font-semibold text-slate-300">
                      System operational
                    </span>

                    <span className="ml-auto text-[10px] text-slate-500">
                      LIVE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          STATISTICS
      ========================================================= */}

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200 sm:grid-cols-4">
          <SystemStat
            value={loading ? "..." : `${dashboard.buses}+`}
            label="Buses Managed"
          />

          <SystemStat
            value={loading ? "..." : `${dashboard.routes}+`}
            label="Active Routes"
          />

          <SystemStat
            value={loading ? "..." : `${dashboard.operationalStaff}+`}
            label="Operational Staff"
          />

          <SystemStat
            value={loading ? "..." : `${dashboard.todayTrips}+`}
            label="Daily Trips"
          />
        </div>
      </section>

      {/* =========================================================
          FEATURES
      ========================================================= */}

      <section id="features" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="CORE PLATFORM"
            title="Everything your depot needs"
            description="SRMSS brings the essential functions of public transport depot management together in one centralized platform."
          />

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<FiUsers />}
              title="User Management"
              description="Manage administrators, supervisors and operational staff using role-based access."
            />

            <Feature
              icon={<FiTruck />}
              title="Fleet Management"
              description="Maintain bus registration, capacity, mileage, availability and operational status."
            />

            <Feature
              icon={<FiUsers />}
              title="Operational Staff Management"
              description="Manage operational staff profiles, availability, assignments and daily operational responsibilities."
            />

            <Feature
              icon={<FiMap />}
              title="Route Planning"
              description="Create routes with starting points, destinations, intermediate stops and distances."
            />

            <Feature
              icon={<FiClock />}
              title="Schedule Management"
              description="Create daily, weekly and monthly schedules while identifying scheduling conflicts."
            />

            <Feature
              icon={<FiActivity />}
              title="Trip Monitoring"
              description="Monitor scheduled, active, delayed and completed trips throughout the day."
            />

            <Feature
              icon={<FiTool />}
              title="Maintenance Management"
              description="Record vehicle maintenance activities, service history, costs and maintenance status."
            />

            <Feature
              icon={<FiZap />}
              title="Fuel Management"
              description="Record fuel consumption, mileage and fuel costs to support better fleet monitoring."
            />

            <Feature
              icon={<FiBarChart2 />}
              title="Reports & Analytics"
              description="View operational statistics and generate useful reports for management decisions."
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================= */}

      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="HOW SRMSS WORKS"
            title="One system. Three operational roles."
            description="Each user receives access to the functions required for their responsibilities."
          />

          <div className="relative mt-16 grid gap-8 md:grid-cols-3">
            <RoleStep
              number="01"
              icon={<FiShield />}
              title="Administrator"
              description="Controls users, fleet, operational staff, routes, schedules and system reports."
            />

            <RoleStep
              number="02"
              icon={<FiActivity />}
              title="Supervisor"
              description="Handles daily scheduling, resource assignments, trip monitoring and operational delays."
            />

            <RoleStep
              number="03"
              icon={<FiTruck />}
              title="Operational Staff"
              description="Views assigned trips, updates trip statuses and records fuel and maintenance."
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          ROLES
      ========================================================= */}

      <section id="roles" className="bg-slate-950 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <p className="font-bold tracking-wide text-red-400">
                ROLE-BASED WORKSPACE
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
                The right tools for every team member.
              </h2>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
                SRMSS separates responsibilities across different user roles so
                each team member can focus on their operational duties while
                maintaining controlled access to the system.
              </p>

              <Link
                href="/login"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 font-bold text-white transition hover:bg-red-700"
              >
                Login to Your Workspace
                <FiArrowRight />
              </Link>
            </div>

            <div className="space-y-4">
              <RoleCard
                icon={<FiShield />}
                title="Administrator"
                items={[
                  "Manage system users",
                  "Manage buses and operational staff",
                  "Create routes and schedules",
                  "View reports",
                ]}
              />

              <RoleCard
                icon={<FiActivity />}
                title="Supervisor"
                items={[
                  "View schedules",
                  "Assign buses and operational staff",
                  "Monitor active trips",
                  "Monitor operational delays",
                ]}
              />

              <RoleCard
                icon={<FiTruck />}
                title="Operational Staff"
                items={[
                  "View assigned trips",
                  "Update trip status",
                  "Report delays",
                  "Record fuel and maintenance",
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BENEFITS
      ========================================================= */}

      <section id="benefits" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="WHY SRMSS"
            title="Built for better depot operations"
            description="The system helps transport organizations improve visibility, coordination and operational efficiency."
          />

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Benefit
              icon={<FiDatabase />}
              title="Centralized Data"
              description="Keep routes, buses, operational staff, schedules and operational records in one place."
            />

            <Benefit
              icon={<FiZap />}
              title="Faster Operations"
              description="Reduce manual work and simplify daily transport management activities."
            />

            <Benefit
              icon={<FiShield />}
              title="Controlled Access"
              description="Give users access only to the functions required for their assigned role."
            />

            <Benefit
              icon={<FiBarChart2 />}
              title="Better Decisions"
              description="Use operational information and reports to support management decisions."
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          CTA
      ========================================================= */}

      <section className="relative overflow-hidden bg-red-600 py-20">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white">
            <FiTruck size={30} />
          </div>

          <h2 className="mt-6 text-4xl font-black text-white md:text-5xl">
            Ready to manage your depot smarter?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-red-100">
            Sign in to SRMSS and access your role-based workspace for efficient
            public transport management.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-bold text-red-600 shadow-xl transition hover:bg-red-50"
          >
            Login to SRMSS
            <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer className="bg-slate-950 py-10">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 font-black text-white">
                S
              </div>

              <div>
                <p className="font-bold text-white">SRMSS</p>

                <p className="text-xs text-slate-500">
                  Smart Route Management and Scheduling System
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-5 text-sm text-slate-500">
              <a href="#features" className="hover:text-white">
                Features
              </a>

              <a href="#roles" className="hover:text-white">
                Roles
              </a>

              <a href="#benefits" className="hover:text-white">
                Benefits
              </a>

              <Link href="/login" className="hover:text-white">
                Login
              </Link>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-6">
            <p className="text-center text-xs text-slate-600">
              © 2026 SRMSS — Smart Route Management and Scheduling System
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* =============================================================
   TRUST POINT
============================================================= */

function TrustPoint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
      <FiCheckCircle className="text-red-600" />
      {text}
    </div>
  );
}

/* =============================================================
   DASHBOARD STAT
============================================================= */

function DashboardStat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-2xl font-black text-white">{value}</p>

        <span className="text-red-400">{icon}</span>
      </div>

      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

/* =============================================================
   SYSTEM STAT
============================================================= */

function SystemStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-4 py-8 text-center sm:px-6">
      <p className="text-3xl font-black text-slate-950">{value}</p>

      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

/* =============================================================
   SECTION HEADING
============================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-bold tracking-wide text-red-600">{eyebrow}</p>

      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
        {title}
      </h2>

      <p className="mt-4 leading-7 text-slate-500">{description}</p>
    </div>
  );
}

/* =============================================================
   FEATURE
============================================================= */

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <div className="mt-5 flex items-center gap-1 text-xs font-bold text-red-600 opacity-0 transition group-hover:opacity-100">
        Learn more
        <FiArrowRight />
      </div>
    </div>
  );
}

/* =============================================================
   ROLE STEP
============================================================= */

function RoleStep({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-2xl text-red-600">
          {icon}
        </div>

        <span className="text-5xl font-black text-slate-100">{number}</span>
      </div>

      <h3 className="mt-7 text-xl font-bold text-slate-900">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}

/* =============================================================
   ROLE CARD
============================================================= */

function RoleCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
          {icon}
        </div>

        <div>
          <h3 className="font-bold text-white">{title}</h3>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm text-slate-400"
              >
                <FiCheckCircle className="shrink-0 text-red-400" />

                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================
   BENEFIT
============================================================= */

function Benefit({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600">
        {icon}
      </div>

      <h3 className="mt-5 font-bold text-slate-900">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
