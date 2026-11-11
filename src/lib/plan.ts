import type {
  FurnitureItem,
  FurnitureType,
  GenerateOptions,
  Opening,
  Plan,
  Room,
  RoomType,
  WallSegment,
} from "@/types";

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36).slice(-4)}${counter.toString(36)}`;
}

export const snap = (v: number, step = 0.5) => Math.round(v / step) * step;
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const roomArea = (r: Room) => r.w * r.h;

export function formatFeet(value: number, withInches = true): string {
  const feet = Math.floor(value + 1e-6);
  const inches = Math.round((value - feet) * 12);
  if (!withInches) return `${feet}'`;
  if (inches === 0) return `${feet}'`;
  return `${feet}'${inches}"`;
}

export const ROOM_LABEL: Record<RoomType, string> = {
  living: "Living",
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  dining: "Dining",
  bath: "Bath",
  hall: "Hall",
  balcony: "Balcony",
  study: "Study",
  storage: "Storage",
  laundry: "Laundry",
};

export const ROOM_COLORS: Record<RoomType, { fill: string; inside: string; ink: string }> = {
  living: { fill: "#f6f0e3", inside: "#efe3ce", ink: "#a98d5f" },
  bedroom: { fill: "#f5f1e8", inside: "#e9ddc9", ink: "#a08b6c" },
  kitchen: { fill: "#f0f2e8", inside: "#e3e7d5", ink: "#8a9772" },
  dining: { fill: "#f4efe4", inside: "#ebdcc4", ink: "#a68b64" },
  bath: { fill: "#edf2f2", inside: "#dbe8e8", ink: "#7d9b9c" },
  hall: { fill: "#f4f1e9", inside: "#e8e1d2", ink: "#a0947f" },
  balcony: { fill: "#eef2e7", inside: "#dfe8d3", ink: "#8a9a73" },
  study: { fill: "#f3efe7", inside: "#e7dcc9", ink: "#9b8a70" },
  storage: { fill: "#f2f1ec", inside: "#e6e4da", ink: "#97998f" },
  laundry: { fill: "#f0f2f1", inside: "#e0e7e4", ink: "#869b94" },
};

/* ------------------------------------------------------------------ */
/* Layout templates (fractions of the footprint)                       */
/* ------------------------------------------------------------------ */

type TemplateRoom = [name: string, type: RoomType, x: number, y: number, w: number, d: number];

const TEMPLATES: Record<1 | 2 | 3 | 4, TemplateRoom[]> = {
  1: [
    ["Living + Dining", "living", 0, 0, 0.6, 1],
    ["Kitchen", "kitchen", 0.6, 0, 0.4, 0.26],
    ["Bathroom", "bath", 0.6, 0.26, 0.4, 0.22],
    ["Bedroom", "bedroom", 0.6, 0.48, 0.4, 0.52],
  ],
  2: [
    ["Master Bedroom", "bedroom", 0, 0, 0.34, 0.44],
    ["Bedroom 2", "bedroom", 0, 0.44, 0.34, 0.36],
    ["Walk-in Closet", "storage", 0, 0.8, 0.17, 0.2],
    ["Bathroom", "bath", 0.17, 0.8, 0.17, 0.2],
    ["Hallway", "hall", 0.34, 0, 0.1, 1],
    ["Kitchen", "kitchen", 0.44, 0, 0.28, 0.26],
    ["Dining", "dining", 0.72, 0, 0.28, 0.26],
    ["Living Room", "living", 0.44, 0.26, 0.56, 0.38],
    ["Balcony", "balcony", 0.44, 0.64, 0.28, 0.36],
    ["Study", "study", 0.72, 0.64, 0.28, 0.36],
  ],
  3: [
    ["Master Bedroom", "bedroom", 0, 0, 0.34, 0.38],
    ["Bedroom 2", "bedroom", 0, 0.38, 0.34, 0.31],
    ["Bedroom 3", "bedroom", 0, 0.69, 0.34, 0.31],
    ["Hallway", "hall", 0.34, 0, 0.1, 1],
    ["Kitchen", "kitchen", 0.44, 0, 0.28, 0.26],
    ["Dining", "dining", 0.72, 0, 0.28, 0.26],
    ["Living Room", "living", 0.44, 0.26, 0.56, 0.4],
    ["Bathroom", "bath", 0.44, 0.66, 0.15, 0.34],
    ["Study", "study", 0.59, 0.66, 0.14, 0.34],
    ["Balcony", "balcony", 0.73, 0.66, 0.27, 0.34],
  ],
  4: [
    ["Master Bedroom", "bedroom", 0, 0, 0.3, 0.38],
    ["Bedroom 2", "bedroom", 0, 0.38, 0.3, 0.3],
    ["Bedroom 3", "bedroom", 0, 0.68, 0.3, 0.32],
    ["Hallway", "hall", 0.3, 0, 0.09, 1],
    ["Bedroom 4", "bedroom", 0.39, 0, 0.22, 0.36],
    ["Bathroom", "bath", 0.39, 0.36, 0.11, 0.24],
    ["Storage", "storage", 0.5, 0.36, 0.11, 0.24],
    ["Laundry", "laundry", 0.39, 0.6, 0.22, 0.2],
    ["Balcony", "balcony", 0.39, 0.8, 0.22, 0.2],
    ["Kitchen", "kitchen", 0.61, 0, 0.39, 0.24],
    ["Dining", "dining", 0.61, 0.24, 0.39, 0.24],
    ["Living Room", "living", 0.61, 0.48, 0.39, 0.52],
  ],
};

