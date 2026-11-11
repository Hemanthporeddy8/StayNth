import { useRef, useState } from "react";
import { Eye, EyeOff, ImagePlus, Loader2, Rotate3D, Upload, X } from "lucide-react";
import type { Room } from "@/types";
import { fileToPanorama, fileToRoomImage } from "@/lib/imageUpload";
import { cn } from "@/utils/cn";

const MAX_UPLOADS = 6;

export function RoomPhotoControls({
  room,
  onUpdate,
  showMarker = true,
  compact = false,
}: {
  room: Room;
  onUpdate: (patch: Partial<Room>) => void;
  showMarker?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panoramaRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [panoramaBusy, setPanoramaBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const images = room.images ?? [];
  const markerVisible = room.photoMarker !== false;

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMessage(null);
    const available = MAX_UPLOADS - images.length;
    if (available <= 0) {
      setMessage(`This room already has the maximum of ${MAX_UPLOADS} uploaded photos.`);
      return;
    }

    const selected = Array.from(files);
    const queue = selected.slice(0, available);
    setBusy(true);
    const added = [];
    const errors: string[] = [];

    for (const file of queue) {
      try {
        added.push(await fileToRoomImage(file));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `Could not read ${file.name}`);
      }
    }

    if (added.length) {
      // Uploading also restores the marker if it had been removed.
      onUpdate({ images: [...images, ...added], photoMarker: true });
    }
    if (selected.length > available) errors.push(`Only ${available} more photo${available === 1 ? "" : "s"} can be added to this room.`);
    if (errors.length) setMessage(errors[0]);
    else setMessage(`${added.length} photo${added.length === 1 ? "" : "s"} attached to ${room.name}.`);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploadPanorama = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setPanoramaBusy(true);
    setMessage(null);
    try {
      const panorama = await fileToPanorama(file);
      onUpdate({ panorama, photoMarker: true });
      setMessage(`360° view attached to ${room.name}. Open the eye to explore it.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not process the 360° photo.");
    }
    setPanoramaBusy(false);
    if (panoramaRef.current) panoramaRef.current.value = "";
  };

  return (
    <div className={cn("rounded-lg border border-line bg-white", compact ? "p-2.5" : "p-2.5")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">
          <Eye className="h-3 w-3" /> Eye icon & photos
        </span>
        <span className="font-mono text-[8.5px] text-ink-faint">{images.length}/{MAX_UPLOADS} uploads</span>
      </div>

      <div className={cn("grid gap-1.5", showMarker ? "grid-cols-3" : "grid-cols-2")}>
        {showMarker && (
          <button
            onClick={() => onUpdate({ photoMarker: !markerVisible })}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-md border px-2 text-[10.5px] font-medium transition",
              markerVisible
                ? "border-line bg-paper text-ink-soft hover:border-ink/30 hover:text-ink"
                : "border-accent/35 bg-accent-soft text-accent hover:border-accent/60",
            )}
            title={markerVisible ? "Remove the eye icon from this room" : "Place an eye icon on this room"}
          >
            {markerVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {markerVisible ? "Remove eye" : "Place eye"}
          </button>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-ink px-2 text-[10.5px] font-medium text-white transition hover:bg-ink/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {busy ? "Processing" : "Upload photos"}
        </button>
        <button
          onClick={() => panoramaRef.current?.click()}
          disabled={panoramaBusy}
          className="flex h-8 items-center justify-center gap-1 rounded-md border border-line bg-paper px-1.5 text-[10px] font-medium text-ink-soft transition hover:border-ink/30 hover:text-ink disabled:opacity-60"
          title="Upload an equirectangular 360° room photo"
        >
          {panoramaBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rotate3D className="h-3.5 w-3.5 text-accent" />}
          {room.panorama ? "Replace 360°" : "360°"}
        </button>
      </div>

      <input
        ref={panoramaRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void uploadPanorama(event.target.files)}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {room.panorama && (
        <div className="mt-2 flex items-center justify-between rounded-md bg-blueprint-soft px-2 py-1.5 text-[9px] text-blueprint">
          <span className="flex items-center gap-1"><Rotate3D className="h-3 w-3" /> 360° panorama attached</span>
          <button onClick={() => onUpdate({ panorama: undefined })} className="text-ink-faint hover:text-red-600">Remove</button>
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {images.map((image) => (
            <div key={image.id} className="group relative aspect-[4/3] overflow-hidden rounded-md border border-line-soft bg-paper">
              <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
              <button
                onClick={() => onUpdate({ images: images.filter((item) => item.id !== image.id) })}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/75 text-white opacity-90 backdrop-blur transition hover:bg-red-600 group-hover:opacity-100"
                title={`Remove ${image.name}`}
                aria-label={`Remove ${image.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {message && <p className="mt-1.5 text-[9.5px] leading-snug text-ink-soft">{message}</p>}
      <p className="mt-1.5 flex items-start gap-1 text-[8.5px] leading-relaxed text-ink-faint">
        <Upload className="mt-0.5 h-2.5 w-2.5 shrink-0" />
        Photos and 2:1 equirectangular 360° images are saved locally. Use the Eye tool to position the icon.
      </p>
    </div>
  );
}
