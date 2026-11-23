"use client";

import React from "react";
import axios from "axios";
import { Property } from "../app/page"; // Import the Property interface
import { useState, useRef, useEffect } from "react";
import { ThumbsUp, ThumbsDown, ArrowUp, RotateCcw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
import { AiPersonalizedToggle } from "./ai-personalized-toggle";
import { ChatRecommendationCards, ChatCard } from "./chat-recommendation-cards";
import { ChatMarkdown } from "./chat-markdown";

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  cards?: ChatCard[]; // recommended listings shown under an AI reply
}

// Response from POST /api/chat/answer (used by the personalized flow only)
interface RagAnswer {
  reply: string;
  recommended_ids: string[];
  cards?: ChatCard[];
  properties?: Property[];
  fallback?: boolean;
}

// Response from POST /api/chat/message. Memory lives on the server; the browser
// only keeps the session id.
interface ChatMessageResponse {
  sessionId: string;
  intent: "search" | "followup" | "question" | "unknown";
  reply: string;
  properties?: Property[]; // only when a search ran
  recommended_ids: string[];
  cards?: ChatCard[];
  filters?: Record<string, any>;
  fallback?: boolean;
}

// Response from GET /api/chat/session/:id (restore after reload)
interface ChatSessionView {
  sessionId: string;
  messages: { role: "user" | "assistant"; content: string; at: string; cards?: ChatCard[] }[];
  properties?: Property[];
}

const CHAT_SESSION_KEY = "chatSessionId";

const readSessionId = () => {
  try {
    return localStorage.getItem(CHAT_SESSION_KEY);
  } catch {
    return null;
  }
};
const writeSessionId = (id: string | null) => {
  try {
    if (id) localStorage.setItem(CHAT_SESSION_KEY, id);
    else localStorage.removeItem(CHAT_SESSION_KEY);
  } catch {
    // storage unavailable: the chat still works, it just won't survive a reload
  }
};

// UI-only greeting: never stored or sent as conversation.
const welcomeMessage = (): ChatMessage => ({
  id: "welcome",
  type: "ai",
  content:
    "Hi! I'm your AI assistant. Here’s what I can help you with:\n🏠 1. Answer property-related questions  \n🎯 2. Recommend properties that fit your preferences  \n🔍 3. Find property based on your criteria  \n📈 4. Show market price trends and insights  ",
  timestamp: new Date(),
});


