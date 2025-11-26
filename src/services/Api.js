// src/services/Api.js
import axios from "axios";
import Cookies from "js-cookie";

// export const API_BASE = "https://d1x2sux8i7gb9h.cloudfront.net/api"; 
export const API_BASE = "d15c13s9p0a6x1.cloudfront.net"; 

const api = axios.create({
  baseURL:
    process.env.REACT_APP_API_BASE_URL ||
    "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
});

// Attach token from cookies before each request
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  } else {
    const ctoken = Cookies.get("sr_token");
    if (ctoken) cfg.headers.Authorization = `Bearer ${ctoken}`;
  }
  return cfg;
});

export default api;
