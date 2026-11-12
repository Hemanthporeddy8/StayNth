import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  FileUp,
  ImagePlus,
  Loader2,
  LayoutTemplate,
  PencilRuler,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type { Plan } from "@/types";
import { FOOTPRINT_PRESETS, clamp, generatePlan, parsePlanFile, splitFloors, uid } from "@/lib/plan";
import { fileToRoomImage } from "@/lib/imageUpload";
import { MiniPlan } from "@/components/Dialogs";
import { peekDraft, saveDraft } from "@/lib/listingDraft";
import {
  AMENITY_OPTIONS,
  PROPERTY_TYPE_LABEL,
  type ListingMode,
  type PropertyListing,
  type PropertyPhoto,
  type PropertyType,
  type RoomInventory,
} from "@/lib/properties";
import { cn } from "@/utils/cn";

const input =
  "h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12px] text-ink outline-none transition focus:border-ink/40 focus:ring-2 focus:ring-ink/5";
const label = "mb-1 block font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint";

type PlanSource = "current" | "upload" | "create";
type Floor = { name: string; plan: Plan };

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const areaOf = (floors: Floor[]) =>
  Math.round(floors.reduce((total, floor) => total + floor.plan.rooms.reduce((sum, room) => sum + room.w * room.h, 0), 0));

