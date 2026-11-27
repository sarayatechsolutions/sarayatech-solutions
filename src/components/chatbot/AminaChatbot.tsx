import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Minimize2, Maximize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import chatbotService, { CHAT_UNAVAILABLE_MESSAGE } from "@/services/chatbot.service";
import { useNavigate } from "react-router-dom";
import MarkdownRenderer from "./MarkdownRenderer";
import { CHAT_PRIVACY_NOTICE, PRIVACY_PATH } from "@/content/legal/legal";

/**
 * STS-066 (WCAG 2.2.2): the typing dots used to bounce in an endless framer-motion loop for as long as a reply took.
 * 0.6 s x (1 + 6) runs + the last dot's 0.4 s delay = 4.6 s, under the 5 s limit; the dots then rest and
 * the visually hidden "Amina is typing" status keeps saying a reply is on its way.
 */
export const TYPING_DOT_REPEATS = 6;

interface Message {
  id: string;
  text: string;
  sender: "user" | "amina";
  timestamp: Date;
}

const AminaChatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm Amina, your digital guide at SarayaTech Solutions. How can I help you today?",
      sender: "amina",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickActions = chatbotService.getQuickActions();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (customMessage?: string) => {
    const messageText = customMessage || inputValue;
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);
    setShowQuickActions(false);

    try {
      // Get response from chatbot service (now async with ChatGPT support)
      const response = await chatbotService.getResponse(messageText);

      const aminaResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: "amina",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aminaResponse]);
    } catch (error) {
      console.error('[Chatbot UI] Error getting response:', error);

      // Show error message to user
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: CHAT_UNAVAILABLE_MESSAGE,
        sender: "amina",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (message: string) => {
    handleSendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="relative">
              {/* Wave rings. STS-062 (WCAG 2.2.2): three staggered waves that end 4.5 s after the launcher
                  appears, then rest invisible; the chat-launcher-* keyframes in src/index.css hold the
                  timing. Hidden outright for prefers-reduced-motion. */}
              <div
                aria-hidden="true"
                className="chat-launcher-wave-1 pointer-events-none absolute inset-0 rounded-full motion-reduce:hidden"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #C4A040 100%)",
                }}
              />
              <div
                aria-hidden="true"
                className="chat-launcher-wave-2 pointer-events-none absolute inset-0 rounded-full motion-reduce:hidden"
                style={{
                  background: "linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)",
                }}
              />
              <div
                aria-hidden="true"
                className="chat-launcher-wave-3 pointer-events-none absolute inset-0 rounded-full motion-reduce:hidden"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #C4A040 100%)",
                }}
              />

              {/* Main button: one 4 s gradient sheen, then static (STS-062). The hover transition is set with
                  [transition-duration:300ms], not duration-300: tailwindcss-animate makes duration-300 set
                  animation-duration as well, which cut the sheen to 0.3 s. */}
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Open chat with Amina"
                className="chat-launcher-sheen motion-reduce:animate-none relative h-16 w-16 rounded-full shadow-lg hover:shadow-2xl hover:scale-110 motion-reduce:hover:scale-100 motion-reduce:![background-position:50%_50%] transition-all [transition-duration:300ms] flex items-center justify-center z-10 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #FFA500 50%, #D4AF37 100%)",
                  backgroundSize: "200% 200%",
                }}
              >
                {/* Two 2 s bobs, then at rest (STS-062). */}
                <span data-chat-launcher-icon className="chat-launcher-bob motion-reduce:animate-none block">
                  <Bot aria-hidden="true" className="h-8 w-8 text-gray-900" />
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? "auto" : "600px"
            }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            // STS-041: full width minus an 8 px gutter on phones (no horizontal overflow at 320 px), the
            // 380 px panel from `sm` up; never taller than the viewport, so the header (close button)
            // and the input stay on screen even when the 600 px height does not fit.
            data-chat-panel
            className="fixed inset-x-2 bottom-2 max-h-[calc(100dvh-1rem)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:max-w-[calc(100vw-3rem)] sm:max-h-[calc(100dvh-3rem)] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div data-chat-header className="shrink-0 bg-gradient-to-r from-gold/20 to-accent/20 border-b border-gray-200 p-3 sm:p-4 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0 border-2 border-gold">
                  <AvatarFallback aria-hidden="true" className="bg-gold text-gray-900 font-bold">
                    A
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-gray-900 font-semibold">Amina</h3>
                    <Badge className="bg-gold text-gray-900 hover:bg-gold text-[10px] px-1.5 py-0 h-4">
                      AI
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">Digital Guide • Powered by NLP</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(!isMinimized)}
                  aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                  className="h-11 w-11 text-gray-700 hover:bg-gray-900/10 hover:text-gray-900"
                >
                  {isMinimized ? (
                    <Maximize2 aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Minimize2 aria-hidden="true" className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close chat"
                  className="h-11 w-11 text-gray-700 hover:bg-gray-900/10 hover:text-gray-900"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            {!isMinimized && (
              <>
                <ScrollArea className="min-h-0 flex-1 p-4 bg-white" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          message.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] min-w-0 [overflow-wrap:anywhere] rounded-2xl px-4 py-3 shadow-sm ${
                            message.sender === "user"
                              ? "bg-gold text-gray-900"
                              : "bg-gray-900 text-white"
                          }`}
                        >
                          <div className="text-sm leading-relaxed">
                            {message.sender === "user" ? (
                              // For user messages, just display plain text
                              <div className="whitespace-pre-line">{message.text}</div>
                            ) : (
                              // For Amina messages, use MarkdownRenderer
                              <MarkdownRenderer
                                content={message.text}
                                onLinkClick={() => setIsOpen(false)}
                              />
                            )}
                          </div>
                          <span className="text-xs opacity-80 mt-2 block">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </motion.div>
                    ))}

                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-gray-900 rounded-2xl px-4 py-3 shadow-sm" role="status">
                          <span className="sr-only">Amina is typing</span>
                          <div className="flex gap-1" aria-hidden="true">
                            <motion.div
                              animate={{ y: [0, -8, 0] }}
                              transition={{ duration: 0.6, repeat: TYPING_DOT_REPEATS, delay: 0 }}
                              className="w-2 h-2 bg-gold rounded-full"
                            />
                            <motion.div
                              animate={{ y: [0, -8, 0] }}
                              transition={{ duration: 0.6, repeat: TYPING_DOT_REPEATS, delay: 0.2 }}
                              className="w-2 h-2 bg-gold rounded-full"
                            />
                            <motion.div
                              animate={{ y: [0, -8, 0] }}
                              transition={{ duration: 0.6, repeat: TYPING_DOT_REPEATS, delay: 0.4 }}
                              className="w-2 h-2 bg-gold rounded-full"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Quick Actions */}
                    {showQuickActions && messages.length === 1 && !isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-wrap gap-2 mt-4"
                      >
                        {quickActions.map((action, index) => (
                          <motion.button
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleQuickAction(action.message)}
                            className="min-h-11 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors border border-gray-300 flex items-center gap-1 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <Sparkles aria-hidden="true" className="h-3 w-3" />
                            {action.label}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div data-chat-input-area className="shrink-0 border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
                  {/* REQ-149 (STS-037): visible before the first message; names the processor like /privacy
                      does. The link opens a new tab so the open conversation is not lost. */}
                  <p id="amina-privacy-notice" data-chat-privacy-notice className="text-xs text-gray-600 mb-2">
                    {CHAT_PRIVACY_NOTICE.text}{" "}
                    <a
                      href={PRIVACY_PATH}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-gray-800 underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {CHAT_PRIVACY_NOTICE.linkText}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </p>
                  <div className="flex gap-2">
                    <Input
                      aria-label="Message Amina"
                      aria-describedby="amina-privacy-notice"
                      maxLength={1000}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="h-11 min-w-0 flex-1 bg-white border-gray-500 text-gray-900 placeholder:text-gray-500"
                    />
                    <Button
                      onClick={() => handleSendMessage()}
                      aria-label="Send message"
                      disabled={!inputValue.trim() || isTyping}
                      className="h-11 w-11 shrink-0 bg-gold hover:bg-gold/90 text-gray-900 shadow-md"
                    >
                      <Send aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Powered by SarayaTech AI
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AminaChatbot;