interface AiChatPanelProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  setIsAISearch: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AiChatPanel({
  properties,
  setProperties,
  setIsAISearch,
}: AiChatPanelProps) {
  const [aiRequest, setAiRequest] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPersonalizedActive, setIsPersonalizedActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [Exisiting_preferences, setPreferences] = useState<Record<string, any>>(
    {}
  ); // Initialize preferences state

  const question = useRef("");
  const question_asking_preferences = useRef("");
  const conversation = useRef<Array<{ content: string }>>([]);
  const chatStartTimeRef = useRef<number>(0);
  // Server-side chat session; the server holds history, filters and listings.
  const sessionIdRef = useRef<string | null>(null);

  function addMessage(content: string) {
    conversation.current.push({ content });
  }

  function addQuestion(newQuestion: string) {
    question.current = newQuestion;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Restore on mount. Normal chat comes back from the server session; the
  // personalized flow still keeps its own state in sessionStorage.
  useEffect(() => {
    const savedPreferences = sessionStorage.getItem("aiChatPreferences");
    const savedConversation = sessionStorage.getItem("aiChatConversation");
    const savedIsPersonalized = sessionStorage.getItem("aiIsPersonalized");
    let personalized = false;
    try {
      personalized = savedIsPersonalized ? JSON.parse(savedIsPersonalized) === true : false;
    } catch {
      personalized = false;
    }

    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error("Error restoring preferences:", error);
      }
    }
    if (savedConversation) {
      try {
        conversation.current = JSON.parse(savedConversation);
      } catch (error) {
        console.error("Error restoring conversation:", error);
      }
    }
    setIsPersonalizedActive(personalized);

    if (personalized) {
      const savedMessages = sessionStorage.getItem("aiChatMessages");
      if (savedMessages) {
        try {
          setMessages(
            JSON.parse(savedMessages).map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }))
          );
        } catch (error) {
          console.error("Error restoring chat messages:", error);
        }
      }
    }

    const storedId = readSessionId();
    if (!storedId) return;
    sessionIdRef.current = storedId;
    if (personalized) return;

    axios
      .get<ChatSessionView>(
        `${API_URL}/api/chat/session/${encodeURIComponent(storedId)}`,
        { withCredentials: true }
      )
      .then(({ data }) => {
        if (data.messages.length > 0) {
          setMessages([
            welcomeMessage(),
            ...data.messages.map((m, i) => ({
              id: `${data.sessionId}-${i}`,
              type: m.role === "user" ? ("user" as const) : ("ai" as const),
              content: m.content,
              timestamp: new Date(m.at),
              cards: m.cards,
            })),
          ]);
        }
        if (data.properties) {
          setProperties(data.properties);
          setIsAISearch(true);
        }
      })
      .catch((error) => {
        // Expired, deleted or someone else's session: start fresh.
        if (error?.response?.status === 404) {
          writeSessionId(null);
          sessionIdRef.current = null;
        } else {
          console.error("Error restoring chat session:", error);
        }
      });
  }, []);

  // Only the personalized flow keeps messages in the browser.
  useEffect(() => {
    if (isPersonalizedActive && messages.length > 1) {
      sessionStorage.setItem("aiChatMessages", JSON.stringify(messages));
    }
  }, [messages, isPersonalizedActive]);

  useEffect(() => {
    if (Object.keys(Exisiting_preferences).length > 0) {
      sessionStorage.setItem(
        "aiChatPreferences",
        JSON.stringify(Exisiting_preferences)
      );
    }
  }, [Exisiting_preferences]);

  useEffect(() => {
    if (conversation.current.length > 0) {
      sessionStorage.setItem(
        "aiChatConversation",
        JSON.stringify(conversation.current)
      );
    }
  }, [conversation.current]);

  useEffect(() => {
    sessionStorage.setItem(
      "aiIsPersonalized",
      JSON.stringify(isPersonalizedActive)
    );
  }, [isPersonalizedActive]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const handlePersonalizedToggle = () => {
    setIsPersonalizedActive(!isPersonalizedActive);

    setPreferences({}); // Reset preferences when toggling
    conversation.current = []; // Reset conversation when toggling

    // Add a message to indicate the feature is activated/deactivated
    setTimeout(() => {
      const toggleMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        type: "ai",
        content: isPersonalizedActive
          ? "AI Personalized Properties has been deactivated."
          : "AI Personalized Properties is now active! Let’s find your ideal property. Are you looking for a condo, landed house, or apartment?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, toggleMessage]);
    }, 500);
  };

  // Personalized flow: search with the collected preferences.
  const askRag = async (body: { message: string; filters: string }): Promise<RagAnswer> => {
    const { data } = await axios.post<RagAnswer>(`${API_URL}/api/chat/answer`, body);
    if (data.properties) {
      setProperties(data.properties);
      setIsAISearch(true);
    }
    return data;
  };

  // Normal chat: one call; the server loads memory, classifies, searches and saves.
  const sendChatMessage = async (message: string): Promise<ChatMessageResponse> => {
    const { data } = await axios.post<ChatMessageResponse>(
      `${API_URL}/api/chat/message`,
      { message, sessionId: sessionIdRef.current },
      { withCredentials: true }
    );
    if (data.sessionId !== sessionIdRef.current) {
      sessionIdRef.current = data.sessionId;
      writeSessionId(data.sessionId);
    }
    if (data.properties) {
      setProperties(data.properties);
      setIsAISearch(true);
    }
    return data;
  };

  const handleNewChat = () => {
    const id = sessionIdRef.current;
    if (id) {
      axios
        .delete(`${API_URL}/api/chat/session/${encodeURIComponent(id)}`, {
          withCredentials: true,
        })
        .catch(() => {}); // the TTL cleans up if this fails
    }
    sessionIdRef.current = null;
    writeSessionId(null);
    sessionStorage.removeItem("aiChatMessages");
    setMessages([welcomeMessage()]);
  };

  const handleSendMessage = async () => {
    if (aiRequest.trim() === "") return;

    chatStartTimeRef.current = performance.now();

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: aiRequest.trim(),
      timestamp: new Date(),
    };

    const userMessageContent = aiRequest.trim();
    setMessages((prev) => [...prev, newUserMessage]);
    setAiRequest("");
    setIsAiTyping(true);

    try {
      if (!isPersonalizedActive) {
        const answer = await sendChatMessage(userMessageContent);
        console.log("Intent:", answer.intent, "filters:", answer.filters);

        const responseTime = (
          (performance.now() - chatStartTimeRef.current) /
          1000
        ).toFixed(2);
        console.log(
          `⏱️ CHATBOT PERFORMANCE: Response received in ${responseTime} seconds`
        );

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            type: "ai",
            content: answer.reply,
            timestamp: new Date(),
            cards: answer.cards,
          },
        ]);
      }

      // Handle AI Personalized Toggle
      if (isPersonalizedActive) {
        if (conversation.current.length === 0) {
          addMessage(
            `Last Question: house_type question Preferences:${aiRequest.trim()}`
          );
        } else {
          addMessage(
            `Last Question: ${
              question_asking_preferences.current
            } Preferences: ${aiRequest.trim()}`
          );
        }

        console.log("Conversation sent to backend:", conversation.current);

        try {
          const backendResponse = await axios.post(
            `${API_URL}/api/chat/preferences`,
            {
              conversation: conversation.current,
            }
          );

          const {
            intent,
            question_asking_preferences: backendQuestionType,
            question: backendQuestion,
            preferences,
          } = backendResponse.data.reply;

          question.current = backendQuestion;
          question_asking_preferences.current = backendQuestionType;

          console.log("Backend response:", backendResponse.data.reply);

          setPreferences((prevPreferences) => {
            if (Object.keys(prevPreferences).length === 0) {
              return preferences;
            } else {
              const updatedPreferences = mergePreferences(
                prevPreferences,
                preferences
              );

              return updatedPreferences;
            }
          });

          if (intent === "ask" && backendQuestion) {
            const responseTime = (
              (performance.now() - chatStartTimeRef.current) /
              1000
            ).toFixed(2);
            console.log(
              `⏱️ CHATBOT PERFORMANCE: Response received in ${responseTime} seconds`
            );

            const aiQuestion: ChatMessage = {
              id: (Date.now() + 1).toString(),
              type: "ai",
              content: backendQuestion,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiQuestion]);
          } else if (intent === "search") {
            // Search for properties using the collected preferences
            const normalizedPreferences = normalizePreferences(preferences);
            console.log("Normalized preferences:", normalizedPreferences);

            // Retrieve matching listings and get an AI answer written from them
            const answer = await askRag({
              message: `Find properties matching my preferences: ${JSON.stringify(
                normalizedPreferences
              )}`,
              filters: JSON.stringify(normalizedPreferences),
            });

            const responseTime = (
              (performance.now() - chatStartTimeRef.current) /
              1000
            ).toFixed(2);
            console.log(
              `⏱️ CHATBOT PERFORMANCE: Response received in ${responseTime} seconds`
            );

            const aiResponse: ChatMessage = {
              id: (Date.now() + 1).toString(),
              type: "ai",
              content: answer.reply,
              timestamp: new Date(),
              cards: answer.cards,
            };
            setMessages((prev) => [...prev, aiResponse]);
          }

          setAiRequest(""); // Clear the input after sending
        } catch (error) {
          console.error("Error posting preferences to backend:", error);
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              type: "ai",
              content:
                "Sorry, I couldn't process your preferences. Please try again.",
              timestamp: new Date(),
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error generating AI response:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "ai",
          content: "Sorry, I couldn't process your request.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Enter sends, Shift+Enter adds a new line.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Grow the composer with its content, up to about 5 lines.
  const resizeInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  useEffect(() => {
    resizeInput();
  }, [aiRequest]);

  const handleCopy = async (message: ChatMessage) => {
    try {
      try {
        await navigator.clipboard.writeText(message.content);
      } catch {
        // Fallback when the Clipboard API is blocked (permissions, non-secure context).
        const el = document.createElement("textarea");
        el.value = message.content;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        if (!ok) throw new Error("execCommand copy failed");
      }
      setCopiedId(message.id);
      setTimeout(() => setCopiedId((id) => (id === message.id ? null : id)), 1500);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleFeedback = (messageId: string, type: "like" | "dislike") => {
    console.log(`Feedback for message ${messageId}: ${type}`);
    // Here you would typically send feedback to your backend

    // Visual feedback
    const feedbackMessage =
      type === "like"
        ? "Thanks for the feedback! 👍"
        : "I'll try to improve my responses. 👎";

    setTimeout(() => {
      const feedbackResponse: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: "ai",
        content: feedbackMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, feedbackResponse]);
    }, 500);
  };

  const TypingIndicator = () => (
    <div className="flex space-x-1 py-2" aria-label="AI is typing">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "0.1s" }}
      ></div>
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "0.2s" }}
      ></div>
    </div>
  );

  // Function to merge preferences
  function mergePreferences(
    oldPrefs: Record<string, any>,
    newPrefs: Record<string, any>
  ): Record<string, any> {
    const merged = { ...oldPrefs }; // start with existing data
    for (const key in newPrefs) {
      if (newPrefs[key] !== null && newPrefs[key] !== undefined) {
        merged[key] = newPrefs[key]; // overwrite only if the new value is non-null
      }
    }
    return merged;
  }

  // Function to normalize preferences for database search
  function normalizePreferences(
    prefs: Record<string, any>
  ): Record<string, any> {
    const normalized = { ...prefs };

    // Helper function to capitalize first letter only
    const capitalizeWords = (str: string): string => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    // Normalize house_type
    if (normalized.house_type) {
      let houseType = normalized.house_type.toLowerCase();
      // Convert "condo" to "condominium"
      if (
        houseType === "condo" ||
        houseType === "condos" ||
        houseType === "Condo"
      ) {
        normalized.house_type = "Condominium";
      } else {
        normalized.house_type = capitalizeWords(normalized.house_type);
      }
    }

    // Normalize lease_type
    if (normalized.lease_type) {
      normalized.lease_type = capitalizeWords(normalized.lease_type);
    }

    // Normalize furnishing
    if (normalized.furnishing) {
      normalized.furnishing = capitalizeWords(normalized.furnishing);
    }

    // Normalize facilities array
    if (normalized.facilities && Array.isArray(normalized.facilities)) {
      normalized.facilities = normalized.facilities.map((facility: string) =>
        capitalizeWords(facility)
      );
    }

    return normalized;
  }

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Header: title and controls on one row, separated from the chat by a line */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
          AI Property Search
        </h2>
        <div className="flex flex-shrink-0 items-center gap-2">
          <AiPersonalizedToggle
            isActive={isPersonalizedActive}
            onToggle={handlePersonalizedToggle}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewChat}
            disabled={isAiTyping}
            className="rounded-lg flex items-center gap-1"
            aria-label="New chat"
            title="New chat"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {/* Label only when the panel is wide enough; icon-only on smaller screens */}
            <span className="hidden xl:inline">New chat</span>
          </Button>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {messages.map((message, index) => {
          if (message.type === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5 text-[15px] leading-6 text-white whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
            );
          }

          const isLast = index === messages.length - 1;
          return (
            <div key={message.id}>
              {/* AI reply: full width, no bubble */}
              <div className="text-[15px] leading-7 text-gray-800 break-words">
                <ChatMarkdown text={message.content} />
              </div>

              {message.cards && message.cards.length > 0 && (
                <ChatRecommendationCards cards={message.cards} />
              )}

              {isLast && !isAiTyping && (
                <div className="mt-2 flex items-center gap-1 text-gray-400">
                  <button
                    type="button"
                    onClick={() => handleCopy(message)}
                    className="rounded-md p-1.5 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Copy reply"
                    title="Copy"
                  >
                    {copiedId === message.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(message.id, "like")}
                    className="rounded-md p-1.5 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Good response"
                    title="Good response"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFeedback(message.id, "dislike")}
                    className="rounded-md p-1.5 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Bad response"
                    title="Bad response"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                  <span className="ml-1 text-xs" suppressHydrationWarning>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {isAiTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="px-5 pb-4 pt-2 flex-shrink-0">
        <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-gray-400">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder={isAiTyping ? "Waiting for reply..." : "Ask about properties..."}
            value={aiRequest}
            onChange={(e) => setAiRequest(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAiTyping}
            className="flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={aiRequest.trim() === "" || isAiTyping}
            className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400"
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-gray-400">
          AI can make mistakes. Check listing details.
        </p>
      </div>
    </div>
  );
}
