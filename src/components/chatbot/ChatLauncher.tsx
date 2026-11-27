import { forwardRef } from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatLauncherProps {
  /** The chat panel is open and on screen: the launcher steps out of the way (still mounted). */
  hidden: boolean;
  /** The panel is still downloading after a click. */
  busy: boolean;
  onOpen: () => void;
  /** Hover, focus or touch: the visitor is about to open the chat, so start fetching the panel. */
  onIntent: () => void;
}

/**
 * The floating chat button (B8 / FD-32, FF-7, FF-11). This file is all of the chat that ships in
 * the main bundle; the panel is a separate chunk (./ChatPanel), fetched on intent or on click.
 *
 * - 56 px, solid --gold with a --gold-foreground (navy) icon, 7.79:1. The launcher is the site's one
 *   gold element. A soft --shadow-md, --shadow-lg on hover; tokens only, no hex.
 * - Attention (A11, WCAG 2.2.2): two --gold waves at 35 %, scale 1 to 1.6, the second 1 s after the
 *   first; all motion is over by 3.5 s (the chat-launcher-* keyframes in src/index.css). The waves
 *   are hidden and the icon bob is off under prefers-reduced-motion.
 * - It stays mounted while the panel is open (visibility: hidden, so not focusable and not in the
 *   accessibility tree), so closing the panel can return focus to it.
 */
const ChatLauncher = forwardRef<HTMLButtonElement, ChatLauncherProps>(({ hidden, busy, onOpen, onIntent }, ref) => (
  // Floating Chat Button
  <div
    data-chat-launcher
    className={cn(
      "fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 motion-safe:animate-reveal",
      hidden && "invisible",
    )}
  >
    <div className="relative">
      <div
        aria-hidden="true"
        className="chat-launcher-wave-1 pointer-events-none absolute inset-0 rounded-full bg-gold motion-reduce:hidden"
      />
      <div
        aria-hidden="true"
        className="chat-launcher-wave-2 pointer-events-none absolute inset-0 rounded-full bg-gold motion-reduce:hidden"
      />
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        aria-label="Open chat with Amina"
        aria-haspopup="dialog"
        aria-busy={busy || undefined}
        className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-md transition-[box-shadow,transform] duration-base ease-standard hover:shadow-lg motion-safe:hover:-translate-y-0.5 aria-busy:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {/* Two gentle bobs, then at rest. */}
        <span data-chat-launcher-icon className="chat-launcher-bob block motion-reduce:animate-none">
          <Bot aria-hidden="true" className="h-7 w-7" />
        </span>
      </button>
    </div>
  </div>
  // End Floating Chat Button
));
ChatLauncher.displayName = "ChatLauncher";

export default ChatLauncher;
