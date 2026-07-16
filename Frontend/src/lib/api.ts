import axios from "axios";

const BASE_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
});

// Automatically attach the saved token (if any) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