export const FOOTPRINT_PRESETS: Record<number, { width: number; depth: number; label: string }> = {
  1: { width: 32, depth: 26, label: "Studio / 1 bed" },
  2: { width: 44, depth: 32, label: "2 bed apartment" },
  3: { width: 52, depth: 38, label: "3 bed family flat" },
  4: { width: 60, depth: 42, label: "4 bed residence" },
};

export const DEFAULT_OPTIONS: GenerateOptions = {
  bedrooms: 2,
  bathrooms: 2,
  width: 44,
  depth: 32,
  furnished: true,
};

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

export function generatePlan(options: GenerateOptions, name = "Riverside Apartment"): Plan {
  const W = Math.max(20, snap(options.width, 0.5));
  const D = Math.max(16, snap(options.depth, 0.5));
  const template = TEMPLATES[options.bedrooms] ?? TEMPLATES[2];

  let rooms: Room[] = template.map(([roomName, type, fx, fy, fw, fd]) => {
    const x = snap(fx * W, 0.5);
    const y = snap(fy * D, 0.5);
    const x2 = snap((fx + fw) * W, 0.5);
    const y2 = snap((fy + fd) * D, 0.5);
    return {
      id: uid("room"),
      name: roomName,
      type,
      x,
      y,
      w: Math.max(1, x2 - x),
      h: Math.max(1, y2 - y),
    };
  });

  // Reconcile bathroom count with the requested program.
  const baths = rooms.filter((r) => r.type === "bath");
  if (baths.length > options.bathrooms) {
    const extras = baths.slice(options.bathrooms);
    rooms = rooms.map((r) => {
      const match = extras.find((e) => e.id === r.id);
      if (!match) return r;
      return { ...r, name: "Storage", type: "storage" as RoomType };
    });
  } else if (baths.length < options.bathrooms) {
    const candidate =
      rooms.find((r) => r.type === "study") ?? rooms.find((r) => r.type === "storage");
    if (candidate) {
      rooms = rooms.map((r) =>
        r.id === candidate.id ? { ...r, name: "Bathroom", type: "bath" as RoomType } : r,
      );
    }
  }

  // Give multiple bathrooms distinct, readable names.
  let bathIndex = 0;
  rooms = rooms.map((r) => {
    if (r.type !== "bath") return r;
    bathIndex += 1;
    return { ...r, name: bathIndex === 1 ? "Bathroom" : `Bathroom ${bathIndex}` };
  });

  const plan: Plan = {
    name,
    width: W,
    depth: D,
    rooms,
    extraWalls: [],
    openings: autoOpenings(rooms, W, D),
    furniture: options.furnished ? autoFurnish(rooms) : [],
  };
  return plan;
}

