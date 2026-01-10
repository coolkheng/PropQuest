"use client"

import { ViewToggle } from "@/components/view-toggle"
import { FilterButton } from "@/components/filter-button"

interface ListingControlsProps {
  onFilterClick?: () => void
}

export function ListingControls({ onFilterClick }: ListingControlsProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <ViewToggle activeView="list" />
      <FilterButton onClick={onFilterClick} />
    </div>
  )
}
