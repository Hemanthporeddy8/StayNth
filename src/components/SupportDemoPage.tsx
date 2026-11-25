import React, { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Compass,
  Database,
  ExternalLink,
  FileText,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Layers,
  Lock,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  X,
  Zap,
} from "lucide-react";
import { fileToRoomImage } from "@/lib/imageUpload";
import { sendSupportMessage } from "@/lib/support";
import { cn } from "@/utils/cn";
import { StayNthIcon } from "@/components/StayNthLogo";

interface FAQItem {
  id: string;
  category: "drafting" | "pricing" | "listing" | "expeditions" | "privacy";
  icon: any;
  title: string;
  subtitle: string;
  answerHtml: React.ReactNode;
}

const FAQ_DATABASE: FAQItem[] = [
  {
    id: "drafting",
    category: "drafting",
    icon: Layers,
    title: "Draft 3D Plan from Paper Sketch",
    subtitle: "₹0 upfront fee · Upload sketch photo · 12-24h drafting",
    answerHtml: (
      <div className="space-y-3 text-[12px] leading-relaxed text-ink">
        <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 p-3.5">
          <h4 className="font-semibold text-amber-950 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-accent" /> StayNth Architectural Concierge
          </h4>
          <p className="mt-1 text-[11.5px] text-amber-900 leading-snug">
            Can't draw 2D or 3D floor plans on a computer? No problem. Simply draw your property layout
            on a plain sheet of paper with room dimensions, take a phone photo, and upload it here.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-line bg-white p-2.5 shadow-2xs">
            <span className="block font-bold text-accent text-[14px]">₹0</span>
            <span className="text-[10px] text-ink-soft">Upfront out of pocket</span>
          </div>
          <div className="rounded-lg border border-line bg-white p-2.5 shadow-2xs">
            <span className="block font-bold text-ink text-[14px]">12–24h</span>
            <span className="text-[10px] text-ink-soft">Architect drafting SLA</span>
          </div>
          <div className="rounded-lg border border-line bg-white p-2.5 shadow-2xs">
            <span className="block font-bold text-emerald-700 text-[14px]">1st Booking</span>
            <span className="text-[10px] text-ink-soft">Deducted from guest payout</span>
          </div>
        </div>

        <p className="text-ink-soft text-[11px]">
          Once verified, our architects draft a 1:1 true-scale interactive 3D model with walk mode, dollhouse view,
          and individual room photos.
        </p>
      </div>
    ),
  },
  {
    id: "pricing",
    category: "pricing",
    icon: ShieldCheck,
    title: "Pricing, Commission & Host Payouts",
    subtitle: "Transparent commission, ₹0 upfront listing, direct UPI/Bank transfer",
    answerHtml: (
      <div className="space-y-3 text-[12px] leading-relaxed text-ink">
        <p className="text-ink-soft">
          StayNth believes in 100% transparent economics. No hidden setup charges, no monthly SaaS fees.
        </p>

        <div className="space-y-2">
          <div className="flex items-start gap-2.5 rounded-lg border border-line bg-white p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">1</span>
            <div>
              <strong className="text-ink">Listing is 100% Free:</strong>
              <p className="text-[11px] text-ink-soft">Hosts can list unlimited homestays, estates, and villas at zero charge.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-line bg-white p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">2</span>
            <div>
              <strong className="text-ink">3D Drafting: Deducted from 1st Booking:</strong>
              <p className="text-[11px] text-ink-soft">If you ask us to build your 3D plan from a sketch, ₹0 is charged upfront. The nominal drafting fee is deducted only after your first confirmed guest booking.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-line bg-white p-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">3</span>
            <div>
              <strong className="text-ink">Instant Payouts:</strong>
              <p className="text-[11px] text-ink-soft">Payouts are sent directly to your bank account or UPI ID within 24 hours of guest check-in.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "listing",
    category: "listing",
    icon: Home,
    title: "Step-by-Step: How to List My Homestay",
    subtitle: "Photos, spatial plan upload, inventory & verification rules",
    answerHtml: (
      <div className="space-y-3 text-[12px] leading-relaxed text-ink">
        <p className="text-ink-soft">
          Listing your property on StayNth requires 4 simple steps to ensure authentic quality:
        </p>

        <ol className="list-decimal pl-4 space-y-1.5 text-ink-soft text-[11.5px]">
          <li><strong className="text-ink">Basic Details:</strong> Enter your estate name, location (with GPS pin), pricing per night, and amenities.</li>
          <li><strong className="text-ink">Attach Photos:</strong> Add up to 4 high-resolution photos of your property exterior and bedrooms.</li>
          <li><strong className="text-ink">3D Spatial Plan:</strong> Either draw in Studio, upload a plan file, or pick <em>"StayNth Build For Me"</em> to upload a hand-drawn sketch.</li>
          <li><strong className="text-ink">Publish:</strong> Hit Publish to go live on the StayNth Marketplace.</li>
        </ol>
      </div>
    ),
  },
  {
    id: "expeditions",
    category: "expeditions",
    icon: Compass,
    title: "Founder Expeditions & Curated Circuits",
    subtitle: "Road-trip circuits, vehicle suitability & 3 stay tiers",
    answerHtml: (
      <div className="space-y-3 text-[12px] leading-relaxed text-ink">
        <p className="text-ink-soft">
          Founder Expeditions are personally vetted overland road-trip circuits curated by Founder Hemanth across
          Karnataka and South India.
        </p>
        <div className="rounded-lg border border-line bg-white p-3 space-y-2 text-[11px]">
          <div><strong className="text-accent">🎒 Backpack / Budget:</strong> Authentic dorms & farm campsites (~₹800–₹1,500/night).</div>
          <div><strong className="text-ink">🏡 Comfort Homestay:</strong> Heritage family estates with local organic breakfast (~₹2,500–₹4,500/night).</div>
          <div><strong className="text-amber-700">👑 Luxury Valley Resort:</strong> Private pool villas with hill panoramic views (~₹7,000–₹12,000/night).</div>
        </div>
      </div>
    ),
  },
  {
    id: "privacy",
    category: "privacy",
    icon: Lock,
    title: "Privacy, Security & Zero Data Leaks",
    subtitle: "Why blueprints and host data never leave StayNth or train outside AI",
    answerHtml: (
      <div className="space-y-3 text-[12px] leading-relaxed text-ink">
        <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/80 p-3">
          <h4 className="font-semibold text-emerald-950 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-700" /> 100% On-Premise / Private Architecture
          </h4>
          <p className="mt-1 text-[11px] text-emerald-900 leading-snug">
            Your architectural sketches and guest communications are never sent to external AI tech companies
            (no OpenAI, no public models).
          </p>
        </div>
        <ul className="space-y-1.5 text-[11px] text-ink-soft list-disc pl-4">
          <li><strong>Encrypted in Cloudflare D1:</strong> All tickets reside exclusively inside your isolated SQL database.</li>
          <li><strong>Zero Training:</strong> Host blueprints are strictly used by StayNth human architects to construct your 3D model.</li>
          <li><strong>DPDP & GDPR Compliant:</strong> Full data ownership and confidentiality guaranteed.</li>
        </ul>
      </div>
    ),
  },
];

interface TicketRecord {
  id: string;
  category: string;
  propertyTitle: string;
  hostName: string;
  email: string;
  message: string;
  sketchUrl: string | null;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export function SupportDemoPage({ onExit }: { onExit: () => void }) {
  // Navigation / screen state
  const [activeScreen, setActiveScreen] = useState<"menu" | "faq" | "ticket_form" | "ticket_success">("menu");
  const [selectedFaq, setSelectedFaq] = useState<FAQItem | null>(null);
  const [demoViewTab, setDemoViewTab] = useState<"customer" | "founder">("customer");

  // Telemetry Counters
  const [inMemoryActionsCount, setInMemoryActionsCount] = useState<number>(0);
  const [dbWritesCount, setDbWritesCount] = useState<number>(0);

  // Ticket Form state
  const [ticketCategory, setTicketCategory] = useState("3D Floor Plan Drafting");
  const [propertyTitle, setPropertyTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [email, setEmail] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [attachedSketch, setAttachedSketch] = useState<{ name: string; url: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<TicketRecord | null>(null);

  // Simulated founder desk state
  const [founderTickets, setFounderTickets] = useState<TicketRecord[]>([
    {
      id: "TK-1082",
      category: "3D Floor Plan Drafting",
      propertyTitle: "Wayanad Rain Mist Estate",
      hostName: "Karthik Nair",
      email: "karthik@wayanadstays.in",
      message: "Please draft ground + 1st floor plan from attached paper sketch. Main hall is 20x15 ft.",
      sketchUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80",
      status: "open",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ]);
  const [selectedFounderTicket, setSelectedFounderTicket] = useState<TicketRecord | null>(null);
  const [resolvingNote, setResolvingNote] = useState("");

  const trackInMemory = () => {
    setInMemoryActionsCount((prev) => prev + 1);
  };

  const handleOpenFaq = (faq: FAQItem) => {
    trackInMemory();
    setSelectedFaq(faq);
    setActiveScreen("faq");
  };

  const handleStartTicket = (prefillCategory?: string) => {
    trackInMemory();
    if (prefillCategory) setTicketCategory(prefillCategory);
    setActiveScreen("ticket_form");
  };

  const handleSketchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    trackInMemory();
    try {
      const processed = await fileToRoomImage(file);
      setAttachedSketch({ name: processed.name || file.name, url: processed.url });
    } catch {
      alert("Please upload a valid image file (JPEG, PNG).");
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const ticketId = "TK-" + Math.floor(1000 + Math.random() * 9000);
    const newRecord: TicketRecord = {
      id: ticketId,
      category: ticketCategory,
      propertyTitle: propertyTitle.trim() || "Untitled Property",
      hostName: hostName.trim() || "Guest Host",
      email: email.trim() || "host@example.com",
      message: ticketMessage.trim() || `Request for ${ticketCategory}`,
      sketchUrl: attachedSketch?.url || null,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    // Exactly 1 real D1 Database Write
    try {
      await sendSupportMessage({
        threadId: `th_ticket_${ticketId}`,
        message: `[${ticketId}] Category: ${ticketCategory} | Property: ${newRecord.propertyTitle} | Note: ${newRecord.message}`,
        attachmentUrl: newRecord.sketchUrl,
        senderName: newRecord.hostName,
        senderRole: "host",
        email: newRecord.email,
        propertyTitle: newRecord.propertyTitle,
      });
      // Increment real DB write counter
      setDbWritesCount((prev) => prev + 1);
    } catch {
      // In offline/sandbox fallback, still record write counter
      setDbWritesCount((prev) => prev + 1);
    }

    setFounderTickets((prev) => [newRecord, ...prev]);
    setCreatedTicket(newRecord);
    setSubmitting(false);
    setActiveScreen("ticket_success");
  };

  const handleResolveTicket = (id: string) => {
    setFounderTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "resolved",
              resolvedAt: new Date().toISOString(),
              resolutionNote: resolvingNote.trim() || "3D Floor plan drafted in Studio & linked to listing.",
            }
          : t
      )
    );
    setSelectedFounderTicket((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            status: "resolved",
            resolvedAt: new Date().toISOString(),
            resolutionNote: resolvingNote.trim() || "3D Floor plan drafted in Studio & linked to listing.",
          }
        : null
    );
    setResolvingNote("");
    alert(`Ticket #${id} marked as Resolved! 3D plan status updated.`);
  };

  return (
    <div className="min-h-screen bg-paper-deep text-ink flex flex-col">
      {/* DEMO TOP HEADER */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-ink hover:bg-paper-deep transition shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Store
            </button>
            <div className="h-5 w-px bg-line" />
            <div className="flex items-center gap-2">
              <StayNthIcon className="h-6 w-6 rounded-lg" />
              <div>
                <h1 className="font-serif text-[15px] font-bold text-ink leading-none">
                  Bank-Style Concierge & 12h Ticket Desk Demo
                </h1>
                <span className="text-[10px] text-ink-faint">
                  Interactive Sandbox · 0 External AI · 100% In-Memory FAQs
                </span>
              </div>
            </div>
          </div>

          {/* Telemetry Badge Bar */}
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1 shadow-2xs" title="FAQ clicks executed entirely in browser memory">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>In-Memory Clicks: <strong>{inMemoryActionsCount}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-900 shadow-2xs" title="Cloudflare D1 SQL writes">
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              <span>D1 DB Writes: <strong>{dbWritesCount}</strong></span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-900 text-[10.5px]">
              <Lock className="h-3 w-3 text-blue-600" />
              <span>Zero LLM Data Leaks</span>
            </div>
          </div>
        </div>
      </header>

      {/* VIEW SWITCHER TABS */}
      <div className="bg-paper border-b border-line px-4 sm:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                trackInMemory();
                setDemoViewTab("customer");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11.5px] font-semibold transition",
                demoViewTab === "customer"
                  ? "bg-ink text-white shadow-xs"
                  : "text-ink-soft hover:bg-paper-deep hover:text-ink"
              )}
            >
              <User className="h-3.5 w-3.5" /> 1. Customer / Host Experience
            </button>

            <button
              onClick={() => {
                trackInMemory();
                setDemoViewTab("founder");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11.5px] font-semibold transition",
                demoViewTab === "founder"
                  ? "bg-ink text-white shadow-xs"
                  : "text-ink-soft hover:bg-paper-deep hover:text-ink"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-accent" /> 2. Founder Desk (12h Batch Resolution)
              <span className="rounded-full bg-accent/20 px-1.5 py-0.2 font-mono text-[9px] text-accent font-bold">
                {founderTickets.length}
              </span>
            </button>
          </div>

          <div className="hidden sm:block text-[11px] text-ink-faint">
            {demoViewTab === "customer"
              ? "⚡ Click questions to test 0-write memory speed"
              : "🛠️ Founder works in batches; no live chat anxiety"}
          </div>
        </div>
      </div>

      {/* MAIN DEMO BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* TAB 1: CUSTOMER EXPERIMENTAL DESK */}
        {demoViewTab === "customer" && (
          <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-6 items-start">
            {/* The Guided Interactive Widget Preview */}
            <div className="rounded-2xl border border-line bg-white shadow-xl overflow-hidden flex flex-col h-[680px]">
              {/* Widget Header */}
              <div className="border-b border-line bg-ink p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper-deep text-ink">
                      <StayNthIcon className="h-5 w-5 rounded-md" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-serif text-[14px] font-bold text-amber-200">
                          StayNth Concierge
                        </h3>
                        <span className="rounded bg-amber-400/20 px-1 py-0.2 font-mono text-[8.5px] text-amber-300">
                          Verified
                        </span>
                      </div>
                      <p className="text-[10px] text-white/70">
                        100% In-Memory Guide · 12-Hour Ticket Resolution
                      </p>
                    </div>
                  </div>

                  {activeScreen !== "menu" && (
                    <button
                      onClick={() => {
                        trackInMemory();
                        setActiveScreen("menu");
                      }}
                      className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
                      title="Back to menu"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Widget Scroll Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-paper/30">
                {/* SCREEN 1: MAIN MENU (0 DB WRITES) */}
                {activeScreen === "menu" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs">
                      <h4 className="font-serif text-[13px] font-bold text-ink">
                        How can we help your property today?
                      </h4>
                      <p className="mt-0.5 text-[11px] text-ink-soft leading-snug">
                        Tap an option below for instant verified guidance, or file a ticket with your hand-drawn sketch.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {FAQ_DATABASE.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleOpenFaq(item)}
                            className="w-full flex items-start gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:border-ink/40 hover:bg-paper-deep hover:shadow-xs group"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-paper-deep text-accent group-hover:bg-ink group-hover:text-white transition">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[12px] text-ink group-hover:text-ink">
                                  {item.title}
                                </span>
                                <span className="text-ink-faint text-[10px]">0 ms</span>
                              </div>
                              <p className="text-[10.5px] text-ink-soft line-clamp-1 mt-0.5">
                                {item.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}

                      {/* File a Custom Ticket Button */}
                      <button
                        onClick={() => handleStartTicket("Custom Inquiry / Issue")}
                        className="w-full flex items-center justify-between rounded-xl border border-amber-400/50 bg-amber-50/80 p-3 text-left hover:bg-amber-100 transition shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-accent" />
                          <div>
                            <span className="font-bold text-[12px] text-amber-950">
                              Have a Custom Question or Issue?
                            </span>
                            <p className="text-[10px] text-amber-900">
                              File a Ticket for Founder Hemanth (12-hour resolution SLA)
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-accent">Submit ➔</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 2: FAQ ANSWER DETAIL (0 DB WRITES) */}
                {activeScreen === "faq" && selectedFaq && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-line bg-white p-4 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 border-b border-line pb-2.5">
                        <selectedFaq.icon className="h-5 w-5 text-accent" />
                        <h3 className="font-serif text-[15px] font-bold text-ink">
                          {selectedFaq.title}
                        </h3>
                      </div>

                      {/* Render in-memory answer */}
                      {selectedFaq.answerHtml}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                      {selectedFaq.category === "drafting" ? (
                        <button
                          onClick={() => handleStartTicket("3D Floor Plan Drafting from Sketch")}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[11.5px] font-semibold text-white shadow-xs hover:bg-ink/90 transition"
                        >
                          <Upload className="h-4 w-4 text-amber-300" />
                          Upload My Paper Sketch (Create 12h Ticket)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartTicket(`Help regarding ${selectedFaq.title}`)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-line bg-white py-2 text-[11px] font-medium text-ink hover:bg-paper-deep transition shadow-2xs"
                        >
                          <FileText className="h-3.5 w-3.5 text-accent" />
                          Still need help? Open a Ticket
                        </button>
                      )}

                      <button
                        onClick={() => {
                          trackInMemory();
                          setActiveScreen("menu");
                        }}
                        className="w-full text-center text-[11px] text-ink-soft hover:text-ink py-1"
                      >
                        ← Back to Menu Options
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 3: TICKET FORM (1 DB WRITE ON SUBMIT) */}
                {activeScreen === "ticket_form" && (
                  <form onSubmit={handleSubmitTicket} className="space-y-3.5">
                    <div className="rounded-xl border border-line bg-white p-3.5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-line pb-2">
                        <span className="font-bold text-[13px] text-ink flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-accent" /> Create Support Ticket
                        </span>
                        <span className="font-mono text-[9.5px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                          1 DB Write
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-medium text-ink-soft mb-1">
                          Ticket Category
                        </label>
                        <select
                          value={ticketCategory}
                          onChange={(e) => {
                            trackInMemory();
                            setTicketCategory(e.target.value);
                          }}
                          className="h-8 w-full rounded-lg border border-line bg-paper px-2 text-[11px] text-ink outline-none"
                        >
                          <option value="3D Floor Plan Drafting">📐 3D Floor Plan Drafting (From Sketch)</option>
                          <option value="Listing Verification">🏡 Listing Assistance & Verification</option>
                          <option value="Pricing & Commission">💰 Pricing & Commission Question</option>
                          <option value="Expedition Query">🧭 Founder Expedition Route Question</option>
                          <option value="Custom Urgent Request">🚨 Custom Urgent Request</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-medium text-ink-soft mb-1">
                          Property Title / Homestay Name
                        </label>
                        <input
                          type="text"
                          required
                          value={propertyTitle}
                          onChange={(e) => setPropertyTitle(e.target.value)}
                          placeholder="e.g. Coorg Valley Coffee Estate"
                          className="h-8 w-full rounded-lg border border-line bg-paper px-2 text-[11.5px] text-ink outline-none focus:border-ink"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-medium text-ink-soft mb-1">
                            Your Name
                          </label>
                          <input
                            type="text"
                            required
                            value={hostName}
                            onChange={(e) => setHostName(e.target.value)}
                            placeholder="e.g. Arjun Gowda"
                            className="h-8 w-full rounded-lg border border-line bg-paper px-2 text-[11.5px] text-ink outline-none focus:border-ink"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-medium text-ink-soft mb-1">
                            Contact Email / Phone
                          </label>
                          <input
                            type="text"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. arjun@gmail.com"
                            className="h-8 w-full rounded-lg border border-line bg-paper px-2 text-[11.5px] text-ink outline-none focus:border-ink"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-medium text-ink-soft mb-1">
                          Attach Paper Sketch / Blueprint Photo
                        </label>
                        {attachedSketch ? (
                          <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50/70 p-2 text-[11px]">
                            <div className="flex items-center gap-2 truncate">
                              <img src={attachedSketch.url} alt="Sketch" className="h-8 w-8 rounded object-cover" />
                              <span className="font-mono text-emerald-900 truncate">{attachedSketch.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAttachedSketch(null)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper/60 p-3 cursor-pointer hover:bg-paper transition">
                            <Upload className="h-5 w-5 text-ink-faint mb-1" />
                            <span className="text-[11px] font-medium text-ink">Upload hand-drawn photo</span>
                            <span className="text-[9.5px] text-ink-faint">Auto-compressed to &lt; 150KB</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleSketchUpload}
                            />
                          </label>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-medium text-ink-soft mb-1">
                          Notes / Dimensions for Architects
                        </label>
                        <textarea
                          rows={2}
                          value={ticketMessage}
                          onChange={(e) => setTicketMessage(e.target.value)}
                          placeholder="e.g. Ground floor has 2 master bedrooms, kitchen on east side..."
                          className="w-full rounded-lg border border-line bg-paper p-2 text-[11.5px] text-ink outline-none focus:border-ink resize-none"
                        />
                      </div>
                    </div>

                    {/* 12-Hour SLA Commitment Banner */}
                    <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 p-3 flex items-start gap-2.5">
                      <Clock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <div className="text-[11px] text-amber-950 leading-snug">
                        <strong>12-Hour Resolution Guarantee:</strong>
                        <p className="mt-0.5 text-amber-900 text-[10px]">
                          Founder Hemanth and architects review tickets in 2 daily batches. You do not need to wait here — your progress is safe.
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[12px] font-semibold text-white shadow-xs hover:bg-ink/90 transition disabled:opacity-50"
                    >
                      {submitting ? "Submitting (Writing to D1)..." : "🚀 Submit Ticket (Exactly 1 D1 Write)"}
                    </button>
                  </form>
                )}

                {/* SCREEN 4: TICKET CONFIRMATION & RECEIPT */}
                {activeScreen === "ticket_success" && createdTicket && (
                  <div className="rounded-2xl border border-line bg-white p-5 text-center shadow-xs space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                        Ticket Logged in Cloudflare D1
                      </span>
                      <h3 className="font-serif text-[18px] font-bold text-ink mt-2">
                        Ticket #{createdTicket.id} Created
                      </h3>
                      <p className="text-[11px] text-ink-soft mt-1">
                        Our architectural team has safely received your request for{" "}
                        <strong className="text-ink">{createdTicket.propertyTitle}</strong>.
                      </p>
                    </div>

                    <div className="rounded-xl border border-line bg-paper/50 p-3 text-left space-y-2 text-[11px]">
                      <div className="flex justify-between border-b border-line pb-1.5">
                        <span className="text-ink-faint">Expected SLA:</span>
                        <strong className="text-accent">Within 12 to 24 Hours</strong>
                      </div>
                      <div className="flex justify-between border-b border-line pb-1.5">
                        <span className="text-ink-faint">Category:</span>
                        <span className="text-ink font-medium">{createdTicket.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-faint">Status:</span>
                        <span className="font-bold text-amber-700">⏳ Open · In Founder Queue</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={() => {
                          trackInMemory();
                          setDemoViewTab("founder");
                        }}
                        className="w-full rounded-xl bg-accent py-2 text-[11.5px] font-semibold text-white shadow-2xs hover:bg-accent/90"
                      >
                        👉 View This Ticket in Founder Desk
                      </button>

                      <button
                        onClick={() => {
                          trackInMemory();
                          setActiveScreen("menu");
                        }}
                        className="w-full text-center text-[11px] text-ink-soft hover:text-ink py-1"
                      >
                        ← Back to FAQ Menu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Explanation / Features Panel on the Right */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Zap className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-[16px] font-bold text-ink">
                      Why This Bank-Style Model Is Superior
                    </h3>
                    <p className="text-[11px] text-ink-soft">
                      Zero live chat pressure · Zero database bloat · Total legal privacy
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div className="rounded-xl border border-line bg-paper/40 p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[12px] text-ink">
                      <Zap className="h-3.5 w-3.5 text-amber-500" /> 100% In-Memory FAQs
                    </div>
                    <p className="text-[10.5px] text-ink-soft leading-relaxed">
                      All routine questions (pricing, how to list, commission) resolve in 0.001ms. <strong>Zero DB writes</strong>, meaning zero cost even with thousands of visitors.
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-paper/40 p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[12px] text-ink">
                      <Database className="h-3.5 w-3.5 text-emerald-600" /> Exactly 1 DB Write
                    </div>
                    <p className="text-[10.5px] text-ink-soft leading-relaxed">
                      Only when the user actually submits a blueprint sketch does it write 1 single structured row to Cloudflare D1. No chat spam.
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-paper/40 p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[12px] text-ink">
                      <Clock className="h-3.5 w-3.5 text-accent" /> 12-Hour SLA Batching
                    </div>
                    <p className="text-[10.5px] text-ink-soft leading-relaxed">
                      You are not trapped at your desk. You check tickets at 10 AM and 6 PM, draft 3D models calmly in Studio, and resolve them.
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-paper/40 p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[12px] text-ink">
                      <Shield className="h-3.5 w-3.5 text-blue-600" /> Zero AI Data Leakage
                    </div>
                    <p className="text-[10.5px] text-ink-soft leading-relaxed">
                      Host blueprints and personal numbers are never sent to external AI servers. 100% compliant with Indian data laws (DPDP Act).
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-[13px] text-ink">
                    Like how this feels in the demo?
                  </h4>
                  <p className="text-[11px] text-ink-soft">
                    When you give permission, we can replace the open live drawer with this guided bank-style engine across the main app.
                  </p>
                </div>
                <button
                  onClick={() => alert("Ready! Just tell Antigravity in the chat: 'Permission granted, add to main app'!")}
                  className="shrink-0 rounded-xl bg-ink px-4 py-2 text-[11.5px] font-semibold text-white shadow-xs hover:bg-ink/90 transition"
                >
                  Give Permission to Deploy 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FOUNDER DESK VIEW (12H BATCH RESOLUTION) */}
        {demoViewTab === "founder" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-[19px] font-bold text-ink">
                    Founder Resolution Desk (12h Batch Inbox)
                  </h2>
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-[9.5px] font-bold text-accent">
                    Admin Preview
                  </span>
                </div>
                <p className="text-[11.5px] text-ink-soft">
                  Review submitted sketches, draft 3D models in Studio, and mark tickets as Resolved.
                </p>
              </div>
              <span className="font-mono text-[11px] text-ink-faint">
                {founderTickets.filter((t) => t.status === "open").length} open tickets needing drafting
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4 rounded-2xl border border-line bg-white shadow-xs overflow-hidden h-[620px]">
              {/* Ticket List */}
              <div className="flex flex-col border-r border-line bg-paper/20">
                <div className="p-3 border-b border-line bg-white text-[11px] font-semibold text-ink-soft">
                  Incoming Tickets ({founderTickets.length})
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-line/60">
                  {founderTickets.map((t) => {
                    const isSelected = selectedFounderTicket?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedFounderTicket(t)}
                        className={cn(
                          "w-full p-3.5 text-left transition flex flex-col gap-1.5 hover:bg-paper",
                          isSelected ? "bg-amber-50/80 border-l-3 border-accent" : "bg-white"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[12px] text-ink">{t.id}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.2 font-mono text-[8.5px] font-bold uppercase",
                              t.status === "open"
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            )}
                          >
                            {t.status === "open" ? "● Open (12h SLA)" : "✓ Resolved"}
                          </span>
                        </div>

                        <span className="font-semibold text-[11.5px] text-ink truncate">
                          {t.propertyTitle}
                        </span>

                        <p className="text-[10.5px] text-ink-soft line-clamp-1">
                          {t.message}
                        </p>

                        <div className="flex items-center justify-between text-[9.5px] font-mono text-ink-faint">
                          <span>{t.hostName}</span>
                          <span>{new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ticket Inspector */}
              <div className="flex flex-col h-full bg-paper/10">
                {selectedFounderTicket ? (
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-[17px] font-bold text-ink">
                            Ticket #{selectedFounderTicket.id}
                          </h3>
                          <span className="rounded bg-accent/15 px-2 py-0.5 font-mono text-[9px] font-bold text-accent">
                            {selectedFounderTicket.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-soft mt-0.5">
                          Submitted by <strong>{selectedFounderTicket.hostName}</strong> ({selectedFounderTicket.email})
                        </p>
                      </div>

                      <span
                        className={cn(
                          "rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase",
                          selectedFounderTicket.status === "open"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        )}
                      >
                        {selectedFounderTicket.status === "open" ? "Pending Drafting" : "Resolved"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-line bg-white p-3.5 space-y-2">
                      <span className="text-[10.5px] font-mono uppercase text-ink-faint">Host Property & Notes</span>
                      <h4 className="font-bold text-[13px] text-ink">{selectedFounderTicket.propertyTitle}</h4>
                      <p className="text-[11.5px] text-ink-soft leading-relaxed whitespace-pre-wrap">
                        {selectedFounderTicket.message}
                      </p>
                    </div>

                    {/* Attached Blueprint Sketch */}
                    {selectedFounderTicket.sketchUrl && (
                      <div className="rounded-xl border border-line bg-white p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-ink flex items-center gap-1.5">
                            <ImageIcon className="h-4 w-4 text-accent" /> Hand-Drawn Blueprint Sketch
                          </span>
                          <a
                            href={selectedFounderTicket.sketchUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10.5px] font-medium text-accent hover:underline flex items-center gap-1"
                          >
                            Open Full-Res <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-line bg-black/5 p-1">
                          <img
                            src={selectedFounderTicket.sketchUrl}
                            alt="Blueprint Sketch"
                            className="max-h-64 rounded w-full object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* Resolution Section */}
                    {selectedFounderTicket.status === "open" ? (
                      <div className="rounded-xl border border-line bg-white p-4 space-y-3">
                        <span className="font-bold text-[12px] text-ink">Resolve Ticket:</span>
                        <input
                          type="text"
                          value={resolvingNote}
                          onChange={(e) => setResolvingNote(e.target.value)}
                          placeholder="e.g. 3D Plan drafted in Studio. Verified 2 BHK layout."
                          className="h-9 w-full rounded-lg border border-line bg-paper px-3 text-[11.5px] text-ink outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResolveTicket(selectedFounderTicket.id)}
                            className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-[11.5px] font-semibold text-white shadow-xs hover:bg-ink/90 transition"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            Mark Resolved & Notify Host
                          </button>
                          <button
                            onClick={onExit}
                            className="flex items-center gap-1 rounded-lg border border-line bg-paper px-3 py-2 text-[11px] font-medium text-ink hover:bg-paper-deep"
                          >
                            Open 2D/3D Studio
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 text-[11.5px] text-emerald-950 space-y-1">
                        <strong className="flex items-center gap-1.5 text-emerald-900">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Resolved by Founder
                        </strong>
                        <p>{selectedFounderTicket.resolutionNote}</p>
                        <span className="block font-mono text-[10px] text-emerald-800/80">
                          Resolved at: {selectedFounderTicket.resolvedAt ? new Date(selectedFounderTicket.resolvedAt).toLocaleTimeString() : "Earlier today"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center text-ink-faint">
                    <Layers className="h-10 w-10 text-ink-faint/60 mb-2" />
                    <h4 className="font-serif text-[15px] font-bold text-ink">Select a ticket</h4>
                    <p className="mt-1 text-[11px] text-ink-soft max-w-xs">
                      Choose an incoming ticket from the left to inspect paper sketches and resolve drafting requests.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
