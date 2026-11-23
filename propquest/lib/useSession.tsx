"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

export type SessionUser = {
  _id: string;
  email: string;
  display_name?: string;
  is_admin?: boolean;
};

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        withCredentials: true,
      });
      setUser(res.data || null);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      // ignore
    }
    // The chat session belongs to this login; don't carry it to the next person.
    try {
      localStorage.removeItem("chatSessionId");
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  return { user, loading, fetchMe, logout } as const;
}
