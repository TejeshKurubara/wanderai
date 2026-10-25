import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Send,
  Zap,
  Sparkles,
  Trash2,
  Copy,
  Check,
  User,
  Bot,
  Info,
} from 'lucide-react';
import { Trip, CompanionMessage } from '../../types/trip';
import { tripService } from '../../services/tripService';

interface AICompanionTabProps {
  trip: Trip;
}

const QUICK_QUESTIONS = [
  '💰 What is my remaining budget?',
  '🍽️ How much have I spent on food so far?',
  '📅 What is my schedule for Day 1?',
  '🏨 Do I have any pending bookings?',
  '💱 Convert ₹5,000 to USD',
  '☕ Any great local cafes or snacks nearby?',
  '🌧️ What are indoor alternatives if it rains?',
];

export const AICompanionTab: React.FC<AICompanionTabProps> = ({ trip }) => {
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingHistory, setFetchingHistory] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, [trip.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      setFetchingHistory(true);
      const res = await tripService.getCompanionHistory(trip.id);
      if (res.history && res.history.length > 0) {
        setMessages(res.history);
      } else {
        // Add initial friendly welcome message
        setMessages([
          {
            id: 'welcome-1',
            role: 'assistant',
            content: `👋 Hi! I'm your dedicated AI Travel Companion for **${trip.destination}**.\n\nI have complete real-time access to your itinerary, bookings, and budget. Ask me anything like *"How much budget do I have left?"*, *"What's my next stop?"*, or ask for personalized recommendations!`,
            created_at: new Date().toISOString(),
            is_deterministic: true,
            intent: 'welcome',
          },
        ]);
      }
    } catch {
      // Fallback welcome message if network issue
      setMessages([
        {
          id: 'welcome-fallback',
          role: 'assistant',
          content: `👋 Hi! I'm your AI Travel Companion for **${trip.destination}**. How can I help you today?`,
          created_at: new Date().toISOString(),
          is_deterministic: true,
        },
      ]);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: CompanionMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await tripService.sendCompanionMessage(trip.id, text);
      const assistantMsg: CompanionMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        created_at: new Date().toISOString(),
        is_deterministic: res.is_deterministic,
        intent: res.intent,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: CompanionMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${
          err?.response?.data?.message ||
          "Sorry, I couldn't reach the travel service. Please check your network and try again."
        }`,
        created_at: new Date().toISOString(),
        is_deterministic: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your companion chat history?')) {
      return;
    }
    try {
      await tripService.clearCompanionHistory(trip.id);
      loadChatHistory();
    } catch {
      setMessages([]);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-surface to-surface-alt border border-border p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Context-Aware On-Trip Assistant</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-text">
              AI Travel Companion
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-1 max-w-2xl">
              Instant answers about your trip itinerary, live expenses, bookings,
              currency conversions, and localized destination advice.
            </p>
          </div>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-border hover:border-accent text-muted hover:text-accent rounded-xl text-xs font-semibold transition-all shadow-sm"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-muted uppercase tracking-wider px-1">
          Quick Prompts
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={loading}
              className="px-3.5 py-1.5 bg-surface border border-border hover:border-primary/50 text-text hover:text-primary rounded-xl text-xs font-medium whitespace-nowrap transition-all shadow-sm hover:bg-primary/5 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-surface border border-border rounded-3xl shadow-sm flex flex-col h-[520px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {fetchingHistory ? (
            <div className="h-full flex items-center justify-center text-xs text-muted">
              Loading chat history...
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isCopied = copiedId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    isUser ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      isUser
                        ? 'bg-primary text-background'
                        : 'bg-surface-alt border border-border text-primary'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-primary text-background rounded-tr-none shadow-sm'
                        : 'bg-surface-alt/70 border border-border text-text rounded-tl-none'
                    }`}
                  >
                    {/* Badge for Assistant messages */}
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-border/50 text-[10px]">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          {msg.is_deterministic ? (
                            <>
                              <Zap className="w-3 h-3 text-secondary" />
                              <span>Instant Data</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-primary" />
                              <span>AI Guidance</span>
                            </>
                          )}
                        </span>

                        <button
                          onClick={() => copyToClipboard(msg.id, msg.content)}
                          className="text-muted hover:text-text transition-colors p-0.5"
                          title="Copy message"
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-primary" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Content */}
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    {/* Timestamp */}
                    <div
                      className={`text-[10px] mt-2 text-right ${
                        isUser ? 'text-background/70' : 'text-muted'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-alt border border-border text-primary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-surface-alt/70 border border-border rounded-2xl rounded-tl-none p-4 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                <div
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-surface-alt/40 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Ask anything about your trip to ${trip.destination}...`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              className="flex-1 bg-surface border border-border rounded-2xl px-4 py-3 text-xs sm:text-sm text-text focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="p-3 bg-primary text-background rounded-2xl hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center gap-1.5 text-[11px] text-muted mt-2 px-1">
            <Info className="w-3 h-3 text-primary shrink-0" />
            <span>
              Real financial and booking queries resolve deterministically in &lt;10ms.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
