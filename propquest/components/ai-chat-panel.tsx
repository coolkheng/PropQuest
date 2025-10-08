"use client";

import React from "react";
import axios from "axios";
import { Property } from "../app/page"; // Import the Property interface

import { useState, useRef, useEffect } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
}

export function AiChatPanel({ properties, setProperties }: AiChatPanelProps) {
  const [aiRequest, setAiRequest] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "2",
      type: "ai",
      content:
        "Hi! I'm your AI assistant. Here’s what I can help you with:\n🏠 1. Answer property-related questions  \n🎯 2. Recommend properties that fit your preferences  \n🔍 3. Find property based on your criteria  \n📈 4. Show market price trends and insights  ",
      timestamp: new Date(),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const generateAiResponse = (userMessage: string): string => {
    // Simple response generation based on keywords
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("price") || lowerMessage.includes("budget")) {
      return "I understand you're looking for properties within a specific budget. Let me filter the results based on your price range.";
    }

    if (lowerMessage.includes("location") || lowerMessage.includes("area")) {
      return "Location is key! I'll focus on properties in your preferred areas with good accessibility and amenities.";
    }

    if (
      lowerMessage.includes("amenities") ||
      lowerMessage.includes("facilities")
    ) {
      return "Great! I'll prioritize properties with the amenities you mentioned. Let me update the search results.";
    }

    if (lowerMessage.includes("thank") || lowerMessage.includes("thanks")) {
      return "You're welcome! I'm here to help you find the perfect property. Feel free to ask if you need anything else.";
    }

    // Default responses
    const defaultResponses = [
      "I'm analyzing your requirements and updating the property recommendations accordingly.",
      "Let me search for properties that match your criteria. I'll have results for you shortly.",
      "Based on your preferences, I'm filtering through our property database to find the best matches.",
      "I understand your needs. Let me refine the search results to better match what you're looking for.",
    ];

    return defaultResponses[
      Math.floor(Math.random() * defaultResponses.length)
    ];
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
      // Generate JSON request dynamically based on user input
      const aiGeneratedFilters = await axios.post(
        "http://localhost:5000/api/chat",
        {
          message: userMessageContent,
        }
      );

      console.log(aiGeneratedFilters.data.reply);

      const response = await axios.post(
        "http://localhost:5000/api/properties/search",
        {
          filters: aiGeneratedFilters.data.reply,
        }
      );

      const properties = response.data;
      setProperties(properties); // Update the properties state with the API response

      // Add AI response with property results
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `I found ${properties.length} properties matching your criteria. Check them out on the map!`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
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
        <p className="text-sm text-gray-500 leading-relaxed">
          Feel free to enter whatever details you like
        </p>
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
