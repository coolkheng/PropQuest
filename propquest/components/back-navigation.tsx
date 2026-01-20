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
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    // Fallback to referrer if provided, otherwise go to /listing
    const fallback = referrer && referrer !== '/' ? referrer : '/listing';
    router.push(fallback);
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleBackClick}>
      <ArrowLeft className="h-4 w-4 mr-2" />
    </Button>
  )
}
