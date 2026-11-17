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

export interface TimedMilestone {
  id: string;
  timeSlot: string; // e.g. "10:30 AM – 11:30 AM"
  startHour: number; // 24-hr format (0-23)
  startMinute: number; // 0-59
  endHour: number; // 24-hr format (0-23)
  endMinute: number; // 0-59
  title: string; // e.g. "Yana Caves Trek & Giant Monoliths"
  activity: string; // Actionable details
  founderTip?: string; // Practical tip
  departureAlert: string; // Alert notification text when time to move to next spot
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
  schedule?: TimedMilestone[];
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
          propertyId: "northstar-hostel",
          features: ["Waterproof Safari Tent", "Riverside Campfire", "Free Kayak Paddle"],
        },
        comfort: {
          name: "Dandeli Rainforest Nature Cottages",
          type: "cottage",
          pricePerNight: 2800,
          photo: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
          propertyId: "courtyard-house",
          features: ["AC Wooden Cottage", "Jungle Trek Guide", "Buffet Meals Included"],
        },
        luxury: {
          name: "The Hornbill Private Pool Villa",
          type: "villa",
          pricePerNight: 8900,
          photo: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
          propertyId: "riverside-loft",
          features: ["Private Plunge Pool", "Riverview Balcony Deck", "Custom Wilderness Safari"],
        },
      },
      schedule: [
        {
          id: "d1_m1",
          timeSlot: "05:30 AM – 06:00 AM",
          startHour: 5,
          startMinute: 30,
          endHour: 6,
          endMinute: 0,
          title: "Departure from Bengaluru (NH48 Toll Expressway)",
          activity: "Start before 5:30 AM to beat Nelamangala toll gridlock. Set cruise control on 6-lane NH48.",
          founderTip: "Keep Fastag topped up with at least ₹500 before starting.",
          departureAlert: "Depart Bengaluru now! Leaving before 6:00 AM avoids 45 minutes of Nelamangala traffic.",
        },
        {
          id: "d1_m2",
          timeSlot: "08:30 AM – 09:30 AM",
          startHour: 8,
          startMinute: 30,
          endHour: 9,
          endMinute: 30,
          title: "Davanagere Benne Dosa Breakfast Pitstop",
          activity: "Exit highway at Davanagere for wood-fired crispy Benne Dosa and authentic filter coffee at Guru Kottureshwara.",
          founderTip: "Order the open butter masala dosa with coconut chutney and spiced potato mash.",
          departureAlert: "Breakfast pitstop time elapsed. Rejoin NH48 towards Hubballi bypass.",
        },
        {
          id: "d1_m3",
          timeSlot: "10:00 AM – 01:15 PM",
          startHour: 10,
          startMinute: 0,
          endHour: 13,
          endMinute: 15,
          title: "Hubballi Bypass into Dense Teak Forest Canopy",
          activity: "Turn off NH48 at Hubli bypass onto the Haliyal-Dandeli forest highway. Teak canopy drops ambient temperature by 4°C.",
          founderTip: "Watch for Malabar Pied Hornbills and spotted deer near the Kulgi nature camp stretch.",
          departureAlert: "Entering Dandeli township. Prepare for riverside camp check-in.",
        },
        {
          id: "d1_m4",
          timeSlot: "01:30 PM – 03:00 PM",
          startHour: 13,
          startMinute: 30,
          endHour: 15,
          endMinute: 0,
          title: "Riverside Check-in & Malenadu Jungle Thali Lunch",
          activity: "Check into partner stay, freshen up, and enjoy traditional North Karnataka jowar roti and fresh local curry.",
          founderTip: "Change into synthetic quick-dry gear and water shoes for rafting.",
          departureAlert: "Rafting instructor briefing starting at Kali river launch pad. Head to the river bank.",
        },
        {
          id: "d1_m5",
          timeSlot: "03:30 PM – 05:30 PM",
          startHour: 15,
          startMinute: 30,
          endHour: 17,
          endMinute: 30,
          title: "Kali River White-Water Rafting & Supa Dam Rapids",
          activity: "Grade 3 rapids on the gushing Kali river. 9 km stretch with experienced local boatman guide.",
          founderTip: "Wear your life jacket tight. Waterproof action cameras are permitted on helmet mounts.",
          departureAlert: "Rafting session wrapped up. Return to camp for warm shower and tea.",
        },
        {
          id: "d1_m6",
          timeSlot: "06:30 PM – 09:30 PM",
          startHour: 18,
          startMinute: 30,
          endHour: 21,
          endMinute: 30,
          title: "Campfire, Stargazing & Acoustic Jungle Night",
          activity: "Bonfire along the Kali river bank under crystal-clear jungle skies with roasted corn and music.",
          founderTip: "Zero light pollution here—great opportunity to shoot Milky Way long-exposure photos.",
          departureAlert: "Rest up early tonight! Tomorrow morning brings the dramatic Anshi Ghat fog descent.",
        },
      ],
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
          propertyId: "northstar-hostel",
          features: ["2 Min Walk to Shore", "Backpacker Travelers Cafe", "Surf Board Rental"],
        },
        comfort: {
          name: "Ocean Cliff Heritage Resort",
          type: "resort",
          pricePerNight: 2950,
          photo: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
          propertyId: "maple-apartment",
          features: ["Sea-Facing Balcony", "Direct Temple View", "Fresh Coastal Dining"],
        },
        luxury: {
          name: "The Royal Arab Sea Suite",
          type: "resort",
          pricePerNight: 9500,
          photo: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80",
          propertyId: "courtyard-house",
          features: ["Panoramic Glass Suite", "Private Sunset Cabana", "Infinity Sea Pool"],
        },
      },
      schedule: [
        {
          id: "d2_m1",
          timeSlot: "07:00 AM – 08:15 AM",
          startHour: 7,
          startMinute: 0,
          endHour: 8,
          endMinute: 15,
          title: "Supa Backwaters Sunrise & Hornbill Bird Watching",
          activity: "Early morning walk along the Supa reservoir backwaters. Misty water reflections and chirping bird canopy.",
          founderTip: "Carry a 200mm+ telephoto lens or binoculars if you're into wildlife photography.",
          departureAlert: "Begin packing bags. Check out by 8:30 AM to beat Ghat transport traffic.",
        },
        {
          id: "d2_m2",
          timeSlot: "08:30 AM – 12:00 PM",
          startHour: 8,
          startMinute: 30,
          endHour: 12,
          endMinute: 0,
          title: "Anshi Ghat Mountain Pass Descent (Zero-Network Zone)",
          activity: "Drive through the heart of Kali Tiger Reserve down the hairpin curves of Anshi Ghat into the Konkan coast.",
          founderTip: "Shift into low gear on hairpins. Cellular network drops completely for ~45 km in this valley.",
          departureAlert: "Anshi Ghat descent completed. Arriving at the foothills near Honnavar/Mirjan.",
        },
        {
          id: "d2_m3",
          timeSlot: "12:30 PM – 01:45 PM",
          startHour: 12,
          startMinute: 30,
          endHour: 13,
          endMinute: 45,
          title: "16th-Century Mirjan Laterite Fort Exploration",
          activity: "Explore the moss-covered laterite battlements and secret escape tunnels built by Queen Chennabhairadevi.",
          founderTip: "Wear flat gripping sneakers; the laterite stone steps can be slippery.",
          departureAlert: "Time to head to Murudeshwar. 35-min coastal highway cruise ahead.",
        },
        {
          id: "d2_m4",
          timeSlot: "02:15 PM – 04:00 PM",
          startHour: 14,
          startMinute: 15,
          endHour: 16,
          endMinute: 0,
          title: "Murudeshwar Coastal Check-in & Fresh Sea Lunch",
          activity: "Check into ocean-facing partner stay, unpack, and savor coastal Mangalorean fish curry with neer dosa.",
          founderTip: "Ask for freshly caught anjal (kingfish) rava fry at the sea-facing verandah.",
          departureAlert: "Sun is softening. Head to the Kanduka Giri cliff temple for panoramic sunset.",
        },
        {
          id: "d2_m5",
          timeSlot: "04:30 PM – 07:00 PM",
          startHour: 16,
          startMinute: 30,
          endHour: 19,
          endMinute: 0,
          title: "Murudeshwar Giant Shiva Cliff & Sunset Over Arabian Sea",
          activity: "Witness the 123-ft monolithic Shiva statue overlooking the 360° ocean cliff as the sun sets over the water.",
          founderTip: "Take the internal elevator to the top of the 20-story Raja Gopura for breathtaking aerial views.",
          departureAlert: "Sunset complete. Head down to the bustling temple promenade.",
        },
        {
          id: "d2_m6",
          timeSlot: "07:30 PM – 09:30 PM",
          startHour: 19,
          startMinute: 30,
          endHour: 21,
          endMinute: 30,
          title: "Coastal Temple Street Walk & Kingfish Rava Fry Dinner",
          activity: "Stroll along the lively bazaar selling seashell handicrafts, followed by a seaside dinner listening to ocean waves.",
          founderTip: "Try the hot Badam milk and coastal sweets from the local sweet stalls.",
          departureAlert: "Head back to your room to recharge. Tomorrow is Gokarna beach day!",
        },
      ],
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
          propertyId: "northstar-hostel",
          features: ["Steps to Sand", "Hammocks Under Palms", "Acoustic Night Vibes"],
        },
        comfort: {
          name: "Gokarna Heritage Kokum Cottages",
          type: "cottage",
          pricePerNight: 3200,
          photo: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=600&q=80",
          propertyId: "courtyard-house",
          features: ["Laterite Stone Cottage", "Organic Garden Cafe", "Ayurvedic Massage"],
        },
        luxury: {
          name: "Om Beach Cliff Luxury Villa",
          type: "villa",
          pricePerNight: 10800,
          photo: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80",
          propertyId: "riverside-loft",
          features: ["Private Ocean Cliff Deck", "Sunset Dining Pavilion", "Personal Concierge"],
        },
      },
      schedule: [
        {
          id: "d3_m1",
          timeSlot: "08:00 AM – 09:30 AM",
          startHour: 8,
          startMinute: 0,
          endHour: 9,
          endMinute: 30,
          title: "Coastal NH66 Drive / Express Train to Gokarna Road",
          activity: "Cruising along the picturesque coastline crossing Sharavathi and Aghanashini river estuaries.",
          founderTip: "NH66 has newly paved four-lane bridges with ocean views on the left and Western Ghats on the right.",
          departureAlert: "Arriving in Gokarna. Head to StayNth Mobility Hub at Bus Stand Counter #2.",
        },
        {
          id: "d3_m2",
          timeSlot: "09:30 AM – 10:15 AM",
          startHour: 9,
          startMinute: 30,
          endHour: 10,
          endMinute: 15,
          title: "StayNth Mobility Hub: Black-Plate Activa 6G Pickup",
          activity: "Show your StayNth Priority Pass code at Counter #2 opposite KSRTC bus stand. Quick 2-min key handover.",
          founderTip: "Check tyre pressure and fuel indicator before pulling out. Store helmets under the seat.",
          departureAlert: "Scooter secured! Ride up to Kudle hilltop partner stay for check-in.",
        },
        {
          id: "d3_m3",
          timeSlot: "10:30 AM – 01:00 PM",
          startHour: 10,
          startMinute: 30,
          endHour: 13,
          endMinute: 0,
          title: "Check-in at Kudle Hilltop & Coconut Water Welcome",
          activity: "Drop bags at your partner beach cottage/dorm, sip chilled tender coconut, and relax on the hammock.",
          founderTip: "Apply SPF 50 sunscreen before stepping onto the beaches.",
          departureAlert: "Afternoon sun is mellowing. Time to start the Om to Half Moon coastal cliff trek.",
        },
        {
          id: "d3_m4",
          timeSlot: "02:30 PM – 05:00 PM",
          startHour: 14,
          startMinute: 30,
          endHour: 17,
          endMinute: 0,
          title: "Om Beach to Half Moon & Paradise Beach Cliff Trek",
          activity: "Hike along the red laterite ocean bluffs connecting Om Beach, Half Moon Beach, and secluded Paradise Beach.",
          founderTip: "Carry 1 liter of drinking water per person and cash—beach shacks have spotty UPI signals.",
          departureAlert: "Hike back towards Om Beach main shore for golden hour and drum circles.",
        },
        {
          id: "d3_m5",
          timeSlot: "05:30 PM – 07:30 PM",
          startHour: 17,
          startMinute: 30,
          endHour: 19,
          endMinute: 30,
          title: "Om Beach Golden Hour Drum Circle & Beach Shacks",
          activity: "Gather with acoustic travelers from around the world as acoustic jams and djembe drumming welcome twilight.",
          founderTip: "Namaste Cafe banana nutella pancakes and fresh lemon iced tea are legendary here.",
          departureAlert: "Twilight fading. Ride back to Kudle hilltop for dinner.",
        },
        {
          id: "d3_m6",
          timeSlot: "08:00 PM – 10:00 PM",
          startHour: 20,
          startMinute: 0,
          endHour: 22,
          endMinute: 0,
          title: "Kudle Beach Starlight Acoustic Dinner & Sea Waves",
          activity: "Candlelit dinner right on the sand with the sound of breaking waves under starlit skies.",
          founderTip: "Order wood-fired pizza or prawn ghee roast.",
          departureAlert: "Great night! Tomorrow we trek the prehistoric Yana limestone caves on the return leg.",
        },
      ],
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
      schedule: [
        {
          id: "d4_m1",
          timeSlot: "07:30 AM – 08:45 AM",
          startHour: 7,
          startMinute: 30,
          endHour: 8,
          endMinute: 45,
          title: "Breakfast at Pai Refreshments & Scooter Return at Bus Stand",
          activity: "Enjoy hot Mangalore buns and filter coffee in temple town, then drop off your scooter at Counter #2.",
          founderTip: "Counter #2 staff does an instant deposit release / return slip in 60 seconds.",
          departureAlert: "Scooter handed over safely. Depart Gokarna towards Sahyadri evergreen forests.",
        },
        {
          id: "d4_m2",
          timeSlot: "09:00 AM – 10:15 AM",
          startHour: 9,
          startMinute: 0,
          endHour: 10,
          endMinute: 15,
          title: "Scenic Forest Drive into Dense Sahyadri Forest Base",
          activity: "Winding state highway 69 into the dense evergreen moist forest buffer of Uttara Kannada.",
          founderTip: "Keep windows down to breathe the rich wet petrichor and eucalyptus aromas.",
          departureAlert: "Arrived at Yana Forest Gate parking. Lace up trekking shoes for the cave trail.",
        },
        {
          id: "d4_m3",
          timeSlot: "10:30 AM – 12:00 PM",
          startHour: 10,
          startMinute: 30,
          endHour: 12,
          endMinute: 0,
          title: "Yana Monolithic Limestone Cave Trek (Bhairaveshwara Shikhara)",
          activity: "Hike the 1.5 km stone trail into the prehistoric 120-meter solid black crystalline limestone rock towers.",
          founderTip: "Enter the cool cave interior beneath the stalactite canopy. Bats and natural spring water drip here.",
          departureAlert: "🔔 TIME TO MOVE TO NEXT DESTINATION! Wrap up cave exploration and head back to your vehicle to reach Sirsi for lunch before 1:30 PM.",
        },
        {
          id: "d4_m4",
          timeSlot: "12:30 PM – 02:00 PM",
          startHour: 12,
          startMinute: 30,
          endHour: 14,
          endMinute: 0,
          title: "Sirsi Spice Plantations & Authentic Traditional Lunch",
          activity: "Pitstop in the Malenadu spice capital of Sirsi for freshly grounded cardamom, black pepper, and lunch.",
          founderTip: "Pick up organic whole spices and local honey directly from farmer cooperatives along the road.",
          departureAlert: "Rejoin NH48 via Haveri for the 6-lane express cruise back to Bengaluru.",
        },
        {
          id: "d4_m5",
          timeSlot: "02:30 PM – 06:30 PM",
          startHour: 14,
          startMinute: 30,
          endHour: 18,
          endMinute: 30,
          title: "NH48 6-Lane Expressway Return Cruise (Haveri ➔ Chitradurga)",
          activity: "Smooth highway cruising past Chitradurga windmill hills and sunflower fields.",
          founderTip: "Tea break near Chitradurga bypass; quick fuel fill if needed.",
          departureAlert: "Final 150 km stretch into Bengaluru.",
        },
        {
          id: "d4_m6",
          timeSlot: "07:00 PM – 09:30 PM",
          startHour: 19,
          startMinute: 0,
          endHour: 21,
          endMinute: 30,
          title: "Tumakuru Toll & Arrival Back in Bengaluru",
          activity: "Cross Tumkur toll plaza and enter Bengaluru city via Elevated Highway.",
          founderTip: "Trip completed! Unpack, sync trip photos, and log your memories.",
          departureAlert: "Circuit Complete! Welcome home from an unforgettable Karnataka road expedition.",
        },
      ],
    },
  ],
};

export function loadLocalExpeditions(): Expedition[] {
  try {
    const raw = localStorage.getItem(EXPEDITIONS_STORAGE_KEY);
    if (!raw) return [SAMPLE_EXPEDITION];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [SAMPLE_EXPEDITION];
    return parsed.map((e: Expedition) => (e.id === SAMPLE_EXPEDITION.id && (!e.days[0]?.transit || !e.days[0]?.schedule) ? SAMPLE_EXPEDITION : e));
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
