import React, { createContext, useContext, useEffect, useState } from "react";
import API from "@/lib/api";

export const AppRole = {
  ADMIN: "admin",
  SCHEDULER: "scheduler",
  TEACHER: "teacher",
  STUDENT: "student",
};

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Restore session on refresh
  useEffect(() => {
  const loadSession = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await API.get("/auth/me");
      setUser(data.user);
      setRole(data.user.role);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  loadSession();
}, []);


  const signUp = async (email, password, name, role = "student") => {
    const res = await API.post("/auth/register", {
      name,
      email,
      password,
      role,
    });

    localStorage.setItem("token", res.data.token);

    setUser(res.data.user);
    setRole(res.data.user.role);

    return { error: null };
  };


  const signIn = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });

    localStorage.setItem("token", res.data.token);

    setUser(res.data.user);
    setRole(res.data.user.role);

    return { error: null };
  };


  const signOut = async () => {
    localStorage.removeItem("token");
    setUser(null);
    setRole(null);
  };

  const hasRole = (requiredRole) => {
    if (!role) return false;

    const roles = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];

    if (role === "admin") return true;
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        signUp,
        signIn,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
