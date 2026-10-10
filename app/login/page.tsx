"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
  FiTruck,
  FiUsers,
  FiAlertCircle,
  FiArrowRight,
} from "react-icons/fi";
import { ToastContainer, toast } from 'react-toastify';
import { login } from "@/services/authServices";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await login({email,password})

      const data = response.data;

      /*
       * Expected backend response:
       *
       * {
       *   token: "...",
       *   user: {
       *     id: 1,
       *     name: "John",
       *     email: "john@srmss.com",
       *     role: "ADMIN"
       *   }
       * }
       */

      const token = data.token;
      const user = data.user;

      if (!user || !user.role) {
        throw new Error("Invalid login response.");
      }

      // Store authentication information
      localStorage.setItem(
        "srmss_user",
        JSON.stringify(user)
      );

      if (token) {
        localStorage.setItem("srmss_token", token);
      }


      switch (user.role) {
        case "ADMIN":
          toast.success("Login Successfull")
          router.push("/admin/dashboard");
          break;

        case "SUPERVISOR":
          toast.success("Login Successfull")
          router.push("/supervisor/dashboard");
          break;

        case "OPERATIONAL_STAFF":
          toast.success("Login Successfull")
          router.push("/operational/dashboard");
          break;

        default:
          setError("Your account does not have a valid system role.");
          localStorage.removeItem("srmss_user");
          localStorage.removeItem("srmss_token");
      }
    } catch (err: any) {
      console.error("Login error:", err);

      if (err.response) {
        setError(
          err.response.data?.message ||
            err.response.data?.error ||
            "Invalid email or password."
        );
      } else {
        setError(
          "Unable to connect to the SRMSS server. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        {/* =====================================================
            LEFT SIDE
        ===================================================== */}
        <div className="relative hidden overflow-hidden bg-slate-950 p-12 lg:flex lg:w-[52%] lg:flex-col lg:justify-between">
          {/* Background decorations */}
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />

          {/* Logo */}
          <Link
            href="/"
            className="relative z-10 flex w-fit items-center gap-3 text-white"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-lg font-black shadow-lg shadow-red-950">
              S
            </div>

            <div>
              <p className="text-lg font-black tracking-tight">
                SRMSS
              </p>

              <p className="text-xs text-slate-400">
                Smart Route Management
              </p>
            </div>
          </Link>

          {/* Main message */}
          <div className="relative z-10 max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400">
              <FiShield />
              Secure Transport Management
            </div>

            <h1 className="text-5xl font-black leading-tight text-white">
              One platform.
              <span className="block text-red-500">
                Every transport operation.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
              Manage routes, schedules, buses, drivers and daily
              depot operations through a secure role-based
              workspace.
            </p>

            {/* Role indicators */}
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              <RoleBadge
                icon={<FiShield />}
                label="Administrator"
              />

              <RoleBadge
                icon={<FiUsers />}
                label="Supervisor"
              />

              <RoleBadge
                icon={<FiTruck />}
                label="Operations"
              />
            </div>
          </div>

          {/* Footer */}
          <p className="relative z-10 text-sm text-slate-600">
            Secure access for authorized SRMSS personnel only.
          </p>
        </div>

        {/* =====================================================
            LOGIN SIDE
        ===================================================== */}
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            {/* Back */}
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-red-600"
            >
              <FiArrowLeft />
              Back to home
            </Link>

            {/* Login card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9">
              {/* Header */}
              <div className="mb-8">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl font-black text-red-600">
                  S
                </div>

                <p className="text-sm font-bold uppercase tracking-wider text-red-600">
                  SRMSS SYSTEM
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to access your SRMSS workspace.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <FiAlertCircle className="mt-0.5 shrink-0 text-red-600" />

                  <p className="text-sm leading-5 text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email Address
                  </label>

                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="Enter your email"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Password
                  </label>

                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-500">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) =>
                        setRememberMe(e.target.checked)
                      }
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />

                    Remember me
                  </label>

                  <button
                    type="button"
                    className="font-bold text-red-600 transition hover:text-red-700"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 font-bold text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <FiArrowRight />
                    </>
                  )}
                </button>
              </form>

              {/* Role information */}
              <div className="mt-7 border-t border-slate-100 pt-6">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                  One login for all SRMSS users
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <SmallRole
                    icon={<FiShield />}
                    label="Admin"
                  />

                  <SmallRole
                    icon={<FiUsers />}
                    label="Supervisor"
                  />

                  <SmallRole
                    icon={<FiTruck />}
                    label="Staff"
                  />
                </div>
              </div>
            </div>

            {/* Bottom text */}
            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              Authorized users will automatically be redirected
              to their assigned workspace after login.
            </p>
          </div>
        </div>
      </div>
      <ToastContainer/>
    </main>
  );
}


function RoleBadge({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2">
        <span className="text-red-400">{icon}</span>

        <span className="text-xs font-semibold text-slate-300">
          {label}
        </span>
      </div>
    </div>
  );
}



function SmallRole({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 py-3 text-center">
      <span className="text-red-600">{icon}</span>

      <span className="text-[11px] font-semibold text-slate-600">
        {label}
      </span>
    </div>
  );
}