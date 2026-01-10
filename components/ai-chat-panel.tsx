"use client"

import { useState } from "react"
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AiChatPanel() {
  const [aiRequest, setAiRequest] = useState("")

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
        {/* User Message - Right Side, Blue */}
        <div className="flex justify-end">
          <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-br-md max-w-sm">
            <p className="text-sm leading-relaxed">
              Find me cosy apartments in Petaling Jaya for a long term, in a quiet safe area, the price should be
              RM40-70 per day, ability to check-in any time, non-smoking, I expect modern Instagram worthy apartments
            </p>
          </div>
        </div>

        {/* AI Response - Left Side, Grey */}
        <div className="flex justify-start">
          <div className="space-y-3 max-w-sm">
            <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-md">
              <p className="text-sm text-gray-700">
                Gotcha! You can find <span className="font-semibold">46 results</span> on the left.
              </p>
            </div>

            <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-md">
              <p className="text-sm text-gray-700">
                But based on your request, the best fit for you would be{" "}
                <span className="text-blue-600 font-medium">Victor Hugo - Cosy charming studio heart 16e.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Buttons - Left Aligned with AI Response */}
        <div className="flex justify-start">
          <div className="flex space-x-3">
            <Button size="sm" variant="outline" className="p-2 rounded-full">
              <ThumbsUp className="h-4 w-4 text-blue-600" />
            </Button>
            <Button size="sm" variant="outline" className="p-2 rounded-full">
              <ThumbsDown className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="p-6 border-t border-gray-100 flex-shrink-0">
        <div className="flex space-x-3">
          <Input
            type="text"
            placeholder="Enter your request here"
            value={aiRequest}
            onChange={(e) => setAiRequest(e.target.value)}
            className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
          />
          <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg px-6">Send</Button>
        </div>
      </div>
    </div>
  )
}
