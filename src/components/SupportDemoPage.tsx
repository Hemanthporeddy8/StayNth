import React, { useState, useMemo, useEffect } from "react";
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
  MapPin,
  Maximize2,
  MessageSquare,
  Paperclip,
  PencilRuler,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Split,
  Upload,
  User,
  X,
  Zap,
} from "lucide-react";
import { fileToRoomImage } from "@/lib/imageUpload";
import { sendSupportMessage } from "@/lib/support";
import { FOOTPRINT_PRESETS, clamp, generatePlan, summarize } from "@/lib/plan";
import { MiniPlan } from "@/components/Dialogs";
import { cn } from "@/utils/cn";
import { StayNthIcon } from "@/components/StayNthLogo";
import type { GenerateOptions, Plan } from "@/types";

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

export interface TicketMessage {
  id: string;
  sender: "host" | "founder" | "system";
  text: string;
  attachmentUrl?: string | null;
  timestamp: string;
}

export interface TicketRecord {
  id: string;
  category: string;
  propertyTitle: string;
  hostName: string;
  email: string;
  sketchUrl: string | null;
  status: "open" | "needs_interior_sketch" | "in_progress" | "agent_visit_offered" | "resolved";
  createdAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  messages: TicketMessage[];
  draftedPlan?: Plan;
}

