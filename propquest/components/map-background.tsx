import { useEffect, useRef } from "react";
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

export function MapBackground({
  hoveredProperty,
  Property,
  isAISearch = false,
}: MapBackgroundProps) {
  const mapRef = useRef(null);
  const viewRef = useRef<any>(null);
  const graphicsMapRef = useRef<Map<string, any>>(new Map());
  const lastHoveredRef = useRef<string | null>(null);

  // Effect for initial map setup and geocoding - runs only when Property changes
  useEffect(() => {
    let moveHandler: any | null = null;

    loadModules(
      [
        "esri/config",
        "esri/Map",
        "esri/views/MapView",
        "esri/rest/locator",
        "esri/Graphic",
      ],
      { css: true }
    ).then(([esriConfig, Map, MapView, locator, Graphic]) => {
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

      const geocodeUrl =
        "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

      // Use the geocoder
      // Limit to 50 properties for initial map loading, but show all for AI search results
      const propertiesToGeocode = isAISearch ? Property : Property.slice(0, 50);
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
                    Array.isArray(property.images) && property.images.length > 0
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
              const imgHtml = attrs.image
                ? `<img src="${attrs.image}" alt="${attrs.title ?? "Property"}"
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
                          attrs.url
                            ? `<div style="margin-top:6px;"><a href="${attrs.url}" target="_blank" rel="noopener noreferrer">View listing</a></div>`
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
            }
          })
          .catch(() => {
            // ignore hitTest errors
          });
      });
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
      } else {
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

  return <div ref={mapRef} className="w-full h-full rounded-xl shadow-lg" />;
}
