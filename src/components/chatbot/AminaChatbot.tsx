import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Minimize2, Maximize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import chatbotService from "@/services/chatbot.service";
import { useNavigate } from "react-router-dom";
import MarkdownRenderer from "./MarkdownRenderer";

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
        text: "I apologize, but I encountered an error. Please try again or contact our team at info@sarayatech.com",
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
              {/* Animated Wave Rings */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #C4A040 100%)",
                }}
                animate={{
                  scale: [1, 2.2],
                  opacity: [0.5, 0.3, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: [0.4, 0, 0.2, 1],
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #FFA500 0%, #FF8C00 100%)",
                }}
                animate={{
                  scale: [1, 2.2],
                  opacity: [0.5, 0.3, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 1,
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #C4A040 100%)",
                }}
                animate={{
                  scale: [1, 2.2],
                  opacity: [0.5, 0.3, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 2,
                }}
              />

              {/* Main Button with Gradient Animation */}
              <motion.button
                onClick={() => setIsOpen(true)}
                className="relative h-16 w-16 rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-10 overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #D4AF37 0%, #FFA500 50%, #D4AF37 100%)",
                  backgroundSize: "200% 200%",
                }}
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <motion.div
                  animate={{
                    y: [0, -4, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Bot className="h-8 w-8 text-dark" />
                </motion.div>
              </motion.button>
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
            className="fixed bottom-6 right-6 w-[380px] bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-gold/20 to-accent/20 border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-gold">
                  <AvatarFallback className="bg-gradient-to-br from-gold to-accent text-dark font-bold">
                    A
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-gray-900 font-semibold">Amina</h3>
                    <Badge className="bg-gradient-to-r from-gold to-accent text-dark text-[10px] px-1.5 py-0 h-4">
                      AI
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">Digital Guide • Powered by NLP</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            {!isMinimized && (
              <>
                <ScrollArea className="flex-1 p-4 bg-white" ref={scrollAreaRef}>
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
                          className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                            message.sender === "user"
                              ? "bg-gradient-to-r from-gold to-accent text-dark"
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
                          <span className="text-xs opacity-60 mt-2 block">
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
                        <div className="bg-gray-900 rounded-2xl px-4 py-3 shadow-sm">
                          <div className="flex gap-1">
                            <motion.div
                              animate={{ y: [0, -8, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                              className="w-2 h-2 bg-gold rounded-full"
                            />
                            <motion.div
                              animate={{ y: [0, -8, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                              className="w-2 h-2 bg-gold rounded-full"
                            />
                            <motion.div
                              animate={{ y: [0, -8, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
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
                            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full transition-colors border border-gray-200 flex items-center gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            {action.label}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="flex gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-gold focus:ring-gold"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isTyping}
                      className="bg-gradient-to-r from-gold to-accent hover:opacity-90 text-dark shadow-md"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
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
