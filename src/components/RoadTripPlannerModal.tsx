import { useState, useMemo } from "react";
import {
  Compass,
  MapPin,
  Car,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Box,
  UploadCloud,
  Camera,
} from "lucide-react";
import type { PropertyListing, PropertyRequest } from "@/lib/properties";
import { newRequestId } from "@/lib/properties";
import { cn } from "@/utils/cn";

interface TripStop {
  id: string;
  city: string;
  nights: number;
  selectedPropertyId?: string;
}

export function RoadTripPlannerModal({
  isOpen,
  onClose,
  listings,
  onRequestBooking,
}: {
  isOpen: boolean;
  onClose: () => void;
  listings: PropertyListing[];
  onRequestBooking: (request: PropertyRequest) => void;
}) {
  const [stops, setStops] = useState<TripStop[]>([
    { id: "stop-1", city: "Dandeli", nights: 1 },
    { id: "stop-2", city: "Murudeshwar", nights: 1 },
    { id: "stop-3", city: "Gokarna", nights: 1 },
  ]);

  const [transportMode, setTransportMode] = useState<"car" | "bike" | "bus">("car");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(2);
  const [fastTrack, setFastTrack] = useState(true);
  const [idFileName, setIdFileName] = useState("");
  const [idFileUrl, setIdFileUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [step, setStep] = useState<"plan" | "payment" | "confirmed">("plan");
  const [error, setError] = useState<string | null>(null);

  // New custom city input
  const [newCity, setNewCity] = useState("");

  if (!isOpen) return null;

  // Add stop
  const handleAddStop = () => {
    if (!newCity.trim()) return;
    const next: TripStop = {
      id: "stop-" + Date.now(),
      city: newCity.trim(),
      nights: 1,
    };
    setStops([...stops, next]);
    setNewCity("");
  };

  const handleRemoveStop = (id: string) => {
    if (stops.length <= 1) return;
    setStops(stops.filter((s) => s.id !== id));
  };

  const handleSelectPropertyForStop = (stopId: string, propertyId: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, selectedPropertyId: propertyId } : s)),
    );
  };

  // Speed & distance heuristics for Western Ghats / Coastal Karnataka roads
  const speed = transportMode === "car" ? 55 : transportMode === "bike" ? 45 : 40;
  const estimatedKm = stops.length * 85;
  const totalDriveHours = (estimatedKm / speed).toFixed(1);
  const totalNights = stops.reduce((sum, s) => sum + s.nights, 0);

  // Auto-match hotels for each stop based on city name or verified seed properties
  const stopMatches = useMemo(() => {
    return stops.map((stop) => {
      const q = stop.city.toLowerCase().trim();
      const direct = listings.filter((item) =>
        item.location.toLowerCase().includes(q) || item.title.toLowerCase().includes(q),
      );
      // Fallback to top verified stays if location has no direct listings yet
      const fallback = direct.length > 0 ? direct : listings.slice(0, 3);
      const chosen = fallback.find((p) => p.id === stop.selectedPropertyId) || fallback[0];
      return {
        stop,
        available: fallback,
        chosen,
      };
    });
  }, [stops, listings]);

  const totalRoomTariff = stopMatches.reduce((sum, m) => {
    const price = m.chosen?.price || 1800;
    return sum + price * m.stop.nights;
  }, 0);

  const platformFeePerStop = 49;
  const totalPlatformFee = stops.length * platformFeePerStop;

  const handleIdUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setIdFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setIdFileUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSelfieUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSelfieUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const proceedToPayment = () => {
    setError(null);
    if (!guestName.trim() || !email.includes("@")) {
      setError("Please provide your name and a valid email address.");
      return;
    }
    if (!startDate) {
      setError("Please select your trip departure date.");
      return;
    }
    setStep("payment");
  };

  const confirmTripBooking = () => {
    setError(null);
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setError("Please enter the 12-digit UPI UTR / Transaction ID from your payment receipt.");
      return;
    }

    // Book each stop into requests with shared Fast-Track KYC
    let curDate = new Date(startDate);
    stopMatches.forEach((m, idx) => {
      const checkIn = curDate.toISOString().split("T")[0];
      curDate.setDate(curDate.getDate() + m.stop.nights);
      const checkOut = curDate.toISOString().split("T")[0];

      const req: PropertyRequest = {
        id: newRequestId(),
        propertyId: m.chosen?.id || "road-trip-stay-" + idx,
        propertyTitle: `${m.chosen?.title || m.stop.city + " Verified Stay"} (Stop ${idx + 1}: ${m.stop.city})`,
        kind: "booking",
        guestName: guestName.trim(),
        email: email.trim(),
        startDate: checkIn,
        endDate: checkOut,
        guests,
        message: `Multi-Stop Road Trip: Stop ${idx + 1} of ${stops.length} (${m.stop.city}). Transport: ${transportMode.toUpperCase()}.${phone ? ` Contact: ${phone}` : ""}`,
        total: (m.chosen?.price || 1800) * m.stop.nights,
        platformFee: platformFeePerStop,
        payAtHotel: (m.chosen?.price || 1800) * m.stop.nights,
        paymentUtr: cleanUtr,
        fastTrackVerified: fastTrack && !!idFileUrl,
        idPhotoUrl: idFileUrl || undefined,
        selfieUrl: selfieUrl || undefined,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      onRequestBooking(req);
    });

    setStep("confirmed");
  };

  const upiId = "staynth@upi";
  const upiLink = `upi://pay?pa=${upiId}&pn=StayNth%20RoadTrip&am=${totalPlatformFee}&cu=INR&tn=Multi-Stop%20Booking`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;

  return (
    <div className="animate-fade fixed inset-0 z-[90] flex items-center justify-center bg-ink/70 p-3 backdrop-blur-sm sm:p-5">
      <div className="animate-pop flex max-h-[95dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-[20px] text-ink">Multi-Stop Road Trip Planner</h2>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-white">
                  Connecting Stays
                </span>
              </div>
              <p className="text-[11px] text-ink-soft">
                Plan mixed destination trips, simulate driving times, and lock all hotel stops with 1-click Fast-Track check-in.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-faint hover:bg-paper-deep hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="scroll-warm min-h-0 flex-1 overflow-y-auto p-5">
          {step === "plan" && (
            <div className="space-y-5">
              {/* Trip Controls */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-line bg-white p-3">
                  <label className="block font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                    Departure Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-[12px] text-ink outline-none"
                  />
                </div>

                <div className="rounded-xl border border-line bg-white p-3">
                  <label className="block font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                    Mode of Transport
                  </label>
                  <div className="mt-1 flex rounded-lg border border-line p-0.5">
                    {(["car", "bike", "bus"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTransportMode(m)}
                        className={cn(
                          "flex-1 rounded-md py-1 text-[11px] font-medium capitalize transition",
                          transportMode === m ? "bg-ink text-white" : "text-ink-soft hover:text-ink",
                        )}
                      >
                        {m === "car" ? "🚗 Car" : m === "bike" ? "🏍️ Bike" : "🚌 Bus"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-white p-3">
                  <label className="block font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                    Travelers / Guests
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-lg border border-line px-2 text-[12px] text-ink outline-none"
                  />
                </div>
              </div>

              {/* Route Summary Simulation Card */}
              <div className="rounded-2xl border border-accent/30 bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-xs">
                      <Car className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[13px] font-bold text-ink">
                        {stops.map((s) => s.city).join(" ➔ ")}
                      </span>
                      <p className="text-[11px] text-ink-soft">
                        Estimated {estimatedKm} km · ~{totalDriveHours} hours total road time · {totalNights} nights
                      </p>
                    </div>
                  </div>

                  {/* Add extra city input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="+ Add next city..."
                      className="h-8 w-36 rounded-lg border border-line bg-white px-2.5 text-[11px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddStop}
                      className="flex h-8 items-center gap-1 rounded-lg bg-ink px-2.5 text-[11px] font-medium text-white"
                    >
                      <Plus className="h-3 w-3" /> Add Stop
                    </button>
                  </div>
                </div>
              </div>

              {/* Day-by-Day Hotel Stops */}
              <div className="space-y-3">
                <h3 className="font-serif text-[17px] text-ink">Itinerary Stays (Day-by-Day)</h3>

                <div className="space-y-3">
                  {stopMatches.map((m, idx) => (
                    <div
                      key={m.stop.id}
                      className="rounded-xl border border-line bg-white p-3.5 shadow-xs"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                              {idx + 1}
                            </span>
                            <span className="font-serif text-[15px] font-bold text-ink">
                              Stop {idx + 1}: {m.stop.city}
                            </span>
                            <span className="rounded bg-paper px-2 py-0.5 font-mono text-[9px] text-ink-soft">
                              Night {idx + 1} · {m.stop.nights} night
                            </span>
                            {stops.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveStop(m.stop.id)}
                                className="ml-auto text-ink-faint hover:text-red-600 sm:ml-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {/* Selected Property Preview */}
                          {m.chosen && (
                            <div className="mt-3 flex items-center gap-3 rounded-xl border border-line-soft bg-paper/60 p-2.5">
                              {m.chosen.photos?.[0] ? (
                                <img
                                  src={m.chosen.photos[0].url}
                                  alt={m.chosen.title}
                                  className="h-16 w-24 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-paper-deep text-ink-faint">
                                  <Box className="h-5 w-5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="truncate text-[13px] font-semibold text-ink">
                                  {m.chosen.title}
                                </h4>
                                <p className="flex items-center gap-1 text-[10.5px] text-ink-soft">
                                  <MapPin className="h-3 w-3 text-accent" /> {m.chosen.location}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-[10px] text-ink-faint">
                                  <span>{m.chosen.bedrooms} BHK</span>
                                  <span>•</span>
                                  <span className="font-semibold text-ink">
                                    ₹{m.chosen.price.toLocaleString()} / night
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Alternative stays dropdown if multiple exist */}
                          {m.available.length > 1 && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[10px] text-ink-faint">Switch stay:</span>
                              <select
                                value={m.chosen?.id}
                                onChange={(e) => handleSelectPropertyForStop(m.stop.id, e.target.value)}
                                className="h-7 rounded-md border border-line bg-white px-2 text-[10px] text-ink"
                              >
                                {m.available.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.title} (₹{p.price}/night)
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 text-right sm:pt-2">
                          <span className="text-[10px] text-ink-faint">Room Tariff:</span>
                          <p className="text-[14px] font-bold text-ink">
                            ₹{((m.chosen?.price || 1800) * m.stop.nights).toLocaleString()}
                          </p>
                          <span className="text-[9px] text-ink-faint">Payable at hotel reception</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guest Details & Shared Fast-Track KYC */}
              <div className="rounded-xl border border-line bg-white p-4 space-y-3">
                <h3 className="font-serif text-[16px] text-ink">Guest & Check-In Details</h3>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                      Primary Traveler Name *
                    </label>
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="mt-1 h-9 w-full rounded-lg border border-line px-2.5 text-[12px] text-ink outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ramesh@example.com"
                      className="mt-1 h-9 w-full rounded-lg border border-line px-2.5 text-[12px] text-ink outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                      Mobile Number (10 digits)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="mt-1 h-9 w-full rounded-lg border border-line px-2.5 text-[12px] text-ink outline-none"
                    />
                  </div>
                </div>

                {/* Shared Fast-Track Card */}
                <div className="mt-2 rounded-xl border border-accent/25 bg-orange-50/30 p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fastTrack}
                      onChange={(e) => setFastTrack(e.target.checked)}
                      className="mt-0.5 rounded accent-accent"
                    />
                    <div>
                      <span className="font-semibold text-ink text-[11.5px] flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4 text-accent" /> ⚡ 1-Click Fast-Track Check-In for ALL {stops.length} Stops
                      </span>
                      <p className="text-[10px] text-ink-soft">
                        Upload your Govt ID & selfie once. All {stops.length} hotel receptions receive your verified clearance before you arrive.
                      </p>
                    </div>
                  </label>

                  {fastTrack && (
                    <div className="mt-3 grid gap-2 border-t border-accent/20 pt-2.5 sm:grid-cols-2 text-[10.5px]">
                      <div>
                        <span className="block font-medium text-ink mb-1">1. Govt ID (Aadhaar / DL / Passport)</span>
                        <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-ink-soft cursor-pointer hover:bg-paper">
                          <UploadCloud className="h-4 w-4 text-accent" />
                          <span className="truncate">{idFileName || "Upload Photo or PDF"}</span>
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleIdUpload(e.target.files)} />
                        </label>
                      </div>
                      <div>
                        <span className="block font-medium text-ink mb-1">2. Quick Live Face Selfie</span>
                        <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-ink-soft cursor-pointer hover:bg-paper">
                          <Camera className="h-4 w-4 text-accent" />
                          <span>{selfieUrl ? "Selfie captured ✓" : "Snap or upload selfie"}</span>
                          <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleSelfieUpload(e.target.files)} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Breakdown Footer */}
              <div className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2 text-[12px] text-ink-soft">
                      <span>Total Room Tariffs ({totalNights} nights):</span>
                      <strong className="text-ink">₹{totalRoomTariff.toLocaleString()}</strong>
                      <span className="text-[10px] text-ink-faint">(Pay at each hotel)</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-accent">
                      <Sparkles className="h-3.5 w-3.5" /> StayNth Booking & Route Lock Fee:
                      <span className="text-[15px] font-bold">₹{totalPlatformFee}</span>
                      <span className="text-[10px] font-normal text-ink-soft">(₹49 × {stops.length} stops)</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={proceedToPayment}
                    className="rounded-xl bg-accent px-5 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-accent/90"
                  >
                    Lock Multi-Stop Trip (Pay ₹{totalPlatformFee}) →
                  </button>
                </div>
              </div>

              {error && <p className="rounded-lg bg-red-50 p-2.5 text-[11px] text-red-700">{error}</p>}
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <span className="font-semibold text-ink text-[13.5px]">
                      Multi-Stop Trip Platform Lock Fee
                    </span>
                    <p className="text-[11px] text-ink-soft">
                      {stops.map((s) => s.city).join(" ➔ ")} · {stops.length} Hotel Stops
                    </p>
                  </div>
                  <span className="text-[18px] font-bold text-accent">₹{totalPlatformFee}</span>
                </div>

                <div className="mt-4 flex flex-col items-center text-center">
                  <div className="rounded-xl border border-line bg-white p-2 shadow-xs">
                    <img src={qrUrl} alt="UPI Payment QR Code" className="h-44 w-44 object-contain" />
                  </div>
                  <span className="mt-2.5 font-mono text-[11px] font-medium text-ink bg-paper px-3 py-1 rounded-md border border-line">
                    {upiId}
                  </span>
                  <p className="mt-1 text-[10.5px] text-ink-faint">
                    Scan with Google Pay, PhonePe, Paytm, or BHIM UPI
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                  Enter 12-Digit UPI Transaction ID (UTR) *
                </label>
                <input
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/\s+/g, ""))}
                  placeholder="e.g. 432109876543"
                  className="mt-1 h-9 w-full rounded-lg border border-line px-2.5 text-[12px] text-ink outline-none"
                />
                <span className="mt-0.5 block text-[9.5px] text-ink-faint">
                  Found on your payment success receipt in Google Pay / PhonePe / Paytm.
                </span>
              </div>

              {error && <p className="rounded-lg bg-red-50 p-2.5 text-[11px] text-red-700">{error}</p>}

              <div className="flex items-center justify-between border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setStep("plan")}
                  className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-medium text-ink-soft hover:bg-paper"
                >
                  ← Back to Plan
                </button>
                <button
                  type="button"
                  onClick={confirmTripBooking}
                  className="rounded-lg bg-accent px-5 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-accent/90"
                >
                  Confirm All {stops.length} Stays
                </button>
              </div>
            </div>
          )}

          {step === "confirmed" && (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </span>
              <h3 className="mt-3 font-serif text-[22px] text-ink">Multi-Stop Trip Locked!</h3>
              <p className="mt-1 text-[12px] text-ink-soft">
                All {stops.length} hotel stays along your route have been booked with shared Fast-Track KYC clearance.
              </p>

              <div className="mt-5 w-full rounded-xl border border-line bg-white p-4 text-left text-[11px] space-y-2">
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink-faint">Travel Circuit</span>
                  <span className="font-semibold text-ink">{stops.map((s) => s.city).join(" ➔ ")}</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink-faint">Primary Guest</span>
                  <span className="text-ink">{guestName} ({email})</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink-faint">Start Date</span>
                  <span className="font-mono text-ink">{startDate}</span>
                </div>
                <div className="flex justify-between border-b border-line pb-1.5">
                  <span className="text-ink-faint">Platform Fee Paid</span>
                  <span className="font-mono font-bold text-accent">₹{totalPlatformFee} (UTR: {utrNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-faint">Fast-Track Status</span>
                  <span className="font-medium text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Transferred to all hotel reception desks
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-xl bg-ink px-6 py-2.5 text-[12px] font-semibold text-white hover:bg-ink/90"
              >
                Done · View My Bookings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
