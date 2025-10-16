// src/services/Api.js
import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL:
    process.env.REACT_APP_API_BASE_URL ||
    "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
});

// Attach token from cookies before each request
api.interceptors.request.use((cfg) => {
  const token = Cookies.get("sr_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
