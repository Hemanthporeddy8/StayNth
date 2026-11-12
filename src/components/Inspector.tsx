import {
  ArrowRight,
  Bath,
  BedDouble,
  Copy,
  DoorOpen,
  Layers2,
  Maximize,
  Plus,
  RotateCw,
  Sparkles,
  SquareDashed,
  Sofa,
  Trash2,
  X,
  Wand2,
  Ruler,
  LayoutGrid,
  MoveDiagonal2,
  FlipHorizontal2,
  Wallet,
  Eye,
} from "lucide-react";
import type {
  FurnitureType,
  Opening,
  Plan,
  Room,
  RoomType,
  Selection,
  ViewMode,
} from "@/types";
import {
  FURNITURE_META,
  ROOM_COLORS,
  ROOM_LABEL,
  formatFeet,
  roomArea,
  uid,
  type PlanSummary,
} from "@/lib/plan";
import { cn } from "@/utils/cn";
import { RoomPhotoControls } from "@/components/RoomPhotoControls";

interface Props {
  plan: Plan;
  summary: PlanSummary;
  selection: Selection;
  mode: ViewMode;
  onSelect: (s: Selection) => void;
  onChange: (plan: Plan) => void;
  onGenerate: () => void;
  onAutoFurnish: () => void;
  onClearFurniture: () => void;
  onFocusRoom?: (id: string) => void;
  onViewPhotos?: (id: string) => void;
  onClose?: () => void;
}

const ROOM_TYPES: RoomType[] = [
  "living",
  "bedroom",
  "kitchen",
  "dining",
  "bath",
  "hall",
  "balcony",
  "study",
  "storage",
  "laundry",
];

const field =
  "h-8 w-full rounded-md border border-line bg-white px-2 text-[12px] text-ink outline-none transition focus:border-ink/40 focus:ring-2 focus:ring-ink/5";
const label = "mb-1 block font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint";

function Stat({ icon: Icon, value, label: l }: { icon: typeof Maximize; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line-soft bg-paper/60 px-2.5 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-semibold leading-tight text-ink">{value}</p>
        <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-ink-faint">{l}</p>
      </div>
    </div>
  );
}

