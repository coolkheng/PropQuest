"use client"

import { Button } from "@/components/ui/button"

interface LoadMoreSectionProps {
  onLoadMore?: () => void
  isLoading?: boolean
}

export function LoadMoreSection({ onLoadMore, isLoading = false }: LoadMoreSectionProps) {
  return (
    <div className="text-center mt-8">
      <Button variant="outline" size="lg" onClick={onLoadMore} disabled={isLoading}>
        {isLoading ? "Loading..." : "Load More Properties"}
      </Button>
    </div>
  )
}