/* ------------------------------------------------------------------ */
/* Doors + windows                                                     */
/* ------------------------------------------------------------------ */

interface SharedEdge {
  x: number;
  y: number;
  angle: 0 | 90;
  overlap: number;
  swing: 1 | -1;
  neighbor: Room;
}

function sharedEdges(a: Room, b: Room): SharedEdge[] {
  const out: SharedEdge[] = [];
  const tol = 0.2;
  // a right edge / b left edge
  if (Math.abs(a.x + a.w - b.x) < tol) {
    const s = Math.max(a.y, b.y);
    const e = Math.min(a.y + a.h, b.y + b.h);
    if (e - s > 0.5) out.push({ x: a.x + a.w, y: (s + e) / 2, angle: 90, overlap: e - s, swing: 1, neighbor: b });
  }
  if (Math.abs(b.x + b.w - a.x) < tol) {
    const s = Math.max(a.y, b.y);
    const e = Math.min(a.y + a.h, b.y + b.h);
    if (e - s > 0.5) out.push({ x: a.x, y: (s + e) / 2, angle: 90, overlap: e - s, swing: -1, neighbor: b });
  }
  // a bottom edge / b top edge
  if (Math.abs(a.y + a.h - b.y) < tol) {
    const s = Math.max(a.x, b.x);
    const e = Math.min(a.x + a.w, b.x + b.w);
    if (e - s > 0.5) out.push({ x: (s + e) / 2, y: a.y + a.h, angle: 0, overlap: e - s, swing: -1, neighbor: b });
  }
  if (Math.abs(b.y + b.h - a.y) < tol) {
    const s = Math.max(a.x, b.x);
    const e = Math.min(a.x + a.w, b.x + b.w);
    if (e - s > 0.5) out.push({ x: (s + e) / 2, y: a.y, angle: 0, overlap: e - s, swing: 1, neighbor: b });
  }
  return out;
}

