import { BackNavigation } from "./back-navigation"
import { Button } from "@/components/ui/button"

interface PropertyDetailHeaderProps {
  referrer: string
}

export function PropertyDetailHeader({ referrer }: PropertyDetailHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <BackNavigation referrer={referrer} />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400">PropQuest</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
          <Button size="sm" className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 hover:opacity-90 border-0">
            Sign Up
          </Button>
        </div>
      </div>
    </div>
  )
}
