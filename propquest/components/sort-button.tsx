"use client";

import { ArrowUpDown, ArrowUp, ArrowDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";

export type SortOption = {
  label: string;
  value: string;
  direction: "asc" | "desc";
};

interface SortButtonProps {
  onSortChange?: (option: SortOption) => void;
  className?: string;
}

export function SortButton({ onSortChange, className = "" }: SortButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sortOptions: SortOption[] = [
    { label: "Price: Low to High", value: "price", direction: "asc" },
    { label: "Price: High to Low", value: "price", direction: "desc" },
    { label: "Area: Small to Large", value: "area", direction: "asc" },
    { label: "Area: Large to Small", value: "area", direction: "desc" },
    { label: "Name: A to Z", value: "name", direction: "asc" },
    { label: "Name: Z to A", value: "name", direction: "desc" },
    { label: "Date: Newest First", value: "date", direction: "desc" },
    { label: "Date: Oldest First", value: "date", direction: "asc" },
  ];

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Add delay to prevent immediate close when opening
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSortSelect = (option: SortOption) => {
    setSelectedSort(option);
    setIsOpen(false);
    if (onSortChange) {
      onSortChange(option);
    }
  };

  const getSortIcon = (option: SortOption) => {
    if (option.direction === "asc") {
      return <ArrowUp className="h-3 w-3" />;
    }
    return <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        className={`bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm rounded-full ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ArrowUpDown className="h-4 w-4 mr-2" />
        Sort
        {selectedSort && (
          <span className="ml-2 text-xs text-gray-600">
            ({selectedSort.label})
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-2">
            {sortOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSortSelect(option)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-md transition-colors ${
                  selectedSort?.label === option.label
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {getSortIcon(option)}
                  <span>{option.label}</span>
                </div>
                {selectedSort?.label === option.label && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
