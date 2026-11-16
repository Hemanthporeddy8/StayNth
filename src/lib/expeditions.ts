export type BudgetTier = "backpacker" | "comfort" | "luxury";

export interface ExpeditionStay {
  id?: string;
  name: string;
  type: "tent" | "hostel" | "homestay" | "resort" | "cottage" | "villa";
  pricePerNight: number;
  photo: string;
  propertyId?: string; // Optional link to StayNth property with 3D floor plan
  features: string[];
}

export interface ExpeditionDay {
  dayNumber: number;
  fromLocation: string;
  toLocation: string;
  distanceKm: number;
  driveTime: string;
  highlights: string[];
  founderTips: string;
  stays: {
    backpacker: ExpeditionStay;
    comfort: ExpeditionStay;
    luxury: ExpeditionStay;
  };
}

export interface Expedition {
  id: string;
  title: string;
  subtitle: string;
  region: string;
  season: string;
  vehicleType: string;
  youtubeUrl: string;
  coverPhoto: string;
  days: ExpeditionDay[];
  published: boolean;
  createdAt: string;
}

const EXPEDITIONS_STORAGE_KEY = "staynth.expeditions.v1";

export const SAMPLE_EXPEDITION: Expedition = {
  id: "exp_coastal_karnataka",
  title: "4-Day Coastal Karnataka & Rainforest Circuit",
  subtitle: "Curated & Scouted by Founder: Dandeli Jungle ➔ Murudeshwar Coast ➔ Gokarna Beaches",
  region: "Western Ghats & Coastal Karnataka",
  season: "October to March",
  vehicleType: "Bike / Car / SUV",
  youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  coverPhoto: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  published: true,
  createdAt: new Date().toISOString(),
  days: [
    {
      dayNumber: 1,
      fromLocation: "Bengaluru",
      toLocation: "Dandeli (Kali River)",
      distanceKm: 460,
      driveTime: "8.5 hrs",
      highlights: ["Kali White-Water Rafting", "Supa Dam Backwaters", "Teak Canopy Forest Drive"],
      founderTips:
        "Leave Bengaluru before 5:30 AM via NH48. Quick breakfast pitstop at Davanagere for authentic Benne Dosa. Road from Hubli to Dandeli winds through dense teak canopy — watch for hornbills!",
      stays: {
        backpacker: {
          name: "Kali Riverside Safari Tents",
          type: "tent",
          pricePerNight: 799,
          photo: "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=600&q=80",
          features: ["Waterproof Safari Tent", "Riverside Campfire", "Free Kayak Paddle"],
        },
        comfort: {
          name: "Dandeli Rainforest Nature Cottages",
          type: "cottage",
          pricePerNight: 2800,
          photo: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
          features: ["AC Wooden Cottage", "Jungle Trek Guide", "Buffet Meals Included"],
        },
        luxury: {
          name: "The Hornbill Private Pool Villa",
          type: "villa",
          pricePerNight: 8900,
          photo: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
          features: ["Private Plunge Pool", "Riverview Balcony Deck", "Custom Wilderness Safari"],
        },
      },
    },
    {
      dayNumber: 2,
      fromLocation: "Dandeli",
      toLocation: "Murudeshwar Cliff",
      distanceKm: 165,
      driveTime: "4 hrs",
      highlights: ["Anshi Ghat Fog Descent", "Sharavathi Valley View", "Arabian Sea Cliff Temple"],
      founderTips:
        "Descend through Anshi Ghats slowly; roads can have early morning fog. Stop at Mirjan Fort before driving directly onto the Murudeshwar coastal cliff for breathtaking sea views.",
      stays: {
        backpacker: {
          name: "Beachside Travelers Dorm & Shacks",
          type: "hostel",
          pricePerNight: 650,
          photo: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80",
          features: ["2 Min Walk to Shore", "Backpacker Travelers Cafe", "Surf Board Rental"],
        },
        comfort: {
          name: "Ocean Cliff Heritage Resort",
          type: "resort",
          pricePerNight: 2950,
          photo: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
          features: ["Sea-Facing Balcony", "Direct Temple View", "Fresh Coastal Dining"],
        },
        luxury: {
          name: "The Royal Arab Sea Suite",
          type: "resort",
          pricePerNight: 9500,
          photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80",
          features: ["Panoramic Glass Suite", "Private Sunset Cabana", "Infinity Sea Pool"],
        },
      },
    },
    {
      dayNumber: 3,
      fromLocation: "Murudeshwar",
      toLocation: "Gokarna (Om Beach)",
      distanceKm: 80,
      driveTime: "2 hrs",
      highlights: ["Om Beach Sunset", "Kudle Beach Drum Circles", "Half Moon Cliff Trail"],
      founderTips:
        "Short, relaxing drive along coastal NH66. Park near Kudle hilltop and hike down to Om Beach for sunset drum circles and beach shacks. Carry cash for beach shacks.",
      stays: {
        backpacker: {
          name: "Kudle Beach Shacks & Camping",
          type: "tent",
          pricePerNight: 850,
          photo: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=600&q=80",
          features: ["Steps to Sand", "Hammocks Under Palms", "Acoustic Night Vibes"],
        },
        comfort: {
          name: "Gokarna Heritage Kokum Cottages",
          type: "cottage",
          pricePerNight: 3200,
          photo: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=600&q=80",
          features: ["Laterite Stone Cottage", "Organic Garden Cafe", "Ayurvedic Massage"],
        },
        luxury: {
          name: "Om Beach Cliff Luxury Villa",
          type: "villa",
          pricePerNight: 10800,
          photo: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80",
          features: ["Private Ocean Cliff Deck", "Sunset Dining Pavilion", "Personal Concierge"],
        },
      },
    },
    {
      dayNumber: 4,
      fromLocation: "Gokarna",
      toLocation: "Bengaluru (via Yana)",
      distanceKm: 490,
      driveTime: "9 hrs",
      highlights: ["Yana Monolithic Giant Rocks", "Dense Evergreen Trek", "Sirsi Spices"],
      founderTips:
        "Take the 25 km detour via Yana monolithic limestone rocks inside the dense evergreen forest before joining NH48 back to the city. Carry good trekking shoes for the cave trail.",
      stays: {
        backpacker: {
          name: "Circuit Completion (Return Journey)",
          type: "homestay",
          pricePerNight: 0,
          photo: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
          features: ["Safe Return Drive", "Yana Cave Trek", "Unforgettable Memories"],
        },
        comfort: {
          name: "Circuit Completion (Return Journey)",
          type: "resort",
          pricePerNight: 0,
          photo: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
          features: ["Safe Return Drive", "Yana Cave Trek", "Unforgettable Memories"],
        },
        luxury: {
          name: "Circuit Completion (Return Journey)",
          type: "villa",
          pricePerNight: 0,
          photo: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
          features: ["Safe Return Drive", "Yana Cave Trek", "Unforgettable Memories"],
        },
      },
    },
  ],
};

export function loadLocalExpeditions(): Expedition[] {
  try {
    const raw = localStorage.getItem(EXPEDITIONS_STORAGE_KEY);
    if (!raw) return [SAMPLE_EXPEDITION];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [SAMPLE_EXPEDITION];
  } catch {
    return [SAMPLE_EXPEDITION];
  }
}

export function saveLocalExpeditions(expeditions: Expedition[]): void {
  try {
    localStorage.setItem(EXPEDITIONS_STORAGE_KEY, JSON.stringify(expeditions));
  } catch {
    // ignore
  }
}

export async function fetchRemoteExpeditions(): Promise<Expedition[] | null> {
  try {
    const res = await fetch("/api/expeditions");
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      saveLocalExpeditions(data);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveRemoteExpedition(exp: Expedition, token?: string | null): Promise<boolean> {
  try {
    const res = await fetch("/api/expeditions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(exp),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteRemoteExpedition(id: string, token?: string | null): Promise<boolean> {
  try {
    const res = await fetch(`/api/expeditions/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}
