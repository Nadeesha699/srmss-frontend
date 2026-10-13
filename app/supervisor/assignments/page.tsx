"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiMenu,
  FiTruck,
  FiUserCheck,
  FiCalendar,
  FiClock,
  FiMap,
  FiLoader,
  FiRefreshCw,
} from "react-icons/fi";

import SupervisorSidebar from "@/components/SideNavBar/SupervisorSidebar";

const SCHEDULE_API = "http://localhost:5000/api/schedules";
const BUS_API = "http://localhost:5000/api/buses";
const STAFF_API = "http://localhost:5000/api/users";
const DRIVER_API = "http://localhost:5000/api/drivers";
const ASSIGNMENT_API = "http://localhost:5000/api/assignments";

type Schedule = {
  id: number;
  schedule_code: string;
  route_id?: number;
  route_code?: string;
  route_name?: string;
  start_point?: string;
  end_point?: string;
  depot_id?: number;
  depot_name?: string;
  schedule_date?: string;
  service_date?: string;
  departure_time: string;
  arrival_time: string;
  status: string;
};

type Bus = {
  id: number;
  registration_no: string;
  model?: string;
  capacity?: number;
  depot_id?: number;
  depot_name?: string;
  mileage?: number;
  status: string;
};

type OperationalStaff = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  depot_id?: number;
};

type Driver = {
  id: number;
  employee_no: string;
  name: string;
  phone?: string;
  license_no: string;
  license_expiry: string;
  depot_id?: number | null;
  status: string;
};

type Assignment = {
  id: number;
  schedule_id: number;
  bus_id: number;
  driver_id: number;
  staff_id: number;
  schedule_code?: string;
  registration_no?: string;
  driver_name?: string;
  employee_no?: string;
  staff_name?: string;
  status: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

function getApiData<T>(response: { data: ApiResponse<T> | T }): T {
  const body = response.data as ApiResponse<T>;

  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    body.data !== undefined
  ) {
    return body.data;
  }

  return response.data as T;
}

function isActiveAssignment(assignment: Assignment) {
  const status = assignment.status?.toUpperCase();

  return status !== "CANCELLED" && status !== "COMPLETED";
}

