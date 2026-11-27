import { useEffect, useRef, useState, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as pmtiles from "pmtiles";
import { layers as protomapsLayers, labels as protomapsLabels } from "protomaps-themes-base";
import type { PropertyListing } from "@/lib/properties";
import { Compass, Layers, MapPin, Maximize2, Moon, Sun, Sparkles, Zap, Navigation } from "lucide-react";
import { cn } from "@/utils/cn";

const RYDEALOT_PMTILES_URL = "https://rydealot-supermaps-api.rydealotmaps.workers.dev/api/v1/pmtiles/india.pmtiles";

// Register pmtiles protocol once globally
let pmtilesProtocolRegistered = false;
function ensurePmtilesProtocol() {
  if (!pmtilesProtocolRegistered) {
    try {
      const protocol = new pmtiles.Protocol();
      maplibregl.addProtocol("pmtiles", protocol.tile);
      pmtilesProtocolRegistered = true;
    } catch (e) {
      // Protocol may already be registered
    }
  }
}

function buildMapStyle(theme: "light" | "dark") {
  return {
    version: 8 as const,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      protomaps: {
        type: "vector" as const,
        url: `pmtiles://${RYDEALOT_PMTILES_URL}`,
        attribution: "© Rydealot Maps · OpenStreetMap",
      },
    },
    layers: [
      ...protomapsLayers("protomaps", theme),
      ...protomapsLabels("protomaps", theme),
    ],
  };
}

export function PropertyMap({
  listings,
  onOpen,
}: {
  listings: PropertyListing[];
  onOpen: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize MapLibre GL with Rydealot PMTiles
  useEffect(() => {
    if (!containerRef.current) return;
    ensurePmtilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(mapTheme),
      center: [76.5, 12.3], // Centered around Karnataka / Kerala Western Ghats
      zoom: 7.5,
      pitch: 20, // Subtle 3D angle
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      setMapLoaded(true);
      map.resize();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle Theme Change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    mapRef.current.setStyle(buildMapStyle(mapTheme));
  }, [mapTheme, mapLoaded]);

  // Update Markers whenever listings change or map loads
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let validCount = 0;

    listings.forEach((listing) => {
      if (typeof listing.latitude !== "number" || typeof listing.longitude !== "number") return;
      const lng = listing.longitude;
      const lat = listing.latitude;

      bounds.extend([lng, lat]);
      validCount++;

      // Create Custom Interactive Marker DOM element
      const el = document.createElement("div");
      el.className = "group cursor-pointer select-none";
      el.innerHTML = `
        <div class="relative flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md transition-all duration-200 transform group-hover:scale-110 group-hover:z-50 ${
          listing.mine
            ? "bg-amber-600 text-white ring-2 ring-amber-300"
            : "bg-stone-900 text-white ring-2 ring-white hover:bg-black"
        }">
          <span class="text-[10px]">🏡</span>
          <span>₹${listing.price.toLocaleString()}</span>
        </div>
      `;

      // Popup on Hover/Click
      const popup = new maplibregl.Popup({
        offset: 14,
        closeButton: false,
        maxWidth: "240px",
      }).setHTML(`
        <div class="p-2 space-y-1.5 font-sans">
          <div class="font-bold text-[12px] text-stone-900 line-clamp-1">${listing.title}</div>
          <div class="text-[10px] text-stone-500 flex items-center justify-between">
            <span>📍 ${listing.city}</span>
            <span class="font-semibold text-amber-700 font-mono">₹${listing.price.toLocaleString()}/night</span>
          </div>
          <div class="text-[9.5px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
            📐 1:1 Interactive 3D Walkthrough
          </div>
          <div class="text-[9.5px] text-stone-400 text-center pt-0.5">Click marker to inspect 3D plan</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener("mouseenter", () => marker.togglePopup());
      el.addEventListener("mouseleave", () => marker.togglePopup());
      el.addEventListener("click", () => onOpen(listing.id));

      markersRef.current.push(marker);
    });

    // Fit map to markers bounds
    if (validCount > 0) {
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 13,
        duration: 1000,
      });
    }
  }, [listings, mapLoaded, onOpen]);

  // Reset / Recenter camera to all listings
  const handleFitAll = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = new maplibregl.LngLatBounds();
    let count = 0;
    listings.forEach((l) => {
      if (typeof l.latitude === "number" && typeof l.longitude === "number") {
        bounds.extend([l.longitude, l.latitude]);
        count++;
      }
    });
    if (count > 0) {
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 13,
        duration: 800,
      });
    }
  }, [listings]);

  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl border border-line bg-paper shadow-xs">
      {/* MapLibre Canvas Container */}
      <div ref={containerRef} className="h-[580px] w-full" />

      {/* Floating Header Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        {/* Rydealot Maps Engine Badge */}
        <div className="flex items-center gap-2 rounded-xl border border-line/80 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur-md">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/15 text-accent text-[11px] font-bold">
            🗺️
          </span>
          <div>
            <span className="block text-[11px] font-bold text-ink leading-tight">
              Rydealot Vector Maps
            </span>
            <span className="block text-[9px] font-mono text-emerald-700 font-semibold leading-tight">
              Cloudflare PMTiles · 0 API Cost
            </span>
          </div>
        </div>

        {/* Theme Switcher Toggle */}
        <button
          type="button"
          onClick={() => setMapTheme((t) => (t === "light" ? "dark" : "light"))}
          className="flex items-center gap-1.5 rounded-xl border border-line/80 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-ink shadow-md backdrop-blur-md hover:bg-paper transition"
          title={`Switch to ${mapTheme === "light" ? "Midnight Dark" : "Paper Light"} vector map`}
        >
          {mapTheme === "light" ? (
            <>
              <Moon className="h-3.5 w-3.5 text-accent" />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span>Light Mode</span>
            </>
          )}
        </button>

        {/* Fit All Listings Button */}
        <button
          type="button"
          onClick={handleFitAll}
          className="flex items-center gap-1.5 rounded-xl border border-line/80 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-ink shadow-md backdrop-blur-md hover:bg-paper transition"
          title="Fit all homestays in view"
        >
          <Navigation className="h-3.5 w-3.5 text-ink-soft" />
          <span>Fit Listings</span>
        </button>
      </div>

      {/* Bottom Hint & Telemetry Bar */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2">
        <div className="rounded-lg border border-line/80 bg-white/90 px-3 py-1 font-mono text-[9px] uppercase tracking-wide text-ink-soft backdrop-blur-md shadow-xs">
          Hover for homestay pricing · Click pin to walk in 3D
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-line/80 bg-white/90 px-2.5 py-1 font-mono text-[9px] text-ink-faint backdrop-blur-md shadow-xs">
          <Zap className="h-3 w-3 text-amber-500" />
          <span>Streamed via HTTP Range Requests (india.pmtiles)</span>
        </div>
      </div>
    </div>
  );
}