export function autoOpenings(rooms: Room[], W: number, D: number): Opening[] {
  const openings: Opening[] = [];
  const placed: { x: number; y: number; angle: 0 | 90 }[] = [];

  const tooClose = (x: number, y: number, angle: 0 | 90, gap: number) =>
    placed.some(
      (p) =>
        p.angle === angle &&
        (angle === 0 ? Math.abs(p.y - y) < 0.3 : Math.abs(p.x - x) < 0.3) &&
        (angle === 0 ? Math.abs(p.x - x) < gap : Math.abs(p.y - y) < gap),
    );

  // Grow a door network from the hallway so every room is reachable.
  const root = rooms.find((r) => r.type === "hall") ?? rooms.find((r) => r.type === "living") ?? rooms[0];
  if (root) {
    const visited = new Set<string>([root.id]);
    const queue: Room[] = [root];
    while (queue.length) {
      const current = queue.shift() as Room;
      const candidates = rooms
        .filter((r) => !visited.has(r.id))
        .map((r) => {
          const edges = sharedEdges(current, r)
            .filter((e) => e.overlap >= 2.6)
            .sort((a, b) => b.overlap - a.overlap);
          const best = edges[0];
          if (!best) return null;
          const score =
            (r.type === "hall" ? 120 : 0) + (r.type === "living" ? 35 : 0) + best.overlap;
          return { room: r, edge: best, score };
        })
        .filter((c): c is { room: Room; edge: SharedEdge; score: number } => Boolean(c))
        .sort((a, b) => b.score - a.score);

      for (const candidate of candidates) {
        if (visited.has(candidate.room.id)) continue;
        visited.add(candidate.room.id);
        // Recompute so the door swings into the child room rather than the parent.
        const intoChild = sharedEdges(candidate.room, current)
          .filter((e) => e.overlap >= 2.6)
          .sort(
            (a, b) =>
              Math.abs(a.x - candidate.edge.x) +
              Math.abs(a.y - candidate.edge.y) -
              (Math.abs(b.x - candidate.edge.x) + Math.abs(b.y - candidate.edge.y)),
          )[0];
        const edge = intoChild ?? candidate.edge;
        const width = clamp(edge.overlap * 0.55, 2.4, 3.2);
        openings.push({
          id: uid("op"),
          kind: "door",
          x: snap(edge.x, 0.5),
          y: snap(edge.y, 0.5),
          angle: edge.angle,
          width,
          swing: edge.swing,
        });
        placed.push({ x: edge.x, y: edge.y, angle: edge.angle });
        queue.push(candidate.room);
      }
    }
  }

  // Entry door on an exterior wall of the hallway (or living room for studios).
  const entry = rooms.find((r) => r.type === "hall") ?? rooms.find((r) => r.type === "living");
  if (entry) {
    const candidates: { x: number; y: number; angle: 0 | 90; swing: 1 | -1; len: number }[] = [];
    if (Math.abs(entry.y - 0) < 0.2) candidates.push({ x: entry.x + entry.w / 2, y: 0, angle: 0, swing: 1, len: entry.w });
    if (Math.abs(entry.y + entry.h - D) < 0.2)
      candidates.push({ x: entry.x + entry.w / 2, y: D, angle: 0, swing: -1, len: entry.w });
    if (Math.abs(entry.x - 0) < 0.2) candidates.push({ x: 0, y: entry.y + entry.h / 2, angle: 90, swing: 1, len: entry.h });
    if (Math.abs(entry.x + entry.w - W) < 0.2)
      candidates.push({ x: W, y: entry.y + entry.h / 2, angle: 90, swing: -1, len: entry.h });
    candidates.sort((a, b) => b.len - a.len);
    const spot = candidates[0];
    if (spot && spot.len >= 3 && !tooClose(spot.x, spot.y, spot.angle, 3.6)) {
      openings.push({
        id: uid("op"),
        kind: "door",
        x: snap(spot.x, 0.5),
        y: spot.y,
        angle: spot.angle,
        width: 3.2,
        swing: spot.swing,
      });
      placed.push({ x: spot.x, y: spot.y, angle: spot.angle });
    }
  }

  // Windows: one generous window on the longest exterior edge of daytime rooms.
  for (const room of rooms) {
    if (!["bedroom", "living", "kitchen", "dining", "study", "balcony"].includes(room.type)) continue;
    const edges: { x: number; y: number; angle: 0 | 90; len: number }[] = [];
    if (Math.abs(room.y - 0) < 0.2) edges.push({ x: room.x + room.w / 2, y: 0, angle: 0, len: room.w });
    if (Math.abs(room.y + room.h - D) < 0.2)
      edges.push({ x: room.x + room.w / 2, y: D, angle: 0, len: room.w });
    if (Math.abs(room.x - 0) < 0.2) edges.push({ x: 0, y: room.y + room.h / 2, angle: 90, len: room.h });
    if (Math.abs(room.x + room.w - W) < 0.2)
      edges.push({ x: W, y: room.y + room.h / 2, angle: 90, len: room.h });
    if (!edges.length) continue;
    edges.sort((a, b) => b.len - a.len);
    let edge: { x: number; y: number; angle: 0 | 90; len: number } | null = null;
    let width = 0;
    for (const candidateEdge of edges) {
      const candidateWidth = clamp(candidateEdge.len * 0.42, 3, 7);
      if (candidateEdge.len >= 4 && !tooClose(candidateEdge.x, candidateEdge.y, candidateEdge.angle, candidateWidth + 2)) {
        edge = candidateEdge;
        width = candidateWidth;
        break;
      }
    }
    if (!edge) continue;
    openings.push({
      id: uid("op"),
      kind: "window",
      x: snap(edge.x, 0.5),
      y: edge.y,
      angle: edge.angle,
      width,
      swing: 1,
    });
    placed.push({ x: edge.x, y: edge.y, angle: edge.angle });
  }

  return openings;
}

