import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mf_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("mf_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login    = (data) => api.post("/auth/login", data);
export const register = (data) => api.post("/auth/register", data);
export const getMe    = ()     => api.get("/auth/me");

// ── Employees ─────────────────────────────────────────────────────────────────
export const getEmployees    = (params) => api.get("/employees", { params });
export const getEmployee     = (id)     => api.get(`/employees/${id}`);
export const createEmployee  = (data)   => api.post("/employees", data);
export const updateEmployee  = (id, d)  => api.put(`/employees/${id}`, d);
export const updateSkill     = (id, d)  => api.patch(`/employees/${id}/skills`, d);
export const deleteEmployee  = (id)     => api.delete(`/employees/${id}`);
export const uploadCSV       = (fd)     => api.post("/employees/upload/csv", fd, { headers:{"Content-Type":"multipart/form-data"} });

// ── Roles ─────────────────────────────────────────────────────────────────────
export const getRoles       = ()        => api.get("/roles");
export const createRole     = (data)    => api.post("/roles", data);
export const updateRole     = (id, d)   => api.put(`/roles/${id}`, d);
export const deleteRole     = (id)      => api.delete(`/roles/${id}`);
export const getRoleMatches = (id)      => api.get(`/roles/${id}/matches`);

// ── Attendance ────────────────────────────────────────────────────────────────
export const getAttendance       = (date) => api.get("/attendance", { params:{ date } });
export const upsertAttendance    = (data) => api.post("/attendance", data);
export const bulkAttendance      = (data) => api.post("/attendance/bulk", data);
export const importAttendanceCSV = (fd)   => api.post("/attendance/import-csv", fd, { headers:{"Content-Type":"multipart/form-data"} });

// ── Shifts ────────────────────────────────────────────────────────────────────
export const getShiftSummary = (date) => api.get("/shifts/summary", { params:{ date } });

// ── Feedback ──────────────────────────────────────────────────────────────────
export const getFeedback      = ()     => api.get("/feedback");
export const createFeedback   = (data) => api.post("/feedback", data);
export const getFeedbackStats = ()     => api.get("/feedback/stats");

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = (from, to) => api.get("/dashboard", { params:{ from, to } });

// ── Attrition ─────────────────────────────────────────────────────────────────
export const getAttritionAnalytics = (from, to) => api.get("/attrition/analytics", { params:{ from, to } });

// ── Overtime ──────────────────────────────────────────────────────────────────
export const getOvertimeManagers   = ()     => api.get("/overtime/managers");
export const createOvertimeManager = (data) => api.post("/overtime/managers", data);
export const deleteOvertimeManager = (id)   => api.delete(`/overtime/managers/${id}`);
export const importManagersCSV     = (fd)   => api.post("/overtime/managers/import-csv", fd, { headers:{"Content-Type":"multipart/form-data"} });
export const getPresentWorkers     = (date) => api.get("/overtime/present", { params:{ date } });
export const getOvertimeRequests   = ()     => api.get("/overtime/requests");
export const createOvertimeRequest = (data) => api.post("/overtime/requests", data);
export const updateOvertimeStatus  = (id,s) => api.patch(`/overtime/requests/${id}/status`, { status: s });

export default api;
