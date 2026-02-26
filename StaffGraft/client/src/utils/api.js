import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api",
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mf_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
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
export const login = (data) => api.post("/auth/login", data);
export const register = (data) => api.post("/auth/register", data);
export const getMe = () => api.get("/auth/me");

// ── Employees ─────────────────────────────────────────────────────────────────
export const getEmployees = (params) => api.get("/employees", { params });
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post("/employees", data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const updateSkill = (id, data) => api.patch(`/employees/${id}/skills`, data);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);
export const uploadCSV = (formData) =>
  api.post("/employees/upload/csv", formData, { headers: { "Content-Type": "multipart/form-data" } });

// ── Roles ─────────────────────────────────────────────────────────────────────
export const getRoles = () => api.get("/roles");
export const createRole = (data) => api.post("/roles", data);
export const updateRole = (id, data) => api.put(`/roles/${id}`, data);
export const deleteRole = (id) => api.delete(`/roles/${id}`);
export const getRoleMatches = (id) => api.get(`/roles/${id}/matches`);

// ── Attendance ────────────────────────────────────────────────────────────────
export const getAttendance = (date) => api.get("/attendance", { params: { date } });
export const upsertAttendance = (data) => api.post("/attendance", data);
export const bulkAttendance = (data) => api.post("/attendance/bulk", data);

// ── Shifts ────────────────────────────────────────────────────────────────────
export const getShiftSummary = (date) => api.get("/shifts/summary", { params: { date } });

// ── Feedback ──────────────────────────────────────────────────────────────────
export const getFeedback = () => api.get("/feedback");
export const createFeedback = (data) => api.post("/feedback", data);
export const getFeedbackStats = () => api.get("/feedback/stats");

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = () => api.get("/dashboard");

export default api;
