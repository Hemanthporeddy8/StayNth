import { Box, Check, Minus, X } from "lucide-react";
import { formatPrice, PROPERTY_TYPE_LABEL, type PropertyListing } from "@/lib/properties";
import { AMENITY_OPTIONS } from "@/lib/properties";

export function CompareDialog({
  listings,
  onClose,
  onRemove,
  onOpen3D,
}: {
  listings: PropertyListing[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onOpen3D: (id: string) => void;
}) {
  const rows: { label: string; value: (listing: PropertyListing) => React.ReactNode }[] = [
    { label: "Type", value: (listing) => PROPERTY_TYPE_LABEL[listing.type] },
    { label: "Configuration", value: (listing) => `${listing.bedrooms} BHK · ${listing.bathrooms} bath` },
    { label: "Price", value: (listing) => formatPrice(listing) },
    { label: "Area", value: (listing) => `${listing.area.toLocaleString()} ft²` },
    { label: "Floors", value: (listing) => listing.floorPlans?.length ?? 1 },
    { label: "Beds", value: (listing) => listing.beds },
    { label: "Verified owner", value: (listing) => listing.verification === "verified" ? <Check className="h-4 w-4 text-moss" /> : <Minus className="h-4 w-4 text-ink-faint" /> },
    { label: "Amenities", value: (listing) => `${listing.amenities.length} of ${AMENITY_OPTIONS.length}` },
  ];
  return (
    <div className="animate-fade fixed inset-0 z-[75] flex items-center justify-center bg-ink/45 p-3 backdrop-blur-sm">
      <div className="animate-pop max-h-[92dvh] w-full max-w-5xl overflow-auto rounded-2xl border border-line bg-paper shadow-2xl scroll-warm">
        <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <div><p className="micro text-ink-faint">Side by side</p><h2 className="font-serif text-[25px] text-ink">Compare properties</h2></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint hover:bg-paper-deep"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-w-[680px] p-5">
          <div className="grid" style={{ gridTemplateColumns: `150px repeat(${listings.length}, minmax(180px, 1fr))` }}>
            <div />
            {listings.map((listing) => (
              <div key={listing.id} className="border-l border-line px-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-paper-deep">
                  {listing.photos[0] && <img src={listing.photos[0].url} alt="" className="h-full w-full object-cover" />}
                  <button onClick={() => onRemove(listing.id)} className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-ink-soft"><X className="h-3 w-3" /></button>
                </div>
                <h3 className="mt-2 text-[13px] font-semibold text-ink">{listing.title}</h3>
                <p className="text-[10px] text-ink-faint">{listing.location}</p>
                <button onClick={() => onOpen3D(listing.id)} className="mt-2 flex items-center gap-1 text-[10px] font-medium text-accent"><Box className="h-3 w-3" /> Open 3D</button>
              </div>
            ))}
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <div className="border-t border-line py-3 pr-4 font-mono text-[9px] uppercase tracking-wide text-ink-faint">{row.label}</div>
                {listings.map((listing) => <div key={listing.id} className="border-l border-t border-line px-4 py-3 text-[11px] text-ink-soft">{row.value(listing)}</div>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
