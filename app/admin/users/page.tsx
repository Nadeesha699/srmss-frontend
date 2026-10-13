
"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiEdit2,
  FiMail,
  FiMapPin,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import { AdminSidebar } from "@/components/SideNavBar/AdminSideNavBar";

/* =========================================================
   API
========================================================= */

const API_URL = "http://localhost:5000/api";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "SUPERVISOR"
  | "OPERATIONAL_STAFF";

type UserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED";

type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole | string;
  depot_id: number | null;
  depot_code?: string | null;
  depot_name?: string | null;
  status: UserStatus | string;
  created_at?: string;
  updated_at?: string;
};

type Depot = {
  id: number;
  depot_code: string;
  name: string;
  location: string;
  status: "ACTIVE" | "INACTIVE" | string;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  depot_id: string;
  status: UserStatus;
};

/* =========================================================
   PAGE
========================================================= */

export default function UsersPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingDepots, setLoadingDepots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] =
    useState<User | null>(null);

  const [form, setForm] = useState<UserForm>({
    name: "",
    email: "",
    password: "",
    role: "OPERATIONAL_STAFF",
    depot_id: "",
    status: "ACTIVE",
  });

  /* =========================================================
     FETCH USERS
  ========================================================= */

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/users`,
      );

      const data =
        response.data?.data ||
        response.data ||
        [];

      if (!Array.isArray(data)) {
        throw new Error("Invalid users response.");
      }

      /*
        Admin users are hidden from the management list.
        Supervisors and operational staff are displayed.
      */
      const filteredData = data.filter(
        (user: User) =>
          user.role?.toUpperCase() !== "ADMIN",
      );

      setUsers(filteredData);
    } catch (err: any) {
      console.error("Fetch users error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load users.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     FETCH DEPOTS
  ========================================================= */

  const fetchDepots = async () => {
    try {
      setLoadingDepots(true);

      const response = await axios.get(
        `${API_URL}/depots`,
      );

      const data =
        response.data?.data ||
        response.data ||
        [];

      if (!Array.isArray(data)) {
        throw new Error("Invalid depot response.");
      }

      setDepots(data);
    } catch (err: any) {
      console.error("Fetch depots error:", err);

      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load depots.",
      );
    } finally {
      setLoadingDepots(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchUsers();
    fetchDepots();
  }, []);

  /* =========================================================
     FILTER USERS
  ========================================================= */

  const filteredUsers = useMemo(() => {
    const searchValue =
      search.toLowerCase().trim();

    return users.filter((user) => {
      const matchesSearch =
        !searchValue ||
        user.name
          ?.toLowerCase()
          .includes(searchValue) ||
        user.email
          ?.toLowerCase()
          .includes(searchValue) ||
        user.role
          ?.toLowerCase()
          .includes(searchValue) ||
        user.depot_name
          ?.toLowerCase()
          .includes(searchValue) ||
        user.depot_code
          ?.toLowerCase()
          .includes(searchValue);

      const matchesRole =
        roleFilter === "ALL" ||
        user.role?.toUpperCase() === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        user.status?.toUpperCase() ===
          statusFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    users,
    search,
    roleFilter,
    statusFilter,
  ]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) =>
      user.status?.toUpperCase() ===
      "ACTIVE",
  ).length;

  const supervisors = users.filter(
    (user) =>
      user.role?.toUpperCase() ===
      "SUPERVISOR",
  ).length;

  const operationalStaff = users.filter(
    (user) =>
      user.role?.toUpperCase() ===
      "OPERATIONAL_STAFF",
  ).length;

  /* =========================================================
     OPEN CREATE MODAL
  ========================================================= */

  const openCreateModal = () => {
    setEditingUser(null);

    setForm({
      name: "",
      email: "",
      password: "",
      role: "OPERATIONAL_STAFF",
      depot_id: "",
      status: "ACTIVE",
    });

    setShowModal(true);

    if (depots.length === 0) {
      fetchDepots();
    }
  };

  /* =========================================================
     OPEN EDIT MODAL
  ========================================================= */

  const openEditModal = (user: User) => {
    setEditingUser(user);

    const normalizedRole =
      user.role?.toUpperCase();

    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role:
        normalizedRole === "SUPERVISOR"
          ? "SUPERVISOR"
          : "OPERATIONAL_STAFF",
      depot_id:
        user.depot_id !== null &&
        user.depot_id !== undefined
          ? String(user.depot_id)
          : "",
      status:
        user.status?.toUpperCase() ===
        "SUSPENDED"
          ? "SUSPENDED"
          : user.status?.toUpperCase() ===
              "INACTIVE"
            ? "INACTIVE"
            : "ACTIVE",
    });

    setShowModal(true);

    if (depots.length === 0) {
      fetchDepots();
    }
  };

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingUser(null);
  };

  /* =========================================================
     SUBMIT USER
  ========================================================= */

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter the user name.");
      return;
    }

    if (!form.email.trim()) {
      alert(
        "Please enter the email address.",
      );
      return;
    }

    if (
      !editingUser &&
      !form.password.trim()
    ) {
      alert("Please enter a password.");
      return;
    }

    /*
      Both supervisors and operational staff
      must belong to a depot.
    */

    if (
      form.role !== "ADMIN" &&
      !form.depot_id
    ) {
      alert(
        "Please select a depot for this user.",
      );
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        depot_id: form.depot_id
          ? Number(form.depot_id)
          : null,
        status: form.status,
      };

      /*
        Password is sent only when:
        - Creating a user
        - Changing an existing password
      */

      if (form.password.trim()) {
        payload.password =
          form.password.trim();
      }

      if (editingUser) {
        await axios.put(
          `${API_URL}/users/${editingUser.id}`,
          payload,
        );

        alert(
          "User updated successfully.",
        );
      } else {
        await axios.post(
          `${API_URL}/users`,
          payload,
        );

        alert(
          "User created successfully.",
        );
      }

      await fetchUsers();

      setShowModal(false);
      setEditingUser(null);
    } catch (err: any) {
      console.error(
        "Save user error:",
        err,
      );

      alert(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to save user.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     DELETE USER
  ========================================================= */

  const handleDelete = async (
    user: User,
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${user.name}?`,
      );

    if (!confirmed) return;

    try {
      setDeletingId(user.id);

      await axios.delete(
        `${API_URL}/users/${user.id}`,
      );

      setUsers((current) =>
        current.filter(
          (item) => item.id !== user.id,
        ),
      );

      alert(
        "User deleted successfully.",
      );
    } catch (err: any) {
      console.error(
        "Delete user error:",
        err,
      );

      alert(
        err?.response?.data?.message ||
          "Failed to delete user.",
      );
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() =>
          setMobileOpen(false)
        }
      />

      <div className="lg:pl-72">
        {/* HEADER */}

        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() =>
              setMobileOpen(true)
            }
            className="mr-4 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
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

        {/* CONTENT */}

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* PAGE HEADER */}

            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  User Management
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage supervisors and
                  operational staff assigned
                  to transport depots.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  openCreateModal
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                <FiPlus size={18} />
                Add User
              </button>
            </div>

            {/* ERROR */}

            {error && (
              <div className="mt-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-3">
                  <FiAlertCircle
                    className="text-red-600"
                    size={20}
                  />

                  <p className="text-sm font-medium text-red-800">
                    {error}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    fetchUsers
                  }
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            {/* STATISTICS */}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Users"
                value={totalUsers}
                icon={<FiUsers />}
              />

              <StatCard
                title="Active Users"
                value={activeUsers}
                icon={<FiCheckCircle />}
              />

              <StatCard
                title="Supervisors"
                value={supervisors}
                icon={<FiShield />}
              />

              <StatCard
                title="Operational Staff"
                value={operationalStaff}
                icon={<FiUser />}
              />
            </div>

            {/* SEARCH / FILTER */}

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
                    onChange={(e) =>
                      setSearch(
                        e.target.value,
                      )
                    }
                    placeholder="Search name, email or depot..."
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) =>
                    setRoleFilter(
                      e.target.value,
                    )
                  }
                  className="rounded-xl border text-gray-500 border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                >
                  <option value="ALL">
                    All Roles
                  </option>

                  <option value="SUPERVISOR">
                    Supervisor
                  </option>

                  <option value="OPERATIONAL_STAFF">
                    Operational Staff
                  </option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value,
                    )
                  }
                  className="rounded-xl border text-gray-500 border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                >
                  <option value="ALL">
                    All Status
                  </option>

                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>

                  <option value="SUSPENDED">
                    Suspended
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    fetchUsers();
                    fetchDepots();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <FiRefreshCw
                    size={17}
                  />
                  Refresh
                </button>
              </div>
            </div>

            {/* RESULTS HEADER */}

            <div className="mt-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  System Users
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Showing{" "}
                  {filteredUsers.length}{" "}
                  of {users.length} users
                </p>
              </div>

              {(search ||
                roleFilter !==
                  "ALL" ||
                statusFilter !==
                  "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter(
                      "ALL",
                    );
                    setStatusFilter(
                      "ALL",
                    );
                  }}
                  className="text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* USER LIST */}

            {loading ? (
              <div className="mt-4 grid gap-5 xl:grid-cols-2">
                {[1, 2, 3, 4].map(
                  (item) => (
                    <UserSkeleton
                      key={item}
                    />
                  ),
                )}
              </div>
            ) : filteredUsers.length ===
              0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <FiUsers
                  className="mx-auto mb-4 text-slate-400"
                  size={40}
                />

                <h3 className="font-semibold text-slate-900">
                  No users found
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing your
                  search or filters.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-5 xl:grid-cols-2">
                {filteredUsers.map(
                  (user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      deleting={
                        deletingId ===
                        user.id
                      }
                      onEdit={() =>
                        openEditModal(
                          user,
                        )
                      }
                      onDelete={() =>
                        handleDelete(
                          user,
                        )
                      }
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {showModal && (
        <div className="fixed text-gray-500 inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingUser
                    ? "Edit User"
                    : "Create User"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingUser
                    ? "Update user account information."
                    : "Create a new SRMSS system user."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="p-6"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                {/* NAME */}

                <FormField
                  label="Full Name"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(value) =>
                    setForm(
                      (current) => ({
                        ...current,
                        name: value,
                      }),
                    )
                  }
                />

                {/* EMAIL */}

                <FormField
                  label="Email Address"
                  placeholder="user@example.com"
                  type="email"
                  value={form.email}
                  onChange={(value) =>
                    setForm(
                      (current) => ({
                        ...current,
                        email: value,
                      }),
                    )
                  }
                />

                {/* ROLE */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Role
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <select
                    value={form.role}
                    onChange={(e) => {
                      const role =
                        e.target
                          .value as UserRole;

                      setForm(
                        (current) => ({
                          ...current,
                          role,
                          depot_id:
                            role ===
                            "ADMIN"
                              ? ""
                              : current.depot_id,
                        }),
                      );
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  >
                    <option value="SUPERVISOR">
                      Supervisor
                    </option>

                    <option value="OPERATIONAL_STAFF">
                      Operational Staff
                    </option>

                    <option value="ADMIN">
                      Administrator
                    </option>
                  </select>
                </div>

                {/* DEPOT */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Assigned Depot

                    {form.role !==
                      "ADMIN" && (
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    )}
                  </label>

                  <select
                    value={form.depot_id}
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          depot_id:
                            e.target
                              .value,
                        }),
                      )
                    }
                    disabled={
                      form.role ===
                        "ADMIN" ||
                      loadingDepots
                    }
                    required={
                      form.role !==
                      "ADMIN"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {form.role ===
                      "ADMIN"
                        ? "No depot required"
                        : loadingDepots
                          ? "Loading depots..."
                          : depots.length ===
                              0
                            ? "No depots available"
                            : "Select Depot"}
                    </option>

                    {depots
                      .filter(
                        (depot) =>
                          depot.status?.toUpperCase() ===
                          "ACTIVE",
                      )
                      .map(
                        (depot) => (
                          <option
                            key={
                              depot.id
                            }
                            value={
                              depot.id
                            }
                          >
                            {
                              depot.depot_code
                            }{" "}
                            —{" "}
                            {
                              depot.name
                            }
                          </option>
                        ),
                      )}
                  </select>

                  <p className="mt-1.5 text-xs text-slate-400">
                    {form.role ===
                    "ADMIN"
                      ? "Administrators are not assigned to a specific depot."
                      : "Select the depot assigned to this user."}
                  </p>
                </div>

                {/* PASSWORD */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Password

                    {!editingUser && (
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    )}
                  </label>

                  <input
                    type="password"
                    value={
                      form.password
                    }
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          password:
                            e.target
                              .value,
                        }),
                      )
                    }
                    placeholder={
                      editingUser
                        ? "Leave blank to keep current password"
                        : "Enter password"
                    }
                    required={
                      !editingUser
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  />
                </div>

                {/* STATUS */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm(
                        (current) => ({
                          ...current,
                          status:
                            e.target
                              .value as UserStatus,
                        }),
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50"
                  >
                    <option value="ACTIVE">
                      Active
                    </option>

                    <option value="INACTIVE">
                      Inactive
                    </option>

                    <option value="SUSPENDED">
                      Suspended
                    </option>
                  </select>
                </div>
              </div>

              {/* SELECTED DEPOT */}

              {form.depot_id && (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <FiMapPin
                      className="mt-0.5 shrink-0 text-red-600"
                      size={18}
                    />

                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        Selected Depot
                      </p>

                      {(() => {
                        const depot =
                          depots.find(
                            (item) =>
                              item.id ===
                              Number(
                                form.depot_id,
                              ),
                          );

                        if (!depot) {
                          return (
                            <p className="mt-1 text-sm text-red-700">
                              Depot selected
                            </p>
                          );
                        }

                        return (
                          <>
                            <p className="mt-1 text-sm font-semibold text-red-800">
                              {
                                depot.depot_code
                              }{" "}
                              —{" "}
                              {
                                depot.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-red-600">
                              {
                                depot.location
                              }
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTIONS */}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
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
                  {saving && (
                    <FiRefreshCw
                      className="animate-spin"
                      size={16}
                    />
                  )}

                  {editingUser
                    ? "Save Changes"
                    : "Create User"}
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
   USER CARD
========================================================= */

function UserCard({
  user,
  deleting,
  onEdit,
  onDelete,
}: {
  user: User;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const role =
    user.role?.toUpperCase();

  const isSupervisor =
    role === "SUPERVISOR";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-red-100 hover:shadow-md">
      {/* HEADER */}

      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <FiUser size={22} />
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <RoleBadge
                role={user.role}
              />

              <StatusBadge
                status={user.status}
              />
            </div>

            <h2 className="truncate font-bold text-slate-900">
              {user.name}
            </h2>

            <p className="mt-1 truncate text-xs text-slate-500">
              User ID: #{user.id}
            </p>
          </div>
        </div>

        <div className="ml-3 flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
            title="Edit user"
          >
            <FiEdit2 size={17} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
            title="Delete user"
          >
            {deleting ? (
              <FiRefreshCw
                className="animate-spin"
                size={17}
              />
            ) : (
              <FiTrash2 size={17} />
            )}
          </button>
        </div>
      </div>

      {/* DETAILS */}

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <InfoItem
          icon={<FiMail />}
          label="Email"
          value={user.email}
        />

        <InfoItem
          icon={<FiShield />}
          label="Role"
          value={
            isSupervisor
              ? "Supervisor"
              : "Operational Staff"
          }
        />

        <InfoItem
          icon={<FiMapPin />}
          label="Assigned Depot"
          value={
            user.depot_name ||
            "No depot assigned"
          }
        />

        <InfoItem
          icon={<FiCheckCircle />}
          label="Account Status"
          value={user.status}
        />
      </div>

      {/* FOOTER */}

      <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">
              Depot ID
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              {user.depot_id
                ? `#${user.depot_id}`
                : "Not assigned"}
            </p>
          </div>

          {user.depot_name && (
            <div className="text-right">
              <p className="text-xs text-slate-400">
                Depot
              </p>

              <p className="mt-1 max-w-[180px] truncate text-sm font-semibold text-slate-700">
                {user.depot_name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem({
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
      <div className="mt-0.5 shrink-0 text-slate-400">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   ROLE BADGE
========================================================= */

function RoleBadge({
  role,
}: {
  role: string;
}) {
  const normalized =
    role?.toUpperCase();

  const isSupervisor =
    normalized === "SUPERVISOR";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
        isSupervisor
          ? "bg-red-50 text-red-700"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {isSupervisor
        ? "SUPERVISOR"
        : "OPERATIONAL STAFF"}
    </span>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status?.toUpperCase();

  const className =
    normalized === "ACTIVE"
      ? "bg-green-50 text-green-700"
      : normalized === "SUSPENDED"
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${className}`}
    >
      {status}
    </span>
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

      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value.toLocaleString()}
      </p>
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
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        <span className="ml-1 text-red-500">
          *
        </span>
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required
        onChange={(e) =>
          onChange(
            e.target.value,
          )
        }
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-50"
      />
    </div>
  );
}

/* =========================================================
   SKELETON
========================================================= */

function UserSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="animate-pulse">
        <div className="flex items-center gap-4 border-b border-slate-100 p-5">
          <div className="h-12 w-12 rounded-xl bg-slate-200" />

          <div className="flex-1">
            <div className="mb-2 h-3 w-24 rounded bg-slate-200" />
            <div className="h-5 w-40 rounded bg-slate-200" />
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine />
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="h-5 w-32 rounded bg-slate-200" />
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

