// Limits on how many properties get a pin on the map.
// Every uncached pin costs one ArcGIS geocoding request, so large result sets are capped.
export const MAP_MAX_AI_RESULTS = 100; // AI chat search results
export const MAP_MAX_INITIAL = 50; // default listings on first load

export function mapPropertyLimit(isAISearch: boolean) {
  return isAISearch ? MAP_MAX_AI_RESULTS : MAP_MAX_INITIAL;
}
