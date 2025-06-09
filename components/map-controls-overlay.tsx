"use client"

import { ViewToggle } from "@/components/view-toggle"
import { FilterButton } from "@/components/filter-button"
import { FloatingSearchBar } from "@/components/floating-search-bar"

interface MapControlsOverlayProps {
  activeView: "map" | "list"
  onFilterClick?: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function MapControlsOverlay({
  activeView,
  onFilterClick,
  searchQuery,
  onSearchChange,
}: MapControlsOverlayProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
      <ViewToggle activeView={activeView} />

      <div className="w-1/3 mx-4">
        <FloatingSearchBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          placeholder="Search properties..."
        />
      </div>

      <FilterButton onClick={onFilterClick} />
    </div>
  )
}
