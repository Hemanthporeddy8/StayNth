import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Eye,
  Images,
  Rotate3D,
  ImageOff,
  Loader2,
  Maximize,
  Ruler,
  X,
} from "lucide-react";
import type { Room } from "@/types";
import { formatFeet, ROOM_LABEL } from "@/lib/plan";
import { getRoomPhotos } from "@/lib/roomPhotos";
import { cn } from "@/utils/cn";
import { RoomPhotoControls } from "@/components/RoomPhotoControls";
import { Panorama360 } from "@/components/Panorama360";

export function RoomPhotoViewer({
  room,
  planName,
  onClose,
  onUpdateRoom,
  rooms,
  onNavigate,
}: {
  room: Room | null;
  planName: string;
  onClose: () => void;
  onUpdateRoom: (roomId: string, patch: Partial<Room>) => void;
  rooms: Room[];
  onNavigate: (roomId: string) => void;
}) {
  const photos = useMemo(() => (room ? getRoomPhotos(room) : []), [room]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<"photos" | "360">("photos");

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
    setFailed(false);
    setView(room?.panorama ? "360" : "photos");
  }, [room?.id]);

  useEffect(() => {
    if (room?.panorama) setView("360");
  }, [room?.panorama?.url]);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [index, room]);

  useEffect(() => {
    setIndex((currentIndex) => Math.min(currentIndex, Math.max(0, photos.length - 1)));
  }, [photos.length]);

  useEffect(() => {
    if (!room) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (view === "360") return;
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + photos.length) % photos.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [room, photos.length, onClose, view]);

  if (!room || !photos.length) return null;
  const current = photos[index] ?? photos[0];
  const hasMany = photos.length > 1;

  return (
    <div className="animate-fade fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-2 backdrop-blur-md sm:p-5">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close room photos" />
      <div className="animate-pop relative flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-paper shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
              <Eye className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-serif text-[22px] leading-tight text-ink sm:text-[25px]">{room.name}</h2>
                <span className="hidden rounded-full border border-line bg-paper px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-ink-soft sm:inline">
                  {ROOM_LABEL[room.type]}
                </span>
              </div>
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
                {view === "360" ? "Interactive 360° panorama" : current.kind === "upload" ? "Your uploaded room photo" : "Real interior reference"} · {planName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition hover:bg-paper-deep hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto scroll-warm lg:grid-cols-[minmax(0,1fr)_248px] lg:overflow-hidden">
          <div className="flex min-h-0 flex-col bg-[#e8e1d4] p-2 sm:p-3">
            {room.panorama && (
              <div className="mb-2 flex shrink-0 self-start rounded-lg border border-line bg-white p-1">
                <button onClick={() => setView("photos")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px]", view === "photos" ? "bg-ink text-white" : "text-ink-soft")}><Images className="h-3 w-3" /> Photos</button>
                <button onClick={() => setView("360")} className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px]", view === "360" ? "bg-ink text-white" : "text-ink-soft")}><Rotate3D className="h-3 w-3" /> 360° view</button>
              </div>
            )}
            <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-xl bg-paper-deep sm:min-h-[340px] lg:min-h-0">
              {!loaded && !failed && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-paper-deep text-ink-faint">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em]">Loading interior photo</span>
                </div>
              )}
              {failed ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-ink-soft">
                  <ImageOff className="h-7 w-7 text-ink-faint" />
                  <p className="text-[12px] font-medium">This photo could not be loaded</p>
                  {current.kind === "reference" ? (
                    <a href={current.source} target="_blank" rel="noreferrer" className="text-[11px] text-accent underline">
                      Open the original photo
                    </a>
                  ) : (
                    <p className="text-[10px] text-ink-faint">Remove this image and try uploading it again.</p>
                  )}
                </div>
              ) : (
                <img
                  key={current.url}
                  src={current.url}
                  alt={current.alt}
                  onLoad={() => setLoaded(true)}
                  onError={() => setFailed(true)}
                  className={cn("h-full w-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
                />
              )}

              <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/30 bg-ink/55 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-white backdrop-blur">
                {index + 1} / {photos.length} · {current.kind === "upload" ? "Your uploaded photo" : "Real room photo"}
              </div>

              {hasMany && (
                <>
                  <button
                    onClick={() => setIndex((index - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/90 text-ink shadow-lg backdrop-blur transition hover:bg-white"
                    aria-label="Previous photo"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIndex((index + 1) % photos.length)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/90 text-ink shadow-lg backdrop-blur transition hover:bg-white"
                    aria-label="Next photo"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}
              {view === "360" && room.panorama && (
                <Panorama360 image={room.panorama} rooms={rooms} currentRoomId={room.id} onNavigate={onNavigate} />
              )}
            </div>

            {hasMany && view === "photos" && (
              <div className="mt-2 flex shrink-0 gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                {photos.map((p, i) => (
                  <button
                    key={p.url}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition sm:h-16 sm:w-28",
                      i === index ? "border-accent" : "border-transparent opacity-65 hover:opacity-100",
                    )}
                    aria-label={`View photo ${i + 1}`}
                  >
                    <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="flex shrink-0 flex-col border-t border-line bg-white p-4 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0 scroll-warm">
            <p className="micro text-ink-faint">From your drawing</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              <div className="flex items-center gap-2 rounded-lg border border-line-soft bg-paper/60 px-2.5 py-2">
                <Ruler className="h-3.5 w-3.5 text-ink-faint" />
                <div>
                  <p className="text-[12px] font-semibold leading-tight text-ink">
                    {formatFeet(room.w)} × {formatFeet(room.h)}
                  </p>
                  <p className="font-mono text-[8px] uppercase tracking-wide text-ink-faint">Room dimensions</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-line-soft bg-paper/60 px-2.5 py-2">
                <Maximize className="h-3.5 w-3.5 text-ink-faint" />
                <div>
                  <p className="text-[12px] font-semibold leading-tight text-ink">{Math.round(room.w * room.h)} ft²</p>
                  <p className="font-mono text-[8px] uppercase tracking-wide text-ink-faint">Floor area</p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <RoomPhotoControls
                room={room}
                onUpdate={(patch) => onUpdateRoom(room.id, patch)}
                showMarker={false}
                compact
              />
            </div>

            <div className="mt-3">
              <p className="micro text-ink-faint">About this view</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
                {view === "360"
                  ? "A true equirectangular 360° photograph. Drag to look around and click a room label hotspot to jump to that space."
                  : current.kind === "upload"
                    ? "This is your own image, attached to this room's eye icon and stored locally with the plan."
                    : "A real interior reference for finishes, light and furniture — not a 3D render of your exact drawing."}
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-line-soft bg-paper/60 p-3">
              <p className="micro text-ink-faint">{current.kind === "upload" ? "Your photo" : `Reference photo ${index + 1}`}</p>
              <p className="mt-1 break-words text-[11px] leading-relaxed text-ink-soft">{current.alt}</p>
              {current.kind === "upload" ? (
                <p className="mt-2 text-[10px] font-medium text-ink-faint">Uploaded by you · saved locally</p>
              ) : (
                <a
                  href={current.source}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1 text-[10px] font-medium text-ink-faint transition hover:text-ink"
                >
                  {current.photographer} · Pexels <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>

            <button
              onClick={onClose}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink py-2 text-[11.5px] font-medium text-white transition hover:bg-ink/90 lg:mt-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to floor plan
            </button>
            <p className="mt-2 text-center font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">
              Esc to close · arrows to browse
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
