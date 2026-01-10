"use client"

import { Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface FilterButtonProps {
  filterCount?: number
  onClick?: () => void
  className?: string
}

export function FilterButton({ filterCount = 6, onClick, className = "" }: FilterButtonProps) {
  return (
    <Button
      variant="outline"
      className={`bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm rounded-full ${className}`}
      onClick={onClick}
    >
      <Filter className="h-4 w-4 mr-2" />
      Filters
      {filterCount > 0 && <Badge className="ml-2 bg-blue-gradient">{filterCount}</Badge>}
    </Button>
  )
}
