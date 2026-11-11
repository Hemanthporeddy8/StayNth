import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PropertyListing } from "@/lib/properties";

export function PropertyMap({ listings, onOpen }: { listings: PropertyListing[]; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: true }).setView([12.9716, 77.5946], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    const points: L.LatLngExpression[] = [];
    listings.forEach((listing) => {
      if (typeof listing.latitude !== "number" || typeof listing.longitude !== "number") return;
      const point: L.LatLngExpression = [listing.latitude, listing.longitude];
      points.push(point);
      const marker = L.circleMarker(point, {
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor: listing.mine ? "#d4653f" : "#16313b",
        fillOpacity: 0.95,
      }).addTo(map);
      marker.bindTooltip(`${listing.title} · $${listing.price.toLocaleString()}`, { direction: "top", offset: [0, -8] });
      marker.on("click", () => onOpen(listing.id));
    });
    if (points.length) map.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 13 });
    const timer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => {
      window.clearTimeout(timer);
      map.remove();
    };
  }, [listings, onOpen]);

  return (
    <div className="relative mt-5 overflow-hidden rounded-2xl border border-line bg-white">
      <div ref={ref} className="h-[560px] w-full" />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-line bg-white/90 px-2.5 py-1.5 font-mono text-[8.5px] uppercase tracking-wide text-ink-faint backdrop-blur">
        Click a marker to open the property · map tiles require internet
      </div>
    </div>
  );
}
