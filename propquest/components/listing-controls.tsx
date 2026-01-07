"use client";

import { ViewToggle } from "@/components/view-toggle";
import { FilterButton } from "@/components/filter-button";
import { SortButton, SortOption } from "@/components/sort-button";

interface ListingControlsProps {
  onFilterClick?: () => void;
  filterCount?: number;
  onSortChange?: (option: SortOption) => void;
  isLoggedIn?: boolean;
}

export function ListingControls({
  onFilterClick,
  filterCount = 0,
  onSortChange,
  isLoggedIn = false,
}: ListingControlsProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <ViewToggle activeView="list" isLoggedIn={isLoggedIn} />
      <div className="flex items-center gap-3">
        <SortButton onSortChange={onSortChange} />
        <FilterButton onClick={onFilterClick} filterCount={filterCount} />
      </div>
    </div>
  );
}
