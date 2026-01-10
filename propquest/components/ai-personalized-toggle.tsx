"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AiPersonalizedToggleProps {
  isActive: boolean
  onToggle: () => void
}

export function AiPersonalizedToggle({ isActive, onToggle }: AiPersonalizedToggleProps) {
  return (
    <Button
      onClick={onToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        isActive
          ? "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white shadow-md hover:from-blue-700 hover:via-blue-600 hover:to-blue-500"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
      }`}
      aria-label={isActive ? "Deactivate AI Personalized Properties" : "Activate AI Personalized Properties"}
      aria-pressed={isActive}
    >
      <Sparkles className={`h-4 w-4 ${isActive ? "text-yellow-300" : "text-gray-500"}`} />
      <span className="text-sm">AI Personalized</span>
    </Button>
  )
}
