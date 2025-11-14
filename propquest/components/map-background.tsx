import { useEffect, useRef } from "react";
import { loadModules } from "esri-loader";

interface MapBackgroundProps {
  hoveredProperty: string | null;
  Property: Property[];
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
}: MapBackgroundProps) {
  const mapRef = useRef(null);

  useEffect(() => {
    let moveHandler: any | null = null;
    let view: any | null = null;
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

      view = new MapView({
        container: mapRef.current,
        map: map,
        center: [101.6869, 3.139], // default center (Kuala Lumpur)
        zoom: 15,
      });

      // Disable default auto-open on click; we'll control popup manually on hover
      try {
        view.popup.autoOpenEnabled = false;
      } catch {}

      // Address to geocode
      const address = {
        address: "1 Utama Shopping Centre, Petaling Jaya, Malaysia",
      };

      const geocodeUrl =
        "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

      // Use the geocoder
      // Loop through properties
      Property.forEach((property) => {
        locator
          .addressToLocations(geocodeUrl, {
            address: { address: property.address },
            outFields: ["*"],
          })
          .then((results: any[]) => {
            if (results.length) {
              const location = results[0].location;

              const point = {
                type: "point",
                longitude: location.x,
                latitude: location.y,
              };

              const markerSymbol = {
                type: "picture-marker", // Use an image as the marker
                url: "/location-pin.png", // Correct path for public assets in Next.js
                width: "40px", // Adjust the size of the marker
                height: "40px",
              };

              const graphic = new Graphic({
                geometry: point,
                symbol: markerSymbol,
                attributes: {
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

              view.graphics.add(graphic);
            }
          })
          .catch((error: any) => {
            console.error(`Geocoding failed for ${property.address}:`, error);
          });
      });

      // Hover-only popup using pointer-move and hitTest
      moveHandler = view.on("pointer-move", (event: any) => {
        view
          .hitTest(event)
          .then((response: any) => {
            const hit = response.results?.find((r: any) => r.graphic);
            if (hit && hit.graphic && hit.graphic.attributes) {
              const attrs = hit.graphic.attributes;
              const imgHtml = attrs.image
                ? `<img src="${attrs.image}" alt="${attrs.title ?? "Property"}"
                     style="width:110px;height:78px;object-fit:cover;border-radius:8px;margin-right:12px;" />`
                : "";
              view.popup.open({
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
              view.popup.close();
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
      if (view && typeof view.destroy === "function") {
        try {
          view.destroy();
        } catch {}
      }
      view = null;
    };
  }, [Property]);

  return <div ref={mapRef} className="w-full h-full rounded-xl shadow-lg" />;
}
