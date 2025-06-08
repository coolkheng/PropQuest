import { MapControlsOverlay } from "./map-controls-overlay"

interface MapControlsProps {
  activeView: "map" | "list"
  onFilterClick?: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function MapControls({ activeView, onFilterClick, searchQuery, onSearchChange }: MapControlsProps) {
  return (
    <MapControlsOverlay
      activeView={activeView}
      onFilterClick={onFilterClick}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
    />
  )
}
