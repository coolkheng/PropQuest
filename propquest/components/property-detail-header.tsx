"use client";

import { BackNavigation } from "./back-navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/useSession";

interface PropertyDetailHeaderProps {
  referrer: string;
}

export function PropertyDetailHeader({ referrer }: PropertyDetailHeaderProps) {
  const { user, loading, logout } = useSession();

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <BackNavigation referrer={referrer} />
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
        </div>
        <div className="flex items-center space-x-4">
          {!loading && user ? (
            <>
              <span className="text-sm font-medium">
                {user.display_name || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={() => logout()}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:opacity-90 border-0"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