export function ListPropertyDialog({
  currentPlan,
  floorPlans,
  onClose,
  onCreate,
  onDrawInStudio,
}: {
  currentPlan: Plan;
  floorPlans: Floor[];
  onClose: () => void;
  onCreate: (listing: PropertyListing) => void;
  /** "edit" opens the current plan in Studio; "blank" starts an empty sheet. Returns here afterwards. */
  onDrawInStudio: (mode: "edit" | "blank") => void;
}) {
  const [draft] = useState(peekDraft);
  const [title, setTitle] = useState(draft?.title ?? "");
  const [type, setType] = useState<PropertyType>(draft?.type ?? "apartment");
  const [mode, setMode] = useState<ListingMode>(draft?.mode ?? "stay");
  const [location, setLocation] = useState(draft?.location ?? "");
  const [price, setPrice] = useState(draft?.price ?? 120);
  const [beds, setBeds] = useState(draft?.beds ?? 2);
  const [latitude, setLatitude] = useState(draft?.latitude ?? "");
  const [longitude, setLongitude] = useState(draft?.longitude ?? "");
  const [inventory, setInventory] = useState<RoomInventory[]>(draft?.inventory ?? []);
  const [description, setDescription] = useState(draft?.description ?? "");
  const [amenities, setAmenities] = useState<string[]>(draft?.amenities ?? ["Wifi", "Kitchen"]);
  const [photos, setPhotos] = useState<PropertyPhoto[]>(draft?.photos ?? []);
  const [bedrooms, setBedrooms] = useState<1 | 2 | 3 | 4>(draft?.bedrooms ?? 2);
  const [bathrooms, setBathrooms] = useState<1 | 2>(draft?.bathrooms ?? 1);
  const [width, setWidth] = useState(draft?.width ?? FOOTPRINT_PRESETS[2].width);
  const [depth, setDepth] = useState(draft?.depth ?? FOOTPRINT_PRESETS[2].depth);

  const studioFloors = useMemo(
    () => (floorPlans.length ? floorPlans : [{ name: "Level 01", plan: currentPlan }]).filter((floor) => floor.plan.rooms.length > 0),
    [floorPlans, currentPlan],
  );
  const [planSource, setPlanSource] = useState<PlanSource>(draft || studioFloors.length ? "current" : "create");
  const [uploaded, setUploaded] = useState<{ fileName: string; floors: Floor[] } | null>(null);
  const [floorIndex, setFloorIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const planFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const generated = useMemo(
    () => generatePlan({ bedrooms, bathrooms: bedrooms === 1 ? 1 : bathrooms, width, depth, furnished: true }, title.trim() || "New property"),
    [bedrooms, bathrooms, width, depth, title],
  );

  const floors: Floor[] = useMemo(() => {
    if (planSource === "current") return studioFloors;
    if (planSource === "upload") return uploaded?.floors ?? [];
    return [{ name: "Level 01", plan: generated }];
  }, [planSource, studioFloors, uploaded, generated]);

  const activeFloor = floors[Math.min(floorIndex, Math.max(0, floors.length - 1))];
  const roomCount = floors.reduce((sum, floor) => sum + floor.plan.rooms.length, 0);

  const chooseSource = (source: PlanSource) => {
    setPlanSource(source);
    setFloorIndex(0);
    setPlanError(null);
    setError(null);
  };

  const chooseBedrooms = (value: 1 | 2 | 3 | 4) => {
    setBedrooms(value);
    if (value === 1) setBathrooms(1);
    setWidth(FOOTPRINT_PRESETS[value].width);
    setDepth(FOOTPRINT_PRESETS[value].depth);
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const room = Math.max(0, 4 - photos.length);
    if (!room) {
      setError("You can attach up to four photos per listing.");
      return;
    }
    setBusy(true);
    const added: PropertyPhoto[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        const image = await fileToRoomImage(file);
        added.push({ url: image.url, alt: image.name });
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Could not process that image.");
      }
    }
    setPhotos((current) => [...current, ...added]);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadPlanFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setPlanError(null);
    setPlanBusy(true);
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("That file is larger than 25 MB.");
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error("That file could not be read. Upload the .json plan file saved from Studio.");
      }
      const plan = parsePlanFile(parsed);
      const split = splitFloors(plan);
      setUploaded({ fileName: file.name, floors: split });
      setFloorIndex(0);
      if (!title.trim() && plan.name) setTitle(plan.name);
    } catch (uploadError) {
      setUploaded(null);
      setPlanError(uploadError instanceof Error ? uploadError.message : "Could not read that plan file.");
    }
    setPlanBusy(false);
    if (planFileRef.current) planFileRef.current.value = "";
  };

  const goToStudio = (studioMode: "edit" | "blank") => {
    saveDraft({
      title, type, mode, location, price, beds, latitude, longitude, inventory,
      description, amenities, photos, bedrooms, bathrooms, width, depth,
    });
    onDrawInStudio(studioMode);
  };

  const submit = () => {
    if (!title.trim() || !location.trim()) {
      setError("Add a property title and location before publishing.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price.");
      return;
    }
    if (!floors.length) {
      setError(
        planSource === "upload"
          ? "Upload a plan file first, or choose another plan option."
          : planSource === "current"
            ? "Studio has no rooms yet. Draw a plan, upload one, or create a new plan."
            : "The listing needs a floor plan before its 3D view can be created.",
      );
      return;
    }

    const copies: Floor[] = floors.map((floor) => ({ name: floor.name, plan: { ...clone(floor.plan), name: title.trim() } }));
    const plan = copies[0].plan;
    const allRooms = copies.flatMap((floor) => floor.plan.rooms);

    onCreate({
      id: uid("property"),
      title: title.trim(),
      type,
      mode,
      location: location.trim(),
      price,
      priceUnit: mode === "stay" ? "night" : mode === "rent" ? "month" : "total",
      bedrooms: allRooms.filter((room) => room.type === "bedroom").length,
      bathrooms: allRooms.filter((room) => room.type === "bath").length,
      beds: Math.max(1, beds),
      area: areaOf(copies),
      description:
        description.trim() ||
        "Explore this property through its interactive floor plan and real 3D walkthrough before sending an enquiry.",
      amenities,
      photos,
      plan,
      ownerName: "You",
      mine: true,
      verification: "unverified",
      latitude: latitude.trim() ? Number(latitude) : undefined,
      longitude: longitude.trim() ? Number(longitude) : undefined,
      inventory,
      reviewsList: [],
      reports: [],
      floorPlans: planSource === "create" ? undefined : copies,
      published: true,
      featured: false,
      rating: 0,
      reviews: 0,
      createdAt: new Date().toISOString(),
    });
  };

  const sourceOptions: { id: PlanSource; title: string; hint: string; icon: typeof Building2 }[] = [
    { id: "current", title: "Studio plan", hint: "Use the plan you drew", icon: PencilRuler },
    { id: "upload", title: "Upload plan file", hint: "A .json saved from Studio", icon: FileUp },
    { id: "create", title: "Create new plan", hint: "Generate or draw one", icon: Sparkles },
  ];

  return (
    <div className="animate-fade fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-2 backdrop-blur-sm sm:p-4">
      <div className="animate-pop flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-serif text-[24px] leading-tight text-ink">List your property</h2>
              <p className="text-[11px] text-ink-soft">Details, photos and a floor plan — the 3D walkthrough is built from the plan.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scroll-warm min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Property title</label>
              <input value={title} onChange={(event) => setTitle(event.target.value)} className={input} placeholder="e.g. Palm Court Apartment" />
            </div>
            <div>
              <label className={label}>Location</label>
              <input value={location} onChange={(event) => setLocation(event.target.value)} className={input} placeholder="Neighborhood, city" />
            </div>
            <div>
              <label className={label}>Property type</label>
              <select
                value={type}
                onChange={(event) => {
                  const next = event.target.value as PropertyType;
                  setType(next);
                  if (["hotel", "hostel", "dormitory", "pg"].includes(next) && !inventory.length) {
                    setInventory([{ id: uid("inventory"), name: next === "hotel" ? "Deluxe room" : "Shared dorm bed", kind: next === "hotel" ? "room" : "bed", capacity: next === "hotel" ? 2 : 1, price, available: 1 }]);
                  }
                }}
                className={input}
              >
                {Object.entries(PROPERTY_TYPE_LABEL).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Listing purpose</label>
              <select
                value={mode}
                onChange={(event) => {
                  const next = event.target.value as ListingMode;
                  setMode(next);
                  setPrice(next === "sale" ? 350000 : next === "rent" ? 1800 : 120);
                }}
                className={input}
              >
                <option value="stay">Nightly stay</option>
                <option value="rent">Monthly rent</option>
                <option value="sale">For sale</option>
              </select>
            </div>
            <div>
              <label className={label}>{mode === "sale" ? "Sale price ($)" : mode === "rent" ? "Monthly rent ($)" : "Nightly price ($)"}</label>
              <input type="number" min={1} value={price} onChange={(event) => setPrice(Number(event.target.value))} className={input} />
            </div>
            <div>
              <label className={label}>Total beds</label>
              <input type="number" min={1} max={50} value={beds} onChange={(event) => setBeds(Number(event.target.value))} className={input} />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Latitude (optional)</label>
              <input value={latitude} onChange={(event) => setLatitude(event.target.value)} className={input} placeholder="12.9716" inputMode="decimal" />
            </div>
            <div>
              <label className={label}>Longitude (optional)</label>
              <input value={longitude} onChange={(event) => setLongitude(event.target.value)} className={input} placeholder="77.5946" inputMode="decimal" />
            </div>
            <p className="-mt-1 text-[9px] leading-relaxed text-ink-faint sm:col-span-2">Coordinates place the property on the real map. Leave blank if you do not want to publish an exact location.</p>
          </div>

          {["hotel", "hostel", "dormitory", "pg"].includes(type) && (
            <div className="mt-4 rounded-xl border border-line bg-white p-3">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[9px] uppercase tracking-wide text-ink-faint">Room & bed inventory</label>
                <button
                  onClick={() => setInventory((current) => [...current, { id: uid("inventory"), name: "New category", kind: type === "hotel" ? "room" : "bed", capacity: 1, price, available: 1 }])}
                  className="text-[10px] font-medium text-accent"
                >
                  + Add category
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {inventory.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_54px_66px_54px_24px] items-end gap-1.5">
                    <label><span className="mb-1 block text-[8px] text-ink-faint">Name</span><input value={item.name} onChange={(event) => setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, name: event.target.value } : entry))} className="h-8 w-full rounded-md border border-line px-1.5 text-[10px]" /></label>
                    <label><span className="mb-1 block text-[8px] text-ink-faint">Capacity</span><input type="number" min={1} value={item.capacity} onChange={(event) => setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, capacity: Number(event.target.value) } : entry))} className="h-8 w-full rounded-md border border-line px-1 text-[10px]" /></label>
                    <label><span className="mb-1 block text-[8px] text-ink-faint">Price</span><input type="number" min={1} value={item.price} onChange={(event) => setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, price: Number(event.target.value) } : entry))} className="h-8 w-full rounded-md border border-line px-1 text-[10px]" /></label>
                    <label><span className="mb-1 block text-[8px] text-ink-faint">Available</span><input type="number" min={0} value={item.available} onChange={(event) => setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, available: Number(event.target.value) } : entry))} className="h-8 w-full rounded-md border border-line px-1 text-[10px]" /></label>
                    <button onClick={() => setInventory((current) => current.filter((entry) => entry.id !== item.id))} className="flex h-8 items-center justify-center text-ink-faint hover:text-red-600" aria-label="Remove category"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className={label}>Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-line bg-white p-2.5 text-[12px] leading-relaxed text-ink outline-none focus:border-ink/40"
              placeholder="Tell guests or buyers what makes this property worth visiting..."
            />
          </div>

          <div className="mt-4">
            <label className={label}>Amenities</label>
            <div className="flex flex-wrap gap-1.5">
              {AMENITY_OPTIONS.map((amenity) => {
                const active = amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    onClick={() => setAmenities((current) => active ? current.filter((item) => item !== amenity) : [...current, amenity])}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] transition",
                      active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink/30",
                    )}
                  >
                    {active && <Check className="mr-1 inline h-2.5 w-2.5" />}{amenity}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* One floor plan section                                      */}
          {/* ---------------------------------------------------------- */}
          <div className="mt-5 rounded-2xl border border-line bg-white p-3">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-accent" />
              <div>
                <p className="text-[13px] font-semibold text-ink">Floor plan & 3D</p>
                <p className="text-[10px] text-ink-faint">Pick where the plan comes from. Nothing opens until you press a button.</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {sourceOptions.map((option) => {
                const Icon = option.icon;
                const active = planSource === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => chooseSource(option.id)}
                    className={cn(
                      "rounded-xl border px-2.5 py-2 text-left transition",
                      active ? "border-ink bg-paper-deep" : "border-line bg-white hover:border-ink/30",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
                      <Icon className={cn("h-3.5 w-3.5", active ? "text-accent" : "text-ink-faint")} /> {option.title}
                    </span>
                    <span className="mt-0.5 hidden text-[9px] leading-snug text-ink-faint sm:block">{option.hint}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              {planSource === "current" && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2.5">
                  <p className="text-[11px] leading-snug text-ink-soft">
                    {studioFloors.length
                      ? "Using the plan currently open in Studio, including every floor."
                      : "Studio has no rooms yet — draw one, upload a plan file, or create a new plan."}
                  </p>
                  <button onClick={() => goToStudio("edit")} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[10.5px] font-medium text-ink-soft hover:border-ink/30 hover:text-ink">
                    <PencilRuler className="h-3.5 w-3.5" /> {studioFloors.length ? "Edit in Studio" : "Draw in Studio"}
                  </button>
                </div>
              )}

              {planSource === "upload" && (
                <div className="rounded-lg bg-paper px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] leading-snug text-ink-soft">
                      {uploaded ? <>Loaded <span className="font-medium text-ink">{uploaded.fileName}</span></> : "Upload the plan file (.json) saved from Studio → Export → Plan file."}
                    </p>
                    <div className="flex gap-1.5">
                      {uploaded && (
                        <button onClick={() => { setUploaded(null); setFloorIndex(0); }} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[10.5px] text-ink-faint hover:text-ink">Remove</button>
                      )}
                      <button onClick={() => planFileRef.current?.click()} disabled={planBusy} className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[10.5px] font-medium text-white disabled:opacity-60">
                        {planBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                        {uploaded ? "Replace file" : "Choose plan file"}
                      </button>
                    </div>
                  </div>
                  <input ref={planFileRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => void uploadPlanFile(event.target.files)} />
                  {planError && <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-[10px] text-red-700">{planError}</p>}
                  <p className="mt-2 text-[9px] leading-relaxed text-ink-faint">A photo or PDF of a drawn plan can't be turned into 3D automatically. Redraw it in Studio, or add the image as a property photo below.</p>
                </div>
              )}

              {planSource === "create" && (
                <div className="rounded-lg bg-paper px-3 py-2.5">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <span className={label}>Bedrooms</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([1, 2, 3, 4] as const).map((value) => (
                          <button key={value} onClick={() => chooseBedrooms(value)} className={cn("rounded-lg border py-1.5 text-[11px] font-medium transition", bedrooms === value ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink/30")}>
                            {value === 1 ? "1 · studio" : `${value} BHK`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className={label}>Bathrooms</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([1, 2] as const).map((value) => (
                          <button key={value} disabled={bedrooms === 1 && value === 2} onClick={() => setBathrooms(value)} className={cn("rounded-lg border px-3 py-1.5 text-[11px] font-medium transition disabled:opacity-35", (bedrooms === 1 ? 1 : bathrooms) === value ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-ink/30")}>
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                      Width ft
                      <input type="number" min={22} max={70} value={width} onChange={(event) => setWidth(clamp(Number(event.target.value) || 22, 22, 70))} className="h-7 w-14 rounded-md border border-line bg-white px-1.5 text-right text-[10px] text-ink" />
                    </label>
                    <label className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                      Depth ft
                      <input type="number" min={18} max={60} value={depth} onChange={(event) => setDepth(clamp(Number(event.target.value) || 18, 18, 60))} className="h-7 w-14 rounded-md border border-line bg-white px-1.5 text-right text-[10px] text-ink" />
                    </label>
                    <span className="ml-auto text-[9px] text-ink-faint">Rule-based layout, built here in your browser</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
                    <p className="text-[10.5px] text-ink-soft">Want full control over every wall and room?</p>
                    <button onClick={() => goToStudio("blank")} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[10.5px] font-medium text-ink-soft hover:border-ink/30 hover:text-ink">
                      <PencilRuler className="h-3.5 w-3.5" /> Draw from scratch in Studio
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* real plan preview */}
            <div className="mt-3 overflow-hidden rounded-xl border border-line bg-[#fbf9f4]">
              <div className="relative h-[210px]">
                {activeFloor ? (
                  <MiniPlan plan={activeFloor.plan} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <LayoutTemplate className="h-6 w-6 text-ink-faint" />
                    <p className="mt-2 text-[11px] font-medium text-ink-soft">No plan to preview yet</p>
                    <p className="mt-0.5 text-[10px] text-ink-faint">
                      {planSource === "upload" ? "Choose a plan file to see it here." : planSource === "current" ? "Draw rooms in Studio, or switch to Create new plan." : ""}
                    </p>
                  </div>
                )}
                {floors.length > 1 && (
                  <div className="absolute left-2 top-2 flex rounded-lg border border-line bg-white/95 p-0.5 shadow-sm">
                    {floors.map((floor, index) => (
                      <button key={`${floor.name}-${index}`} onClick={() => setFloorIndex(index)} className={cn("rounded-md px-2 py-1 text-[9px] font-medium", index === floorIndex ? "bg-ink text-white" : "text-ink-soft")}>{floor.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line bg-white px-3 py-2 font-mono text-[9px] uppercase tracking-wide text-ink-soft">
                <span>{roomCount} rooms</span>
                <span>{areaOf(floors).toLocaleString()} ft²</span>
                <span>{floors.length || 0} floor{floors.length === 1 ? "" : "s"}</span>
                <span className="ml-auto flex items-center gap-1 text-moss"><Check className="h-3 w-3" /> 3D included automatically</span>
              </div>
            </div>

            {/* $299 Exact Digital Twin Replica Card */}
            <div className="mt-3 flex flex-col justify-between gap-2.5 rounded-xl border border-accent/30 bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-amber-50/80 p-3 sm:flex-row sm:items-center">
              <div className="flex items-start gap-2.5">
                <div className="rounded-lg bg-accent/15 p-2 text-accent">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-ink">Exact 1:1 Digital Twin Replica</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">$299</span>
                  </div>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-ink-soft">
                    Don't have time to draw? Send us your floor plan sketch or photos. Our architectural team will draft an exact 1:1 replica with interactive 3D walk-through for your listing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  alert("Replica Service ($299):\n\nOur architectural modeling team will contact you at your account email to collect your floor plan sketches, blueprints, or room photos. Your exact 1:1 3D replica will be attached to this listing within 24–48 hours!");
                }}
                className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-ink/85 active:scale-95"
              >
                Order Replica ($299)
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label className={label}>Property photos</label>
              <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center gap-1 text-[10px] font-medium text-accent disabled:opacity-50">
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />} Upload photos
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => void uploadPhotos(event.target.files)} />
            {photos.length ? (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((photo, index) => (
                  <div key={photo.url.slice(-30) + index} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-white">
                    <img src={photo.url} alt={photo.alt} className="h-full w-full object-cover" />
                    <button onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-ink/75 p-1 text-white hover:bg-red-600" aria-label="Remove photo">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white py-5 text-[11px] text-ink-faint hover:border-ink/30 hover:text-ink-soft">
                <Upload className="h-4 w-4" /> Add up to four real property photos
              </button>
            )}
          </div>

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">{error}</p>}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-ink-faint">Local publishing — saved in this browser. You'll land on the new property.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-lg border border-line bg-white px-4 py-2 text-[12px] text-ink-soft sm:flex-none">Cancel</button>
            <button onClick={submit} disabled={busy || planBusy} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50 sm:flex-none">
              <Building2 className="h-3.5 w-3.5" /> Publish listing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
