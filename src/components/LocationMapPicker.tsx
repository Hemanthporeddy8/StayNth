import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Crosshair, MapPin, X, Loader2 } from "lucide-react";

export function LocationMapPicker({
  initialLat,
  initialLng,
  initialLocation,
  onSelect,
  onClose,
}: {
  initialLat?: number;
  initialLng?: number;
  initialLocation?: string;
  onSelect: (location: string, lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [lat, setLat] = useState<number>(initialLat ?? 12.9716);
  const [lng, setLng] = useState<number>(initialLng ?? 77.5946);
  const [address, setAddress] = useState(initialLocation ?? "");
  const [busy, setBusy] = useState(false);
  const markerRef = useRef<L.Marker | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    setBusy(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      if (res.ok) {
        const data = await res.json();
        const a = data.address || {};
        const area = a.suburb || a.neighbourhood || a.residential || a.road || "";
        const city = a.city || a.town || a.village || a.county || "";
        const state = a.state || "";
        const parts = [area, city, state].filter(Boolean);
        const resolved = parts.length ? parts.join(", ") : data.display_name?.split(",").slice(0, 3).join(",") || "";
        if (resolved) {
          setAddress(resolved);
        }
      }
    } catch {
      // offline or rate limited, keep manual address
    }
    setBusy(false);
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const startPos: [number, number] = [lat, lng];
    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(startPos, 13);
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Custom circle pulse marker
    const marker = L.marker(startPos, { draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", (e) => {
      const pos = e.target.getLatLng();
      setLat(pos.lat);
      setLng(pos.lng);
      void reverseGeocode(pos.lat, pos.lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
      void reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    const timer = window.setTimeout(() => map.invalidateSize(), 150);

    return () => {
      window.clearTimeout(timer);
      map.remove();
    };
  }, []);

  const handleUseGps = () => {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 15);
          markerRef.current.setLatLng([newLat, newLng]);
        }
        void reverseGeocode(newLat, newLng);
      },
      () => setBusy(false),
      { timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    onSelect(address.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng);
    onClose();
  };

  return (
    <div className="animate-fade fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs">
      <div className="animate-pop flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3 bg-white">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Set Property Location on Map</h3>
              <p className="text-[10px] text-ink-faint">Click anywhere on the map or drag the pin to position your property</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search & Location Bar */}
        <div className="flex items-center gap-2 border-b border-line bg-paper/60 px-4 py-2.5">
          <div className="relative flex-1">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address / Neighborhood / City name"
              className="h-8 w-full rounded-lg border border-line bg-white pl-7 pr-2.5 text-[11px] text-ink outline-none focus:border-ink/40"
            />
            <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-faint" />
          </div>
          <button
            type="button"
            onClick={handleUseGps}
            disabled={busy}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[10.5px] font-medium text-ink-soft hover:bg-paper transition shrink-0"
            title="Use current GPS location"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> : <Crosshair className="h-3.5 w-3.5 text-accent" />}
            <span className="hidden sm:inline">Use My GPS</span>
          </button>
        </div>

        {/* Map Canvas */}
        <div className="relative flex-1 bg-paper-deep">
          <div ref={mapRef} className="h-full w-full" />
          <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-line bg-white/95 px-2.5 py-1.5 font-mono text-[9px] text-ink-soft shadow-xs backdrop-blur">
            📍 Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-line bg-white px-4 py-3">
          <div className="min-w-0 pr-3">
            <p className="truncate text-[11.5px] font-semibold text-ink">
              {address || "No address selected yet"}
            </p>
            <p className="font-mono text-[9px] text-ink-faint">
              Lat: {lat.toFixed(5)} · Lng: {lng.toFixed(5)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink-soft hover:bg-paper transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-1.5 text-[11.5px] font-semibold text-white hover:bg-ink/90 transition shadow-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
