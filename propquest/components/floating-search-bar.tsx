"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface FloatingSearchBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function FloatingSearchBar({
  searchQuery,
  onSearchChange,
  placeholder = "Search properties in Petaling Jaya...",
  className = "",
}: FloatingSearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-white/20">
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border-0 bg-transparent pl-6 pr-14 py-3 text-gray-700 placeholder:text-gray-500 focus:ring-0 focus:outline-none rounded-full"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-full p-2">
            <Search className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}
