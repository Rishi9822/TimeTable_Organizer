import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors - clear token and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Don't redirect here, let the ProtectedRoute handle it
    }
    return Promise.reject(error);
  }
);

export default API;
