"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface BackNavigationProps {
  referrer: string
}

export function BackNavigation({ referrer }: BackNavigationProps) {
  const router = useRouter()

  const handleBackClick = () => {
    router.push(referrer)
  }

  const getBackButtonText = () => {
    if (referrer === "/listing") {
      return "Back"
    }
    return "Back"
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleBackClick}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      {getBackButtonText()}
    </Button>
  )
}