/* ------------------------------------------------------------------ */
/* Auto furnishing                                                     */
/* ------------------------------------------------------------------ */

export function autoFurnish(rooms: Room[]): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  const add = (
    type: FurnitureType,
    x: number,
    y: number,
    w: number,
    h: number,
    rot = 0,
  ) => {
    items.push({ id: uid("f"), type, x: snap(x, 0.25), y: snap(y, 0.25), w: snap(w, 0.25), h: snap(h, 0.25), rot });
  };

  for (const room of rooms) {
    const { x, y, w, h } = room;
    const inset = 0.45;
    const cx = x + w / 2;
    const cy = y + h / 2;

    if (room.type === "bedroom") {
      const bw = clamp(Math.min(6.4, w * 0.56), 4, 6.4);
      const bh = clamp(bw * 1.3, 5.5, 8);
      const bx = x + Math.max(inset, (w - bw) / 2 - (w > 13 ? 1.6 : 0));
      const by = y + Math.min(1.1, Math.max(inset, h * 0.12));
      add("bed", bx, by, bw, bh);
      add("nightstand", bx - 1.7, by + 0.15, 1.3, 1.3);
      add("nightstand", bx + bw + 0.35, by + 0.15, 1.3, 1.3);
      if (w > 11.5 && h > 8) add("wardrobe", x + w - 2.3, y + h - 3.2, 1.8, 2.7);
      if (w * h > 140) add("plant", x + w - 1.9, y + 0.8, 1.4, 1.4);
      if (w * h > 110) add("rug", bx - 1, by + bh + 0.1, bw + 2.4, Math.min(2.2, h - bh - 1.2));
    }

    if (room.type === "living") {
      if (w >= 14) {
        const sh = clamp(h * 0.5, 5.5, 7.5);
        add("sofa", x + inset, cy - sh / 2, 2.9, sh, 90);
        add("coffee-table", x + 4.6, cy - 1.5, 2.6, 3, 0);
        add("rug", x + 3.7, cy - Math.min(h * 0.34, 3.6), Math.min(6.4, w * 0.34), Math.min(h * 0.68, 7.2));
        add("tv", x + w - 2.1, cy - 2.4, 1.2, 4.8, 0);
        add("plant", x + w - 2, y + h - 2, 1.4, 1.4);
        add("plant", x + inset, y + inset, 1.5, 1.4);
        if (h > 13) add("chair", x + 4.9, y + h - 3.2, 2, 2);
      } else {
        add("sofa", cx - 3.4, y + h - 3.4, 6.8, 2.8);
        add("coffee-table", cx - 1.8, y + h - 6.5, 3.6, 2);
        add("tv", cx - 2.6, y + inset, 5.2, 1.3);
        add("rug", cx - 3.6, y + h - 8.2, 7.2, 4.2);
        add("plant", x + w - 1.9, y + inset, 1.4, 1.4);
      }
    }

    if (room.type === "kitchen") {
      const run = Math.max(2.5, w - inset * 2);
      add("counter", x + inset, y + inset, run, 2);
      add("sink", x + inset + Math.max(0.2, run * 0.08), y + inset + 0.25, Math.min(2.4, run * 0.3), 1.5);
      add("stove", x + inset + run - Math.min(2.8, run * 0.35), y + inset + 0.3, Math.min(2.2, run * 0.28), 1.7);
      if (h > 6.5) {
        add("fridge", x + w - 3.1, y + h - 3.3, 2.6, 2.6);
        if (w > 9) add("counter", x + inset, y + 3.6, 2, Math.min(4.2, h - 4.6));
      }
    }

    if (room.type === "dining") {
      const tw = clamp(Math.min(4.6, w * 0.52), 2.6, 4.6);
      const th = clamp(Math.min(2.8, h * 0.42), 1.8, 2.8);
      add("dining-table", cx - tw / 2, cy - th / 2 - 0.3, tw, th);
      add("chair", cx - tw / 2 + 0.35, cy - th / 2 - 1.85, 1.4, 1.4, 180);
      add("chair", cx + tw / 2 - 1.75, cy - th / 2 - 1.85, 1.4, 1.4, 180);
      add("chair", cx - tw / 2 + 0.35, cy + th / 2 + 0.45, 1.4, 1.4, 0);
      add("chair", cx + tw / 2 - 1.75, cy + th / 2 + 0.45, 1.4, 1.4, 0);
      if (w > 10) add("plant", x + w - 1.8, y + inset, 1.3, 1.3);
    }

    if (room.type === "bath") {
      if (w < 7 || h < 6) {
        add("shower", x + inset, y + inset, Math.min(2.6, w * 0.42), Math.min(2.6, h * 0.4));
        add("toilet", x + w - 2.1, y + inset + 0.1, 1.5, 2.1);
        add("vanity", x + w - 2.7, y + h - 2.1, 2.2, 1.6);
      } else {
        const tubW = clamp(Math.min(5, w * 0.62), 2.8, 5);
        add("bathtub", x + inset, y + inset, tubW, clamp(Math.min(2.7, h * 0.34), 2, 2.7));
        add("toilet", x + w - 2.3, y + inset + 0.1, 1.6, 2.2);
        add("vanity", x + w - 2.9, y + h - 2.2, 2.3, 1.7);
        if (w > 8.5 && h > 6.5) add("shower", x + inset, y + h - 3.2, 2.7, 2.7);
      }
    }

    if (room.type === "study") {
      add("desk", x + Math.max(inset, (w - 4.6) / 2), y + inset + 0.3, Math.min(4.6, w - 1), 1.9);
      add("chair", cx - 0.8, y + inset + 2.5, 1.6, 1.6, 180);
      if (h > 7.5) add("bookshelf", x + w - 1.9, y + h - 4.6, 1.4, Math.min(3.8, h * 0.45));
      add("plant", x + inset, y + h - 1.9, 1.3, 1.3);
    }

    if (room.type === "balcony") {
      add("balcony-chair", x + inset + 0.2, y + inset + 0.4, 2.1, 2.1, 15);
      add("balcony-chair", x + w - 2.9, y + inset + 0.4, 2.1, 2.1, -15);
      add("coffee-table", cx - 1, y + inset + 3, 2, 2);
      add("plant", x + inset, y + h - 2.1, 1.5, 1.5);
      add("plant", x + w - 2.1, y + h - 2.1, 1.5, 1.5);
      add("rug", cx - Math.min(3, w / 3), y + inset + 1.1, Math.min(6, w * 0.5), Math.min(3.4, h * 0.4));
    }

    if (room.type === "laundry") {
      add("washer", x + inset, y + inset, 2.2, 2.2);
      add("washer", x + inset + 2.6, y + inset, 2.2, 2.2);
      if (h > 6) add("counter", x + inset, y + h - 2.4, Math.min(4.4, w - 1), 1.9);
    }

    if (room.type === "hall") {
      add("rug", cx - 1.1, y + h * 0.18, 2.2, Math.min(7, h * 0.45));
      if (w > 4) add("plant", x + w - 1.6, y + h - 1.8, 1.2, 1.2);
    }

    if (room.type === "storage") {
      add("bookshelf", x + inset, y + inset, 1.4, Math.min(3.4, h - 1));
    }
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Wall derivation                                                     */
/* ------------------------------------------------------------------ */

export function computeWalls(plan: Plan): WallSegment[] {
  const map = new Map<string, WallSegment>();
  const W = plan.width;
  const D = plan.depth;

  const add = (x1: number, y1: number, x2: number, y2: number, manual: boolean, id?: string) => {
    let ax = x1;
    let ay = y1;
    let bx = x2;
    let by = y2;
    if (ax > bx || (ax === bx && ay > by)) {
      [ax, bx] = [bx, ax];
      [ay, by] = [by, ay];
    }
    if (Math.abs(ax - bx) < 0.05 && Math.abs(ay - by) < 0.05) return;
    const key = `${ax.toFixed(2)}|${ay.toFixed(2)}|${bx.toFixed(2)}|${by.toFixed(2)}`;
    const exterior =
      (Math.abs(ay - by) < 0.1 && (ay < 0.25 || ay > D - 0.25)) ||
      (Math.abs(ax - bx) < 0.1 && (ax < 0.25 || ax > W - 0.25));
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { id: id ?? key, x1: ax, y1: ay, x2: bx, y2: by, exterior, manual });
    } else if (manual) {
      existing.manual = true;
      existing.id = id ?? existing.id;
    }
  };

  // manual walls first so they keep their identity
  for (const wall of plan.extraWalls) add(wall.x1, wall.y1, wall.x2, wall.y2, true, wall.id);

  for (const room of plan.rooms) {
    add(room.x, room.y, room.x + room.w, room.y, false);
    add(room.x, room.y + room.h, room.x + room.w, room.y + room.h, false);
    add(room.x, room.y, room.x, room.y + room.h, false);
    add(room.x + room.w, room.y, room.x + room.w, room.y + room.h, false);
  }

  return Array.from(map.values());
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

