import type { Plan } from "@/types";
import { generatePlan, uid } from "@/lib/plan";
import { getStoredToken } from "@/lib/auth";

export type PropertyType =
  | "apartment"
  | "flat"
  | "house"
  | "hostel"
  | "hotel"
  | "dormitory"
  | "pg"
  | "studio"
  | "villa"
  | "bungalow"
  | "duplex"
  | "penthouse"
  | "serviced-apartment"
  | "guesthouse"
  | "homestay"
  | "cottage"
  | "cabin"
  | "farmhouse"
  | "townhouse";
export type ListingMode = "stay" | "rent" | "sale";

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  apartment: "Apartment",
  flat: "Flat",
  house: "House",
  hostel: "Hostel",
  hotel: "Hotel",
  dormitory: "Dormitory",
  pg: "PG / Co-living",
  studio: "Studio",
  villa: "Villa",
  bungalow: "Bungalow",
  duplex: "Duplex",
  penthouse: "Penthouse",
  "serviced-apartment": "Serviced apartment",
  guesthouse: "Guest house",
  homestay: "Homestay",
  cottage: "Cottage",
  cabin: "Cabin",
  farmhouse: "Farmhouse",
  townhouse: "Townhouse",
};
export type PriceUnit = "night" | "month" | "total";

export interface PropertyPhoto {
  url: string;
  alt: string;
}

export interface RoomInventory {
  id: string;
  name: string;
  kind: "room" | "bed" | "dorm";
  capacity: number;
  price: number;
  available: number;
}

export interface PropertyReview {
  id: string;
  author: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface PropertyReport {
  id: string;
  reason: string;
  details: string;
  createdAt: string;
}

export interface PropertyListing {
  id: string;
  title: string;
  type: PropertyType;
  mode: ListingMode;
  location: string;
  price: number;
  priceUnit: PriceUnit;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  area: number;
  description: string;
  amenities: string[];
  photos: PropertyPhoto[];
  plan: Plan;
  ownerName: string;
  ownerId?: string;
  mine: boolean;
  verification?: "unverified" | "pending" | "verified";
  latitude?: number;
  longitude?: number;
  inventory?: RoomInventory[];
  reviewsList?: PropertyReview[];
  reports?: PropertyReport[];
  floorPlans?: { name: string; plan: Plan }[];
  published: boolean;
  featured: boolean;
  rating: number;
  reviews: number;
  createdAt: string;
}

export interface PropertyRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  kind: "booking" | "viewing";
  guestName: string;
  email: string;
  startDate: string;
  endDate: string;
  guests: number;
  message: string;
  total: number;
  inventoryId?: string;
  status: "pending" | "approved" | "declined";
  createdAt: string;
}

export const AMENITY_OPTIONS = [
  "Wifi",
  "Parking",
  "Air conditioning",
  "Kitchen",
  "Washer",
  "Balcony",
  "Garden",
  "Workspace",
  "Gym",
  "Pet friendly",
];

