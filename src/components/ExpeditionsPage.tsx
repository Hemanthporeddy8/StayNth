import { useState, useEffect, useMemo, useRef } from "react";
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
  MapPin,
  QrCode,
  Bell,
  Volume2,
  Eye,
  X,
  RotateCcw,
  Radio,
} from "lucide-react";
import {
  type Expedition,
  type BudgetTier,
  type ExpeditionDay,
  type DayTransitOption,
  type TimedMilestone,
  type ExpeditionStay,
  loadLocalExpeditions,
  fetchRemoteExpeditions,
} from "@/lib/expeditions";
import {
  type PropertyRequest,
  type PropertyListing,
  loadRequests,
  saveRequests,
  saveRemoteRequest,
  loadListings,
  createSeedListings,
} from "@/lib/properties";
import { generatePlan } from "@/lib/plan";
import { PropertyDetail } from "@/components/PropertyDetail";
import { cn } from "@/utils/cn";

const CHECKINS_STORAGE_KEY = "staynth.expedition.checkins.v1";

function loadCheckins(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CHECKINS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCheckins(data: Record<string, boolean>) {
  try {
    localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/** 100% offline pure-tone bell chime synthesized in device memory using Web Audio API (zero network required) */
function playOfflineChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25); // A5

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.45); // D6

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.08);
    osc1.stop(ctx.currentTime + 1.2);
    osc2.stop(ctx.currentTime + 1.2);
  } catch (err) {
    console.warn("Offline chime failed", err);
  }
}

