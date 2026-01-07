import { MapControlsOverlay } from "./map-controls-overlay";

interface MapControlsProps {
  activeView: "map" | "list" | "forYou";
  onFilterClick?: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isLoggedIn?: boolean;
}

export function MapControls({
  activeView,
  onFilterClick,
  searchQuery,
  onSearchChange,
  isLoggedIn = false,
}: MapControlsProps) {
  return (
    <MapControlsOverlay
      activeView={activeView}
      onFilterClick={onFilterClick}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      isLoggedIn={isLoggedIn}
    />
  );
}
