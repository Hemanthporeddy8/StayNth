import { useCallback, useEffect, useRef, useState } from "react";
import {
  Compass,
  Grid3X3,
  Layers,
  Maximize2,
  Minus,
  Plus,
  Ruler,
  Eye,
  PencilRuler,
  Sofa,
  Tag,
  Check,
  Box,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import type {
  DisplaySettings,
  FurnitureType,
  FurnitureItem,
  Opening,
  Plan,
  Room,
  Selection,
  Tool,
  ViewMode,
  WallSegment,
} from "@/types";
import {
  ROOM_COLORS,
  allFurnitureLabel,
  clamp,
  computeWalls,
  FURNITURE_META,
  formatFeet,
  snap,
  uid,
} from "@/lib/plan";
import { FurnitureSymbol } from "@/components/FurnitureSymbol";
import { House3D } from "@/components/House3D";

interface Props {
  plan: Plan;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  display: DisplaySettings;
  onDisplayChange: (next: DisplaySettings) => void;
  tool: Tool;
  activeFurniture: FurnitureType;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onChange: (plan: Plan) => void;
  onToast: (msg: string) => void;
  fitSignal: number;
  focusRequest: { id: string; nonce: number } | null;
  floorName: string;
  floorIndex: number;
  floorCount: number;
  onFloorChange: (floor: number) => void;
  onAddFloor: () => void;
  onDeleteFloor: () => void;
  onViewPhotos: (roomId: string) => void;
}

type DragState =
  | { kind: "pan"; sx: number; sy: number; view: { x: number; y: number; w: number; h: number } }
  | { kind: "wall"; start: { x: number; y: number } }
  | { kind: "room"; start: { x: number; y: number } }
  | { kind: "room-move"; id: string; offX: number; offY: number; sx: number; sy: number }
  | { kind: "furniture-move"; id: string; offX: number; offY: number; sx: number; sy: number }
  | null;

const WALL_HIT = 0.9;

function wallsNear(segments: WallSegment[], p: { x: number; y: number }) {
  let best: { seg: WallSegment; x: number; y: number; angle: 0 | 90; dist: number } | null = null;
  for (const seg of segments) {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const len2 = dx * dx + dy * dy;
    if (!len2) continue;
    const t = clamp(((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / len2, 0, 1);
    const px = seg.x1 + dx * t;
    const py = seg.y1 + dy * t;
    const dist = Math.hypot(px - p.x, py - p.y);
    if (dist < 2.4 && (!best || dist < best.dist)) {
      best = { seg, x: px, y: py, angle: Math.abs(dx) >= Math.abs(dy) ? 0 : 90, dist };
    }
  }
  return best;
}

export function PlanCanvas({
  plan,
  mode,
  onModeChange,
  display,
  onDisplayChange,
  tool,
  activeFurniture,
  selection,
  onSelect,
  onChange,
  onToast,
  fitSignal,
  focusRequest,
  floorName,
  floorIndex,
  floorCount,
  onFloorChange,
  onAddFloor,
  onDeleteFloor,
  onViewPhotos,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dimsRef = useRef({ w: 900, h: 640 });
  const [view, setView] = useState({ x: -6, y: -8, w: 60, h: 44 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [fitW, setFitW] = useState(60);
  const [preview, setPreview] = useState<Plan | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const dragRef = useRef<DragState>(null);
  dragRef.current = drag;
  const [draftPoint, setDraftPoint] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const initialized = useRef(false);

  const inside = mode === "inside";
  const activePlan = preview ?? plan;
  const walls = computeWalls(activePlan);

  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const aspect = rect.width / rect.height;
    const bw = plan.width + 13;
    const bh = plan.depth + 13;
    let w = bw;
    let h = bh;
    if (w / h < aspect) w = h * aspect;
    else h = w / aspect;
    const cx = plan.width / 2;
    const cy = plan.depth / 2;
    setView({ x: cx - w / 2, y: cy - h / 2, w, h });
    setFitW(w);
    dimsRef.current = { w: rect.width, h: rect.height };
  }, [plan.width, plan.depth]);

  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  /* zoom into a single room for an interior look */
  useEffect(() => {
    if (!focusRequest) return;
    const room = plan.rooms.find((r) => r.id === focusRequest.id);
    const el = wrapRef.current;
    if (!room || !el) return;
    const rect = el.getBoundingClientRect();
    const aspect = rect.width / rect.height || 1.4;
    const pad = Math.max(2.4, Math.min(room.w, room.h) * 0.28);
    let w = room.w + pad * 2;
    let h = room.h + pad * 2;
    if (w / h < aspect) w = h * aspect;
    else h = w / aspect;
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;
    setView({ x: cx - w / 2, y: cy - h / 2, w, h });
    onSelect({ kind: "room", id: room.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || !box.width || !box.height) return;
      dimsRef.current = { w: box.width, h: box.height };
      if (!initialized.current) {
        initialized.current = true;
        fit();
        return;
      }
      const aspect = box.width / box.height;
      setView((v) => {
        const cx = v.x + v.w / 2;
        const cy = v.y + v.h / 2;
        let w = v.w;
        let h = v.h;
        if (w / h < aspect) w = h * aspect;
        else h = w / aspect;
        return { x: cx - w / 2, y: cy - h / 2, w, h };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  /* wheel zoom */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const v = viewRef.current;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const wx = v.x + (mx / rect.width) * v.w;
      const wy = v.y + (my / rect.height) * v.h;
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      const w = clamp(v.w * factor, 12, 220);
      const h = w / (v.w / v.h);
      setView({ x: wx - (mx / rect.width) * w, y: wy - (my / rect.height) * h, w, h });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const v = viewRef.current;
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const w = clamp(v.w * factor, 12, 220);
    const h = v.h * (w / v.w);
    setView({ x: cx - w / 2, y: cy - h / 2, w, h });
  };

  const toWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const v = viewRef.current;
    return {
      x: v.x + ((clientX - rect.left) / rect.width) * v.w,
      y: v.y + ((clientY - rect.top) / rect.height) * v.h,
    };
  };

  const snapPoint = (p: { x: number; y: number }) => ({ x: snap(p.x, 0.5), y: snap(p.y, 0.5) });

  const findTarget = (e: React.PointerEvent): { kind: string; id: string } | null => {
    let el = e.target as Element | SVGElement | null;
    while (el && el !== svgRef.current) {
      const kind = el.getAttribute?.("data-kind");
      const id = el.getAttribute?.("data-id");
      if (kind && id) return { kind, id };
      el = el.parentElement;
    }
    return null;
  };

  const removeEye = (roomId: string) => {
    const room = plan.rooms.find((r) => r.id === roomId);
    onChange({
      ...plan,
      rooms: plan.rooms.map((r) => (r.id === roomId ? { ...r, photoMarker: false } : r)),
    });
    onToast(`Eye removed from ${room?.name ?? "room"} — photos are kept`);
  };

  const placeOpening = (p: { x: number; y: number }, kind: "door" | "window") => {
    const near = wallsNear(walls, p);
    if (!near) {
      onToast("No wall found nearby — draw a wall first");
      return;
    }
    const width = kind === "door" ? 3 : 4.5;
    const seg = near.seg;
    const along = near.angle === 0 ? seg.x1 <= seg.x2 : seg.y1 <= seg.y2;
    const useX = near.angle === 0 ? clamp(near.x, Math.min(seg.x1, seg.x2) + width / 2, Math.max(seg.x1, seg.x2) - width / 2) : near.x;
    const useY = near.angle === 0 ? near.y : clamp(near.y, Math.min(seg.y1, seg.y2) + width / 2, Math.max(seg.y1, seg.y2) - width / 2);
    const opening: Opening = {
      id: uid("op"),
      kind,
      x: snap(useX, 0.5),
      y: snap(useY, 0.5),
      angle: near.angle,
      width,
      swing: along ? 1 : -1,
    };
    onChange({ ...plan, openings: [...plan.openings, opening] });
    onToast(kind === "door" ? "Door placed" : "Window placed");
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const p = toWorld(e.clientX, e.clientY);
    const s = snapPoint(p);
    svgRef.current?.setPointerCapture(e.pointerId);

    if (tool === "pan" || e.button === 1) {
      setDrag({ kind: "pan", sx: e.clientX, sy: e.clientY, view: { ...view } });
      return;
    }
    if (tool === "wall") {
      setDrag({ kind: "wall", start: s });
      setDraftPoint(s);
      return;
    }
    if (tool === "room") {
      setDrag({ kind: "room", start: s });
      setDraftPoint(s);
      return;
    }
    if (tool === "eye") {
      const room = [...plan.rooms]
        .reverse()
        .find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
      if (!room) {
        onToast("Click inside a room to place its eye");
        return;
      }
      const px = clamp(p.x, room.x + 0.45, room.x + room.w - 0.45);
      const py = clamp(p.y, room.y + 0.45, room.y + room.h - 0.45);
      onChange({
        ...plan,
        rooms: plan.rooms.map((r) =>
          r.id === room.id
            ? {
                ...r,
                photoMarker: true,
                photoMarkerX: (px - room.x) / room.w,
                photoMarkerY: (py - room.y) / room.h,
              }
            : r,
        ),
      });
      onSelect({ kind: "room", id: room.id });
      onToast(room.photoMarker === false ? `Eye placed in ${room.name}` : `Eye repositioned in ${room.name}`);
      return;
    }
    if (tool === "door" || tool === "window") {
      placeOpening(s, tool);
      setDraftPoint(null);
      return;
    }
    if (tool === "furniture") {
      const meta = FURNITURE_META[activeFurniture];
      const item: FurnitureItem = {
        id: uid("f"),
        type: activeFurniture,
        x: snap(s.x - meta.w / 2, 0.25),
        y: snap(s.y - meta.h / 2, 0.25),
        w: meta.w,
        h: meta.h,
        rot: 0,
      };
      onChange({ ...plan, furniture: [...plan.furniture, item] });
      onSelect({ kind: "furniture", id: item.id });
      onToast(`${meta.label} added`);
      setDraftPoint(null);
      return;
    }
    if (tool === "erase") {
      const t = findTarget(e);
      if (!t) {
        onToast("Click an item to erase it");
        return;
      }
      removeById(t.kind, t.id);
      return;
    }

    // select tool
    const target = findTarget(e);
    if (target) {
      if (target.kind === "furniture") {
        onSelect({ kind: "furniture", id: target.id });
        const item = plan.furniture.find((f) => f.id === target.id);
        if (item) setDrag({ kind: "furniture-move", id: item.id, offX: p.x - item.x, offY: p.y - item.y, sx: e.clientX, sy: e.clientY });
      } else if (target.kind === "room") {
        onSelect({ kind: "room", id: target.id });
        const room = plan.rooms.find((r) => r.id === target.id);
        if (room) setDrag({ kind: "room-move", id: room.id, offX: p.x - room.x, offY: p.y - room.y, sx: e.clientX, sy: e.clientY });
      } else if (target.kind === "opening") {
        onSelect({ kind: "opening", id: target.id });
      } else if (target.kind === "wall") {
        onSelect({ kind: "wall", id: target.id });
      }
      return;
    }
    onSelect(null);
    setDrag({ kind: "pan", sx: e.clientX, sy: e.clientY, view: { ...view } });
  };

  const removeById = (kind: string, id: string) => {
    if (kind === "room") {
      onChange({ ...plan, rooms: plan.rooms.filter((r) => r.id !== id) });
      onSelect(null);
      onToast("Room removed");
    } else if (kind === "furniture") {
      onChange({ ...plan, furniture: plan.furniture.filter((f) => f.id !== id) });
      onSelect(null);
      onToast("Furniture removed");
    } else if (kind === "opening") {
      onChange({ ...plan, openings: plan.openings.filter((o) => o.id !== id) });
      onSelect(null);
      onToast("Opening removed");
    } else if (kind === "wall") {
      onChange({ ...plan, extraWalls: plan.extraWalls.filter((w) => w.id !== id) });
      onSelect(null);
      onToast("Wall removed");
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const p = toWorld(e.clientX, e.clientY);
    const s = snapPoint(p);
    setCursor(s);
    const d = dragRef.current;
    if (!d) {
      setDraftPoint(tool === "wall" || tool === "room" || tool === "furniture" || tool === "door" || tool === "window" ? s : null);
      return;
    }
    if (d.kind === "pan") {
      const v = viewRef.current;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = ((e.clientX - d.sx) / rect.width) * v.w;
      const dy = ((e.clientY - d.sy) / rect.height) * v.h;
      setView({ ...d.view, x: d.view.x - dx, y: d.view.y - dy });
      return;
    }
    if (d.kind === "wall") {
      let end = s;
      if (!e.shiftKey) {
        const dx = Math.abs(end.x - d.start.x);
        const dy = Math.abs(end.y - d.start.y);
        end = dx >= dy ? { x: end.x, y: d.start.y } : { x: d.start.x, y: end.y };
      }
      setDraftPoint(end);
      return;
    }
    if (d.kind === "room") {
      setDraftPoint(s);
      return;
    }
    if ((d.kind === "room-move" || d.kind === "furniture-move") && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) {
      return;
    }
    if (d.kind === "room-move") {
      setPreview({
        ...plan,
        rooms: plan.rooms.map((r) =>
          r.id === d.id
            ? {
                ...r,
                x: clamp(snap(p.x - d.offX, 0.5), -2, plan.width - r.w + 2),
                y: clamp(snap(p.y - d.offY, 0.5), -2, plan.depth - r.h + 2),
              }
            : r,
        ),
      });
      return;
    }
    if (d.kind === "furniture-move") {
      setPreview({
        ...plan,
        furniture: plan.furniture.map((f) =>
          f.id === d.id
            ? {
                ...f,
                x: clamp(snap(p.x - d.offX, 0.25), -1, plan.width - f.w + 1),
                y: clamp(snap(p.y - d.offY, 0.25), -1, plan.depth - f.h + 1),
              }
            : f,
        ),
      });
    }
  };

  const handlePointerUp = () => {
    const d = dragRef.current;
    const point = draftPoint;
    setDrag(null);
    if (!d) return;
    if (d.kind === "wall" && point) {
      if (Math.hypot(point.x - d.start.x, point.y - d.start.y) > 1) {
        onChange({
          ...plan,
          extraWalls: [...plan.extraWalls, { id: uid("wall"), x1: d.start.x, y1: d.start.y, x2: point.x, y2: point.y }],
        });
        onToast("Wall added");
      }
    }
    if (d.kind === "room" && point) {
      const x = Math.min(d.start.x, point.x);
      const y = Math.min(d.start.y, point.y);
      const w = Math.abs(point.x - d.start.x);
      const h = Math.abs(point.y - d.start.y);
      if (w > 2.5 && h > 2.5) {
        const room: Room = { id: uid("room"), name: "New Room", type: "living", x, y, w, h };
        onChange({ ...plan, rooms: [...plan.rooms, room] });
        onSelect({ kind: "room", id: room.id });
        onToast("Room added with an eye icon — use the room panel to remove it or upload photos");
      }
    }
    if ((d.kind === "room-move" || d.kind === "furniture-move") && preview) {
      onChange(preview);
    }
    setPreview(null);
  };

  /* ------------------------------------------------------------------ */

  const roomSelected = selection?.kind === "room" ? selection.id : null;
  const selectedRoom = activePlan.rooms.find((r) => r.id === roomSelected) ?? null;
  const selectedWall =
    selection?.kind === "wall" ? walls.find((w) => w.id === selection.id) ?? null : null;
  const draftRoom =
    drag?.kind === "room" && draftPoint
      ? {
          x: Math.min(drag.start.x, draftPoint.x),
          y: Math.min(drag.start.y, draftPoint.y),
          w: Math.abs(draftPoint.x - drag.start.x),
          h: Math.abs(draftPoint.y - drag.start.y),
        }
      : null;
  const draftWall = drag?.kind === "wall" && draftPoint ? { a: drag.start, b: draftPoint } : null;

  const paper = inside ? "#f1ebdd" : "#faf8f2";
  const ink = inside ? "#4c463a" : "#25414d";
  const softInk = inside ? "#8d8574" : "#8b9a9d";
  const accent = "#d4653f";
  const windowInk = inside ? "#6e98a0" : "#42839a";

  const scaleTarget = Math.max(2, view.w / 5);
  const nice = [1, 2, 5, 10, 20, 50, 100].reduce((best, n) => (Math.abs(n - scaleTarget) < Math.abs(best - scaleTarget) ? n : best), 1);

  const scaleX = view.x + view.w * 0.035;
  const scaleY = view.y + view.h * 0.955;
  const scaleLen = nice;

  const toolHint: Record<Tool, string> = {
    select: "Select to edit · drag to move · eye icons open real room photos",
    pan: "Drag to pan the sheet · scroll to zoom",
    wall: "Drag to draw a wall · hold Shift for free angle",
    room: "Drag a rectangle to carve out a new room",
    door: "Click a wall to place a door",
    window: "Click an exterior wall to place a window",
    furniture: `Click the plan to place a ${FURNITURE_META[activeFurniture].label.toLowerCase()}`,
    eye: "Click anywhere in a room to place or move its eye · click an eye to remove it",
    erase: "Click any room, wall, door or object to remove it",
  };

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden" style={{ background: inside ? "#e9e2d2" : "#f4f1e8" }}>
      <svg
        id="plan-svg"
        ref={svgRef}
        className="plan-svg h-full w-full"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setCursor(null);
          setDraftPoint(null);
        }}
        style={{ cursor: drag?.kind === "pan" ? "grabbing" : tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair" }}
      >
        <defs>
          <pattern id="grid-minor" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M 1 0 L 0 0 0 1" fill="none" stroke={inside ? "#e2dac8" : "#eae6db"} strokeWidth="0.028" />
          </pattern>
          <pattern id="grid-major" width="5" height="5" patternUnits="userSpaceOnUse">
            <rect width="5" height="5" fill="url(#grid-minor)" />
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke={inside ? "#d8cfb9" : "#dfdacb"} strokeWidth="0.055" />
          </pattern>
          <pattern id="wood" width="1.1" height="4.4" patternUnits="userSpaceOnUse">
            <rect width="1.1" height="4.4" fill="none" />
            <line x1="1.1" y1="0" x2="1.1" y2="4.4" stroke="#b9a37d" strokeWidth="0.035" strokeOpacity="0.55" />
            <line x1="0" y1="2.2" x2="1.1" y2="2.2" stroke="#b9a37d" strokeWidth="0.025" strokeOpacity="0.4" />
          </pattern>
          <pattern id="tile" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
            <path d="M 1.6 0 L 0 0 0 1.6" fill="none" stroke="#a9b6b3" strokeWidth="0.03" strokeOpacity="0.55" />
          </pattern>
          <pattern id="stone" width="2" height="2" patternUnits="userSpaceOnUse">
            <rect width="2" height="2" fill="none" />
            <circle cx="0.35" cy="0.5" r="0.06" fill="#9aa48f" fillOpacity="0.4" />
            <circle cx="1.2" cy="1.4" r="0.05" fill="#9aa48f" fillOpacity="0.3" />
          </pattern>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0.09" stdDeviation="0.1" floodColor="#4a3f2c" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* paper + grid (skipped on SVG export, re-added by exporter) */}
        <rect data-export="skip" x={view.x - 4} y={view.y - 4} width={view.w + 8} height={view.h + 8} fill={paper} />
        {display.grid && (
          <rect data-export="skip" x={view.x - 4} y={view.y - 4} width={view.w + 8} height={view.h + 8} fill="url(#grid-major)" opacity={inside ? 0.55 : 1} />
        )}

        {/* room floors */}
        <g>
          {activePlan.rooms.map((room) => {
            const c = ROOM_COLORS[room.type];
            const floorPattern =
              room.type === "bath" || room.type === "kitchen" || room.type === "laundry"
                ? "url(#tile)"
                : room.type === "balcony"
                  ? "url(#stone)"
                  : "url(#wood)";
            return (
              <g
                key={room.id}
                onPointerEnter={() => setHover(room.id)}
                onPointerLeave={() => setHover((h) => (h === room.id ? null : h))}
              >
                <rect
                  data-kind="room"
                  data-id={room.id}
                  x={room.x}
                  y={room.y}
                  width={room.w}
                  height={room.h}
                  fill={inside ? c.inside : c.fill}
                  style={{ cursor: tool === "select" ? "move" : tool === "erase" ? "pointer" : "crosshair" }}
                />
                {inside && (
                  <rect x={room.x} y={room.y} width={room.w} height={room.h} fill={floorPattern} opacity={0.55} style={{ pointerEvents: "none" }} />
                )}
                {(hover === room.id || roomSelected === room.id) && (
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.w}
                    height={room.h}
                    fill={accent}
                    fillOpacity={roomSelected === room.id ? 0.07 : 0.035}
                    stroke={accent}
                    strokeWidth={roomSelected === room.id ? 0.16 : 0.1}
                    strokeDasharray={roomSelected === room.id ? "0.55 0.32" : undefined}
                    style={{ pointerEvents: "none" }}
                    className="no-export"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* furniture */}
        {display.furniture && (
          <g filter={inside ? "url(#soft-shadow)" : undefined}>
            {[...activePlan.furniture]
              .sort((a, b) => Number(a.type === "rug") - Number(b.type === "rug"))
              .map((item) => {
              const sel = selection?.kind === "furniture" && selection.id === item.id;
              return (
                <g
                  key={item.id}
                  data-kind="furniture"
                  data-id={item.id}
                  onPointerEnter={() => setHover(item.id)}
                  onPointerLeave={() => setHover(null)}
                  style={{ cursor: tool === "select" ? "move" : tool === "erase" ? "pointer" : "crosshair" }}
                >
                  <FurnitureSymbol type={item.type} w={item.w} h={item.h} x={item.x} y={item.y} rot={item.rot} mode={inside ? "inside" : "plan"} />
                  <rect
                    x={item.x}
                    y={item.y}
                    width={item.w}
                    height={item.h}
                    fill="transparent"
                    stroke={sel ? accent : hover === item.id ? accent : "transparent"}
                    strokeWidth={sel ? 0.13 : 0.08}
                    strokeDasharray={sel ? "0.3 0.2" : undefined}
                    transform={`rotate(${item.rot} ${item.x + item.w / 2} ${item.y + item.h / 2})`}
                    style={{ pointerEvents: "all" }}
                    className="no-export"
                  />
                </g>
                );
              })}
          </g>
        )}

        {/* wall casing + walls */}
        <g style={{ pointerEvents: "none" }}>
          {walls.map((w) => (
            <line
              key={`c-${w.id}`}
              x1={w.x1}
              y1={w.y1}
              x2={w.x2}
              y2={w.y2}
              stroke={inside ? "#efe7d7" : "#faf8f2"}
              strokeWidth={(w.exterior ? 0.68 : 0.48) + 0.18}
              strokeLinecap="square"
            />
          ))}
          {walls.map((w) => (
            <line
              key={w.id}
              x1={w.x1}
              y1={w.y1}
              x2={w.x2}
              y2={w.y2}
              stroke={ink}
              strokeWidth={w.exterior ? 0.68 : 0.48}
              strokeLinecap="square"
            />
          ))}
          {selectedWall && (
            <line
              x1={selectedWall.x1}
              y1={selectedWall.y1}
              x2={selectedWall.x2}
              y2={selectedWall.y2}
              stroke={accent}
              strokeWidth={0.16}
              strokeDasharray="0.45 0.25"
              className="no-export"
            />
          )}
        </g>
        {/* manual wall hit areas */}
        {walls
          .filter((w) => w.manual)
          .map((w) => (
            <line
              key={`hit-${w.id}`}
              data-kind="wall"
              data-id={w.id}
              x1={w.x1}
              y1={w.y1}
              x2={w.x2}
              y2={w.y2}
              stroke="transparent"
              strokeWidth={WALL_HIT}
              style={{ cursor: "pointer" }}
            />
          ))}

        {/* openings */}
        <g>
          {activePlan.openings.map((op) => (
            <OpeningMark
              key={op.id}
              op={op}
              paper={paper}
              ink={ink}
              windowInk={windowInk}
              soft={softInk}
              selected={selection?.kind === "opening" && selection.id === op.id}
              onSelect={() => {
                if (tool === "select") onSelect({ kind: "opening", id: op.id });
                if (tool === "erase") removeById("opening", op.id);
              }}
            />
          ))}
        </g>

        {/* labels */}
        {display.labels && (
          <g style={{ pointerEvents: "none" }}>
            {activePlan.rooms.map((room) => {
              const tiny = room.w < 5 || room.h < 4;
              const nameSize = clamp(Math.min(room.w, room.h) * 0.115, 0.6, 1.15);
              const dimSize = nameSize * 0.6;
              const c = ROOM_COLORS[room.type];
              return (
                <g key={`label-${room.id}`} className="no-export">
                  <text
                    x={room.x + room.w / 2}
                    y={room.y + room.h / 2 - (tiny ? 0 : nameSize * 0.28)}
                    textAnchor="middle"
                    fontSize={nameSize}
                    fontWeight={600}
                    fill={inside ? "#4a4234" : "#30474e"}
                    letterSpacing={0.01}
                    stroke={inside ? "#f1ebdd" : "#faf8f2"}
                    strokeWidth={nameSize * 0.16}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                  >
                    {room.name}
                  </text>
                  {!tiny && (
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h / 2 + dimSize * 1.9}
                      textAnchor="middle"
                      fontSize={dimSize}
                      fill={inside ? "#8b826f" : c.ink}
                      fontFamily="'IBM Plex Mono', monospace"
                      letterSpacing={0.05}
                      stroke={inside ? "#f1ebdd" : "#faf8f2"}
                      strokeWidth={dimSize * 0.2}
                      paintOrder="stroke"
                    >
                      {formatFeet(room.w)} × {formatFeet(room.h)}
                    </text>
                  )}
                  {!tiny && room.w * room.h > 70 && (
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h / 2 + dimSize * 3.5}
                      textAnchor="middle"
                      fontSize={dimSize * 0.86}
                      fill={inside ? "#a2987f" : softInk}
                      fontFamily="'IBM Plex Mono', monospace"
                      letterSpacing={0.06}
                      stroke={inside ? "#f1ebdd" : "#faf8f2"}
                      strokeWidth={dimSize * 0.2}
                      paintOrder="stroke"
                    >
                      {Math.round(room.w * room.h)} SQ FT
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* real-room photo markers */}
        {display.photos && (
          <g>
            {activePlan.rooms.filter((room) => room.photoMarker !== false).map((room) => (
              <RoomEyeMarker
                key={`photo-${room.id}`}
                room={room}
                ink={ink}
                paper={paper}
                selected={roomSelected === room.id}
                editing={tool === "eye"}
                onOpen={() => onViewPhotos(room.id)}
                onRemove={() => removeEye(room.id)}
              />
            ))}
          </g>
        )}

        {/* dimensions */}
        {display.dimensions && <Dimensions plan={plan} ink={softInk} paper={paper} />}

        {/* selection handles */}
        {selectedRoom && (
          <g className="no-export" style={{ pointerEvents: "none" }}>
            {[
              [selectedRoom.x, selectedRoom.y],
              [selectedRoom.x + selectedRoom.w, selectedRoom.y],
              [selectedRoom.x, selectedRoom.y + selectedRoom.h],
              [selectedRoom.x + selectedRoom.w, selectedRoom.y + selectedRoom.h],
            ].map(([hx, hy], i) => (
              <rect key={i} x={hx - 0.22} y={hy - 0.22} width={0.44} height={0.44} fill="#fff" stroke={accent} strokeWidth={0.1} />
            ))}
          </g>
        )}

        {/* drafts */}
        {draftWall && (
          <g style={{ pointerEvents: "none" }} className="no-export">
            <line
              x1={draftWall.a.x}
              y1={draftWall.a.y}
              x2={draftWall.b.x}
              y2={draftWall.b.y}
              stroke={accent}
              strokeWidth={0.45}
              strokeLinecap="square"
            />
            <circle cx={draftWall.a.x} cy={draftWall.a.y} r={0.22} fill="#fff" stroke={accent} strokeWidth={0.1} />
            <circle cx={draftWall.b.x} cy={draftWall.b.y} r={0.22} fill="#fff" stroke={accent} strokeWidth={0.1} />
            <text
              x={(draftWall.a.x + draftWall.b.x) / 2}
              y={(draftWall.a.y + draftWall.b.y) / 2 - 0.6}
              textAnchor="middle"
              fontSize={0.85}
              fill={accent}
              fontFamily="'IBM Plex Mono', monospace"
              stroke={paper}
              strokeWidth={0.25}
              paintOrder="stroke"
            >
              {formatFeet(Math.hypot(draftWall.b.x - draftWall.a.x, draftWall.b.y - draftWall.a.y))}
            </text>
          </g>
        )}
        {draftRoom && (
          <g className="no-export" style={{ pointerEvents: "none" }}>
            <rect
              x={draftRoom.x}
              y={draftRoom.y}
              width={draftRoom.w}
              height={draftRoom.h}
              fill={accent}
              fillOpacity={0.1}
              stroke={accent}
              strokeWidth={0.16}
              strokeDasharray="0.5 0.3"
            />
            <text
              x={draftRoom.x + draftRoom.w / 2}
              y={draftRoom.y + draftRoom.h / 2}
              textAnchor="middle"
              fontSize={0.85}
              fill={accent}
              fontFamily="'IBM Plex Mono', monospace"
              stroke={paper}
              strokeWidth={0.24}
              paintOrder="stroke"
            >
              {formatFeet(draftRoom.w)} × {formatFeet(draftRoom.h)}
            </text>
          </g>
        )}
        {draftPoint && (tool === "door" || tool === "window" || tool === "furniture") && (
          <g style={{ pointerEvents: "none" }} className="no-export">
            {tool === "furniture" ? (
              <rect
                x={draftPoint.x - FURNITURE_META[activeFurniture].w / 2}
                y={draftPoint.y - FURNITURE_META[activeFurniture].h / 2}
                width={FURNITURE_META[activeFurniture].w}
                height={FURNITURE_META[activeFurniture].h}
                fill={accent}
                fillOpacity={0.12}
                stroke={accent}
                strokeWidth={0.1}
                strokeDasharray="0.3 0.2"
              />
            ) : (
              <circle cx={draftPoint.x} cy={draftPoint.y} r={0.5} fill="none" stroke={accent} strokeWidth={0.12} />
            )}
          </g>
        )}

        {/* scale indicator, always on the sheet */}
        <g data-export="skip" style={{ pointerEvents: "none" }}>
          <line x1={scaleX} y1={scaleY} x2={scaleX + scaleLen} y2={scaleY} stroke={softInk} strokeWidth={0.09} />
          <line x1={scaleX} y1={scaleY - 0.3} x2={scaleX} y2={scaleY + 0.3} stroke={softInk} strokeWidth={0.09} />
          <line x1={scaleX + scaleLen} y1={scaleY - 0.3} x2={scaleX + scaleLen} y2={scaleY + 0.3} stroke={softInk} strokeWidth={0.09} />
          <line x1={scaleX + scaleLen / 2} y1={scaleY - 0.18} x2={scaleX + scaleLen / 2} y2={scaleY + 0.18} stroke={softInk} strokeWidth={0.07} />
          <text x={scaleX} y={scaleY - 0.7} fontSize={0.62} fill={softInk} fontFamily="'IBM Plex Mono', monospace" letterSpacing={0.08}>
            {nice} FT
          </text>
          <g transform={`translate(${view.x + view.w * 0.955} ${view.y + view.h * 0.94}) scale(${view.w / 700})`}>
            <circle r="22" fill="none" stroke={softInk} strokeWidth="1" opacity="0.4" />
            <path d="M 0 -15 L 6 7 L 0 3 L -6 7 Z" fill={softInk} opacity="0.8" />
            <text x="0" y="-28" textAnchor="middle" fontSize="11" fill={softInk} fontFamily="'IBM Plex Mono', monospace">
              N
            </text>
          </g>
        </g>
      </svg>

      {mode === "3d" && <House3D plan={plan} onPlanChange={onChange} />}

      {inside && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 160px rgba(92,70,42,0.22)" }}
        />
      )}

      {/* overlay: level + room count */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-line bg-white/90 px-2 py-1.5 shadow-sm backdrop-blur">
          <span className="micro px-0.5 text-ink-soft">{floorName}</span>
          <button onClick={() => onFloorChange(floorIndex - 1)} disabled={floorIndex === 0} className="rounded p-0.5 text-ink-faint hover:bg-paper-deep hover:text-ink disabled:opacity-25" title="Previous floor"><ChevronDown className="h-3.5 w-3.5" /></button>
          <button onClick={() => onFloorChange(floorIndex + 1)} disabled={floorIndex >= floorCount - 1} className="rounded p-0.5 text-ink-faint hover:bg-paper-deep hover:text-ink disabled:opacity-25" title="Next floor"><ChevronUp className="h-3.5 w-3.5" /></button>
          <span className="mx-0.5 h-3 w-px bg-line" />
          <button onClick={onAddFloor} className="rounded p-0.5 text-accent hover:bg-accent-soft" title="Duplicate as a new floor"><Plus className="h-3.5 w-3.5" /></button>
          {floorCount > 1 && <button onClick={onDeleteFloor} className="rounded p-0.5 text-ink-faint hover:bg-red-50 hover:text-red-600" title="Delete this floor"><Trash2 className="h-3 w-3" /></button>}
          <span className="mx-0.5 hidden h-3 w-px bg-line sm:block" />
          <span className="micro hidden text-ink-faint sm:inline">Floor plan</span>
        </div>
        <div className="hidden items-center gap-3 rounded-lg border border-line/80 bg-white/70 px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-ink-soft backdrop-blur sm:flex">
          <span>
            {plan.width}′ × {plan.depth}′
          </span>
          <span className="text-line">|</span>
          <span>{plan.rooms.length} rooms</span>
          <span className="text-line">|</span>
          <span>{plan.openings.length} openings</span>
        </div>
      </div>

      {tool === "eye" && mode !== "3d" && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-10 w-max max-w-[90%] -translate-x-1/2 rounded-full border border-accent/25 bg-white/95 px-3 py-1.5 text-center text-[10px] font-medium text-ink-soft shadow-sm backdrop-blur">
          Click a room to place or move its eye · click an eye to remove it
        </div>
      )}

      {/* overlay: view mode + display */}
      <div className="absolute right-3 top-3 flex items-start gap-2">
        <div className="flex rounded-xl border border-line bg-white/95 p-1 shadow-sm backdrop-blur">
          <button
            onClick={() => onModeChange("plan")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
              mode === "plan" ? "bg-ink text-white shadow-sm" : "text-ink-soft hover:bg-paper-deep"
            }`}
          >
            <PencilRuler className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Blueprint</span>
          </button>
          <button
            onClick={() => onModeChange("inside")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
              mode === "inside" ? "bg-ink text-white shadow-sm" : "text-ink-soft hover:bg-paper-deep"
            }`}
          >
            <Sofa className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Inside</span>
          </button>
          <button
            onClick={() => onModeChange("3d")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
              mode === "3d" ? "bg-ink text-white shadow-sm" : "text-ink-soft hover:bg-paper-deep"
            }`}
          >
            <Box className="h-3.5 w-3.5" /> 3D
          </button>
        </div>
        <div className={mode === "3d" ? "hidden" : "relative"}>
          <button
            onClick={() => setLayersOpen((o) => !o)}
            className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-medium shadow-sm backdrop-blur transition ${
              layersOpen ? "border-ink bg-ink text-white" : "border-line bg-white/95 text-ink-soft hover:bg-paper-deep"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Layers</span>
          </button>
          {layersOpen && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={() => setLayersOpen(false)} aria-label="Close layers" />
              <div className="animate-pop absolute right-0 top-11 z-20 w-52 rounded-xl border border-line bg-white p-2 shadow-xl">
                <p className="micro px-2 pb-1.5 pt-1 text-ink-faint">Sheet display</p>
                {(
                  [
                    ["grid", "Grid & scale", Grid3X3],
                    ["dimensions", "Dimensions", Ruler],
                    ["furniture", "Furniture", Sofa],
                    ["labels", "Room labels", Tag],
                    ["photos", "Show all eye icons", Eye],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => onDisplayChange({ ...display, [key]: !display[key] })}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-ink hover:bg-paper-deep"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-ink-faint" /> {label}
                    </span>
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${display[key] ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>
                      {display[key] && <Check className="h-2.5 w-2.5" />}
                    </span>
                  </button>
                ))}
                <div className="mt-1 border-t border-line-soft px-2 py-2 text-[10px] leading-relaxed text-ink-faint">
                  <Eye className="mr-1 inline h-3 w-3" /> Toggle what's drawn on the sheet. Nothing is deleted.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* overlay: hint */}
      <div
        className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 lg:block"
        style={{ display: mode === "3d" ? "none" : undefined }}
      >
        <div className="rounded-full border border-line bg-white/95 px-3.5 py-1.5 text-[11px] font-medium text-ink-soft shadow-sm backdrop-blur">
          {toolHint[tool]}
        </div>
      </div>

      {/* overlay: zoom */}
      <div
        className="absolute bottom-4 right-3 flex items-center gap-1 rounded-xl border border-line bg-white/95 p-1 shadow-sm backdrop-blur"
        style={{ display: mode === "3d" ? "none" : undefined }}
      >
        <button onClick={() => zoomBy(1.25)} className="rounded-lg p-1.5 text-ink-soft hover:bg-paper-deep" aria-label="Zoom out">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-11 text-center font-mono text-[10px] text-ink-soft">{Math.round((fitW / view.w) * 100)}%</span>
        <button onClick={() => zoomBy(0.8)} className="rounded-lg p-1.5 text-ink-soft hover:bg-paper-deep" aria-label="Zoom in">
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="mx-0.5 h-4 w-px bg-line" />
        <button onClick={fit} className="rounded-lg p-1.5 text-ink-soft hover:bg-paper-deep" aria-label="Fit plan">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* overlay: coordinates */}
      <div
        className="pointer-events-none absolute bottom-4 left-3 hidden items-center gap-2 rounded-xl border border-line bg-white/95 px-2.5 py-1.5 font-mono text-[10px] text-ink-soft shadow-sm backdrop-blur sm:flex"
        style={{ display: mode === "3d" ? "none" : undefined }}
      >
        <Compass className="h-3 w-3 text-ink-faint" />
        <span className="w-24">{cursor ? `X ${cursor.x.toFixed(1)}  Y ${cursor.y.toFixed(1)}` : "X —  Y —"}</span>
        <span className="h-3 w-px bg-line" />
        <span className="text-ink-faint">SNAP 6″</span>
      </div>
      <div
        className="pointer-events-none absolute bottom-4 left-3 rounded-lg border border-line bg-white/90 px-2 py-1 font-mono text-[10px] text-ink-soft sm:hidden"
        style={{ display: mode === "3d" ? "none" : undefined }}
      >
        {display.furniture ? allFurnitureLabel(activePlan) : `${plan.rooms.length} rooms`}
      </div>
    </div>
  );
}

function Dimensions({ plan, ink, paper }: { plan: Plan; ink: string; paper: string }) {
  const minX = Math.min(...plan.rooms.map((r) => r.x), 0);
  const maxX = Math.max(...plan.rooms.map((r) => r.x + r.w), plan.width);
  const minY = Math.min(...plan.rooms.map((r) => r.y), 0);
  const maxY = Math.max(...plan.rooms.map((r) => r.y + r.h), plan.depth);
  const offset = 2.4;
  const size = 0.66;

  const Dim = ({
    x1,
    y1,
    x2,
    y2,
    label,
    vertical,
  }: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    label: string;
    vertical?: boolean;
  }) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={0.055} opacity={0.8} />
      <line x1={x1 + (vertical ? -0.35 : 0)} y1={y1 - (vertical ? 0 : 0.35)} x2={x1 + (vertical ? 0.35 : 0)} y2={y1 + (vertical ? 0 : 0.35)} stroke={ink} strokeWidth={0.055} />
      <line x1={x2 + (vertical ? -0.35 : 0)} y1={y2 - (vertical ? 0 : 0.35)} x2={x2 + (vertical ? 0.35 : 0)} y2={y2 + (vertical ? 0 : 0.35)} stroke={ink} strokeWidth={0.055} />
      <text
        x={(x1 + x2) / 2}
        y={(y1 + y2) / 2 + (vertical ? 0 : -0.35)}
        fontSize={size}
        fill={ink}
        textAnchor="middle"
        fontFamily="'IBM Plex Mono', monospace"
        transform={vertical ? `rotate(-90 ${(x1 + x2) / 2} ${(y1 + y2) / 2 - 0.2})` : undefined}
        letterSpacing={0.04}
        stroke={paper}
        strokeWidth={0.2}
        paintOrder="stroke"
      >
        {label}
      </text>
    </g>
  );

  return (
    <g style={{ pointerEvents: "none" }}>
      <Dim x1={minX} y1={minY - offset} x2={maxX} y2={minY - offset} label={formatFeet(maxX - minX)} />
      <Dim x1={minX - offset} y1={minY} x2={minX - offset} y2={maxY} label={formatFeet(maxY - minY)} vertical />
    </g>
  );
}

function RoomEyeMarker({
  room,
  ink,
  paper,
  selected,
  editing,
  onOpen,
  onRemove,
}: {
  room: Room;
  ink: string;
  paper: string;
  selected: boolean;
  editing: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const r = clamp(Math.min(room.w, room.h) * 0.115, 0.4, 0.72);
  const cx = room.photoMarkerX === undefined
    ? room.x + room.w - r - 0.38
    : room.x + clamp(room.photoMarkerX, 0, 1) * room.w;
  const cy = room.photoMarkerY === undefined
    ? room.y + r + 0.38
    : room.y + clamp(room.photoMarkerY, 0, 1) * room.h;
  const accent = "#d4653f";
  const activate = () => (editing ? onRemove() : onOpen());

  return (
    <g
      data-export="skip"
      className="no-export"
      transform={`translate(${cx} ${cy})`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        activate();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={editing ? `Remove eye from ${room.name}` : `See real interior photos of ${room.name}`}
      style={{ cursor: "pointer" }}
    >
      <title>{editing ? `Remove eye from ${room.name}` : `See real interior photos of ${room.name}`}</title>
      <circle r={r + 0.16} fill={paper} fillOpacity={0.72} style={{ pointerEvents: "none" }} />
      <circle
        r={r}
        fill="#ffffff"
        fillOpacity={0.96}
        stroke={selected || editing ? accent : ink}
        strokeWidth={selected || editing ? 0.11 : 0.07}
        filter="url(#soft-shadow)"
        style={{ pointerEvents: "none" }}
      />
      <path
        d={`M ${-r * 0.58} 0 Q 0 ${-r * 0.62} ${r * 0.58} 0 Q 0 ${r * 0.62} ${-r * 0.58} 0 Z`}
        fill="none"
        stroke={ink}
        strokeWidth={r * 0.15}
        strokeLinejoin="round"
        style={{ pointerEvents: "none" }}
      />
      {editing ? (
        <path
          d={`M ${-r * 0.2} ${-r * 0.2} L ${r * 0.2} ${r * 0.2} M ${r * 0.2} ${-r * 0.2} L ${-r * 0.2} ${r * 0.2}`}
          stroke={accent}
          strokeWidth={r * 0.16}
          strokeLinecap="round"
          style={{ pointerEvents: "none" }}
        />
      ) : (
        <circle r={r * 0.21} fill={accent} style={{ pointerEvents: "none" }} />
      )}
      <circle r={r + 0.3} fill="transparent" />
    </g>
  );
}

function OpeningMark({
  op,
  paper,
  ink,
  windowInk,
  soft,
  selected,
  onSelect,
}: {
  op: Opening;
  paper: string;
  ink: string;
  windowInk: string;
  soft: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const horizontal = op.angle === 0;
  const w = op.width;
  const patch = horizontal
    ? { x: op.x - w / 2, y: op.y - 0.55, width: w, height: 1.1 }
    : { x: op.x - 0.55, y: op.y - w / 2, width: 1.1, height: w };

  const dir = horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 };
  const normal = { x: -dir.y, y: dir.x };
  const hinge = { x: op.x - (dir.x * w) / 2, y: op.y - (dir.y * w) / 2 };
  const other = { x: op.x + (dir.x * w) / 2, y: op.y + (dir.y * w) / 2 };
  const leaf = { x: hinge.x + normal.x * w * op.swing, y: hinge.y + normal.y * w * op.swing };
  const k = 0.5523 * w;
  const arc = `M ${leaf.x} ${leaf.y} C ${leaf.x + dir.x * k} ${leaf.y + dir.y * k} ${other.x - normal.x * op.swing * k} ${other.y - normal.y * op.swing * k} ${other.x} ${other.y}`;
  const hit = horizontal
    ? { x: op.x - w / 2 - 0.6, y: op.y - 1.1, width: w + 1.2, height: 2.2 }
    : { x: op.x - 1.1, y: op.y - w / 2 - 0.6, width: 2.2, height: w + 1.2 };

  return (
    <g data-kind="opening" data-id={op.id} onClick={onSelect} style={{ cursor: "pointer" }}>
      <rect {...patch} fill={paper} style={{ pointerEvents: "none" }} />
      {op.kind === "door" ? (
        <>
          <line x1={hinge.x} y1={hinge.y} x2={leaf.x} y2={leaf.y} stroke={ink} strokeWidth={0.11} style={{ pointerEvents: "none" }} />
          <path d={arc} fill="none" stroke={soft} strokeWidth={0.07} strokeDasharray="0.22 0.16" style={{ pointerEvents: "none" }} />
          <line x1={hinge.x - normal.x * 0.3} y1={hinge.y - normal.y * 0.3} x2={hinge.x + normal.x * 0.3} y2={hinge.y + normal.y * 0.3} stroke={ink} strokeWidth={0.1} style={{ pointerEvents: "none" }} />
        </>
      ) : (
        <>
          <line x1={hinge.x - normal.x * 0.2} y1={hinge.y - normal.y * 0.2} x2={other.x - normal.x * 0.2} y2={other.y - normal.y * 0.2} stroke={windowInk} strokeWidth={0.09} style={{ pointerEvents: "none" }} />
          <line x1={hinge.x + normal.x * 0.2} y1={hinge.y + normal.y * 0.2} x2={other.x + normal.x * 0.2} y2={other.y + normal.y * 0.2} stroke={windowInk} strokeWidth={0.09} style={{ pointerEvents: "none" }} />
          <line x1={hinge.x} y1={hinge.y} x2={other.x} y2={other.y} stroke={windowInk} strokeWidth={0.05} opacity={0.7} style={{ pointerEvents: "none" }} />
        </>
      )}
      <rect
        {...hit}
        fill="transparent"
        stroke={selected ? "#d4653f" : "transparent"}
        strokeWidth={0.12}
        className="no-export"
      />
    </g>
  );
}
