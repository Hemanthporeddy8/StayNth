import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Box,
  CheckCircle2,
  Eye,
  Images,
  Download,
  Share2,
  Flag,
  BadgeCheck,
  MapPin,
  Maximize,
  Send,
  Star,
  X,
  Car,
  Bike,
  Camera,
  UploadCloud,
  ShieldCheck,
  QrCode,
  Phone,
  Sparkles,
} from "lucide-react";
import { House3D } from "@/components/House3D";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { exportPropertyBrochure } from "@/lib/brochure";
import {
  formatPrice,
  newRequestId,
  type PropertyListing,
  type PropertyRequest,
  type PropertyReview,
  type PropertyReport,
} from "@/lib/properties";
import { cn } from "@/utils/cn";

const field = "h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[12px] text-ink outline-none focus:border-ink/40";

export function PropertyDetail({
  listing,
  initialView,
  onClose,
  onRequest,
  requests,
  onReview,
  onReport,
  onOpenRequests,
}: {
  listing: PropertyListing;
  initialView: "photos" | "3d";
  onClose: () => void;
  onRequest: (request: PropertyRequest) => void;
  requests: PropertyRequest[];
  onReview: (review: PropertyReview) => void;
  onReport: (report: PropertyReport) => void;
  onOpenRequests: () => void;
}) {
  const [view, setView] = useState<"photos" | "3d">(initialView);
  const [floorIndex, setFloorIndex] = useState(0);
  const activePlan = listing.floorPlans?.[floorIndex]?.plan ?? listing.plan;
  const [photoIndex, setPhotoIndex] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [inventoryId, setInventoryId] = useState(listing.inventory?.[0]?.id ?? "");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Incorrect information");
  const [reportDetails, setReportDetails] = useState("");
  const [brochureBusy, setBrochureBusy] = useState(false);
  const [shared, setShared] = useState(false);
  const [fastTrack, setFastTrack] = useState(false);
  const [idFile, setIdFile] = useState<string | null>(null);
  const [idFileName, setIdFileName] = useState("");
  const [selfieFile, setSelfieFile] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<"form" | "upi">("form");
  const [utrNumber, setUtrNumber] = useState("");
  const selectedInventory = listing.inventory?.find((item) => item.id === inventoryId);
  const nightlyRate = selectedInventory?.price ?? listing.price;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const platformFee = listing.priceUnit === "night" ? 49 : 0;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && view !== "3d") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, view]);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const difference = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(0, Math.ceil(difference / 86400000));
  }, [startDate, endDate]);
  const total = listing.priceUnit === "night" ? nights * nightlyRate : listing.priceUnit === "month" ? listing.price : 0;

  const handleIdUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setIdFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setIdFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSelfieUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSelfieFile(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleProceedToPayment = () => {
    if (!guestName.trim() || !email.includes("@")) {
      setError("Enter your name and a valid email address.");
      return;
    }
    if (!startDate) {
      setError(listing.mode === "sale" ? "Choose a preferred viewing date." : "Choose a start date.");
      return;
    }
    if (startDate < today) {
      setError("Choose today or a future date.");
      return;
    }
    if (listing.priceUnit === "night" && (!endDate || nights < 1)) {
      setError("Check-out must be at least one night after check-in.");
      return;
    }
    if (listing.priceUnit === "night") {
      const conflict = requests.some((request) => request.status === "approved" &&
        (!inventoryId || !request.inventoryId || request.inventoryId === inventoryId) &&
        startDate < request.endDate && endDate > request.startDate);
      if (conflict) {
        setError("Those dates overlap an approved booking. Choose available dates in the calendar.");
        return;
      }
    }
    if (listing.priceUnit === "night") {
      setPaymentStep("upi");
      setError(null);
    } else {
      finalizeBooking();
    }
  };

  const finalizeBooking = () => {
    const request: PropertyRequest = {
      id: newRequestId(),
      propertyId: listing.id,
      propertyTitle: listing.title,
      kind: listing.mode === "sale" ? "viewing" : "booking",
      guestName: guestName.trim(),
      email: email.trim(),
      startDate,
      endDate: listing.priceUnit === "night" ? endDate : "",
      guests,
      message: message.trim(),
      total,
      platformFee: listing.priceUnit === "night" ? platformFee : 0,
      payAtHotel: total,
      paymentUtr: utrNumber.trim() || undefined,
      fastTrackVerified: fastTrack && !!idFile,
      idPhotoUrl: idFile || undefined,
      selfieUrl: selfieFile || undefined,
      inventoryId: inventoryId || undefined,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    onRequest(request);
    setSubmitted(request.id);
    setError(null);
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#property=${listing.id}`;
    try {
      if (navigator.share) await navigator.share({ title: listing.title, text: `Explore ${listing.title} in 3D`, url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch {
      window.prompt("Copy this property link", url);
    }
  };

  const downloadBrochure = async () => {
    setBrochureBusy(true);
    try { await exportPropertyBrochure(listing); }
    catch { setError("The brochure could not be generated. Try again while online so the cover photo can load."); }
    setBrochureBusy(false);
  };

  return (
    <div className="animate-fade fixed inset-0 z-[65] bg-paper">
      <div className="flex h-[62px] items-center justify-between gap-3 border-b border-line bg-white px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onClose} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-2 text-[11px] font-medium text-ink-soft hover:bg-paper-deep">
            <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">All properties</span>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-semibold text-ink">{listing.title}</h1>
            <p className="flex items-center gap-1 truncate text-[10px] text-ink-faint"><MapPin className="h-2.5 w-2.5" /> {listing.location}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-ink-soft sm:block">
            {listing.type} · {listing.mode}
          </span>
          <button onClick={share} className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-2 text-[10px] text-ink-soft hover:bg-paper-deep"><Share2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{shared ? "Copied" : "Share"}</span></button>
          <button onClick={() => void downloadBrochure()} disabled={brochureBusy} className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-2 text-[10px] text-ink-soft hover:bg-paper-deep disabled:opacity-50"><Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">{brochureBusy ? "Creating…" : "PDF brochure"}</span></button>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-faint hover:bg-paper-deep hover:text-ink" aria-label="Close property">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="scroll-warm h-[calc(100dvh-62px)] overflow-y-auto">
        <div className="mx-auto max-w-7xl p-3 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex rounded-xl border border-line bg-white p-1">
                  <button onClick={() => setView("photos")} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium", view === "photos" ? "bg-ink text-white" : "text-ink-soft")}>
                    <Images className="h-3.5 w-3.5" /> Photos
                  </button>
                  <button onClick={() => setView("3d")} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium", view === "3d" ? "bg-ink text-white" : "text-ink-soft")}>
                    <Box className="h-3.5 w-3.5" /> 3D walkthrough
                  </button>
                </div>
                <span className="hidden items-center gap-1 font-mono text-[9px] uppercase tracking-wide text-ink-faint sm:flex">
                  <Eye className="h-3 w-3" /> Explore before you request
                </span>
              </div>

              {view === "3d" ? (
                <div className="relative h-[470px] overflow-hidden rounded-2xl border border-line bg-[#e7e4dc] shadow-sm sm:h-[560px]">
                  <House3D key={floorIndex} plan={activePlan} />
                  {listing.floorPlans && listing.floorPlans.length > 1 && (
                    <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 rounded-lg border border-white/60 bg-white/90 p-1 shadow-sm backdrop-blur">
                      {listing.floorPlans.map((floor, index) => (
                        <button key={floor.name} onClick={() => setFloorIndex(index)} className={cn("rounded-md px-2.5 py-1 text-[9px] font-medium", index === floorIndex ? "bg-ink text-white" : "text-ink-soft")}>{floor.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative h-[340px] overflow-hidden rounded-2xl bg-paper-deep sm:h-[470px]">
                  {listing.photos.length ? (
                    <>
                      <img src={listing.photos[photoIndex]?.url} alt={listing.photos[photoIndex]?.alt} className="h-full w-full object-cover" />
                      {listing.photos.length > 1 && (
                        <>
                          <button onClick={() => setPhotoIndex((photoIndex - 1 + listing.photos.length) % listing.photos.length)} className="absolute left-3 top-1/2 rounded-full bg-white/90 p-2.5 text-ink shadow-lg" aria-label="Previous photo"><ArrowLeft className="h-4 w-4" /></button>
                          <button onClick={() => setPhotoIndex((photoIndex + 1) % listing.photos.length)} className="absolute right-3 top-1/2 rounded-full bg-white/90 p-2.5 text-ink shadow-lg" aria-label="Next photo"><ArrowRight className="h-4 w-4" /></button>
                        </>
                      )}
                      <span className="absolute bottom-3 left-3 rounded-full bg-ink/60 px-2.5 py-1 font-mono text-[9px] text-white backdrop-blur">{photoIndex + 1} / {listing.photos.length}</span>
                    </>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Images className="h-7 w-7 text-ink-faint" />
                      <p className="mt-2 text-[12px] font-medium text-ink-soft">No property photos uploaded</p>
                      <button onClick={() => setView("3d")} className="mt-2 flex items-center gap-1 text-[11px] font-medium text-accent"><Box className="h-3.5 w-3.5" /> Explore the 3D model instead</button>
                    </div>
                  )}
                </div>
              )}

              {view === "photos" && listing.photos.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
                  {listing.photos.map((photo, index) => (
                    <button key={photo.url} onClick={() => setPhotoIndex(index)} className={cn("h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2", index === photoIndex ? "border-accent" : "border-transparent opacity-65")}>
                      <img src={photo.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5 border-b border-line pb-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="micro flex items-center gap-1 text-ink-faint">{listing.type} · hosted by {listing.ownerName} {listing.verification === "verified" && <BadgeCheck className="h-3.5 w-3.5 text-blueprint" />}</p>
                    <h2 className="mt-1 font-serif text-[30px] leading-tight text-ink">{listing.title}</h2>
                    <p className="mt-1 flex items-center gap-1 text-[12px] text-ink-soft"><MapPin className="h-3.5 w-3.5" /> {listing.location}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-ink-soft">
                    <Star className="h-3.5 w-3.5 fill-current text-accent" /> {listing.reviews ? `${listing.rating} · ${listing.reviews} reviews` : "New listing"}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[11px] text-ink-soft"><BedDouble className="h-4 w-4" /> {listing.bedrooms} bedrooms · {listing.beds} beds</span>
                  <span className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[11px] text-ink-soft"><Bath className="h-4 w-4" /> {listing.bathrooms} bathrooms</span>
                  <span className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-[11px] text-ink-soft"><Maximize className="h-4 w-4" /> {listing.area.toLocaleString()} ft²</span>
                </div>
              </div>

              <div className="py-5">
                <h3 className="text-[14px] font-semibold text-ink">About this property</h3>
                <p className="mt-2 max-w-3xl text-[12.5px] leading-7 text-ink-soft">{listing.description}</p>
              </div>
              {listing.inventory && listing.inventory.length > 0 && (
                <div className="border-t border-line pt-5">
                  <h3 className="text-[14px] font-semibold text-ink">Room & bed categories</h3>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {listing.inventory.map((item) => (
                      <button key={item.id} onClick={() => setInventoryId(item.id)} className={cn("rounded-xl border p-3 text-left", inventoryId === item.id ? "border-accent bg-accent-soft/50" : "border-line bg-white")}>
                        <span className="flex items-center justify-between text-[12px] font-semibold text-ink"><span>{item.name}</span><span>${item.price}</span></span>
                        <span className="mt-1 block text-[10px] text-ink-faint">Sleeps {item.capacity} · {item.available} available</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-t border-line pt-5">
                <h3 className="text-[14px] font-semibold text-ink">Amenities</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {listing.amenities.map((amenity) => <span key={amenity} className="rounded-full bg-paper-deep px-3 py-1.5 text-[10.5px] text-ink-soft">{amenity}</span>)}
                </div>
              </div>

              <div className="border-t border-line py-5">
                <h3 className="text-[14px] font-semibold text-ink">Reviews</h3>
                <div className="mt-2 space-y-2">
                  {(listing.reviewsList ?? []).slice(0, 4).map((review) => (
                    <div key={review.id} className="rounded-xl border border-line-soft bg-white p-3">
                      <p className="flex items-center justify-between text-[11px] font-medium text-ink"><span>{review.author}</span><span className="flex items-center gap-1 text-accent"><Star className="h-3 w-3 fill-current" />{review.rating}</span></p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{review.text}</p>
                    </div>
                  ))}
                  {!listing.reviewsList?.length && <p className="text-[11px] text-ink-faint">No written reviews yet. Sample ratings are shown where provided by the owner.</p>}
                </div>
                <div className="mt-3 rounded-xl border border-line bg-white p-3">
                  <p className="text-[11px] font-semibold text-ink">Write a local review</p>
                  <div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} onClick={() => setReviewRating(rating)}><Star className={cn("h-4 w-4", rating <= reviewRating ? "fill-current text-accent" : "text-line")} /></button>)}</div>
                  <input value={reviewAuthor} onChange={(event) => setReviewAuthor(event.target.value)} placeholder="Your name" className={cn(field, "mt-2")} />
                  <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={2} placeholder="What should guests or buyers know?" className="mt-2 w-full resize-none rounded-lg border border-line p-2 text-[11px]" />
                  <button onClick={() => {
                    if (!reviewText.trim()) return;
                    onReview({ id: newRequestId(), author: reviewAuthor.trim() || "Local guest", rating: reviewRating, text: reviewText.trim(), createdAt: new Date().toISOString() });
                    setReviewText("");
                  }} className="mt-2 rounded-lg bg-ink px-3 py-1.5 text-[10px] text-white">Publish review locally</button>
                </div>
                <button onClick={() => setReportOpen((value) => !value)} className="mt-4 flex items-center gap-1.5 text-[10px] text-ink-faint hover:text-ink"><Flag className="h-3 w-3" /> Report this listing</button>
                {reportOpen && (
                  <div className="mt-2 rounded-xl border border-line bg-white p-3">
                    <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className={field}><option>Incorrect information</option><option>Unavailable property</option><option>Safety concern</option><option>Suspicious listing</option></select>
                    <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} rows={2} className="mt-2 w-full rounded-lg border border-line p-2 text-[11px]" placeholder="Add details for the review team" />
                    <button onClick={() => { onReport({ id: newRequestId(), reason: reportReason, details: reportDetails.trim(), createdAt: new Date().toISOString() }); setReportOpen(false); setReportDetails(""); }} className="mt-2 rounded-lg border border-red-200 px-3 py-1.5 text-[10px] text-red-600">Submit report locally</button>
                  </div>
                )}

                {/* Local Travel & Vehicle Rentals Sponsor Card */}
                <div className="mt-6 rounded-2xl border border-accent/25 bg-gradient-to-br from-paper via-white to-orange-50/40 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white shadow-xs">
                        <Car className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-[12.5px] font-semibold text-ink">Local Travel & Rentals · {listing.location}</h4>
                        <p className="text-[9.5px] text-ink-faint">Verified StayNth Mobility Partner</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[8.5px] font-semibold text-emerald-700">Verified Partner</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 text-[10.5px]">
                    <div className="rounded-xl border border-line/70 bg-white p-2.5 shadow-xs">
                      <div className="flex items-center gap-1.5 font-medium text-ink"><Bike className="h-3.5 w-3.5 text-accent" /> Scooters</div>
                      <p className="mt-0.5 text-[9px] text-ink-faint">Activa / Access from ₹350/day</p>
                    </div>
                    <div className="rounded-xl border border-line/70 bg-white p-2.5 shadow-xs">
                      <div className="flex items-center gap-1.5 font-medium text-ink"><Car className="h-3.5 w-3.5 text-accent" /> Cabs & Drops</div>
                      <p className="mt-0.5 text-[9px] text-ink-faint">Sedan / SUV Airport transfers</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 rounded-xl border border-line/70 bg-white p-2.5 shadow-xs">
                      <div className="flex items-center gap-1.5 font-medium text-ink"><Sparkles className="h-3.5 w-3.5 text-accent" /> Self-Drive</div>
                      <p className="mt-0.5 text-[9px] text-ink-faint">Thar & Swift rentals</p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <a
                      href={`https://wa.me/919876543210?text=Hi%2C+I+am+staying+at+${encodeURIComponent(listing.title)}+and+need+local+transport+in+${encodeURIComponent(listing.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink py-2 text-[11px] font-medium text-white transition hover:bg-ink/85 shadow-sm"
                    >
                      <Phone className="h-3 w-3" /> WhatsApp Partner
                    </a>
                    <a
                      href="tel:+919876543210"
                      className="flex items-center justify-center rounded-lg border border-line bg-white px-3.5 py-2 text-[11px] font-medium text-ink-soft hover:bg-paper"
                    >
                      Call
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:sticky lg:top-5 lg:self-start">
              <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                {submitted ? (
                  <div className="py-4 text-center">
                    <CheckCircle2 className="mx-auto h-9 w-9 text-moss" />
                    <h3 className="mt-3 font-serif text-[22px] text-ink">Booking Confirmed</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">Booking Reference: <span className="font-mono font-semibold text-ink">{submitted}</span></p>

                    {fastTrack && idFile && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-mono text-[9px] font-semibold text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="h-3.5 w-3.5" /> ⚡ 10-Second Express Check-in Active
                      </div>
                    )}

                    <div className="mt-4 rounded-xl border border-line-soft bg-paper p-3 text-left text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-ink-faint">StayNth Platform Fee:</span>
                        <span className="font-medium text-emerald-700">₹{platformFee} Paid via UPI</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint">Room Tariff:</span>
                        <span className="font-semibold text-ink">₹{total.toLocaleString()} (Pay at Hotel)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint">Dates:</span>
                        <span className="text-ink">{startDate} → {endDate || "Viewing"}</span>
                      </div>
                    </div>

                    <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">Your booking has been registered with the host. Show this reference at check-in.</p>
                    <button onClick={onOpenRequests} className="mt-4 w-full rounded-lg bg-ink py-2 text-[11px] font-medium text-white shadow-sm">View my requests</button>
                    <button onClick={onClose} className="mt-2 w-full py-1 text-[10px] text-ink-faint hover:text-ink">Back to properties</button>
                  </div>
                ) : paymentStep === "upi" ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-accent/20 bg-gradient-to-b from-orange-50/50 to-white p-3 text-center">
                      <span className="inline-flex rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-[9px] font-semibold text-accent">
                        StayNth Booking Guarantee Fee
                      </span>
                      <p className="mt-1 font-serif text-[26px] font-bold text-ink">₹{platformFee}</p>
                      <p className="text-[10px] text-ink-soft">Room tariff of <strong className="text-ink">₹{total.toLocaleString()}</strong> is payable directly to hotel at check-in</p>

                      <div className="mt-3 mx-auto w-36 h-36 rounded-xl border border-line bg-white p-2 flex flex-col items-center justify-center shadow-xs">
                        <div className="w-full h-full border-2 border-dashed border-ink/20 rounded-lg flex flex-col items-center justify-center bg-paper/50">
                          <QrCode className="h-16 w-16 text-ink" />
                          <span className="mt-1 font-mono text-[8px] font-bold tracking-wider text-ink">UPI: staynth@upi</span>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-center gap-1.5 font-mono text-[10px] text-ink-soft">
                        <span>UPI ID: <strong className="text-ink">staynth@upi</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) navigator.clipboard.writeText("staynth@upi");
                            alert("UPI ID 'staynth@upi' copied to clipboard!");
                          }}
                          className="rounded bg-white px-1.5 py-0.5 text-[9px] border border-line hover:text-ink"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-1 font-mono text-[8.5px] uppercase tracking-wide text-ink-faint">
                        12-Digit UPI Transaction / UTR No. (Optional)
                      </label>
                      <input
                        value={utrNumber}
                        onChange={(e) => setUtrNumber(e.target.value)}
                        placeholder="e.g. 431289456712"
                        className={field}
                      />
                    </div>

                    {error && <p className="rounded-lg bg-red-50 px-2.5 py-2 text-[10px] text-red-700">{error}</p>}

                    <button
                      onClick={finalizeBooking}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 text-[12px] font-semibold text-white transition hover:bg-accent/90 shadow-sm"
                    >
                      <CheckCircle2 className="h-4 w-4" /> I Have Paid ₹{platformFee} — Confirm Reservation
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentStep("form")}
                      className="w-full py-1 text-center text-[10.5px] text-ink-faint hover:text-ink"
                    >
                      ← Back to booking details
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[20px] font-semibold tracking-[-0.03em] text-ink">{formatPrice(listing)}</p>
                    <p className="mt-0.5 text-[10px] text-ink-faint">{listing.mode === "sale" ? "Request a property viewing" : "Pay ₹49 fee now · Room tariff payable at hotel"}</p>

                    <div className="mt-4 space-y-2.5">
                      {listing.inventory && listing.inventory.length > 0 && (
                        <label className="block"><span className="mb-1 block font-mono text-[8.5px] uppercase tracking-wide text-ink-faint">Room category</span><select value={inventoryId} onChange={(event) => setInventoryId(event.target.value)} className={field}>{listing.inventory.map((item) => <option key={item.id} value={item.id}>{item.name} · ${item.price}</option>)}</select></label>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <label className={listing.priceUnit === "night" ? "" : "col-span-2"}>
                          <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-wide text-ink-faint">{listing.mode === "sale" ? "Viewing date" : listing.priceUnit === "month" ? "Move-in" : "Check-in"}</span>
                          <input type="date" min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} className={field} />
                        </label>
                        {listing.priceUnit === "night" && (
                          <label>
                            <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-wide text-ink-faint">Check-out</span>
                            <input type="date" min={startDate || today} value={endDate} onChange={(event) => setEndDate(event.target.value)} className={field} />
                          </label>
                        )}
                      </div>
                      {listing.priceUnit === "night" && (
                        <AvailabilityCalendar requests={requests} startDate={startDate} endDate={endDate} onChange={(start, end) => { setStartDate(start); setEndDate(end); }} />
                      )}
                      {listing.mode !== "sale" && (
                        <label className="block">
                          <span className="mb-1 block font-mono text-[8.5px] uppercase tracking-wide text-ink-faint">Guests</span>
                          <select value={guests} onChange={(event) => setGuests(Number(event.target.value))} className={field}>
                            {Array.from({ length: Math.min(16, Math.max(2, listing.beds * 2)) }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} guest{value > 1 ? "s" : ""}</option>)}
                          </select>
                        </label>
                      )}
                      <input value={guestName} onChange={(event) => setGuestName(event.target.value)} className={field} placeholder="Your name" aria-label="Your name" />
                      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={field} placeholder="Email address" aria-label="Email address" />
                      <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} className="w-full resize-none rounded-lg border border-line bg-white p-2.5 text-[11px] outline-none focus:border-ink/40" placeholder={listing.mode === "sale" ? "Questions or preferred viewing time..." : "Add a note for the owner..."} />

                      {/* Fast-Track Check-In Card */}
                      {listing.priceUnit === "night" && (
                        <div className="rounded-xl border border-accent/25 bg-orange-50/30 p-2.5">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={fastTrack}
                              onChange={(e) => setFastTrack(e.target.checked)}
                              className="mt-0.5 rounded accent-accent"
                            />
                            <div className="text-[11px] leading-snug">
                              <span className="font-semibold text-ink flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5 text-accent" /> ⚡ 10-Second Express Check-In
                              </span>
                              <span className="block text-[9.5px] text-ink-faint">Skip reception queues & paperwork. Attach Govt ID & live selfie.</span>
                            </div>
                          </label>
                          {fastTrack && (
                            <div className="mt-2.5 space-y-2 border-t border-accent/20 pt-2 text-[10px]">
                              <div>
                                <span className="block font-medium text-ink mb-1">1. Govt ID (Aadhaar / Passport / DL)</span>
                                <label className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink-soft cursor-pointer hover:bg-paper">
                                  <UploadCloud className="h-3.5 w-3.5 text-accent" />
                                  <span className="truncate">{idFileName || "Upload ID photo or PDF"}</span>
                                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleIdUpload(e.target.files)} />
                                </label>
                              </div>
                              <div>
                                <span className="block font-medium text-ink mb-1">2. Quick Live Face Selfie</span>
                                <label className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink-soft cursor-pointer hover:bg-paper">
                                  <Camera className="h-3.5 w-3.5 text-accent" />
                                  <span>{selfieFile ? "Selfie captured ✓" : "Snap or upload selfie"}</span>
                                  <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleSelfieUpload(e.target.files)} />
                                </label>
                              </div>
                              <p className="text-[8.5px] text-ink-faint">Encrypted & auto-expires 7 days after checkout for your privacy.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {listing.priceUnit === "night" && nights > 0 && (
                      <div className="mt-3 border-t border-line-soft pt-3 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between text-ink-soft">
                          <span>Room Tariff ({nights} night{nights > 1 ? "s" : ""}):</span>
                          <span className="font-semibold text-ink">₹{total.toLocaleString()}</span>
                        </div>
                        <p className="text-[9.5px] text-ink-faint">Payable directly at hotel reception upon check-in</p>
                        <div className="flex items-center justify-between text-ink-soft pt-1 border-t border-line-soft/60">
                          <span className="flex items-center gap-1 text-ink font-medium">
                            <Sparkles className="h-3 w-3 text-accent" /> StayNth Guarantee & Platform Fee:
                          </span>
                          <span className="font-semibold text-accent">₹{platformFee}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-line font-medium text-ink">
                          <span>Payable Now Online:</span>
                          <span className="text-[13px] font-bold text-accent">₹{platformFee}</span>
                        </div>
                      </div>
                    )}

                    {listing.priceUnit === "month" && <p className="mt-3 border-t border-line-soft pt-3 text-[10px] text-ink-faint">First month estimate: ₹{total.toLocaleString()}</p>}
                    {error && <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-[10px] text-red-700">{error}</p>}

                    <button
                      onClick={handleProceedToPayment}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 text-[12px] font-semibold text-white transition hover:bg-accent/90 shadow-sm"
                    >
                      <Send className="h-3.5 w-3.5" /> {listing.priceUnit === "night" ? `Proceed to Book (Pay ₹${platformFee} Fee)` : listing.mode === "sale" ? "Request viewing" : "Request booking"}
                    </button>
                    <p className="mt-2 flex items-center justify-center gap-1 text-center font-mono text-[8px] uppercase tracking-wide text-ink-faint">
                      <ShieldCheck className="h-2.5 w-2.5 text-moss" /> 100% Secure reservation · Instant confirmation
                    </p>
                  </>
                )}
              </div>
              <div className="mt-3 rounded-xl border border-line bg-paper/60 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink"><Box className="h-3.5 w-3.5 text-accent" /> Actual plan, actual 3D</p>
                <p className="mt-1 text-[10px] leading-relaxed text-ink-soft">This model is generated from the listing's {listing.floorPlans?.length ?? 1}-floor, {activePlan.rooms.length}-room plan, not an AI image.</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
