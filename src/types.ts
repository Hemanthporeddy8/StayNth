export type RoomType =
  | "living"
  | "bedroom"
  | "kitchen"
  | "dining"
  | "bath"
  | "hall"
  | "balcony"
  | "study"
  | "storage"
  | "laundry";

export interface RoomImage {
  id: string;
  /** Compressed data URL, stored locally with the plan */
  url: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  x: number;
  y: number;
  w: number;
  h: number;
  /** undefined = visible, false = this room has no eye marker */
  photoMarker?: boolean;
  /** Optional custom eye position, normalized within the room (0–1) */
  photoMarkerX?: number;
  photoMarkerY?: number;
  panorama?: RoomImage;
  images?: RoomImage[];
  floor?: number;
}

export interface Wall {
  id: string;
  floor?: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type OpeningKind = "door" | "window";

export interface Opening {
  id: string;
  floor?: number;
  kind: OpeningKind;
  /** center of the opening, in feet */
  x: number;
  y: number;
  /** 0 = horizontal wall (runs along x), 90 = vertical wall (runs along y) */
  angle: 0 | 90;
  width: number;
  /** +1 / -1 : which side of the wall the door swings toward */
  swing: 1 | -1;
}

export type FurnitureType =
  | "bed"
  | "nightstand"
  | "wardrobe"
  | "sofa"
  | "coffee-table"
  | "rug"
  | "tv"
  | "plant"
  | "dining-table"
  | "chair"
  | "counter"
  | "sink"
  | "stove"
  | "fridge"
  | "toilet"
  | "bathtub"
  | "vanity"
  | "shower"
  | "desk"
  | "bookshelf"
  | "balcony-chair"
  | "washer"
  | "stairs";

export interface FurnitureItem {
  id: string;
  floor?: number;
  type: FurnitureType;
  /** top-left in feet */
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
}

export interface Plan {
  name: string;
  floorNames?: string[];
  width: number;
  depth: number;
  rooms: Room[];
  extraWalls: Wall[];
  openings: Opening[];
  furniture: FurnitureItem[];
}

export type Selection =
  | { kind: "room"; id: string }
  | { kind: "wall"; id: string }
  | { kind: "opening"; id: string }
  | { kind: "furniture"; id: string }
  | null;

export type Tool =
  | "select"
  | "pan"
  | "wall"
  | "room"
  | "door"
  | "window"
  | "furniture"
  | "eye"
  | "erase";

export type ViewMode = "plan" | "inside" | "3d";

export interface DisplaySettings {
  grid: boolean;
  dimensions: boolean;
  furniture: boolean;
  labels: boolean;
  photos: boolean;
}

export interface GenerateOptions {
  bedrooms: 1 | 2 | 3 | 4;
  bathrooms: 1 | 2;
  width: number;
  depth: number;
  furnished: boolean;
}

export interface WallSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  exterior: boolean;
  manual: boolean;
}
