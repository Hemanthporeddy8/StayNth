import React, { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  Loader2,
  Sparkles,
  ShieldCheck,
  Building,
  CheckCircle2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  getSupportThreadId,
  fetchThreadMessages,
  sendSupportMessage,
  markThreadRead,
  type SupportMessage,
} from "@/lib/support";
import { fileToRoomImage } from "@/lib/imageUpload";
import { getStoredUser } from "@/lib/auth";
import { cn } from "@/utils/cn";
import { StayNthIcon } from "@/components/StayNthLogo";

export function SupportChatDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachedSketch, setAttachedSketch] = useState<{ name: string; url: string } | null>(null);
  const [propertyContext, setPropertyContext] = useState<{ title?: string; id?: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const threadId = useRef(getSupportThreadId()).current;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentUser = getStoredUser();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    const list = await fetchThreadMessages(threadId);
    setMessages(list);

    // Calculate unread from StayNth architect/founder
    const unread = list.filter(
      (m) =>
        m.status === "unread" &&
        (m.senderRole === "architect" || m.senderRole === "founder" || m.senderRole === "admin")
    ).length;

    if (!open) {
      setUnreadCount(unread);
    } else if (unread > 0) {
      await markThreadRead(threadId);
      setUnreadCount(0);
    }
  };

  // Initial load and periodic polling
  useEffect(() => {
    loadMessages();
    const timer = setInterval(loadMessages, 5000);
    return () => clearInterval(timer);
  }, [open]);

  // When drawer opens, scroll to bottom and mark read
  useEffect(() => {
    if (open) {
      scrollToBottom();
      if (unreadCount > 0) {
        markThreadRead(threadId).then(() => setUnreadCount(0));
      }
    }
  }, [open, messages.length]);

  // Listen to open-support events from anywhere in the app
  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        propertyTitle?: string;
        propertyId?: string;
        initialMessage?: string;
      }>;
      setOpen(true);
      if (customEvent.detail) {
        if (customEvent.detail.propertyTitle || customEvent.detail.propertyId) {
          setPropertyContext({
            title: customEvent.detail.propertyTitle,
            id: customEvent.detail.propertyId,
          });
        }
        if (customEvent.detail.initialMessage) {
          setInput(customEvent.detail.initialMessage);
        }
      }
    };

    window.addEventListener("staynth:open-support", handleOpenEvent);
    return () => window.removeEventListener("staynth:open-support", handleOpenEvent);
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text && !attachedSketch) return;

    setSending(true);
    const sent = await sendSupportMessage({
      threadId,
      message: text,
      attachmentUrl: attachedSketch?.url || null,
      senderName: currentUser ? currentUser.name : "Guest",
      senderRole: currentUser?.role === "founder" ? "founder" : currentUser?.role === "co_admin" ? "architect" : "host",
      email: currentUser ? currentUser.email : null,
      propertyId: propertyContext?.id || null,
      propertyTitle: propertyContext?.title || null,
    });

    if (sent) {
      setMessages((prev) => [...prev, sent]);
      setInput("");
      setAttachedSketch(null);
      scrollToBottom();
    }
    setSending(false);
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const processed = await fileToRoomImage(file);
      setAttachedSketch({ name: processed.name || file.name, url: processed.url });
    } catch (err: any) {
      alert(err.message || "Failed to process image.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {/* FLOATING TRIGGER BUTTON (BOTTOM RIGHT) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full border border-amber-400/40 bg-ink px-4 py-2.5 text-white shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:border-amber-400 hover:shadow-amber-900/20 active:scale-95 group"
          aria-label="Open StayNth Concierge Support"
        >
          <div className="relative flex items-center justify-center">
            <StayNthIcon className="h-5 w-5 rounded-md" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-ink animate-pulse" />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[12px] font-semibold tracking-wide text-amber-200">
              Concierge & Desk
            </span>
            <span className="text-[9.5px] font-mono text-white/70">
              24/7 Architects Online
            </span>
          </div>

          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 font-mono text-[10px] font-bold text-ink ring-2 ring-ink animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* CHAT DRAWER / WINDOW */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line bg-white shadow-2xl sm:inset-y-auto sm:bottom-6 sm:right-6 sm:h-[580px] sm:w-[410px] sm:rounded-2xl sm:border">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-ink px-4 py-3 text-white sm:rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-paper-deep text-ink">
                <StayNthIcon className="h-5 w-5 rounded-md" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-ink" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-serif text-[14px] font-semibold text-amber-200">
                    StayNth Concierge
                  </h3>
                  <span className="rounded bg-amber-400/20 px-1 py-0.2 font-mono text-[8.5px] font-semibold uppercase text-amber-300">
                    Official
                  </span>
                </div>
                <p className="text-[10px] text-white/70">
                  Architect Team & Founder Desk · 100% In-App
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href="#demo"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-2 py-1 text-[10px] font-mono text-amber-200 hover:bg-amber-400/25 transition shadow-2xs"
                title="Open Bank-Style 12h Ticket Demo Sandbox"
              >
                🧪 Try Sandbox Demo
              </a>

              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Property Context Banner (if triggered from listing) */}
          {propertyContext?.title && (
            <div className="flex items-center justify-between border-b border-amber-200/50 bg-amber-50/90 px-3.5 py-1.5 text-[11px] text-amber-900">
              <span className="truncate">
                Regarding listing: <strong>{propertyContext.title}</strong>
              </span>
              <button
                type="button"
                onClick={() => setPropertyContext(null)}
                className="text-amber-700 hover:text-amber-900 ml-2"
                title="Clear listing context"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-paper/40">
            {/* Welcome banner if no messages */}
            {messages.length === 0 && (
              <div className="rounded-xl border border-line bg-white p-4 text-center shadow-xs">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-800 mb-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <h4 className="font-serif text-[13px] font-semibold text-ink">
                  Welcome to StayNth Concierge
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                  Need a 3D floor plan drawn from a paper sketch? Or have a question about listing or booking?
                  Chat with our architectural team right here.
                </p>

                <div className="mt-3 flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      setInput("Hi! I have a paper sketch of my property. Can your team draft it into 3D for me?");
                    }}
                    className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-left text-[10.5px] font-medium text-ink hover:border-ink/30 transition"
                  >
                    📐 I have a hand-drawn sketch (Draft 3D for me)
                  </button>
                  <button
                    onClick={() => {
                      setInput("Hi! I'm planning to list my homestay and want help setting it up.");
                    }}
                    className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-left text-[10.5px] font-medium text-ink hover:border-ink/30 transition"
                  >
                    🏡 Question about listing my property
                  </button>
                  <button
                    onClick={() => {
                      setInput("Hi! I have a question about booking and founder expeditions.");
                    }}
                    className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-left text-[10.5px] font-medium text-ink hover:border-ink/30 transition"
                  >
                    🧭 Booking or expedition inquiry
                  </button>
                </div>
              </div>
            )}

            {/* Render message list */}
            {messages.map((msg) => {
              const isStaff =
                msg.senderRole === "architect" ||
                msg.senderRole === "founder" ||
                msg.senderRole === "admin";

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    isStaff ? "mr-auto items-start" : "ml-auto items-end"
                  )}
                >
                  {/* Sender Badge */}
                  <div className="mb-0.5 flex items-center gap-1 text-[10px] text-ink-faint">
                    {isStaff ? (
                      <span className="flex items-center gap-1 font-semibold text-accent">
                        {msg.senderRole === "founder" ? "👑 Founder Desk" : "🏛️ StayNth Architect"}
                      </span>
                    ) : (
                      <span>{msg.senderName || "You"}</span>
                    )}
                    <span>·</span>
                    <span className="font-mono text-[9px]">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed shadow-2xs",
                      isStaff
                        ? "rounded-tl-xs border border-line bg-white text-ink"
                        : "rounded-tr-xs bg-ink text-white"
                    )}
                  >
                    {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}

                    {/* Attachment preview */}
                    {msg.attachmentUrl && (
                      <div className="mt-2 overflow-hidden rounded-lg border border-black/10">
                        <img
                          src={msg.attachmentUrl}
                          alt="Attachment"
                          className="max-h-48 w-full object-cover cursor-pointer hover:opacity-95 transition"
                          onClick={() => setZoomImage(msg.attachmentUrl || null)}
                        />
                        <div className="flex items-center justify-between bg-black/5 px-2 py-1 text-[9.5px]">
                          <span className="font-mono text-ink-faint truncate">Floor plan / Sketch</span>
                          <button
                            type="button"
                            onClick={() => setZoomImage(msg.attachmentUrl || null)}
                            className="font-medium text-accent hover:underline"
                          >
                            View Full
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment Preview in Composer */}
          {attachedSketch && (
            <div className="flex items-center justify-between border-t border-line bg-paper px-3 py-1.5 text-[11px]">
              <div className="flex items-center gap-2 truncate">
                <img
                  src={attachedSketch.url}
                  alt="Draft"
                  className="h-7 w-7 rounded object-cover border border-line"
                />
                <span className="font-mono text-[10.5px] text-ink truncate">
                  {attachedSketch.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedSketch(null)}
                className="text-ink-faint hover:text-red-600 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Input Composer */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-line bg-white p-3 sm:rounded-b-2xl"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleAttachFile}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || sending}
              title="Attach paper sketch or photo"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-paper text-ink-soft hover:bg-paper-deep hover:text-ink transition"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={attachedSketch ? "Add a note or send sketch…" : "Type your message or ask architects…"}
              className="h-9 flex-1 rounded-xl border border-line bg-paper px-3 text-[12px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-white focus:outline-none"
            />

            <button
              type="submit"
              disabled={sending || (!input.trim() && !attachedSketch)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-white transition hover:bg-ink/90 disabled:opacity-40"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* FULL-IMAGE ZOOM MODAL */}
      {zoomImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white p-2">
            <button
              onClick={() => setZoomImage(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={zoomImage}
              alt="Floor plan sketch full preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
