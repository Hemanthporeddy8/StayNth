import { useState, useEffect, useMemo } from "react";
import {
  Compass,
  ArrowLeft,
  Calendar,
  Car,
  Clock,
  ShieldCheck,
  Check,
  BedDouble,
  Play,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  User,
  Mail,
  Phone,
} from "lucide-react";
import {
  type Expedition,
  type BudgetTier,
  type ExpeditionDay,
  loadLocalExpeditions,
  fetchRemoteExpeditions,
} from "@/lib/expeditions";
import {
  type PropertyRequest,
  loadRequests,
  saveRequests,
  saveRemoteRequest,
} from "@/lib/properties";
import { cn } from "@/utils/cn";

export function ExpeditionsPage({
  onBack,
  onOpenMarketplace,
  onOpenStudio,
}: {
  onBack: () => void;
  onOpenMarketplace: () => void;
  onOpenStudio: () => void;
}) {
  const [expeditions, setExpeditions] = useState<Expedition[]>(loadLocalExpeditions);
  const [selectedExpedition, setSelectedExpedition] = useState<Expedition | null>(null);
  const [selectedTier, setSelectedTier] = useState<BudgetTier>("comfort");
  const [showVideo, setShowVideo] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Booking form state
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

  // Load expeditions from remote D1
  useEffect(() => {
    fetchRemoteExpeditions().then((remote) => {
      if (remote && remote.length > 0) {
        setExpeditions(remote);
      }
    });
  }, []);

  // Hash routing for expedition detail vs directory
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/^#expedition=([A-Za-z0-9_-]+)/);
      if (match) {
        const found = expeditions.find((e) => e.id === match[1]);
        if (found) {
          setSelectedExpedition(found);
          setBookingSuccess(false);
          return;
        }
      }
      if (hash === "#expeditions" || hash === "#trips" || hash === "#circuits") {
        setSelectedExpedition(null);
        return;
      }
      // If direct visit to #expedition without ID and we have published expeditions, show first
      if (hash.startsWith("#expedition") && expeditions.length > 0) {
        setSelectedExpedition(expeditions[0]);
        setBookingSuccess(false);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [expeditions]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const openExpedition = (exp: Expedition) => {
    setSelectedExpedition(exp);
    setBookingSuccess(false);
    window.location.hash = `#expedition=${exp.id}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeToDirectory = () => {
    setSelectedExpedition(null);
    window.location.hash = "#expeditions";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculations for current expedition
  const totalKm = useMemo(() => {
    if (!selectedExpedition) return 0;
    return selectedExpedition.days.reduce((acc, d) => acc + d.distanceKm, 0);
  }, [selectedExpedition]);

  const totalStayCost = useMemo(() => {
    if (!selectedExpedition) return 0;
    return selectedExpedition.days.reduce((acc, d) => {
      const stay = d.stays[selectedTier];
      return acc + (stay?.pricePerNight || 0);
    }, 0);
  }, [selectedExpedition, selectedTier]);

  const youtubeVideoId = useMemo(() => {
    if (!selectedExpedition?.youtubeUrl) return null;
    const match = selectedExpedition.youtubeUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? match[1] : null;
  }, [selectedExpedition?.youtubeUrl]);

  const handleCircuitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpedition) return;
    if (!guestName.trim() || !email.trim()) {
      showToast("Please enter your name and email");
      return;
    }

    const currentRequests = loadRequests();
    const createdRequests: PropertyRequest[] = selectedExpedition.days
      .filter((d) => d.stays[selectedTier] && d.stays[selectedTier].pricePerNight > 0)
      .map((d, index) => {
        const stay = d.stays[selectedTier];
        const checkIn = new Date(startDate);
        checkIn.setDate(checkIn.getDate() + index);
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkOut.getDate() + 1);

        return {
          id: `req_exp_${Date.now()}_${index}`,
          propertyId: stay.propertyId || `prop_${selectedExpedition.id}_day${d.dayNumber}`,
          propertyTitle: `${stay.name} (${d.toLocation}) [${selectedTier.toUpperCase()}]`,
          kind: "booking",
          guestName: guestName.trim(),
          email: email.trim(),
          startDate: checkIn.toISOString().split("T")[0],
          endDate: checkOut.toISOString().split("T")[0],
          guests: 2,
          message: `Founder Expedition: ${selectedExpedition.title} • Day ${d.dayNumber} Stay (${d.fromLocation} ➔ ${d.toLocation}) • Contact: ${phone}`,
          total: stay.pricePerNight + 49,
          payAtHotel: stay.pricePerNight,
          platformFee: 49,
          paymentUtr: `UTR-EXP-${Math.floor(100000 + Math.random() * 900000)}`,
          status: "pending",
          fastTrackVerified: fastTrackKyc,
          createdAt: new Date().toISOString(),
        };
      });

    const updated = [...createdRequests, ...currentRequests];
    saveRequests(updated);
    for (const r of createdRequests) {
      saveRemoteRequest(r);
    }

    setBookingSuccess(true);
    showToast(`Circuit reserved! Confirmed ${createdRequests.length} partner stays.`);
  };

  const publishedExpeditions = expeditions.filter((e) => e.published);

  return (
    <div className="min-h-screen w-full bg-paper-deep text-ink flex flex-col font-sans selection:bg-accent/20">
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={selectedExpedition ? closeToDirectory : onBack}
              className="flex items-center gap-2 group text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white shadow-xs group-hover:scale-105 transition">
                <Compass className="h-5 w-5 text-accent animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-[17px] font-bold tracking-tight text-ink">StayNth</span>
                  <span className="rounded-md bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent">
                    Expeditions
                  </span>
                </div>
                <p className="text-[10px] text-ink-soft hidden sm:block">Founder-Scouted Road Trips & Multi-Stay Circuits</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedExpedition && (
              <button
                onClick={closeToDirectory}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink-soft hover:bg-paper-deep hover:text-ink transition shadow-2xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> All Circuits
              </button>
            )}
            <button
              onClick={onOpenMarketplace}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink-soft hover:bg-paper-deep hover:text-ink transition shadow-2xs"
            >
              Marketplace
            </button>
            <button
              onClick={onOpenStudio}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink-soft hover:bg-paper-deep hover:text-ink transition shadow-2xs"
            >
              <Layers className="h-3.5 w-3.5" /> 2D Studio
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-pop rounded-xl border border-ink/10 bg-ink px-4 py-2.5 text-[12px] font-medium text-white shadow-xl flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 1: DEDICATED FULL-PAGE CIRCUIT VIEW                      */}
      {/* ============================================================ */}
      {selectedExpedition ? (
        <main className="flex-1 pb-16">
          {/* Full-Width Panoramic Hero Section */}
          <div className="relative overflow-hidden bg-ink text-white">
            <div className="absolute inset-0">
              <img
                src={selectedExpedition.coverPhoto}
                alt={selectedExpedition.title}
                className="h-full w-full object-cover opacity-40 filter saturate-125"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                  <ShieldCheck className="h-3.5 w-3.5" /> Founder Verified Expedition
                </span>
                <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white">
                  {selectedExpedition.region}
                </span>
              </div>

              <h1 className="mt-4 font-serif text-[32px] sm:text-[44px] lg:text-[52px] font-bold leading-tight tracking-tight text-white max-w-4xl">
                {selectedExpedition.title}
              </h1>
              <p className="mt-3 text-[15px] sm:text-[17px] text-white/90 max-w-3xl leading-relaxed">
                {selectedExpedition.subtitle}
              </p>

              {/* Trip Quick Metrics */}
              <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4 font-mono text-[11px] sm:text-[12px]">
                <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/15">
                  <Calendar className="h-4 w-4 text-accent" />
                  <span>{selectedExpedition.days.length} Days Circuit</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/15">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  <span>{totalKm} km Total Distance</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/15">
                  <Car className="h-4 w-4 text-amber-400" />
                  <span>{selectedExpedition.vehicleType}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-md px-3.5 py-2 border border-white/15">
                  <Clock className="h-4 w-4 text-cyan-300" />
                  <span>Season: {selectedExpedition.season}</span>
                </div>
              </div>

              {/* Founder Vlog Trigger */}
              {youtubeVideoId && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-[12.5px] font-bold text-ink hover:bg-white/90 transition shadow-lg group"
                  >
                    <Play className="h-4 w-4 fill-accent text-accent group-hover:scale-110 transition" />
                    <span>{showVideo ? "Hide Scouting Video" : "Watch Founder's Scouting Vlog"}</span>
                  </button>
                  <span className="text-[11px] text-white/70 italic">
                    Recorded live on the ground during hotel vendor scouting
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* YouTube Video Player Embed Section */}
          {showVideo && youtubeVideoId && (
            <div className="mx-auto max-w-5xl px-4 -mt-8 relative z-20 sm:px-6">
              <div className="overflow-hidden rounded-2xl border-2 border-accent/40 bg-black shadow-2xl">
                <div className="aspect-video w-full">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1`}
                    title="Founder's Expedition Scouting Vlog"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          )}

          {/* Main 2-Column Content Area */}
          <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
            {/* Budget Tier Selector Card */}
            <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-accent font-semibold">
                    Step 1 • Select Your Travel Budget
                  </span>
                  <h3 className="font-serif text-[20px] font-bold text-ink mt-0.5">
                    Same Circuit Route, Three Curated Stay Styles
                  </h3>
                  <p className="text-[12px] text-ink-soft mt-1">
                    The road itinerary and stops remain identical. Choose the accommodation class suited for your travel group:
                  </p>
                </div>
                <div className="flex shrink-0 items-center rounded-xl border border-line bg-paper-deep p-1">
                  <button
                    onClick={() => setSelectedTier("backpacker")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition",
                      selectedTier === "backpacker"
                        ? "bg-ink text-white shadow-xs"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    🎒 Backpacker
                  </button>
                  <button
                    onClick={() => setSelectedTier("comfort")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition",
                      selectedTier === "comfort"
                        ? "bg-ink text-white shadow-xs"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    🌿 Comfort
                  </button>
                  <button
                    onClick={() => setSelectedTier("luxury")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition",
                      selectedTier === "luxury"
                        ? "bg-ink text-white shadow-xs"
                        : "text-ink-soft hover:text-ink"
                    )}
                  >
                    👑 Luxury
                  </button>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-accent" />
                  <span className="font-medium text-ink">
                    {selectedTier === "backpacker" && "Tents, Riverside Camps & Backpacker Hostels (Budget / Adventure)"}
                    {selectedTier === "comfort" && "Boutique Homestays, Coastal Cottages & Heritage Resorts (Families / Couples)"}
                    {selectedTier === "luxury" && "Premium Clifftop Villas, Private Suites & 5-Star Spa Retreats (Luxury Travelers)"}
                  </span>
                </div>
                <div className="font-mono text-[12px] text-ink-soft">
                  Estimated Total Stays Tariff:{" "}
                  <strong className="text-[14px] font-bold text-ink font-sans">
                    ₹{totalStayCost.toLocaleString()}
                  </strong>{" "}
                  ({selectedExpedition.days.filter((d) => d.stays[selectedTier]?.pricePerNight > 0).length} nights)
                </div>
              </div>
            </div>

            {/* 2-Column Grid: Timeline on Left, Booking Box on Right */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: Day-by-Day Journey & Stays (8 cols) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-[22px] font-bold text-ink">
                    Day-by-Day Journey & Verified Stays
                  </h2>
                  <span className="font-mono text-[11px] text-ink-faint">
                    {selectedExpedition.days.length} Days • {totalKm} km
                  </span>
                </div>

                {selectedExpedition.days.map((day: ExpeditionDay) => {
                  const stay = day.stays[selectedTier];
                  return (
                    <div
                      key={day.dayNumber}
                      className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs transition hover:border-ink/30"
                    >
                      {/* Day Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-[11px] font-bold text-white">
                            {day.dayNumber}
                          </span>
                          <div>
                            <h4 className="font-serif text-[16px] font-bold text-ink">
                              {day.fromLocation} <span className="text-accent">➔</span> {day.toLocation}
                            </h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px] text-ink-soft">
                          <span>{day.distanceKm} km</span>
                          <span>•</span>
                          <span>{day.driveTime}</span>
                        </div>
                      </div>

                      {/* Day Route Notes & Founder Tips */}
                      <div className="p-5">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {day.highlights.map((h, hi) => (
                            <span key={hi} className="rounded-md bg-paper px-2.5 py-1 text-[11.5px] text-ink-soft border border-line">
                              {h}
                            </span>
                          ))}
                        </div>

                        {day.founderTips && (
                          <div className="mt-3.5 rounded-xl border border-amber-300/60 bg-amber-50/70 p-3.5 text-[12px] text-amber-950 flex items-start gap-2.5">
                            <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                            <div>
                              <strong className="font-semibold block text-[11px] uppercase tracking-wide text-amber-900">
                                Founder Scouting Tip:
                              </strong>
                              <span className="leading-snug">{day.founderTips}</span>
                            </div>
                          </div>
                        )}

                        {/* Stay Card for Selected Tier */}
                        {stay && (
                          <div className="mt-5 rounded-xl border border-line bg-paper-deep p-4 transition hover:bg-white hover:border-ink/20">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                              <div className="flex gap-3.5 items-center">
                                <img
                                  src={stay.photo}
                                  alt={stay.name}
                                  className="h-20 w-24 shrink-0 rounded-lg object-cover border border-line"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-ink/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-ink font-semibold">
                                      {stay.type}
                                    </span>
                                    <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                      Onboarded Stay
                                    </span>
                                  </div>
                                  <h5 className="font-serif text-[15px] font-bold text-ink mt-1">
                                    {stay.name}
                                  </h5>
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {stay.features.map((feat, fi) => (
                                      <span
                                        key={fi}
                                        className="rounded bg-white px-2 py-0.5 text-[10px] text-ink-soft border border-line"
                                      >
                                        {feat}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="text-left sm:text-right shrink-0">
                                {stay.pricePerNight > 0 ? (
                                  <>
                                    <div className="font-serif text-[18px] font-bold text-ink">
                                      ₹{stay.pricePerNight.toLocaleString()}
                                    </div>
                                    <span className="font-mono text-[10.5px] text-ink-soft">
                                      per night
                                    </span>
                                  </>
                                ) : (
                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                                    Return Leg
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT COLUMN: Sticky Circuit Booking Sidebar (4 cols) */}
              <div className="lg:col-span-5 xl:col-span-4 sticky top-20 space-y-5">
                <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-md">
                  <div className="bg-ink px-6 py-5 text-white">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-accent font-semibold block">
                      Direct Circuit Reservation
                    </span>
                    <h3 className="font-serif text-[19px] font-bold mt-1 text-white">
                      Reserve All Circuit Stays
                    </h3>
                    <p className="text-[11.5px] text-white/80 mt-1">
                      Lock in all stops in 1-click. 100% pay at partner stays on arrival with fast-track KYC.
                    </p>
                  </div>

                  {bookingSuccess ? (
                    <div className="p-6 text-center space-y-4">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Check className="h-7 w-7" />
                      </div>
                      <h4 className="font-serif text-[18px] font-bold text-ink">
                        Circuit Circuit Reserved!
                      </h4>
                      <p className="text-[12px] text-ink-soft leading-relaxed">
                        Your bookings for the <strong>{selectedExpedition.title}</strong> have been secured. The partner homestays and resorts along the route have been notified of your arrival.
                      </p>
                      <div className="rounded-xl bg-paper p-3 font-mono text-[11px] text-ink-soft border border-line">
                        Status: Pending Check-In • Zero Advance Required
                      </div>
                      <button
                        onClick={() => setBookingSuccess(false)}
                        className="w-full rounded-xl border border-line bg-white py-2.5 text-[12px] font-medium text-ink hover:bg-paper-deep"
                      >
                        Book Another Group
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCircuitBooking} className="p-6 space-y-4">
                      {/* Circuit Price Summary */}
                      <div className="rounded-xl border border-line bg-paper-deep p-4">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-ink-soft">Tier Selected:</span>
                          <span className="font-bold uppercase font-mono text-ink">
                            {selectedTier}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[12px] mt-1.5">
                          <span className="text-ink-soft">Total Stays Cost:</span>
                          <span className="font-serif text-[16px] font-bold text-ink">
                            ₹{totalStayCost.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10.5px] text-ink-faint mt-1">
                          <span>Pay at check-in:</span>
                          <span>100% direct to hosts</span>
                        </div>
                      </div>

                      {/* Start Date */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                          Circuit Start Date (Day 1)
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-[12px] text-ink font-mono focus:border-ink focus:outline-none"
                          required
                        />
                      </div>

                      {/* Guest Details */}
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                          Lead Traveler Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            className="w-full rounded-xl border border-line bg-paper pl-9 pr-3 py-2 text-[12px] text-ink focus:border-ink focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-line bg-paper pl-9 pr-3 py-2 text-[12px] text-ink focus:border-ink focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
                          <input
                            type="tel"
                            placeholder="+91 98765 43210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full rounded-xl border border-line bg-paper pl-9 pr-3 py-2 text-[12px] text-ink focus:border-ink focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Fast Track KYC */}
                      <div className="rounded-xl border border-line bg-paper p-3 flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          id="fastTrack"
                          checked={fastTrackKyc}
                          onChange={(e) => setFastTrackKyc(e.target.checked)}
                          className="mt-0.5 rounded border-line text-accent"
                        />
                        <label htmlFor="fastTrack" className="text-[11px] text-ink leading-snug cursor-pointer">
                          <strong>Fast-Track Circuit Check-In:</strong> Pre-verify traveler identity for zero-paperwork check-in at remote homestays & jungle resorts.
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-accent py-3 text-[13px] font-bold text-white shadow-md hover:bg-accent/90 transition flex items-center justify-center gap-2 group"
                      >
                        <span>Reserve All {selectedExpedition.days.length} Circuit Stays</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                      </button>

                      <p className="text-center text-[10.5px] text-ink-faint">
                        Zero platform markup • Direct partner property support
                      </p>
                    </form>
                  )}
                </div>

                {/* Founder Assurance Card */}
                <div className="rounded-2xl border border-line bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-ink">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="font-serif text-[14px] font-bold">Why Book Founder Circuits?</span>
                  </div>
                  <ul className="space-y-2 text-[11.5px] text-ink-soft">
                    <li className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                      <span>Every road, pass, and homestay tested personally in the field.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                      <span>Direct phone contacts of local homestay owners provided.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                      <span>Tailored for 3 distinct budgets without altering the adventure.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* ============================================================ */
        /* VIEW 2: EXPEDITIONS SHOWCASE DIRECTORY (CATALOG)            */
        /* ============================================================ */
        <main className="flex-1 pb-16">
          {/* Catalog Hero Banner */}
          <div className="border-b border-line bg-gradient-to-b from-paper to-paper-deep py-14 sm:py-20 text-center px-4">
            <div className="mx-auto max-w-3xl">
              <span className="rounded-full bg-accent/15 px-3.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wider text-accent inline-block">
                Curated & Ground-Tested by Founder
              </span>
              <h1 className="mt-4 font-serif text-[34px] sm:text-[46px] font-bold tracking-tight text-ink">
                Founder-Curated Road Trips & Expeditions
              </h1>
              <p className="mt-3 text-[14px] sm:text-[16px] text-ink-soft leading-relaxed max-w-2xl mx-auto">
                Real, scouted journeys with full day-by-day routes and verified partner stays across 3 distinct budgets: Backpacker camps, Comfort resorts, and Luxury villas.
              </p>
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-accent" />
                <h2 className="font-serif text-[18px] font-bold text-ink">
                  Available Circuits ({publishedExpeditions.length})
                </h2>
              </div>
              <span className="font-mono text-[11px] text-ink-faint">
                All itineraries scouted in person
              </span>
            </div>

            {publishedExpeditions.length === 0 ? (
              <div className="mt-12 rounded-2xl border border-dashed border-line bg-white p-12 text-center">
                <Compass className="mx-auto h-10 w-10 text-ink-faint animate-pulse" />
                <h3 className="mt-3 font-serif text-[18px] font-bold text-ink">
                  No Expeditions Published Yet
                </h3>
                <p className="mt-1 text-[12.5px] text-ink-soft">
                  New scouting routes are currently being tested in the field.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedExpeditions.map((exp) => (
                  <div
                    key={exp.id}
                    onClick={() => openExpedition(exp)}
                    className="group cursor-pointer overflow-hidden rounded-2xl border border-line bg-white shadow-xs transition hover:border-ink hover:shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Cover */}
                      <div className="relative h-56 w-full overflow-hidden bg-ink">
                        <img
                          src={exp.coverPhoto}
                          alt={exp.title}
                          className="h-full w-full object-cover opacity-85 transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" />
                        <div className="absolute top-3.5 left-3.5 flex gap-2">
                          <span className="rounded-full bg-ink/70 backdrop-blur-xs px-2.5 py-0.5 text-[9.5px] font-semibold text-white">
                            {exp.days.length} Days
                          </span>
                          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[9.5px] font-bold text-white">
                            3 Budgets
                          </span>
                        </div>
                        <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                          <span className="font-mono text-[10px] text-white/80 block">
                            {exp.region}
                          </span>
                          <h3 className="font-serif text-[18px] font-bold leading-snug group-hover:text-accent transition">
                            {exp.title}
                          </h3>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5">
                        <p className="text-[12px] text-ink-soft line-clamp-2 leading-relaxed">
                          {exp.subtitle}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2 text-[10.5px] font-mono text-ink-soft">
                          <span className="rounded-lg bg-paper-deep px-2 py-1 border border-line">
                            🚗 {exp.vehicleType}
                          </span>
                          <span className="rounded-lg bg-paper-deep px-2 py-1 border border-line">
                            🍂 Best: {exp.season}
                          </span>
                        </div>

                        {/* Day Route Strip */}
                        <div className="mt-4 border-t border-line pt-3">
                          <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink-faint block mb-1">
                            Key Route Stops:
                          </span>
                          <div className="text-[11.5px] text-ink font-medium truncate">
                            {exp.days.map((d) => d.toLocation).join(" ➔ ")}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-line bg-paper px-5 py-3 flex items-center justify-between text-[11.5px] font-semibold text-accent group-hover:text-ink transition">
                      <span>View Full Circuit & Stays</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-line bg-paper py-6 text-center text-[11px] text-ink-soft font-mono">
        StayNth Expeditions • Ground-Scouted Itineraries with 3-Tier Verified Stays • 100% Tax-Deductible Founder Field Operations
      </footer>
    </div>
  );
}
