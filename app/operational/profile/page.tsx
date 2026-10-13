"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
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
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

const API_BASE = "http://localhost:5000/api";
const USER_API = `${API_BASE}/users`;

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

type StoredUser = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
};

export default function OperationalStaffProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const getUserId = () => {
    try {
      const stored = localStorage.getItem("srmss_user");

      if (!stored) {
        return null;
      }

      const user: StoredUser = JSON.parse(stored);

      return user.id;
    } catch {
      return null;
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const userId = getUserId();

      if (!userId) {
        setError("Your login session could not be found.");
        return;
      }

      const response = await axios.get(`${USER_API}/${userId}`);

      const user: UserProfile = response.data?.data || response.data;

      if (!user) {
        throw new Error("User profile was not returned.");
      }

      setProfile(user);

      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    } catch (err: any) {
      console.error("Failed to load profile:", err);

      setError(err?.response?.data?.message || "Failed to load your profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!profile) return;

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email address is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await axios.put(`${USER_API}/${profile.id}`, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });

      const updatedUser: UserProfile = response.data?.data || {
        ...profile,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };

      setProfile(updatedUser);

      setForm({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
      });

      /*
       * Keep the logged-in user information
       * synchronized with the updated profile.
       */
      const stored = localStorage.getItem("srmss_user");

      if (stored) {
        const oldUser = JSON.parse(stored);

        localStorage.setItem(
          "srmss_user",
          JSON.stringify({
            ...oldUser,
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
          }),
        );
      }

      setEditing(false);
      setSuccess("Profile updated successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      console.error("Failed to update profile:", err);

      setError(
        err?.response?.data?.message || "Failed to update your profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;

    setForm({
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
    });

    setEditing(false);
    setError("");
  };

  const handlePasswordChange = async () => {
    if (!profile) return;

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
      setPasswordError("New password must contain at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setChangingPassword(true);

      await axios.put(`${USER_API}/${profile.id}/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordSuccess("Password changed successfully.");

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1200);
    } catch (err: any) {
      console.error("Failed to change password:", err);

      setPasswordError(
        err?.response?.data?.message || "Failed to change password.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const closePasswordModal = () => {
    if (changingPassword) return;

    setShowPasswordModal(false);

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setPasswordError("");
    setPasswordSuccess("");
  };

  const initials = useMemo(() => {
    if (!profile?.name) return "OS";

    const parts = profile.name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [profile?.name]);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-LK", {
        month: "long",
        year: "numeric",
      })
    : "—";

  const lastActivity = profile?.updated_at
    ? new Date(profile.updated_at).toLocaleString("en-LK", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <FiLoader size={30} className="animate-spin text-red-600" />

          <p className="text-sm font-medium text-slate-500">
            Loading your profile...
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
            Unable to Load Profile
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error || "Your profile could not be loaded."}
          </p>

          <button
            type="button"
            onClick={loadProfile}
            className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Try Again
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
              Operational Staff Profile
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your operational staff account and security settings.
            </p>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setError("");
                setSuccess("");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <FiEdit2 size={17} />

              <span className="hidden sm:inline">Edit Profile</span>

              <span className="sm:hidden">Edit</span>
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <FiAlertCircle className="mt-0.5 shrink-0" />

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto shrink-0"
            >
              <FiX />
            </button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <FiCheckCircle />

            <span>{success}</span>
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
                    Operational Staff
                  </span>
                </div>
              </div>

              {/* Account Status */}
              <div
                className={`mt-6 rounded-xl border p-4 ${
                  profile.status === "ACTIVE"
                    ? "border-green-200 bg-green-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ${
                      profile.status === "ACTIVE"
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}
                  >
                    <FiCheckCircle size={19} />
                  </div>

                  <div>
                    <p
                      className={`text-xs font-medium ${
                        profile.status === "ACTIVE"
                          ? "text-green-700"
                          : "text-amber-700"
                      }`}
                    >
                      Account Status
                    </p>

                    <p
                      className={`mt-0.5 text-sm font-bold ${
                        profile.status === "ACTIVE"
                          ? "text-green-800"
                          : "text-amber-800"
                      }`}
                    >
                      {profile.status}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
                <MiniInfo
                  icon={<FiCalendar />}
                  label="Member Since"
                  value={memberSince}
                />

                <MiniInfo
                  icon={<FiActivity />}
                  label="Last Updated"
                  value={lastActivity}
                />

                <MiniInfo
                  icon={<FiShield />}
                  label="Access Level"
                  value="Operational Staff Access"
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
                      Your basic operational staff account information.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <ProfileField
                    label="Full Name"
                    name="name"
                    value={form.name}
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
                    label="Role"
                    name="role"
                    value="Operational Staff"
                    editing={false}
                    onChange={handleChange}
                    icon={<FiShield />}
                  />
                </div>

                {editing && (
                  <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                        <>
                          <FiLoader size={17} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FiSave size={17} />
                          Save Changes
                        </>
                      )}
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
                      Your operational staff role and account permissions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <AccountItem
                  label="Account Role"
                  value="Operational Staff"
                  icon={<FiShield />}
                  iconClass="bg-red-50 text-red-600"
                />

                <AccountItem
                  label="Account Status"
                  value={profile.status}
                  icon={<FiCheckCircle />}
                  iconClass="bg-green-50 text-green-600"
                  valueClass={
                    profile.status === "ACTIVE"
                      ? "text-green-600"
                      : "text-amber-600"
                  }
                />

                <AccountItem
                  label="Access Level"
                  value="Operational Staff Access"
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
                    <h2 className="font-bold text-slate-900">Security</h2>

                    <p className="text-sm text-slate-500">
                      Keep your operational staff account secure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <SecurityItem
                  icon={<FiLock />}
                  title="Password"
                  description="Change your password to keep your operational staff account secure."
                  action="Change Password"
                  onClick={() => {
                    setPasswordError("");
                    setPasswordSuccess("");
                    setShowPasswordModal(true);
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Change Password
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update your account password.
                </p>
              </div>

              <button
                type="button"
                onClick={closePasswordModal}
                disabled={changingPassword}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {passwordError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <FiAlertCircle className="mt-0.5 shrink-0" />

                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <FiCheckCircle />

                  <span>{passwordSuccess}</span>
                </div>
              )}

              <PasswordField
                label="Current Password"
                value={passwordForm.currentPassword}
                show={showCurrentPassword}
                onToggle={() => setShowCurrentPassword((previous) => !previous)}
                onChange={(value) =>
                  setPasswordForm((previous) => ({
                    ...previous,
                    currentPassword: value,
                  }))
                }
              />

              <PasswordField
                label="New Password"
                value={passwordForm.newPassword}
                show={showNewPassword}
                onToggle={() => setShowNewPassword((previous) => !previous)}
                onChange={(value) =>
                  setPasswordForm((previous) => ({
                    ...previous,
                    newPassword: value,
                  }))
                }
              />

              <PasswordField
                label="Confirm New Password"
                value={passwordForm.confirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((previous) => !previous)}
                onChange={(value) =>
                  setPasswordForm((previous) => ({
                    ...previous,
                    confirmPassword: value,
                  }))
                }
              />

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Password requirements
                </p>

                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  <li>• Minimum 8 characters</li>
                  <li>• New passwords must match</li>
                </ul>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={changingPassword}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handlePasswordChange}
                  disabled={changingPassword}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {changingPassword ? (
                    <>
                      <FiLoader size={17} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FiLock size={17} />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   Profile Field
------------------------------------------------------- */

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
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
          <span className="shrink-0 text-slate-400">{icon}</span>

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
          <span className="shrink-0 text-slate-400">{icon}</span>

          <span className="truncate text-sm font-medium text-slate-700">
            {value || "Not provided"}
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------
   Mini Info
------------------------------------------------------- */

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
        <p className="text-xs text-slate-400">{label}</p>

        <p className="truncate text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Account Item
------------------------------------------------------- */

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
          <p className="text-xs font-medium text-slate-400">{label}</p>

          <p className={`mt-1 truncate text-sm font-bold ${valueClass}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   Security Item
------------------------------------------------------- */

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
          <p className="font-semibold text-slate-800">{title}</p>

          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-600 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:text-slate-700"
      >
        {action}
      </button>
    </div>
  );
}

/* -------------------------------------------------------
   Password Field
------------------------------------------------------- */

function PasswordField({
  label,
  value,
  show,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 transition focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100">
        <FiLock className="shrink-0 text-slate-400" />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-sm text-slate-900 outline-none"
          placeholder="Enter password"
        />

        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 text-slate-400 transition hover:text-slate-700"
        >
          {show ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      </div>
    </div>
  );
}