export interface PlanSummary {
  area: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  wallLength: number;
  cost: number;
}

export function summarize(plan: Plan, walls?: WallSegment[]): PlanSummary {
  const segments = walls ?? computeWalls(plan);
  const area = plan.rooms.reduce((sum, r) => sum + roomArea(r), 0);
  const wallLength = segments.reduce(
    (sum, w) => sum + Math.hypot(w.x2 - w.x1, w.y2 - w.y1),
    0,
  );
  return {
    area,
    rooms: plan.rooms.length,
    bedrooms: plan.rooms.filter((r) => r.type === "bedroom").length,
    bathrooms: plan.rooms.filter((r) => r.type === "bath").length,
    wallLength,
    cost: Math.round((area * 165) / 1000) * 1000,
  };
}

export const FURNITURE_META: Record<
  FurnitureType,
  { label: string; w: number; h: number }
> = {
  bed: { label: "Bed", w: 5.4, h: 6.8 },
  nightstand: { label: "Nightstand", w: 1.3, h: 1.3 },
  wardrobe: { label: "Wardrobe", w: 1.8, h: 3.4 },
  sofa: { label: "Sofa", w: 7, h: 2.9 },
  "coffee-table": { label: "Coffee table", w: 3.4, h: 2 },
  rug: { label: "Rug", w: 6.5, h: 4.5 },
  tv: { label: "TV unit", w: 1.2, h: 4.4 },
  plant: { label: "Plant", w: 1.4, h: 1.4 },
  "dining-table": { label: "Dining table", w: 4.4, h: 2.7 },
  chair: { label: "Chair", w: 1.5, h: 1.5 },
  counter: { label: "Counter run", w: 6, h: 2 },
  sink: { label: "Sink", w: 2.2, h: 1.5 },
  stove: { label: "Cooktop", w: 2.2, h: 1.7 },
  fridge: { label: "Fridge", w: 2.5, h: 2.5 },
  toilet: { label: "Toilet", w: 1.6, h: 2.2 },
  bathtub: { label: "Bathtub", w: 4.8, h: 2.5 },
  vanity: { label: "Vanity", w: 2.4, h: 1.7 },
  shower: { label: "Shower", w: 2.8, h: 2.8 },
  desk: { label: "Desk", w: 4.4, h: 1.9 },
  bookshelf: { label: "Shelving", w: 1.4, h: 3.4 },
  "balcony-chair": { label: "Lounge chair", w: 2, h: 2 },
  washer: { label: "Washer", w: 2.2, h: 2.2 },
  stairs: { label: "Staircase", w: 3.2, h: 6 },
};

