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
  const [institutionId, setInstitutionId] = useState(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
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
        setInstitutionId(data.user.institutionId || null);
        setIsSetupComplete(Boolean(data.user.isSetupComplete));
        setEmailVerified(Boolean(data.user.emailVerified));
      } catch {
        localStorage.removeItem("token");
        setUser(null);
        setRole(null);
        setInstitutionId(null);
        setIsSetupComplete(false);
        setEmailVerified(false);

      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);


  const signUp = async (email, password, name, role = "student") => {
    try {
      const res = await API.post("/auth/register", {
        name,
        email,
        password,
        role,
      });

      localStorage.setItem("token", res.data.token);

      setUser(res.data.user);
      setRole(res.data.user.role);
      setInstitutionId(res.data.user.institutionId || null);
      setIsSetupComplete(!!res.data.user.isSetupComplete);
      setEmailVerified(!!res.data.user.emailVerified);

      return { error: null };
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to create account";
      return { error: { message } };
    }
  };

  const signIn = async (email, password) => {
    try {
      const res = await API.post("/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);

      setUser(res.data.user);
      setRole(res.data.user.role);
      setInstitutionId(res.data.user.institutionId || null);
      setIsSetupComplete(!!res.data.user.isSetupComplete);
      setEmailVerified(!!res.data.user.emailVerified);

      return { error: null };
    } catch (error) {
      const message =
        error.response?.data?.message || "Invalid email or password";
      return { error: { message } };
    }
  };


  const signOut = async () => {
    localStorage.removeItem("token");
    setUser(null);
    setRole(null);
    setInstitutionId(null);
    setIsSetupComplete(false);
    setEmailVerified(false);

  };


  const refreshUserData = async () => {
  try {
    const { data } = await API.get("/auth/me");
    setUser(data.user);
    setRole(data.user.role);
    setInstitutionId(data.user.institutionId || null);
    setIsSetupComplete(!!data.user.isSetupComplete);
    setEmailVerified(!!data.user.emailVerified);
  } catch {
    signOut();
  }
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
    institutionId,
    isSetupComplete,
    emailVerified,
    loading,
    signUp,
    signIn,
    signOut,
    hasRole,
    refreshUserData,
  }}
>

      {children}
    </AuthContext.Provider>
  );
};
