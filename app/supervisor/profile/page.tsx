
"use client";

import { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiEdit2,
  FiMail,
  FiPhone,
  FiShield,
  FiUser,
  FiSave,
  FiX,
  FiLock,
  FiCheckCircle,
  FiCalendar,
  FiActivity,
  FiKey,
  FiLoader,
  FiAlertCircle,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_URL = "http://localhost:5000/api/users";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  depot_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SupervisorProfilePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<number | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [passwordModal, setPasswordModal] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("srmss_user");

    if (!storedUser) {
      router.push("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (!parsedUser?.id) {
        router.push("/");
        return;
      }

      setUserId(Number(parsedUser.id));
      fetchProfile(Number(parsedUser.id));
    } catch {
      localStorage.removeItem("srmss_user");
      router.push("/");
    }
  }, [router]);

  const fetchProfile = async (id: number) => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/${id}`);

      const data = response.data?.data || response.data;

      if (!data) {
        throw new Error("Supervisor profile was not found.");
      }

      setProfile(data);

      const nameParts = String(data.name || "").trim().split(/\s+/);

      const firstName = nameParts.shift() || "";
      const lastName = nameParts.join(" ");

      setForm({
        firstName,
        lastName,
        email: data.email || "",
        phone: data.phone || "",
      });
    } catch (err: any) {
      console.error("Profile loading error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSave = async () => {
    if (!userId || !profile) return;

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email address is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: fullName,
        email: form.email.trim(),
        phone: form.phone.trim(),
      };

      const response = await axios.put(
        `${API_URL}/${userId}`,
        payload
      );

      const updatedUser =
        response.data?.data ||
        response.data?.user ||
        response.data;

      const newProfile: UserProfile = {
        ...profile,
        ...updatedUser,
        name: updatedUser?.name || fullName,
        email: updatedUser?.email || payload.email,
        phone: updatedUser?.phone || payload.phone,
      };

      setProfile(newProfile);

      const nameParts = fullName.split(/\s+/);

      setForm({
        firstName: nameParts.shift() || "",
        lastName: nameParts.join(" "),
        email: newProfile.email,
        phone: newProfile.phone || "",
      });

      // Keep localStorage user information synchronized.
      const storedUser = localStorage.getItem("srmss_user");

      if (storedUser) {
        const localUser = JSON.parse(storedUser);

        localStorage.setItem(
          "srmss_user",
          JSON.stringify({
            ...localUser,
            id: newProfile.id,
            name: newProfile.name,
            email: newProfile.email,
            phone: newProfile.phone,
            role: newProfile.role,
            status: newProfile.status,
            depot_id: newProfile.depot_id,
          })
        );
      }

      setEditing(false);
    } catch (err: any) {
      console.error("Profile update error:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;

    const nameParts = String(profile.name || "")
      .trim()
      .split(/\s+/);

    setForm({
      firstName: nameParts.shift() || "",
      lastName: nameParts.join(" "),
      email: profile.email || "",
      phone: profile.phone || "",
    });

    setError("");
    setEditing(false);
  };

  const handlePasswordChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPasswordForm({
      ...passwordForm,
      [event.target.name]: event.target.value,
    });
  };

  const handlePasswordSave = async () => {
    if (!userId) return;

    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordError("New password is required.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setPasswordSaving(true);

      await axios.put(
        `${API_URL}/${userId}/password`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }
      );

      setPasswordSuccess(
        "Password changed successfully."
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      console.error("Password update error:", err);

      setPasswordError(
        err?.response?.data?.message ||
          "Unable to change your password."
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleDateString("en-LK", {
      month: "long",
      year: "numeric",
    });
  };

  const formatLastActivity = (date?: string) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleString("en-LK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatRole = (role?: string) => {
    if (!role) return "Supervisor";

    return role
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatStatus = (status?: string) => {
    if (!status) return "Active";

    return status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const isActive =
    profile?.status?.toUpperCase() === "ACTIVE" ||
    profile?.status?.toUpperCase() === "VERIFIED";

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
    : "SU";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <FiLoader
            className="animate-spin text-red-600"
            size={32}
          />
          <p className="text-sm font-medium text-slate-500">
            Loading supervisor profile...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <FiAlertCircle size={24} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Unable to load profile
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error || "Your supervisor profile could not be found."}
          </p>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-red-600"
            >
              <FiArrowLeft size={17} />
              Back
            </button>

            <h1 className="text-2xl font-bold text-slate-950">
              Supervisor Profile
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your supervisor account and security settings.
            </p>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setEditing(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <FiEdit2 size={17} />

              <span className="hidden sm:inline">
                Edit Profile
              </span>

              <span className="sm:hidden">
                Edit
              </span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <FiAlertCircle
              className="mt-0.5 shrink-0"
              size={19}
            />

            <p className="text-sm font-medium">
              {error}
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left Profile Card */}
          <div className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-24 bg-gradient-to-br from-red-800 via-red-700 to-red-500" />

            <div className="px-6 pb-6">
              {/* Avatar */}
              <div className="-mt-12 flex justify-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-red-50 text-3xl font-bold text-red-600 shadow-md">
                  {initials}
                </div>
              </div>

              {/* Name */}
              <div className="mt-4 text-center">
                <h2 className="text-xl font-bold text-slate-900">
                  {profile.name}
                </h2>

                <p className="mt-1 break-all text-sm text-slate-500">
                  {profile.email}
                </p>

                <div className="mt-3 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                    <FiShield size={13} />
                    {formatRole(profile.role)}
                  </span>
                </div>
              </div>

              {/* Account Status */}
              <div
                className={`mt-6 rounded-xl border p-4 ${
                  isActive
                    ? "border-green-200 bg-green-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ${
                      isActive
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}
                  >
                    <FiCheckCircle size={19} />
                  </div>

                  <div>
                    <p
                      className={`text-xs font-medium ${
                        isActive
                          ? "text-green-700"
                          : "text-amber-700"
                      }`}
                    >
                      Account Status
                    </p>

                    <p
                      className={`mt-0.5 text-sm font-bold ${
                        isActive
                          ? "text-green-800"
                          : "text-amber-800"
                      }`}
                    >
                      {formatStatus(profile.status)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
                <MiniInfo
                  icon={<FiCalendar />}
                  label="Member Since"
                  value={formatDate(profile.created_at)}
                />

                <MiniInfo
                  icon={<FiActivity />}
                  label="Last Activity"
                  value={formatLastActivity(profile.updated_at)}
                />

                <MiniInfo
                  icon={<FiShield />}
                  label="Access Level"
                  value="Supervisor Access"
                />
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="space-y-6">
            {/* Personal Information */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <FiUser size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Personal Information
                    </h2>

                    <p className="text-sm text-slate-500">
                      Your basic supervisor account information.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <ProfileField
                    label="First Name"
                    name="firstName"
                    value={form.firstName}
                    editing={editing}
                    onChange={handleChange}
                    icon={<FiUser />}
                  />

                  <ProfileField
                    label="Last Name"
                    name="lastName"
                    value={form.lastName}
                    editing={editing}
                    onChange={handleChange}
                    icon={<FiUser />}
                  />

                  <ProfileField
                    label="Email Address"
                    name="email"
                    value={form.email}
                    editing={editing}
                    onChange={handleChange}
                    icon={<FiMail />}
                    type="email"
                  />

                  <ProfileField
                    label="Phone Number"
                    name="phone"
                    value={form.phone}
                    editing={editing}
                    onChange={handleChange}
                    icon={<FiPhone />}
                  />
                </div>

                {editing && (
                  <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiX size={17} />
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <FiLoader
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <FiSave size={17} />
                      )}

                      {saving
                        ? "Saving..."
                        : "Save Changes"}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Account Information */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FiShield size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Account Information
                    </h2>

                    <p className="text-sm text-slate-500">
                      Your supervisor role and account permissions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <AccountItem
                  label="Account Role"
                  value={formatRole(profile.role)}
                  icon={<FiShield />}
                  iconClass="bg-red-50 text-red-600"
                />

                <AccountItem
                  label="Account Status"
                  value={formatStatus(profile.status)}
                  icon={<FiCheckCircle />}
                  iconClass="bg-green-50 text-green-600"
                  valueClass={
                    isActive
                      ? "text-green-600"
                      : "text-amber-600"
                  }
                />

                <AccountItem
                  label="Access Level"
                  value="Supervisor Access"
                  icon={<FiKey />}
                  iconClass="bg-blue-50 text-blue-600"
                />

                <AccountItem
                  label="Authentication"
                  value="Password Protected"
                  icon={<FiLock />}
                  iconClass="bg-slate-100 text-slate-600"
                />
              </div>
            </section>

            {/* Security */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <FiLock size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-900">
                      Security
                    </h2>

                    <p className="text-sm text-slate-500">
                      Keep your supervisor account secure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <SecurityItem
                  icon={<FiLock />}
                  title="Password"
                  description="Change your password to keep your supervisor account secure."
                  action="Change Password"
                  onClick={() => {
                    setPasswordError("");
                    setPasswordSuccess("");
                    setPasswordModal(true);
                  }}
                />

                <SecurityItem
                  icon={<FiShield />}
                  title="Login Security"
                  description="Your account is protected with password authentication."
                  action="Protected"
                  disabled
                />
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Password Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Change Password
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update your supervisor account password.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPasswordModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {passwordError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <FiAlertCircle className="mt-0.5 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  <FiCheckCircle className="mt-0.5 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <PasswordField
                label="Current Password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
              />

              <PasswordField
                label="New Password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
              />

              <PasswordField
                label="Confirm New Password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
              />

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModal(false);
                    setPasswordError("");
                    setPasswordSuccess("");
                  }}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handlePasswordSave}
                  disabled={passwordSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passwordSaving && (
                    <FiLoader
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {passwordSaving
                    ? "Updating..."
                    : "Change Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile Field                                                               */
/* -------------------------------------------------------------------------- */

function ProfileField({
  label,
  name,
  value,
  editing,
  onChange,
  icon,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  editing: boolean;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  icon: React.ReactNode;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {editing ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 transition focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100">
          <span className="shrink-0 text-slate-400">
            {icon}
          </span>

          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-transparent text-sm text-slate-900 outline-none"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="shrink-0 text-slate-400">
            {icon}
          </span>

          <span className="truncate text-sm font-medium text-slate-700">
            {value || "Not provided"}
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mini Info                                                                   */
/* -------------------------------------------------------------------------- */

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="truncate text-sm font-semibold text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Account Item                                                                */
/* -------------------------------------------------------------------------- */

function AccountItem({
  label,
  value,
  icon,
  iconClass,
  valueClass = "text-slate-800",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconClass: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">
            {label}
          </p>

          <p
            className={`mt-1 truncate text-sm font-bold ${valueClass}`}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Security Item                                                               */
/* -------------------------------------------------------------------------- */

function SecurityItem({
  icon,
  title,
  description,
  action,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
          {icon}
        </div>

        <div>
          <p className="font-semibold text-slate-800">
            {title}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-600 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:text-slate-700"
      >
        {action}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Password Field                                                              */
/* -------------------------------------------------------------------------- */

function PasswordField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 transition focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100">
        <FiLock
          size={17}
          className="shrink-0 text-slate-400"
        />

        <input
          type="password"
          name={name}
          value={value}
          onChange={onChange}
          className="w-full bg-transparent text-sm text-slate-900 outline-none"
          placeholder="Enter password"
        />
      </div>
    </div>
  );
}

