"use client";
import type React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";

export type UserRole = "student" | "institution" | "employer" | "admin";

export type RegistrationData = {
  name: string;
  email: string;
  password: string;
  role: Exclude<UserRole, "admin">;
  walletAddress?: string;
};

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  walletAddress?: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegistrationData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await axios.post<User>(`${API_URL}/api/auth/login`, { email, password });
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
      router.push("/dashboard");
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "Login failed"));
    }
  };

  const register = async (userData: RegistrationData) => {
    try {
      const { data } = await axios.post<User>(`${API_URL}/api/auth/register`, userData);
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
      router.push("/dashboard");
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "Registration failed"));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
