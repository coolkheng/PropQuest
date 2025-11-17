"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Filters = {
  minPrice?: number | null;
  maxPrice?: number | null;
  minSize?: number | null;
  rooms?: number | null;
  toilets?: number | null;
  propertyType?: string[];
  keywords?: string[];
};

export function FiltersModal({
  open,
  onClose,
  onApply,
  onClear,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (f: Filters) => void;
  onClear?: () => void;
  initial?: Filters;
}) {
  const [minPrice, setMinPrice] = useState<number | null>(
    initial?.minPrice ?? null
  );
  const [maxPrice, setMaxPrice] = useState<number | null>(
    initial?.maxPrice ?? null
  );
  const [minSize, setMinSize] = useState<number | null>(
    initial?.minSize ?? null
  );
  const [rooms, setRooms] = useState<number | null>(initial?.rooms ?? null);
  const [toilets, setToilets] = useState<number | null>(
    initial?.toilets ?? null
  );
  const [propertyType, setPropertyType] = useState<string[]>(
    initial?.propertyType ?? []
  );
  const [keywordsRaw, setKeywordsRaw] = useState(
    (initial?.keywords || []).join(", ")
  );
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // initialize when opened
    setMinPrice(initial?.minPrice ?? null);
    setMaxPrice(initial?.maxPrice ?? null);
    setMinSize(initial?.minSize ?? null);
    setRooms(initial?.rooms ?? null);
    setToilets(initial?.toilets ?? null);
    setPropertyType(initial?.propertyType ?? []);
    setKeywordsRaw((initial?.keywords || []).join(", "));
  }, [open, initial]);

  // Handle click outside to close
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
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
  }, [open, onClose]);

  const apply = () => {
    const keywords = keywordsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onApply({
      minPrice: minPrice ?? null,
      maxPrice: maxPrice ?? null,
      minSize: minSize ?? null,
      rooms: rooms ?? null,
      toilets: toilets ?? null,
      propertyType: propertyType.length > 0 ? propertyType : undefined,
      keywords,
    });
    onClose();
  };

  const handleClear = () => {
    setMinPrice(null);
    setMaxPrice(null);
    setMinSize(null);
    setRooms(null);
    setToilets(null);
    setPropertyType([]);
    setKeywordsRaw("");
    // Call parent's clear function if provided
    if (onClear) {
      onClear();
    }
  };

  const propertyTypes = [
    "Terrace",
    "Apartment",
    "Bungalow",
    "Condominium",
    "Link Bungalow",
    "Residential Land",
    "Semi-Detached House",
    "Service Residence",
    "Townhouse",
  ];

  const togglePropertyType = (type: string) => {
    setPropertyType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const roomOptions = [1, 2, 3, 4, 5, 6];

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        open
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none h-0 overflow-hidden"
      }`}
    >
      <div
        ref={modalRef}
        className={`w-full bg-gray-50/95 backdrop-blur-sm rounded-b-2xl border-x border-b border-gray-200/50 transform transition-all duration-300 ease-out origin-top ${
          open
            ? "scale-y-100 translate-y-0 opacity-100"
            : "scale-y-0 -translate-y-4 opacity-0"
        }`}
        style={{
          transformOrigin: "50% 0%",
        }}
      >
        <div className="p-6">
          <div className="space-y-5">
            {/* Price Range and Built Up - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price Range Slider */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Price Range (MYR)
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice ?? ""}
                      onChange={(e) =>
                        setMinPrice(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="flex-1"
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice ?? ""}
                      onChange={(e) =>
                        setMaxPrice(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="flex-1"
                    />
                  </div>
                  <div className="relative h-6 flex items-center">
                    {/* Track background */}
                    <div className="absolute w-full h-2 bg-gray-200 rounded-full" />

                    {/* Active range */}
                    <div
                      className="absolute h-2 bg-blue-600 rounded-full pointer-events-none z-10"
                      style={{
                        left: `${((minPrice ?? 0) / 10000000) * 100}%`,
                        width: `${
                          (((maxPrice ?? 10000000) - (minPrice ?? 0)) /
                            10000000) *
                          100
                        }%`,
                      }}
                    />

                    {/* Min range slider */}
                    <input
                      type="range"
                      min="0"
                      max="10000000"
                      step="100000"
                      value={minPrice ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val <= (maxPrice ?? 10000000)) {
                          setMinPrice(val);
                        }
                      }}
                      className="absolute w-full appearance-none bg-transparent pointer-events-auto cursor-pointer range-slider-thumb z-20"
                    />

                    {/* Max range slider */}
                    <input
                      type="range"
                      min="0"
                      max="10000000"
                      step="100000"
                      value={maxPrice ?? 10000000}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= (minPrice ?? 0)) {
                          setMaxPrice(val);
                        }
                      }}
                      className="absolute w-full appearance-none bg-transparent pointer-events-auto cursor-pointer range-slider-thumb z-20"
                    />
                  </div>
                </div>
              </div>

              {/* Built Up */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Built up (min sqft)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g., 1000"
                  value={minSize ?? ""}
                  onChange={(e) =>
                    setMinSize(e.target.value ? Number(e.target.value) : null)
                  }
                  className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Property Type */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Property Type
                </Label>
                <div className="text-xs text-gray-500">
                  {propertyType.length > 0
                    ? `${propertyType.length} selected`
                    : "Select types"}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {propertyTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => togglePropertyType(type)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-all duration-200 ${
                      propertyType.includes(type)
                        ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                        : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Bedrooms and Bathrooms - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bedrooms */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Bedrooms
                </Label>
                <div className="flex flex-wrap gap-2">
                  {roomOptions.map((num) => (
                    <button
                      key={num}
                      onClick={() => setRooms(rooms === num ? null : num)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                        rooms === num
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                          : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => setRooms(null)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                      rooms === null
                        ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                        : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
                    }`}
                  >
                    Any
                  </button>
                </div>
              </div>

              {/* Bathrooms */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Bathrooms
                </Label>
                <div className="flex flex-wrap gap-2">
                  {roomOptions.map((num) => (
                    <button
                      key={num}
                      onClick={() => setToilets(toilets === num ? null : num)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                        toilets === num
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                          : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => setToilets(null)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                      toilets === null
                        ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                        : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"
                    }`}
                  >
                    Any
                  </button>
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Keywords (comma separated)
              </Label>
              <Input
                value={keywordsRaw}
                onChange={(e) => setKeywordsRaw(e.target.value)}
                placeholder="e.g., swimming pool, gym, parking"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="transition-all duration-200 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                className="transition-all duration-200 hover:bg-gray-100"
              >
                Clear
              </Button>
              <Button
                onClick={apply}
                className="transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Search Properties
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Filters };
