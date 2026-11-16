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

export interface RentalHub {
  vehicle: string;
  pickup: string;
  dailyRate: number;
  rtoVerified: boolean;
  returnPolicy: string;
}

export interface DayTransitOption {
  mode: "car" | "bike" | "scooty" | "bus" | "train" | "flight";
  title: string;
  badge: string;
  details: string;
  estimatedFare?: string;
  rentalHub?: RentalHub;
}

export interface DayTransit {
  backpacker: DayTransitOption;
  comfort: DayTransitOption;
  luxury: DayTransitOption;
}

export interface ExpeditionDay {
  dayNumber: number;
  fromLocation: string;
  toLocation: string;
  distanceKm: number;
  driveTime: string;
  highlights: string[];
  founderTips: string;
  transit?: DayTransit;
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
      transit: {
        backpacker: {
          mode: "train",
          title: "Overnight Sleeper Train + Forest Bus",
          badge: "🚆 Sleeper Train to Hubballi (₹380) + 🚌 KSRTC to Dandeli (₹85)",
          details: "Board the 9:15 PM Ranichennamma Express from KSR Bengaluru to Hubballi. From Hubballi Old Bus Stand, take a direct KSRTC bus through the teak canopy into Dandeli.",
          estimatedFare: "₹465 total",
        },
        comfort: {
          mode: "car",
          title: "NH48 Expressway Self-Drive",
          badge: "🚗 NH48 6-Lane Expressway (via Davanagere) • 7.5 hrs",
          details: "Cruising speed 80-90 km/h. Fuel stop at Davanagere for Benne Dosa. Fastag tolls approx ₹340. Road from Hubli bypass to Dandeli is smooth 2-lane forest tarmac.",
          estimatedFare: "Fuel ~₹3,200 + Fastag ₹340",
        },
        luxury: {
          mode: "flight",
          title: "Direct Flight + Private Chauffeur SUV",
          badge: "✈️ IndiGo Flight to Hubballi (1h 10m) + 🚙 Chauffeur Crysta Transfer",
          details: "Fly BLR ➔ HBX. Chauffeur meets you at arrivals terminal with chilled water and luggage assist. 1.5 hr private transfer through Kali tiger reserve buffer zone.",
          estimatedFare: "Flight ₹3,800 + Cab ₹2,400",
        },
      },
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
      transit: {
        backpacker: {
          mode: "bus",
          title: "Anshi Ghat Forest Bus / Shared Trax",
          badge: "🚌 KSRTC Ghat Bus to Honnavar ➔ Connect to Murudeshwar (₹140 • 4 hrs)",
          details: "Board morning 8:00 AM KSRTC red bus from Dandeli depot. Winds down the lush Anshi Ghat. Get down at Honnavar circle and hop on any coastal express to Murudeshwar.",
          estimatedFare: "₹140 total",
        },
        comfort: {
          mode: "car",
          title: "Scenic Anshi Wildlife Sanctuary Drive",
          badge: "🚗 Anshi Ghat Jungle Pass ➔ NH66 Coast • 4 hrs",
          details: "One of the greenest driving stretches in South India. Watch for elephant corridors and morning mist. Smooth descent into coastal NH66.",
          estimatedFare: "Fuel ~₹1,100",
        },
        luxury: {
          mode: "car",
          title: "Private Chauffeur Mountain Drive",
          badge: "🚙 Private Chauffeur Innova Crysta via Mirjan Fort",
          details: "Chauffeured mountain transit with dedicated photo stops at Sharavathi river valley viewpoint and the historic 16th-century Mirjan Fort.",
          estimatedFare: "Chauffeur inclusive",
        },
      },
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
      transit: {
        backpacker: {
          mode: "scooty",
          title: "Coastal Scenic Train + Gokarna Scooty Hub",
          badge: "🚆 Coastal Express Train (1 hr • ₹45) ➔ 🛵 Gokarna Scooty Hub (₹350/day)",
          details: "Take the 10:30 AM coastal passenger train from Murudeshwar to Gokarna Road. Catch a ₹30 shared auto to Gokarna bus stand where your pre-booked StayNth Activa is fueled and ready.",
          estimatedFare: "Train ₹45 + Scooty ₹350/day",
          rentalHub: {
            vehicle: "Honda Activa 6G (Commercial Yellow-on-Black Plate)",
            pickup: "Partner Counter #2, Opposite Gokarna KSRTC Bus Stand",
            dailyRate: 350,
            rtoVerified: true,
            returnPolicy: "Must return to the same bus stand counter before your departure night bus.",
          },
        },
        comfort: {
          mode: "car",
          title: "Coastal Highway NH66 Beach Hop",
          badge: "🚗 Coastal NH66 Highway • 1.5 hrs Drive",
          details: "Short, relaxing drive. Park your vehicle at the dedicated Kudle Hilltop paid parking lot (₹100/day) as beach trails are pedestrian-only.",
          estimatedFare: "Fuel ~₹600 + Parking ₹100",
        },
        luxury: {
          mode: "car",
          title: "Chauffeur Direct Drop at Clifftop Villa",
          badge: "🚙 Private Chauffeur Direct to Om Beach Cliff",
          details: "Your driver drops you directly at the private cliffside gate of the luxury villa and coordinates luggage transfer to your suite.",
          estimatedFare: "Chauffeur inclusive",
        },
      },
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
      transit: {
        backpacker: {
          mode: "bus",
          title: "Scooty Return + KSRTC Airavat Sleeper",
          badge: "🛵 Return Activa at Bus Stand ➔ 🚌 Airavat Club Class Sleeper (₹780)",
          details: "Drop off your rented Activa back at Counter #2 by 7:30 PM. Grab dinner at Pai Restaurant and board the overnight KSRTC Airavat AC Sleeper directly to Bengaluru Majestic.",
          estimatedFare: "Bus ₹780",
        },
        comfort: {
          mode: "car",
          title: "Return Highway Drive via Yana Rocks",
          badge: "🚗 Scenic Return via Yana Caves & Sirsi ➔ NH48 (8.5 hrs)",
          details: "Take the 25 km interior detour to Yana limestone rock monoliths. Grab hot lunch at Sirsi before merging onto the 6-lane NH48 highway back to Bengaluru.",
          estimatedFare: "Fuel ~₹3,400 + Fastag ₹340",
        },
        luxury: {
          mode: "flight",
          title: "Airport Transfer + Flight to Bengaluru",
          badge: "🚙 2.5 hr Transfer to Goa Dabolim (GOI) ➔ ✈️ 1 hr Flight to BLR",
          details: "Relaxed breakfast by the Arabian Sea. Chauffeur transfers you north along the scenic coastal road to Goa Dabolim Airport for an evening 1-hour flight to Bengaluru.",
          estimatedFare: "Cab ₹3,200 + Flight ₹4,200",
        },
      },
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
          photo: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80",
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
    if (!Array.isArray(parsed) || parsed.length === 0) return [SAMPLE_EXPEDITION];
    return parsed.map((e: Expedition) => (e.id === SAMPLE_EXPEDITION.id && !e.days[0]?.transit ? SAMPLE_EXPEDITION : e));
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
