import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, CalendarCheck, LayoutGrid, Mail, MessageSquare, Minimize2, Maximize2, Send, Tag, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import chatbotService, { CHAT_UNAVAILABLE_MESSAGE } from "@/services/chatbot.service";
import { CHAT_LIMITS } from "@/services/openai.service";
import MarkdownRenderer from "./MarkdownRenderer";
import { CHAT_PRIVACY_NOTICE, PRIVACY_PATH } from "@/content/legal/legal";
import { cn } from "@/lib/utils";

/**
 * STS-066 (WCAG 2.2.2): the typing dots used to bounce in an endless framer-motion loop for as long as a reply took.
 * 0.6 s x (1 + 6) runs + the last dot's 0.4 s delay = 4.6 s, under the 5 s limit; the dots then rest and
 * the visually hidden "Amina is typing" status keeps saying a reply is on its way.
 */
export const TYPING_DOT_REPEATS = 6;

/** Why the panel closed: a dismissal returns focus to the launcher, a navigation leaves it to the new page. */
export type ChatCloseReason = "dismiss" | "navigate";

export interface ChatPanelProps {
  open: boolean;
  onClose: (reason: ChatCloseReason) => void;
  /** Called once, when the panel has mounted: the launcher can step aside. */
  onReady?: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "amina";
  timestamp: Date;
}

const GREETING = "Hello! I'm Amina, your digital guide at SarayaTech Solutions. How can I help you today?";

/** One lucide icon per quick action (FD-31: no emoji). */
const QUICK_ACTION_ICONS: Record<string, LucideIcon> = {
  "Request a consultation": CalendarCheck,
  "Our services": LayoutGrid,
  Pricing: Tag,
  Contact: Mail,
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** A10: open slow / enter, close base / exit; framer's reducedMotion="user" keeps only the cross-fade. */
const PANEL_MOTION = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const } },
};

/**
 * The chat panel (lazy chunk, FF-11). A modal dialog (FF-7): named by its title, focus moves to the
 * message field on open and is kept inside while it is open, Escape closes it. New messages are
 * announced in a polite log. One request at a time (FF-6): a send while a reply is pending is
 * refused, closing the panel cancels the request, and a late reply is dropped.
 *
 * It stays mounted after the first open (closed = nothing rendered), so the conversation survives
 * closing and reopening.
 */
