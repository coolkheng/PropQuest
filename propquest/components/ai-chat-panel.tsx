"use client"

import type React from "react"

import { useState } from "react"
import { MessageSquare, ThumbsUp, ThumbsDown, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ChatMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
}

export function AiChatPanel() {
  const [aiRequest, setAiRequest] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "user",
      content:
        "Find me cosy apartments in Petaling Jaya for a long term, in a quiet safe area, the price should be RM40-70 per day, ability to check-in any time, non-smoking, I expect modern Instagram worthy apartments",
      timestamp: new Date(),
    },
    {
      id: "2",
      type: "ai",
      content: "Gotcha! You can find 46 results on the left.",
      timestamp: new Date(),
    },
    {
      id: "3",
      type: "ai",
      content: "But based on your request, the best fit for you would be Victor Hugo - Cosy charming studio heart 16e.",
      timestamp: new Date(),
    },
  ])

  const handleSendMessage = () => {
    if (aiRequest.trim() === "") return

    // Add user message
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: aiRequest.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newUserMessage])
    setAiRequest("")

    // Simulate AI response after a short delay
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "I'm processing your request. Let me find the best properties that match your criteria...",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFeedback = (messageId: string, type: "like" | "dislike") => {
    console.log(`Feedback for message ${messageId}: ${type}`)
    // Here you would typically send feedback to your backend
  }

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Header with Icon */}
      <div className="p-6 text-center flex-shrink-0">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">AI Property Search</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          I can analyse photos, data, surroundings for best fit. So feel free to enter whatever details you like
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
                </div>
              </div>
            ) : (
              /* AI Response - Left Side, Grey */
              <div className="flex justify-start">
                <div className="space-y-3 max-w-sm">
                  <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-md">
                    <p className="text-sm text-gray-700">{message.content}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Buttons - Only show for AI messages and only for the last AI message */}
            {message.type === "ai" && index === messages.length - 1 && (
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
            className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
          />
          <Button
            onClick={handleSendMessage}
            disabled={aiRequest.trim() === ""}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-6 flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