/** Generates standard iCalendar (.ics) string with VALARM audio departure alerts for phone calendar apps */
function generateIcsDaySchedule(day: ExpeditionDay, expeditionTitle: string, baseDateStr: string): string {
  const targetDate = new Date(baseDateStr);
  targetDate.setDate(targetDate.getDate() + (day.dayNumber - 1));
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(targetDate.getDate()).padStart(2, "0");
  const datePrefix = `${year}${month}${dayOfMonth}`;

  const events = (day.schedule || []).map((m) => {
    const startH = String(m.startHour).padStart(2, "0");
    const startM = String(m.startMinute).padStart(2, "0");
    const endH = String(m.endHour).padStart(2, "0");
    const endM = String(m.endMinute).padStart(2, "0");
    const dtStart = `${datePrefix}T${startH}${startM}00`;
    const dtEnd = `${datePrefix}T${endH}${endM}00`;
    const cleanDesc = `${m.activity}${m.founderTip ? `\\n\\nFounder Tip: ${m.founderTip}` : ""}\\n\\nNext Destination Alert: ${m.departureAlert}`.replace(/\n/g, "\\n");

    return [
      "BEGIN:VEVENT",
      `UID:staynth-exp-d${day.dayNumber}-${m.id}-${Date.now()}@staynth.com`,
      `DTSTAMP:${datePrefix}T000000Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${expeditionTitle} (Day ${day.dayNumber}): ${m.title}`,
      `DESCRIPTION:${cleanDesc}`,
      `LOCATION:${day.fromLocation} to ${day.toLocation}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT10M",
      "ACTION:DISPLAY",
      `DESCRIPTION:StayNth Departure Alert: Time to move to next stop!`,
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StayNth//Offline Expedition Companion//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${expeditionTitle} - Day ${day.dayNumber}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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
  const [includeScootyHold, setIncludeScootyHold] = useState(true);
  const [mobilityPassCode, setMobilityPassCode] = useState<string | null>(null);

  // Offline Companion & Check-in Progress state
  const [checkins, setCheckins] = useState<Record<string, boolean>>(loadCheckins);
  const [companionActive, setCompanionActive] = useState<boolean>(() => {
    return localStorage.getItem("staynth.companion.active") === "true";
  });
  const [activeOfflineAlert, setActiveOfflineAlert] = useState<{
    title: string;
    milestoneTitle: string;
    timeSlot: string;
    departureAlert: string;
    milestoneId: string;
    dayNumber: number;
  } | null>(null);

  // 3D Model Walkthrough state
  const [previewListing, setPreviewListing] = useState<PropertyListing | null>(null);

  const allListings = useMemo(() => {
    try {
      const loaded = loadListings();
      if (loaded && loaded.length > 0) return loaded;
      return createSeedListings();
    } catch {
      return createSeedListings();
    }
  }, []);

  const activeRentalHub = useMemo(() => {
    if (!selectedExpedition) return null;
    for (const day of selectedExpedition.days) {
      const hub = day.transit?.[selectedTier]?.rentalHub;
      if (hub) return hub;
    }
    return null;
  }, [selectedExpedition, selectedTier]);

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

    const pass = activeRentalHub && includeScootyHold ? `GOK-PASS-${Math.floor(1000 + Math.random() * 9000)}` : null;
    if (pass) {
      setMobilityPassCode(pass);
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

        const scootyNote = pass && index === 0 ? ` • [StayNth Priority Scooty Pass: ${pass} (${activeRentalHub?.vehicle} @ ${activeRentalHub?.pickup})]` : "";

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
          message: `Founder Expedition: ${selectedExpedition.title} • Day ${d.dayNumber} Stay (${d.fromLocation} ➔ ${d.toLocation})${scootyNote} • Contact: ${phone}`,
          total: stay.pricePerNight + 49 + (pass && index === 0 ? 49 : 0),
          payAtHotel: stay.pricePerNight,
          platformFee: 49 + (pass && index === 0 ? 49 : 0),
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

  const toggleCheckin = (id: string) => {
    setCheckins((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveCheckins(next);
      if (next[id]) {
        playOfflineChime();
        showToast("Milestone marked reached! ✓");
      }
      return next;
    });
  };

  const resetDayCheckins = (day: ExpeditionDay) => {
    setCheckins((prev) => {
      const next = { ...prev };
      for (const m of day.schedule || []) {
        delete next[m.id];
      }
      saveCheckins(next);
      showToast(`Day ${day.dayNumber} progress reset`);
      return next;
    });
  };

  const triggerOfflineAlert = (milestone: TimedMilestone, day: ExpeditionDay) => {
    playOfflineChime();
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 450]);
      } catch {}
    }
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`StayNth Move Alert: ${milestone.title}`, {
          body: milestone.departureAlert,
          icon: "/icons/icon-192.png",
        });
      } catch {}
    }
    setActiveOfflineAlert({
      title: "TIME TO MOVE TO NEXT DESTINATION!",
      milestoneTitle: milestone.title,
      timeSlot: milestone.timeSlot,
      departureAlert: milestone.departureAlert,
      milestoneId: milestone.id,
      dayNumber: day.dayNumber,
    });
  };

  const toggleCompanion = () => {
    const next = !companionActive;
    setCompanionActive(next);
    localStorage.setItem("staynth.companion.active", String(next));
    if (next) {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      playOfflineChime();
      showToast("Live Trip Companion active! Monitoring offline schedule in device memory.");
    } else {
      showToast("Live Trip Companion paused.");
    }
  };

  // Periodic offline watcher every 30 seconds running directly in device memory
  const lastAlertedMilestoneRef = useRef<string | null>(null);
  useEffect(() => {
    if (!companionActive || !selectedExpedition) return;

    const checkSchedule = () => {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();

      for (const day of selectedExpedition.days) {
        for (const m of day.schedule || []) {
          if (m.endHour === currentH && m.endMinute === currentM) {
            if (lastAlertedMilestoneRef.current !== m.id) {
              lastAlertedMilestoneRef.current = m.id;
              triggerOfflineAlert(m, day);
            }
          }
        }
      }
    };

    const timer = setInterval(checkSchedule, 30000);
    return () => clearInterval(timer);
  }, [companionActive, selectedExpedition]);

  const handleSyncCalendar = (day: ExpeditionDay) => {
    if (!selectedExpedition) return;
    const ics = generateIcsDaySchedule(day, selectedExpedition.title, startDate);
    downloadIcsFile(`StayNth-Day${day.dayNumber}-${day.toLocation.replace(/[^a-zA-Z0-9]/g, "_")}-Alarms.ics`, ics);
    showToast(`Day ${day.dayNumber} Alarms synced! Open the downloaded file to set phone calendar alarms.`);
  };

  const handleSyncAllDays = () => {
    if (!selectedExpedition) return;
    const allEvents: string[] = [];
    selectedExpedition.days.forEach((d) => {
      const dayIcs = generateIcsDaySchedule(d, selectedExpedition.title, startDate);
      const matches = dayIcs.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g);
      if (matches) allEvents.push(...matches);
    });

    const fullIcs = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//StayNth//Offline Expedition Companion//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${selectedExpedition.title}`,
      ...allEvents,
      "END:VCALENDAR",
    ].join("\r\n");

    downloadIcsFile(`StayNth-Complete-Circuit-Alarms.ics`, fullIcs);
    showToast(`Full 4-Day Circuit synced! Phone calendar will prompt to import all milestones and departure alarms.`);
  };

  const openStay3D = (stay: ExpeditionStay, day: ExpeditionDay) => {
    const found = allListings.find((l) => l.id === stay.propertyId);
    if (found) {
      setPreviewListing(found);
      return;
    }
    const dynamicListing: PropertyListing = {
      id: stay.propertyId || `stay_${day.dayNumber}_${stay.type}`,
      title: stay.name,
      type: (stay.type === "resort" ? "villa" : stay.type === "hostel" ? "hostel" : "homestay") as any,
      mode: "stay",
      location: `${day.toLocation}, Karnataka`,
      price: stay.pricePerNight || 1200,
      priceUnit: "night",
      bedrooms: stay.type === "hostel" ? 4 : 2,
      bathrooms: 2,
      beds: stay.type === "hostel" ? 8 : 2,
      area: stay.type === "hostel" ? 1800 : 850,
      description: `StayNth Onboarded Expedition Stay for Day ${day.dayNumber} (${day.fromLocation} ➔ ${day.toLocation}). Preview the interactive 3D layout, verified room proportions, and ensuite bathroom before arrival.`,
      amenities: stay.features,
      photos: [{ url: stay.photo, alt: stay.name }],
      plan: generatePlan(
        {
          bedrooms: stay.type === "hostel" ? 4 : 2,
          bathrooms: 2,
          width: stay.type === "hostel" ? 54 : 42,
          depth: 32,
          furnished: true,
        },
        stay.name
      ),
      ownerName: "StayNth Curated Stay Desk",
      mine: false,
      published: true,
      featured: true,
      rating: 4.9,
      reviews: 28,
      createdAt: new Date().toISOString(),
    };
    setPreviewListing(dynamicListing);
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

              {/* Founder Vlog & Offline Companion Action Strip */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {youtubeVideoId && (
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[12px] font-bold text-ink hover:bg-white/90 transition shadow-lg group"
                  >
                    <Play className="h-4 w-4 fill-accent text-accent group-hover:scale-110 transition" />
                    <span>{showVideo ? "Hide Video" : "Scouting Vlog"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleCompanion}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-bold transition shadow-lg",
                    companionActive
                      ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                      : "bg-white/15 text-white hover:bg-white/25 border border-white/20 backdrop-blur-md"
                  )}
                  title="Enable device-local timer watcher (runs in phone memory even with zero cell signal)"
                >
                  <Radio className={cn("h-4 w-4", companionActive && "animate-pulse")} />
                  <span>{companionActive ? "● Offline Companion Active" : "Start Offline Companion"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncAllDays}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 px-3.5 py-2.5 text-[12px] font-bold text-white transition shadow-lg border border-indigo-400/40"
                  title="Generate native .ics file to automatically schedule calendar events and device alarms"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Sync 4 Days to Alarms (.ics)</span>
                </button>

                <button
                  type="button"
                  onClick={playOfflineChime}
                  className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-[11px] font-mono text-white/90 transition border border-white/15 backdrop-blur-sm"
                  title="Test synthesized bell chime in browser memory"
                >
                  <Volume2 className="h-3.5 w-3.5 text-accent" />
                  <span>Test Audio Bell</span>
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-white/70">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>100% Device-Local Offline Engine: Audio Chime & Alarms trigger inside phone memory in zero-network valleys (Anshi Ghat, Yana caves).</span>
              </div>
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

                {selectedExpedition.days.map((day: ExpeditionDay, dayIdx: number) => {
                  const stay = day.stays[selectedTier];
                  const transitOption: DayTransitOption | undefined = day.transit?.[selectedTier];

                  return (
                    <div key={day.dayNumber} className="space-y-4">
                      {/* Transport Connector Node */}
                      {transitOption && (
                        <div className="relative flex flex-col items-center pt-1">
                          {/* Top dotted connector line if not first day */}
                          {dayIdx > 0 && (
                            <div className="h-6 w-0.5 border-l-2 border-dashed border-accent/40 my-1" />
                          )}

                          {/* Transport Node Card */}
                          <div className="w-full rounded-2xl border border-accent/35 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 p-4 sm:p-5 shadow-xs transition hover:border-accent/60">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent/20 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-white shadow-2xs">
                                  {transitOption.mode === "train" ? "🚆" : transitOption.mode === "bus" ? "🚌" : transitOption.mode === "scooty" ? "🛵" : transitOption.mode === "flight" ? "✈️" : "🚗"}
                                </span>
                                <div>
                                  <span className="font-serif text-[14px] font-bold text-ink block">
                                    {transitOption.title}
                                  </span>
                                  <span className="font-mono text-[9px] text-accent uppercase tracking-wider font-semibold">
                                    Leg {day.dayNumber} Transport • {day.fromLocation} ➔ {day.toLocation}
                                  </span>
                                </div>
                              </div>
                              {transitOption.estimatedFare && (
                                <span className="rounded-full bg-white px-2.5 py-1 text-[10.5px] font-mono text-accent font-bold border border-accent/30 shadow-2xs">
                                  {transitOption.estimatedFare}
                                </span>
                              )}
                            </div>

                            <p className="mt-2.5 text-[12px] leading-relaxed text-ink-soft">
                              {transitOption.details}
                            </p>

                            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-accent/15 text-[11px] font-mono text-ink">
                              <span><strong>Curated Mode:</strong> {transitOption.badge}</span>
                            </div>

                            {/* RENTAL HUB CARD (e.g. Gokarna Scooty Hub) */}
                            {transitOption.rentalHub && (
                              <div className="mt-3.5 rounded-xl border-2 border-emerald-500/35 bg-white p-4 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-[20px] shadow-2xs">
                                      🛵
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-serif text-[14px] font-bold text-ink">
                                          StayNth Priority Mobility Hub
                                        </span>
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-emerald-800">
                                          Gokarna Partner
                                        </span>
                                      </div>
                                      <span className="text-[11.5px] font-semibold text-emerald-800 block">
                                        {transitOption.rentalHub.vehicle}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-serif text-[16px] font-bold text-ink">
                                      ₹{transitOption.rentalHub.dailyRate}
                                    </div>
                                    <span className="font-mono text-[9.5px] text-ink-faint">/ day rental tariff</span>
                                  </div>
                                </div>

                                <div className="mt-3 space-y-2 text-[11px] text-ink-soft border-t border-line-soft pt-2.5">
                                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>100% RTO Commercial Black-and-Yellow Plates • Zero Police Hassle</span>
                                  </div>
                                  <div className="flex items-start gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                                    <span><strong>Pickup Counter:</strong> {transitOption.rentalHub.pickup}</span>
                                  </div>
                                  <div className="flex items-start gap-1.5 text-[10.5px] text-amber-900 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60 leading-relaxed">
                                    <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                    <span><strong>Local Return Rule:</strong> {transitOption.rentalHub.returnPolicy}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Down connector arrow into day card */}
                          <div className="h-4 w-0.5 border-l-2 border-dashed border-accent/40" />
                          <div className="-mt-1 text-accent text-[9px] leading-none mb-1">▼</div>
                        </div>
                      )}

                      {/* Day Card */}
                      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs transition hover:border-ink/30">
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

                          {/* ============================================================ */}
                          {/* HOUR-BY-HOUR OFFLINE TREK & ROUTE SCHEDULE                   */}
                          {/* ============================================================ */}
                          {day.schedule && day.schedule.length > 0 && (() => {
                            const completedCount = day.schedule.filter((m) => checkins[m.id]).length;
                            const totalCount = day.schedule.length;
                            const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                            return (
                              <div className="mt-5 rounded-2xl border-2 border-indigo-500/25 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 p-4 sm:p-5 shadow-xs">
                                {/* Schedule Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3.5">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-[12px] shadow-2xs">
                                        ⏱️
                                      </span>
                                      <h5 className="font-serif text-[15px] font-bold text-ink">
                                        Hour-by-Hour Offline Trek & Route Schedule
                                      </h5>
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                                        100% Device-Local
                                      </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-ink-soft">
                                      Timed stops curated by founder. Device-local audio bell chime sounds when it's time to move to the next spot, even with zero network in deep forest valleys.
                                    </p>
                                  </div>

                                  {/* Day Progress & Action Buttons */}
                                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const firstMilestone = day.schedule![0];
                                        triggerOfflineAlert(firstMilestone, day);
                                      }}
                                      className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition shadow-2xs"
                                      title="Test synthesized bell chime and departure alert in phone memory"
                                    >
                                      <Volume2 className="h-3.5 w-3.5 text-amber-600" />
                                      <span>Test Bell</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSyncCalendar(day)}
                                      className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 transition shadow-2xs"
                                      title="Download .ics file to automatically set phone clock alarms and calendar events"
                                    >
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>Sync Alarms (.ics)</span>
                                    </button>

                                    {completedCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => resetDayCheckins(day)}
                                        className="flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1.5 text-[10.5px] font-medium text-ink-soft hover:bg-paper-deep transition shadow-2xs"
                                        title="Reset milestones progress for this day"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Reset</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Day Check-In Progress Bar */}
                                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-mono">
                                  <span className="text-ink-soft">
                                    Progress: <strong className="text-ink">{completedCount} of {totalCount} stops visited</strong> ({percentComplete}%)
                                  </span>
                                  <div className="h-2 w-32 sm:w-48 overflow-hidden rounded-full bg-indigo-100">
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 transition-all duration-300"
                                      style={{ width: `${percentComplete}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Milestones Vertical List */}
                                <div className="mt-4 space-y-3">
                                  {day.schedule.map((milestone) => {
                                    const isChecked = Boolean(checkins[milestone.id]);
                                    return (
                                      <div
                                        key={milestone.id}
                                        className={cn(
                                          "relative rounded-xl border p-3.5 transition",
                                          isChecked
                                            ? "border-emerald-200 bg-emerald-50/50"
                                            : "border-line bg-white hover:border-indigo-300"
                                        )}
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                          <div className="flex items-start sm:items-center gap-2.5">
                                            <button
                                              type="button"
                                              onClick={() => toggleCheckin(milestone.id)}
                                              className={cn(
                                                "mt-0.5 sm:mt-0 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold transition",
                                                isChecked
                                                  ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs"
                                                  : "border-line bg-paper text-transparent hover:border-indigo-400 hover:text-indigo-400"
                                              )}
                                              title={isChecked ? "Milestone Reached (Click to undo)" : "Click to mark stop as Reached"}
                                            >
                                              ✓
                                            </button>
                                            <div>
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-900">
                                                  {milestone.timeSlot}
                                                </span>
                                                <span className={cn(
                                                  "font-serif text-[13.5px] font-bold",
                                                  isChecked ? "text-ink-soft line-through" : "text-ink"
                                                )}>
                                                  {milestone.title}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0 pl-8 sm:pl-0">
                                            <button
                                              type="button"
                                              onClick={() => triggerOfflineAlert(milestone, day)}
                                              className="flex items-center gap-1 rounded-md bg-paper px-2 py-1 text-[10px] font-mono text-ink-soft hover:bg-paper-deep border border-line"
                                              title="Simulate departure chime for this stop"
                                            >
                                              <Bell className="h-3 w-3 text-accent" />
                                              <span>Departure Chime</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => toggleCheckin(milestone.id)}
                                              className={cn(
                                                "rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
                                                isChecked
                                                  ? "bg-emerald-100 text-emerald-800"
                                                  : "bg-ink text-white hover:bg-ink/90"
                                              )}
                                            >
                                              {isChecked ? "✓ Reached" : "Mark Reached"}
                                            </button>
                                          </div>
                                        </div>

                                        <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft pl-8.5">
                                          {milestone.activity}
                                        </p>

                                        {milestone.founderTip && (
                                          <div className="mt-2 text-[10.5px] text-amber-950 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 leading-relaxed ml-8.5">
                                            <strong>Founder Tip:</strong> {milestone.founderTip}
                                          </div>
                                        )}

                                        <div className="mt-2 flex items-start gap-1.5 text-[10px] font-mono text-indigo-900 bg-indigo-50/60 p-2 rounded-lg border border-indigo-200/50 ml-8.5">
                                          <Bell className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                          <span><strong>Next Destination Alert ({milestone.timeSlot.split("–")[1]?.trim() || "Departure"}):</strong> {milestone.departureAlert}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

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
                                      <button
                                        type="button"
                                        onClick={() => openStay3D(stay, day)}
                                        className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-accent hover:bg-amber-50 transition shadow-2xs w-full sm:w-auto"
                                        title="View interactive 3D layout, dimensions, and room walkthrough"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>View in 3D</span>
                                      </button>
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
                        Circuit Stays Reserved!
                      </h4>
                      <p className="text-[12px] text-ink-soft leading-relaxed">
                        Your bookings for the <strong>{selectedExpedition.title}</strong> have been secured. The partner homestays and resorts along the route have been notified of your arrival.
                      </p>

                      {/* PRIORITY MOBILITY PASS VOUCHER (if selected) */}
                      {mobilityPassCode && activeRentalHub && (
                        <div className="mt-3 rounded-xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-left shadow-xs">
                          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
                            <div className="flex items-center gap-1.5 font-serif text-[13px] font-bold text-emerald-950">
                              <QrCode className="h-4 w-4 text-emerald-600" />
                              <span>StayNth Priority Scooty Pass</span>
                            </div>
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[9px] font-bold text-white uppercase tracking-wider">
                              Priority Held
                            </span>
                          </div>
                          <div className="mt-2.5 font-mono text-[12px] text-ink">
                            Pass Code: <strong className="text-emerald-900 font-bold tracking-wider">{mobilityPassCode}</strong>
                          </div>
                          <div className="mt-1 text-[11px] text-ink-soft">
                            Vehicle: <strong className="text-ink">{activeRentalHub.vehicle}</strong>
                          </div>
                          <div className="mt-1 text-[11px] text-ink-soft">
                            Pickup Counter: <strong className="text-ink">{activeRentalHub.pickup}</strong>
                          </div>
                          <div className="mt-1 text-[11px] text-ink-soft">
                            Daily Tariff: <strong className="text-ink">₹{activeRentalHub.dailyRate}/day</strong> (Pay direct to shop at counter)
                          </div>
                          <p className="mt-2 text-[10px] text-emerald-800 leading-snug bg-white/70 p-2 rounded-lg border border-emerald-200">
                            Show this pass code at Counter #2 upon arrival. Your scooter is pre-reserved with your name tag and will not be given away to walk-in peak holiday crowds.
                          </p>
                        </div>
                      )}

                      {/* Breakdown of all 4 booked stays with 3D models */}
                      <div className="mt-4 space-y-2 text-left">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint font-semibold flex items-center justify-between">
                          <span>Circuit Hotel Vouchers</span>
                          <span className="text-emerald-700">✓ All Locked In</span>
                        </div>
                        {selectedExpedition.days.map((d, dIdx) => {
                          const dayStay = d.stays[selectedTier];
                          if (!dayStay) return null;
                          const cDate = new Date(startDate);
                          cDate.setDate(cDate.getDate() + dIdx);

                          return (
                            <div key={d.dayNumber} className="rounded-xl border border-line bg-paper p-3 text-[11px] space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-mono text-[9px] font-bold text-accent uppercase">
                                    Day {d.dayNumber} • {cDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                                  </span>
                                  <div className="font-bold text-ink text-[12px] leading-tight">
                                    {dayStay.name}
                                  </div>
                                  <div className="text-[10px] text-ink-soft">
                                    {d.toLocation} • {dayStay.type.toUpperCase()}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openStay3D(dayStay, d)}
                                  className="flex items-center gap-1 rounded-lg border border-accent/40 bg-white px-2 py-1 text-[10px] font-semibold text-accent hover:bg-amber-50 shadow-2xs shrink-0"
                                  title="Open interactive 3D floor plan walkthrough"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>3D Plan</span>
                                </button>
                              </div>

                              <div className="flex items-center justify-between border-t border-line-soft pt-1 font-mono text-[10px] text-ink-soft">
                                <span>Tariff: {dayStay.pricePerNight > 0 ? `₹${dayStay.pricePerNight.toLocaleString()}` : "Return Leg"}</span>
                                <span className="text-emerald-700 font-bold">100% Pay at Hotel</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 1-Tap Complete Circuit Alarms Sync Button */}
                      <button
                        type="button"
                        onClick={handleSyncAllDays}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-indigo-700 shadow-sm transition"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>Sync 4 Days to Phone Alarms (.ics)</span>
                      </button>

                      <div className="rounded-xl bg-paper p-3 font-mono text-[10.5px] text-ink-soft border border-line text-left space-y-1">
                        <div className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Fast-Track KYC Transmitted
                        </div>
                        <div>Zero Advance Deposit • Hand over ID at front desks for immediate room keys.</div>
                      </div>

                      <button
                        onClick={() => {
                          setBookingSuccess(false);
                          setMobilityPassCode(null);
                        }}
                        className="w-full rounded-xl border border-line bg-white py-2 text-[11px] font-medium text-ink-soft hover:bg-paper-deep"
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
                        {activeRentalHub && includeScootyHold && (
                          <div className="flex items-center justify-between text-[11px] mt-1 text-emerald-800">
                            <span>Priority Scooty Pass:</span>
                            <span className="font-mono font-bold">+₹49 lock fee</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10.5px] text-ink-faint mt-1">
                          <span>Pay at check-in / pickup:</span>
                          <span>100% direct to hosts & shop</span>
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

                      {/* Optional Priority Scooty Pass Hold */}
                      {activeRentalHub && (
                        <div className="rounded-xl border border-emerald-400/50 bg-emerald-50/70 p-3.5 flex items-start gap-2.5 shadow-2xs">
                          <input
                            type="checkbox"
                            id="scootyHold"
                            checked={includeScootyHold}
                            onChange={(e) => setIncludeScootyHold(e.target.checked)}
                            className="mt-0.5 rounded border-line text-emerald-600 focus:ring-emerald-500"
                          />
                          <label htmlFor="scootyHold" className="text-[11px] text-ink leading-snug cursor-pointer">
                            <strong className="text-emerald-950 block flex items-center gap-1.5">
                              <span>🛵 Include Priority Gokarna Scooty Hold (+₹49):</span>
                              <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[8.5px] font-bold text-white uppercase tracking-wider">
                                Peak Guarantee
                              </span>
                            </strong>
                            <span className="text-emerald-900/90 mt-0.5 block text-[10.5px]">
                              Guarantees an Activa 6G held with your name tag at Counter #2 (Gokarna Bus Stand). Never roam around shops or face weekend price-gouging.
                            </span>
                          </label>
                        </div>
                      )}

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

      {/* 3D Property Walkthrough Modal */}
      {previewListing && (
        <PropertyDetail
          listing={previewListing}
          initialView="3d"
          onClose={() => setPreviewListing(null)}
          onRequest={() => {
            showToast("Stay inquiry recorded!");
          }}
          requests={[]}
          onReview={() => {}}
          onReport={() => {}}
          onOpenRequests={() => {}}
        />
      )}

      {/* 100% Device-Local High-Priority Offline Departure Alert Modal */}
      {activeOfflineAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-pop">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border-2 border-amber-400 bg-white shadow-2xl text-ink">
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-[20px] shadow-2xs animate-bounce">
                  🔔
                </span>
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-amber-100 font-bold block">
                    100% Device-Local Offline Alert (Zero Network Required)
                  </span>
                  <h3 className="font-serif text-[17px] font-bold leading-tight">
                    {activeOfflineAlert.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveOfflineAlert(null)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <div className="font-mono text-[11px] font-bold text-amber-800">
                  Day {activeOfflineAlert.dayNumber} Milestone: {activeOfflineAlert.timeSlot}
                </div>
                <div className="font-serif text-[16px] font-bold text-ink mt-0.5">
                  {activeOfflineAlert.milestoneTitle}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-paper-deep p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-faint font-mono">
                  Departure Action:
                </div>
                <p className="mt-1 text-[13px] font-medium text-ink leading-relaxed">
                  {activeOfflineAlert.departureAlert}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={playOfflineChime}
                  className="flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-2 text-[11px] font-semibold text-ink hover:bg-paper-deep"
                >
                  <Volume2 className="h-4 w-4 text-accent" />
                  <span>Replay Audio Chime</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      toggleCheckin(activeOfflineAlert.milestoneId);
                      setActiveOfflineAlert(null);
                    }}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-emerald-700 shadow-sm"
                  >
                    ✓ Mark Reached & Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOfflineAlert(null)}
                    className="rounded-xl border border-line bg-white px-3 py-2 text-[12px] font-medium text-ink-soft hover:bg-paper-deep"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-line bg-paper py-6 text-center text-[11px] text-ink-soft font-mono">
        StayNth Expeditions • Ground-Scouted Itineraries with 3-Tier Verified Stays • 100% Tax-Deductible Founder Field Operations
      </footer>
    </div>
  );
}
