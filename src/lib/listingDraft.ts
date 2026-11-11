import type { Plan } from "@/types";
import type { ListingMode, PropertyPhoto, PropertyType, RoomInventory } from "@/lib/properties";

/** A half-filled listing form, kept in memory while the owner visits Studio. */
export interface ListingDraft {
  title: string;
  type: PropertyType;
  mode: ListingMode;
  location: string;
  price: number;
  beds: number;
  latitude: string;
  longitude: string;
  inventory: RoomInventory[];
  description: string;
  amenities: string[];
  photos: PropertyPhoto[];
  bedrooms: 1 | 2 | 3 | 4;
  bathrooms: 1 | 2;
  width: number;
  depth: number;
}

let draft: ListingDraft | null = null;
let backupPlan: Plan | null = null;

export const peekDraft = () => draft;
export const saveDraft = (value: ListingDraft) => { draft = value; };
export const clearDraft = () => { draft = null; };
export const peekBackupPlan = () => backupPlan;
export const saveBackupPlan = (plan: Plan | null) => { backupPlan = plan; };
