"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";

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
      const res = await axios.get("http://localhost:5001/api/auth/me", {
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
        "http://localhost:5001/api/auth/logout",
        {},
        { withCredentials: true }
      );
    } catch (err) {
      // ignore
    }
    setUser(null);
  }, []);

  return { user, loading, fetchMe, logout } as const;
}
