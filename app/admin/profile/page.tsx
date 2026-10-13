"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiArrowLeft,
  FiEdit2,
  FiMail,
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
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5000/api/users";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "SUPERVISOR" | "OPERATIONAL_STAFF" | string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
  created_at: string;
  updated_at?: string;
};

type ProfileForm = {
  name: string;
  email: string;
};

export default function AdminProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
  });

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /*
   * Load logged-in admin
   */
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const storedUser = localStorage.getItem("srmss_user");

      if (!storedUser) {
        router.push("/login");
        return;
      }

      const user = JSON.parse(storedUser);

      if (!user?.id) {
        setError("Logged-in user information is missing.");
        return;
      }

      const response = await axios.get(`${API_URL}/${user.id}`);

      const data = response.data?.data || response.data;

      setProfile(data);

      setForm({
        name: data.name || "",
        email: data.email || "",
      });
    } catch (err: any) {
      console.error("Failed to load profile:", err);

      setError(err.response?.data?.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * Handle form changes
   */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /*
   * Save profile
   */
  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!form.name.trim()) {
        setError("Name is required.");
        return;
      }

      if (!form.email.trim()) {
        setError("Email address is required.");
        return;
      }

      const response = await axios.put(`${API_URL}/profile/${profile.id}`, {
        name: form.name.trim(),
        email: form.email.trim(),
      });

      const updatedUser = response.data?.data || response.data;

      setProfile(updatedUser);

      setForm({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
      });

      /*
       * Keep localStorage user information synchronized.
       */
      const storedUser = localStorage.getItem("srmss_user");

      if (storedUser) {
        const localUser = JSON.parse(storedUser);

        localStorage.setItem(
          "srmss_user",
          JSON.stringify({
            ...localUser,
            ...updatedUser,
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

      setError(err.response?.data?.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  /*
   * Cancel editing
   */
  const handleCancel = () => {
    if (!profile) return;

    setForm({
      name: profile.name || "",
      email: profile.email || "",
    });

    setEditing(false);
    setError("");
  };

  /*
   * Password form
   */
  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /*
   * Change password
   */
  const handleChangePassword = async () => {
    if (!profile) return;

    try {
      setChangingPassword(true);
      setError("");
      setSuccess("");

      if (!passwordForm.currentPassword) {
        setError("Enter your current password.");
        return;
      }

      if (!passwordForm.newPassword) {
        setError("Enter a new password.");
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        setError("New password must contain at least 8 characters.");
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError("New passwords do not match.");
        return;
      }

      await axios.put(`${API_URL}/${profile.id}/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPasswordForm(false);

      setSuccess("Password changed successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      console.error("Password change failed:", err);

      setError(err.response?.data?.message || "Unable to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  /*
   * Helpers
   */
  const getInitials = (name: string) => {
    if (!name) return "A";

    const parts = name.trim().split(" ");

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(
      0,
    )}`.toUpperCase();
  };

  const formatRole = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Administrator";

      case "SUPERVISOR":
        return "Supervisor";

      case "OPERATIONAL_STAFF":
        return "Operational Staff";

      default:
        return role
          ?.replaceAll("_", " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleDateString("en-LK", {
      month: "long",
      year: "numeric",
    });
  };

  const formatActivity = (date?: string) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleString("en-LK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-sm">
          <FiLoader size={20} className="animate-spin text-red-600" />
          <span className="text-sm font-medium text-slate-600">
            Loading profile...
          </span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <FiShield size={22} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Unable to load profile
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {error || "Administrator profile was not found."}
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

  const initials = getInitials(profile.name);

  const isActive = profile.status?.toUpperCase() === "ACTIVE";

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

            <h1 className="text-2xl font-bold text-slate-950">My Profile</h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your administrator account and security settings.
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
        {/* Messages */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <FiX size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <FiCheckCircle size={18} />
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* LEFT PROFILE */}
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

                <p className="mt-1 truncate text-sm text-slate-500">
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
                      isActive ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    <FiCheckCircle size={19} />
                  </div>

                  <div>
                    <p
                      className={`text-xs font-medium ${
                        isActive ? "text-green-700" : "text-amber-700"
                      }`}
                    >
                      Account Status
                    </p>

                    <p
                      className={`mt-0.5 text-sm font-bold ${
                        isActive ? "text-green-800" : "text-amber-800"
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
                  value={formatDate(profile.created_at)}
                />

                <MiniInfo
                  icon={<FiActivity />}
                  label="Last Activity"
                  value={formatActivity(profile.updated_at)}
                />

                <MiniInfo
                  icon={<FiShield />}
                  label="Access Level"
                  value={
                    profile.role === "ADMIN"
                      ? "Full Administrator"
                      : formatRole(profile.role)
                  }
                />
              </div>
            </div>
          </div>

          {/* RIGHT */}
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
                      Your basic administrator account information.
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
                    value={formatRole(profile.role)}
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
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
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
                        <FiLoader size={17} className="animate-spin" />
                      ) : (
                        <FiSave size={17} />
                      )}

                      {saving ? "Saving..." : "Save Changes"}
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
                      Your system role and account permissions.
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
                  value={profile.status}
                  icon={<FiCheckCircle />}
                  iconClass="bg-green-50 text-green-600"
                  valueClass={isActive ? "text-green-600" : "text-amber-600"}
                />

                <AccountItem
                  label="Access Level"
                  value={
                    profile.role === "ADMIN"
                      ? "Full Access"
                      : "Restricted Access"
                  }
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
                      Keep your administrator account secure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6">
                {/* Password */}
                <SecurityItem
                  icon={<FiLock />}
                  title="Password"
                  description="Change your password to keep your account secure."
                  action="Change Password"
                  onClick={() => {
                    setShowPasswordForm(!showPasswordForm);
                    setError("");
                    setSuccess("");
                  }}
                />
                {showPasswordForm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="my-auto w-full max-w-md rounded-2xl bg-white shadow-2xl">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">
                            Change Password
                          </h2>

                          <p className="mt-1 text-sm leading-5 text-slate-500">
                            Enter your current password and choose a new
                            password.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowPasswordForm(false)}
                          className="ml-3 shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Close change password form"
                        >
                          <FiX size={20} />
                        </button>
                      </div>

                      {/* Form Content */}
                      <div className="space-y-5 p-6">
                        <PasswordField
                          label="Current Password"
                          name="currentPassword"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordChange}
                          visible={showCurrentPassword}
                          onToggle={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                        />

                        <PasswordField
                          label="New Password"
                          name="newPassword"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          visible={showNewPassword}
                          onToggle={() => setShowNewPassword(!showNewPassword)}
                        />

                        <PasswordField
                          label="Confirm New Password"
                          name="confirmPassword"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          visible={showConfirmPassword}
                          onToggle={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        />

                        {/* Buttons */}
                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordForm(false);

                              setPasswordForm({
                                currentPassword: "",
                                newPassword: "",
                                confirmPassword: "",
                              });

                              setError("");
                            }}
                            className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={handleChangePassword}
                            disabled={changingPassword}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                          >
                            {changingPassword && (
                              <FiLoader size={16} className="animate-spin" />
                            )}

                            {changingPassword
                              ? "Changing..."
                              : "Change Password"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Login Security */}
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
    </div>
  );
}

/* -------------------------------------------------
   PROFILE FIELD
------------------------------------------------- */

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
            {value || "—"}
          </span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------
   MINI INFO
------------------------------------------------- */

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

/* -------------------------------------------------
   ACCOUNT ITEM
------------------------------------------------- */

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

/* -------------------------------------------------
   SECURITY ITEM
------------------------------------------------- */

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

function PasswordField({
  label,
  name,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-100">
        <FiLock className="shrink-0 text-slate-400" />

        <input
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full bg-transparent text-sm text-slate-900 outline-none"
        />

        <button
          type="button"
          onClick={onToggle}
          className="text-slate-400 hover:text-slate-600"
        >
          {!visible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      </div>
    </div>
  );
}
