"use client";

import React from "react";
import axios from "axios";
import { Property } from "../app/page"; // Import the Property interface
import { useState, useRef, useEffect } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";
import { AiPersonalizedToggle } from "./ai-personalized-toggle";

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

// Response from POST /api/chat/answer (used by the personalized flow only)
interface RagAnswer {
  reply: string;
  recommended_ids: string[];
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
  filters?: Record<string, any>;
  fallback?: boolean;
}

// Response from GET /api/chat/session/:id (restore after reload)
interface ChatSessionView {
  sessionId: string;
  messages: { role: "user" | "assistant"; content: string; at: string }[];
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

// Renders **bold** inside a line (the AI replies use a little Markdown).
function renderInline(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
    <div className="flex justify-start">
      <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-md max-w-sm">
        <div className="flex space-x-1">
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
      </div>
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
      {/* Header with Icon */}
      <div className="p-6 text-center flex-shrink-0">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          AI Property Search
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-4">
          Feel free to enter whatever details you like
        </p>

        <div className="flex justify-center items-center gap-2">
          <AiPersonalizedToggle
            isActive={isPersonalizedActive}
            onToggle={handlePersonalizedToggle}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewChat}
            disabled={isAiTyping}
            className="rounded-full flex items-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>New chat</span>
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 px-6 pb-6 space-y-4 overflow-y-auto">
        {messages.map((message, index) => (
          <div key={message.id}>
            {message.type === "user" ? (
              /* User Message - Right Side, Blue */
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-br-md max-w-sm">
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className="text-xs text-blue-200 mt-2" suppressHydrationWarning>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ) : (
              /* AI Response - Left Side, Grey */
              <div className="flex justify-start">
                <div className="space-y-3 max-w-sm">
                  <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-md">
                    <p className="text-sm text-gray-700">
                      {message.content.split("\n").map((line, index) => (
                        <React.Fragment key={index}>
                          {/^\s*[-*]\s+/.test(line)
                            ? <>• {renderInline(line.replace(/^\s*[-*]\s+/, ""))}</>
                            : renderInline(line)}
                          <br />
                        </React.Fragment>
                      ))}
                    </p>
                    <p className="text-xs text-gray-500 mt-2" suppressHydrationWarning>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Buttons - Only show for AI messages and only for the last AI message */}
            {message.type === "ai" &&
              index === messages.length - 1 &&
              !isAiTyping && (
                <div className="flex justify-start mt-2">
                  <div className="flex space-x-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="p-2 rounded-full hover:bg-blue-50 bg-transparent"
                      onClick={() => handleFeedback(message.id, "like")}
                    >
                      <ThumbsUp className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="p-2 rounded-full hover:bg-gray-50 bg-transparent"
                      onClick={() => handleFeedback(message.id, "dislike")}
                    >
                      <ThumbsDown className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isAiTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="p-6 border-t border-gray-100 flex-shrink-0">
        <div className="flex space-x-3">
          <Input
            type="text"
            placeholder="Enter your request here"
            value={aiRequest}
            onChange={(e) => setAiRequest(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isAiTyping}
            className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
          />
          <Button
            onClick={handleSendMessage}
            disabled={aiRequest.trim() === "" || isAiTyping}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-6 flex items-center space-x-2 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{isAiTyping ? "..." : "Send"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