const ChatPanel = ({ open, onClose, onReady }: ChatPanelProps) => {
  const titleId = useId();
  const noticeId = "amina-privacy-notice";
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: "greeting", text: GREETING, sender: "amina", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  // FF-6: the in-flight request, its sequence number and a synchronous pending flag (state lags a render).
  const pendingRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);

  const quickActions = chatbotService.getQuickActions();

  useEffect(() => {
    onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  /** Cancels the pending request, if any; its reply will be ignored. */
  const cancelPending = useCallback(() => {
    sequenceRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    pendingRef.current = false;
    setIsTyping(false);
  }, []);

  // FF-6: closing cancels the request in flight; so does leaving the page (unmount).
  useEffect(() => {
    if (!open) cancelPending();
  }, [open, cancelPending]);
  useEffect(() => () => controllerRef.current?.abort(), []);

  // FF-7: focus moves into the dialog on open, to the message field (or the Expand button when minimized).
  useEffect(() => {
    if (!open) return;
    (isMinimized ? toggleRef.current : inputRef.current)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on open only
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const append = (text: string, sender: Message["sender"]) => {
    nextId.current += 1;
    const message: Message = { id: `m${nextId.current}`, text, sender, timestamp: new Date() };
    setMessages((prev) => [...prev, message]);
  };

  const sendMessage = async (raw: string) => {
    const text = raw.trim().slice(0, CHAT_LIMITS.message);
    // FF-6: one request at a time. Enter, the Send button and the chips all come through here.
    if (!text || pendingRef.current) return;

    pendingRef.current = true;
    const controller = new AbortController();
    controllerRef.current = controller;
    const sequence = ++sequenceRef.current;

    append(text, "user");
    setInputValue("");
    setIsTyping(true);
    setShowQuickActions(false);
    // A chip disappears once used, and the Send button may have been clicked: keep focus on the field.
    inputRef.current?.focus();

    let reply: string | null;
    try {
      reply = await chatbotService.getResponse(text, { signal: controller.signal });
    } catch {
      reply = controller.signal.aborted ? null : CHAT_UNAVAILABLE_MESSAGE;
    }

    // Stale: the panel was closed or a newer request took over. Drop the reply.
    if (sequence !== sequenceRef.current || controller.signal.aborted) return;
    pendingRef.current = false;
    controllerRef.current = null;
    setIsTyping(false);
    if (reply) append(reply, "amina");
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void sendMessage(inputValue);
  };

  // FF-7: Escape closes; Tab and Shift+Tab wrap inside the dialog (aria-modal).
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose("dismiss");
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    // Everything the panel renders is on screen (minimized parts are unmounted, not hidden).
    const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };

  const canSend = inputValue.trim().length > 0 && !isTyping;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={handleKeyDown}
          {...PANEL_MOTION}
          // STS-041: full width minus an 8 px gutter on phones (no horizontal overflow at 320 px), the
          // 380 px panel from `sm` up; never taller than the viewport, so the header (close button)
          // and the input stay on screen even when the 600 px height does not fit.
          data-chat-panel
          className={cn(
            "fixed inset-x-2 bottom-2 z-50 flex max-h-[calc(100dvh-1rem)] origin-bottom-right flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:max-w-[calc(100vw-3rem)] sm:max-h-[calc(100dvh-3rem)]",
            isMinimized ? "h-auto" : "h-[600px]",
          )}
        >
          {/* Header: navy, white text (FD-31). */}
          <div
            data-chat-header
            className="flex shrink-0 items-center justify-between gap-2 bg-primary px-3 py-2.5 text-primary-foreground sm:px-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/10 ring-1 ring-primary-foreground/25"
              >
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="font-heading text-base font-semibold leading-tight">
                  Amina
                </h2>
                <p className="text-xs leading-tight text-primary-foreground/80">AI assistant</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                ref={toggleRef}
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized((v) => !v)}
                aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                className="h-11 w-11 text-primary-foreground hover:bg-primary-foreground/10 active:bg-primary-foreground/20 focus-visible:outline-white focus-visible:shadow-[0_0_0_2px_hsl(var(--primary-dark))]"
              >
                {isMinimized ? <Maximize2 aria-hidden="true" /> : <Minimize2 aria-hidden="true" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onClose("dismiss")}
                aria-label="Close chat"
                className="h-11 w-11 text-primary-foreground hover:bg-primary-foreground/10 active:bg-primary-foreground/20 focus-visible:outline-white focus-visible:shadow-[0_0_0_2px_hsl(var(--primary-dark))]"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <ScrollArea className="min-h-0 flex-1 bg-background">
                <div className="space-y-3 p-4">
                  {/* FF-7: replies are announced politely; the user's own lines are read too, in order. */}
                  <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation" className="space-y-3">
                    {messages.map((message) => {
                      const mine = message.sender === "user";
                      return (
                        <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div
                            data-chat-bubble={message.sender}
                            className={cn(
                              "max-w-[80%] min-w-0 [overflow-wrap:anywhere] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                              mine
                                ? "rounded-br-sm bg-primary text-primary-foreground"
                                : "rounded-bl-sm bg-muted text-foreground",
                            )}
                          >
                            <span className="sr-only">{mine ? "You said: " : "Amina said: "}</span>
                            {mine ? (
                              <div className="whitespace-pre-line">{message.text}</div>
                            ) : (
                              <MarkdownRenderer content={message.text} onLinkClick={() => onClose("navigate")} />
                            )}
                            <time
                              dateTime={message.timestamp.toISOString()}
                              className={cn(
                                "mt-1 block text-xs",
                                mine ? "text-primary-foreground/80" : "text-muted-foreground",
                              )}
                            >
                              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </time>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="rounded-lg rounded-bl-sm bg-muted px-4 py-3" role="status">
                        <span className="sr-only">Amina is typing</span>
                        <div className="flex gap-1" aria-hidden="true">
                          <motion.div
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: TYPING_DOT_REPEATS, delay: 0 }}
                            className="h-2 w-2 rounded-full bg-muted-foreground"
                          />
                          <motion.div
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: TYPING_DOT_REPEATS, delay: 0.2 }}
                            className="h-2 w-2 rounded-full bg-muted-foreground"
                          />
                          <motion.div
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: TYPING_DOT_REPEATS, delay: 0.4 }}
                            className="h-2 w-2 rounded-full bg-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick actions: outline chips, one lucide icon each, no emoji (FD-31). */}
                  {showQuickActions && messages.length === 1 && !isTyping && (
                    <ul aria-label="Suggested questions" className="flex flex-wrap gap-2 pt-1">
                      {quickActions.map((action) => {
                        const Icon = QUICK_ACTION_ICONS[action.label] ?? MessageSquare;
                        return (
                          <li key={action.label}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void sendMessage(action.message)}
                              className="h-auto min-h-11 rounded-full px-3.5 py-2 text-sm font-medium"
                            >
                              <Icon aria-hidden="true" />
                              {action.label}
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div data-chat-input-area className="shrink-0 border-t border-border bg-background p-3 sm:p-4">
                {/* REQ-149 (STS-037): visible before the first message; names the processor like /privacy
                    does. It is the panel's one "powered by" statement (FD-31). The link opens a new tab
                    so the open conversation is not lost. */}
                <p id={noticeId} data-chat-privacy-notice className="mb-2 text-xs leading-snug text-muted-foreground">
                  {CHAT_PRIVACY_NOTICE.text}{" "}
                  <a
                    href={PRIVACY_PATH}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm font-semibold text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {CHAT_PRIVACY_NOTICE.linkText}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </p>
                <form className="flex gap-2" onSubmit={handleSubmit}>
                  <Input
                    ref={inputRef}
                    aria-label="Message Amina"
                    aria-describedby={noticeId}
                    maxLength={CHAT_LIMITS.message}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    autoComplete="off"
                    className="h-11 min-w-0 flex-1"
                  />
                  {/* aria-disabled, not disabled: a clicked button that disables itself drops focus to <body>. */}
                  <Button
                    type="submit"
                    variant="secondary"
                    size="icon"
                    aria-label="Send message"
                    aria-disabled={!canSend || undefined}
                    className="h-11 w-11"
                  >
                    <Send aria-hidden="true" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;
