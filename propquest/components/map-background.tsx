"use client";

import { useEffect, useRef, useState } from "react";
import { loadModules } from "esri-loader";

interface MapBackgroundProps {
  hoveredProperty: string | null;
  Property: Property[];
  isAISearch?: boolean; // true when showing AI search results, false/undefined for initial load
}

interface Property {
  _id: string;
  url: string;
  title: string;
  address: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  psf: string;
  house_type: string;
  furnishing: string;
  lease_type: string;
  date_listed: string;
  images: string[];
  facilities: string[];
}

const geocodeUrl =
  "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

export function MapBackground({
  hoveredProperty,
  Property,
  isAISearch = false,
}: MapBackgroundProps) {
  const mapRef = useRef(null);
  const viewRef = useRef<any>(null);
  const graphicsMapRef = useRef<Map<string, any>>(new Map());
  const lastHoveredRef = useRef<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const failedGeocodesRef = useRef(0);
  const MAX_GEOCODE_FAILURES = 10;
  const mapLoadStartTimeRef = useRef<number>(0);

  // Effect for initial map setup and geocoding - runs only when Property changes
  useEffect(() => {
    let moveHandler: any | null = null;
    mapLoadStartTimeRef.current = performance.now();
    setIsMapLoading(true);
    setMapError(null);
    failedGeocodesRef.current = 0;

    loadModules(
      [
        "esri/config",
        "esri/Map",
        "esri/views/MapView",
        "esri/rest/locator",
        "esri/Graphic",
      ],
      { css: true }
    )
      .then(([esriConfig, Map, MapView, locator, Graphic]) => {
        // Use your API key from .env
        esriConfig.apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;

        const map = new Map({ basemap: "streets" });

        viewRef.current = new MapView({
          container: mapRef.current,
          map: map,
          center: [101.6869, 3.139], // default center (Kuala Lumpur)
          zoom: 15,
        });

        // Disable default auto-open on click; we'll control popup manually on hover
        try {
          viewRef.current.popup.autoOpenEnabled = false;
        } catch {}

        // Map loaded successfully
        const loadTime = (
          (performance.now() - mapLoadStartTimeRef.current) /
          1000
        ).toFixed(2);
        console.log(`⏱️ MAP PERFORMANCE: Map rendered in ${loadTime} seconds`);
        setIsMapLoading(false);

        // Use the geocoder
        // Limit to 50 properties for initial map loading, but show all for AI search results
        const propertiesToGeocode = isAISearch
          ? Property
          : Property.slice(0, 50);
        console.log("Geocoding properties:", propertiesToGeocode.length);

        // Clear previous graphics
        graphicsMapRef.current.clear();

        let isFirstProperty = true;

        // Loop through properties
        propertiesToGeocode.forEach((property) => {
          locator
            .addressToLocations(geocodeUrl, {
              address: { address: property.address },
              outFields: ["*"],
            })
            .then((results: any[]) => {
              if (results.length) {
                const location = results[0].location;

                // Center map on first property
                if (isFirstProperty) {
                  viewRef.current.center = [location.x, location.y];
                  isFirstProperty = false;
                }

                const point = {
                  type: "point",
                  longitude: location.x,
                  latitude: location.y,
                };

                const markerSymbol = {
                  type: "picture-marker",
                  url: "/location-pin.png", // Start with default red pin
                  width: "40px",
                  height: "40px",
                };

                const graphic = new Graphic({
                  geometry: point,
                  symbol: markerSymbol,
                  attributes: {
                    _id: property._id, // Add property ID to identify marker
                    title: property.title,
                    address: property.address,
                    price: property.price,
                    beds: property.beds,
                    baths: property.baths,
                    sqft: property.sqft,
                    url: property.url,
                    image:
                      Array.isArray(property.images) &&
                      property.images.length > 0
                        ? property.images[0]
                        : null,
                  },
                });

                viewRef.current.graphics.add(graphic);
                graphicsMapRef.current.set(property._id, graphic); // Store reference to update later
              }
            })
            .catch((error: any) => {
              console.error(`Geocoding failed for ${property.address}:`, error);
              failedGeocodesRef.current++;

              // Show fallback marker at city center with special styling
              const fallbackPoint = {
                type: "point",
                longitude: 101.6869, // Kuala Lumpur center
                latitude: 3.139,
              };

              const fallbackSymbol = {
                type: "picture-marker",
                url: "/location-pin.png", // Same icon but will show as unavailable in popup
                width: "35px",
                height: "35px",
              };

              const fallbackGraphic = new Graphic({
                geometry: fallbackPoint,
                symbol: fallbackSymbol,
                attributes: {
                  _id: property._id,
                  title: property.title,
                  address: `${property.address} (Location unavailable)`,
                  price: property.price,
                  beds: property.beds,
                  baths: property.baths,
                  sqft: property.sqft,
                  url: property.url,
                  image:
                    Array.isArray(property.images) && property.images.length > 0
                      ? property.images[0]
                      : null,
                  _geocodingFailed: true,
                },
              });

            if (viewRef.current) {
              viewRef.current.graphics.add(fallbackGraphic);
              graphicsMapRef.current.set(property._id, fallbackGraphic);

              // Show warning if too many failures (rate limit)
              if (failedGeocodesRef.current >= MAX_GEOCODE_FAILURES) {
                console.warn(
                  "Multiple geocoding failures detected. Map service may be rate-limited."
                );
              }
            }
          });
        });

        // Hover-only popup using pointer-move and hitTest
        moveHandler = viewRef.current.on("pointer-move", (event: any) => {
          viewRef.current
            .hitTest(event)
            .then((response: any) => {
              const hit = response.results?.find((r: any) => r.graphic);
              if (hit && hit.graphic && hit.graphic.attributes) {
                const attrs = hit.graphic.attributes;

                // Add scale-up animation on hover
                const graphic = hit.graphic;
                if (!graphic.originalSize) {
                  graphic.originalSize = {
                    width: graphic.symbol.width,
                    height: graphic.symbol.height,
                  };
                }
                graphic.symbol = {
                  type: "picture-marker",
                  url: graphic.symbol.url,
                  width: "45px",
                  height: "45px",
                };

                const imgHtml = attrs.image
                  ? `<img src="${attrs.image}" alt="${
                      attrs.title ?? "Property"
                    }"
                     style="width:110px;height:78px;object-fit:cover;border-radius:8px;margin-right:12px;" />`
                  : "";
                viewRef.current.popup.open({
                  title: attrs.title || "Property",
                  content: `
                  <div style="line-height:1.4">
                    <div style="display:flex;align-items:flex-start;">
                      ${imgHtml}
                      <div>
                        <div><strong>Address:</strong> ${
                          attrs.address ?? "-"
                        }</div>
                        <div><strong>Price:</strong> ${attrs.price ?? "-"}</div>
                        <div><strong>Beds:</strong> ${attrs.beds ?? "-"}</div>
                        <div><strong>Baths:</strong> ${attrs.baths ?? "-"}</div>
                        <div><strong>Sqft:</strong> ${attrs.sqft ?? "-"}</div>
                        ${
                          attrs._id
                            ? `<div style="margin-top:10px;">
                                <a href="${`http://localhost:3000/property/${attrs._id}`}" 
                                   style="display:inline-block;padding:8px 16px;background:linear-gradient(to right, #2563eb, #3b82f6, #60a5fa);color:white;text-decoration:none;border-radius:6px;font-weight:600;text-align:center;transition:opacity 0.2s;"
                                   onmouseover="this.style.opacity='0.9'" 
                                   onmouseout="this.style.opacity='1'">
                                  View Full Details →
                                </a>
                              </div>`
                            : ""
                        }
                      </div>
                    </div>
                  </div>
                `,
                  location: hit.graphic.geometry,
                });
              } else {
                viewRef.current.popup.close();

                // Reset size of previously hovered graphic
                viewRef.current.graphics.items.forEach((graphic: any) => {
                  if (
                    graphic.originalSize &&
                    graphic.symbol.url === "/location-pin.png"
                  ) {
                    graphic.symbol = {
                      type: "picture-marker",
                      url: "/location-pin.png",
                      width: "40px",
                      height: "40px",
                    };
                  }
                });
              }
            })
            .catch(() => {
              // ignore hitTest errors
            });
        });
      })
      .catch((error) => {
        console.error("Map initialization failed:", error);
        setMapError("Unable to load map. Please refresh the page.");
        setIsMapLoading(false);
      });

    // Cleanup: remove pointer handler and destroy the view
    return () => {
      if (moveHandler && typeof moveHandler.remove === "function") {
        try {
          moveHandler.remove();
        } catch {}
      }
      moveHandler = null;
      if (viewRef.current && typeof viewRef.current.destroy === "function") {
        try {
          viewRef.current.destroy();
        } catch {}
      }
      viewRef.current = null;
    };
  }, [Property, isAISearch]); // Only re-run when Property array changes

  // Separate effect to handle hover state changes - only updates marker symbols
  useEffect(() => {
    if (!viewRef.current || graphicsMapRef.current.size === 0) return;

    const updateMarker = (propertyId: string, isHovered: boolean) => {
      const graphic = graphicsMapRef.current.get(propertyId);
      if (!graphic) return;

      if (isHovered) {
        // Remove and re-add to bring to front
        viewRef.current.graphics.remove(graphic);
        graphic.symbol = {
          type: "picture-marker",
          url: "/highlighted-location-pin.png",
          width: "50px",
          height: "50px",
        };
        viewRef.current.graphics.add(graphic);

        // Animate size with pulse effect
        let size = 50;
        let growing = true;
        const animationInterval = setInterval(() => {
          if (growing) {
            size += 1;
            if (size >= 55) growing = false;
          } else {
            size -= 1;
            if (size <= 50) growing = true;
          }

          const currentGraphic = graphicsMapRef.current.get(propertyId);
          if (
            currentGraphic &&
            currentGraphic.symbol.url === "/highlighted-location-pin.png"
          ) {
            currentGraphic.symbol = {
              type: "picture-marker",
              url: "/highlighted-location-pin.png",
              width: `${size}px`,
              height: `${size}px`,
            };
          } else {
            clearInterval(animationInterval);
          }
        }, 50);

        // Store interval ID for cleanup
        (graphic as any).animationInterval = animationInterval;
      } else {
        // Clear animation interval if exists
        if ((graphic as any).animationInterval) {
          clearInterval((graphic as any).animationInterval);
          delete (graphic as any).animationInterval;
        }

        graphic.symbol = {
          type: "picture-marker",
          url: "/location-pin.png",
          width: "40px",
          height: "40px",
        };
      }
    };

    if (hoveredProperty) {
      // User is hovering over a property
      if (
        lastHoveredRef.current &&
        lastHoveredRef.current !== hoveredProperty
      ) {
        // Revert the previously highlighted marker
        updateMarker(lastHoveredRef.current, false);
      }

      // Highlight the new property
      updateMarker(hoveredProperty, true);
      lastHoveredRef.current = hoveredProperty;
    }
    // Note: We do NOT revert when hoveredProperty becomes null
    // The highlighted marker stays until user hovers another property
  }, [hoveredProperty]); // Only re-run when hoveredProperty changes

  return (
    <div className="relative w-full h-full">
      {/* Loading State */}
      {isMapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl z-10">
          <div className="text-center p-6">
            <p className="text-red-600 mb-4">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}

      {/* Rate Limit Warning */}
      {failedGeocodesRef.current >= MAX_GEOCODE_FAILURES && !mapError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg z-10">
          <p className="text-sm">
            ⚠️ Some properties may not display correctly. Map service is
            experiencing high demand.
          </p>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full rounded-xl shadow-lg" />
    </div>
  );
}