export default function AssignmentsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [staff, setStaff] = useState<OperationalStaff[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [selectedBus, setSelectedBus] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success",
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      // Get the logged-in supervisor
      const storedUser = localStorage.getItem("srmss_user");

      if (!storedUser) {
        setMessage("Please log in to view assignment data.");
        setMessageType("error");
        return;
      }

      const loggedInUser = JSON.parse(storedUser);
      const supervisorDepotId = Number(loggedInUser.depot_id);

      if (
        loggedInUser.role?.toUpperCase() !== "SUPERVISOR" ||
        !Number.isInteger(supervisorDepotId) ||
        supervisorDepotId <= 0
      ) {
        setMessage("Your account is not assigned to a valid depot.");
        setMessageType("error");
        return;
      }

      const [
        schedulesResponse,
        busesResponse,
        staffResponse,
        driversResponse,
        assignmentsResponse,
      ] = await Promise.all([
        axios.get(SCHEDULE_API),
        axios.get(BUS_API),
        axios.get(STAFF_API, {
          params: { role: "OPERATIONAL_STAFF" },
        }),
        axios.get(DRIVER_API),
        axios.get(ASSIGNMENT_API),
      ]);

      const scheduleData = getApiData<Schedule[]>(schedulesResponse);
      const busData = getApiData<Bus[]>(busesResponse);
      const staffData = getApiData<OperationalStaff[]>(staffResponse);
      const driverData = getApiData<Driver[]>(driversResponse);
      const assignmentData = getApiData<Assignment[]>(assignmentsResponse);

      // Only records belonging to this supervisor's depot
      const ownDepotSchedules = (
        Array.isArray(scheduleData) ? scheduleData : []
      ).filter((schedule) => Number(schedule.depot_id) === supervisorDepotId);

      const ownDepotBuses = (Array.isArray(busData) ? busData : []).filter(
        (bus) => Number(bus.depot_id) === supervisorDepotId,
      );

      const ownDepotStaff = (Array.isArray(staffData) ? staffData : []).filter(
        (user) =>
          user.role?.toUpperCase() === "OPERATIONAL_STAFF" &&
          Number(user.depot_id) === supervisorDepotId,
      );

      const ownDepotDrivers = (
        Array.isArray(driverData) ? driverData : []
      ).filter((driver) => Number(driver.depot_id) === supervisorDepotId);

      // Keep assignments linked to schedules belonging to this depot
      const ownScheduleIds = new Set(
        ownDepotSchedules.map((schedule) => Number(schedule.id)),
      );

      const ownDepotAssignments = (
        Array.isArray(assignmentData) ? assignmentData : []
      ).filter((assignment) =>
        ownScheduleIds.has(Number(assignment.schedule_id)),
      );

      setSchedules(ownDepotSchedules);
      setBuses(ownDepotBuses);
      setStaff(ownDepotStaff);
      setDrivers(ownDepotDrivers);
      setAssignments(ownDepotAssignments);
    } catch (error: unknown) {
      console.error("Failed to load assignment data:", error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.message ||
            "Unable to load assignment data. Check that all APIs are running.",
        );
      } else {
        setMessage("Unable to load assignment data.");
      }

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const availableSchedules = useMemo(() => {
    const assignedScheduleIds = new Set(
      assignments
        .filter(isActiveAssignment)
        .map((assignment) => assignment.schedule_id),
    );

    return schedules.filter((schedule) => {
      const status = schedule.status?.toUpperCase();

      return (
        (status === "SCHEDULED" || status === "PLANNED") &&
        !assignedScheduleIds.has(schedule.id)
      );
    });
  }, [schedules, assignments]);

  const availableBuses = useMemo(() => {
    const assignedBusIds = new Set(
      assignments
        .filter(isActiveAssignment)
        .map((assignment) => assignment.bus_id),
    );

    return buses.filter((bus) => {
      return (
        bus.status?.toUpperCase() === "AVAILABLE" && !assignedBusIds.has(bus.id)
      );
    });
  }, [buses, assignments]);

  const availableDrivers = useMemo(() => {
    const assignedDriverIds = new Set(
      assignments
        .filter(isActiveAssignment)
        .map((assignment) => assignment.driver_id)
        .filter((id) => id != null),
    );

    return drivers.filter((driver) => {
      const licenseExpiry = driver.license_expiry
        ? driver.license_expiry.slice(0, 10)
        : "";

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiryDate = licenseExpiry
        ? new Date(`${licenseExpiry}T00:00:00`)
        : null;

      const licenseValid =
        expiryDate !== null &&
        !Number.isNaN(expiryDate.getTime()) &&
        expiryDate >= today;

      return (
        driver.status?.toUpperCase() === "AVAILABLE" &&
        !assignedDriverIds.has(driver.id) &&
        licenseValid
      );
    });
  }, [drivers, assignments]);

  // const availableStaff = useMemo(() => {
  //   const assignedStaffIds = new Set(
  //     assignments
  //       .filter(isActiveAssignment)
  //       .map((assignment) => assignment.staff_id),
  //   );

  //   return staff.filter((member) => {
  //     const status = member.status?.toUpperCase();

  //     return (
  //       (status === "AVAILABLE" || status === "ACTIVE") &&
  //       !assignedStaffIds.has(member.id)
  //     );
  //   });
  // }, [staff, assignments]);

  const availableStaff = useMemo(() => {
    return staff.filter((member) => {
      const status = member.status?.toUpperCase();

      return status === "AVAILABLE" || status === "ACTIVE";
    });
  }, [staff]);

  const selectedScheduleData = useMemo(
    () =>
      schedules.find((schedule) => String(schedule.id) === selectedSchedule),
    [schedules, selectedSchedule],
  );

  const selectedBusData = useMemo(
    () => buses.find((bus) => String(bus.id) === selectedBus),
    [buses, selectedBus],
  );

  const selectedDriverData = useMemo(
    () => drivers.find((driver) => String(driver.id) === selectedDriver),
    [drivers, selectedDriver],
  );

  const selectedStaffData = useMemo(
    () => staff.find((member) => String(member.id) === selectedStaff),
    [staff, selectedStaff],
  );

  const handleAssignment = async () => {
    setMessage("");

    if (!selectedSchedule) {
      setMessage("Please select a schedule.");
      setMessageType("error");
      return;
    }

    if (!selectedBus) {
      setMessage("Please select a bus.");
      setMessageType("error");
      return;
    }

    if (!selectedDriver) {
      setMessage("Please select a driver.");
      setMessageType("error");
      return;
    }

    if (!selectedStaff) {
      setMessage("Please select operational staff.");
      setMessageType("error");
      return;
    }

    // Recheck current frontend availability before submitting.
    if (
      !availableSchedules.some((item) => item.id === Number(selectedSchedule))
    ) {
      setMessage(
        "This schedule is no longer available. Refresh and try again.",
      );
      setMessageType("error");
      return;
    }

    if (!availableBuses.some((item) => item.id === Number(selectedBus))) {
      setMessage("This bus is no longer available. Refresh and try again.");
      setMessageType("error");
      return;
    }

    if (!availableDrivers.some((item) => item.id === Number(selectedDriver))) {
      setMessage("This driver is unavailable or has an expired licence.");
      setMessageType("error");
      return;
    }

    if (!availableStaff.some((item) => item.id === Number(selectedStaff))) {
      setMessage("This operational staff member is no longer available.");
      setMessageType("error");
      return;
    }

    try {
      setAssigning(true);

      let assignedBy: number | null = null;
      const storedUser = localStorage.getItem("srmss_user");

      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          assignedBy = user.id ? Number(user.id) : null;
        } catch {
          assignedBy = null;
        }
      }

      console.log(assignedBy);

      const payload = {
        schedule_id: Number(selectedSchedule),
        bus_id: Number(selectedBus),
        driver_id: Number(selectedDriver),
        staff_id: Number(selectedStaff),
        assigned_by: assignedBy,
        status: "ASSIGNED",
      };

      await axios.post(ASSIGNMENT_API, payload);

      setMessage("Bus, driver, and operational staff assigned successfully.");
      setMessageType("success");

      setSelectedSchedule("");
      setSelectedBus("");
      setSelectedDriver("");
      setSelectedStaff("");

      await loadData();
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("Assignment status:", error.response?.status);
        console.error("Assignment response:", error.response?.data);
      } else {
        console.error("Unexpected assignment error:", error);
      }

      setMessageType("error");
    } finally {
      setAssigning(false);
    }
  };

  const scheduleDate = selectedScheduleData
    ? selectedScheduleData.schedule_date || selectedScheduleData.service_date
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <SupervisorSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="lg:pl-72">
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
              Supervisor
            </p>
            <p className="font-semibold text-slate-800">
              SRMSS Management Portal
            </p>
          </div>
           <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>
      

        <div className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Trip Assignments
              </h1>
               <p className="mt-1 max-w-2xl text-sm text-slate-500">
                 Assign a schedule, bus, driver, and operational staff member to
                a planned trip.
              </p>
            </div>

            {message && (
              <div
                role="alert"
                className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm font-semibold ${
                  messageType === "success"
                    ? "border-green-100 bg-green-50 text-green-700"
                    : "border-red-100 bg-red-50 text-red-700"
                }`}
              >
                {messageType === "success" ? (
                  <FiCheckCircle className="mt-0.5 shrink-0" />
                ) : (
                  <FiAlertTriangle className="mt-0.5 shrink-0" />
                )}
                <span>{message}</span>
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Create Assignment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose available resources for the selected schedule.
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                    <FiLoader size={20} className="animate-spin text-red-600" />
                    Loading schedules and resources...
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="md:col-span-2 lg:col-span-3">
                      <FormLabel>Select Schedule</FormLabel>
                      <div className="relative">
                        <FiCalendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={selectedSchedule}
                          onChange={(e) => {
                            setSelectedSchedule(e.target.value);
                            setMessage("");
                          }}
                          className={selectClass}
                        >
                          <option value="">Choose unassigned schedule</option>
                          {availableSchedules.map((schedule) => (
                            <option key={schedule.id} value={schedule.id}>
                              {schedule.schedule_code} —{" "}
                              {schedule.route_code ||
                                schedule.route_name ||
                                "Route"}{" "}
                              —{" "}
                              {formatDate(
                                schedule.schedule_date || schedule.service_date,
                              )}{" "}
                              — {formatTime(schedule.departure_time)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {availableSchedules.length === 0 && (
                        <p className="mt-2 text-xs text-amber-600">
                          No unassigned scheduled trips are available.
                        </p>
                      )}
                    </div>

                    <div>
                      <FormLabel>Select Bus</FormLabel>
                      <div className="relative">
                        <FiTruck className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={selectedBus}
                          onChange={(e) => {
                            setSelectedBus(e.target.value);
                            setMessage("");
                          }}
                          className={selectClass}
                        >
                          <option value="">Choose available bus</option>
                          {availableBuses.map((bus) => (
                            <option key={bus.id} value={bus.id}>
                              {bus.registration_no}
                              {bus.capacity ? ` — ${bus.capacity} seats` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      {availableBuses.length === 0 && (
                        <p className="mt-2 text-xs text-amber-600">
                          No available buses found.
                        </p>
                      )}
                    </div>

                    <div>
                      <FormLabel>Select Driver</FormLabel>
                      <div className="relative">
                        <FiUserCheck className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={selectedDriver}
                          onChange={(e) => {
                            setSelectedDriver(e.target.value);
                            setMessage("");
                          }}
                          className={selectClass}
                        >
                          <option value="">Choose available driver</option>
                          {availableDrivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name} — {driver.employee_no}
                            </option>
                          ))}
                        </select>
                      </div>
                      {availableDrivers.length === 0 && (
                        <p className="mt-2 text-xs text-amber-600">
                          No available drivers with valid licences found.
                        </p>
                      )}
                    </div>

                    <div>
                      <FormLabel>Select Operational Staff</FormLabel>
                      <div className="relative">
                        <FiUserCheck className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={selectedStaff}
                          onChange={(e) => {
                            setSelectedStaff(e.target.value);
                            setMessage("");
                          }}
                          className={selectClass}
                        >
                          <option value="">Choose operational staff</option>
                          {availableStaff.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                              {member.email ? ` — ${member.email}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      {availableStaff.length === 0 && (
                        <p className="mt-2 text-xs text-amber-600">
                          No available operational staff found.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedScheduleData && (
                    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <FiMap className="mt-0.5 shrink-0 text-blue-600" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            Selected Schedule
                          </p>
                          <p className="mt-1 font-bold text-blue-900">
                            {selectedScheduleData.schedule_code}
                          </p>
                          <p className="mt-1 text-sm text-blue-700">
                            {selectedScheduleData.start_point || "Origin"} →{" "}
                            {selectedScheduleData.end_point || "Destination"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs font-medium text-blue-700">
                            <span className="inline-flex items-center gap-1">
                              <FiCalendar />
                              {formatDate(scheduleDate)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <FiClock />
                              {formatTime(
                                selectedScheduleData.departure_time,
                              )}{" "}
                              – {formatTime(selectedScheduleData.arrival_time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* <div className="mt-6 flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Assignment validation
                      </p>
                      <p className="mt-1 text-xs leading-5 text-amber-700">
                        Only available buses, drivers with valid licences, and
                        available operational staff are listed. The backend must
                        validate availability again before saving the
                        assignment.
                      </p>
                    </div>
                  </div> */}

                  <button
                    type="button"
                    onClick={() => void handleAssignment()}
                    disabled={assigning || loading}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-red-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {assigning ? (
                      <FiLoader className="animate-spin" size={18} />
                    ) : (
                      <FiCheckCircle size={18} />
                    )}
                    {assigning
                      ? "Creating Assignment..."
                      : "Confirm Assignment"}
                  </button>
                </>
              )}
            </section>

            <section className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <AvailabilityCard
                title="Available Buses"
                value={availableBuses.length}
                icon={<FiTruck />}
              />
              <AvailabilityCard
                title="Available Drivers"
                value={availableDrivers.length}
                icon={<FiUserCheck />}
              />
              <AvailabilityCard
                title="Available Staff"
                value={availableStaff.length}
                icon={<FiUserCheck />}
              />
              <AvailabilityCard
                title="Unassigned Schedules"
                value={availableSchedules.length}
                icon={<FiCalendar />}
              />
            </section>

            <section className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <SelectedResource
                title="Selected Schedule"
                value={
                  selectedScheduleData
                    ? selectedScheduleData.schedule_code
                    : "No schedule selected"
                }
                icon={<FiCalendar />}
                selected={Boolean(selectedSchedule)}
              />
              <SelectedResource
                title="Selected Bus"
                value={
                  selectedBusData
                    ? selectedBusData.registration_no
                    : "No bus selected"
                }
                icon={<FiTruck />}
                selected={Boolean(selectedBus)}
              />
              <SelectedResource
                title="Selected Driver"
                value={
                  selectedDriverData
                    ? selectedDriverData.name
                    : "No driver selected"
                }
                icon={<FiUserCheck />}
                selected={Boolean(selectedDriver)}
              />
              <SelectedResource
                title="Selected Staff"
                value={
                  selectedStaffData
                    ? selectedStaffData.name
                    : "No staff selected"
                }
                icon={<FiUserCheck />}
                selected={Boolean(selectedStaff)}
              />
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="font-bold text-slate-900">
                  Current Assignments
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Buses, drivers, and operational staff assigned to trips.
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                  <FiLoader className="mr-2 animate-spin" />
                  Loading assignments...
                </div>
              ) : assignments.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <FiCalendar size={28} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    No assignments found
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Create an assignment above to see it here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                          <FiTruck size={19} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {assignment.schedule_code ||
                              `Schedule #${assignment.schedule_id}`}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Bus:{" "}
                            {assignment.registration_no ||
                              `#${assignment.bus_id}`}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Driver:{" "}
                            {assignment.driver_name ||
                              (assignment.driver_id
                                ? `Driver #${assignment.driver_id}`
                                : "Not returned by API")}
                            {assignment.employee_no
                              ? ` (${assignment.employee_no})`
                              : ""}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Operational Staff:{" "}
                            {assignment.staff_name ||
                              `Staff #${assignment.staff_id}`}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          assignment.status?.toUpperCase() === "ASSIGNED"
                            ? "bg-blue-50 text-blue-700"
                            : assignment.status?.toUpperCase() === "COMPLETED"
                              ? "bg-green-50 text-green-700"
                              : assignment.status?.toUpperCase() === "CANCELLED"
                                ? "bg-red-50 text-red-700"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {assignment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

const selectClass =
  "w-full appearance-none rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-50";

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-semibold text-slate-700">
      {children}{" "}
    </label>
  );
}

function AvailabilityCard({
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
      {" "}
      <div className="flex items-center gap-4">
        {" "}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
          {icon}{" "}
        </div>{" "}
        <div>
          {" "}
          <p className="text-sm text-slate-500">{title}</p>{" "}
          <p className="text-2xl font-bold text-slate-900">{value}</p>{" "}
          <p className="mt-1 text-xs text-green-600">
            Currently available{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}

function SelectedResource({
  title,
  value,
  icon,
  selected,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  selected: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {" "}
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            selected ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-400"
          }`}
        >
          {icon}{" "}
        </div>{" "}
        <div className="min-w-0">
          {" "}
          <p className="text-sm text-slate-500">{title}</p>
          <p
            className={`mt-1 truncate text-base font-bold ${
              selected ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {value}{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";

  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-LK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "—";

  const parts = value.split(":");

  if (parts.length < 2) return value;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
