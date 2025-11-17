"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FloatingSearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onIconClick?: () => void;
  onInputClick?: () => void;
  isExpanded?: boolean;
}

export function FloatingSearchBar({
  searchQuery,
  onSearchChange,
  placeholder = "Search properties in Petaling Jaya...",
  className = "",
  onIconClick,
  onInputClick,
  isExpanded = false,
}: FloatingSearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <div
        className={`backdrop-blur-sm transition-all duration-300 ease-out ${
          isExpanded
            ? "bg-gray-50/95 border border-gray-200/50 rounded-t-2xl shadow-lg"
            : "bg-white/95 border border-white/20 rounded-full shadow-sm"
        }`}
      >
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onClick={() => onInputClick && onInputClick()}
          className={`border-0 bg-transparent text-gray-700 placeholder:text-gray-500 focus:ring-0 focus:outline-none transition-all duration-300 ${
            isExpanded
              ? "pl-6 pr-14 py-5 rounded-t-2xl"
              : "pl-6 pr-14 py-5 rounded-full"
          }`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <button
            onClick={() => onIconClick && onIconClick()}
            aria-label={
              isExpanded ? "Close search filters" : "Open search filters"
            }
            className="rounded-full p-2 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 
             transition-transform duration-200 hover:scale-110"
          >
            {isExpanded ? (
              <X className="h-4 w-4 text-white" />
            ) : (
              <Search className="h-4 w-4 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
