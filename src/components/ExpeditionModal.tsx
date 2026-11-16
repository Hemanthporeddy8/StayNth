import { useState, useMemo } from "react";
import {
  X,
  Compass,
  Calendar,
  Car,
  Clock,
  ShieldCheck,
  Check,
  BedDouble,
  Play,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import type { Expedition, BudgetTier, ExpeditionDay } from "@/lib/expeditions";
import type { PropertyRequest } from "@/lib/properties";
import { cn } from "@/utils/cn";

export function ExpeditionModal({
  isOpen,
  onClose,
  expedition,
  onRequestBooking,
}: {
  isOpen: boolean;
  onClose: () => void;
  expedition: Expedition;
  onRequestBooking: (requests: PropertyRequest[]) => void;
}) {
  const [selectedTier, setSelectedTier] = useState<BudgetTier>("comfort");
  const [showVideo, setShowVideo] = useState(false);

  // Booking form state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fastTrackKyc, setFastTrackKyc] = useState(true);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Calculate circuit totals
  const totalKm = useMemo(() => {
    return expedition.days.reduce((acc, d) => acc + d.distanceKm, 0);
  }, [expedition.days]);

  const totalStayCost = useMemo(() => {
    return expedition.days.reduce((acc, d) => {
      const stay = d.stays[selectedTier];
      return acc + (stay?.pricePerNight || 0);
    }, 0);
  }, [expedition.days, selectedTier]);

  // YouTube embed ID extractor
  const youtubeVideoId = useMemo(() => {
    if (!expedition.youtubeUrl) return null;
    const match = expedition.youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }, [expedition.youtubeUrl]);

  if (!isOpen) return null;

  const handleCircuitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !email.trim()) return;

    // Create a booking request for each night of the circuit
    const createdRequests: PropertyRequest[] = expedition.days
      .filter((d) => d.stays[selectedTier] && d.stays[selectedTier].pricePerNight > 0)
      .map((d, index) => {
        const stay = d.stays[selectedTier];
        const checkIn = new Date(startDate);
        checkIn.setDate(checkIn.getDate() + index);
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + 1);

        return {
          id: `req_exp_${Date.now()}_${index}`,
          propertyId: stay.propertyId || `prop_${expedition.id}_day${d.dayNumber}`,
          propertyTitle: `${stay.name} (${d.toLocation}) [${selectedTier.toUpperCase()}]`,
          kind: "booking",
          guestName: guestName.trim(),
          email: email.trim(),
          startDate: checkIn.toISOString().split("T")[0],
          endDate: checkOut.toISOString().split("T")[0],
          guests: 2,
          message: `Founder Expedition: ${expedition.title} • Day ${d.dayNumber} Stay (${d.fromLocation} ➔ ${d.toLocation}) • Contact: ${phone}`,
          total: stay.pricePerNight + 49,
          payAtHotel: stay.pricePerNight,
          platformFee: 49,
          paymentUtr: `UTR-EXP-${Math.floor(100000 + Math.random() * 900000)}`,
          status: "pending",
          fastTrackVerified: fastTrackKyc,
          createdAt: new Date().toISOString(),
        };
      });

    onRequestBooking(createdRequests);
    setBookingSuccess(true);
  };

  return (
    <div className="animate-fade fixed inset-0 z-[90] flex items-center justify-center bg-ink/75 p-3 backdrop-blur-sm sm:p-5">
      <div className="animate-pop flex max-h-[95dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl">
        {/* Top Header with Cover Image & Hero */}
        <div className="relative shrink-0 overflow-hidden bg-ink text-white">
          <div className="absolute inset-0 z-0">
            <img
              src={expedition.coverPhoto}
              alt={expedition.title}
              className="h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
          </div>

          <div className="relative z-10 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white">
                    <Sparkles className="h-3 w-3" /> Founder Verified Expedition
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white/90">
                    {expedition.region}
                  </span>
                </div>

                <h2 className="mt-2.5 font-serif text-[22px] font-bold leading-tight sm:text-[26px]">
                  {expedition.title}
                </h2>
                <p className="mt-1 text-[12px] text-white/80 max-w-2xl">
                  {expedition.subtitle}
                </p>

                {/* Key Quick Metrics */}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-white/90">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-accent" /> {expedition.days.length} Days Circuit
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-accent" /> {totalKm} km Total Distance
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-accent" /> {expedition.vehicleType}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-accent" /> Best: {expedition.season}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="rounded-full bg-black/40 p-2 text-white/80 hover:bg-black/60 hover:text-white transition shrink-0"
                aria-label="Close Expedition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Vlog Trigger */}
            {youtubeVideoId && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => setShowVideo(!showVideo)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-[11.5px] font-semibold text-ink shadow-md hover:bg-paper transition"
                >
                  <Play className="h-3.5 w-3.5 fill-accent text-accent" />
                  {showVideo ? "Hide Founder's Scouting Vlog" : "Watch Founder's Scouting Vlog on YouTube"}
                </button>
                <span className="text-[11px] text-white/70 italic">
                  Recorded on the ground by Founder
                </span>
              </div>
            )}
          </div>

          {/* Embedded YouTube Player when active */}
          {showVideo && youtubeVideoId && (
            <div className="relative z-10 border-t border-white/10 bg-black p-3 flex justify-center">
              <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-xl">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1`}
                  title="Founder Scouting Trip Vlog"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3-TIER BUDGET SELECTOR TABS */}
        <div className="shrink-0 border-b border-line bg-white px-5 py-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint block">
                Select Your Travel Budget
              </span>
              <p className="text-[11px] text-ink-soft">
                The itinerary route stays identical. Choose the accommodation style suited to your travel style:
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-xl bg-paper p-1 sm:max-w-md w-full">
              <button
                type="button"
                onClick={() => setSelectedTier("backpacker")}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg py-1.5 px-2 text-center transition",
                  selectedTier === "backpacker"
                    ? "bg-ink text-white shadow-xs"
                    : "text-ink-soft hover:bg-paper-deep hover:text-ink"
                )}
              >
                <span className="text-[11px] font-semibold">🎒 Backpacker</span>
                <span className="text-[9.5px] font-mono opacity-80">Tents & Hostels</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTier("comfort")}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg py-1.5 px-2 text-center transition",
                  selectedTier === "comfort"
                    ? "bg-ink text-white shadow-xs"
                    : "text-ink-soft hover:bg-paper-deep hover:text-ink"
                )}
              >
                <span className="text-[11px] font-semibold">🌿 Comfort</span>
                <span className="text-[9.5px] font-mono opacity-80">Resorts & Cottages</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTier("luxury")}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg py-1.5 px-2 text-center transition",
                  selectedTier === "luxury"
                    ? "bg-ink text-white shadow-xs"
                    : "text-ink-soft hover:bg-paper-deep hover:text-ink"
                )}
              >
                <span className="text-[11px] font-semibold">👑 Luxury</span>
                <span className="text-[9.5px] font-mono opacity-80">Villas & Suites</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Day-by-Day Timeline */}
        <div className="scroll-warm min-h-0 flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {!showBookingForm ? (
            <>
              {/* Circuit Stays Summary Box */}
              <div className="rounded-xl border border-line bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <BedDouble className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-ink">
                      {selectedTier === "backpacker"
                        ? "🎒 Backpacker Route Stays (Tents & Hostels)"
                        : selectedTier === "comfort"
                        ? "🌿 Comfort Route Stays (Resorts & Nature Cottages)"
                        : "👑 Luxury Route Stays (Private Pool Villas)"}
                    </h3>
                    <p className="text-[11px] text-ink-soft">
                      Total circuit accommodation tariff:{" "}
                      <strong className="text-accent text-[13px]">
                        ₹{totalStayCost.toLocaleString()}
                      </strong>{" "}
                      ({expedition.days.filter((d) => d.stays[selectedTier]?.pricePerNight > 0).length} nights)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBookingForm(true)}
                  className="rounded-xl bg-ink px-4 py-2 text-[11.5px] font-semibold text-white hover:bg-ink/90 transition shadow-xs flex items-center gap-1.5"
                >
                  Book This Entire Circuit <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Day-by-Day Stops */}
              <div className="space-y-4">
                <h3 className="font-serif text-[18px] text-ink">Day-by-Day Journey & Stays</h3>

                <div className="space-y-3.5">
                  {expedition.days.map((day: ExpeditionDay) => {
                    const currentStay = day.stays[selectedTier];

                    return (
                      <div
                        key={day.dayNumber}
                        className="rounded-xl border border-line bg-white p-4 sm:p-5 shadow-xs transition hover:border-ink/20"
                      >
                        {/* Day Title & Route */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                              {day.dayNumber}
                            </span>
                            <h4 className="text-[14px] font-bold text-ink">
                              {day.fromLocation} <span className="text-accent font-mono">➔</span> {day.toLocation}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] font-mono text-ink-soft">
                            <span>{day.distanceKm} km</span>
                            <span>·</span>
                            <span>{day.driveTime}</span>
                          </div>
                        </div>

                        {/* Highlights pills */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {day.highlights.map((highlight: string, hIdx: number) => (
                            <span
                              key={hIdx}
                              className="rounded-md bg-paper px-2 py-0.5 text-[10.5px] font-medium text-ink-soft"
                            >
                              📍 {highlight}
                            </span>
                          ))}
                        </div>

                        {/* Founder Road Tip */}
                        {day.founderTips && (
                          <div className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/60 p-2.5 text-[11px] text-amber-950 flex items-start gap-2">
                            <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                            <div>
                              <strong className="font-semibold text-amber-900">Founder Scout Tip:</strong>{" "}
                              {day.founderTips}
                            </div>
                          </div>
                        )}

                        {/* Partner Stay for this Day */}
                        {currentStay && (
                          <div className="mt-3.5 rounded-xl border border-line bg-paper/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={currentStay.photo}
                                alt={currentStay.name}
                                className="h-14 w-14 shrink-0 rounded-lg object-cover border border-line"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-ink-soft border border-line">
                                    {currentStay.type}
                                  </span>
                                  <h5 className="truncate text-[13px] font-semibold text-ink">
                                    {currentStay.name}
                                  </h5>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-[10.5px] text-ink-soft">
                                  {currentStay.features.map((feat: string, fIdx: number) => (
                                    <span key={fIdx} className="flex items-center gap-0.5">
                                      <Check className="h-3 w-3 text-green-600" /> {feat}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 text-left sm:text-right">
                              {currentStay.pricePerNight > 0 ? (
                                <>
                                  <div className="font-serif text-[16px] font-bold text-ink">
                                    ₹{currentStay.pricePerNight.toLocaleString()}
                                    <span className="text-[10px] font-normal text-ink-soft font-sans"> / night</span>
                                  </div>
                                  <span className="text-[9.5px] text-emerald-700 font-medium">
                                    Verified In-Person
                                  </span>
                                </>
                              ) : (
                                <span className="rounded bg-paper px-2 py-1 font-mono text-[10.5px] text-ink-soft">
                                  Return / Complete
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* BOOKING CHECKOUT FORM */
            <div className="rounded-2xl border border-line bg-white p-6 shadow-sm max-w-xl mx-auto">
              {!bookingSuccess ? (
                <div>
                  <div className="border-b border-line pb-4">
                    <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-[9.5px] font-bold text-accent uppercase">
                      Circuit Reservation
                    </span>
                    <h3 className="mt-2 font-serif text-[20px] font-bold text-ink">
                      Reserve All Stays for {expedition.title}
                    </h3>
                    <p className="text-[11.5px] text-ink-soft mt-0.5">
                      Tier: <strong className="capitalize text-ink">{selectedTier}</strong> · Total Stays:{" "}
                      <strong className="text-accent">₹{totalStayCost.toLocaleString()}</strong> + ₹49 Platform Fee
                    </p>
                  </div>

                  <form onSubmit={handleCircuitBooking} className="mt-5 space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-medium text-ink-soft mb-1">
                        Trip Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-[12.5px] text-ink outline-none focus:border-ink"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-ink-soft mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g., Rohan Sharma"
                        className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-[12.5px] text-ink outline-none focus:border-ink"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-ink-soft mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="rohan@example.com"
                          className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-[12.5px] text-ink outline-none focus:border-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-ink-soft mb-1">
                          Mobile Phone
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-[12.5px] text-ink outline-none focus:border-ink"
                        />
                      </div>
                    </div>

                    {/* Fast-Track KYC Option */}
                    <div className="rounded-xl border border-line bg-paper p-3 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="ftKyc"
                        checked={fastTrackKyc}
                        onChange={(e) => setFastTrackKyc(e.target.checked)}
                        className="mt-0.5 rounded border-line"
                      />
                      <label htmlFor="ftKyc" className="text-[11px] text-ink-soft cursor-pointer">
                        <span className="font-semibold text-ink flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Fast-Track Express Check-In Clearance
                        </span>
                        Pre-clears your check-in with all partner hosts along the circuit for zero waiting time upon arrival.
                      </label>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="rounded-xl border border-line bg-paper p-3 text-[11.5px] space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-ink-soft">Total Stays Tariff (Pay at properties)</span>
                        <span className="font-mono text-ink">₹{totalStayCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-ink-soft">StayNth Circuit Platform Fee</span>
                        <span className="font-mono text-accent">₹49</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowBookingForm(false)}
                        className="w-1/3 rounded-xl border border-line py-2.5 text-[12px] font-medium text-ink hover:bg-paper"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 rounded-xl bg-ink py-2.5 text-[12px] font-semibold text-white hover:bg-ink/90 transition shadow-sm"
                      >
                        Confirm & Reserve Circuit →
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Check className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 font-serif text-[22px] font-bold text-ink">Circuit Booked!</h3>
                  <p className="mt-1 text-[11.5px] text-ink-soft max-w-sm mx-auto">
                    Your reservations for the <strong>{expedition.title}</strong> have been saved. Partner homestays and resorts have been notified of your arrival.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 rounded-xl bg-ink px-6 py-2.5 text-[12px] font-semibold text-white"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-line bg-white px-5 py-3 text-[11px] text-ink-faint">
          <span>StayNth Founder Expeditions • All stays verified in person</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-ink px-4 py-1.5 font-semibold text-white hover:bg-ink/90"
          >
            Close Itinerary
          </button>
        </div>
      </div>
    </div>
  );
}