export const FURNITURE_GROUPS: { title: string; items: FurnitureType[] }[] = [
  { title: "Seating", items: ["sofa", "chair", "balcony-chair"] },
  { title: "Bedroom", items: ["bed", "nightstand", "wardrobe"] },
  { title: "Tables", items: ["dining-table", "coffee-table", "desk"] },
  { title: "Kitchen & bath", items: ["counter", "sink", "stove", "fridge", "toilet", "bathtub", "vanity", "shower", "washer"] },
  { title: "Decor & circulation", items: ["rug", "plant", "bookshelf", "tv", "stairs"] },
];

export function getDefaultPlan(): Plan {
  return generatePlan(DEFAULT_OPTIONS);
}

export function nextRoomName(rooms: Room[]): string {
  return `Room ${rooms.length + 1}`;
}

export function allFurnitureLabel(plan: Plan): string {
  return `${plan.furniture.length} objects · ${Math.round(plan.rooms.reduce((s, r) => s + r.w * r.h, 0))} sq ft`;
}

/* ------------------------------------------------------------------ */
/* Plan files (save from Studio, upload into a listing)                */
/* ------------------------------------------------------------------ */

const num = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Validates and normalizes an uploaded Draftline plan file. Throws a readable error. */
export function parsePlanFile(data: unknown): Plan {
  const source = (data as { plan?: unknown } | null)?.plan ?? data;
  const raw = source as Partial<Plan> | null;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.rooms)) {
    throw new Error("This is not a Draftline plan file. Save one from Studio → Export → Plan file.");
  }
  if (!num(raw.width) || !num(raw.depth) || raw.width <= 0 || raw.depth <= 0) {
    throw new Error("The plan file has no valid width and depth.");
  }
  const rooms: Room[] = raw.rooms
    .filter((room) => room && num(room.x) && num(room.y) && num(room.w) && num(room.h) && room.w > 0 && room.h > 0)
    .map((room) => ({
      ...room,
      id: typeof room.id === "string" && room.id ? room.id : uid("room"),
      name: typeof room.name === "string" && room.name ? room.name : "Room",
      type: room.type in ROOM_LABEL ? room.type : "living",
      floor: num(room.floor) ? room.floor : 0,
    }));
  if (!rooms.length) throw new Error("The plan file does not contain any rooms.");
  const onFloor = <T extends { floor?: number }>(items: T[] | undefined) =>
    (Array.isArray(items) ? items : []).map((item) => ({ ...item, floor: num(item.floor) ? item.floor : 0 }));
  return {
    name: typeof raw.name === "string" && raw.name ? raw.name : "Uploaded plan",
    floorNames: Array.isArray(raw.floorNames) && raw.floorNames.length ? raw.floorNames.map(String) : undefined,
    width: raw.width,
    depth: raw.depth,
    rooms,
    extraWalls: onFloor(raw.extraWalls).filter((wall) => num(wall.x1) && num(wall.y1) && num(wall.x2) && num(wall.y2)),
    openings: onFloor(raw.openings).filter((opening) => num(opening.x) && num(opening.y) && num(opening.width)),
    furniture: onFloor(raw.furniture).filter((item) => item.type in FURNITURE_META && num(item.x) && num(item.y) && num(item.w) && num(item.h)),
  };
}

/** Splits a multi-floor plan into one plan per non-empty floor. */
export function splitFloors(plan: Plan): { name: string; plan: Plan }[] {
  const names = plan.floorNames?.length ? plan.floorNames : ["Level 01"];
  const highest = Math.max(0, ...plan.rooms.map((room) => room.floor ?? 0));
  const count = Math.max(names.length, highest + 1);
  return Array.from({ length: count }, (_, floor) => ({
    name: names[floor] ?? `Level ${String(floor + 1).padStart(2, "0")}`,
    plan: {
      ...plan,
      rooms: plan.rooms.filter((item) => (item.floor ?? 0) === floor),
      extraWalls: plan.extraWalls.filter((item) => (item.floor ?? 0) === floor),
      openings: plan.openings.filter((item) => (item.floor ?? 0) === floor),
      furniture: plan.furniture.filter((item) => (item.floor ?? 0) === floor),
    },
  })).filter((floor) => floor.plan.rooms.length > 0);
}