const photo = (id: number, alt: string): PropertyPhoto => ({
  url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=850&w=1400`,
  alt,
});

export function formatPrice(listing: PropertyListing) {
  const value = `$${listing.price.toLocaleString()}`;
  if (listing.priceUnit === "night") return `${value} / night${listing.type === "hostel" ? " · per bed" : ""}`;
  if (listing.priceUnit === "month") return `${value} / month`;
  return value;
}

function listing(
  data: Omit<PropertyListing, "id" | "createdAt" | "plan" | "area"> & {
    id: string;
    createdAt: string;
    plan: Plan;
  },
): PropertyListing {
  const coordinates: Record<string, [number, number]> = {
    "riverside-loft": [12.9719, 77.6412],
    "courtyard-house": [12.9698, 77.75],
    "northstar-hostel": [9.9667, 76.2425],
    "maple-apartment": [12.9116, 77.6473],
    "garden-studio": [15.5926, 73.7865],
    "lakeview-residence": [29.322, 79.589],
    "harbor-hotel": [15.2993, 74.124],
    "central-dorm": [12.9352, 77.6245],
  };
  return {
    ...data,
    verification: data.verification ?? (data.mine ? "unverified" : "verified"),
    latitude: data.latitude ?? coordinates[data.id]?.[0],
    longitude: data.longitude ?? coordinates[data.id]?.[1],
    area: Math.round(data.plan.rooms.reduce((sum, room) => sum + room.w * room.h, 0)),
  };
}

export function createSeedListings(): PropertyListing[] {
  return [
    listing({
      id: "riverside-loft",
      title: "Riverside Courtyard Loft",
      type: "apartment",
      mode: "stay",
      location: "Indiranagar, Bengaluru",
      price: 128,
      priceUnit: "night",
      bedrooms: 2,
      bathrooms: 2,
      beds: 3,
      description:
        "A calm, light-filled apartment arranged around a generous living space. Walk through the actual floor plan in 3D, check the room proportions, and explore the balcony before requesting a stay.",
      amenities: ["Wifi", "Kitchen", "Washer", "Balcony", "Workspace", "Air conditioning"],
      photos: [
        photo(12029115, "Contemporary apartment building with glass balconies"),
        photo(7836571, "Bright living room with plants and comfortable seating"),
        photo(7587809, "Warm modern bedroom with wooden cabinetry"),
      ],
      plan: generatePlan({ bedrooms: 2, bathrooms: 2, width: 44, depth: 32, furnished: true }, "Riverside Courtyard Loft"),
      ownerName: "You",
      mine: true,
      published: true,
      featured: true,
      rating: 4.92,
      reviews: 38,
      createdAt: "2026-01-12T10:00:00.000Z",
    }),
    listing({
      id: "courtyard-house",
      title: "The Courtyard House",
      type: "house",
      mode: "sale",
      location: "Whitefield, Bengaluru",
      price: 485000,
      priceUnit: "total",
      bedrooms: 4,
      bathrooms: 2,
      beds: 5,
      description:
        "A modern family residence with panoramic glazing, a private lawn, and four well-separated bedrooms. The interactive model lets buyers understand circulation and room sizes before scheduling a viewing.",
      amenities: ["Parking", "Garden", "Balcony", "Kitchen", "Workspace", "Pet friendly"],
      photos: [
        photo(7031604, "Modern courtyard house with glass walls and a green lawn"),
        photo(7614608, "Spacious contemporary living room"),
        photo(8134756, "Bright kitchen with a central island"),
      ],
      plan: generatePlan({ bedrooms: 4, bathrooms: 2, width: 60, depth: 42, furnished: true }, "The Courtyard House"),
      ownerName: "Courtyard Estates",
      mine: false,
      published: true,
      featured: true,
      rating: 4.88,
      reviews: 17,
      createdAt: "2026-01-08T10:00:00.000Z",
    }),
    listing({
      id: "northstar-hostel",
      title: "Northstar Travelers Hostel",
      type: "hostel",
      mode: "stay",
      location: "Fort Kochi, Kochi",
      price: 24,
      priceUnit: "night",
      bedrooms: 4,
      bathrooms: 2,
      beds: 12,
      description:
        "A friendly hostel with shared social space, private rooms, and easy access to the neighborhood. Preview the common areas and room layout in 3D before choosing your bed.",
      amenities: ["Wifi", "Kitchen", "Washer", "Workspace", "Air conditioning"],
      photos: [
        photo(5137980, "Clean and comfortable hostel dorm with bunk beds"),
        photo(7166927, "Warm contemporary hallway with wooden doors"),
        photo(6283972, "Shared kitchen and dining space"),
      ],
      plan: generatePlan({ bedrooms: 4, bathrooms: 2, width: 60, depth: 42, furnished: true }, "Northstar Travelers Hostel"),
      ownerName: "Northstar Stays",
      mine: false,
      published: true,
      featured: false,
      rating: 4.81,
      reviews: 126,
      createdAt: "2025-12-21T10:00:00.000Z",
    }),
    listing({
      id: "maple-apartment",
      title: "Maple Family Apartment",
      type: "apartment",
      mode: "rent",
      location: "HSR Layout, Bengaluru",
      price: 2400,
      priceUnit: "month",
      bedrooms: 3,
      bathrooms: 2,
      beds: 4,
      description:
        "A practical three-bedroom home with a dedicated study, a large living room, and a sunny balcony. Designed for long-term living with storage and a clear separation between private and social spaces.",
      amenities: ["Parking", "Wifi", "Gym", "Balcony", "Washer", "Pet friendly"],
      photos: [
        photo(27459248, "Modern apartment facade with glass balconies"),
        photo(11408618, "Airy living room with tall windows"),
        photo(6265942, "Dedicated home study with bookshelves"),
      ],
      plan: generatePlan({ bedrooms: 3, bathrooms: 2, width: 52, depth: 38, furnished: true }, "Maple Family Apartment"),
      ownerName: "Maple Homes",
      mine: false,
      published: true,
      featured: false,
      rating: 4.76,
      reviews: 22,
      createdAt: "2025-12-18T10:00:00.000Z",
    }),
    listing({
      id: "garden-studio",
      title: "Garden Gate Studio",
      type: "studio",
      mode: "stay",
      location: "Assagao, Goa",
      price: 86,
      priceUnit: "night",
      bedrooms: 1,
      bathrooms: 1,
      beds: 2,
      description:
        "A compact studio retreat surrounded by greenery, with an open living and dining zone, a full kitchen, and a quiet bedroom. Ideal for slow weekends and longer creative stays.",
      amenities: ["Garden", "Wifi", "Kitchen", "Workspace", "Parking"],
      photos: [
        photo(39618716, "Charming modern house surrounded by lush greenery"),
        photo(6487953, "Soft contemporary bedroom beside a window"),
        photo(7534285, "Furnished outdoor sitting area"),
      ],
      plan: generatePlan({ bedrooms: 1, bathrooms: 1, width: 32, depth: 26, furnished: true }, "Garden Gate Studio"),
      ownerName: "Garden Gate",
      mine: false,
      published: true,
      featured: false,
      rating: 4.95,
      reviews: 64,
      createdAt: "2025-11-29T10:00:00.000Z",
    }),
    listing({
      id: "lakeview-residence",
      title: "Lakeview Modern Residence",
      type: "house",
      mode: "sale",
      location: "Naukuchiatal, Uttarakhand",
      price: 720000,
      priceUnit: "total",
      bedrooms: 3,
      bathrooms: 2,
      beds: 4,
      description:
        "A refined modern home with landscaped surroundings and generous shared spaces. Review the full residence in 3D, including bedroom placement, window positions, and the relationship between indoor and outdoor areas.",
      amenities: ["Garden", "Parking", "Balcony", "Kitchen", "Workspace"],
      photos: [
        photo(7746940, "Contemporary homes with landscaped gardens"),
        photo(7167061, "High-end contemporary kitchen"),
        photo(7534282, "Minimalist bathroom with a glass shower"),
      ],
      plan: generatePlan({ bedrooms: 3, bathrooms: 2, width: 52, depth: 38, furnished: true }, "Lakeview Modern Residence"),
      ownerName: "Lakeview Realty",
      mine: false,
      published: true,
      featured: true,
      rating: 4.9,
      reviews: 11,
      createdAt: "2025-11-14T10:00:00.000Z",
    }),
    listing({
      id: "harbor-hotel",
      title: "Harbor House Hotel",
      type: "hotel",
      mode: "stay",
      location: "Panaji, Goa",
      price: 210,
      priceUnit: "night",
      bedrooms: 4,
      bathrooms: 2,
      beds: 8,
      description:
        "A small contemporary hotel with bookable room categories, bright shared spaces, and a complete 3D floor preview. Compare deluxe rooms and suites before sending a booking request.",
      amenities: ["Wifi", "Air conditioning", "Kitchen", "Parking", "Workspace"],
      inventory: [
        { id: "harbor-deluxe", name: "Deluxe King Room", kind: "room", capacity: 2, price: 210, available: 6 },
        { id: "harbor-suite", name: "Courtyard Suite", kind: "room", capacity: 3, price: 340, available: 2 },
      ],
      photos: [
        photo(19807688, "Contemporary residential and hotel facade with balconies"),
        photo(7587809, "Warm modern guest room with wooden cabinetry"),
        photo(7046002, "Contemporary hotel dining room"),
      ],
      plan: generatePlan({ bedrooms: 4, bathrooms: 2, width: 60, depth: 42, furnished: true }, "Harbor House Hotel"),
      ownerName: "Harbor House Hospitality",
      mine: false,
      published: true,
      featured: true,
      rating: 4.86,
      reviews: 89,
      createdAt: "2026-01-16T10:00:00.000Z",
    }),
    listing({
      id: "central-dorm",
      title: "Central Quarter Dormitory",
      type: "dormitory",
      mode: "stay",
      location: "Koramangala, Bengaluru",
      price: 18,
      priceUnit: "night",
      bedrooms: 4,
      bathrooms: 2,
      beds: 16,
      description:
        "A practical dormitory with bookable shared and private options, study space, laundry, and social areas. Inspect the layout in 3D before selecting a bed or room category.",
      amenities: ["Wifi", "Washer", "Workspace", "Kitchen", "Air conditioning"],
      inventory: [
        { id: "central-8bed", name: "8-bed shared dorm", kind: "dorm", capacity: 8, price: 18, available: 12 },
        { id: "central-private", name: "Private twin room", kind: "room", capacity: 2, price: 55, available: 3 },
      ],
      photos: [
        photo(5137980, "Comfortable shared dormitory with bunk beds"),
        photo(6265942, "Study and workspace with bookshelves"),
        photo(17158638, "Laundry room with modern appliances"),
      ],
      plan: generatePlan({ bedrooms: 4, bathrooms: 2, width: 60, depth: 42, furnished: true }, "Central Quarter Dormitory"),
      ownerName: "Central Quarter Stays",
      mine: false,
      published: true,
      featured: false,
      rating: 4.72,
      reviews: 54,
      createdAt: "2026-01-14T10:00:00.000Z",
    }),
  ];
}

const LISTINGS_KEY = "draftline.properties.v1";
const REQUESTS_KEY = "draftline.property-requests.v1";
const MY_LISTINGS_KEY = "draftline.my-listing-ids.v1";

export function getMyListingIds(): Set<string> {
  try {
    const raw = localStorage.getItem(MY_LISTINGS_KEY);
    return new Set(raw ? JSON.parse(raw) : ["riverside-loft"]);
  } catch {
    return new Set(["riverside-loft"]);
  }
}

export function addMyListingId(id: string) {
  try {
    const set = getMyListingIds();
    set.add(id);
    localStorage.setItem(MY_LISTINGS_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export function loadListings(): PropertyListing[] {
  try {
    const myIds = getMyListingIds();
    const raw = localStorage.getItem(LISTINGS_KEY);
    if (!raw) return createSeedListings().map((item) => ({ ...item, mine: myIds.has(item.id) }));
    const data = JSON.parse(raw) as PropertyListing[];
    if (!Array.isArray(data) || !data.length || !data[0]?.plan?.rooms) {
      return createSeedListings().map((item) => ({ ...item, mine: myIds.has(item.id) }));
    }
    const seeds = createSeedListings();
    const existing = new Set(data.map((item) => item.id));
    const merged = [...data, ...seeds.filter((item) => !existing.has(item.id))];
    return merged.map((item) => ({ ...item, mine: myIds.has(item.id) }));
  } catch {
    return createSeedListings();
  }
}

export function saveListings(listings: PropertyListing[]) {
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

export function loadRequests(): PropertyRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as PropertyRequest[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveRequests(requests: PropertyRequest[]) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

export function newRequestId() {
  return uid("request").toUpperCase();
}

// Cloudflare D1 Remote Database Sync
export async function fetchRemoteListings(): Promise<PropertyListing[] | null> {
  try {
    const res = await fetch("/api/properties?all=true");
    if (!res.ok) return null;
    const remote = (await res.json()) as PropertyListing[];
    if (!Array.isArray(remote)) return null;
    const myIds = getMyListingIds();
    return remote.map((item) => ({
      ...item,
      mine: myIds.has(item.id) || item.mine,
    }));
  } catch {
    return null;
  }
}

export async function saveRemoteListing(listing: PropertyListing): Promise<boolean> {
  try {
    addMyListingId(listing.id);
    const token = getStoredToken();
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(listing),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteRemoteListing(id: string): Promise<boolean> {
  try {
    const token = getStoredToken();
    const res = await fetch(`/api/properties/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function patchRemoteListing(id: string, patch: { published?: boolean; verification?: string }): Promise<boolean> {
  try {
    const token = getStoredToken();
    const res = await fetch(`/api/properties/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchRemoteRequests(): Promise<PropertyRequest[] | null> {
  try {
    const res = await fetch("/api/requests");
    if (!res.ok) return null;
    const remote = (await res.json()) as PropertyRequest[];
    return Array.isArray(remote) ? remote : null;
  } catch {
    return null;
  }
}

export async function saveRemoteRequest(request: PropertyRequest): Promise<boolean> {
  try {
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function patchRemoteRequest(id: string, status: PropertyRequest["status"]): Promise<boolean> {
  try {
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

