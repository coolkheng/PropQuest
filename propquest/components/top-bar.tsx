"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/useSession";
import { useState, useRef, useEffect } from "react";

export function TopBar() {
  const { user, loading, logout } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/propquest_header_logo.png"
            alt="PropQuest Logo"
            width={150}
            height={40}
            className="object-contain"
          />
        </Link>
        <div className="flex items-center space-x-4" ref={rootRef}>
          {!loading && user ? (
            <div className="relative">
              <button
                onClick={() => setOpen((s) => !s)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium"
              >
                <span>{user.display_name || user.email}</span>
                <svg
                  className="h-4 w-4 text-gray-600"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 8l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg border border-gray-100 z-50">
                  <div className="py-1">
                    <Link
                      href="/preferences"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Manage preferences
                    </Link>
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Manage account
                    </Link>
                    <button
                      onClick={() => {
                        setOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:opacity-90 border-0"
                >
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
