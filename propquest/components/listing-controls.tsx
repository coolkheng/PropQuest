"use client"

import { ViewToggle } from "@/components/view-toggle"
import { FilterButton } from "@/components/filter-button"

interface ListingControlsProps {
  onFilterClick?: () => void
  filterCount?: number
}

export function ListingControls({ onFilterClick, filterCount = 0 }: ListingControlsProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <ViewToggle activeView="list" />
      <FilterButton onClick={onFilterClick} filterCount={filterCount} />
    </div>
  )
}