export function Inspector({
  plan,
  summary,
  selection,
  onSelect,
  onChange,
  onGenerate,
  onAutoFurnish,
  onClearFurniture,
  onFocusRoom,
  onViewPhotos,
  onClose,
}: Props) {
  const activeRoom = selection?.kind === "room" ? plan.rooms.find((r) => r.id === selection.id) ?? null : null;
  const activeFurniture =
    selection?.kind === "furniture" ? plan.furniture.find((f) => f.id === selection.id) ?? null : null;
  const activeOpening =
    selection?.kind === "opening" ? plan.openings.find((o) => o.id === selection.id) ?? null : null;
  const activeWall =
    selection?.kind === "wall" ? plan.extraWalls.find((w) => w.id === selection.id) ?? null : null;

  const updateRoom = (patch: Partial<Room>) => {
    if (!activeRoom) return;
    onChange({
      ...plan,
      rooms: plan.rooms.map((r) => (r.id === activeRoom.id ? { ...r, ...patch } : r)),
    });
  };

  const deleteSelection = () => {
    if (!selection) return;
    if (selection.kind === "room")
      onChange({ ...plan, rooms: plan.rooms.filter((r) => r.id !== selection.id) });
    if (selection.kind === "furniture")
      onChange({ ...plan, furniture: plan.furniture.filter((f) => f.id !== selection.id) });
    if (selection.kind === "opening")
      onChange({ ...plan, openings: plan.openings.filter((o) => o.id !== selection.id) });
    if (selection.kind === "wall")
      onChange({ ...plan, extraWalls: plan.extraWalls.filter((w) => w.id !== selection.id) });
    onSelect(null);
  };

  const duplicateSelection = () => {
    if (activeRoom) {
      const copy: Room = { ...activeRoom, id: uid("room"), name: `${activeRoom.name} copy`, x: activeRoom.x + 1.5, y: activeRoom.y + 1.5 };
      onChange({ ...plan, rooms: [...plan.rooms, copy] });
      onSelect({ kind: "room", id: copy.id });
    }
    if (activeFurniture) {
      const copy = { ...activeFurniture, id: uid("f"), x: activeFurniture.x + 1, y: activeFurniture.y + 1 };
      onChange({ ...plan, furniture: [...plan.furniture, copy] });
      onSelect({ kind: "furniture", id: copy.id });
    }
  };

  const rotate = () => {
    if (!activeFurniture) return;
    const cx = activeFurniture.x + activeFurniture.w / 2;
    const cy = activeFurniture.y + activeFurniture.h / 2;
    const w = activeFurniture.h;
    const h = activeFurniture.w;
    onChange({
      ...plan,
      furniture: plan.furniture.map((f) =>
        f.id === activeFurniture.id
          ? { ...f, x: cx - w / 2, y: cy - h / 2, w, h, rot: (f.rot + 90) % 360 }
          : f,
      ),
    });
  };

  const flipDoor = (opening: Opening) => {
    onChange({
      ...plan,
      openings: plan.openings.map((o) => (o.id === opening.id ? { ...o, swing: o.swing === 1 ? -1 : 1 } : o)),
    });
  };

  const setFurnitureType = (type: FurnitureType) => {
    if (!activeFurniture) return;
    onChange({
      ...plan,
      furniture: plan.furniture.map((f) => (f.id === activeFurniture.id ? { ...f, type } : f)),
    });
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex shrink-0 items-start justify-between border-b border-line px-4 py-3">
        <div>
          <p className="micro text-ink-faint">Plan panel</p>
          <h2 className="font-serif text-[21px] leading-tight text-ink">Overview</h2>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-ink-soft">
            level 01
          </span>
          {onClose && (
            <button onClick={onClose} className="rounded-md p-1 text-ink-faint hover:bg-paper-deep hover:text-ink lg:hidden">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="scroll-warm min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
        {/* project card */}
        <div className="rounded-xl border border-line bg-gradient-to-b from-paper to-white p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-serif text-[19px] leading-tight text-ink">{plan.name}</h3>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.09em] text-ink-faint">
                Primary residence · {summary.bedrooms} bed · {summary.bathrooms} bath
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink-soft">
              <LayoutGrid className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <Stat icon={Maximize} value={`${Math.round(summary.area).toLocaleString()} ft²`} label="Net area" />
            <Stat icon={SquareDashed} value={`${summary.rooms}`} label="Rooms" />
            <Stat icon={BedDouble} value={`${summary.bedrooms}`} label="Bedrooms" />
            <Stat icon={Bath} value={`${summary.bathrooms}`} label="Bathrooms" />
          </div>

          <div className="mt-2 flex items-center justify-between rounded-lg border border-line-soft bg-white px-2.5 py-2">
            <span className="flex items-center gap-1.5 text-[11px] text-ink-soft">
              <Wallet className="h-3.5 w-3.5 text-ink-faint" /> Est. build cost
            </span>
            <span className="text-right">
              <span className="block text-[12.5px] font-semibold leading-none text-ink">
                ${Math.round(summary.cost / 1000).toLocaleString()}k
              </span>
              <span className="font-mono text-[8px] text-ink-faint">@ $165 / ft²</span>
            </span>
          </div>
        </div>

        {/* selection detail */}
        {selection && (
          <div className="animate-pop mt-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 micro text-accent">
                {activeRoom ? <SquareDashed className="h-3 w-3" /> : activeFurniture ? <Sofa className="h-3 w-3" /> : activeOpening ? <DoorOpen className="h-3 w-3" /> : <Ruler className="h-3 w-3" />}
                {activeRoom ? "Room" : activeFurniture ? "Furniture" : activeOpening ? "Opening" : "Wall"} selected
              </span>
              <button onClick={() => onSelect(null)} className="rounded p-0.5 text-ink-faint transition hover:bg-white hover:text-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {activeRoom && (
              <div className="mt-2 space-y-2.5">
                <div>
                  <label className={label}>Room name</label>
                  <input className={field} value={activeRoom.name} onChange={(e) => updateRoom({ name: e.target.value })} />
                </div>
                <div>
                  <label className={label}>Room type</label>
                  <select className={cn(field, "cursor-pointer")} value={activeRoom.type} onChange={(e) => updateRoom({ type: e.target.value as RoomType })}>
                    {ROOM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ROOM_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ["X", "x"],
                      ["Y", "y"],
                      ["Width", "w"],
                      ["Depth", "h"],
                    ] as const
                  ).map(([l, key]) => (
                    <div key={key}>
                      <label className={label}>
                        {l} <span className="normal-case text-ink-faint/70">ft</span>
                      </label>
                      <input
                        type="number"
                        step={0.5}
                        className={field}
                        value={Number(activeRoom[key].toFixed(2))}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!Number.isNaN(v)) updateRoom({ [key]: Math.max(0.5, v) });
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-md bg-white/70 px-2 py-1.5 font-mono text-[9.5px] text-ink-soft">
                  <span>
                    {formatFeet(activeRoom.w)} × {formatFeet(activeRoom.h)}
                  </span>
                  <span>{Math.round(roomArea(activeRoom))} SQ FT</span>
                </div>
                <RoomPhotoControls room={activeRoom} onUpdate={updateRoom} />
                {onFocusRoom && (
                  <button
                    onClick={() => onFocusRoom(activeRoom.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-ink py-1.5 text-[11px] font-medium text-white transition hover:bg-ink/90"
                  >
                    <Sofa className="h-3 w-3 text-accent" /> See this room from inside
                  </button>
                )}
                {onViewPhotos && (
                  <button
                    onClick={() => onViewPhotos(activeRoom.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-line bg-white py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-ink/30 hover:text-ink"
                  >
                    <Eye className="h-3.5 w-3.5 text-accent" /> Open room photos
                  </button>
                )}
                <div className="flex gap-1.5 pt-0.5">
                  <button onClick={duplicateSelection} className="flex flex-1 items-center justify-center gap-1 rounded-md border border-line bg-white py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-ink/30 hover:text-ink">
                    <Copy className="h-3 w-3" /> Duplicate
                  </button>
                  <button onClick={deleteSelection} className="flex items-center justify-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            )}

            {activeFurniture && (
              <div className="mt-2 space-y-2.5">
                <div>
                  <label className={label}>Object type</label>
                  <select className={cn(field, "cursor-pointer")} value={activeFurniture.type} onChange={(e) => setFurnitureType(e.target.value as FurnitureType)}>
                    {Object.entries(FURNITURE_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ["X", "x"],
                      ["Y", "y"],
                      ["Width", "w"],
                      ["Depth", "h"],
                    ] as const
                  ).map(([l, key]) => (
                    <div key={key}>
                      <label className={label}>{l}</label>
                      <input
                        type="number"
                        step={0.25}
                        className={field}
                        value={Number(activeFurniture[key].toFixed(2))}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!Number.isNaN(v))
                            onChange({
                              ...plan,
                              furniture: plan.furniture.map((f) =>
                                f.id === activeFurniture.id ? { ...f, [key]: Math.max(0.25, v) } : f,
                              ),
                            });
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={rotate} className="flex flex-1 items-center justify-center gap-1 rounded-md border border-line bg-white py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-ink/30 hover:text-ink">
                    <RotateCw className="h-3 w-3" /> Rotate 90°
                  </button>
                  <button onClick={duplicateSelection} className="flex items-center justify-center gap-1 rounded-md border border-line bg-white px-2 py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-ink/30 hover:text-ink">
                    <Copy className="h-3 w-3" />
                  </button>
                  <button onClick={deleteSelection} className="flex items-center justify-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {activeOpening && (
              <div className="mt-2 space-y-2.5">
                <div className="flex items-center gap-2 rounded-md border border-line bg-white px-2.5 py-2">
                  {activeOpening.kind === "door" ? <DoorOpen className="h-4 w-4 text-ink-soft" /> : <FlipHorizontal2 className="h-4 w-4 text-ink-soft" />}
                  <div>
                    <p className="text-[12px] font-medium capitalize text-ink">{activeOpening.kind}</p>
                    <p className="font-mono text-[9px] text-ink-faint">
                      {formatFeet(activeOpening.width)} · {activeOpening.angle === 0 ? "horizontal wall" : "vertical wall"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className={label}>Width (ft)</label>
                    <input
                      type="number"
                      step={0.25}
                      className={field}
                      value={Number(activeOpening.width.toFixed(2))}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!Number.isNaN(v))
                          onChange({
                            ...plan,
                            openings: plan.openings.map((o) =>
                              o.id === activeOpening.id ? { ...o, width: Math.max(1.5, Math.min(12, v)) } : o,
                            ),
                          });
                      }}
                    />
                  </div>
                  <div>
                    <label className={label}>Action</label>
                    <button onClick={() => flipDoor(activeOpening)} className="flex h-8 w-full items-center justify-center gap-1 rounded-md border border-line bg-white text-[11px] font-medium text-ink-soft hover:border-ink/30 hover:text-ink">
                      <FlipHorizontal2 className="h-3 w-3" /> Flip swing
                    </button>
                  </div>
                </div>
                <button onClick={deleteSelection} className="flex w-full items-center justify-center gap-1 rounded-md border border-red-200 bg-white py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50">
                  <Trash2 className="h-3 w-3" /> Remove opening
                </button>
              </div>
            )}

            {activeWall && (
              <div className="mt-2 space-y-2.5">
                <div className="rounded-md border border-line bg-white px-2.5 py-2">
                  <p className="text-[12px] font-medium text-ink">Hand-drawn wall</p>
                  <p className="font-mono text-[9px] text-ink-faint">
                    {formatFeet(Math.hypot(activeWall.x2 - activeWall.x1, activeWall.y2 - activeWall.y1))} long ·{" "}
                    {Math.abs(activeWall.x1 - activeWall.x2) < 0.2 ? "vertical" : Math.abs(activeWall.y1 - activeWall.y2) < 0.2 ? "horizontal" : "angled"}
                  </p>
                </div>
                <button onClick={deleteSelection} className="flex w-full items-center justify-center gap-1 rounded-md border border-red-200 bg-white py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50">
                  <Trash2 className="h-3 w-3" /> Remove wall
                </button>
              </div>
            )}
          </div>
        )}

        {!selection && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-line bg-paper/60 px-3 py-2.5">
            <MoveDiagonal2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
            <p className="text-[11px] leading-snug text-ink-soft">
              <span className="font-medium text-ink">Nothing selected.</span> Select a room to place/remove its eye icon, upload photos, or edit its details.
            </p>
          </div>
        )}

        {/* quick actions */}
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onGenerate}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-ink py-2 text-[11.5px] font-medium text-white transition hover:bg-ink/90"
            >
              <Wand2 className="h-3.5 w-3.5" /> Generate
            </button>
            <button
              onClick={onAutoFurnish}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white py-2 text-[11.5px] font-medium text-ink-soft transition hover:border-ink/30 hover:text-ink"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Furnish
            </button>
          </div>
          {plan.furniture.length > 0 && (
            <button
              onClick={onClearFurniture}
              className="mt-1.5 w-full rounded-lg py-1 text-center font-mono text-[9px] uppercase tracking-wide text-ink-faint transition hover:text-ink-soft"
            >
              Clear all furniture ({plan.furniture.length})
            </button>
          )}
        </div>

        {/* rooms list */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-soft">
              <Layers2 className="h-3.5 w-3.5 text-ink-faint" /> Rooms
            </h3>
            <span className="rounded-full bg-paper-deep px-1.5 py-0.5 font-mono text-[9px] text-ink-soft">{plan.rooms.length}</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            {plan.rooms.map((room, i) => {
              const selected = selection?.kind === "room" && selection.id === room.id;
              const color = ROOM_COLORS[room.type];
              return (
                <button
                  key={room.id}
                  onClick={() => onSelect({ kind: "room", id: room.id })}
                  className={cn(
                    "group flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition",
                    i !== 0 && "border-t border-line-soft",
                    selected ? "bg-accent-soft/70" : "hover:bg-paper",
                  )}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
                    style={{ background: color.fill, borderColor: `${color.ink}44` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: color.ink }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[12px] leading-tight", selected ? "font-semibold text-ink" : "font-medium text-ink")}>
                      {room.name}
                    </span>
                    <span className="block font-mono text-[9px] text-ink-faint">
                      {formatFeet(room.w)} × {formatFeet(room.h)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[9.5px] text-ink-soft">{Math.round(roomArea(room))} ft²</span>
                  <ArrowRight className={cn("h-3 w-3 shrink-0 text-ink-faint transition", selected ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                </button>
              );
            })}
            {plan.rooms.length === 0 && (
              <div className="px-3 py-5 text-center">
                <p className="text-[11px] text-ink-faint">No rooms yet — use the room tool or auto-generate.</p>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-line bg-paper/70 px-2.5 py-1.5">
              <span className="font-mono text-[9px] uppercase tracking-wide text-ink-faint">Total</span>
              <span className="font-mono text-[10px] text-ink-soft">
                {Math.round(summary.area).toLocaleString()} ft² · {summary.rooms} rooms
              </span>
            </div>
          </div>
        </div>

        {/* legend / tip */}
        <div className="mt-4 rounded-xl border border-line-soft bg-paper/60 p-3">
          <p className="flex items-center gap-1.5 micro text-ink-faint">
            <Plus className="h-3 w-3" /> Draw it yourself
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
            Use the <span className="font-medium text-ink">Wall</span> tool to sketch partitions, then drop doors,
            windows and furniture. Everything snaps to a 6″ grid.
          </p>
        </div>

        <p className="pb-1 pt-3 text-center font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
          Saved locally · StayNth studio
        </p>
      </div>
    </div>
  );
}
