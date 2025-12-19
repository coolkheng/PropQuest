"use client";

import React from "react";
import axios from "axios";
import { Property } from "../app/page"; // Import the Property interface

import { useState, useRef, useEffect } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiPersonalizedToggle } from "./ai-personalized-toggle";

interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  isTyping?: boolean;
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "2",
      type: "ai",
      content:
        "Hi! I'm your AI assistant. Here’s what I can help you with:\n🏠 1. Answer property-related questions  \n🎯 2. Recommend properties that fit your preferences  \n🔍 3. Find property based on your criteria  \n📈 4. Show market price trends and insights  ",
      timestamp: new Date(),
    },
  ]);
  const [Exisiting_preferences, setPreferences] = useState<Record<string, any>>(
    {}
  ); // Initialize preferences state

  const question = useRef("");
  const question_asking_preferences = useRef("");
  const conversation = useRef<Array<{ content: string }>>([]);

  function addMessage(content: string) {
    conversation.current.push({ content });
  }

  function addQuestion(newQuestion: string) {
    question.current = newQuestion;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  const classifyUserIntent = async (message: string): Promise<string> => {
    try {
      const response = await axios.post(
        "http://localhost:5001/api/chat/classify",
        {
          message,
        }
      );
      return response.data.intent;
    } catch (error) {
      console.error("Error classifying user intent:", error);
      return "unknown";
    }
  };

  const handleSendMessage = async () => {
    if (aiRequest.trim() === "") return;

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
        const intent = await classifyUserIntent(userMessageContent);
        console.log("Classified intent:", intent);

        if (intent === "search") {
          const aiGeneratedFilters = await axios.post(
            "http://localhost:5001/api/chat/search",
            {
              message: userMessageContent,
            }
          );

          console.log(aiGeneratedFilters.data.reply);

          const response = await axios.post(
            "http://localhost:5001/api/properties/search",
            {
              filters: aiGeneratedFilters.data.reply,
            }
          );

          const properties = response.data;
          setProperties(properties); // Update the properties state with the API response
          setIsAISearch(true); // Mark as AI search results

          const aiResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: "ai",
            content: `I found ${properties.length} properties matching your criteria. Check them out on the map!`,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, aiResponse]);
        } else if (intent === "question") {
          const backendResponse = await axios.post(
            "http://localhost:5001/api/chat/questions",
            {
              message: userMessageContent,
            }
          );

          const aiResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: "ai",
            content: backendResponse.data.reply,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, aiResponse]);
        } else if (intent === "unknown") {
          const aiResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: "ai",
            content:
              "Sorry, I couldn't process your request. Could you please rephrase with more specific words ?",
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, aiResponse]);
        }
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
            "http://localhost:5001/api/chat/preferences",
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
            
            const response = await axios.post(
              "http://localhost:5001/api/properties/search",
              {
                filters: JSON.stringify(normalizedPreferences),
              }
            );

            const properties = response.data;
            setProperties(properties);
            setIsAISearch(true);

            const aiResponse: ChatMessage = {
              id: (Date.now() + 1).toString(),
              type: "ai",
              content: `I found ${properties.length} properties matching your preferences. Check them out on the map!`,
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
  function normalizePreferences(prefs: Record<string, any>): Record<string, any> {
    const normalized = { ...prefs };

    // Helper function to capitalize first letter of each word
    const capitalizeWords = (str: string): string => {
      return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    // Normalize house_type
    if (normalized.house_type) {
      let houseType = normalized.house_type.toLowerCase();
      // Convert "condo" to "condominium"
      if (houseType === 'condo' || houseType === 'condos' || houseType === 'Condo') {
        normalized.house_type = 'Condominium';
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

        <div className="flex justify-center">
          <AiPersonalizedToggle
            isActive={isPersonalizedActive}
            onToggle={handlePersonalizedToggle}
          />
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
                  <p className="text-xs text-blue-200 mt-2">
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
                          {line}
                          <br />
                        </React.Fragment>
                      ))}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
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