export function SupportDemoPage({
  onExit,
  onOpenStudio,
}: {
  onExit: () => void;
  onOpenStudio?: () => void;
}) {
  // Navigation / screen state
  const [activeScreen, setActiveScreen] = useState<"menu" | "faq" | "ticket_form" | "ticket_chat">("menu");
  const [selectedFaq, setSelectedFaq] = useState<FAQItem | null>(null);
  const [demoViewTab, setDemoViewTab] = useState<"customer" | "founder">("customer");

  // Telemetry Counters
  const [inMemoryActionsCount, setInMemoryActionsCount] = useState<number>(14);
  const [dbWritesCount, setDbWritesCount] = useState<number>(0);

  // Ticket Form state
  const [ticketCategory, setTicketCategory] = useState("3D Floor Plan Drafting");
  const [propertyTitle, setPropertyTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [email, setEmail] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [attachedSketch, setAttachedSketch] = useState<{ name: string; url: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Active customer ticket ID (defaults to sample ticket TK-1082)
  const [activeCustomerTicketId, setActiveCustomerTicketId] = useState<string>("TK-1082");
  const [customerReplyText, setCustomerReplyText] = useState("");
  const [customerReplyAttachment, setCustomerReplyAttachment] = useState<{ name: string; url: string } | null>(null);

  // Simulated founder desk state with realistic initial ticket (matches screenshot)
  const [founderTickets, setFounderTickets] = useState<TicketRecord[]>([
    {
      id: "TK-1082",
      category: "3D Floor Plan Drafting",
      propertyTitle: "Wayanad Rain Mist Estate",
      hostName: "Karthik Nair",
      email: "karthik@wayanadstays.in",
      sketchUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80", // Exterior villa photo!
      status: "open",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      messages: [
        {
          id: "m1",
          sender: "host",
          text: "Hi StayNth, please draft ground + 1st floor 3D plan from my attached photo. Looking forward to listing on StayNth!",
          attachmentUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
          timestamp: "08:32 AM",
        },
      ],
    },
  ]);

  // Sync tickets resolved in Real Studio (via localStorage or custom event)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("staynth_resolved_tickets");
      if (raw) {
        const resolvedMap: Record<string, { resolvedAt: string; plan?: Plan }> = JSON.parse(raw);
        setFounderTickets((prev) =>
          prev.map((t) => {
            const r = resolvedMap[t.id];
            if (r && t.status !== "resolved") {
              const resolveMsg: TicketMessage = {
                id: "f_resolve_" + Date.now(),
                sender: "founder",
                text: "🎉 Great news! Founder Hemanth & StayNth Architects have drafted your interactive 3D Floor Plan in Studio. It is now verified and active on your listing!",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              };
              return {
                ...t,
                status: "resolved",
                resolvedAt: r.resolvedAt,
                resolutionNote: "Drafted 1:1 scale model in Real 3D Studio with walk mode.",
                draftedPlan: r.plan,
                messages: [...t.messages, resolveMsg],
              };
            }
            return t;
          })
        );
      }
    } catch {
      // ignore
    }

    const onResolvedEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.ticketId) return;
      const { ticketId, plan } = detail;
      setFounderTickets((prev) =>
        prev.map((t) => {
          if (t.id === ticketId) {
            const resolveMsg: TicketMessage = {
              id: "f_resolve_" + Date.now(),
              sender: "founder",
              text: "🎉 Great news! Founder Hemanth & StayNth Architects have drafted your interactive 3D Floor Plan in Studio. It is now verified and active on your listing!",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
            return {
              ...t,
              status: "resolved",
              resolvedAt: new Date().toISOString(),
              resolutionNote: "Drafted 1:1 scale model in Real 3D Studio with walk mode.",
              draftedPlan: plan,
              messages: [...t.messages, resolveMsg],
            };
          }
          return t;
        })
      );
    };

    window.addEventListener("staynth:ticket-resolved", onResolvedEvent);
    return () => window.removeEventListener("staynth:ticket-resolved", onResolvedEvent);
  }, []);

  const [selectedFounderTicketId, setSelectedFounderTicketId] = useState<string>("TK-1082");
  const [founderReplyInput, setFounderReplyInput] = useState("");

  // Side-by-Side 3D Drafting Studio Modal State
  const [draftingStudioModalOpen, setDraftingStudioModalOpen] = useState(false);
  const [studioDraftOpts, setStudioDraftOpts] = useState<GenerateOptions>({
    bedrooms: 2,
    bathrooms: 2,
    width: 36,
    depth: 28,
  });

  const selectedFounderTicket = useMemo(
    () => founderTickets.find((t) => t.id === selectedFounderTicketId) || founderTickets[0] || null,
    [founderTickets, selectedFounderTicketId]
  );

  const activeCustomerTicket = useMemo(
    () => founderTickets.find((t) => t.id === activeCustomerTicketId) || founderTickets[0] || null,
    [founderTickets, activeCustomerTicketId]
  );

  // Live drafted plan generated in studio
  const currentStudioPlan = useMemo(
    () => generatePlan(studioDraftOpts, selectedFounderTicket?.propertyTitle || "Draft Plan"),
    [studioDraftOpts, selectedFounderTicket?.propertyTitle]
  );
  const studioSummary = useMemo(() => summarize(currentStudioPlan), [currentStudioPlan]);

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

  const handleCustomerReplySketchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    trackInMemory();
    try {
      const processed = await fileToRoomImage(file);
      setCustomerReplyAttachment({ name: processed.name || file.name, url: processed.url });
    } catch {
      alert("Please upload a valid image file.");
    }
  };

  // Submit new ticket (1 single real DB write)
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
      sketchUrl: attachedSketch?.url || null,
      status: "open",
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: "m_init",
          sender: "host",
          text: ticketMessage.trim() || `Request for ${ticketCategory}.`,
          attachmentUrl: attachedSketch?.url || null,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };

    // Exactly 1 real D1 Database Write
    try {
      await sendSupportMessage({
        threadId: `th_ticket_${ticketId}`,
        message: `[${ticketId}] Category: ${ticketCategory} | Property: ${newRecord.propertyTitle} | Note: ${newRecord.messages[0].text}`,
        attachmentUrl: newRecord.sketchUrl,
        senderName: newRecord.hostName,
        senderRole: "host",
        email: newRecord.email,
        propertyTitle: newRecord.propertyTitle,
      });
      setDbWritesCount((prev) => prev + 1);
    } catch {
      setDbWritesCount((prev) => prev + 1);
    }

    setFounderTickets((prev) => [newRecord, ...prev]);
    setActiveCustomerTicketId(ticketId);
    setSelectedFounderTicketId(ticketId);
    setSubmitting(false);
    setActiveScreen("ticket_chat");
  };

  // Send message inside active ticket (from customer side)
  const handleSendCustomerReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerReplyText.trim() && !customerReplyAttachment) return;
    trackInMemory();

    const newMsg: TicketMessage = {
      id: "m_" + Date.now(),
      sender: "host",
      text: customerReplyText.trim() || "Uploaded floor plan blueprint sketch.",
      attachmentUrl: customerReplyAttachment?.url || null,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setFounderTickets((prev) =>
      prev.map((t) =>
        t.id === activeCustomerTicketId
          ? {
              ...t,
              // If host uploaded a sketch after being asked, update sketchUrl & status
              sketchUrl: customerReplyAttachment?.url || t.sketchUrl,
              status: customerReplyAttachment ? "in_progress" : t.status,
              messages: [...t.messages, newMsg],
            }
          : t
      )
    );

    setCustomerReplyText("");
    setCustomerReplyAttachment(null);
  };

  // Send message inside active ticket (from founder desk side)
  const handleSendFounderReply = (textToSend?: string) => {
    const text = textToSend || founderReplyInput.trim();
    if (!text || !selectedFounderTicket) return;
    trackInMemory();

    let nextStatus = selectedFounderTicket.status;
    if (text.includes("inside room layout") || text.includes("exterior")) {
      nextStatus = "needs_interior_sketch";
    } else if (text.includes("Ground Agent") || text.includes("visit your property")) {
      nextStatus = "agent_visit_offered";
    }

    const newMsg: TicketMessage = {
      id: "f_" + Date.now(),
      sender: "founder",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setFounderTickets((prev) =>
      prev.map((t) =>
        t.id === selectedFounderTicket.id
          ? {
              ...t,
              status: nextStatus,
              messages: [...t.messages, newMsg],
            }
          : t
      )
    );

    setFounderReplyInput("");
  };

  // Quick Action 1: Ask for Interior Sketch
  const handleRequestInteriorSketch = () => {
    handleSendFounderReply(
      `Hi ${selectedFounderTicket?.hostName || "Host"}! We received your photo, but it only shows the exterior building. To draft your 1:1 true-scale 3D floor plan, please take a piece of paper, draw the internal rooms/doors with rough dimensions, and reply with a photo right here!`
    );
  };

  // Quick Action 2: Offer Ground Agent Visit
  const handleOfferAgentVisit = () => {
    handleSendFounderReply(
      `Hi ${selectedFounderTicket?.hostName || "Host"}, no worries if drawing a layout is difficult! A StayNth Verified Ground Partner can visit your property in person to laser-measure all rooms and scan your 3D walkthrough. Fee is ₹0 upfront (deducted from your 1st guest booking). Would you like to schedule a visit?`
    );
  };

  // Quick Action 3: Redirect directly to Real Existing 3D Studio
  const handleOpenStudio = () => {
    if (!selectedFounderTicket) return;
    trackInMemory();

    // Store active ticket draft context in localStorage with returnUrl back to #demo
    localStorage.setItem(
      "staynth_active_ticket_draft",
      JSON.stringify({
        ticketId: selectedFounderTicket.id,
        propertyTitle: selectedFounderTicket.propertyTitle,
        sketchUrl: selectedFounderTicket.sketchUrl,
        hostName: selectedFounderTicket.hostName,
        returnUrl: "#demo",
      })
    );

    if (onOpenStudio) {
      onOpenStudio();
    } else {
      window.history.replaceState(null, "", "/");
      window.location.hash = "";
    }
  };

  // Finish 3D Drafting in Studio & Resolve Ticket
  const handleSaveDrafted3DPlan = () => {
    if (!selectedFounderTicket) return;
    trackInMemory();

    const resolveMsg: TicketMessage = {
      id: "f_resolve",
      sender: "founder",
      text: `🎉 Great news! Founder Hemanth & StayNth Architects have drafted your interactive 3D Floor Plan (${studioSummary.bedrooms} BHK · ${Math.round(studioSummary.area)} sq ft). It is now verified and active on your listing!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setFounderTickets((prev) =>
      prev.map((t) =>
        t.id === selectedFounderTicket.id
          ? {
              ...t,
              status: "resolved",
              resolvedAt: new Date().toISOString(),
              resolutionNote: `Drafted ${studioSummary.bedrooms} BHK plan (${Math.round(studioSummary.area)} sq ft net) in Studio.`,
              draftedPlan: currentStudioPlan,
              messages: [...t.messages, resolveMsg],
            }
          : t
      )
    );

    setDraftingStudioModalOpen(false);
    alert(`3D Floor Plan attached to listing "${selectedFounderTicket.propertyTitle}" & Ticket #${selectedFounderTicket.id} marked as RESOLVED!`);
  };

  return (
    <div className="min-h-screen bg-paper-deep text-ink flex flex-col font-sans">
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
                  Interactive Sandbox · Two-Way Ticket Chat · Side-by-Side Studio
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
              <User className="h-3.5 w-3.5" /> 1. Customer / Host Experience (Chat Enabled)
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
              <ShieldCheck className="h-3.5 w-3.5 text-accent" /> 2. Founder Desk (Side-by-Side 3D Studio & Agent Visit)
              <span className="rounded-full bg-accent/20 px-1.5 py-0.2 font-mono text-[9px] text-accent font-bold">
                {founderTickets.length}
              </span>
            </button>
          </div>

          <div className="hidden sm:block text-[11px] text-ink-faint">
            {demoViewTab === "customer"
              ? "⚡ Two-way ticket chat allows host to send interior sketches"
              : "🛠️ Founder draws 3D model beside sketch or offers agent visit"}
          </div>
        </div>
      </div>

      {/* MAIN DEMO BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* TAB 1: CUSTOMER VIEW */}
        {demoViewTab === "customer" && (
          <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-6 items-start">
            {/* The Interactive Drawer Sandbox */}
            <div className="rounded-2xl border border-line bg-white shadow-xl overflow-hidden flex flex-col h-[700px]">
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
                        In-Memory Guide · 12h SLA · Active Ticket Chat
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Active Ticket Toggle */}
                    {activeCustomerTicket && (
                      <button
                        onClick={() => {
                          trackInMemory();
                          setActiveScreen(activeScreen === "ticket_chat" ? "menu" : "ticket_chat");
                        }}
                        className={cn(
                          "rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold transition flex items-center gap-1",
                          activeScreen === "ticket_chat"
                            ? "bg-amber-400 text-ink"
                            : "bg-white/15 text-white hover:bg-white/25"
                        )}
                      >
                        <MessageSquare className="h-3 w-3" />
                        {activeScreen === "ticket_chat" ? "Back to FAQs" : `Ticket #${activeCustomerTicket.id}`}
                      </button>
                    )}

                    {activeScreen !== "menu" && activeScreen !== "ticket_chat" && (
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
              </div>

              {/* Widget Scroll Area */}
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
                          Not satisfied? Open a Ticket with Founder
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
                          Attach Photo or Paper Sketch
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
                            <span className="text-[11px] font-medium text-ink">Upload blueprint photo / sketch</span>
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
                          placeholder="e.g. Please draft 3D plan. 2-story house..."
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

                {/* SCREEN 4: ACTIVE TWO-WAY TICKET CHAT MODE */}
                {activeScreen === "ticket_chat" && activeCustomerTicket && (
                  <div className="flex flex-col h-full space-y-3">
                    {/* Ticket Status Bar */}
                    <div className="rounded-xl border border-line bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[13px] text-ink">
                          Ticket #{activeCustomerTicket.id}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase",
                            activeCustomerTicket.status === "open"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : activeCustomerTicket.status === "needs_interior_sketch"
                              ? "bg-red-100 text-red-900 border border-red-200 animate-pulse"
                              : activeCustomerTicket.status === "agent_visit_offered"
                              ? "bg-blue-100 text-blue-900 border border-blue-200"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                          )}
                        >
                          {activeCustomerTicket.status === "open" && "● Open (12h SLA)"}
                          {activeCustomerTicket.status === "needs_interior_sketch" && "⚠️ Action: Send Inside Sketch"}
                          {activeCustomerTicket.status === "agent_visit_offered" && "📍 Agent Visit Offered"}
                          {activeCustomerTicket.status === "resolved" && "✓ 3D Model Live"}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-soft truncate mt-0.5">
                        Property: <strong>{activeCustomerTicket.propertyTitle}</strong>
                      </p>
                    </div>

                    {/* Customer 3D Model Ready Card */}
                    {activeCustomerTicket.draftedPlan && (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11.5px] font-bold text-emerald-950 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Your 3D Floor Plan is Ready!
                          </span>
                          <span className="rounded-full bg-emerald-200/80 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-900">
                            Live on Listing
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-snug">
                          Founder Hemanth & StayNth Architects drafted your interactive 3D model. Guests can now take a 3D virtual tour of your homestay!
                        </p>
                      </div>
                    )}

                    {/* Chat Bubble Stream */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {activeCustomerTicket.messages.map((m) => {
                        const isFounder = m.sender === "founder";
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "flex flex-col max-w-[85%]",
                              isFounder ? "mr-auto items-start" : "ml-auto items-end"
                            )}
                          >
                            <span className="text-[9.5px] font-mono text-ink-faint mb-0.5">
                              {isFounder ? "👑 Founder Hemanth" : "You (Host)"} · {m.timestamp}
                            </span>
                            <div
                              className={cn(
                                "rounded-2xl px-3.5 py-2 text-[11.5px] leading-relaxed shadow-2xs",
                                isFounder
                                  ? "rounded-tl-xs border border-line bg-white text-ink"
                                  : "rounded-tr-xs bg-ink text-white"
                              )}
                            >
                              <p className="whitespace-pre-wrap">{m.text}</p>
                              {m.attachmentUrl && (
                                <div className="mt-2 overflow-hidden rounded-lg border border-black/10">
                                  <img
                                    src={m.attachmentUrl}
                                    alt="Attached"
                                    className="max-h-40 w-full object-cover rounded"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Host Reply Composer */}
                    <form
                      onSubmit={handleSendCustomerReply}
                      className="border-t border-line pt-2 flex flex-col gap-1.5"
                    >
                      {customerReplyAttachment && (
                        <div className="flex items-center justify-between bg-paper p-1.5 rounded-lg border border-line text-[10px]">
                          <span className="truncate font-mono">{customerReplyAttachment.name}</span>
                          <button
                            type="button"
                            onClick={() => setCustomerReplyAttachment(null)}
                            className="text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <label className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-soft hover:bg-paper cursor-pointer" title="Attach hand-drawn paper sketch">
                          <Paperclip className="h-4 w-4" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCustomerReplySketchUpload}
                          />
                        </label>

                        <input
                          type="text"
                          value={customerReplyText}
                          onChange={(e) => setCustomerReplyText(e.target.value)}
                          placeholder={
                            customerReplyAttachment
                              ? "Add note or send sketch photo…"
                              : "Reply to Founder or ask questions…"
                          }
                          className="h-9 flex-1 rounded-xl border border-line bg-white px-3 text-[11.5px] text-ink outline-none focus:border-ink"
                        />

                        <button
                          type="submit"
                          disabled={!customerReplyText.trim() && !customerReplyAttachment}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white disabled:opacity-40"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Explanation / Architecture Highlights */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <MessageSquare className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-[16px] font-bold text-ink">
                      Active Two-Way Ticket Chat
                    </h3>
                    <p className="text-[11px] text-ink-soft">
                      Solves the "exterior photo only" problem · Instant follow-up
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-300/60 bg-amber-50/70 p-3.5 text-[11.5px] text-amber-950 space-y-1.5">
                  <strong className="block font-semibold">How it fixes incomplete uploads:</strong>
                  <p className="text-amber-900 leading-relaxed text-[11px]">
                    If a host uploads an outside garden/building photo by mistake (like in Ticket #TK-1082), you don't reject them.
                    You simply reply: <em>"Please upload a paper sketch of the inside rooms with measurements."</em>
                    The host receives the notification and uploads the sketch directly in the chat thread!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-line bg-paper/40 p-3 space-y-1">
                    <span className="font-bold text-[11.5px] text-ink flex items-center gap-1.5">
                      <Split className="h-3.5 w-3.5 text-accent" /> Side-by-Side 3D Studio
                    </span>
                    <p className="text-[10px] text-ink-soft leading-relaxed">
                      Founder draws the 3D floor plan directly beside the host's sketch without switching tabs or memorizing room sizes.
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-paper/40 p-3 space-y-1">
                    <span className="font-bold text-[11.5px] text-ink flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Ground Agent Visits
                    </span>
                    <p className="text-[10px] text-ink-soft leading-relaxed">
                      If the host says "I can't draw", 1-click offer an in-person laser survey with ₹0 upfront deduction from first booking.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-[13px] text-ink">
                    Switch to Tab 2 to test Founder Desk!
                  </h4>
                  <p className="text-[11px] text-ink-soft">
                    Experience how you inspect Ticket #TK-1082, send quick replies, and draft 3D models side-by-side.
                  </p>
                </div>
                <button
                  onClick={() => {
                    trackInMemory();
                    setDemoViewTab("founder");
                  }}
                  className="shrink-0 rounded-xl bg-ink px-4 py-2 text-[11.5px] font-semibold text-white shadow-xs hover:bg-ink/90 transition"
                >
                  Go to Founder Desk ➔
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FOUNDER DESK VIEW */}
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
                  Review submitted sketches, chat with hosts for details, draft in Studio, and offer agent visits.
                </p>
              </div>
              <span className="font-mono text-[11px] text-ink-faint">
                {founderTickets.filter((t) => t.status !== "resolved").length} open tickets needing drafting
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-4 rounded-2xl border border-line bg-white shadow-xs overflow-hidden h-[660px]">
              {/* Ticket List */}
              <div className="flex flex-col border-r border-line bg-paper/20">
                <div className="p-3 border-b border-line bg-white text-[11px] font-semibold text-ink-soft flex items-center justify-between">
                  <span>Incoming Tickets ({founderTickets.length})</span>
                  <span className="text-[9.5px] font-mono text-ink-faint">Batch SLA: 12h</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-line/60">
                  {founderTickets.map((t) => {
                    const isSelected = selectedFounderTicket?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          trackInMemory();
                          setSelectedFounderTicketId(t.id);
                        }}
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
                                : t.status === "needs_interior_sketch"
                                ? "bg-red-100 text-red-900 border border-red-200"
                                : t.status === "agent_visit_offered"
                                ? "bg-blue-100 text-blue-900 border border-blue-200"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            )}
                          >
                            {t.status === "open" && "● Open (12h)"}
                            {t.status === "needs_interior_sketch" && "⚠️ Needs Sketch"}
                            {t.status === "agent_visit_offered" && "📍 Agent Offered"}
                            {t.status === "resolved" && "✓ Resolved"}
                          </span>
                        </div>

                        <span className="font-semibold text-[11.5px] text-ink truncate">
                          {t.propertyTitle}
                        </span>

                        <p className="text-[10.5px] text-ink-soft line-clamp-1">
                          {t.messages[t.messages.length - 1]?.text || "Photo uploaded"}
                        </p>

                        <div className="flex items-center justify-between text-[9.5px] font-mono text-ink-faint">
                          <span>{t.hostName}</span>
                          <span>{t.messages.length} msgs</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ticket Inspector */}
              <div className="flex flex-col h-full bg-paper/10">
                {selectedFounderTicket ? (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="border-b border-line bg-white p-4 shrink-0 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-[16px] font-bold text-ink">
                            Ticket #{selectedFounderTicket.id}
                          </h3>
                          <span className="rounded bg-accent/15 px-2 py-0.5 font-mono text-[9px] font-bold text-accent">
                            {selectedFounderTicket.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-soft mt-0.5">
                          Property: <strong>{selectedFounderTicket.propertyTitle}</strong> · Host: {selectedFounderTicket.hostName} ({selectedFounderTicket.email})
                        </p>
                      </div>

                      {/* Primary Action Button: Open Real 3D Studio */}
                      <button
                        onClick={handleOpenStudio}
                        className="flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-[11px] font-semibold text-white shadow-xs hover:bg-ink/90 transition"
                        title="Redirects to real existing Studio with host sketch docked in Picture-in-Picture"
                      >
                        <Split className="h-3.5 w-3.5 text-amber-300" />
                        Draft in Real Studio (Redirect)
                      </button>
                    </div>

                    {/* Chat Conversation & Upload Inspection Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {/* Host Upload Inspection Card */}
                      {selectedFounderTicket.sketchUrl && (
                        <div className="rounded-xl border border-line bg-white p-3.5 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-ink flex items-center gap-1.5">
                              <ImageIcon className="h-4 w-4 text-accent" /> Host Uploaded Attachment
                            </span>
                            <span className="text-[9.5px] font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Exterior villa photo detected
                            </span>
                          </div>

                          <div className="overflow-hidden rounded-lg border border-line bg-black/5 p-1">
                            <img
                              src={selectedFounderTicket.sketchUrl}
                              alt="Host upload"
                              className="max-h-52 w-full object-cover rounded"
                            />
                          </div>
                        </div>
                      )}

                      {/* Attached Drafted 3D Plan Card */}
                      {selectedFounderTicket.draftedPlan && (
                        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              Interactive 3D Floor Plan Attached
                            </span>
                            <span className="text-[9.5px] font-mono text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-200">
                              Verified & Active
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-emerald-900 bg-white/70 p-2.5 rounded-lg border border-emerald-200">
                            <span className="font-medium">
                              {selectedFounderTicket.draftedPlan.rooms?.filter((r: any) => r.type === "bedroom").length || 2} BHK ·{" "}
                              {selectedFounderTicket.draftedPlan.rooms?.length || 4} Rooms Total
                            </span>
                            <button
                              type="button"
                              onClick={handleOpenStudio}
                              className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                            >
                              Open in Real Studio ➔
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Two-Way Chat Bubbles */}
                      <div className="space-y-2.5">
                        {selectedFounderTicket.messages.map((m) => {
                          const isFounder = m.sender === "founder";
                          return (
                            <div
                              key={m.id}
                              className={cn(
                                "flex flex-col max-w-[85%]",
                                isFounder ? "ml-auto items-end" : "mr-auto items-start"
                              )}
                            >
                              <span className="text-[9.5px] font-mono text-ink-faint mb-0.5">
                                {isFounder ? "👑 Founder Hemanth" : selectedFounderTicket.hostName} · {m.timestamp}
                              </span>
                              <div
                                className={cn(
                                  "rounded-2xl px-3.5 py-2 text-[11.5px] leading-relaxed shadow-2xs",
                                  isFounder
                                    ? "rounded-tr-xs bg-ink text-white"
                                    : "rounded-tl-xs border border-line bg-white text-ink"
                                )}
                              >
                                <p className="whitespace-pre-wrap">{m.text}</p>
                                {m.attachmentUrl && m.attachmentUrl !== selectedFounderTicket.sketchUrl && (
                                  <img
                                    src={m.attachmentUrl}
                                    alt="Sketch"
                                    className="mt-2 max-h-40 rounded object-cover"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Response Action Chips for Founder */}
                    <div className="border-t border-line bg-paper/60 px-4 py-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleRequestInteriorSketch}
                        className="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[10.5px] font-medium text-ink hover:border-ink/40 transition shadow-2xs"
                      >
                        📸 Request Interior Room Sketch
                      </button>

                      <button
                        type="button"
                        onClick={handleOfferAgentVisit}
                        className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-900 hover:bg-emerald-100 transition shadow-2xs"
                      >
                        📍 Offer Ground Agent In-Person Visit
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenStudio}
                        className="flex items-center gap-1 rounded-lg border border-amber-400 bg-amber-50 px-2.5 py-1 text-[10.5px] font-semibold text-amber-950 hover:bg-amber-100 transition shadow-2xs"
                        title="Redirects to real existing Studio with host sketch docked in Picture-in-Picture"
                      >
                        ✏️ Draft in Real Studio (Redirect)
                      </button>
                    </div>

                    {/* Reply Input */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendFounderReply();
                      }}
                      className="border-t border-line bg-white p-3 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={founderReplyInput}
                        onChange={(e) => setFounderReplyInput(e.target.value)}
                        placeholder="Reply to host or ask for clarifications…"
                        className="h-10 flex-1 rounded-xl border border-line bg-paper px-3 text-[12px] text-ink outline-none focus:border-ink"
                      />
                      <button
                        type="submit"
                        disabled={!founderReplyInput.trim()}
                        className="flex h-10 items-center gap-1.5 rounded-xl bg-ink px-4 text-[11.5px] font-semibold text-white disabled:opacity-40"
                      >
                        <Send className="h-3.5 w-3.5" /> Reply
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center text-ink-faint">
                    <Layers className="h-10 w-10 text-ink-faint/60 mb-2" />
                    <h4 className="font-serif text-[15px] font-bold text-ink">Select a ticket</h4>
                    <p className="mt-1 text-[11px] text-ink-soft max-w-xs">
                      Choose an incoming ticket from the left to inspect paper sketches, chat with hosts, or draft in Studio.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FULL-SCREEN SIDE-BY-SIDE 3D DRAFTING STUDIO MODAL */}
      {draftingStudioModalOpen && selectedFounderTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-3 sm:p-6 backdrop-blur-sm animate-fade">
          <div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl animate-pop">
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-line bg-ink px-5 py-3.5 text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
                  <Split className="h-4.5 w-4.5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-[16px] font-bold text-amber-200">
                      Side-by-Side 3D Floor Plan Studio
                    </h3>
                    <span className="rounded bg-white/15 px-2 py-0.5 font-mono text-[9px] text-white">
                      Ticket #{selectedFounderTicket.id}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-white/70">
                    Drafting for listing: <strong>{selectedFounderTicket.propertyTitle}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDrafted3DPlan}
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[11.5px] font-bold text-white shadow-sm hover:bg-accent/90 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Save 3D Plan to Listing & Resolve Ticket
                </button>

                <button
                  onClick={() => setDraftingStudioModalOpen(false)}
                  className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Split Screen Columns */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-line overflow-hidden">
              {/* LEFT 50%: HOST'S UPLOADED BLUEPRINT / PHOTO */}
              <div className="flex flex-col bg-paper/40 p-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
                  <span className="font-bold text-[12px] text-ink flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-accent" /> Host's Uploaded Reference
                  </span>
                  <span className="text-[10px] text-ink-faint font-mono">Reference Image</span>
                </div>

                <div className="flex-1 flex items-center justify-center rounded-xl border border-line bg-white p-2 overflow-hidden shadow-2xs">
                  {selectedFounderTicket.sketchUrl ? (
                    <img
                      src={selectedFounderTicket.sketchUrl}
                      alt="Host sketch"
                      className="max-h-[60vh] w-full object-contain rounded"
                    />
                  ) : (
                    <div className="text-center text-ink-faint p-8">No image attached</div>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-line bg-white p-3 text-[11px] text-ink-soft">
                  <strong className="text-ink">Host Dimensions & Notes:</strong>
                  <p className="mt-0.5 leading-snug">{selectedFounderTicket.messages[0]?.text}</p>
                </div>
              </div>

              {/* RIGHT 50%: STAYNTH 2D/3D FLOOR PLAN DRAFTING CANVAS */}
              <div className="flex flex-col bg-white p-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
                  <span className="font-bold text-[12px] text-ink flex items-center gap-1.5">
                    <PencilRuler className="h-4 w-4 text-accent" /> StayNth Architectural Drafting Canvas
                  </span>
                  <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                    {Math.round(studioSummary.area)} SQ FT NET
                  </span>
                </div>

                {/* Drafting Controls */}
                <div className="rounded-xl border border-line bg-paper/50 p-3 mb-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[10px] font-mono uppercase text-ink-faint mb-1">
                        Layout Footprint
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {([1, 2, 3, 4] as const).map((beds) => (
                          <button
                            key={beds}
                            type="button"
                            onClick={() => {
                              const preset = FOOTPRINT_PRESETS[beds];
                              setStudioDraftOpts((o) => ({
                                ...o,
                                bedrooms: beds,
                                width: preset.width,
                                depth: preset.depth,
                                bathrooms: beds === 1 ? 1 : 2,
                              }));
                            }}
                            className={cn(
                              "rounded-lg py-1 text-[11px] font-medium transition",
                              studioDraftOpts.bedrooms === beds
                                ? "bg-ink text-white"
                                : "bg-white border border-line text-ink hover:bg-paper"
                            )}
                          >
                            {beds === 1 ? "Studio" : `${beds} BHK`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-mono uppercase text-ink-faint mb-1">
                        Bathrooms
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        {([1, 2] as const).map((baths) => (
                          <button
                            key={baths}
                            type="button"
                            onClick={() => setStudioDraftOpts((o) => ({ ...o, bathrooms: baths }))}
                            className={cn(
                              "rounded-lg py-1 text-[11px] font-medium transition",
                              studioDraftOpts.bathrooms === baths
                                ? "bg-ink text-white"
                                : "bg-white border border-line text-ink hover:bg-paper"
                            )}
                          >
                            {baths} Bath
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <label className="flex items-center justify-between text-[10.5px] text-ink-soft">
                      <span>Width: <strong>{studioDraftOpts.width} ft</strong></span>
                      <input
                        type="range"
                        min={22}
                        max={60}
                        value={studioDraftOpts.width}
                        onChange={(e) => setStudioDraftOpts((o) => ({ ...o, width: Number(e.target.value) }))}
                        className="w-24 accent-ink"
                      />
                    </label>

                    <label className="flex items-center justify-between text-[10.5px] text-ink-soft">
                      <span>Depth: <strong>{studioDraftOpts.depth} ft</strong></span>
                      <input
                        type="range"
                        min={18}
                        max={50}
                        value={studioDraftOpts.depth}
                        onChange={(e) => setStudioDraftOpts((o) => ({ ...o, depth: Number(e.target.value) }))}
                        className="w-24 accent-ink"
                      />
                    </label>
                  </div>
                </div>

                {/* Real-time SVG Blueprint Preview Canvas */}
                <div className="flex-1 rounded-xl border border-line bg-paper/20 p-2 overflow-hidden flex items-center justify-center min-h-[300px]">
                  <MiniPlan plan={currentStudioPlan} />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-ink-faint">
                  <span>{studioSummary.bedrooms} BED · {studioSummary.bathrooms} BATH</span>
                  <span>{currentStudioPlan.rooms.length} ROOMS · {currentStudioPlan.walls?.length || 18} WALLS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
